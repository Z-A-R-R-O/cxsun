import { Inject, Injectable, type OnModuleDestroy } from "@nestjs/common";
import { createDatabaseConnection, loadDatabaseEnv, type DatabaseConnection } from "@cxnext/db";
import type {
  CompanyRepository,
  CompanyUpsertParams,
} from "../../application/services/company.repository";
import {
  COMPANY_INDUSTRY_NAME_LOOKUP,
  COMPANY_TENANT_NAME_LOOKUP,
  type CompanyReferenceNameRecord,
  type CompanyReferenceNameLookup,
} from "../../application/services/company-reference-lookup";
import type {
  CompanyAddressRecord,
  CompanyBankAccountRecord,
  CompanyEmailRecord,
  CompanyLogoRecord,
  CompanyPhoneRecord,
  CompanyRecord,
  CompanySocialLinkRecord,
} from "../../domain/company-record";

type DateValue = Date | string;

interface CompanyBaseRow {
  readonly id: number;
  readonly tenant_id: number;
  readonly industry_id: number;
  readonly code: string;
  readonly name: string;
  readonly legal_name: string | null;
  readonly tagline: string | null;
  readonly short_about: string | null;
  readonly gstin_uin: string | null;
  readonly pan: string | null;
  readonly date_of_incorporation: DateValue | null;
  readonly msme_no: string | null;
  readonly msme_category: string | null;
  readonly tan: string | null;
  readonly tds_available: boolean | number;
  readonly tds_section: string | null;
  readonly tds_rate_percent: number | string | null;
  readonly tcs_available: boolean | number;
  readonly tcs_section: string | null;
  readonly tcs_rate_percent: number | string | null;
  readonly website: string | null;
  readonly description: string | null;
  readonly primary_email: string | null;
  readonly primary_phone: string | null;
  readonly is_primary: boolean | number;
  readonly is_active: boolean | number;
  readonly created_at: DateValue;
  readonly updated_at: DateValue;
  readonly deleted_at: DateValue | null;
}

@Injectable()
export class KyselyCompanyRepository implements CompanyRepository, OnModuleDestroy {
  private readonly connection: DatabaseConnection;

  public constructor(
    @Inject(COMPANY_TENANT_NAME_LOOKUP)
    private readonly tenantNameLookup: CompanyReferenceNameLookup,
    @Inject(COMPANY_INDUSTRY_NAME_LOOKUP)
    private readonly industryNameLookup: CompanyReferenceNameLookup,
  ) {
    this.connection = createDatabaseConnection(loadDatabaseEnv().env);
  }

  public async onModuleDestroy(): Promise<void> {
    await this.connection.destroy();
  }

  public async list(): Promise<readonly CompanyRecord[]> {
    const rows = await this.selectCompanyBase()
      .where("companies.deleted_at", "is", null)
      .orderBy("companies.id", "asc")
      .execute();
    const displayNames = await this.loadDisplayNames(rows);

    return Promise.all(rows.map((row) => this.toCompanyRecord(row, displayNames)));
  }

  public async getById(companyId: string): Promise<CompanyRecord | null> {
    const numericCompanyId = Number(companyId);

    if (!Number.isInteger(numericCompanyId)) {
      return null;
    }

    const row = await this.selectCompanyBase()
      .where("companies.id", "=", numericCompanyId)
      .where("companies.deleted_at", "is", null)
      .executeTakeFirst();

    if (!row) {
      return null;
    }

    return this.toCompanyRecord(row, await this.loadDisplayNames([row]));
  }

  public async create(params: CompanyUpsertParams): Promise<CompanyRecord> {
    const now = new Date();
    const result = await this.connection.db
      .insertInto("companies")
      .values(toCompanyValues(params, now))
      .executeTakeFirstOrThrow();
    await this.replaceChildRecords(Number(result.insertId), params, now);
    const company = await this.getById(String(result.insertId));

    if (!company) {
      throw new Error("Company was created but could not be read back.");
    }

    return company;
  }

  public async update(
    companyId: string,
    params: CompanyUpsertParams,
  ): Promise<CompanyRecord | null> {
    const numericCompanyId = Number(companyId);

    if (!Number.isInteger(numericCompanyId)) {
      return null;
    }

    await this.connection.db
      .updateTable("companies")
      .set(toCompanyUpdateValues(params, new Date()))
      .where("id", "=", numericCompanyId)
      .where("deleted_at", "is", null)
      .executeTakeFirst();
    await this.replaceChildRecords(numericCompanyId, params, new Date());

    return this.getById(companyId);
  }

  public async softDelete(companyId: string): Promise<boolean> {
    const numericCompanyId = Number(companyId);

    if (!Number.isInteger(numericCompanyId)) {
      return false;
    }

    const result = await this.connection.db
      .updateTable("companies")
      .set({
        deleted_at: new Date(),
        updated_at: new Date(),
      })
      .where("id", "=", numericCompanyId)
      .where("deleted_at", "is", null)
      .executeTakeFirst();

    return Number(result.numUpdatedRows) > 0;
  }

  private selectCompanyBase() {
    return this.connection.db
      .selectFrom("companies")
      .select([
        "companies.id",
        "companies.tenant_id",
        "companies.industry_id",
        "companies.code",
        "companies.name",
        "companies.legal_name",
        "companies.tagline",
        "companies.short_about",
        "companies.gstin_uin",
        "companies.pan",
        "companies.date_of_incorporation",
        "companies.msme_no",
        "companies.msme_category",
        "companies.tan",
        "companies.tds_available",
        "companies.tds_section",
        "companies.tds_rate_percent",
        "companies.tcs_available",
        "companies.tcs_section",
        "companies.tcs_rate_percent",
        "companies.website",
        "companies.description",
        "companies.primary_email",
        "companies.primary_phone",
        "companies.is_primary",
        "companies.is_active",
        "companies.created_at",
        "companies.updated_at",
        "companies.deleted_at",
      ]);
  }

  private async loadDisplayNames(rows: readonly CompanyBaseRow[]) {
    const [tenantNames, industryNames] = await Promise.all([
      this.tenantNameLookup.findNamesByIds(rows.map((row) => Number(row.tenant_id))),
      this.industryNameLookup.findNamesByIds(rows.map((row) => Number(row.industry_id))),
    ]);

    return { tenantNames, industryNames };
  }

  private async toCompanyRecord(
    row: CompanyBaseRow,
    displayNames: {
      readonly tenantNames: ReadonlyMap<number, CompanyReferenceNameRecord>;
      readonly industryNames: ReadonlyMap<number, CompanyReferenceNameRecord>;
    },
  ): Promise<CompanyRecord> {
    const companyId = Number(row.id);
    const [logos, addresses, emails, phones, socialLinks, bankAccounts] = await Promise.all([
      this.listLogos(companyId),
      this.listAddresses(companyId),
      this.listEmails(companyId),
      this.listPhones(companyId),
      this.listSocialLinks(companyId),
      this.listBankAccounts(companyId),
    ]);

    const tenantDisplay = displayNames.tenantNames.get(Number(row.tenant_id));
    const industryDisplay = displayNames.industryNames.get(Number(row.industry_id));

    return {
      id: String(row.id),
      tenantId: String(row.tenant_id),
      tenantName: tenantDisplay?.name ?? "",
      industryId: String(row.industry_id),
      industryCode: industryDisplay?.code ?? "",
      industryName: industryDisplay?.name ?? "",
      code: row.code,
      name: row.name,
      legalName: row.legal_name,
      tagline: row.tagline,
      shortAbout: row.short_about,
      gstinUin: row.gstin_uin,
      pan: row.pan,
      dateOfIncorporation: toDateOnly(row.date_of_incorporation),
      msmeNo: row.msme_no,
      msmeCategory: row.msme_category,
      tan: row.tan,
      tdsAvailable: Boolean(row.tds_available),
      tdsSection: row.tds_section,
      tdsRatePercent: row.tds_rate_percent === null ? null : Number(row.tds_rate_percent),
      tcsAvailable: Boolean(row.tcs_available),
      tcsSection: row.tcs_section,
      tcsRatePercent: row.tcs_rate_percent === null ? null : Number(row.tcs_rate_percent),
      website: row.website,
      description: row.description,
      primaryEmail: row.primary_email,
      primaryPhone: row.primary_phone,
      isPrimary: Boolean(row.is_primary),
      isActive: Boolean(row.is_active),
      createdAt: toDate(row.created_at),
      updatedAt: toDate(row.updated_at),
      deletedAt: row.deleted_at ? toDate(row.deleted_at) : null,
      logos,
      addresses,
      emails,
      phones,
      socialLinks,
      bankAccounts,
    };
  }

  private async replaceChildRecords(
    companyId: number,
    params: CompanyUpsertParams,
    timestamp: Date,
  ) {
    await Promise.all([
      this.connection.db
        .deleteFrom("address_book")
        .where("owner_type", "=", "company")
        .where("owner_id", "=", companyId)
        .execute(),
      this.connection.db.deleteFrom("company_logos").where("company_id", "=", companyId).execute(),
      this.connection.db.deleteFrom("company_emails").where("company_id", "=", companyId).execute(),
      this.connection.db.deleteFrom("company_phones").where("company_id", "=", companyId).execute(),
      this.connection.db
        .deleteFrom("company_social_links")
        .where("company_id", "=", companyId)
        .execute(),
      this.connection.db
        .deleteFrom("company_bank_accounts")
        .where("company_id", "=", companyId)
        .execute(),
    ]);

    const logos = (params.logos ?? []).filter((item) => toNullableString(item.logoUrl));
    const addresses = (params.addresses ?? []).filter((item) =>
      toNullableString(item.addressLine1),
    );
    const emails = (params.emails ?? []).filter((item) => toNullableString(item.email));
    const phones = (params.phones ?? []).filter((item) => toNullableString(item.phoneNumber));
    const socialLinks = (params.socialLinks ?? []).filter((item) => toNullableString(item.url));
    const bankAccounts = (params.bankAccounts ?? []).filter(
      (item) =>
        toNullableString(item.bankName) &&
        toNullableString(item.accountNumber) &&
        toNullableString(item.accountHolderName) &&
        toNullableString(item.ifsc),
    );

    await Promise.all([
      insertIfAny(
        logos,
        this.connection.db.insertInto("company_logos").values(
          logos.map((item) => ({
            company_id: companyId,
            logo_url: item.logoUrl.trim(),
            logo_type: item.logoType.trim() || "logo",
            is_active: item.isActive !== false,
            created_at: timestamp,
            updated_at: timestamp,
          })),
        ),
      ),
      insertIfAny(
        addresses,
        this.connection.db.insertInto("address_book").values(
          addresses.map((item) => ({
            owner_type: "company",
            owner_id: companyId,
            address_type_id: toNullableString(item.addressTypeId),
            address_line1: item.addressLine1.trim(),
            address_line2: toNullableString(item.addressLine2),
            city_id: toNullableString(item.cityId),
            district_id: toNullableString(item.districtId),
            state_id: toNullableString(item.stateId),
            country_id: toNullableString(item.countryId),
            pincode_id: toNullableString(item.pincodeId),
            latitude: item.latitude ?? null,
            longitude: item.longitude ?? null,
            is_default: Boolean(item.isDefault),
            is_active: item.isActive !== false,
            created_at: timestamp,
            updated_at: timestamp,
          })),
        ),
      ),
      insertIfAny(
        emails,
        this.connection.db.insertInto("company_emails").values(
          emails.map((item) => ({
            company_id: companyId,
            email: item.email.trim(),
            email_type: item.emailType.trim() || "primary",
            is_active: item.isActive !== false,
            created_at: timestamp,
            updated_at: timestamp,
          })),
        ),
      ),
      insertIfAny(
        phones,
        this.connection.db.insertInto("company_phones").values(
          phones.map((item) => ({
            company_id: companyId,
            phone_number: item.phoneNumber.trim(),
            phone_type: item.phoneType.trim() || "mobile",
            is_primary: Boolean(item.isPrimary),
            is_active: item.isActive !== false,
            created_at: timestamp,
            updated_at: timestamp,
          })),
        ),
      ),
      insertIfAny(
        socialLinks,
        this.connection.db.insertInto("company_social_links").values(
          socialLinks.map((item) => ({
            company_id: companyId,
            platform: item.platform.trim() || "Website",
            url: item.url.trim(),
            is_active: item.isActive !== false,
            created_at: timestamp,
            updated_at: timestamp,
          })),
        ),
      ),
      insertIfAny(
        bankAccounts,
        this.connection.db.insertInto("company_bank_accounts").values(
          bankAccounts.map((item) => ({
            company_id: companyId,
            bank_name: item.bankName.trim(),
            account_number: item.accountNumber.trim(),
            account_holder_name: item.accountHolderName.trim(),
            ifsc: item.ifsc.trim().toUpperCase(),
            branch: toNullableString(item.branch),
            qr_image_url: toNullableString(item.qrImageUrl),
            is_primary: Boolean(item.isPrimary),
            is_active: item.isActive !== false,
            created_at: timestamp,
            updated_at: timestamp,
          })),
        ),
      ),
    ]);
  }

  private async listLogos(companyId: number): Promise<readonly CompanyLogoRecord[]> {
    const rows = await this.connection.db
      .selectFrom("company_logos")
      .selectAll()
      .where("company_id", "=", companyId)
      .orderBy("id", "asc")
      .execute();

    return rows.map((row) => ({
      id: String(row.id),
      logoUrl: row.logo_url,
      logoType: row.logo_type,
      isActive: Boolean(row.is_active),
    }));
  }

  private async listAddresses(companyId: number): Promise<readonly CompanyAddressRecord[]> {
    const rows = await this.connection.db
      .selectFrom("address_book")
      .selectAll()
      .where("owner_type", "=", "company")
      .where("owner_id", "=", companyId)
      .orderBy("id", "asc")
      .execute();

    return rows.map((row) => ({
      id: String(row.id),
      ownerType: "company",
      ownerId: String(row.owner_id),
      addressTypeId: row.address_type_id,
      addressLine1: row.address_line1,
      addressLine2: row.address_line2,
      cityId: row.city_id,
      districtId: row.district_id,
      stateId: row.state_id,
      countryId: row.country_id,
      pincodeId: row.pincode_id,
      latitude: row.latitude === null ? null : Number(row.latitude),
      longitude: row.longitude === null ? null : Number(row.longitude),
      isDefault: Boolean(row.is_default),
      isActive: Boolean(row.is_active),
    }));
  }

  private async listEmails(companyId: number): Promise<readonly CompanyEmailRecord[]> {
    const rows = await this.connection.db
      .selectFrom("company_emails")
      .selectAll()
      .where("company_id", "=", companyId)
      .orderBy("id", "asc")
      .execute();

    return rows.map((row) => ({
      id: String(row.id),
      email: row.email,
      emailType: row.email_type,
      isActive: Boolean(row.is_active),
    }));
  }

  private async listPhones(companyId: number): Promise<readonly CompanyPhoneRecord[]> {
    const rows = await this.connection.db
      .selectFrom("company_phones")
      .selectAll()
      .where("company_id", "=", companyId)
      .orderBy("id", "asc")
      .execute();

    return rows.map((row) => ({
      id: String(row.id),
      phoneNumber: row.phone_number,
      phoneType: row.phone_type,
      isPrimary: Boolean(row.is_primary),
      isActive: Boolean(row.is_active),
    }));
  }

  private async listSocialLinks(companyId: number): Promise<readonly CompanySocialLinkRecord[]> {
    const rows = await this.connection.db
      .selectFrom("company_social_links")
      .selectAll()
      .where("company_id", "=", companyId)
      .orderBy("id", "asc")
      .execute();

    return rows.map((row) => ({
      id: String(row.id),
      platform: row.platform,
      url: row.url,
      isActive: Boolean(row.is_active),
    }));
  }

  private async listBankAccounts(companyId: number): Promise<readonly CompanyBankAccountRecord[]> {
    const rows = await this.connection.db
      .selectFrom("company_bank_accounts")
      .selectAll()
      .where("company_id", "=", companyId)
      .orderBy("id", "asc")
      .execute();

    return rows.map((row) => ({
      id: String(row.id),
      bankName: row.bank_name,
      accountNumber: row.account_number,
      accountHolderName: row.account_holder_name,
      ifsc: row.ifsc,
      branch: row.branch,
      qrImageUrl: row.qr_image_url,
      isPrimary: Boolean(row.is_primary),
      isActive: Boolean(row.is_active),
    }));
  }
}

function toCompanyValues(params: CompanyUpsertParams, timestamp: Date) {
  const primaryEmail =
    params.emails?.find((item) => item.isPrimary)?.email ??
    params.emails?.[0]?.email ??
    params.primaryEmail;
  const primaryPhone =
    params.phones?.find((item) => item.isPrimary)?.phoneNumber ??
    params.phones?.[0]?.phoneNumber ??
    params.primaryPhone;

  return {
    tenant_id: params.tenantId,
    industry_id: params.industryId,
    code: normalizeCompanyCode(params.code || params.name),
    name: params.name.trim(),
    legal_name: toNullableString(params.legalName),
    tagline: toNullableString(params.tagline),
    short_about: toNullableString(params.shortAbout),
    gstin_uin: toNullableString(params.gstinUin)?.toUpperCase() ?? null,
    pan: toNullableString(params.pan)?.toUpperCase() ?? null,
    date_of_incorporation: toNullableString(params.dateOfIncorporation),
    msme_no: toNullableString(params.msmeNo),
    msme_category: toNullableString(params.msmeCategory),
    tan: toNullableString(params.tan)?.toUpperCase() ?? null,
    tds_available: Boolean(params.tdsAvailable),
    tds_section: params.tdsAvailable ? toNullableString(params.tdsSection) : null,
    tds_rate_percent: params.tdsAvailable ? (params.tdsRatePercent ?? null) : null,
    tcs_available: Boolean(params.tcsAvailable),
    tcs_section: params.tcsAvailable ? toNullableString(params.tcsSection) : null,
    tcs_rate_percent: params.tcsAvailable ? (params.tcsRatePercent ?? null) : null,
    website: toNullableString(params.website),
    description: toNullableString(params.description),
    primary_email: toNullableString(primaryEmail),
    primary_phone: toNullableString(primaryPhone),
    is_primary: params.isPrimary,
    is_active: params.isActive,
    created_at: timestamp,
    updated_at: timestamp,
    deleted_at: null,
  };
}

function toCompanyUpdateValues(params: CompanyUpsertParams, timestamp: Date) {
  const {
    created_at: _createdAt,
    deleted_at: _deletedAt,
    ...values
  } = toCompanyValues(params, timestamp);
  return values;
}

async function insertIfAny<T>(items: readonly T[], query: { execute(): Promise<unknown> }) {
  if (items.length === 0) {
    return;
  }
  await query.execute();
}

function toNullableString(value: string | null | undefined) {
  const trimmedValue = value?.trim() ?? "";
  return trimmedValue.length > 0 ? trimmedValue : null;
}

function normalizeCompanyCode(value: string) {
  return value.trim().toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

function toDate(value: DateValue): Date {
  return value instanceof Date ? value : new Date(value);
}

function toDateOnly(value: DateValue | null) {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return [
      value.getFullYear(),
      String(value.getMonth() + 1).padStart(2, "0"),
      String(value.getDate()).padStart(2, "0"),
    ].join("-");
  }

  return value.slice(0, 10);
}
