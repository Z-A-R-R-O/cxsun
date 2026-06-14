export type AgentRole =
  | 'orchestrator'
  | 'implementation'
  | 'test-gen'
  | 'review'
  | 'security'
  | 'acceptance'

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
  role: AgentRole
  description: string
  config: AgentConfig
}
