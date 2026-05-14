import { sql, type Kysely } from "kysely";

import { defineDatabaseMigration } from "../process/types";

type DynamicDatabase = Record<string, Record<string, unknown>>;

function asQueryDatabase(database: Kysely<unknown>) {
  return database as unknown as Kysely<DynamicDatabase>;
}

export const createAuthRbacMigration = defineDatabaseMigration({
  id: "security:auth:001-create-auth-rbac",
  appId: "security",
  moduleKey: "auth",
  name: "Create auth users, roles, permissions, and sessions",
  order: 900,
  up: async ({ database }) => {
    const db = asQueryDatabase(database);

    await db.schema
      .createTable("auth_permissions")
      .ifNotExists()
      .addColumn("id", "bigint", (column) => column.primaryKey().autoIncrement())
      .addColumn("permission_key", "varchar(191)", (column) => column.notNull().unique())
      .addColumn("name", "varchar(160)", (column) => column.notNull())
      .addColumn("module_key", "varchar(100)", (column) => column.notNull())
      .addColumn("action", "varchar(60)", (column) => column.notNull())
      .addColumn("description", "varchar(255)")
      .addColumn("is_active", "boolean", (column) => column.notNull().defaultTo(true))
      .addColumn("created_at", "datetime", (column) =>
        column.notNull().defaultTo(sql`CURRENT_TIMESTAMP`),
      )
      .addColumn("updated_at", "datetime", (column) =>
        column.notNull().defaultTo(sql`CURRENT_TIMESTAMP`),
      )
      .execute();

    await db.schema
      .createTable("auth_roles")
      .ifNotExists()
      .addColumn("id", "bigint", (column) => column.primaryKey().autoIncrement())
      .addColumn("role_key", "varchar(191)", (column) => column.notNull().unique())
      .addColumn("name", "varchar(160)", (column) => column.notNull())
      .addColumn("description", "varchar(255)")
      .addColumn("is_system", "boolean", (column) => column.notNull().defaultTo(false))
      .addColumn("is_active", "boolean", (column) => column.notNull().defaultTo(true))
      .addColumn("created_at", "datetime", (column) =>
        column.notNull().defaultTo(sql`CURRENT_TIMESTAMP`),
      )
      .addColumn("updated_at", "datetime", (column) =>
        column.notNull().defaultTo(sql`CURRENT_TIMESTAMP`),
      )
      .execute();

    await db.schema
      .createTable("auth_role_permissions")
      .ifNotExists()
      .addColumn("role_id", "bigint", (column) => column.notNull())
      .addColumn("permission_id", "bigint", (column) => column.notNull())
      .addColumn("created_at", "datetime", (column) =>
        column.notNull().defaultTo(sql`CURRENT_TIMESTAMP`),
      )
      .addPrimaryKeyConstraint("pk_auth_role_permissions", ["role_id", "permission_id"])
      .addForeignKeyConstraint("fk_auth_role_permissions_role", ["role_id"], "auth_roles", [
        "id",
      ])
      .addForeignKeyConstraint(
        "fk_auth_role_permissions_permission",
        ["permission_id"],
        "auth_permissions",
        ["id"],
      )
      .execute();

    await db.schema
      .createTable("auth_users")
      .ifNotExists()
      .addColumn("id", "bigint", (column) => column.primaryKey().autoIncrement())
      .addColumn("tenant_id", "bigint", (column) => column.notNull())
      .addColumn("username", "varchar(100)", (column) => column.notNull().unique())
      .addColumn("email", "varchar(191)", (column) => column.notNull().unique())
      .addColumn("display_name", "varchar(160)", (column) => column.notNull())
      .addColumn("password_hash", "varchar(255)", (column) => column.notNull())
      .addColumn("is_active", "boolean", (column) => column.notNull().defaultTo(true))
      .addColumn("last_login_at", "datetime")
      .addColumn("created_at", "datetime", (column) =>
        column.notNull().defaultTo(sql`CURRENT_TIMESTAMP`),
      )
      .addColumn("updated_at", "datetime", (column) =>
        column.notNull().defaultTo(sql`CURRENT_TIMESTAMP`),
      )
      .addColumn("deleted_at", "datetime")
      .addForeignKeyConstraint("fk_auth_users_tenant", ["tenant_id"], "tenants", ["id"])
      .execute();

    await db.schema
      .createTable("auth_user_roles")
      .ifNotExists()
      .addColumn("user_id", "bigint", (column) => column.notNull())
      .addColumn("role_id", "bigint", (column) => column.notNull())
      .addColumn("created_at", "datetime", (column) =>
        column.notNull().defaultTo(sql`CURRENT_TIMESTAMP`),
      )
      .addPrimaryKeyConstraint("pk_auth_user_roles", ["user_id", "role_id"])
      .addForeignKeyConstraint("fk_auth_user_roles_user", ["user_id"], "auth_users", ["id"])
      .addForeignKeyConstraint("fk_auth_user_roles_role", ["role_id"], "auth_roles", ["id"])
      .execute();

    await db.schema
      .createTable("auth_sessions")
      .ifNotExists()
      .addColumn("id", "varchar(64)", (column) => column.primaryKey())
      .addColumn("user_id", "bigint", (column) => column.notNull())
      .addColumn("tenant_id", "bigint", (column) => column.notNull())
      .addColumn("token_id", "varchar(64)", (column) => column.notNull().unique())
      .addColumn("issued_at", "datetime", (column) =>
        column.notNull().defaultTo(sql`CURRENT_TIMESTAMP`),
      )
      .addColumn("expires_at", "datetime", (column) => column.notNull())
      .addColumn("revoked_at", "datetime")
      .addForeignKeyConstraint("fk_auth_sessions_user", ["user_id"], "auth_users", ["id"])
      .addForeignKeyConstraint("fk_auth_sessions_tenant", ["tenant_id"], "tenants", ["id"])
      .execute();
  },
});
