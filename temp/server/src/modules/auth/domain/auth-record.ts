export interface AuthPermissionRecord {
  readonly id: string;
  readonly key: string;
  readonly name: string;
  readonly moduleKey: string;
  readonly action: string;
  readonly description: string | null;
}

export interface AuthRoleRecord {
  readonly id: string;
  readonly key: string;
  readonly name: string;
  readonly description: string | null;
  readonly isSystem: boolean;
  readonly isActive: boolean;
  readonly permissions: readonly AuthPermissionRecord[];
}

export interface AuthPolicyRecord {
  readonly id: string;
  readonly key: string;
  readonly name: string;
  readonly description: string | null;
  readonly isSystem: boolean;
  readonly isActive: boolean;
}

export interface AuthPermissionModuleRecord {
  readonly id: string;
  readonly key: string;
  readonly name: string;
  readonly boundedContext: string;
  readonly description: string | null;
  readonly isSystem: boolean;
  readonly isActive: boolean;
  readonly policies: readonly AuthPolicyRecord[];
  readonly permissionKeys: readonly string[];
}

export interface AuthGateRecord {
  readonly userId: string;
  readonly tenant: AuthTenantRecord;
  readonly username: string;
  readonly displayName: string;
  readonly email: string;
  readonly isActive: boolean;
  readonly roleKeys: readonly string[];
  readonly permissionKeys: readonly string[];
  readonly permissions: readonly AuthPermissionRecord[];
}

export interface AuthTenantRecord {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
}

export interface AuthUserRecord {
  readonly id: string;
  readonly tenant: AuthTenantRecord;
  readonly username: string;
  readonly email: string;
  readonly displayName: string;
  readonly isActive: boolean;
  readonly roles: readonly AuthRoleRecord[];
  readonly permissions: readonly AuthPermissionRecord[];
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface AuthenticatedUserRecord extends AuthUserRecord {
  readonly sessionId: string;
  readonly tokenId: string;
}
