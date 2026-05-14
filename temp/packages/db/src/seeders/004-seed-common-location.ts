import { defineDatabaseSeeder } from "../process/types";

export const seedCommonLocationSeeder = defineDatabaseSeeder({
  id: "common:location:001-seed-location-tables",
  appId: "common",
  moduleKey: "location",
  name: "Seed common location tables",
  order: 40,
  run: async () => {},
});
