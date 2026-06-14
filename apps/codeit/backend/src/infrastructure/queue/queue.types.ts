export type JobStatus = 'pending' | 'active' | 'completed' | 'failed'

export interface JobRecord {
  id: string
  type: string
  payload: Record<string, any>
  status: JobStatus
  attempts: number
  progress: number
  error?: string
  createdAt: string
  startedAt?: string
  completedAt?: string
}

export interface QueueJobInput {
  type: string
  payload: Record<string, any>
}
