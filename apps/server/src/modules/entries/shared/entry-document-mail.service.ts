import { Inject } from '../../../core/decorators/inject.js'
import { Injectable } from '../../../core/decorators/injectable.js'
import { BadRequestException } from '../../../core/exceptions/http.exception.js'
import type { TenantRuntimeContext } from '../../../core/tenant/tenant-context.service.js'
import { MasterQueueService } from '../../../infrastructure/queue/master-queue.service.js'
import { MailRepository } from '../../mail/mail.repository.js'
import { removeTemporaryMailAttachments, storeTemporaryMailAttachment } from '../../mail/mail-temporary-storage.js'
import { PrintHtmlPdfService } from './print-html-pdf.service.js'

type EntryKind = 'exportSales' | 'payment' | 'purchase' | 'receipt' | 'sales'
type EntryRecord = Record<string, unknown>

@Injectable()
export class EntryDocumentMailService {
  constructor(
    @Inject(MailRepository) private readonly mail: MailRepository,
    @Inject(MasterQueueService) private readonly queue: MasterQueueService,
    @Inject(PrintHtmlPdfService) private readonly printPdf: PrintHtmlPdfService,
  ) {}

  async queueEntryEmail(context: TenantRuntimeContext, kind: EntryKind, entry: EntryRecord, recipient: string, printHtml: unknown) {
    const email = recipient.trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new BadRequestException('A valid recipient email is required.')

    const settings = await this.mail.settings(context)
    if (!settings.enabled) throw new BadRequestException('Mail settings are not enabled for this tenant.')

    const details = entryDetails(kind, entry)
    const pdf = await this.printPdf.render(printHtml)
    const temporaryAttachment = await storeTemporaryMailAttachment(context.tenant.slug, {
      contents: pdf,
      fileName: `${safeFileName(details.documentNo)}.pdf`,
      mimeType: 'application/pdf',
    })

    try {
      const message = await this.mail.createOutbound(context, {
        attachments: [],
        attachmentMetadata: [{
          fileName: temporaryAttachment.fileName,
          mimeType: temporaryAttachment.mimeType,
          sizeBytes: temporaryAttachment.sizeBytes,
        }],
        bcc: [],
        bodyHtml: entryMailHtml(details, temporaryAttachment.fileName),
        bodyText: entryMailText(details, temporaryAttachment.fileName),
        cc: [],
        fromEmail: settings.from_email || context.user.email,
        fromName: settings.from_name,
        replyTo: settings.reply_to,
        status: 'queued',
        subject: `${details.title} ${details.documentNo}`,
        to: [email],
      })

      await this.queue.enqueue({
        type: 'mail.send',
        payload: {
          tenantSlug: context.tenant.slug,
          tenantId: context.tenant.id,
          messageUuid: message.uuid,
          requestedBy: context.user.email,
          temporaryAttachments: [temporaryAttachment],
        },
      })

      return { message, recipient: email }
    } catch (error) {
      await removeTemporaryMailAttachments(context.tenant.slug, [temporaryAttachment])
      throw error
    }
  }
}

function entryDetails(kind: EntryKind, entry: EntryRecord) {
  const definitions = {
    payment: { date: 'payment_date', document: 'payment_no', party: 'party_name', title: 'Payment Voucher' },
    purchase: { date: 'entry_date', document: 'entry_no', party: 'supplier_name', title: 'Purchase Entry' },
    receipt: { date: 'receipt_date', document: 'receipt_no', party: 'party_name', title: 'Receipt Voucher' },
    sales: { date: 'invoice_date', document: 'invoice_no', party: 'customer_name', title: 'Tax Invoice' },
    exportSales: { date: 'invoice_date', document: 'invoice_no', party: 'customer_name', title: 'Export Tax Invoice' },
  } as const
  const definition = definitions[kind]
  return {
    amount: moneyValue(entry.grand_total ?? entry.net_amount),
    date: textValue(entry[definition.date]),
    documentNo: textValue(entry[definition.document]) || 'Document',
    kind,
    party: textValue(entry[definition.party]) || 'Customer',
    title: definition.title,
  }
}

function entryMailHtml(details: ReturnType<typeof entryDetails>, attachmentFileName: string) {
  return `<div style="background:#f6f8fb;padding:28px;font-family:Arial,sans-serif;color:#172033">
  <div style="max-width:640px;margin:auto;background:#fff;border:1px solid #e4e8ef;border-radius:8px;overflow:hidden">
    <div style="background:#059669;color:#fff;padding:20px 24px"><div style="font-size:13px;opacity:.9">CXSun Billing</div><div style="font-size:22px;font-weight:700;margin-top:4px">${escapeHtml(details.title)}</div></div>
    <div style="padding:24px"><p style="margin-top:0">Hello,</p><p>Please find the attached ${escapeHtml(details.title.toLowerCase())}.</p>
      <table style="width:100%;border-collapse:collapse;margin:20px 0">
        ${htmlRow('Document', details.documentNo)}${htmlRow('Date', details.date || '-')}${htmlRow('Party', details.party)}${htmlRow('Total', `INR ${formatMoney(details.amount)}`)}
      </table>
      <p style="font-size:13px;color:#667085;margin-bottom:0">Attached file: <strong>${escapeHtml(attachmentFileName)}</strong>. This PDF is the document copy for your records.</p>
    </div>
  </div>
</div>`
}

function entryMailText(details: ReturnType<typeof entryDetails>, attachmentFileName: string) {
  return `${details.title} ${details.documentNo}\nDate: ${details.date || '-'}\nParty: ${details.party}\nTotal: INR ${formatMoney(details.amount)}\n\nAttached file: ${attachmentFileName}`
}

function htmlRow(label: string, value: string) {
  return `<tr><td style="padding:9px;border-bottom:1px solid #edf0f4;color:#667085">${escapeHtml(label)}</td><td style="padding:9px;border-bottom:1px solid #edf0f4;text-align:right;font-weight:600">${escapeHtml(value)}</td></tr>`
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character] ?? character)
}

function safeFileName(value: string) {
  return value.replace(/[/\\?%*:|"<>]/g, '-').trim() || 'document'
}

function textValue(value: unknown) {
  return String(value ?? '').trim()
}

function moneyValue(value: unknown) {
  const amount = Number(value ?? 0)
  return Number.isFinite(amount) ? amount : 0
}

function formatMoney(value: number) {
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: 2 }).format(value)
}
