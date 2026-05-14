import { Injectable } from '../../../core/decorators/injectable.js'
import type { TenantRuntimeContext } from '../../../core/tenant/tenant-context.service.js'
import type { Company } from '../domain/company.types.js'
import type { NormalizedCompanyData } from '../domain/company.aggregate.js'
import { sql } from 'kysely'

@Injectable()
export class CompanyRepository {
  async list(context: TenantRuntimeContext): Promise<Company[]> {
    const rows = await context.database
      .selectFrom('companies')
      .select(['id', 'name', 'status', 'settings', 'features', 'created_at', 'updated_at', 'deleted_at'])
      .execute()

    return rows
      .filter((row) => isEmptyDeletedAt(row.deleted_at))
      .map((row) => ({
        id: row.id,
        name: row.name,
        status: normalizeStatus(row.status),
        settings: parseJsonObject(row.settings),
        features: parseJsonArray(row.features),
        created_at: row.created_at,
        updated_at: row.updated_at,
        deleted_at: row.deleted_at,
      }))
  }

  async findById(context: TenantRuntimeContext, id: number): Promise<Company | undefined> {
    const row = await context.database
      .selectFrom('companies')
      .select(['id', 'name', 'status', 'settings', 'features', 'created_at', 'updated_at', 'deleted_at'])
      .where('id', '=', id)
      .executeTakeFirst()

    if (!row || !isEmptyDeletedAt(row.deleted_at)) {
      return undefined
    }

    return {
      id: row.id,
      name: row.name,
      status: normalizeStatus(row.status),
      settings: parseJsonObject(row.settings),
      features: parseJsonArray(row.features),
      created_at: row.created_at,
      updated_at: row.updated_at,
      deleted_at: row.deleted_at,
    }
  }

  async insert(context: TenantRuntimeContext, data: NormalizedCompanyData): Promise<Company> {
    const result = await context.database
      .insertInto('companies')
      .values(data)
      .executeTakeFirst()

    const id = Number(result.insertId)
    const company = await this.findById(context, id)

    if (!company) {
      throw new Error('Company insert did not return a persisted company.')
    }

    return company
  }

  async update(context: TenantRuntimeContext, id: number, data: NormalizedCompanyData): Promise<Company> {
    await context.database
      .updateTable('companies')
      .set({ ...data, updated_at: new Date() })
      .where('id', '=', id)
      .execute()

    const company = await this.findById(context, id)

    if (!company) {
      throw new Error('Company update did not return a persisted company.')
    }

    return company
  }

  async softDelete(context: TenantRuntimeContext, id: number): Promise<boolean> {
    const result = await sql<{ affectedRows: number }>`
      UPDATE companies
      SET status = 'suspend', deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = ${id}
    `.execute(context.database)

    return Number((result as unknown as { numAffectedRows?: bigint }).numAffectedRows ?? 0) > 0
  }

  async restore(context: TenantRuntimeContext, id: number): Promise<boolean> {
    const result = await sql`
      UPDATE companies
      SET status = 'active', deleted_at = NULL, updated_at = CURRENT_TIMESTAMP
      WHERE id = ${id}
    `.execute(context.database)

    return Number((result as unknown as { numAffectedRows?: bigint }).numAffectedRows ?? 0) > 0
  }
}

function parseJsonObject(value: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(value) as unknown
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : {}
  } catch {
    return {}
  }
}

function parseJsonArray(value: string): string[] {
  try {
    const parsed = JSON.parse(value) as unknown
    return Array.isArray(parsed) ? parsed.map(String) : []
  } catch {
    return []
  }
}

function normalizeStatus(value: string) {
  return value === 'active' || value === 'not_active' || value === 'suspend'
    ? value
    : 'not_active'
}

function isEmptyDeletedAt(value: Date | null | undefined) {
  return !value || Number.isNaN(value.getTime())
}
