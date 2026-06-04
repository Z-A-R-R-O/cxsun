import { Module } from '../../../core/decorators/module.js'
import { TenantContextService } from '../../../core/tenant/tenant-context.service.js'
import { GstComplianceService } from './application/gst-compliance.service.js'
import { GstComplianceRepository } from './infrastructure/gst-compliance.repository.js'
import { GstComplianceV1Controller } from './interface/http/gst-compliance-v1.controller.js'

@Module({
  controllers: [GstComplianceV1Controller],
  providers: [TenantContextService, GstComplianceService, GstComplianceRepository],
})
export class GstComplianceModule {}
