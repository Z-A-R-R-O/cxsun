import { Inject } from '../../decorators/inject.js'
import { Injectable } from '../../decorators/injectable.js'
import type { TenantDomainResolution, TenantDomainStatus, TenantDomainUpsertInput } from '../domain/tenant-domain.types.js'
import { DomainResolutionEngine } from './domain-resolution.engine.js'
import { normalizeDomain, TenantDomainRepository } from '../infrastructure/tenant-domain.repository.js'

@Injectable()
export class TenantDomainService {
  constructor(
    @Inject(TenantDomainRepository) private readonly domains: TenantDomainRepository,
    @Inject(DomainResolutionEngine) private readonly domainResolution: DomainResolutionEngine,
  ) {}

  list() {
    return this.domains.list()
  }

  async upsert(input: TenantDomainUpsertInput) {
    let id = numberOrUndefined(input.id)
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

    const existingDomain = id ? undefined : await this.domains.findByDomain(domain)
    if (existingDomain && existingDomain.status === 'active' && !existingDomain.deleted_at) {
      return { ok: false, error: 'Domain is already mapped.' }
    }
    if (existingDomain) {
      id = existingDomain.id
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
    const result = await this.domainResolution.resolve(hostOrDomain)

    if (!result.ok) {
      return result
    }

    return {
      ok: true,
      domain: result.domain,
      tenant: result.tenant,
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
