import { getRequiredApiUrl } from "@/lib/runtime-env";
import { authFetch } from "../../auth/infrastructure/auth-api";

export type SystemUpdateAction = "build" | "deploy" | "preflight" | "restart" | "rollback" | "smoke" | "sync";

export interface SystemUpdateHistoryRecord {
  readonly action: string;
  readonly finishedAt?: string | null;
  readonly gitBranch?: string | null;
  readonly id?: number;
  readonly localCommit?: string | null;
  readonly message?: string | null;
  readonly operationId: string;
  readonly previousCommit?: string | null;
  readonly progressPercent?: number;
  readonly remoteCommit?: string | null;
  readonly requestedByName?: string | null;
  readonly startedAt?: string | null;
  readonly status: string;
  readonly stderr?: string | null;
  readonly stdout?: string | null;
  readonly targetCommit?: string | null;
}

export interface SystemUpdateResponse {
  readonly activeOperation?: {
    readonly action?: string;
    readonly operationId?: string;
    readonly startedAt?: string;
  };
  readonly action?: string;
  readonly command?: string;
  readonly deployDir?: string;
  readonly exitCode?: number;
  readonly gitBranch?: string;
  readonly gitUrl?: string;
  readonly history?: readonly SystemUpdateHistoryRecord[];
  readonly maintenanceMode?: boolean;
  readonly message?: string;
  readonly preflight?: {
    readonly ok?: boolean;
    readonly problems?: readonly string[];
  };
  readonly status: string;
  readonly runningAction?: string;
  readonly rollbackTarget?: string | null;
  readonly stderr?: string;
  readonly stdout?: string;
  readonly timestamp?: string;
  readonly [key: string]: unknown;
}

export async function getSystemUpdateStatus(options?: { readonly signal?: AbortSignal }) {
  const response = await authFetch(`${apiBaseUrl()}/system-update/status`, {
    signal: options?.signal,
  });

  if (!response.ok) {
    throw new Error(await readApiErrorMessage(response, `System update status failed with status ${response.status}.`));
  }

  return (await response.json()) as SystemUpdateResponse;
}

export async function runSystemUpdateAction(action: SystemUpdateAction, input?: { readonly targetCommit?: string | null }) {
  const response = await authFetch(`${apiBaseUrl()}/system-update/${action}`, {
    body: input ? JSON.stringify(input) : undefined,
    headers: input ? { "Content-Type": "application/json" } : undefined,
    method: "POST",
  });

  if (!response.ok) {
    throw new Error(await readApiErrorMessage(response, `System update ${action} failed with status ${response.status}.`));
  }

  return (await response.json()) as SystemUpdateResponse;
}

function apiBaseUrl() {
  return getRequiredApiUrl();
}

async function readApiErrorMessage(response: Response, fallback: string) {
  try {
    const body = (await response.json()) as { readonly message?: unknown; readonly error?: unknown };
    const message = Array.isArray(body.message) ? body.message[0] : body.message;

    if (typeof message === "string" && message.trim()) return message;
    if (typeof body.error === "string" && body.error.trim()) return body.error;
  } catch {
    // Some responses are not JSON.
  }

  return fallback;
}
