import { Inject } from '../../core/decorators/inject.js'
import { Injectable } from '../../core/decorators/injectable.js'
import { NotFoundException } from '../../core/exceptions/http.exception.js'
import { TenantContextService, type TenantRequestHeaders } from '../../core/tenant/tenant-context.service.js'
import { AccountsEngineRepository } from './accounts-engine.repository.js'
import { AccountsEntryPostingService } from './accounts-entry-posting.service.js'
import { AccountsRepository } from './accounts.repository.js'
import type { AccountBookEntryInput, AccountBookType, AccountLedgerInput, AccountLedgerType, AccountVoucherInput } from './accounts.types.js'

@Injectable()
export class AccountsService {
  constructor(
    @Inject(TenantContextService) private readonly tenants: TenantContextService,
    @Inject(AccountsRepository) private readonly accounts: AccountsRepository,
    @Inject(AccountsEngineRepository) private readonly engine: AccountsEngineRepository,
    @Inject(AccountsEntryPostingService) private readonly entryPostings: AccountsEntryPostingService,
  ) {}

  async groups(headers: TenantRequestHeaders) {
    return this.engine.groups(await this.context(headers))
  }

  async ledgers(headers: TenantRequestHeaders, type?: AccountLedgerType) {
    return this.accounts.ledgers(await this.context(headers), type)
  }

  async upsertLedger(headers: TenantRequestHeaders, type: AccountLedgerType, input: AccountLedgerInput) {
    return { ok: true, ledger: await this.accounts.upsertLedger(await this.context(headers), type, input) }
  }

  async vouchers(headers: TenantRequestHeaders) {
    return this.engine.vouchers(await this.context(headers))
  }

  async getVoucher(headers: TenantRequestHeaders, idOrUuid: string) {
    const voucher = await this.engine.findVoucher(await this.context(headers), idOrUuid)
    if (!voucher) throw new NotFoundException('Accounting voucher not found.')
    return voucher
  }

  async upsertVoucher(headers: TenantRequestHeaders, input: AccountVoucherInput) {
    return { ok: true, voucher: await this.engine.upsertVoucher(await this.context(headers), input) }
  }

  async postVoucher(headers: TenantRequestHeaders, idOrUuid: string) {
    return { ok: true, voucher: await this.engine.postVoucher(await this.context(headers), idOrUuid) }
  }

  async cancelVoucher(headers: TenantRequestHeaders, idOrUuid: string) {
    return { ok: true, voucher: await this.engine.cancelVoucher(await this.context(headers), idOrUuid) }
  }

  async dayBook(headers: TenantRequestHeaders, query: { accounting_year_id?: string }) {
    return this.engine.dayBook(await this.context(headers), normalizeAccountingYearId(query.accounting_year_id))
  }

  async postingBook(headers: TenantRequestHeaders, bookType: AccountBookType, query: { accounting_year_id?: string }) {
    return this.engine.postingBook(await this.context(headers), bookType, normalizeAccountingYearId(query.accounting_year_id))
  }

  async ledgerStatement(headers: TenantRequestHeaders, ledgerUuid: string) {
    return this.engine.ledgerStatement(await this.context(headers), ledgerUuid)
  }

  async trialBalance(headers: TenantRequestHeaders, query: { accounting_year_id?: string }) {
    return this.engine.trialBalance(await this.context(headers), normalizeAccountingYearId(query.accounting_year_id))
  }

  async profitLoss(headers: TenantRequestHeaders, query: { accounting_year_id?: string }) {
    return this.engine.profitLoss(await this.context(headers), normalizeAccountingYearId(query.accounting_year_id))
  }

  async balanceSheet(headers: TenantRequestHeaders, query: { accounting_year_id?: string }) {
    return this.engine.balanceSheet(await this.context(headers), normalizeAccountingYearId(query.accounting_year_id))
  }

  async rebuildPostingRollups(headers: TenantRequestHeaders, body: { source_module?: string }) {
    const sourceModule = normalizeSourceModule(body.source_module)
    return this.entryPostings.rebuildPostingRollups(await this.context(headers), sourceModule)
  }

  async repostSourceEntries(headers: TenantRequestHeaders, body: { source_module?: string }) {
    const sourceModule = normalizeSourceModule(body.source_module)
    return this.entryPostings.repostSourceEntries(await this.context(headers), sourceModule)
  }

  async listEntries(headers: TenantRequestHeaders, bookType: AccountBookType) {
    return this.accounts.listEntries(await this.context(headers), bookType)
  }

  async getEntry(headers: TenantRequestHeaders, bookType: AccountBookType, idOrUuid: string) {
    const entry = await this.accounts.findEntry(await this.context(headers), bookType, idOrUuid)
    if (!entry) throw new NotFoundException('Account entry not found.')
    return entry
  }

  async upsertEntry(headers: TenantRequestHeaders, bookType: AccountBookType, input: AccountBookEntryInput) {
    return { ok: true, entry: await this.accounts.upsertEntry(await this.context(headers), bookType, input) }
  }

  async destroyEntry(headers: TenantRequestHeaders, bookType: AccountBookType, idOrUuid: string) {
    const deleted = await this.accounts.destroyEntry(await this.context(headers), bookType, idOrUuid)
    if (!deleted) throw new NotFoundException('Account entry not found.')
    return { ok: true }
  }

  async restoreEntry(headers: TenantRequestHeaders, bookType: AccountBookType, idOrUuid: string) {
    const entry = await this.accounts.restoreEntry(await this.context(headers), bookType, idOrUuid)
    if (!entry) throw new NotFoundException('Account entry not found.')
    return { ok: true, entry }
  }

  async comment(headers: TenantRequestHeaders, bookType: AccountBookType, idOrUuid: string, body: { body?: string }) {
    const text = String(body.body ?? '').trim()
    if (!text) return this.getEntry(headers, bookType, idOrUuid)
    const entry = await this.accounts.addComment(await this.context(headers), bookType, idOrUuid, text)
    if (!entry) throw new NotFoundException('Account entry not found.')
    return { ok: true, entry }
  }

  async tool(headers: TenantRequestHeaders, bookType: AccountBookType, idOrUuid: string, body: { tool?: string }) {
    const tool = String(body.tool ?? 'tool').trim() || 'tool'
    const entry = await this.accounts.addActivity(await this.context(headers), bookType, idOrUuid, 'tool', `${tool} requested`)
    if (!entry) throw new NotFoundException('Account entry not found.')
    return { ok: true, entry }
  }

  private context(headers: TenantRequestHeaders) {
    return this.tenants.resolve(headers, 'company.manage')
  }
}

function normalizeSourceModule(value: unknown) {
  const text = String(value ?? '').trim()
  if (text === 'sales' || text === 'purchase' || text === 'receipt' || text === 'payment' || text === 'cash_book' || text === 'bank_book') return text
  return undefined
}

function normalizeAccountingYearId(value: unknown) {
  const number = Number(value ?? 0)
  return Number.isInteger(number) && number > 0 ? number : undefined
}
