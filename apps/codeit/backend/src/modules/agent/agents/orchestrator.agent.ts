import type { AgentDefinition } from '../agent.types.js'

export const orchestratorAgent: AgentDefinition = {
  id: 'orchestrator',
  name: 'Orchestrator Agent',
  role: 'orchestrator',
  description: 'Deconstructs user requests, defines architectures, and plans work items.',
  config: {
    systemPrompt: 'You are the Chief Software Architect and Orchestrator. Analyze the user request, break it down into clean implementation steps, and output a detailed architectural design.',
    provider: 'openrouter',
    model: 'google/gemini-2.5-pro',
    temperature: 0.2,
    tokenBudget: 4000,
  },
}
