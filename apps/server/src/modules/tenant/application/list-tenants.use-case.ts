import { Inject } from '../../../core/decorators/inject.js'
import { Injectable } from '../../../core/decorators/injectable.js'
import { TenantRepository } from '../infrastructure/tenant.repository.js'

@Injectable()
export class ListTenantsUseCase {
  constructor(
    @Inject(TenantRepository) private readonly tenants: TenantRepository,
  ) {}

  execute() {
    return this.tenants.list()
  }
}
