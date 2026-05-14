import type { Kysely } from "kysely";

import { defineDatabaseSeeder } from "../process/types";

type DynamicDatabase = Record<string, Record<string, unknown>>;

interface TenantSeed {
  readonly name: string;
  readonly slug: string;
  readonly is_active: boolean;
  readonly created_at: string;
  readonly updated_at: string;
  readonly deleted_at: string | null;
}

const tenantSeeds: readonly TenantSeed[] = [
  {
    name: "codexsun",
    slug: "codexsun",
    is_active: true,
    created_at: "2026-04-28 09:00:00",
    updated_at: "2026-04-28 09:00:00",
    deleted_at: null,
  },
];

function asQueryDatabase(database: Kysely<unknown>) {
  return database as unknown as Kysely<DynamicDatabase>;
}

export const seedTenantsSeeder = defineDatabaseSeeder({
  id: "organisation:tenants:001-seed-tenants",
  appId: "organisation",
  moduleKey: "tenants",
  name: "Seed default tenants",
  order: 10,
  run: async ({ database }) => {
    const queryDatabase = asQueryDatabase(database);

    for (const tenant of tenantSeeds) {
      const existingTenant = await queryDatabase
        .selectFrom("tenants")
        .select("slug")
        .where("slug", "=", tenant.slug)
        .executeTakeFirst();

      if (existingTenant) {
        continue;
      }

      await queryDatabase
        .insertInto("tenants")
        .values({ ...tenant })
        .execute();
    }
  },
});
