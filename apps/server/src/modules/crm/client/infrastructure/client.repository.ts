import { Injectable } from '../../../../core/decorators/injectable.js'
import { getDatabase } from '../../../../infrastructure/database/connection.js'
import type { ClientRecord, ClientUpsertInput } from '../domain/client.types.js'

@Injectable()
export class ClientRepository {
  list(): Promise<ClientRecord[]> {
    return getDatabase()
      .selectFrom('clients')
      .selectAll()
      .orderBy('updated_at', 'desc')
      .execute() as Promise<ClientRecord[]>
  }

  async upsert(input: ClientUpsertInput): Promise<ClientRecord> {
    const now = new Date().toISOString()
    const data = {
      name: input.name.trim(),
      company_name: nullable(input.company_name),
      category: nullable(input.category),
      source: nullable(input.source),
      phone: nullable(input.phone),
      email: nullable(input.email),
      location: nullable(input.location),
      notes: input.notes?.trim() || '',
      status: input.status ?? 'active',
      updated_at: now,
    }

    if (input.id) {
      await getDatabase().updateTable('clients').set(data).where('id', '=', input.id).execute()
      return this.findOrThrow(input.id)
    }

    await getDatabase().insertInto('clients').values({ ...data, deleted_at: null }).execute()
    const row = await getDatabase()
      .selectFrom('clients')
      .select('id')
      .where('name', '=', data.name)
      .orderBy('id', 'desc')
      .executeTakeFirstOrThrow()

    return this.findOrThrow(row.id)
  }

  async softDelete(id: number): Promise<boolean> {
    const now = new Date().toISOString()
    const result = await getDatabase()
      .updateTable('clients')
      .set({ status: 'suspend', deleted_at: now, updated_at: now })
      .where('id', '=', id)
      .where('deleted_at', 'is', null)
      .executeTakeFirst()

    return Number(result.numUpdatedRows) > 0
  }

  async restore(id: number): Promise<boolean> {
    const now = new Date().toISOString()
    const result = await getDatabase()
      .updateTable('clients')
      .set({ status: 'active', deleted_at: null, updated_at: now })
      .where('id', '=', id)
      .where('deleted_at', 'is not', null)
      .executeTakeFirst()

    return Number(result.numUpdatedRows) > 0
  }

  private async findOrThrow(id: number): Promise<ClientRecord> {
    const client = await getDatabase()
      .selectFrom('clients')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst() as ClientRecord | undefined

    if (!client) {
      throw new Error('Client record was not found.')
    }

    return client
  }
}

function nullable(value: string | null | undefined) {
  const trimmed = value?.trim() ?? ''
  return trimmed ? trimmed : null
}
