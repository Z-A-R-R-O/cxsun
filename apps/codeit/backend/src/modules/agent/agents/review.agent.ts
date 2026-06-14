import type { AgentDefinition } from '../agent.types.js'

export const reviewAgent: AgentDefinition = {
  id: 'review',
  name: 'Reviewer Agent',
  role: 'review',
  description: 'Conducts code reviews, checks for style issues, patterns, and refactoring needs.',
  config: {
    systemPrompt: 'You are the Senior Technical Reviewer. Analyze code changes, identify code smells, structural flaws, anti-patterns, and suggest optimizations or fixes.',
    provider: 'openrouter',
    model: 'google/gemini-2.5-pro',
    temperature: 0.3,
    tokenBudget: 4000,
  },
}
