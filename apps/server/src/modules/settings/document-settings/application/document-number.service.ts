import { Inject } from '../../../../core/decorators/inject.js'
import { Injectable } from '../../../../core/decorators/injectable.js'
import type { TenantRequestHeaders } from '../../../../core/tenant/tenant-context.service.js'
import type { DocumentNumberContext, DocumentNumberSettingInput } from '../domain/document-number-record.js'
import { DocumentNumberRepository } from '../infrastructure/document-number.repository.js'

@Injectable()
export class DocumentNumberService {
  constructor(@Inject(DocumentNumberRepository) private readonly numbers: DocumentNumberRepository) {}

  list(headers: TenantRequestHeaders, query: DocumentNumberContext) {
    return this.numbers.list(headers, query)
  }

  update(headers: TenantRequestHeaders, query: DocumentNumberContext, body: { settings?: readonly DocumentNumberSettingInput[] }) {
    return this.numbers.updateMany(headers, query, body.settings ?? [])
  }

  next(headers: TenantRequestHeaders, kind: string, query: DocumentNumberContext) {
    return this.numbers.nextPreview(headers, kind, query)
  }
}

