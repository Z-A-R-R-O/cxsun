import { Body, Headers, Param, Query, Res } from '../../core/decorators/http-params.js'
import { Controller, Get, Post } from '../../core/decorators/controller.js'
import { Inject } from '../../core/decorators/inject.js'
import type { FastifyReply } from 'fastify'
import type { TenantRequestHeaders } from '../../core/tenant/tenant-context.service.js'
import { MediaService } from './media.service.js'
import type { MediaLinkInput, MediaShareInput, MediaUpdateInput, MediaUploadInput } from './media.types.js'

@Controller('api/v1/media')
export class MediaController {
  constructor(@Inject(MediaService) private readonly media: MediaService) {}

  @Get()
  list(@Headers() headers: TenantRequestHeaders, @Query() query: { folder?: string; search?: string; visibility?: string }) {
    return this.media.list(headers, query ?? {})
  }

  @Get(':idOrUuid/content')
  async content(@Headers() headers: TenantRequestHeaders, @Param('idOrUuid') idOrUuid: string, @Query('token') token: string | undefined, @Query('tenant') tenant: string | undefined, @Res() reply: FastifyReply) {
    const result = await this.media.content(headers, idOrUuid, token, tenant)
    return reply
      .header('Content-Type', result.asset.mime_type)
      .header('Content-Length', result.file.length)
      .header('Content-Disposition', `inline; filename="${result.asset.file_name.replace(/"/g, '')}"`)
      .send(result.file)
  }

  @Get(':idOrUuid')
  get(@Headers() headers: TenantRequestHeaders, @Param('idOrUuid') idOrUuid: string) {
    return this.media.get(headers, idOrUuid)
  }

  @Post('upload')
  upload(@Headers() headers: TenantRequestHeaders, @Body() body: MediaUploadInput) {
    return this.media.upload(headers, body)
  }

  @Post(':idOrUuid/update')
  update(@Headers() headers: TenantRequestHeaders, @Param('idOrUuid') idOrUuid: string, @Body() body: MediaUpdateInput) {
    return this.media.update(headers, idOrUuid, body)
  }

  @Post(':idOrUuid/delete')
  destroy(@Headers() headers: TenantRequestHeaders, @Param('idOrUuid') idOrUuid: string) {
    return this.media.destroy(headers, idOrUuid)
  }

  @Post(':idOrUuid/share')
  share(@Headers() headers: TenantRequestHeaders, @Param('idOrUuid') idOrUuid: string, @Body() body: MediaShareInput) {
    return this.media.share(headers, idOrUuid, body ?? {})
  }

  @Post(':idOrUuid/link')
  link(@Headers() headers: TenantRequestHeaders, @Param('idOrUuid') idOrUuid: string, @Body() body: MediaLinkInput) {
    return this.media.link(headers, idOrUuid, body ?? {})
  }
}
