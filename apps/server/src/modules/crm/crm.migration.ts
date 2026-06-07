import { sql, type Kysely } from 'kysely'
import { dispatchPublicUuid } from '../../shared/helpers/public-uuid.js'

type DynamicDatabase = Record<string, Record<string, unknown>>

export async function migrateCrmTables(database: Kysely<DynamicDatabase>) {
  await sql.raw(`
    CREATE TABLE IF NOT EXISTS crm_pipelines (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      uuid CHAR(8) NOT NULL UNIQUE,
      tenant_id INT NOT NULL,
      name VARCHAR(180) NOT NULL,
      description TEXT NULL,
      is_default TINYINT(1) NOT NULL DEFAULT 0,
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      created_by VARCHAR(191) NOT NULL,
      updated_by VARCHAR(191) NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      deleted_at DATETIME NULL,
      INDEX idx_crm_pipelines_tenant (tenant_id, is_active, name)
    )
  `).execute(database)

  await sql.raw(`
    CREATE TABLE IF NOT EXISTS crm_pipeline_stages (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      uuid CHAR(8) NOT NULL UNIQUE,
      tenant_id INT NOT NULL,
      pipeline_id INT NOT NULL,
      name VARCHAR(160) NOT NULL,
      stage_key VARCHAR(160) NOT NULL,
      probability DOUBLE NOT NULL DEFAULT 0,
      sort_order INT NOT NULL DEFAULT 0,
      is_won TINYINT(1) NOT NULL DEFAULT 0,
      is_lost TINYINT(1) NOT NULL DEFAULT 0,
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uq_crm_stage_key (pipeline_id, stage_key),
      INDEX idx_crm_stages_pipeline (pipeline_id, sort_order, id)
    )
  `).execute(database)

  await sql.raw(`
    CREATE TABLE IF NOT EXISTS crm_leads (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      uuid CHAR(8) NOT NULL UNIQUE,
      tenant_id INT NOT NULL,
      name VARCHAR(220) NOT NULL,
      company_name VARCHAR(220) NULL,
      email VARCHAR(191) NULL,
      phone VARCHAR(80) NULL,
      source VARCHAR(120) NULL,
      status VARCHAR(40) NOT NULL DEFAULT 'new',
      owner_email VARCHAR(191) NULL,
      estimated_value DOUBLE NOT NULL DEFAULT 0,
      notes TEXT NULL,
      converted_deal_id INT NULL,
      created_by VARCHAR(191) NOT NULL,
      updated_by VARCHAR(191) NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      deleted_at DATETIME NULL,
      INDEX idx_crm_leads_tenant (tenant_id, status, updated_at),
      INDEX idx_crm_leads_owner (tenant_id, owner_email, status)
    )
  `).execute(database)

  await sql.raw(`
    CREATE TABLE IF NOT EXISTS crm_deals (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      uuid CHAR(8) NOT NULL UNIQUE,
      tenant_id INT NOT NULL,
      pipeline_id INT NOT NULL,
      stage_id INT NOT NULL,
      lead_id INT NULL,
      title VARCHAR(240) NOT NULL,
      account_name VARCHAR(220) NULL,
      contact_name VARCHAR(220) NULL,
      email VARCHAR(191) NULL,
      phone VARCHAR(80) NULL,
      amount DOUBLE NOT NULL DEFAULT 0,
      probability DOUBLE NOT NULL DEFAULT 0,
      expected_close_date DATE NULL,
      status VARCHAR(40) NOT NULL DEFAULT 'open',
      owner_email VARCHAR(191) NULL,
      notes TEXT NULL,
      created_by VARCHAR(191) NOT NULL,
      updated_by VARCHAR(191) NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      deleted_at DATETIME NULL,
      INDEX idx_crm_deals_pipeline (tenant_id, pipeline_id, stage_id, status),
      INDEX idx_crm_deals_owner (tenant_id, owner_email, status),
      INDEX idx_crm_deals_close (tenant_id, expected_close_date, status)
    )
  `).execute(database)

  await ensureDefaultPipeline(database)
}

async function ensureDefaultPipeline(database: Kysely<DynamicDatabase>) {
  const tenants = await database.selectFrom('tenants' as never).select(['id'] as never).execute().catch(() => [] as Array<{ id: number }>)
  if (!tenants.length) return

  for (const tenant of tenants as Array<{ id: number }>) {
    const existing = await database.selectFrom('crm_pipelines').select('id').where('tenant_id', '=', Number(tenant.id)).where('deleted_at', 'is', null).executeTakeFirst()
    if (existing) continue
    const result = await database.insertInto('crm_pipelines').values({ uuid: dispatchPublicUuid(), tenant_id: Number(tenant.id), name: 'Default Sales Pipeline', description: 'Global tenant pipeline for leads and deals.', is_default: true, is_active: true, created_by: 'system', updated_at: new Date() }).executeTakeFirst()
    const pipelineId = Number(result.insertId)
    await database.insertInto('crm_pipeline_stages').values([
      stage(Number(tenant.id), pipelineId, 'Qualified', 20, 10),
      stage(Number(tenant.id), pipelineId, 'Proposal', 50, 20),
      stage(Number(tenant.id), pipelineId, 'Negotiation', 75, 30),
      { ...stage(Number(tenant.id), pipelineId, 'Won', 100, 40), is_won: true },
      { ...stage(Number(tenant.id), pipelineId, 'Lost', 0, 50), is_lost: true },
    ]).execute()
  }
}

function stage(tenantId: number, pipelineId: number, name: string, probability: number, sortOrder: number) {
  return {
    uuid: dispatchPublicUuid(),
    tenant_id: tenantId,
    pipeline_id: pipelineId,
    name,
    stage_key: name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
    probability,
    sort_order: sortOrder,
    is_won: false,
    is_lost: false,
    is_active: true,
    updated_at: new Date(),
  }
}
