import { spawn } from 'child_process'
import { Queue, Worker } from 'bullmq'
import IORedis from 'ioredis'
import { sql } from 'kysely'

import { settings } from '../../framework/config/index.js'
import { getDatabase } from '../database/connection.js'
import { dispatchQueuedMail } from '../../modules/mail/mail.dispatcher.js'

export type HybridQueueName = 'events' | 'mail' | 'reports' | 'database-backup' | 'system-update' | 'tenant-maintenance'

interface HybridJobPayload {
  dbJobId?: number
  type: string
  payload: Record<string, unknown>
}

let redisConnection: IORedis | null = null
const queues = new Map<HybridQueueName, Queue>()
const workers: Worker[] = []
let workersStarted = false
let redisAvailable: boolean | null = null
let redisWarningShown = false

export async function enqueueHybridJob(input: {
  dbJobId: number
  type: string
  payload: Record<string, unknown>
  runAt?: string
}) {
  if (!settings.queue.enabled) return

  try {
    if (!(await isRedisAvailable())) return
    const queue = getHybridQueue(queueNameForType(input.type))
    const delay = input.runAt ? Math.max(new Date(input.runAt).getTime() - Date.now(), 0) : 0
    await queue.add(input.type, {
      dbJobId: input.dbJobId,
      type: input.type,
      payload: input.payload,
    } satisfies HybridJobPayload, {
      delay,
      attempts: 3,
      backoff: { type: 'exponential', delay: 30_000 },
      removeOnComplete: { age: 7 * 24 * 60 * 60, count: 1_000 },
      removeOnFail: { age: 30 * 24 * 60 * 60, count: 2_000 },
    })
  } catch (error) {
    console.warn(`  ! BullMQ enqueue skipped for ${input.type}: ${message(error)}`)
  }
}

export function queueNameForJobType(type: string): HybridQueueName {
  return queueNameForType(type)
}

export async function scheduleDatabaseBackups() {
  if (!settings.queue.enabled || settings.queue.backupIntervalHours <= 0) return

  try {
    if (!(await isRedisAvailable())) {
      console.warn('  ! Database backup schedule skipped: Redis is not available.')
      return
    }
    const queue = getHybridQueue('database-backup')
    await queue.add(
      'database.backup.interval',
      { type: 'database.backup.interval', payload: { source: 'schedule' } } satisfies HybridJobPayload,
      {
        jobId: 'database-backup-interval',
        repeat: { every: settings.queue.backupIntervalHours * 60 * 60 * 1000 },
        removeOnComplete: { age: 7 * 24 * 60 * 60, count: 100 },
        removeOnFail: { age: 30 * 24 * 60 * 60, count: 200 },
      },
    )
    console.log(`  ok Database backup queue scheduled every ${settings.queue.backupIntervalHours} hour(s)`)
  } catch (error) {
    console.warn(`  ! Database backup schedule skipped: ${message(error)}`)
  }
}

export async function startHybridQueueWorkers() {
  if (workersStarted || !settings.queue.enabled) return
  workersStarted = true

  try {
    if (!(await isRedisAvailable())) {
      console.warn('  ! Hybrid queue workers skipped: Redis is not available.')
      return
    }
    startWorker('database-backup', processDatabaseBackupJob)
    startWorker('mail', processMailJob)
    startWorker('reports', processPlaceholderJob)
    startWorker('system-update', processPlaceholderJob)
    startWorker('tenant-maintenance', processPlaceholderJob)
    startWorker('events', processPlaceholderJob)
    await scheduleDatabaseBackups()
    console.log('  ok Hybrid queue workers started')
  } catch (error) {
    console.warn(`  ! Hybrid queue workers skipped: ${message(error)}`)
  }
}

export function getHybridQueue(name: HybridQueueName) {
  const existing = queues.get(name)
  if (existing) return existing

  const queue = new Queue(name, { connection: getRedisConnection() })
  queues.set(name, queue)
  return queue
}

export async function getHybridQueueCounts() {
  if (!settings.queue.enabled) return []
  if (!(await isRedisAvailable())) return []

  const names: HybridQueueName[] = ['events', 'mail', 'reports', 'database-backup', 'system-update', 'tenant-maintenance']
  const counts = []

  for (const name of names) {
    try {
      counts.push({ name, counts: await getHybridQueue(name).getJobCounts('waiting', 'active', 'completed', 'failed', 'delayed') })
    } catch {
      counts.push({ name, counts: null })
    }
  }

  return counts
}

function startWorker(name: HybridQueueName, processor: (job: { data: HybridJobPayload }) => Promise<void>) {
  const worker = new Worker(name, processor, {
    connection: getRedisConnection(),
    concurrency: name === 'database-backup' ? 1 : 5,
  })
  worker.on('failed', async (job, error) => {
    const dbJobId = Number(job?.data?.dbJobId)
    if (dbJobId) await markJob(dbJobId, { status: 'failed', error: error.message, finished: true })
    console.warn(`  ! Queue job failed ${name}:${job?.id ?? 'unknown'} ${error.message}`)
  })
  worker.on('completed', async (job, result) => {
    const dbJobId = Number(job?.data?.dbJobId)
    if (dbJobId) await markJob(dbJobId, { status: 'completed', progress: 100, result, finished: true })
  })
  workers.push(worker)
}

async function processDatabaseBackupJob(job: { data: HybridJobPayload }) {
  if (job.data.dbJobId) await markJob(job.data.dbJobId, { status: 'processing', progress: 10, started: true })
  await runCommand(nodeCommand(), ['apps/cli/database-backup.mjs', 'backup'])
  if (job.data.dbJobId) await markJob(job.data.dbJobId, { status: 'completed', progress: 100, result: { ok: true }, finished: true })
}

async function processPlaceholderJob(job: { data: HybridJobPayload }) {
  if (job.data.dbJobId) {
    await markJob(job.data.dbJobId, {
      status: 'completed',
      progress: 100,
      result: { ok: true, note: 'No processor registered yet; job acknowledged by hybrid queue.' },
      started: true,
      finished: true,
    })
  }
}

async function processMailJob(job: { data: HybridJobPayload }) {
  if (job.data.dbJobId) await markJob(job.data.dbJobId, { status: 'processing', progress: 20, started: true })
  const result = await dispatchQueuedMail(job.data.payload)
  if (job.data.dbJobId) await markJob(job.data.dbJobId, { status: 'completed', progress: 100, result, finished: true })
}

async function markJob(
  id: number,
  update: {
    status: string
    progress?: number
    result?: unknown
    error?: string
    started?: boolean
    finished?: boolean
  },
) {
  await getDatabase()
    .updateTable('queue_jobs')
    .set({
      status: update.status,
      progress: update.progress,
      result: update.result === undefined ? undefined : JSON.stringify(update.result),
      error: update.error,
      started_at: update.started ? sql`COALESCE(started_at, CURRENT_TIMESTAMP)` : undefined,
      finished_at: update.finished ? sql`CURRENT_TIMESTAMP` : undefined,
      updated_at: sql`CURRENT_TIMESTAMP`,
    })
    .where('id', '=', id)
    .execute()
}

function getRedisConnection() {
  if (redisConnection) return redisConnection

  redisConnection = new IORedis({
    host: settings.redis.host,
    port: settings.redis.port,
    password: settings.redis.password,
    db: settings.redis.db,
    tls: settings.redis.tls ? {} : undefined,
    maxRetriesPerRequest: null,
    enableOfflineQueue: false,
    lazyConnect: true,
    retryStrategy: () => null,
  })
  redisConnection.on('error', (error) => {
    redisAvailable = false
    warnRedis(`  ! Redis connection unavailable: ${message(error)}`)
  })
  return redisConnection
}

async function isRedisAvailable() {
  if (redisAvailable === true) return true

  try {
    const connection = getRedisConnection()
    if (connection.status === 'wait') {
      await connection.connect()
    }
    await connection.ping()
    redisAvailable = true
    return true
  } catch (error) {
    redisAvailable = false
    warnRedis(`  ! Redis unavailable; queue will stay in MariaDB only: ${message(error)}`)
    redisConnection?.disconnect()
    redisConnection = null
    return false
  }
}

function warnRedis(text: string) {
  if (redisWarningShown) return
  redisWarningShown = true
  console.warn(text)
}

function queueNameForType(type: string): HybridQueueName {
  if (type.startsWith('mail.') || type.startsWith('email.')) return 'mail'
  if (type.startsWith('report.')) return 'reports'
  if (type.startsWith('database.backup') || type.startsWith('backup.')) return 'database-backup'
  if (type.startsWith('system.update')) return 'system-update'
  if (type.startsWith('tenant.')) return 'tenant-maintenance'
  return 'events'
}

function runCommand(command: string, args: string[]) {
  return new Promise<void>((resolveRun, rejectRun) => {
    const child = spawn(command, args, {
      cwd: process.cwd().replaceAll('\\', '/').endsWith('/apps/server') ? '../..' : '.',
      stdio: 'pipe',
      windowsHide: true,
    })
    const chunks: Buffer[] = []
    child.stdout?.on('data', (chunk) => chunks.push(Buffer.from(chunk)))
    child.stderr?.on('data', (chunk) => chunks.push(Buffer.from(chunk)))
    child.on('error', rejectRun)
    child.on('close', (code) => {
      if (code === 0) {
        resolveRun()
        return
      }

      rejectRun(new Error(Buffer.concat(chunks).toString('utf8') || `${command} failed with code ${code}`))
    })
  })
}

function nodeCommand() {
  return process.platform === 'win32' ? 'node.exe' : 'node'
}

function message(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}
