import { sql } from 'kysely'
import { Injectable } from '../../../../core/decorators/injectable.js'
import { getDatabase } from '../../../../infrastructure/database/connection.js'
import { syncTenantCompanyMetrics } from '../../../../infrastructure/tenant-database/tenant-database.connection.js'
import { dispatchPublicUuid } from '../../../../shared/helpers/public-uuid.js'
import type { TenantRuntimeContext } from '../../../../core/tenant/tenant-context.service.js'
import type { Company, CompanyStatus } from '../domain/company.types.js'
import type { NormalizedCompanyData } from '../domain/company.aggregate.js'

@Injectable()
export class CompanyRepository {
  async defaultContext(context: TenantRuntimeContext) {
    const row = await context.database
      .selectFrom('default_companies as defaults')
      .innerJoin('companies as company', 'company.id', 'defaults.company_id')
      .innerJoin('accounting_years as year', 'year.id', 'defaults.accounting_year_id')
      .select([
        'defaults.id as id',
        'defaults.company_id as company_id',
        'defaults.accounting_year_id as accounting_year_id',
        'defaults.landing_app as landing_app',
        'company.name as company_name',
        'company.code as company_code',
        'year.name as accounting_year_name',
        'year.start_date as accounting_year_start_date',
        'year.end_date as accounting_year_end_date',
      ])
      .where('defaults.is_active', '=', true)
      .orderBy('defaults.id', 'asc')
      .executeTakeFirst()

    if (!row) {
      return null
    }

    const logos = await context.database
      .selectFrom('company_logos')
      .selectAll()
      .where('company_id', '=', Number(row.company_id))
      .where('is_active', '=', true)
      .execute()

    return {
      id: Number(row.id),
      companyId: Number(row.company_id),
      companyName: String(row.company_name ?? ''),
      companyCode: String(row.company_code ?? ''),
      logos: logos.map((logo) => ({
        id: logo.id,
        uuid: logo.uuid,
        logoUrl: logo.logo_url,
        logoType: logo.logo_type,
        isActive: booleanValue(logo.is_active),
      })),
      accountingYearId: Number(row.accounting_year_id),
      accountingYearName: String(row.accounting_year_name ?? ''),
      accountingYearStartDate: dateOrNull(row.accounting_year_start_date),
      accountingYearEndDate: dateOrNull(row.accounting_year_end_date),
      landingApp: String(row.landing_app ?? 'application'),
    }
  }

  async setDefaultContext(context: TenantRuntimeContext, input: { companyId: number; accountingYearId: number; landingApp?: string }) {
    const [company, year] = await Promise.all([
      context.database.selectFrom('companies').select(['id', 'industry_id']).where('id', '=', input.companyId).where('deleted_at', 'is', null).executeTakeFirst(),
      context.database.selectFrom('accounting_years').select('id').where('id', '=', input.accountingYearId).where('deleted_at', 'is', null).executeTakeFirst(),
    ])

    if (!company || !year) {
      return null
    }

    await context.database
      .updateTable('companies')
      .set({
        is_primary: false,
        updated_at: new Date(),
      })
      .where('deleted_at', 'is', null)
      .execute()

    await context.database
      .updateTable('companies')
      .set({
        is_primary: true,
        updated_at: new Date(),
      })
      .where('id', '=', input.companyId)
      .execute()

    const existing = await context.database
      .selectFrom('default_companies')
      .select(['id', 'landing_app'])
      .orderBy('id', 'asc')
      .executeTakeFirst()
    const nextLandingApp = normalizeLandingApp(input.landingApp, existing?.landing_app)

    if (existing) {
      await context.database
        .updateTable('default_companies')
        .set({
          tenant_id: context.tenant.id,
          industry_id: Number(company.industry_id ?? 0),
          company_id: input.companyId,
          accounting_year_id: input.accountingYearId,
          landing_app: nextLandingApp,
          is_active: true,
          updated_at: new Date(),
        })
        .where('id', '=', existing.id)
        .execute()
    } else {
      await context.database
        .insertInto('default_companies')
        .values({
          tenant_id: context.tenant.id,
          uuid: nextPublicUuid(),
          industry_id: Number(company.industry_id ?? 0),
          company_id: input.companyId,
          accounting_year_id: input.accountingYearId,
          landing_app: nextLandingApp,
          is_active: true,
        })
        .execute()
    }

    return this.defaultContext(context)
  }

  async list(context: TenantRuntimeContext): Promise<Company[]> {
    const rows = await context.database
      .selectFrom('companies')
      .selectAll()
      .orderBy('updated_at', 'desc')
      .execute()

    return Promise.all(rows.map((row) => this.hydrate(context, row)))
  }

  async findById(context: TenantRuntimeContext, id: number): Promise<Company | undefined> {
    const row = await context.database
      .selectFrom('companies')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst()

    if (!row) {
      return undefined
    }

    return this.hydrate(context, row)
  }

  async insert(context: TenantRuntimeContext, data: NormalizedCompanyData): Promise<Company> {
    const result = await context.database
      .insertInto('companies')
      .values({
        ...toCompanyRow(context, data),
        uuid: nextPublicUuid(),
        deleted_at: data.is_active ? null : new Date(),
      })
      .executeTakeFirst()

    const id = Number(result.insertId)
    await this.replaceChildren(context, id, data)

    const company = await this.findById(context, id)
    if (!company) {
      throw new Error('Company insert did not return a persisted company.')
    }

    await syncTenantCompanyMetrics(context.tenant)
    return company
  }

  async update(context: TenantRuntimeContext, id: number, data: NormalizedCompanyData): Promise<Company> {
    await context.database
      .updateTable('companies')
      .set({
        ...toCompanyRow(context, data),
        updated_at: new Date(),
        deleted_at: data.is_active ? null : new Date(),
      })
      .where('id', '=', id)
      .execute()

    await context.database
      .updateTable('default_companies')
      .set({
        industry_id: data.industry_id,
        updated_at: new Date(),
      })
      .where('company_id', '=', id)
      .execute()

    await this.replaceChildren(context, id, data)

    const company = await this.findById(context, id)
    if (!company) {
      throw new Error('Company update did not return a persisted company.')
    }

    await syncTenantCompanyMetrics(context.tenant)
    return company
  }

  async softDelete(context: TenantRuntimeContext, id: number): Promise<boolean> {
    const result = await sql`
      UPDATE companies
      SET status = 'suspend', is_active = 0, deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = ${id}
    `.execute(context.database)

    const changed = affectedRows(result) > 0
    if (changed) {
      await syncTenantCompanyMetrics(context.tenant)
    }

    return changed
  }

  async restore(context: TenantRuntimeContext, id: number): Promise<boolean> {
    const result = await sql`
      UPDATE companies
      SET status = 'active', is_active = 1, deleted_at = NULL, updated_at = CURRENT_TIMESTAMP
      WHERE id = ${id}
    `.execute(context.database)

    const changed = affectedRows(result) > 0
    if (changed) {
      await syncTenantCompanyMetrics(context.tenant)
    }

    return changed
  }

  private async hydrate(context: TenantRuntimeContext, row: Record<string, unknown>): Promise<Company> {
    const id = Number(row.id)
    const [
      logos,
      addresses,
      emails,
      phones,
      socialLinks,
      bankAccounts,
    ] = await Promise.all([
      context.database.selectFrom('company_logos').selectAll().where('company_id', '=', id).execute(),
      context.database.selectFrom('address_book').selectAll().where('owner_type', '=', 'company').where('owner_id', '=', id).execute(),
      context.database.selectFrom('company_emails').selectAll().where('company_id', '=', id).execute(),
      context.database.selectFrom('company_phones').selectAll().where('company_id', '=', id).execute(),
      context.database.selectFrom('company_social_links').selectAll().where('company_id', '=', id).execute(),
      context.database.selectFrom('company_bank_accounts').selectAll().where('company_id', '=', id).execute(),
    ])

    const isSuperAdmin = context.user.role === 'super-admin'
    const industryId = Number(row.industry_id ?? 0)
    const industry = industryId > 0
      ? await getDatabase()
        .selectFrom('industries')
        .select(['code', 'name'])
        .where('id', '=', industryId)
        .executeTakeFirst()
      : undefined

    return {
      id,
      uuid: String(row.uuid),
      tenantId: isSuperAdmin ? Number(row.tenant_id ?? context.tenant.id) : null,
      tenantName: context.tenant.name,
      industryId: industryId || null,
      industryCode: industry?.code ?? null,
      industryName: industry?.name ?? 'Not classified',
      code: String(row.code ?? ''),
      name: String(row.name ?? ''),
      legalName: stringOrNull(row.legal_name),
      tagline: stringOrNull(row.tagline),
      shortAbout: stringOrNull(row.short_about),
      gstinUin: stringOrNull(row.gstin_uin),
      pan: stringOrNull(row.pan),
      dateOfIncorporation: dateOrNull(row.date_of_incorporation),
      msmeNo: stringOrNull(row.msme_no),
      msmeCategory: stringOrNull(row.msme_category),
      tan: stringOrNull(row.tan),
      tdsAvailable: booleanValue(row.tds_available),
      tdsSection: stringOrNull(row.tds_section),
      tdsRatePercent: numberOrNull(row.tds_rate_percent),
      tcsAvailable: booleanValue(row.tcs_available),
      tcsSection: stringOrNull(row.tcs_section),
      tcsRatePercent: numberOrNull(row.tcs_rate_percent),
      website: stringOrNull(row.website),
      description: stringOrNull(row.description),
      primaryEmail: stringOrNull(row.primary_email),
      primaryPhone: stringOrNull(row.primary_phone),
      isPrimary: booleanValue(row.is_primary),
      isActive: booleanValue(row.is_active) && normalizeStatus(row.status) !== 'suspend',
      status: normalizeStatus(row.status),
      settings: parseJsonObject(row.settings),
      features: parseJsonArray(row.features),
      logos: logos.map((logo) => ({
        id: logo.id,
        uuid: logo.uuid,
        logoUrl: logo.logo_url,
        logoType: logo.logo_type,
        isActive: booleanValue(logo.is_active),
      })),
      addresses: addresses.map((address) => ({
        id: address.id,
        uuid: address.uuid,
        addressTypeId: stringOrNull(address.address_type_id),
        addressLine1: address.address_line1,
        addressLine2: stringOrNull(address.address_line2),
        cityId: stringOrNull(address.city_id),
        districtId: stringOrNull(address.district_id),
        stateId: stringOrNull(address.state_id),
        countryId: stringOrNull(address.country_id),
        pincodeId: stringOrNull(address.pincode_id),
        latitude: numberOrNull(address.latitude),
        longitude: numberOrNull(address.longitude),
        isDefault: booleanValue(address.is_default),
        isActive: booleanValue(address.is_active),
      })),
      emails: emails.map((email) => ({
        id: email.id,
        uuid: email.uuid,
        email: email.email,
        emailType: email.email_type,
        isActive: booleanValue(email.is_active),
      })),
      phones: phones.map((phone) => ({
        id: phone.id,
        uuid: phone.uuid,
        phoneNumber: phone.phone_number,
        phoneType: phone.phone_type,
        isPrimary: booleanValue(phone.is_primary),
        isActive: booleanValue(phone.is_active),
      })),
      socialLinks: socialLinks.map((link) => ({
        id: link.id,
        uuid: link.uuid,
        platform: link.platform,
        url: link.url,
        isActive: booleanValue(link.is_active),
      })),
      bankAccounts: bankAccounts.map((bank) => ({
        id: bank.id,
        uuid: bank.uuid,
        bankName: bank.bank_name,
        accountNumber: bank.account_number,
        accountHolderName: bank.account_holder_name,
        ifsc: bank.ifsc,
        branch: stringOrNull(bank.branch),
        qrImageUrl: stringOrNull(bank.qr_image_url),
        isPrimary: booleanValue(bank.is_primary),
        isActive: booleanValue(bank.is_active),
      })),
      createdAt: dateOrNull(row.created_at),
      updatedAt: dateOrNull(row.updated_at),
      deletedAt: dateOrNull(row.deleted_at),
    }
  }

  private async replaceChildren(context: TenantRuntimeContext, companyId: number, data: NormalizedCompanyData) {
    await context.database.deleteFrom('company_logos').where('company_id', '=', companyId).execute()
    await context.database.deleteFrom('address_book').where('owner_type', '=', 'company').where('owner_id', '=', companyId).execute()
    await context.database.deleteFrom('company_emails').where('company_id', '=', companyId).execute()
    await context.database.deleteFrom('company_phones').where('company_id', '=', companyId).execute()
    await context.database.deleteFrom('company_social_links').where('company_id', '=', companyId).execute()
    await context.database.deleteFrom('company_bank_accounts').where('company_id', '=', companyId).execute()

    if (data.logos.length) {
      await context.database.insertInto('company_logos').values(data.logos.map((logo) => ({
        uuid: nextPublicUuid(),
        company_id: companyId,
        logo_url: logo.logoUrl,
        logo_type: logo.logoType,
        is_active: logo.isActive,
      }))).execute()
    }

    if (data.addresses.length) {
      await context.database.insertInto('address_book').values(data.addresses.map((address) => ({
        uuid: nextPublicUuid(),
        owner_type: 'company',
        owner_id: companyId,
        address_type_id: address.addressTypeId,
        address_line1: address.addressLine1,
        address_line2: address.addressLine2,
        city_id: address.cityId,
        district_id: address.districtId,
        state_id: address.stateId,
        country_id: address.countryId,
        pincode_id: address.pincodeId,
        latitude: address.latitude,
        longitude: address.longitude,
        is_default: address.isDefault,
        is_active: address.isActive,
      }))).execute()
    }

    if (data.emails.length) {
      await context.database.insertInto('company_emails').values(data.emails.map((email) => ({
        uuid: nextPublicUuid(),
        company_id: companyId,
        email: email.email,
        email_type: email.emailType,
        is_active: email.isActive,
      }))).execute()
    }

    if (data.phones.length) {
      await context.database.insertInto('company_phones').values(data.phones.map((phone) => ({
        uuid: nextPublicUuid(),
        company_id: companyId,
        phone_number: phone.phoneNumber,
        phone_type: phone.phoneType,
        is_primary: phone.isPrimary,
        is_active: phone.isActive,
      }))).execute()
    }

    if (data.socialLinks.length) {
      await context.database.insertInto('company_social_links').values(data.socialLinks.map((link) => ({
        uuid: nextPublicUuid(),
        company_id: companyId,
        platform: link.platform,
        url: link.url,
        is_active: link.isActive,
      }))).execute()
    }

    if (data.bankAccounts.length) {
      await context.database.insertInto('company_bank_accounts').values(data.bankAccounts.map((bank) => ({
        uuid: nextPublicUuid(),
        company_id: companyId,
        bank_name: bank.bankName,
        account_number: bank.accountNumber,
        account_holder_name: bank.accountHolderName,
        ifsc: bank.ifsc,
        branch: bank.branch,
        qr_image_url: bank.qrImageUrl,
        is_primary: bank.isPrimary,
        is_active: bank.isActive,
      }))).execute()
    }
  }
}

function toCompanyRow(context: TenantRuntimeContext, data: NormalizedCompanyData) {
  return {
    tenant_id: context.tenant.id,
    industry_id: data.industry_id,
    code: data.code,
    name: data.name,
    legal_name: data.legal_name,
    tagline: data.tagline,
    short_about: data.short_about,
    gstin_uin: data.gstin_uin,
    pan: data.pan,
    date_of_incorporation: data.date_of_incorporation,
    msme_no: data.msme_no,
    msme_category: data.msme_category,
    tan: data.tan,
    tds_available: data.tds_available,
    tds_section: data.tds_section,
    tds_rate_percent: data.tds_rate_percent,
    tcs_available: data.tcs_available,
    tcs_section: data.tcs_section,
    tcs_rate_percent: data.tcs_rate_percent,
    website: data.website,
    description: data.description,
    primary_email: data.primary_email,
    primary_phone: data.primary_phone,
    is_primary: data.is_primary,
    is_active: data.is_active,
    status: data.is_active ? data.status : 'suspend',
    settings: data.settings,
    features: data.features,
  }
}

function parseJsonObject(value: unknown): Record<string, unknown> {
  try {
    const parsed = JSON.parse(String(value ?? '{}')) as unknown
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : {}
  } catch {
    return {}
  }
}

function parseJsonArray(value: unknown): string[] {
  try {
    const parsed = JSON.parse(String(value ?? '[]')) as unknown
    return Array.isArray(parsed) ? parsed.map(String) : []
  } catch {
    return []
  }
}

function normalizeStatus(value: unknown): CompanyStatus {
  return value === 'active' || value === 'not_active' || value === 'suspend' ? value : 'not_active'
}

function stringOrNull(value: unknown) {
  const text = String(value ?? '').trim()
  return text || null
}

function dateOrNull(value: unknown) {
  if (!value) return null
  if (value instanceof Date) {
    const time = value.getTime()
    if (Number.isNaN(time)) return null

    const year = value.getFullYear()
    const month = String(value.getMonth() + 1).padStart(2, '0')
    const day = String(value.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }
  return String(value)
}

function numberOrNull(value: unknown) {
  const numberValue = Number(value)
  return Number.isFinite(numberValue) ? numberValue : null
}

function booleanValue(value: unknown) {
  return value === true || value === 1 || value === '1'
}

function affectedRows(result: unknown) {
  return Number((result as { numAffectedRows?: bigint | number }).numAffectedRows ?? 0)
}

function nextPublicUuid() {
  return dispatchPublicUuid()
}

function normalizeLandingApp(value: unknown, fallback = 'application') {
  const text = String(value ?? '').trim()
  return text || fallback
}
