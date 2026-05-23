import type { Kysely } from 'kysely'
import { BadRequestException } from '../../core/exceptions/http.exception.js'
import { Injectable } from '../../core/decorators/injectable.js'
import { dispatchPublicUuid } from '../../shared/helpers/public-uuid.js'
import type { TenantRuntimeContext } from '../../core/tenant/tenant-context.service.js'
import type { MediaAsset, MediaLinkInput, MediaUpdateInput } from './media.types.js'

type DynamicDatabase = Record<string, Record<string, unknown>>

@Injectable()
export class MediaRepository {
  async list(context: TenantRuntimeContext, filters: { folder?: string; search?: string; visibility?: string }) {
    let query = this.database(context)
      .selectFrom('media_assets')
      .selectAll()
      .where('tenant_id', '=', context.tenant.id)
      .where('deleted_at', 'is', null)
      .orderBy('id', 'desc')

    if (filters.folder) query = query.where('folder', '=', filters.folder)
    if (filters.visibility === 'public' || filters.visibility === 'private') query = query.where('visibility', '=', filters.visibility)
    if (filters.search) {
      const search = `%${filters.search}%`
      query = query.where((eb) => eb.or([eb('file_name', 'like', search), eb('original_name', 'like', search), eb('caption', 'like', search)]))
    }

    const rows = await query.execute()
    return Promise.all(rows.map((row) => this.toAsset(context, row, false)))
  }

  async find(context: TenantRuntimeContext, idOrUuid: string) {
    const row = await this.database(context)
      .selectFrom('media_assets')
      .selectAll()
      .where('tenant_id', '=', context.tenant.id)
      .where(this.idColumn(idOrUuid), '=', this.idValue(idOrUuid))
      .where('deleted_at', 'is', null)
      .executeTakeFirst()
    return row ? this.toAsset(context, row, true) : null
  }

  async create(context: TenantRuntimeContext, input: Omit<MediaAsset, 'id' | 'created_at' | 'updated_at' | 'deleted_at' | 'links'>) {
    const result = await this.database(context)
      .insertInto('media_assets')
      .values({
        ...input,
        tags: JSON.stringify(input.tags),
        metadata: JSON.stringify(input.metadata),
      })
      .executeTakeFirstOrThrow()
    const id = Number(result.insertId)
    await this.addActivity(context, id, 'uploaded', `Uploaded ${input.original_name}`)
    const asset = await this.find(context, String(id))
    if (!asset) throw new BadRequestException('Media was uploaded but could not be read back.')
    return asset
  }

  async update(context: TenantRuntimeContext, idOrUuid: string, input: MediaUpdateInput) {
    const existing = await this.find(context, idOrUuid)
    if (!existing) throw new BadRequestException('Media asset not found.')
    await this.database(context)
      .updateTable('media_assets')
      .set({
        alt_text: emptyAsNull(input.altText) ?? existing.alt_text,
        caption: emptyAsNull(input.caption) ?? existing.caption,
        file_name: input.fileName?.trim() || existing.file_name,
        folder: normalizeFolder(input.folder ?? existing.folder),
        metadata: JSON.stringify(input.metadata ?? existing.metadata),
        tags: JSON.stringify(input.tags ?? existing.tags),
        updated_at: new Date(),
      })
      .where('tenant_id', '=', context.tenant.id)
      .where('id', '=', existing.id)
      .execute()
    await this.addActivity(context, existing.id, 'updated', `Updated ${existing.original_name}`)
    return this.find(context, String(existing.id))
  }

  async destroy(context: TenantRuntimeContext, idOrUuid: string) {
    const existing = await this.find(context, idOrUuid)
    if (!existing) return null
    await this.database(context)
      .updateTable('media_assets')
      .set({ deleted_at: new Date(), is_active: false, updated_at: new Date() })
      .where('tenant_id', '=', context.tenant.id)
      .where('id', '=', existing.id)
      .execute()
    await this.addActivity(context, existing.id, 'deleted', `Deleted ${existing.original_name}`)
    return existing
  }

  async share(context: TenantRuntimeContext, idOrUuid: string, token: string, expiresAt: string | null) {
    const existing = await this.find(context, idOrUuid)
    if (!existing) throw new BadRequestException('Media asset not found.')
    await this.database(context)
      .updateTable('media_assets')
      .set({ share_token: token, share_expires_at: expiresAt, shared_at: new Date(), updated_at: new Date() })
      .where('tenant_id', '=', context.tenant.id)
      .where('id', '=', existing.id)
      .execute()
    await this.addActivity(context, existing.id, 'shared', `Shared ${existing.original_name}`)
    return this.find(context, String(existing.id))
  }

  async link(context: TenantRuntimeContext, idOrUuid: string, input: Required<MediaLinkInput>) {
    const existing = await this.find(context, idOrUuid)
    if (!existing) throw new BadRequestException('Media asset not found.')
    await this.database(context)
      .insertInto('media_asset_links')
      .values({
        uuid: dispatchPublicUuid(),
        media_asset_id: existing.id,
        linked_module: input.linkedModule,
        linked_record_id: input.linkedRecordId,
        purpose: input.purpose,
        created_by: context.user.email,
      })
      .execute()
    await this.addActivity(context, existing.id, 'linked', `Linked ${existing.original_name} to ${input.linkedModule}`)
    return this.find(context, String(existing.id))
  }

  private async toAsset(context: TenantRuntimeContext, row: Record<string, unknown>, withLinks: boolean) {
    const links = withLinks
      ? await this.database(context).selectFrom('media_asset_links').selectAll().where('media_asset_id', '=', Number(row.id)).orderBy('id', 'desc').execute()
      : []
    return this.toAssetFromRow(row, links)
  }

  private toAssetFromRow(row: Record<string, unknown>, links: Record<string, unknown>[]): MediaAsset {
    return {
      id: Number(row.id),
      uuid: String(row.uuid),
      tenant_id: Number(row.tenant_id),
      company_id: nullableNumber(row.company_id),
      file_name: String(row.file_name),
      original_name: String(row.original_name),
      mime_type: String(row.mime_type),
      extension: String(row.extension),
      size_bytes: Number(row.size_bytes ?? 0),
      visibility: row.visibility === 'public' ? 'public' : 'private',
      folder: String(row.folder),
      storage_disk: row.storage_disk === 'public' ? 'public' : 'private',
      storage_path: String(row.storage_path),
      public_url: stringOrNull(row.public_url),
      checksum: stringOrNull(row.checksum),
      alt_text: stringOrNull(row.alt_text),
      caption: stringOrNull(row.caption),
      tags: parseJsonArray(row.tags),
      metadata: parseJsonObject(row.metadata),
      share_token: stringOrNull(row.share_token),
      share_expires_at: row.share_expires_at ? String(row.share_expires_at) : null,
      shared_at: row.shared_at ? String(row.shared_at) : null,
      is_active: Boolean(row.is_active),
      created_by: String(row.created_by),
      created_at: String(row.created_at),
      updated_at: String(row.updated_at),
      deleted_at: row.deleted_at ? String(row.deleted_at) : null,
      links: links.map((link) => ({
        id: Number(link.id),
        uuid: String(link.uuid),
        media_asset_id: Number(link.media_asset_id),
        linked_module: String(link.linked_module),
        linked_record_id: String(link.linked_record_id),
        purpose: String(link.purpose),
        created_by: String(link.created_by),
        created_at: String(link.created_at),
      })),
    }
  }

  private async addActivity(context: TenantRuntimeContext, mediaAssetId: number, activityType: string, message: string) {
    await this.database(context)
      .insertInto('media_asset_activities')
      .values({ uuid: dispatchPublicUuid(), media_asset_id: mediaAssetId, activity_type: activityType, actor_email: context.user.email, message, payload: JSON.stringify({ tenantId: context.tenant.id }) })
      .execute()
  }

  private idColumn(idOrUuid: string) {
    return /^\d+$/.test(idOrUuid) && idOrUuid.length !== 8 ? 'id' : 'uuid'
  }

  private idValue(idOrUuid: string) {
    return this.idColumn(idOrUuid) === 'id' ? Number(idOrUuid) : idOrUuid
  }

  private database(context: TenantRuntimeContext) {
    return context.database as unknown as Kysely<DynamicDatabase>
  }

}

export function normalizeFolder(value: string) {
  return (value || 'library').trim().replace(/[^a-zA-Z0-9/_-]/g, '-').replace(/\/+/g, '/').replace(/^\/|\/$/g, '') || 'library'
}

function parseJsonArray(value: unknown) {
  try {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value
    return Array.isArray(parsed) ? parsed.map(String) : []
  } catch {
    return []
  }
}

function parseJsonObject(value: unknown) {
  try {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {}
  } catch {
    return {}
  }
}

function stringOrNull(value: unknown) {
  if (value === null || value === undefined) return null
  const text = String(value).trim()
  return text ? text : null
}

function emptyAsNull(value: unknown) {
  return stringOrNull(value)
}

function nullableNumber(value: unknown) {
  if (value === null || value === undefined || value === '') return null
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}
