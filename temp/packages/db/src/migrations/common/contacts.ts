import { createCommonMasterMigration } from "./common-master-migration";
import { commonMasterGroups, getCommonMasterDefinitions } from "./common-master-groups";

export const contactsCommonMigrations = getCommonMasterDefinitions(commonMasterGroups.contacts).map(
  (definition, index) => createCommonMasterMigration(definition, 60 + index),
);
