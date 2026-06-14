export type RunStatus = 'pending' | 'running' | 'completed' | 'failed'

export interface StageResult {
  stageId: string
  agentId: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  input: string
  output?: string
  tokensUsed?: number
  error?: string
  startedAt?: string
  completedAt?: string
}

export interface RunRecord {
  id: string
  pipelineId: string
  prompt: string
  status: RunStatus
  stageResults: StageResult[]
  tokensUsed: number
  error?: string
  createdAt: string
  startedAt?: string
  completedAt?: string
}
