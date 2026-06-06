import type { Kysely } from 'kysely'
import { BadRequestException } from '../../../core/exceptions/http.exception.js'
import { Inject } from '../../../core/decorators/inject.js'
import { Injectable } from '../../../core/decorators/injectable.js'
import { dispatchPublicUuid } from '../../../shared/helpers/public-uuid.js'
import { DocumentNumberRepository } from '../../settings/document-settings/infrastructure/document-number.repository.js'
import type { TenantRuntimeContext } from '../../../core/tenant/tenant-context.service.js'
import type { ReceiptAllocation, ReceiptEntry, ReceiptEntryInput } from './receipt-entry.types.js'

type DynamicDatabase = Record<string, Record<string, unknown>>

@Injectable()
export class ReceiptEntryRepository {
  constructor(@Inject(DocumentNumberRepository) private readonly documentNumbers: DocumentNumberRepository) {}

  async list(context: TenantRuntimeContext) {
    const companyId = await this.defaultCompanyId(context)
    const accountingYearId = await this.defaultAccountingYearId(context)
    const rows = await this.database(context)
      .selectFrom('receipt_entries')
      .selectAll()
      .where('tenant_id', '=', context.tenant.id)
      .where('company_id', '=', companyId)
      .where('accounting_year_id', '=', accountingYearId)
      .where('deleted_at', 'is', null)
      .orderBy('receipt_date', 'desc')
      .orderBy('id', 'desc')
      .execute()
    return Promise.all(rows.map((row) => this.toEntry(context, row)))
  }

  async find(context: TenantRuntimeContext, idOrUuid: string) {
    const row = await this.database(context)
      .selectFrom('receipt_entries')
      .selectAll()
      .where('tenant_id', '=', context.tenant.id)
      .where(this.idColumn(idOrUuid), '=', this.idValue(idOrUuid))
      .where('deleted_at', 'is', null)
      .executeTakeFirst()
    return row ? this.toEntry(context, row) : null
  }

  async upsert(context: TenantRuntimeContext, input: ReceiptEntryInput) {
    if (input.uuid || input.id) return this.update(context, String(input.uuid ?? input.id), input)
    return this.insert(context, input)
  }

  async insert(context: TenantRuntimeContext, input: ReceiptEntryInput) {
    const normalized = await this.normalize(context, input)
    const result = await this.database(context)
      .insertInto('receipt_entries')
      .values({ ...normalized.entry, tenant_id: context.tenant.id, uuid: this.nextUuid() })
      .executeTakeFirstOrThrow()
    const id = Number(result.insertId)
    await this.replaceAllocations(context, id, normalized.allocations)
    await this.addActivityById(context, id, 'created', `You created ${normalized.entry.receipt_no}`)
    const entry = await this.find(context, String(id))
    if (!entry) throw new BadRequestException('Receipt was created but could not be read back.')
    return entry
  }

  async update(context: TenantRuntimeContext, idOrUuid: string, input: ReceiptEntryInput) {
    const existing = await this.find(context, idOrUuid)
    if (!existing) throw new BadRequestException('Receipt not found.')
    const normalized = await this.normalize(context, { ...input, receipt_no: input.receipt_no || existing.receipt_no }, existing.id)
    await this.database(context)
      .updateTable('receipt_entries')
      .set(normalized.entry)
      .where('tenant_id', '=', context.tenant.id)
      .where('id', '=', existing.id)
      .execute()
    await this.replaceAllocations(context, existing.id, normalized.allocations)
    await this.addActivityById(context, existing.id, 'updated', `You last edited ${normalized.entry.receipt_no}`)
    const entry = await this.find(context, String(existing.id))
    if (!entry) throw new BadRequestException('Receipt was updated but could not be read back.')
    return entry
  }

  async destroy(context: TenantRuntimeContext, idOrUuid: string) {
    const existing = await this.find(context, idOrUuid)
    if (!existing) return false
    await this.database(context)
      .updateTable('receipt_entries')
      .set({ deleted_at: new Date(), is_active: false })
      .where('tenant_id', '=', context.tenant.id)
      .where('id', '=', existing.id)
      .execute()
    return true
  }

  async restore(context: TenantRuntimeContext, idOrUuid: string) {
    await this.database(context)
      .updateTable('receipt_entries')
      .set({ deleted_at: null, is_active: true })
      .where('tenant_id', '=', context.tenant.id)
      .where(this.idColumn(idOrUuid), '=', this.idValue(idOrUuid))
      .execute()
    return this.find(context, idOrUuid)
  }

  async addComment(context: TenantRuntimeContext, idOrUuid: string, body: string) {
    const existing = await this.find(context, idOrUuid)
    if (!existing) return null
    await this.database(context)
      .insertInto('receipt_entry_comments')
      .values({ receipt_entry_id: existing.id, uuid: this.nextUuid(), author_email: context.user.email, body })
      .execute()
    await this.addActivityById(context, existing.id, 'commented', `Commented on ${existing.receipt_no}`)
    return this.find(context, String(existing.id))
  }

  async addActivity(context: TenantRuntimeContext, idOrUuid: string, activityType: string, message: string) {
    const existing = await this.find(context, idOrUuid)
    if (!existing) return null
    await this.addActivityById(context, existing.id, activityType, message)
    return this.find(context, String(existing.id))
  }

  private async normalize(context: TenantRuntimeContext, input: ReceiptEntryInput, existingId?: number) {
    const companyId = input.company_id ?? await this.defaultCompanyId(context)
    const accountingYearId = input.accounting_year_id ?? await this.defaultAccountingYearId(context)
    if (!input.party_name?.trim()) throw new BadRequestException('Customer name is required.')
    const receiptNo = await this.resolveReceiptNo(context, input.receipt_no, companyId, accountingYearId, existingId)
    const amount = roundMoney(input.amount ?? 0)
    const tdsAmount = roundMoney(input.tds_amount ?? 0)
    const discountAmount = roundMoney(input.discount_amount ?? 0)
    const roundOff = roundMoney(input.round_off ?? 0)
    const netAmount = roundMoney(amount - tdsAmount - discountAmount + roundOff)
    const allocations = (input.allocations ?? []).map((allocation, index) => normalizeAllocation(allocation, index)).filter((allocation) => allocation.document_no || allocation.allocated_amount > 0)
    const allocatedAmount = roundMoney(allocations.reduce((sum, allocation) => sum + allocation.allocated_amount, 0))

    return {
      entry: {
        company_id: companyId,
        accounting_year_id: accountingYearId,
        receipt_no: receiptNo,
        receipt_date: input.receipt_date || today(),
        party_id: emptyAsNull(input.party_id),
        party_name: input.party_name.trim(),
        party_type: emptyAsNull(input.party_type) ?? 'customer',
        ledger_id: emptyAsNull(input.ledger_id),
        ledger_name: emptyAsNull(input.ledger_name) ?? (input.receipt_mode === 'cash' ? 'Cash' : null),
        receipt_mode: emptyAsNull(input.receipt_mode) ?? 'cash',
        bank_account_id: emptyAsNull(input.bank_account_id),
        reference_no: emptyAsNull(input.reference_no),
        reference_date: emptyAsNull(input.reference_date),
        amount,
        tds_amount: tdsAmount,
        discount_amount: discountAmount,
        round_off: roundOff,
        net_amount: netAmount,
        allocated_amount: allocatedAmount,
        unallocated_amount: roundMoney(netAmount - allocatedAmount),
        status: input.status ?? 'draft',
        notes: emptyAsNull(input.notes),
        is_active: input.is_active ?? true,
      },
      allocations,
    }
  }

  private async replaceAllocations(context: TenantRuntimeContext, receiptEntryId: number, allocations: NormalizedReceiptAllocation[]) {
    await this.database(context).deleteFrom('receipt_entry_allocations').where('receipt_entry_id', '=', receiptEntryId).execute()
    if (!allocations.length) return
    await this.database(context)
      .insertInto('receipt_entry_allocations')
      .values(allocations.map((allocation, index) => ({ ...allocation, receipt_entry_id: receiptEntryId, sort_order: index + 1 })))
      .execute()
  }

  private async toEntry(context: TenantRuntimeContext, row: Record<string, unknown>): Promise<ReceiptEntry> {
    const id = Number(row.id)
    const [allocations, comments, activities] = await Promise.all([
      this.database(context).selectFrom('receipt_entry_allocations').selectAll().where('receipt_entry_id', '=', id).orderBy('sort_order', 'asc').execute(),
      this.database(context).selectFrom('receipt_entry_comments').selectAll().where('receipt_entry_id', '=', id).orderBy('id', 'desc').execute(),
      this.database(context).selectFrom('receipt_entry_activities').selectAll().where('receipt_entry_id', '=', id).orderBy('id', 'desc').execute(),
    ])
    return {
      id,
      uuid: String(row.uuid),
      tenant_id: Number(row.tenant_id),
      company_id: Number(row.company_id),
      accounting_year_id: Number(row.accounting_year_id),
      receipt_no: String(row.receipt_no),
      receipt_date: row.receipt_date as Date | string,
      party_id: stringOrNull(row.party_id),
      party_name: String(row.party_name),
      party_type: stringOrNull(row.party_type),
      ledger_id: stringOrNull(row.ledger_id),
      ledger_name: stringOrNull(row.ledger_name),
      receipt_mode: String(row.receipt_mode),
      bank_account_id: stringOrNull(row.bank_account_id),
      reference_no: stringOrNull(row.reference_no),
      reference_date: row.reference_date as Date | string | null,
      amount: numberValue(row.amount),
      tds_amount: numberValue(row.tds_amount),
      discount_amount: numberValue(row.discount_amount),
      round_off: numberValue(row.round_off),
      net_amount: numberValue(row.net_amount),
      allocated_amount: numberValue(row.allocated_amount),
      unallocated_amount: numberValue(row.unallocated_amount),
      status: String(row.status),
      notes: stringOrNull(row.notes),
      is_active: Boolean(row.is_active),
      created_at: row.created_at as Date,
      updated_at: row.updated_at as Date,
      deleted_at: row.deleted_at as Date | null,
      allocations: allocations.map(toAllocation),
      comments: comments.map((comment) => ({
        id: Number(comment.id),
        uuid: String(comment.uuid),
        receipt_entry_id: Number(comment.receipt_entry_id),
        author_email: String(comment.author_email),
        body: String(comment.body),
        created_at: comment.created_at as Date,
      })),
      activities: activities.map((activity) => ({
        id: Number(activity.id),
        uuid: String(activity.uuid),
        receipt_entry_id: Number(activity.receipt_entry_id),
        activity_type: String(activity.activity_type),
        actor_email: String(activity.actor_email),
        message: String(activity.message),
        payload: String(activity.payload ?? '{}'),
        created_at: activity.created_at as Date,
      })),
    }
  }

  private async addActivityById(context: TenantRuntimeContext, receiptEntryId: number, activityType: string, message: string) {
    await this.database(context)
      .insertInto('receipt_entry_activities')
      .values({ receipt_entry_id: receiptEntryId, uuid: this.nextUuid(), activity_type: activityType, actor_email: context.user.email, message, payload: JSON.stringify({ tenantId: context.tenant.id }) })
      .execute()
  }

  private async defaultCompanyId(context: TenantRuntimeContext) {
    const defaultCompany = await this.database(context).selectFrom('default_companies').select('company_id').where('is_active', '=', true).orderBy('id', 'asc').executeTakeFirst()
    if (defaultCompany?.company_id) return Number(defaultCompany.company_id)

    const company = await this.database(context).selectFrom('companies').select('id').where('tenant_id', '=', context.tenant.id).where('is_primary', '=', true).executeTakeFirst()
    return Number(company?.id ?? 0)
  }

  private async defaultAccountingYearId(context: TenantRuntimeContext) {
    const defaultYear = await this.database(context).selectFrom('default_companies').select('accounting_year_id').where('is_active', '=', true).orderBy('id', 'asc').executeTakeFirst()
    if (defaultYear?.accounting_year_id) return Number(defaultYear.accounting_year_id)

    const year = await this.database(context).selectFrom('accounting_years').select('id').where('is_active', '=', true).orderBy('start_date', 'desc').executeTakeFirst()
    return Number(year?.id ?? 0)
  }

  private async resolveReceiptNo(context: TenantRuntimeContext, receiptNo: string | undefined, companyId: number, accountingYearId: number, existingId?: number) {
    const trimmedReceiptNo = receiptNo?.trim()
    if (!trimmedReceiptNo) return this.nextReceiptNo(context, companyId, accountingYearId)
    const preview = await this.documentNumbers.previewNext(context, 'receipt', { accountingYearId: String(accountingYearId), companyId: String(companyId) })
    if (preview.autoEnabled && trimmedReceiptNo === preview.preview) return this.nextReceiptNo(context, companyId, accountingYearId)
    if (await this.receiptNoExists(context, trimmedReceiptNo, companyId, accountingYearId, existingId)) {
      if (!preview.autoEnabled) throw new BadRequestException(`Receipt number ${trimmedReceiptNo} already exists.`)
      return this.nextReceiptNo(context, companyId, accountingYearId)
    }
    await this.documentNumbers.advancePast(context, 'receipt', { accountingYearId: String(accountingYearId), companyId: String(companyId) }, trimmedReceiptNo)
    return trimmedReceiptNo
  }

  private async nextReceiptNo(context: TenantRuntimeContext, companyId: number, accountingYearId: number) {
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const documentNumber = await this.documentNumbers.consumeNext(context, 'receipt', { accountingYearId: String(accountingYearId), companyId: String(companyId) })
      if (!documentNumber) throw new BadRequestException('Receipt number is required when automatic receipt numbering is disabled.')
      if (!await this.receiptNoExists(context, documentNumber, companyId, accountingYearId)) return documentNumber
    }

    throw new BadRequestException('Unable to find an available receipt number. Please check document number settings.')
  }

  private async receiptNoExists(context: TenantRuntimeContext, receiptNo: string, companyId: number, accountingYearId: number, existingId?: number) {
    let query = this.database(context)
      .selectFrom('receipt_entries')
      .select('id')
      .where('tenant_id', '=', context.tenant.id)
      .where('company_id', '=', companyId)
      .where('accounting_year_id', '=', accountingYearId)
      .where('receipt_no', '=', receiptNo)

    if (existingId) query = query.where('id', '!=', existingId)
    return Boolean(await query.executeTakeFirst())
  }

  private idColumn(idOrUuid: string) {
    return /^\d+$/.test(idOrUuid) && idOrUuid.length !== 8 ? 'id' : 'uuid'
  }

  private idValue(idOrUuid: string) {
    return this.idColumn(idOrUuid) === 'id' ? Number(idOrUuid) : idOrUuid
  }

  private nextUuid() {
    return dispatchPublicUuid()
  }

  private database(context: TenantRuntimeContext) {
    return context.database as unknown as Kysely<DynamicDatabase>
  }
}

type NormalizedReceiptAllocation = Omit<ReceiptAllocation, 'id' | 'receipt_entry_id'>

function normalizeAllocation(input: ReceiptAllocation, index: number): NormalizedReceiptAllocation {
  const previousBalance = roundMoney(input.previous_balance ?? 0)
  const allocatedAmount = roundMoney(input.allocated_amount ?? 0)
  return {
    document_type: input.document_type || 'sales',
    document_id: emptyAsNull(input.document_id),
    document_no: String(input.document_no ?? '').trim(),
    document_date: emptyAsNull(input.document_date),
    document_total: roundMoney(input.document_total ?? 0),
    previous_balance: previousBalance,
    allocated_amount: allocatedAmount,
    balance_after_allocation: roundMoney(previousBalance - allocatedAmount),
    sort_order: index + 1,
  }
}

function toAllocation(row: Record<string, unknown>): ReceiptAllocation {
  return {
    id: Number(row.id),
    receipt_entry_id: Number(row.receipt_entry_id),
    document_type: String(row.document_type),
    document_id: stringOrNull(row.document_id),
    document_no: String(row.document_no),
    document_date: row.document_date as Date | string | null,
    document_total: numberValue(row.document_total),
    previous_balance: numberValue(row.previous_balance),
    allocated_amount: numberValue(row.allocated_amount),
    balance_after_allocation: numberValue(row.balance_after_allocation),
    sort_order: numberValue(row.sort_order),
  }
}

function numberValue(value: unknown) {
  const number = Number(value ?? 0)
  return Number.isFinite(number) ? number : 0
}

function stringOrNull(value: unknown) {
  if (value === null || value === undefined) return null
  const text = String(value).trim()
  return text ? text : null
}

function emptyAsNull(value: unknown) {
  return stringOrNull(value)
}

function roundMoney(value: unknown) {
  return Math.round(numberValue(value) * 100) / 100
}

function today() {
  return new Date().toISOString().slice(0, 10)
}
