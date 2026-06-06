import { apiBaseUrl, authHeaders, type AuthSession } from "src/features/auth/auth-client"

export type DocumentEntryKind = "bankBook" | "cashBook" | "deliveryNote" | "exportSales" | "payment" | "purchase" | "purchaseReceipt" | "receipt" | "sales"

export interface DocumentNumberSetting {
  id: string
  companyId: string
  accountingYearId: string
  kind: DocumentEntryKind
  prefix: string
  prefixEnabled: boolean
  separator: string
  separatorEnabled: boolean
  suffix: string
  suffixEnabled: boolean
  nextNumber: number
  padding: number
  autoEnabled: boolean
  preview: string
}

export interface DocumentNumberSettingInput {
  kind: DocumentEntryKind
  prefix: string
  prefixEnabled: boolean
  separator: string
  separatorEnabled: boolean
  suffix: string
  suffixEnabled: boolean
  nextNumber: number
  padding: number
  autoEnabled: boolean
}

export const documentNumberLabels: Record<DocumentEntryKind, string> = {
  sales: "Sales",
  exportSales: "Export Sales",
  purchase: "Purchase",
  purchaseReceipt: "Purchase Receipt",
  deliveryNote: "Delivery Note",
  payment: "Payment",
  receipt: "Receipt",
  cashBook: "Cash Book",
  bankBook: "Bank Book",
}

export const documentNumberKindOrder: readonly DocumentEntryKind[] = ["sales", "exportSales", "purchase", "purchaseReceipt", "deliveryNote", "payment", "receipt", "cashBook", "bankBook"]

export async function listDocumentNumberSettings(session: AuthSession, options?: { signal?: AbortSignal }) {
  const response = await fetch(`${apiBaseUrl}/api/v1/document-settings/numbers`, {
    cache: "no-store",
    headers: authHeaders(session),
    signal: options?.signal,
  })

  if (!response.ok) {
    throw new Error(`Document settings request failed with status ${response.status}.`)
  }

  return (await response.json()) as DocumentNumberSetting[]
}

export async function saveDocumentNumberSettings(
  session: AuthSession,
  settings: readonly DocumentNumberSettingInput[],
  options?: { signal?: AbortSignal },
) {
  const response = await fetch(`${apiBaseUrl}/api/v1/document-settings/numbers`, {
    body: JSON.stringify({ settings }),
    cache: "no-store",
    headers: {
      ...authHeaders(session),
      "Content-Type": "application/json",
    },
    method: "PATCH",
    signal: options?.signal,
  })

  if (!response.ok) {
    throw new Error(`Document settings save failed with status ${response.status}.`)
  }

  return (await response.json()) as DocumentNumberSetting[]
}

export async function nextDocumentNumberSetting(session: AuthSession, kind: DocumentEntryKind, options?: { signal?: AbortSignal }) {
  const response = await fetch(`${apiBaseUrl}/api/v1/document-settings/numbers/${kind}/next`, {
    cache: "no-store",
    headers: authHeaders(session),
    signal: options?.signal,
  })

  if (!response.ok) {
    throw new Error(`Next document number request failed with status ${response.status}.`)
  }

  return (await response.json()) as DocumentNumberSetting
}
