import { Body, Headers, Param, Query } from '../../core/decorators/http-params.js'
import { Controller, Get, Patch, Post } from '../../core/decorators/controller.js'
import { Inject } from '../../core/decorators/inject.js'
import type { TenantRequestHeaders } from '../../core/tenant/tenant-context.service.js'
import { MailService } from './mail.service.js'
import type { MailComposeInput, MailSettingsInput } from './mail.types.js'

@Controller('api/v1/mail')
export class MailController {
  constructor(@Inject(MailService) private readonly mail: MailService) {}

  @Get('settings')
  settings(@Headers() headers: TenantRequestHeaders) {
    return this.mail.settings(headers)
  }

  @Patch('settings')
  saveSettings(@Headers() headers: TenantRequestHeaders, @Body() body: MailSettingsInput) {
    return this.mail.saveSettings(headers, body)
  }

  @Get('messages')
  list(@Headers() headers: TenantRequestHeaders, @Query() query: { status?: string; search?: string; limit?: string }) {
    return this.mail.list(headers, query ?? {})
  }

  @Get('messages/:id')
  get(@Headers() headers: TenantRequestHeaders, @Param('id') id: string) {
    return this.mail.get(headers, id)
  }

  @Post('messages')
  compose(@Headers() headers: TenantRequestHeaders, @Body() body: MailComposeInput) {
    return this.mail.compose(headers, body)
  }
}
