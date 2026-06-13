import type { FastifyRequest } from 'fastify'
import { Body, Param, Query, Req } from '../../core/decorators/http-params.js'
import { Controller, Delete, Get, Post } from '../../core/decorators/controller.js'
import { UseGuards } from '../../core/decorators/guards.js'
import { Inject } from '../../core/decorators/inject.js'
import { AuthAnyGuard } from '../../core/guards/auth-any.guard.js'
import type { AuthTokenPayload } from '../../infrastructure/auth/jwt.js'
import { AgentOsService, type ZetroApiConnectionInput, type ZetroChatInput, type ZetroSearchInput } from './agent-os.service.js'

@Controller('api/v1/agent-os')
export class AgentOsController {
  constructor(@Inject(AgentOsService) private readonly agentOs: AgentOsService) {}

  @Get('status')
  @UseGuards(AuthAnyGuard)
  status(@Req() request: ZetroAuthenticatedRequest) {
    return this.agentOs.status(zetroAudienceFromRequest(request))
  }

  @Get('read')
  read() {
    return this.agentOs.read({ audience: 'public' })
  }

  @Get('api-connection')
  @UseGuards(AuthAnyGuard)
  apiConnection(@Req() request: ZetroAuthenticatedRequest) {
    const audience = zetroAudienceFromRequest(request)
    if (!isZetroAdminRole(audience.userRole)) return zetroAdminOnlyResponse('view API connections')
    return this.agentOs.apiConnection(audience)
  }

  @Get('conversations')
  @UseGuards(AuthAnyGuard)
  conversations(@Query() query: { limit?: number | string } | undefined, @Req() request: ZetroAuthenticatedRequest) {
    return this.agentOs.conversations({ ...(query ?? {}), ...zetroAudienceFromRequest(request) })
  }

  @Get('conversations/:uuid')
  @UseGuards(AuthAnyGuard)
  conversation(@Param('uuid') uuid: string, @Req() request: ZetroAuthenticatedRequest) {
    return this.agentOs.conversation(uuid, zetroAudienceFromRequest(request))
  }

  @Delete('conversations/:uuid')
  @UseGuards(AuthAnyGuard)
  clearConversation(@Param('uuid') uuid: string, @Req() request: ZetroAuthenticatedRequest) {
    return this.agentOs.clearConversation(uuid, zetroAudienceFromRequest(request))
  }

  @Delete('conversations')
  @UseGuards(AuthAnyGuard)
  clearConversations(@Req() request: ZetroAuthenticatedRequest) {
    return this.agentOs.clearConversations(zetroAudienceFromRequest(request))
  }

  @Post('api-connection/test')
  @UseGuards(AuthAnyGuard)
  testApiConnection(@Body() body: ZetroApiConnectionInput, @Req() request: ZetroAuthenticatedRequest) {
    const audience = zetroAudienceFromRequest(request)
    if (!isZetroAdminRole(audience.userRole)) return zetroAdminOnlyResponse('test API connections')
    return this.agentOs.testApiConnection({ ...(body ?? {}), ...audience })
  }

  @Post('api-connection/save')
  @UseGuards(AuthAnyGuard)
  saveApiConnection(@Body() body: ZetroApiConnectionInput, @Req() request: ZetroAuthenticatedRequest) {
    const audience = zetroAudienceFromRequest(request)
    if (!isZetroAdminRole(audience.userRole)) return zetroAdminOnlyResponse('save API connections')
    return this.agentOs.saveApiConnection({ ...(body ?? {}), ...audience })
  }

  @Get('search')
  search(@Query() query: ZetroSearchInput) {
    return this.agentOs.search({ ...(query ?? {}), audience: 'public' })
  }

  @Post('learn')
  @UseGuards(AuthAnyGuard)
  learn(@Body() body: ZetroSearchInput, @Req() request: ZetroAuthenticatedRequest) {
    const audience = zetroAudienceFromRequest(request)
    if (!isZetroAdminRole(audience.userRole)) return zetroAdminOnlyResponse('index ZETRO docs')
    return this.agentOs.learn({ ...(body ?? {}), ...audience })
  }

  @Post('chat')
  @UseGuards(AuthAnyGuard)
  chat(@Body() body: ZetroChatInput, @Req() request: ZetroAuthenticatedRequest) {
    return this.agentOs.chat({ ...(body ?? {}), ...zetroAudienceFromRequest(request) })
  }
}

type ZetroAuthenticatedRequest = FastifyRequest & {
  user?: AuthTokenPayload
}

function zetroAudienceFromRequest(request: ZetroAuthenticatedRequest) {
  const role = request.user?.role
  return {
    audience: isZetroAdminRole(role) ? 'admin' : 'user',
    userRole: role,
  }
}

function isZetroAdminRole(role: string | undefined) {
  return role === 'super-admin'
}

function zetroAdminOnlyResponse(action: string) {
  return {
    ok: false,
    error: `Only super-admin can ${action}.`,
  }
}
