import { type Kysely } from 'kysely'
import { Inject } from '../../../../core/decorators/inject.js'
import { Injectable } from '../../../../core/decorators/injectable.js'
import { BadRequestException } from '../../../../core/exceptions/http.exception.js'
import { TenantContextService, type TenantRequestHeaders, type TenantRuntimeContext } from '../../../../core/tenant/tenant-context.service.js'
import { dispatchPublicUuid } from '../../../../shared/helpers/public-uuid.js'
import { documentEntryKinds, type DocumentEntryKind, type DocumentNumberContext, type DocumentNumberSettingInput, type DocumentNumberSettingRecord } from '../domain/document-number-record.js'

type DynamicDatabase = Record<string, Record<string, unknown>>

@Injectable()
export class DocumentNumberRepository {
  constructor(@Inject(() => TenantContextService) private readonly tenantContext: TenantContextService) {}

  async list(headers: TenantRequestHeaders, contextInput: DocumentNumberContext) {
    const context = await this.tenantContext.resolve(headers, 'company.manage')
    const resolved = await resolveDocumentContext(context, contextInput)
    const records = await Promise.all(documentEntryKinds.map((kind) => this.getSyncedSetting(context, kind, resolved)))
    return records
  }

  async updateMany(headers: TenantRequestHeaders, contextInput: DocumentNumberContext, inputs: readonly DocumentNumberSettingInput[]) {
    const context = await this.tenantContext.resolve(headers, 'company.manage')
    const resolved = await resolveDocumentContext(context, contextInput)
    const updated = await Promise.all(inputs.map((input) => this.updateOne(context, normalizeKind(input.kind), resolved, input)))
    const updatedKinds = new Set(updated.map((record) => record.kind))
    const remaining = await Promise.all(documentEntryKinds.filter((kind) => !updatedKinds.has(kind)).map((kind) => this.getOrCreateSetting(context, kind, resolved)))
    return [...updated, ...remaining].sort((left, right) => kindOrder(left.kind) - kindOrder(right.kind))
  }

  async nextPreview(headers: TenantRequestHeaders, kind: string, contextInput: DocumentNumberContext) {
    const context = await this.tenantContext.resolve(headers, 'company.manage')
    return this.getSyncedSetting(context, normalizeKind(kind), await resolveDocumentContext(context, contextInput))
  }

  private async updateOne(context: TenantRuntimeContext, kind: DocumentEntryKind, docContext: Required<DocumentNumberContext>, input: DocumentNumberSettingInput) {
    const current = await this.getOrCreateSetting(context, kind, docContext)
    await context.database
      .updateTable('document_number_settings')
      .set({
        prefix: cleanPrefix(input.prefix ?? current.prefix),
        prefix_enabled: booleanInput(input.prefixEnabled, current.prefixEnabled),
        separator: cleanSeparator(input.separator ?? current.separator),
        separator_enabled: booleanInput(input.separatorEnabled, current.separatorEnabled),
        suffix: cleanSuffix(input.suffix ?? current.suffix),
        suffix_enabled: booleanInput(input.suffixEnabled, current.suffixEnabled),
        next_number: clampInteger(input.nextNumber ?? current.nextNumber, 1, 999_999_999),
        padding: clampInteger(input.padding ?? current.padding, 1, 12),
        auto_enabled: Boolean(input.autoEnabled ?? current.autoEnabled),
        updated_at: new Date(),
      })
      .where('id', '=', Number(current.id))
      .execute()

    return this.getOrCreateSetting(context, kind, docContext)
  }

  private async getOrCreateSetting(context: TenantRuntimeContext, kind: DocumentEntryKind, docContext: Required<DocumentNumberContext>) {
    await this.ensureSetting(context, kind, docContext)
    const row = await context.database
      .selectFrom('document_number_settings')
      .selectAll()
      .where('company_id', '=', Number(docContext.companyId))
      .where('accounting_year_id', '=', Number(docContext.accountingYearId))
      .where('entry_kind', '=', kind)
      .executeTakeFirstOrThrow()

    return toRecord(row, docContext)
  }

  private async ensureSetting(context: TenantRuntimeContext, kind: DocumentEntryKind, docContext: Required<DocumentNumberContext>) {
    const existing = await context.database
      .selectFrom('document_number_settings')
      .select('id')
      .where('company_id', '=', Number(docContext.companyId))
      .where('accounting_year_id', '=', Number(docContext.accountingYearId))
      .where('entry_kind', '=', kind)
      .executeTakeFirst()

    if (existing) return

    try {
      await context.database
        .insertInto('document_number_settings')
        .values({
          uuid: dispatchPublicUuid(),
          company_id: Number(docContext.companyId),
          accounting_year_id: Number(docContext.accountingYearId),
          entry_kind: kind,
          prefix: defaultPrefix(kind),
          prefix_enabled: true,
          separator: '-',
          separator_enabled: true,
          suffix: '',
          suffix_enabled: false,
          next_number: 1,
          padding: 4,
          auto_enabled: true,
        })
        .execute()
    } catch {
      // A concurrent first request may have created this row.
    }
  }

  async consumeNext(context: TenantRuntimeContext, kind: DocumentEntryKind, contextInput: DocumentNumberContext) {
    const docContext = await resolveDocumentContext(context, contextInput)
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const current = await this.getOrCreateSetting(context, kind, docContext)

      if (!current.autoEnabled) {
        return ''
      }

      const result = await context.database
        .updateTable('document_number_settings')
        .set({
          next_number: current.nextNumber + 1,
          updated_at: new Date(),
        })
        .where('id', '=', Number(current.id))
        .where('next_number', '=', current.nextNumber)
        .executeTakeFirst()

      if (Number(result.numUpdatedRows ?? 0) > 0) {
        return current.preview
      }
    }

    throw new BadRequestException('Document number could not be reserved. Please try saving again.')
  }

  async previewNext(context: TenantRuntimeContext, kind: DocumentEntryKind, contextInput: DocumentNumberContext) {
    return this.getSyncedSetting(context, kind, await resolveDocumentContext(context, contextInput))
  }

  async advancePast(context: TenantRuntimeContext, kind: DocumentEntryKind, contextInput: DocumentNumberContext, documentNumber: string) {
    const docContext = await resolveDocumentContext(context, contextInput)
    const current = await this.getOrCreateSetting(context, kind, docContext)
    const usedNumber = parseUsedDocumentNumber(documentNumber, current)
    if (!Number.isInteger(usedNumber) || usedNumber < current.nextNumber) return current

    await context.database
      .updateTable('document_number_settings')
      .set({
        next_number: usedNumber + 1,
        updated_at: new Date(),
      })
      .where('id', '=', Number(current.id))
      .where('next_number', '<=', usedNumber)
      .execute()

    return this.getSyncedSetting(context, kind, docContext)
  }

  private async getSyncedSetting(context: TenantRuntimeContext, kind: DocumentEntryKind, docContext: Required<DocumentNumberContext>) {
    const current = await this.getOrCreateSetting(context, kind, docContext)
    const maxUsedNumber = await this.maxUsedDocumentSerial(context, kind, docContext, current)
    if (maxUsedNumber < current.nextNumber) return current

    await context.database
      .updateTable('document_number_settings')
      .set({
        next_number: maxUsedNumber + 1,
        updated_at: new Date(),
      })
      .where('id', '=', Number(current.id))
      .where('next_number', '<=', maxUsedNumber)
      .execute()

    return this.getOrCreateSetting(context, kind, docContext)
  }

  private async maxUsedDocumentSerial(context: TenantRuntimeContext, kind: DocumentEntryKind, docContext: Required<DocumentNumberContext>, setting: DocumentNumberSettingRecord) {
    const numbers = await this.usedDocumentNumbers(context, kind, docContext)
    return numbers.reduce((max: number, documentNumber: string) => Math.max(max, parseUsedDocumentNumber(documentNumber, setting)), 0)
  }

  private async usedDocumentNumbers(context: TenantRuntimeContext, kind: DocumentEntryKind, docContext: Required<DocumentNumberContext>) {
    const companyId = Number(docContext.companyId)
    const accountingYearId = Number(docContext.accountingYearId)

    if (kind === 'sales') {
      const rows = await this.database(context)
        .selectFrom('sales_entries')
        .select('invoice_no')
        .where('company_id', '=', companyId)
        .where('accounting_year_id', '=', accountingYearId)
        .execute()
      return rows.map((row: Record<string, unknown>) => String(row.invoice_no ?? ''))
    }

    if (kind === 'exportSales') {
      const rows = await this.database(context)
        .selectFrom('export_sales_entries')
        .select('invoice_no')
        .where('company_id', '=', companyId)
        .where('accounting_year_id', '=', accountingYearId)
        .execute()
      return rows.map((row: Record<string, unknown>) => String(row.invoice_no ?? ''))
    }

    if (kind === 'purchase') {
      const rows = await this.database(context)
        .selectFrom('purchase_entries')
        .select('entry_no')
        .where('company_id', '=', companyId)
        .where('accounting_year_id', '=', accountingYearId)
        .execute()
      return rows.map((row: Record<string, unknown>) => String(row.entry_no ?? ''))
    }

    if (kind === 'receipt') {
      const rows = await this.database(context)
        .selectFrom('receipt_entries')
        .select('receipt_no')
        .where('company_id', '=', companyId)
        .where('accounting_year_id', '=', accountingYearId)
        .execute()
      return rows.map((row: Record<string, unknown>) => String(row.receipt_no ?? ''))
    }

    if (kind === 'payment') {
      const rows = await this.database(context)
        .selectFrom('payment_entries')
        .select('payment_no')
        .where('company_id', '=', companyId)
        .where('accounting_year_id', '=', accountingYearId)
        .execute()
      return rows.map((row: Record<string, unknown>) => String(row.payment_no ?? ''))
    }

    if (kind === 'cashBook') {
      const rows = await this.database(context)
        .selectFrom('cash_books')
        .select('voucher_no')
        .where('company_id', '=', companyId)
        .where('accounting_year_id', '=', accountingYearId)
        .execute()
      return rows.map((row: Record<string, unknown>) => String(row.voucher_no ?? ''))
    }

    if (kind === 'bankBook') {
      const rows = await this.database(context)
        .selectFrom('bank_books')
        .select('voucher_no')
        .where('company_id', '=', companyId)
        .where('accounting_year_id', '=', accountingYearId)
        .execute()
      return rows.map((row: Record<string, unknown>) => String(row.voucher_no ?? ''))
    }

    if (kind === 'journal' || kind === 'contra') {
      const rows = await this.database(context)
        .selectFrom('account_vouchers')
        .select('voucher_no')
        .where('company_id', '=', companyId)
        .where('accounting_year_id', '=', accountingYearId)
        .where('voucher_type', '=', kind)
        .execute()
      return rows.map((row: Record<string, unknown>) => String(row.voucher_no ?? ''))
    }

    return []
  }

  private database(context: TenantRuntimeContext) {
    return context.database as unknown as Kysely<DynamicDatabase>
  }
}

async function resolveDocumentContext(context: TenantRuntimeContext, input: DocumentNumberContext): Promise<Required<DocumentNumberContext>> {
  const companyId = Number(input.companyId)
  const accountingYearId = Number(input.accountingYearId)
  if (Number.isInteger(companyId) && companyId > 0 && Number.isInteger(accountingYearId) && accountingYearId > 0) {
    return { companyId: String(companyId), accountingYearId: String(accountingYearId) }
  }

  const defaultRow = await context.database
    .selectFrom('default_companies')
    .select(['company_id', 'accounting_year_id'])
    .where('is_active', '=', true)
    .orderBy('id', 'asc')
    .executeTakeFirst()

  if (defaultRow) {
    return { companyId: String(defaultRow.company_id), accountingYearId: String(defaultRow.accounting_year_id) }
  }

  const primaryCompany = await context.database
    .selectFrom('companies')
    .select('id')
    .where('tenant_id', '=', context.tenant.id)
    .where('is_primary', '=', true)
    .executeTakeFirst()
  const activeYear = await context.database
    .selectFrom('accounting_years')
    .select('id')
    .where('deleted_at', 'is', null)
    .where('is_active', '=', true)
    .orderBy('start_date', 'desc')
    .executeTakeFirst()

  if (primaryCompany && activeYear) {
    return { companyId: String(primaryCompany.id), accountingYearId: String(activeYear.id) }
  }

  const company = await context.database.selectFrom('companies').select('id').where('deleted_at', 'is', null).orderBy('id', 'asc').executeTakeFirst()
  const year = await context.database.selectFrom('accounting_years').select('id').where('deleted_at', 'is', null).orderBy('is_active', 'desc').orderBy('id', 'desc').executeTakeFirst()
  if (!company || !year) throw new BadRequestException('Company and accounting year context are required.')
  return { companyId: String(company.id), accountingYearId: String(year.id) }
}

function toRecord(row: Record<string, unknown>, context: Required<DocumentNumberContext>): DocumentNumberSettingRecord {
  const kind = normalizeKind(String(row.entry_kind))
  const nextNumber = Number(row.next_number ?? 1)
  const padding = Number(row.padding ?? 4)
  const prefix = String(row.prefix ?? defaultPrefix(kind))
  const separator = String(row.separator ?? '-')
  const suffix = String(row.suffix ?? '')
  const prefixEnabled = booleanValue(row.prefix_enabled)
  const separatorEnabled = booleanValue(row.separator_enabled)
  const suffixEnabled = booleanValue(row.suffix_enabled)
  return {
    id: String(row.id),
    accountingYearId: context.accountingYearId,
    autoEnabled: Boolean(row.auto_enabled),
    companyId: context.companyId,
    kind,
    nextNumber,
    padding,
    prefix,
    prefixEnabled,
    preview: formatDocumentNumber({ prefix, prefixEnabled, separator, separatorEnabled, suffix, suffixEnabled, nextNumber, padding }),
    separator,
    separatorEnabled,
    suffix,
    suffixEnabled,
    updatedAt: row.updated_at instanceof Date ? row.updated_at : new Date(String(row.updated_at)),
  }
}

export function formatDocumentNumber(input: {
  nextNumber: number
  padding: number
  prefix: string
  prefixEnabled: boolean
  separator: string
  separatorEnabled: boolean
  suffix: string
  suffixEnabled: boolean
}) {
  const serial = String(input.nextNumber).padStart(input.padding, '0')
  const prefix = input.prefixEnabled ? input.prefix.trim() : ''
  const suffix = input.suffixEnabled ? input.suffix.trim() : ''
  const separator = input.separatorEnabled ? input.separator : ''
  return [prefix, serial, suffix].filter(Boolean).join(separator)
}

function normalizeKind(value: string): DocumentEntryKind {
  if (documentEntryKinds.includes(value as DocumentEntryKind)) return value as DocumentEntryKind
  throw new BadRequestException(`Unsupported document kind "${value}".`)
}

function defaultPrefix(kind: DocumentEntryKind) {
  return { bankBook: 'BB', cashBook: 'CB', contra: 'CON', deliveryNote: 'DNT', exportSales: 'EXP', journal: 'JRN', payment: 'PAY', purchase: 'PUR', purchaseReceipt: 'PRC', receipt: 'REC', sales: 'SAL' }[kind]
}

function cleanPrefix(value: string | null | undefined) {
  return value?.trim().toUpperCase() ?? ''
}

function cleanSuffix(value: string | null | undefined) {
  return value?.trim().toUpperCase() ?? ''
}

function cleanSeparator(value: string | null | undefined) {
  const trimmed = value?.trim() ?? '-'
  return trimmed.slice(0, 3) || '-'
}

function clampInteger(value: number | string | null | undefined, min: number, max: number) {
  const numericValue = Number(value)
  if (!Number.isInteger(numericValue)) return min
  return Math.min(max, Math.max(min, numericValue))
}

function booleanInput(value: boolean | number | null | undefined, fallback: boolean) {
  if (value === null || value === undefined) return fallback
  return value === true || value === 1
}

function booleanValue(value: unknown) {
  return value === true || value === 1 || value === '1'
}

function kindOrder(kind: DocumentEntryKind) {
  return documentEntryKinds.indexOf(kind)
}

function parseUsedDocumentNumber(documentNumber: string, setting: DocumentNumberSettingRecord) {
  const trimmed = documentNumber.trim()
  if (!trimmed) return 0

  if (setting.separatorEnabled && setting.separator) {
    const parts = trimmed.split(setting.separator)
    const expectedPrefix = setting.prefixEnabled ? setting.prefix.trim() : ''
    const expectedSuffix = setting.suffixEnabled ? setting.suffix.trim() : ''
    if (expectedPrefix && parts[0] === expectedPrefix) parts.shift()
    if (expectedSuffix && parts[parts.length - 1] === expectedSuffix) parts.pop()
    const serial = parts.find((part) => /^\d+$/.test(part.trim()))
    return serial ? Number(serial) : 0
  }

  let value = trimmed
  const prefix = setting.prefixEnabled ? setting.prefix.trim() : ''
  const suffix = setting.suffixEnabled ? setting.suffix.trim() : ''
  if (prefix && value.startsWith(prefix)) value = value.slice(prefix.length)
  if (suffix && value.endsWith(suffix)) value = value.slice(0, -suffix.length)
  const match = value.match(/\d+/)
  return match ? Number(match[0]) : 0
}
