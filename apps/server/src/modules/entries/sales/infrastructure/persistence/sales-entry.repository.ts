import { randomInt } from 'crypto'
import { sql, type Kysely } from 'kysely'
import { BadRequestException } from '../../../../../core/exceptions/http.exception.js'
import { Injectable } from '../../../../../core/decorators/injectable.js'
import type { TenantRuntimeContext } from '../../../../../core/tenant/tenant-context.service.js'
import type { SalesEntry, SalesEntryItem } from '../../domain/entities/sales-entry.entity.js'

type DynamicDatabase = Record<string, Record<string, unknown>>

export interface SalesEntryItemInput {
  id?: number
  product_id?: string | null
  product_name?: string
  description?: string | null
  hsn_code?: string | null
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
  billing_address?: string | null
  shipping_address?: string | null
  place_of_supply?: string | null
  reference_no?: string | null
  due_date?: string | null
  paid_amount?: number
  status?: string
  payment_status?: string
  notes?: string | null
  terms?: string | null
  is_active?: boolean
  items?: SalesEntryItemInput[]
}

@Injectable()
export class SalesEntryRepository {
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
    const items = (input.items?.length ? input.items : [defaultItem()]).map(normalizeItem)
    const subtotal = sum(items.map((item) => item.quantity * item.rate))
    const discountTotal = sum(items.map((item) => item.discount_amount))
    const taxableTotal = subtotal - discountTotal
    const taxTotal = sum(items.map((item) => item.tax_amount))
    const roundOff = roundMoney(Number(input.paid_amount ?? 0) ? 0 : Math.round(taxableTotal + taxTotal) - (taxableTotal + taxTotal))
    const grandTotal = roundMoney(taxableTotal + taxTotal + roundOff)
    const paidAmount = roundMoney(input.paid_amount ?? 0)

    if (!input.customer_name?.trim()) throw new BadRequestException('Customer name is required.')

    return {
      entry: {
        company_id: companyId,
        accounting_year_id: accountingYearId,
        invoice_no: input.invoice_no?.trim() || await this.nextInvoiceNo(context),
        invoice_date: input.invoice_date || today(),
        customer_id: input.customer_id ?? null,
        customer_name: input.customer_name.trim(),
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

  private async nextInvoiceNo(context: TenantRuntimeContext) {
    const currentYear = new Date().getFullYear()
    const prefix = `SAL-${currentYear}-`
    const result = await sql<{ count: number | string | bigint }>`
      SELECT COUNT(*) AS count FROM sales_entries WHERE tenant_id = ${context.tenant.id}
    `.execute(this.database(context))
    return `${prefix}${String(Number(result.rows[0]?.count ?? 0) + 1).padStart(4, '0')}`
  }

  private idColumn(idOrUuid: string) {
    return /^\d+$/.test(idOrUuid) && idOrUuid.length !== 8 ? 'id' : 'uuid'
  }

  private idValue(idOrUuid: string) {
    return this.idColumn(idOrUuid) === 'id' ? Number(idOrUuid) : idOrUuid
  }

  private nextUuid() {
    return String(randomInt(10_000_000, 100_000_000))
  }

  private database(context: TenantRuntimeContext) {
    return context.database as unknown as Kysely<DynamicDatabase>
  }
}

type NormalizedSalesItem = Omit<SalesEntryItem, 'id' | 'uuid' | 'sales_entry_id' | 'sort_order'>

function normalizeItem(input: SalesEntryItemInput): NormalizedSalesItem {
  const quantity = numberValue(input.quantity || 1)
  const rate = numberValue(input.rate)
  const discountAmount = numberValue(input.discount_amount)
  const taxRate = numberValue(input.tax_rate)
  const taxable = Math.max(0, quantity * rate - discountAmount)
  const taxAmount = roundMoney(taxable * taxRate / 100)
  return {
    product_id: emptyAsNull(input.product_id),
    product_name: input.product_name?.trim() || 'Item',
    description: emptyAsNull(input.description),
    hsn_code: emptyAsNull(input.hsn_code),
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
    hsn_code: stringOrNull(row.hsn_code),
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

function roundMoney(value: number) {
  return Math.round(value * 100) / 100
}

function today() {
  return new Date().toISOString().slice(0, 10)
}
