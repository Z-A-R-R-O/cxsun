import { Badge } from "src/components/ui/badge"
import { Card, CardContent } from "src/components/ui/card"
import { MasterListEmptyState, MasterListRowActions } from "src/components/blocks/lists/master-list"
import type { BlogPost } from "./blog-client"

export function BlogSeoView({
  isLoading, onEdit, posts,
}: {
  isLoading: boolean
  onEdit(post: BlogPost): void
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
                <th className="px-3 py-2 text-left text-sm font-medium">Post</th>
                <th className="hidden px-3 py-2 text-left text-sm font-medium md:table-cell">Meta Title</th>
                <th className="hidden px-3 py-2 text-left text-sm font-medium sm:table-cell">No Index</th>
                <th className="w-20 px-3 py-2 text-right text-sm font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {posts.map((post, i) => (
                <tr className="border-b last:border-b-0" key={post.uuid}>
                  <td className="px-3 py-3 text-muted-foreground">{i + 1}.</td>
                  <td className="px-3 py-3">
                    <div className="font-medium">{post.title}</div>
                    <div className="text-xs text-muted-foreground">{post.slug}</div>
                  </td>
                  <td className="hidden max-w-[200px] truncate px-3 py-3 md:table-cell text-xs text-muted-foreground">
                    {post.seo?.meta_title || <span className="italic">Not set</span>}
                  </td>
                  <td className="hidden px-3 py-3 sm:table-cell">
                    {post.seo?.no_index ? (
                      <Badge variant="outline" className="rounded-md border-amber-200 bg-amber-50 text-amber-700">Yes</Badge>
                    ) : (
                      <Badge variant="outline" className="rounded-md border-slate-200 bg-slate-50 text-slate-700">No</Badge>
                    )}
                  </td>
                  <td className="px-3 py-3 text-right"><MasterListRowActions title={post.title} deleteLabel="Edit SEO" onDelete={() => onEdit(post)} onEdit={() => onEdit(post)} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!posts.length ? <MasterListEmptyState>{isLoading ? "Loading posts." : "No posts found."}</MasterListEmptyState> : null}
      </CardContent>
    </Card>
  )
}
