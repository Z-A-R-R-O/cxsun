import { sql, type Kysely } from "kysely";

import { defineDatabaseMigration } from "../process/types";

type DynamicDatabase = Record<string, Record<string, unknown>>;

function asQueryDatabase(database: Kysely<unknown>) {
  return database as unknown as Kysely<DynamicDatabase>;
}

export const createCompaniesMigration = defineDatabaseMigration({
  id: "organisation:companies:001-create-companies",
  appId: "organisation",
  moduleKey: "companies",
  name: "Create companies and company detail tables",
  order: 30,
  up: async ({ database }) => {
    const queryDatabase = asQueryDatabase(database);

    await queryDatabase.schema
      .createTable("companies")
      .ifNotExists()
      .addColumn("id", "bigint", (column) => column.primaryKey().autoIncrement())
      .addColumn("tenant_id", "bigint", (column) => column.notNull())
      .addColumn("industry_id", "bigint", (column) => column.notNull())
      .addColumn("code", "varchar(64)", (column) => column.notNull())
      .addColumn("name", "varchar(160)", (column) => column.notNull())
      .addColumn("legal_name", "varchar(220)")
      .addColumn("tagline", "varchar(220)")
      .addColumn("short_about", "varchar(500)")
      .addColumn("gstin_uin", "varchar(30)")
      .addColumn("pan", "varchar(30)")
      .addColumn("date_of_incorporation", "date")
      .addColumn("msme_no", "varchar(80)")
      .addColumn("msme_category", "varchar(80)")
      .addColumn("tan", "varchar(30)")
      .addColumn("tds_available", "boolean", (column) => column.notNull().defaultTo(false))
      .addColumn("tds_section", "varchar(80)")
      .addColumn("tds_rate_percent", sql`double`)
      .addColumn("tcs_available", "boolean", (column) => column.notNull().defaultTo(false))
      .addColumn("tcs_section", "varchar(80)")
      .addColumn("tcs_rate_percent", sql`double`)
      .addColumn("website", "varchar(240)")
      .addColumn("description", "text")
      .addColumn("primary_email", "varchar(180)")
      .addColumn("primary_phone", "varchar(80)")
      .addColumn("is_primary", "boolean", (column) => column.notNull().defaultTo(false))
      .addColumn("is_active", "boolean", (column) => column.notNull().defaultTo(true))
      .addColumn("created_at", "datetime", (column) =>
        column.notNull().defaultTo(sql`CURRENT_TIMESTAMP`),
      )
      .addColumn("updated_at", "datetime", (column) =>
        column.notNull().defaultTo(sql`CURRENT_TIMESTAMP`),
      )
      .addColumn("deleted_at", "datetime")
      .execute();

    await queryDatabase.schema
      .createIndex("uq_companies_code")
      .ifNotExists()
      .on("companies")
      .column("code")
      .unique()
      .execute();

    await queryDatabase.schema
      .createIndex("uq_companies_name")
      .ifNotExists()
      .on("companies")
      .column("name")
      .unique()
      .execute();

    await queryDatabase.schema
      .createIndex("idx_companies_tenant_industry")
      .ifNotExists()
      .on("companies")
      .column("tenant_id")
      .column("industry_id")
      .execute();

    await queryDatabase.schema
      .createTable("accounting_years")
      .ifNotExists()
      .addColumn("id", "bigint", (column) => column.primaryKey().autoIncrement())
      .addColumn("name", "varchar(80)", (column) => column.notNull())
      .addColumn("start_date", "date", (column) => column.notNull())
      .addColumn("end_date", "date", (column) => column.notNull())
      .addColumn("books_start", "date")
      .addColumn("is_active", "boolean", (column) => column.notNull().defaultTo(true))
      .addColumn("created_at", "datetime", (column) =>
        column.notNull().defaultTo(sql`CURRENT_TIMESTAMP`),
      )
      .addColumn("updated_at", "datetime", (column) =>
        column.notNull().defaultTo(sql`CURRENT_TIMESTAMP`),
      )
      .addColumn("deleted_at", "datetime")
      .execute();

    await queryDatabase.schema
      .createIndex("uq_accounting_years_period")
      .ifNotExists()
      .on("accounting_years")
      .column("name")
      .column("start_date")
      .column("end_date")
      .unique()
      .execute();

    await queryDatabase.schema
      .createTable("default_companies")
      .ifNotExists()
      .addColumn("id", "bigint", (column) => column.primaryKey().autoIncrement())
      .addColumn("tenant_id", "bigint", (column) => column.notNull())
      .addColumn("industry_id", "bigint", (column) => column.notNull())
      .addColumn("company_id", "bigint", (column) => column.notNull())
      .addColumn("accounting_year_id", "bigint", (column) => column.notNull())
      .addColumn("is_active", "boolean", (column) => column.notNull().defaultTo(true))
      .addColumn("created_at", "datetime", (column) =>
        column.notNull().defaultTo(sql`CURRENT_TIMESTAMP`),
      )
      .addColumn("updated_at", "datetime", (column) =>
        column.notNull().defaultTo(sql`CURRENT_TIMESTAMP`),
      )
      .execute();

    await queryDatabase.schema
      .createIndex("idx_default_companies_lookup")
      .ifNotExists()
      .on("default_companies")
      .column("tenant_id")
      .column("company_id")
      .column("accounting_year_id")
      .column("is_active")
      .execute();

    await queryDatabase.schema
      .createTable("company_logos")
      .ifNotExists()
      .addColumn("id", "bigint", (column) => column.primaryKey().autoIncrement())
      .addColumn("company_id", "bigint", (column) => column.notNull())
      .addColumn("logo_url", "varchar(500)", (column) => column.notNull())
      .addColumn("logo_type", "varchar(80)", (column) => column.notNull())
      .addColumn("is_active", "boolean", (column) => column.notNull().defaultTo(true))
      .addColumn("created_at", "datetime", (column) =>
        column.notNull().defaultTo(sql`CURRENT_TIMESTAMP`),
      )
      .addColumn("updated_at", "datetime", (column) =>
        column.notNull().defaultTo(sql`CURRENT_TIMESTAMP`),
      )
      .execute();

    await queryDatabase.schema
      .createTable("address_book")
      .ifNotExists()
      .addColumn("id", "bigint", (column) => column.primaryKey().autoIncrement())
      .addColumn("owner_type", "varchar(40)", (column) => column.notNull())
      .addColumn("owner_id", "bigint", (column) => column.notNull())
      .addColumn("address_type_id", "varchar(80)")
      .addColumn("address_line1", "varchar(240)", (column) => column.notNull())
      .addColumn("address_line2", "varchar(240)")
      .addColumn("city_id", "varchar(80)")
      .addColumn("district_id", "varchar(80)")
      .addColumn("state_id", "varchar(80)")
      .addColumn("country_id", "varchar(80)")
      .addColumn("pincode_id", "varchar(80)")
      .addColumn("latitude", sql`double`)
      .addColumn("longitude", sql`double`)
      .addColumn("is_default", "boolean", (column) => column.notNull().defaultTo(false))
      .addColumn("is_active", "boolean", (column) => column.notNull().defaultTo(true))
      .addColumn("created_at", "datetime", (column) =>
        column.notNull().defaultTo(sql`CURRENT_TIMESTAMP`),
      )
      .addColumn("updated_at", "datetime", (column) =>
        column.notNull().defaultTo(sql`CURRENT_TIMESTAMP`),
      )
      .execute();

    await queryDatabase.schema
      .createIndex("idx_address_book_owner")
      .ifNotExists()
      .on("address_book")
      .column("owner_type")
      .column("owner_id")
      .column("is_active")
      .execute();

    await queryDatabase.schema
      .createTable("company_emails")
      .ifNotExists()
      .addColumn("id", "bigint", (column) => column.primaryKey().autoIncrement())
      .addColumn("company_id", "bigint", (column) => column.notNull())
      .addColumn("email", "varchar(180)", (column) => column.notNull())
      .addColumn("email_type", "varchar(80)", (column) => column.notNull())
      .addColumn("is_active", "boolean", (column) => column.notNull().defaultTo(true))
      .addColumn("created_at", "datetime", (column) =>
        column.notNull().defaultTo(sql`CURRENT_TIMESTAMP`),
      )
      .addColumn("updated_at", "datetime", (column) =>
        column.notNull().defaultTo(sql`CURRENT_TIMESTAMP`),
      )
      .execute();

    await queryDatabase.schema
      .createTable("company_social_links")
      .ifNotExists()
      .addColumn("id", "bigint", (column) => column.primaryKey().autoIncrement())
      .addColumn("company_id", "bigint", (column) => column.notNull())
      .addColumn("platform", "varchar(80)", (column) => column.notNull())
      .addColumn("url", "varchar(500)", (column) => column.notNull())
      .addColumn("is_active", "boolean", (column) => column.notNull().defaultTo(true))
      .addColumn("created_at", "datetime", (column) =>
        column.notNull().defaultTo(sql`CURRENT_TIMESTAMP`),
      )
      .addColumn("updated_at", "datetime", (column) =>
        column.notNull().defaultTo(sql`CURRENT_TIMESTAMP`),
      )
      .execute();

    await queryDatabase.schema
      .createTable("company_phones")
      .ifNotExists()
      .addColumn("id", "bigint", (column) => column.primaryKey().autoIncrement())
      .addColumn("company_id", "bigint", (column) => column.notNull())
      .addColumn("phone_number", "varchar(80)", (column) => column.notNull())
      .addColumn("phone_type", "varchar(80)", (column) => column.notNull())
      .addColumn("is_primary", "boolean", (column) => column.notNull().defaultTo(false))
      .addColumn("is_active", "boolean", (column) => column.notNull().defaultTo(true))
      .addColumn("created_at", "datetime", (column) =>
        column.notNull().defaultTo(sql`CURRENT_TIMESTAMP`),
      )
      .addColumn("updated_at", "datetime", (column) =>
        column.notNull().defaultTo(sql`CURRENT_TIMESTAMP`),
      )
      .execute();

    await queryDatabase.schema
      .createTable("company_bank_accounts")
      .ifNotExists()
      .addColumn("id", "bigint", (column) => column.primaryKey().autoIncrement())
      .addColumn("company_id", "bigint", (column) => column.notNull())
      .addColumn("bank_name", "varchar(160)", (column) => column.notNull())
      .addColumn("account_number", "varchar(80)", (column) => column.notNull())
      .addColumn("account_holder_name", "varchar(180)", (column) => column.notNull())
      .addColumn("ifsc", "varchar(40)", (column) => column.notNull())
      .addColumn("branch", "varchar(160)")
      .addColumn("is_primary", "boolean", (column) => column.notNull().defaultTo(false))
      .addColumn("is_active", "boolean", (column) => column.notNull().defaultTo(true))
      .addColumn("created_at", "datetime", (column) =>
        column.notNull().defaultTo(sql`CURRENT_TIMESTAMP`),
      )
      .addColumn("updated_at", "datetime", (column) =>
        column.notNull().defaultTo(sql`CURRENT_TIMESTAMP`),
      )
      .execute();
  },
});
