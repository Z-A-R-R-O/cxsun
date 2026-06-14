import { Injectable } from '../../core/decorators/injectable.js'
import { Inject } from '../../core/decorators/inject.js'
import { AgentStore } from './agent.store.js'
import type { AgentDefinition } from './agent.types.js'

@Injectable()
export class AgentService {
  constructor(
    @Inject(AgentStore) private readonly store: AgentStore,
  ) {}

  getAllAgents(): AgentDefinition[] {
    return this.store.getAll()
  }

  getAgentById(id: string): AgentDefinition | undefined {
    return this.store.getById(id)
  }

  updateAgentConfig(id: string, config: Partial<AgentDefinition['config']>): AgentDefinition {
    return this.store.update(id, config)
  }
}
