import { sql, type Kysely } from "kysely";

import { defineDatabaseMigration } from "../process/types";

type DynamicDatabase = Record<string, Record<string, unknown>>;

function asQueryDatabase(database: Kysely<unknown>) {
  return database as unknown as Kysely<DynamicDatabase>;
}

export const createContactsMigration = defineDatabaseMigration({
  id: "crm:contacts:001-create-contacts",
  appId: "crm",
  moduleKey: "contacts",
  name: "Create contacts and contact detail tables",
  order: 65,
  up: async ({ database }) => {
    const queryDatabase = asQueryDatabase(database);

    await queryDatabase.schema
      .createTable("contacts")
      .ifNotExists()
      .addColumn("id", "bigint", (column) => column.primaryKey().autoIncrement())
      .addColumn("uuid", "varchar(80)", (column) => column.notNull())
      .addColumn("code", "varchar(40)", (column) => column.notNull())
      .addColumn("contact_type_id", "varchar(80)")
      .addColumn("ledger_id", "varchar(120)")
      .addColumn("ledger_name", "varchar(180)")
      .addColumn("name", "varchar(180)", (column) => column.notNull())
      .addColumn("legal_name", "varchar(220)")
      .addColumn("pan", "varchar(30)")
      .addColumn("gstin", "varchar(30)")
      .addColumn("msme_type", "varchar(40)")
      .addColumn("msme_no", "varchar(80)")
      .addColumn("tan", "varchar(30)")
      .addColumn("tds_available", "boolean", (column) => column.notNull().defaultTo(false))
      .addColumn("tcs_available", "boolean", (column) => column.notNull().defaultTo(false))
      .addColumn("opening_balance", sql`double`, (column) => column.notNull().defaultTo(0))
      .addColumn("balance_type", "varchar(20)")
      .addColumn("credit_limit", sql`double`, (column) => column.notNull().defaultTo(0))
      .addColumn("website", "varchar(240)")
      .addColumn("description", "text")
      .addColumn("primary_email", "varchar(180)")
      .addColumn("primary_phone", "varchar(80)")
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
      .createIndex("uq_contacts_code")
      .ifNotExists()
      .on("contacts")
      .column("code")
      .unique()
      .execute();

    await queryDatabase.schema
      .createIndex("idx_contacts_type")
      .ifNotExists()
      .on("contacts")
      .column("contact_type_id")
      .execute();

    await queryDatabase.schema
      .createTable("contact_emails")
      .ifNotExists()
      .addColumn("id", "bigint", (column) => column.primaryKey().autoIncrement())
      .addColumn("contact_id", "bigint", (column) => column.notNull())
      .addColumn("email", "varchar(180)", (column) => column.notNull())
      .addColumn("email_type", "varchar(80)", (column) => column.notNull())
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
      .createTable("contact_phones")
      .ifNotExists()
      .addColumn("id", "bigint", (column) => column.primaryKey().autoIncrement())
      .addColumn("contact_id", "bigint", (column) => column.notNull())
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
      .createTable("contact_social_links")
      .ifNotExists()
      .addColumn("id", "bigint", (column) => column.primaryKey().autoIncrement())
      .addColumn("contact_id", "bigint", (column) => column.notNull())
      .addColumn("platform", "varchar(80)", (column) => column.notNull())
      .addColumn("url", "varchar(240)", (column) => column.notNull())
      .addColumn("is_active", "boolean", (column) => column.notNull().defaultTo(true))
      .addColumn("created_at", "datetime", (column) =>
        column.notNull().defaultTo(sql`CURRENT_TIMESTAMP`),
      )
      .addColumn("updated_at", "datetime", (column) =>
        column.notNull().defaultTo(sql`CURRENT_TIMESTAMP`),
      )
      .execute();

    await queryDatabase.schema
      .createTable("contact_bank_accounts")
      .ifNotExists()
      .addColumn("id", "bigint", (column) => column.primaryKey().autoIncrement())
      .addColumn("contact_id", "bigint", (column) => column.notNull())
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

    await queryDatabase.schema
      .createTable("contact_gst_details")
      .ifNotExists()
      .addColumn("id", "bigint", (column) => column.primaryKey().autoIncrement())
      .addColumn("contact_id", "bigint", (column) => column.notNull())
      .addColumn("gstin", "varchar(30)", (column) => column.notNull())
      .addColumn("state", "varchar(120)", (column) => column.notNull())
      .addColumn("is_default", "boolean", (column) => column.notNull().defaultTo(false))
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
