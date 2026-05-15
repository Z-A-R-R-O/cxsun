import { Injectable } from '../../../core/decorators/injectable.js'
import { getDatabase } from '../../../infrastructure/database/connection.js'
import type { TenantDomain, TenantDomainUpsertInput } from '../domain/tenant-domain.types.js'

@Injectable()
export class TenantDomainRepository {
  async list(): Promise<TenantDomain[]> {
    return getDatabase()
      .selectFrom('tenant_domains')
      .innerJoin('tenants', 'tenants.id', 'tenant_domains.tenant_id')
      .select([
        'tenant_domains.id',
        'tenant_domains.tenant_id',
        'tenants.slug as tenant_slug',
        'tenants.name as tenant_name',
        'tenant_domains.domain',
        'tenant_domains.label',
        'tenant_domains.is_primary',
        'tenant_domains.status',
        'tenant_domains.settings',
        'tenant_domains.created_at',
        'tenant_domains.updated_at',
        'tenant_domains.deleted_at',
      ])
      .orderBy('tenant_domains.updated_at', 'desc')
      .execute() as Promise<TenantDomain[]>
  }

  async resolve(hostOrDomain: string) {
    const domain = normalizeDomain(hostOrDomain)
    if (!domain) return undefined

    return getDatabase()
      .selectFrom('tenant_domains')
      .innerJoin('tenants', 'tenants.id', 'tenant_domains.tenant_id')
      .select([
        'tenant_domains.id as domain_id',
        'tenant_domains.domain',
        'tenant_domains.label',
        'tenant_domains.is_primary',
        'tenant_domains.status as domain_status',
        'tenant_domains.settings as domain_settings',
        'tenants.id as tenant_id',
        'tenants.code as tenant_code',
        'tenants.slug as tenant_slug',
        'tenants.name as tenant_name',
        'tenants.status as tenant_status',
        'tenants.db_name',
        'tenants.payload_settings',
      ])
      .where('tenant_domains.domain', '=', domain)
      .where('tenant_domains.deleted_at', 'is', null)
      .executeTakeFirst()
  }

  async hasDomain(domain: string, exceptId?: number): Promise<boolean> {
    const normalizedDomain = normalizeDomain(domain)
    const query = getDatabase()
      .selectFrom('tenant_domains')
      .select('id')
      .where('domain', '=', normalizedDomain)

    const existing = exceptId
      ? await query.where('id', '!=', exceptId).executeTakeFirst()
      : await query.executeTakeFirst()

    return Boolean(existing)
  }

  async upsert(input: RequiredTenantDomainInput): Promise<TenantDomain> {
    const row = {
      tenant_id: input.tenant_id,
      domain: input.domain,
      label: input.label,
      is_primary: input.is_primary,
      status: input.status,
      settings: input.settings,
      deleted_at: input.status === 'suspend' ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    }

    if (input.id) {
      await getDatabase()
        .updateTable('tenant_domains')
        .set(row)
        .where('id', '=', input.id)
        .execute()

      const updated = await this.findById(input.id)
      if (!updated) {
        throw new Error('Tenant domain update did not return a persisted domain.')
      }
      return updated
    }

    await getDatabase().insertInto('tenant_domains').values(row).execute()
    const created = await this.findByDomain(input.domain)
    if (!created) {
      throw new Error('Tenant domain insert did not return a persisted domain.')
    }
    return created
  }

  async findById(id: number): Promise<TenantDomain | undefined> {
    return getDatabase()
      .selectFrom('tenant_domains')
      .innerJoin('tenants', 'tenants.id', 'tenant_domains.tenant_id')
      .select([
        'tenant_domains.id',
        'tenant_domains.tenant_id',
        'tenants.slug as tenant_slug',
        'tenants.name as tenant_name',
        'tenant_domains.domain',
        'tenant_domains.label',
        'tenant_domains.is_primary',
        'tenant_domains.status',
        'tenant_domains.settings',
        'tenant_domains.created_at',
        'tenant_domains.updated_at',
        'tenant_domains.deleted_at',
      ])
      .where('tenant_domains.id', '=', id)
      .executeTakeFirst() as Promise<TenantDomain | undefined>
  }

  async findByDomain(domain: string): Promise<TenantDomain | undefined> {
    return getDatabase()
      .selectFrom('tenant_domains')
      .innerJoin('tenants', 'tenants.id', 'tenant_domains.tenant_id')
      .select([
        'tenant_domains.id',
        'tenant_domains.tenant_id',
        'tenants.slug as tenant_slug',
        'tenants.name as tenant_name',
        'tenant_domains.domain',
        'tenant_domains.label',
        'tenant_domains.is_primary',
        'tenant_domains.status',
        'tenant_domains.settings',
        'tenant_domains.created_at',
        'tenant_domains.updated_at',
        'tenant_domains.deleted_at',
      ])
      .where('tenant_domains.domain', '=', normalizeDomain(domain))
      .executeTakeFirst() as Promise<TenantDomain | undefined>
  }
}

export function normalizeDomain(value: string) {
  return value.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '').replace(/:\d+$/, '')
}

export type RequiredTenantDomainInput = Required<Pick<
  TenantDomainUpsertInput,
  'domain' | 'label' | 'status'
>> & {
  id?: number
  tenant_id: number
  is_primary: number
  settings: string
}
