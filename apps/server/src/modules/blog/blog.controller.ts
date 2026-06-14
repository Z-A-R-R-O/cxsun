import { Body, Headers, Param, Query } from '../../core/decorators/http-params.js'
import { Controller, Get, Post } from '../../core/decorators/controller.js'
import { Inject } from '../../core/decorators/inject.js'
import type { TenantRequestHeaders } from '../../core/tenant/tenant-context.service.js'
import { BlogService } from './blog.service.js'
import type { BlogCategoryInput, BlogCommentInput, BlogImageInput, BlogPostInput, BlogRatingInput, BlogSeoInput, BlogShareInput, BlogTagInput } from './blog.types.js'

@Controller('api/v1/blog')
export class BlogController {
  constructor(@Inject(BlogService) private readonly blog: BlogService) {}

  @Get()
  workspace(@Headers() headers: TenantRequestHeaders) {
    return this.blog.workspace(headers)
  }

  @Get('posts')
  listPosts(@Headers() headers: TenantRequestHeaders, @Query() query: { status?: string; category_id?: string; tag_id?: string; search?: string; limit?: string; offset?: string }) {
    return this.blog.listPosts(headers, query)
  }

  @Get('posts/:idOrUuid')
  getPost(@Headers() headers: TenantRequestHeaders, @Param('idOrUuid') idOrUuid: string) {
    return this.blog.getPost(headers, idOrUuid)
  }

  @Post('posts/upsert')
  upsertPost(@Headers() headers: TenantRequestHeaders, @Body() body: BlogPostInput & { tag_ids?: number[]; seo?: Partial<BlogSeoInput> }) {
    return this.blog.upsertPost(headers, body)
  }

  @Post('posts/:idOrUuid/delete')
  deletePost(@Headers() headers: TenantRequestHeaders, @Param('idOrUuid') idOrUuid: string) {
    return this.blog.deletePost(headers, idOrUuid)
  }

  @Get('categories')
  listCategories(@Headers() headers: TenantRequestHeaders) {
    return this.blog.listCategories(headers)
  }

  @Post('categories/upsert')
  upsertCategory(@Headers() headers: TenantRequestHeaders, @Body() body: BlogCategoryInput) {
    return this.blog.upsertCategory(headers, body)
  }

  @Post('categories/:idOrUuid/delete')
  deleteCategory(@Headers() headers: TenantRequestHeaders, @Param('idOrUuid') idOrUuid: string) {
    return this.blog.deleteCategory(headers, idOrUuid)
  }

  @Get('tags')
  listTags(@Headers() headers: TenantRequestHeaders) {
    return this.blog.listTags(headers)
  }

  @Post('tags/upsert')
  upsertTag(@Headers() headers: TenantRequestHeaders, @Body() body: BlogTagInput) {
    return this.blog.upsertTag(headers, body)
  }

  @Post('tags/:idOrUuid/delete')
  deleteTag(@Headers() headers: TenantRequestHeaders, @Param('idOrUuid') idOrUuid: string) {
    return this.blog.deleteTag(headers, idOrUuid)
  }

  @Get('comments')
  listComments(@Headers() headers: TenantRequestHeaders, @Query() query: { post_id?: string; is_approved?: string; search?: string }) {
    return this.blog.listComments(headers, query)
  }

  @Post('comments/upsert')
  upsertComment(@Headers() headers: TenantRequestHeaders, @Body() body: BlogCommentInput) {
    return this.blog.upsertComment(headers, body)
  }

  @Post('comments/:idOrUuid/approve')
  approveComment(@Headers() headers: TenantRequestHeaders, @Param('idOrUuid') idOrUuid: string) {
    return this.blog.approveComment(headers, idOrUuid)
  }

  @Post('comments/:idOrUuid/delete')
  deleteComment(@Headers() headers: TenantRequestHeaders, @Param('idOrUuid') idOrUuid: string) {
    return this.blog.deleteComment(headers, idOrUuid)
  }

  @Get('images')
  listImages(@Headers() headers: TenantRequestHeaders, @Query() query: { post_id?: string }) {
    return this.blog.listImages(headers, query)
  }

  @Post('images/upsert')
  upsertImage(@Headers() headers: TenantRequestHeaders, @Body() body: BlogImageInput) {
    return this.blog.upsertImage(headers, body)
  }

  @Post('images/:idOrUuid/delete')
  deleteImage(@Headers() headers: TenantRequestHeaders, @Param('idOrUuid') idOrUuid: string) {
    return this.blog.deleteImage(headers, idOrUuid)
  }

  @Post('ratings/upsert')
  upsertRating(@Headers() headers: TenantRequestHeaders, @Body() body: BlogRatingInput) {
    return this.blog.upsertRating(headers, body)
  }

  @Post('ratings/:idOrUuid/delete')
  deleteRating(@Headers() headers: TenantRequestHeaders, @Param('idOrUuid') idOrUuid: string) {
    return this.blog.deleteRating(headers, idOrUuid)
  }

  @Get('ratings/:postId')
  getPostRating(@Headers() headers: TenantRequestHeaders, @Param('postId') postId: string) {
    return this.blog.getPostRating(headers, postId)
  }

  @Post('likes/toggle')
  toggleLike(@Headers() headers: TenantRequestHeaders, @Body() body: { post_id: string; author_email?: string }) {
    return this.blog.toggleLike(headers, body.post_id, body.author_email)
  }

  @Post('shares/upsert')
  upsertShare(@Headers() headers: TenantRequestHeaders, @Body() body: BlogShareInput) {
    return this.blog.upsertShare(headers, body)
  }

  @Get('shares')
  listShares(@Headers() headers: TenantRequestHeaders, @Query() query: { post_id?: string }) {
    return this.blog.listShares(headers, query)
  }
}
