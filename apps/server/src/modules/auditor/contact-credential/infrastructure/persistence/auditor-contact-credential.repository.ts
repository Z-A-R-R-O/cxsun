import { sql, type Kysely } from 'kysely'
import { Injectable } from '../../../../../core/decorators/injectable.js'
import { BadRequestException } from '../../../../../core/exceptions/http.exception.js'
import type { TenantRuntimeContext } from '../../../../../core/tenant/tenant-context.service.js'
import { dispatchPublicUuid } from '../../../../../shared/helpers/public-uuid.js'

type DynamicDatabase = Record<string, Record<string, unknown>>

const credentialKeys = ['gst_user', 'gst_pass', 'einvoice_user', 'einvoice_pass', 'eway_user', 'eway_pass', 'einvoice_api_user', 'einvoice_api_pass', 'eway_api_user', 'eway_api_pass', 'email_account_user', 'email_account_pass'] as const

@Injectable()
export class AuditorContactCredentialRepository {
  async list(context: TenantRuntimeContext) {
    return this.database(context).selectFrom('auditor_contact_credentials').selectAll().where('deleted_at', 'is', null).orderBy('contact_name', 'asc').execute()
  }

  async upsert(context: TenantRuntimeContext, input: Record<string, unknown>) {
    const contactId = Number(input.contact_id ?? input.contactId ?? 0)
    const contact = contactId ? await this.database(context).selectFrom('masters_contacts').select(['id', 'name']).where('id', '=', contactId).executeTakeFirst() : null
    if (!contact) throw new BadRequestException('Contact is required.')
    const payload: Record<string, unknown> = { contact_id: contactId, contact_name: String(contact.name), is_active: input.is_active ?? input.isActive ?? true }
    for (const key of credentialKeys) payload[key] = stringOrNull(input[key] ?? input[toCamel(key)])
    const existing = await this.database(context).selectFrom('auditor_contact_credentials').select(['id', 'uuid']).where('contact_id', '=', contactId).executeTakeFirst()
    if (existing) {
      await this.database(context).updateTable('auditor_contact_credentials').set({ ...payload, deleted_at: null, updated_at: sql`CURRENT_TIMESTAMP` }).where('id', '=', Number(existing.id)).execute()
      return this.database(context).selectFrom('auditor_contact_credentials').selectAll().where('id', '=', Number(existing.id)).executeTakeFirst()
    }
    const uuid = await this.nextUuid(context)
    await this.database(context).insertInto('auditor_contact_credentials').values({ ...payload, uuid, deleted_at: null }).execute()
    return this.database(context).selectFrom('auditor_contact_credentials').selectAll().where('uuid', '=', uuid).executeTakeFirst()
  }

  private async nextUuid(context: TenantRuntimeContext) {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const uuid = dispatchPublicUuid()
      const existing = await this.database(context).selectFrom('auditor_contact_credentials').select('id').where('uuid', '=', uuid).executeTakeFirst()
      if (!existing) return uuid
    }
    throw new Error('Could not generate contact credential uuid.')
  }

  private database(context: TenantRuntimeContext) {
    return context.database as unknown as Kysely<DynamicDatabase>
  }
}

function stringOrNull(value: unknown) {
  return value === null || value === undefined || value === '' ? null : String(value).trim()
}

function toCamel(value: string) {
  return value.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase())
}
