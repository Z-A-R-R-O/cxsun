import { Inject } from '../../../../core/decorators/inject.js'
import { Injectable } from '../../../../core/decorators/injectable.js'
import { BadRequestException, NotFoundException } from '../../../../core/exceptions/http.exception.js'
import { TenantContextService, type TenantRequestHeaders } from '../../../../core/tenant/tenant-context.service.js'
import { SalesEntryAggregate } from '../domain/aggregates/sales-entry.aggregate.js'
import { salesEntryEvent } from '../domain/events/sales-entry.events.js'
import { SalesEntryRepository, type SalesEntryInput } from '../infrastructure/persistence/sales-entry.repository.js'
import { EntryDocumentMailService } from '../../shared/entry-document-mail.service.js'
import { EntryDocumentPdfDownloadService } from '../../shared/entry-document-pdf-download.service.js'
import { EntryPostingControlService } from '../../shared/entry-posting-control.service.js'
import { QuotationEntryRepository } from '../../quotation/infrastructure/persistence/quotation-entry.repository.js'
import { SalesEntryEventBus } from './sales-entry-event-bus.js'

@Injectable()
export class SalesEntryService {
  constructor(
    @Inject(() => TenantContextService) private readonly tenantContext: TenantContextService,
    @Inject(SalesEntryRepository) private readonly salesEntries: SalesEntryRepository,
    @Inject(QuotationEntryRepository) private readonly quotationEntries: QuotationEntryRepository,
    @Inject(SalesEntryEventBus) private readonly events: SalesEntryEventBus,
    @Inject(EntryDocumentMailService) private readonly documentMail: EntryDocumentMailService,
    @Inject(EntryDocumentPdfDownloadService) private readonly documentPdf: EntryDocumentPdfDownloadService,
    @Inject(EntryPostingControlService) private readonly postingControl: EntryPostingControlService,
  ) {}

  async list(headers: TenantRequestHeaders) {
    const context = await this.tenantContext.resolve(headers, 'company.manage')
    return this.salesEntries.list(context)
  }

  async get(headers: TenantRequestHeaders, idOrUuid: string) {
    const context = await this.tenantContext.resolve(headers, 'company.manage')
    const entry = await this.salesEntries.find(context, idOrUuid)
    if (!entry) throw new NotFoundException('Sales entry was not found.')
    return entry
  }

  async upsert(headers: TenantRequestHeaders, input: SalesEntryInput) {
    const context = await this.tenantContext.resolve(headers, 'company.manage')
    const requestedInvoiceNo = String(input.invoice_no ?? '').trim()
    const isUpdate = Boolean(input.id || input.uuid)
    if (isUpdate) {
      const existing = await this.salesEntries.find(context, String(input.uuid ?? input.id))
      if (!existing) throw new NotFoundException('Sales entry was not found.')
      await this.postingControl.assertCanChangePosted(context, {
        accountingYearId: existing.accounting_year_id,
        companyId: existing.company_id,
        documentDate: existing.invoice_date,
        documentNo: existing.invoice_no,
        module: 'sales',
        status: existing.status,
      }, 'update')
    } else {
      await this.postingControl.assertPeriodOpen(context, {
        accountingYearId: input.accounting_year_id,
        companyId: input.company_id,
        documentDate: input.invoice_date,
        documentNo: input.invoice_no,
        module: 'sales',
      })
    }
    const entry = input.id || input.uuid
      ? await this.salesEntries.update(context, String(input.uuid ?? input.id), input)
      : await this.salesEntries.insert(context, input)
    if (!entry) throw new NotFoundException('Sales entry was not found.')
    const aggregate = SalesEntryAggregate.fromEntry(entry, context.tenant.id, context.user.email)
    await this.events.publish(input.id || input.uuid ? aggregate.updatedEvent() : aggregate.createdEvent())
    const warning = !isUpdate && requestedInvoiceNo && requestedInvoiceNo !== entry.invoice_no
      ? `Invoice number ${requestedInvoiceNo} was already used, so ${entry.invoice_no} was saved instead.`
      : undefined
    return { ok: true, entry, warning }
  }

  async destroy(headers: TenantRequestHeaders, idOrUuid: string) {
    const context = await this.tenantContext.resolve(headers, 'company.manage')
    const existing = await this.salesEntries.find(context, idOrUuid)
    if (!existing) return { ok: false, error: 'Sales entry was not found.' }
    await this.postingControl.assertCanChangePosted(context, {
      accountingYearId: existing.accounting_year_id,
      companyId: existing.company_id,
      documentDate: existing.invoice_date,
      documentNo: existing.invoice_no,
      module: 'sales',
      status: existing.status,
    }, 'delete')
    const entry = await this.salesEntries.softDelete(context, idOrUuid)
    if (!entry) return { ok: false, error: 'Sales entry was not found.' }
    if (entry.source_type === 'quotation') {
      await this.quotationEntries.releaseBySalesInvoice(context, { invoice_no: entry.invoice_no, uuid: entry.uuid })
    }
    await this.events.publish(SalesEntryAggregate.fromEntry(entry, context.tenant.id, context.user.email).deletedEvent())
    return { ok: true }
  }

  async restore(headers: TenantRequestHeaders, idOrUuid: string) {
    const context = await this.tenantContext.resolve(headers, 'company.manage')
    const existing = await this.salesEntries.find(context, idOrUuid)
    if (!existing) return { ok: false, error: 'Sales entry was not found.' }
    await this.postingControl.assertPeriodOpen(context, {
      accountingYearId: existing.accounting_year_id,
      companyId: existing.company_id,
      documentDate: existing.invoice_date,
      documentNo: existing.invoice_no,
      module: 'sales',
    })
    if (existing.source_type === 'quotation') {
      if (existing.source_quotation_uuids.length === 0) {
        throw new BadRequestException('This sales invoice does not have quotation source details to relock.')
      }
      await this.quotationEntries.markInvoicedBySalesInvoice(context, existing.source_quotation_uuids, { invoice_no: existing.invoice_no, uuid: existing.uuid })
    }
    const entry = await this.salesEntries.restore(context, idOrUuid)
    if (!entry) return { ok: false, error: 'Sales entry was not found.' }
    await this.events.publish(SalesEntryAggregate.fromEntry(entry, context.tenant.id, context.user.email).restoredEvent())
    return { ok: true }
  }

  async correction(headers: TenantRequestHeaders, idOrUuid: string) {
    const context = await this.tenantContext.resolve(headers, 'company.manage')
    const existing = await this.salesEntries.find(context, idOrUuid)
    if (!existing) throw new NotFoundException('Sales entry was not found.')
    await this.postingControl.assertPeriodOpen(context, {
      accountingYearId: existing.accounting_year_id,
      companyId: existing.company_id,
      documentDate: new Date().toISOString().slice(0, 10),
      documentNo: existing.invoice_no,
      module: 'sales',
    })
    const entry = await this.salesEntries.insert(context, salesCorrectionInput(existing))
    if (!entry) throw new NotFoundException('Sales correction was not created.')
    await this.salesEntries.addActivity(context, existing.uuid, 'correction', `Correction draft ${entry.invoice_no} created`)
    await this.postingControl.recordCorrectionActivity(context, { action: 'correction', correctedUuid: entry.uuid, module: 'sales', originalUuid: existing.uuid })
    return { ok: true, entry }
  }

  async reversal(headers: TenantRequestHeaders, idOrUuid: string) {
    const context = await this.tenantContext.resolve(headers, 'company.manage')
    const existing = await this.salesEntries.find(context, idOrUuid)
    if (!existing) throw new NotFoundException('Sales entry was not found.')
    await this.postingControl.assertPeriodOpen(context, {
      accountingYearId: existing.accounting_year_id,
      companyId: existing.company_id,
      documentDate: new Date().toISOString().slice(0, 10),
      documentNo: existing.invoice_no,
      module: 'sales',
    })
    const entry = await this.salesEntries.insert(context, salesReversalInput(existing))
    if (!entry) throw new NotFoundException('Sales reversal was not created.')
    await this.salesEntries.addActivity(context, existing.uuid, 'reversal', `Reversal voucher ${entry.invoice_no} created`)
    await this.postingControl.recordCorrectionActivity(context, { action: 'reversal', module: 'sales', originalUuid: existing.uuid, reversalUuid: entry.uuid })
    return { ok: true, entry }
  }

  async comment(headers: TenantRequestHeaders, idOrUuid: string, body: { body?: unknown }) {
    const context = await this.tenantContext.resolve(headers, 'company.manage')
    const entry = await this.salesEntries.addComment(context, idOrUuid, String(body.body ?? '').trim())
    if (!entry) throw new NotFoundException('Sales entry was not found.')
    await this.events.publish(salesEntryEvent('entries.sales.commented', {
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
    const existing = await this.salesEntries.find(context, idOrUuid)
    if (!existing) throw new NotFoundException('Sales entry was not found.')
    const recipient = emailRecipient(tool)
    if (recipient) await this.documentMail.queueEntryEmail(context, 'sales', existing as unknown as Record<string, unknown>, recipient, body.printHtml)
    const activity = recipient ? `Email queued to ${recipient}` : `${tool} requested`
    const entry = await this.salesEntries.addActivity(context, idOrUuid, 'tool', activity)
    if (!entry) throw new NotFoundException('Sales entry was not found.')
    await this.events.publish(salesEntryEvent('entries.sales.tool', {
      actorEmail: context.user.email,
      entryId: entry.id,
      payload: { tool, invoiceNo: entry.invoice_no },
      tenantId: context.tenant.id,
      uuid: entry.uuid,
    }))
    return { ok: true, entry }
  }

  async pdf(headers: TenantRequestHeaders, idOrUuid: string, body: { printHtml?: unknown }) {
    const context = await this.tenantContext.resolve(headers, 'company.manage')
    const existing = await this.salesEntries.find(context, idOrUuid)
    if (!existing) throw new NotFoundException('Sales entry was not found.')
    return this.documentPdf.render(body.printHtml, existing.invoice_no)
  }
}

function emailRecipient(tool: string) {
  return /^Send to Email:\s*(.+)$/i.exec(tool)?.[1]?.trim() || null
}

function salesCorrectionInput(entry: Awaited<ReturnType<SalesEntryRepository['find']>>): SalesEntryInput {
  if (!entry) return {}
  return {
    accounting_category: entry.accounting_category,
    accounting_ledger_id: entry.accounting_ledger_id,
    accounting_posting_mode: entry.accounting_posting_mode,
    accounting_year_id: entry.accounting_year_id,
    ack_date: dateString(entry.ack_date),
    ack_no: entry.ack_no,
    billing_address: entry.billing_address,
    company_id: entry.company_id,
    customer_gstin: entry.customer_gstin,
    customer_id: entry.customer_id,
    customer_name: entry.customer_name,
    customer_state_code: entry.customer_state_code,
    customer_state_name: entry.customer_state_name,
    due_date: dateString(entry.due_date),
    eway_bill_date: dateString(entry.eway_bill_date),
    eway_bill_no: entry.eway_bill_no,
    eway_part: entry.eway_part,
    invoice_no: '',
    invoice_date: new Date().toISOString().slice(0, 10),
    irn: entry.irn,
    notes: [`Correction draft for ${entry.invoice_no}.`, entry.notes ?? ''].filter(Boolean).join('\n'),
    paid_amount: entry.paid_amount,
    payment_status: entry.payment_status,
    place_of_supply: entry.place_of_supply,
    reference_no: entry.reference_no,
    round_off: entry.round_off,
    shipping_address: entry.shipping_address,
    signed_qr: entry.signed_qr,
    source_ref_no: entry.invoice_no,
    source_type: 'correction',
    status: 'draft',
    terms: entry.terms,
    transport_address: entry.transport_address,
    transport_contact_no: entry.transport_contact_no,
    transport_contact_person: entry.transport_contact_person,
    transport_gst: entry.transport_gst,
    transport_id: entry.transport_id,
    transport_name: entry.transport_name,
    vehicle_no: entry.vehicle_no,
    items: entry.items.map((item) => ({ ...item, id: undefined })),
  }
}

function salesReversalInput(entry: Awaited<ReturnType<SalesEntryRepository['find']>>): SalesEntryInput {
  if (!entry) return {}
  return {
    ...salesCorrectionInput(entry),
    notes: [`Reversal voucher for ${entry.invoice_no}.`, entry.notes ?? ''].filter(Boolean).join('\n'),
    paid_amount: -Number(entry.paid_amount || 0),
    round_off: -Number(entry.round_off || 0),
    status: 'posted',
    items: entry.items.map((item) => ({ ...item, id: undefined, quantity: -Number(item.quantity || 0) })),
  }
}

function dateString(value: Date | string | null | undefined) {
  if (!value) return null
  return value instanceof Date ? value.toISOString().slice(0, 10) : String(value).slice(0, 10)
}
