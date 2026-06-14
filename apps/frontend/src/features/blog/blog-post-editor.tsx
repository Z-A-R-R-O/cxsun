import { useState } from "react"
import { ArrowLeft, Save } from "lucide-react"
import { Button } from "src/components/ui/button"
import { Card, CardContent } from "src/components/ui/card"
import { Input } from "src/components/ui/input"
import { Label } from "src/components/ui/label"
import { Textarea } from "src/components/ui/textarea"
import { Switch } from "src/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "src/components/ui/select"
import type { AuthSession } from "src/features/auth/auth-client"
import type { BlogCategory, BlogPostDraft, BlogTag } from "./blog-client"

export function BlogPostEditor({
  categories, draft: initialDraft, isSaving, onBack, onSave, tags,
}: {
  categories: BlogCategory[]
  draft: BlogPostDraft
  isSaving: boolean
  onBack(): void
  onSave(input: BlogPostDraft): void
  session: AuthSession
  tags: BlogTag[]
}) {
  const [draft, setDraft] = useState(initialDraft)

  function set<T>(key: string, value: T) {
    setDraft((current) => ({ ...current, [key]: value }))
  }

  function setSeo(key: string, value: unknown) {
    setDraft((current) => ({ ...current, seo: { ...((current.seo || {}) as Record<string, unknown>), [key]: value } }) as typeof current)
  }

  function toggleTag(tagId: number) {
    const current = draft.tag_ids ?? []
    set("tag_ids", current.includes(tagId) ? current.filter((id) => id !== tagId) : [...current, tagId])
  }

  return (
    <div className="@container/main flex flex-1 flex-col gap-6 px-4 py-4 md:py-6 lg:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button className="rounded-md" size="icon" variant="ghost" type="button" onClick={onBack}><ArrowLeft className="size-5" /></Button>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{draft.uuid ? "Edit post" : "New post"}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{draft.uuid ? "Update post content, SEO, and metadata." : "Create a new blog post with rich content."}</p>
          </div>
        </div>
        <Button className="rounded-md" disabled={isSaving || !draft.title?.trim()} type="button" onClick={() => onSave(draft)}><Save className="size-4" />{isSaving ? "Saving..." : "Save"}</Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card className="rounded-md">
            <CardContent className="grid gap-4 p-4">
              <div className="grid gap-2">
                <Label>Title *</Label>
                <Input className="h-10 rounded-md" value={draft.title ?? ""} onChange={(e) => set("title", e.target.value)} placeholder="Enter post title" />
              </div>
              <div className="grid gap-2">
                <Label>Slug</Label>
                <Input className="h-10 rounded-md" value={draft.slug ?? ""} onChange={(e) => set("slug", e.target.value)} placeholder="auto-generated-from-title" />
              </div>
              <div className="grid gap-2">
                <Label>Excerpt</Label>
                <Textarea className="min-h-20 rounded-md" value={draft.excerpt ?? ""} onChange={(e) => set("excerpt", e.target.value)} placeholder="Brief description for card previews" />
              </div>
              <div className="grid gap-2">
                <Label>Content</Label>
                <Textarea className="min-h-[300px] rounded-md font-mono text-sm leading-relaxed" value={draft.content ?? ""} onChange={(e) => set("content", e.target.value)} placeholder="Write post content in Markdown or HTML..." />
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-md">
            <CardContent className="grid gap-4 p-4">
              <h3 className="font-semibold">SEO Settings</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label>Meta Title</Label>
                  <Input className="h-10 rounded-md" value={String((draft.seo as Record<string, unknown>)?.meta_title ?? "")} onChange={(e) => setSeo("meta_title", e.target.value)} />
                </div>
                <div className="grid gap-2">
                  <Label>Meta Description</Label>
                  <Input className="h-10 rounded-md" value={String((draft.seo as Record<string, unknown>)?.meta_description ?? "")} onChange={(e) => setSeo("meta_description", e.target.value)} />
                </div>
                <div className="grid gap-2">
                  <Label>Meta Keywords</Label>
                  <Input className="h-10 rounded-md" value={String((draft.seo as Record<string, unknown>)?.meta_keywords ?? "")} onChange={(e) => setSeo("meta_keywords", e.target.value)} placeholder="comma, separated, keywords" />
                </div>
                <div className="grid gap-2">
                  <Label>Canonical URL</Label>
                  <Input className="h-10 rounded-md" value={String((draft.seo as Record<string, unknown>)?.canonical_url ?? "")} onChange={(e) => setSeo("canonical_url", e.target.value)} />
                </div>
                <div className="grid gap-2">
                  <Label>OG Title</Label>
                  <Input className="h-10 rounded-md" value={String((draft.seo as Record<string, unknown>)?.og_title ?? "")} onChange={(e) => setSeo("og_title", e.target.value)} />
                </div>
                <div className="grid gap-2">
                  <Label>OG Description</Label>
                  <Input className="h-10 rounded-md" value={String((draft.seo as Record<string, unknown>)?.og_description ?? "")} onChange={(e) => setSeo("og_description", e.target.value)} />
                </div>
                <div className="grid gap-2">
                  <Label>OG Image URL</Label>
                  <Input className="h-10 rounded-md" value={String((draft.seo as Record<string, unknown>)?.og_image ?? "")} onChange={(e) => setSeo("og_image", e.target.value)} />
                </div>
                <div className="grid gap-2">
                  <Label>No Index</Label>
                  <div className="flex h-10 items-center">
                    <Switch checked={Boolean((draft.seo as Record<string, unknown>)?.no_index)} onCheckedChange={(v) => setSeo("no_index", v)} />
                    <span className="ml-2 text-sm text-muted-foreground">Prevent search engines from indexing</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="rounded-md">
            <CardContent className="grid gap-4 p-4">
              <h3 className="font-semibold">Publish Settings</h3>
              <div className="grid gap-2">
                <Label>Status</Label>
                <Select value={draft.status ?? "draft"} onValueChange={(v) => set("status", v)}>
                  <SelectTrigger className="h-10 rounded-md"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Category</Label>
                <Select value={String(draft.category_id ?? "")} onValueChange={(v) => set("category_id", v ? Number(v) : null)}>
                  <SelectTrigger className="h-10 rounded-md"><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Uncategorized</SelectItem>
                    {categories.map((cat) => <SelectItem key={cat.id} value={String(cat.id)}>{cat.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Featured Image URL</Label>
                <Input className="h-10 rounded-md" value={draft.featured_image ?? ""} onChange={(e) => set("featured_image", e.target.value)} placeholder="https://..." />
              </div>
              <div className="flex items-center justify-between">
                <Label>Featured post</Label>
                <Switch checked={Boolean(draft.is_featured)} onCheckedChange={(v) => set("is_featured", v)} />
              </div>
              <div className="flex items-center justify-between">
                <Label>Allow comments</Label>
                <Switch checked={draft.allow_comments !== false} onCheckedChange={(v) => set("allow_comments", v)} />
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-md">
            <CardContent className="grid gap-4 p-4">
              <h3 className="font-semibold">Tags</h3>
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => {
                  const active = draft.tag_ids?.includes(tag.id)
                  return (
                    <button
                      key={tag.id}
                      type="button"
                      className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
                        active ? "border-primary bg-primary/10 text-primary" : "border-border bg-background text-muted-foreground hover:border-primary/40"
                      }`}
                      onClick={() => toggleTag(tag.id)}
                    >
                      {tag.name}
                    </button>
                  )
                })}
                {!tags.length ? <p className="text-sm text-muted-foreground">No tags available. Create tags first.</p> : null}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
