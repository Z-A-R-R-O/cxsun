import { Badge } from "src/components/ui/badge"
import { Card, CardContent } from "src/components/ui/card"
import { MasterListEmptyState, MasterListRowActions } from "src/components/blocks/lists/master-list"
import type { BlogCategory, BlogPost } from "./blog-client"
import { cn } from "src/lib/utils"

export function BlogPostsView({
  categories, isLoading, onDelete, onEdit, posts,
}: {
  categories: BlogCategory[]
  isLoading: boolean
  onDelete(post: BlogPost): void
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
                <Header className="w-12">#</Header>
                <Header>Title</Header>
                <Header className="hidden md:table-cell">Category</Header>
                <Header className="hidden sm:table-cell">Status</Header>
                <Header className="hidden lg:table-cell">Author</Header>
                <Header className="hidden lg:table-cell">Views</Header>
                <Header className="w-20 text-right">Action</Header>
              </tr>
            </thead>
            <tbody>
              {posts.map((post, i) => {
                const cat = categories.find((c) => c.id === post.category_id)
                return (
                  <tr className="border-b last:border-b-0" key={post.uuid}>
                    <td className="px-3 py-3 text-muted-foreground">{i + 1}.</td>
                    <td className="px-3 py-3">
                      <div className="font-medium">{post.title}</div>
                      <div className="mt-0.5 text-xs text-muted-foreground line-clamp-1">{post.excerpt || post.slug}</div>
                    </td>
                    <td className="hidden px-3 py-3 md:table-cell">{cat?.name ?? <span className="text-muted-foreground">Uncategorized</span>}</td>
                    <td className="hidden px-3 py-3 sm:table-cell"><StatusBadge status={post.status} /></td>
                    <td className="hidden px-3 py-3 lg:table-cell text-xs text-muted-foreground">{post.author_email || "System"}</td>
                    <td className="hidden px-3 py-3 lg:table-cell">{post.view_count}</td>
                    <td className="px-3 py-3 text-right"><MasterListRowActions title={post.title} deleteLabel="Delete" onDelete={() => onDelete(post)} onEdit={() => onEdit(post)} /></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {!posts.length ? <MasterListEmptyState>{isLoading ? "Loading posts." : "No posts found."}</MasterListEmptyState> : null}
      </CardContent>
    </Card>
  )
}

export function StatusBadge({ status }: { status: string }) {
  const done = status === "published"
  const bad = status === "archived"
  return (
    <Badge variant="outline" className={cn(
      "rounded-md capitalize",
      done && "border-emerald-200 bg-emerald-50 text-emerald-700",
      bad && "border-red-200 bg-red-50 text-red-700",
    )}>
      {status}
    </Badge>
  )
}

function Header({ children, className }: { children: React.ReactNode; className?: string }) {
  return <th className={cn("px-3 py-2 text-left text-sm font-medium", className)}>{children}</th>
}
