import { getRequiredApiUrl } from "@/lib/runtime-env";
import {
  authFetch,
  withStoredApplicationContextPayload,
  withStoredApplicationContextQuery,
} from "../../auth/infrastructure/auth-api";
import type {
  DocumentEntryKind,
  DocumentNumberSetting,
  DocumentNumberSettingInput,
} from "../domain/document-settings";

export async function listDocumentNumberSettings(options?: { readonly signal?: AbortSignal }) {
  const response = await authFetch(
    withStoredApplicationContextQuery(`${apiBaseUrl()}/document-settings/numbers`),
    {
      cache: "no-store",
      headers: { Accept: "application/json" },
      signal: options?.signal,
    },
  );
  if (!response.ok) {
    throw new Error(`Document settings request failed with status ${response.status}.`);
  }
  return (await response.json()) as DocumentNumberSetting[];
}

export async function saveDocumentNumberSettings(
  settings: readonly DocumentNumberSettingInput[],
  options?: { readonly signal?: AbortSignal },
) {
  const response = await authFetch(
    withStoredApplicationContextQuery(`${apiBaseUrl()}/document-settings/numbers`),
    {
      body: JSON.stringify({ settings }),
      cache: "no-store",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      method: "PATCH",
      signal: options?.signal,
    },
  );
  if (!response.ok) {
    throw new Error(`Document settings save failed with status ${response.status}.`);
  }
  return (await response.json()) as DocumentNumberSetting[];
}

export async function getNextDocumentNumber(
  kind: DocumentEntryKind,
  options?: { readonly signal?: AbortSignal },
) {
  const response = await authFetch(
    withStoredApplicationContextQuery(`${apiBaseUrl()}/document-settings/numbers/${kind}/next`),
    {
      cache: "no-store",
      headers: { Accept: "application/json" },
      signal: options?.signal,
    },
  );
  if (!response.ok) {
    throw new Error(`Next document number request failed with status ${response.status}.`);
  }
  return (await response.json()) as DocumentNumberSetting;
}

export function withAutoDocumentNumber<T extends Record<string, unknown>>(input: T, auto: boolean) {
  return withStoredApplicationContextPayload({ ...input, autoDocumentNo: auto });
}

function apiBaseUrl() {
  return getRequiredApiUrl();
}
