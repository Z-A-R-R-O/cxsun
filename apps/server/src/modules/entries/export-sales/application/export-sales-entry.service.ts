import { Inject } from '../../../../core/decorators/inject.js'
import { Injectable } from '../../../../core/decorators/injectable.js'
import { NotFoundException } from '../../../../core/exceptions/http.exception.js'
import { TenantContextService, type TenantRequestHeaders } from '../../../../core/tenant/tenant-context.service.js'
import { ExportSalesEntryAggregate } from '../domain/aggregates/export-sales-entry.aggregate.js'
import { ExportSalesEntryEvent } from '../domain/events/export-sales-entry.events.js'
import { ExportSalesEntryRepository, type ExportSalesEntryInput } from '../infrastructure/persistence/export-sales-entry.repository.js'
import { EntryDocumentMailService } from '../../shared/entry-document-mail.service.js'
import { EntryDocumentPdfDownloadService } from '../../shared/entry-document-pdf-download.service.js'
import { ExportSalesEntryEventBus } from './export-sales-entry-event-bus.js'

@Injectable()
export class ExportSalesEntryService {
  constructor(
    @Inject(() => TenantContextService) private readonly tenantContext: TenantContextService,
    @Inject(ExportSalesEntryRepository) private readonly exportSalesEntries: ExportSalesEntryRepository,
    @Inject(ExportSalesEntryEventBus) private readonly events: ExportSalesEntryEventBus,
    @Inject(EntryDocumentMailService) private readonly documentMail: EntryDocumentMailService,
    @Inject(EntryDocumentPdfDownloadService) private readonly documentPdf: EntryDocumentPdfDownloadService,
  ) {}

  async list(headers: TenantRequestHeaders) {
    const context = await this.tenantContext.resolve(headers, 'company.manage')
    return this.exportSalesEntries.list(context)
  }

  async get(headers: TenantRequestHeaders, idOrUuid: string) {
    const context = await this.tenantContext.resolve(headers, 'company.manage')
    const entry = await this.exportSalesEntries.find(context, idOrUuid)
    if (!entry) throw new NotFoundException('Export sales entry was not found.')
    return entry
  }

  async upsert(headers: TenantRequestHeaders, input: ExportSalesEntryInput) {
    const context = await this.tenantContext.resolve(headers, 'company.manage')
    const requestedInvoiceNo = String(input.invoice_no ?? '').trim()
    const isUpdate = Boolean(input.id || input.uuid)
    const entry = input.id || input.uuid
      ? await this.exportSalesEntries.update(context, String(input.uuid ?? input.id), input)
      : await this.exportSalesEntries.insert(context, input)
    if (!entry) throw new NotFoundException('Export sales entry was not found.')
    const aggregate = ExportSalesEntryAggregate.fromEntry(entry, context.tenant.id, context.user.email)
    await this.events.publish(input.id || input.uuid ? aggregate.updatedEvent() : aggregate.createdEvent())
    const warning = !isUpdate && requestedInvoiceNo && requestedInvoiceNo !== entry.invoice_no
      ? `Invoice number ${requestedInvoiceNo} was already used, so ${entry.invoice_no} was saved instead.`
      : undefined
    return { ok: true, entry, warning }
  }

  async destroy(headers: TenantRequestHeaders, idOrUuid: string) {
    const context = await this.tenantContext.resolve(headers, 'company.manage')
    const entry = await this.exportSalesEntries.softDelete(context, idOrUuid)
    if (!entry) return { ok: false, error: 'Export sales entry was not found.' }
    await this.events.publish(ExportSalesEntryAggregate.fromEntry(entry, context.tenant.id, context.user.email).deletedEvent())
    return { ok: true }
  }

  async restore(headers: TenantRequestHeaders, idOrUuid: string) {
    const context = await this.tenantContext.resolve(headers, 'company.manage')
    const entry = await this.exportSalesEntries.restore(context, idOrUuid)
    if (!entry) return { ok: false, error: 'Export sales entry was not found.' }
    await this.events.publish(ExportSalesEntryAggregate.fromEntry(entry, context.tenant.id, context.user.email).restoredEvent())
    return { ok: true }
  }

  async comment(headers: TenantRequestHeaders, idOrUuid: string, body: { body?: unknown }) {
    const context = await this.tenantContext.resolve(headers, 'company.manage')
    const entry = await this.exportSalesEntries.addComment(context, idOrUuid, String(body.body ?? '').trim())
    if (!entry) throw new NotFoundException('Export sales entry was not found.')
    await this.events.publish(ExportSalesEntryEvent('entries.exportSales.commented', {
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
    const existing = await this.exportSalesEntries.find(context, idOrUuid)
    if (!existing) throw new NotFoundException('Export sales entry was not found.')
    const recipient = emailRecipient(tool)
    if (recipient) await this.documentMail.queueEntryEmail(context, 'exportSales', existing as unknown as Record<string, unknown>, recipient, body.printHtml)
    const activity = recipient ? `Email queued to ${recipient}` : `${tool} requested`
    const entry = await this.exportSalesEntries.addActivity(context, idOrUuid, 'tool', activity)
    if (!entry) throw new NotFoundException('Export sales entry was not found.')
    await this.events.publish(ExportSalesEntryEvent('entries.exportSales.tool', {
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
    const existing = await this.exportSalesEntries.find(context, idOrUuid)
    if (!existing) throw new NotFoundException('Export sales entry was not found.')
    return this.documentPdf.render(body.printHtml, existing.invoice_no)
  }
}

function emailRecipient(tool: string) {
  return /^Send to Email:\s*(.+)$/i.exec(tool)?.[1]?.trim() || null
}




