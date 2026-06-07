import { apiBaseUrl, authHeaders, type AuthSession } from "src/features/auth/auth-client"

export type TaskManagerPriority = string
export type TaskManagerStatus = "new" | "todo" | "in_progress" | "review" | "completed" | "cancelled"
export type TaskManagerScope = "my" | "assigned-to-me" | "open" | "all"

export interface TaskManagerLookupRecord {
  id: number
  uuid: string
  tenant_id: number
  name: string
  slug: string
  color: string | null
  description?: string | null
  is_active: boolean | number
  created_at: string
  updated_at: string
}

export interface TaskManagerActivity {
  id: number
  uuid: string
  task_id: number
  activity_type: string
  actor_email: string
  message: string
  payload: string
  created_at: string
}

export interface TaskManagerComment {
  id: number
  uuid: string
  task_id: number
  parent_comment_id: number | null
  actor_email: string
  body: string
  visibility: string
  created_at: string
  updated_at: string
  deleted_at: string | null
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
  completed_at: string | null
  sort_order: number
  created_at: string
  updated_at: string
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
  created_at: string
}

export interface TaskManagerTemplate {
  id: number
  uuid: string
  name: string
  template_type: string
  category_id: number | null
  default_tags: string | null
  default_priority: string
  default_due_rule: string | null
  requires_confirmation: boolean | number
  settings: string | null
  is_active: boolean | number
  created_at: string
  updated_at: string
}

export interface TaskManagerCampaignItem {
  id: number
  uuid: string
  task_id: number | null
  source_module: string | null
  source_record_type: string | null
  source_record_id: string | null
  source_record_uuid: string | null
  source_record_label: string | null
  assigned_to: string | null
  status: string
  is_checked: boolean | number
  remarks: string | null
  result_payload: string | null
  completed_by: string | null
  completed_at: string | null
}

export type TaskManagerCampaignItemInput = Partial<Omit<TaskManagerCampaignItem, "result_payload"> & { result_payload: unknown }>
export type TaskManagerCampaignItemTaskInput = { due_date?: string | null; priority?: string; title?: string }

export interface TaskManagerCampaign {
  id: number
  uuid: string
  name: string
  campaign_type: string
  source_module: string | null
  status: string
  generated_by: string
  generated_at: string
  closed_at: string | null
  reset_at: string | null
  settings: string | null
  items: TaskManagerCampaignItem[]
}

export interface TaskManagerReminder {
  id: number
  uuid: string
  title: string
  remind_at: string
  recurrence_rule: string | null
  period_key: string | null
  channel: string
  status: string
  assigned_to: string | null
  completed_by: string | null
  completed_at: string | null
}

export interface TaskManagerSettings {
  id: number
  uuid: string
  default_assignee: string | null
  default_reviewer: string | null
  default_priority: string
  default_task_type: string
  default_reminder_lead_days: number
  open_task_claiming: boolean | number
  require_completion_confirmation: boolean | number
  allow_authorized_comments: boolean | number
  auto_create_campaign_reminders: boolean | number
  campaign_reminder_hour: string
  media_visibility: string
  media_folder: string
  settings: string | null
  updated_by: string | null
  created_at: string
  updated_at: string
}

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
  due_at: string | null
  reminder_at: string | null
  recurrence_rule: string | null
  period_key: string | null
  started_at: string | null
  first_assigned_at: string | null
  completed_at: string | null
  completed_by: string | null
  reviewed_at: string | null
  reopened_count: number
  overdue_at: string | null
  verification_required: boolean | number
  auditor_followup_required: boolean | number
  requires_confirmation: boolean | number
  confirmed_by: string | null
  confirmed_at: string | null
  confirmation_payload: string | null
  result_payload: string | null
  score: number
  created_by: string
  updated_by: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
  activities: TaskManagerActivity[]
  tags: TaskManagerLookupRecord[]
  comments: TaskManagerComment[]
  subtasks: TaskManagerSubtask[]
  attachments: TaskManagerAttachment[]
}

export type TaskManagerTaskInput = Partial<TaskManagerTask> & { tag_ids?: number[] }

export function emptyTaskManagerTask(): TaskManagerTaskInput {
  return {
    title: "",
    subject: "",
    description: "",
    category_id: null,
    task_type: "simple_task",
    module_key: "sales",
    linked_record_id: "",
    linked_record_label: "",
    assigned_to: "",
    assigned_to_name: "",
    priority: "normal",
    status: "new",
    due_date: "",
    reminder_at: "",
    verification_required: true,
    auditor_followup_required: false,
    requires_confirmation: false,
    score: 0,
    tag_ids: [],
  }
}

export async function listTaskManagerTasks(session: AuthSession, scope: TaskManagerScope = "all") {
  const response = await fetch(`${apiBaseUrl}/api/v1/task-manager?scope=${encodeURIComponent(scope)}`, { cache: "no-store", headers: authHeaders(session) })
  if (!response.ok) throw new Error(`Task list failed with status ${response.status}.`)
  return (await response.json()) as TaskManagerTask[]
}

export async function upsertTaskManagerTask(session: AuthSession, input: TaskManagerTaskInput) {
  const response = await fetch(`${apiBaseUrl}/api/v1/task-manager/upsert`, {
    body: JSON.stringify(input),
    cache: "no-store",
    headers: { ...authHeaders(session), "Content-Type": "application/json" },
    method: "POST",
  })
  if (!response.ok) throw new Error(`Task save failed with status ${response.status}.`)
  const result = (await response.json()) as { ok: boolean; task?: TaskManagerTask; error?: string }
  if (!result.ok || !result.task) throw new Error(result.error ?? "Task save failed.")
  return result.task
}

export async function changeTaskManagerStatus(session: AuthSession, task: TaskManagerTask, status: TaskManagerStatus) {
  const response = await fetch(`${apiBaseUrl}/api/v1/task-manager/${encodeURIComponent(task.uuid)}/status`, {
    body: JSON.stringify({ status }),
    cache: "no-store",
    headers: { ...authHeaders(session), "Content-Type": "application/json" },
    method: "POST",
  })
  if (!response.ok) throw new Error(`Task status failed with status ${response.status}.`)
  const result = (await response.json()) as { ok: boolean; task?: TaskManagerTask; error?: string }
  if (!result.ok || !result.task) throw new Error(result.error ?? "Task status failed.")
  return result.task
}

export async function deleteTaskManagerTask(session: AuthSession, task: TaskManagerTask) {
  const response = await fetch(`${apiBaseUrl}/api/v1/task-manager/${encodeURIComponent(task.uuid)}/delete`, {
    body: "{}",
    cache: "no-store",
    headers: { ...authHeaders(session), "Content-Type": "application/json" },
    method: "POST",
  })
  if (!response.ok) throw new Error(`Task delete failed with status ${response.status}.`)
}

export async function forceDeleteTaskManagerTask(session: AuthSession, task: TaskManagerTask) {
  const response = await fetch(`${apiBaseUrl}/api/v1/task-manager/${encodeURIComponent(task.uuid)}/force-delete`, {
    body: "{}",
    cache: "no-store",
    headers: { ...authHeaders(session), "Content-Type": "application/json" },
    method: "POST",
  })
  if (!response.ok) throw new Error(await responseErrorMessage(response, "Task force delete failed"))
}

export async function addTaskManagerComment(session: AuthSession, task: TaskManagerTask, input: { body: string; parent_comment_id?: number | null }) {
  const response = await fetch(`${apiBaseUrl}/api/v1/task-manager/${encodeURIComponent(task.uuid)}/comments`, {
    body: JSON.stringify(input),
    cache: "no-store",
    headers: { ...authHeaders(session), "Content-Type": "application/json" },
    method: "POST",
  })
  if (!response.ok) throw new Error(`Task comment failed with status ${response.status}.`)
  const result = (await response.json()) as { ok: boolean; task?: TaskManagerTask; error?: string }
  if (!result.ok || !result.task) throw new Error(result.error ?? "Task comment failed.")
  return result.task
}

export async function upsertTaskManagerSubtask(session: AuthSession, task: TaskManagerTask, input: Partial<TaskManagerSubtask>) {
  const response = await fetch(`${apiBaseUrl}/api/v1/task-manager/${encodeURIComponent(task.uuid)}/subtasks/upsert`, {
    body: JSON.stringify(input),
    cache: "no-store",
    headers: { ...authHeaders(session), "Content-Type": "application/json" },
    method: "POST",
  })
  if (!response.ok) throw new Error(`Sub-task save failed with status ${response.status}.`)
  const result = (await response.json()) as { ok: boolean; task?: TaskManagerTask; error?: string }
  if (!result.ok || !result.task) throw new Error(result.error ?? "Sub-task save failed.")
  return result.task
}

export async function deleteTaskManagerSubtask(session: AuthSession, task: TaskManagerTask, subtask: TaskManagerSubtask) {
  const response = await fetch(`${apiBaseUrl}/api/v1/task-manager/${encodeURIComponent(task.uuid)}/subtasks/${encodeURIComponent(subtask.uuid)}/delete`, {
    body: "{}",
    cache: "no-store",
    headers: { ...authHeaders(session), "Content-Type": "application/json" },
    method: "POST",
  })
  if (!response.ok) throw new Error(`Sub-task delete failed with status ${response.status}.`)
  const result = (await response.json()) as { ok: boolean; task?: TaskManagerTask; error?: string }
  if (!result.ok || !result.task) throw new Error(result.error ?? "Sub-task delete failed.")
  return result.task
}

export async function addTaskManagerAttachment(session: AuthSession, task: TaskManagerTask, input: {
  comment_id?: number | null
  storage_key: string
  file_name: string
  mime_type?: string | null
  file_size?: number
  attachment_type?: string
}) {
  const response = await fetch(`${apiBaseUrl}/api/v1/task-manager/${encodeURIComponent(task.uuid)}/attachments`, {
    body: JSON.stringify(input),
    cache: "no-store",
    headers: { ...authHeaders(session), "Content-Type": "application/json" },
    method: "POST",
  })
  if (!response.ok) throw new Error(`Task attachment failed with status ${response.status}.`)
  const result = (await response.json()) as { ok: boolean; task?: TaskManagerTask; error?: string }
  if (!result.ok || !result.task) throw new Error(result.error ?? "Task attachment failed.")
  return result.task
}

export async function listTaskManagerCategories(session: AuthSession) {
  const response = await fetch(`${apiBaseUrl}/api/v1/task-manager/categories`, { cache: "no-store", headers: authHeaders(session) })
  if (!response.ok) throw new Error(`Task categories failed with status ${response.status}.`)
  return (await response.json()) as TaskManagerLookupRecord[]
}

export async function upsertTaskManagerCategory(session: AuthSession, input: Partial<TaskManagerLookupRecord>) {
  const response = await fetch(`${apiBaseUrl}/api/v1/task-manager/categories/upsert`, {
    body: JSON.stringify(input),
    cache: "no-store",
    headers: { ...authHeaders(session), "Content-Type": "application/json" },
    method: "POST",
  })
  if (!response.ok) throw new Error(`Task category save failed with status ${response.status}.`)
  const result = (await response.json()) as { ok: boolean; category?: TaskManagerLookupRecord; error?: string }
  if (!result.ok || !result.category) throw new Error(result.error ?? "Task category save failed.")
  return result.category
}

export async function listTaskManagerTags(session: AuthSession) {
  const response = await fetch(`${apiBaseUrl}/api/v1/task-manager/tags`, { cache: "no-store", headers: authHeaders(session) })
  if (!response.ok) throw new Error(`Task tags failed with status ${response.status}.`)
  return (await response.json()) as TaskManagerLookupRecord[]
}

export async function upsertTaskManagerTag(session: AuthSession, input: Partial<TaskManagerLookupRecord>) {
  const response = await fetch(`${apiBaseUrl}/api/v1/task-manager/tags/upsert`, {
    body: JSON.stringify(input),
    cache: "no-store",
    headers: { ...authHeaders(session), "Content-Type": "application/json" },
    method: "POST",
  })
  if (!response.ok) throw new Error(`Task tag save failed with status ${response.status}.`)
  const result = (await response.json()) as { ok: boolean; tag?: TaskManagerLookupRecord; error?: string }
  if (!result.ok || !result.tag) throw new Error(result.error ?? "Task tag save failed.")
  return result.tag
}

export async function getTaskManagerSettings(session: AuthSession) {
  const response = await fetch(`${apiBaseUrl}/api/v1/task-manager/settings`, { cache: "no-store", headers: authHeaders(session) })
  if (!response.ok) throw new Error(`Task settings failed with status ${response.status}.`)
  return (await response.json()) as TaskManagerSettings
}

export async function upsertTaskManagerSettings(session: AuthSession, input: Partial<TaskManagerSettings>) {
  const response = await fetch(`${apiBaseUrl}/api/v1/task-manager/settings/upsert`, {
    body: JSON.stringify(input),
    cache: "no-store",
    headers: { ...authHeaders(session), "Content-Type": "application/json" },
    method: "POST",
  })
  if (!response.ok) throw new Error(`Task settings save failed with status ${response.status}.`)
  const result = (await response.json()) as { ok: boolean; settings?: TaskManagerSettings; error?: string }
  if (!result.ok || !result.settings) throw new Error(result.error ?? "Task settings save failed.")
  return result.settings
}

export async function listTaskManagerTemplates(session: AuthSession) {
  const response = await fetch(`${apiBaseUrl}/api/v1/task-manager/templates`, { cache: "no-store", headers: authHeaders(session) })
  if (!response.ok) throw new Error(`Task templates failed with status ${response.status}.`)
  return (await response.json()) as TaskManagerTemplate[]
}

export async function upsertTaskManagerTemplate(session: AuthSession, input: Partial<TaskManagerTemplate>) {
  const response = await fetch(`${apiBaseUrl}/api/v1/task-manager/templates/upsert`, {
    body: JSON.stringify(input),
    cache: "no-store",
    headers: { ...authHeaders(session), "Content-Type": "application/json" },
    method: "POST",
  })
  if (!response.ok) throw new Error(`Task template save failed with status ${response.status}.`)
  return ((await response.json()) as { templates: TaskManagerTemplate[] }).templates
}

export async function listTaskManagerCampaigns(session: AuthSession) {
  const response = await fetch(`${apiBaseUrl}/api/v1/task-manager/campaigns`, { cache: "no-store", headers: authHeaders(session) })
  if (!response.ok) throw new Error(`Task campaigns failed with status ${response.status}.`)
  return (await response.json()) as TaskManagerCampaign[]
}

export async function upsertTaskManagerCampaign(session: AuthSession, input: Partial<TaskManagerCampaign>) {
  const response = await fetch(`${apiBaseUrl}/api/v1/task-manager/campaigns/upsert`, {
    body: JSON.stringify(input),
    cache: "no-store",
    headers: { ...authHeaders(session), "Content-Type": "application/json" },
    method: "POST",
  })
  if (!response.ok) throw new Error(`Task campaign save failed with status ${response.status}.`)
  return ((await response.json()) as { campaigns: TaskManagerCampaign[] }).campaigns
}

export async function createSalesVerificationCampaign(session: AuthSession, input: {
  name?: string
  from_date?: string | null
  to_date?: string | null
  assigned_to?: string | null
  reminder_at?: string | null
}) {
  const response = await fetch(`${apiBaseUrl}/api/v1/task-manager/campaigns/sales-verification`, {
    body: JSON.stringify(input),
    cache: "no-store",
    headers: { ...authHeaders(session), "Content-Type": "application/json" },
    method: "POST",
  })
  if (!response.ok) throw new Error(`Sales verification campaign failed with status ${response.status}.`)
  return ((await response.json()) as { campaigns: TaskManagerCampaign[] }).campaigns
}

export async function createContactCleanupCampaign(session: AuthSession, input: {
  name?: string
  assigned_to?: string | null
  reminder_at?: string | null
  include_only_missing?: boolean
}) {
  const response = await fetch(`${apiBaseUrl}/api/v1/task-manager/campaigns/contact-cleanup`, {
    body: JSON.stringify(input),
    cache: "no-store",
    headers: { ...authHeaders(session), "Content-Type": "application/json" },
    method: "POST",
  })
  if (!response.ok) throw new Error(`Contact cleanup campaign failed with status ${response.status}.`)
  return ((await response.json()) as { campaigns: TaskManagerCampaign[] }).campaigns
}

export async function setTaskManagerCampaignStatus(session: AuthSession, campaign: TaskManagerCampaign, status: "open" | "closed" | "reset" | "archived") {
  const response = await fetch(`${apiBaseUrl}/api/v1/task-manager/campaigns/${campaign.uuid}/status`, {
    body: JSON.stringify({ status }),
    cache: "no-store",
    headers: { ...authHeaders(session), "Content-Type": "application/json" },
    method: "POST",
  })
  if (!response.ok) throw new Error(`Task campaign status failed with status ${response.status}.`)
  return ((await response.json()) as { campaigns: TaskManagerCampaign[] }).campaigns
}

export async function deleteTaskManagerCampaign(session: AuthSession, campaign: TaskManagerCampaign) {
  const response = await fetch(`${apiBaseUrl}/api/v1/task-manager/campaigns/${campaign.uuid}/delete`, {
    body: "{}",
    cache: "no-store",
    headers: { ...authHeaders(session), "Content-Type": "application/json" },
    method: "POST",
  })
  if (!response.ok) throw new Error(`Task campaign delete failed with status ${response.status}.`)
  return ((await response.json()) as { campaigns: TaskManagerCampaign[] }).campaigns
}

export async function upsertTaskManagerCampaignItem(session: AuthSession, campaign: TaskManagerCampaign, input: TaskManagerCampaignItemInput) {
  const response = await fetch(`${apiBaseUrl}/api/v1/task-manager/campaigns/${campaign.uuid}/items/upsert`, {
    body: JSON.stringify(input),
    cache: "no-store",
    headers: { ...authHeaders(session), "Content-Type": "application/json" },
    method: "POST",
  })
  if (!response.ok) throw new Error(`Task campaign item save failed with status ${response.status}.`)
  return ((await response.json()) as { campaigns: TaskManagerCampaign[] }).campaigns
}

export async function createTaskFromCampaignItem(session: AuthSession, campaign: TaskManagerCampaign, item: TaskManagerCampaignItem, input: TaskManagerCampaignItemTaskInput = {}) {
  const response = await fetch(`${apiBaseUrl}/api/v1/task-manager/campaigns/${campaign.uuid}/items/${item.uuid}/create-task`, {
    body: JSON.stringify(input),
    cache: "no-store",
    headers: { ...authHeaders(session), "Content-Type": "application/json" },
    method: "POST",
  })
  if (!response.ok) throw new Error(`Campaign item task creation failed with status ${response.status}.`)
  return (await response.json()) as { ok: boolean; campaigns: TaskManagerCampaign[]; task?: TaskManagerTask }
}

export async function listTaskManagerReminders(session: AuthSession) {
  const response = await fetch(`${apiBaseUrl}/api/v1/task-manager/reminders`, { cache: "no-store", headers: authHeaders(session) })
  if (!response.ok) throw new Error(`Task reminders failed with status ${response.status}.`)
  return (await response.json()) as TaskManagerReminder[]
}

export async function upsertTaskManagerReminder(session: AuthSession, input: Partial<TaskManagerReminder>) {
  const response = await fetch(`${apiBaseUrl}/api/v1/task-manager/reminders/upsert`, {
    body: JSON.stringify(input),
    cache: "no-store",
    headers: { ...authHeaders(session), "Content-Type": "application/json" },
    method: "POST",
  })
  if (!response.ok) throw new Error(`Task reminder save failed with status ${response.status}.`)
  return ((await response.json()) as { reminders: TaskManagerReminder[] }).reminders
}

export async function completeTaskManagerReminder(session: AuthSession, reminder: TaskManagerReminder) {
  const response = await fetch(`${apiBaseUrl}/api/v1/task-manager/reminders/${reminder.uuid}/complete`, {
    body: "{}",
    cache: "no-store",
    headers: { ...authHeaders(session), "Content-Type": "application/json" },
    method: "POST",
  })
  if (!response.ok) throw new Error(`Task reminder complete failed with status ${response.status}.`)
  return ((await response.json()) as { reminders: TaskManagerReminder[] }).reminders
}

async function responseErrorMessage(response: Response, fallback: string) {
  try {
    const payload = (await response.json()) as { error?: string; message?: string }
    return payload.error || payload.message || `${fallback} with status ${response.status}.`
  } catch {
    return `${fallback} with status ${response.status}.`
  }
}
