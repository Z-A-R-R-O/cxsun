import {
  authPermissionKeys,
  authPolicyModuleList,
  authPolicyModules,
  authRoleBlueprints,
  buildAuthPermissionKey,
  permissionsForModules,
  type AuthPolicyAction,
  type AuthPolicyModuleKey,
  type AuthRoleBlueprint,
} from "@cxnext/types";
import type { BillingEntryKind, MoneyEntryKind } from "../../../entries/domain/entry-record";

export {
  authPermissionKeys,
  authPolicyModuleList,
  authPolicyModules,
  authRoleBlueprints,
  buildAuthPermissionKey,
  permissionsForModules,
  type AuthPolicyAction,
  type AuthPolicyModuleKey,
  type AuthRoleBlueprint,
};

export function resolveEntryPolicyModule(kind: string): AuthPolicyModuleKey | null {
  if (kind === "sales" || kind === "purchase" || kind === "payment" || kind === "receipt") {
    return kind;
  }

  return null;
}

export function resolveEntryPermission(
  kind: BillingEntryKind | MoneyEntryKind | string,
  action: AuthPolicyAction,
) {
  const moduleKey = resolveEntryPolicyModule(kind);
  return moduleKey ? buildAuthPermissionKey(moduleKey, action) : authPermissionKeys.auth.read;
}

export function buildScopedPermission(moduleKey: AuthPolicyModuleKey, action: AuthPolicyAction) {
  return buildAuthPermissionKey(moduleKey, action);
}
