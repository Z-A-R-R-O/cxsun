import type { ContactRecord, ContactUpsertInput } from "../domain/contact";
import { getRequiredApiUrl } from "@/lib/runtime-env";
import { authFetch } from "../../auth/infrastructure/auth-api";

interface ContactApiRecord extends Omit<ContactRecord, "id"> {
  readonly id: string;
}

export async function listContacts(options?: { readonly signal?: AbortSignal }) {
  const response = await authFetch(`${getApiBaseUrl()}/contacts`, {
    cache: "no-store",
    headers: { Accept: "application/json" },
    signal: options?.signal,
  });

  if (!response.ok) {
    throw new Error(`Contact list request failed with status ${response.status}.`);
  }

  return ((await response.json()) as ContactApiRecord[]).map(toContactRecord);
}

export async function getContact(contactId: number, options?: { readonly signal?: AbortSignal }) {
  const response = await authFetch(`${getApiBaseUrl()}/contacts/${contactId}`, {
    cache: "no-store",
    headers: { Accept: "application/json" },
    signal: options?.signal,
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`Contact detail request failed with status ${response.status}.`);
  }

  return toContactRecord((await response.json()) as ContactApiRecord);
}

export async function upsertContact(input: ContactUpsertInput, contactId?: number) {
  const response = await authFetch(
    `${getApiBaseUrl()}/contacts${contactId ? `/${contactId}` : ""}`,
    {
      body: JSON.stringify(input),
      cache: "no-store",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      method: contactId ? "PATCH" : "POST",
    },
  );

  if (!response.ok) {
    throw new Error(`Contact save request failed with status ${response.status}.`);
  }

  return toContactRecord((await response.json()) as ContactApiRecord);
}

export async function softDeleteContact(contactId: number) {
  const response = await authFetch(`${getApiBaseUrl()}/contacts/${contactId}`, {
    cache: "no-store",
    headers: { Accept: "application/json" },
    method: "DELETE",
  });

  if (!response.ok) {
    throw new Error(`Contact delete request failed with status ${response.status}.`);
  }
}

function getApiBaseUrl() {
  return getRequiredApiUrl();
}

function toContactRecord(record: ContactApiRecord): ContactRecord {
  return {
    ...record,
    id: Number(record.id),
    addresses: record.addresses ?? [],
    emails: record.emails ?? [],
    phones: record.phones ?? [],
    socialLinks: record.socialLinks ?? [],
    bankAccounts: record.bankAccounts ?? [],
    gstDetails: record.gstDetails ?? [],
  };
}
