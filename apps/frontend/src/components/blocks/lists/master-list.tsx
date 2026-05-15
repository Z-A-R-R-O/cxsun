import type { ReactNode } from "react"
import { Eye, MoreHorizontal, Pencil, RotateCcw, Trash2 } from "lucide-react"

import { Button } from "src/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "src/components/ui/dropdown-menu"
import {
  CommonListEmptyState,
  CommonListFormCard,
  CommonListPageFrame,
  CommonListPaginationCard,
  CommonListTableCard,
  CommonListToolbarCard,
  buildCommonListShowingLabel,
  type CommonListColumnOption,
  type CommonListFilterOption,
} from "./common-list"

export type MasterListColumnOption = CommonListColumnOption
export type MasterListFilterOption = CommonListFilterOption

export const MasterListPageFrame = CommonListPageFrame
export const MasterListToolbarCard = CommonListToolbarCard
export const MasterListTableCard = CommonListTableCard
export const MasterListPaginationCard = CommonListPaginationCard
export const MasterListEmptyState = CommonListEmptyState
export const MasterListShowCard = CommonListFormCard
export const MasterListUpsertCard = CommonListFormCard
export const buildMasterListShowingLabel = buildCommonListShowingLabel

export function MasterListShowLayout({ children }: { children: ReactNode }) {
  return <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">{children}</div>
}

export function MasterListUpsertLayout({ children }: { children: ReactNode }) {
  return <div className="grid gap-4">{children}</div>
}

export function MasterListRowActions({
  deleteLabel = "Suspend",
  isSuspended = false,
  onDelete,
  onEdit,
  onRestore,
  onView,
  restoreLabel = "Restore",
  title,
}: {
  deleteLabel?: string
  isSuspended?: boolean
  onDelete?: () => void
  onEdit?: () => void
  onRestore?: () => void
  onView?: () => void
  restoreLabel?: string
  title: string
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          aria-label={`${title} actions`}
          size="icon"
          type="button"
          variant="ghost"
          className="size-8 cursor-pointer rounded-md border border-border/70 bg-background/80 text-muted-foreground shadow-none transition-colors hover:bg-muted/70 hover:text-foreground"
        >
          <MoreHorizontal className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40 rounded-md border-border/70 bg-popover p-1 text-popover-foreground shadow-md">
        {onView ? (
          <DropdownMenuItem className="cursor-pointer gap-2 rounded-sm" onSelect={onView}>
            <Eye className="size-4" />
            View
          </DropdownMenuItem>
        ) : null}
        {onEdit ? (
          <>
            {onView ? <DropdownMenuSeparator /> : null}
            <DropdownMenuItem className="cursor-pointer gap-2 rounded-sm" onSelect={onEdit}>
              <Pencil className="size-4" />
              Edit
            </DropdownMenuItem>
          </>
        ) : null}
        {onDelete || onRestore ? (
          <>
            {onView || onEdit ? <DropdownMenuSeparator /> : null}
            {isSuspended && onRestore ? (
              <DropdownMenuItem className="cursor-pointer gap-2 rounded-sm" onSelect={onRestore}>
                <RotateCcw className="size-4" />
                {restoreLabel}
              </DropdownMenuItem>
            ) : onDelete ? (
              <DropdownMenuItem className="cursor-pointer gap-2 rounded-sm text-destructive focus:text-destructive" onSelect={onDelete}>
                <Trash2 className="size-4" />
                {deleteLabel}
              </DropdownMenuItem>
            ) : null}
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
