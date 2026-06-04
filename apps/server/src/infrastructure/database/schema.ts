import type { Generated } from 'kysely'

export interface SitePagesTable {
  id: Generated<number>
  slug: string
  nav_label: string
  title: string
  eyebrow: string
  summary: string
  body: string
  sort_order: number
}

export interface SiteServicesTable {
  id: Generated<number>
  title: string
  description: string
  sort_order: number
}

export interface SitePostsTable {
  id: Generated<number>
  title: string
  excerpt: string
  published_at: string
  sort_order: number
}

export interface SiteMessagesTable {
  id: Generated<number>
  tenant_id: number | null
  tenant_slug: string | null
  domain: string | null
  name: string
  email: string
  message: string
  created_at: Generated<string>
}

export interface IndustriesTable {
  id: Generated<number>
  code: string
  name: string
  status: string
  payload_schema: string
  default_features: string
  default_ui_settings: string
  created_at: Generated<string>
  updated_at: Generated<string>
  deleted_at: string | null
}

export interface TenantsTable {
  id: Generated<number>
  code: number
  corporate_id: string | null
  mobile: string | null
  slug: string
  name: string
  status: string
  db_type: string
  db_host: string
  db_port: number
  db_name: string
  db_user: string
  db_secret_ref: string
  company_count: number
  active_company_count: number
  company_concept_count: number
  payload_settings: string
  created_at: Generated<string>
  updated_at: Generated<string>
  deleted_at: string | null
}

export interface TenantDomainsTable {
  id: Generated<number>
  tenant_id: number
  domain: string
  label: string
  is_primary: number
  status: string
  settings: string
  created_at: Generated<string>
  updated_at: Generated<string>
  deleted_at: string | null
}

export interface AdminUsersTable {
  id: Generated<number>
  name: string
  email: string
  password_hash: string
  role: string
  status: string
  created_at: Generated<string>
  updated_at: Generated<string>
}

export interface RbacPoliciesTable {
  id: Generated<number>
  code: string
  name: string
  description: string
  created_at: Generated<string>
}

export interface TenantRbacPoliciesTable {
  id: Generated<number>
  tenant_id: number
  policy_code: string
  enabled: number
  created_at: Generated<string>
  updated_at: Generated<string>
}

export interface QueueJobsTable {
  id: Generated<number>
  queue_name: string
  type: string
  payload: string
  status: string
  attempts: number
  progress: number
  result: string | null
  error: string | null
  run_at: string
  started_at: string | null
  finished_at: string | null
  created_at: Generated<string>
  updated_at: Generated<string>
}

export interface GstProviderGlobalSettingsTable {
  id: Generated<number>
  uuid: string
  provider: string
  environment: string
  purpose: string
  base_url: string
  email: string
  client_id: string
  client_secret: string
  ip_address: string
  is_enabled: number
  created_at: Generated<string>
  updated_at: Generated<string>
}

export interface DatabaseSchema {
  site_pages: SitePagesTable
  site_services: SiteServicesTable
  site_posts: SitePostsTable
  site_messages: SiteMessagesTable
  industries: IndustriesTable
  tenants: TenantsTable
  tenant_domains: TenantDomainsTable
  admin_users: AdminUsersTable
  rbac_policies: RbacPoliciesTable
  tenant_rbac_policies: TenantRbacPoliciesTable
  queue_jobs: QueueJobsTable
  gst_provider_global_settings: GstProviderGlobalSettingsTable
}
