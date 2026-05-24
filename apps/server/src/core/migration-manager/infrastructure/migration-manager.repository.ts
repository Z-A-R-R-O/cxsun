import { createConnection } from 'mysql2/promise'
import { getDatabase } from '../../../infrastructure/database/connection.js'
import type { Tenant } from '../../tenant/domain/tenant.types.js'
import { dbConfig } from '../../../framework/config/index.js'

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
      .where('status', '=', 'active')
      .where('deleted_at', 'is', null)
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
      password: dbConfig.tenant.password(tenant.db_secret_ref),
      multipleStatements: false,
      connectTimeout: dbConfig.tenant.connectTimeoutMs,
    })

    try {
      await rootConnection.query(`DROP DATABASE IF EXISTS \`${tenant.db_name}\``)
    } finally {
      await rootConnection.end()
    }
  }
}
