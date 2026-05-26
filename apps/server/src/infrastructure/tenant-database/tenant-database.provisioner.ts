import { Injectable } from '../../core/decorators/injectable.js'
import { getDatabase } from '../database/connection.js'
import { provisionTenantDatabase } from './tenant-database.connection.js'
import type { Tenant } from '../../core/tenant/domain/tenant.types.js'

export interface TenantProvisionResult {
  tenant: string
  database: string
  ok: boolean
  error?: string
}

@Injectable()
export class TenantDatabaseProvisioner {
  async provisionAll(): Promise<TenantProvisionResult[]> {
    const tenants = await getDatabase()
      .selectFrom('tenants')
      .selectAll()
      .where('db_type', '=', 'mariadb')
      .where('status', '=', 'active')
      .where('deleted_at', 'is', null)
      .orderBy('code', 'asc')
      .execute() as Tenant[]

    const results: TenantProvisionResult[] = []

    for (const tenant of tenants) {
      results.push(await this.provision(tenant))
    }

    return results
  }

  async provision(tenant: Tenant): Promise<TenantProvisionResult> {
    try {
      await provisionTenantDatabase(tenant)
      return { tenant: tenant.slug, database: tenant.db_name, ok: true }
    } catch (error) {
      return {
        tenant: tenant.slug,
        database: tenant.db_name,
        ok: false,
        error: error instanceof Error ? error.message : 'Tenant database provisioning failed.',
      }
    }
  }
}
