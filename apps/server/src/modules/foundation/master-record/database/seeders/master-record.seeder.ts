import { randomInt } from 'crypto'
import type { Kysely } from 'kysely'
import type { TenantDatabaseSchema } from '../../../../../infrastructure/tenant-database/tenant-database.schema.js'
import type { MasterDataModuleDefinition } from '../../domain/value-objects/master-data-definition.js'

type TenantDatabase = Kysely<TenantDatabaseSchema>
type DynamicDB = Record<string, Record<string, unknown>>

function asDynamic(db: TenantDatabase) {
  return db as unknown as Kysely<DynamicDB>
}

export async function seedMasterRecordDefinitions(
  database: TenantDatabase,
  definitions: readonly { definition: MasterDataModuleDefinition; rows: readonly Record<string, unknown>[] }[],
) {
  for (const { definition, rows } of definitions) {
    await seedMasterRecordDefinition(database, definition, rows)
  }
}

export async function seedMasterRecordDefinition(
  database: TenantDatabase,
  definition: MasterDataModuleDefinition,
  rows: readonly Record<string, unknown>[],
) {
  const dynamic = asDynamic(database)
  const timestamp = new Date().toISOString().slice(0, 19).replace('T', ' ')

  for (const row of rows) {
    const existing = await dynamic
      .selectFrom(definition.tableName)
      .select('id')
      .where(definition.defaultSortKey, '=', row[definition.defaultSortKey])
      .executeTakeFirst()

    if (existing) continue

    await dynamic
      .insertInto(definition.tableName)
      .values({
        uuid: String(randomInt(10_000_000, 100_000_000)),
        ...row,
        is_active: true,
        created_at: timestamp,
        updated_at: timestamp,
        deleted_at: null,
      })
      .execute()
  }
}

export { seedMasterRecordDefinition as seedMasterDataDefinition }
