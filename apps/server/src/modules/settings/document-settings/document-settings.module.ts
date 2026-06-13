import { Module } from '../../../core/decorators/module.js'
import { DocumentNumberService } from './application/document-number.service.js'
import { DocumentNumberRepository } from './infrastructure/document-number.repository.js'
import { DocumentSettingsV1Controller } from './interface/http/document-settings-v1.controller.js'

@Module({
  controllers: [DocumentSettingsV1Controller],
  providers: [DocumentNumberService, DocumentNumberRepository],
})
export class DocumentSettingsModule {}

