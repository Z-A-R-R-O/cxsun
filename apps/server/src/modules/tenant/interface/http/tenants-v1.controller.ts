import { Body, Headers, Param } from '../../../../core/decorators/http-params.js'
import { Controller, Delete, Get, Post } from '../../../../core/decorators/controller.js'
import { Inject } from '../../../../core/decorators/inject.js'
import { TenantService, type TenantInput } from '../../tenant.service.js'
import { TENANT_API_SURFACE } from '../api-surface.js'

@Controller(TENANT_API_SURFACE.http.externalBasePath)
export class TenantsV1Controller {
  constructor(
    @Inject(TenantService) private readonly tenantService: TenantService,
  ) {}

  @Get()
  async list() {
    return this.tenantService.list()
  }

  @Get('events')
  async events() {
    return this.tenantService.events()
  }

  @Get('context')
  async context(@Headers('x-tenant-code') tenantCode?: string | string[]) {
    return this.tenantService.context(tenantCode)
  }

  @Post('upsert')
  async upsert(@Body() body: TenantInput) {
    return this.tenantService.upsert(body)
  }

  @Delete(':id')
  async softDelete(@Param('id') id: string) {
    return this.tenantService.softDelete(Number(id))
  }

  @Post(':id/destroy')
  async destroy(@Param('id') id: string) {
    return this.tenantService.softDelete(Number(id))
  }

  @Post(':id/restore')
  async restore(@Param('id') id: string) {
    return this.tenantService.restore(Number(id))
  }
}
