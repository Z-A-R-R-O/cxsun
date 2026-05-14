import { seedTenantsSeeder } from "./001-seed-tenants";
import { seedIndustriesSeeder } from "./002-seed-industries";
import { seedCompaniesSeeder } from "./003-seed-companies";
import { seedCommonLocationSeeder } from "./004-seed-common-location";
import { normalizeDefaultContactSeeder, seedContactsSeeder } from "./005-seed-contacts";
import { seedProductsSeeder } from "./006-seed-products";
import { seedEntriesSeeder } from "./007-seed-entries";
import { seedAuthRbacSeeder } from "./008-seed-auth-rbac";
import { syncAuthCatalogUpdatesSeeder } from "./009-sync-auth-catalog-updates";
import { syncStockAuthCatalogSeeder } from "./010-sync-stock-auth-catalog";
import {
  contactsCommonSeeders,
  locationCommonSeeders,
  ordersCommonSeeders,
  othersCommonSeeders,
  productCommonSeeders,
} from "./common";

export const databaseSeeders = [
  seedTenantsSeeder,
  seedIndustriesSeeder,
  seedCompaniesSeeder,
  seedCommonLocationSeeder,
  ...locationCommonSeeders,
  ...contactsCommonSeeders,
  seedContactsSeeder,
  normalizeDefaultContactSeeder,
  ...productCommonSeeders,
  ...ordersCommonSeeders,
  ...othersCommonSeeders,
  seedProductsSeeder,
  seedEntriesSeeder,
  seedAuthRbacSeeder,
  syncAuthCatalogUpdatesSeeder,
  syncStockAuthCatalogSeeder,
] as const;

export { seedTenantsSeeder };
export { seedIndustriesSeeder };
export { seedCompaniesSeeder };
export { seedCommonLocationSeeder };
export { normalizeDefaultContactSeeder, seedContactsSeeder };
export { seedProductsSeeder };
export { seedEntriesSeeder };
export { seedAuthRbacSeeder };
export { syncAuthCatalogUpdatesSeeder };
export { syncStockAuthCatalogSeeder };
export {
  contactsCommonSeeders,
  locationCommonSeeders,
  ordersCommonSeeders,
  othersCommonSeeders,
  productCommonSeeders,
};
