export interface AgentConfig {
  systemPrompt: string
  provider: string
  model: string
  temperature: number
  tokenBudget: number
}

export interface AgentDefinition {
  id: string
  name: string
  role: string
  description: string
  config: AgentConfig
}

export interface PipelineStage {
  id: string
  agentId: string
  label: string
}

export interface DAGEdge {
  source: string
  target: string
}

export interface PipelineDefinition {
  id: string
  name: string
  stages: PipelineStage[]
  edges: DAGEdge[]
  createdAt?: string
  updatedAt?: string
}

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

export interface ProviderSettings {
  baseUrl: string
  hasKey: boolean
}

export interface CodeItSettings {
  openrouter: ProviderSettings
  openai: ProviderSettings
  deepseek: ProviderSettings
  opencode: ProviderSettings
}
