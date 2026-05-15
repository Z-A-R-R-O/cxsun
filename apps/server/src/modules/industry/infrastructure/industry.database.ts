import { sql } from 'kysely'
import { addSqliteColumnIfMissing, nowIso, type PlatformDatabaseModule } from '../../../infrastructure/database/database-module.js'

export const industryDatabaseModule: PlatformDatabaseModule = {
  name: 'industry',
  async migrate(database) {
    await database.schema
      .createTable('industries')
      .ifNotExists()
      .addColumn('id', 'integer', (col) => col.primaryKey().autoIncrement())
      .addColumn('code', 'text', (col) => col.notNull().unique())
      .addColumn('name', 'text', (col) => col.notNull())
      .addColumn('status', 'text', (col) => col.notNull().defaultTo('active'))
      .addColumn('payload_schema', 'text', (col) => col.notNull())
      .addColumn('default_features', 'text', (col) => col.notNull())
      .addColumn('default_ui_settings', 'text', (col) => col.notNull())
      .addColumn('created_at', 'text', (col) => col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
      .addColumn('updated_at', 'text', (col) => col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
      .addColumn('deleted_at', 'text')
      .execute()

    await addSqliteColumnIfMissing(database, 'industries', 'status', "text NOT NULL DEFAULT 'active'")
    await addSqliteColumnIfMissing(database, 'industries', 'deleted_at', 'text')
  },
  async seed(database) {
    for (const industry of [
      { code: 'software', name: 'Software' },
      { code: 'accountant', name: 'Accountant' },
      { code: 'computer', name: 'Computer' },
      { code: 'ecommerce', name: 'Ecommerce' },
      { code: 'marketing', name: 'Marketing' },
      { code: 'offset_printing', name: 'Offset Printing' },
      { code: 'garment', name: 'Garment' },
    ]) {
      await ensureIndustry(database, {
        code: industry.code,
        name: industry.name,
        payload_schema: JSON.stringify({
          company: ['profile', 'industryClassification', 'contact'],
          transaction: ['channel', 'workType', 'status'],
        }),
        default_features: JSON.stringify(['company.manage']),
        default_ui_settings: JSON.stringify({
          accent: 'emerald',
          terminology: { company: 'Company', transaction: 'Transaction' },
        }),
      })
    }
  },
}

async function ensureIndustry(
  database: Parameters<NonNullable<PlatformDatabaseModule['seed']>>[0],
  data: {
    code: string
    name: string
    payload_schema: string
    default_features: string
    default_ui_settings: string
  },
) {
  const existing = await database.selectFrom('industries').select('id').where('code', '=', data.code).executeTakeFirst()

  if (existing) {
    await database.updateTable('industries').set({ ...data, status: 'active', deleted_at: null, updated_at: nowIso() }).where('id', '=', existing.id).execute()
    return existing.id
  }

  await database.insertInto('industries').values({ ...data, status: 'active', deleted_at: null }).execute()
  const created = await database.selectFrom('industries').select('id').where('code', '=', data.code).executeTakeFirstOrThrow()
  return created.id
}
