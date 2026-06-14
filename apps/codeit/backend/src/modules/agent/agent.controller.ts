import { Controller, Get, Put } from '../../core/decorators/controller.js'
import { Body, Param } from '../../core/decorators/http-params.js'
import { Inject } from '../../core/decorators/inject.js'
import { AgentService } from './agent.service.js'
import type { AgentDefinition } from './agent.types.js'

@Controller('api/v1/agents')
export class AgentController {
  constructor(
    @Inject(AgentService) private readonly agentService: AgentService,
  ) {}

  @Get()
  async getAgents() {
    return this.agentService.getAllAgents()
  }

  @Get(':id')
  async getAgent(@Param('id') id: string) {
    const agent = this.agentService.getAgentById(id)
    if (!agent) {
      return { error: 'Agent not found', statusCode: 404 }
    }
    return agent
  }

  @Put(':id')
  async updateAgent(
    @Param('id') id: string,
    @Body() config: Partial<AgentDefinition['config']>,
  ) {
    try {
      const updated = this.agentService.updateAgentConfig(id, config)
      return updated
    } catch (err: any) {
      return { error: err.message, statusCode: 400 }
    }
  }
}
