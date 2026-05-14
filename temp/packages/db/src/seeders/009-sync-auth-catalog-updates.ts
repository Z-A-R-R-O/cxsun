import type { Kysely } from "kysely";
import { authPolicyActionDefinitions, authPolicyModuleList, authRoleBlueprints } from "@cxnext/types";
import { defineDatabaseSeeder } from "../process/types";

type DynamicDatabase = Record<string, Record<string, unknown>>;

function asQueryDatabase(database: Kysely<unknown>) {
  return database as unknown as Kysely<DynamicDatabase>;
}

export const syncAuthCatalogUpdatesSeeder = defineDatabaseSeeder({
  id: "security:auth:002-sync-auth-catalog-updates",
  appId: "security",
  moduleKey: "auth",
  name: "Sync auth catalog updates and role permissions",
  order: 905,
  run: async ({ database }) => {
    const db = asQueryDatabase(database);
    const now = new Date();

    for (const action of authPolicyActionDefinitions) {
      const existing = await db
        .selectFrom("auth_policy_actions")
        .select("id")
        .where("action_key", "=", action.key)
        .executeTakeFirst();

      if (!existing) {
        await db
          .insertInto("auth_policy_actions")
          .values({
            action_key: action.key,
            name: action.name,
            description: action.description,
            is_system: action.isSystem,
            is_active: true,
            created_at: now,
            updated_at: now,
          })
          .execute();
      }
    }

    for (const moduleDefinition of authPolicyModuleList) {
      const existingModule = await db
        .selectFrom("auth_permission_modules")
        .select("id")
        .where("module_key", "=", moduleDefinition.key)
        .executeTakeFirst();

      if (!existingModule) {
        await db
          .insertInto("auth_permission_modules")
          .values({
            module_key: moduleDefinition.key,
            name: moduleDefinition.name,
            bounded_context: moduleDefinition.boundedContext,
            description: moduleDefinition.description,
            is_system: true,
            is_active: true,
            created_at: now,
            updated_at: now,
          })
          .execute();
      }

      for (const action of moduleDefinition.actions) {
        const permissionKey = `${moduleDefinition.key}.${action}`;
        const existing = await db
          .selectFrom("auth_permissions")
          .select("id")
          .where("permission_key", "=", permissionKey)
          .executeTakeFirst();

        if (!existing) {
          await db
            .insertInto("auth_permissions")
            .values({
              permission_key: permissionKey,
              name: `${moduleDefinition.name} ${action}`,
              module_key: moduleDefinition.key,
              action,
              description: `Allows ${action} access for ${moduleDefinition.description}`,
              is_active: true,
              created_at: now,
              updated_at: now,
            })
            .execute();
        }
      }
    }

    const roleIds = (await db
      .selectFrom("auth_roles")
      .select(["id", "role_key"])
      .execute()) as Array<{ id: number | bigint; role_key: string }>;
    const permissionIds = (await db
      .selectFrom("auth_permissions")
      .select(["id", "permission_key"])
      .execute()) as Array<{ id: number | bigint; permission_key: string }>;
    const permissionIdByKey = new Map(permissionIds.map((permission) => [permission.permission_key, Number(permission.id)]));

    for (const role of roleIds) {
      const blueprint = authRoleBlueprints.find((item) => item.key === role.role_key);
      if (!blueprint) {
        continue;
      }

      for (const permissionKey of blueprint.permissionKeys) {
        const permissionId = permissionIdByKey.get(permissionKey);
        if (!permissionId) {
          continue;
        }
        const existing = await db
          .selectFrom("auth_role_permissions")
          .select("role_id")
          .where("role_id", "=", Number(role.id))
          .where("permission_id", "=", permissionId)
          .executeTakeFirst();
        if (!existing) {
          await db
            .insertInto("auth_role_permissions")
            .values({
              role_id: Number(role.id),
              permission_id: permissionId,
              created_at: now,
            })
            .execute();
        }
      }
    }
  },
});
