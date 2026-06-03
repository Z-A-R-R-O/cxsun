import { Injectable } from '../../core/decorators/injectable.js'
import { nowIso } from '../database/database-module.js'
import { getDatabase } from '../database/connection.js'

export interface QueueJobInput {
  type: string
  payload: Record<string, unknown>
  runAt?: string
}

@Injectable()
export class MasterQueueService {
  async enqueue(input: QueueJobInput) {
    const { enqueueHybridJob, queueNameForJobType } = await import('./hybrid-queue.runtime.js')
    const result = await getDatabase()
      .insertInto('queue_jobs')
      .values({
        queue_name: queueNameForJobType(input.type),
        type: input.type,
        payload: JSON.stringify(input.payload),
        status: 'pending',
        attempts: 0,
        progress: 0,
        run_at: input.runAt ?? nowIso(),
      })
      .executeTakeFirst()

    const dbJobId = Number(result.insertId ?? 0)
    if (dbJobId > 0) {
      await enqueueHybridJob({
        dbJobId,
        type: input.type,
        payload: input.payload,
        runAt: input.runAt,
      })
    }
  }

  async listPending(limit = 20) {
    return getDatabase()
      .selectFrom('queue_jobs')
      .selectAll()
      .where('status', '=', 'pending')
      .orderBy('run_at', 'asc')
      .limit(limit)
      .execute()
  }
}
