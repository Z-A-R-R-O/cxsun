import type { TenantStatus, TenantUpsertData, TenantUpsertInput } from './tenant.types.js'

export class TenantAggregate {
  static normalize(input: TenantUpsertInput, nextCode: number): TenantUpsertData {
    const code = input.id ? Number(input.code) : nextCode
    const name = input.name?.trim()
    const slug = normalizeTenantSlug(input.slug || name || `tenant-${code}`)
    const status = input.status
    const payloadSettings = input.payload_settings?.trim() || '{}'

    if (!Number.isInteger(code) || code < 100) {
      throw new TenantValidationError('Tenant code must be an integer starting from 100.')
    }

    if (!name) {
      throw new TenantValidationError('Tenant name is required.')
    }

    if (!isTenantStatus(status)) {
      throw new TenantValidationError('Tenant status is invalid.')
    }

    if (!slug) {
      throw new TenantValidationError('Tenant slug is required.')
    }

    if (!isJsonObject(payloadSettings)) {
      throw new TenantValidationError('Tenant payload settings must be a JSON object.')
    }

    return {
      code,
      slug,
      name,
      status,
      industry_id: input.industry_id ?? null,
      payload_settings: payloadSettings,
    }
  }
}

export class TenantValidationError extends Error {}

function isTenantStatus(value: string): value is TenantStatus {
  return ['active', 'not_active', 'suspend'].includes(value)
}

function normalizeTenantSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

function isJsonObject(value: string) {
  try {
    const parsed = JSON.parse(value) as unknown
    return Boolean(parsed) && typeof parsed === 'object' && !Array.isArray(parsed)
  } catch {
    return false
  }
}
