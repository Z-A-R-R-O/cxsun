import 'reflect-metadata'
import { Module } from '../../../core/decorators/module.js'
import { ClientService } from './application/client.service.js'
import { ClientRepository } from './infrastructure/client.repository.js'
import { ClientsV1Controller } from './interface/http/clients-v1.controller.js'

@Module({
  controllers: [ClientsV1Controller],
  providers: [ClientService, ClientRepository],
})
export class ClientModule {}
