import type { AgentDefinition } from '../agent.types.js'

export const implementationAgent: AgentDefinition = {
  id: 'implementation',
  name: 'Implementation Agent',
  role: 'implementation',
  description: 'Writes actual source code files, implementations, and core features.',
  config: {
    systemPrompt: 'You are the Lead Software Engineer. Implement the codebase, features, and functions as specified by the Orchestrator. Output production-ready, clean code.',
    provider: 'deepseek',
    model: 'deepseek-chat',
    temperature: 0.3,
    tokenBudget: 8000,
  },
}
