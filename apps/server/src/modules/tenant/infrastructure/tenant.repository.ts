import { Injectable } from '../../../core/decorators/injectable.js'
import { getDatabase } from '../../../infrastructure/database/connection.js'
import type { Tenant, TenantUpsertData } from '../domain/tenant.types.js'
import type { Industry } from '../../industry/domain/industry.types.js'

@Injectable()
export class TenantRepository {
  async list(): Promise<Tenant[]> {
    return getDatabase()
      .selectFrom('tenants')
      .selectAll()
      .orderBy('created_at', 'desc')
      .execute() as Promise<Tenant[]>
  }

  async findById(id: number): Promise<Tenant | undefined> {
    return this.findActiveById(id)
  }

  async findActiveById(id: number): Promise<Tenant | undefined> {
    return getDatabase()
      .selectFrom('tenants')
      .selectAll()
      .where('id', '=', id)
      .where('deleted_at', 'is', null)
      .executeTakeFirst() as Promise<Tenant | undefined>
  }

  async findAnyById(id: number): Promise<Tenant | undefined> {
    return getDatabase()
      .selectFrom('tenants')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst() as Promise<Tenant | undefined>
  }

  async findByCode(code: number): Promise<Tenant | undefined> {
    return getDatabase()
      .selectFrom('tenants')
      .selectAll()
      .where('code', '=', code)
      .executeTakeFirst() as Promise<Tenant | undefined>
  }

  async findBySlug(slug: string): Promise<Tenant | undefined> {
    return getDatabase()
      .selectFrom('tenants')
      .selectAll()
      .where('slug', '=', slug)
      .executeTakeFirst() as Promise<Tenant | undefined>
  }

  async findForResolution(value: string): Promise<Tenant | undefined> {
    const normalized = value.trim()
    const numericCode = Number(normalized)

    if (Number.isInteger(numericCode)) {
      return getDatabase()
        .selectFrom('tenants')
        .selectAll()
        .where('code', '=', numericCode)
        .executeTakeFirst() as Promise<Tenant | undefined>
    }

    return this.findBySlug(normalized)
  }

  async listEnabledPolicyCodes(tenantId: number): Promise<string[]> {
    const policies = await getDatabase()
      .selectFrom('tenant_rbac_policies')
      .select('policy_code')
      .where('tenant_id', '=', tenantId)
      .where('enabled', '=', 1)
      .execute()

    if (policies.length > 0) {
      return policies.map((policy) => policy.policy_code)
    }

    const catalog = await getDatabase()
      .selectFrom('rbac_policies')
      .select('code')
      .execute()

    if (catalog.length > 0) {
      await getDatabase()
        .insertInto('tenant_rbac_policies')
        .values(catalog.map((policy) => ({
          tenant_id: tenantId,
          policy_code: policy.code,
          enabled: 1,
        })))
        .execute()
    }

    return catalog.map((policy) => policy.code)
  }

  async findIndustryById(id: number): Promise<Industry | undefined> {
    return getDatabase()
      .selectFrom('industries')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst() as Promise<Industry | undefined>
  }

  async hasCode(code: number, exceptId?: number): Promise<boolean> {
    const query = getDatabase()
      .selectFrom('tenants')
      .select('id')
      .where('code', '=', code)

    const tenant = exceptId
      ? await query.where('id', '!=', exceptId).executeTakeFirst()
      : await query.executeTakeFirst()

    return Boolean(tenant)
  }

  async hasSlug(slug: string, exceptId?: number): Promise<boolean> {
    const query = getDatabase()
      .selectFrom('tenants')
      .select('id')
      .where('slug', '=', slug)

    const tenant = exceptId
      ? await query.where('id', '!=', exceptId).executeTakeFirst()
      : await query.executeTakeFirst()

    return Boolean(tenant)
  }

  async insert(data: TenantUpsertData): Promise<Tenant> {
    await getDatabase()
      .insertInto('tenants')
      .values({
        ...data,
        db_type: 'mariadb',
        db_host: process.env.MARIADB_HOST ?? '127.0.0.1',
        db_port: Number(process.env.MARIADB_PORT ?? 3306),
        db_name: data.slug,
        db_user: process.env.MARIADB_USER ?? 'root',
        db_secret_ref: 'MARIADB_ROOT_PASSWORD',
      })
      .execute()

    return this.findByCode(data.code).then((tenant) => {
      if (!tenant) {
        throw new Error('Tenant insert did not return a persisted tenant.')
      }

      return tenant
    })
  }

  async update(id: number, data: TenantUpsertData): Promise<Tenant> {
    await getDatabase()
      .updateTable('tenants')
      .set({ ...data, updated_at: new Date().toISOString() })
      .where('id', '=', id)
      .execute()

    const tenant = await this.findById(id)

    if (!tenant) {
      throw new Error('Tenant update did not return a persisted tenant.')
    }

    return tenant
  }

  async nextCode(): Promise<number> {
    const row = await getDatabase()
      .selectFrom('tenants')
      .select((eb) => eb.fn.max<number>('code').as('maxCode'))
      .executeTakeFirst()

    return Math.max(99, Number(row?.maxCode ?? 99)) + 1
  }

  async softDelete(id: number): Promise<boolean> {
    const deletedAt = new Date().toISOString()

    const result = await getDatabase()
      .updateTable('tenants')
      .set({
        status: 'suspend',
        deleted_at: deletedAt,
        updated_at: deletedAt,
      })
      .where('id', '=', id)
      .where('deleted_at', 'is', null)
      .executeTakeFirst()

    return Number(result.numUpdatedRows) > 0
  }

  async restore(id: number): Promise<boolean> {
    const restoredAt = new Date().toISOString()

    const result = await getDatabase()
      .updateTable('tenants')
      .set({
        status: 'active',
        deleted_at: null,
        updated_at: restoredAt,
      })
      .where('id', '=', id)
      .where('deleted_at', 'is not', null)
      .executeTakeFirst()

    return Number(result.numUpdatedRows) > 0
  }
}
