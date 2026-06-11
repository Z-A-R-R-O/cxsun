import { Body, Query } from '../../core/decorators/http-params.js'
import { Controller, Get, Post } from '../../core/decorators/controller.js'
import { Inject } from '../../core/decorators/inject.js'
import { AgentOsService, type ZetroApiConnectionInput, type ZetroChatInput, type ZetroSearchInput } from './agent-os.service.js'

@Controller('api/v1/agent-os')
export class AgentOsController {
  constructor(@Inject(AgentOsService) private readonly agentOs: AgentOsService) {}

  @Get('status')
  status() {
    return this.agentOs.status()
  }

  @Get('read')
  read() {
    return this.agentOs.read()
  }

  @Get('api-connection')
  apiConnection() {
    return this.agentOs.apiConnection()
  }

  @Post('api-connection/test')
  testApiConnection(@Body() body: ZetroApiConnectionInput) {
    return this.agentOs.testApiConnection(body ?? {})
  }

  @Post('api-connection/save')
  saveApiConnection(@Body() body: ZetroApiConnectionInput) {
    return this.agentOs.saveApiConnection(body ?? {})
  }

  @Get('search')
  search(@Query() query: ZetroSearchInput) {
    return this.agentOs.search(query ?? {})
  }

  @Post('learn')
  learn(@Body() body: ZetroSearchInput) {
    return this.agentOs.learn(body ?? {})
  }

  @Post('chat')
  chat(@Body() body: ZetroChatInput) {
    return this.agentOs.chat(body ?? {})
  }
}
