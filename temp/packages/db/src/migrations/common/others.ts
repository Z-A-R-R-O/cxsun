import { createCommonMasterMigration } from "./common-master-migration";
import { commonMasterGroups, getCommonMasterDefinitions } from "./common-master-groups";

export const othersCommonMigrations = getCommonMasterDefinitions(commonMasterGroups.others).map(
  (definition, index) => createCommonMasterMigration(definition, 90 + index),
);
