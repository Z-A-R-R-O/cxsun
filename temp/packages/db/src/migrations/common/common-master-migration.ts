import { sql, type Kysely } from "kysely";

import type { CommonModuleColumn, CommonModuleDefinition } from "../../common-modules";
import { defineDatabaseMigration } from "../../process/types";

type DynamicDatabase = Record<string, Record<string, unknown>>;

function asQueryDatabase(database: Kysely<unknown>) {
  return database as unknown as Kysely<DynamicDatabase>;
}

function resolveColumnType(column: CommonModuleColumn) {
  if (column.type === "boolean") return "boolean";
  if (column.type === "number") return column.numberMode === "decimal" ? "decimal" : "integer";
  return "varchar(255)";
}

export function createCommonMasterMigration(definition: CommonModuleDefinition, order: number) {
  return defineDatabaseMigration({
    id: `common:${definition.key}:001-create-${definition.tableName}`,
    appId: "common",
    moduleKey: definition.key,
    name: `Create ${definition.label} table`,
    order,
    up: async ({ database }) => {
      const queryDatabase = asQueryDatabase(database);
      let builder = queryDatabase.schema
        .createTable(definition.tableName)
        .ifNotExists()
        .addColumn("id", "integer", (column) => column.primaryKey().autoIncrement());

      for (const column of definition.columns) {
        builder = builder.addColumn(
          column.key,
          resolveColumnType(column) as any,
          (columnBuilder) => {
            let next = columnBuilder;
            if (column.nullable === false || column.required) next = next.notNull();
            if (column.type === "boolean") next = next.notNull().defaultTo(false);
            if (column.type === "number" && !column.required) next = next.defaultTo(0);
            return next;
          },
        );
      }

      await builder
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
        .createIndex(`idx_${definition.tableName}_${definition.defaultSortKey}`)
        .ifNotExists()
        .on(definition.tableName)
        .column(definition.defaultSortKey)
        .execute();
    },
  });
}
