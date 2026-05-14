import { createTenantsMigration } from "@cxnext/db";

export const tenantDatabaseMigrations = [createTenantsMigration] as const;
