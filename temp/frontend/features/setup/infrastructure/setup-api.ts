import { getRequiredApiUrl } from "@/lib/runtime-env";

export type SetupAction = "build" | "deploy" | "prepare-db" | "pull" | "smoke" | "start" | "status";

export interface SetupConfigureInput {
  readonly appHost: string;
  readonly appHttpPort: string;
  readonly frontendHttpPort: string;
  readonly dbHost: string;
  readonly dbPort: string;
  readonly dbName: string;
  readonly dbUser: string;
  readonly dbPassword: string;
  readonly jwtSecret: string;
  readonly gitUrl: string;
  readonly gitBranch: string;
  readonly deployDir: string;
}

export interface SetupResponse {
  readonly command?: string;
  readonly envPath?: string;
  readonly exitCode?: number;
  readonly message?: string;
  readonly setup?: {
    readonly configured?: boolean;
    readonly envExists?: boolean;
    readonly missing?: readonly string[];
    readonly placeholderSecrets?: readonly string[];
    readonly values?: Record<string, string>;
  };
  readonly status: string;
  readonly stderr?: string;
  readonly stdout?: string;
  readonly timestamp?: string;
  readonly [key: string]: unknown;
}

export async function getSetupStatus(options?: { readonly signal?: AbortSignal }) {
  const response = await fetch(`${apiBaseUrl()}/setup/status`, {
    cache: "no-store",
    headers: { Accept: "application/json" },
    signal: options?.signal,
  });
  if (!response.ok) throw new Error(await readApiErrorMessage(response, "Setup status failed."));
  return (await response.json()) as SetupResponse;
}

export async function configureSetup(input: SetupConfigureInput) {
  const response = await fetch(`${apiBaseUrl()}/setup/configure`, {
    body: JSON.stringify(input),
    cache: "no-store",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    method: "POST",
  });
  if (!response.ok) throw new Error(await readApiErrorMessage(response, "Setup configure failed."));
  return (await response.json()) as SetupResponse;
}

export async function runSetupAction(action: SetupAction) {
  const response = await fetch(`${apiBaseUrl()}/setup/${action}`, {
    cache: "no-store",
    headers: { Accept: "application/json" },
    method: "POST",
  });
  if (!response.ok) throw new Error(await readApiErrorMessage(response, `Setup ${action} failed.`));
  return (await response.json()) as SetupResponse;
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
    // Response is not JSON.
  }
  return fallback;
}
