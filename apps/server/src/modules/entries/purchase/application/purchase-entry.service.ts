import { Inject } from '../../../../core/decorators/inject.js'
import { Injectable } from '../../../../core/decorators/injectable.js'
import { BadRequestException, NotFoundException } from '../../../../core/exceptions/http.exception.js'
import { TenantContextService, type TenantRequestHeaders } from '../../../../core/tenant/tenant-context.service.js'
import { PurchaseEntryAggregate } from '../domain/aggregates/purchase-entry.aggregate.js'
import { PurchaseEntryEvent } from '../domain/events/purchase-entry.events.js'
import { PurchaseEntryRepository, type PurchaseEntryInput } from '../infrastructure/persistence/purchase-entry.repository.js'
import { EntryDocumentMailService } from '../../shared/entry-document-mail.service.js'
import { EntryDocumentPdfDownloadService } from '../../shared/entry-document-pdf-download.service.js'
import { EntryPostingControlService } from '../../shared/entry-posting-control.service.js'
import { PurchaseEntryEventBus } from './purchase-entry-event-bus.js'

@Injectable()
export class PurchaseEntryService {
  constructor(
    @Inject(() => TenantContextService) private readonly tenantContext: TenantContextService,
    @Inject(PurchaseEntryRepository) private readonly purchaseEntries: PurchaseEntryRepository,
    @Inject(PurchaseEntryEventBus) private readonly events: PurchaseEntryEventBus,
    @Inject(EntryDocumentMailService) private readonly documentMail: EntryDocumentMailService,
    @Inject(EntryDocumentPdfDownloadService) private readonly documentPdf: EntryDocumentPdfDownloadService,
    @Inject(EntryPostingControlService) private readonly postingControl: EntryPostingControlService,
  ) {}

  async list(headers: TenantRequestHeaders) {
    const context = await this.tenantContext.resolve(headers, 'company.manage')
    return this.purchaseEntries.list(context)
  }

  async get(headers: TenantRequestHeaders, idOrUuid: string) {
    const context = await this.tenantContext.resolve(headers, 'company.manage')
    const entry = await this.purchaseEntries.find(context, idOrUuid)
    if (!entry) throw new NotFoundException('Purchase entry was not found.')
    return entry
  }

  async upsert(headers: TenantRequestHeaders, input: PurchaseEntryInput) {
    const context = await this.tenantContext.resolve(headers, 'company.manage')
    const requestedEntryNo = String(input.entry_no ?? '').trim()
    const isUpdate = Boolean(input.id || input.uuid)
    if (isUpdate) {
      const existing = await this.purchaseEntries.find(context, String(input.uuid ?? input.id))
      if (!existing) throw new NotFoundException('Purchase entry was not found.')
      await this.postingControl.assertCanChangePosted(context, {
        accountingYearId: existing.accounting_year_id,
        companyId: existing.company_id,
        documentDate: existing.entry_date,
        documentNo: existing.entry_no,
        module: 'purchase',
        status: existing.status,
      }, 'update')
    } else {
      await this.postingControl.assertPeriodOpen(context, {
        accountingYearId: input.accounting_year_id,
        companyId: input.company_id,
        documentDate: input.entry_date,
        documentNo: input.entry_no,
        module: 'purchase',
      })
    }
    const entry = input.id || input.uuid
      ? await this.purchaseEntries.update(context, String(input.uuid ?? input.id), input)
      : await this.purchaseEntries.insert(context, input)
    if (!entry) throw new NotFoundException('Purchase entry was not found.')
    const aggregate = PurchaseEntryAggregate.fromEntry(entry, context.tenant.id, context.user.email)
    await this.events.publish(input.id || input.uuid ? aggregate.updatedEvent() : aggregate.createdEvent())
    const warning = !isUpdate && requestedEntryNo && requestedEntryNo !== entry.entry_no
      ? `Entry number ${requestedEntryNo} was already used, so ${entry.entry_no} was saved instead.`
      : undefined
    return { ok: true, entry, warning }
  }

  async destroy(headers: TenantRequestHeaders, idOrUuid: string) {
    const context = await this.tenantContext.resolve(headers, 'company.manage')
    const existing = await this.purchaseEntries.find(context, idOrUuid)
    if (!existing) return { ok: false, error: 'Purchase entry was not found.' }
    await this.postingControl.assertCanChangePosted(context, {
      accountingYearId: existing.accounting_year_id,
      companyId: existing.company_id,
      documentDate: existing.entry_date,
      documentNo: existing.entry_no,
      module: 'purchase',
      status: existing.status,
    }, 'delete')
    const entry = await this.purchaseEntries.softDelete(context, idOrUuid)
    if (!entry) return { ok: false, error: 'Purchase entry was not found.' }
    await this.events.publish(PurchaseEntryAggregate.fromEntry(entry, context.tenant.id, context.user.email).deletedEvent())
    return { ok: true }
  }

  async restore(headers: TenantRequestHeaders, idOrUuid: string) {
    const context = await this.tenantContext.resolve(headers, 'company.manage')
    const existing = await this.purchaseEntries.find(context, idOrUuid)
    if (!existing) return { ok: false, error: 'Purchase entry was not found.' }
    await this.postingControl.assertPeriodOpen(context, {
      accountingYearId: existing.accounting_year_id,
      companyId: existing.company_id,
      documentDate: existing.entry_date,
      documentNo: existing.entry_no,
      module: 'purchase',
    })
    const entry = await this.purchaseEntries.restore(context, idOrUuid)
    if (!entry) return { ok: false, error: 'Purchase entry was not found.' }
    await this.events.publish(PurchaseEntryAggregate.fromEntry(entry, context.tenant.id, context.user.email).restoredEvent())
    return { ok: true }
  }

  async correction(headers: TenantRequestHeaders, idOrUuid: string) {
    const context = await this.tenantContext.resolve(headers, 'company.manage')
    const existing = await this.purchaseEntries.find(context, idOrUuid)
    if (!existing) throw new NotFoundException('Purchase entry was not found.')
    await this.postingControl.assertPeriodOpen(context, {
      accountingYearId: existing.accounting_year_id,
      companyId: existing.company_id,
      documentDate: new Date().toISOString().slice(0, 10),
      documentNo: existing.entry_no,
      module: 'purchase',
    })
    const entry = await this.purchaseEntries.insert(context, purchaseCorrectionInput(existing))
    if (!entry) throw new BadRequestException('Purchase correction was not created.')
    await this.purchaseEntries.addActivity(context, existing.uuid, 'correction', `Correction draft ${entry.entry_no} created`)
    await this.postingControl.recordCorrectionActivity(context, { action: 'correction', correctedUuid: entry.uuid, module: 'purchase', originalUuid: existing.uuid })
    return { ok: true, entry }
  }

  async reversal(headers: TenantRequestHeaders, idOrUuid: string) {
    const context = await this.tenantContext.resolve(headers, 'company.manage')
    const existing = await this.purchaseEntries.find(context, idOrUuid)
    if (!existing) throw new NotFoundException('Purchase entry was not found.')
    await this.postingControl.assertPeriodOpen(context, {
      accountingYearId: existing.accounting_year_id,
      companyId: existing.company_id,
      documentDate: new Date().toISOString().slice(0, 10),
      documentNo: existing.entry_no,
      module: 'purchase',
    })
    const entry = await this.purchaseEntries.insert(context, purchaseReversalInput(existing))
    if (!entry) throw new BadRequestException('Purchase reversal was not created.')
    await this.purchaseEntries.addActivity(context, existing.uuid, 'reversal', `Reversal voucher ${entry.entry_no} created`)
    await this.postingControl.recordCorrectionActivity(context, { action: 'reversal', module: 'purchase', originalUuid: existing.uuid, reversalUuid: entry.uuid })
    return { ok: true, entry }
  }

  async comment(headers: TenantRequestHeaders, idOrUuid: string, body: { body?: unknown }) {
    const context = await this.tenantContext.resolve(headers, 'company.manage')
    const entry = await this.purchaseEntries.addComment(context, idOrUuid, String(body.body ?? '').trim())
    if (!entry) throw new NotFoundException('Purchase entry was not found.')
    await this.events.publish(PurchaseEntryEvent('entries.purchase.commented', {
      actorEmail: context.user.email,
      entryId: entry.id,
      payload: { entryNo: entry.entry_no },
      tenantId: context.tenant.id,
      uuid: entry.uuid,
    }))
    return { ok: true, entry }
  }

  async tool(headers: TenantRequestHeaders, idOrUuid: string, body: { printHtml?: unknown; tool?: unknown }) {
    const context = await this.tenantContext.resolve(headers, 'company.manage')
    const tool = String(body.tool ?? 'tool').trim()
    const existing = await this.purchaseEntries.find(context, idOrUuid)
    if (!existing) throw new NotFoundException('Purchase entry was not found.')
    const recipient = emailRecipient(tool)
    if (recipient) await this.documentMail.queueEntryEmail(context, 'purchase', existing as unknown as Record<string, unknown>, recipient, body.printHtml)
    const activity = recipient ? `Email queued to ${recipient}` : `${tool} requested`
    const entry = await this.purchaseEntries.addActivity(context, idOrUuid, 'tool', activity)
    if (!entry) throw new NotFoundException('Purchase entry was not found.')
    await this.events.publish(PurchaseEntryEvent('entries.purchase.tool', {
      actorEmail: context.user.email,
      entryId: entry.id,
      payload: { tool, entryNo: entry.entry_no },
      tenantId: context.tenant.id,
      uuid: entry.uuid,
    }))
    return { ok: true, entry }
  }

  async pdf(headers: TenantRequestHeaders, idOrUuid: string, body: { printHtml?: unknown }) {
    const context = await this.tenantContext.resolve(headers, 'company.manage')
    const existing = await this.purchaseEntries.find(context, idOrUuid)
    if (!existing) throw new NotFoundException('Purchase entry was not found.')
    return this.documentPdf.render(body.printHtml, existing.entry_no)
  }
}

function emailRecipient(tool: string) {
  return /^Send to Email:\s*(.+)$/i.exec(tool)?.[1]?.trim() || null
}

function purchaseCorrectionInput(entry: Awaited<ReturnType<PurchaseEntryRepository['find']>>): PurchaseEntryInput {
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
    due_date: dateString(entry.due_date),
    entry_date: new Date().toISOString().slice(0, 10),
    entry_no: '',
    eway_bill_date: dateString(entry.eway_bill_date),
    eway_bill_no: entry.eway_bill_no,
    eway_part: entry.eway_part,
    irn: entry.irn,
    notes: [`Correction draft for ${entry.entry_no}.`, entry.notes ?? ''].filter(Boolean).join('\n'),
    paid_amount: entry.paid_amount,
    payment_status: entry.payment_status,
    place_of_supply: entry.place_of_supply,
    reference_no: entry.reference_no,
    round_off: entry.round_off,
    shipping_address: entry.shipping_address,
    signed_qr: entry.signed_qr,
    status: 'draft',
    supplier_bill_date: dateString(entry.supplier_bill_date),
    supplier_bill_no: entry.supplier_bill_no,
    supplier_gstin: entry.supplier_gstin,
    supplier_id: entry.supplier_id,
    supplier_name: entry.supplier_name,
    supplier_state_code: entry.supplier_state_code,
    supplier_state_name: entry.supplier_state_name,
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

function purchaseReversalInput(entry: Awaited<ReturnType<PurchaseEntryRepository['find']>>): PurchaseEntryInput {
  if (!entry) return {}
  return {
    ...purchaseCorrectionInput(entry),
    notes: [`Reversal voucher for ${entry.entry_no}.`, entry.notes ?? ''].filter(Boolean).join('\n'),
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
