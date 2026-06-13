import { Inject } from '../../core/decorators/inject.js'
import { Injectable } from '../../core/decorators/injectable.js'
import { TenantContextService, type TenantRequestHeaders } from '../../core/tenant/tenant-context.service.js'
import { CrmRepository } from './crm.repository.js'
import type { CrmDealInput, CrmLeadInput, CrmPipelineInput, CrmPipelineStageInput } from './crm.types.js'

@Injectable()
export class CrmService {
  constructor(
    @Inject(() => TenantContextService) private readonly tenants: TenantContextService,
    @Inject(CrmRepository) private readonly crm: CrmRepository,
  ) {}

  async workspace(headers: TenantRequestHeaders) {
    const context = await this.tenants.resolve(headers, 'company.manage')
    return this.crm.workspace(context)
  }

  async upsertPipeline(headers: TenantRequestHeaders, input: CrmPipelineInput) {
    const context = await this.tenants.resolve(headers, 'company.manage')
    return { ok: true, workspace: await this.crm.upsertPipeline(context, input) }
  }

  async deletePipeline(headers: TenantRequestHeaders, idOrUuid: string) {
    const context = await this.tenants.resolve(headers, 'company.manage')
    return { ok: true, workspace: await this.crm.deletePipeline(context, idOrUuid) }
  }

  async upsertStage(headers: TenantRequestHeaders, pipelineIdOrUuid: string, input: CrmPipelineStageInput) {
    const context = await this.tenants.resolve(headers, 'company.manage')
    return { ok: true, workspace: await this.crm.upsertStage(context, pipelineIdOrUuid, input) }
  }

  async upsertLead(headers: TenantRequestHeaders, input: CrmLeadInput) {
    const context = await this.tenants.resolve(headers, 'company.manage')
    return { ok: true, workspace: await this.crm.upsertLead(context, input) }
  }

  async deleteLead(headers: TenantRequestHeaders, idOrUuid: string) {
    const context = await this.tenants.resolve(headers, 'company.manage')
    return { ok: true, workspace: await this.crm.deleteLead(context, idOrUuid) }
  }

  async upsertDeal(headers: TenantRequestHeaders, input: CrmDealInput) {
    const context = await this.tenants.resolve(headers, 'company.manage')
    return { ok: true, workspace: await this.crm.upsertDeal(context, input) }
  }

  async deleteDeal(headers: TenantRequestHeaders, idOrUuid: string) {
    const context = await this.tenants.resolve(headers, 'company.manage')
    return { ok: true, workspace: await this.crm.deleteDeal(context, idOrUuid) }
  }
}
