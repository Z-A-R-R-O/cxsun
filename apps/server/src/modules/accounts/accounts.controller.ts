import { Body, Headers, Param, Query } from '../../core/decorators/http-params.js'
import { Controller, Get, Post } from '../../core/decorators/controller.js'
import { Inject } from '../../core/decorators/inject.js'
import type { TenantRequestHeaders } from '../../core/tenant/tenant-context.service.js'
import { AccountsService } from './accounts.service.js'
import type { AccountBookEntryInput, AccountBookType, AccountLedgerInput, AccountLedgerType, AccountVoucherInput } from './accounts.types.js'
import type { PeriodLockInput } from '../entries/shared/entry-posting-control.service.js'

@Controller('api/v1/accounts')
export class AccountsController {
  constructor(@Inject(AccountsService) private readonly accounts: AccountsService) {}

  @Get('chart/groups')
  groups(@Headers() headers: TenantRequestHeaders) {
    return this.accounts.groups(headers)
  }

  @Get('ledgers')
  ledgers(@Headers() headers: TenantRequestHeaders) {
    return this.accounts.ledgers(headers)
  }

  @Get('ledgers/:type')
  ledgersByType(@Headers() headers: TenantRequestHeaders, @Param('type') type: AccountLedgerType) {
    return this.accounts.ledgers(headers, type)
  }

  @Post('ledgers/:type/upsert')
  upsertLedger(@Headers() headers: TenantRequestHeaders, @Param('type') type: AccountLedgerType, @Body() body: AccountLedgerInput) {
    return this.accounts.upsertLedger(headers, normalizeLedgerType(type), body)
  }

  @Get('vouchers')
  vouchers(@Headers() headers: TenantRequestHeaders) {
    return this.accounts.vouchers(headers)
  }

  @Get('vouchers/:idOrUuid')
  getVoucher(@Headers() headers: TenantRequestHeaders, @Param('idOrUuid') idOrUuid: string) {
    return this.accounts.getVoucher(headers, idOrUuid)
  }

  @Post('vouchers/upsert')
  upsertVoucher(@Headers() headers: TenantRequestHeaders, @Body() body: AccountVoucherInput) {
    return this.accounts.upsertVoucher(headers, body)
  }

  @Post('vouchers/:idOrUuid/post')
  postVoucher(@Headers() headers: TenantRequestHeaders, @Param('idOrUuid') idOrUuid: string) {
    return this.accounts.postVoucher(headers, idOrUuid)
  }

  @Post('vouchers/:idOrUuid/cancel')
  cancelVoucher(@Headers() headers: TenantRequestHeaders, @Param('idOrUuid') idOrUuid: string) {
    return this.accounts.cancelVoucher(headers, idOrUuid)
  }

  @Get('reports/day-book')
  dayBook(@Headers() headers: TenantRequestHeaders, @Query() query: { accounting_year_id?: string }) {
    return this.accounts.dayBook(headers, query ?? {})
  }

  @Get('books/cash')
  cashPostingBook(@Headers() headers: TenantRequestHeaders, @Query() query: { accounting_year_id?: string }) {
    return this.accounts.postingBook(headers, 'cash', query ?? {})
  }

  @Get('books/bank')
  bankPostingBook(@Headers() headers: TenantRequestHeaders, @Query() query: { accounting_year_id?: string }) {
    return this.accounts.postingBook(headers, 'bank', query ?? {})
  }

  @Get('reports/ledger/:ledgerUuid')
  ledgerStatement(@Headers() headers: TenantRequestHeaders, @Param('ledgerUuid') ledgerUuid: string) {
    return this.accounts.ledgerStatement(headers, ledgerUuid)
  }

  @Get('reports/trial-balance')
  trialBalance(@Headers() headers: TenantRequestHeaders, @Query() query: { accounting_year_id?: string }) {
    return this.accounts.trialBalance(headers, query ?? {})
  }

  @Get('reports/profit-loss')
  profitLoss(@Headers() headers: TenantRequestHeaders, @Query() query: { accounting_year_id?: string }) {
    return this.accounts.profitLoss(headers, query ?? {})
  }

  @Get('reports/balance-sheet')
  balanceSheet(@Headers() headers: TenantRequestHeaders, @Query() query: { accounting_year_id?: string }) {
    return this.accounts.balanceSheet(headers, query ?? {})
  }

  @Post('postings/rebuild')
  rebuildPostingRollups(@Headers() headers: TenantRequestHeaders, @Body() body: { source_module?: string }) {
    return this.accounts.rebuildPostingRollups(headers, body)
  }

  @Post('postings/repost-sources')
  repostSourceEntries(@Headers() headers: TenantRequestHeaders, @Body() body: { source_module?: string }) {
    return this.accounts.repostSourceEntries(headers, body)
  }

  @Get('period-locks')
  periodLocks(@Headers() headers: TenantRequestHeaders) {
    return this.accounts.periodLocks(headers)
  }

  @Post('period-locks')
  createPeriodLock(@Headers() headers: TenantRequestHeaders, @Body() body: PeriodLockInput) {
    return this.accounts.createPeriodLock(headers, body)
  }

  @Post('period-locks/:idOrUuid/release')
  releasePeriodLock(@Headers() headers: TenantRequestHeaders, @Param('idOrUuid') idOrUuid: string) {
    return this.accounts.releasePeriodLock(headers, idOrUuid)
  }

  @Get(':bookType')
  listEntries(@Headers() headers: TenantRequestHeaders, @Param('bookType') bookType: AccountBookType) {
    return this.accounts.listEntries(headers, normalizeBookType(bookType))
  }

  @Get(':bookType/:idOrUuid')
  getEntry(@Headers() headers: TenantRequestHeaders, @Param('bookType') bookType: AccountBookType, @Param('idOrUuid') idOrUuid: string) {
    return this.accounts.getEntry(headers, normalizeBookType(bookType), idOrUuid)
  }

  @Post(':bookType/upsert')
  upsertEntry(@Headers() headers: TenantRequestHeaders, @Param('bookType') bookType: AccountBookType, @Body() body: AccountBookEntryInput) {
    return this.accounts.upsertEntry(headers, normalizeBookType(bookType), body)
  }

  @Post(':bookType/:idOrUuid/destroy')
  destroyEntry(@Headers() headers: TenantRequestHeaders, @Param('bookType') bookType: AccountBookType, @Param('idOrUuid') idOrUuid: string) {
    return this.accounts.destroyEntry(headers, normalizeBookType(bookType), idOrUuid)
  }

  @Post(':bookType/:idOrUuid/restore')
  restoreEntry(@Headers() headers: TenantRequestHeaders, @Param('bookType') bookType: AccountBookType, @Param('idOrUuid') idOrUuid: string) {
    return this.accounts.restoreEntry(headers, normalizeBookType(bookType), idOrUuid)
  }

  @Post(':bookType/:idOrUuid/comment')
  commentEntry(@Headers() headers: TenantRequestHeaders, @Param('bookType') bookType: AccountBookType, @Param('idOrUuid') idOrUuid: string, @Body() body: { body?: string }) {
    return this.accounts.comment(headers, normalizeBookType(bookType), idOrUuid, body)
  }

  @Post(':bookType/:idOrUuid/tool')
  toolEntry(@Headers() headers: TenantRequestHeaders, @Param('bookType') bookType: AccountBookType, @Param('idOrUuid') idOrUuid: string, @Body() body: { tool?: string }) {
    return this.accounts.tool(headers, normalizeBookType(bookType), idOrUuid, body)
  }
}

function normalizeBookType(value: string): AccountBookType {
  return value === 'bank-book' || value === 'bank' ? 'bank' : 'cash'
}

function normalizeLedgerType(value: string): AccountLedgerType {
  if (value === 'bank') return 'bank'
  if (value === 'fixed_asset' || value === 'fixed-assets') return 'fixed_asset'
  if (value === 'customer') return 'customer'
  if (value === 'supplier') return 'supplier'
  if (value === 'sales') return 'sales'
  if (value === 'purchase') return 'purchase'
  if (value === 'gst') return 'gst'
  if (value === 'tds') return 'tds'
  if (value === 'round_off' || value === 'round-off') return 'round_off'
  if (value === 'discount') return 'discount'
  return 'cash'
}
