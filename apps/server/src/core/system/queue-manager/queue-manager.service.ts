import { sql } from 'kysely'

import { Injectable } from '../../decorators/injectable.js'
import { Inject } from '../../decorators/inject.js'
import { getDatabase } from '../../../infrastructure/database/connection.js'
import { enqueueHybridJob, getHybridQueueCounts } from '../../../infrastructure/queue/hybrid-queue.runtime.js'
import { MasterQueueService } from '../../../infrastructure/queue/master-queue.service.js'

type QueueAction = 'retry' | 'cancel' | 'delete'

@Injectable()
export class QueueManagerService {
  constructor(
    @Inject(MasterQueueService) private readonly queue: MasterQueueService,
  ) {}

  async overview() {
    const stats = await getDatabase()
      .selectFrom('queue_jobs')
      .select(['status', ({ fn }) => fn.count<number>('id').as('count')])
      .groupBy('status')
      .execute()

    const latest = await getDatabase()
      .selectFrom('queue_jobs')
      .selectAll()
      .orderBy('created_at', 'desc')
      .limit(10)
      .execute()

    return { stats, latest: latest.map(formatJob), bullmq: await getHybridQueueCounts() }
  }

  async list(query: { status?: string; queue?: string; limit?: string }) {
    const limit = Math.min(Math.max(Number(query.limit) || 50, 1), 200)
    let builder = getDatabase().selectFrom('queue_jobs').selectAll()

    if (query.status && query.status !== 'all') {
      builder = builder.where('status', '=', query.status)
    }

    if (query.queue && query.queue !== 'all') {
      builder = builder.where('queue_name', '=', query.queue)
    }

    const jobs = await builder.orderBy('created_at', 'desc').limit(limit).execute()
    return { jobs: jobs.map(formatJob) }
  }

  async enqueueBackup() {
    await this.queue.enqueue({
      type: 'database.backup.manual',
      payload: { source: 'queue-manager', requestedAt: new Date().toISOString() },
    })

    return { ok: true }
  }

  async action(id: string, action: QueueAction) {
    const jobId = Number(id)
    if (!Number.isInteger(jobId) || jobId <= 0) {
      return { ok: false, error: 'Invalid queue job id.' }
    }

    if (action === 'delete') {
      await getDatabase().deleteFrom('queue_jobs').where('id', '=', jobId).execute()
      return { ok: true }
    }

    const status = action === 'retry' ? 'pending' : 'cancelled'
    await getDatabase()
      .updateTable('queue_jobs')
      .set({
        status,
        progress: action === 'retry' ? 0 : undefined,
        error: action === 'retry' ? null : undefined,
        result: action === 'retry' ? null : undefined,
        started_at: action === 'retry' ? null : undefined,
        finished_at: action === 'retry' ? null : sql`CURRENT_TIMESTAMP`,
        run_at: sql`CURRENT_TIMESTAMP`,
        updated_at: sql`CURRENT_TIMESTAMP`,
      })
      .where('id', '=', jobId)
      .execute()

    if (action === 'retry') {
      const job = await getDatabase().selectFrom('queue_jobs').selectAll().where('id', '=', jobId).executeTakeFirst()
      if (job) {
        await enqueueHybridJob({
          dbJobId: job.id,
          type: job.type,
          payload: parsePayload(job.payload) as Record<string, unknown>,
          runAt: job.run_at,
        })
      }
    }

    return { ok: true }
  }
}

function formatJob(job: Record<string, unknown>) {
  return {
    ...job,
    payload: parsePayload(job.payload),
  }
}

function parsePayload(value: unknown) {
  if (typeof value !== 'string') return value

  try {
    return JSON.parse(value)
  } catch {
    return value
  }
}
