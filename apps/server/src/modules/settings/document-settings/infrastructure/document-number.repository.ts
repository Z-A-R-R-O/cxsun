import { Inject } from '../../../../core/decorators/inject.js'
import { Injectable } from '../../../../core/decorators/injectable.js'
import { BadRequestException } from '../../../../core/exceptions/http.exception.js'
import { TenantContextService, type TenantRequestHeaders, type TenantRuntimeContext } from '../../../../core/tenant/tenant-context.service.js'
import { dispatchPublicUuid } from '../../../../shared/helpers/public-uuid.js'
import { documentEntryKinds, type DocumentEntryKind, type DocumentNumberContext, type DocumentNumberSettingInput, type DocumentNumberSettingRecord } from '../domain/document-number-record.js'

@Injectable()
export class DocumentNumberRepository {
  constructor(@Inject(TenantContextService) private readonly tenantContext: TenantContextService) {}

  async list(headers: TenantRequestHeaders, contextInput: DocumentNumberContext) {
    const context = await this.tenantContext.resolve(headers, 'company.manage')
    const resolved = await resolveDocumentContext(context, contextInput)
    const records = await Promise.all(documentEntryKinds.map((kind) => this.getOrCreateSetting(context, kind, resolved)))
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
    return this.getOrCreateSetting(context, normalizeKind(kind), await resolveDocumentContext(context, contextInput))
  }

  private async updateOne(context: TenantRuntimeContext, kind: DocumentEntryKind, docContext: Required<DocumentNumberContext>, input: DocumentNumberSettingInput) {
    const current = await this.getOrCreateSetting(context, kind, docContext)
    await context.database
      .updateTable('document_number_settings')
      .set({
        prefix: cleanPrefix(input.prefix ?? current.prefix),
        separator: cleanSeparator(input.separator ?? current.separator),
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
          separator: '-',
          next_number: 1,
          padding: 4,
          auto_enabled: true,
        })
        .execute()
    } catch {
      // A concurrent first request may have created this row.
    }
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
  return {
    id: String(row.id),
    accountingYearId: context.accountingYearId,
    autoEnabled: Boolean(row.auto_enabled),
    companyId: context.companyId,
    kind,
    nextNumber,
    padding,
    prefix,
    preview: formatDocumentNumber(prefix, separator, nextNumber, padding),
    separator,
    updatedAt: row.updated_at instanceof Date ? row.updated_at : new Date(String(row.updated_at)),
  }
}

export function formatDocumentNumber(prefix: string, separator: string, nextNumber: number, padding: number) {
  const serial = String(nextNumber).padStart(padding, '0')
  return [prefix.trim(), serial].filter(Boolean).join(separator)
}

function normalizeKind(value: string): DocumentEntryKind {
  if (documentEntryKinds.includes(value as DocumentEntryKind)) return value as DocumentEntryKind
  throw new BadRequestException(`Unsupported document kind "${value}".`)
}

function defaultPrefix(kind: DocumentEntryKind) {
  return { payment: 'PAY', purchase: 'PUR', receipt: 'REC', sales: 'SAL' }[kind]
}

function cleanPrefix(value: string | null | undefined) {
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

function kindOrder(kind: DocumentEntryKind) {
  return documentEntryKinds.indexOf(kind)
}

