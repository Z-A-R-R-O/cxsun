#!/usr/bin/env node

import { execSync, spawn, spawnSync } from 'child_process'
import { readFileSync, existsSync, writeFileSync } from 'fs'
import { createInterface } from 'readline'
import { resolve } from 'path'
import { createConnection } from 'mysql2/promise'

const ROOT = resolve(import.meta.dirname, '../..')
const ENV_PATH = resolve(ROOT, '.env')
const APP = process.argv[2] // 'server' | 'frontend'

if (!APP || !['server', 'frontend'].includes(APP)) {
  console.log('Usage: node preflight.mjs <server|frontend>')
  process.exit(1)
}

// ── Load .env ────────────────────────────────────────
function loadDotEnv() {
  if (!existsSync(ENV_PATH)) return {}
  return Object.fromEntries(
    readFileSync(ENV_PATH, 'utf8')
      .split('\n')
      .map(l => l.match(/^\s*([^#=]+?)\s*=\s*(.*?)\s*$/))
      .filter(Boolean)
      .map(m => [m[1].trim(), parseEnvValue(m[2])]),
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

function parseEnvValue(value) {
  const trimmed = String(value ?? '').trim()
  if (!trimmed) return ''

  const quote = trimmed[0]
  if ((quote === '"' || quote === "'") && trimmed.endsWith(quote)) {
    return trimmed.slice(1, -1)
  }

  return trimmed.replace(/\s+#.*$/, '').trim()
}

// ── Port helpers ─────────────────────────────────────
function isPortInUse(p) {
  try {
    const cmd = process.platform === 'win32'
      ? `netstat -ano | findstr "\\<${p}\\>" | findstr LISTENING`
      : `lsof -i :${p} 2>/dev/null || ss -tlnp | grep ":${p} "`
    execSync(cmd, { stdio: 'pipe' })
    return true
  } catch { return false }
}

function getPidOnPort(p) {
  try {
    if (process.platform !== 'win32') return null
    const out = execSync(`netstat -ano | findstr "\\<${p}\\>" | findstr LISTENING`, { encoding: 'utf8' })
    const line = out.split('\n').find(Boolean)
    if (!line) return null
    return Number(line.trim().split(/\s+/).pop())
  } catch { return null }
}

function ask(query) {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout })
    rl.question(query, (a) => { rl.close(); resolve(a) })
  })
}

function tsxCommand() {
  return resolve(ROOT, 'node_modules', '.bin', process.platform === 'win32' ? 'tsx.cmd' : 'tsx')
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
      const createAnswer = await ask('     Create/setup master and demo tenant now? (Y/n): ')
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
    console.log(`  Setting up ${databaseName} with Demo-app tenant, demo_db, and localhost domain...\n`)

    const setup = spawnSync(tsxCommand(), ['src/core/migration-manager/cli.ts', 'setup', '--target=all'], {
      cwd: resolve(ROOT, 'apps/server'),
      stdio: 'inherit',
      env: { ...process.env, ...env, DB_NAME: databaseName },
      shell: process.platform === 'win32',
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

// ── Main ─────────────────────────────────────────────
const env = loadDotEnv()
const defaults = { server: 6001, frontend: 6010 }
const envKey = APP === 'server' ? 'PORT' : 'VITE_PORT'
let port = Number(env[envKey]) || defaults[APP]

if (APP === 'server') {
  await checkServerDatabase(env)
}

const launch = (finalPort) => {
  const cwd = resolve(ROOT, `apps/${APP}`)
  const cmd = APP === 'server'
    ? `tsx watch src/main.ts`
    : `vite --host 0.0.0.0`
  const child = spawn(cmd, [], {
    cwd,
    stdio: 'inherit',
    shell: true,
    env: { ...process.env, ...env, [envKey]: String(finalPort) },
  })
  child.on('exit', (code) => process.exit(code ?? 0))
}

if (isPortInUse(port)) {
  const pid = getPidOnPort(port)
  console.log(`\n  ⚠ Port ${port} is already in use${pid ? ` (PID ${pid})` : ''}`)

  // Auto-kill when non-TTY (pipelines, CI), otherwise prompt
  const isTTY = process.stdin.isTTY
  if (!isTTY) {
    console.log('  Non-interactive — attempting to kill existing process...')
  }

  const ans = isTTY ? await ask(`     (K)ill | (N)ext port | (A)bort [K/n/a]: `) : 'k'
  const c = ans.trim().toLowerCase() || 'k'

  if (c === 'k') {
    try {
      if (pid) {
        execSync(process.platform === 'win32'
          ? `taskkill /pid ${pid} /f`
          : `kill -9 ${pid}`, { stdio: 'pipe' })
        console.log(`  ✓ Killed PID ${pid}\n`)
      } else {
        console.log(`  ⚠ Could not detect PID. Use next port instead.\n`)
        while (isPortInUse(port)) port++
        console.log(`  ✓ Using port ${port}\n`)
      }
    } catch {
      console.log(`  ✗ Failed to kill. Use next port instead.\n`)
      while (isPortInUse(port)) port++
      console.log(`  ✓ Using port ${port}\n`)
    }
  } else if (c === 'n') {
    while (isPortInUse(port)) port++
    console.log(`  ✓ Using port ${port}\n`)
  } else {
    console.log('  Cancelled.\n')
    process.exit(1)
  }
}

launch(port)
