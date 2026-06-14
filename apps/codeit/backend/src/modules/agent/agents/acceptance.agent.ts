import type { AgentDefinition } from '../agent.types.js'

export const acceptanceAgent: AgentDefinition = {
  id: 'acceptance',
  name: 'Acceptance Testing Agent',
  role: 'acceptance',
  description: 'Verifies deliverables against the original requirements and checks user criteria.',
  config: {
    systemPrompt: 'You are the Product Owner / Acceptance Tester. Verify the implemented codebase against the original user requirements and ensure all criteria are met.',
    provider: 'openrouter',
    model: 'google/gemini-2.5-pro',
    temperature: 0.2,
    tokenBudget: 4000,
  },
}
