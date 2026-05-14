import { commonDefinition, defaultRow, simpleRowsWithDefault } from "./common-master-definitions";
import { createCommonMasterSeeder } from "./common-master-seeder";

export const ordersCommonSeeders = [
  createCommonMasterSeeder(commonDefinition("warehouses"), 80, [
    defaultRow({
      is_default_location: false,
      country: "-",
      state: "-",
      district: "-",
      city: "-",
      pincode: "-",
      address_line1: null,
      address_line2: null,
    }),
    {
      code: "MAIN",
      name: "Main Warehouse",
      is_default_location: true,
      country: null,
      state: null,
      district: null,
      city: null,
      pincode: null,
      address_line1: "Main stock location",
      address_line2: null,
      description: "Primary warehouse",
    },
  ]),
  createCommonMasterSeeder(
    commonDefinition("transports"),
    81,
    simpleRowsWithDefault([["ROAD", "Road"]]),
  ),
  createCommonMasterSeeder(
    commonDefinition("destinations"),
    82,
    simpleRowsWithDefault([["DOM", "Domestic"]]),
  ),
  createCommonMasterSeeder(
    commonDefinition("orderTypes"),
    83,
    simpleRowsWithDefault([["SALE", "Sales Order"]]),
  ),
  createCommonMasterSeeder(
    commonDefinition("stockRejectionTypes"),
    84,
    simpleRowsWithDefault([["DMG", "Damaged"]]),
  ),
] as const;
