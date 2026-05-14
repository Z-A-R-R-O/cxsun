import { createCommonMasterMigration } from "./common-master-migration";
import { commonMasterGroups, getCommonMasterDefinitions } from "./common-master-groups";

export const ordersCommonMigrations = getCommonMasterDefinitions(commonMasterGroups.orders).map(
  (definition, index) => createCommonMasterMigration(definition, 80 + index),
);
