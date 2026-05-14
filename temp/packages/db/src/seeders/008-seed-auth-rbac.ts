import { randomBytes, scryptSync } from "node:crypto";
import type { Kysely } from "kysely";
import { authPolicyActionDefinitions, authPolicyModuleList, authRoleBlueprints } from "@cxnext/types";

import { defineDatabaseSeeder } from "../process/types";

type DynamicDatabase = Record<string, Record<string, unknown>>;
const seededSuperAdmin = {
  username: "sundar",
  email: "sundar@sundar.com",
  displayName: "Super Admin",
  password: "Admin@1234",
};

function asQueryDatabase(database: Kysely<unknown>) {
  return database as unknown as Kysely<DynamicDatabase>;
}

function hashPassword(password: string) {
  const salt = randomBytes(16).toString("base64url");
  const hash = scryptSync(password, salt, 64).toString("base64url");

  return `scrypt$${salt}$${hash}`;
}

export const seedAuthRbacSeeder = defineDatabaseSeeder({
  id: "security:auth:001-seed-auth-rbac",
  appId: "security",
  moduleKey: "auth",
  name: "Seed auth roles, permissions, and default admin",
  order: 900,
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

    for (const role of authRoleBlueprints) {
      const existing = await db
        .selectFrom("auth_roles")
        .select("id")
        .where("role_key", "=", role.key)
        .executeTakeFirst();

      if (!existing) {
        await db
          .insertInto("auth_roles")
          .values({
            role_key: role.key,
            name: role.name,
            description: role.description,
            is_system: role.isSystem,
            is_active: true,
            created_at: now,
            updated_at: now,
          })
          .execute();
      }
    }

    const desiredRoleKeys = authRoleBlueprints.map((role) => role.key);
    const obsoleteRoles = (await db
      .selectFrom("auth_roles")
      .select(["id", "role_key"])
      .where("role_key", "not in", desiredRoleKeys)
      .execute()) as Array<{ id: number | bigint; role_key: string }>;

    for (const role of obsoleteRoles) {
      await db
        .deleteFrom("auth_user_roles")
        .where("role_id", "=", Number(role.id))
        .execute();
      await db
        .deleteFrom("auth_role_permissions")
        .where("role_id", "=", Number(role.id))
        .execute();
      await db.deleteFrom("auth_roles").where("id", "=", Number(role.id)).execute();
    }

    const seededRoles = (await db
      .selectFrom("auth_roles")
      .select(["id", "role_key"])
      .execute()) as Array<{ id: number | bigint; role_key: string }>;
    const seededPermissions = (await db
      .selectFrom("auth_permissions")
      .select(["id", "permission_key", "action"])
      .execute()) as Array<{ id: number | bigint; permission_key: string; action: string }>;
    const roleByKey = new Map(seededRoles.map((role) => [role.role_key, Number(role.id)]));

    const roleBlueprintByKey = new Map<string, (typeof authRoleBlueprints)[number]>(
      authRoleBlueprints.map((role) => [role.key, role]),
    );

    for (const permission of seededPermissions) {
      for (const [roleKey, roleId] of roleByKey) {
        const blueprint = roleBlueprintByKey.get(roleKey);
        if (!blueprint || !blueprint.permissionKeys.includes(permission.permission_key)) {
          continue;
        }

        const existing = await db
          .selectFrom("auth_role_permissions")
          .select("role_id")
          .where("role_id", "=", roleId)
          .where("permission_id", "=", Number(permission.id))
          .executeTakeFirst();

        if (!existing) {
          await db
            .insertInto("auth_role_permissions")
            .values({ role_id: roleId, permission_id: Number(permission.id), created_at: now })
            .execute();
        }
      }
    }

    const tenant = (await db
      .selectFrom("tenants")
      .select("id")
      .where("deleted_at", "is", null)
      .orderBy("id", "asc")
      .executeTakeFirst()) as { id: number | bigint } | undefined;

    if (!tenant) {
      throw new Error("Cannot seed auth user before at least one tenant exists.");
    }

    const existingAdmin = (await db
      .selectFrom("auth_users")
      .select(["id", "email", "username"])
      .where((builder) =>
        builder.or([
          builder("username", "=", seededSuperAdmin.username),
          builder("email", "=", seededSuperAdmin.email),
          builder("username", "=", "admin"),
          builder("email", "=", "admin@cxnext.local"),
        ]),
      )
      .executeTakeFirst()) as
      | { id: number | bigint; email: string; username: string }
      | undefined;

    let adminUserId = existingAdmin ? Number(existingAdmin.id) : null;

    if (existingAdmin) {
      const updateValues: Record<string, unknown> = {
        tenant_id: Number(tenant.id),
        username: seededSuperAdmin.username,
        email: seededSuperAdmin.email,
        display_name: seededSuperAdmin.displayName,
        is_active: true,
        updated_at: now,
        deleted_at: null,
      };

      if (
        existingAdmin.email.trim().toLowerCase() !== seededSuperAdmin.email ||
        existingAdmin.username.trim().toLowerCase() !== seededSuperAdmin.username
      ) {
        updateValues.password_hash = hashPassword(seededSuperAdmin.password);
      }

      await db
        .updateTable("auth_users")
        .set(updateValues)
        .where("id", "=", adminUserId)
        .execute();
    } else {
      const result = await db
        .insertInto("auth_users")
        .values({
          tenant_id: Number(tenant.id),
          username: seededSuperAdmin.username,
          email: seededSuperAdmin.email,
          display_name: seededSuperAdmin.displayName,
          password_hash: hashPassword(seededSuperAdmin.password),
          is_active: true,
          created_at: now,
          updated_at: now,
          deleted_at: null,
        })
        .executeTakeFirstOrThrow();
      adminUserId = Number(result.insertId);
    }

    const adminRoleId = roleByKey.get("super_admin");

    if (adminUserId && adminRoleId) {
      await db
        .deleteFrom("auth_user_roles")
        .where("role_id", "=", adminRoleId)
        .where("user_id", "!=", adminUserId)
        .execute();

      const existingAdminRole = await db
        .selectFrom("auth_user_roles")
        .select("user_id")
        .where("user_id", "=", adminUserId)
        .where("role_id", "=", adminRoleId)
        .executeTakeFirst();

      if (!existingAdminRole) {
        await db
          .insertInto("auth_user_roles")
          .values({
            user_id: adminUserId,
            role_id: adminRoleId,
            created_at: now,
          })
          .execute();
      }
    }
  },
});
