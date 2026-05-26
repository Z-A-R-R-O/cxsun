import { Inject } from '../../decorators/inject.js'
import { Injectable } from '../../decorators/injectable.js'
import type { TenantDomainResolution } from '../domain/tenant-domain.types.js'
import { TenantDomainRepository } from '../infrastructure/tenant-domain.repository.js'

export interface ResolvedTenantDomain {
  ok: true
  domain: NonNullable<TenantDomainResolution['domain']> & {
    settings: Record<string, unknown>
  }
  tenant: NonNullable<TenantDomainResolution['tenant']> & {
    apps: {
      enabled: string[]
      landing: string
    }
  }
}

export type DomainResolutionResult = ResolvedTenantDomain | {
  ok: false
  error: string
}

@Injectable()
export class DomainResolutionEngine {
  constructor(
    @Inject(TenantDomainRepository) private readonly domains: TenantDomainRepository,
  ) {}

  async resolve(hostOrDomain: string): Promise<DomainResolutionResult> {
    const record = await this.domains.resolve(hostOrDomain)

    if (!record) {
      return { ok: false, error: 'Tenant domain was not found.' }
    }

    if (record.domain_status !== 'active' || record.tenant_status !== 'active') {
      return { ok: false, error: 'Tenant domain is not active.' }
    }

    const tenantSettings = parseJsonObject(record.payload_settings)
    const domainSettings = parseJsonObject(record.domain_settings)
    const enabledApps = readEnabledApps(tenantSettings)
    const landingApp = readLandingApp(tenantSettings, enabledApps)
    const industry = readIndustry(tenantSettings)
    const liveScope = readLiveScope(tenantSettings)

    return {
      ok: true,
      domain: {
        id: record.domain_id,
        domain: record.domain,
        label: record.label,
        isPrimary: Number(record.is_primary) === 1,
        status: record.domain_status as never,
        settings: domainSettings,
      },
      tenant: {
        id: record.tenant_id,
        code: record.tenant_code,
        slug: record.tenant_slug,
        name: record.tenant_name,
        status: record.tenant_status,
        database: record.db_name,
        settings: tenantSettings,
        industryKey: industry.key,
        industryName: industry.name,
        liveScope,
        features: readFeatures(tenantSettings),
        apps: {
          enabled: enabledApps,
          landing: landingApp,
        },
      },
    }
  }
}

function parseJsonObject(value: string | null | undefined): Record<string, unknown> {
  try {
    const parsed = JSON.parse(value || '{}') as unknown
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {}
  } catch {
    return {}
  }
}

function readFeatures(settings: Record<string, unknown>) {
  return Array.isArray(settings.features) ? settings.features.map(String) : []
}

function readIndustry(settings: Record<string, unknown>) {
  const industry = settings.industry
  if (!industry || typeof industry !== 'object' || Array.isArray(industry)) {
    return { key: null, name: null }
  }

  const industryRecord = industry as { code?: unknown, name?: unknown }
  return {
    key: typeof industryRecord.code === 'string' ? industryRecord.code : null,
    name: typeof industryRecord.name === 'string' ? industryRecord.name : null,
  }
}

function readLiveScope(settings: Record<string, unknown>) {
  const liveScope = settings.liveScope
  if (!liveScope || typeof liveScope !== 'object' || Array.isArray(liveScope)) {
    return { companies: [], requirements: [], notes: '', domains: [] }
  }

  const record = liveScope as {
    companies?: unknown
    requirements?: unknown
    notes?: unknown
    domains?: unknown
  }

  return {
    companies: Array.isArray(record.companies) ? record.companies.map(String) : [],
    requirements: Array.isArray(record.requirements) ? record.requirements.map(String) : [],
    notes: typeof record.notes === 'string' ? record.notes : '',
    domains: Array.isArray(record.domains) ? record.domains.map(String) : [],
  }
}

function readEnabledApps(settings: Record<string, unknown>) {
  const apps = settings.apps
  if (!apps || typeof apps !== 'object' || Array.isArray(apps)) {
    return []
  }

  const enabled = (apps as { enabled?: unknown }).enabled
  return Array.isArray(enabled) ? enabled.map(String) : []
}

function readLandingApp(settings: Record<string, unknown>, enabledApps: string[]) {
  const apps = settings.apps
  if (apps && typeof apps === 'object' && !Array.isArray(apps)) {
    const landing = (apps as { landing?: unknown }).landing
    if (typeof landing === 'string' && enabledApps.includes(landing)) {
      return landing
    }
  }

  return enabledApps[0] ?? ''
}
