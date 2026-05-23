import { apiBaseUrl, authHeaders, type AuthSession } from "src/features/auth/auth-client"

export type MediaVisibility = "private" | "public"

export interface MediaAssetLink {
  id: number
  uuid: string
  media_asset_id: number
  linked_module: string
  linked_record_id: string
  purpose: string
  created_by: string
  created_at: string
}

export interface MediaAsset {
  id: number
  uuid: string
  file_name: string
  original_name: string
  mime_type: string
  extension: string
  size_bytes: number
  visibility: MediaVisibility
  folder: string
  public_url: string | null
  alt_text: string | null
  caption: string | null
  tags: string[]
  metadata: Record<string, unknown>
  share_token: string | null
  share_expires_at: string | null
  shared_at: string | null
  created_by: string
  created_at: string
  updated_at: string
  links?: MediaAssetLink[]
}

export interface MediaUploadInput {
  fileName: string
  mimeType: string
  base64: string
  visibility: MediaVisibility
  folder: string
  altText?: string
  caption?: string
  tags?: string[]
}

export async function listMediaAssets(session: AuthSession, filters: { folder?: string; search?: string; visibility?: string } = {}) {
  const params = new URLSearchParams()
  if (filters.folder) params.set("folder", filters.folder)
  if (filters.search) params.set("search", filters.search)
  if (filters.visibility && filters.visibility !== "all") params.set("visibility", filters.visibility)
  const response = await fetch(`${apiBaseUrl}/api/v1/media${params.size ? `?${params}` : ""}`, { cache: "no-store", headers: authHeaders(session) })
  if (!response.ok) throw new Error(`Media list failed with status ${response.status}.`)
  return (await response.json()) as MediaAsset[]
}

export async function uploadMediaAsset(session: AuthSession, input: MediaUploadInput) {
  const response = await fetch(`${apiBaseUrl}/api/v1/media/upload`, {
    body: JSON.stringify(input),
    cache: "no-store",
    headers: { ...authHeaders(session), "Content-Type": "application/json" },
    method: "POST",
  })
  if (!response.ok) throw new Error(`Media upload failed with status ${response.status}.`)
  return (await response.json()) as MediaAsset
}

export async function deleteMediaAsset(session: AuthSession, asset: MediaAsset) {
  const response = await fetch(`${apiBaseUrl}/api/v1/media/${asset.uuid}/delete`, {
    body: "{}",
    cache: "no-store",
    headers: { ...authHeaders(session), "Content-Type": "application/json" },
    method: "POST",
  })
  if (!response.ok) throw new Error(`Media delete failed with status ${response.status}.`)
}

export async function shareMediaAsset(session: AuthSession, asset: MediaAsset) {
  const response = await fetch(`${apiBaseUrl}/api/v1/media/${asset.uuid}/share`, {
    body: "{}",
    cache: "no-store",
    headers: { ...authHeaders(session), "Content-Type": "application/json" },
    method: "POST",
  })
  if (!response.ok) throw new Error(`Media share failed with status ${response.status}.`)
  return (await response.json()) as MediaAsset & { share_url?: string }
}

export async function linkMediaAsset(session: AuthSession, asset: MediaAsset, input: { linkedModule: string; linkedRecordId: string; purpose: string }) {
  const response = await fetch(`${apiBaseUrl}/api/v1/media/${asset.uuid}/link`, {
    body: JSON.stringify(input),
    cache: "no-store",
    headers: { ...authHeaders(session), "Content-Type": "application/json" },
    method: "POST",
  })
  if (!response.ok) throw new Error(`Media link failed with status ${response.status}.`)
  return (await response.json()) as MediaAsset
}

export async function mediaContentBlobUrl(session: AuthSession, asset: MediaAsset) {
  const response = await fetch(`${apiBaseUrl}/api/v1/media/${asset.uuid}/content`, { cache: "no-store", headers: authHeaders(session) })
  if (!response.ok) return ""
  const blob = await response.blob()
  return URL.createObjectURL(blob)
}

export function fileToBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(reader.error ?? new Error("Could not read file."))
    reader.onload = () => resolve(String(reader.result ?? "").split(",").at(-1) ?? "")
    reader.readAsDataURL(file)
  })
}
