import { Badge } from "src/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "src/components/ui/card"
import { cn } from "src/lib/utils"
import type { BlogCategory, BlogPost, BlogTag } from "./blog-client"
import { StatusBadge } from "./blog-posts-view"

export function BlogPostCard({ post, compact }: { post: BlogPost; compact?: boolean }) {
  return (
    <Card className={cn("rounded-md overflow-hidden transition-shadow hover:shadow-md", compact && "flex items-center gap-3 p-3")}>
      {post.featured_image && !compact ? (
        <div className="aspect-video w-full overflow-hidden bg-muted">
          <img className="h-full w-full object-cover" src={post.featured_image} alt={post.title} loading="lazy" />
        </div>
      ) : null}
      <CardContent className={cn("p-4", compact && "flex-1 p-0")}>
        {compact ? (
          <>
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-medium truncate">{post.title}</h3>
              <StatusBadge status={post.status} />
            </div>
            {post.excerpt ? <p className="mt-1 text-xs text-muted-foreground line-clamp-1">{post.excerpt}</p> : null}
          </>
        ) : (
          <>
            <div className="flex items-center gap-2 mb-2">
              <StatusBadge status={post.status} />
              {post.category ? <Badge variant="secondary" className="rounded-md text-xs">{post.category.name}</Badge> : null}
            </div>
            <CardTitle className="text-lg leading-snug">{post.title}</CardTitle>
            {post.excerpt ? <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{post.excerpt}</p> : null}
            {post.tags && post.tags.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {post.tags.map((tag) => <Badge key={tag.id} variant="outline" className="rounded-md text-[10px]">{tag.name}</Badge>)}
              </div>
            ) : null}
            <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
              <span>{post.author_email || "System"}</span>
              {post.published_at ? <span>{new Date(post.published_at).toLocaleDateString()}</span> : null}
              <span>{post.view_count} views</span>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

export function BlogPostGrid({ posts }: { posts: BlogPost[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {posts.map((post) => <BlogPostCard key={post.uuid} post={post} />)}
      {!posts.length ? <p className="col-span-full py-12 text-center text-sm text-muted-foreground">No posts found.</p> : null}
    </div>
  )
}

export function BlogCategoryBadge({ category }: { category: BlogCategory }) {
  return (
    <Badge variant="outline" className="rounded-md border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100">
      {category.name}
      {category.post_count !== undefined ? <span className="ml-1 opacity-60">({category.post_count})</span> : null}
    </Badge>
  )
}

export function BlogTagBadge({ tag }: { tag: BlogTag }) {
  return (
    <Badge variant="outline" className="rounded-md border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100">
      #{tag.name}
      {tag.post_count !== undefined ? <span className="ml-1 opacity-60">({tag.post_count})</span> : null}
    </Badge>
  )
}

export function BlogCategoryList({ categories, activeId, onSelect }: { categories: BlogCategory[]; activeId?: number | null; onSelect?(id: number | null): void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {onSelect ? (
        <button
          type="button"
          className={cn("rounded-md px-3 py-1.5 text-xs font-medium transition-colors", !activeId ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80")}
          onClick={() => onSelect(null)}
        >
          All
        </button>
      ) : null}
      {categories.map((cat) => (
        <button
          key={cat.id}
          type="button"
          className={cn(
            "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
            activeId === cat.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80",
          )}
          onClick={() => onSelect?.(cat.id)}
        >
          {cat.name}
          {cat.post_count !== undefined ? <span className="ml-1 opacity-60">({cat.post_count})</span> : null}
        </button>
      ))}
    </div>
  )
}

export function BlogTagList({ tags }: { tags: BlogTag[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {tags.map((tag) => <BlogTagBadge key={tag.id} tag={tag} />)}
      {!tags.length ? <p className="text-sm text-muted-foreground">No tags.</p> : null}
    </div>
  )
}

export function BlogSidebar({ categories, tags, recentPosts }: { categories: BlogCategory[]; tags: BlogTag[]; recentPosts: BlogPost[] }) {
  return (
    <aside className="space-y-6">
      <Card className="rounded-md">
        <CardHeader><CardTitle className="text-base">Categories</CardTitle></CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="space-y-1">
            {categories.map((cat) => (
              <div key={cat.id} className="flex items-center justify-between py-1.5 text-sm">
                <span className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer">{cat.name}</span>
                <span className="text-xs text-muted-foreground">{cat.post_count ?? 0}</span>
              </div>
            ))}
            {!categories.length ? <p className="text-sm text-muted-foreground">No categories.</p> : null}
          </div>
        </CardContent>
      </Card>
      <Card className="rounded-md">
        <CardHeader><CardTitle className="text-base">Tags</CardTitle></CardHeader>
        <CardContent className="p-4 pt-0">
          <BlogTagList tags={tags} />
        </CardContent>
      </Card>
      <Card className="rounded-md">
        <CardHeader><CardTitle className="text-base">Recent Posts</CardTitle></CardHeader>
        <CardContent className="grid gap-3 p-4 pt-0">
          {recentPosts.slice(0, 5).map((post) => <BlogPostCard key={post.uuid} compact post={post} />)}
          {!recentPosts.length ? <p className="text-sm text-muted-foreground">No posts.</p> : null}
        </CardContent>
      </Card>
    </aside>
  )
}
