import { CheckCircle2 } from "lucide-react"
import { Badge } from "src/components/ui/badge"
import { Button } from "src/components/ui/button"
import { Card, CardContent } from "src/components/ui/card"
import { MasterListEmptyState, MasterListRowActions } from "src/components/blocks/lists/master-list"
import type { BlogComment, BlogPost } from "./blog-client"

export function BlogCommentsView({
  comments, isLoading, onApprove, onDelete, onEdit, posts,
}: {
  comments: BlogComment[]
  isLoading: boolean
  onApprove(comment: BlogComment): void
  onDelete(comment: BlogComment): void
  onEdit(comment: BlogComment): void
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
                <th className="px-3 py-2 text-left text-sm font-medium">Author</th>
                <th className="hidden px-3 py-2 text-left text-sm font-medium md:table-cell">Comment</th>
                <th className="hidden px-3 py-2 text-left text-sm font-medium sm:table-cell">Status</th>
                <th className="hidden px-3 py-2 text-left text-sm font-medium lg:table-cell">Post</th>
                <th className="w-28 px-3 py-2 text-right text-sm font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {comments.map((comment, i) => {
                const post = posts.find((p) => p.id === comment.post_id)
                return (
                  <tr className="border-b last:border-b-0" key={comment.uuid}>
                    <td className="px-3 py-3 text-muted-foreground">{i + 1}.</td>
                    <td className="px-3 py-3">
                      <div className="font-medium">{comment.author_name}</div>
                      <div className="text-xs text-muted-foreground">{comment.author_email}</div>
                    </td>
                    <td className="hidden max-w-xs truncate px-3 py-3 md:table-cell text-muted-foreground">{comment.content}</td>
                    <td className="hidden px-3 py-3 sm:table-cell">
                      {comment.is_approved ? (
                        <Badge variant="outline" className="rounded-md border-emerald-200 bg-emerald-50 text-emerald-700">Approved</Badge>
                      ) : (
                        <Badge variant="outline" className="rounded-md border-amber-200 bg-amber-50 text-amber-700">Pending</Badge>
                      )}
                    </td>
                    <td className="hidden px-3 py-3 lg:table-cell text-xs text-muted-foreground truncate max-w-[120px]">{post?.title || `Post #${comment.post_id}`}</td>
                    <td className="px-3 py-3 text-right">
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
        {!comments.length ? <MasterListEmptyState>{isLoading ? "Loading comments." : "No comments found."}</MasterListEmptyState> : null}
      </CardContent>
    </Card>
  )
}
