import { sql, type Kysely } from "kysely";
import { defineDatabaseMigration } from "../process/types";

type DynamicDatabase = Record<string, Record<string, unknown>>;

function asQueryDatabase(database: Kysely<unknown>) {
  return database as unknown as Kysely<DynamicDatabase>;
}

export const createQueueJobsMigration = defineDatabaseMigration({
  id: "platform:queue:001-create-queue-jobs",
  appId: "platform",
  moduleKey: "queue",
  name: "Create queue jobs",
  order: 139,
  up: async ({ database }) => {
    const db = asQueryDatabase(database);

    await db.schema
      .createTable("queue_jobs")
      .ifNotExists()
      .addColumn("id", "bigint", (column) => column.primaryKey().autoIncrement())
      .addColumn("queue_name", "varchar(120)", (column) => column.notNull())
      .addColumn("job_name", "varchar(160)", (column) => column.notNull())
      .addColumn("status", "varchar(32)", (column) => column.notNull())
      .addColumn("payload_json", "text", (column) => column.notNull())
      .addColumn("result_json", "text", (column) => column.notNull().defaultTo(sql`'{}'`))
      .addColumn("progress_percent", "bigint", (column) => column.notNull().defaultTo(0))
      .addColumn("attempts_made", "bigint", (column) => column.notNull().defaultTo(0))
      .addColumn("max_attempts", "bigint", (column) => column.notNull().defaultTo(3))
      .addColumn("priority", "bigint", (column) => column.notNull().defaultTo(0))
      .addColumn("company_id", "bigint")
      .addColumn("requested_by_user_id", "varchar(64)")
      .addColumn("requested_by_name", "varchar(160)")
      .addColumn("available_at", "datetime", (column) =>
        column.notNull().defaultTo(sql`CURRENT_TIMESTAMP`),
      )
      .addColumn("locked_at", "datetime")
      .addColumn("started_at", "datetime")
      .addColumn("finished_at", "datetime")
      .addColumn("last_error", "text")
      .addColumn("created_at", "datetime", (column) =>
        column.notNull().defaultTo(sql`CURRENT_TIMESTAMP`),
      )
      .addColumn("updated_at", "datetime", (column) =>
        column.notNull().defaultTo(sql`CURRENT_TIMESTAMP`),
      )
      .execute();

    await db.schema
      .createIndex("idx_queue_jobs_status_available")
      .ifNotExists()
      .on("queue_jobs")
      .columns(["status", "available_at"])
      .execute();

    await db.schema
      .createIndex("idx_queue_jobs_queue_created")
      .ifNotExists()
      .on("queue_jobs")
      .columns(["queue_name", "created_at"])
      .execute();
  },
});
