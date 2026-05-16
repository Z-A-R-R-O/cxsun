import { Body, Param } from '../../../../core/decorators/http-params.js'
import { Controller, Get, Post } from '../../../../core/decorators/controller.js'
import { Inject } from '../../../../core/decorators/inject.js'
import { UseGuards } from '../../../../core/decorators/guards.js'
import { AuthGuard } from '../../../../core/guards/auth.guard.js'
import { UserManagerService } from '../../application/user-manager.service.js'
import type { PlatformUserUpsertInput } from '../../domain/auth.types.js'

@Controller('api/v1/users')
@UseGuards(AuthGuard)
export class UsersV1Controller {
  constructor(
    @Inject(UserManagerService) private readonly userManager: UserManagerService,
  ) {}

  @Get('tenant-summary')
  listTenantSummaries() {
    return this.userManager.listTenantSummaries()
  }

  @Get('tenant/:tenantId')
  listTenantUsers(@Param('tenantId') tenantId: string) {
    return this.userManager.listTenantUsers(Number(tenantId))
  }

  @Post('upsert')
  upsert(@Body() body: PlatformUserUpsertInput) {
    return this.userManager.upsert(body)
  }
}
