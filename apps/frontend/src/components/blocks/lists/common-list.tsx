import type { ChangeEvent, ReactNode } from "react"
import { Check, ChevronLeft, ChevronRight, Columns3, Filter, Search } from "lucide-react"

import { Button } from "src/components/ui/button"
import { Card, CardContent } from "src/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "src/components/ui/dropdown-menu"
import { Input } from "src/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "src/components/ui/select"
import { cn } from "src/lib/utils"

export interface CommonListFilterOption {
  id: string
  label: string
}

export interface CommonListColumnOption {
  id: string
  label: string
  checked: boolean
  disabled?: boolean
  onCheckedChange(checked: boolean): void
}

interface CommonListPageFrameProps {
  title: string
  description: string
  action?: ReactNode
  children: ReactNode
  technicalName?: string
  className?: string
}

interface CommonListToolbarCardProps {
  searchValue: string
  onSearchValueChange(nextValue: string): void
  searchPlaceholder: string
  filterValue?: string
  filterOptions?: readonly CommonListFilterOption[]
  onFilterValueChange?(nextValue: string): void
  columns?: readonly CommonListColumnOption[]
  onShowAllColumns?(): void
  toolbarAction?: ReactNode
  className?: string
}

interface CommonListPaginationCardProps {
  singularLabel: string
  totalCount: number
  showingLabel: string
  page: number
  totalPages: number
  rowsPerPage: number
  rowsPerPageOptions?: readonly number[]
  onRowsPerPageChange?(nextValue: number): void
  onPreviousPage?(): void
  onNextPage?(): void
  onPageChange?(nextPage: number): void
  className?: string
}

export function CommonListPageFrame({
  action,
  children,
  className,
  description,
  technicalName,
  title,
}: CommonListPageFrameProps) {
  return (
    <section
      data-technical-name={technicalName}
      className={cn("mx-auto w-[94%] space-y-5 py-4 sm:w-[92%] lg:w-[90%] lg:py-5", className)}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-normal text-foreground/80">{title}</h1>
          <p className="mt-0.5 text-sm text-muted-foreground/70">{description}</p>
        </div>
        {action ? <div className="flex shrink-0 items-center">{action}</div> : null}
      </div>
      {children}
    </section>
  )
}

export function CommonListToolbarCard({
  className,
  columns,
  filterOptions,
  filterValue,
  onFilterValueChange,
  onSearchValueChange,
  onShowAllColumns,
  searchPlaceholder,
  searchValue,
  toolbarAction,
}: CommonListToolbarCardProps) {
  return (
    <Card className={cn("rounded-md border-border/70 bg-card/95 py-0 shadow-sm", className)}>
      <CardContent className="flex flex-col gap-2 p-2 sm:p-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative max-w-xl flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="h-8 rounded-md border-border/80 bg-background/95 pl-9 text-sm shadow-none"
            placeholder={searchPlaceholder}
            value={searchValue}
            onChange={createSearchHandler(onSearchValueChange)}
          />
        </div>
        <div className="flex shrink-0 items-center gap-2.5 self-end lg:self-auto">
          {toolbarAction}
          {filterOptions && filterOptions.length > 0 && filterValue && onFilterValueChange ? (
            <ListFilterMenu
              filterOptions={filterOptions}
              filterValue={filterValue}
              onFilterValueChange={onFilterValueChange}
            />
          ) : null}
          {columns && columns.length > 0 ? (
            <ListColumnMenu columns={columns} onShowAllColumns={onShowAllColumns} />
          ) : null}
        </div>
      </CardContent>
    </Card>
  )
}

export function CommonListTableCard({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <Card
      className={cn("overflow-hidden rounded-md border-border/70 bg-card/95 py-0 shadow-sm", className)}
    >
      {children}
    </Card>
  )
}

export function CommonListPaginationCard({
  className,
  onPageChange,
  onNextPage,
  onPreviousPage,
  onRowsPerPageChange,
  page,
  rowsPerPage,
  rowsPerPageOptions = [10, 20, 50, 100, 200, 500],
  showingLabel,
  singularLabel,
  totalCount,
  totalPages,
}: CommonListPaginationCardProps) {
  const pageItems = buildPaginationItems(page, totalPages)

  return (
    <Card className={cn("rounded-md border-border/70 bg-card/95 shadow-sm", className)}>
      <CardContent className="flex flex-col gap-2.5 px-4 py-1.5 text-sm text-muted-foreground lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <span>
            Total {singularLabel}: <span className="font-semibold text-foreground">{totalCount}</span>
          </span>
          <div className="flex items-center gap-2">
            <span>Rows per page</span>
            <Select
              value={String(rowsPerPage)}
              onValueChange={(nextValue) => onRowsPerPageChange?.(Number.parseInt(nextValue, 10))}
            >
              <SelectTrigger className="h-8 min-w-20 rounded-md border-border/80 bg-background text-sm shadow-none">
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="start" className="min-w-20 rounded-md">
                {rowsPerPageOptions.map((option) => (
                  <SelectItem key={option} value={String(option)}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2.5">
          <span>{showingLabel}</span>
          <div className="flex items-center gap-1">
            <Button
              className="h-8 rounded-md px-2 text-muted-foreground"
              disabled={page <= 1}
              onClick={onPreviousPage}
              size="sm"
              type="button"
              variant="ghost"
            >
              <ChevronLeft className="size-4" />
              Previous
            </Button>
            <div className="flex items-center gap-1">
              {pageItems.map((item, index) =>
                item === "ellipsis" ? (
                  <span key={`ellipsis-${index}`} className="px-1.5 text-sm text-muted-foreground">
                    ...
                  </span>
                ) : (
                  <Button
                    key={item}
                    className={cn(
                      "h-8 min-w-8 rounded-md px-0",
                      item === page
                        ? "bg-primary text-primary-foreground hover:bg-primary/95"
                        : "text-muted-foreground",
                    )}
                    onClick={() => onPageChange?.(item)}
                    size="sm"
                    type="button"
                    variant={item === page ? "default" : "ghost"}
                  >
                    {item}
                  </Button>
                ),
              )}
            </div>
            <Button
              className="h-8 rounded-md px-2 text-muted-foreground"
              disabled={page >= totalPages}
              onClick={onNextPage}
              size="sm"
              type="button"
              variant="ghost"
            >
              Next
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function CommonListEmptyState({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return <div className={cn("px-6 py-14 text-center text-sm text-muted-foreground", className)}>{children}</div>
}

export function CommonListFormCard({
  children,
  className,
  description,
  title,
}: {
  children: ReactNode
  className?: string
  description?: string
  title?: string
}) {
  return (
    <Card className={cn("rounded-md border-border/70 bg-card/95 shadow-sm", className)}>
      {title || description ? (
        <div className="border-b border-border/70 px-5 py-4">
          {title ? <h2 className="text-base font-medium text-foreground">{title}</h2> : null}
          {description ? (
            <p className={cn("text-sm text-muted-foreground", title && "mt-1")}>{description}</p>
          ) : null}
        </div>
      ) : null}
      <div className="p-5">{children}</div>
    </Card>
  )
}

export function buildCommonListShowingLabel({
  page,
  pageSize,
  totalCount,
}: {
  page: number
  pageSize: number
  totalCount: number
}) {
  if (totalCount === 0) {
    return "Showing 0 to 0 of 0"
  }

  const from = (page - 1) * pageSize + 1
  const to = Math.min(totalCount, page * pageSize)

  return `Showing ${from} to ${to} of ${totalCount}`
}

function ListFilterMenu({
  filterOptions,
  filterValue,
  onFilterValueChange,
}: {
  filterOptions: readonly CommonListFilterOption[]
  filterValue: string
  onFilterValueChange(nextValue: string): void
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          className="h-8 rounded-md border-border/80 bg-background/95 px-3 text-sm shadow-none"
          type="button"
          variant="outline"
        >
          <Filter className="size-4" />
          Filters
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60 rounded-md p-0 shadow-lg">
        <div className="flex items-center justify-between px-4 py-3">
          <DropdownMenuLabel className="p-0 text-sm font-medium">Filter options</DropdownMenuLabel>
          <button
            className="cursor-pointer text-sm text-muted-foreground transition-colors hover:text-foreground"
            onClick={() => onFilterValueChange(filterOptions[0]?.id ?? filterValue)}
            type="button"
          >
            Clear
          </button>
        </div>
        <DropdownMenuSeparator />
        <div className="p-2">
          {filterOptions.map((option) => {
            const selected = filterValue === option.id

            return (
              <DropdownMenuItem
                key={option.id}
                className="gap-3 rounded-md px-3 py-2.5"
                onSelect={() => onFilterValueChange(option.id)}
              >
                <span className="flex size-4 items-center justify-center">
                  {selected ? <Check className="size-4" /> : null}
                </span>
                <span>{option.label}</span>
              </DropdownMenuItem>
            )
          })}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function ListColumnMenu({
  columns,
  onShowAllColumns,
}: {
  columns: readonly CommonListColumnOption[]
  onShowAllColumns?: () => void
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          className="h-8 rounded-md border-border/80 bg-background/95 px-3 text-sm shadow-none"
          type="button"
          variant="outline"
        >
          <Columns3 className="size-4" />
          Columns
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 rounded-md p-0 shadow-lg">
        <div className="flex items-center justify-between px-4 py-3">
          <DropdownMenuLabel className="p-0 text-sm font-medium">Visible columns</DropdownMenuLabel>
          {onShowAllColumns ? (
            <button
              className="cursor-pointer text-sm text-muted-foreground transition-colors hover:text-foreground"
              onClick={onShowAllColumns}
              type="button"
            >
              Show all
            </button>
          ) : null}
        </div>
        <DropdownMenuSeparator />
        <div className="p-2">
          {columns.map((column) => (
            <DropdownMenuCheckboxItem
              key={column.id}
              checked={column.checked}
              className="rounded-md py-2.5 pl-9 pr-3"
              disabled={column.disabled}
              onCheckedChange={(checked) => column.onCheckedChange(Boolean(checked))}
            >
              {column.label}
            </DropdownMenuCheckboxItem>
          ))}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function createSearchHandler(callback: (value: string) => void) {
  return (event: ChangeEvent<HTMLInputElement>) => callback(event.target.value)
}

function buildPaginationItems(currentPage: number, totalPages: number): Array<number | "ellipsis"> {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1)
  }

  if (currentPage <= 4) {
    return [1, 2, 3, 4, 5, "ellipsis", totalPages]
  }

  if (currentPage >= totalPages - 3) {
    return [1, "ellipsis", totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages]
  }

  return [1, "ellipsis", currentPage - 1, currentPage, currentPage + 1, "ellipsis", totalPages]
}

