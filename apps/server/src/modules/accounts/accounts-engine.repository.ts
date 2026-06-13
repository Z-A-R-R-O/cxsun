import type { Kysely } from 'kysely'
import { BadRequestException } from '../../core/exceptions/http.exception.js'
import { Injectable } from '../../core/decorators/injectable.js'
import { dispatchPublicUuid } from '../../shared/helpers/public-uuid.js'
import type { TenantRuntimeContext } from '../../core/tenant/tenant-context.service.js'
import type { AccountBookType, AccountGroup, AccountGroupNature, AccountNormalBalance, AccountPostingBookRow, AccountTrialBalanceRow, AccountVoucher, AccountVoucherInput, AccountVoucherLineInput, AccountVoucherType } from './accounts.types.js'

type DynamicDatabase = Record<string, Record<string, unknown>>

@Injectable()
export class AccountsEngineRepository {
  async groups(context: TenantRuntimeContext) {
    await this.ensureDefaultGroups(context)
    const { companyId, accountingYearId } = await this.defaultContext(context)
    const rows = await this.database(context)
      .selectFrom('account_groups')
      .selectAll()
      .where('tenant_id', '=', context.tenant.id)
      .where('company_id', '=', companyId)
      .where('accounting_year_id', '=', accountingYearId)
      .where('deleted_at', 'is', null)
      .orderBy('path', 'asc')
      .execute()
    return rows as unknown as AccountGroup[]
  }

  async vouchers(context: TenantRuntimeContext) {
    await this.ensureDefaultGroups(context)
    const { companyId, accountingYearId } = await this.defaultContext(context)
    const rows = await this.database(context)
      .selectFrom('account_vouchers')
      .selectAll()
      .where('tenant_id', '=', context.tenant.id)
      .where('company_id', '=', companyId)
      .where('accounting_year_id', '=', accountingYearId)
      .where('deleted_at', 'is', null)
      .orderBy('voucher_date', 'desc')
      .orderBy('id', 'desc')
      .execute()
    return Promise.all(rows.map((row) => this.withVoucherLines(context, row)))
  }

  async findVoucher(context: TenantRuntimeContext, idOrUuid: string) {
    const row = await this.database(context)
      .selectFrom('account_vouchers')
      .selectAll()
      .where('tenant_id', '=', context.tenant.id)
      .where(this.idColumn(idOrUuid), '=', this.idValue(idOrUuid))
      .where('deleted_at', 'is', null)
      .executeTakeFirst()
    return row ? this.withVoucherLines(context, row) : null
  }

  async upsertVoucher(context: TenantRuntimeContext, input: AccountVoucherInput) {
    await this.ensureDefaultGroups(context)
    const existing = input.id || input.uuid ? await this.findVoucher(context, String(input.uuid ?? input.id)) : null
    if (existing?.status === 'posted') throw new BadRequestException('Posted accounting vouchers cannot be edited. Cancel or reverse the voucher first.')
    if (existing?.status === 'cancelled') throw new BadRequestException('Cancelled accounting vouchers cannot be edited.')
    const normalized = await this.normalizeVoucher(context, input)

    if (existing) {
      await this.database(context)
        .updateTable('account_vouchers')
        .set({
          ...normalized.header,
          updated_by: context.user.email,
        })
        .where('id', '=', Number(existing.id))
        .where('tenant_id', '=', context.tenant.id)
        .execute()
      await this.database(context).deleteFrom('account_voucher_lines').where('voucher_id', '=', Number(existing.id)).execute()
      await this.insertLines(context, Number(existing.id), normalized.lines)
      return this.findVoucher(context, existing.uuid) as Promise<AccountVoucher>
    }

    const result = await this.database(context)
      .insertInto('account_vouchers')
      .values({
        uuid: dispatchPublicUuid(),
        tenant_id: context.tenant.id,
        ...normalized.header,
        created_by: context.user.email,
      })
      .executeTakeFirstOrThrow()
    const voucherId = Number(result.insertId)
    await this.insertLines(context, voucherId, normalized.lines)
    return this.findVoucher(context, String(voucherId)) as Promise<AccountVoucher>
  }

  async postVoucher(context: TenantRuntimeContext, idOrUuid: string) {
    const voucher = await this.findVoucher(context, idOrUuid)
    if (!voucher) throw new BadRequestException('Accounting voucher not found.')
    if (voucher.status === 'posted') return voucher
    if (voucher.status === 'cancelled') throw new BadRequestException('Cancelled accounting vouchers cannot be posted.')
    this.assertBalanced(voucher.lines)
    await this.database(context).deleteFrom('account_postings').where('voucher_id', '=', Number(voucher.id)).execute()
    for (const line of voucher.lines) {
      await this.database(context)
        .insertInto('account_postings')
        .values({
          uuid: dispatchPublicUuid(),
          tenant_id: context.tenant.id,
          company_id: Number(voucher.company_id),
          accounting_year_id: Number(voucher.accounting_year_id),
          voucher_id: Number(voucher.id),
          voucher_line_id: Number(line.id),
          ledger_id: Number(line.ledger_id),
          posting_date: voucher.voucher_date,
          debit_amount: roundMoney(line.debit_amount),
          credit_amount: roundMoney(line.credit_amount),
          source_module: voucher.source_module,
          source_uuid: voucher.source_uuid,
          is_active: true,
        })
        .execute()
    }
    await this.database(context)
      .updateTable('account_vouchers')
      .set({ status: 'posted', posted_at: new Date(), updated_by: context.user.email })
      .where('id', '=', Number(voucher.id))
      .execute()
    return this.findVoucher(context, voucher.uuid) as Promise<AccountVoucher>
  }

  async cancelVoucher(context: TenantRuntimeContext, idOrUuid: string) {
    const voucher = await this.findVoucher(context, idOrUuid)
    if (!voucher) throw new BadRequestException('Accounting voucher not found.')
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
    return this.findVoucher(context, voucher.uuid) as Promise<AccountVoucher>
  }

  async dayBook(context: TenantRuntimeContext, accountingYearIdInput?: number) {
    const { companyId, accountingYearId } = await this.defaultContext(context, accountingYearIdInput)
    const rows = await this.database(context)
      .selectFrom('account_vouchers')
      .selectAll()
      .where('tenant_id', '=', context.tenant.id)
      .where('company_id', '=', companyId)
      .where('accounting_year_id', '=', accountingYearId)
      .where('deleted_at', 'is', null)
      .orderBy('voucher_date', 'desc')
      .orderBy('id', 'desc')
      .execute()
    return Promise.all(rows.map((row) => this.withVoucherLines(context, row)))
  }

  async postingBook(context: TenantRuntimeContext, bookType: AccountBookType, accountingYearIdInput?: number): Promise<AccountPostingBookRow[]> {
    const { companyId, accountingYearId } = await this.defaultContext(context, accountingYearIdInput)
    const rows = await this.database(context)
      .selectFrom('account_postings as posting')
      .innerJoin('account_vouchers as voucher', 'voucher.id', 'posting.voucher_id')
      .innerJoin('account_ledgers as ledger', 'ledger.id', 'posting.ledger_id')
      .select([
        'posting.id as posting_id',
        'posting.uuid as posting_uuid',
        'posting.posting_date',
        'voucher.uuid as voucher_uuid',
        'voucher.voucher_no',
        'voucher.voucher_type',
        'voucher.source_module',
        'voucher.source_uuid',
        'ledger.id as ledger_id',
        'ledger.name as ledger_name',
        'posting.debit_amount',
        'posting.credit_amount',
        'voucher.narration',
      ])
      .where('posting.tenant_id', '=', context.tenant.id)
      .where('posting.company_id', '=', companyId)
      .where('posting.accounting_year_id', '=', accountingYearId)
      .where('posting.is_active', '=', true)
      .where('voucher.status', '=', 'posted')
      .where('ledger.account_type', '=', bookType)
      .where('ledger.deleted_at', 'is', null)
      .orderBy('posting.posting_date', 'asc')
      .orderBy('posting.id', 'asc')
      .execute()
    let running = 0
    return rows.map((row) => {
      running = roundMoney(running + numberValue(row.debit_amount) - numberValue(row.credit_amount))
      return {
        ...row,
        debit_amount: numberValue(row.debit_amount),
        credit_amount: numberValue(row.credit_amount),
        balance_after: running,
      } as AccountPostingBookRow
    }).reverse()
  }

  async ledgerStatement(context: TenantRuntimeContext, ledgerUuid: string) {
    const ledger = await this.database(context)
      .selectFrom('account_ledgers')
      .selectAll()
      .where('tenant_id', '=', context.tenant.id)
      .where('uuid', '=', ledgerUuid)
      .executeTakeFirst()
    if (!ledger) throw new BadRequestException('Account ledger not found.')
    const rows = await this.database(context)
      .selectFrom('account_postings as posting')
      .innerJoin('account_vouchers as voucher', 'voucher.id', 'posting.voucher_id')
      .innerJoin('account_ledgers as ledger', 'ledger.id', 'posting.ledger_id')
      .select([
        'posting.id as posting_id',
        'posting.uuid as posting_uuid',
        'posting.posting_date',
        'voucher.uuid as voucher_uuid',
        'voucher.voucher_no',
        'voucher.voucher_type',
        'ledger.id as ledger_id',
        'ledger.name as ledger_name',
        'posting.debit_amount',
        'posting.credit_amount',
        'voucher.narration',
      ])
      .where('posting.tenant_id', '=', context.tenant.id)
      .where('posting.ledger_id', '=', Number(ledger.id))
      .where('posting.is_active', '=', true)
      .orderBy('posting.posting_date', 'asc')
      .orderBy('posting.id', 'asc')
      .execute()
    let running = roundMoney((ledger.opening_debit ?? ledger.opening_balance ?? 0) as number) - roundMoney((ledger.opening_credit ?? 0) as number)
    return rows.map((row) => {
      running = roundMoney(running + numberValue(row.debit_amount) - numberValue(row.credit_amount))
      return {
        ...row,
        debit_amount: numberValue(row.debit_amount),
        credit_amount: numberValue(row.credit_amount),
        running_balance: Math.abs(running),
        running_side: running >= 0 ? 'debit' : 'credit',
      }
    })
  }

  async trialBalance(context: TenantRuntimeContext, accountingYearIdInput?: number) {
    const { companyId, accountingYearId } = await this.defaultContext(context, accountingYearIdInput)
    const rows = await this.database(context)
      .selectFrom('account_ledgers as ledger')
      .leftJoin('account_groups as grp', 'grp.id', 'ledger.group_id')
      .leftJoin('account_postings as posting', (join) =>
        join
          .onRef('posting.ledger_id', '=', 'ledger.id')
          .on('posting.tenant_id', '=', context.tenant.id)
          .on('posting.company_id', '=', companyId)
          .on('posting.accounting_year_id', '=', accountingYearId)
          .on('posting.is_active', '=', true),
      )
      .select([
        'ledger.id as ledger_id',
        'ledger.uuid as ledger_uuid',
        'ledger.name as ledger_name',
        'grp.name as group_name',
        'grp.nature as nature',
      ])
      .select((eb) => [
        eb.fn.coalesce(eb.fn.sum('posting.debit_amount'), eb.val(0)).as('debit_total'),
        eb.fn.coalesce(eb.fn.sum('posting.credit_amount'), eb.val(0)).as('credit_total'),
      ])
      .where('ledger.tenant_id', '=', context.tenant.id)
      .where('ledger.company_id', '=', companyId)
      .where('ledger.accounting_year_id', '=', accountingYearId)
      .where('ledger.deleted_at', 'is', null)
      .groupBy(['ledger.id', 'ledger.uuid', 'ledger.name', 'grp.name', 'grp.nature'])
      .orderBy('ledger.name', 'asc')
      .execute()
    return rows.map((row) => normalizeTrialBalanceRow(row))
  }

  async profitLoss(context: TenantRuntimeContext, accountingYearIdInput?: number) {
    const rows = await this.trialBalance(context, accountingYearIdInput)
    return summarizeByNature(rows, ['income', 'expense'])
  }

  async balanceSheet(context: TenantRuntimeContext, accountingYearIdInput?: number) {
    const rows = await this.trialBalance(context, accountingYearIdInput)
    return summarizeByNature(rows, ['asset', 'liability', 'equity'])
  }

  private async normalizeVoucher(context: TenantRuntimeContext, input: AccountVoucherInput) {
    const { companyId, accountingYearId } = await this.defaultContext(context)
    const voucherType = normalizeVoucherType(input.voucher_type)
    const lines = await this.normalizeLines(context, input.lines ?? [])
    this.assertBalanced(lines)
    return {
      header: {
        company_id: companyId,
        accounting_year_id: accountingYearId,
        voucher_type: voucherType,
        voucher_no: emptyAsNull(input.voucher_no) ?? await this.nextVoucherNo(context, voucherType),
        voucher_date: input.voucher_date || today(),
        reference_no: emptyAsNull(input.reference_no),
        party_ledger_id: input.party_ledger_id ?? null,
        source_module: emptyAsNull(input.source_module),
        source_uuid: emptyAsNull(input.source_uuid),
        status: input.status === 'posted' || input.status === 'cancelled' ? input.status : 'draft',
        narration: emptyAsNull(input.narration),
      },
      lines,
    }
  }

  private async normalizeLines(context: TenantRuntimeContext, lines: AccountVoucherLineInput[]) {
    if (lines.length < 2) throw new BadRequestException('Accounting voucher needs at least two ledger lines.')
    const normalized = []
    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index]
      const ledgerId = Number(line.ledger_id ?? 0)
      const ledger = await this.database(context)
        .selectFrom('account_ledgers')
        .select('id')
        .where('tenant_id', '=', context.tenant.id)
        .where('id', '=', ledgerId)
        .where('deleted_at', 'is', null)
        .executeTakeFirst()
      if (!ledger) throw new BadRequestException('Every accounting voucher line needs an active ledger.')
      const debit = roundMoney(line.debit_amount)
      const credit = roundMoney(line.credit_amount)
      if (debit < 0 || credit < 0) throw new BadRequestException('Debit and credit amounts cannot be negative.')
      if (debit > 0 && credit > 0) throw new BadRequestException('A voucher line cannot contain both debit and credit.')
      if (debit === 0 && credit === 0) throw new BadRequestException('Every voucher line needs a debit or credit amount.')
      normalized.push({
        ledger_id: ledgerId,
        debit_amount: debit,
        credit_amount: credit,
        line_narration: emptyAsNull(line.line_narration),
        bill_reference: emptyAsNull(line.bill_reference),
        sort_order: line.sort_order ?? index + 1,
      })
    }
    return normalized
  }

  private assertBalanced(lines: Array<{ debit_amount: unknown; credit_amount: unknown }>) {
    const debit = roundMoney(lines.reduce((sum, line) => sum + numberValue(line.debit_amount), 0))
    const credit = roundMoney(lines.reduce((sum, line) => sum + numberValue(line.credit_amount), 0))
    if (debit <= 0 || credit <= 0 || debit !== credit) {
      throw new BadRequestException(`Accounting voucher is not balanced. Debit ${debit.toFixed(2)} and credit ${credit.toFixed(2)} must match.`)
    }
  }

  private async insertLines(context: TenantRuntimeContext, voucherId: number, lines: Awaited<ReturnType<AccountsEngineRepository['normalizeLines']>>) {
    for (const line of lines) {
      await this.database(context)
        .insertInto('account_voucher_lines')
        .values({ uuid: dispatchPublicUuid(), voucher_id: voucherId, ...line })
        .execute()
    }
  }

  private async withVoucherLines(context: TenantRuntimeContext, row: Record<string, unknown>) {
    const lines = await this.database(context)
      .selectFrom('account_voucher_lines as line')
      .leftJoin('account_ledgers as ledger', 'ledger.id', 'line.ledger_id')
      .select([
        'line.id',
        'line.uuid',
        'line.voucher_id',
        'line.ledger_id',
        'ledger.name as ledger_name',
        'line.debit_amount',
        'line.credit_amount',
        'line.line_narration',
        'line.bill_reference',
        'line.sort_order',
        'line.created_at',
      ])
      .where('line.voucher_id', '=', Number(row.id))
      .orderBy('line.sort_order', 'asc')
      .orderBy('line.id', 'asc')
      .execute()
    return { ...row, lines } as unknown as AccountVoucher
  }

  private async ensureDefaultGroups(context: TenantRuntimeContext) {
    const { companyId, accountingYearId } = await this.defaultContext(context)
    const createdIds = new Map<string, number>()
    for (const group of defaultGroups) {
      const parentId = group.parentKey ? createdIds.get(group.parentKey) ?? await this.groupIdByKey(context, group.parentKey, companyId, accountingYearId) : null
      const existing = await this.database(context)
        .selectFrom('account_groups')
        .select('id')
        .where('tenant_id', '=', context.tenant.id)
        .where('company_id', '=', companyId)
        .where('accounting_year_id', '=', accountingYearId)
        .where('system_key', '=', group.key)
        .executeTakeFirst()
      if (existing) {
        createdIds.set(group.key, Number(existing.id))
        continue
      }
      const result = await this.database(context)
        .insertInto('account_groups')
        .values({
          uuid: dispatchPublicUuid(),
          tenant_id: context.tenant.id,
          company_id: companyId,
          accounting_year_id: accountingYearId,
          parent_id: parentId,
          path: group.path,
          name: group.name,
          system_key: group.key,
          nature: group.nature,
          normal_balance: group.normalBalance,
          affects_gross_profit: group.affectsGrossProfit ?? false,
          is_system: true,
          is_active: true,
        })
        .executeTakeFirstOrThrow()
      createdIds.set(group.key, Number(result.insertId))
    }
    await this.backfillLedgerGroups(context, companyId, accountingYearId)
  }

  private async backfillLedgerGroups(context: TenantRuntimeContext, companyId: number, accountingYearId: number) {
    const map: Record<string, string> = { cash: 'cash_in_hand', bank: 'bank_accounts', fixed_asset: 'fixed_assets' }
    for (const [accountType, groupKey] of Object.entries(map)) {
      const groupId = await this.groupIdByKey(context, groupKey, companyId, accountingYearId)
      if (!groupId) continue
      await this.database(context)
        .updateTable('account_ledgers')
        .set({
          group_id: groupId,
          ledger_type: accountType === 'fixed_asset' ? 'asset' : accountType,
          normal_balance: 'debit',
        })
        .where('tenant_id', '=', context.tenant.id)
        .where('company_id', '=', companyId)
        .where('accounting_year_id', '=', accountingYearId)
        .where('account_type', '=', accountType)
        .where('group_id', 'is', null)
        .execute()
    }
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

  private async nextVoucherNo(context: TenantRuntimeContext, voucherType: AccountVoucherType) {
    const { companyId, accountingYearId } = await this.defaultContext(context)
    const prefix = voucherType.toUpperCase().replace(/[^A-Z0-9]+/g, '-')
    const row = await this.database(context)
      .selectFrom('account_vouchers')
      .select('id')
      .where('tenant_id', '=', context.tenant.id)
      .where('company_id', '=', companyId)
      .where('accounting_year_id', '=', accountingYearId)
      .where('voucher_type', '=', voucherType)
      .orderBy('id', 'desc')
      .executeTakeFirst()
    return `${prefix}-${String(Number(row?.id ?? 0) + 1).padStart(4, '0')}`
  }

  private async defaultContext(context: TenantRuntimeContext, accountingYearIdInput?: number) {
    const row = await this.database(context).selectFrom('default_companies').select(['company_id', 'accounting_year_id']).where('is_active', '=', true).orderBy('id', 'asc').executeTakeFirst()
    const companyId = Number(row?.company_id ?? 0)
    const accountingYearId = Number(accountingYearIdInput || row?.accounting_year_id || 0)
    if (!companyId || !accountingYearId) throw new BadRequestException('Default company and accounting year are required for Accounts.')
    return { companyId, accountingYearId }
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
}

const defaultGroups: Array<{ key: string; parentKey?: string; path: string; name: string; nature: AccountGroupNature; normalBalance: AccountNormalBalance; affectsGrossProfit?: boolean }> = [
  { key: 'assets', path: 'assets', name: 'Assets', nature: 'asset', normalBalance: 'debit' },
  { key: 'fixed_assets', parentKey: 'assets', path: 'assets/fixed-assets', name: 'Fixed Assets', nature: 'asset', normalBalance: 'debit' },
  { key: 'current_assets', parentKey: 'assets', path: 'assets/current-assets', name: 'Current Assets', nature: 'asset', normalBalance: 'debit' },
  { key: 'bank_accounts', parentKey: 'current_assets', path: 'assets/current-assets/bank-accounts', name: 'Bank Accounts', nature: 'asset', normalBalance: 'debit' },
  { key: 'cash_in_hand', parentKey: 'current_assets', path: 'assets/current-assets/cash-in-hand', name: 'Cash-in-Hand', nature: 'asset', normalBalance: 'debit' },
  { key: 'sundry_debtors', parentKey: 'current_assets', path: 'assets/current-assets/sundry-debtors', name: 'Sundry Debtors', nature: 'asset', normalBalance: 'debit' },
  { key: 'loans_advances_asset', parentKey: 'current_assets', path: 'assets/current-assets/loans-advances', name: 'Loans & Advances (Asset)', nature: 'asset', normalBalance: 'debit' },
  { key: 'deposits', parentKey: 'current_assets', path: 'assets/current-assets/deposits', name: 'Deposits', nature: 'asset', normalBalance: 'debit' },
  { key: 'liabilities', path: 'liabilities', name: 'Liabilities', nature: 'liability', normalBalance: 'credit' },
  { key: 'capital_account', parentKey: 'liabilities', path: 'liabilities/capital-account', name: 'Capital Account', nature: 'equity', normalBalance: 'credit' },
  { key: 'reserves_surplus', parentKey: 'liabilities', path: 'liabilities/reserves-surplus', name: 'Reserves & Surplus', nature: 'equity', normalBalance: 'credit' },
  { key: 'secured_loans', parentKey: 'liabilities', path: 'liabilities/secured-loans', name: 'Secured Loans', nature: 'liability', normalBalance: 'credit' },
  { key: 'unsecured_loans', parentKey: 'liabilities', path: 'liabilities/unsecured-loans', name: 'Unsecured Loans', nature: 'liability', normalBalance: 'credit' },
  { key: 'current_liabilities', parentKey: 'liabilities', path: 'liabilities/current-liabilities', name: 'Current Liabilities', nature: 'liability', normalBalance: 'credit' },
  { key: 'sundry_creditors', parentKey: 'current_liabilities', path: 'liabilities/current-liabilities/sundry-creditors', name: 'Sundry Creditors', nature: 'liability', normalBalance: 'credit' },
  { key: 'duties_taxes', parentKey: 'current_liabilities', path: 'liabilities/current-liabilities/duties-taxes', name: 'Duties & Taxes', nature: 'liability', normalBalance: 'credit' },
  { key: 'provisions', parentKey: 'current_liabilities', path: 'liabilities/current-liabilities/provisions', name: 'Provisions', nature: 'liability', normalBalance: 'credit' },
  { key: 'income', path: 'income', name: 'Income', nature: 'income', normalBalance: 'credit' },
  { key: 'sales_accounts', parentKey: 'income', path: 'income/sales-accounts', name: 'Sales Accounts', nature: 'income', normalBalance: 'credit', affectsGrossProfit: true },
  { key: 'direct_incomes', parentKey: 'income', path: 'income/direct-incomes', name: 'Direct Incomes', nature: 'income', normalBalance: 'credit', affectsGrossProfit: true },
  { key: 'indirect_incomes', parentKey: 'income', path: 'income/indirect-incomes', name: 'Indirect Incomes', nature: 'income', normalBalance: 'credit' },
  { key: 'expenses', path: 'expenses', name: 'Expenses', nature: 'expense', normalBalance: 'debit' },
  { key: 'purchase_accounts', parentKey: 'expenses', path: 'expenses/purchase-accounts', name: 'Purchase Accounts', nature: 'expense', normalBalance: 'debit', affectsGrossProfit: true },
  { key: 'direct_expenses', parentKey: 'expenses', path: 'expenses/direct-expenses', name: 'Direct Expenses', nature: 'expense', normalBalance: 'debit', affectsGrossProfit: true },
  { key: 'indirect_expenses', parentKey: 'expenses', path: 'expenses/indirect-expenses', name: 'Indirect Expenses', nature: 'expense', normalBalance: 'debit' },
  { key: 'suspense_account', path: 'suspense-account', name: 'Suspense Account', nature: 'asset', normalBalance: 'debit' },
]

function normalizeVoucherType(value: unknown): AccountVoucherType {
  const text = String(value ?? 'journal').trim()
  if (['opening', 'contra', 'receipt', 'payment', 'journal', 'sales', 'purchase', 'debit_note', 'credit_note', 'gst_adjustment', 'year_end'].includes(text)) return text as AccountVoucherType
  return 'journal'
}

function normalizeTrialBalanceRow(row: Record<string, unknown>): AccountTrialBalanceRow {
  const debit = numberValue(row.debit_total)
  const credit = numberValue(row.credit_total)
  const net = roundMoney(debit - credit)
  return {
    ledger_id: Number(row.ledger_id),
    ledger_uuid: String(row.ledger_uuid),
    ledger_name: String(row.ledger_name),
    group_name: emptyAsNull(row.group_name),
    nature: emptyAsNull(row.nature) as AccountGroupNature | null,
    debit_amount: net >= 0 ? Math.abs(net) : 0,
    credit_amount: net < 0 ? Math.abs(net) : 0,
  }
}

function summarizeByNature(rows: AccountTrialBalanceRow[], natures: AccountGroupNature[]) {
  const filtered = rows.filter((row) => row.nature && natures.includes(row.nature))
  const totals = filtered.reduce(
    (sum, row) => ({
      debit_amount: roundMoney(sum.debit_amount + row.debit_amount),
      credit_amount: roundMoney(sum.credit_amount + row.credit_amount),
    }),
    { debit_amount: 0, credit_amount: 0 },
  )
  return { rows: filtered, totals }
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
