import { useEffect, useMemo, useState, type ReactNode } from "react"
import { toast } from "sonner"
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Edit,
  MoreHorizontal,
  Plus,
  RefreshCw,
  RotateCcw,
  Trash2,
} from "lucide-react"

import {
  CommonListEmptyState,
  CommonListPageFrame,
  CommonListPaginationCard,
  CommonListTableCard,
  CommonListToolbarCard,
  buildCommonListShowingLabel,
} from "src/components/blocks/lists/common-list"
import { Badge } from "src/components/ui/badge"
import { Button } from "src/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "src/components/ui/dropdown-menu"
import { cn } from "src/lib/utils"
import {
  buildTenantColumnOptions,
  compareTenantRecords,
  filterTenants,
  formatTenantDate,
  listTenants,
  restoreTenant,
  softDeleteTenant,
  toTenantForm,
  toTenantUpsertInput,
  upsertTenant,
} from "../../application/tenant-service"
import {
  defaultTenantColumnVisibility,
  emptyTenantForm,
  tenantStatusFilters,
  type TenantColumnId,
  type TenantFormState,
  type TenantRecord,
  type TenantStatusFilter,
} from "../../domain/tenant"
import { TenantUpsertDialog } from "../components/tenant-upsert-dialog"

type TenantSortDirection = "asc" | "desc"
type DialogMode = "create" | "edit"

export function TenantListPage() {
  const [tenants, setTenants] = useState<readonly TenantRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [searchValue, setSearchValue] = useState("")
  const [statusFilter, setStatusFilter] = useState<TenantStatusFilter>("all")
  const [currentPage, setCurrentPage] = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState(20)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [dialog, setDialog] = useState<{ mode: DialogMode; record: TenantRecord | null } | null>(null)
  const [form, setForm] = useState<TenantFormState>(emptyTenantForm)
  const [sortState, setSortState] = useState<{
    key: TenantColumnId
    direction: TenantSortDirection
  }>({
    key: "name",
    direction: "asc",
  })
  const [visibleColumns, setVisibleColumns] = useState<Record<TenantColumnId, boolean>>(
    defaultTenantColumnVisibility,
  )

  const filteredTenants = useMemo(() => {
    const matchingTenants = filterTenants({
      tenants,
      searchValue,
      statusFilter,
    })

    return [...matchingTenants].sort((left, right) =>
      compareTenantRecords(left, right, sortState.key, sortState.direction),
    )
  }, [searchValue, sortState.direction, sortState.key, statusFilter, tenants])
  const totalPages = Math.max(1, Math.ceil(filteredTenants.length / rowsPerPage))
  const pageTenants = filteredTenants.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage,
  )
  const columnOptions = useMemo(
    () =>
      buildTenantColumnOptions({
        visibleColumns,
        onToggle: (columnId, checked) =>
          setVisibleColumns((current) => ({ ...current, [columnId]: checked })),
      }),
    [visibleColumns],
  )

  useEffect(() => {
    const controller = new AbortController()
    void loadTenantRecords(controller.signal)

    return () => controller.abort()
  }, [])

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages)
    }
  }, [currentPage, totalPages])

  async function loadTenantRecords(signal?: AbortSignal) {
    setIsLoading(true)
    setLoadError(null)

    try {
      const records = await listTenants({ signal })
      setTenants(records)
    } catch (error) {
      if (signal?.aborted) {
        return
      }

      setTenants([])
      setLoadError(error instanceof Error ? error.message : "Unable to load tenants.")
    } finally {
      if (!signal?.aborted) {
        setIsLoading(false)
      }
    }
  }

  function openCreate() {
    setForm(emptyTenantForm)
    setFormError(null)
    setDialog({ mode: "create", record: null })
  }

  function openEdit(tenant: TenantRecord) {
    setForm(toTenantForm(tenant))
    setFormError(null)
    setDialog({ mode: "edit", record: tenant })
  }

  async function saveTenant() {
    setIsSaving(true)
    setFormError(null)

    try {
      const tenant = await upsertTenant(toTenantUpsertInput(form))
      setDialog(null)
      toast.success(dialog?.mode === "edit" ? "Tenant updated" : "Tenant created", {
        description: `${tenant.name} is ready in the tenant list.`,
      })
      await loadTenantRecords()
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to save tenant."
      setFormError(message)
      toast.error("Tenant save failed", { description: message })
    } finally {
      setIsSaving(false)
    }
  }

  async function deleteTenant(tenant: TenantRecord) {
    try {
      await softDeleteTenant(tenant.id)
      toast.error("Tenant destroyed", {
        description: `${tenant.name} was soft deleted.`,
      })
      await loadTenantRecords()
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to delete tenant."
      toast.error("Tenant delete failed", { description: message })
    }
  }

  async function restoreDestroyedTenant(tenant: TenantRecord) {
    try {
      await restoreTenant(tenant.id)
      toast.success("Tenant restored", {
        description: `${tenant.name} is active in the tenant list again.`,
      })
      await loadTenantRecords()
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to restore tenant."
      toast.error("Tenant restore failed", { description: message })
    }
  }

  function setFormValue<K extends keyof TenantFormState>(key: K, value: TenantFormState[K]) {
    setForm((current) => {
      return { ...current, [key]: value }
    })
  }

  function showAllColumns() {
    setVisibleColumns(defaultTenantColumnVisibility)
  }

  function toggleSort(nextKey: TenantColumnId) {
    setSortState((current) => {
      if (current.key === nextKey) {
        return {
          key: nextKey,
          direction: current.direction === "asc" ? "desc" : "asc",
        }
      }

      return {
        key: nextKey,
        direction: "asc",
      }
    })
  }

  return (
    <CommonListPageFrame
      action={
        <div className="flex flex-wrap items-center gap-2">
          <Button
            className="h-11 rounded-md px-4"
            disabled={isLoading}
            onClick={() => void loadTenantRecords()}
            type="button"
            variant="outline"
          >
            <RefreshCw className={cn("size-4", isLoading && "animate-spin")} />
            Refresh
          </Button>
          <Button className="h-11 rounded-md px-4" onClick={openCreate} type="button">
            <Plus className="size-4" />
            New Tenant
          </Button>
        </div>
      }
      description="Create and review simple tenant records with numeric code, status, timestamps, and soft delete."
      technicalName="page.tenant.list"
      title="Tenants"
    >
      <CommonListToolbarCard
        columns={columnOptions}
        filterOptions={tenantStatusFilters}
        filterValue={statusFilter}
        onFilterValueChange={(nextValue) => {
          setStatusFilter(nextValue as TenantStatusFilter)
          setCurrentPage(1)
        }}
        onSearchValueChange={(nextValue) => {
          setSearchValue(nextValue)
          setCurrentPage(1)
        }}
        onShowAllColumns={showAllColumns}
        searchPlaceholder="Search tenant, code, or status"
        searchValue={searchValue}
      />

      {loadError ? <CommonListEmptyState>{loadError}</CommonListEmptyState> : null}

      <CommonListTableCard className="rounded-md">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-sm">
            <thead className="[&>tr]:bg-muted/55">
              <tr>
                <Header className="w-16">#</Header>
                {visibleColumns.name ? (
                  <SortableHeader
                    label="Tenant"
                    sortDirection={sortState.key === "name" ? sortState.direction : null}
                    onSort={() => toggleSort("name")}
                  />
                ) : null}
                {visibleColumns.code ? (
                  <SortableHeader
                    label="Code"
                    sortDirection={sortState.key === "code" ? sortState.direction : null}
                    onSort={() => toggleSort("code")}
                  />
                ) : null}
                {visibleColumns.updated ? (
                  <SortableHeader
                    label="Updated"
                    sortDirection={sortState.key === "updated" ? sortState.direction : null}
                    onSort={() => toggleSort("updated")}
                  />
                ) : null}
                {visibleColumns.status ? (
                  <SortableHeader
                    label="Status"
                    sortDirection={sortState.key === "status" ? sortState.direction : null}
                    onSort={() => toggleSort("status")}
                  />
                ) : null}
                <Header className="sticky right-0 z-10 bg-muted/95 text-right">Action</Header>
              </tr>
            </thead>
            <tbody>
              {pageTenants.map((tenant, index) => (
                <tr
                  key={tenant.id}
                  className={cn(
                    "border-b border-border/60 last:border-b-0 hover:bg-muted/20",
                    tenant.deletedAt && "bg-muted/20 text-muted-foreground",
                  )}
                >
                  <td className="px-4 py-2.5 text-muted-foreground">
                    {(currentPage - 1) * rowsPerPage + index + 1}
                  </td>
                  {visibleColumns.name ? (
                    <td className="px-4 py-2.5">
                      <button
                        className="cursor-pointer text-left font-medium text-foreground hover:underline"
                        onClick={() => openEdit(tenant)}
                        type="button"
                      >
                        {tenant.name}
                      </button>
                    </td>
                  ) : null}
                  {visibleColumns.code ? (
                    <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">
                      {tenant.code}
                    </td>
                  ) : null}
                  {visibleColumns.updated ? (
                    <td className="px-4 py-2.5 text-muted-foreground">
                      {formatTenantDate(tenant.updatedAt)}
                    </td>
                  ) : null}
                  {visibleColumns.status ? (
                    <td className="px-4 py-2.5">
                      <TenantStatusBadge status={tenant.status} />
                    </td>
                  ) : null}
                  <td className="sticky right-0 bg-card/95 px-4 py-2 text-right shadow-[-10px_0_18px_-18px_rgba(15,23,42,0.55)]">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          aria-label={`${tenant.name} actions`}
                          className="size-8 !rounded-full !border !border-border/80 bg-background shadow-none hover:bg-muted"
                          size="icon"
                          type="button"
                          variant="ghost"
                        >
                          <MoreHorizontal className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-36 rounded-md p-1.5">
                        {!tenant.deletedAt ? (
                          <>
                            <DropdownMenuItem
                              className="h-8 cursor-pointer gap-2 px-2"
                              onSelect={() => openEdit(tenant)}
                            >
                              <Edit className="size-4" />
                              Edit tenant
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="my-1" />
                          </>
                        ) : null}
                        {tenant.deletedAt ? (
                          <DropdownMenuItem
                            className="h-8 cursor-pointer gap-2 px-2"
                            onSelect={() => void restoreDestroyedTenant(tenant)}
                          >
                            <RotateCcw className="size-4" />
                            Restore
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem
                            className="h-8 cursor-pointer gap-2 px-2"
                            variant="destructive"
                            onSelect={() => void deleteTenant(tenant)}
                          >
                            <Trash2 className="size-4" />
                            Destroy
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {pageTenants.length === 0 ? (
          <CommonListEmptyState>
            {isLoading ? "Loading tenants from database." : "No tenants found."}
          </CommonListEmptyState>
        ) : null}
      </CommonListTableCard>

      <CommonListPaginationCard
        page={currentPage}
        rowsPerPage={rowsPerPage}
        showingLabel={buildCommonListShowingLabel({
          page: currentPage,
          pageSize: rowsPerPage,
          totalCount: filteredTenants.length,
        })}
        singularLabel="tenants"
        totalCount={filteredTenants.length}
        totalPages={totalPages}
        onNextPage={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
        onPageChange={setCurrentPage}
        onPreviousPage={() => setCurrentPage((page) => Math.max(1, page - 1))}
        onRowsPerPageChange={(nextValue) => {
          setRowsPerPage(nextValue)
          setCurrentPage(1)
        }}
      />

      <TenantUpsertDialog
        form={form}
        message={formError}
        onFormChange={setFormValue}
        onOpenChange={(open) => setDialog(open ? dialog : null)}
        onSave={() => void saveTenant()}
        open={Boolean(dialog)}
        saving={isSaving}
      />
    </CommonListPageFrame>
  )
}

function SortableHeader({
  label,
  onSort,
  sortDirection,
}: {
  label: string
  onSort: () => void
  sortDirection: TenantSortDirection | null
}) {
  return (
    <Header>
      <div className="flex items-center gap-2">
        <span>{label}</span>
        <button
          aria-label={`Sort ${label}`}
          className="inline-flex size-5 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          onClick={onSort}
          type="button"
        >
          {sortDirection === "asc" ? (
            <ArrowUp className="size-4" />
          ) : sortDirection === "desc" ? (
            <ArrowDown className="size-4" />
          ) : (
            <ArrowUpDown className="size-4" />
          )}
        </button>
      </div>
    </Header>
  )
}

function Header({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <th className={cn("border-b border-border/70 px-4 py-3 text-left font-medium text-foreground", className)}>
      {children}
    </th>
  )
}

function TenantStatusBadge({ status }: { status: TenantRecord["status"] }) {
  const active = status === "active"
  const suspended = status === "suspend"

  return (
    <Badge
      variant="outline"
      className={cn(
        "rounded-full",
        active && "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/70 dark:bg-emerald-950/30 dark:text-emerald-300",
        suspended && "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/70 dark:bg-amber-950/30 dark:text-amber-300",
        !active && !suspended && "border-border/80 bg-background text-muted-foreground",
      )}
    >
      {status === "not_active" ? "not active" : status}
    </Badge>
  )
}
