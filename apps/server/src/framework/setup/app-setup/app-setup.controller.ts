import type { FastifyRequest } from 'fastify'
import { Body, Req } from '../../../core/decorators/http-params.js'
import { Controller, Post } from '../../../core/decorators/controller.js'
import { Inject } from '../../../core/decorators/inject.js'
import { UseGuards } from '../../../core/decorators/guards.js'
import { AuthGuard } from '../../../core/guards/auth.guard.js'
import { AppSetupService, type AppSetupInput } from './app-setup.service.js'

@Controller('api/v1/setup')
@UseGuards(AuthGuard)
export class AppSetupController {
  constructor(
    @Inject(AppSetupService) private readonly setup: AppSetupService,
  ) {}

  @Post('apps')
  async createApp(@Req() request: FastifyRequest, @Body() body: AppSetupInput) {
    const user = (request as FastifyRequest & { user?: { superAdmin?: boolean } }).user
    if (!user?.superAdmin) {
      return { ok: false, error: 'Only super admins can create apps.' }
    }

    try {
      return await this.setup.create(body)
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : 'Tenant setup failed.',
      }
    }
  }
}
