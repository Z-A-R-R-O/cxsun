import type { Kysely } from 'kysely'
import { BadRequestException } from '../../core/exceptions/http.exception.js'
import { Injectable } from '../../core/decorators/injectable.js'
import { Inject } from '../../core/decorators/inject.js'
import { dispatchPublicUuid } from '../../shared/helpers/public-uuid.js'
import type { TenantRuntimeContext } from '../../core/tenant/tenant-context.service.js'
import { DocumentNumberRepository } from '../settings/document-settings/infrastructure/document-number.repository.js'
import type { AccountBookEntry, AccountBookEntryInput, AccountBookType, AccountLedgerInput, AccountLedgerType } from './accounts.types.js'

type DynamicDatabase = Record<string, Record<string, unknown>>
type AccountBookTable = 'cash_books' | 'bank_books'

@Injectable()
export class AccountsRepository {
  constructor(@Inject(DocumentNumberRepository) private readonly documentNumbers: DocumentNumberRepository) {}

  async ledgers(context: TenantRuntimeContext, type?: AccountLedgerType) {
    await this.ensureDefaultLedgers(context)
    let query = this.database(context)
      .selectFrom('account_ledgers')
      .selectAll()
      .where('tenant_id', '=', context.tenant.id)
      .where('deleted_at', 'is', null)

    if (type) query = query.where('account_type', '=', type)
    return query.orderBy('account_type', 'asc').orderBy('name', 'asc').execute()
  }

  async upsertLedger(context: TenantRuntimeContext, type: AccountLedgerType, input: AccountLedgerInput) {
    await this.ensureDefaultLedgers(context)
    const accountType = type === 'bank' ? 'bank' : type === 'fixed_asset' ? 'fixed_asset' : 'cash'
    const name = String(input.name ?? '').trim()
    if (!name) throw new BadRequestException('Ledger name is required.')
    const companyId = await this.defaultCompanyId(context)
    const accountingYearId = await this.defaultAccountingYearId(context)
    const code = cleanLedgerCode(input.code || name)
    const path = ledgerPath(accountType, name)
    const existing = input.id || input.uuid
      ? await this.database(context)
        .selectFrom('account_ledgers')
        .selectAll()
        .where('tenant_id', '=', context.tenant.id)
        .where(this.idColumn(String(input.uuid ?? input.id)), '=', this.idValue(String(input.uuid ?? input.id)))
        .executeTakeFirst()
      : await this.database(context)
        .selectFrom('account_ledgers')
        .selectAll()
        .where('tenant_id', '=', context.tenant.id)
        .where('path', '=', path)
        .executeTakeFirst()

    if (existing) {
      await this.database(context)
        .updateTable('account_ledgers')
        .set({
          account_type: accountType,
          code,
          name,
          opening_balance: roundMoney(input.opening_balance ?? existing.opening_balance ?? 0),
          path,
          status: input.status || 'active',
          is_active: input.is_active ?? true,
          deleted_at: null,
        })
        .where('id', '=', Number(existing.id))
        .where('tenant_id', '=', context.tenant.id)
        .execute()
      const updated = await this.database(context).selectFrom('account_ledgers').selectAll().where('id', '=', Number(existing.id)).executeTakeFirstOrThrow()
      await this.rebalanceLedger(context, Number(updated.id))
      return updated
    }

    const result = await this.database(context)
      .insertInto('account_ledgers')
      .values({
        uuid: dispatchPublicUuid(),
        tenant_id: context.tenant.id,
        company_id: companyId,
        accounting_year_id: accountingYearId,
        path,
        account_type: accountType,
        code,
        name,
        opening_balance: roundMoney(input.opening_balance ?? 0),
        current_balance: roundMoney(input.opening_balance ?? 0),
        status: input.status || 'active',
        is_active: input.is_active ?? true,
      })
      .executeTakeFirstOrThrow()

    return this.database(context).selectFrom('account_ledgers').selectAll().where('id', '=', Number(result.insertId)).executeTakeFirstOrThrow()
  }

  async listEntries(context: TenantRuntimeContext, bookType: AccountBookType) {
    await this.ensureDefaultLedgers(context)
    const companyId = await this.defaultCompanyId(context)
    const accountingYearId = await this.defaultAccountingYearId(context)
    const rows = await this.database(context)
      .selectFrom(this.bookTable(bookType))
      .selectAll()
      .where('tenant_id', '=', context.tenant.id)
      .where('company_id', '=', companyId)
      .where('accounting_year_id', '=', accountingYearId)
      .where('deleted_at', 'is', null)
      .orderBy('voucher_date', 'desc')
      .orderBy('id', 'desc')
      .execute()
    return Promise.all(rows.map((row) => this.withBookType(context, row, bookType)))
  }

  async findEntry(context: TenantRuntimeContext, bookType: AccountBookType, idOrUuid: string) {
    const row = await this.database(context)
      .selectFrom(this.bookTable(bookType))
      .selectAll()
      .where('tenant_id', '=', context.tenant.id)
      .where(this.idColumn(idOrUuid), '=', this.idValue(idOrUuid))
      .where('deleted_at', 'is', null)
      .executeTakeFirst()
    return row ? this.withBookType(context, row, bookType) : null
  }

  async upsertEntry(context: TenantRuntimeContext, bookType: AccountBookType, input: AccountBookEntryInput) {
    if (input.id || input.uuid) return this.updateEntry(context, bookType, String(input.uuid ?? input.id), input)
    return this.insertEntry(context, bookType, input)
  }

  async insertEntry(context: TenantRuntimeContext, bookType: AccountBookType, input: AccountBookEntryInput) {
    const normalized = await this.normalizeEntry(context, bookType, input)
    const result = await this.database(context)
      .insertInto(this.bookTable(bookType))
      .values({ ...normalized, uuid: dispatchPublicUuid(), tenant_id: context.tenant.id })
      .executeTakeFirstOrThrow()
    await this.rebalanceLedger(context, normalized.ledger_id)
    const entry = await this.findEntry(context, bookType, String(Number(result.insertId)))
    if (!entry) throw new BadRequestException('Entry was saved but could not be read back.')
    await this.addActivityById(context, bookType, Number(entry.id), 'created', `You created ${entry.voucher_no}`)
    return entry
  }

  async updateEntry(context: TenantRuntimeContext, bookType: AccountBookType, idOrUuid: string, input: AccountBookEntryInput) {
    const existing = await this.findEntry(context, bookType, idOrUuid)
    if (!existing) throw new BadRequestException('Entry not found.')
    const normalized = await this.normalizeEntry(context, bookType, { ...input, voucher_no: input.voucher_no || String(existing.voucher_no) }, Number(existing.id))
    await this.database(context)
      .updateTable(this.bookTable(bookType))
      .set(normalized)
      .where('tenant_id', '=', context.tenant.id)
      .where('id', '=', Number(existing.id))
      .execute()
    await this.rebalanceLedger(context, Number(existing.ledger_id))
    if (Number(existing.ledger_id) !== normalized.ledger_id) await this.rebalanceLedger(context, normalized.ledger_id)
    const entry = await this.findEntry(context, bookType, String(existing.id))
    if (!entry) throw new BadRequestException('Entry was updated but could not be read back.')
    await this.addActivityById(context, bookType, Number(entry.id), 'updated', `You last edited ${entry.voucher_no}`)
    return entry
  }

  async destroyEntry(context: TenantRuntimeContext, bookType: AccountBookType, idOrUuid: string) {
    const existing = await this.findEntry(context, bookType, idOrUuid)
    if (!existing) return false
    await this.database(context)
      .updateTable(this.bookTable(bookType))
      .set({ deleted_at: new Date(), is_active: false })
      .where('id', '=', Number(existing.id))
      .where('tenant_id', '=', context.tenant.id)
      .execute()
    await this.rebalanceLedger(context, Number(existing.ledger_id))
    await this.addActivityById(context, bookType, Number(existing.id), 'deleted', `You suspended ${existing.voucher_no}`)
    return true
  }

  async restoreEntry(context: TenantRuntimeContext, bookType: AccountBookType, idOrUuid: string) {
    await this.database(context)
      .updateTable(this.bookTable(bookType))
      .set({ deleted_at: null, is_active: true })
      .where('tenant_id', '=', context.tenant.id)
      .where(this.idColumn(idOrUuid), '=', this.idValue(idOrUuid))
      .execute()
    const entry = await this.findEntry(context, bookType, idOrUuid)
    if (entry) {
      await this.rebalanceLedger(context, Number(entry.ledger_id))
      await this.addActivityById(context, bookType, Number(entry.id), 'restored', `You restored ${entry.voucher_no}`)
    }
    return entry
  }

  async addComment(context: TenantRuntimeContext, bookType: AccountBookType, idOrUuid: string, body: string) {
    const existing = await this.findEntry(context, bookType, idOrUuid)
    if (!existing) return null
    await this.database(context)
      .insertInto('account_book_comments')
      .values({ tenant_id: context.tenant.id, book_type: bookType, entry_id: Number(existing.id), uuid: dispatchPublicUuid(), author_email: context.user.email, body })
      .execute()
    await this.addActivityById(context, bookType, Number(existing.id), 'commented', `Commented on ${existing.voucher_no}`)
    return this.findEntry(context, bookType, idOrUuid)
  }

  async addActivity(context: TenantRuntimeContext, bookType: AccountBookType, idOrUuid: string, activityType: string, message: string) {
    const existing = await this.findEntry(context, bookType, idOrUuid)
    if (!existing) return null
    await this.addActivityById(context, bookType, Number(existing.id), activityType, message)
    return this.findEntry(context, bookType, idOrUuid)
  }

  private async normalizeEntry(context: TenantRuntimeContext, bookType: AccountBookType, input: AccountBookEntryInput, existingId?: number) {
    const companyId = input.company_id ?? await this.defaultCompanyId(context)
    const accountingYearId = input.accounting_year_id ?? await this.defaultAccountingYearId(context)
    const ledgerId = Number(input.ledger_id ?? 0)
    const ledger = await this.database(context)
      .selectFrom('account_ledgers')
      .selectAll()
      .where('tenant_id', '=', context.tenant.id)
      .where('id', '=', ledgerId)
      .where('account_type', '=', bookType)
      .where('deleted_at', 'is', null)
      .executeTakeFirst()
    if (!ledger) throw new BadRequestException(`${bookType === 'cash' ? 'Cash' : 'Bank'} ledger is required.`)
    const amount = roundMoney(input.amount ?? 0)
    if (amount <= 0) throw new BadRequestException('Amount must be greater than zero.')
    const direction = input.direction === 'out' ? 'out' : 'in'
    const voucherNo = await this.resolveVoucherNo(context, bookType, input.voucher_no, companyId, accountingYearId, existingId)

    return {
      company_id: companyId,
      accounting_year_id: accountingYearId,
      ledger_id: ledgerId,
      voucher_no: voucherNo,
      voucher_date: input.voucher_date || today(),
      direction,
      party_id: emptyAsNull(input.party_id),
      party_name: emptyAsNull(input.party_name),
      particulars: emptyAsNull(input.particulars),
      narration: emptyAsNull(input.narration),
      reference_no: emptyAsNull(input.reference_no),
      amount,
      balance_after: 0,
      status: input.status || 'draft',
      notes: emptyAsNull(input.notes),
      is_active: input.is_active ?? true,
    }
  }

  private async resolveVoucherNo(context: TenantRuntimeContext, bookType: AccountBookType, voucherNo: string | undefined, companyId: number, accountingYearId: number, existingId?: number) {
    const trimmed = voucherNo?.trim()
    const kind = this.documentKind(bookType)
    const docContext = { accountingYearId: String(accountingYearId), companyId: String(companyId) }
    if (!trimmed) return this.nextVoucherNo(context, bookType, companyId, accountingYearId)

    const preview = await this.documentNumbers.previewNext(context, kind, docContext)
    if (preview.autoEnabled && trimmed === preview.preview) return this.nextVoucherNo(context, bookType, companyId, accountingYearId)
    if (await this.voucherNoExists(context, bookType, trimmed, companyId, accountingYearId, existingId)) {
      if (!preview.autoEnabled) throw new BadRequestException(`Voucher number ${trimmed} already exists.`)
      return this.nextVoucherNo(context, bookType, companyId, accountingYearId)
    }

    await this.documentNumbers.advancePast(context, kind, docContext, trimmed)
    return trimmed
  }

  private async nextVoucherNo(context: TenantRuntimeContext, bookType: AccountBookType, companyId: number, accountingYearId: number) {
    const kind = this.documentKind(bookType)
    const docContext = { accountingYearId: String(accountingYearId), companyId: String(companyId) }
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const documentNumber = await this.documentNumbers.consumeNext(context, kind, docContext)
      if (!documentNumber) throw new BadRequestException(`${bookType === 'cash' ? 'Cash book' : 'Bank book'} voucher number is required when automatic numbering is disabled.`)
      if (!await this.voucherNoExists(context, bookType, documentNumber, companyId, accountingYearId)) return documentNumber
    }

    throw new BadRequestException('Unable to find an available voucher number. Please check document number settings.')
  }

  private async voucherNoExists(context: TenantRuntimeContext, bookType: AccountBookType, voucherNo: string, companyId: number, accountingYearId: number, existingId?: number) {
    let query = this.database(context)
      .selectFrom(this.bookTable(bookType))
      .select('id')
      .where('tenant_id', '=', context.tenant.id)
      .where('company_id', '=', companyId)
      .where('accounting_year_id', '=', accountingYearId)
      .where('voucher_no', '=', voucherNo)
    if (existingId) query = query.where('id', '!=', existingId)
    return Boolean(await query.executeTakeFirst())
  }

  private async ensureDefaultLedgers(context: TenantRuntimeContext) {
    const companyId = await this.defaultCompanyId(context)
    const accountingYearId = await this.defaultAccountingYearId(context)
    const defaults = [
      { path: 'src/accounts/assets/cash/cashonhand', account_type: 'cash', code: 'CASHONHAND', name: 'Cash on Hand' },
      { path: 'src/accounts/assets/cash/pettycash', account_type: 'cash', code: 'PETTYCASH', name: 'Petty Cash' },
      { path: 'src/accounts/assets/bank', account_type: 'bank', code: 'BANK', name: 'Bank' },
      { path: 'src/accounts/assets/fixedassets', account_type: 'fixed_asset', code: 'FIXEDASSETS', name: 'Fixed Assets' },
    ] as const

    for (const ledger of defaults) {
      const existing = await this.database(context)
        .selectFrom('account_ledgers')
        .select('id')
        .where('tenant_id', '=', context.tenant.id)
        .where('path', '=', ledger.path)
        .executeTakeFirst()
      if (existing) continue
      await this.database(context)
        .insertInto('account_ledgers')
        .values({
          ...ledger,
          uuid: dispatchPublicUuid(),
          tenant_id: context.tenant.id,
          company_id: companyId,
          accounting_year_id: accountingYearId,
          opening_balance: 0,
          current_balance: 0,
          status: 'active',
          is_active: true,
        })
        .execute()
    }
  }

  private async rebalanceLedger(context: TenantRuntimeContext, ledgerId: number) {
    const ledger = await this.database(context).selectFrom('account_ledgers').select(['account_type', 'opening_balance']).where('id', '=', ledgerId).executeTakeFirst()
    const ledgerType = String(ledger?.account_type ?? '')
    if (!ledger || !isBookType(ledgerType)) return
    const tableName = this.bookTable(ledgerType)
    const entries = await this.database(context)
      .selectFrom(tableName)
      .selectAll()
      .where('ledger_id', '=', ledgerId)
      .where('deleted_at', 'is', null)
      .orderBy('voucher_date', 'asc')
      .orderBy('id', 'asc')
      .execute()
    let balance = roundMoney(ledger?.opening_balance ?? 0)
    for (const entry of entries) {
      balance = roundMoney(balance + (String(entry.direction) === 'out' ? -numberValue(entry.amount) : numberValue(entry.amount)))
      await this.database(context).updateTable(tableName).set({ balance_after: balance }).where('id', '=', Number(entry.id)).execute()
    }
    await this.database(context).updateTable('account_ledgers').set({ current_balance: balance }).where('id', '=', ledgerId).execute()
  }

  private async defaultCompanyId(context: TenantRuntimeContext) {
    const row = await this.database(context).selectFrom('default_companies').select('company_id').where('is_active', '=', true).orderBy('id', 'asc').executeTakeFirst()
    return Number(row?.company_id ?? 0)
  }

  private async defaultAccountingYearId(context: TenantRuntimeContext) {
    const row = await this.database(context).selectFrom('default_companies').select('accounting_year_id').where('is_active', '=', true).orderBy('id', 'asc').executeTakeFirst()
    return Number(row?.accounting_year_id ?? 0)
  }

  private idColumn(idOrUuid: string) {
    return /^\d+$/.test(idOrUuid) && idOrUuid.length !== 8 ? 'id' : 'uuid'
  }

  private idValue(idOrUuid: string) {
    return this.idColumn(idOrUuid) === 'id' ? Number(idOrUuid) : idOrUuid
  }

  private database(context: TenantRuntimeContext) {
    return context.database as unknown as Kysely<DynamicDatabase>
  }

  private bookTable(bookType: AccountBookType): AccountBookTable {
    return bookType === 'cash' ? 'cash_books' : 'bank_books'
  }

  private documentKind(bookType: AccountBookType) {
    return bookType === 'cash' ? 'cashBook' : 'bankBook'
  }

  private async withBookType(context: TenantRuntimeContext, row: Record<string, unknown>, bookType: AccountBookType): Promise<AccountBookEntry> {
    const entryId = Number(row.id)
    const [comments, activities] = await Promise.all([
      this.database(context)
        .selectFrom('account_book_comments')
        .selectAll()
        .where('tenant_id', '=', context.tenant.id)
        .where('book_type', '=', bookType)
        .where('entry_id', '=', entryId)
        .orderBy('id', 'desc')
        .execute(),
      this.database(context)
        .selectFrom('account_book_activities')
        .selectAll()
        .where('tenant_id', '=', context.tenant.id)
        .where('book_type', '=', bookType)
        .where('entry_id', '=', entryId)
        .orderBy('id', 'desc')
        .execute(),
    ])
    return { ...row, book_type: bookType, comments, activities } as unknown as AccountBookEntry
  }

  private async addActivityById(context: TenantRuntimeContext, bookType: AccountBookType, entryId: number, activityType: string, message: string) {
    await this.database(context)
      .insertInto('account_book_activities')
      .values({
        tenant_id: context.tenant.id,
        book_type: bookType,
        entry_id: entryId,
        uuid: dispatchPublicUuid(),
        activity_type: activityType,
        actor_email: context.user.email,
        message,
        payload: JSON.stringify({ tenantId: context.tenant.id }),
      })
      .execute()
  }
}

function numberValue(value: unknown) {
  const number = Number(value ?? 0)
  return Number.isFinite(number) ? number : 0
}

function roundMoney(value: unknown) {
  return Math.round(numberValue(value) * 100) / 100
}

function emptyAsNull(value: unknown) {
  const text = String(value ?? '').trim()
  return text || null
}

function today() {
  return new Date().toISOString().slice(0, 10)
}

function isBookType(value: string): value is AccountBookType {
  return value === 'cash' || value === 'bank'
}

function cleanLedgerCode(value: unknown) {
  return String(value ?? '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40) || 'LEDGER'
}

function ledgerPath(type: AccountLedgerType, name: string) {
  const segment = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 80) || 'ledger'
  if (type === 'bank') return `src/accounts/assets/bank/${segment}`
  if (type === 'fixed_asset') return `src/accounts/assets/fixedassets/${segment}`
  return `src/accounts/assets/cash/${segment}`
}
