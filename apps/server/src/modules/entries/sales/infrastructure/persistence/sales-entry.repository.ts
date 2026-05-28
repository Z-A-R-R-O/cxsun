import { type Kysely } from 'kysely'
import { BadRequestException } from '../../../../../core/exceptions/http.exception.js'
import { Inject } from '../../../../../core/decorators/inject.js'
import { Injectable } from '../../../../../core/decorators/injectable.js'
import type { TenantRuntimeContext } from '../../../../../core/tenant/tenant-context.service.js'
import { dispatchPublicUuid } from '../../../../../shared/helpers/public-uuid.js'
import { DocumentNumberRepository } from '../../../../settings/document-settings/infrastructure/document-number.repository.js'
import type { SalesEntry, SalesEntryItem } from '../../domain/entities/sales-entry.entity.js'

type DynamicDatabase = Record<string, Record<string, unknown>>

export interface SalesEntryItemInput {
  id?: number
  product_id?: string | null
  product_name?: string
  description?: string | null
  colour?: string | null
  hsn_code?: string | null
  po_no?: string | null
  dc_no?: string | null
  size?: string | null
  unit?: string | null
  quantity?: number
  rate?: number
  discount_amount?: number
  tax_rate?: number
}

export interface SalesEntryInput {
  id?: number
  uuid?: string
  company_id?: number
  accounting_year_id?: number
  invoice_no?: string
  invoice_date?: string
  customer_id?: string | null
  customer_name?: string
  customer_gstin?: string | null
  customer_state_code?: string | null
  customer_state_name?: string | null
  billing_address?: string | null
  shipping_address?: string | null
  place_of_supply?: string | null
  reference_no?: string | null
  due_date?: string | null
  round_off?: number | null
  paid_amount?: number
  status?: string
  payment_status?: string
  irn?: string | null
  ack_no?: string | null
  ack_date?: string | null
  signed_qr?: string | null
  eway_bill_no?: string | null
  eway_bill_date?: string | null
  transport_id?: string | null
  transport_name?: string | null
  transport_gst?: string | null
  transport_address?: string | null
  transport_contact_no?: string | null
  transport_contact_person?: string | null
  vehicle_no?: string | null
  eway_part?: string | null
  notes?: string | null
  terms?: string | null
  is_active?: boolean
  items?: SalesEntryItemInput[]
}

@Injectable()
export class SalesEntryRepository {
  constructor(@Inject(DocumentNumberRepository) private readonly documentNumbers: DocumentNumberRepository) {}

  async list(context: TenantRuntimeContext) {
    const rows = await this.database(context)
      .selectFrom('sales_entries')
      .selectAll()
      .where('tenant_id', '=', context.tenant.id)
      .where('deleted_at', 'is', null)
      .orderBy('invoice_date', 'desc')
      .orderBy('id', 'desc')
      .execute()

    return Promise.all(rows.map((row) => this.toEntry(context, row)))
  }

  async find(context: TenantRuntimeContext, idOrUuid: string) {
    const row = await this.database(context)
      .selectFrom('sales_entries')
      .selectAll()
      .where('tenant_id', '=', context.tenant.id)
      .where(this.idColumn(idOrUuid), '=', this.idValue(idOrUuid))
      .executeTakeFirst()

    return row ? this.toEntry(context, row) : null
  }

  async insert(context: TenantRuntimeContext, input: SalesEntryInput) {
    const normalized = await this.normalize(context, input)
    const result = await this.database(context)
      .insertInto('sales_entries')
      .values({ ...normalized.entry, uuid: this.nextUuid(), tenant_id: context.tenant.id, deleted_at: null })
      .executeTakeFirst()

    const id = Number(result.insertId)
    await this.replaceItems(context, id, normalized.items)
    await this.addActivityById(context, id, 'created', 'Sales entry created')
    return this.find(context, String(id))
  }

  async update(context: TenantRuntimeContext, idOrUuid: string, input: SalesEntryInput) {
    const existing = await this.find(context, idOrUuid)
    if (!existing) return null
    const normalized = await this.normalize(context, input)

    await this.database(context)
      .updateTable('sales_entries')
      .set({ ...normalized.entry, updated_at: new Date() })
      .where('tenant_id', '=', context.tenant.id)
      .where('id', '=', existing.id)
      .execute()

    await this.replaceItems(context, existing.id, normalized.items)
    await this.addActivityById(context, existing.id, 'updated', 'Sales entry updated')
    return this.find(context, String(existing.id))
  }

  async softDelete(context: TenantRuntimeContext, idOrUuid: string) {
    const existing = await this.find(context, idOrUuid)
    if (!existing) return null

    await this.database(context)
      .updateTable('sales_entries')
      .set({ is_active: false, deleted_at: new Date(), updated_at: new Date() })
      .where('tenant_id', '=', context.tenant.id)
      .where('id', '=', existing.id)
      .execute()

    await this.addActivityById(context, existing.id, 'deleted', 'Sales entry suspended')
    return this.find(context, String(existing.id))
  }

  async restore(context: TenantRuntimeContext, idOrUuid: string) {
    const existing = await this.find(context, idOrUuid)
    if (!existing) return null

    await this.database(context)
      .updateTable('sales_entries')
      .set({ is_active: true, deleted_at: null, updated_at: new Date() })
      .where('tenant_id', '=', context.tenant.id)
      .where('id', '=', existing.id)
      .execute()

    await this.addActivityById(context, existing.id, 'restored', 'Sales entry restored')
    return this.find(context, String(existing.id))
  }

  async addComment(context: TenantRuntimeContext, idOrUuid: string, body: string) {
    if (!body) throw new BadRequestException('Comment is required.')
    const existing = await this.find(context, idOrUuid)
    if (!existing) return null

    await this.database(context)
      .insertInto('sales_entry_comments')
      .values({ uuid: this.nextUuid(), sales_entry_id: existing.id, author_email: context.user.email, body })
      .execute()

    await this.addActivityById(context, existing.id, 'commented', 'Comment added')
    return this.find(context, String(existing.id))
  }

  async addActivity(context: TenantRuntimeContext, idOrUuid: string, activityType: string, message: string) {
    const existing = await this.find(context, idOrUuid)
    if (!existing) return null
    await this.addActivityById(context, existing.id, activityType, message)
    return this.find(context, String(existing.id))
  }

  private async normalize(context: TenantRuntimeContext, input: SalesEntryInput) {
    const companyId = input.company_id ?? await this.defaultCompanyId(context)
    const accountingYearId = input.accounting_year_id ?? await this.defaultAccountingYearId(context)
    const isCgstSgst = (input.place_of_supply ?? 'cgst-sgst') !== 'igst'
    const items = (input.items?.length ? input.items : [defaultItem()]).map((item) => normalizeItem(item, isCgstSgst))
    const subtotal = sum(items.map((item) => roundMoney(item.quantity * item.rate)))
    const discountTotal = sum(items.map((item) => item.discount_amount))
    const taxableTotal = roundMoney(subtotal - discountTotal)
    const taxTotal = sum(items.map((item) => item.tax_amount))
    const roundOff = input.round_off === null || input.round_off === undefined
      ? roundMoney(Math.round(taxableTotal + taxTotal) - (taxableTotal + taxTotal))
      : roundMoney(input.round_off)
    const grandTotal = roundMoney(taxableTotal + taxTotal + roundOff)
    const paidAmount = roundMoney(input.paid_amount ?? 0)

    if (!input.customer_name?.trim()) throw new BadRequestException('Customer name is required.')
    const invoiceNo = await this.resolveInvoiceNo(context, input.invoice_no, companyId, accountingYearId)

    return {
      entry: {
        company_id: companyId,
        accounting_year_id: accountingYearId,
        invoice_no: invoiceNo,
        invoice_date: input.invoice_date || today(),
        customer_id: input.customer_id ?? null,
        customer_name: input.customer_name.trim(),
        customer_gstin: emptyAsNull(input.customer_gstin),
        customer_state_code: emptyAsNull(input.customer_state_code),
        customer_state_name: emptyAsNull(input.customer_state_name),
        billing_address: emptyAsNull(input.billing_address),
        shipping_address: emptyAsNull(input.shipping_address),
        place_of_supply: emptyAsNull(input.place_of_supply),
        reference_no: emptyAsNull(input.reference_no),
        due_date: emptyAsNull(input.due_date),
        subtotal,
        discount_total: discountTotal,
        taxable_total: taxableTotal,
        tax_total: taxTotal,
        round_off: roundOff,
        grand_total: grandTotal,
        paid_amount: paidAmount,
        balance_amount: roundMoney(grandTotal - paidAmount),
        status: input.status ?? 'draft',
        payment_status: input.payment_status ?? (paidAmount >= grandTotal ? 'paid' : paidAmount > 0 ? 'partial' : 'unpaid'),
        irn: emptyAsNull(input.irn),
        ack_no: emptyAsNull(input.ack_no),
        ack_date: emptyAsNull(input.ack_date),
        signed_qr: emptyAsNull(input.signed_qr),
        eway_bill_no: emptyAsNull(input.eway_bill_no),
        eway_bill_date: emptyAsNull(input.eway_bill_date),
        transport_id: emptyAsNull(input.transport_id),
        transport_name: emptyAsNull(input.transport_name),
        transport_gst: emptyAsNull(input.transport_gst),
        transport_address: emptyAsNull(input.transport_address),
        transport_contact_no: emptyAsNull(input.transport_contact_no),
        transport_contact_person: emptyAsNull(input.transport_contact_person),
        vehicle_no: emptyAsNull(input.vehicle_no),
        eway_part: emptyAsNull(input.eway_part),
        notes: emptyAsNull(input.notes),
        terms: emptyAsNull(input.terms),
        is_active: input.is_active ?? true,
      },
      items,
    }
  }

  private async replaceItems(context: TenantRuntimeContext, salesEntryId: number, items: NormalizedSalesItem[]) {
    await this.database(context).deleteFrom('sales_entry_items').where('sales_entry_id', '=', salesEntryId).execute()
    await this.database(context)
      .insertInto('sales_entry_items')
      .values(items.map((item, index) => ({ ...item, uuid: this.nextUuid(), sales_entry_id: salesEntryId, sort_order: index + 1 })))
      .execute()
  }

  private async toEntry(context: TenantRuntimeContext, row: Record<string, unknown>): Promise<SalesEntry> {
    const id = Number(row.id)
    const [items, comments, activities] = await Promise.all([
      this.database(context).selectFrom('sales_entry_items').selectAll().where('sales_entry_id', '=', id).orderBy('sort_order', 'asc').execute(),
      this.database(context).selectFrom('sales_entry_comments').selectAll().where('sales_entry_id', '=', id).orderBy('id', 'desc').execute(),
      this.database(context).selectFrom('sales_entry_activities').selectAll().where('sales_entry_id', '=', id).orderBy('id', 'desc').execute(),
    ])

    return {
      id,
      uuid: String(row.uuid),
      tenant_id: Number(row.tenant_id),
      company_id: Number(row.company_id),
      accounting_year_id: Number(row.accounting_year_id),
      invoice_no: String(row.invoice_no),
      invoice_date: String(row.invoice_date),
      customer_id: stringOrNull(row.customer_id),
      customer_name: String(row.customer_name),
      customer_gstin: stringOrNull(row.customer_gstin),
      customer_state_code: stringOrNull(row.customer_state_code),
      customer_state_name: stringOrNull(row.customer_state_name),
      billing_address: stringOrNull(row.billing_address),
      shipping_address: stringOrNull(row.shipping_address),
      place_of_supply: stringOrNull(row.place_of_supply),
      reference_no: stringOrNull(row.reference_no),
      due_date: stringOrNull(row.due_date),
      subtotal: numberValue(row.subtotal),
      discount_total: numberValue(row.discount_total),
      taxable_total: numberValue(row.taxable_total),
      tax_total: numberValue(row.tax_total),
      round_off: numberValue(row.round_off),
      grand_total: numberValue(row.grand_total),
      paid_amount: numberValue(row.paid_amount),
      balance_amount: numberValue(row.balance_amount),
      status: String(row.status),
      payment_status: String(row.payment_status),
      irn: stringOrNull(row.irn),
      ack_no: stringOrNull(row.ack_no),
      ack_date: row.ack_date as Date | null,
      signed_qr: stringOrNull(row.signed_qr),
      eway_bill_no: stringOrNull(row.eway_bill_no),
      eway_bill_date: row.eway_bill_date as Date | null,
      transport_id: stringOrNull(row.transport_id),
      transport_name: stringOrNull(row.transport_name),
      transport_gst: stringOrNull(row.transport_gst),
      transport_address: stringOrNull(row.transport_address),
      transport_contact_no: stringOrNull(row.transport_contact_no),
      transport_contact_person: stringOrNull(row.transport_contact_person),
      vehicle_no: stringOrNull(row.vehicle_no),
      eway_part: stringOrNull(row.eway_part),
      notes: stringOrNull(row.notes),
      terms: stringOrNull(row.terms),
      is_active: Boolean(row.is_active),
      created_at: row.created_at as Date,
      updated_at: row.updated_at as Date,
      deleted_at: row.deleted_at as Date | null,
      items: items.map(toItem),
      comments: comments.map((comment) => ({
        id: Number(comment.id),
        uuid: String(comment.uuid),
        sales_entry_id: Number(comment.sales_entry_id),
        author_email: String(comment.author_email),
        body: String(comment.body),
        created_at: comment.created_at as Date,
      })),
      activities: activities.map((activity) => ({
        id: Number(activity.id),
        uuid: String(activity.uuid),
        sales_entry_id: Number(activity.sales_entry_id),
        activity_type: String(activity.activity_type),
        actor_email: String(activity.actor_email),
        message: String(activity.message),
        payload: String(activity.payload ?? '{}'),
        created_at: activity.created_at as Date,
      })),
    }
  }

  private async addActivityById(context: TenantRuntimeContext, salesEntryId: number, activityType: string, message: string) {
    await this.database(context)
      .insertInto('sales_entry_activities')
      .values({
        sales_entry_id: salesEntryId,
        uuid: this.nextUuid(),
        activity_type: activityType,
        actor_email: context.user.email,
        message,
        payload: JSON.stringify({ tenantId: context.tenant.id }),
      })
      .execute()
  }

  private async defaultCompanyId(context: TenantRuntimeContext) {
    const company = await this.database(context)
      .selectFrom('companies')
      .select('id')
      .where('tenant_id', '=', context.tenant.id)
      .where('is_primary', '=', true)
      .executeTakeFirst()
    return Number(company?.id ?? 0)
  }

  private async defaultAccountingYearId(context: TenantRuntimeContext) {
    const year = await this.database(context)
      .selectFrom('accounting_years')
      .select('id')
      .where('is_active', '=', true)
      .orderBy('start_date', 'desc')
      .executeTakeFirst()
    return Number(year?.id ?? 0)
  }

  private async nextInvoiceNo(context: TenantRuntimeContext, companyId: number, accountingYearId: number) {
    const documentNumber = await this.documentNumbers.consumeNext(context, 'sales', {
      accountingYearId: String(accountingYearId),
      companyId: String(companyId),
    })

    if (!documentNumber) {
      throw new BadRequestException('Invoice number is required when automatic sales numbering is disabled.')
    }

    return documentNumber
  }

  private async resolveInvoiceNo(context: TenantRuntimeContext, invoiceNo: string | undefined, companyId: number, accountingYearId: number) {
    const trimmedInvoiceNo = invoiceNo?.trim()

    if (!trimmedInvoiceNo) {
      return this.nextInvoiceNo(context, companyId, accountingYearId)
    }

    const preview = await this.documentNumbers.previewNext(context, 'sales', {
      accountingYearId: String(accountingYearId),
      companyId: String(companyId),
    })

    if (preview.autoEnabled && trimmedInvoiceNo === preview.preview) {
      return this.nextInvoiceNo(context, companyId, accountingYearId)
    }

    return trimmedInvoiceNo
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

type NormalizedSalesItem = Omit<SalesEntryItem, 'id' | 'uuid' | 'sales_entry_id' | 'sort_order'>

function normalizeItem(input: SalesEntryItemInput, isCgstSgst: boolean): NormalizedSalesItem {
  const quantity = numberValue(input.quantity || 1)
  const rate = numberValue(input.rate)
  const discountAmount = numberValue(input.discount_amount)
  const taxRate = numberValue(input.tax_rate)
  const taxable = roundMoney(Math.max(0, quantity * rate - discountAmount))
  const taxAmount = lineTaxAmount(taxable, taxRate, isCgstSgst)
  return {
    product_id: emptyAsNull(input.product_id),
    product_name: input.product_name?.trim() || 'Item',
    description: emptyAsNull(input.description),
    colour: emptyAsNull(input.colour),
    hsn_code: emptyAsNull(input.hsn_code),
    po_no: emptyAsNull(input.po_no),
    dc_no: emptyAsNull(input.dc_no),
    size: emptyAsNull(input.size),
    unit: emptyAsNull(input.unit),
    quantity,
    rate,
    discount_amount: discountAmount,
    tax_rate: taxRate,
    tax_amount: taxAmount,
    line_total: roundMoney(taxable + taxAmount),
  }
}

function defaultItem(): SalesEntryItemInput {
  return { product_name: 'Item', quantity: 1, rate: 0, tax_rate: 0 }
}

function toItem(row: Record<string, unknown>): SalesEntryItem {
  return {
    id: Number(row.id),
    uuid: String(row.uuid),
    sales_entry_id: Number(row.sales_entry_id),
    product_id: stringOrNull(row.product_id),
    product_name: String(row.product_name),
    description: stringOrNull(row.description),
    colour: stringOrNull(row.colour),
    hsn_code: stringOrNull(row.hsn_code),
    po_no: stringOrNull(row.po_no),
    dc_no: stringOrNull(row.dc_no),
    size: stringOrNull(row.size),
    unit: stringOrNull(row.unit),
    quantity: numberValue(row.quantity),
    rate: numberValue(row.rate),
    discount_amount: numberValue(row.discount_amount),
    tax_rate: numberValue(row.tax_rate),
    tax_amount: numberValue(row.tax_amount),
    line_total: numberValue(row.line_total),
    sort_order: Number(row.sort_order ?? 0),
  }
}

function stringOrNull(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function emptyAsNull(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function numberValue(value: unknown) {
  const number = Number(value ?? 0)
  return Number.isFinite(number) ? number : 0
}

function sum(values: number[]) {
  return roundMoney(values.reduce((total, value) => total + value, 0))
}

function lineTaxAmount(taxable: number, taxRate: number, isCgstSgst: boolean) {
  if (!isCgstSgst) return roundMoney(taxable * taxRate / 100)
  const halfTax = roundMoney((taxable * taxRate / 100) / 2)
  return roundMoney(halfTax + halfTax)
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100
}

function today() {
  return new Date().toISOString().slice(0, 10)
}
