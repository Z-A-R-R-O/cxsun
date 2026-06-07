export type TaskManagerPriority = string
export type TaskManagerStatus = 'new' | 'todo' | 'in_progress' | 'review' | 'completed' | 'cancelled'
export type TaskManagerScope = 'my' | 'assigned-to-me' | 'open' | 'all'

export interface TaskManagerTask {
  id: number
  uuid: string
  tenant_id: number
  company_id: number | null
  task_no: string
  title: string
  subject: string | null
  description: string | null
  category_id: number | null
  category_name: string | null
  task_type: string | null
  module_key: string | null
  linked_record_id: string | null
  linked_record_label: string | null
  source_module: string | null
  source_record_type: string | null
  source_record_id: string | null
  source_record_uuid: string | null
  source_record_label: string | null
  source_snapshot: string | null
  assigned_to: string | null
  assigned_to_name: string | null
  assigned_by: string
  reviewer: string | null
  claimed_by: string | null
  watchers: string | null
  priority: TaskManagerPriority
  status: TaskManagerStatus
  due_date: string | null
  due_at: Date | null
  reminder_at: Date | null
  recurrence_rule: string | null
  period_key: string | null
  started_at: Date | null
  first_assigned_at: Date | null
  completed_at: Date | null
  completed_by: string | null
  reviewed_at: Date | null
  reopened_count: number
  overdue_at: Date | null
  verification_required: boolean
  auditor_followup_required: boolean
  requires_confirmation: boolean
  confirmed_by: string | null
  confirmed_at: Date | null
  confirmation_payload: string | null
  result_payload: string | null
  score: number
  created_by: string
  updated_by: string | null
  created_at: Date
  updated_at: Date
  deleted_at: Date | null
  activities: TaskManagerActivity[]
  tags: TaskManagerTag[]
  comments: TaskManagerComment[]
  subtasks: TaskManagerSubtask[]
  attachments: TaskManagerAttachment[]
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
  category_id?: number | null
  task_type?: string | null
  module_key?: string | null
  linked_record_id?: string | null
  linked_record_label?: string | null
  source_module?: string | null
  source_record_type?: string | null
  source_record_id?: string | null
  source_record_uuid?: string | null
  source_record_label?: string | null
  source_snapshot?: unknown
  assigned_to?: string | null
  assigned_to_name?: string | null
  reviewer?: string | null
  watchers?: unknown
  priority?: TaskManagerPriority
  status?: TaskManagerStatus
  due_date?: string | null
  due_at?: string | null
  reminder_at?: string | null
  recurrence_rule?: string | null
  period_key?: string | null
  verification_required?: boolean
  auditor_followup_required?: boolean
  requires_confirmation?: boolean
  confirmation_payload?: unknown
  result_payload?: unknown
  score?: number
  tag_ids?: number[]
}

export interface TaskManagerCommentInput {
  body?: string
  parent_comment_id?: number | null
}

export interface TaskManagerSubtaskInput {
  id?: number
  uuid?: string
  title?: string
  status?: TaskManagerStatus
  assigned_to?: string | null
  due_date?: string | null
  sort_order?: number
}

export interface TaskManagerAttachmentInput {
  comment_id?: number | null
  storage_key?: string
  file_name?: string
  mime_type?: string | null
  file_size?: number
  attachment_type?: string
}

export interface TaskManagerSettings {
  id: number
  uuid: string
  tenant_id: number
  default_assignee: string | null
  default_reviewer: string | null
  default_priority: string
  default_task_type: string
  default_reminder_lead_days: number
  open_task_claiming: boolean
  require_completion_confirmation: boolean
  allow_authorized_comments: boolean
  auto_create_campaign_reminders: boolean
  campaign_reminder_hour: string
  media_visibility: string
  media_folder: string
  settings: string | null
  updated_by: string | null
  created_at: Date
  updated_at: Date
}

export interface TaskManagerSettingsInput {
  default_assignee?: string | null
  default_reviewer?: string | null
  default_priority?: string
  default_task_type?: string
  default_reminder_lead_days?: number
  open_task_claiming?: boolean
  require_completion_confirmation?: boolean
  allow_authorized_comments?: boolean
  auto_create_campaign_reminders?: boolean
  campaign_reminder_hour?: string
  media_visibility?: string
  media_folder?: string
  settings?: unknown
}

export interface TaskManagerTemplate {
  id: number
  uuid: string
  tenant_id: number
  name: string
  template_type: string
  category_id: number | null
  default_tags: string | null
  default_priority: string
  default_due_rule: string | null
  requires_confirmation: boolean
  settings: string | null
  is_active: boolean
  created_at: Date
  updated_at: Date
}

export interface TaskManagerTemplateInput {
  id?: number
  uuid?: string
  name?: string
  template_type?: string
  category_id?: number | null
  default_tags?: unknown
  default_priority?: string
  default_due_rule?: string | null
  requires_confirmation?: boolean
  settings?: unknown
  is_active?: boolean
}

export interface TaskManagerCampaign {
  id: number
  uuid: string
  tenant_id: number
  name: string
  campaign_type: string
  source_module: string | null
  status: string
  generated_by: string
  generated_at: Date
  closed_at: Date | null
  reset_at: Date | null
  settings: string | null
  created_at: Date
  updated_at: Date
  items: TaskManagerCampaignItem[]
}

export interface TaskManagerCampaignItem {
  id: number
  uuid: string
  campaign_id: number
  task_id: number | null
  source_module: string | null
  source_record_type: string | null
  source_record_id: string | null
  source_record_uuid: string | null
  source_record_label: string | null
  assigned_to: string | null
  status: string
  is_checked: boolean
  remarks: string | null
  result_payload: string | null
  completed_by: string | null
  completed_at: Date | null
  created_at: Date
  updated_at: Date
}

export interface TaskManagerCampaignInput {
  id?: number
  uuid?: string
  name?: string
  campaign_type?: string
  source_module?: string | null
  status?: string
  settings?: unknown
}

export interface TaskManagerCampaignItemInput {
  id?: number
  uuid?: string
  source_module?: string | null
  source_record_type?: string | null
  source_record_id?: string | null
  source_record_uuid?: string | null
  source_record_label?: string | null
  assigned_to?: string | null
  status?: string
  is_checked?: boolean
  remarks?: string | null
  result_payload?: unknown
}

export interface TaskManagerCampaignItemTaskInput {
  due_date?: string | null
  priority?: string
  title?: string
}

export interface TaskManagerReminder {
  id: number
  uuid: string
  tenant_id: number
  task_id: number | null
  title: string
  remind_at: Date
  recurrence_rule: string | null
  period_key: string | null
  channel: string
  status: string
  assigned_to: string | null
  last_sent_at: Date | null
  next_remind_at: Date | null
  acknowledged_by: string | null
  acknowledged_at: Date | null
  completed_by: string | null
  completed_at: Date | null
  payload: string | null
  created_by: string
  created_at: Date
  updated_at: Date
  deleted_at: Date | null
}

export interface TaskManagerReminderInput {
  id?: number
  uuid?: string
  task_id?: number | null
  title?: string
  remind_at?: string
  recurrence_rule?: string | null
  period_key?: string | null
  channel?: string
  status?: string
  assigned_to?: string | null
  payload?: unknown
}

export interface TaskManagerSalesVerificationCampaignInput {
  name?: string
  from_date?: string | null
  to_date?: string | null
  assigned_to?: string | null
  reminder_at?: string | null
}

export interface TaskManagerContactCleanupCampaignInput {
  name?: string
  assigned_to?: string | null
  reminder_at?: string | null
  include_only_missing?: boolean
}

export interface TaskManagerCategory {
  id: number
  uuid: string
  tenant_id: number
  name: string
  slug: string
  color: string | null
  description: string | null
  is_active: boolean
  created_at: Date
  updated_at: Date
}

export interface TaskManagerTag {
  id: number
  uuid: string
  tenant_id: number
  name: string
  slug: string
  color: string | null
  is_active: boolean
  created_at: Date
  updated_at: Date
}

export interface TaskManagerLookupInput {
  id?: number
  uuid?: string
  name?: string
  slug?: string
  color?: string | null
  description?: string | null
  is_active?: boolean
}

export interface TaskManagerComment {
  id: number
  uuid: string
  task_id: number
  parent_comment_id: number | null
  actor_email: string
  body: string
  visibility: string
  created_at: Date
  updated_at: Date
  deleted_at: Date | null
}

export interface TaskManagerSubtask {
  id: number
  uuid: string
  task_id: number
  title: string
  status: TaskManagerStatus
  assigned_to: string | null
  due_date: string | null
  completed_by: string | null
  completed_at: Date | null
  sort_order: number
  created_at: Date
  updated_at: Date
}

export interface TaskManagerAttachment {
  id: number
  uuid: string
  task_id: number
  comment_id: number | null
  storage_key: string
  file_name: string
  mime_type: string | null
  file_size: number
  attachment_type: string
  uploaded_by: string
  created_at: Date
}
