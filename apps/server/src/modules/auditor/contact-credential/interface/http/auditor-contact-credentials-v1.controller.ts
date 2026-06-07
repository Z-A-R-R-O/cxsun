import { Body, Headers } from '../../../../../core/decorators/http-params.js'
import { Controller, Get, Post } from '../../../../../core/decorators/controller.js'
import { Inject } from '../../../../../core/decorators/inject.js'
import type { TenantRequestHeaders } from '../../../../../core/tenant/tenant-context.service.js'
import { AuditorContactCredentialService } from '../../application/auditor-contact-credential.service.js'

@Controller('api/v1/auditor/contact-credentials')
export class AuditorContactCredentialsV1Controller {
  constructor(@Inject(AuditorContactCredentialService) private readonly credentials: AuditorContactCredentialService) {}

  @Get()
  list(@Headers() headers: TenantRequestHeaders) {
    return this.credentials.list(headers)
  }

  @Post('upsert')
  upsert(@Headers() headers: TenantRequestHeaders, @Body() body: Record<string, unknown>) {
    return this.credentials.upsert(headers, body)
  }
}
