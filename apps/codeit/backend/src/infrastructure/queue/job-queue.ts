import { EventEmitter } from 'events'
import type { JobRecord, QueueJobInput } from './queue.types.js'

class JobQueueBus extends EventEmitter {
  private jobs = new Map<string, JobRecord>()

  enqueue(input: QueueJobInput): JobRecord {
    const job: JobRecord = {
      id: Math.random().toString(36).substring(2, 15),
      type: input.type,
      payload: input.payload,
      status: 'pending',
      attempts: 0,
      progress: 0,
      createdAt: new Date().toISOString(),
    }
    this.jobs.set(job.id, job)
    
    process.nextTick(() => {
      this.emit(`job:${job.type}`, job)
    })
    
    return job
  }

  getJob(id: string): JobRecord | undefined {
    return this.jobs.get(id)
  }

  updateJob(id: string, updates: Partial<JobRecord>): void {
    const job = this.jobs.get(id)
    if (job) {
      Object.assign(job, updates)
    }
  }

  listJobs(): JobRecord[] {
    return Array.from(this.jobs.values())
  }
}

export const jobQueueBus = new JobQueueBus()
