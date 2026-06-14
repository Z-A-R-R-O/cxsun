export interface BlogPost {
  id: number
  uuid: string
  tenant_id: number
  title: string
  slug: string
  content: string | null
  excerpt: string | null
  featured_image: string | null
  status: 'draft' | 'published' | 'archived'
  author_email: string | null
  category_id: number | null
  published_at: string | null
  is_featured: boolean | number
  allow_comments: boolean | number
  view_count: number
  created_by: string
  updated_by: string | null
  created_at: Date
  updated_at: Date
  deleted_at: Date | null
  category?: BlogCategory | null
  tags?: BlogTag[]
  seo?: BlogSeo | null
  comment_count?: number
  rating_avg?: number
  rating_count?: number
  like_count?: number
  share_count?: number
}

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
  created_at: Date
  updated_at: Date
  deleted_at: Date | null
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
  created_at: Date
  updated_at: Date
  deleted_at: Date | null
  post_count?: number
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
  created_at: Date
  updated_at: Date
  deleted_at: Date | null
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
  created_at: Date
  deleted_at: Date | null
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
  created_at: Date
  updated_at: Date
}

export interface BlogRating {
  id: number
  uuid: string
  tenant_id: number
  post_id: number
  author_email: string
  rating: number
  created_at: Date
}

export interface BlogLike {
  id: number
  tenant_id: number
  post_id: number
  author_email: string
  created_at: Date
}

export interface BlogShare {
  id: number
  uuid: string
  tenant_id: number
  post_id: number
  platform: string
  url: string | null
  count: number
  created_at: Date
  updated_at: Date
}

export type BlogPostInput = Partial<Omit<BlogPost, 'tags' | 'category' | 'seo'>> & { tag_ids?: number[]; seo?: Partial<BlogSeoInput> }
export type BlogCategoryInput = Partial<BlogCategory>
export type BlogTagInput = Partial<BlogTag>
export type BlogCommentInput = Partial<BlogComment>
export type BlogImageInput = Partial<BlogImage>
export type BlogSeoInput = Partial<Omit<BlogSeo, 'id' | 'uuid' | 'tenant_id' | 'post_id'>>
export type BlogRatingInput = Partial<BlogRating>
export type BlogShareInput = Partial<BlogShare>

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
