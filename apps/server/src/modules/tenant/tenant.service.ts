import { Injectable } from '../../core/decorators/injectable.js'
import { Inject } from '../../core/decorators/inject.js'
import { ListTenantsUseCase } from './application/list-tenants.use-case.js'
import { RestoreTenantUseCase } from './application/restore-tenant.use-case.js'
import { ResolveTenantContextUseCase } from './application/resolve-tenant-context.use-case.js'
import { SoftDeleteTenantUseCase } from './application/soft-delete-tenant.use-case.js'
import { TenantEventBus } from './application/tenant-event-bus.js'
import { UpsertTenantUseCase } from './application/upsert-tenant.use-case.js'
import type { TenantUpsertInput } from './domain/tenant.types.js'

export type TenantInput = TenantUpsertInput

@Injectable()
export class TenantService {
  constructor(
    @Inject(ListTenantsUseCase) private readonly listTenants: ListTenantsUseCase,
    @Inject(RestoreTenantUseCase) private readonly restoreTenant: RestoreTenantUseCase,
    @Inject(ResolveTenantContextUseCase) private readonly resolveTenantContext: ResolveTenantContextUseCase,
    @Inject(SoftDeleteTenantUseCase) private readonly softDeleteTenant: SoftDeleteTenantUseCase,
    @Inject(UpsertTenantUseCase) private readonly upsertTenant: UpsertTenantUseCase,
    @Inject(TenantEventBus) private readonly tenantEvents: TenantEventBus,
  ) {}

  list() {
    return this.listTenants.execute()
  }

  upsert(input: TenantInput) {
    return this.upsertTenant.execute(input)
  }

  softDelete(id: number) {
    return this.softDeleteTenant.execute(id)
  }

  restore(id: number) {
    return this.restoreTenant.execute(id)
  }

  context(tenantCode?: string | string[], host?: string | string[]) {
    return this.resolveTenantContext.execute(tenantCode, host)
  }

  events() {
    return this.tenantEvents.recent()
  }
}
