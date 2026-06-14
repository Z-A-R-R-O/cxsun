import { useEffect, useMemo, useState } from "react"
import { useMutation, useQuery } from "@tanstack/react-query"
import { EditorContent, useEditor } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import {
  ArrowLeft, Bold, CheckCircle2, FileEdit, Heading2, Heading3, Italic, List, ListOrdered,
  Plus, Quote, RefreshCw, RotateCcw, RotateCw, Save, Trash2, X,
} from "lucide-react"
import { toast } from "sonner"
import { Badge } from "src/components/ui/badge"
import { Button } from "src/components/ui/button"
import { Input } from "src/components/ui/input"
import { Label } from "src/components/ui/label"
import {
  MasterListEmptyState,
  MasterListPageFrame,
  MasterListPaginationCard,
  MasterListRowActions,
  MasterListShowCard,
  MasterListShowLayout,
  MasterListTableCard,
  MasterListToolbarCard,
  MasterListUpsertCard,
  buildMasterListShowingLabel,
} from "src/components/blocks/lists/master-list"
import { cn } from "src/lib/utils"
import type { AuthSession } from "src/features/auth/auth-client"
import {
  approveBlogComment, deleteBlogCategory, deleteBlogComment, deleteBlogImage, deleteBlogPost, deleteBlogTag,
  getBlogWorkspace, listBlogComments, listBlogImages,
  upsertBlogCategory, upsertBlogComment, upsertBlogImage, upsertBlogPost, upsertBlogTag, type BlogCategory,
  type BlogComment, type BlogImage, type BlogPost, type BlogPostDraft, type BlogTag, type BlogView, emptyCategory,
  emptyComment, emptyImage, emptyPost, emptyTag,
} from "./blog-client"

function blogViewFromDashboardPage(page?: string): BlogView | null {
  if (page === "app-blog-posts" || page === "app-blog-settings") return "posts"
  if (page === "app-blog-categories") return "categories"
  if (page === "app-blog-tags") return "tags"
  if (page === "app-blog-comments") return "comments"
  if (page === "app-blog-images") return "images"
  if (page === "app-blog-seo") return "seo"
  return null
}

export function BlogPage({ session, view = "posts" }: { session: AuthSession; view?: BlogView }) {
  const [activeView, setActiveView] = useState<BlogView>(view)
  const [postView, setPostView] = useState<{ mode: "list" } | { mode: "show"; post: BlogPost } | { mode: "upsert"; post: BlogPostDraft | null }>({ mode: "list" })
  const [categoryDialog, setCategoryDialog] = useState<Partial<BlogCategory> | null | undefined>(undefined)
  const [tagDialog, setTagDialog] = useState<Partial<BlogTag> | null | undefined>(undefined)
  const [commentDialog, setCommentDialog] = useState<Partial<BlogComment> | null>(null)
  const [imageDialog, setImageDialog] = useState<Partial<BlogImage> | null>(null)

  function leaveEditorForList(nextView: BlogView) {
    setActiveView(nextView)
    setPostView({ mode: "list" })
    setCategoryDialog(undefined)
    setTagDialog(undefined)
    setCommentDialog(null)
    setImageDialog(null)
  }

  useEffect(() => {
    leaveEditorForList(view)
  }, [view])

  useEffect(() => {
    function handleDashboardNavigate(event: Event) {
      const page = (event as CustomEvent<{ page?: string }>).detail?.page
      const nextView = blogViewFromDashboardPage(page)
      if (nextView) leaveEditorForList(nextView)
    }

    window.addEventListener("cxsun:dashboard-navigate", handleDashboardNavigate)
    return () => window.removeEventListener("cxsun:dashboard-navigate", handleDashboardNavigate)
  }, [])

  const workspaceQuery = useQuery({
    queryKey: ["blog-workspace", session.selectedTenant.slug],
    queryFn: () => getBlogWorkspace(session),
  })
  const commentsQuery = useQuery({
    queryKey: ["blog-comments", session.selectedTenant.slug],
    queryFn: () => listBlogComments(session),
  })
  const imagesQuery = useQuery({
    queryKey: ["blog-images", session.selectedTenant.slug],
    queryFn: () => listBlogImages(session),
  })
  const workspace = workspaceQuery.data ?? { posts: [], categories: [], tags: [], recentComments: [], postCount: 0, publishedCount: 0, draftCount: 0, commentCount: 0 }
  const comments = commentsQuery.data ?? workspace.recentComments
  const images = imagesQuery.data ?? []

  const postMutation = useMutation({ mutationFn: (input: BlogPostDraft) => upsertBlogPost(session, input) })
  const postDeleteMutation = useMutation({ mutationFn: (post: BlogPost) => deleteBlogPost(session, post) })
  const categoryMutation = useMutation({ mutationFn: (input: Partial<BlogCategory>) => upsertBlogCategory(session, input) })
  const categoryDeleteMutation = useMutation({ mutationFn: (cat: BlogCategory) => deleteBlogCategory(session, cat) })
  const tagMutation = useMutation({ mutationFn: (input: Partial<BlogTag>) => upsertBlogTag(session, input) })
  const tagDeleteMutation = useMutation({ mutationFn: (tag: BlogTag) => deleteBlogTag(session, tag) })
  const commentMutation = useMutation({ mutationFn: (input: Partial<BlogComment>) => upsertBlogComment(session, input) })
  const commentApproveMutation = useMutation({ mutationFn: (comment: BlogComment) => approveBlogComment(session, comment) })
  const commentDeleteMutation = useMutation({ mutationFn: (c: BlogComment) => deleteBlogComment(session, c) })
  const imageMutation = useMutation({ mutationFn: (input: Partial<BlogImage>) => upsertBlogImage(session, input) })
  const imageDeleteMutation = useMutation({ mutationFn: (img: BlogImage) => deleteBlogImage(session, img) })
  const isWorking = postMutation.isPending || postDeleteMutation.isPending || categoryMutation.isPending || categoryDeleteMutation.isPending || tagMutation.isPending || tagDeleteMutation.isPending || commentMutation.isPending || commentApproveMutation.isPending || commentDeleteMutation.isPending || imageMutation.isPending || imageDeleteMutation.isPending

  async function apply(next: Promise<unknown>, message: string) {
    await next
    toast.success(message)
    await workspaceQuery.refetch()
    await commentsQuery.refetch()
    await imagesQuery.refetch()
  }

  async function refreshAll() {
    await workspaceQuery.refetch()
    await commentsQuery.refetch()
    await imagesQuery.refetch()
  }

  if (postView.mode === "upsert") {
    return (
      <PostUpsertPage
        categories={workspace.categories}
        draft={postView.post}
        isSaving={postMutation.isPending}
        tags={workspace.tags}
        onBack={() => setPostView({ mode: "list" })}
        onSave={async (input) => {
          await apply(postMutation.mutateAsync(input), input.uuid ? "Post updated" : "Post created")
          setPostView({ mode: "list" })
        }}
      />
    )
  }

  if (postView.mode === "show") {
    return (
      <PostShowPage
        post={workspace.posts.find((p) => p.uuid === postView.post.uuid) ?? postView.post}
        onBack={() => setPostView({ mode: "list" })}
        onDelete={async (post) => { await apply(postDeleteMutation.mutateAsync(post), "Post deleted"); setPostView({ mode: "list" }) }}
        onEdit={(post) => setPostView({ mode: "upsert", post: { ...post, seo: (post.seo ?? {}) as unknown as Record<string, unknown> } as BlogPostDraft })}
      />
    )
  }

  return activeView === "posts" ? (
            <PostListView
              isLoading={workspaceQuery.isFetching}
              posts={workspace.posts}
              onDelete={(post) => apply(postDeleteMutation.mutateAsync(post), "Post deleted")}
              onEdit={(post) => setPostView({ mode: "upsert", post: { ...post, seo: (post.seo ?? {}) as unknown as Record<string, unknown> } as BlogPostDraft })}
              onRefresh={refreshAll}
              onShow={(post) => setPostView({ mode: "show", post })}
              onNew={() => setPostView({ mode: "upsert", post: emptyPost() })}
            />
          ) : activeView === "categories" ? (
            <>
              <CategoryListView
                categories={workspace.categories}
                isLoading={commentsQuery.isFetching}
                onDelete={(cat) => apply(categoryDeleteMutation.mutateAsync(cat), "Category deleted")}
                onEdit={setCategoryDialog}
                onNew={() => setCategoryDialog(null)}
                onRefresh={refreshAll}
              />
              {categoryDialog !== undefined ? (
                <CategoryUpsertDialog
                  categories={workspace.categories}
                  disabled={isWorking}
                  draft={categoryDialog}
                  onClose={() => setCategoryDialog(undefined)}
                  onSave={(input) => apply(categoryMutation.mutateAsync(input), input.uuid ? "Category updated" : "Category created").then(() => setCategoryDialog(undefined))}
                />
              ) : null}
            </>
          ) : activeView === "tags" ? (
            <>
              <TagListView
                isLoading={workspaceQuery.isFetching}
                tags={workspace.tags}
                onDelete={(tag) => apply(tagDeleteMutation.mutateAsync(tag), "Tag deleted")}
                onEdit={setTagDialog}
                onNew={() => setTagDialog(null)}
                onRefresh={refreshAll}
              />
              {tagDialog !== undefined ? (
                <TagUpsertDialog
                  disabled={isWorking}
                  draft={tagDialog}
                  onClose={() => setTagDialog(undefined)}
                  onSave={(input) => apply(tagMutation.mutateAsync(input), input.uuid ? "Tag updated" : "Tag created").then(() => setTagDialog(undefined))}
                />
              ) : null}
            </>
          ) : activeView === "comments" ? (
            <>
              <CommentsListView
                isLoading={workspaceQuery.isFetching}
                comments={comments}
                posts={workspace.posts}
                onApprove={(c) => apply(commentApproveMutation.mutateAsync(c), "Comment approved")}
                onDelete={(c) => apply(commentDeleteMutation.mutateAsync(c), "Comment deleted")}
                onEdit={setCommentDialog}
                onNew={() => setCommentDialog(emptyComment())}
                onRefresh={refreshAll}
              />
              {commentDialog ? (
                <CommentUpsertDialog
                  disabled={isWorking}
                  draft={commentDialog}
                  onClose={() => setCommentDialog(null)}
                  posts={workspace.posts}
                  onSave={(input) => apply(commentMutation.mutateAsync(input), input.uuid ? "Comment updated" : "Comment created").then(() => setCommentDialog(null))}
                />
              ) : null}
            </>
          ) : activeView === "images" ? (
            <>
              <ImagesListView
                images={images}
                isLoading={imagesQuery.isFetching}
                posts={workspace.posts}
                onDelete={(img) => apply(imageDeleteMutation.mutateAsync(img), "Image deleted")}
                onEdit={setImageDialog}
                onNew={() => setImageDialog(emptyImage())}
                onRefresh={refreshAll}
              />
              {imageDialog ? (
                <ImageUpsertDialog
                  disabled={isWorking}
                  draft={imageDialog}
                  onClose={() => setImageDialog(null)}
                  posts={workspace.posts}
                  onSave={(input) => apply(imageMutation.mutateAsync(input), input.uuid ? "Image updated" : "Image created").then(() => setImageDialog(null))}
                />
              ) : null}
            </>
          ) : activeView === "seo" ? (
            <SeoListView
              isLoading={workspaceQuery.isFetching}
              posts={workspace.posts}
              onEdit={(post) => setPostView({ mode: "upsert", post: { ...post, seo: (post.seo ?? {}) as unknown as Record<string, unknown> } as BlogPostDraft })}
              onRefresh={refreshAll}
            />
          ) : null
}

function SeoListView({ isLoading, onEdit, onRefresh, posts }: { isLoading: boolean; onEdit(post: BlogPost): void; onRefresh(): void; posts: BlogPost[] }) {
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState(100)
  const filtered = posts.filter((p) => p.title.toLowerCase().includes(search.toLowerCase()))
  const totalPages = Math.max(1, Math.ceil(filtered.length / rowsPerPage))
  const pagePosts = filtered.slice((page - 1) * rowsPerPage, page * rowsPerPage)

  return (
    <MasterListPageFrame
      action={<Button disabled={isLoading} onClick={onRefresh} type="button" variant="outline" className="h-9 rounded-md"><RefreshCw className={cn("size-4", isLoading && "animate-spin")} />Refresh</Button>}
      description="Review and manage SEO metadata for blog posts."
      technicalName="page.blog.seo"
      title="SEO"
    >
      <MasterListToolbarCard columns={[]} searchPlaceholder="Search post title..." searchValue={search} onSearchValueChange={(v) => { setSearch(v); setPage(1) }} onShowAllColumns={() => {}} />
      <MasterListTableCard>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] border-collapse text-sm">
            <thead className="bg-muted/50">
              <tr><ListHeader>Post</ListHeader><ListHeader>Meta Title</ListHeader><ListHeader>Meta Description</ListHeader><ListHeader>No Index</ListHeader><ListHeader className="text-right">Action</ListHeader></tr>
            </thead>
            <tbody>
              {pagePosts.map((post) => (
                <tr key={post.uuid} className="border-b border-border/70">
                  <td className="px-4 py-2 font-medium">{post.title}</td>
                  <td className="max-w-[200px] truncate px-4 py-2 text-muted-foreground">{post.seo?.meta_title ?? "-"}</td>
                  <td className="max-w-[250px] truncate px-4 py-2 text-muted-foreground">{post.seo?.meta_description ?? "-"}</td>
                  <td className="px-4 py-2">{post.seo?.no_index ? <Badge variant="outline" className="rounded-md border-amber-200 bg-amber-50 text-amber-700">noindex</Badge> : "-"}</td>
                  <td className="px-4 py-1.5 text-right"><MasterListRowActions title={post.title} onEdit={() => onEdit(post)} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {pagePosts.length === 0 ? <MasterListEmptyState>{isLoading ? "Loading posts." : "No posts found."}</MasterListEmptyState> : null}
      </MasterListTableCard>
      <MasterListPaginationCard page={page} rowsPerPage={rowsPerPage} showingLabel={buildMasterListShowingLabel({ page, pageSize: rowsPerPage, totalCount: filtered.length })} singularLabel="posts" totalCount={filtered.length} totalPages={totalPages} onNextPage={() => setPage((p) => Math.min(totalPages, p + 1))} onPageChange={setPage} onPreviousPage={() => setPage((p) => Math.max(1, p - 1))} onRowsPerPageChange={(value) => { setRowsPerPage(value); setPage(1) }} />
    </MasterListPageFrame>
  )
}

function PostListView({ isLoading, onDelete, onEdit, onNew, onRefresh, onShow, posts }: { isLoading: boolean; onDelete(post: BlogPost): void; onEdit(post: BlogPost): void; onNew(): void; onRefresh(): void; onShow(post: BlogPost): void; posts: BlogPost[] }) {
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [page, setPage] = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState(100)
  const filtered = useMemo(() => {
    let result = posts
    const q = search.trim().toLowerCase()
    if (q) result = result.filter((p) => p.title.toLowerCase().includes(q) || (p.excerpt ?? "").toLowerCase().includes(q) || (p.author_email ?? "").toLowerCase().includes(q))
    if (statusFilter !== "all") result = result.filter((p) => p.status === statusFilter)
    return result
  }, [posts, search, statusFilter])
  const totalPages = Math.max(1, Math.ceil(filtered.length / rowsPerPage))
  const pagePosts = filtered.slice((page - 1) * rowsPerPage, page * rowsPerPage)

  return (
    <MasterListPageFrame
      action={<div className="flex items-center gap-2"><Button disabled={isLoading} onClick={onRefresh} type="button" variant="outline" className="h-9 rounded-md"><RefreshCw className={cn("size-4", isLoading && "animate-spin")} />Refresh</Button><Button onClick={onNew} type="button" className="h-9 rounded-md"><Plus className="size-4" />New Post</Button></div>}
      description="Create and manage blog posts."
      technicalName="page.blog.posts"
      title="Posts"
    >
      <MasterListToolbarCard
        columns={[]}
        filterOptions={[{ id: "all", label: "All posts" }, { id: "draft", label: "Draft" }, { id: "published", label: "Published" }, { id: "archived", label: "Archived" }]}
        filterValue={statusFilter}
        onFilterValueChange={(v) => { setStatusFilter(v); setPage(1) }}
        onShowAllColumns={() => {}}
        searchPlaceholder="Search title, excerpt, or author..."
        searchValue={search}
        onSearchValueChange={(v) => { setSearch(v); setPage(1) }}
      />
      <MasterListTableCard>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] border-collapse text-sm">
            <thead className="bg-muted/50">
              <tr><ListHeader>Title</ListHeader><ListHeader>Status</ListHeader><ListHeader>Author</ListHeader><ListHeader>Category</ListHeader><ListHeader>Published</ListHeader><ListHeader className="text-right">Action</ListHeader></tr>
            </thead>
            <tbody>
              {pagePosts.map((post) => (
                <tr key={post.uuid} className="border-b border-border/70">
                  <td className="px-4 py-2"><button className="font-semibold hover:underline" onClick={() => onShow(post)} type="button">{post.title}</button></td>
                  <td className="px-4 py-2"><PostStatusBadge status={post.status} /></td>
                  <td className="px-4 py-2 text-muted-foreground">{post.author_email ?? "-"}</td>
                  <td className="px-4 py-2 text-muted-foreground">{post.category?.name ?? "-"}</td>
                  <td className="px-4 py-2 text-muted-foreground">{post.published_at ? new Date(post.published_at).toLocaleDateString() : "-"}</td>
                  <td className="px-4 py-1.5 text-right">
                    <MasterListRowActions title={post.title} onDelete={() => onDelete(post)} onEdit={() => onEdit(post)} onView={() => onShow(post)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {pagePosts.length === 0 ? <MasterListEmptyState>{isLoading ? "Loading posts." : "No posts found."}</MasterListEmptyState> : null}
      </MasterListTableCard>
      <MasterListPaginationCard page={page} rowsPerPage={rowsPerPage} showingLabel={buildMasterListShowingLabel({ page, pageSize: rowsPerPage, totalCount: filtered.length })} singularLabel="posts" totalCount={filtered.length} totalPages={totalPages} onNextPage={() => setPage((p) => Math.min(totalPages, p + 1))} onPageChange={setPage} onPreviousPage={() => setPage((p) => Math.max(1, p - 1))} onRowsPerPageChange={(value) => { setRowsPerPage(value); setPage(1) }} />
    </MasterListPageFrame>
  )
}

function PostShowPage({ onBack, onDelete, onEdit, post }: { onBack(): void; onDelete(post: BlogPost): void; onEdit(post: BlogPost): void; post: BlogPost }) {
  return (
    <div className="@container/main flex flex-1 flex-col gap-4 px-4 py-4 md:py-6 lg:px-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" className="h-9 rounded-md" onClick={onBack}><ArrowLeft className="size-4" />Back</Button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" className="h-9 rounded-md" onClick={() => onEdit(post)}><FileEdit className="size-4" />Edit</Button>
          <Button type="button" variant="destructive" className="h-9 rounded-md" onClick={() => onDelete(post)}><Trash2 className="size-4" />Delete</Button>
        </div>
      </div>
      <MasterListShowLayout>
        <div className="space-y-4">
          <MasterListShowCard title={post.title} description={`${post.status} · ${post.published_at ? new Date(post.published_at).toLocaleDateString() : "Not published"}`}>
            <div className="space-y-4 text-sm">
              <div className="flex flex-wrap gap-4">
                <div><span className="font-medium">Author:</span> {post.author_email ?? "-"}</div>
                <div><span className="font-medium">Category:</span> {post.category?.name ?? "-"}</div>
                <div><span className="font-medium">Views:</span> {post.view_count}</div>
                <div><span className="font-medium">Comments:</span> {post.comment_count ?? 0}</div>
                {post.rating_avg ? <div><span className="font-medium">Rating:</span> {post.rating_avg} ({post.rating_count} votes)</div> : null}
                <div><span className="font-medium">Likes:</span> {post.like_count ?? 0}</div>
                <div><span className="font-medium">Shares:</span> {post.share_count ?? 0}</div>
              </div>
              {post.excerpt ? <p className="italic text-muted-foreground">{post.excerpt}</p> : null}
              <div className="prose prose-sm max-w-none rounded-md border border-border/70 bg-muted/20 p-4">{post.content ?? "No content."}</div>
              {post.tags?.length ? <div className="flex flex-wrap gap-2">{post.tags.map((tag) => <Badge key={tag.uuid} variant="secondary" className="rounded-md">{tag.name}</Badge>)}</div> : null}
            </div>
          </MasterListShowCard>
        </div>
        <div className="space-y-4">
          {post.seo ? (
            <MasterListShowCard title="SEO">
              <div className="space-y-2 text-sm">
                <div><span className="font-medium">Meta Title:</span> {post.seo.meta_title ?? "-"}</div>
                <div><span className="font-medium">Meta Description:</span> {post.seo.meta_description ?? "-"}</div>
                <div><span className="font-medium">Keywords:</span> {post.seo.meta_keywords ?? "-"}</div>
                {post.seo.no_index ? <Badge variant="outline" className="rounded-md border-amber-200 bg-amber-50 text-amber-700">No Index</Badge> : null}
              </div>
            </MasterListShowCard>
          ) : null}
          <MasterListShowCard title="Stats">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span>Created</span><span className="text-muted-foreground">{new Date(post.created_at).toLocaleString()}</span></div>
              <div className="flex justify-between"><span>Updated</span><span className="text-muted-foreground">{new Date(post.updated_at).toLocaleString()}</span></div>
            </div>
          </MasterListShowCard>
        </div>
      </MasterListShowLayout>
    </div>
  )
}

function PostUpsertPage({ categories, draft: initialDraft, isSaving, tags, onBack, onSave }: {
  categories: BlogCategory[]
  draft: BlogPostDraft | null
  isSaving: boolean
  onBack(): void
  onSave(input: BlogPostDraft): Promise<void>
  tags: BlogTag[]
}) {
  const [draft, setDraft] = useState(initialDraft ?? emptyPost())

  function setField(key: string, value: unknown) {
    setDraft((current) => ({ ...current, [key]: value }) as BlogPostDraft)
  }

  function setSeo(key: string, value: unknown) {
    setDraft((current) => ({ ...current, seo: { ...((current.seo || {}) as Record<string, unknown>), [key]: value } }) as BlogPostDraft)
  }

  function toggleTag(tagId: number) {
    const current = draft.tag_ids ?? []
    setField("tag_ids", current.includes(tagId) ? current.filter((id) => id !== tagId) : [...current, tagId])
  }

  return (
    <MasterListPageFrame
      title={draft.uuid ? "Edit post" : "New post"}
      description="Compose blog content with publish, taxonomy, and SEO controls."
      technicalName="page.blog.posts.upsert"
      action={<div className="flex flex-wrap items-center gap-2"><Button type="button" variant="outline" className="h-9 rounded-md" onClick={onBack}><ArrowLeft className="size-4" />Back</Button><Button disabled={isSaving || !draft.title?.trim()} type="button" className="h-9 rounded-md" onClick={() => onSave(draft)}><Save className={cn("size-4", isSaving && "animate-spin")} />{isSaving ? "Saving..." : "Save"}</Button></div>}
    >
      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-5">
          <MasterListUpsertCard className="gap-4" title="Content">
            <div className="grid gap-4">
              <Input className="h-14 rounded-md border-border/80 text-2xl font-semibold shadow-sm" value={draft.title ?? ""} onChange={(e) => setField("title", e.target.value)} placeholder="Add title" />
              <div className="grid gap-2"><Label>Slug</Label><Input className="h-10 rounded-md" value={draft.slug ?? ""} onChange={(e) => setField("slug", e.target.value)} placeholder="auto-generated-from-title" /></div>
              <BlogRichTextEditor value={draft.content ?? ""} onChange={(value) => setField("content", value)} />
              <div className="grid gap-2"><Label>Excerpt</Label><textarea className="min-h-24 rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm" value={draft.excerpt ?? ""} onChange={(e) => setField("excerpt", e.target.value)} placeholder="Brief description for cards and search previews" /></div>
            </div>
          </MasterListUpsertCard>

          <MasterListUpsertCard title="SEO Settings">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2"><Label>Meta Title</Label><Input className="h-10 rounded-md" value={String((draft.seo as Record<string, unknown>)?.meta_title ?? "")} onChange={(e) => setSeo("meta_title", e.target.value)} /></div>
              <div className="grid gap-2"><Label>Meta Keywords</Label><Input className="h-10 rounded-md" value={String((draft.seo as Record<string, unknown>)?.meta_keywords ?? "")} onChange={(e) => setSeo("meta_keywords", e.target.value)} placeholder="comma, separated" /></div>
              <div className="grid gap-2 md:col-span-2"><Label>Meta Description</Label><textarea className="min-h-20 rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm" value={String((draft.seo as Record<string, unknown>)?.meta_description ?? "")} onChange={(e) => setSeo("meta_description", e.target.value)} /></div>
              <div className="grid gap-2"><Label>Canonical URL</Label><Input className="h-10 rounded-md" value={String((draft.seo as Record<string, unknown>)?.canonical_url ?? "")} onChange={(e) => setSeo("canonical_url", e.target.value)} /></div>
              <div className="grid gap-2"><Label>OG Image URL</Label><Input className="h-10 rounded-md" value={String((draft.seo as Record<string, unknown>)?.og_image ?? "")} onChange={(e) => setSeo("og_image", e.target.value)} /></div>
              <div className="grid gap-2"><Label>OG Title</Label><Input className="h-10 rounded-md" value={String((draft.seo as Record<string, unknown>)?.og_title ?? "")} onChange={(e) => setSeo("og_title", e.target.value)} /></div>
              <div className="grid gap-2"><Label>OG Description</Label><Input className="h-10 rounded-md" value={String((draft.seo as Record<string, unknown>)?.og_description ?? "")} onChange={(e) => setSeo("og_description", e.target.value)} /></div>
            </div>
          </MasterListUpsertCard>
        </div>

        <aside className="space-y-5 xl:sticky xl:top-20">
          <MasterListUpsertCard title="Publish">
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label>Status</Label>
                <select className="h-10 rounded-md border border-input bg-background px-3 text-sm shadow-sm" value={draft.status ?? "draft"} onChange={(e) => setField("status", e.target.value)}>
                  <option value="draft">Draft</option><option value="published">Published</option><option value="archived">Archived</option>
                </select>
              </div>
              <label className="flex min-h-12 cursor-pointer items-center justify-between gap-4 rounded-md border border-border/70 bg-muted/10 px-3 py-2">
                <span className="text-sm font-medium">Featured post</span>
                <input type="checkbox" className="size-4 accent-primary" checked={Boolean(draft.is_featured)} onChange={(e) => setField("is_featured", e.target.checked)} />
              </label>
              <label className="flex min-h-12 cursor-pointer items-center justify-between gap-4 rounded-md border border-border/70 bg-muted/10 px-3 py-2">
                <span className="text-sm font-medium">Allow comments</span>
                <input type="checkbox" className="size-4 accent-primary" checked={draft.allow_comments !== false} onChange={(e) => setField("allow_comments", e.target.checked)} />
              </label>
              <label className="flex min-h-12 cursor-pointer items-center justify-between gap-4 rounded-md border border-border/70 bg-muted/10 px-3 py-2">
                <span className="text-sm font-medium">No Index</span>
                <input type="checkbox" className="size-4 accent-primary" checked={Boolean((draft.seo as Record<string, unknown>)?.no_index)} onChange={(e) => setSeo("no_index", e.target.checked)} />
              </label>
            </div>
          </MasterListUpsertCard>

          <MasterListUpsertCard title="Category">
            <select className="h-10 rounded-md border border-input bg-background px-3 text-sm shadow-sm" value={String(draft.category_id ?? "")} onChange={(e) => setField("category_id", e.target.value ? Number(e.target.value) : null)}>
              <option value="">Uncategorized</option>
              {categories.map((cat) => <option key={cat.id} value={String(cat.id)}>{cat.name}</option>)}
            </select>
          </MasterListUpsertCard>

          <MasterListUpsertCard title="Tags">
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => {
                const active = draft.tag_ids?.includes(tag.id)
                return (
                  <button key={tag.id} type="button" className={cn("rounded-md border px-3 py-1.5 text-xs font-medium transition-colors", active ? "border-primary bg-primary/10 text-primary" : "border-border bg-background text-muted-foreground hover:border-primary/40")} onClick={() => toggleTag(tag.id)}>
                    {tag.name}
                  </button>
                )
              })}
              {!tags.length ? <p className="text-sm text-muted-foreground">No tags available.</p> : null}
            </div>
          </MasterListUpsertCard>

          <MasterListUpsertCard title="Featured Image">
            <div className="grid gap-3">
              <Input className="h-10 rounded-md" value={draft.featured_image ?? ""} onChange={(e) => setField("featured_image", e.target.value)} placeholder="https://..." />
              {draft.featured_image ? <img alt="" className="aspect-video w-full rounded-md border border-border/70 object-cover" src={draft.featured_image} /> : null}
            </div>
          </MasterListUpsertCard>
        </aside>
      </div>
    </MasterListPageFrame>
  )
}

function BlogRichTextEditor({ onChange, value }: { onChange(value: string): void; value: string }) {
  const editor = useEditor({
    extensions: [StarterKit],
    content: value,
    editorProps: {
      attributes: {
        class: "min-h-[460px] px-4 py-4 text-base leading-7 outline-none [&_blockquote]:border-l-4 [&_blockquote]:border-border [&_blockquote]:pl-4 [&_blockquote]:text-muted-foreground [&_h2]:mb-3 [&_h2]:mt-6 [&_h2]:text-2xl [&_h2]:font-semibold [&_h3]:mb-2 [&_h3]:mt-5 [&_h3]:text-xl [&_h3]:font-semibold [&_ol]:ml-5 [&_ol]:list-decimal [&_p]:my-3 [&_ul]:ml-5 [&_ul]:list-disc",
      },
    },
    onUpdate: ({ editor: currentEditor }) => onChange(currentEditor.isEmpty ? "" : currentEditor.getHTML()),
  })

  useEffect(() => {
    if (!editor || editor.getHTML() === value) return
    editor.commands.setContent(value || "", { emitUpdate: false })
  }, [editor, value])

  const tools = [
    { label: "Bold", active: editor?.isActive("bold"), icon: Bold, run: () => editor?.chain().focus().toggleBold().run() },
    { label: "Italic", active: editor?.isActive("italic"), icon: Italic, run: () => editor?.chain().focus().toggleItalic().run() },
    { label: "Heading 2", active: editor?.isActive("heading", { level: 2 }), icon: Heading2, run: () => editor?.chain().focus().toggleHeading({ level: 2 }).run() },
    { label: "Heading 3", active: editor?.isActive("heading", { level: 3 }), icon: Heading3, run: () => editor?.chain().focus().toggleHeading({ level: 3 }).run() },
    { label: "Bullet list", active: editor?.isActive("bulletList"), icon: List, run: () => editor?.chain().focus().toggleBulletList().run() },
    { label: "Numbered list", active: editor?.isActive("orderedList"), icon: ListOrdered, run: () => editor?.chain().focus().toggleOrderedList().run() },
    { label: "Quote", active: editor?.isActive("blockquote"), icon: Quote, run: () => editor?.chain().focus().toggleBlockquote().run() },
    { label: "Undo", active: false, icon: RotateCcw, run: () => editor?.chain().focus().undo().run() },
    { label: "Redo", active: false, icon: RotateCw, run: () => editor?.chain().focus().redo().run() },
  ]

  return (
    <div className="grid gap-2">
      <Label>Content</Label>
      <div className="overflow-hidden rounded-md border border-input bg-background shadow-sm focus-within:border-foreground/40 focus-within:ring-2 focus-within:ring-ring/30">
        <div className="flex flex-wrap gap-1 border-b border-border/70 bg-muted/30 p-1.5">
          {tools.map(({ active, icon: Icon, label, run }) => (
            <Button aria-label={label} className={cn("size-8 rounded-md p-0", active && "bg-muted text-foreground")} key={label} onClick={run} title={label} type="button" variant="ghost">
              <Icon className="size-4" />
            </Button>
          ))}
        </div>
        <EditorContent editor={editor} />
      </div>
    </div>
  )
}

function CategoryListView({ categories, isLoading, onDelete, onEdit, onNew, onRefresh }: { categories: BlogCategory[]; isLoading: boolean; onDelete(cat: BlogCategory): void; onEdit(cat: BlogCategory): void; onNew(): void; onRefresh(): void }) {
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState(100)
  const filtered = categories.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()))
  const totalPages = Math.max(1, Math.ceil(filtered.length / rowsPerPage))
  const pageItems = filtered.slice((page - 1) * rowsPerPage, page * rowsPerPage)

  return (
    <MasterListPageFrame action={<div className="flex items-center gap-2"><Button disabled={isLoading} onClick={onRefresh} type="button" variant="outline" className="h-9 rounded-md"><RefreshCw className={cn("size-4", isLoading && "animate-spin")} />Refresh</Button><Button onClick={onNew} type="button" className="h-9 rounded-md"><Plus className="size-4" />New</Button></div>} description="Organize blog posts into categories." technicalName="page.blog.categories" title="Categories">
      <MasterListToolbarCard columns={[]} searchPlaceholder="Search category name..." searchValue={search} onSearchValueChange={(v) => { setSearch(v); setPage(1) }} onShowAllColumns={() => {}} />
      <MasterListTableCard>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[650px] border-collapse text-sm">
            <thead className="bg-muted/50">
              <tr><ListHeader>#</ListHeader><ListHeader>Name</ListHeader><ListHeader>Slug</ListHeader><ListHeader>Parent</ListHeader><ListHeader>Posts</ListHeader><ListHeader>Sort</ListHeader><ListHeader>Status</ListHeader><ListHeader className="text-right">Action</ListHeader></tr>
            </thead>
            <tbody>
              {pageItems.map((cat, i) => (
                <tr key={cat.uuid} className="border-b border-border/70">
                  <td className="px-4 py-2 text-muted-foreground">{(page - 1) * rowsPerPage + i + 1}</td>
                  <td className="px-4 py-2 font-medium">{cat.name}</td>
                  <td className="px-4 py-2 text-muted-foreground">{cat.slug}</td>
                  <td className="px-4 py-2 text-muted-foreground">{categories.find((p) => p.id === cat.parent_id)?.name ?? "-"}</td>
                  <td className="px-4 py-2 text-center text-muted-foreground">{cat.post_count ?? 0}</td>
                  <td className="px-4 py-2 text-center text-muted-foreground">{cat.sort_order}</td>
                  <td className="px-4 py-2">{cat.is_active ? <Badge variant="outline" className="rounded-md border-emerald-200 bg-emerald-50 text-emerald-700">active</Badge> : <Badge variant="outline" className="rounded-md border-amber-200 bg-amber-50 text-amber-700">inactive</Badge>}</td>
                  <td className="px-4 py-1.5 text-right"><MasterListRowActions title={cat.name} onDelete={() => onDelete(cat)} onEdit={() => onEdit(cat)} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {pageItems.length === 0 ? <MasterListEmptyState>{isLoading ? "Loading categories." : "No categories found."}</MasterListEmptyState> : null}
      </MasterListTableCard>
      <MasterListPaginationCard page={page} rowsPerPage={rowsPerPage} showingLabel={buildMasterListShowingLabel({ page, pageSize: rowsPerPage, totalCount: filtered.length })} singularLabel="categories" totalCount={filtered.length} totalPages={totalPages} onNextPage={() => setPage((p) => Math.min(totalPages, p + 1))} onPageChange={setPage} onPreviousPage={() => setPage((p) => Math.max(1, p - 1))} onRowsPerPageChange={(value) => { setRowsPerPage(value); setPage(1) }} />
    </MasterListPageFrame>
  )
}

function CategoryUpsertDialog({ categories, disabled, draft: initialDraft, onClose, onSave }: { categories: BlogCategory[]; disabled: boolean; draft: Partial<BlogCategory> | null; onClose(): void; onSave(input: Partial<BlogCategory>): void }) {
  const [draft, setDraft] = useState(initialDraft ?? emptyCategory())
  const [error, setError] = useState<string | null>(null)

  async function submit() {
    if (!draft.name?.trim()) { setError("Name is required."); return }
    await onSave(draft)
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-background/55 p-4 backdrop-blur-sm">
      <div className="w-[min(600px,calc(100vw-2rem))] rounded-md border border-border/70 bg-card shadow-xl">
        <div className="flex items-center justify-between border-b border-border/70 px-5 py-4">
          <h2 className="text-base font-semibold">{draft.uuid ? "Edit category" : "New category"}</h2>
          <Button size="icon" variant="ghost" onClick={onClose} type="button"><X className="size-4" /></Button>
        </div>
        <div className="grid max-h-[min(60vh,30rem)] gap-5 overflow-y-auto p-5">
          <div className="grid gap-2"><Label>Name *</Label><Input className="h-11 rounded-xl" value={draft.name ?? ""} onChange={(e) => setDraft((c) => ({ ...c, name: e.target.value }))} /></div>
          <div className="grid gap-2"><Label>Slug</Label><Input className="h-11 rounded-xl" value={draft.slug ?? ""} onChange={(e) => setDraft((c) => ({ ...c, slug: e.target.value }))} /></div>
          <div className="grid gap-2">
            <Label>Parent</Label>
            <select className="h-11 rounded-xl border border-input bg-background px-3 text-sm shadow-sm" value={String(draft.parent_id ?? "")} onChange={(e) => setDraft((c) => ({ ...c, parent_id: e.target.value ? Number(e.target.value) : null }))}>
              <option value="">No parent</option>
              {categories.map((c) => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
            </select>
          </div>
          <div className="grid gap-2"><Label>Sort order</Label><Input type="number" className="h-11 rounded-xl" value={String(draft.sort_order ?? 0)} onChange={(e) => setDraft((c) => ({ ...c, sort_order: Number(e.target.value || 0) }))} /></div>
          <div className="grid gap-2"><Label>Description</Label><textarea className="min-h-20 rounded-xl border border-input bg-background px-3 py-2 text-sm shadow-sm" value={draft.description ?? ""} onChange={(e) => setDraft((c) => ({ ...c, description: e.target.value }))} /></div>
          <label className="flex min-h-14 cursor-pointer items-center justify-between gap-4 rounded-xl border border-border/70 bg-muted/10 px-4 py-3">
            <span className="flex items-center gap-1.5 text-sm font-medium">{draft.is_active ? <CheckCircle2 className="size-3.5 text-emerald-600" /> : null}Active</span>
            <input type="checkbox" className="size-4 accent-primary" checked={Boolean(draft.is_active)} onChange={(e) => setDraft((c) => ({ ...c, is_active: e.target.checked }))} />
          </label>
        </div>
        {error ? <p className="px-5 pb-2 text-sm font-medium text-destructive">{error}</p> : null}
        <div className="flex flex-wrap items-center gap-3 border-t border-border/70 px-5 py-4">
          <Button disabled={disabled} onClick={() => void submit()} type="button" className="rounded-md"><Save className="size-4" />Save</Button>
          <Button onClick={onClose} type="button" variant="outline" className="rounded-md"><X className="size-4" />Cancel</Button>
        </div>
      </div>
    </div>
  )
}

function TagListView({ isLoading, onDelete, onEdit, onNew, onRefresh, tags }: { isLoading: boolean; onDelete(tag: BlogTag): void; onEdit(tag: BlogTag): void; onNew(): void; onRefresh(): void; tags: BlogTag[] }) {
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState(100)
  const filtered = tags.filter((t) => t.name.toLowerCase().includes(search.toLowerCase()))
  const totalPages = Math.max(1, Math.ceil(filtered.length / rowsPerPage))
  const pageItems = filtered.slice((page - 1) * rowsPerPage, page * rowsPerPage)

  return (
    <MasterListPageFrame action={<div className="flex items-center gap-2"><Button disabled={isLoading} onClick={onRefresh} type="button" variant="outline" className="h-9 rounded-md"><RefreshCw className={cn("size-4", isLoading && "animate-spin")} />Refresh</Button><Button onClick={onNew} type="button" className="h-9 rounded-md"><Plus className="size-4" />New</Button></div>} description="Tag blog posts for quick filtering." technicalName="page.blog.tags" title="Tags">
      <MasterListToolbarCard columns={[]} searchPlaceholder="Search tag name..." searchValue={search} onSearchValueChange={(v) => { setSearch(v); setPage(1) }} onShowAllColumns={() => {}} />
      <MasterListTableCard>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[550px] border-collapse text-sm">
            <thead className="bg-muted/50">
              <tr><ListHeader>#</ListHeader><ListHeader>Name</ListHeader><ListHeader>Slug</ListHeader><ListHeader>Posts</ListHeader><ListHeader>Status</ListHeader><ListHeader className="text-right">Action</ListHeader></tr>
            </thead>
            <tbody>
              {pageItems.map((tag, i) => (
                <tr key={tag.uuid} className="border-b border-border/70">
                  <td className="px-4 py-2 text-muted-foreground">{(page - 1) * rowsPerPage + i + 1}</td>
                  <td className="px-4 py-2 font-medium">{tag.name}</td>
                  <td className="px-4 py-2 text-muted-foreground">{tag.slug}</td>
                  <td className="px-4 py-2 text-center text-muted-foreground">{tag.post_count ?? 0}</td>
                  <td className="px-4 py-2">{tag.is_active ? <Badge variant="outline" className="rounded-md border-emerald-200 bg-emerald-50 text-emerald-700">active</Badge> : <Badge variant="outline" className="rounded-md border-amber-200 bg-amber-50 text-amber-700">inactive</Badge>}</td>
                  <td className="px-4 py-1.5 text-right"><MasterListRowActions title={tag.name} onDelete={() => onDelete(tag)} onEdit={() => onEdit(tag)} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {pageItems.length === 0 ? <MasterListEmptyState>{isLoading ? "Loading tags." : "No tags found."}</MasterListEmptyState> : null}
      </MasterListTableCard>
      <MasterListPaginationCard page={page} rowsPerPage={rowsPerPage} showingLabel={buildMasterListShowingLabel({ page, pageSize: rowsPerPage, totalCount: filtered.length })} singularLabel="tags" totalCount={filtered.length} totalPages={totalPages} onNextPage={() => setPage((p) => Math.min(totalPages, p + 1))} onPageChange={setPage} onPreviousPage={() => setPage((p) => Math.max(1, p - 1))} onRowsPerPageChange={(value) => { setRowsPerPage(value); setPage(1) }} />
    </MasterListPageFrame>
  )
}

function TagUpsertDialog({ disabled, draft: initialDraft, onClose, onSave }: { disabled: boolean; draft: Partial<BlogTag> | null; onClose(): void; onSave(input: Partial<BlogTag>): void }) {
  const [draft, setDraft] = useState(initialDraft ?? emptyTag())
  const [error, setError] = useState<string | null>(null)

  async function submit() {
    if (!draft.name?.trim()) { setError("Name is required."); return }
    await onSave(draft)
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-background/55 p-4 backdrop-blur-sm">
      <div className="w-[min(500px,calc(100vw-2rem))] rounded-md border border-border/70 bg-card shadow-xl">
        <div className="flex items-center justify-between border-b border-border/70 px-5 py-4">
          <h2 className="text-base font-semibold">{draft.uuid ? "Edit tag" : "New tag"}</h2>
          <Button size="icon" variant="ghost" onClick={onClose} type="button"><X className="size-4" /></Button>
        </div>
        <div className="grid max-h-[min(50vh,24rem)] gap-5 overflow-y-auto p-5">
          <div className="grid gap-2"><Label>Name *</Label><Input className="h-11 rounded-xl" value={draft.name ?? ""} onChange={(e) => setDraft((t) => ({ ...t, name: e.target.value }))} /></div>
          <div className="grid gap-2"><Label>Slug</Label><Input className="h-11 rounded-xl" value={draft.slug ?? ""} onChange={(e) => setDraft((t) => ({ ...t, slug: e.target.value }))} /></div>
          <label className="flex min-h-14 cursor-pointer items-center justify-between gap-4 rounded-xl border border-border/70 bg-muted/10 px-4 py-3">
            <span className="flex items-center gap-1.5 text-sm font-medium">{draft.is_active ? <CheckCircle2 className="size-3.5 text-emerald-600" /> : null}Active</span>
            <input type="checkbox" className="size-4 accent-primary" checked={Boolean(draft.is_active)} onChange={(e) => setDraft((t) => ({ ...t, is_active: e.target.checked }))} />
          </label>
        </div>
        {error ? <p className="px-5 pb-2 text-sm font-medium text-destructive">{error}</p> : null}
        <div className="flex flex-wrap items-center gap-3 border-t border-border/70 px-5 py-4">
          <Button disabled={disabled} onClick={() => void submit()} type="button" className="rounded-md"><Save className="size-4" />Save</Button>
          <Button onClick={onClose} type="button" variant="outline" className="rounded-md"><X className="size-4" />Cancel</Button>
        </div>
      </div>
    </div>
  )
}

function CommentsListView({ comments, isLoading, onApprove, onDelete, onEdit, onNew, onRefresh, posts }: {
  comments: BlogComment[]; isLoading: boolean; onApprove(c: BlogComment): void; onDelete(c: BlogComment): void; onEdit(c: BlogComment): void; onNew(): void; onRefresh(): void; posts: BlogPost[]
}) {
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [page, setPage] = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState(100)
  const filtered = useMemo(() => {
    let result = comments
    const q = search.trim().toLowerCase()
    if (q) result = result.filter((comment) => [comment.author_name, comment.author_email, comment.content, posts.find((post) => post.id === comment.post_id)?.title].some((value) => String(value ?? "").toLowerCase().includes(q)))
    if (statusFilter === "approved") result = result.filter((comment) => Boolean(comment.is_approved))
    if (statusFilter === "pending") result = result.filter((comment) => !Boolean(comment.is_approved))
    if (statusFilter === "review") result = result.filter((comment) => Boolean(comment.is_review))
    return result
  }, [comments, posts, search, statusFilter])
  const totalPages = Math.max(1, Math.ceil(filtered.length / rowsPerPage))
  const pageComments = filtered.slice((page - 1) * rowsPerPage, page * rowsPerPage)

  return (
    <MasterListPageFrame action={<div className="flex items-center gap-2"><Button disabled={isLoading} onClick={onRefresh} type="button" variant="outline" className="h-9 rounded-md"><RefreshCw className={cn("size-4", isLoading && "animate-spin")} />Refresh</Button><Button onClick={onNew} type="button" className="h-9 rounded-md"><Plus className="size-4" />New</Button></div>} description="Moderate blog comments and reviews." technicalName="page.blog.comments" title="Comments">
      <MasterListToolbarCard
        columns={[]}
        filterOptions={[{ id: "all", label: "All comments" }, { id: "pending", label: "Pending" }, { id: "approved", label: "Approved" }, { id: "review", label: "Review" }]}
        filterValue={statusFilter}
        onFilterValueChange={(value) => { setStatusFilter(value); setPage(1) }}
        onShowAllColumns={() => {}}
        searchPlaceholder="Search author, email, comment, or post..."
        searchValue={search}
        onSearchValueChange={(value) => { setSearch(value); setPage(1) }}
      />
      <MasterListTableCard>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[850px] border-collapse text-sm">
            <thead className="bg-muted/50">
              <tr>
                <ListHeader>#</ListHeader>
                <ListHeader>Author</ListHeader>
                <ListHeader>Comment</ListHeader>
                <ListHeader>Status</ListHeader>
                <ListHeader>Post</ListHeader>
                <ListHeader className="text-right">Action</ListHeader>
              </tr>
            </thead>
            <tbody>
              {pageComments.map((comment, i) => {
                const post = posts.find((p) => p.id === comment.post_id)
                return (
                  <tr className="border-b border-border/70" key={comment.uuid}>
                    <td className="px-4 py-2 text-muted-foreground">{(page - 1) * rowsPerPage + i + 1}</td>
                    <td className="px-4 py-2">
                      <div className="font-medium">{comment.author_name}</div>
                      <div className="text-xs text-muted-foreground">{comment.author_email}</div>
                    </td>
                    <td className="max-w-xs truncate px-4 py-2 text-muted-foreground">{comment.content}</td>
                    <td className="px-4 py-2">
                      {comment.is_approved ? (
                        <Badge variant="outline" className="rounded-md border-emerald-200 bg-emerald-50 text-emerald-700">Approved</Badge>
                      ) : (
                        <Badge variant="outline" className="rounded-md border-amber-200 bg-amber-50 text-amber-700">Pending</Badge>
                      )}
                      {comment.is_review ? <Badge variant="outline" className="ml-1 rounded-md border-sky-200 bg-sky-50 text-sky-700">Review</Badge> : null}
                    </td>
                    <td className="max-w-[180px] truncate px-4 py-2 text-muted-foreground">{post?.title || `Post #${comment.post_id}`}</td>
                    <td className="px-4 py-1.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {!comment.is_approved ? (
                          <Button className="size-8 rounded-md" size="icon" variant="ghost" type="button" onClick={() => onApprove(comment)} title="Approve">
                            <CheckCircle2 className="size-4 text-emerald-600" />
                          </Button>
                        ) : null}
                        <MasterListRowActions title={`${comment.author_name}'s comment`} deleteLabel="Delete" onDelete={() => onDelete(comment)} onEdit={() => onEdit(comment)} />
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {!pageComments.length ? <MasterListEmptyState>{isLoading ? "Loading comments." : "No comments found."}</MasterListEmptyState> : null}
      </MasterListTableCard>
      <MasterListPaginationCard page={page} rowsPerPage={rowsPerPage} showingLabel={buildMasterListShowingLabel({ page, pageSize: rowsPerPage, totalCount: filtered.length })} singularLabel="comments" totalCount={filtered.length} totalPages={totalPages} onNextPage={() => setPage((p) => Math.min(totalPages, p + 1))} onPageChange={setPage} onPreviousPage={() => setPage((p) => Math.max(1, p - 1))} onRowsPerPageChange={(value) => { setRowsPerPage(value); setPage(1) }} />
    </MasterListPageFrame>
  )
}

function CommentUpsertDialog({ disabled, draft: initialDraft, onClose, onSave, posts }: { disabled: boolean; draft: Partial<BlogComment>; onClose(): void; onSave(input: Partial<BlogComment>): void; posts: BlogPost[] }) {
  const [draft, setDraft] = useState(initialDraft)

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-background/55 p-4 backdrop-blur-sm">
      <div className="w-[min(600px,calc(100vw-2rem))] rounded-md border border-border/70 bg-card shadow-xl">
        <div className="flex items-center justify-between border-b border-border/70 px-5 py-4">
          <h2 className="text-base font-semibold">{draft.uuid ? "Edit comment" : "New comment"}</h2>
          <Button size="icon" variant="ghost" onClick={onClose} type="button"><X className="size-4" /></Button>
        </div>
        <div className="grid max-h-[min(60vh,30rem)] gap-5 overflow-y-auto p-5">
          <div className="grid gap-2">
            <Label>Post *</Label>
            <select className="h-11 rounded-xl border border-input bg-background px-3 text-sm shadow-sm" value={String(draft.post_id ?? "")} onChange={(e) => setDraft((c) => ({ ...c, post_id: Number(e.target.value || 0) }))}>
              <option value="">Select post</option>
              {posts.map((post) => <option key={post.id} value={String(post.id)}>{post.title}</option>)}
            </select>
          </div>
          <div className="grid gap-2"><Label>Author name</Label><Input className="h-11 rounded-xl" value={draft.author_name ?? ""} onChange={(e) => setDraft((c) => ({ ...c, author_name: e.target.value }))} /></div>
          <div className="grid gap-2"><Label>Author email</Label><Input className="h-11 rounded-xl" value={draft.author_email ?? ""} onChange={(e) => setDraft((c) => ({ ...c, author_email: e.target.value }))} /></div>
          <div className="grid gap-2"><Label>Content</Label><textarea className="min-h-20 rounded-xl border border-input bg-background px-3 py-2 text-sm shadow-sm" value={draft.content ?? ""} onChange={(e) => setDraft((c) => ({ ...c, content: e.target.value }))} /></div>
        </div>
        <div className="flex flex-wrap items-center gap-3 border-t border-border/70 px-5 py-4">
          <Button disabled={disabled || !draft.post_id || !draft.content?.trim()} onClick={() => onSave(draft)} type="button" className="rounded-md"><Save className="size-4" />Save</Button>
          <Button onClick={onClose} type="button" variant="outline" className="rounded-md"><X className="size-4" />Cancel</Button>
        </div>
      </div>
    </div>
  )
}

function ImagesListView({ images, isLoading, onDelete, onEdit, onNew, onRefresh, posts }: { images: BlogImage[]; isLoading: boolean; onDelete(image: BlogImage): void; onEdit(image: BlogImage): void; onNew(): void; onRefresh(): void; posts: BlogPost[] }) {
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState(100)
  const filtered = images.filter((image) => [image.filename, image.original_name, image.url, image.alt_text, posts.find((post) => post.id === image.post_id)?.title].some((value) => String(value ?? "").toLowerCase().includes(search.trim().toLowerCase())))
  const totalPages = Math.max(1, Math.ceil(filtered.length / rowsPerPage))
  const pageImages = filtered.slice((page - 1) * rowsPerPage, page * rowsPerPage)

  return (
    <MasterListPageFrame action={<div className="flex items-center gap-2"><Button disabled={isLoading} onClick={onRefresh} type="button" variant="outline" className="h-9 rounded-md"><RefreshCw className={cn("size-4", isLoading && "animate-spin")} />Refresh</Button><Button onClick={onNew} type="button" className="h-9 rounded-md"><Plus className="size-4" />New</Button></div>} description="Manage images attached to blog posts." technicalName="page.blog.images" title="Images">
      <MasterListToolbarCard columns={[]} searchPlaceholder="Search filename, URL, alt text, or post..." searchValue={search} onSearchValueChange={(value) => { setSearch(value); setPage(1) }} onShowAllColumns={() => {}} />
      <MasterListTableCard>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[850px] border-collapse text-sm">
            <thead className="bg-muted/50">
              <tr><ListHeader>#</ListHeader><ListHeader>Filename</ListHeader><ListHeader>Post</ListHeader><ListHeader>URL</ListHeader><ListHeader>Featured</ListHeader><ListHeader className="text-right">Action</ListHeader></tr>
            </thead>
            <tbody>
              {pageImages.map((image, i) => {
                const post = posts.find((p) => p.id === image.post_id)
                return (
                  <tr key={image.uuid} className="border-b border-border/70">
                    <td className="px-4 py-2 text-muted-foreground">{(page - 1) * rowsPerPage + i + 1}</td>
                    <td className="px-4 py-2 font-medium">{image.filename}</td>
                    <td className="max-w-[180px] truncate px-4 py-2 text-muted-foreground">{post?.title ?? (image.post_id ? `Post #${image.post_id}` : "Unassigned")}</td>
                    <td className="max-w-[260px] truncate px-4 py-2 text-muted-foreground">{image.url}</td>
                    <td className="px-4 py-2">{image.is_featured ? <Badge variant="outline" className="rounded-md border-emerald-200 bg-emerald-50 text-emerald-700">featured</Badge> : "-"}</td>
                    <td className="px-4 py-1.5 text-right"><MasterListRowActions title={image.filename} onDelete={() => onDelete(image)} onEdit={() => onEdit(image)} /></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {!pageImages.length ? <MasterListEmptyState>{isLoading ? "Loading images." : "No images found."}</MasterListEmptyState> : null}
      </MasterListTableCard>
      <MasterListPaginationCard page={page} rowsPerPage={rowsPerPage} showingLabel={buildMasterListShowingLabel({ page, pageSize: rowsPerPage, totalCount: filtered.length })} singularLabel="images" totalCount={filtered.length} totalPages={totalPages} onNextPage={() => setPage((p) => Math.min(totalPages, p + 1))} onPageChange={setPage} onPreviousPage={() => setPage((p) => Math.max(1, p - 1))} onRowsPerPageChange={(value) => { setRowsPerPage(value); setPage(1) }} />
    </MasterListPageFrame>
  )
}

function ImageUpsertDialog({ disabled, draft: initialDraft, onClose, onSave, posts }: { disabled: boolean; draft: Partial<BlogImage>; onClose(): void; onSave(input: Partial<BlogImage>): void; posts: BlogPost[] }) {
  const [draft, setDraft] = useState(initialDraft)

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-background/55 p-4 backdrop-blur-sm">
      <div className="w-[min(600px,calc(100vw-2rem))] rounded-md border border-border/70 bg-card shadow-xl">
        <div className="flex items-center justify-between border-b border-border/70 px-5 py-4">
          <h2 className="text-base font-semibold">{draft.uuid ? "Edit image" : "New image"}</h2>
          <Button size="icon" variant="ghost" onClick={onClose} type="button"><X className="size-4" /></Button>
        </div>
        <div className="grid max-h-[min(60vh,30rem)] gap-5 overflow-y-auto p-5">
          <div className="grid gap-2">
            <Label>Post *</Label>
            <select className="h-11 rounded-xl border border-input bg-background px-3 text-sm shadow-sm" value={String(draft.post_id ?? "")} onChange={(e) => setDraft((i) => ({ ...i, post_id: e.target.value ? Number(e.target.value) : null }))}>
              <option value="">Select post</option>
              {posts.map((post) => <option key={post.id} value={String(post.id)}>{post.title}</option>)}
            </select>
          </div>
          <div className="grid gap-2"><Label>Filename</Label><Input className="h-11 rounded-xl" value={draft.filename ?? ""} onChange={(e) => setDraft((i) => ({ ...i, filename: e.target.value }))} /></div>
          <div className="grid gap-2"><Label>URL</Label><Input className="h-11 rounded-xl" value={draft.url ?? ""} onChange={(e) => setDraft((i) => ({ ...i, url: e.target.value }))} /></div>
          <div className="grid gap-2"><Label>Alt text</Label><Input className="h-11 rounded-xl" value={draft.alt_text ?? ""} onChange={(e) => setDraft((i) => ({ ...i, alt_text: e.target.value }))} /></div>
        </div>
        <div className="flex flex-wrap items-center gap-3 border-t border-border/70 px-5 py-4">
          <Button disabled={disabled || !draft.post_id || !draft.filename?.trim()} onClick={() => onSave(draft)} type="button" className="rounded-md"><Save className="size-4" />Save</Button>
          <Button onClick={onClose} type="button" variant="outline" className="rounded-md"><X className="size-4" />Cancel</Button>
        </div>
      </div>
    </div>
  )
}

function PostStatusBadge({ status }: { status: BlogPost["status"] }) {
  const map: Record<BlogPost["status"], { className: string; label: string }> = {
    draft: { className: "border-amber-200 bg-amber-50 text-amber-700", label: "Draft" },
    published: { className: "border-emerald-200 bg-emerald-50 text-emerald-700", label: "Published" },
    archived: { className: "border-slate-200 bg-slate-50 text-slate-700", label: "Archived" },
  }
  const s = map[status]
  return <Badge variant="outline" className={`rounded-md ${s.className}`}>{s.label}</Badge>
}

function ListHeader({ children, className }: { children: React.ReactNode; className?: string }) {
  return <th className={cn("border-b border-border/70 px-4 py-3.5 text-left font-medium text-foreground", className)}>{children}</th>
}
