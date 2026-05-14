import { createCommonMasterMigration } from "./common-master-migration";
import { commonMasterGroups, getCommonMasterDefinitions } from "./common-master-groups";

export const productCommonMigrations = getCommonMasterDefinitions(commonMasterGroups.product).map(
  (definition, index) => createCommonMasterMigration(definition, 70 + index),
);
