import { Image } from "lucide-react"
import { Card, CardContent } from "src/components/ui/card"
import { MasterListEmptyState, MasterListRowActions } from "src/components/blocks/lists/master-list"
import type { BlogImage, BlogPost } from "./blog-client"

export function BlogImagesView({
  isLoading, onDelete, onEdit, posts,
}: {
  isLoading: boolean
  onDelete(image: BlogImage): void
  onEdit(image: BlogImage): void
  posts: BlogPost[]
}) {
  return (
    <Card className="rounded-md">
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/45">
              <tr>
                <th className="w-12 px-3 py-2 text-left text-sm font-medium">#</th>
                <th className="px-3 py-2 text-left text-sm font-medium">File</th>
                <th className="hidden px-3 py-2 text-left text-sm font-medium md:table-cell">Type</th>
                <th className="hidden px-3 py-2 text-left text-sm font-medium sm:table-cell">Size</th>
                <th className="hidden px-3 py-2 text-left text-sm font-medium lg:table-cell">Post</th>
                <th className="w-20 px-3 py-2 text-right text-sm font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {posts.filter((p) => p.featured_image).map((post, i) => (
                <tr className="border-b last:border-b-0" key={post.uuid}>
                  <td className="px-3 py-3 text-muted-foreground">{i + 1}.</td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2">
                      <Image className="size-4 shrink-0 text-muted-foreground" />
                      <span className="font-medium">{post.featured_image?.split("/").pop() || "Image"}</span>
                    </div>
                  </td>
                  <td className="hidden px-3 py-3 md:table-cell text-xs text-muted-foreground">image/*</td>
                  <td className="hidden px-3 py-3 sm:table-cell text-xs text-muted-foreground">-</td>
                  <td className="hidden px-3 py-3 lg:table-cell text-xs text-muted-foreground truncate max-w-[150px]">{post.title}</td>
                  <td className="px-3 py-3 text-right">
                    <MasterListRowActions title="Image" deleteLabel="Manage" onDelete={() => { const image: BlogImage = { id: post.id, uuid: post.uuid, tenant_id: post.tenant_id, post_id: post.id, filename: post.featured_image ?? "image", original_name: post.featured_image ?? "image", mime_type: "image/*", size_bytes: 0, url: post.featured_image ?? "", alt_text: "", caption: "", sort_order: 0, is_featured: 1, created_by: post.created_by, created_at: post.created_at, deleted_at: null }; onDelete(image) }} onEdit={() => { const image: BlogImage = { id: post.id, uuid: post.uuid, tenant_id: post.tenant_id, post_id: post.id, filename: post.featured_image ?? "image", original_name: post.featured_image ?? "image", mime_type: "image/*", size_bytes: 0, url: post.featured_image ?? "", alt_text: "", caption: "", sort_order: 0, is_featured: 1, created_by: post.created_by, created_at: post.created_at, deleted_at: null }; onEdit(image) }} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!posts.filter((p) => p.featured_image).length ? <MasterListEmptyState>{isLoading ? "Loading images." : "No images found."}</MasterListEmptyState> : null}
      </CardContent>
    </Card>
  )
}
