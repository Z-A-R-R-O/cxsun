import { sql, type Kysely } from "kysely";

import { prepareApplicationDatabase } from "./runner";
import type { DatabaseFreshResult, DatabaseProcessLogger } from "./types";

type DatabaseObjectKind = "table" | "view";

interface NamedDatabaseObjectRow {
  readonly name: string;
}

const tableDropOrder = [
  "auth_sessions",
  "auth_user_roles",
  "auth_users",
  "auth_role_permissions",
  "auth_roles",
  "auth_permissions",
  "receipt_allocations",
  "receipts",
  "payment_allocations",
  "payments",
  "stock_movements",
  "stock_balances",
  "stock_barcodes",
  "stock_serial_numbers",
  "stock_batches",
  "stock_warehouses",
  "purchase_items",
  "purchases",
  "sales_items",
  "sales",
  "products",
  "common_payment_terms",
  "common_currencies",
  "common_stock_rejection_types",
  "common_order_types",
  "common_destinations",
  "common_transports",
  "common_warehouses",
  "common_taxes",
  "common_hsn_codes",
  "common_units",
  "common_styles",
  "common_sizes",
  "common_colours",
  "common_brands",
  "common_product_types",
  "common_product_categories",
  "common_product_groups",
  "contact_gst_details",
  "contact_bank_accounts",
  "contact_social_links",
  "contact_phones",
  "contact_emails",
  "contacts",
  "common_bank_names",
  "common_address_types",
  "common_contact_types",
  "common_contact_groups",
  "common_pincodes",
  "common_cities",
  "common_districts",
  "common_states",
  "common_countries",
  "company_bank_accounts",
  "company_social_links",
  "company_phones",
  "company_emails",
  "address_book",
  "company_logos",
  "default_companies",
  "accounting_years",
  "companies",
  "industries",
  "tenants",
  "system_seeders",
  "system_migrations",
] as const;

const tableDropPriority = new Map<string, number>(
  tableDropOrder.map((tableName, index) => [tableName, index]),
);

function escapeMysqlIdentifier(value: string) {
  return `\`${value.replace(/`/g, "``")}\``;
}

function sortDatabaseObjectsForDrop(objectNames: readonly string[], kind: DatabaseObjectKind) {
  if (kind === "view") {
    return [...objectNames].sort((left, right) => left.localeCompare(right));
  }

  return [...objectNames].sort((left, right) => {
    const leftPriority = tableDropPriority.get(left) ?? Number.MAX_SAFE_INTEGER;
    const rightPriority = tableDropPriority.get(right) ?? Number.MAX_SAFE_INTEGER;

    return leftPriority - rightPriority || left.localeCompare(right);
  });
}

async function listDatabaseObjects(
  database: Kysely<unknown>,
  options: {
    readonly databaseName: string;
    readonly kind: DatabaseObjectKind;
  },
) {
  const tableType = options.kind === "view" ? "VIEW" : "BASE TABLE";
  const result = await sql<NamedDatabaseObjectRow>`
    select table_name as name
    from information_schema.tables
    where table_schema = ${options.databaseName}
      and table_type = ${tableType}
    order by table_name asc
  `.execute(database);

  return result.rows.map((row) => String(row.name));
}

async function dropDatabaseObjects(
  database: Kysely<unknown>,
  options: {
    readonly databaseName: string;
    readonly kind: DatabaseObjectKind;
    readonly logger?: DatabaseProcessLogger;
  },
) {
  const objectNames = sortDatabaseObjectsForDrop(
    await listDatabaseObjects(database, options),
    options.kind,
  );
  const keyword = options.kind === "view" ? "view" : "table";

  for (const objectName of objectNames) {
    options.logger?.info(`Dropping ${options.kind} ${objectName} from ${options.databaseName}`);
    await sql
      .raw(`drop ${keyword} if exists ${escapeMysqlIdentifier(objectName)}`)
      .execute(database);
  }

  return objectNames.length;
}

async function resetApplicationDatabase(
  database: Kysely<unknown>,
  options: {
    readonly databaseName: string;
    readonly logger?: DatabaseProcessLogger;
  },
) {
  const databaseName = options.databaseName.trim();

  if (!databaseName) {
    throw new Error("DB_NAME is required for db:refresh.");
  }

  options.logger?.info(`Refreshing database ${databaseName}`);
  await sql.raw("set foreign_key_checks = 0").execute(database);

  try {
    const droppedViews = await dropDatabaseObjects(database, {
      databaseName,
      kind: "view",
      logger: options.logger,
    });
    const droppedTables = await dropDatabaseObjects(database, {
      databaseName,
      kind: "table",
      logger: options.logger,
    });

    return {
      views: droppedViews,
      tables: droppedTables,
    };
  } finally {
    await sql.raw("set foreign_key_checks = 1").execute(database);
  }
}

export async function freshApplicationDatabase(
  database: Kysely<unknown>,
  options: {
    readonly databaseName: string;
    readonly logger?: DatabaseProcessLogger;
  },
): Promise<DatabaseFreshResult> {
  const dropped = await resetApplicationDatabase(database, options);
  const prepared = await prepareApplicationDatabase(database, {
    logger: options.logger,
  });

  return {
    dropped,
    migrations: prepared.migrations,
    seeders: prepared.seeders,
  };
}
