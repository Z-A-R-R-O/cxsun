#!/usr/bin/env node

import { execSync, spawn, spawnSync } from 'child_process'
import { mkdirSync, readFileSync, existsSync, statSync, writeFileSync } from 'fs'
import { createInterface } from 'readline'
import { resolve } from 'path'
import { createConnection } from 'mysql2/promise'

const ROOT = resolve(import.meta.dirname, '../..')
const ENV_PATH = resolve(ROOT, '.env')
const DEV_STATE_DIR = resolve(ROOT, 'build', 'dev')
const SERVER_STATE_PATH = resolve(DEV_STATE_DIR, 'server.json')
const APP = process.argv[2]

if (!APP || !['server', 'frontend'].includes(APP)) {
  console.log('Usage: node preflight.mjs <server|frontend>')
  process.exit(1)
}

function loadDotEnv() {
  if (!existsSync(ENV_PATH)) return {}
  return Object.fromEntries(
    readFileSync(ENV_PATH, 'utf8')
      .split('\n')
      .map((line) => line.match(/^\s*([^#=]+?)\s*=\s*(.*?)\s*$/))
      .filter(Boolean)
      .map((match) => [match[1].trim(), parseEnvValue(match[2])]),
  )
}

function setDotEnvValue(key, value) {
  if (!existsSync(ENV_PATH)) return

  const lines = readFileSync(ENV_PATH, 'utf8').split(/\r?\n/)
  const index = lines.findIndex((line) => line.match(new RegExp(`^\\s*${key}\\s*=`)))
  if (index >= 0) {
    lines[index] = `${key}=${value}`
  } else {
    lines.push(`${key}=${value}`)
  }
  writeFileSync(ENV_PATH, lines.join('\n'))
}

function writeServerState(port) {
  mkdirSync(DEV_STATE_DIR, { recursive: true })
  writeFileSync(SERVER_STATE_PATH, JSON.stringify({
    port,
    apiBaseUrl: `http://localhost:${port}`,
    healthUrl: `http://localhost:${port}/health`,
    updatedAt: new Date().toISOString(),
  }, null, 2))
}

function readServerState(maxAgeMs = 60_000) {
  if (!existsSync(SERVER_STATE_PATH)) return null

  try {
    const ageMs = Date.now() - statSync(SERVER_STATE_PATH).mtimeMs
    if (ageMs > maxAgeMs) return null

    const state = JSON.parse(readFileSync(SERVER_STATE_PATH, 'utf8'))
    const port = Number(state.port)
    if (!Number.isInteger(port) || port <= 0) return null
    return {
      port,
      apiBaseUrl: String(state.apiBaseUrl || `http://localhost:${port}`),
    }
  } catch {
    return null
  }
}

function parseEnvValue(value) {
  const trimmed = String(value ?? '').trim()
  if (!trimmed) return ''

  const quote = trimmed[0]
  if ((quote === '"' || quote === "'") && trimmed.endsWith(quote)) {
    return trimmed.slice(1, -1)
  }

  return trimmed.replace(/\s+#.*$/, '').trim()
}

function isPortInUse(port) {
  try {
    const cmd = process.platform === 'win32'
      ? `netstat -ano | findstr "\\<${port}\\>" | findstr LISTENING`
      : `lsof -i :${port} 2>/dev/null || ss -tlnp | grep ":${port} "`
    execSync(cmd, { stdio: 'pipe' })
    return true
  } catch {
    return false
  }
}

function getPidOnPort(port) {
  try {
    if (process.platform !== 'win32') return null
    const out = execSync(`netstat -ano | findstr "\\<${port}\\>" | findstr LISTENING`, { encoding: 'utf8' })
    const line = out.split('\n').find(Boolean)
    if (!line) return null
    return Number(line.trim().split(/\s+/).pop())
  } catch {
    return null
  }
}

function nextFreePort(port) {
  let candidate = port
  while (isPortInUse(candidate)) candidate++
  return candidate
}

function ask(query) {
  return new Promise((resolveAnswer) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout })
    rl.question(query, (answer) => {
      rl.close()
      resolveAnswer(answer)
    })
  })
}

async function waitForServerState(env) {
  if (APP !== 'frontend' || process.env.VITE_API_BASE_URL) {
    return
  }

  for (let attempt = 0; attempt < 240; attempt++) {
    const state = readServerState()
    if (state) {
      env.VITE_API_BASE_URL = state.apiBaseUrl
      console.log(`  ok Frontend API target: ${state.apiBaseUrl}`)
      return
    }

    await new Promise((resolveWait) => setTimeout(resolveWait, 250))
  }

  env.VITE_API_BASE_URL = `http://localhost:${defaults.server}`
  console.log(`  ! Frontend API target not announced yet. Using ${env.VITE_API_BASE_URL}`)
}

function tsxCommand() {
  return resolve(ROOT, 'node_modules', '.bin', process.platform === 'win32' ? 'tsx.cmd' : 'tsx')
}

function binCommand(name) {
  return resolve(ROOT, 'node_modules', '.bin', process.platform === 'win32' ? `${name}.cmd` : name)
}

function databaseConfig(env) {
  return {
    host: env.DB_HOST || process.env.DB_HOST || 'localhost',
    port: Number(env.DB_PORT || process.env.DB_PORT || 3306),
    database: env.DB_NAME || process.env.DB_NAME || 'cxsun_master',
    user: env.DB_USER || process.env.DB_USER || 'root',
    password: env.DB_PASSWORD || process.env.DB_PASSWORD || '',
  }
}

function isValidDatabaseName(name) {
  return /^[a-zA-Z0-9_]+$/.test(name)
}

async function checkServerDatabase(env) {
  const config = databaseConfig(env)
  let connection

  try {
    connection = await createConnection({
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password,
      multipleStatements: false,
      connectTimeout: 2_000,
    })
  } catch (error) {
    console.error(`\n  x MariaDB connection failed at ${config.host}:${config.port}`)
    console.error(`    ${error instanceof Error ? error.message : String(error)}\n`)
    process.exit(1)
  }

  try {
    const [databaseRows] = await connection.query('SHOW DATABASES LIKE ?', [config.database])
    const databaseExists = Array.isArray(databaseRows) && databaseRows.length > 0
    let tableCount = 0

    if (databaseExists) {
      const [tableRows] = await connection.query(
        'SELECT COUNT(*) AS table_count FROM information_schema.tables WHERE table_schema = ?',
        [config.database],
      )
      tableCount = Number(tableRows?.[0]?.table_count ?? 0)
    }

    if (databaseExists && tableCount > 0) {
      console.log(`  ok Master database ready: ${config.database} (${tableCount} tables)`)
      return
    }

    const reason = databaseExists
      ? `Master database "${config.database}" has no tables.`
      : `Master database "${config.database}" does not exist.`
    console.log(`\n  ${reason}`)

    let databaseName = config.database

    if (process.stdin.isTTY) {
      const createAnswer = await ask('     Create/setup master and tenant now? (Y/n): ')
      const createChoice = createAnswer.trim().toLowerCase() || 'y'
      if (createChoice !== 'y' && createChoice !== 'yes') {
        console.log('  Cancelled database setup.\n')
        process.exit(1)
      }

      const nameAnswer = await ask(`     Database name [${config.database}]: `)
      databaseName = nameAnswer.trim() || config.database
    } else {
      console.log(`  Non-interactive dev startup - setting up "${databaseName}" automatically.`)
    }

    if (!isValidDatabaseName(databaseName)) {
      console.error('  x Database name can contain only letters, numbers, and underscores.\n')
      process.exit(1)
    }

    env.DB_NAME = databaseName
    if (databaseName !== config.database) {
      setDotEnvValue('DB_NAME', databaseName)
    }

    console.log(`  Setting up ${databaseName} master database...\n`)

    const setupCommand = process.platform === 'win32' ? process.env.ComSpec || 'cmd.exe' : tsxCommand()
    const setupArgs = process.platform === 'win32'
      ? ['/d', '/s', '/c', `${tsxCommand()} src/core/migration-manager/cli.ts setup --target=master`]
      : ['src/core/migration-manager/cli.ts', 'setup', '--target=master']
    const setup = spawnSync(setupCommand, setupArgs, {
      cwd: resolve(ROOT, 'apps/server'),
      stdio: 'inherit',
      env: { ...process.env, ...env, DB_NAME: databaseName },
      shell: false,
    })

    if (setup.status !== 0) {
      console.error('\n  x Database setup failed.\n')
      process.exit(setup.status ?? 1)
    }

    console.log(`\n  ok Database setup completed: ${databaseName}\n`)
  } finally {
    await connection.end()
  }
}

const env = loadDotEnv()
const defaults = { server: 6001, frontend: 6010 }
const envKey = APP === 'server' ? 'PORT' : 'VITE_PORT'
let port = Number(env[envKey]) || defaults[APP]

if (APP === 'server') {
  await checkServerDatabase(env)
}

if (isPortInUse(port)) {
  const pid = getPidOnPort(port)
  console.log(`\n  ! Port ${port} is already in use${pid ? ` (PID ${pid})` : ''}`)

  if (process.stdin.isTTY) {
    const answer = await ask('     (K)ill | (N)ext port | (A)bort [K/n/a]: ')
    const choice = answer.trim().toLowerCase() || 'k'

    if (choice === 'k') {
      try {
        if (!pid) throw new Error('PID not found')
        execSync(process.platform === 'win32' ? `taskkill /pid ${pid} /f` : `kill -9 ${pid}`, { stdio: 'pipe' })
        console.log(`  ok Killed PID ${pid}\n`)
      } catch {
        port = nextFreePort(port)
        console.log(`  ! Could not kill process. Using port ${port}\n`)
      }
    } else if (choice === 'n') {
      port = nextFreePort(port)
      console.log(`  ok Using port ${port}\n`)
    } else {
      console.log('  Cancelled.\n')
      process.exit(1)
    }
  } else {
    port = nextFreePort(port)
    console.log(`  Non-interactive startup - using port ${port}\n`)
  }
}

if (APP === 'server') {
  writeServerState(port)
} else {
  await waitForServerState(env)
}

const cwd = resolve(ROOT, `apps/${APP}`)
const command = process.platform === 'win32'
  ? process.env.ComSpec || 'cmd.exe'
  : APP === 'server'
    ? tsxCommand()
    : binCommand('vite')
const args = process.platform === 'win32'
  ? ['/d', '/s', '/c', APP === 'server'
    ? `${tsxCommand()} watch src/main.ts`
    : `${binCommand('vite')} --host 0.0.0.0`]
  : APP === 'server'
    ? ['watch', 'src/main.ts']
    : ['--host', '0.0.0.0']
const child = spawn(command, args, {
  cwd,
  stdio: 'inherit',
  shell: false,
  env: { ...process.env, ...env, [envKey]: String(port) },
})

child.on('exit', (code) => process.exit(code ?? 0))
