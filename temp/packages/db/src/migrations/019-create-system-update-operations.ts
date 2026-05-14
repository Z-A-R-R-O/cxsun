import { sql, type Kysely } from "kysely";
import { defineDatabaseMigration } from "../process/types";

type DynamicDatabase = Record<string, Record<string, unknown>>;

function asQueryDatabase(database: Kysely<unknown>) {
  return database as unknown as Kysely<DynamicDatabase>;
}

export const createSystemUpdateOperationsMigration = defineDatabaseMigration({
  id: "operations:system-update:001-create-system-update-operations",
  appId: "operations",
  moduleKey: "system-update",
  name: "Create system update operation history",
  order: 1900,
  up: async ({ database }) => {
    const db = asQueryDatabase(database);

    await db.schema
      .createTable("system_update_operations")
      .ifNotExists()
      .addColumn("id", "bigint", (column) => column.primaryKey().autoIncrement())
      .addColumn("operation_id", "varchar(191)", (column) => column.notNull().unique())
      .addColumn("action", "varchar(64)", (column) => column.notNull())
      .addColumn("status", "varchar(64)", (column) => column.notNull())
      .addColumn("message", "text")
      .addColumn("progress_percent", "integer", (column) => column.notNull().defaultTo(0))
      .addColumn("deploy_dir", "varchar(500)")
      .addColumn("git_branch", "varchar(191)")
      .addColumn("git_url", "varchar(500)")
      .addColumn("local_commit", "varchar(64)")
      .addColumn("remote_commit", "varchar(64)")
      .addColumn("previous_commit", "varchar(64)")
      .addColumn("target_commit", "varchar(64)")
      .addColumn("stdout", "text")
      .addColumn("stderr", "text")
      .addColumn("result_json", "json")
      .addColumn("requested_by_user_id", "varchar(64)")
      .addColumn("requested_by_name", "varchar(191)")
      .addColumn("started_at", "timestamp", (column) => column.notNull())
      .addColumn("finished_at", "timestamp")
      .addColumn("created_at", "timestamp", (column) => column.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
      .addColumn("updated_at", "timestamp", (column) => column.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
      .execute();

    await db.schema
      .createIndex("idx_system_update_operations_status")
      .ifNotExists()
      .on("system_update_operations")
      .column("status")
      .execute();

    await db.schema
      .createIndex("idx_system_update_operations_started")
      .ifNotExists()
      .on("system_update_operations")
      .column("started_at")
      .execute();
  },
});
