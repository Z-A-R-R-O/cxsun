import type { Kysely } from "kysely";

import type { CommonModuleDefinition } from "../../common-modules";
import { defineDatabaseSeeder } from "../../process/types";

type DynamicDatabase = Record<string, Record<string, unknown>>;

function asQueryDatabase(database: Kysely<unknown>) {
  return database as unknown as Kysely<DynamicDatabase>;
}

export function createCommonMasterSeeder(
  definition: CommonModuleDefinition,
  order: number,
  rows: readonly Record<string, unknown>[],
) {
  return defineDatabaseSeeder({
    id: `common:${definition.key}:001-seed-${definition.tableName}`,
    appId: "common",
    moduleKey: definition.key,
    name: `Seed ${definition.label}`,
    order,
    run: async ({ database }) => {
      const queryDatabase = asQueryDatabase(database);
      const timestamp = "2026-04-28 09:00:00";
      const columnKeys = new Set(definition.columns.map((column) => column.key));

      for (const row of rows) {
        const existing = await queryDatabase
          .selectFrom(definition.tableName)
          .select("id")
          .where(definition.defaultSortKey, "=", row[definition.defaultSortKey])
          .executeTakeFirst();

        if (existing) continue;

        const rowValues = Object.fromEntries(
          Object.entries(row).filter(([key]) => columnKeys.has(key)),
        );

        await queryDatabase
          .insertInto(definition.tableName)
          .values({
            ...rowValues,
            is_active: true,
            created_at: timestamp,
            updated_at: timestamp,
            deleted_at: null,
          })
          .execute();
      }
    },
  });
}
