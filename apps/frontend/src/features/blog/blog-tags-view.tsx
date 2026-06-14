import { Plus } from "lucide-react"
import { Button } from "src/components/ui/button"
import { Card, CardContent } from "src/components/ui/card"
import { MasterListEmptyState, MasterListRowActions } from "src/components/blocks/lists/master-list"
import type { BlogTag } from "./blog-client"

export function BlogTagsView({
  isLoading, onDelete, onEdit, onNew, tags,
}: {
  isLoading: boolean
  onDelete(tag: BlogTag): void
  onEdit(tag: BlogTag): void
  onNew(): void
  tags: BlogTag[]
}) {
  return (
    <div>
      <div className="mb-3">
        <Button className="rounded-md" type="button" onClick={onNew}><Plus className="size-4" />New Tag</Button>
      </div>
      <Card className="rounded-md">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/45">
                <tr>
                  <th className="w-12 px-3 py-2 text-left text-sm font-medium">#</th>
                  <th className="px-3 py-2 text-left text-sm font-medium">Name</th>
                  <th className="hidden px-3 py-2 text-left text-sm font-medium md:table-cell">Slug</th>
                  <th className="hidden px-3 py-2 text-left text-sm font-medium sm:table-cell">Posts</th>
                  <th className="w-20 px-3 py-2 text-right text-sm font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {tags.map((tag, i) => (
                  <tr className="border-b last:border-b-0" key={tag.uuid}>
                    <td className="px-3 py-3 text-muted-foreground">{i + 1}.</td>
                    <td className="px-3 py-3 font-medium">{tag.name}</td>
                    <td className="hidden px-3 py-3 text-xs text-muted-foreground md:table-cell">{tag.slug}</td>
                    <td className="hidden px-3 py-3 sm:table-cell">{tag.post_count ?? 0}</td>
                    <td className="px-3 py-3 text-right"><MasterListRowActions title={tag.name} deleteLabel="Delete" onDelete={() => onDelete(tag)} onEdit={() => onEdit(tag)} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!tags.length ? <MasterListEmptyState>{isLoading ? "Loading tags." : "No tags found."}</MasterListEmptyState> : null}
        </CardContent>
      </Card>
    </div>
  )
}
