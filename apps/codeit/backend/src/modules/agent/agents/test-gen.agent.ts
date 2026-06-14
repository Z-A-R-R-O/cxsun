import type { AgentDefinition } from '../agent.types.js'

export const testGenAgent: AgentDefinition = {
  id: 'test-gen',
  name: 'Test Generator Agent',
  role: 'test-gen',
  description: 'Generates unit tests, integration tests, and test suites.',
  config: {
    systemPrompt: 'You are the QA Engineer. Write comprehensive unit and integration tests using frameworks like Vitest, Jest, or Mocha based on the implemented code.',
    provider: 'deepseek',
    model: 'deepseek-chat',
    temperature: 0.2,
    tokenBudget: 4000,
  },
}
