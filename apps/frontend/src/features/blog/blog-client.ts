import { apiBaseUrl, authHeaders, type AuthSession } from "src/features/auth/auth-client"

export interface BlogCategory {
  id: number
  uuid: string
  tenant_id: number
  name: string
  slug: string
  description: string | null
  parent_id: number | null
  sort_order: number
  is_active: boolean | number
  created_by: string
  updated_by: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
  post_count?: number
}

export interface BlogTag {
  id: number
  uuid: string
  tenant_id: number
  name: string
  slug: string
  is_active: boolean | number
  created_by: string
  updated_by: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
  post_count?: number
}

export interface BlogPost {
  id: number
  uuid: string
  tenant_id: number
  title: string
  slug: string
  content: string | null
  excerpt: string | null
  featured_image: string | null
  status: "draft" | "published" | "archived"
  author_email: string | null
  category_id: number | null
  published_at: string | null
  is_featured: boolean | number
  allow_comments: boolean | number
  view_count: number
  created_by: string
  updated_by: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
  category?: BlogCategory | null
  tags?: BlogTag[]
  seo?: BlogSeo | null
  comment_count?: number
  rating_avg?: number
  rating_count?: number
  like_count?: number
  share_count?: number
}

export interface BlogComment {
  id: number
  uuid: string
  tenant_id: number
  post_id: number
  parent_id: number | null
  author_name: string
  author_email: string
  author_website: string | null
  content: string
  is_approved: boolean | number
  is_review: boolean | number
  approved_by: string | null
  approved_at: string | null
  created_by: string | null
  updated_by: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
  replies?: BlogComment[]
}

export interface BlogImage {
  id: number
  uuid: string
  tenant_id: number
  post_id: number | null
  filename: string
  original_name: string
  mime_type: string
  size_bytes: number
  url: string
  alt_text: string | null
  caption: string | null
  sort_order: number
  is_featured: boolean | number
  created_by: string
  created_at: string
  deleted_at: string | null
}

export interface BlogSeo {
  id: number
  uuid: string
  tenant_id: number
  post_id: number
  meta_title: string | null
  meta_description: string | null
  meta_keywords: string | null
  canonical_url: string | null
  og_title: string | null
  og_description: string | null
  og_image: string | null
  schema_markup: string | null
  no_index: boolean | number
  created_by: string
  updated_by: string | null
  created_at: string
  updated_at: string
}

export interface BlogRating {
  id: number
  uuid: string
  tenant_id: number
  post_id: number
  author_email: string
  rating: number
  created_at: string
}

export interface BlogLike {
  id: number
  tenant_id: number
  post_id: number
  author_email: string
  created_at: string
}

export interface BlogShare {
  id: number
  uuid: string
  tenant_id: number
  post_id: number
  platform: string
  url: string | null
  count: number
  created_at: string
  updated_at: string
}

export interface BlogWorkspace {
  posts: BlogPost[]
  categories: BlogCategory[]
  tags: BlogTag[]
  recentComments: BlogComment[]
  postCount: number
  publishedCount: number
  draftCount: number
  commentCount: number
}

export type BlogView = "posts" | "categories" | "tags" | "comments" | "images" | "seo" | "post-editor"
export type BlogPostDraft = Omit<Partial<BlogPost>, "seo"> & { tag_ids?: number[]; seo?: Record<string, unknown> }

export function emptyCategory(): Partial<BlogCategory> {
  return { name: "", slug: "", description: "", parent_id: null, sort_order: 0, is_active: true }
}

export function emptyTag(): Partial<BlogTag> {
  return { name: "", slug: "", is_active: true }
}

export function emptyPost(): BlogPostDraft {
  return { title: "", slug: "", content: "", excerpt: "", featured_image: "", status: "draft" as const, category_id: null, is_featured: false, allow_comments: true, tag_ids: [], seo: { meta_title: "", meta_description: "", meta_keywords: "", og_title: "", og_description: "", og_image: "", no_index: false } as Record<string, unknown> }
}

export function emptyComment(): Partial<BlogComment> {
  return { post_id: 0, parent_id: null, author_name: "", author_email: "", author_website: "", content: "", is_approved: false }
}

export function emptyImage(): Partial<BlogImage> {
  return { post_id: null, filename: "", original_name: "", mime_type: "image/webp", size_bytes: 0, url: "", alt_text: "", caption: "", sort_order: 0, is_featured: false }
}

export async function getBlogWorkspace(session: AuthSession) {
  const response = await fetch(`${apiBaseUrl}/api/v1/blog`, { cache: "no-store", headers: authHeaders(session) })
  if (!response.ok) throw new Error(`Blog workspace failed with status ${response.status}.`)
  return (await response.json()) as BlogWorkspace
}

export async function listBlogPosts(session: AuthSession, query?: { status?: string; category_id?: string; tag_id?: string; search?: string; limit?: string; offset?: string }) {
  const params = new URLSearchParams()
  if (query?.status) params.set("status", query.status)
  if (query?.category_id) params.set("category_id", query.category_id)
  if (query?.tag_id) params.set("tag_id", query.tag_id)
  if (query?.search) params.set("search", query.search)
  if (query?.limit) params.set("limit", query.limit)
  if (query?.offset) params.set("offset", query.offset)
  const qs = params.toString()
  const response = await fetch(`${apiBaseUrl}/api/v1/blog/posts${qs ? `?${qs}` : ""}`, { cache: "no-store", headers: authHeaders(session) })
  if (!response.ok) throw new Error(`Blog posts list failed with status ${response.status}.`)
  return (await response.json()) as BlogPost[]
}

async function blogPost(session: AuthSession, path: string, input: unknown, fallback: string) {
  const response = await fetch(`${apiBaseUrl}/api/v1/blog/${path}`, {
    body: JSON.stringify(input),
    cache: "no-store",
    headers: { ...authHeaders(session), "Content-Type": "application/json" },
    method: "POST",
  })
  if (!response.ok) throw new Error(`${fallback} with status ${response.status}.`)
  return response.json()
}

export async function upsertBlogPost(session: AuthSession, input: BlogPostDraft) {
  return blogPost(session, "posts/upsert", input, "Post save failed") as Promise<{ ok: boolean; post: BlogPost }>
}

export async function deleteBlogPost(session: AuthSession, post: BlogPost) {
  return blogPost(session, `posts/${post.uuid}/delete`, {}, "Post delete failed")
}

export async function upsertBlogCategory(session: AuthSession, input: Partial<BlogCategory>) {
  return blogPost(session, "categories/upsert", input, "Category save failed") as Promise<{ ok: boolean; category: BlogCategory }>
}

export async function deleteBlogCategory(session: AuthSession, category: BlogCategory) {
  return blogPost(session, `categories/${category.uuid}/delete`, {}, "Category delete failed")
}

export async function upsertBlogTag(session: AuthSession, input: Partial<BlogTag>) {
  return blogPost(session, "tags/upsert", input, "Tag save failed") as Promise<{ ok: boolean; tag: BlogTag }>
}

export async function deleteBlogTag(session: AuthSession, tag: BlogTag) {
  return blogPost(session, `tags/${tag.uuid}/delete`, {}, "Tag delete failed")
}

export async function listBlogComments(session: AuthSession, query?: { post_id?: string; is_approved?: string; search?: string }) {
  const params = new URLSearchParams()
  if (query?.post_id) params.set("post_id", query.post_id)
  if (query?.is_approved) params.set("is_approved", query.is_approved)
  if (query?.search) params.set("search", query.search)
  const qs = params.toString()
  const response = await fetch(`${apiBaseUrl}/api/v1/blog/comments${qs ? `?${qs}` : ""}`, { cache: "no-store", headers: authHeaders(session) })
  if (!response.ok) throw new Error(`Blog comments list failed with status ${response.status}.`)
  return (await response.json()) as BlogComment[]
}

export async function upsertBlogComment(session: AuthSession, input: Partial<BlogComment>) {
  return blogPost(session, "comments/upsert", input, "Comment save failed") as Promise<{ ok: boolean; comment: BlogComment }>
}

export async function approveBlogComment(session: AuthSession, comment: BlogComment) {
  return blogPost(session, `comments/${comment.uuid}/approve`, {}, "Comment approve failed") as Promise<{ ok: boolean; comment: BlogComment }>
}

export async function deleteBlogComment(session: AuthSession, comment: BlogComment) {
  return blogPost(session, `comments/${comment.uuid}/delete`, {}, "Comment delete failed")
}

export async function listBlogImages(session: AuthSession, query?: { post_id?: string }) {
  const params = new URLSearchParams()
  if (query?.post_id) params.set("post_id", query.post_id)
  const qs = params.toString()
  const response = await fetch(`${apiBaseUrl}/api/v1/blog/images${qs ? `?${qs}` : ""}`, { cache: "no-store", headers: authHeaders(session) })
  if (!response.ok) throw new Error(`Blog images list failed with status ${response.status}.`)
  return (await response.json()) as BlogImage[]
}

export async function upsertBlogImage(session: AuthSession, input: Partial<BlogImage>) {
  return blogPost(session, "images/upsert", input, "Image save failed") as Promise<{ ok: boolean; image: BlogImage }>
}

export async function deleteBlogImage(session: AuthSession, image: BlogImage) {
  return blogPost(session, `images/${image.uuid}/delete`, {}, "Image delete failed")
}

export async function upsertBlogRating(session: AuthSession, input: Partial<BlogRating>) {
  return blogPost(session, "ratings/upsert", input, "Rating save failed") as Promise<{ ok: boolean; rating: BlogRating }>
}

export async function deleteBlogRating(session: AuthSession, rating: BlogRating) {
  return blogPost(session, `ratings/${rating.uuid}/delete`, {}, "Rating delete failed")
}

export async function getBlogPostRating(session: AuthSession, postId: number) {
  const response = await fetch(`${apiBaseUrl}/api/v1/blog/ratings/${postId}`, { cache: "no-store", headers: authHeaders(session) })
  if (!response.ok) throw new Error(`Blog rating fetch failed with status ${response.status}.`)
  return (await response.json()) as { avg: number; count: number }
}

export async function toggleBlogLike(session: AuthSession, postId: number, authorEmail?: string) {
  return blogPost(session, "likes/toggle", { post_id: String(postId), author_email: authorEmail }, "Like toggle failed") as Promise<{ ok: boolean; liked: boolean; count: number }>
}

export async function upsertBlogShare(session: AuthSession, input: Partial<BlogShare>) {
  return blogPost(session, "shares/upsert", input, "Share save failed") as Promise<{ ok: boolean; share: BlogShare }>
}

export async function listBlogShares(session: AuthSession, query?: { post_id?: string }) {
  const params = new URLSearchParams()
  if (query?.post_id) params.set("post_id", query.post_id)
  const qs = params.toString()
  const response = await fetch(`${apiBaseUrl}/api/v1/blog/shares${qs ? `?${qs}` : ""}`, { cache: "no-store", headers: authHeaders(session) })
  if (!response.ok) throw new Error(`Blog shares list failed with status ${response.status}.`)
  return (await response.json()) as BlogShare[]
}
