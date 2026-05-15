import { Body, Param } from '../../../../core/decorators/http-params.js'
import { Controller, Get, Post } from '../../../../core/decorators/controller.js'
import { Inject } from '../../../../core/decorators/inject.js'
import type { ClientUpsertInput } from '../../domain/client.types.js'
import { ClientService } from '../../application/client.service.js'

@Controller('api/v1/clients')
export class ClientsV1Controller {
  constructor(
    @Inject(ClientService) private readonly clientService: ClientService,
  ) {}

  @Get()
  async list() {
    return this.clientService.list()
  }

  @Post('upsert')
  async upsert(@Body() body: ClientUpsertInput) {
    return this.clientService.upsert(body)
  }

  @Post(':id/destroy')
  async destroy(@Param('id') id: string) {
    return this.clientService.destroy(Number(id))
  }

  @Post(':id/restore')
  async restore(@Param('id') id: string) {
    return this.clientService.restore(Number(id))
  }
}
