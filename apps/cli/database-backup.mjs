#!/usr/bin/env node

import { createReadStream, createWriteStream, existsSync, mkdirSync, readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { spawn, spawnSync } from 'node:child_process'
import { createConnection } from 'mysql2/promise'

const ROOT = resolve(import.meta.dirname, '../..')
const ENV_PATH = resolve(ROOT, '.env')
const BACKUP_ROOT = resolve(ROOT, 'storage', 'backups', 'database')
const command = process.argv[2] ?? 'backup'
const target = process.argv[3] ?? 'latest'

const env = { ...readEnvFile(ENV_PATH), ...process.env }

if (command === 'backup') {
  await backup()
} else if (command === 'restore') {
  await restore(target)
} else {
  console.log('Usage: node apps/cli/database-backup.mjs <backup|restore> [backup-folder|latest]')
  process.exit(1)
}

async function backup() {
  const dumpTool = findTool(['mariadb-dump', 'mysqldump'])
  mkdirSync(BACKUP_ROOT, { recursive: true })

  const backupId = timestampId()
  const backupDir = resolve(BACKUP_ROOT, backupId)
  mkdirSync(backupDir, { recursive: true })

  const master = masterConfig()
  const databases = await collectDatabases(master)
  const manifest = {
    id: backupId,
    createdAt: new Date().toISOString(),
    format: 'mysql-dump-v1',
    databases: [],
  }

  console.log(`Creating database backup: ${backupDir}`)

  for (const database of databases) {
    const file = `${safeFileName(database.label)}-${safeFileName(database.database)}.sql`
    const filePath = resolve(backupDir, file)
    console.log(`Backing up ${database.label}: ${database.database}`)
    await runDump(dumpTool, database, filePath)
    manifest.databases.push({
      label: database.label,
      host: database.host,
      port: database.port,
      user: database.user,
      secretRef: database.secretRef,
      database: database.database,
      file,
    })
  }

  const manifestPath = resolve(backupDir, 'manifest.json')
  await import('node:fs/promises').then((fs) =>
    fs.writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8'),
  )
  console.log(`Database backup completed: ${backupDir}`)
}

async function restore(input) {
  const mysqlTool = findTool(['mariadb', 'mysql'])
  const backupDir = resolveBackupDir(input)
  const manifestPath = resolve(backupDir, 'manifest.json')

  if (!existsSync(manifestPath)) {
    throw new Error(`Backup manifest not found: ${manifestPath}`)
  }

  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
  if (!Array.isArray(manifest.databases) || manifest.databases.length === 0) {
    throw new Error(`Backup has no databases: ${manifestPath}`)
  }

  console.log(`Restoring database backup: ${backupDir}`)

  for (const database of manifest.databases) {
    const filePath = resolve(backupDir, database.file)
    if (!existsSync(filePath)) {
      throw new Error(`Backup dump not found: ${filePath}`)
    }

    const config = {
      label: String(database.label),
      host: String(database.host),
      port: Number(database.port),
      user: String(database.user),
      secretRef: String(database.secretRef || 'DB_PASSWORD'),
      password: secret(String(database.secretRef || 'DB_PASSWORD')),
      database: String(database.database),
    }

    console.log(`Restoring ${config.label}: ${config.database}`)
    await ensureDatabase(config)
    await runRestore(mysqlTool, config, filePath)
  }

  console.log('Database restore completed.')
}

async function collectDatabases(master) {
  const databases = [master]
  let connection

  try {
    connection = await createConnection({
      host: master.host,
      port: master.port,
      user: master.user,
      password: master.password,
      database: master.database,
      multipleStatements: false,
      connectTimeout: 5_000,
    })

    const [rows] = await connection.query(
      `SELECT slug, db_host, db_port, db_name, db_user, db_secret_ref
       FROM tenants
       WHERE deleted_at IS NULL
       ORDER BY slug ASC`,
    )

    for (const row of rows) {
      databases.push({
        label: `tenant-${row.slug}`,
        host: row.db_host,
        port: Number(row.db_port),
        user: row.db_user,
        secretRef: row.db_secret_ref,
        password: secret(row.db_secret_ref),
        database: row.db_name,
      })
    }
  } catch (error) {
    throw new Error(`Unable to collect tenant databases from master: ${message(error)}`)
  } finally {
    if (connection) {
      await connection.end()
    }
  }

  return uniqueDatabases(databases)
}

async function runDump(tool, config, filePath) {
  const args = [
    `--host=${config.host}`,
    `--port=${config.port}`,
    `--user=${config.user}`,
    '--single-transaction',
    '--routines',
    '--triggers',
    '--events',
    '--hex-blob',
    config.database,
  ]
  const output = createWriteStream(filePath)

  await runTool(tool, args, {
    env: { ...process.env, MYSQL_PWD: config.password ?? '' },
    stdout: output,
  })
}

async function runRestore(tool, config, filePath) {
  const args = [
    `--host=${config.host}`,
    `--port=${config.port}`,
    `--user=${config.user}`,
    config.database,
  ]

  await runTool(tool, args, {
    env: { ...process.env, MYSQL_PWD: config.password ?? '' },
    stdinFile: filePath,
  })
}

async function ensureDatabase(config) {
  let connection

  try {
    connection = await createConnection({
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password,
      multipleStatements: false,
      connectTimeout: 5_000,
    })
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${escapeIdentifier(config.database)}\``)
  } finally {
    if (connection) {
      await connection.end()
    }
  }
}

function runTool(tool, args, options = {}) {
  return new Promise((resolveRun, rejectRun) => {
    const child = spawn(tool, args, {
      cwd: ROOT,
      env: options.env ?? process.env,
      stdio: [
        options.stdinFile ? 'pipe' : 'ignore',
        options.stdout ? 'pipe' : 'pipe',
        'pipe',
      ],
      windowsHide: true,
    })
    const stderr = []
    const stdout = []

    if (options.stdout && child.stdout) {
      child.stdout.pipe(options.stdout)
    } else if (child.stdout) {
      child.stdout.on('data', (chunk) => stdout.push(chunk))
    }

    child.stderr?.on('data', (chunk) => stderr.push(chunk))

    if (options.stdinFile && child.stdin) {
      createReadStream(options.stdinFile).pipe(child.stdin)
    }

    child.on('error', rejectRun)
    child.on('close', (code) => {
      if (code === 0) {
        resolveRun()
        return
      }

      rejectRun(
        new Error(
          `${tool} failed with code ${code}: ${Buffer.concat(stderr).toString('utf8') || Buffer.concat(stdout).toString('utf8')}`,
        ),
      )
    })
  })
}

function masterConfig() {
  return {
    label: 'master',
    host: stringEnv('DB_HOST', 'localhost'),
    port: numberEnv('DB_PORT', 3306),
    user: stringEnv('DB_USER', 'root'),
    secretRef: 'DB_PASSWORD',
    password: secret('DB_PASSWORD'),
    database: stringEnv('DB_NAME', 'cxsun_master'),
  }
}

function resolveBackupDir(input) {
  if (input && input !== 'latest') {
    const directPath = resolve(ROOT, input)
    if (existsSync(directPath)) {
      return directPath
    }

    return resolve(BACKUP_ROOT, input)
  }

  if (!existsSync(BACKUP_ROOT)) {
    throw new Error(`Backup folder does not exist: ${BACKUP_ROOT}`)
  }

  const folders = readdirSync(BACKUP_ROOT, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => resolve(BACKUP_ROOT, entry.name))
    .sort()

  const latest = folders.at(-1)
  if (!latest) {
    throw new Error(`No database backups found in ${BACKUP_ROOT}`)
  }

  return latest
}

function uniqueDatabases(databases) {
  const seen = new Set()
  const unique = []

  for (const database of databases) {
    const key = [
      database.host,
      database.port,
      database.user,
      database.secretRef,
      database.database,
    ].join('|')

    if (seen.has(key)) continue
    seen.add(key)
    unique.push(database)
  }

  return unique
}

function findTool(candidates) {
  const existing = findExistingTool(candidates)
  if (existing) {
    return existing
  }

  installMariaDbClientIfPossible()

  const installed = findExistingTool(candidates)
  if (installed) {
    return installed
  }

  throw new Error(`${candidates.join(' or ')} was not found. Install MariaDB/MySQL client tools before backup or restore.`)
}

function findExistingTool(candidates) {
  for (const tool of candidates) {
    const check = spawnSync(process.platform === 'win32' ? 'where.exe' : 'command', process.platform === 'win32' ? [tool] : ['-v', tool], {
      stdio: 'ignore',
      shell: process.platform !== 'win32',
    })

    if (check.status === 0) {
      return tool
    }
  }

  return null
}

function installMariaDbClientIfPossible() {
  if (process.platform === 'win32') {
    return
  }

  const apt = spawnSync('command', ['-v', 'apt-get'], {
    stdio: 'ignore',
    shell: true,
  })
  if (apt.status !== 0) {
    return
  }

  console.log('MariaDB client tools not found. Installing mariadb-client...')
  const update = spawnSync('apt-get', ['update'], { stdio: 'inherit' })
  if (update.status !== 0) {
    return
  }

  spawnSync('apt-get', ['install', '-y', '--no-install-recommends', 'mariadb-client'], {
    stdio: 'inherit',
  })
}

function readEnvFile(path) {
  if (!existsSync(path)) return {}

  return Object.fromEntries(
    readFileSync(path, 'utf8')
      .split(/\r?\n/)
      .map((line) => line.match(/^\s*([^#=]+?)\s*=\s*(.*?)\s*$/))
      .filter(Boolean)
      .map((match) => [match[1].trim(), parseEnvValue(match[2])]),
  )
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

function stringEnv(key, fallback = '') {
  const value = parseEnvValue(env[key])
  return value || fallback
}

function numberEnv(key, fallback) {
  const value = Number(stringEnv(key))
  return Number.isFinite(value) ? value : fallback
}

function secret(key) {
  return stringEnv(key || 'DB_PASSWORD')
}

function timestampId() {
  return new Date().toISOString().replace(/[-:]/g, '').replace(/\..+$/, '').replace('T', '-')
}

function safeFileName(value) {
  return String(value || 'database').replace(/[^a-zA-Z0-9_.-]+/g, '-')
}

function escapeIdentifier(value) {
  return String(value).replaceAll('`', '``')
}

function message(error) {
  return error instanceof Error ? error.message : String(error)
}
