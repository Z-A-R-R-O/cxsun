export interface CrmPipeline {
  id: number
  uuid: string
  tenant_id: number
  name: string
  description: string | null
  is_default: boolean
  is_active: boolean
  created_by: string
  updated_by: string | null
  created_at: Date
  updated_at: Date
  deleted_at: Date | null
  stages: CrmPipelineStage[]
}

export interface CrmPipelineStage {
  id: number
  uuid: string
  tenant_id: number
  pipeline_id: number
  name: string
  stage_key: string
  probability: number
  sort_order: number
  is_won: boolean
  is_lost: boolean
  is_active: boolean
  created_at: Date
  updated_at: Date
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
  created_at: Date
  updated_at: Date
  deleted_at: Date | null
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
  created_at: Date
  updated_at: Date
  deleted_at: Date | null
}

export type CrmPipelineInput = Partial<Omit<CrmPipeline, 'stages'>>
export type CrmPipelineStageInput = Partial<CrmPipelineStage>
export type CrmLeadInput = Partial<CrmLead>
export type CrmDealInput = Partial<CrmDeal>

export interface CrmWorkspace {
  pipelines: CrmPipeline[]
  leads: CrmLead[]
  deals: CrmDeal[]
}
