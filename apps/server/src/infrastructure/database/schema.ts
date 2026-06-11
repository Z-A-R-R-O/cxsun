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

export interface QueueRuntimeSettingsTable {
  setting_key: string
  setting_value: string
  updated_by: string | null
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

export interface ConversationsTable {
  id: Generated<number>
  uuid: string
  tenant_id: number | null
  user_email: string | null
  surface: string
  title: string
  status: string
  metadata: string | null
  created_at: Generated<string>
  updated_at: Generated<string>
}

export interface AgentLogsTable {
  id: Generated<number>
  uuid: string
  conversation_id: number | null
  tenant_id: number | null
  agent_id: string
  event_type: string
  model_id: string | null
  input_summary: string | null
  output_summary: string | null
  metadata: string | null
  latency_ms: number | null
  status: string
  error_message: string | null
  created_at: Generated<string>
}

export interface KnowledgeDocumentsTable {
  id: Generated<number>
  uuid: string
  source_type: string
  source_path: string
  title: string
  chunk_key: string
  content: string
  metadata: string | null
  status: string
  created_at: Generated<string>
  updated_at: Generated<string>
}

export interface AgentProviderConnectionsTable {
  id: Generated<number>
  uuid: string
  provider_key: string
  provider_name: string
  provider_kind: string
  base_url: string
  api_key_ciphertext: string
  api_key_iv: string
  api_key_tag: string
  default_model: string
  free_models: string | null
  premium_models: string | null
  is_active: number
  status: string
  last_test_status: string | null
  last_test_message: string | null
  last_tested_at: string | null
  metadata: string | null
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
  queue_runtime_settings: QueueRuntimeSettingsTable
  gst_provider_global_settings: GstProviderGlobalSettingsTable
  conversations: ConversationsTable
  agent_logs: AgentLogsTable
  knowledge_documents: KnowledgeDocumentsTable
  agent_provider_connections: AgentProviderConnectionsTable
}
