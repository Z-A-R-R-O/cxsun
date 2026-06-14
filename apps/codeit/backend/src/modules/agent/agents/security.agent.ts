import type { AgentDefinition } from '../agent.types.js'

export const securityAgent: AgentDefinition = {
  id: 'security',
  name: 'Security Agent',
  role: 'security',
  description: 'Audits code for vulnerabilities, injection flaws, secrets leakage, and dependency risks.',
  config: {
    systemPrompt: 'You are the Application Security Specialist. Perform SAST on the code, looking for SQLi, XSS, prototype pollution, dependency bugs, and secrets leakage.',
    provider: 'openrouter',
    model: 'google/gemini-2.5-pro',
    temperature: 0.1,
    tokenBudget: 4000,
  },
}
