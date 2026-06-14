import { Injectable } from '../../core/decorators/injectable.js'
import type { AgentDefinition } from './agent.types.js'
import { orchestratorAgent } from './agents/orchestrator.agent.js'
import { implementationAgent } from './agents/implementation.agent.js'
import { testGenAgent } from './agents/test-gen.agent.js'
import { reviewAgent } from './agents/review.agent.js'
import { securityAgent } from './agents/security.agent.js'
import { acceptanceAgent } from './agents/acceptance.agent.js'

@Injectable()
export class AgentStore {
  private agents = new Map<string, AgentDefinition>([
    ['orchestrator', orchestratorAgent],
    ['implementation', implementationAgent],
    ['test-gen', testGenAgent],
    ['review', reviewAgent],
    ['security', securityAgent],
    ['acceptance', acceptanceAgent],
  ])

  getAll(): AgentDefinition[] {
    return Array.from(this.agents.values())
  }

  getById(id: string): AgentDefinition | undefined {
    return this.agents.get(id)
  }

  update(id: string, config: Partial<AgentDefinition['config']>): AgentDefinition {
    const agent = this.agents.get(id)
    if (!agent) {
      throw new Error(`Agent '${id}' not found.`)
    }
    agent.config = { ...agent.config, ...config }
    return agent
  }
}
