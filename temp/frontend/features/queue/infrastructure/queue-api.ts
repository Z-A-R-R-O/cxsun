import { getRequiredApiUrl } from "@/lib/runtime-env";
import { authFetch } from "../../auth/infrastructure/auth-api";

export type QueueJobStatus = "waiting" | "active" | "completed" | "failed" | "cancelled";

export interface QueueJobRecord {
  readonly id: string;
  readonly queueName: string;
  readonly jobName: string;
  readonly status: QueueJobStatus;
  readonly payload: Record<string, unknown>;
  readonly result: Record<string, unknown>;
  readonly progressPercent: number;
  readonly attemptsMade: number;
  readonly maxAttempts: number;
  readonly priority: number;
  readonly companyId: string | null;
  readonly requestedByUserId: string | null;
  readonly requestedByName: string | null;
  readonly availableAt: string;
  readonly lockedAt: string | null;
  readonly startedAt: string | null;
  readonly finishedAt: string | null;
  readonly lastError: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface QueueStatsRecord {
  readonly total: number;
  readonly waiting: number;
  readonly active: number;
  readonly completed: number;
  readonly failed: number;
  readonly cancelled: number;
}

export interface QueueCatalogRecord {
  readonly queues: readonly {
    readonly queueName: string;
    readonly label: string;
    readonly jobs: readonly {
      readonly jobName: string;
      readonly label: string;
      readonly description: string;
      readonly samplePayload: Record<string, unknown>;
    }[];
  }[];
}

export interface QueueJobListResult {
  readonly items: readonly QueueJobRecord[];
  readonly nextCursor: string | null;
}

export async function getQueueCatalog() {
  const response = await authFetch(`${apiBaseUrl()}/queue/catalog`, {
    cache: "no-store",
    headers: { Accept: "application/json" },
  });
  if (!response.ok) {
    throw new Error(`Queue catalog failed with status ${response.status}.`);
  }
  return (await response.json()) as QueueCatalogRecord;
}

export async function getQueueStats(companyId?: string | null) {
  const response = await authFetch(`${apiBaseUrl()}/queue/stats${toQuery({ companyId })}`, {
    cache: "no-store",
    headers: { Accept: "application/json" },
  });
  if (!response.ok) {
    throw new Error(`Queue stats failed with status ${response.status}.`);
  }
  return (await response.json()) as QueueStatsRecord;
}

export async function listQueueJobs(filters: {
  readonly companyId?: string | null;
  readonly cursor?: string | null;
  readonly limit?: number;
  readonly queueName?: string | null;
  readonly search?: string | null;
  readonly status?: QueueJobStatus | null;
}) {
  const response = await authFetch(`${apiBaseUrl()}/queue/jobs${toQuery(filters)}`, {
    cache: "no-store",
    headers: { Accept: "application/json" },
  });
  if (!response.ok) {
    throw new Error(`Queue jobs failed with status ${response.status}.`);
  }
  return (await response.json()) as QueueJobListResult;
}

export async function createQueueJob(input: {
  readonly companyId?: string | null;
  readonly queueName: string;
  readonly jobName: string;
  readonly payload: Record<string, unknown>;
  readonly maxAttempts?: number;
  readonly priority?: number;
}) {
  const { companyId, ...body } = input;
  const response = await authFetch(`${apiBaseUrl()}/queue/jobs${toQuery({ companyId })}`, {
    body: JSON.stringify(body),
    cache: "no-store",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    method: "POST",
  });
  if (!response.ok) {
    throw new Error(`Queue create failed with status ${response.status}.`);
  }
  return (await response.json()) as QueueJobRecord;
}

export async function retryQueueJob(jobId: string) {
  const response = await authFetch(`${apiBaseUrl()}/queue/jobs/${jobId}/retry`, {
    cache: "no-store",
    headers: { Accept: "application/json" },
    method: "POST",
  });
  if (!response.ok) {
    throw new Error(`Queue retry failed with status ${response.status}.`);
  }
  return (await response.json()) as QueueJobRecord;
}

export async function cancelQueueJob(jobId: string) {
  const response = await authFetch(`${apiBaseUrl()}/queue/jobs/${jobId}/cancel`, {
    cache: "no-store",
    headers: { Accept: "application/json" },
    method: "POST",
  });
  if (!response.ok) {
    throw new Error(`Queue cancel failed with status ${response.status}.`);
  }
  return (await response.json()) as QueueJobRecord;
}

export async function deleteQueueJob(jobId: string) {
  const response = await authFetch(`${apiBaseUrl()}/queue/jobs/${jobId}`, {
    cache: "no-store",
    headers: { Accept: "application/json" },
    method: "DELETE",
  });
  if (!response.ok) {
    throw new Error(`Queue delete failed with status ${response.status}.`);
  }
  return (await response.json()) as { readonly deleted: boolean };
}

function apiBaseUrl() {
  return getRequiredApiUrl();
}

function toQuery(values: Record<string, unknown>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) {
    if (value === null || value === undefined || value === "") {
      continue;
    }
    params.set(key, String(value));
  }
  const query = params.toString();
  return query ? `?${query}` : "";
}
