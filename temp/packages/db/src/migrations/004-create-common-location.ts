import { defineDatabaseMigration } from "../process/types";

export const createCommonLocationMigration = defineDatabaseMigration({
  id: "common:location:001-create-location-tables",
  appId: "common",
  moduleKey: "location",
  name: "Create common location tables",
  order: 40,
  up: async () => {},
});
