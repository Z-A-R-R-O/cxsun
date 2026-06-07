import { type Kysely } from 'kysely'
import { BadRequestException, NotFoundException } from '../../core/exceptions/http.exception.js'
import { Injectable } from '../../core/decorators/injectable.js'
import type { TenantRuntimeContext } from '../../core/tenant/tenant-context.service.js'
import { dispatchPublicUuid } from '../../shared/helpers/public-uuid.js'
import type { CrmDeal, CrmDealInput, CrmLead, CrmLeadInput, CrmPipeline, CrmPipelineInput, CrmPipelineStage, CrmPipelineStageInput, CrmWorkspace } from './crm.types.js'

type DynamicDatabase = Record<string, Record<string, unknown>>

@Injectable()
export class CrmRepository {
  async workspace(context: TenantRuntimeContext): Promise<CrmWorkspace> {
    await this.ensureDefaultPipeline(context)
    const [pipelines, leads, deals] = await Promise.all([
      this.listPipelines(context),
      this.listLeads(context),
      this.listDeals(context),
    ])
    return { pipelines, leads, deals }
  }

  async listPipelines(context: TenantRuntimeContext): Promise<CrmPipeline[]> {
    await this.ensureDefaultPipeline(context)
    const rows = await this.database(context).selectFrom('crm_pipelines').selectAll().where('tenant_id', '=', context.tenant.id).where('deleted_at', 'is', null).orderBy('is_default', 'desc').orderBy('name', 'asc').execute()
    return Promise.all(rows.map((row) => this.toPipeline(context, row)))
  }

  async upsertPipeline(context: TenantRuntimeContext, input: CrmPipelineInput): Promise<CrmWorkspace> {
    const name = input.name?.trim()
    if (!name) throw new BadRequestException('Pipeline name is required.')
    const patch = {
      name,
      description: emptyAsNull(input.description),
      is_default: Boolean(input.is_default),
      is_active: input.is_active ?? true,
      updated_by: context.user.email,
      updated_at: new Date(),
    }
    const existing = input.uuid || input.id
      ? await this.database(context).selectFrom('crm_pipelines').selectAll().where('tenant_id', '=', context.tenant.id).where(idColumn(String(input.uuid ?? input.id)), '=', idValue(String(input.uuid ?? input.id))).where('deleted_at', 'is', null).executeTakeFirst()
      : null
    if (patch.is_default) await this.database(context).updateTable('crm_pipelines').set({ is_default: false, updated_at: new Date(), updated_by: context.user.email }).where('tenant_id', '=', context.tenant.id).execute()
    if (existing) {
      await this.database(context).updateTable('crm_pipelines').set(patch).where('id', '=', Number(existing.id)).execute()
    } else {
      const result = await this.database(context).insertInto('crm_pipelines').values({ uuid: dispatchPublicUuid(), tenant_id: context.tenant.id, created_by: context.user.email, ...patch }).executeTakeFirst()
      await this.createDefaultStages(context, Number(result.insertId))
    }
    return this.workspace(context)
  }

  async deletePipeline(context: TenantRuntimeContext, idOrUuid: string): Promise<CrmWorkspace> {
    const pipeline = await this.findPipelineRow(context, idOrUuid)
    if (!pipeline) throw new NotFoundException('Pipeline was not found.')
    const openDeal = await this.database(context).selectFrom('crm_deals').select('id').where('tenant_id', '=', context.tenant.id).where('pipeline_id', '=', Number(pipeline.id)).where('deleted_at', 'is', null).executeTakeFirst()
    if (openDeal) throw new BadRequestException('Pipeline has deals and cannot be deleted.')
    await this.database(context).updateTable('crm_pipelines').set({ deleted_at: new Date(), updated_at: new Date(), updated_by: context.user.email }).where('id', '=', Number(pipeline.id)).execute()
    return this.workspace(context)
  }

  async upsertStage(context: TenantRuntimeContext, pipelineIdOrUuid: string, input: CrmPipelineStageInput): Promise<CrmWorkspace> {
    const pipeline = await this.findPipelineRow(context, pipelineIdOrUuid)
    if (!pipeline) throw new NotFoundException('Pipeline was not found.')
    const name = input.name?.trim()
    if (!name) throw new BadRequestException('Stage name is required.')
    const patch = {
      name,
      stage_key: slugValue(input.stage_key ?? name),
      probability: numberValue(input.probability),
      sort_order: numberValue(input.sort_order),
      is_won: Boolean(input.is_won),
      is_lost: Boolean(input.is_lost),
      is_active: input.is_active ?? true,
      updated_at: new Date(),
    }
    const existing = input.uuid || input.id
      ? await this.database(context).selectFrom('crm_pipeline_stages').select('id').where('pipeline_id', '=', Number(pipeline.id)).where(idColumn(String(input.uuid ?? input.id)), '=', idValue(String(input.uuid ?? input.id))).executeTakeFirst()
      : null
    if (existing) {
      await this.database(context).updateTable('crm_pipeline_stages').set(patch).where('id', '=', existing.id).execute()
    } else {
      await this.database(context).insertInto('crm_pipeline_stages').values({ uuid: dispatchPublicUuid(), tenant_id: context.tenant.id, pipeline_id: Number(pipeline.id), ...patch }).execute()
    }
    return this.workspace(context)
  }

  async listLeads(context: TenantRuntimeContext): Promise<CrmLead[]> {
    const rows = await this.database(context).selectFrom('crm_leads').selectAll().where('tenant_id', '=', context.tenant.id).where('deleted_at', 'is', null).orderBy('updated_at', 'desc').orderBy('id', 'desc').execute()
    return rows.map(toLead)
  }

  async upsertLead(context: TenantRuntimeContext, input: CrmLeadInput): Promise<CrmWorkspace> {
    const name = input.name?.trim()
    if (!name) throw new BadRequestException('Lead name is required.')
    const patch = {
      name,
      company_name: emptyAsNull(input.company_name),
      email: emptyAsNull(input.email),
      phone: emptyAsNull(input.phone),
      source: emptyAsNull(input.source),
      status: input.status?.trim() || 'new',
      owner_email: emptyAsNull(input.owner_email),
      estimated_value: numberValue(input.estimated_value),
      notes: emptyAsNull(input.notes),
      converted_deal_id: numberOrNull(input.converted_deal_id),
      updated_by: context.user.email,
      updated_at: new Date(),
    }
    const existing = input.uuid || input.id
      ? await this.database(context).selectFrom('crm_leads').select('id').where('tenant_id', '=', context.tenant.id).where(idColumn(String(input.uuid ?? input.id)), '=', idValue(String(input.uuid ?? input.id))).where('deleted_at', 'is', null).executeTakeFirst()
      : null
    if (existing) {
      await this.database(context).updateTable('crm_leads').set(patch).where('id', '=', existing.id).execute()
    } else {
      await this.database(context).insertInto('crm_leads').values({ uuid: dispatchPublicUuid(), tenant_id: context.tenant.id, created_by: context.user.email, ...patch }).execute()
    }
    return this.workspace(context)
  }

  async deleteLead(context: TenantRuntimeContext, idOrUuid: string): Promise<CrmWorkspace> {
    const lead = await this.database(context).selectFrom('crm_leads').select('id').where('tenant_id', '=', context.tenant.id).where(idColumn(idOrUuid), '=', idValue(idOrUuid)).where('deleted_at', 'is', null).executeTakeFirst()
    if (!lead) throw new NotFoundException('Lead was not found.')
    await this.database(context).updateTable('crm_leads').set({ deleted_at: new Date(), updated_at: new Date(), updated_by: context.user.email }).where('id', '=', lead.id).execute()
    return this.workspace(context)
  }

  async listDeals(context: TenantRuntimeContext): Promise<CrmDeal[]> {
    await this.ensureDefaultPipeline(context)
    const rows = await this.database(context).selectFrom('crm_deals').selectAll().where('tenant_id', '=', context.tenant.id).where('deleted_at', 'is', null).orderBy('updated_at', 'desc').orderBy('id', 'desc').execute()
    return rows.map(toDeal)
  }

  async upsertDeal(context: TenantRuntimeContext, input: CrmDealInput): Promise<CrmWorkspace> {
    await this.ensureDefaultPipeline(context)
    const title = input.title?.trim()
    if (!title) throw new BadRequestException('Deal title is required.')
    const pipeline = input.pipeline_id ? await this.findPipelineRow(context, String(input.pipeline_id)) : await this.defaultPipelineRow(context)
    if (!pipeline) throw new BadRequestException('Pipeline is required.')
    const stage = input.stage_id
      ? await this.database(context).selectFrom('crm_pipeline_stages').selectAll().where('pipeline_id', '=', Number(pipeline.id)).where('id', '=', Number(input.stage_id)).executeTakeFirst()
      : await this.database(context).selectFrom('crm_pipeline_stages').selectAll().where('pipeline_id', '=', Number(pipeline.id)).where('is_active', '=', true).orderBy('sort_order', 'asc').executeTakeFirst()
    if (!stage) throw new BadRequestException('Pipeline stage is required.')
    const status = input.status?.trim() || (stage.is_won ? 'won' : stage.is_lost ? 'lost' : 'open')
    const patch = {
      pipeline_id: Number(pipeline.id),
      stage_id: Number(stage.id),
      lead_id: numberOrNull(input.lead_id),
      title,
      account_name: emptyAsNull(input.account_name),
      contact_name: emptyAsNull(input.contact_name),
      email: emptyAsNull(input.email),
      phone: emptyAsNull(input.phone),
      amount: numberValue(input.amount),
      probability: input.probability === undefined || input.probability === null ? numberValue(stage.probability) : numberValue(input.probability),
      expected_close_date: emptyAsNull(input.expected_close_date),
      status,
      owner_email: emptyAsNull(input.owner_email),
      notes: emptyAsNull(input.notes),
      updated_by: context.user.email,
      updated_at: new Date(),
    }
    const existing = input.uuid || input.id
      ? await this.database(context).selectFrom('crm_deals').select('id').where('tenant_id', '=', context.tenant.id).where(idColumn(String(input.uuid ?? input.id)), '=', idValue(String(input.uuid ?? input.id))).where('deleted_at', 'is', null).executeTakeFirst()
      : null
    if (existing) {
      await this.database(context).updateTable('crm_deals').set(patch).where('id', '=', existing.id).execute()
    } else {
      await this.database(context).insertInto('crm_deals').values({ uuid: dispatchPublicUuid(), tenant_id: context.tenant.id, created_by: context.user.email, ...patch }).execute()
    }
    return this.workspace(context)
  }

  async deleteDeal(context: TenantRuntimeContext, idOrUuid: string): Promise<CrmWorkspace> {
    const deal = await this.database(context).selectFrom('crm_deals').select('id').where('tenant_id', '=', context.tenant.id).where(idColumn(idOrUuid), '=', idValue(idOrUuid)).where('deleted_at', 'is', null).executeTakeFirst()
    if (!deal) throw new NotFoundException('Deal was not found.')
    await this.database(context).updateTable('crm_deals').set({ deleted_at: new Date(), updated_at: new Date(), updated_by: context.user.email }).where('id', '=', deal.id).execute()
    return this.workspace(context)
  }

  private async ensureDefaultPipeline(context: TenantRuntimeContext) {
    const existing = await this.database(context).selectFrom('crm_pipelines').select('id').where('tenant_id', '=', context.tenant.id).where('deleted_at', 'is', null).executeTakeFirst()
    if (existing) return
    const result = await this.database(context).insertInto('crm_pipelines').values({ uuid: dispatchPublicUuid(), tenant_id: context.tenant.id, name: 'Default Sales Pipeline', description: 'Global tenant pipeline for leads and deals.', is_default: true, is_active: true, created_by: context.user.email, updated_at: new Date() }).executeTakeFirst()
    await this.createDefaultStages(context, Number(result.insertId))
  }

  private async createDefaultStages(context: TenantRuntimeContext, pipelineId: number) {
    await this.database(context).insertInto('crm_pipeline_stages').values([
      stage(context.tenant.id, pipelineId, 'Qualified', 20, 10),
      stage(context.tenant.id, pipelineId, 'Proposal', 50, 20),
      stage(context.tenant.id, pipelineId, 'Negotiation', 75, 30),
      { ...stage(context.tenant.id, pipelineId, 'Won', 100, 40), is_won: true },
      { ...stage(context.tenant.id, pipelineId, 'Lost', 0, 50), is_lost: true },
    ]).execute()
  }

  private async toPipeline(context: TenantRuntimeContext, row: Record<string, unknown>): Promise<CrmPipeline> {
    const stages = await this.database(context).selectFrom('crm_pipeline_stages').selectAll().where('pipeline_id', '=', Number(row.id)).orderBy('sort_order', 'asc').orderBy('id', 'asc').execute()
    return { ...toPipeline(row), stages: stages.map(toStage) }
  }

  private findPipelineRow(context: TenantRuntimeContext, idOrUuid: string) {
    return this.database(context).selectFrom('crm_pipelines').selectAll().where('tenant_id', '=', context.tenant.id).where(idColumn(idOrUuid), '=', idValue(idOrUuid)).where('deleted_at', 'is', null).executeTakeFirst()
  }

  private defaultPipelineRow(context: TenantRuntimeContext) {
    return this.database(context).selectFrom('crm_pipelines').selectAll().where('tenant_id', '=', context.tenant.id).where('deleted_at', 'is', null).orderBy('is_default', 'desc').orderBy('id', 'asc').executeTakeFirst()
  }

  private database(context: TenantRuntimeContext) {
    return context.database as unknown as Kysely<DynamicDatabase>
  }
}

function toPipeline(row: Record<string, unknown>): Omit<CrmPipeline, 'stages'> {
  return {
    id: Number(row.id),
    uuid: String(row.uuid),
    tenant_id: Number(row.tenant_id),
    name: String(row.name),
    description: stringOrNull(row.description),
    is_default: Boolean(row.is_default),
    is_active: Boolean(row.is_active),
    created_by: String(row.created_by),
    updated_by: stringOrNull(row.updated_by),
    created_at: row.created_at as Date,
    updated_at: row.updated_at as Date,
    deleted_at: row.deleted_at as Date | null,
  }
}

function toStage(row: Record<string, unknown>): CrmPipelineStage {
  return {
    id: Number(row.id),
    uuid: String(row.uuid),
    tenant_id: Number(row.tenant_id),
    pipeline_id: Number(row.pipeline_id),
    name: String(row.name),
    stage_key: String(row.stage_key),
    probability: numberValue(row.probability),
    sort_order: numberValue(row.sort_order),
    is_won: Boolean(row.is_won),
    is_lost: Boolean(row.is_lost),
    is_active: Boolean(row.is_active),
    created_at: row.created_at as Date,
    updated_at: row.updated_at as Date,
  }
}

function toLead(row: Record<string, unknown>): CrmLead {
  return {
    id: Number(row.id),
    uuid: String(row.uuid),
    tenant_id: Number(row.tenant_id),
    name: String(row.name),
    company_name: stringOrNull(row.company_name),
    email: stringOrNull(row.email),
    phone: stringOrNull(row.phone),
    source: stringOrNull(row.source),
    status: String(row.status),
    owner_email: stringOrNull(row.owner_email),
    estimated_value: numberValue(row.estimated_value),
    notes: stringOrNull(row.notes),
    converted_deal_id: numberOrNull(row.converted_deal_id),
    created_by: String(row.created_by),
    updated_by: stringOrNull(row.updated_by),
    created_at: row.created_at as Date,
    updated_at: row.updated_at as Date,
    deleted_at: row.deleted_at as Date | null,
  }
}

function toDeal(row: Record<string, unknown>): CrmDeal {
  return {
    id: Number(row.id),
    uuid: String(row.uuid),
    tenant_id: Number(row.tenant_id),
    pipeline_id: Number(row.pipeline_id),
    stage_id: Number(row.stage_id),
    lead_id: numberOrNull(row.lead_id),
    title: String(row.title),
    account_name: stringOrNull(row.account_name),
    contact_name: stringOrNull(row.contact_name),
    email: stringOrNull(row.email),
    phone: stringOrNull(row.phone),
    amount: numberValue(row.amount),
    probability: numberValue(row.probability),
    expected_close_date: stringOrNull(row.expected_close_date),
    status: String(row.status),
    owner_email: stringOrNull(row.owner_email),
    notes: stringOrNull(row.notes),
    created_by: String(row.created_by),
    updated_by: stringOrNull(row.updated_by),
    created_at: row.created_at as Date,
    updated_at: row.updated_at as Date,
    deleted_at: row.deleted_at as Date | null,
  }
}

function stage(tenantId: number, pipelineId: number, name: string, probability: number, sortOrder: number) {
  return {
    uuid: dispatchPublicUuid(),
    tenant_id: tenantId,
    pipeline_id: pipelineId,
    name,
    stage_key: slugValue(name),
    probability,
    sort_order: sortOrder,
    is_won: false,
    is_lost: false,
    is_active: true,
    updated_at: new Date(),
  }
}

function emptyAsNull(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function stringOrNull(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function numberValue(value: unknown) {
  const number = Number(value ?? 0)
  return Number.isFinite(number) ? number : 0
}

function numberOrNull(value: unknown) {
  const number = Number(value ?? 0)
  return Number.isFinite(number) && number > 0 ? number : null
}

function slugValue(value: unknown) {
  return String(value ?? '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || dispatchPublicUuid()
}

function idColumn(idOrUuid: string) {
  return /^\d+$/.test(idOrUuid) && idOrUuid.length !== 8 ? 'id' : 'uuid'
}

function idValue(idOrUuid: string) {
  return idColumn(idOrUuid) === 'id' ? Number(idOrUuid) : idOrUuid
}
