import type { Kysely } from "kysely";
import { defineDatabaseSeeder } from "../process/types";

type DynamicDatabase = Record<string, Record<string, unknown>>;

function asQueryDatabase(database: Kysely<unknown>) {
  return database as unknown as Kysely<DynamicDatabase>;
}

export const seedEntriesSeeder = defineDatabaseSeeder({
  id: "billing:entries:001-seed-basic-billing",
  appId: "billing",
  moduleKey: "entries",
  name: "Seed basic billing entries",
  order: 110,
  run: async ({ database }) => {
    const queryDatabase = asQueryDatabase(database);

    await queryDatabase.deleteFrom("receipt_allocations").execute();
    await queryDatabase.deleteFrom("receipts").execute();
    await queryDatabase.deleteFrom("payment_allocations").execute();
    await queryDatabase.deleteFrom("payments").execute();
    await queryDatabase.deleteFrom("purchase_items").execute();
    await queryDatabase.deleteFrom("purchases").execute();
    await queryDatabase.deleteFrom("sales_items").execute();
    await queryDatabase.deleteFrom("sales").execute();
  },
});
