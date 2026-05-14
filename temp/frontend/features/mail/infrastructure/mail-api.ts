import { getRequiredApiUrl } from "@/lib/runtime-env";
import { authFetch } from "../../auth/infrastructure/auth-api";
import type {
  CompanyMailSettings,
  MailCategory,
  MailLogDetailRecord,
  MailLogListResult,
  MailStatus,
  MailStatusResponse,
  MailTemplateKey,
  MailTemplatePreview,
  MailTemplateRecord,
} from "../domain/mail";

export async function getMailStatus(companyId?: string | null) {
  const response = await authFetch(`${apiBaseUrl()}/mail/status${toQuery({ companyId })}`, {
    cache: "no-store",
    headers: { Accept: "application/json" },
  });
  if (!response.ok) {
    throw new Error(`Mail status failed with status ${response.status}.`);
  }
  return (await response.json()) as MailStatusResponse;
}

export async function sendMailTest(input: {
  readonly companyId?: string | null;
  readonly recipientEmail: string;
}) {
  const response = await authFetch(`${apiBaseUrl()}/mail/test`, {
    body: JSON.stringify(input),
    cache: "no-store",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    method: "POST",
  });
  if (!response.ok) {
    throw new Error(`Mail test failed with status ${response.status}.`);
  }
  return (await response.json()) as {
    readonly verification: {
      readonly ok: boolean;
      readonly mode: "smtp" | "stream";
      readonly message: string;
    };
    readonly queued: MailLogDetailRecord;
  };
}

export async function getMailTemplates() {
  const response = await authFetch(`${apiBaseUrl()}/mail/templates`, {
    cache: "no-store",
    headers: { Accept: "application/json" },
  });
  if (!response.ok) {
    throw new Error(`Mail templates failed with status ${response.status}.`);
  }
  return (await response.json()) as MailTemplateRecord[];
}

export async function previewMailTemplate(
  templateKey: MailTemplateKey,
  input: { readonly companyId?: string | null; readonly variables?: Record<string, unknown> },
) {
  const response = await authFetch(`${apiBaseUrl()}/mail/templates/${templateKey}/preview`, {
    body: JSON.stringify(input),
    cache: "no-store",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    method: "POST",
  });
  if (!response.ok) {
    throw new Error(`Mail preview failed with status ${response.status}.`);
  }
  return (await response.json()) as MailTemplatePreview;
}

export async function listMailLogs(filters: {
  readonly companyId?: string | null;
  readonly cursor?: string | null;
  readonly limit?: number;
  readonly search?: string | null;
  readonly category?: MailCategory | null;
  readonly status?: MailStatus | null;
}) {
  const response = await authFetch(`${apiBaseUrl()}/mail/logs${toQuery(filters)}`, {
    cache: "no-store",
    headers: { Accept: "application/json" },
  });
  if (!response.ok) {
    throw new Error(`Mail log list failed with status ${response.status}.`);
  }
  return (await response.json()) as MailLogListResult;
}

export async function retryMailLog(mailId: string) {
  const response = await authFetch(`${apiBaseUrl()}/mail/logs/${mailId}/retry`, {
    cache: "no-store",
    headers: { Accept: "application/json" },
    method: "POST",
  });
  if (!response.ok) {
    throw new Error(`Mail retry failed with status ${response.status}.`);
  }
  return (await response.json()) as MailLogDetailRecord;
}

export async function cancelMailLog(mailId: string) {
  const response = await authFetch(`${apiBaseUrl()}/mail/logs/${mailId}/cancel`, {
    cache: "no-store",
    headers: { Accept: "application/json" },
    method: "POST",
  });
  if (!response.ok) {
    throw new Error(`Mail cancel failed with status ${response.status}.`);
  }
  return (await response.json()) as MailLogDetailRecord;
}

export const defaultCompanyMailSettings: CompanyMailSettings = {
  fromEmail: "",
  fromName: "",
  replyTo: "",
  operationalRecipients: "",
};

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
