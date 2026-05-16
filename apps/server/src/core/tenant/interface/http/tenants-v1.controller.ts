import { Body, Headers, Param } from '../../../decorators/http-params.js'
import { Controller, Delete, Get, Post } from '../../../decorators/controller.js'
import { Inject } from '../../../decorators/inject.js'
import { UseGuards } from '../../../decorators/guards.js'
import { AuthGuard } from '../../../guards/auth.guard.js'
import { TenantService, type TenantInput } from '../../tenant.service.js'
import { TENANT_API_SURFACE } from '../api-surface.js'

@Controller(TENANT_API_SURFACE.http.externalBasePath)
export class TenantsV1Controller {
  constructor(
    @Inject(TenantService) private readonly tenantService: TenantService,
  ) {}

  @Get()
  @UseGuards(AuthGuard)
  async list() {
    return this.tenantService.list()
  }

  @Get('events')
  @UseGuards(AuthGuard)
  async events() {
    return this.tenantService.events()
  }

  @Get('context')
  async context(
    @Headers('x-tenant-code') tenantCode?: string | string[],
    @Headers('host') host?: string | string[],
  ) {
    return this.tenantService.context(tenantCode, host)
  }

  @Post('upsert')
  @UseGuards(AuthGuard)
  async upsert(@Body() body: TenantInput) {
    return this.tenantService.upsert(body)
  }

  @Delete(':id')
  @UseGuards(AuthGuard)
  async softDelete(@Param('id') id: string) {
    return this.tenantService.softDelete(Number(id))
  }

  @Post(':id/destroy')
  @UseGuards(AuthGuard)
  async destroy(@Param('id') id: string) {
    return this.tenantService.softDelete(Number(id))
  }

  @Post(':id/restore')
  @UseGuards(AuthGuard)
  async restore(@Param('id') id: string) {
    return this.tenantService.restore(Number(id))
  }
}
