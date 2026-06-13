import { Module } from '../../../core/decorators/module.js'
import { GstComplianceService } from './application/gst-compliance.service.js'
import { GstComplianceRepository } from './infrastructure/gst-compliance.repository.js'
import { GstComplianceV1Controller } from './interface/http/gst-compliance-v1.controller.js'

@Module({
  controllers: [GstComplianceV1Controller],
  providers: [GstComplianceService, GstComplianceRepository],
})
export class GstComplianceModule {}
