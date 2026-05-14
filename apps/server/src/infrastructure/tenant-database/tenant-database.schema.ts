import type { Generated } from 'kysely'

export interface TenantCompaniesTable {
  id: Generated<number>
  name: string
  status: string
  settings: string
  features: string
  created_at: Generated<Date>
  updated_at: Generated<Date>
  deleted_at: Date | null
}

export interface TenantRbacRolesTable {
  id: Generated<number>
  code: string
  name: string
  settings: string
  created_at: Generated<Date>
  updated_at: Generated<Date>
}

export interface TenantRbacPoliciesTable {
  id: Generated<number>
  code: string
  name: string
  description: string
  created_at: Generated<Date>
}

export interface TenantRbacRolePoliciesTable {
  id: Generated<number>
  role_code: string
  policy_code: string
  created_at: Generated<Date>
}

export interface TenantDatabaseSchema {
  companies: TenantCompaniesTable
  rbac_roles: TenantRbacRolesTable
  rbac_policies: TenantRbacPoliciesTable
  rbac_role_policies: TenantRbacRolePoliciesTable
}

