import { Inject } from '../../../../core/decorators/inject.js'
import { Injectable } from '../../../../core/decorators/injectable.js'
import { BadRequestException, NotFoundException } from '../../../../core/exceptions/http.exception.js'
import { TenantContextService, type TenantRequestHeaders } from '../../../../core/tenant/tenant-context.service.js'
import { SalesEntryAggregate } from '../domain/aggregates/sales-entry.aggregate.js'
import { salesEntryEvent } from '../domain/events/sales-entry.events.js'
import { SalesEntryRepository, type SalesEntryInput } from '../infrastructure/persistence/sales-entry.repository.js'
import { EntryDocumentMailService } from '../../shared/entry-document-mail.service.js'
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
}

function emailRecipient(tool: string) {
  return /^Send to Email:\s*(.+)$/i.exec(tool)?.[1]?.trim() || null
}
