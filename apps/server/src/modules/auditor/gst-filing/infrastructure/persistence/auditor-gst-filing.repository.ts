import { sql, type Kysely } from 'kysely'
import { Injectable } from '../../../../../core/decorators/injectable.js'
import type { TenantRuntimeContext } from '../../../../../core/tenant/tenant-context.service.js'
import { BadRequestException } from '../../../../../core/exceptions/http.exception.js'
import { dispatchPublicUuid } from '../../../../../shared/helpers/public-uuid.js'
import type { AuditorGstFilingRecord, AuditorGstFilingUpsertInput } from '../../domain/entities/auditor-gst-filing.entity.js'

type DynamicDatabase = Record<string, Record<string, unknown>>

@Injectable()
export class AuditorGstFilingRepository {
  async list(context: TenantRuntimeContext, filters: { contactId?: number; monthName?: string; accountingYearName?: string }) {
    const database = this.database(context)
    const monthName = filters.monthName?.trim()
    const accountingYearName = filters.accountingYearName?.trim()

    let query = database
      .selectFrom('auditor_gst_filings')
      .selectAll()
      .where('deleted_at', 'is', null)
      .orderBy('contact_name', 'asc')
      .orderBy('id', 'asc')

    if (filters.contactId) query = query.where('contact_id', '=', filters.contactId)
    if (monthName) query = query.where('month_name', '=', monthName)
    if (accountingYearName) query = query.where('accounting_year_name', '=', accountingYearName)

    return query.execute() as unknown as Promise<AuditorGstFilingRecord[]>
  }

  async upsert(context: TenantRuntimeContext, input: AuditorGstFilingUpsertInput) {
    const payload = await this.normalize(context, input)
    const idOrUuid = input.uuid ?? input.id

    if (idOrUuid) {
      await this.database(context)
        .updateTable('auditor_gst_filings')
        .set({ ...payload, updated_at: sql`CURRENT_TIMESTAMP` })
        .where(/^\d+$/.test(String(idOrUuid)) ? 'id' : 'uuid', '=', /^\d+$/.test(String(idOrUuid)) ? Number(idOrUuid) : String(idOrUuid))
        .execute()
      return this.find(context, String(idOrUuid))
    }

    const existing = await this.database(context)
      .selectFrom('auditor_gst_filings')
      .select(['id', 'uuid'])
      .where('contact_id', '=', payload.contact_id)
      .where('month_name', '=', payload.month_name)
      .where('accounting_year_name', '=', payload.accounting_year_name)
      .where('deleted_at', 'is', null)
      .executeTakeFirst()

    if (existing) {
      await this.database(context)
        .updateTable('auditor_gst_filings')
        .set({ ...payload, updated_at: sql`CURRENT_TIMESTAMP` })
        .where('id', '=', Number(existing.id))
        .execute()
      return this.find(context, String(existing.uuid))
    }

    const uuid = await this.nextUuid(context)
    await this.database(context).insertInto('auditor_gst_filings').values({ ...payload, uuid, deleted_at: null }).execute()
    return this.find(context, uuid)
  }

  async softDelete(context: TenantRuntimeContext, idOrUuid: string) {
    await this.database(context)
      .updateTable('auditor_gst_filings')
      .set({ deleted_at: sql`CURRENT_TIMESTAMP`, is_active: false, updated_at: sql`CURRENT_TIMESTAMP` })
      .where(/^\d+$/.test(idOrUuid) ? 'id' : 'uuid', '=', /^\d+$/.test(idOrUuid) ? Number(idOrUuid) : idOrUuid)
      .execute()
    return true
  }

  private async find(context: TenantRuntimeContext, idOrUuid: string) {
    const record = await this.database(context)
      .selectFrom('auditor_gst_filings')
      .selectAll()
      .where(/^\d+$/.test(idOrUuid) ? 'id' : 'uuid', '=', /^\d+$/.test(idOrUuid) ? Number(idOrUuid) : idOrUuid)
      .executeTakeFirst()
    return record as AuditorGstFilingRecord | undefined
  }

  private async normalize(context: TenantRuntimeContext, input: AuditorGstFilingUpsertInput) {
    const contactId = Number(input.contact_id ?? input.contactId ?? input.client_id ?? input.clientId ?? 0)
    const contact = contactId ? await this.database(context).selectFrom('masters_contacts').select(['id', 'name']).where('id', '=', contactId).executeTakeFirst() : null
    const contactName = String(contact?.name ?? input.contact_name ?? input.contactName ?? input.client_name ?? input.clientName ?? '').trim()
    const monthName = String(input.month_name ?? input.monthName ?? '').trim()
    const accountingYearName = String(input.accounting_year_name ?? input.accountingYearName ?? '').trim()

    if (!contactId || !contactName) throw new BadRequestException('Contact is required.')
    if (!monthName) throw new BadRequestException('Month is required.')
    if (!accountingYearName) throw new BadRequestException('Year is required.')

    return {
      contact_id: contactId,
      contact_name: contactName,
      client_id: contactId,
      client_name: contactName,
      month_id: nullableString(input.month_id ?? input.monthId),
      month_name: monthName,
      accounting_year_id: nullableString(input.accounting_year_id ?? input.accountingYearId),
      accounting_year_name: accountingYearName,
      gstr1_arn: nullableString(input.gstr1_arn ?? input.gstr1Arn),
      gstr1_date: nullableDate(input.gstr1_date ?? input.gstr1Date),
      gstr3b_arn: nullableString(input.gstr3b_arn ?? input.gstr3bArn),
      gstr3b_date: nullableDate(input.gstr3b_date ?? input.gstr3bDate),
      status: String(input.status ?? statusFrom(input)).trim() || 'pending',
      is_active: input.is_active ?? input.isActive ?? true,
    }
  }

  private async nextUuid(context: TenantRuntimeContext) {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const uuid = dispatchPublicUuid()
      const existing = await this.database(context).selectFrom('auditor_gst_filings').select('id').where('uuid', '=', uuid).executeTakeFirst()
      if (!existing) return uuid
    }
    throw new Error('Could not generate GST filing public uuid.')
  }

  private database(context: TenantRuntimeContext) {
    return context.database as unknown as Kysely<DynamicDatabase>
  }
}

function nullableString(value: unknown) {
  return value === null || value === undefined || value === '' ? null : String(value).trim()
}

function nullableDate(value: unknown) {
  const text = nullableString(value)
  return text ? text.slice(0, 10) : null
}

function statusFrom(input: AuditorGstFilingUpsertInput) {
  return input.gstr1_arn || input.gstr1Arn || input.gstr3b_arn || input.gstr3bArn ? 'finished' : 'pending'
}
