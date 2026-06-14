import { Module } from '../../core/decorators/module.js'
import { AgentController } from './agent.controller.js'
import { AgentService } from './agent.service.js'
import { AgentStore } from './agent.store.js'

@Module({
  controllers: [AgentController],
  providers: [AgentService, AgentStore],
})
export class AgentModule {}
