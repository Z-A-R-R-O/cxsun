export type TaskManagerPriority = 'low' | 'normal' | 'high' | 'urgent'
export type TaskManagerStatus = 'new' | 'todo' | 'in_progress' | 'review' | 'completed' | 'cancelled'

export interface TaskManagerTask {
  id: number
  uuid: string
  tenant_id: number
  company_id: number | null
  task_no: string
  title: string
  subject: string | null
  description: string | null
  module_key: string | null
  linked_record_id: string | null
  linked_record_label: string | null
  assigned_to: string | null
  assigned_to_name: string | null
  assigned_by: string
  priority: TaskManagerPriority
  status: TaskManagerStatus
  due_date: string | null
  started_at: Date | null
  completed_at: Date | null
  completed_by: string | null
  verification_required: boolean
  auditor_followup_required: boolean
  score: number
  created_by: string
  updated_by: string | null
  created_at: Date
  updated_at: Date
  deleted_at: Date | null
  activities: TaskManagerActivity[]
}

export interface TaskManagerActivity {
  id: number
  uuid: string
  task_id: number
  activity_type: string
  actor_email: string
  message: string
  payload: string
  created_at: Date
}

export interface TaskManagerTaskInput {
  uuid?: string
  title?: string
  subject?: string | null
  description?: string | null
  module_key?: string | null
  linked_record_id?: string | null
  linked_record_label?: string | null
  assigned_to?: string | null
  assigned_to_name?: string | null
  priority?: TaskManagerPriority
  status?: TaskManagerStatus
  due_date?: string | null
  verification_required?: boolean
  auditor_followup_required?: boolean
  score?: number
}
