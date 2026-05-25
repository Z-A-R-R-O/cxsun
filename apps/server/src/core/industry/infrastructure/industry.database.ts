import { sql } from 'kysely'
import { nowIso, type PlatformDatabaseModule } from '../../../infrastructure/database/database-module.js'

export const industryDatabaseModule: PlatformDatabaseModule = {
  name: 'industry',
  async migrate(database) {
    await sql.raw(`
      CREATE TABLE IF NOT EXISTS industries (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        code VARCHAR(80) NOT NULL UNIQUE,
        name VARCHAR(191) NOT NULL,
        status VARCHAR(32) NOT NULL DEFAULT 'active',
        payload_schema LONGTEXT NOT NULL,
        default_features LONGTEXT NOT NULL,
        default_ui_settings LONGTEXT NOT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        deleted_at DATETIME NULL
      )
    `).execute(database)
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
