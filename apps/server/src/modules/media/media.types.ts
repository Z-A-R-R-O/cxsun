export type MediaVisibility = 'private' | 'public'

export interface MediaAsset {
  id: number
  uuid: string
  tenant_id: number
  company_id: number | null
  file_name: string
  original_name: string
  mime_type: string
  extension: string
  size_bytes: number
  visibility: MediaVisibility
  folder: string
  storage_disk: MediaVisibility
  storage_path: string
  public_url: string | null
  checksum: string | null
  alt_text: string | null
  caption: string | null
  tags: string[]
  metadata: Record<string, unknown>
  share_token: string | null
  share_expires_at: string | null
  shared_at: string | null
  is_active: boolean
  created_by: string
  created_at: string
  updated_at: string
  deleted_at: string | null
  links?: MediaAssetLink[]
}

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

export interface MediaUploadInput {
  fileName?: string
  mimeType?: string
  base64?: string
  visibility?: MediaVisibility
  folder?: string
  altText?: string
  caption?: string
  tags?: string[]
  metadata?: Record<string, unknown>
}

export interface MediaUpdateInput {
  fileName?: string
  visibility?: MediaVisibility
  folder?: string
  altText?: string
  caption?: string
  tags?: string[]
  metadata?: Record<string, unknown>
}

export interface MediaLinkInput {
  linkedModule?: string
  linkedRecordId?: string
  purpose?: string
}

export interface MediaShareInput {
  expiresAt?: string | null
}
