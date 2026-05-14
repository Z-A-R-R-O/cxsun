import { sql, type Kysely } from "kysely";
import { defineDatabaseMigration } from "../process/types";

type DynamicDatabase = Record<string, Record<string, unknown>>;

interface ConstraintRow {
  readonly constraint_name: string;
}

function asQueryDatabase(database: Kysely<unknown>) {
  return database as unknown as Kysely<DynamicDatabase>;
}

const entryTables = [
  ["sales", "invoice_no"],
  ["purchases", "bill_no"],
  ["payments", "payment_no"],
  ["receipts", "receipt_no"],
] as const;

export const enforceEntryContextReferencesMigration = defineDatabaseMigration({
  id: "billing:entries:005-enforce-company-accounting-year-references",
  appId: "billing",
  moduleKey: "entries",
  name: "Enforce entry company and accounting year references",
  order: 114,
  up: async ({ database }) => {
    const db = asQueryDatabase(database);

    for (const [table, documentNoColumn] of entryTables) {
      await sql`
        ALTER TABLE ${sql.table(table)}
          MODIFY COLUMN company_id bigint NOT NULL,
          MODIFY COLUMN accounting_year_id bigint NOT NULL
      `.execute(db);

      await sql`
        ALTER TABLE ${sql.table(table)}
          DROP INDEX IF EXISTS ${sql.id(`uq_${table}_document_no`)}
      `.execute(db);

      await db.schema
        .createIndex(`idx_${table}_company_year`)
        .ifNotExists()
        .on(table)
        .columns(["company_id", "accounting_year_id"])
        .execute();

      await db.schema
        .createIndex(`uq_${table}_document_context`)
        .ifNotExists()
        .on(table)
        .columns(["company_id", "accounting_year_id", documentNoColumn])
        .unique()
        .execute();

      await addForeignKeyIfMissing(db, table, `${table}_company_id_foreign`, {
        column: "company_id",
        referenceTable: "companies",
        referenceColumn: "id",
      });
      await addForeignKeyIfMissing(db, table, `${table}_accounting_year_id_foreign`, {
        column: "accounting_year_id",
        referenceTable: "accounting_years",
        referenceColumn: "id",
      });
    }
  },
});

async function addForeignKeyIfMissing(
  db: Kysely<DynamicDatabase>,
  table: string,
  constraintName: string,
  reference: {
    readonly column: string;
    readonly referenceTable: string;
    readonly referenceColumn: string;
  },
) {
  const existing = await sql<ConstraintRow>`
    select constraint_name
    from information_schema.table_constraints
    where constraint_schema = database()
      and table_name = ${table}
      and constraint_name = ${constraintName}
      and constraint_type = 'FOREIGN KEY'
    limit 1
  `.execute(db);

  if (existing.rows.length > 0) {
    return;
  }

  await sql`
    ALTER TABLE ${sql.table(table)}
      ADD CONSTRAINT ${sql.id(constraintName)}
      FOREIGN KEY (${sql.id(reference.column)})
      REFERENCES ${sql.table(reference.referenceTable)} (${sql.id(reference.referenceColumn)})
  `.execute(db);
}
