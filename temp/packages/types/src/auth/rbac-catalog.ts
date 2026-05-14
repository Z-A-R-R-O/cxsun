export const authPolicyActions = ["read", "list", "create", "update", "delete", "report", "run"] as const;

export type AuthPolicyAction = (typeof authPolicyActions)[number];

export type AuthPolicyModuleKey =
  | "auth"
  | "mail"
  | "tenant"
  | "industry"
  | "company"
  | "contact"
  | "product"
  | "stock"
  | "sales"
  | "purchase"
  | "payment"
  | "receipt"
  | "common"
  | "system-update";

export interface AuthPolicyModuleDefinition {
  readonly key: AuthPolicyModuleKey;
  readonly name: string;
  readonly boundedContext: string;
  readonly actions: readonly AuthPolicyAction[];
  readonly description: string;
}

export interface AuthPolicyActionDefinition {
  readonly key: AuthPolicyAction;
  readonly name: string;
  readonly description: string;
  readonly isSystem: boolean;
}

export interface AuthRoleBlueprint {
  readonly key: string;
  readonly name: string;
  readonly description: string;
  readonly permissionKeys: readonly string[];
  readonly isSystem: boolean;
}

export const authPolicyModules = {
  auth: {
    key: "auth",
    name: "Auth",
    boundedContext: "security",
    actions: ["read", "list", "create", "update", "delete", "report"],
    description: "Identity, session, user administration, and role assignment.",
  },
  mail: {
    key: "mail",
    name: "Mail",
    boundedContext: "operations",
    actions: ["read", "list", "create", "update", "delete", "report"],
    description: "Outbound delivery, sender configuration, template preview, and operational logs.",
  },
  tenant: {
    key: "tenant",
    name: "Tenant",
    boundedContext: "organisation",
    actions: ["read", "list", "create", "update", "delete", "report"],
    description: "Tenant lifecycle, workspace provisioning, and tenant administration.",
  },
  industry: {
    key: "industry",
    name: "Industry",
    boundedContext: "organisation",
    actions: ["read", "list", "create", "update", "delete", "report"],
    description: "Industry records used for organisation classification.",
  },
  company: {
    key: "company",
    name: "Company",
    boundedContext: "organisation",
    actions: ["read", "list", "create", "update", "delete", "report"],
    description: "Company master records and organisation configuration.",
  },
  contact: {
    key: "contact",
    name: "Contact",
    boundedContext: "crm",
    actions: ["read", "list", "create", "update", "delete", "report"],
    description: "Contacts, parties, customer profiles, and supplier records.",
  },
  product: {
    key: "product",
    name: "Product",
    boundedContext: "catalog",
    actions: ["read", "list", "create", "update", "delete", "report"],
    description: "Product catalog, pricing, variants, and supporting metadata.",
  },
  stock: {
    key: "stock",
    name: "Stock",
    boundedContext: "billing",
    actions: ["read", "list", "create", "update", "delete", "report"],
    description: "Warehouse inventory, barcodes, serial numbers, batches, movements, and balances.",
  },
  sales: {
    key: "sales",
    name: "Sales",
    boundedContext: "entries",
    actions: ["read", "list", "create", "update", "delete", "report"],
    description: "Sales billing entries and downstream commercial documents.",
  },
  purchase: {
    key: "purchase",
    name: "Purchase",
    boundedContext: "entries",
    actions: ["read", "list", "create", "update", "delete", "report"],
    description: "Purchase billing entries and procurement documents.",
  },
  payment: {
    key: "payment",
    name: "Payment",
    boundedContext: "entries",
    actions: ["read", "list", "create", "update", "delete", "report"],
    description: "Outgoing payment entries and money movement records.",
  },
  receipt: {
    key: "receipt",
    name: "Receipt",
    boundedContext: "entries",
    actions: ["read", "list", "create", "update", "delete", "report"],
    description: "Incoming receipt entries and cash collection records.",
  },
  common: {
    key: "common",
    name: "Common",
    boundedContext: "shared",
    actions: ["read", "list", "create", "update", "delete", "report"],
    description: "Shared common masters and location records used across modules.",
  },
  "system-update": {
    key: "system-update",
    name: "System Update",
    boundedContext: "operations",
    actions: ["run", "read"],
    description: "Pull, build, restart, rollback, and inspect application update operations.",
  },
} as const satisfies Record<AuthPolicyModuleKey, AuthPolicyModuleDefinition>;

export const authPolicyModuleList = Object.values(authPolicyModules);

export const authPolicyActionDefinitions = [
  {
    key: "read",
    name: "Read",
    description: "Allow viewing a single record or detail surface.",
    isSystem: true,
  },
  {
    key: "list",
    name: "List",
    description: "Allow listing records and opening index surfaces.",
    isSystem: true,
  },
  {
    key: "create",
    name: "Create",
    description: "Allow creating new records.",
    isSystem: true,
  },
  {
    key: "update",
    name: "Update",
    description: "Allow editing existing records.",
    isSystem: true,
  },
  {
    key: "delete",
    name: "Delete",
    description: "Allow deleting or dropping records.",
    isSystem: true,
  },
  {
    key: "report",
    name: "Report",
    description: "Allow report and analytical output for a module.",
    isSystem: true,
  },
  {
    key: "run",
    name: "Run",
    description: "Allow executing operational commands for a module.",
    isSystem: true,
  },
] as const satisfies readonly AuthPolicyActionDefinition[];

export const authPermissionKeys = Object.fromEntries(
  authPolicyModuleList.map((moduleDefinition) => [
    moduleDefinition.key,
    Object.fromEntries(
      moduleDefinition.actions.map((action) => [
        action,
        buildAuthPermissionKey(moduleDefinition.key, action),
      ]),
    ),
  ]),
) as {
  readonly [TModuleKey in AuthPolicyModuleKey]: {
    readonly [TAction in ExtractSupportedAction<TModuleKey>]: string;
  };
};

export const authRoleBlueprints = [
  {
    key: "super_admin",
    name: "Super Admin",
    description: "Full access across every bounded context, tenant, and shared platform surface.",
    permissionKeys: authPolicyModuleList.flatMap((moduleDefinition) =>
      moduleDefinition.actions.map((action) =>
        buildAuthPermissionKey(moduleDefinition.key, action),
      ),
    ),
    isSystem: true,
  },
  {
    key: "admin",
    name: "Admin",
    description: "Tenant administration, user management, and full business module access.",
    permissionKeys: [
      ...permissionsForModules(["auth"], ["read", "list", "create", "update", "delete", "report"]),
      ...permissionsForModules(["mail"], ["read", "list", "create", "update", "delete", "report"]),
      ...permissionsForModules(["tenant"], ["read", "list", "report"]),
      ...permissionsForModules(
        ["industry", "company", "contact", "product", "stock", "sales", "purchase", "payment", "receipt", "common"],
        ["read", "list", "create", "update", "delete", "report"],
      ),
    ],
    isSystem: true,
  },
  {
    key: "manager",
    name: "Manager",
    description: "Operational ownership across business modules without auth administration.",
    permissionKeys: permissionsForModules(
      ["industry", "company", "contact", "product", "stock", "sales", "purchase", "payment", "receipt", "common", "mail"],
      ["read", "list", "create", "update", "delete", "report"],
    ),
    isSystem: true,
  },
  {
    key: "operator",
    name: "Operator",
    description: "Day-to-day data entry with update access across enabled business modules.",
    permissionKeys: permissionsForModules(
      ["industry", "company", "contact", "product", "stock", "sales", "purchase", "payment", "receipt", "common", "mail"],
      ["read", "list", "create", "update"],
    ),
    isSystem: true,
  },
  {
    key: "viewer",
    name: "Viewer",
    description: "Read-only visibility across the workspace.",
    permissionKeys: permissionsForModules(
      ["auth", "tenant", "industry", "company", "contact", "product", "stock", "sales", "purchase", "payment", "receipt", "common", "mail"],
      ["read", "list", "report"],
    ),
    isSystem: true,
  },
  {
    key: "web_client",
    name: "Web Client",
    description: "External client access for viewing catalog, contact, and sales-facing records.",
    permissionKeys: permissionsForModules(["contact", "product", "stock", "sales"], ["read", "list"]),
    isSystem: true,
  },
  {
    key: "premium_client",
    name: "Premium Client",
    description: "External client access with limited create and update workflows.",
    permissionKeys: permissionsForModules(["contact", "product", "stock", "sales"], ["read", "list", "create", "update", "report"]),
    isSystem: true,
  },
] as const satisfies readonly AuthRoleBlueprint[];

export function buildAuthPermissionKey(moduleKey: AuthPolicyModuleKey, action: AuthPolicyAction) {
  return `${moduleKey}.${action}`;
}

export function permissionsForModules(
  moduleKeys: readonly AuthPolicyModuleKey[],
  actions: readonly AuthPolicyAction[],
) {
  return moduleKeys.flatMap((moduleKey) =>
    actions
      .filter((action) =>
        (authPolicyModules[moduleKey].actions as readonly AuthPolicyAction[]).some(
          (supportedAction) => supportedAction === action,
        ),
      )
      .map((action) => buildAuthPermissionKey(moduleKey, action)),
  );
}

type ExtractSupportedAction<TModuleKey extends AuthPolicyModuleKey> =
  (typeof authPolicyModules)[TModuleKey]["actions"][number];
