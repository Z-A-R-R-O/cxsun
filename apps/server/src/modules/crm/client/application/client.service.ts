import { Inject } from '../../../../core/decorators/inject.js'
import { Injectable } from '../../../../core/decorators/injectable.js'
import type { ClientUpsertInput } from '../domain/client.types.js'
import { ClientRepository } from '../infrastructure/client.repository.js'

@Injectable()
export class ClientService {
  constructor(
    @Inject(ClientRepository) private readonly clients: ClientRepository,
  ) {}

  list() {
    return this.clients.list()
  }

  async upsert(input: ClientUpsertInput) {
    if (!input.name?.trim()) {
      return { ok: false, error: 'Client name is required.' }
    }

    return { ok: true, client: await this.clients.upsert(input) }
  }

  async destroy(id: number) {
    return (await this.clients.softDelete(id))
      ? { ok: true }
      : { ok: false, error: 'Client record was not found.' }
  }

  async restore(id: number) {
    return (await this.clients.restore(id))
      ? { ok: true }
      : { ok: false, error: 'Client record was not found.' }
  }
}
