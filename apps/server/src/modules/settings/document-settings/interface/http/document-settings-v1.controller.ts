import { Body, Headers, Param, Query } from '../../../../../core/decorators/http-params.js'
import { Controller, Get, Patch } from '../../../../../core/decorators/controller.js'
import { Inject } from '../../../../../core/decorators/inject.js'
import type { TenantRequestHeaders } from '../../../../../core/tenant/tenant-context.service.js'
import { DocumentNumberService } from '../../application/document-number.service.js'
import type { DocumentNumberContext, DocumentNumberSettingInput } from '../../domain/document-number-record.js'

@Controller('api/v1/document-settings')
export class DocumentSettingsV1Controller {
  constructor(@Inject(DocumentNumberService) private readonly documentNumbers: DocumentNumberService) {}

  @Get('numbers')
  list(@Headers() headers: TenantRequestHeaders, @Query() query: DocumentNumberContext) {
    return this.documentNumbers.list(headers, query)
  }

  @Patch('numbers')
  update(
    @Headers() headers: TenantRequestHeaders,
    @Query() query: DocumentNumberContext,
    @Body() body: { settings?: readonly DocumentNumberSettingInput[] },
  ) {
    return this.documentNumbers.update(headers, query, body)
  }

  @Get('numbers/:kind/next')
  next(@Headers() headers: TenantRequestHeaders, @Param('kind') kind: string, @Query() query: DocumentNumberContext) {
    return this.documentNumbers.next(headers, kind, query)
  }
}

