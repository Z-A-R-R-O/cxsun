import { apiBaseUrl, authHeaders, type AuthSession } from "src/features/auth/auth-client"

export type TaskManagerPriority = "low" | "normal" | "high" | "urgent"
export type TaskManagerStatus = "new" | "todo" | "in_progress" | "review" | "completed" | "cancelled"

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
  started_at: string | null
  completed_at: string | null
  completed_by: string | null
  verification_required: boolean | number
  auditor_followup_required: boolean | number
  score: number
  created_by: string
  updated_by: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
  activities: TaskManagerActivity[]
}

export type TaskManagerTaskInput = Partial<TaskManagerTask>

export function emptyTaskManagerTask(): TaskManagerTaskInput {
  return {
    title: "",
    subject: "",
    description: "",
    module_key: "sales",
    linked_record_id: "",
    linked_record_label: "",
    assigned_to: "",
    assigned_to_name: "",
    priority: "normal",
    status: "new",
    due_date: "",
    verification_required: true,
    auditor_followup_required: false,
    score: 0,
  }
}

export async function listTaskManagerTasks(session: AuthSession) {
  const response = await fetch(`${apiBaseUrl}/api/v1/task-manager`, { cache: "no-store", headers: authHeaders(session) })
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
