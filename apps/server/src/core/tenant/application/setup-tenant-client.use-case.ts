import { Injectable } from '../../decorators/injectable.js'
import { Inject } from '../../decorators/inject.js'
import { getDatabase } from '../../../infrastructure/database/connection.js'
import { nowIso } from '../../../infrastructure/database/database-module.js'
import { setupTenantClientDatabase, tenantDatabaseExists } from '../../../infrastructure/tenant-database/tenant-database.connection.js'
import { TenantRepository } from '../infrastructure/tenant.repository.js'

@Injectable()
export class SetupTenantClientUseCase {
  constructor(
    @Inject(TenantRepository) private readonly tenants: TenantRepository,
  ) {}

  async status(id: number) {
    const tenant = await this.tenants.findActiveById(id)
    if (!tenant) {
      return { ok: false, error: 'Tenant was not found.' }
    }

    return {
      ok: true,
      tenantId: tenant.id,
      database: tenant.db_name,
      databaseExists: await tenantDatabaseExists(tenant),
      hasDefaultCompany: tenant.active_company_count > 0,
    }
  }

  async execute(id: number) {
    const tenant = await this.tenants.findActiveById(id)
    if (!tenant) {
      return { ok: false, error: 'Tenant was not found.' }
    }

    await ensureTenantPolicies(tenant.id)
    return setupTenantClientDatabase(tenant)
  }
}

async function ensureTenantPolicies(tenantId: number) {
  for (const policy of [
    {
      code: 'company.manage',
      name: 'Manage companies',
      description: 'Create, update, suspend, and restore companies in a tenant database.',
    },
    {
      code: 'rbac.manage',
      name: 'Manage RBAC',
      description: 'Manage tenant roles and policy assignments.',
    },
    {
      code: 'mail.manage',
      name: 'Manage mail',
      description: 'Configure tenant mail settings and send tenant mail.',
    },
  ]) {
    await ensurePolicy(policy)
    await ensureTenantPolicy(tenantId, policy.code)
  }
}

async function ensurePolicy(policy: { code: string; name: string; description: string }) {
  const database = getDatabase()
  const existing = await database.selectFrom('rbac_policies').select('id').where('code', '=', policy.code).executeTakeFirst()
  if (existing) return
  await database.insertInto('rbac_policies').values(policy).execute()
}

async function ensureTenantPolicy(tenantId: number, policyCode: string) {
  const database = getDatabase()
  const existing = await database
    .selectFrom('tenant_rbac_policies')
    .select('id')
    .where('tenant_id', '=', tenantId)
    .where('policy_code', '=', policyCode)
    .executeTakeFirst()

  if (existing) {
    await database
      .updateTable('tenant_rbac_policies')
      .set({ enabled: 1, updated_at: nowIso() })
      .where('id', '=', existing.id)
      .execute()
    return
  }

  await database
    .insertInto('tenant_rbac_policies')
    .values({ tenant_id: tenantId, policy_code: policyCode, enabled: 1 })
    .execute()
}
