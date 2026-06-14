import { Inject } from '../../../core/decorators/inject.js'
import { Injectable } from '../../../core/decorators/injectable.js'
import { BadRequestException, NotFoundException } from '../../../core/exceptions/http.exception.js'
import { TenantContextService, type TenantRequestHeaders } from '../../../core/tenant/tenant-context.service.js'
import { EntryDocumentMailService } from '../shared/entry-document-mail.service.js'
import { EntryDocumentPdfDownloadService } from '../shared/entry-document-pdf-download.service.js'
import { EntryPostingControlService } from '../shared/entry-posting-control.service.js'
import { ReceiptEntryRepository } from './receipt-entry.repository.js'
import type { ReceiptEntryInput } from './receipt-entry.types.js'

@Injectable()
export class ReceiptEntryService {
  constructor(
    @Inject(() => TenantContextService) private readonly tenants: TenantContextService,
    @Inject(ReceiptEntryRepository) private readonly receipts: ReceiptEntryRepository,
    @Inject(EntryDocumentMailService) private readonly documentMail: EntryDocumentMailService,
    @Inject(EntryDocumentPdfDownloadService) private readonly documentPdf: EntryDocumentPdfDownloadService,
    @Inject(EntryPostingControlService) private readonly postingControl: EntryPostingControlService,
  ) {}

  async list(headers: TenantRequestHeaders) {
    return this.receipts.list(await this.tenants.resolve(headers, 'company.manage'))
  }

  async get(headers: TenantRequestHeaders, idOrUuid: string) {
    const entry = await this.receipts.find(await this.tenants.resolve(headers, 'company.manage'), idOrUuid)
    if (!entry) throw new NotFoundException('Receipt not found.')
    return entry
  }

  async upsert(headers: TenantRequestHeaders, input: ReceiptEntryInput) {
    const context = await this.tenants.resolve(headers, 'company.manage')
    const requestedReceiptNo = String(input.receipt_no ?? '').trim()
    const isUpdate = Boolean(input.id || input.uuid)
    if (isUpdate) {
      const existing = await this.receipts.find(context, String(input.uuid ?? input.id))
      if (!existing) throw new NotFoundException('Receipt not found.')
      await this.postingControl.assertCanChangePosted(context, {
        accountingYearId: existing.accounting_year_id,
        companyId: existing.company_id,
        documentDate: existing.receipt_date,
        documentNo: existing.receipt_no,
        module: 'receipt',
        status: existing.status,
      }, 'update')
    } else {
      await this.postingControl.assertPeriodOpen(context, { accountingYearId: input.accounting_year_id, companyId: input.company_id, documentDate: input.receipt_date, documentNo: input.receipt_no, module: 'receipt' })
    }
    const entry = await this.receipts.upsert(context, input)
    const warning = !isUpdate && requestedReceiptNo && requestedReceiptNo !== entry.receipt_no
      ? `Receipt number ${requestedReceiptNo} was already used, so ${entry.receipt_no} was saved instead.`
      : undefined
    return { ok: true, entry, warning }
  }

  async destroy(headers: TenantRequestHeaders, idOrUuid: string) {
    const context = await this.tenants.resolve(headers, 'company.manage')
    const existing = await this.receipts.find(context, idOrUuid)
    if (!existing) throw new NotFoundException('Receipt not found.')
    await this.postingControl.assertCanChangePosted(context, { accountingYearId: existing.accounting_year_id, companyId: existing.company_id, documentDate: existing.receipt_date, documentNo: existing.receipt_no, module: 'receipt', status: existing.status }, 'delete')
    const deleted = await this.receipts.destroy(context, idOrUuid)
    if (!deleted) throw new NotFoundException('Receipt not found.')
    return { ok: true }
  }

  async restore(headers: TenantRequestHeaders, idOrUuid: string) {
    const entry = await this.receipts.restore(await this.tenants.resolve(headers, 'company.manage'), idOrUuid)
    if (!entry) throw new NotFoundException('Receipt not found.')
    return { ok: true, entry }
  }

  async correction(headers: TenantRequestHeaders, idOrUuid: string) {
    const context = await this.tenants.resolve(headers, 'company.manage')
    const existing = await this.receipts.find(context, idOrUuid)
    if (!existing) throw new NotFoundException('Receipt not found.')
    await this.postingControl.assertPeriodOpen(context, { accountingYearId: existing.accounting_year_id, companyId: existing.company_id, documentDate: new Date().toISOString().slice(0, 10), documentNo: existing.receipt_no, module: 'receipt' })
    const entry = await this.receipts.insert(context, receiptCorrectionInput(existing))
    await this.receipts.addActivity(context, existing.uuid, 'correction', `Correction draft ${entry.receipt_no} created`)
    await this.postingControl.recordCorrectionActivity(context, { action: 'correction', correctedUuid: entry.uuid, module: 'receipt', originalUuid: existing.uuid })
    return { ok: true, entry }
  }

  async reversal(headers: TenantRequestHeaders, idOrUuid: string) {
    const context = await this.tenants.resolve(headers, 'company.manage')
    const existing = await this.receipts.find(context, idOrUuid)
    if (!existing) throw new NotFoundException('Receipt not found.')
    await this.postingControl.assertPeriodOpen(context, { accountingYearId: existing.accounting_year_id, companyId: existing.company_id, documentDate: new Date().toISOString().slice(0, 10), documentNo: existing.receipt_no, module: 'receipt' })
    const entry = await this.receipts.insert(context, receiptReversalInput(existing))
    await this.receipts.addActivity(context, existing.uuid, 'reversal', `Reversal voucher ${entry.receipt_no} created`)
    await this.postingControl.recordCorrectionActivity(context, { action: 'reversal', module: 'receipt', originalUuid: existing.uuid, reversalUuid: entry.uuid })
    return { ok: true, entry }
  }

  async addComment(headers: TenantRequestHeaders, idOrUuid: string, body: string) {
    if (!body?.trim()) throw new BadRequestException('Comment body is required.')
    const entry = await this.receipts.addComment(await this.tenants.resolve(headers, 'company.manage'), idOrUuid, body.trim())
    if (!entry) throw new NotFoundException('Receipt not found.')
    return { ok: true, entry }
  }

  async runTool(headers: TenantRequestHeaders, idOrUuid: string, tool: string, printHtml?: unknown) {
    const context = await this.tenants.resolve(headers, 'company.manage')
    const action = tool?.trim() || 'Receipt tool action recorded'
    const existing = await this.receipts.find(context, idOrUuid)
    if (!existing) throw new NotFoundException('Receipt not found.')
    const recipient = emailRecipient(action)
    if (recipient) await this.documentMail.queueEntryEmail(context, 'receipt', existing as unknown as Record<string, unknown>, recipient, printHtml)
    const message = recipient ? `Email queued to ${recipient}` : action
    const entry = await this.receipts.addActivity(context, idOrUuid, 'tool', message)
    if (!entry) throw new NotFoundException('Receipt not found.')
    return { ok: true, entry }
  }

  async pdf(headers: TenantRequestHeaders, idOrUuid: string, printHtml?: unknown) {
    const context = await this.tenants.resolve(headers, 'company.manage')
    const existing = await this.receipts.find(context, idOrUuid)
    if (!existing) throw new NotFoundException('Receipt not found.')
    return this.documentPdf.render(printHtml, existing.receipt_no)
  }
}

function emailRecipient(tool: string) {
  return /^Send to Email:\s*(.+)$/i.exec(tool)?.[1]?.trim() || null
}

function receiptCorrectionInput(entry: Awaited<ReturnType<ReceiptEntryRepository['find']>>): ReceiptEntryInput {
  if (!entry) return {}
  return {
    accounting_year_id: entry.accounting_year_id,
    amount: entry.amount,
    bank_account_id: entry.bank_account_id,
    company_id: entry.company_id,
    discount_amount: entry.discount_amount,
    ledger_id: entry.ledger_id,
    ledger_name: entry.ledger_name,
    party_id: entry.party_id,
    party_name: entry.party_name,
    party_type: entry.party_type,
    receipt_mode: entry.receipt_mode,
    receipt_no: '',
    receipt_date: new Date().toISOString().slice(0, 10),
    reference_date: dateString(entry.reference_date),
    reference_no: entry.reference_no,
    notes: [`Correction draft for ${entry.receipt_no}.`, entry.notes ?? ''].filter(Boolean).join('\n'),
    round_off: entry.round_off,
    status: 'draft',
    tds_amount: entry.tds_amount,
    allocations: entry.allocations.map((allocation) => ({ ...allocation, id: undefined, receipt_entry_id: undefined })),
  }
}

function receiptReversalInput(entry: Awaited<ReturnType<ReceiptEntryRepository['find']>>): ReceiptEntryInput {
  if (!entry) return {}
  return {
    ...receiptCorrectionInput(entry),
    amount: -Number(entry.amount || 0),
    discount_amount: -Number(entry.discount_amount || 0),
    notes: [`Reversal voucher for ${entry.receipt_no}.`, entry.notes ?? ''].filter(Boolean).join('\n'),
    round_off: -Number(entry.round_off || 0),
    status: 'posted',
    tds_amount: -Number(entry.tds_amount || 0),
    allocations: entry.allocations.map((allocation) => ({ ...allocation, id: undefined, receipt_entry_id: undefined, allocated_amount: -Number(allocation.allocated_amount || 0) })),
  }
}

function dateString(value: Date | string | null | undefined) {
  if (!value) return null
  return value instanceof Date ? value.toISOString().slice(0, 10) : String(value).slice(0, 10)
}
