import type { Kysely } from "kysely";

import {
  commonDefinition,
  rowsWithDefault,
  simpleRows,
  simpleRowsWithDefault,
} from "./common-master-definitions";
import { createCommonMasterSeeder } from "./common-master-seeder";
import { defineDatabaseSeeder } from "../../process/types";

type DynamicDatabase = Record<string, Record<string, unknown>>;

function asQueryDatabase(database: Kysely<unknown>) {
  return database as unknown as Kysely<DynamicDatabase>;
}

const contactTypeSeedRows = [
  { code: "SUPPLIER", name: "Supplier", description: "Supplier default" },
  { code: "CUSTOMER", name: "Customer", description: "Customer default" },
  {
    code: "VENDOR-CUSTOMER",
    name: "Vendor Customer",
    description: "Vendor Customer default",
  },
  { code: "STAFF", name: "Staff", description: "Staff default" },
] as const;

async function upsertContactTypeByCode(
  database: Kysely<DynamicDatabase>,
  row: (typeof contactTypeSeedRows)[number],
  timestamp: string,
) {
  const existing = await database
    .selectFrom("common_contact_types")
    .select("id")
    .where("code", "=", row.code)
    .executeTakeFirst();

  if (existing) {
    await database
      .updateTable("common_contact_types")
      .set({
        name: row.name,
        description: row.description,
        is_active: true,
        updated_at: timestamp,
        deleted_at: null,
      })
      .where("id", "=", existing.id)
      .execute();
    return;
  }

  await database
    .insertInto("common_contact_types")
    .values({
      code: row.code,
      name: row.name,
      description: row.description,
      is_active: true,
      created_at: timestamp,
      updated_at: timestamp,
      deleted_at: null,
    })
    .execute();
}

const normalizeContactTypesSeeder = defineDatabaseSeeder({
  id: "common:contactTypes:002-normalize-contact-type-names",
  appId: "common",
  moduleKey: "contactTypes",
  name: "Normalize contact type names",
  order: 61.1,
  run: async ({ database }) => {
    const queryDatabase = asQueryDatabase(database);
    const timestamp = "2026-05-13 09:00:00";
    const defaultContactType =
      (await queryDatabase
        .selectFrom("common_contact_types")
        .select("id")
        .where("code", "=", "-")
        .orderBy("id", "asc")
        .executeTakeFirst()) ??
      (await queryDatabase
        .selectFrom("common_contact_types")
        .select("id")
        .where("name", "=", "-")
        .orderBy("id", "asc")
        .executeTakeFirst());

    if (defaultContactType) {
      await queryDatabase
        .updateTable("common_contact_types")
        .set({
          code: "VC",
          name: "Vendor Customer",
          description: "Vendor Customer default",
          is_active: true,
          updated_at: timestamp,
          deleted_at: null,
        })
        .where("id", "=", defaultContactType.id)
        .execute();
    } else {
      const vendorCustomerDefault = await queryDatabase
        .selectFrom("common_contact_types")
        .select("id")
        .where("code", "=", "VC")
        .executeTakeFirst();

      if (vendorCustomerDefault) {
        await queryDatabase
          .updateTable("common_contact_types")
          .set({
            name: "Vendor Customer",
            description: "Vendor Customer default",
            is_active: true,
            updated_at: timestamp,
            deleted_at: null,
          })
          .where("id", "=", vendorCustomerDefault.id)
          .execute();
      } else {
        await queryDatabase
          .insertInto("common_contact_types")
          .values({
            code: "VC",
            name: "Vendor Customer",
            description: "Vendor Customer default",
            is_active: true,
            created_at: timestamp,
            updated_at: timestamp,
            deleted_at: null,
          })
          .execute();
      }
    }

    for (const row of contactTypeSeedRows) {
      await upsertContactTypeByCode(queryDatabase, row, timestamp);
    }
  },
});

export const contactsCommonSeeders = [
  createCommonMasterSeeder(
    commonDefinition("contactGroups"),
    60,
    simpleRowsWithDefault([
      ["CUST", "Customer"],
      ["ECOM-CUST", "Ecommerce Customer"],
      ["COLD-CUST", "Cold Customer"],
      ["VEND", "Vendor"],
      ["STAFF", "Staff"],
      ["LABOUR", "Labour"],
      ["MANAGER", "Manager"],
      ["SUPPLIER", "Supplier"],
      ["VENDOR-CUSTOMER", "Vendor Customer"],
      ["AGENT", "Agent"],
      ["TRANSPORTER", "Transporter"],
    ]),
  ),
  createCommonMasterSeeder(
    commonDefinition("contactTypes"),
    61,
    rowsWithDefault(
      simpleRows([
        ["SUPPLIER", "Supplier"],
        ["CUSTOMER", "Customer"],
        ["VENDOR-CUSTOMER", "Vendor Customer"],
        ["STAFF", "Staff"],
      ]),
      {
        code: "VC",
        description: "Vendor Customer default",
        name: "Vendor Customer",
      },
    ),
  ),
  normalizeContactTypesSeeder,
  createCommonMasterSeeder(
    commonDefinition("addressTypes"),
    62,
    simpleRows([
      ["BILL", "Billing Address"],
      ["SHIP", "Shipping Address"],
      ["SECONDARY", "Secondary Address"],
      ["THIRD", "Third Address"],
    ]),
  ),
  createCommonMasterSeeder(
    commonDefinition("bankNames"),
    63,
    simpleRowsWithDefault([
      ["SBI", "State Bank of India"],
      ["HDFC", "HDFC Bank"],
      ["ICICI", "ICICI Bank"],
      ["AXIS", "Axis Bank"],
      ["KOTAK", "Kotak Mahindra Bank"],
      ["PNB", "Punjab National Bank"],
      ["BOB", "Bank of Baroda"],
      ["CANARA", "Canara Bank"],
      ["UNION", "Union Bank of India"],
      ["BOI", "Bank of India"],
      ["INDIAN", "Indian Bank"],
      ["IOB", "Indian Overseas Bank"],
      ["CBI", "Central Bank of India"],
      ["UCO", "UCO Bank"],
      ["BOM", "Bank of Maharashtra"],
      ["PSB", "Punjab and Sind Bank"],
      ["IDBI", "IDBI Bank"],
      ["YES", "Yes Bank"],
      ["IDFC", "IDFC First Bank"],
      ["FEDERAL", "Federal Bank"],
      ["SIB", "South Indian Bank"],
      ["KVB", "Karur Vysya Bank"],
      ["CUB", "City Union Bank"],
      ["TMB", "Tamilnad Mercantile Bank"],
      ["DCB", "DCB Bank"],
      ["RBL", "RBL Bank"],
      ["BANDHAN", "Bandhan Bank"],
      ["CSB", "CSB Bank"],
      ["DHAN", "Dhanlaxmi Bank"],
      ["JKB", "Jammu and Kashmir Bank"],
      ["KBL", "Karnataka Bank"],
      ["AUBANK", "AU Small Finance Bank"],
      ["EQUITAS", "Equitas Small Finance Bank"],
      ["UJJIVAN", "Ujjivan Small Finance Bank"],
      ["ESAF", "ESAF Small Finance Bank"],
      ["FINCARE", "Fincare Small Finance Bank"],
      ["JANA", "Jana Small Finance Bank"],
      ["SURYODAY", "Suryoday Small Finance Bank"],
      ["UTKARSH", "Utkarsh Small Finance Bank"],
      ["NSDL", "NSDL Payments Bank"],
      ["AIRTELPB", "Airtel Payments Bank"],
      ["INDIAPOSTPB", "India Post Payments Bank"],
      ["FINO", "Fino Payments Bank"],
    ]),
  ),
] as const;
