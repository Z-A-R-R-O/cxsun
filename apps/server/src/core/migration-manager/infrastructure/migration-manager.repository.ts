import { createConnection } from 'mysql2/promise'
import { getDatabase } from '../../../infrastructure/database/connection.js'
import type { Tenant } from '../../tenant/domain/tenant.types.js'

const tenantColumns = [
  'id',
  'code',
  'slug',
  'name',
  'status',
  'db_type',
  'db_host',
  'db_port',
  'db_name',
  'db_user',
  'db_secret_ref',
  'company_count',
  'active_company_count',
  'company_concept_count',
  'payload_settings',
  'created_at',
  'updated_at',
  'deleted_at',
] as const

export class MigrationManagerRepository {
  listTenants() {
    return getDatabase()
      .selectFrom('tenants')
      .select(tenantColumns)
      .where('db_type', '=', 'mariadb')
      .execute() as Promise<Tenant[]>
  }

  findTenant(slug: string) {
    return getDatabase()
      .selectFrom('tenants')
      .select(tenantColumns)
      .where('slug', '=', slug.trim().toLowerCase())
      .executeTakeFirst() as Promise<Tenant | undefined>
  }

  async dropTenantDatabase(tenant: Tenant) {
    const rootConnection = await createConnection({
      host: tenant.db_host,
      port: tenant.db_port,
      user: tenant.db_user,
      password: process.env[tenant.db_secret_ref] ?? process.env.MARIADB_ROOT_PASSWORD,
      multipleStatements: false,
      connectTimeout: Number(process.env.TENANT_DB_CONNECT_TIMEOUT_MS ?? 2_000),
    })

    try {
      await rootConnection.query(`DROP DATABASE IF EXISTS \`${tenant.db_name}\``)
    } finally {
      await rootConnection.end()
    }
  }
}
