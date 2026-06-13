import { Injectable } from '../../core/decorators/injectable.js'
import { getDatabase } from '../database/connection.js'
import { provisionTenantDatabase } from './tenant-database.connection.js'
import type { Tenant } from '../../core/tenant/domain/tenant.types.js'

const DEFAULT_TENANT_PROVISION_TIMEOUT_MS = 30_000

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

    return Promise.all(tenants.map((tenant) => this.provision(tenant)))
  }

  async provision(tenant: Tenant): Promise<TenantProvisionResult> {
    try {
      const timeoutMs = tenantProvisionTimeoutMs()
      await withTimeout(
        provisionTenantDatabase(tenant),
        timeoutMs,
        `Tenant database provisioning timed out after ${timeoutMs}ms.`,
      )
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

function tenantProvisionTimeoutMs() {
  const configured = Number.parseInt(process.env.TENANT_PROVISION_TIMEOUT_MS ?? '', 10)
  return Number.isFinite(configured) && configured > 0 ? configured : DEFAULT_TENANT_PROVISION_TIMEOUT_MS
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error(message)), timeoutMs)
    promise.then(
      (value) => {
        clearTimeout(timeout)
        resolve(value)
      },
      (error) => {
        clearTimeout(timeout)
        reject(error)
      },
    )
  })
}
