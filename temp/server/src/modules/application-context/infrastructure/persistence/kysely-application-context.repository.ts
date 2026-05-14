import { Injectable, type OnModuleDestroy } from "@nestjs/common";
import { createDatabaseConnection, loadDatabaseEnv, type DatabaseConnection } from "@cxnext/db";
import type {
  ApplicationContextRepository,
  DefaultCompanyUpdateParams,
} from "../../application/services/application-context.repository";
import type {
  ApplicationContextRecord,
  DefaultCompanyRecord,
} from "../../domain/application-context-record";

type DateValue = Date | string;

interface DefaultCompanyContextRow {
  readonly id: number;
  readonly tenant_id: number;
  readonly tenant_name: string;
  readonly tenant_slug: string;
  readonly industry_id: number;
  readonly industry_code: string;
  readonly industry_name: string;
  readonly company_id: number;
  readonly company_code: string;
  readonly company_name: string;
  readonly company_legal_name: string | null;
  readonly company_gstin_uin: string | null;
  readonly company_pan: string | null;
  readonly accounting_year_id: number;
  readonly accounting_year_name: string;
  readonly accounting_year_start_date: DateValue;
  readonly accounting_year_end_date: DateValue;
  readonly accounting_year_books_start: DateValue | null;
  readonly accounting_year_is_active: boolean | number;
  readonly created_at: DateValue;
  readonly updated_at: DateValue;
}

@Injectable()
export class KyselyApplicationContextRepository
  implements ApplicationContextRepository, OnModuleDestroy
{
  private readonly connection: DatabaseConnection;

  public constructor() {
    this.connection = createDatabaseConnection(loadDatabaseEnv().env);
  }

  public async onModuleDestroy(): Promise<void> {
    await this.connection.destroy();
  }

  public async getDefaultCompanyContext(): Promise<ApplicationContextRecord | null> {
    const row = await this.selectDefaultCompanyRecord().executeTakeFirst();

    return row ? toApplicationContextRecord(row as DefaultCompanyContextRow) : null;
  }

  public async getDefaultCompanyRecord(): Promise<DefaultCompanyRecord | null> {
    const row = (await this.selectDefaultCompanyRecord().executeTakeFirst()) as
      | DefaultCompanyContextRow
      | undefined;

    return row ? toDefaultCompanyRecord(row) : null;
  }

  public async updateDefaultCompany(
    params: DefaultCompanyUpdateParams,
  ): Promise<DefaultCompanyRecord> {
    const now = new Date();
    await this.connection.db
      .updateTable("default_companies")
      .set({
        is_active: false,
        updated_at: now,
      })
      .execute();

    await this.connection.db
      .insertInto("default_companies")
      .values({
        tenant_id: params.tenantId,
        industry_id: params.industryId,
        company_id: params.companyId,
        accounting_year_id: params.accountingYearId,
        is_active: true,
        created_at: now,
        updated_at: now,
      })
      .executeTakeFirstOrThrow();

    const record = await this.getDefaultCompanyRecord();
    if (!record) {
      throw new Error("Default company was updated but could not be read back.");
    }

    return record;
  }

  private selectDefaultCompanyRecord() {
    return this.connection.db
      .selectFrom("default_companies")
      .innerJoin("tenants", "tenants.id", "default_companies.tenant_id")
      .innerJoin("industries", "industries.id", "default_companies.industry_id")
      .innerJoin("companies", "companies.id", "default_companies.company_id")
      .innerJoin("accounting_years", "accounting_years.id", "default_companies.accounting_year_id")
      .select([
        "default_companies.id",
        "tenants.id as tenant_id",
        "tenants.name as tenant_name",
        "tenants.slug as tenant_slug",
        "industries.id as industry_id",
        "industries.code as industry_code",
        "industries.name as industry_name",
        "companies.id as company_id",
        "companies.code as company_code",
        "companies.name as company_name",
        "companies.legal_name as company_legal_name",
        "companies.gstin_uin as company_gstin_uin",
        "companies.pan as company_pan",
        "accounting_years.id as accounting_year_id",
        "accounting_years.name as accounting_year_name",
        "accounting_years.start_date as accounting_year_start_date",
        "accounting_years.end_date as accounting_year_end_date",
        "accounting_years.books_start as accounting_year_books_start",
        "accounting_years.is_active as accounting_year_is_active",
        "default_companies.created_at",
        "default_companies.updated_at",
      ])
      .where("default_companies.is_active", "=", true)
      .where("tenants.deleted_at", "is", null)
      .where("industries.deleted_at", "is", null)
      .where("companies.deleted_at", "is", null)
      .where("accounting_years.deleted_at", "is", null)
      .orderBy("default_companies.id", "desc");
  }
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

function toRequiredDateOnly(value: DateValue) {
  return toDateOnly(value) ?? "";
}

function toDate(value: DateValue) {
  return value instanceof Date ? value : new Date(value);
}

function toApplicationContextRecord(row: DefaultCompanyContextRow): ApplicationContextRecord {
  return {
    tenant: {
      id: String(row.tenant_id),
      name: row.tenant_name,
      slug: row.tenant_slug,
    },
    industry: {
      id: String(row.industry_id),
      code: row.industry_code,
      name: row.industry_name,
    },
    company: {
      id: String(row.company_id),
      code: row.company_code,
      name: row.company_name,
      legalName: row.company_legal_name,
      gstinUin: row.company_gstin_uin,
      pan: row.company_pan,
    },
    accountingYear: {
      id: String(row.accounting_year_id),
      name: row.accounting_year_name,
      startDate: toRequiredDateOnly(row.accounting_year_start_date),
      endDate: toRequiredDateOnly(row.accounting_year_end_date),
      booksStart: toDateOnly(row.accounting_year_books_start),
      isActive: Boolean(row.accounting_year_is_active),
    },
  };
}

function toDefaultCompanyRecord(row: DefaultCompanyContextRow): DefaultCompanyRecord {
  return {
    ...toApplicationContextRecord(row),
    id: String(row.id),
    createdAt: toDate(row.created_at),
    updatedAt: toDate(row.updated_at),
  };
}
