import { Inject } from '../../../../core/decorators/inject.js'
import { Injectable } from '../../../../core/decorators/injectable.js'
import { BadRequestException, NotFoundException } from '../../../../core/exceptions/http.exception.js'
import { TenantContextService, type TenantRequestHeaders } from '../../../../core/tenant/tenant-context.service.js'
import { QuotationEntryAggregate } from '../domain/aggregates/quotation-entry.aggregate.js'
import { QuotationEntryEvent } from '../domain/events/quotation-entry.events.js'
import type { QuotationEntry } from '../domain/entities/quotation-entry.entity.js'
import { QuotationEntryRepository, type QuotationEntryInput } from '../infrastructure/persistence/quotation-entry.repository.js'
import { QuotationEntryEventBus } from './quotation-entry-event-bus.js'
import { SalesEntryRepository, type SalesEntryInput } from '../../sales/infrastructure/persistence/sales-entry.repository.js'

type ConsolidatedSalesItem = NonNullable<SalesEntryInput['items']>[number]

@Injectable()
export class QuotationEntryService {
  constructor(
    @Inject(() => TenantContextService) private readonly tenantContext: TenantContextService,
    @Inject(QuotationEntryRepository) private readonly quotationEntries: QuotationEntryRepository,
    @Inject(SalesEntryRepository) private readonly salesEntries: SalesEntryRepository,
    @Inject(QuotationEntryEventBus) private readonly events: QuotationEntryEventBus,
  ) {}

  async list(headers: TenantRequestHeaders) {
    const context = await this.tenantContext.resolve(headers, 'company.manage')
    return this.quotationEntries.list(context)
  }

  async get(headers: TenantRequestHeaders, idOrUuid: string) {
    const context = await this.tenantContext.resolve(headers, 'company.manage')
    const entry = await this.quotationEntries.find(context, idOrUuid)
    if (!entry) throw new NotFoundException('Quotation entry was not found.')
    return entry
  }

  async upsert(headers: TenantRequestHeaders, input: QuotationEntryInput) {
    const context = await this.tenantContext.resolve(headers, 'company.manage')
    const requestedInvoiceNo = String(input.invoice_no ?? '').trim()
    const isUpdate = Boolean(input.id || input.uuid)
    const entry = input.id || input.uuid
      ? await this.quotationEntries.update(context, String(input.uuid ?? input.id), input)
      : await this.quotationEntries.insert(context, input)
    if (!entry) throw new NotFoundException('Quotation entry was not found.')
    const aggregate = QuotationEntryAggregate.fromEntry(entry, context.tenant.id, context.user.email)
    await this.events.publish(input.id || input.uuid ? aggregate.updatedEvent() : aggregate.createdEvent())
    const warning = !isUpdate && requestedInvoiceNo && requestedInvoiceNo !== entry.invoice_no
      ? `Invoice number ${requestedInvoiceNo} was already used, so ${entry.invoice_no} was saved instead.`
      : undefined
    return { ok: true, entry, warning }
  }

  async destroy(headers: TenantRequestHeaders, idOrUuid: string) {
    const context = await this.tenantContext.resolve(headers, 'company.manage')
    const entry = await this.quotationEntries.softDelete(context, idOrUuid)
    if (!entry) return { ok: false, error: 'Quotation entry was not found.' }
    await this.events.publish(QuotationEntryAggregate.fromEntry(entry, context.tenant.id, context.user.email).deletedEvent())
    return { ok: true }
  }

  async restore(headers: TenantRequestHeaders, idOrUuid: string) {
    const context = await this.tenantContext.resolve(headers, 'company.manage')
    const entry = await this.quotationEntries.restore(context, idOrUuid)
    if (!entry) return { ok: false, error: 'Quotation entry was not found.' }
    await this.events.publish(QuotationEntryAggregate.fromEntry(entry, context.tenant.id, context.user.email).restoredEvent())
    return { ok: true }
  }

  async comment(headers: TenantRequestHeaders, idOrUuid: string, body: { body?: unknown }) {
    const context = await this.tenantContext.resolve(headers, 'company.manage')
    const entry = await this.quotationEntries.addComment(context, idOrUuid, String(body.body ?? '').trim())
    if (!entry) throw new NotFoundException('Quotation entry was not found.')
    await this.events.publish(QuotationEntryEvent('entries.quotation.commented', {
      actorEmail: context.user.email,
      entryId: entry.id,
      payload: { invoiceNo: entry.invoice_no },
      tenantId: context.tenant.id,
      uuid: entry.uuid,
    }))
    return { ok: true, entry }
  }

  async tool(headers: TenantRequestHeaders, idOrUuid: string, body: { printHtml?: unknown; tool?: unknown }) {
    const context = await this.tenantContext.resolve(headers, 'company.manage')
    const tool = String(body.tool ?? 'tool').trim()
    const existing = await this.quotationEntries.find(context, idOrUuid)
    if (!existing) throw new NotFoundException('Quotation entry was not found.')
    const recipient = emailRecipient(tool)
    const activity = recipient ? `Email requested to ${recipient}` : `${tool} requested`
    const entry = await this.quotationEntries.addActivity(context, idOrUuid, 'tool', activity)
    if (!entry) throw new NotFoundException('Quotation entry was not found.')
    await this.events.publish(QuotationEntryEvent('entries.quotation.tool', {
      actorEmail: context.user.email,
      entryId: entry.id,
      payload: { tool, invoiceNo: entry.invoice_no },
      tenantId: context.tenant.id,
      uuid: entry.uuid,
    }))
    return { ok: true, entry }
  }

  async generateInvoice(headers: TenantRequestHeaders, body: { quotationIds?: unknown }) {
    const context = await this.tenantContext.resolve(headers, 'company.manage')
    const quotationIds = Array.isArray(body.quotationIds)
      ? body.quotationIds.map((value) => String(value).trim()).filter(Boolean)
      : []
    if (quotationIds.length === 0) throw new BadRequestException('Select at least one quotation.')

    const entries: QuotationEntry[] = []
    for (const id of quotationIds) {
      const entry = await this.quotationEntries.find(context, id)
      if (!entry) throw new NotFoundException('One or more quotations were not found.')
      entries.push(entry)
    }

    const first = entries[0]

    const contactKey = quotationContactKey(first)
    const differentContact = entries.find((entry) => quotationContactKey(entry) !== contactKey)
    if (differentContact) {
      throw new BadRequestException('Selected quotations must belong to the same contact before generating one invoice.')
    }
    const alreadyInvoiced = entries.find((entry) => entry.status === 'invoiced' || entry.generated_sales_invoice_uuid)
    if (alreadyInvoiced) {
      throw new BadRequestException(`Quotation ${alreadyInvoiced.invoice_no} is already invoiced by sales invoice ${alreadyInvoiced.generated_sales_invoice_no ?? alreadyInvoiced.generated_sales_invoice_uuid}. Suspend that sales invoice before generating again.`)
    }

    const sourceRefNo = entries.map((entry) => entry.invoice_no).join(', ')
    const invoiceInput: SalesEntryInput = {
      customer_id: first.customer_id,
      customer_name: first.customer_name,
      customer_gstin: first.customer_gstin,
      customer_state_code: first.customer_state_code,
      customer_state_name: first.customer_state_name,
      billing_address: first.billing_address,
      shipping_address: first.shipping_address,
      place_of_supply: first.place_of_supply,
      reference_no: sourceRefNo,
      status: 'draft',
      payment_status: 'unpaid',
      notes: `Draft invoice generated from quotations: ${sourceRefNo}`,
      source_type: 'quotation',
      source_ref_no: sourceRefNo,
      source_quotation_uuids: entries.map((entry) => entry.uuid),
      terms: first.terms,
      items: consolidateQuotationItems(entries),
    }

    const invoice = await this.salesEntries.insert(context, invoiceInput)
    if (!invoice) throw new NotFoundException('Generated sales invoice was not found.')
    await this.quotationEntries.markInvoicedBySalesInvoice(context, entries.map((entry) => entry.uuid), { invoice_no: invoice.invoice_no, uuid: invoice.uuid })
    return { ok: true, invoice, quotationIds: entries.map((entry) => entry.uuid) }
  }
}

function emailRecipient(tool: string) {
  return /^Send to Email:\s*(.+)$/i.exec(tool)?.[1]?.trim() || null
}

function quotationContactKey(entry: QuotationEntry) {
  return entry.customer_id?.trim() || [
    entry.customer_name.trim().toLowerCase(),
    entry.customer_gstin?.trim().toLowerCase() ?? '',
  ].join('|')
}

function consolidateQuotationItems(entries: QuotationEntry[]): SalesEntryInput['items'] {
  const byKey = new Map<string, ConsolidatedSalesItem>()
  for (const entry of entries) {
    for (const item of entry.items) {
      const key = [
        item.product_id ?? '',
        item.product_name.trim().toLowerCase(),
        item.description?.trim().toLowerCase() ?? '',
        item.hsn_code?.trim().toLowerCase() ?? '',
        item.po_no?.trim().toLowerCase() ?? '',
        item.dc_no?.trim().toLowerCase() ?? '',
        item.colour?.trim().toLowerCase() ?? '',
        item.size?.trim().toLowerCase() ?? '',
        item.unit?.trim().toLowerCase() ?? '',
        Number(item.rate || 0),
        Number(item.discount_amount || 0),
        Number(item.tax_rate || 0),
      ].join('|')
      const current = byKey.get(key)
      if (current) {
        current.quantity = Number(current.quantity || 0) + Number(item.quantity || 0)
      } else {
        byKey.set(key, {
          product_id: item.product_id,
          product_name: item.product_name,
          description: item.description,
          colour: item.colour,
          hsn_code: item.hsn_code,
          po_no: item.po_no,
          dc_no: item.dc_no,
          size: item.size,
          unit: item.unit,
          quantity: Number(item.quantity || 0),
          rate: Number(item.rate || 0),
          discount_amount: Number(item.discount_amount || 0),
          tax_rate: Number(item.tax_rate || 0),
        })
      }
    }
  }
  return Array.from(byKey.values())
}

