import { Injectable } from '../../core/decorators/injectable.js'
import { getDatabase } from '../database/connection.js'

export interface QueueJobInput {
  type: string
  payload: Record<string, unknown>
  runAt?: string
}

@Injectable()
export class MasterQueueService {
  async enqueue(input: QueueJobInput) {
    await getDatabase()
      .insertInto('queue_jobs')
      .values({
        type: input.type,
        payload: JSON.stringify(input.payload),
        status: 'pending',
        attempts: 0,
        run_at: input.runAt ?? new Date().toISOString(),
      })
      .execute()
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

