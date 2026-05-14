import { Injectable, type OnModuleDestroy } from "@nestjs/common";
import { createDatabaseConnection, loadDatabaseEnv, type DatabaseConnection } from "@cxnext/db";
import type {
  AuthPermissionModuleUpsertParams,
  AuthPolicyUpsertParams,
  AuthRepository,
  AuthRoleUpsertParams,
  AuthSessionParams,
  AuthUserUpsertParams,
} from "../../application/services/auth.repository";
import type {
  AuthPermissionModuleRecord,
  AuthPermissionRecord,
  AuthPolicyRecord,
  AuthRoleRecord,
  AuthUserRecord,
} from "../../domain/auth-record";

type DynamicDatabase = Record<string, Record<string, unknown>>;

interface UserRow {
  readonly id: number | bigint;
  readonly tenant_id: number | bigint;
  readonly tenant_name: string;
  readonly tenant_slug: string;
  readonly username: string;
  readonly email: string;
  readonly display_name: string;
  readonly password_hash?: string;
  readonly is_active: boolean | number;
  readonly created_at: Date | string;
  readonly updated_at: Date | string;
}

@Injectable()
export class KyselyAuthRepository implements AuthRepository, OnModuleDestroy {
  private readonly connection: DatabaseConnection;

  public constructor() {
    this.connection = createDatabaseConnection(loadDatabaseEnv().env);
  }

  public async onModuleDestroy(): Promise<void> {
    await this.connection.destroy();
  }

  public async findUserByLogin(login: string) {
    const normalized = login.trim().toLowerCase();
    const row = (await this.db()
      .selectFrom("auth_users as users")
      .innerJoin("tenants", "tenants.id", "users.tenant_id")
      .select([
        "users.id",
        "users.tenant_id",
        "tenants.name as tenant_name",
        "tenants.slug as tenant_slug",
        "users.username",
        "users.email",
        "users.display_name",
        "users.password_hash",
        "users.is_active",
        "users.created_at",
        "users.updated_at",
      ])
      .where("users.deleted_at", "is", null)
      .where((builder) =>
        builder.or([
          builder("users.username", "=", normalized),
          builder("users.email", "=", normalized),
        ]),
      )
      .executeTakeFirst()) as UserRow | undefined;

    return row
      ? { ...(await this.hydrateUser(row)), passwordHash: String(row.password_hash) }
      : null;
  }

  public async findUserById(userId: string): Promise<AuthUserRecord | null> {
    const row = await this.readUserRow(userId);
    return row ? this.hydrateUser(row) : null;
  }

  public async findUserPasswordById(userId: string) {
    const row = (await this.db()
      .selectFrom("auth_users")
      .select(["password_hash"])
      .where("id", "=", Number(userId))
      .where("deleted_at", "is", null)
      .executeTakeFirst()) as { password_hash: string } | undefined;

    return row ? { passwordHash: row.password_hash } : null;
  }

  public async listUsers(): Promise<readonly AuthUserRecord[]> {
    const rows = (await this.db()
      .selectFrom("auth_users as users")
      .innerJoin("tenants", "tenants.id", "users.tenant_id")
      .select([
        "users.id",
        "users.tenant_id",
        "tenants.name as tenant_name",
        "tenants.slug as tenant_slug",
        "users.username",
        "users.email",
        "users.display_name",
        "users.is_active",
        "users.created_at",
        "users.updated_at",
      ])
      .where("users.deleted_at", "is", null)
      .orderBy("users.id", "asc")
      .execute()) as UserRow[];

    return Promise.all(rows.map((row) => this.hydrateUser(row)));
  }

  public async createUser(
    params: AuthUserUpsertParams & { readonly passwordHash: string },
  ): Promise<AuthUserRecord> {
    const now = new Date();
    const result = await this.db()
      .insertInto("auth_users")
      .values({
        tenant_id: Number(params.tenantId),
        username: params.username.trim().toLowerCase(),
        email: params.email.trim().toLowerCase(),
        display_name: params.displayName.trim(),
        password_hash: params.passwordHash,
        is_active: params.isActive,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      })
      .executeTakeFirstOrThrow();

    await this.replaceUserRoles(String(result.insertId), params.roleKeys);
    const user = await this.findUserById(String(result.insertId));
    if (!user) throw new Error("User was created but could not be read back.");
    return user;
  }

  public async updateUser(
    userId: string,
    params: AuthUserUpsertParams & { readonly passwordHash?: string | null },
  ): Promise<AuthUserRecord | null> {
    const values: Record<string, unknown> = {
      tenant_id: Number(params.tenantId),
      username: params.username.trim().toLowerCase(),
      email: params.email.trim().toLowerCase(),
      display_name: params.displayName.trim(),
      is_active: params.isActive,
      updated_at: new Date(),
    };

    if (params.passwordHash) {
      values.password_hash = params.passwordHash;
    }

    await this.db()
      .updateTable("auth_users")
      .set(values)
      .where("id", "=", Number(userId))
      .where("deleted_at", "is", null)
      .executeTakeFirst();
    await this.replaceUserRoles(userId, params.roleKeys);

    return this.findUserById(userId);
  }

  public async updateUserPassword(userId: string, passwordHash: string): Promise<boolean> {
    const result = await this.db()
      .updateTable("auth_users")
      .set({ password_hash: passwordHash, updated_at: new Date() })
      .where("id", "=", Number(userId))
      .where("deleted_at", "is", null)
      .executeTakeFirst();

    return Number(result.numUpdatedRows) > 0;
  }

  public async listRoles(): Promise<readonly AuthRoleRecord[]> {
    const rows = (await this.db()
      .selectFrom("auth_roles")
      .selectAll()
      .orderBy("id", "asc")
      .execute()) as Array<Record<string, unknown>>;

    return Promise.all(rows.map((row) => this.hydrateRole(row)));
  }

  public async createRole(params: AuthRoleUpsertParams): Promise<AuthRoleRecord> {
    const now = new Date();
    const result = await this.db()
      .insertInto("auth_roles")
      .values({
        role_key: normalizeRoleKey(params.key),
        name: params.name.trim(),
        description: normalizeNullable(params.description),
        is_system: false,
        is_active: params.isActive,
        created_at: now,
        updated_at: now,
      })
      .executeTakeFirstOrThrow();

    const role = await this.findRoleById(String(result.insertId));
    if (!role) throw new Error("Role was created but could not be read back.");
    return role;
  }

  public async updateRole(
    roleId: string,
    params: AuthRoleUpsertParams,
  ): Promise<AuthRoleRecord | null> {
    const existing = (await this.db()
      .selectFrom("auth_roles")
      .select(["id", "is_system"])
      .where("id", "=", Number(roleId))
      .executeTakeFirst()) as { id: number | bigint; is_system: boolean | number } | undefined;

    if (!existing) {
      return null;
    }

    const values: Record<string, unknown> = {
      name: params.name.trim(),
      description: normalizeNullable(params.description),
      is_active: params.isActive,
      updated_at: new Date(),
    };

    if (!Boolean(existing.is_system)) {
      values.role_key = normalizeRoleKey(params.key);
    }

    await this.db()
      .updateTable("auth_roles")
      .set(values)
      .where("id", "=", Number(roleId))
      .executeTakeFirst();

    return this.findRoleById(roleId);
  }

  public async deleteRole(roleId: string): Promise<boolean> {
    const existing = (await this.db()
      .selectFrom("auth_roles")
      .select(["id", "is_system"])
      .where("id", "=", Number(roleId))
      .executeTakeFirst()) as { id: number | bigint; is_system: boolean | number } | undefined;

    if (!existing || Boolean(existing.is_system)) {
      return false;
    }

    await this.db().deleteFrom("auth_user_roles").where("role_id", "=", Number(roleId)).execute();
    await this.db()
      .deleteFrom("auth_role_permissions")
      .where("role_id", "=", Number(roleId))
      .execute();
    await this.db().deleteFrom("auth_roles").where("id", "=", Number(roleId)).execute();
    return true;
  }

  public async findActiveRoleKeys(roleKeys: readonly string[]): Promise<readonly string[]> {
    if (roleKeys.length === 0) {
      return [];
    }

    const rows = (await this.db()
      .selectFrom("auth_roles")
      .select(["role_key"])
      .where("is_active", "=", true)
      .where("role_key", "in", [...new Set(roleKeys)])
      .execute()) as Array<{ role_key: string }>;

    return rows.map((row) => row.role_key);
  }

  public async listPermissions(): Promise<readonly AuthPermissionRecord[]> {
    const rows = (await this.db()
      .selectFrom("auth_permissions")
      .selectAll()
      .where("is_active", "=", true)
      .orderBy("module_key", "asc")
      .orderBy("action", "asc")
      .execute()) as Array<Record<string, unknown>>;

    return rows.map(toPermission);
  }

  public async listPermissionModules(): Promise<readonly AuthPermissionModuleRecord[]> {
    const rows = (await this.db()
      .selectFrom("auth_permission_modules")
      .selectAll()
      .where("is_active", "=", true)
      .orderBy("module_key", "asc")
      .execute()) as Array<Record<string, unknown>>;

    return Promise.all(rows.map((row) => this.hydratePermissionModule(row)));
  }

  public async createPermissionModule(
    params: AuthPermissionModuleUpsertParams,
  ): Promise<AuthPermissionModuleRecord> {
    const now = new Date();
    const result = await this.db()
      .insertInto("auth_permission_modules")
      .values({
        module_key: normalizeKey(params.key),
        name: params.name.trim(),
        bounded_context: normalizeKey(params.boundedContext),
        description: normalizeNullable(params.description),
        is_system: false,
        is_active: params.isActive,
        created_at: now,
        updated_at: now,
      })
      .executeTakeFirstOrThrow();

    await this.syncModulePermissions(normalizeKey(params.key), params.policyKeys, params.name);
    const moduleRecord = await this.findPermissionModuleById(String(result.insertId));
    if (!moduleRecord) throw new Error("Permission module was created but could not be read back.");
    return moduleRecord;
  }

  public async updatePermissionModule(
    moduleId: string,
    params: AuthPermissionModuleUpsertParams,
  ): Promise<AuthPermissionModuleRecord | null> {
    const existing = (await this.db()
      .selectFrom("auth_permission_modules")
      .select(["module_key", "is_system"])
      .where("id", "=", Number(moduleId))
      .executeTakeFirst()) as { module_key: string; is_system: boolean | number } | undefined;

    if (!existing) return null;

    const moduleKey = Boolean(existing.is_system) ? existing.module_key : normalizeKey(params.key);
    await this.db()
      .updateTable("auth_permission_modules")
      .set({
        module_key: moduleKey,
        name: params.name.trim(),
        bounded_context: normalizeKey(params.boundedContext),
        description: normalizeNullable(params.description),
        is_active: params.isActive,
        updated_at: new Date(),
      })
      .where("id", "=", Number(moduleId))
      .executeTakeFirst();

    if (moduleKey !== existing.module_key) {
      await this.db()
        .updateTable("auth_permissions")
        .set({ module_key: moduleKey, updated_at: new Date() })
        .where("module_key", "=", existing.module_key)
        .executeTakeFirst();
    }

    await this.syncModulePermissions(moduleKey, params.policyKeys, params.name);
    return this.findPermissionModuleById(moduleId);
  }

  public async deletePermissionModule(moduleId: string): Promise<boolean> {
    const existing = (await this.db()
      .selectFrom("auth_permission_modules")
      .select(["module_key", "is_system"])
      .where("id", "=", Number(moduleId))
      .executeTakeFirst()) as { module_key: string; is_system: boolean | number } | undefined;

    if (!existing || Boolean(existing.is_system)) return false;

    await this.db()
      .updateTable("auth_permission_modules")
      .set({ is_active: false, updated_at: new Date() })
      .where("id", "=", Number(moduleId))
      .executeTakeFirst();
    await this.db()
      .updateTable("auth_permissions")
      .set({ is_active: false, updated_at: new Date() })
      .where("module_key", "=", existing.module_key)
      .executeTakeFirst();
    return true;
  }

  public async listPolicies(): Promise<readonly AuthPolicyRecord[]> {
    const rows = (await this.db()
      .selectFrom("auth_policy_actions")
      .selectAll()
      .where("is_active", "=", true)
      .orderBy("action_key", "asc")
      .execute()) as Array<Record<string, unknown>>;

    return rows.map(toPolicy);
  }

  public async createPolicy(params: AuthPolicyUpsertParams): Promise<AuthPolicyRecord> {
    const result = await this.db()
      .insertInto("auth_policy_actions")
      .values({
        action_key: normalizeKey(params.key),
        name: params.name.trim(),
        description: normalizeNullable(params.description),
        is_system: false,
        is_active: params.isActive,
        created_at: new Date(),
        updated_at: new Date(),
      })
      .executeTakeFirstOrThrow();

    const policy = await this.findPolicyById(String(result.insertId));
    if (!policy) throw new Error("Policy was created but could not be read back.");
    return policy;
  }

  public async updatePolicy(
    policyId: string,
    params: AuthPolicyUpsertParams,
  ): Promise<AuthPolicyRecord | null> {
    const existing = (await this.db()
      .selectFrom("auth_policy_actions")
      .select(["action_key", "is_system"])
      .where("id", "=", Number(policyId))
      .executeTakeFirst()) as { action_key: string; is_system: boolean | number } | undefined;

    if (!existing) return null;

    const actionKey = Boolean(existing.is_system) ? existing.action_key : normalizeKey(params.key);
    await this.db()
      .updateTable("auth_policy_actions")
      .set({
        action_key: actionKey,
        name: params.name.trim(),
        description: normalizeNullable(params.description),
        is_active: params.isActive,
        updated_at: new Date(),
      })
      .where("id", "=", Number(policyId))
      .executeTakeFirst();

    if (actionKey !== existing.action_key) {
      await this.db()
        .updateTable("auth_permissions")
        .set({ action: actionKey, updated_at: new Date() })
        .where("action", "=", existing.action_key)
        .executeTakeFirst();
    }

    if (!params.isActive) {
      await this.db()
        .updateTable("auth_permissions")
        .set({ is_active: false, updated_at: new Date() })
        .where("action", "=", actionKey)
        .executeTakeFirst();
    }

    return this.findPolicyById(policyId);
  }

  public async deletePolicy(policyId: string): Promise<boolean> {
    const existing = (await this.db()
      .selectFrom("auth_policy_actions")
      .select(["action_key", "is_system"])
      .where("id", "=", Number(policyId))
      .executeTakeFirst()) as { action_key: string; is_system: boolean | number } | undefined;

    if (!existing || Boolean(existing.is_system)) return false;

    await this.db()
      .updateTable("auth_policy_actions")
      .set({ is_active: false, updated_at: new Date() })
      .where("id", "=", Number(policyId))
      .executeTakeFirst();
    await this.db()
      .updateTable("auth_permissions")
      .set({ is_active: false, updated_at: new Date() })
      .where("action", "=", existing.action_key)
      .executeTakeFirst();
    return true;
  }

  public async findActivePermissionKeys(
    permissionKeys: readonly string[],
  ): Promise<readonly string[]> {
    if (permissionKeys.length === 0) {
      return [];
    }

    const rows = (await this.db()
      .selectFrom("auth_permissions")
      .select(["permission_key"])
      .where("is_active", "=", true)
      .where("permission_key", "in", [...new Set(permissionKeys)])
      .execute()) as Array<{ permission_key: string }>;

    return rows.map((row) => row.permission_key);
  }

  public async createSession(params: AuthSessionParams): Promise<void> {
    await this.db()
      .insertInto("auth_sessions")
      .values({
        id: params.sessionId,
        user_id: Number(params.userId),
        tenant_id: Number(params.tenantId),
        token_id: params.tokenId,
        issued_at: new Date(),
        expires_at: params.expiresAt,
        revoked_at: null,
      })
      .execute();
  }

  public async revokeSession(sessionId: string): Promise<void> {
    await this.db()
      .updateTable("auth_sessions")
      .set({ revoked_at: new Date() })
      .where("id", "=", sessionId)
      .where("revoked_at", "is", null)
      .executeTakeFirst();
  }

  public async findSession(tokenId: string) {
    const row = (await this.db()
      .selectFrom("auth_sessions")
      .select(["id", "user_id", "revoked_at", "expires_at"])
      .where("token_id", "=", tokenId)
      .executeTakeFirst()) as
      | {
          id: string;
          user_id: number | bigint;
          revoked_at: Date | string | null;
          expires_at: Date | string;
        }
      | undefined;

    return row
      ? {
          sessionId: row.id,
          userId: String(row.user_id),
          revokedAt: row.revoked_at ? toDate(row.revoked_at) : null,
          expiresAt: toDate(row.expires_at),
        }
      : null;
  }

  public async touchLogin(userId: string): Promise<void> {
    await this.db()
      .updateTable("auth_users")
      .set({ last_login_at: new Date(), updated_at: new Date() })
      .where("id", "=", Number(userId))
      .executeTakeFirst();
  }

  private async readUserRow(userId: string) {
    return (await this.db()
      .selectFrom("auth_users as users")
      .innerJoin("tenants", "tenants.id", "users.tenant_id")
      .select([
        "users.id",
        "users.tenant_id",
        "tenants.name as tenant_name",
        "tenants.slug as tenant_slug",
        "users.username",
        "users.email",
        "users.display_name",
        "users.is_active",
        "users.created_at",
        "users.updated_at",
      ])
      .where("users.id", "=", Number(userId))
      .where("users.deleted_at", "is", null)
      .executeTakeFirst()) as UserRow | undefined;
  }

  private async hydrateUser(row: UserRow): Promise<AuthUserRecord> {
    const roles = await this.readUserRoles(String(row.id));
    const permissionMap = new Map<string, AuthPermissionRecord>();
    for (const role of roles) {
      for (const permission of role.permissions) {
        permissionMap.set(permission.key, permission);
      }
    }

    return {
      id: String(row.id),
      tenant: {
        id: String(row.tenant_id),
        name: row.tenant_name,
        slug: row.tenant_slug,
      },
      username: row.username,
      email: row.email,
      displayName: row.display_name,
      isActive: Boolean(row.is_active),
      roles,
      permissions: [...permissionMap.values()].sort((a, b) => a.key.localeCompare(b.key)),
      createdAt: toDate(row.created_at),
      updatedAt: toDate(row.updated_at),
    };
  }

  private async readUserRoles(userId: string) {
    const rows = (await this.db()
      .selectFrom("auth_roles as roles")
      .innerJoin("auth_user_roles as user_roles", "user_roles.role_id", "roles.id")
      .selectAll("roles")
      .where("user_roles.user_id", "=", Number(userId))
      .where("roles.is_active", "=", true)
      .execute()) as Array<Record<string, unknown>>;

    return Promise.all(rows.map((row) => this.hydrateRole(row)));
  }

  private async hydrateRole(row: Record<string, unknown>): Promise<AuthRoleRecord> {
    const permissions = (await this.db()
      .selectFrom("auth_permissions as permissions")
      .innerJoin(
        "auth_role_permissions as role_permissions",
        "role_permissions.permission_id",
        "permissions.id",
      )
      .selectAll("permissions")
      .where("role_permissions.role_id", "=", Number(row.id))
      .where("permissions.is_active", "=", true)
      .orderBy("permissions.permission_key", "asc")
      .execute()) as Array<Record<string, unknown>>;

    return {
      id: String(row.id),
      key: String(row.role_key),
      name: String(row.name),
      description: row.description ? String(row.description) : null,
      isSystem: Boolean(row.is_system),
      isActive: Boolean(row.is_active),
      permissions: permissions.map(toPermission),
    };
  }

  private async findRoleById(roleId: string): Promise<AuthRoleRecord | null> {
    const row = (await this.db()
      .selectFrom("auth_roles")
      .selectAll()
      .where("id", "=", Number(roleId))
      .executeTakeFirst()) as Record<string, unknown> | undefined;

    return row ? this.hydrateRole(row) : null;
  }

  private async replaceUserRoles(userId: string, roleKeys: readonly string[]) {
    const roles = (await this.db()
      .selectFrom("auth_roles")
      .select(["id", "role_key"])
      .where("is_active", "=", true)
      .where("role_key", "in", [...roleKeys])
      .execute()) as Array<{ id: number | bigint; role_key: string }>;

    await this.db().deleteFrom("auth_user_roles").where("user_id", "=", Number(userId)).execute();

    if (roles.length > 0) {
      await this.db()
        .insertInto("auth_user_roles")
        .values(
          roles.map((role) => ({
            user_id: Number(userId),
            role_id: Number(role.id),
            created_at: new Date(),
          })),
        )
        .execute();
    }
  }

  private async hydratePermissionModule(
    row: Record<string, unknown>,
  ): Promise<AuthPermissionModuleRecord> {
    const permissions = (await this.db()
      .selectFrom("auth_permissions")
      .select(["permission_key", "action"])
      .where("module_key", "=", String(row.module_key))
      .where("is_active", "=", true)
      .orderBy("action", "asc")
      .execute()) as Array<{ permission_key: string; action: string }>;
    const policies = await this.listPolicies();
    const actionSet = new Set(permissions.map((permission) => permission.action));

    return {
      id: String(row.id),
      key: String(row.module_key),
      name: String(row.name),
      boundedContext: String(row.bounded_context),
      description: row.description ? String(row.description) : null,
      isSystem: Boolean(row.is_system),
      isActive: Boolean(row.is_active),
      policies: policies.filter((policy) => actionSet.has(policy.key)),
      permissionKeys: permissions.map((permission) => permission.permission_key),
    };
  }

  private async findPermissionModuleById(moduleId: string) {
    const row = (await this.db()
      .selectFrom("auth_permission_modules")
      .selectAll()
      .where("id", "=", Number(moduleId))
      .executeTakeFirst()) as Record<string, unknown> | undefined;

    return row ? this.hydratePermissionModule(row) : null;
  }

  private async findPolicyById(policyId: string): Promise<AuthPolicyRecord | null> {
    const row = (await this.db()
      .selectFrom("auth_policy_actions")
      .selectAll()
      .where("id", "=", Number(policyId))
      .executeTakeFirst()) as Record<string, unknown> | undefined;

    return row ? toPolicy(row) : null;
  }

  private async syncModulePermissions(
    moduleKey: string,
    policyKeys: readonly string[],
    moduleName: string,
  ) {
    const activeKeys = [...new Set(policyKeys.map(normalizeKey).filter(Boolean))];

    await this.db()
      .updateTable("auth_permissions")
      .set({ is_active: false, updated_at: new Date() })
      .where("module_key", "=", moduleKey)
      .executeTakeFirst();

    for (const actionKey of activeKeys) {
      const permissionKey = `${moduleKey}.${actionKey}`;
      const existing = await this.db()
        .selectFrom("auth_permissions")
        .select("id")
        .where("permission_key", "=", permissionKey)
        .executeTakeFirst();

      if (existing) {
        await this.db()
          .updateTable("auth_permissions")
          .set({
            name: `${moduleName.trim()} ${actionKey}`,
            module_key: moduleKey,
            action: actionKey,
            description: `Allows ${actionKey} access for ${moduleName.trim()}.`,
            is_active: true,
            updated_at: new Date(),
          })
          .where("permission_key", "=", permissionKey)
          .executeTakeFirst();
      } else {
        await this.db()
          .insertInto("auth_permissions")
          .values({
            permission_key: permissionKey,
            name: `${moduleName.trim()} ${actionKey}`,
            module_key: moduleKey,
            action: actionKey,
            description: `Allows ${actionKey} access for ${moduleName.trim()}.`,
            is_active: true,
            created_at: new Date(),
            updated_at: new Date(),
          })
          .execute();
      }
    }
  }

  private db() {
    return this.connection.db as unknown as import("kysely").Kysely<DynamicDatabase>;
  }
}

function toPermission(row: Record<string, unknown>): AuthPermissionRecord {
  return {
    id: String(row.id),
    key: String(row.permission_key),
    name: String(row.name),
    moduleKey: String(row.module_key),
    action: String(row.action),
    description: row.description ? String(row.description) : null,
  };
}

function toDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
}

function toPolicy(row: Record<string, unknown>): AuthPolicyRecord {
  return {
    id: String(row.id),
    key: String(row.action_key),
    name: String(row.name),
    description: row.description ? String(row.description) : null,
    isSystem: Boolean(row.is_system),
    isActive: Boolean(row.is_active),
  };
}

function normalizeRoleKey(value: string) {
  return normalizeKey(value);
}

function normalizeKey(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function normalizeNullable(value: string | null | undefined) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}
