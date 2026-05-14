import { defineDatabaseMigration } from "../process/types";

export const addCompanyBankAccountQrMigration = defineDatabaseMigration({
  id: "billing:companies:016-add-company-bank-account-qr",
  appId: "billing",
  moduleKey: "companies",
  name: "Add company bank account QR image",
  order: 138,
  up: async ({ database }) => {
    await database.schema
      .alterTable("company_bank_accounts")
      .addColumn("qr_image_url", "varchar(500)")
      .execute();
  },
});
