import { Body, Headers, Param } from '../../../../core/decorators/http-params.js'
import { Controller, Get, Post } from '../../../../core/decorators/controller.js'
import { Inject } from '../../../../core/decorators/inject.js'
import { UseGuards } from '../../../../core/decorators/guards.js'
import { AuthGuard } from '../../../../core/guards/auth.guard.js'
import type { TenantRequestHeaders } from '../../../../core/tenant/tenant-context.service.js'
import { UserManagerService } from '../../application/user-manager.service.js'
import type { AdminUserUpsertInput, PlatformUserUpsertInput } from '../../domain/auth.types.js'

@Controller('api/v1/users')
@UseGuards(AuthGuard)
export class UsersV1Controller {
  constructor(
    @Inject(UserManagerService) private readonly userManager: UserManagerService,
  ) {}

  @Get('tenant-summary')
  listTenantSummaries(@Headers() headers: TenantRequestHeaders) {
    return this.userManager.listTenantSummaries(headers)
  }

  @Get('tenant/:tenantId')
  listTenantUsers(@Headers() headers: TenantRequestHeaders, @Param('tenantId') tenantId: string) {
    return this.userManager.listTenantUsers(headers, Number(tenantId))
  }

  @Post('upsert')
  upsert(@Headers() headers: TenantRequestHeaders, @Body() body: PlatformUserUpsertInput) {
    return this.userManager.upsert(headers, body)
  }
}

@Controller('api/v1/admin-users')
@UseGuards(AuthGuard)
export class AdminUsersV1Controller {
  constructor(
    @Inject(UserManagerService) private readonly userManager: UserManagerService,
  ) {}

  @Get()
  list(@Headers() headers: TenantRequestHeaders) {
    return this.userManager.listAdminUsers(headers)
  }

  @Post('upsert')
  upsert(@Headers() headers: TenantRequestHeaders, @Body() body: AdminUserUpsertInput) {
    return this.userManager.upsertAdminUser(headers, body)
  }
}
