import type { Kysely } from "kysely";

import { defineDatabaseSeeder } from "../process/types";

type DynamicDatabase = Record<string, Record<string, unknown>>;

const timestamp = "2026-04-28 09:00:00";

const companySeeds = [
  {
    code: "CODEXSUN",
    name: "codexsun",
    tenantName: "codexsun",
    industryCode: "600",
    legal_name: "codexsun",
    tagline: "Suite-first commerce and operations software.",
    short_about: "Connected business software for billing, commerce, and operations.",
    gstin_uin: "33AACCC1234K1Z5",
    pan: "AACCC1234K",
    date_of_incorporation: "2026-01-10",
    msme_no: "UDYAM-TN-01-1001201",
    msme_category: "small",
    tan: "CHEC12345B",
    tds_available: true,
    tds_section: "194J",
    tds_rate_percent: 10,
    tcs_available: true,
    tcs_section: "206C",
    tcs_rate_percent: 0.1,
    accountingYear: {
      name: "FY 2026-27",
      start_date: "2026-04-01",
      end_date: "2027-03-31",
      books_start: "2026-04-01",
    },
    website: "https://codexsun.example.com",
    description: "Primary suite operator for shared ERP, commerce, and deployment workflows.",
    primary_email: "hello@codexsun.example.com",
    primary_phone: "+91 90000 00001",
    is_primary: true,
    is_active: true,
    logo: {
      logo_url: "https://placehold.co/160x160/f4efe8/2b211a?text=CS",
      logo_type: "primary",
    },
    address: {
      address_type_id: "address-type:primary-1",
      address_line1: "18 North Residency, Cathedral Road",
      address_line2: "Nungambakkam",
      city_id: "city:chennai",
      district_id: "district:chennai",
      state_id: "state:tamil-nadu",
      country_id: "country:in",
      pincode_id: "pincode:600001",
    },
    emails: [
      { email: "hello@codexsun.example.com", email_type: "support" },
      { email: "ops@codexsun.example.com", email_type: "operations" },
    ],
    phone: {
      phone_number: "+91 90000 00001",
      phone_type: "office",
    },
    socialLinks: [
      { platform: "Facebook", url: "https://facebook.com/codexsun" },
      { platform: "Twitter / X", url: "https://x.com/codexsun" },
    ],
    bank: {
      bank_name: "Axis Bank",
      account_number: "001234567890",
      account_holder_name: "codexsun",
      ifsc: "UTIB0000123",
      branch: "Anna Salai",
    },
  },
] as const;

function asQueryDatabase(database: Kysely<unknown>) {
  return database as unknown as Kysely<DynamicDatabase>;
}

function requireSeedRecord<T>(record: T | undefined, label: string): T {
  if (!record) {
    throw new Error(`Missing seed dependency: ${label}`);
  }
  return record;
}

export const seedCompaniesSeeder = defineDatabaseSeeder({
  id: "organisation:companies:001-seed-companies",
  appId: "organisation",
  moduleKey: "companies",
  name: "Seed default companies",
  order: 30,
  run: async ({ database }) => {
    const queryDatabase = asQueryDatabase(database);

    for (const company of companySeeds) {
      const tenant = await queryDatabase
        .selectFrom("tenants")
        .select("id")
        .where("name", "=", company.tenantName)
        .executeTakeFirst()
        .then((record) => requireSeedRecord(record, `tenant ${company.tenantName}`));
      const industry = await queryDatabase
        .selectFrom("industries")
        .select("id")
        .where("code", "=", company.industryCode)
        .executeTakeFirst()
        .then((record) => requireSeedRecord(record, `industry ${company.industryCode}`));

      const existingCompany = await queryDatabase
        .selectFrom("companies")
        .select("id")
        .where("code", "=", company.code)
        .executeTakeFirst();

      const companyId = existingCompany
        ? Number(existingCompany.id)
        : await insertSeedCompany(queryDatabase, company, Number(tenant.id), Number(industry.id));

      const existingAccountingYear = await queryDatabase
        .selectFrom("accounting_years")
        .select("id")
        .where("name", "=", company.accountingYear.name)
        .where("start_date", "=", company.accountingYear.start_date)
        .where("end_date", "=", company.accountingYear.end_date)
        .where("deleted_at", "is", null)
        .executeTakeFirst();

      const accountingYearId = existingAccountingYear
        ? Number(existingAccountingYear.id)
        : await insertSeedAccountingYear(queryDatabase, company);

      if (company.is_primary) {
        const existingDefaultCompany = await queryDatabase
          .selectFrom("default_companies")
          .select("id")
          .where("company_id", "=", companyId)
          .where("accounting_year_id", "=", accountingYearId)
          .where("is_active", "=", true)
          .executeTakeFirst();

        if (!existingDefaultCompany) {
          await queryDatabase
            .updateTable("default_companies")
            .set({
              is_active: false,
              updated_at: timestamp,
            })
            .where("company_id", "=", companyId)
            .execute();

          await queryDatabase
            .insertInto("default_companies")
            .values({
              tenant_id: tenant.id,
              industry_id: industry.id,
              company_id: companyId,
              accounting_year_id: accountingYearId,
              is_active: true,
              created_at: timestamp,
              updated_at: timestamp,
            })
            .execute();
        }
      }

      if (existingCompany) {
        continue;
      }

      await queryDatabase
        .insertInto("company_logos")
        .values({
          company_id: companyId,
          logo_url: company.logo.logo_url,
          logo_type: company.logo.logo_type,
          is_active: true,
          created_at: timestamp,
          updated_at: timestamp,
        })
        .execute();

      await queryDatabase
        .insertInto("address_book")
        .values({
          owner_type: "company",
          owner_id: companyId,
          ...company.address,
          latitude: null,
          longitude: null,
          is_default: true,
          is_active: true,
          created_at: timestamp,
          updated_at: timestamp,
        })
        .execute();

      for (const email of company.emails) {
        await queryDatabase
          .insertInto("company_emails")
          .values({
            company_id: companyId,
            ...email,
            is_active: true,
            created_at: timestamp,
            updated_at: timestamp,
          })
          .execute();
      }

      for (const socialLink of company.socialLinks) {
        await queryDatabase
          .insertInto("company_social_links")
          .values({
            company_id: companyId,
            ...socialLink,
            is_active: true,
            created_at: timestamp,
            updated_at: timestamp,
          })
          .execute();
      }

      await queryDatabase
        .insertInto("company_phones")
        .values({
          company_id: companyId,
          ...company.phone,
          is_primary: true,
          is_active: true,
          created_at: timestamp,
          updated_at: timestamp,
        })
        .execute();

      await queryDatabase
        .insertInto("company_bank_accounts")
        .values({
          company_id: companyId,
          ...company.bank,
          is_primary: true,
          is_active: true,
          created_at: timestamp,
          updated_at: timestamp,
        })
        .execute();
    }
  },
});

async function insertSeedCompany(
  queryDatabase: Kysely<DynamicDatabase>,
  company: (typeof companySeeds)[number],
  tenantId: number,
  industryId: number,
) {
  const [result] = await queryDatabase
    .insertInto("companies")
    .values({
      tenant_id: tenantId,
      industry_id: industryId,
      code: company.code,
      name: company.name,
      legal_name: company.legal_name,
      tagline: company.tagline,
      short_about: company.short_about,
      gstin_uin: company.gstin_uin,
      pan: company.pan,
      date_of_incorporation: company.date_of_incorporation,
      msme_no: company.msme_no,
      msme_category: company.msme_category,
      tan: company.tan,
      tds_available: company.tds_available,
      tds_section: company.tds_section,
      tds_rate_percent: company.tds_rate_percent,
      tcs_available: company.tcs_available,
      tcs_section: company.tcs_section,
      tcs_rate_percent: company.tcs_rate_percent,
      website: company.website,
      description: company.description,
      primary_email: company.primary_email,
      primary_phone: company.primary_phone,
      is_primary: company.is_primary,
      is_active: company.is_active,
      created_at: timestamp,
      updated_at: timestamp,
      deleted_at: null,
    })
    .execute();

  return Number(result?.insertId);
}

async function insertSeedAccountingYear(
  queryDatabase: Kysely<DynamicDatabase>,
  company: (typeof companySeeds)[number],
) {
  const [accountingYearResult] = await queryDatabase
    .insertInto("accounting_years")
    .values({
      name: company.accountingYear.name,
      start_date: company.accountingYear.start_date,
      end_date: company.accountingYear.end_date,
      books_start: company.accountingYear.books_start,
      is_active: true,
      created_at: timestamp,
      updated_at: timestamp,
      deleted_at: null,
    })
    .execute();

  return Number(accountingYearResult?.insertId);
}
