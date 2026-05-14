export interface TenantDatabaseAdapter {
  readonly tableName: "tenants";
}

export const tenantDatabaseAdapter: TenantDatabaseAdapter = {
  tableName: "tenants",
};
