import { randomInt } from 'crypto'
import { sql, type Kysely } from 'kysely'
import type { Tenant } from '../../../../../core/tenant/domain/tenant.types.js'
import type { TenantDatabaseSchema } from '../../../../../infrastructure/tenant-database/tenant-database.schema.js'

type TenantDatabase = Kysely<TenantDatabaseSchema>

export async function seedContactMasterTable(database: TenantDatabase, tenant: Tenant) {
  const code = `${tenant.slug.toUpperCase()}-CONTACT`
  const existing = await database
    .selectFrom('masters_contacts')
    .select('id')
    .where('code', '=', code)
    .executeTakeFirst()

  if (existing) {
    return
  }

  await sql`
    INSERT INTO masters_contacts (
      uuid,
      code,
      name,
      description,
      is_active,
      deleted_at
    ) VALUES (
      ${String(randomInt(10_000_000, 100_000_000))},
      ${code},
      ${`${tenant.name} Default Contact`},
      ${`Default contact seed for ${tenant.name}.`},
      1,
      NULL
    )
  `.execute(database)
}
