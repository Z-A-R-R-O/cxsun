import { getRequiredApiUrl } from "@/lib/runtime-env";
import { authFetch } from "../../auth/infrastructure/auth-api";

export type CompanySettingKey = "apps" | "software" | "mail";

export interface CompanySettingRecord<TValues> {
  readonly companyId: string;
  readonly key: CompanySettingKey;
  readonly values: TValues;
  readonly updatedAt: string;
}

export async function getCompanySetting<TValues>(
  key: CompanySettingKey,
  companyId: string,
  options?: { readonly signal?: AbortSignal },
) {
  const response = await authFetch(
    `${apiBaseUrl()}/company-settings/${key}?companyId=${companyId}`,
    {
      cache: "no-store",
      headers: { Accept: "application/json" },
      signal: options?.signal,
    },
  );
  if (!response.ok) {
    throw new Error(`Company setting request failed with status ${response.status}.`);
  }
  return (await response.json()) as CompanySettingRecord<TValues>;
}

export async function saveCompanySetting<TValues>(
  key: CompanySettingKey,
  companyId: string,
  values: TValues,
  options?: { readonly signal?: AbortSignal },
) {
  const response = await authFetch(
    `${apiBaseUrl()}/company-settings/${key}?companyId=${companyId}`,
    {
      body: JSON.stringify({ values }),
      cache: "no-store",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      method: "PATCH",
      signal: options?.signal,
    },
  );
  if (!response.ok) {
    throw new Error(`Company setting save failed with status ${response.status}.`);
  }
  return (await response.json()) as CompanySettingRecord<TValues>;
}

function apiBaseUrl() {
  return getRequiredApiUrl();
}
