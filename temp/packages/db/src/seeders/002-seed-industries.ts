import type { Kysely } from "kysely";

import { defineDatabaseSeeder } from "../process/types";

type DynamicDatabase = Record<string, Record<string, unknown>>;

interface IndustrySeed {
  readonly code: string;
  readonly name: string;
  readonly is_active: boolean;
  readonly created_at: string;
  readonly updated_at: string;
  readonly deleted_at: string | null;
}

const industrySeeds: readonly IndustrySeed[] = [
  ["100", "Garments"],
  ["200", "Garments - Ecommerce"],
  ["300", "Offset Printing"],
  ["400", "Upvc"],
  ["500", "Computer"],
  ["600", "Computer - Ecommerce"],
  ["700", "Auditor office"],
].map(([code, name], index) => ({
  code,
  name,
  is_active: true,
  created_at: `2026-04-28 ${String(9 + index).padStart(2, "0")}:00:00`,
  updated_at: `2026-04-28 ${String(9 + index).padStart(2, "0")}:00:00`,
  deleted_at: null,
}));

function asQueryDatabase(database: Kysely<unknown>) {
  return database as unknown as Kysely<DynamicDatabase>;
}

export const seedIndustriesSeeder = defineDatabaseSeeder({
  id: "organisation:industries:001-seed-industries",
  appId: "organisation",
  moduleKey: "industries",
  name: "Seed default industries",
  order: 20,
  run: async ({ database }) => {
    const queryDatabase = asQueryDatabase(database);

    for (const industry of industrySeeds) {
      const existingIndustry = await queryDatabase
        .selectFrom("industries")
        .select("code")
        .where("code", "=", industry.code)
        .executeTakeFirst();

      if (existingIndustry) {
        continue;
      }

      await queryDatabase
        .insertInto("industries")
        .values({ ...industry })
        .execute();
    }
  },
});
