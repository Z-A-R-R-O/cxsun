import { Injectable } from '../../core/decorators/injectable.js'
import { jobQueueBus } from './job-queue.js'
import type { JobRecord, QueueJobInput } from './queue.types.js'

@Injectable()
export class QueueService {
  enqueue(input: QueueJobInput): JobRecord {
    return jobQueueBus.enqueue(input)
  }

  getJob(id: string): JobRecord | undefined {
    return jobQueueBus.getJob(id)
  }

  listJobs(): JobRecord[] {
    return jobQueueBus.listJobs()
  }

  process(type: string, handler: (job: JobRecord) => Promise<void>): void {
    jobQueueBus.on(`job:${type}`, async (job: JobRecord) => {
      jobQueueBus.updateJob(job.id, {
        status: 'active',
        startedAt: new Date().toISOString(),
      })

      try {
        await handler(job)
        jobQueueBus.updateJob(job.id, {
          status: 'completed',
          completedAt: new Date().toISOString(),
          progress: 100,
        })
      } catch (err: any) {
        jobQueueBus.updateJob(job.id, {
          status: 'failed',
          completedAt: new Date().toISOString(),
          error: err?.message ?? String(err),
        })
      }
    })
  }
}
