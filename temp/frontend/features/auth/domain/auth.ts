import type { ApplicationContext } from "../../application-context/domain/application-context";

export interface AuthPermission {
  readonly id: string;
  readonly key: string;
  readonly name: string;
  readonly moduleKey: string;
  readonly action: string;
  readonly description: string | null;
}

export interface AuthRole {
  readonly id: string;
  readonly key: string;
  readonly name: string;
  readonly description: string | null;
  readonly isSystem: boolean;
  readonly isActive: boolean;
  readonly permissions: readonly AuthPermission[];
}

export interface AuthRoleInput {
  readonly key: string;
  readonly name: string;
  readonly description?: string | null;
  readonly isActive: boolean;
}

export interface AuthPolicy {
  readonly id: string;
  readonly key: string;
  readonly name: string;
  readonly description: string | null;
  readonly isSystem: boolean;
  readonly isActive: boolean;
}

export interface AuthPolicyInput {
  readonly key: string;
  readonly name: string;
  readonly description?: string | null;
  readonly isActive: boolean;
}

export interface AuthPermissionModule {
  readonly id: string;
  readonly key: string;
  readonly name: string;
  readonly boundedContext: string;
  readonly description: string | null;
  readonly isSystem: boolean;
  readonly isActive: boolean;
  readonly policies: readonly AuthPolicy[];
  readonly permissionKeys: readonly string[];
}

export interface AuthPermissionModuleInput {
  readonly key: string;
  readonly name: string;
  readonly boundedContext: string;
  readonly description?: string | null;
  readonly isActive: boolean;
  readonly policyKeys: readonly string[];
}

export interface AuthGate {
  readonly userId: string;
  readonly tenant: AuthTenant;
  readonly username: string;
  readonly displayName: string;
  readonly email: string;
  readonly isActive: boolean;
  readonly roleKeys: readonly string[];
  readonly permissionKeys: readonly string[];
  readonly permissions: readonly AuthPermission[];
}

export interface AuthTenant {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
}

export interface AuthUser {
  readonly id: string;
  readonly tenant: AuthTenant;
  readonly username: string;
  readonly email: string;
  readonly displayName: string;
  readonly isActive: boolean;
  readonly roles: readonly AuthRole[];
  readonly permissions: readonly AuthPermission[];
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface AuthSession {
  readonly accessToken: string;
  readonly expiresAt: string;
  readonly sessionId: string;
  readonly tenant: AuthTenant;
  readonly user: AuthUser;
  readonly permissions: readonly string[];
  readonly context?: ApplicationContext | null;
}

export interface AuthUserInput {
  readonly tenantId: string;
  readonly username: string;
  readonly email: string;
  readonly displayName: string;
  readonly password?: string | null;
  readonly isActive: boolean;
  readonly roleKeys: readonly string[];
}
