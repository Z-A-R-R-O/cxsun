import { getRequiredApiUrl } from "@/lib/runtime-env";
import { authFetch } from "../../auth/infrastructure/auth-api";

export interface CoreEnvSetting {
  readonly key: string;
  readonly label: string;
  readonly group: string;
  readonly description: string;
  readonly sensitive?: boolean;
  readonly options?: readonly CoreEnvSettingOption[];
  readonly value: string;
}

export interface CoreEnvSettingOption {
  readonly value: string;
  readonly label: string;
  readonly description?: string;
}

export interface CoreEnvGroup {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  readonly settings: readonly CoreEnvSetting[];
}

export interface CoreEnvPolicyItem {
  readonly key: string;
  readonly status: "managed" | "excluded" | "unmanaged";
  readonly reason: string;
}

export interface CoreEnvPolicy {
  readonly managed: readonly CoreEnvPolicyItem[];
  readonly excluded: readonly CoreEnvPolicyItem[];
  readonly unmanaged: readonly CoreEnvPolicyItem[];
}

export interface CoreEnvSettingsResponse {
  readonly envFilePath: string | null;
  readonly groups: readonly CoreEnvGroup[];
  readonly policy: CoreEnvPolicy;
  readonly raw: string;
}

export async function getCoreEnvSettings(options?: { readonly signal?: AbortSignal }) {
  const response = await authFetch(`${apiBaseUrl()}/core-settings/env`, {
    signal: options?.signal,
  });

  if (!response.ok) {
    throw new Error(await readApiErrorMessage(response, `Core settings failed with status ${response.status}.`));
  }

  return (await response.json()) as CoreEnvSettingsResponse;
}

export async function updateCoreEnvSettings(values: Record<string, string>) {
  const response = await authFetch(`${apiBaseUrl()}/core-settings/env`, {
    body: JSON.stringify({ values }),
    headers: { "Content-Type": "application/json" },
    method: "PATCH",
  });

  if (!response.ok) {
    throw new Error(await readApiErrorMessage(response, `Core settings save failed with status ${response.status}.`));
  }

  return (await response.json()) as CoreEnvSettingsResponse;
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
    // Some failures are not JSON responses.
  }

  return fallback;
}
