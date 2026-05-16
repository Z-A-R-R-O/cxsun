import { Inject } from '../../decorators/inject.js'
import { Injectable } from '../../decorators/injectable.js'
import type { TenantDomainResolution, TenantDomainStatus, TenantDomainUpsertInput } from '../domain/tenant-domain.types.js'
import { normalizeDomain, TenantDomainRepository } from '../infrastructure/tenant-domain.repository.js'

@Injectable()
export class TenantDomainService {
  constructor(
    @Inject(TenantDomainRepository) private readonly domains: TenantDomainRepository,
  ) {}

  list() {
    return this.domains.list()
  }

  async upsert(input: TenantDomainUpsertInput) {
    const id = numberOrUndefined(input.id)
    const tenantId = numberOrUndefined(input.tenant_id ?? input.tenantId)
    const domain = normalizeDomain(input.domain ?? '')
    const label = input.label?.trim() || domain
    const status = normalizeStatus(input.status)
    const settings = normalizeSettings(input.settings)
    const isPrimary = Boolean(input.is_primary ?? input.isPrimary)

    if (!tenantId) {
      return { ok: false, error: 'Tenant is required.' }
    }

    if (!domain) {
      return { ok: false, error: 'Domain is required.' }
    }

    if (await this.domains.hasDomain(domain, id)) {
      return { ok: false, error: 'Domain is already mapped.' }
    }

    return {
      ok: true,
      domain: await this.domains.upsert({
        id,
        tenant_id: tenantId,
        domain,
        label,
        is_primary: isPrimary ? 1 : 0,
        status,
        settings,
      }),
    }
  }

  async resolve(hostOrDomain: string): Promise<TenantDomainResolution> {
    const record = await this.domains.resolve(hostOrDomain)

    if (!record) {
      return { ok: false, error: 'Tenant domain was not found.' }
    }

    if (record.domain_status !== 'active' || record.tenant_status !== 'active') {
      return { ok: false, error: 'Tenant domain is not active.' }
    }

    const settings = parseJsonObject(record.payload_settings)
    const features = Array.isArray(settings.features) ? settings.features.map(String) : []

    return {
      ok: true,
      domain: {
        id: record.domain_id,
        domain: record.domain,
        label: record.label,
        isPrimary: Number(record.is_primary) === 1,
        status: record.domain_status as never,
      },
      tenant: {
        id: record.tenant_id,
        code: record.tenant_code,
        slug: record.tenant_slug,
        name: record.tenant_name,
        status: record.tenant_status,
        database: record.db_name,
        settings,
        features,
      },
    }
  }
}

function numberOrUndefined(value: unknown) {
  const numberValue = Number(value)
  return Number.isInteger(numberValue) && numberValue > 0 ? numberValue : undefined
}

function normalizeStatus(value: unknown): TenantDomainStatus {
  return value === 'active' || value === 'not_active' || value === 'suspend' ? value : 'active'
}

function normalizeSettings(value: TenantDomainUpsertInput['settings']) {
  if (!value) {
    return JSON.stringify({ landing: { mode: 'tenant' } })
  }

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value) as unknown
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
        ? JSON.stringify(parsed)
        : JSON.stringify({})
    } catch {
      return JSON.stringify({})
    }
  }

  return JSON.stringify(value)
}

function parseJsonObject(value: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(value) as unknown
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {}
  } catch {
    return {}
  }
}
