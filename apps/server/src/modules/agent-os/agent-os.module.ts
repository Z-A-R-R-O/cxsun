import { Module } from '../../core/decorators/module.js'
import { AgentOsController } from './agent-os.controller.js'
import { AgentOsService } from './agent-os.service.js'

@Module({
  controllers: [AgentOsController],
  providers: [AgentOsService],
})
export class AgentOsModule {}
