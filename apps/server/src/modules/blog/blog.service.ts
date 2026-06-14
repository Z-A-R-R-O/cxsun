import { Inject } from '../../core/decorators/inject.js'
import { Injectable } from '../../core/decorators/injectable.js'
import { TenantContextService, type TenantRequestHeaders } from '../../core/tenant/tenant-context.service.js'
import { BlogRepository } from './blog.repository.js'
import type { BlogCategoryInput, BlogCommentInput, BlogImageInput, BlogPostInput, BlogRatingInput, BlogSeoInput, BlogShareInput, BlogTagInput } from './blog.types.js'

@Injectable()
export class BlogService {
  constructor(
    @Inject(() => TenantContextService) private readonly tenants: TenantContextService,
    @Inject(BlogRepository) private readonly blog: BlogRepository,
  ) {}

  async workspace(headers: TenantRequestHeaders) {
    const context = await this.tenants.resolve(headers, 'company.manage')
    return this.blog.workspace(context)
  }

  async listPosts(headers: TenantRequestHeaders, query: { status?: string; category_id?: string; tag_id?: string; search?: string; limit?: string; offset?: string }) {
    const context = await this.tenants.resolve(headers, 'company.manage')
    return this.blog.listPosts(context, query)
  }

  async getPost(headers: TenantRequestHeaders, idOrUuid: string) {
    const context = await this.tenants.resolve(headers, 'company.manage')
    const isNumeric = /^\d+$/.test(idOrUuid)
    const post = isNumeric ? await this.blog.getPostById(context, Number(idOrUuid)) : null
    if (!post) {
      const posts = await this.blog.listPosts(context, { limit: '1' })
      const found = (await Promise.all(posts.map(async (p) => (p.uuid === idOrUuid ? p : null)))).filter(Boolean)
      return found[0] ?? null
    }
    return post
  }

  async upsertPost(headers: TenantRequestHeaders, input: BlogPostInput & { tag_ids?: number[]; seo?: Partial<BlogSeoInput> }) {
    const context = await this.tenants.resolve(headers, 'company.manage')
    return { ok: true, post: await this.blog.upsertPost(context, input) }
  }

  async deletePost(headers: TenantRequestHeaders, idOrUuid: string) {
    const context = await this.tenants.resolve(headers, 'company.manage')
    await this.blog.deletePost(context, idOrUuid)
    return { ok: true }
  }

  async listCategories(headers: TenantRequestHeaders) {
    const context = await this.tenants.resolve(headers, 'company.manage')
    return this.blog.listCategories(context)
  }

  async upsertCategory(headers: TenantRequestHeaders, input: BlogCategoryInput) {
    const context = await this.tenants.resolve(headers, 'company.manage')
    return { ok: true, category: await this.blog.upsertCategory(context, input) }
  }

  async deleteCategory(headers: TenantRequestHeaders, idOrUuid: string) {
    const context = await this.tenants.resolve(headers, 'company.manage')
    await this.blog.deleteCategory(context, idOrUuid)
    return { ok: true }
  }

  async listTags(headers: TenantRequestHeaders) {
    const context = await this.tenants.resolve(headers, 'company.manage')
    return this.blog.listTags(context)
  }

  async upsertTag(headers: TenantRequestHeaders, input: BlogTagInput) {
    const context = await this.tenants.resolve(headers, 'company.manage')
    return { ok: true, tag: await this.blog.upsertTag(context, input) }
  }

  async deleteTag(headers: TenantRequestHeaders, idOrUuid: string) {
    const context = await this.tenants.resolve(headers, 'company.manage')
    await this.blog.deleteTag(context, idOrUuid)
    return { ok: true }
  }

  async listComments(headers: TenantRequestHeaders, query: { post_id?: string; is_approved?: string; search?: string }) {
    const context = await this.tenants.resolve(headers, 'company.manage')
    return this.blog.listComments(context, query)
  }

  async upsertComment(headers: TenantRequestHeaders, input: BlogCommentInput) {
    const context = await this.tenants.resolve(headers, 'company.manage')
    return { ok: true, comment: await this.blog.upsertComment(context, input) }
  }

  async approveComment(headers: TenantRequestHeaders, idOrUuid: string) {
    const context = await this.tenants.resolve(headers, 'company.manage')
    return { ok: true, comment: await this.blog.approveComment(context, idOrUuid) }
  }

  async deleteComment(headers: TenantRequestHeaders, idOrUuid: string) {
    const context = await this.tenants.resolve(headers, 'company.manage')
    await this.blog.deleteComment(context, idOrUuid)
    return { ok: true }
  }

  async listImages(headers: TenantRequestHeaders, query: { post_id?: string }) {
    const context = await this.tenants.resolve(headers, 'company.manage')
    return this.blog.listImages(context, query)
  }

  async upsertImage(headers: TenantRequestHeaders, input: BlogImageInput) {
    const context = await this.tenants.resolve(headers, 'company.manage')
    return { ok: true, image: await this.blog.upsertImage(context, input) }
  }

  async deleteImage(headers: TenantRequestHeaders, idOrUuid: string) {
    const context = await this.tenants.resolve(headers, 'company.manage')
    await this.blog.deleteImage(context, idOrUuid)
    return { ok: true }
  }

  async upsertRating(headers: TenantRequestHeaders, input: BlogRatingInput) {
    const context = await this.tenants.resolve(headers, 'company.manage')
    return { ok: true, rating: await this.blog.upsertRating(context, input) }
  }

  async deleteRating(headers: TenantRequestHeaders, idOrUuid: string) {
    const context = await this.tenants.resolve(headers, 'company.manage')
    await this.blog.deleteRating(context, idOrUuid)
    return { ok: true }
  }

  async getPostRating(headers: TenantRequestHeaders, postId: string) {
    const context = await this.tenants.resolve(headers, 'company.manage')
    return this.blog.getPostRating(context, Number(postId))
  }

  async toggleLike(headers: TenantRequestHeaders, postId: string, authorEmail?: string) {
    const context = await this.tenants.resolve(headers, 'company.manage')
    return { ok: true, ...await this.blog.toggleLike(context, Number(postId), authorEmail) }
  }

  async upsertShare(headers: TenantRequestHeaders, input: BlogShareInput) {
    const context = await this.tenants.resolve(headers, 'company.manage')
    return { ok: true, share: await this.blog.upsertShare(context, input) }
  }

  async listShares(headers: TenantRequestHeaders, query: { post_id?: string }) {
    const context = await this.tenants.resolve(headers, 'company.manage')
    return this.blog.listShares(context, query)
  }
}
