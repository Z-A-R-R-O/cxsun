import { createCommonMasterMigration } from "./common-master-migration";
import { commonMasterGroups, getCommonMasterDefinitions } from "./common-master-groups";

export const locationCommonMigrations = getCommonMasterDefinitions(commonMasterGroups.location).map(
  (definition, index) => createCommonMasterMigration(definition, 50 + index),
);
