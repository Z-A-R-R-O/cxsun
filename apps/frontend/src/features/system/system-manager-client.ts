import { authHeaders, type AuthSession } from "src/features/auth/auth-client"
import { apiBaseUrl } from "src/lib/api-base-url"

export interface QueueJob {
  id: number
  queue_name: string
  type: string
  payload: unknown
  status: string
  attempts: number
  progress: number
  result: unknown | null
  error: string | null
  run_at: string
  started_at: string | null
  finished_at: string | null
  created_at: string
  updated_at: string
}

export interface QueueOverview {
  stats: { status: string; count: number }[]
  latest: QueueJob[]
  bullmq?: { name: string; counts: null | Record<string, number> }[]
}

export interface DatabaseOverview {
  master: { host: string; port: number; database: string; user: string }
  tenants: { slug: string; name: string; status: string; db_host: string; db_port: number; db_name: string; db_user: string }[]
  backups: DatabaseBackup[]
  lastOperation: null | { type: string; acceptedAt: string; target?: string; command: string }
}

export interface DatabaseBackup {
  id: string
  path: string
  createdAt: string
  databaseCount: number
  databases: { label?: string; database?: string }[]
}

export async function getQueueOverview(session: AuthSession) {
  return request<QueueOverview>(session, "/api/system/queue-manager/overview")
}

export async function listQueueJobs(session: AuthSession, status = "all", queue = "all") {
  return request<{ jobs: QueueJob[] }>(session, `/api/system/queue-manager/jobs?status=${encodeURIComponent(status)}&queue=${encodeURIComponent(queue)}&limit=100`)
}

export async function queueJobAction(session: AuthSession, id: number, action: "retry" | "cancel" | "delete") {
  return request<{ ok: boolean; error?: string }>(session, `/api/system/queue-manager/jobs/${id}/action`, {
    method: "POST",
    body: JSON.stringify({ action }),
  })
}

export async function enqueueDatabaseBackup(session: AuthSession) {
  return request<{ ok: boolean }>(session, "/api/system/queue-manager/enqueue-backup", { method: "POST" })
}

export async function getDatabaseOverview(session: AuthSession) {
  return request<DatabaseOverview>(session, "/api/system/database-manager/overview")
}

export async function startDatabaseBackup(session: AuthSession) {
  return request<{ accepted: boolean }>(session, "/api/system/database-manager/backup", { method: "POST" })
}

export async function startDatabaseRestore(session: AuthSession, backupId: string) {
  return request<{ accepted: boolean }>(session, "/api/system/database-manager/restore", {
    method: "POST",
    body: JSON.stringify({ backupId }),
  })
}

async function request<T>(session: AuthSession, path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers: {
      ...authHeaders(session),
      "Content-Type": "application/json",
      ...init?.headers,
    },
  })
  const payload = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(payload.error ?? `Request failed with status ${response.status}.`)
  }

  return payload as T
}
