import { Body, Headers, Param } from '../../core/decorators/http-params.js'
import { Controller, Get, Post } from '../../core/decorators/controller.js'
import { Inject } from '../../core/decorators/inject.js'
import type { TenantRequestHeaders } from '../../core/tenant/tenant-context.service.js'
import { CrmService } from './crm.service.js'
import type { CrmDealInput, CrmLeadInput, CrmPipelineInput, CrmPipelineStageInput } from './crm.types.js'

@Controller('api/v1/crm')
export class CrmController {
  constructor(@Inject(CrmService) private readonly crm: CrmService) {}

  @Get()
  workspace(@Headers() headers: TenantRequestHeaders) {
    return this.crm.workspace(headers)
  }

  @Post('pipelines/upsert')
  upsertPipeline(@Headers() headers: TenantRequestHeaders, @Body() body: CrmPipelineInput) {
    return this.crm.upsertPipeline(headers, body)
  }

  @Post('pipelines/:idOrUuid/delete')
  deletePipeline(@Headers() headers: TenantRequestHeaders, @Param('idOrUuid') idOrUuid: string) {
    return this.crm.deletePipeline(headers, idOrUuid)
  }

  @Post('pipelines/:idOrUuid/stages/upsert')
  upsertStage(@Headers() headers: TenantRequestHeaders, @Param('idOrUuid') idOrUuid: string, @Body() body: CrmPipelineStageInput) {
    return this.crm.upsertStage(headers, idOrUuid, body)
  }

  @Post('leads/upsert')
  upsertLead(@Headers() headers: TenantRequestHeaders, @Body() body: CrmLeadInput) {
    return this.crm.upsertLead(headers, body)
  }

  @Post('leads/:idOrUuid/delete')
  deleteLead(@Headers() headers: TenantRequestHeaders, @Param('idOrUuid') idOrUuid: string) {
    return this.crm.deleteLead(headers, idOrUuid)
  }

  @Post('deals/upsert')
  upsertDeal(@Headers() headers: TenantRequestHeaders, @Body() body: CrmDealInput) {
    return this.crm.upsertDeal(headers, body)
  }

  @Post('deals/:idOrUuid/delete')
  deleteDeal(@Headers() headers: TenantRequestHeaders, @Param('idOrUuid') idOrUuid: string) {
    return this.crm.deleteDeal(headers, idOrUuid)
  }
}
