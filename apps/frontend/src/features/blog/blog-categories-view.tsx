import { Plus } from "lucide-react"
import { Button } from "src/components/ui/button"
import { Card, CardContent } from "src/components/ui/card"
import { MasterListEmptyState, MasterListRowActions } from "src/components/blocks/lists/master-list"
import type { BlogCategory } from "./blog-client"

export function BlogCategoriesView({
  categories, isLoading, onDelete, onEdit, onNew,
}: {
  categories: BlogCategory[]
  isLoading: boolean
  onDelete(cat: BlogCategory): void
  onEdit(cat: BlogCategory): void
  onNew(): void
}) {
  return (
    <div>
      <div className="mb-3">
        <Button className="rounded-md" type="button" onClick={onNew}><Plus className="size-4" />New Category</Button>
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
                  <th className="hidden px-3 py-2 text-left text-sm font-medium lg:table-cell">Sort</th>
                  <th className="w-20 px-3 py-2 text-right text-sm font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((cat, i) => (
                  <tr className="border-b last:border-b-0" key={cat.uuid}>
                    <td className="px-3 py-3 text-muted-foreground">{i + 1}.</td>
                    <td className="px-3 py-3 font-medium">{cat.name}</td>
                    <td className="hidden px-3 py-3 text-xs text-muted-foreground md:table-cell">{cat.slug}</td>
                    <td className="hidden px-3 py-3 sm:table-cell">{cat.post_count ?? 0}</td>
                    <td className="hidden px-3 py-3 lg:table-cell">{cat.sort_order}</td>
                    <td className="px-3 py-3 text-right"><MasterListRowActions title={cat.name} deleteLabel="Delete" onDelete={() => onDelete(cat)} onEdit={() => onEdit(cat)} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!categories.length ? <MasterListEmptyState>{isLoading ? "Loading categories." : "No categories found."}</MasterListEmptyState> : null}
        </CardContent>
      </Card>
    </div>
  )
}
