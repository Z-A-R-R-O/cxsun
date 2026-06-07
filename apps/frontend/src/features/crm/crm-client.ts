import { apiBaseUrl, authHeaders, type AuthSession } from "src/features/auth/auth-client"

export interface CrmPipelineStage {
  id: number
  uuid: string
  tenant_id: number
  pipeline_id: number
  name: string
  stage_key: string
  probability: number
  sort_order: number
  is_won: boolean | number
  is_lost: boolean | number
  is_active: boolean | number
  created_at: string
  updated_at: string
}

export interface CrmPipeline {
  id: number
  uuid: string
  tenant_id: number
  name: string
  description: string | null
  is_default: boolean | number
  is_active: boolean | number
  created_by: string
  updated_by: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
  stages: CrmPipelineStage[]
}

export interface CrmLead {
  id: number
  uuid: string
  tenant_id: number
  name: string
  company_name: string | null
  email: string | null
  phone: string | null
  source: string | null
  status: string
  owner_email: string | null
  estimated_value: number
  notes: string | null
  converted_deal_id: number | null
  created_by: string
  updated_by: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface CrmDeal {
  id: number
  uuid: string
  tenant_id: number
  pipeline_id: number
  stage_id: number
  lead_id: number | null
  title: string
  account_name: string | null
  contact_name: string | null
  email: string | null
  phone: string | null
  amount: number
  probability: number
  expected_close_date: string | null
  status: string
  owner_email: string | null
  notes: string | null
  created_by: string
  updated_by: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface CrmWorkspace {
  pipelines: CrmPipeline[]
  leads: CrmLead[]
  deals: CrmDeal[]
}

export type CrmView = "leads" | "deals" | "pipeline"

export function emptyLead(): Partial<CrmLead> {
  return { name: "", company_name: "", email: "", phone: "", source: "", status: "new", owner_email: "", estimated_value: 0, notes: "" }
}

export function emptyDeal(pipeline?: CrmPipeline | null): Partial<CrmDeal> {
  return { title: "", account_name: "", contact_name: "", email: "", phone: "", amount: 0, probability: pipeline?.stages[0]?.probability ?? 0, pipeline_id: pipeline?.id, stage_id: pipeline?.stages[0]?.id, status: "open", owner_email: "", expected_close_date: "", notes: "" }
}

export function emptyPipeline(): Partial<CrmPipeline> {
  return { name: "", description: "", is_default: false, is_active: true }
}

export function emptyStage(pipeline: CrmPipeline): Partial<CrmPipelineStage> {
  return { pipeline_id: pipeline.id, name: "", probability: 0, sort_order: pipeline.stages.length * 10 + 10, is_active: true, is_won: false, is_lost: false }
}

export async function getCrmWorkspace(session: AuthSession) {
  const response = await fetch(`${apiBaseUrl}/api/v1/crm`, { cache: "no-store", headers: authHeaders(session) })
  if (!response.ok) throw new Error(`CRM workspace failed with status ${response.status}.`)
  return (await response.json()) as CrmWorkspace
}

export async function upsertCrmLead(session: AuthSession, input: Partial<CrmLead>) {
  return crmWorkspacePost(session, "leads/upsert", input, "Lead save failed")
}

export async function deleteCrmLead(session: AuthSession, lead: CrmLead) {
  return crmWorkspacePost(session, `leads/${lead.uuid}/delete`, {}, "Lead delete failed")
}

export async function upsertCrmDeal(session: AuthSession, input: Partial<CrmDeal>) {
  return crmWorkspacePost(session, "deals/upsert", input, "Deal save failed")
}

export async function deleteCrmDeal(session: AuthSession, deal: CrmDeal) {
  return crmWorkspacePost(session, `deals/${deal.uuid}/delete`, {}, "Deal delete failed")
}

export async function upsertCrmPipeline(session: AuthSession, input: Partial<CrmPipeline>) {
  return crmWorkspacePost(session, "pipelines/upsert", input, "Pipeline save failed")
}

export async function deleteCrmPipeline(session: AuthSession, pipeline: CrmPipeline) {
  return crmWorkspacePost(session, `pipelines/${pipeline.uuid}/delete`, {}, "Pipeline delete failed")
}

export async function upsertCrmStage(session: AuthSession, pipeline: CrmPipeline, input: Partial<CrmPipelineStage>) {
  return crmWorkspacePost(session, `pipelines/${pipeline.uuid}/stages/upsert`, input, "Stage save failed")
}

async function crmWorkspacePost(session: AuthSession, path: string, input: unknown, fallback: string) {
  const response = await fetch(`${apiBaseUrl}/api/v1/crm/${path}`, {
    body: JSON.stringify(input),
    cache: "no-store",
    headers: { ...authHeaders(session), "Content-Type": "application/json" },
    method: "POST",
  })
  if (!response.ok) throw new Error(`${fallback} with status ${response.status}.`)
  const result = (await response.json()) as { ok: boolean; workspace?: CrmWorkspace; error?: string }
  if (!result.ok || !result.workspace) throw new Error(result.error ?? fallback)
  return result.workspace
}
