import type { Kysely } from 'kysely'
import type { TenantDatabaseSchema } from '../../../../../infrastructure/tenant-database/tenant-database.schema.js'
import { dispatchPublicUuid } from '../../../../../shared/helpers/public-uuid.js'
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
      .selectAll()
      .where(definition.defaultSortKey, '=', row[definition.defaultSortKey])
      .executeTakeFirst()

    if (existing) {
      const patch = missingSeedValues(existing, row)

      if (Object.keys(patch).length > 0) {
        await dynamic
          .updateTable(definition.tableName)
          .set({
            ...patch,
            updated_at: timestamp,
          })
          .where('id', '=', existing.id)
          .execute()
      }

      continue
    }

    await dynamic
      .insertInto(definition.tableName)
      .values({
        uuid: dispatchPublicUuid(),
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

function missingSeedValues(existing: Record<string, unknown>, row: Record<string, unknown>) {
  const patch: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(row)) {
    if (value === undefined) continue

    const currentValue = existing[key]
    if (currentValue === null || currentValue === undefined || currentValue === '') {
      patch[key] = value
    }
  }

  return patch
}
