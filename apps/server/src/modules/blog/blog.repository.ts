import { type Kysely } from 'kysely'
import { BadRequestException, NotFoundException } from '../../core/exceptions/http.exception.js'
import { Injectable } from '../../core/decorators/injectable.js'
import type { TenantRuntimeContext } from '../../core/tenant/tenant-context.service.js'
import { dispatchPublicUuid } from '../../shared/helpers/public-uuid.js'

type DynamicDatabase = Record<string, Record<string, unknown>>
import type {
  BlogCategory, BlogCategoryInput, BlogComment, BlogCommentInput, BlogImage, BlogImageInput,
  BlogPost, BlogPostInput, BlogRating, BlogRatingInput, BlogSeo, BlogSeoInput,
  BlogShare, BlogShareInput, BlogTag, BlogTagInput, BlogWorkspace,
} from './blog.types.js'

@Injectable()
export class BlogRepository {
  async workspace(context: TenantRuntimeContext): Promise<BlogWorkspace> {
    const [posts, categories, tags, recentComments] = await Promise.all([
      this.listPosts(context, { limit: '50' }),
      this.listCategories(context),
      this.listTags(context),
      this.listRecentComments(context),
    ])
    const allPosts = await this.database(context).selectFrom('blog_posts').selectAll().where('tenant_id', '=', context.tenant.id).where('deleted_at', 'is', null).execute() as Record<string, unknown>[]
    const postCount = allPosts.length
    const publishedCount = allPosts.filter((row) => String(row.status) === 'published').length
    const draftCount = allPosts.filter((row) => String(row.status) === 'draft').length
    const commentRows = await this.database(context).selectFrom('blog_comments').selectAll().where('tenant_id', '=', context.tenant.id).where('deleted_at', 'is', null).execute() as Record<string, unknown>[]
    return { posts, categories, tags, recentComments, postCount, publishedCount, draftCount, commentCount: commentRows.length }
  }

  async listPosts(context: TenantRuntimeContext, query: { status?: string; category_id?: string; tag_id?: string; search?: string; limit?: string; offset?: string }): Promise<BlogPost[]> {
    let queryBuilder: any = this.database(context).selectFrom('blog_posts').selectAll().where('tenant_id', '=', context.tenant.id).where('deleted_at', 'is', null)
    if (query.status) queryBuilder = queryBuilder.where('status', '=', query.status)
    if (query.category_id) queryBuilder = queryBuilder.where('category_id', '=', Number(query.category_id))
    if (query.search) queryBuilder = queryBuilder.where((qb: any) => qb.where('title', 'like', `%${query.search}%`).orWhere('content', 'like', `%${query.search}%`))
    if (query.tag_id) {
      const postIds = await this.database(context).selectFrom('blog_post_tags').select('post_id').where('tag_id', '=', Number(query.tag_id)).execute() as Record<string, unknown>[]
      queryBuilder = queryBuilder.where('id', 'in', postIds.map((row) => Number(row.post_id)))
    }
    const limit = Math.min(Math.max(1, Number(query.limit) || 50), 200)
    const offset = Math.max(0, Number(query.offset) || 0)
    const rows = await queryBuilder.orderBy('published_at', 'desc').orderBy('created_at', 'desc').limit(limit).offset(offset).execute() as Record<string, unknown>[]
    return Promise.all(rows.map((row) => this.toPost(context, row)))
  }

  async upsertPost(context: TenantRuntimeContext, input: BlogPostInput & { tag_ids?: number[]; seo?: Partial<BlogSeoInput> }): Promise<BlogPost> {
    const title = input.title?.trim()
    if (!title) throw new BadRequestException('Post title is required.')
    const slug = input.slug?.trim() || slugValue(title)
    const status = input.status || 'draft'
    const patch: Record<string, unknown> = {
      title, slug,
      content: input.content ?? null,
      excerpt: emptyAsNull(input.excerpt),
      featured_image: emptyAsNull(input.featured_image),
      status,
      author_email: emptyAsNull(input.author_email ?? context.user.email),
      category_id: numberOrNull(input.category_id),
      published_at: status === 'published' && !input.published_at ? new Date() : (emptyAsNull(input.published_at) || null),
      is_featured: Boolean(input.is_featured),
      allow_comments: input.allow_comments !== undefined ? Boolean(input.allow_comments) : true,
      updated_by: context.user.email,
      updated_at: new Date(),
    }
    const existing = await this.findPostRow(context, String(input.uuid ?? input.id ?? ''))
    if (existing) {
      if (status === 'published' && !existing.published_at) patch.published_at = new Date()
      await this.database(context).updateTable('blog_posts').set(patch).where('id', '=', Number(existing.id)).execute()
    } else {
      const insertValues = { ...patch, uuid: dispatchPublicUuid(), tenant_id: context.tenant.id, created_by: context.user.email }
      await this.database(context).insertInto('blog_posts').values(insertValues).execute()
    }

    const postId = existing ? Number(existing.id) : await this.resolvePostId(context, slug)
    if (input.tag_ids && Array.isArray(input.tag_ids) && postId) {
      await this.database(context).deleteFrom('blog_post_tags').where('post_id', '=', postId).execute()
      if (input.tag_ids.length) {
        await this.database(context).insertInto('blog_post_tags').values(
          input.tag_ids.map((tag_id) => ({ post_id: postId, tag_id: Number(tag_id) })),
        ).execute()
      }
    }

    if (input.seo && postId) {
      await this.upsertSeo(context, postId, input.seo)
    }

    return this.getPostById(context, postId ?? (existing ? Number(existing.id) : 0))
  }

  async deletePost(context: TenantRuntimeContext, idOrUuid: string): Promise<void> {
    const post = await this.findPostRow(context, idOrUuid)
    if (!post) throw new NotFoundException('Post was not found.')
    await this.database(context).updateTable('blog_posts').set({ deleted_at: new Date(), updated_at: new Date(), updated_by: context.user.email }).where('id', '=', Number(post.id)).execute()
  }

  async listCategories(context: TenantRuntimeContext): Promise<BlogCategory[]> {
    const rows = await this.database(context).selectFrom('blog_categories').selectAll().where('tenant_id', '=', context.tenant.id).where('deleted_at', 'is', null).orderBy('sort_order', 'asc').orderBy('name', 'asc').execute() as Record<string, unknown>[]
    return Promise.all(rows.map((row) => this.toCategory(context, row)))
  }

  async upsertCategory(context: TenantRuntimeContext, input: BlogCategoryInput): Promise<BlogCategory> {
    const name = input.name?.trim()
    if (!name) throw new BadRequestException('Category name is required.')
    const slug = input.slug?.trim() || slugValue(name)
    const patch: Record<string, unknown> = {
      name, slug,
      description: emptyAsNull(input.description),
      parent_id: numberOrNull(input.parent_id),
      sort_order: numberValue(input.sort_order),
      is_active: input.is_active ?? true,
      updated_by: context.user.email,
      updated_at: new Date(),
    }
    const existing = await this.findCategoryRow(context, String(input.uuid ?? input.id ?? ''))
    if (existing) {
      await this.database(context).updateTable('blog_categories').set(patch).where('id', '=', Number(existing.id)).execute()
      return this.getCategoryById(context, Number(existing.id))
    }
    const insertValues = { ...patch, uuid: dispatchPublicUuid(), tenant_id: context.tenant.id, created_by: context.user.email }
    await this.database(context).insertInto('blog_categories').values(insertValues).execute()
    return this.getCategoryBySlug(context, slug)
  }

  async deleteCategory(context: TenantRuntimeContext, idOrUuid: string): Promise<void> {
    const category = await this.findCategoryRow(context, idOrUuid)
    if (!category) throw new NotFoundException('Category was not found.')
    await this.database(context).updateTable('blog_posts').set({ category_id: null, updated_at: new Date(), updated_by: context.user.email }).where('category_id', '=', Number(category.id)).execute()
    await this.database(context).updateTable('blog_categories').set({ deleted_at: new Date(), updated_at: new Date(), updated_by: context.user.email }).where('id', '=', Number(category.id)).execute()
  }

  async listTags(context: TenantRuntimeContext): Promise<BlogTag[]> {
    const rows = await this.database(context).selectFrom('blog_tags').selectAll().where('tenant_id', '=', context.tenant.id).where('deleted_at', 'is', null).orderBy('name', 'asc').execute() as Record<string, unknown>[]
    return Promise.all(rows.map((row) => this.toTag(context, row)))
  }

  async upsertTag(context: TenantRuntimeContext, input: BlogTagInput): Promise<BlogTag> {
    const name = input.name?.trim()
    if (!name) throw new BadRequestException('Tag name is required.')
    const slug = input.slug?.trim() || slugValue(name)
    const patch: Record<string, unknown> = {
      name, slug,
      is_active: input.is_active ?? true,
      updated_by: context.user.email,
      updated_at: new Date(),
    }
    const existing = await this.findTagRow(context, String(input.uuid ?? input.id ?? ''))
    if (existing) {
      await this.database(context).updateTable('blog_tags').set(patch).where('id', '=', Number(existing.id)).execute()
      return this.getTagById(context, Number(existing.id))
    }
    const insertValues = { ...patch, uuid: dispatchPublicUuid(), tenant_id: context.tenant.id, created_by: context.user.email }
    await this.database(context).insertInto('blog_tags').values(insertValues).execute()
    return this.getTagBySlug(context, slug)
  }

  async deleteTag(context: TenantRuntimeContext, idOrUuid: string): Promise<void> {
    const tag = await this.findTagRow(context, idOrUuid)
    if (!tag) throw new NotFoundException('Tag was not found.')
    await this.database(context).deleteFrom('blog_post_tags').where('tag_id', '=', Number(tag.id)).execute()
    await this.database(context).updateTable('blog_tags').set({ deleted_at: new Date(), updated_at: new Date(), updated_by: context.user.email }).where('id', '=', Number(tag.id)).execute()
  }

  async listComments(context: TenantRuntimeContext, query: { post_id?: string; is_approved?: string; search?: string }): Promise<BlogComment[]> {
    let queryBuilder: any = this.database(context).selectFrom('blog_comments').selectAll().where('tenant_id', '=', context.tenant.id).where('deleted_at', 'is', null)
    if (query.post_id) queryBuilder = queryBuilder.where('post_id', '=', Number(query.post_id))
    if (query.is_approved !== undefined) queryBuilder = queryBuilder.where('is_approved', '=', Number(query.is_approved))
    if (query.search) queryBuilder = queryBuilder.where((qb: any) => qb.where('author_name', 'like', `%${query.search}%`).orWhere('content', 'like', `%${query.search}%`))
    const rows = await queryBuilder.orderBy('created_at', 'desc').execute() as Record<string, unknown>[]
    return Promise.all(rows.map((row) => this.toComment(context, row)))
  }

  async upsertComment(context: TenantRuntimeContext, input: BlogCommentInput): Promise<BlogComment> {
    const content = input.content?.trim()
    if (!content) throw new BadRequestException('Comment content is required.')
    const patch: Record<string, unknown> = {
      post_id: Number(input.post_id),
      parent_id: numberOrNull(input.parent_id),
      author_name: String(input.author_name || context.user.email),
      author_email: String(input.author_email || context.user.email),
      author_website: emptyAsNull(input.author_website),
      content,
      is_approved: input.is_approved ?? false,
      is_review: input.is_review ?? false,
      approved_by: input.is_approved ? context.user.email : null,
      approved_at: input.is_approved ? new Date() : null,
      updated_by: context.user.email,
      updated_at: new Date(),
    }
    const existing = await this.findCommentRow(context, String(input.uuid ?? input.id ?? ''))
    if (existing) {
      await this.database(context).updateTable('blog_comments').set(patch).where('id', '=', Number(existing.id)).execute()
      return this.getCommentById(context, Number(existing.id))
    }
    const insertValues = { ...patch, uuid: dispatchPublicUuid(), tenant_id: context.tenant.id, created_by: context.user.email ?? null }
    await this.database(context).insertInto('blog_comments').values(insertValues).execute()
    return this.latestComment(context, Number(input.post_id))
  }

  async approveComment(context: TenantRuntimeContext, idOrUuid: string): Promise<BlogComment> {
    const comment = await this.findCommentRow(context, idOrUuid)
    if (!comment) throw new NotFoundException('Comment was not found.')
    const patch: Record<string, unknown> = { is_approved: true, approved_by: context.user.email, approved_at: new Date(), updated_at: new Date(), updated_by: context.user.email }
    if (!comment.is_review) patch.is_review = true
    await this.database(context).updateTable('blog_comments').set(patch).where('id', '=', Number(comment.id)).execute()
    return this.getCommentById(context, Number(comment.id))
  }

  async deleteComment(context: TenantRuntimeContext, idOrUuid: string): Promise<void> {
    const comment = await this.findCommentRow(context, idOrUuid)
    if (!comment) throw new NotFoundException('Comment was not found.')
    await this.database(context).updateTable('blog_comments').set({ deleted_at: new Date(), updated_at: new Date(), updated_by: context.user.email }).where('id', '=', Number(comment.id)).execute()
  }

  async listImages(context: TenantRuntimeContext, query: { post_id?: string }): Promise<BlogImage[]> {
    let queryBuilder: any = this.database(context).selectFrom('blog_images').selectAll().where('tenant_id', '=', context.tenant.id).where('deleted_at', 'is', null)
    if (query.post_id) queryBuilder = queryBuilder.where('post_id', '=', Number(query.post_id))
    const rows = await queryBuilder.orderBy('sort_order', 'asc').orderBy('created_at', 'desc').execute() as Record<string, unknown>[]
    return rows.map(toImage)
  }

  async upsertImage(context: TenantRuntimeContext, input: BlogImageInput): Promise<BlogImage> {
    if (!input.filename?.trim()) throw new BadRequestException('Image filename is required.')
    const patch: Record<string, unknown> = {
      post_id: numberOrNull(input.post_id),
      filename: input.filename?.trim(),
      original_name: input.original_name || input.filename?.trim(),
      mime_type: input.mime_type || 'image/webp',
      size_bytes: numberValue(input.size_bytes),
      url: String(input.url || ''),
      alt_text: emptyAsNull(input.alt_text),
      caption: emptyAsNull(input.caption),
      sort_order: numberValue(input.sort_order),
      is_featured: Boolean(input.is_featured),
    }
    const existing = await this.findImageRow(context, String(input.uuid ?? input.id ?? ''))
    if (existing) {
      await this.database(context).updateTable('blog_images').set(patch).where('id', '=', Number(existing.id)).execute()
      return this.getImageById(context, Number(existing.id))
    }
    const insertValues = { ...patch, uuid: dispatchPublicUuid(), tenant_id: context.tenant.id, created_by: context.user.email }
    await this.database(context).insertInto('blog_images').values(insertValues).execute()
    return this.latestImage(context, Number(input.post_id ?? 0))
  }

  async deleteImage(context: TenantRuntimeContext, idOrUuid: string): Promise<void> {
    const image = await this.findImageRow(context, idOrUuid)
    if (!image) throw new NotFoundException('Image was not found.')
    await this.database(context).updateTable('blog_images').set({ deleted_at: new Date() }).where('id', '=', Number(image.id)).execute()
  }

  async upsertRating(context: TenantRuntimeContext, input: BlogRatingInput): Promise<BlogRating> {
    const postId = Number(input.post_id)
    const authorEmail = input.author_email || context.user.email
    const rating = Math.max(1, Math.min(5, Number(input.rating) || 5))
    const existing = await this.database(context).selectFrom('blog_ratings').selectAll().where('post_id', '=', postId).where('author_email', '=', authorEmail).executeTakeFirst() as Record<string, unknown> | null
    if (existing) {
      await this.database(context).updateTable('blog_ratings').set({ rating }).where('id', '=', Number(existing.id)).execute()
    } else {
      await this.database(context).insertInto('blog_ratings').values({ uuid: dispatchPublicUuid(), tenant_id: context.tenant.id, post_id: postId, author_email: authorEmail, rating }).execute()
    }
    const row = await this.database(context).selectFrom('blog_ratings').selectAll().where('post_id', '=', postId).where('author_email', '=', authorEmail).executeTakeFirst() as Record<string, unknown>
    return toRating(row)
  }

  async deleteRating(context: TenantRuntimeContext, idOrUuid: string): Promise<void> {
    const row = await this.findRatingRow(context, idOrUuid)
    if (!row) throw new NotFoundException('Rating was not found.')
    await this.database(context).deleteFrom('blog_ratings').where('id', '=', Number(row.id)).execute()
  }

  async getPostRating(context: TenantRuntimeContext, postId: number): Promise<{ avg: number; count: number }> {
    const rows = await this.database(context).selectFrom('blog_ratings').selectAll().where('post_id', '=', postId).execute() as Record<string, unknown>[]
    const ratings = rows.map((r) => Number(r.rating))
    const avg = ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0
    return { avg: Math.round(avg * 10) / 10, count: ratings.length }
  }

  async toggleLike(context: TenantRuntimeContext, postId: number, authorEmail?: string): Promise<{ liked: boolean; count: number }> {
    const email = authorEmail || context.user.email
    const existing = await this.database(context).selectFrom('blog_likes').selectAll().where('post_id', '=', postId).where('author_email', '=', email).executeTakeFirst() as Record<string, unknown> | null
    if (existing) {
      await this.database(context).deleteFrom('blog_likes').where('id', '=', Number(existing.id)).execute()
      const rows = await this.database(context).selectFrom('blog_likes').selectAll().where('post_id', '=', postId).execute() as Record<string, unknown>[]
      return { liked: false, count: rows.length }
    }
    await this.database(context).insertInto('blog_likes').values({ tenant_id: context.tenant.id, post_id: postId, author_email: email }).execute()
    const rows = await this.database(context).selectFrom('blog_likes').selectAll().where('post_id', '=', postId).execute() as Record<string, unknown>[]
    return { liked: true, count: rows.length }
  }

  async upsertShare(context: TenantRuntimeContext, input: BlogShareInput): Promise<BlogShare> {
    const postId = Number(input.post_id)
    const platform = String(input.platform || 'direct')
    const existing = await this.database(context).selectFrom('blog_shares').selectAll().where('post_id', '=', postId).where('platform', '=', platform).executeTakeFirst() as Record<string, unknown> | null
    if (existing) {
      await this.database(context).updateTable('blog_shares').set({ count: Number(existing.count) + 1, updated_at: new Date() }).where('id', '=', Number(existing.id)).execute()
    } else {
      await this.database(context).insertInto('blog_shares').values({ uuid: dispatchPublicUuid(), tenant_id: context.tenant.id, post_id: postId, platform, url: emptyAsNull(input.url), count: 1 }).execute()
    }
    const row = await this.database(context).selectFrom('blog_shares').selectAll().where('post_id', '=', postId).where('platform', '=', platform).executeTakeFirst() as Record<string, unknown>
    return toShare(row)
  }

  async listShares(context: TenantRuntimeContext, query: { post_id?: string }): Promise<BlogShare[]> {
    let qb: any = this.database(context).selectFrom('blog_shares').selectAll().where('tenant_id', '=', context.tenant.id)
    if (query.post_id) qb = qb.where('post_id', '=', Number(query.post_id))
    return (await qb.orderBy('count', 'desc').execute() as Record<string, unknown>[]).map(toShare)
  }

  private async findRatingRow(context: TenantRuntimeContext, idOrUuid: string) {
    if (!idOrUuid) return null
    return this.database(context).selectFrom('blog_ratings').selectAll().where('tenant_id', '=', context.tenant.id).where(idColumn(idOrUuid), '=', idValue(idOrUuid)).executeTakeFirst()
  }

  private async upsertSeo(context: TenantRuntimeContext, postId: number, input: Partial<BlogSeoInput>): Promise<BlogSeo> {
    const existing = await this.database(context).selectFrom('blog_seo').selectAll().where('post_id', '=', postId).executeTakeFirst() as Record<string, unknown> | null
    const patch: Record<string, unknown> = {
      meta_title: emptyAsNull(input.meta_title),
      meta_description: emptyAsNull(input.meta_description),
      meta_keywords: emptyAsNull(input.meta_keywords),
      canonical_url: emptyAsNull(input.canonical_url),
      og_title: emptyAsNull(input.og_title),
      og_description: emptyAsNull(input.og_description),
      og_image: emptyAsNull(input.og_image),
      schema_markup: emptyAsNull(input.schema_markup),
      no_index: Boolean(input.no_index),
      updated_by: context.user.email,
      updated_at: new Date(),
    }
    if (existing) {
      await this.database(context).updateTable('blog_seo').set(patch).where('id', '=', Number(existing.id)).execute()
    } else {
      patch.uuid = dispatchPublicUuid()
      patch.tenant_id = context.tenant.id
      patch.post_id = postId
      patch.created_by = context.user.email
      await this.database(context).insertInto('blog_seo').values(patch).execute()
    }
    return (await this.database(context).selectFrom('blog_seo').selectAll().where('post_id', '=', postId).executeTakeFirst()) as unknown as BlogSeo
  }

  getPostById(context: TenantRuntimeContext, id: number): Promise<BlogPost> {
    return this.database(context).selectFrom('blog_posts').selectAll().where('id', '=', id).executeTakeFirst().then((row) => row ? this.toPost(context, row as Record<string, unknown>) : Promise.reject(new NotFoundException('Post was not found.')))
  }

  private async resolvePostId(context: TenantRuntimeContext, slug: string): Promise<number | null> {
    const row = await this.database(context).selectFrom('blog_posts').select('id').where('tenant_id', '=', context.tenant.id).where('slug', '=', slug).where('deleted_at', 'is', null).executeTakeFirst() as Record<string, unknown> | null
    return row ? Number(row.id) : null
  }

  private findPostRow(context: TenantRuntimeContext, idOrUuid: string) {
    if (!idOrUuid) return null
    return this.database(context).selectFrom('blog_posts').selectAll().where('tenant_id', '=', context.tenant.id).where(idColumn(idOrUuid), '=', idValue(idOrUuid)).where('deleted_at', 'is', null).executeTakeFirst()
  }

  private findCategoryRow(context: TenantRuntimeContext, idOrUuid: string) {
    if (!idOrUuid) return null
    return this.database(context).selectFrom('blog_categories').selectAll().where('tenant_id', '=', context.tenant.id).where(idColumn(idOrUuid), '=', idValue(idOrUuid)).where('deleted_at', 'is', null).executeTakeFirst()
  }

  private findTagRow(context: TenantRuntimeContext, idOrUuid: string) {
    if (!idOrUuid) return null
    return this.database(context).selectFrom('blog_tags').selectAll().where('tenant_id', '=', context.tenant.id).where(idColumn(idOrUuid), '=', idValue(idOrUuid)).where('deleted_at', 'is', null).executeTakeFirst()
  }

  private findCommentRow(context: TenantRuntimeContext, idOrUuid: string) {
    if (!idOrUuid) return null
    return this.database(context).selectFrom('blog_comments').selectAll().where('tenant_id', '=', context.tenant.id).where(idColumn(idOrUuid), '=', idValue(idOrUuid)).where('deleted_at', 'is', null).executeTakeFirst()
  }

  private findImageRow(context: TenantRuntimeContext, idOrUuid: string) {
    if (!idOrUuid) return null
    return this.database(context).selectFrom('blog_images').selectAll().where('tenant_id', '=', context.tenant.id).where(idColumn(idOrUuid), '=', idValue(idOrUuid)).where('deleted_at', 'is', null).executeTakeFirst()
  }

  private getCategoryById(context: TenantRuntimeContext, id: number): Promise<BlogCategory> {
    return this.database(context).selectFrom('blog_categories').selectAll().where('id', '=', id).executeTakeFirst().then((row) => row ? this.toCategory(context, row as Record<string, unknown>) : Promise.reject(new NotFoundException('Category was not found.')))
  }

  private getCategoryBySlug(context: TenantRuntimeContext, slug: string): Promise<BlogCategory> {
    return this.database(context).selectFrom('blog_categories').selectAll().where('tenant_id', '=', context.tenant.id).where('slug', '=', slug).where('deleted_at', 'is', null).executeTakeFirst().then((row) => row ? this.toCategory(context, row as Record<string, unknown>) : Promise.reject(new NotFoundException('Category was not found.')))
  }

  private getTagById(context: TenantRuntimeContext, id: number): Promise<BlogTag> {
    return this.database(context).selectFrom('blog_tags').selectAll().where('id', '=', id).executeTakeFirst().then((row) => row ? this.toTag(context, row as Record<string, unknown>) : Promise.reject(new NotFoundException('Tag was not found.')))
  }

  private getTagBySlug(context: TenantRuntimeContext, slug: string): Promise<BlogTag> {
    return this.database(context).selectFrom('blog_tags').selectAll().where('tenant_id', '=', context.tenant.id).where('slug', '=', slug).where('deleted_at', 'is', null).executeTakeFirst().then((row) => row ? this.toTag(context, row as Record<string, unknown>) : Promise.reject(new NotFoundException('Tag was not found.')))
  }

  private getCommentById(context: TenantRuntimeContext, id: number): Promise<BlogComment> {
    return this.database(context).selectFrom('blog_comments').selectAll().where('id', '=', id).executeTakeFirst().then((row) => row ? this.toComment(context, row as Record<string, unknown>) : Promise.reject(new NotFoundException('Comment was not found.')))
  }

  private latestComment(context: TenantRuntimeContext, postId: number): Promise<BlogComment> {
    return this.database(context).selectFrom('blog_comments').selectAll().where('tenant_id', '=', context.tenant.id).where('post_id', '=', postId).orderBy('id', 'desc').executeTakeFirst().then((row) => row ? this.toComment(context, row as Record<string, unknown>) : Promise.reject(new NotFoundException('Comment was not found.')))
  }

  private getImageById(context: TenantRuntimeContext, id: number): Promise<BlogImage> {
    return this.database(context).selectFrom('blog_images').selectAll().where('id', '=', id).executeTakeFirst().then((row) => row ? Promise.resolve(toImage(row as Record<string, unknown>)) : Promise.reject(new NotFoundException('Image was not found.')))
  }

  private latestImage(context: TenantRuntimeContext, postId: number): Promise<BlogImage> {
    return this.database(context).selectFrom('blog_images').selectAll().where('tenant_id', '=', context.tenant.id).where('post_id', '=', postId).orderBy('id', 'desc').executeTakeFirst().then((row) => row ? Promise.resolve(toImage(row as Record<string, unknown>)) : Promise.reject(new NotFoundException('Image was not found.')))
  }

  private async listRecentComments(context: TenantRuntimeContext): Promise<BlogComment[]> {
    const rows = await this.database(context).selectFrom('blog_comments').selectAll().where('tenant_id', '=', context.tenant.id).where('deleted_at', 'is', null).orderBy('created_at', 'desc').limit(10).execute() as Record<string, unknown>[]
    return Promise.all(rows.map((row) => this.toComment(context, row)))
  }

  private async toPost(context: TenantRuntimeContext, row: Record<string, unknown>): Promise<BlogPost> {
    const postId = Number(row.id)
    const category = row.category_id ? await this.database(context).selectFrom('blog_categories').selectAll().where('id', '=', Number(row.category_id)).where('deleted_at', 'is', null).executeTakeFirst() as Record<string, unknown> | null : null
    const tagRows = await this.database(context).selectFrom('blog_post_tags').select('tag_id').where('post_id', '=', postId).execute() as Record<string, unknown>[]
    const tags = tagRows.length ? await this.database(context).selectFrom('blog_tags').selectAll().where('id', 'in', tagRows.map((t) => Number(t.tag_id))).where('deleted_at', 'is', null).execute() as Record<string, unknown>[] : []
    const seo = await this.database(context).selectFrom('blog_seo').selectAll().where('post_id', '=', postId).executeTakeFirst() as Record<string, unknown> | null
    const commentRows = await this.database(context).selectFrom('blog_comments').selectAll().where('post_id', '=', postId).where('deleted_at', 'is', null).execute() as Record<string, unknown>[]
    const ratingRows = await this.database(context).selectFrom('blog_ratings').selectAll().where('post_id', '=', postId).execute() as Record<string, unknown>[]
    const likeRows = await this.database(context).selectFrom('blog_likes').selectAll().where('post_id', '=', postId).execute() as Record<string, unknown>[]
    const shareRows = await this.database(context).selectFrom('blog_shares').selectAll().where('post_id', '=', postId).execute() as Record<string, unknown>[]
    const ratings = ratingRows.map((r) => Number(r.rating))
    const ratingAvg = ratings.length ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10 : 0
    return {
      ...toPost(row),
      category: category ? toCategory(category) : null,
      tags: tags.map(toTag),
      seo: seo ? toSeo(seo) : null,
      comment_count: commentRows.length,
      rating_avg: ratingAvg,
      rating_count: ratings.length,
      like_count: likeRows.length,
      share_count: shareRows.reduce((sum, r) => sum + Number(r.count), 0),
    }
  }

  private async toCategory(context: TenantRuntimeContext, row: Record<string, unknown>): Promise<BlogCategory> {
    const postRows = await this.database(context).selectFrom('blog_posts').select('id').where('category_id', '=', Number(row.id)).where('deleted_at', 'is', null).execute() as Record<string, unknown>[]
    return { ...toCategory(row), post_count: postRows.length }
  }

  private async toTag(context: TenantRuntimeContext, row: Record<string, unknown>): Promise<BlogTag> {
    const ptRows = await this.database(context).selectFrom('blog_post_tags').select('id').where('tag_id', '=', Number(row.id)).execute() as Record<string, unknown>[]
    return { ...toTag(row), post_count: ptRows.length }
  }

  private async toComment(context: TenantRuntimeContext, row: Record<string, unknown>): Promise<BlogComment> {
    const replies = await this.database(context).selectFrom('blog_comments').selectAll().where('parent_id', '=', Number(row.id)).where('deleted_at', 'is', null).orderBy('created_at', 'asc').execute() as Record<string, unknown>[]
    return { ...toComment(row), replies: replies.map(toComment) }
  }

  private database(context: TenantRuntimeContext): Kysely<DynamicDatabase> {
    return context.database as unknown as Kysely<DynamicDatabase>
  }
}

function toPost(row: Record<string, unknown>): Omit<BlogPost, 'category' | 'tags' | 'seo' | 'comment_count'> {
  return {
    id: Number(row.id), uuid: String(row.uuid), tenant_id: Number(row.tenant_id),
    title: String(row.title), slug: String(row.slug),
    content: stringOrNull(row.content), excerpt: stringOrNull(row.excerpt),
    featured_image: stringOrNull(row.featured_image),
    status: String(row.status) as BlogPost['status'],
    author_email: stringOrNull(row.author_email), category_id: numberOrNull(row.category_id),
    published_at: stringOrNull(row.published_at),
    is_featured: Boolean(row.is_featured), allow_comments: Boolean(row.allow_comments),
    view_count: numberValue(row.view_count),
    created_by: String(row.created_by), updated_by: stringOrNull(row.updated_by),
    created_at: row.created_at as Date, updated_at: row.updated_at as Date, deleted_at: row.deleted_at as Date | null,
  }
}

function toCategory(row: Record<string, unknown>): Omit<BlogCategory, 'post_count'> {
  return {
    id: Number(row.id), uuid: String(row.uuid), tenant_id: Number(row.tenant_id),
    name: String(row.name), slug: String(row.slug),
    description: stringOrNull(row.description), parent_id: numberOrNull(row.parent_id),
    sort_order: numberValue(row.sort_order), is_active: Boolean(row.is_active),
    created_by: String(row.created_by), updated_by: stringOrNull(row.updated_by),
    created_at: row.created_at as Date, updated_at: row.updated_at as Date, deleted_at: row.deleted_at as Date | null,
  }
}

function toTag(row: Record<string, unknown>): Omit<BlogTag, 'post_count'> {
  return {
    id: Number(row.id), uuid: String(row.uuid), tenant_id: Number(row.tenant_id),
    name: String(row.name), slug: String(row.slug), is_active: Boolean(row.is_active),
    created_by: String(row.created_by), updated_by: stringOrNull(row.updated_by),
    created_at: row.created_at as Date, updated_at: row.updated_at as Date, deleted_at: row.deleted_at as Date | null,
  }
}

function toComment(row: Record<string, unknown>): Omit<BlogComment, 'replies'> {
  return {
    id: Number(row.id), uuid: String(row.uuid), tenant_id: Number(row.tenant_id),
    post_id: Number(row.post_id), parent_id: numberOrNull(row.parent_id),
    author_name: String(row.author_name), author_email: String(row.author_email),
    author_website: stringOrNull(row.author_website), content: String(row.content),
    is_approved: Boolean(row.is_approved),
    is_review: Boolean(row.is_review),
    approved_by: stringOrNull(row.approved_by), approved_at: stringOrNull(row.approved_at),
    created_by: stringOrNull(row.created_by), updated_by: stringOrNull(row.updated_by),
    created_at: row.created_at as Date, updated_at: row.updated_at as Date, deleted_at: row.deleted_at as Date | null,
  }
}

function toImage(row: Record<string, unknown>): BlogImage {
  return {
    id: Number(row.id), uuid: String(row.uuid), tenant_id: Number(row.tenant_id),
    post_id: numberOrNull(row.post_id),
    filename: String(row.filename), original_name: String(row.original_name),
    mime_type: String(row.mime_type), size_bytes: numberValue(row.size_bytes), url: String(row.url),
    alt_text: stringOrNull(row.alt_text), caption: stringOrNull(row.caption),
    sort_order: numberValue(row.sort_order), is_featured: Boolean(row.is_featured),
    created_by: String(row.created_by), created_at: row.created_at as Date, deleted_at: row.deleted_at as Date | null,
  }
}

function toSeo(row: Record<string, unknown>): BlogSeo {
  return {
    id: Number(row.id), uuid: String(row.uuid), tenant_id: Number(row.tenant_id), post_id: Number(row.post_id),
    meta_title: stringOrNull(row.meta_title), meta_description: stringOrNull(row.meta_description),
    meta_keywords: stringOrNull(row.meta_keywords), canonical_url: stringOrNull(row.canonical_url),
    og_title: stringOrNull(row.og_title), og_description: stringOrNull(row.og_description),
    og_image: stringOrNull(row.og_image), schema_markup: stringOrNull(row.schema_markup),
    no_index: Boolean(row.no_index),
    created_by: String(row.created_by), updated_by: stringOrNull(row.updated_by),
    created_at: row.created_at as Date, updated_at: row.updated_at as Date,
  }
}

function emptyAsNull(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function stringOrNull(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function numberValue(value: unknown) {
  const number = Number(value ?? 0)
  return Number.isFinite(number) ? number : 0
}

function numberOrNull(value: unknown) {
  const number = Number(value ?? 0)
  return Number.isFinite(number) && number > 0 ? number : null
}

function slugValue(value: unknown) {
  return String(value ?? '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || ''
}

function idColumn(idOrUuid: string) {
  return /^\d+$/.test(idOrUuid) && idOrUuid.length !== 8 ? 'id' : 'uuid'
}

function idValue(idOrUuid: string) {
  return idColumn(idOrUuid) === 'id' ? Number(idOrUuid) : idOrUuid
}

function toRating(row: Record<string, unknown>): BlogRating {
  return {
    id: Number(row.id), uuid: String(row.uuid), tenant_id: Number(row.tenant_id),
    post_id: Number(row.post_id), author_email: String(row.author_email),
    rating: Number(row.rating), created_at: row.created_at as Date,
  }
}

function toShare(row: Record<string, unknown>): BlogShare {
  return {
    id: Number(row.id), uuid: String(row.uuid), tenant_id: Number(row.tenant_id),
    post_id: Number(row.post_id), platform: String(row.platform),
    url: stringOrNull(row.url), count: Number(row.count),
    created_at: row.created_at as Date, updated_at: row.updated_at as Date,
  }
}
