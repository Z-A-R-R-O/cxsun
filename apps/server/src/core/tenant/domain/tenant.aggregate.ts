import type { TenantStatus, TenantUpsertData, TenantUpsertInput } from './tenant.types.js'

export class TenantAggregate {
  static normalize(input: TenantUpsertInput, nextCode: number): TenantUpsertData {
    const code = input.id ? Number(input.code) : nextCode
    const name = input.name?.trim()
    const slug = normalizeTenantSlug(input.slug || name || `tenant-${code}`)
    const status = input.status
    const dbName = normalizeTenantDatabaseName(input.db_name || slug)
    const dbHost = input.db_host?.trim() || process.env.MARIADB_HOST || 'localhost'
    const dbPort = Number(input.db_port ?? process.env.MARIADB_PORT ?? 3306)
    const dbUser = input.db_user?.trim() || process.env.MARIADB_USER || 'root'
    const dbSecretRef = input.db_secret_ref?.trim() || 'MARIADB_ROOT_PASSWORD'
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

    if (!dbName) {
      throw new TenantValidationError('Tenant database name is required.')
    }

    if (!dbHost) {
      throw new TenantValidationError('Tenant database host is required.')
    }

    if (!Number.isInteger(dbPort) || dbPort <= 0) {
      throw new TenantValidationError('Tenant database port is invalid.')
    }

    if (!dbUser) {
      throw new TenantValidationError('Tenant database user is required.')
    }

    if (!dbSecretRef) {
      throw new TenantValidationError('Tenant database secret reference is required.')
    }

    return {
      code,
      slug,
      name,
      status,
      db_type: 'mariadb',
      db_host: dbHost,
      db_port: dbPort,
      db_name: dbName,
      db_user: dbUser,
      db_secret_ref: dbSecretRef,
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

function normalizeTenantDatabaseName(value: string) {
  const normalized = normalizeTenantSlug(value).replace(/_db$/, '')
  return normalized ? `${normalized}_db` : ''
}

function isJsonObject(value: string) {
  try {
    const parsed = JSON.parse(value) as unknown
    return Boolean(parsed) && typeof parsed === 'object' && !Array.isArray(parsed)
  } catch {
    return false
  }
}
