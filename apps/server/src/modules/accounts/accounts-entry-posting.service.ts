import type { Kysely } from 'kysely'
import { Inject } from '../../core/decorators/inject.js'
import { Injectable } from '../../core/decorators/injectable.js'
import { dispatchPublicUuid } from '../../shared/helpers/public-uuid.js'
import type { TenantRuntimeContext } from '../../core/tenant/tenant-context.service.js'
import type { PaymentEntry } from '../entries/payment/payment-entry.types.js'
import type { PurchaseEntry, PurchaseEntryItem } from '../entries/purchase/domain/entities/purchase-entry.entity.js'
import type { ReceiptEntry } from '../entries/receipt/receipt-entry.types.js'
import type { SalesEntry, SalesEntryItem } from '../entries/sales/domain/entities/sales-entry.entity.js'
import { AccountsEngineRepository } from './accounts-engine.repository.js'
import type { AccountBookEntry, AccountBookType, AccountEntryDirection, AccountVoucherType } from './accounts.types.js'

type DynamicDatabase = Record<string, Record<string, unknown>>
type SourceModule = 'receipt' | 'payment' | 'sales' | 'purchase' | 'cash_book' | 'bank_book'
type SourceModuleRepostResult = {
  processed: number
  posted: number
  cancelled: number
  errors: Array<{ uuid: string; documentNo: string; message: string }>
}
type PostingLine = {
  ledgerId: number
  debit: number
  credit: number
  narration: string
  category?: string | null
}
type LedgerSpec = {
  path: string
  accountType: string
  code: string
  name: string
  displayName?: string
  groupKey: string
  ledgerType: string
  normalBalance: 'debit' | 'credit'
}
type BookMirrorInput = {
  sourceModule: 'receipt' | 'payment'
  sourceUuid: string
  bookType: AccountBookType
  companyId: number
  accountingYearId: number
  ledgerId: number
  voucherNo: string
  voucherDate: string
  direction: AccountEntryDirection
  partyLedgerId: number
  partyName: string
  particulars: string | null
  narration: string | null
  referenceNo: string | null
  amount: number
  status: string
}

@Injectable()
export class AccountsEntryPostingService {
  constructor(@Inject(AccountsEngineRepository) private readonly engine: AccountsEngineRepository) {}

  async postReceipt(context: TenantRuntimeContext, entry: ReceiptEntry) {
    if (!this.shouldPost(entry)) {
      await this.removeBookMirror(context, 'receipt', entry.uuid)
      return this.cancelSource(context, 'receipt', entry.uuid)
    }
    await this.engine.groups(context)
    const cashLedger = await this.ensureMoneyLedger(context, entry.receipt_mode, entry.ledger_id)
    const partyLedger = await this.ensurePartyLedger(context, {
      groupKey: 'sundry_debtors',
      accountType: 'customer',
      ledgerType: 'customer',
      normalBalance: 'debit',
      partyId: entry.party_id,
      partyName: entry.party_name,
      fallbackName: 'Customer',
    })
    await this.ensureSettlementLedgers(context)
    const settlementAmount = roundMoney(entry.amount)
    if (settlementAmount <= 0) return this.cancelSource(context, 'receipt', entry.uuid)
    const lines: PostingLine[] = [
      { ledgerId: cashLedger, debit: roundMoney(entry.net_amount), credit: 0, narration: `Received from ${entry.party_name}`, category: 'money_received' },
    ]
    if (roundMoney(entry.tds_amount) > 0) lines.push({ ledgerId: await this.ensureLedger(context, tradeLedgerSpecs.tds_receivable), debit: roundMoney(entry.tds_amount), credit: 0, narration: 'TDS deducted by customer', category: 'tds_receivable' })
    if (roundMoney(entry.discount_amount) > 0) lines.push({ ledgerId: await this.ensureLedger(context, tradeLedgerSpecs.discount_allowed), debit: roundMoney(entry.discount_amount), credit: 0, narration: 'Discount allowed', category: 'discount_allowed' })
    await this.addSettlementRoundOffLine(context, entry.round_off, lines, 'receipt')
    lines.push({ ledgerId: partyLedger, debit: 0, credit: settlementAmount, narration: `Receipt ${entry.receipt_no}`, category: 'customer' })

    const voucher = await this.replaceSourceVoucher(context, {
      sourceModule: 'receipt',
      sourceUuid: entry.uuid,
      voucherType: 'receipt',
      voucherNo: entry.receipt_no,
      voucherDate: String(entry.receipt_date).slice(0, 10),
      referenceNo: entry.reference_no,
      partyLedgerId: partyLedger,
      narration: entry.notes || `Receipt from ${entry.party_name}`,
      sourceTotals: { taxable: 0, tax: 0, grand: settlementAmount },
      lines: compactLines(lines),
    })
    await this.syncBookMirror(context, {
      sourceModule: 'receipt',
      sourceUuid: entry.uuid,
      bookType: entry.receipt_mode === 'cash' ? 'cash' : 'bank',
      companyId: entry.company_id,
      accountingYearId: entry.accounting_year_id,
      ledgerId: cashLedger,
      voucherNo: entry.receipt_no,
      voucherDate: String(entry.receipt_date).slice(0, 10),
      direction: 'in',
      partyLedgerId: partyLedger,
      partyName: entry.party_name,
      particulars: entry.notes || `Receipt from ${entry.party_name}`,
      narration: entry.notes,
      referenceNo: entry.reference_no,
      amount: roundMoney(entry.net_amount),
      status: 'posted',
    })
    return voucher
  }

  async postPayment(context: TenantRuntimeContext, entry: PaymentEntry) {
    if (!this.shouldPost(entry)) {
      await this.removeBookMirror(context, 'payment', entry.uuid)
      return this.cancelSource(context, 'payment', entry.uuid)
    }
    await this.engine.groups(context)
    const moneyLedger = await this.ensureMoneyLedger(context, entry.payment_mode, entry.ledger_id)
    const partyLedger = await this.ensurePartyLedger(context, {
      groupKey: 'sundry_creditors',
      accountType: 'supplier',
      ledgerType: 'supplier',
      normalBalance: 'credit',
      partyId: entry.party_id,
      partyName: entry.party_name,
      fallbackName: 'Supplier',
    })
    await this.ensureSettlementLedgers(context)
    const settlementAmount = roundMoney(entry.amount)
    if (settlementAmount <= 0) return this.cancelSource(context, 'payment', entry.uuid)
    const lines: PostingLine[] = [
      { ledgerId: partyLedger, debit: settlementAmount, credit: 0, narration: `Payment ${entry.payment_no}`, category: 'supplier' },
      { ledgerId: moneyLedger, debit: 0, credit: roundMoney(entry.net_amount), narration: `Paid to ${entry.party_name}`, category: 'money_paid' },
    ]
    if (roundMoney(entry.tds_amount) > 0) lines.push({ ledgerId: await this.ensureLedger(context, tradeLedgerSpecs.tds_payable), debit: 0, credit: roundMoney(entry.tds_amount), narration: 'TDS deducted', category: 'tds_payable' })
    if (roundMoney(entry.discount_amount) > 0) lines.push({ ledgerId: await this.ensureLedger(context, tradeLedgerSpecs.discount_received), debit: 0, credit: roundMoney(entry.discount_amount), narration: 'Discount received', category: 'discount_received' })
    await this.addSettlementRoundOffLine(context, entry.round_off, lines, 'payment')

    const voucher = await this.replaceSourceVoucher(context, {
      sourceModule: 'payment',
      sourceUuid: entry.uuid,
      voucherType: 'payment',
      voucherNo: entry.payment_no,
      voucherDate: String(entry.payment_date).slice(0, 10),
      referenceNo: entry.reference_no,
      partyLedgerId: partyLedger,
      narration: entry.notes || `Payment to ${entry.party_name}`,
      sourceTotals: { taxable: 0, tax: 0, grand: settlementAmount },
      lines: compactLines(lines),
    })
    await this.syncBookMirror(context, {
      sourceModule: 'payment',
      sourceUuid: entry.uuid,
      bookType: entry.payment_mode === 'cash' ? 'cash' : 'bank',
      companyId: entry.company_id,
      accountingYearId: entry.accounting_year_id,
      ledgerId: moneyLedger,
      voucherNo: entry.payment_no,
      voucherDate: String(entry.payment_date).slice(0, 10),
      direction: 'out',
      partyLedgerId: partyLedger,
      partyName: entry.party_name,
      particulars: entry.notes || `Payment to ${entry.party_name}`,
      narration: entry.notes,
      referenceNo: entry.reference_no,
      amount: roundMoney(entry.net_amount),
      status: 'posted',
    })
    return voucher
  }

  async postSales(context: TenantRuntimeContext, entry: SalesEntry) {
    if (!this.shouldPost(entry) || this.postingMode(entry) === 'none') return this.cancelSource(context, 'sales', entry.uuid)
    await this.engine.groups(context)
    await this.ensureTradeLedgers(context)
    const partyLedger = await this.ensurePartyLedger(context, {
      groupKey: 'sundry_debtors',
      accountType: 'customer',
      ledgerType: 'customer',
      normalBalance: 'debit',
      partyId: entry.customer_id,
      partyName: entry.customer_name,
      fallbackName: 'Customer',
    })
    const lines: PostingLine[] = [
      { ledgerId: partyLedger, debit: roundMoney(entry.grand_total), credit: 0, narration: `Sales invoice ${entry.invoice_no}`, category: 'customer' },
    ]
    for (const [key, grouped] of this.groupSalesItems(entry).entries()) {
      const ledgerId = await this.salesLedgerFor(context, grouped.category, grouped.ledgerId)
      lines.push({ ledgerId, debit: 0, credit: grouped.amount, narration: `Sales ${entry.invoice_no}`, category: key })
    }
    await this.addOutputTaxLines(context, entry.place_of_supply, entry.tax_total, lines)
    await this.addRoundOffLine(context, entry.round_off, lines, 'sales')

    return this.replaceSourceVoucher(context, {
      sourceModule: 'sales',
      sourceUuid: entry.uuid,
      voucherType: 'sales',
      voucherNo: entry.invoice_no,
      voucherDate: String(entry.invoice_date).slice(0, 10),
      referenceNo: entry.reference_no,
      partyLedgerId: partyLedger,
      narration: entry.notes || `Sales to ${entry.customer_name}`,
      sourceTotals: { taxable: entry.taxable_total, tax: entry.tax_total, grand: entry.grand_total },
      lines: compactLines(lines),
    })
  }

  async postPurchase(context: TenantRuntimeContext, entry: PurchaseEntry) {
    if (!this.shouldPost(entry) || this.postingMode(entry) === 'none') return this.cancelSource(context, 'purchase', entry.uuid)
    await this.engine.groups(context)
    await this.ensureTradeLedgers(context)
    const partyLedger = await this.ensurePartyLedger(context, {
      groupKey: 'sundry_creditors',
      accountType: 'supplier',
      ledgerType: 'supplier',
      normalBalance: 'credit',
      partyId: entry.supplier_id,
      partyName: entry.supplier_name,
      fallbackName: 'Supplier',
    })
    const lines: PostingLine[] = []
    for (const [key, grouped] of this.groupPurchaseItems(entry).entries()) {
      const ledgerId = await this.purchaseLedgerFor(context, key, grouped.ledgerId)
      lines.push({ ledgerId, debit: grouped.amount, credit: 0, narration: `Purchase ${entry.entry_no}`, category: key })
    }
    await this.addInputTaxLines(context, entry.place_of_supply, entry.tax_total, lines)
    await this.addRoundOffLine(context, entry.round_off, lines, 'purchase')
    lines.push({ ledgerId: partyLedger, debit: 0, credit: roundMoney(entry.grand_total), narration: `Purchase entry ${entry.entry_no}`, category: 'supplier' })

    return this.replaceSourceVoucher(context, {
      sourceModule: 'purchase',
      sourceUuid: entry.uuid,
      voucherType: 'purchase',
      voucherNo: entry.entry_no,
      voucherDate: String(entry.entry_date).slice(0, 10),
      referenceNo: entry.reference_no || entry.supplier_bill_no,
      partyLedgerId: partyLedger,
      narration: entry.notes || `Purchase from ${entry.supplier_name}`,
      sourceTotals: { taxable: entry.taxable_total, tax: entry.tax_total, grand: entry.grand_total },
      lines: compactLines(lines),
    })
  }

  async postBookEntry(context: TenantRuntimeContext, bookType: AccountBookType, entry: AccountBookEntry) {
    const sourceModule = bookType === 'cash' ? 'cash_book' : 'bank_book'
    if (entry.source_module === 'receipt' || entry.source_module === 'payment') return this.cancelSource(context, sourceModule, entry.uuid)
    if (!this.shouldPost(entry) || entry.status !== 'posted') return this.cancelSource(context, sourceModule, entry.uuid)
    const moneyLedgerId = Number(entry.ledger_id)
    const oppositeLedgerId = Number(entry.party_id ?? 0)
    const amount = roundMoney(entry.amount)
    if (!moneyLedgerId || !oppositeLedgerId || moneyLedgerId === oppositeLedgerId || amount <= 0) return this.cancelSource(context, sourceModule, entry.uuid)

    const moneyLedger = await this.ledgerById(context, moneyLedgerId)
    const oppositeLedger = await this.ledgerById(context, oppositeLedgerId)
    if (!moneyLedger || !oppositeLedger) return this.cancelSource(context, sourceModule, entry.uuid)

    const isOut = entry.direction === 'out'
    const narration = entry.narration || entry.particulars || `${bookType === 'cash' ? 'Cash' : 'Bank'} ${isOut ? 'payment' : 'receipt'}`
    const lines: PostingLine[] = isOut
      ? [
          { ledgerId: oppositeLedgerId, debit: amount, credit: 0, narration, category: 'opposite_ledger' },
          { ledgerId: moneyLedgerId, debit: 0, credit: amount, narration, category: bookType },
        ]
      : [
          { ledgerId: moneyLedgerId, debit: amount, credit: 0, narration, category: bookType },
          { ledgerId: oppositeLedgerId, debit: 0, credit: amount, narration, category: 'opposite_ledger' },
        ]

    return this.replaceSourceVoucher(context, {
      sourceModule,
      sourceUuid: entry.uuid,
      voucherType: isOut ? 'payment' : 'receipt',
      voucherNo: entry.voucher_no,
      voucherDate: String(entry.voucher_date).slice(0, 10),
      referenceNo: entry.reference_no,
      partyLedgerId: oppositeLedgerId,
      narration,
      sourceTotals: { taxable: 0, tax: 0, grand: amount },
      lines,
    })
  }

  async cancelSource(context: TenantRuntimeContext, sourceModule: SourceModule, sourceUuid: string) {
    if (sourceModule === 'receipt' || sourceModule === 'payment') await this.removeBookMirror(context, sourceModule, sourceUuid)
    const vouchers = await this.database(context)
      .selectFrom('account_vouchers')
      .select(['id', 'company_id', 'accounting_year_id', 'voucher_date'])
      .where('tenant_id', '=', context.tenant.id)
      .where('source_module', '=', sourceModule)
      .where('source_uuid', '=', sourceUuid)
      .where('deleted_at', 'is', null)
      .execute()

    for (const voucher of vouchers) {
      await this.database(context)
        .updateTable('account_postings')
        .set({ is_active: false })
        .where('voucher_id', '=', Number(voucher.id))
        .execute()
      await this.database(context)
        .updateTable('account_vouchers')
        .set({ status: 'cancelled', cancelled_at: new Date(), updated_by: context.user.email })
        .where('id', '=', Number(voucher.id))
        .execute()
      await this.insertAudit(context, {
        companyId: Number(voucher.company_id),
        accountingYearId: Number(voucher.accounting_year_id),
        voucherId: Number(voucher.id),
        sourceModule,
        sourceUuid,
        action: 'cancelled',
        debitTotal: 0,
        creditTotal: 0,
        lineCount: 0,
        summary: `${sourceModule} source postings cancelled`,
      })
      await this.refreshRollups(context, sourceModule, String(voucher.voucher_date).slice(0, 7))
    }
  }

  private async syncBookMirror(context: TenantRuntimeContext, input: BookMirrorInput) {
    await this.removeBookMirror(context, input.sourceModule, input.sourceUuid, input.bookType)
    if (input.amount <= 0 || input.status === 'cancelled') return
    const table = input.bookType === 'cash' ? 'cash_books' : 'bank_books'
    const existing = await this.database(context)
      .selectFrom(table)
      .select('id')
      .where('tenant_id', '=', context.tenant.id)
      .where('source_module', '=', input.sourceModule)
      .where('source_uuid', '=', input.sourceUuid)
      .executeTakeFirst()
    const values = {
      company_id: input.companyId,
      accounting_year_id: input.accountingYearId,
      ledger_id: input.ledgerId,
      voucher_no: input.voucherNo,
      voucher_date: input.voucherDate,
      direction: input.direction,
      party_id: String(input.partyLedgerId),
      party_name: input.partyName,
      particulars: input.particulars,
      narration: input.narration,
      reference_no: input.referenceNo,
      source_module: input.sourceModule,
      source_uuid: input.sourceUuid,
      amount: input.amount,
      balance_after: 0,
      status: input.status,
      notes: input.narration,
      is_active: true,
      deleted_at: null,
    }
    if (existing) {
      await this.database(context)
        .updateTable(table)
        .set(values)
        .where('id', '=', Number(existing.id))
        .where('tenant_id', '=', context.tenant.id)
        .execute()
      return
    }
    await this.database(context)
      .insertInto(table)
      .values({ ...values, uuid: dispatchPublicUuid(), tenant_id: context.tenant.id })
      .execute()
  }

  private async removeBookMirror(context: TenantRuntimeContext, sourceModule: 'receipt' | 'payment', sourceUuid: string, keepBookType?: AccountBookType) {
    for (const bookType of ['cash', 'bank'] as const) {
      if (keepBookType && bookType === keepBookType) continue
      const table = bookType === 'cash' ? 'cash_books' : 'bank_books'
      await this.database(context)
        .updateTable(table)
        .set({ deleted_at: new Date(), is_active: false })
        .where('tenant_id', '=', context.tenant.id)
        .where('source_module', '=', sourceModule)
        .where('source_uuid', '=', sourceUuid)
        .where('deleted_at', 'is', null)
        .execute()
    }
  }

  async repostSourceEntries(context: TenantRuntimeContext, sourceModule?: SourceModule) {
    const sourceModules = sourceModule ? [sourceModule] : (['sales', 'purchase', 'receipt', 'payment', 'cash_book', 'bank_book'] as SourceModule[])
    const results: Record<SourceModule, SourceModuleRepostResult> = {
      sales: emptyRepostResult(),
      purchase: emptyRepostResult(),
      receipt: emptyRepostResult(),
      payment: emptyRepostResult(),
      cash_book: emptyRepostResult(),
      bank_book: emptyRepostResult(),
    }

    for (const moduleName of sourceModules) {
      results[moduleName] = await this.repostSourceModule(context, moduleName)
    }

    await this.rebuildPostingRollups(context, sourceModule)
    const totalErrors = Object.values(results).reduce((sum, result) => sum + result.errors.length, 0)
    return { ok: totalErrors === 0, results }
  }

  async rebuildPostingRollups(context: TenantRuntimeContext, sourceModule?: SourceModule) {
    const { companyId, accountingYearId } = await this.defaultContext(context)
    await this.database(context)
      .deleteFrom('account_posting_rollups')
      .where('tenant_id', '=', context.tenant.id)
      .where('company_id', '=', companyId)
      .where('accounting_year_id', '=', accountingYearId)
      .$if(Boolean(sourceModule), (query) => query.where('source_module', '=', sourceModule as SourceModule))
      .execute()

    const months = await this.database(context)
      .selectFrom('account_vouchers')
      .select(['source_module', 'voucher_date'])
      .where('tenant_id', '=', context.tenant.id)
      .where('company_id', '=', companyId)
      .where('accounting_year_id', '=', accountingYearId)
      .where('status', '=', 'posted')
      .$if(Boolean(sourceModule), (query) => query.where('source_module', '=', sourceModule as SourceModule))
      .groupBy(['source_module', 'voucher_date'])
      .execute()

    const uniqueBuckets = new Set(months.map((row) => `${String(row.source_module)}:${String(row.voucher_date).slice(0, 7)}`))
    for (const bucket of uniqueBuckets) {
      const [moduleName, month] = bucket.split(':')
      await this.refreshRollups(context, moduleName as SourceModule, month)
    }

    await this.database(context)
      .insertInto('account_posting_rebuild_runs')
      .values({
        uuid: dispatchPublicUuid(),
        tenant_id: context.tenant.id,
        company_id: companyId,
        accounting_year_id: accountingYearId,
        status: 'completed',
        requested_by: context.user.email,
        source_module: sourceModule ?? null,
        processed_count: uniqueBuckets.size,
        message: sourceModule ? `Rebuilt ${sourceModule} posting rollups.` : 'Rebuilt all posting rollups.',
        completed_at: new Date(),
      })
      .execute()

    return { ok: true, processedBuckets: uniqueBuckets.size }
  }

  private async repostSourceModule(context: TenantRuntimeContext, sourceModule: SourceModule) {
    const rows = await this.sourceRows(context, sourceModule)
    const result = emptyRepostResult()

    for (const row of rows) {
      result.processed += 1
      try {
        const voucherId = await this.postSourceRow(context, sourceModule, row)
        if (voucherId) {
          result.posted += 1
          await this.markSourcePosted(context, sourceModule, numberValue(row.id))
        } else {
          result.cancelled += 1
        }
      } catch (error) {
        result.errors.push({
          uuid: stringValue(row.uuid),
          documentNo: sourceDocumentNo(sourceModule, row),
          message: error instanceof Error ? error.message : String(error),
        })
      }
    }

    return result
  }

  private async postSourceRow(context: TenantRuntimeContext, sourceModule: SourceModule, row: Record<string, unknown>) {
    if (sourceModule === 'sales') return this.postSales(context, await this.salesEntryFromRow(context, row))
    if (sourceModule === 'purchase') return this.postPurchase(context, await this.purchaseEntryFromRow(context, row))
    if (sourceModule === 'receipt') return this.postReceipt(context, receiptEntryFromRow(row))
    if (sourceModule === 'payment') return this.postPayment(context, paymentEntryFromRow(row))
    return this.postBookEntry(context, sourceModule === 'cash_book' ? 'cash' : 'bank', bookEntryFromRow(row, sourceModule === 'cash_book' ? 'cash' : 'bank'))
  }

  private async sourceRows(context: TenantRuntimeContext, sourceModule: SourceModule) {
    const { companyId, accountingYearId } = await this.defaultContext(context)
    const table = sourceTable(sourceModule)
    return this.database(context)
      .selectFrom(table)
      .selectAll()
      .where('tenant_id', '=', context.tenant.id)
      .where('company_id', '=', companyId)
      .where('accounting_year_id', '=', accountingYearId)
      .where('deleted_at', 'is', null)
      .where('is_active', '=', true)
      .orderBy(sourceDateColumn(sourceModule), 'asc')
      .orderBy('id', 'asc')
      .execute() as Promise<Array<Record<string, unknown>>>
  }

  private async salesEntryFromRow(context: TenantRuntimeContext, row: Record<string, unknown>) {
    const items = await this.database(context)
      .selectFrom('sales_entry_items')
      .selectAll()
      .where('sales_entry_id', '=', numberValue(row.id))
      .orderBy('sort_order', 'asc')
      .execute()

    return {
      ...row,
      invoice_date: dateString(row.invoice_date),
      customer_id: nullableString(row.customer_id),
      customer_name: stringValue(row.customer_name) || 'Customer',
      place_of_supply: nullableString(row.place_of_supply),
      reference_no: nullableString(row.reference_no),
      taxable_total: roundMoney(row.taxable_total),
      tax_total: roundMoney(row.tax_total),
      round_off: roundMoney(row.round_off),
      grand_total: roundMoney(row.grand_total),
      accounting_posting_mode: stringValue(row.accounting_posting_mode) || 'auto',
      accounting_category: nullableString(row.accounting_category) || 'sales',
      accounting_ledger_id: nullableNumber(row.accounting_ledger_id),
      is_active: row.is_active,
      status: stringValue(row.status) || 'posted',
      deleted_at: row.deleted_at ?? null,
      notes: nullableString(row.notes),
      items: items.map(sourceItemFromRow),
      comments: [],
      activities: [],
    } as unknown as SalesEntry
  }

  private async purchaseEntryFromRow(context: TenantRuntimeContext, row: Record<string, unknown>) {
    const items = await this.database(context)
      .selectFrom('purchase_entry_items')
      .selectAll()
      .where('purchase_entry_id', '=', numberValue(row.id))
      .orderBy('sort_order', 'asc')
      .execute()

    return {
      ...row,
      entry_date: dateString(row.entry_date),
      supplier_id: nullableString(row.supplier_id),
      supplier_name: stringValue(row.supplier_name) || 'Supplier',
      place_of_supply: nullableString(row.place_of_supply),
      reference_no: nullableString(row.reference_no),
      supplier_bill_no: nullableString(row.supplier_bill_no),
      taxable_total: roundMoney(row.taxable_total),
      tax_total: roundMoney(row.tax_total),
      round_off: roundMoney(row.round_off),
      grand_total: roundMoney(row.grand_total),
      accounting_posting_mode: stringValue(row.accounting_posting_mode) || 'auto',
      accounting_category: nullableString(row.accounting_category) || 'purchase',
      accounting_ledger_id: nullableNumber(row.accounting_ledger_id),
      is_active: row.is_active,
      status: stringValue(row.status) || 'posted',
      deleted_at: row.deleted_at ?? null,
      notes: nullableString(row.notes),
      items: items.map(sourceItemFromRow),
      comments: [],
      activities: [],
    } as unknown as PurchaseEntry
  }

  private async markSourcePosted(context: TenantRuntimeContext, sourceModule: SourceModule, sourceId: number) {
    if (sourceModule !== 'sales' && sourceModule !== 'purchase') return
    await this.database(context)
      .updateTable(sourceTable(sourceModule))
      .set({ accounting_posted_at: new Date(), updated_at: new Date() })
      .where('id', '=', sourceId)
      .execute()
  }

  private async replaceSourceVoucher(context: TenantRuntimeContext, input: {
    sourceModule: SourceModule
    sourceUuid: string
    voucherType: AccountVoucherType
    voucherNo: string
    voucherDate: string
    referenceNo: string | null
    partyLedgerId: number
    narration: string
    sourceTotals: { taxable: number; tax: number; grand: number }
    lines: PostingLine[]
  }) {
    this.assertBalanced(input.lines)
    const { companyId, accountingYearId } = await this.defaultContext(context)
    const existing = await this.database(context)
      .selectFrom('account_vouchers')
      .select(['id'])
      .where('tenant_id', '=', context.tenant.id)
      .where('company_id', '=', companyId)
      .where('accounting_year_id', '=', accountingYearId)
      .where('source_module', '=', input.sourceModule)
      .where('source_uuid', '=', input.sourceUuid)
      .where('deleted_at', 'is', null)
      .orderBy('id', 'desc')
      .executeTakeFirst()

    const voucherId = existing ? Number(existing.id) : await this.insertVoucher(context, companyId, accountingYearId, input)
    if (existing) {
      await this.database(context)
        .updateTable('account_vouchers')
        .set({
          voucher_type: input.voucherType,
          voucher_no: input.voucherNo,
          voucher_date: input.voucherDate,
          reference_no: emptyAsNull(input.referenceNo),
          party_ledger_id: input.partyLedgerId,
          narration: emptyAsNull(input.narration),
          status: 'posted',
          posted_at: new Date(),
          cancelled_at: null,
          updated_by: context.user.email,
        })
        .where('id', '=', voucherId)
        .execute()
    }

    await this.database(context).deleteFrom('account_postings').where('voucher_id', '=', voucherId).execute()
    await this.database(context).deleteFrom('account_voucher_lines').where('voucher_id', '=', voucherId).execute()
    for (let index = 0; index < input.lines.length; index += 1) {
      const line = input.lines[index]
      const result = await this.database(context)
        .insertInto('account_voucher_lines')
        .values({
          uuid: dispatchPublicUuid(),
          voucher_id: voucherId,
          ledger_id: line.ledgerId,
          debit_amount: roundMoney(line.debit),
          credit_amount: roundMoney(line.credit),
          line_narration: line.narration,
          bill_reference: input.referenceNo,
          sort_order: index + 1,
        })
        .executeTakeFirstOrThrow()
      await this.database(context)
        .insertInto('account_postings')
        .values({
          uuid: dispatchPublicUuid(),
          tenant_id: context.tenant.id,
          company_id: companyId,
          accounting_year_id: accountingYearId,
          voucher_id: voucherId,
          voucher_line_id: Number(result.insertId),
          ledger_id: line.ledgerId,
          posting_date: input.voucherDate,
          debit_amount: roundMoney(line.debit),
          credit_amount: roundMoney(line.credit),
          source_module: input.sourceModule,
          source_uuid: input.sourceUuid,
          is_active: true,
        })
        .execute()
    }

    const debit = roundMoney(input.lines.reduce((sum, line) => sum + roundMoney(line.debit), 0))
    const credit = roundMoney(input.lines.reduce((sum, line) => sum + roundMoney(line.credit), 0))
    await this.insertAudit(context, {
      companyId,
      accountingYearId,
      voucherId,
      sourceModule: input.sourceModule,
      sourceUuid: input.sourceUuid,
      action: existing ? 'reposted' : 'posted',
      debitTotal: debit,
      creditTotal: credit,
      lineCount: input.lines.length,
      summary: `${input.voucherType} voucher ${input.voucherNo} posted`,
      payload: { totals: input.sourceTotals, categories: input.lines.map((line) => line.category).filter(Boolean) },
    })
    await this.refreshRollups(context, input.sourceModule, input.voucherDate.slice(0, 7))
    return voucherId
  }

  private async insertVoucher(context: TenantRuntimeContext, companyId: number, accountingYearId: number, input: {
    sourceModule: SourceModule
    sourceUuid: string
    voucherType: AccountVoucherType
    voucherNo: string
    voucherDate: string
    referenceNo: string | null
    partyLedgerId: number
    narration: string
  }) {
    const result = await this.database(context)
      .insertInto('account_vouchers')
      .values({
        uuid: dispatchPublicUuid(),
        tenant_id: context.tenant.id,
        company_id: companyId,
        accounting_year_id: accountingYearId,
        voucher_type: input.voucherType,
        voucher_no: input.voucherNo,
        voucher_date: input.voucherDate,
        reference_no: emptyAsNull(input.referenceNo),
        party_ledger_id: input.partyLedgerId,
        source_module: input.sourceModule,
        source_uuid: input.sourceUuid,
        status: 'posted',
        narration: emptyAsNull(input.narration),
        posted_at: new Date(),
        created_by: context.user.email,
      })
      .executeTakeFirstOrThrow()
    return Number(result.insertId)
  }

  private async refreshRollups(context: TenantRuntimeContext, sourceModule: SourceModule, periodMonth: string) {
    const { companyId, accountingYearId } = await this.defaultContext(context)
    await this.database(context)
      .deleteFrom('account_posting_rollups')
      .where('tenant_id', '=', context.tenant.id)
      .where('company_id', '=', companyId)
      .where('accounting_year_id', '=', accountingYearId)
      .where('period_month', '=', periodMonth)
      .where('source_module', '=', sourceModule)
      .execute()

    const rows = await this.database(context)
      .selectFrom('account_postings as posting')
      .innerJoin('account_vouchers as voucher', 'voucher.id', 'posting.voucher_id')
      .innerJoin('account_ledgers as ledger', 'ledger.id', 'posting.ledger_id')
      .select([
        'posting.ledger_id',
        'ledger.ledger_type',
        'voucher.voucher_type',
      ])
      .select((eb) => [
        eb.fn.count<number>('voucher.id').as('voucher_count'),
        eb.fn.coalesce(eb.fn.sum('posting.debit_amount'), eb.val(0)).as('debit_amount'),
        eb.fn.coalesce(eb.fn.sum('posting.credit_amount'), eb.val(0)).as('credit_amount'),
      ])
      .where('posting.tenant_id', '=', context.tenant.id)
      .where('posting.company_id', '=', companyId)
      .where('posting.accounting_year_id', '=', accountingYearId)
      .where('posting.source_module', '=', sourceModule)
      .where('posting.is_active', '=', true)
      .where('voucher.status', '=', 'posted')
      .where('voucher.voucher_date', '>=', `${periodMonth}-01`)
      .where('voucher.voucher_date', '<=', `${periodMonth}-31`)
      .groupBy(['posting.ledger_id', 'ledger.ledger_type', 'voucher.voucher_type'])
      .execute()

    for (const row of rows) {
      await this.database(context)
        .insertInto('account_posting_rollups')
        .values({
          uuid: dispatchPublicUuid(),
          tenant_id: context.tenant.id,
          company_id: companyId,
          accounting_year_id: accountingYearId,
          period_month: periodMonth,
          source_module: sourceModule,
          voucher_type: String(row.voucher_type),
          ledger_id: Number(row.ledger_id),
          ledger_type: emptyAsNull(row.ledger_type),
          category: emptyAsNull(row.ledger_type),
          entry_count: Number(row.voucher_count ?? 0),
          voucher_count: Number(row.voucher_count ?? 0),
          debit_amount: roundMoney(row.debit_amount),
          credit_amount: roundMoney(row.credit_amount),
          taxable_amount: 0,
          tax_amount: 0,
          grand_amount: roundMoney(numberValue(row.debit_amount) + numberValue(row.credit_amount)),
        })
        .execute()
    }
  }

  private async insertAudit(context: TenantRuntimeContext, input: {
    companyId: number
    accountingYearId: number
    voucherId: number | null
    sourceModule: SourceModule
    sourceUuid: string
    action: string
    debitTotal: number
    creditTotal: number
    lineCount: number
    summary: string
    payload?: unknown
  }) {
    await this.database(context)
      .insertInto('account_posting_audits')
      .values({
        uuid: dispatchPublicUuid(),
        tenant_id: context.tenant.id,
        company_id: input.companyId,
        accounting_year_id: input.accountingYearId,
        voucher_id: input.voucherId,
        source_module: input.sourceModule,
        source_uuid: input.sourceUuid,
        action: input.action,
        actor_email: context.user.email,
        debit_total: roundMoney(input.debitTotal),
        credit_total: roundMoney(input.creditTotal),
        line_count: input.lineCount,
        summary: input.summary,
        payload: input.payload ? JSON.stringify(input.payload) : null,
      })
      .execute()
  }

  private async ensureTradeLedgers(context: TenantRuntimeContext) {
    await Promise.all([
      this.ensureLedger(context, tradeLedgerSpecs.sales),
      this.ensureLedger(context, tradeLedgerSpecs.purchase),
      this.ensureLedger(context, tradeLedgerSpecs.fabric_purchase),
      this.ensureLedger(context, tradeLedgerSpecs.garment_purchase),
      this.ensureLedger(context, tradeLedgerSpecs.accessories_purchase),
      this.ensureLedger(context, tradeLedgerSpecs.output_cgst),
      this.ensureLedger(context, tradeLedgerSpecs.output_sgst),
      this.ensureLedger(context, tradeLedgerSpecs.output_igst),
      this.ensureLedger(context, tradeLedgerSpecs.input_cgst),
      this.ensureLedger(context, tradeLedgerSpecs.input_sgst),
      this.ensureLedger(context, tradeLedgerSpecs.input_igst),
      this.ensureLedger(context, tradeLedgerSpecs.round_off),
    ])
  }

  private async ensureSettlementLedgers(context: TenantRuntimeContext) {
    await Promise.all([
      this.ensureLedger(context, tradeLedgerSpecs.tds_receivable),
      this.ensureLedger(context, tradeLedgerSpecs.tds_payable),
      this.ensureLedger(context, tradeLedgerSpecs.discount_allowed),
      this.ensureLedger(context, tradeLedgerSpecs.discount_received),
      this.ensureLedger(context, tradeLedgerSpecs.round_off),
    ])
  }

  private async salesLedgerFor(context: TenantRuntimeContext, category: string, explicitLedgerId?: number | null) {
    if (explicitLedgerId) return explicitLedgerId
    const key = normalizeSalesCategory(category)
    return this.ensureLedger(context, tradeLedgerSpecs[key] ?? dynamicSalesLedgerSpec(category, key))
  }

  private async purchaseLedgerFor(context: TenantRuntimeContext, category: string, explicitLedgerId?: number | null) {
    if (explicitLedgerId) return explicitLedgerId
    const key = normalizePurchaseCategory(category)
    return this.ensureLedger(context, tradeLedgerSpecs[key] ?? tradeLedgerSpecs.purchase)
  }

  private async ensureMoneyLedger(context: TenantRuntimeContext, mode: string, preferredLedgerId?: string | number | null) {
    const accountType = String(mode).toLowerCase() === 'cash' ? 'cash' : 'bank'
    const ledgerId = Number(preferredLedgerId ?? 0)
    if (ledgerId) {
      const ledger = await this.ledgerById(context, ledgerId)
      if (ledger && String(ledger.account_type) === accountType) return ledgerId
    }
    const preferredPath = accountType === 'cash' ? 'src/accounts/assets/cash/cashonhand' : 'src/accounts/assets/bank'
    const existing = await this.findLedger(context, preferredPath)
      ?? await this.database(context)
        .selectFrom('account_ledgers')
        .select('id')
        .where('tenant_id', '=', context.tenant.id)
        .where('account_type', '=', accountType)
        .where('deleted_at', 'is', null)
        .orderBy('id', 'asc')
        .executeTakeFirst()
    if (existing) return Number(existing.id)

    return this.ensureLedger(context, {
      path: preferredPath,
      accountType,
      code: accountType === 'cash' ? 'CASHONHAND' : 'BANK',
      name: accountType === 'cash' ? 'Cash on Hand' : 'Bank',
      displayName: accountType === 'cash' ? 'Cash' : 'Bank',
      groupKey: accountType === 'cash' ? 'cash_in_hand' : 'bank_accounts',
      ledgerType: accountType,
      normalBalance: 'debit',
    })
  }

  private async ensurePartyLedger(context: TenantRuntimeContext, input: {
    groupKey: string
    accountType: string
    ledgerType: string
    normalBalance: 'debit' | 'credit'
    partyId: string | null
    partyName: string
    fallbackName: string
  }) {
    const { companyId } = await this.defaultContext(context)
    const name = input.partyName.trim() || input.fallbackName
    const path = `src/accounts/company/${companyId}/parties/${input.accountType}/${slug(input.partyId || name)}`
    const existing = await this.findLedger(context, path)
    if (existing) return Number(existing.id)

    return this.ensureLedger(context, {
      path,
      accountType: input.accountType,
      code: `${input.accountType}_${slug(input.partyId || name)}`.toUpperCase().slice(0, 40),
      name,
      displayName: name,
      groupKey: input.groupKey,
      ledgerType: input.ledgerType,
      normalBalance: input.normalBalance,
    })
  }

  private async ensureLedger(context: TenantRuntimeContext, input: LedgerSpec) {
    const existing = await this.findLedger(context, input.path)
    if (existing) return Number(existing.id)

    const { companyId, accountingYearId } = await this.defaultContext(context)
    const groupId = await this.groupIdByKey(context, input.groupKey, companyId, accountingYearId)
    const result = await this.database(context)
      .insertInto('account_ledgers')
      .values({
        uuid: dispatchPublicUuid(),
        tenant_id: context.tenant.id,
        company_id: companyId,
        accounting_year_id: accountingYearId,
        path: input.path,
        account_type: input.accountType,
        code: input.code,
        name: input.name,
        display_name: input.displayName ?? input.name,
        group_id: groupId,
        ledger_type: input.ledgerType,
        normal_balance: input.normalBalance,
        opening_balance: 0,
        opening_debit: 0,
        opening_credit: 0,
        current_balance: 0,
        status: 'active',
        is_active: true,
        is_programmatic: true,
      })
      .executeTakeFirstOrThrow()
    return Number(result.insertId)
  }

  private groupSalesItems(entry: SalesEntry) {
    const fallback = normalizeSalesCategory(entry.accounting_category)
    const fallbackCategory = salesCategoryLabel(entry.accounting_category, fallback)
    const grouped = new Map<string, { amount: number; ledgerId?: number | null; category: string }>()
    for (const item of entry.items) {
      const ledgerId = item.accounting_ledger_id ?? entry.accounting_ledger_id
      const rawCategory = item.accounting_category || fallbackCategory
      const key = ledgerId ? `ledger_${ledgerId}` : normalizeSalesCategory(rawCategory)
      const current = grouped.get(key)
      grouped.set(key, { amount: roundMoney((current?.amount ?? 0) + itemTaxable(item)), ledgerId, category: salesCategoryLabel(rawCategory, key) })
    }
    if (!grouped.size) grouped.set(fallback, { amount: roundMoney(entry.taxable_total), ledgerId: entry.accounting_ledger_id, category: fallbackCategory })
    return grouped
  }

  private groupPurchaseItems(entry: PurchaseEntry) {
    const fallback = normalizePurchaseCategory(entry.accounting_category)
    const grouped = new Map<string, { amount: number; ledgerId?: number | null }>()
    for (const item of entry.items) {
      const ledgerId = item.accounting_ledger_id ?? entry.accounting_ledger_id
      const key = ledgerId ? `ledger_${ledgerId}` : normalizePurchaseCategory(item.accounting_category || fallback)
      const current = grouped.get(key)
      grouped.set(key, { amount: roundMoney((current?.amount ?? 0) + itemTaxable(item)), ledgerId })
    }
    if (!grouped.size) grouped.set(fallback, { amount: roundMoney(entry.taxable_total), ledgerId: entry.accounting_ledger_id })
    return grouped
  }

  private async addOutputTaxLines(context: TenantRuntimeContext, placeOfSupply: string | null, taxTotal: number, lines: PostingLine[]) {
    const tax = roundMoney(taxTotal)
    if (tax <= 0) return
    if (String(placeOfSupply ?? '').toLowerCase() === 'igst') {
      lines.push({ ledgerId: await this.ensureLedger(context, tradeLedgerSpecs.output_igst), debit: 0, credit: tax, narration: 'Output IGST', category: 'output_igst' })
      return
    }
    const half = roundMoney(tax / 2)
    lines.push({ ledgerId: await this.ensureLedger(context, tradeLedgerSpecs.output_cgst), debit: 0, credit: half, narration: 'Output CGST', category: 'output_cgst' })
    lines.push({ ledgerId: await this.ensureLedger(context, tradeLedgerSpecs.output_sgst), debit: 0, credit: roundMoney(tax - half), narration: 'Output SGST', category: 'output_sgst' })
  }

  private async addInputTaxLines(context: TenantRuntimeContext, placeOfSupply: string | null, taxTotal: number, lines: PostingLine[]) {
    const tax = roundMoney(taxTotal)
    if (tax <= 0) return
    if (String(placeOfSupply ?? '').toLowerCase() === 'igst') {
      lines.push({ ledgerId: await this.ensureLedger(context, tradeLedgerSpecs.input_igst), debit: tax, credit: 0, narration: 'Input IGST', category: 'input_igst' })
      return
    }
    const half = roundMoney(tax / 2)
    lines.push({ ledgerId: await this.ensureLedger(context, tradeLedgerSpecs.input_cgst), debit: half, credit: 0, narration: 'Input CGST', category: 'input_cgst' })
    lines.push({ ledgerId: await this.ensureLedger(context, tradeLedgerSpecs.input_sgst), debit: roundMoney(tax - half), credit: 0, narration: 'Input SGST', category: 'input_sgst' })
  }

  private async addRoundOffLine(context: TenantRuntimeContext, roundOff: number, lines: PostingLine[], source: 'sales' | 'purchase') {
    const amount = roundMoney(roundOff)
    if (amount === 0) return
    const ledgerId = await this.ensureLedger(context, tradeLedgerSpecs.round_off)
    if (source === 'sales') {
      lines.push({ ledgerId, debit: amount < 0 ? Math.abs(amount) : 0, credit: amount > 0 ? amount : 0, narration: 'Round off', category: 'round_off' })
      return
    }
    lines.push({ ledgerId, debit: amount > 0 ? amount : 0, credit: amount < 0 ? Math.abs(amount) : 0, narration: 'Round off', category: 'round_off' })
  }

  private async addSettlementRoundOffLine(context: TenantRuntimeContext, roundOff: number, lines: PostingLine[], source: 'receipt' | 'payment') {
    const amount = roundMoney(roundOff)
    if (amount === 0) return
    const ledgerId = await this.ensureLedger(context, tradeLedgerSpecs.round_off)
    if (source === 'receipt') {
      lines.push({ ledgerId, debit: amount < 0 ? Math.abs(amount) : 0, credit: amount > 0 ? amount : 0, narration: 'Round off', category: 'round_off' })
      return
    }
    lines.push({ ledgerId, debit: amount > 0 ? amount : 0, credit: amount < 0 ? Math.abs(amount) : 0, narration: 'Round off', category: 'round_off' })
  }

  private assertBalanced(lines: PostingLine[]) {
    const debit = roundMoney(lines.reduce((sum, line) => sum + roundMoney(line.debit), 0))
    const credit = roundMoney(lines.reduce((sum, line) => sum + roundMoney(line.credit), 0))
    if (debit <= 0 || credit <= 0 || debit !== credit) {
      throw new Error(`Accounting source voucher is not balanced. Debit ${debit.toFixed(2)} and credit ${credit.toFixed(2)} must match.`)
    }
  }

  private async findLedger(context: TenantRuntimeContext, path: string) {
    return this.database(context)
      .selectFrom('account_ledgers')
      .select('id')
      .where('tenant_id', '=', context.tenant.id)
      .where('path', '=', path)
      .where('deleted_at', 'is', null)
      .executeTakeFirst()
  }

  private async ledgerById(context: TenantRuntimeContext, ledgerId: number) {
    return this.database(context)
      .selectFrom('account_ledgers')
      .select(['id', 'name', 'account_type'])
      .where('tenant_id', '=', context.tenant.id)
      .where('id', '=', ledgerId)
      .where('deleted_at', 'is', null)
      .executeTakeFirst()
  }

  private async groupIdByKey(context: TenantRuntimeContext, systemKey: string, companyId: number, accountingYearId: number) {
    const group = await this.database(context)
      .selectFrom('account_groups')
      .select('id')
      .where('tenant_id', '=', context.tenant.id)
      .where('company_id', '=', companyId)
      .where('accounting_year_id', '=', accountingYearId)
      .where('system_key', '=', systemKey)
      .executeTakeFirst()
    return group ? Number(group.id) : null
  }

  private async defaultContext(context: TenantRuntimeContext) {
    const row = await this.database(context).selectFrom('default_companies').select(['company_id', 'accounting_year_id']).where('is_active', '=', true).orderBy('id', 'asc').executeTakeFirst()
    return { companyId: Number(row?.company_id ?? 0), accountingYearId: Number(row?.accounting_year_id ?? 0) }
  }

  private shouldPost(entry: { is_active: boolean | number; status: string; deleted_at: Date | string | null }) {
    return Boolean(entry.is_active) && !entry.deleted_at && entry.status !== 'cancelled'
  }

  private postingMode(entry: { accounting_posting_mode?: string | null }) {
    return String(entry.accounting_posting_mode ?? 'auto').trim().toLowerCase() || 'auto'
  }

  private database(context: TenantRuntimeContext) {
    return context.database as unknown as Kysely<DynamicDatabase>
  }
}

const tradeLedgerSpecs: Record<string, LedgerSpec> = {
  sales: { path: 'src/accounts/income/sales/sales-account', accountType: 'sales', code: 'SALES', name: 'Sales Account', displayName: 'Sales', groupKey: 'sales_accounts', ledgerType: 'sales', normalBalance: 'credit' },
  fabric_sales: { path: 'src/accounts/income/sales/fabric-sales', accountType: 'sales', code: 'FABRIC_SALES', name: 'Fabric Sales', groupKey: 'sales_accounts', ledgerType: 'sales', normalBalance: 'credit' },
  garment_sales: { path: 'src/accounts/income/sales/garment-sales', accountType: 'sales', code: 'GARMENT_SALES', name: 'Garment Sales', groupKey: 'sales_accounts', ledgerType: 'sales', normalBalance: 'credit' },
  export_sales: { path: 'src/accounts/income/sales/export-sales', accountType: 'sales', code: 'EXPORT_SALES', name: 'Export Sales', groupKey: 'sales_accounts', ledgerType: 'sales', normalBalance: 'credit' },
  purchase: { path: 'src/accounts/expenses/purchase/purchase-account', accountType: 'purchase', code: 'PURCHASE', name: 'Purchase Account', displayName: 'Purchases', groupKey: 'purchase_accounts', ledgerType: 'purchase', normalBalance: 'debit' },
  fabric_purchase: { path: 'src/accounts/expenses/purchase/fabric-purchase', accountType: 'purchase', code: 'FABRIC_PURCHASE', name: 'Fabric Purchase', groupKey: 'purchase_accounts', ledgerType: 'purchase', normalBalance: 'debit' },
  garment_purchase: { path: 'src/accounts/expenses/purchase/garment-purchase', accountType: 'purchase', code: 'GARMENT_PURCHASE', name: 'Garment Purchase', groupKey: 'purchase_accounts', ledgerType: 'purchase', normalBalance: 'debit' },
  accessories_purchase: { path: 'src/accounts/expenses/purchase/accessories-purchase', accountType: 'purchase', code: 'ACCESSORIES_PURCHASE', name: 'Accessories Purchase', groupKey: 'purchase_accounts', ledgerType: 'purchase', normalBalance: 'debit' },
  output_cgst: { path: 'src/accounts/liabilities/taxes/output-cgst', accountType: 'gst', code: 'OUTPUT_CGST', name: 'Output CGST', displayName: 'CGST Payable', groupKey: 'duties_taxes', ledgerType: 'gst', normalBalance: 'credit' },
  output_sgst: { path: 'src/accounts/liabilities/taxes/output-sgst', accountType: 'gst', code: 'OUTPUT_SGST', name: 'Output SGST', displayName: 'SGST Payable', groupKey: 'duties_taxes', ledgerType: 'gst', normalBalance: 'credit' },
  output_igst: { path: 'src/accounts/liabilities/taxes/output-igst', accountType: 'gst', code: 'OUTPUT_IGST', name: 'Output IGST', displayName: 'IGST Payable', groupKey: 'duties_taxes', ledgerType: 'gst', normalBalance: 'credit' },
  input_cgst: { path: 'src/accounts/assets/taxes/input-cgst', accountType: 'gst', code: 'INPUT_CGST', name: 'Input CGST', displayName: 'CGST Input', groupKey: 'duties_taxes', ledgerType: 'gst', normalBalance: 'debit' },
  input_sgst: { path: 'src/accounts/assets/taxes/input-sgst', accountType: 'gst', code: 'INPUT_SGST', name: 'Input SGST', displayName: 'SGST Input', groupKey: 'duties_taxes', ledgerType: 'gst', normalBalance: 'debit' },
  input_igst: { path: 'src/accounts/assets/taxes/input-igst', accountType: 'gst', code: 'INPUT_IGST', name: 'Input IGST', displayName: 'IGST Input', groupKey: 'duties_taxes', ledgerType: 'gst', normalBalance: 'debit' },
  round_off: { path: 'src/accounts/round-off', accountType: 'round_off', code: 'ROUND_OFF', name: 'Round Off', groupKey: 'indirect_expenses', ledgerType: 'round_off', normalBalance: 'debit' },
  tds_receivable: { path: 'src/accounts/assets/tds/tds-receivable', accountType: 'tds', code: 'TDS_RECEIVABLE', name: 'TDS Receivable', displayName: 'TDS Receivable', groupKey: 'loans_advances_asset', ledgerType: 'tds', normalBalance: 'debit' },
  tds_payable: { path: 'src/accounts/liabilities/tds/tds-payable', accountType: 'tds', code: 'TDS_PAYABLE', name: 'TDS Payable', displayName: 'TDS Payable', groupKey: 'duties_taxes', ledgerType: 'tds', normalBalance: 'credit' },
  discount_allowed: { path: 'src/accounts/expenses/discount/discount-allowed', accountType: 'discount', code: 'DISCOUNT_ALLOWED', name: 'Discount Allowed', displayName: 'Discount Given', groupKey: 'indirect_expenses', ledgerType: 'discount', normalBalance: 'debit' },
  discount_received: { path: 'src/accounts/income/discount/discount-received', accountType: 'discount', code: 'DISCOUNT_RECEIVED', name: 'Discount Received', displayName: 'Discount Received', groupKey: 'indirect_incomes', ledgerType: 'discount', normalBalance: 'credit' },
}

function normalizeSalesCategory(value: unknown) {
  const text = slug(value)
  if (text === 'normal' || text === 'sales' || text === 'normalsales' || text === 'salesaccount') return 'sales'
  if (text.includes('fabric')) return 'fabric_sales'
  if (text.includes('garment')) return 'garment_sales'
  if (text.includes('export')) return 'export_sales'
  return text
}

function salesCategoryLabel(value: unknown, fallbackKey: string) {
  const text = String(value ?? '').trim()
  if (normalizeSalesCategory(text) === 'sales') return 'Sales Account'
  if (text) return text
  return titleFromKey(fallbackKey)
}

function dynamicSalesLedgerSpec(category: unknown, key: string): LedgerSpec {
  const name = salesCategoryLabel(category, key)
  const normalizedKey = normalizeSalesCategory(name)
  return {
    path: `src/accounts/income/sales/${normalizedKey}`,
    accountType: 'sales',
    code: `SALES_${normalizedKey}`.toUpperCase().slice(0, 40),
    name,
    displayName: name,
    groupKey: 'sales_accounts',
    ledgerType: 'sales',
    normalBalance: 'credit',
  }
}

function titleFromKey(value: string) {
  const text = value
    .replace(/_+/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .trim()
  if (!text) return 'Sales Account'
  return text.replace(/\b\w/g, (character) => character.toUpperCase())
}

function normalizePurchaseCategory(value: unknown) {
  const text = slug(value)
  if (text.includes('fabric')) return 'fabric_purchase'
  if (text.includes('garment')) return 'garment_purchase'
  if (text.includes('accessor')) return 'accessories_purchase'
  return 'purchase'
}

function compactLines(lines: PostingLine[]) {
  const grouped = new Map<string, PostingLine>()
  for (const line of lines) {
    const key = `${line.ledgerId}:${line.category ?? ''}:${line.narration}`
    const existing = grouped.get(key)
    if (!existing) {
      grouped.set(key, { ...line, debit: roundMoney(line.debit), credit: roundMoney(line.credit) })
      continue
    }
    existing.debit = roundMoney(existing.debit + line.debit)
    existing.credit = roundMoney(existing.credit + line.credit)
  }
  return [...grouped.values()].filter((line) => roundMoney(line.debit) > 0 || roundMoney(line.credit) > 0)
}

function emptyRepostResult(): SourceModuleRepostResult {
  return { processed: 0, posted: 0, cancelled: 0, errors: [] }
}

function sourceTable(sourceModule: SourceModule) {
  if (sourceModule === 'sales') return 'sales_entries'
  if (sourceModule === 'purchase') return 'purchase_entries'
  if (sourceModule === 'receipt') return 'receipt_entries'
  if (sourceModule === 'cash_book') return 'cash_books'
  if (sourceModule === 'bank_book') return 'bank_books'
  return 'payment_entries'
}

function sourceDateColumn(sourceModule: SourceModule) {
  if (sourceModule === 'sales') return 'invoice_date'
  if (sourceModule === 'purchase') return 'entry_date'
  if (sourceModule === 'receipt') return 'receipt_date'
  if (sourceModule === 'cash_book' || sourceModule === 'bank_book') return 'voucher_date'
  return 'payment_date'
}

function sourceDocumentNo(sourceModule: SourceModule, row: Record<string, unknown>) {
  if (sourceModule === 'sales') return stringValue(row.invoice_no)
  if (sourceModule === 'purchase') return stringValue(row.entry_no)
  if (sourceModule === 'receipt') return stringValue(row.receipt_no)
  if (sourceModule === 'cash_book' || sourceModule === 'bank_book') return stringValue(row.voucher_no)
  return stringValue(row.payment_no)
}

function sourceItemFromRow(row: Record<string, unknown>) {
  return {
    ...row,
    quantity: numberValue(row.quantity),
    rate: numberValue(row.rate),
    discount_amount: numberValue(row.discount_amount),
    tax_rate: numberValue(row.tax_rate),
    tax_amount: numberValue(row.tax_amount),
    line_total: numberValue(row.line_total),
    accounting_category: nullableString(row.accounting_category),
    accounting_ledger_id: nullableNumber(row.accounting_ledger_id),
    sort_order: numberValue(row.sort_order),
  } as unknown as SalesEntryItem | PurchaseEntryItem
}

function receiptEntryFromRow(row: Record<string, unknown>) {
  return {
    ...row,
    receipt_date: dateString(row.receipt_date),
    party_id: nullableString(row.party_id),
    party_name: stringValue(row.party_name) || 'Customer',
    receipt_mode: stringValue(row.receipt_mode) || 'cash',
    reference_no: nullableString(row.reference_no),
    amount: roundMoney(row.amount),
    tds_amount: roundMoney(row.tds_amount),
    discount_amount: roundMoney(row.discount_amount),
    round_off: roundMoney(row.round_off),
    net_amount: roundMoney(row.net_amount),
    status: stringValue(row.status) || 'posted',
    deleted_at: row.deleted_at ?? null,
    notes: nullableString(row.notes),
    allocations: [],
    comments: [],
    activities: [],
  } as unknown as ReceiptEntry
}

function paymentEntryFromRow(row: Record<string, unknown>) {
  return {
    ...row,
    payment_date: dateString(row.payment_date),
    party_id: nullableString(row.party_id),
    party_name: stringValue(row.party_name) || 'Supplier',
    payment_mode: stringValue(row.payment_mode) || 'cash',
    reference_no: nullableString(row.reference_no),
    amount: roundMoney(row.amount),
    tds_amount: roundMoney(row.tds_amount),
    discount_amount: roundMoney(row.discount_amount),
    round_off: roundMoney(row.round_off),
    net_amount: roundMoney(row.net_amount),
    status: stringValue(row.status) || 'posted',
    deleted_at: row.deleted_at ?? null,
    notes: nullableString(row.notes),
    allocations: [],
    comments: [],
    activities: [],
  } as unknown as PaymentEntry
}

function bookEntryFromRow(row: Record<string, unknown>, bookType: AccountBookType) {
  return {
    ...row,
    book_type: bookType,
    voucher_date: dateString(row.voucher_date),
    direction: stringValue(row.direction) === 'out' ? 'out' : 'in',
    party_id: nullableString(row.party_id),
    party_name: nullableString(row.party_name) ?? '',
    particulars: nullableString(row.particulars),
    narration: nullableString(row.narration),
    reference_no: nullableString(row.reference_no),
    amount: roundMoney(row.amount),
    status: stringValue(row.status) || 'draft',
    deleted_at: row.deleted_at ?? null,
    comments: [],
    activities: [],
  } as unknown as AccountBookEntry
}

function itemTaxable(item: SalesEntryItem | PurchaseEntryItem) {
  return roundMoney(Math.max(0, numberValue(item.quantity) * numberValue(item.rate) - numberValue(item.discount_amount)))
}

function roundMoney(value: unknown) {
  const number = Number(value ?? 0)
  return Number.isFinite(number) ? Math.round(number * 100) / 100 : 0
}

function numberValue(value: unknown) {
  const number = Number(value ?? 0)
  return Number.isFinite(number) ? number : 0
}

function nullableNumber(value: unknown) {
  const number = numberValue(value)
  return number > 0 ? number : null
}

function stringValue(value: unknown) {
  return String(value ?? '').trim()
}

function nullableString(value: unknown) {
  return emptyAsNull(value)
}

function dateString(value: unknown) {
  return String(value ?? '').slice(0, 10)
}

function emptyAsNull(value: unknown) {
  const text = String(value ?? '').trim()
  return text || null
}

function slug(value: unknown) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
    .slice(0, 80) || 'normal'
}
