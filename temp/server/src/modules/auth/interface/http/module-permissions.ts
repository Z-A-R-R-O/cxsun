import { buildScopedPermission, resolveEntryPermission, type AuthPolicyAction, type AuthPolicyModuleKey } from "../../domain/services/rbac-catalog";

export function modulePermission(moduleKey: AuthPolicyModuleKey, action: AuthPolicyAction) {
  return buildScopedPermission(moduleKey, action);
}

export function entryPermission(action: AuthPolicyAction) {
  return (request: { readonly params?: Record<string, string | undefined> }) => [
    resolveEntryPermission(request.params?.kind ?? "", action),
  ] as const;
}
