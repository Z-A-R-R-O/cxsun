import { createHash, randomBytes } from 'node:crypto'
import { access, mkdir, readFile, unlink, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { BadRequestException, NotFoundException } from '../../core/exceptions/http.exception.js'
import { Inject } from '../../core/decorators/inject.js'
import { Injectable } from '../../core/decorators/injectable.js'
import { TenantContextService, type TenantRequestHeaders } from '../../core/tenant/tenant-context.service.js'
import type { TenantRuntimeContext } from '../../core/tenant/tenant-context.service.js'
import type { Tenant } from '../../core/tenant/domain/tenant.types.js'
import { getDatabase } from '../../infrastructure/database/connection.js'
import { getTenantDatabase } from '../../infrastructure/tenant-database/tenant-database.connection.js'
import { MasterQueueService } from '../../infrastructure/queue/master-queue.service.js'
import { dispatchPublicUuid } from '../../shared/helpers/public-uuid.js'
import { MediaRepository, normalizeFolder } from './media.repository.js'
import type { MediaAsset, MediaLinkInput, MediaShareInput, MediaUpdateInput, MediaUploadInput, MediaVisibility } from './media.types.js'

const storageRoot = path.resolve(
  process.cwd(),
  process.cwd().replaceAll('\\', '/').endsWith('/apps/server') ? '../../storage' : 'storage',
)

@Injectable()
export class MediaService {
  constructor(
    @Inject(() => TenantContextService) private readonly tenants: TenantContextService,
    @Inject(MediaRepository) private readonly media: MediaRepository,
    @Inject(MasterQueueService) private readonly queue: MasterQueueService,
  ) {}

  async list(headers: TenantRequestHeaders, query: { folder?: string; search?: string; visibility?: string }) {
    const context = await this.tenants.resolve(headers)
    return this.media.list(context, query)
  }

  async get(headers: TenantRequestHeaders, idOrUuid: string) {
    const context = await this.tenants.resolve(headers)
    const asset = await this.media.find(context, idOrUuid)
    if (!asset) throw new NotFoundException('Media asset not found.')
    return asset
  }

  async upload(headers: TenantRequestHeaders, input: MediaUploadInput) {
    const context = await this.tenants.resolve(headers)
    const base64 = input.base64?.includes(',') ? input.base64.split(',').at(-1) ?? '' : input.base64 ?? ''
    if (!base64) throw new BadRequestException('File content is required.')
    const buffer = Buffer.from(base64, 'base64')
    if (!buffer.length) throw new BadRequestException('File content is empty.')

    const folder = normalizeFolder(input.folder ?? 'library')
    const originalName = sanitizeFileName(input.fileName || 'upload.bin')
    const logoFileName = logoStorageFileName(input.storageFileName)
    const isLogoUpload = folder === 'logo' || Boolean(logoFileName)
    if (logoFileName && folder !== 'logo') throw new BadRequestException('Company logos must be uploaded to the logo folder.')
    if (isLogoUpload && !logoFileName) throw new BadRequestException('Logo uploads must target logo.svg, logo-dark.svg, or favicon.svg.')
    if (isLogoUpload && !isSvgUpload(input.mimeType, buffer)) throw new BadRequestException('Company logos only support SVG files.')

    const extension = isLogoUpload ? '.svg' : extensionFor(originalName, input.mimeType)
    const uuid = dispatchPublicUuid()
    const visibility: MediaVisibility = isLogoUpload ? 'public' : input.visibility === 'public' ? 'public' : 'private'
    const storageFileName = mediaStorageFileName(input.storageFileName, originalName, uuid, extension)
    const relativePath = path.join(folder, storageFileName)
    const normalizedRelativePath = relativePath.replace(/\\/g, '/')
    const diskPath = tenantStoragePath(context.tenant, visibility, relativePath)

    await mkdir(path.dirname(diskPath), { recursive: true })
    if (isLogoUpload) {
      await unlink(diskPath).catch(() => undefined)
      await this.media.retireByStoragePath(context, visibility, normalizedRelativePath)
    }
    await writeFile(diskPath, buffer)

    const asset = await this.media.create(context, {
      uuid,
      tenant_id: context.tenant.id,
      company_id: await defaultCompanyId(context),
      file_name: isLogoUpload ? storageFileName : originalName,
      original_name: originalName,
      mime_type: isLogoUpload ? 'image/svg+xml' : input.mimeType || mimeTypeFor(extension),
      extension: extension.replace(/^\./, ''),
      size_bytes: buffer.length,
      visibility,
      folder,
      storage_disk: visibility,
      storage_path: normalizedRelativePath,
      public_url: visibility === 'public' ? publicStorageUrl(context.tenant, normalizedRelativePath) : null,
      checksum: createHash('sha256').update(buffer).digest('hex'),
      alt_text: input.altText?.trim() || null,
      caption: input.caption?.trim() || null,
      tags: input.tags ?? [],
      metadata: input.metadata ?? {},
      share_token: null,
      share_expires_at: null,
      shared_at: null,
      is_active: true,
      created_by: context.user.email,
    })

    await this.queue.enqueue({ type: 'media.asset-uploaded', payload: { mediaId: asset.uuid, tenantId: context.tenant.id } })
    return asset
  }

  async update(headers: TenantRequestHeaders, idOrUuid: string, input: MediaUpdateInput) {
    const context = await this.tenants.resolve(headers)
    const asset = await this.media.update(context, idOrUuid, input)
    if (!asset) throw new NotFoundException('Media asset not found.')
    await this.queue.enqueue({ type: 'media.asset-updated', payload: { mediaId: asset.uuid, tenantId: context.tenant.id } })
    return asset
  }

  async destroy(headers: TenantRequestHeaders, idOrUuid: string) {
    const context = await this.tenants.resolve(headers)
    const asset = await this.media.destroy(context, idOrUuid)
    if (asset) {
      await unlink(await resolveAssetDiskPath(context.tenant, asset)).catch(() => undefined)
      await this.queue.enqueue({ type: 'media.asset-deleted', payload: { mediaId: asset.uuid, tenantId: context.tenant.id } })
    }
    return { ok: true }
  }

  async share(headers: TenantRequestHeaders, idOrUuid: string, input: MediaShareInput) {
    const context = await this.tenants.resolve(headers)
    const token = randomBytes(18).toString('base64url')
    const asset = await this.media.share(context, idOrUuid, token, input.expiresAt ?? null)
    if (!asset) throw new NotFoundException('Media asset not found.')
    await this.queue.enqueue({ type: 'media.asset-shared', payload: { mediaId: asset.uuid, tenantId: context.tenant.id } })
    return { ...asset, share_url: `/api/v1/media/${asset.uuid}/content?tenant=${encodeURIComponent(context.tenant.slug)}&token=${token}` }
  }

  async link(headers: TenantRequestHeaders, idOrUuid: string, input: MediaLinkInput) {
    const context = await this.tenants.resolve(headers)
    const linkedModule = input.linkedModule?.trim()
    const linkedRecordId = input.linkedRecordId?.trim()
    if (!linkedModule || !linkedRecordId) throw new BadRequestException('Linked module and record are required.')
    const asset = await this.media.link(context, idOrUuid, { linkedModule, linkedRecordId, purpose: input.purpose?.trim() || 'attachment' })
    if (!asset) throw new NotFoundException('Media asset not found.')
    await this.queue.enqueue({ type: 'media.asset-linked', payload: { mediaId: asset.uuid, linkedModule, linkedRecordId, tenantId: context.tenant.id } })
    return asset
  }

  async content(headers: TenantRequestHeaders, idOrUuid: string, token?: string, tenantSlug?: string) {
    const anonymousPublicRead = Boolean(tenantSlug && !hasAuthorization(headers))
    const context = anonymousPublicRead ? await publicTenantContext(tenantSlug ?? '') : await this.tenants.resolve(headers)
    const asset = await this.media.find(context, idOrUuid)
    if (!asset) throw new NotFoundException('Media asset not found.')
    if (!canReadAsset(asset, token, !anonymousPublicRead)) throw new NotFoundException('Media asset not found.')
    const file = await readFile(await resolveAssetDiskPath(context.tenant, asset))
    return { asset, file }
  }

  async publicStorageContent(tenantSlug: string, visibility: string, folder: string, fileName: string) {
    if (visibility !== 'public') throw new NotFoundException('Media asset not found.')
    const tenant = await getDatabase().selectFrom('tenants').selectAll().where('slug', '=', tenantSlug.trim()).executeTakeFirst()
    if (!tenant || tenant.status !== 'active') throw new NotFoundException('Media asset not found.')

    const safeFolder = normalizeFolder(folder)
    const safeFileName = sanitizeFileName(fileName)
    if (safeFileName !== fileName || safeFolder !== folder) throw new NotFoundException('Media asset not found.')

    const diskPath = tenantStoragePath(tenant as Tenant, 'public', path.join(safeFolder, safeFileName))
    const file = await readFile(diskPath).catch(() => {
      throw new NotFoundException('Media asset not found.')
    })
    return { file, mimeType: mimeTypeFor(path.extname(safeFileName).toLowerCase()), fileName: safeFileName }
  }
}

function tenantStorageDirectory(tenant: Pick<Tenant, 'id' | 'slug'>, visibility: MediaVisibility) {
  return path.join(storageRoot, sanitizePathSegment(tenant.slug || String(tenant.id)), visibility)
}

function tenantStoragePath(tenant: Pick<Tenant, 'id' | 'slug'>, visibility: MediaVisibility, relativePath: string) {
  return path.join(tenantStorageDirectory(tenant, visibility), relativePath)
}

async function resolveAssetDiskPath(tenant: Pick<Tenant, 'id' | 'slug'>, asset: Pick<MediaAsset, 'storage_disk' | 'storage_path'>) {
  const nextPath = tenantStoragePath(tenant, asset.storage_disk, asset.storage_path)

  try {
    await access(nextPath)
    return nextPath
  } catch {
    return path.join(storageRoot, asset.storage_disk, asset.storage_path)
  }
}

async function publicTenantContext(tenantSlug: string): Promise<TenantRuntimeContext> {
  const tenant = await getDatabase().selectFrom('tenants').selectAll().where('slug', '=', tenantSlug.trim()).executeTakeFirst()
  if (!tenant || tenant.status !== 'active') throw new NotFoundException('Media asset not found.')
  return {
    tenant: tenant as Tenant,
    user: { id: 0, email: 'public-media@system.local', role: 'public' },
    database: getTenantDatabase(tenant as Tenant),
  }
}

async function defaultCompanyId(context: { database: any; tenant: { id: number } }) {
  const company = await context.database.selectFrom('companies').select('id').where('tenant_id', '=', context.tenant.id).where('is_primary', '=', true).executeTakeFirst()
  return Number(company?.id ?? 0) || null
}

function canReadAsset(asset: MediaAsset, token?: string, authenticated = false) {
  if (authenticated) return true
  if (asset.visibility === 'public') return true
  if (!token || token !== asset.share_token) return false
  if (!asset.share_expires_at) return true
  return new Date(asset.share_expires_at).getTime() >= Date.now()
}

function hasAuthorization(headers: TenantRequestHeaders) {
  const value = headers.authorization
  const authorization = Array.isArray(value) ? value[0] : value
  return Boolean(authorization?.trim())
}

function sanitizeFileName(value: string) {
  return value.trim().replace(/[/\\?%*:|"<>]/g, '-').replace(/\s+/g, ' ') || 'upload.bin'
}

function sanitizePathSegment(value: string) {
  return value.trim().replace(/[^a-zA-Z0-9_-]/g, '-') || 'tenant'
}

function mediaStorageFileName(storageFileName: string | undefined, originalName: string, uuid: string, extension: string) {
  const requestedName = logoStorageFileName(storageFileName) ?? sanitizeFileName(storageFileName || '')
  if (requestedName !== 'upload.bin') return requestedName
  if (normalizeFolderNameForLogo(originalName)) return originalName
  return `${uuid}${extension}`
}

function normalizeFolderNameForLogo(fileName: string) {
  return Boolean(logoStorageFileName(fileName))
}

function logoStorageFileName(fileName: string | undefined) {
  const normalized = sanitizeFileName(fileName || '').toLowerCase()
  if (normalized === 'logo.svg') return 'logo.svg'
  if (normalized === 'logo-dark.svg') return 'logo-dark.svg'
  if (normalized === 'favicon.svg') return 'favicon.svg'
  return null
}

function isSvgUpload(mimeType: string | undefined, buffer: Buffer) {
  if (mimeType === 'image/svg+xml') return true
  const head = buffer.subarray(0, 512).toString('utf8').trimStart().toLowerCase()
  return head.startsWith('<svg') || head.startsWith('<?xml') && head.includes('<svg')
}

function publicStorageUrl(tenant: Pick<Tenant, 'id' | 'slug'>, storagePath: string) {
  const tenantSlug = encodeURIComponent(sanitizePathSegment(tenant.slug || String(tenant.id)))
  return `/storage/${tenantSlug}/public/${storagePath.split('/').map(encodeURIComponent).join('/')}`
}

function extensionFor(fileName: string, mimeType?: string) {
  const fromName = path.extname(fileName).toLowerCase()
  if (fromName) return fromName
  if (mimeType === 'image/jpeg') return '.jpg'
  if (mimeType === 'image/png') return '.png'
  if (mimeType === 'image/svg+xml') return '.svg'
  if (mimeType === 'image/webp') return '.webp'
  if (mimeType === 'application/pdf') return '.pdf'
  return '.bin'
}

function mimeTypeFor(extension: string) {
  if (extension === '.jpg' || extension === '.jpeg') return 'image/jpeg'
  if (extension === '.png') return 'image/png'
  if (extension === '.svg') return 'image/svg+xml'
  if (extension === '.webp') return 'image/webp'
  if (extension === '.pdf') return 'application/pdf'
  return 'application/octet-stream'
}
