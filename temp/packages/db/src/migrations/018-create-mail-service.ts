import { sql, type Kysely } from "kysely";
import { defineDatabaseMigration } from "../process/types";

type DynamicDatabase = Record<string, Record<string, unknown>>;

function asQueryDatabase(database: Kysely<unknown>) {
  return database as unknown as Kysely<DynamicDatabase>;
}

export const createMailServiceMigration = defineDatabaseMigration({
  id: "platform:mail:001-create-mail-service",
  appId: "platform",
  moduleKey: "mail",
  name: "Create mail messages and delivery attempts",
  order: 140,
  up: async ({ database }) => {
    const db = asQueryDatabase(database);

    await db.schema
      .createTable("mail_messages")
      .ifNotExists()
      .addColumn("id", "bigint", (column) => column.primaryKey().autoIncrement())
      .addColumn("tenant_id", "bigint")
      .addColumn("company_id", "bigint")
      .addColumn("queue_job_id", "bigint")
      .addColumn("template_key", "varchar(120)", (column) => column.notNull())
      .addColumn("category", "varchar(64)", (column) => column.notNull())
      .addColumn("subject", "varchar(255)", (column) => column.notNull())
      .addColumn("preview_text", "varchar(255)")
      .addColumn("html_body", "text", (column) => column.notNull())
      .addColumn("text_body", "text", (column) => column.notNull())
      .addColumn("status", "varchar(32)", (column) => column.notNull())
      .addColumn("from_email", "varchar(255)", (column) => column.notNull())
      .addColumn("from_name", "varchar(255)")
      .addColumn("reply_to", "varchar(255)")
      .addColumn("to_json", "text", (column) => column.notNull().defaultTo(sql`'[]'`))
      .addColumn("cc_json", "text", (column) => column.notNull().defaultTo(sql`'[]'`))
      .addColumn("bcc_json", "text", (column) => column.notNull().defaultTo(sql`'[]'`))
      .addColumn("attachments_json", "text", (column) => column.notNull().defaultTo(sql`'[]'`))
      .addColumn("provider_kind", "varchar(48)", (column) => column.notNull().defaultTo("smtp"))
      .addColumn("provider_message_id", "varchar(255)")
      .addColumn("requested_by_user_id", "varchar(64)")
      .addColumn("source_module", "varchar(64)")
      .addColumn("source_record_id", "varchar(128)")
      .addColumn("last_error", "text")
      .addColumn("sent_at", "datetime")
      .addColumn("created_at", "datetime", (column) =>
        column.notNull().defaultTo(sql`CURRENT_TIMESTAMP`),
      )
      .addColumn("updated_at", "datetime", (column) =>
        column.notNull().defaultTo(sql`CURRENT_TIMESTAMP`),
      )
      .execute();

    await db.schema
      .createTable("mail_delivery_attempts")
      .ifNotExists()
      .addColumn("id", "bigint", (column) => column.primaryKey().autoIncrement())
      .addColumn("mail_message_id", "bigint", (column) => column.notNull())
      .addColumn("queue_job_id", "bigint")
      .addColumn("attempt_no", "bigint", (column) => column.notNull().defaultTo(1))
      .addColumn("status", "varchar(32)", (column) => column.notNull())
      .addColumn("provider_response_json", "text", (column) => column.notNull().defaultTo(sql`'{}'`))
      .addColumn("error_message", "text")
      .addColumn("started_at", "datetime", (column) =>
        column.notNull().defaultTo(sql`CURRENT_TIMESTAMP`),
      )
      .addColumn("finished_at", "datetime")
      .addColumn("created_at", "datetime", (column) =>
        column.notNull().defaultTo(sql`CURRENT_TIMESTAMP`),
      )
      .execute();

    await db.schema
      .createIndex("idx_mail_messages_status_created")
      .ifNotExists()
      .on("mail_messages")
      .columns(["status", "created_at"])
      .execute();

    await db.schema
      .createIndex("idx_mail_messages_company_category")
      .ifNotExists()
      .on("mail_messages")
      .columns(["company_id", "category", "created_at"])
      .execute();

    await db.schema
      .createIndex("idx_mail_attempts_message")
      .ifNotExists()
      .on("mail_delivery_attempts")
      .columns(["mail_message_id", "attempt_no"])
      .execute();
  },
});
