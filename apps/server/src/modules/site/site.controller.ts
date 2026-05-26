import { Body, Headers, Query } from '../../core/decorators/http-params.js'
import { Controller, Get, Post } from '../../core/decorators/controller.js'
import { Inject } from '../../core/decorators/inject.js'
import { SiteService, type SiteMessageInput } from './site.service.js'

@Controller('api/site')
export class SiteController {
  constructor(
    @Inject(SiteService) private readonly siteService: SiteService,
  ) {}

  @Get()
  async getLandingContent() {
    return this.siteService.getLandingContent()
  }

  @Get('tenant-static')
  async getTenantStaticSite(
    @Query('domain') domain: string | undefined,
    @Headers('host') host: string | string[] | undefined,
  ) {
    const fallbackHost = Array.isArray(host) ? host[0] : host
    return this.siteService.getTenantStaticSite(domain || fallbackHost || '')
  }

  @Post('contact')
  async createMessage(
    @Body() body: SiteMessageInput,
    @Headers('host') host: string | string[] | undefined,
  ) {
    const fallbackHost = Array.isArray(host) ? host[0] : host
    return this.siteService.createMessage(body, fallbackHost || '')
  }
}
