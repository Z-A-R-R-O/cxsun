import { useEffect, useMemo, useState, type Dispatch, type ReactNode, type SetStateAction } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { ArrowLeft, CheckCircle2, Eye, MoreHorizontal, Pencil, Plus, RefreshCw, RotateCcw, Save, Trash2, X } from "lucide-react"
import { AnimatedTabs } from "src/components/ui/animated-tabs"
import { Badge } from "src/components/ui/badge"
import { Button } from "src/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "src/components/ui/dropdown-menu"
import { Input } from "src/components/ui/input"
import { Label } from "src/components/ui/label"
import { Separator } from "src/components/ui/separator"
import { Switch } from "src/components/ui/switch"
import {
  MasterListEmptyState,
  MasterListPageFrame,
  MasterListPaginationCard,
  MasterListShowCard,
  MasterListShowLayout,
  MasterListTableCard,
  MasterListToolbarCard,
  MasterListUpsertCard,
  MasterListUpsertLayout,
  buildMasterListShowingLabel,
} from "src/components/blocks/lists/master-list"
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
} from "../../domain/tenant"

type TenantSortDirection = "asc" | "desc"
type TenantUpsertState = { tenant: TenantRecord | null; returnTo: "list" | "show" }
type TenantTab = "identity" | "database" | "settings"

export function TenantListPage() {
  const queryClient = useQueryClient()
  const [selectedTenant, setSelectedTenant] = useState<TenantRecord | null>(null)
  const [upsertState, setUpsertState] = useState<TenantUpsertState | null>(null)
  const [searchValue, setSearchValue] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [currentPage, setCurrentPage] = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [visibleColumns, setVisibleColumns] = useState(defaultTenantColumnVisibility)
  const [sortState, setSortState] = useState<{ key: TenantColumnId; direction: TenantSortDirection }>({
    key: "updated",
    direction: "desc",
  })
  const tenantsQuery = useQuery({ queryKey: ["tenants"], queryFn: () => listTenants() })
  const upsertMutation = useMutation({ mutationFn: upsertTenant })
  const destroyMutation = useMutation({ mutationFn: (tenant: TenantRecord) => softDeleteTenant(tenant.id) })
  const restoreMutation = useMutation({ mutationFn: (tenant: TenantRecord) => restoreTenant(tenant.id) })
  const tenants = tenantsQuery.data ?? []
  const isLoading = tenantsQuery.isFetching

  useEffect(() => {
    if (tenantsQuery.error) {
      toast.error("Tenant load failed", {
        description: tenantsQuery.error instanceof Error ? tenantsQuery.error.message : "Unable to load tenants.",
      })
    }
  }, [tenantsQuery.error])

  useEffect(() => {
    setSelectedTenant((current) => tenants.find((tenant) => tenant.id === current?.id) ?? null)
  }, [tenants])

  const filteredTenants = useMemo(() => {
    return [...filterTenants({ tenants, searchValue, statusFilter: statusFilter as never })].sort((left, right) =>
      compareTenantRecords(left, right, sortState.key, sortState.direction),
    )
  }, [searchValue, sortState.direction, sortState.key, statusFilter, tenants])
  const totalPages = Math.max(1, Math.ceil(filteredTenants.length / rowsPerPage))
  const pageTenants = filteredTenants.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage)

  function toggleSort(nextKey: TenantColumnId) {
    setSortState((current) => ({
      key: nextKey,
      direction: current.key === nextKey && current.direction === "asc" ? "desc" : "asc",
    }))
  }

  async function saveTenant(input: TenantFormState) {
    const result = await upsertMutation.mutateAsync(toTenantUpsertInput(input))
    toast.success(input.id ? "Tenant updated" : "Tenant created", {
      description: `${result.name} is ready in the tenant list.`,
    })
    await queryClient.invalidateQueries({ queryKey: ["tenants"] })
    setUpsertState(null)
    setSelectedTenant(upsertState?.returnTo === "show" ? result : null)
  }

  async function destroy(tenant: TenantRecord) {
    try {
      await destroyMutation.mutateAsync(tenant)
      toast.error("Tenant suspended", {
        description: `${tenant.name} is hidden from active tenant selection until it is restored.`,
      })
      await queryClient.invalidateQueries({ queryKey: ["tenants"] })
    } catch (error) {
      toast.error("Tenant suspend failed", {
        description: error instanceof Error ? error.message : "Unable to suspend tenant.",
      })
    }
  }

  async function restore(tenant: TenantRecord) {
    try {
      await restoreMutation.mutateAsync(tenant)
      toast.success("Tenant restored", {
        description: `${tenant.name} is active again and ready for workspace access.`,
      })
      await queryClient.invalidateQueries({ queryKey: ["tenants"] })
    } catch (error) {
      toast.error("Tenant restore failed", {
        description: error instanceof Error ? error.message : "Unable to restore tenant.",
      })
    }
  }

  if (upsertState) {
    return (
      <TenantUpsertPage
        tenant={upsertState.tenant}
        onBack={() => setUpsertState(null)}
        onSubmit={saveTenant}
      />
    )
  }

  if (selectedTenant) {
    return (
      <TenantShowPage
        tenant={selectedTenant}
        onBack={() => setSelectedTenant(null)}
        onDestroy={() => void destroy(selectedTenant)}
        onEdit={() => setUpsertState({ tenant: selectedTenant, returnTo: "show" })}
        onRestore={() => void restore(selectedTenant)}
      />
    )
  }

  return (
    <MasterListPageFrame
      title="Tenants"
      description="Create and review tenant records with code, status, database context, and lifecycle controls."
      technicalName="page.tenant.list"
      action={
        <div className="flex items-center gap-2">
          <Button disabled={isLoading} onClick={() => void tenantsQuery.refetch()} type="button" variant="outline" className="h-9 rounded-md">
            <RefreshCw className={cn("size-4", isLoading && "animate-spin")} />
            Refresh
          </Button>
          <Button onClick={() => setUpsertState({ tenant: null, returnTo: "list" })} type="button" className="h-9 rounded-md">
            <Plus className="size-4" />
            New tenant
          </Button>
        </div>
      }
    >
      <MasterListToolbarCard
        columns={buildTenantColumnOptions({
          visibleColumns,
          onToggle: (columnId, checked) => setVisibleColumns((current) => ({ ...current, [columnId]: checked })),
        })}
        filterOptions={tenantStatusFilters}
        filterValue={statusFilter}
        onFilterValueChange={(nextValue) => {
          setStatusFilter(nextValue)
          setCurrentPage(1)
        }}
        onSearchValueChange={(value) => {
          setSearchValue(value)
          setCurrentPage(1)
        }}
        onShowAllColumns={() => setVisibleColumns(defaultTenantColumnVisibility)}
        searchPlaceholder="Search tenant, code, slug, database, company count, or status"
        searchValue={searchValue}
      />
      <MasterListTableCard>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] border-collapse text-sm">
            <thead className="bg-muted/50">
              <tr>
                <ListHeader>#</ListHeader>
                {visibleColumns.name ? <SortableHeader label="Tenant" column="name" sortState={sortState} onSort={toggleSort} /> : null}
                {visibleColumns.code ? <SortableHeader label="Code" column="code" sortState={sortState} onSort={toggleSort} /> : null}
                {visibleColumns.slug ? <SortableHeader label="Slug" column="slug" sortState={sortState} onSort={toggleSort} /> : null}
                {visibleColumns.database ? <SortableHeader label="Database" column="database" sortState={sortState} onSort={toggleSort} /> : null}
                {visibleColumns.companies ? <SortableHeader label="Companies" column="companies" sortState={sortState} onSort={toggleSort} /> : null}
                {visibleColumns.activeCompanies ? <SortableHeader label="Active" column="activeCompanies" sortState={sortState} onSort={toggleSort} /> : null}
                {visibleColumns.concepts ? <SortableHeader label="Concepts" column="concepts" sortState={sortState} onSort={toggleSort} /> : null}
                {visibleColumns.updated ? <SortableHeader label="Updated" column="updated" sortState={sortState} onSort={toggleSort} /> : null}
                {visibleColumns.status ? <SortableHeader label="Status" column="status" sortState={sortState} onSort={toggleSort} /> : null}
                <ListHeader className="text-right">Action</ListHeader>
              </tr>
            </thead>
            <tbody>
              {pageTenants.map((tenant, index) => (
                <tr key={tenant.id} className={cn("border-b border-border/70", tenant.deletedAt && "bg-muted/20 text-muted-foreground")}>
                  <td className="px-4 py-2 text-muted-foreground">{(currentPage - 1) * rowsPerPage + index + 1}</td>
                  {visibleColumns.name ? (
                    <td className="px-4 py-2">
                      <button className="cursor-pointer font-medium hover:underline" type="button" onClick={() => setSelectedTenant(tenant)}>
                        {tenant.name}
                      </button>
                    </td>
                  ) : null}
                  {visibleColumns.code ? <td className="px-4 py-2 font-mono text-xs text-muted-foreground">{tenant.code}</td> : null}
                  {visibleColumns.slug ? <td className="px-4 py-2 font-mono text-xs text-muted-foreground">{tenant.slug}</td> : null}
                  {visibleColumns.database ? <td className="px-4 py-2 font-mono text-xs text-muted-foreground">{tenant.dbName}</td> : null}
                  {visibleColumns.companies ? <td className="px-4 py-2 tabular-nums">{tenant.companyCount}</td> : null}
                  {visibleColumns.activeCompanies ? <td className="px-4 py-2 tabular-nums text-emerald-700">{tenant.activeCompanyCount}</td> : null}
                  {visibleColumns.concepts ? <td className="px-4 py-2 tabular-nums">{tenant.companyConceptCount}</td> : null}
                  {visibleColumns.updated ? <td className="px-4 py-2 text-muted-foreground">{formatTenantDate(tenant.updatedAt)}</td> : null}
                  {visibleColumns.status ? (
                    <td className="px-4 py-2">
                      <TenantStatusToggle
                        tenant={tenant}
                        onDestroy={destroy}
                        onRestore={restore}
                      />
                    </td>
                  ) : null}
                  <td className="px-4 py-1.5 text-right">
                    <TenantActions tenant={tenant} onDestroy={destroy} onEdit={(item) => setUpsertState({ tenant: item, returnTo: "list" })} onRestore={restore} onView={setSelectedTenant} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {pageTenants.length === 0 ? (
          <MasterListEmptyState>{isLoading ? "Loading tenants from database." : "No tenants found."}</MasterListEmptyState>
        ) : null}
      </MasterListTableCard>
      <MasterListPaginationCard
        page={currentPage}
        rowsPerPage={rowsPerPage}
        showingLabel={buildMasterListShowingLabel({ page: currentPage, pageSize: rowsPerPage, totalCount: filteredTenants.length })}
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
    </MasterListPageFrame>
  )
}

function TenantShowPage({
  tenant,
  onBack,
  onDestroy,
  onEdit,
  onRestore,
}: {
  tenant: TenantRecord
  onBack(): void
  onDestroy(): void
  onEdit(): void
  onRestore(): void
}) {
  return (
    <MasterListPageFrame
      title={`${tenant.code} - ${tenant.name}`}
      description="Tenant identity, database binding, and lifecycle details."
      technicalName="page.tenant.show"
      action={
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={onBack} type="button" variant="outline" className="h-9 rounded-md"><ArrowLeft className="size-4" />Back</Button>
          <Button onClick={onEdit} type="button" className="h-9 rounded-md"><Pencil className="size-4" />Edit</Button>
          {tenant.status === "suspend" ? (
            <Button onClick={onRestore} type="button" variant="outline" className="h-9 rounded-md"><RotateCcw className="size-4" />Restore</Button>
          ) : (
            <Button onClick={onDestroy} type="button" variant="destructive" className="h-9 rounded-md"><Trash2 className="size-4" />Suspend</Button>
          )}
        </div>
      }
    >
      <MasterListShowLayout>
        <div className="space-y-4">
          <MasterListShowCard title="Tenant profile">
            <DetailGrid rows={[["Name", tenant.name], ["Code", tenant.code], ["Slug", tenant.slug], ["Status", <StatusBadge key="status" status={tenant.status} />]]} />
          </MasterListShowCard>
          <MasterListShowCard title="Company metrics">
            <DetailGrid rows={[["Companies", tenant.companyCount], ["Active companies", tenant.activeCompanyCount], ["Company concepts", tenant.companyConceptCount]]} />
          </MasterListShowCard>
          <MasterListShowCard title="Payload settings">
            <pre className="max-h-80 overflow-auto rounded-md bg-muted/40 p-3 text-xs">{formatJsonText(tenant.payloadSettings)}</pre>
          </MasterListShowCard>
        </div>
        <div className="space-y-4">
          <MasterListShowCard title="Database">
            <DetailGrid rows={[["Type", tenant.dbType], ["Host", tenant.dbHost], ["Port", tenant.dbPort], ["Database", tenant.dbName], ["User", tenant.dbUser], ["Secret", tenant.dbSecretRef]]} />
          </MasterListShowCard>
          <MasterListShowCard title="Timestamps">
            <DetailGrid rows={[["Created", formatTenantDate(tenant.createdAt)], ["Updated", formatTenantDate(tenant.updatedAt)], ["Deleted", formatTenantDate(tenant.deletedAt)]]} />
          </MasterListShowCard>
        </div>
      </MasterListShowLayout>
    </MasterListPageFrame>
  )
}

function TenantUpsertPage({
  tenant,
  onBack,
  onSubmit,
}: {
  tenant: TenantRecord | null
  onBack(): void
  onSubmit(input: TenantFormState): Promise<void>
}) {
  const [form, setForm] = useState<TenantFormState>(emptyTenantForm)
  const [tab, setTab] = useState<TenantTab>("identity")
  const [isSaving, setIsSaving] = useState(false)
  const isEdit = Boolean(tenant)

  useEffect(() => {
    setForm(tenant ? toTenantForm(tenant) : { ...emptyTenantForm, dbName: "" })
    setTab("identity")
  }, [tenant])

  async function submit() {
    if (!form.name.trim()) {
      toast.error("Tenant name is required")
      return
    }

    if (!isValidJsonObject(form.payloadSettings)) {
      toast.error("Payload settings must be a JSON object")
      return
    }

    if (!form.dbHost.trim() || !form.dbPort.trim() || !form.dbUser.trim() || !form.dbSecretRef.trim()) {
      toast.error("Tenant database details are required")
      return
    }

    setIsSaving(true)
    try {
      await onSubmit(form)
    } catch (error) {
      toast.error("Tenant save failed", {
        description: error instanceof Error ? error.message : "Unable to save tenant.",
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <MasterListPageFrame
      title={isEdit ? "Edit tenant" : "New tenant"}
      description={isEdit ? "Update tenant identity, database connection, status, and settings." : "Create a tenant record with generated numeric code starting from 100."}
      technicalName="page.tenant.upsert"
      action={<Button type="button" variant="outline" onClick={onBack} className="rounded-md"><X className="size-4" />Cancel</Button>}
    >
      <MasterListUpsertLayout>
        <MasterListUpsertCard>
          <form className="space-y-6" onSubmit={(event) => { event.preventDefault(); void submit() }}>
            <AnimatedTabs value={tab} onValueChange={(value) => setTab(value as TenantTab)} tabs={buildTenantTabs({ form, setForm, tenant })} />
            <Separator />
            <div className="flex flex-wrap items-center gap-3">
              <Button type="submit" disabled={isSaving} className="rounded-md"><Save className={cn("size-4", isSaving && "animate-spin")} />{isEdit ? "Update tenant" : "Create tenant"}</Button>
              <Button type="button" variant="outline" onClick={onBack} className="rounded-md"><X className="size-4" />Cancel</Button>
            </div>
          </form>
        </MasterListUpsertCard>
      </MasterListUpsertLayout>
    </MasterListPageFrame>
  )
}

function buildTenantTabs({
  form,
  setForm,
  tenant,
}: {
  form: TenantFormState
  setForm: Dispatch<SetStateAction<TenantFormState>>
  tenant: TenantRecord | null
}) {
  return [
    {
      value: "identity",
      label: "Details",
      content: (
        <div className="space-y-6 rounded-2xl border border-border/70 bg-card/80 p-4 shadow-sm md:p-6">
          <div className="grid gap-x-6 gap-y-5 md:grid-cols-2">
            <TextField label="Tenant code" value={form.code || (tenant ? "" : "Auto")} disabled={!tenant} onChange={(value) => setField(setForm, "code", value.replace(/\D/g, ""))} />
            <TextField label="Tenant name" value={form.name} onChange={(value) => setTenantName(setForm, value, Boolean(tenant))} />
            <TextField label="Slug" value={form.slug} inputClassName="font-mono lowercase" onChange={(value) => setTenantSlug(setForm, value, Boolean(tenant))} />
            <SwitchRow
              checked={form.status === "active"}
              label="Active"
              description="Active tenants can be selected for workspace access."
              onChange={(checked) => setField(setForm, "status", checked ? "active" : "suspend")}
            />
          </div>
        </div>
      ),
    },
    {
      value: "database",
      label: "Database",
      content: (
        <div className="space-y-6 rounded-2xl border border-border/70 bg-card/80 p-4 shadow-sm md:p-6">
          <div className="grid gap-x-6 gap-y-5 md:grid-cols-2">
            <ReadOnlyField label="Database type" value={form.dbType || "mariadb"} />
            <TextField label="Host" value={form.dbHost} onChange={(value) => setField(setForm, "dbHost", value)} />
            <TextField label="Port" value={form.dbPort} onChange={(value) => setField(setForm, "dbPort", value.replace(/\D/g, ""))} />
            <TextField label="Database name" value={form.dbName} inputClassName="font-mono lowercase" onChange={(value) => setField(setForm, "dbName", databaseName(value))} />
            <TextField label="User" value={form.dbUser} onChange={(value) => setField(setForm, "dbUser", value)} />
            <TextField label="Secret reference" value={form.dbSecretRef} inputClassName="font-mono" onChange={(value) => setField(setForm, "dbSecretRef", value)} />
          </div>
        </div>
      ),
    },
    {
      value: "settings",
      label: "Settings",
      content: (
        <div className="rounded-2xl border border-border/70 bg-card/80 p-4 shadow-sm md:p-6">
          <TextField label="Payload settings JSON" value={form.payloadSettings} onChange={(value) => setField(setForm, "payloadSettings", value)} />
        </div>
      ),
    },
  ] as const
}

function TenantActions({ tenant, onDestroy, onEdit, onRestore, onView }: {
  tenant: TenantRecord
  onDestroy(tenant: TenantRecord): void
  onEdit(tenant: TenantRecord): void
  onRestore(tenant: TenantRecord): void
  onView(tenant: TenantRecord): void
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button aria-label={`${tenant.name} actions`} size="icon" variant="ghost" className="size-8 cursor-pointer rounded-md border border-border/70">
          <MoreHorizontal className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-36 rounded-md p-1">
        <DropdownMenuItem className="cursor-pointer gap-2" onSelect={() => onView(tenant)}><Eye className="size-4" />View</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="cursor-pointer gap-2" onSelect={() => onEdit(tenant)}><Pencil className="size-4" />Edit</DropdownMenuItem>
        <DropdownMenuSeparator />
        {tenant.status === "suspend" ? (
          <DropdownMenuItem className="cursor-pointer gap-2" onSelect={() => onRestore(tenant)}><RotateCcw className="size-4" />Restore</DropdownMenuItem>
        ) : (
          <DropdownMenuItem className="cursor-pointer gap-2 text-destructive focus:text-destructive" onSelect={() => onDestroy(tenant)}><Trash2 className="size-4" />Suspend</DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function SortableHeader({ column, label, onSort, sortState }: { column: TenantColumnId; label: string; onSort(column: TenantColumnId): void; sortState: { key: TenantColumnId; direction: TenantSortDirection } }) {
  return <ListHeader><button type="button" className="inline-flex cursor-pointer items-center gap-2" onClick={() => onSort(column)}>{label}<span className="text-muted-foreground">{sortState.key === column ? (sortState.direction === "asc" ? "↑" : "↓") : "↕"}</span></button></ListHeader>
}

function ListHeader({ children, className }: { children: ReactNode; className?: string }) {
  return <th className={cn("border-b border-border/70 px-4 py-3.5 text-left font-medium text-foreground", className)}>{children}</th>
}

function StatusBadge({ status }: { status: TenantRecord["status"] }) {
  const active = status === "active"
  const suspended = status === "suspend"
  return (
    <Badge
      variant="outline"
      className={cn(
        "h-6 gap-1 rounded-md px-2 text-[11px]",
        active && "border-emerald-200 bg-emerald-50 text-emerald-700",
        suspended && "border-amber-200 bg-amber-50 text-amber-700",
        status === "not_active" && "border-slate-200 bg-slate-50 text-slate-600",
      )}
    >
      {active ? <CheckCircle2 className="size-3" /> : null}
      {status.replace("_", " ")}
    </Badge>
  )
}

function TenantStatusToggle({
  tenant,
  onDestroy,
  onRestore,
}: {
  tenant: TenantRecord
  onDestroy(tenant: TenantRecord): void
  onRestore(tenant: TenantRecord): void
}) {
  const active = tenant.status === "active"
  const suspended = tenant.status === "suspend"

  return (
    <Button
      aria-label={suspended ? `Restore ${tenant.name}` : `Suspend ${tenant.name}`}
      className={cn(
        "h-6 rounded-md border px-2 text-[11px] font-medium shadow-none",
        active && "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100",
        suspended && "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100",
        tenant.status === "not_active" && "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100",
      )}
      onClick={() => suspended ? onRestore(tenant) : onDestroy(tenant)}
      title={suspended ? "Suspended. Click to restore this tenant." : "Click to suspend this tenant."}
      type="button"
      variant="outline"
    >
      {active ? <CheckCircle2 className="size-3" /> : suspended ? <RotateCcw className="size-3" /> : null}
      {suspended ? "Restore" : tenant.status.replace("_", " ")}
    </Button>
  )
}

function FieldShell({ children, className, label }: { children: ReactNode; className?: string; label: string }) {
  return <div className={cn("grid gap-2", className)}><Label className="text-sm font-medium">{label}</Label>{children}</div>
}

function TextField({ disabled, inputClassName, label, onChange, value }: { disabled?: boolean; inputClassName?: string; label: string; value: string | number | null; onChange(value: string): void }) {
  return <FieldShell label={label}><Input disabled={disabled} className={cn("h-11 rounded-xl", inputClassName)} value={value ?? ""} onChange={(event) => onChange(event.target.value)} /></FieldShell>
}

function ReadOnlyField({ label, value }: { label: string; value: ReactNode }) {
  return (
    <FieldShell label={label}>
      <div className="flex h-11 items-center rounded-xl border border-border/70 bg-muted/30 px-3 text-sm text-muted-foreground">
        {value}
      </div>
    </FieldShell>
  )
}

function SwitchRow({
  checked,
  description,
  label,
  onChange,
}: {
  checked: boolean
  description: string
  label: string
  onChange(checked: boolean): void
}) {
  return (
    <label className={cn("flex cursor-pointer items-center justify-between gap-4 rounded-xl border px-4 py-3", checked ? "border-emerald-200 bg-emerald-50 text-emerald-950" : "border-border/70 bg-muted/10")}>
      <span>
        <span className="flex items-center gap-1.5 text-sm font-medium">
          {checked ? <CheckCircle2 className="size-3.5 text-emerald-600" /> : null}
          {label}
        </span>
        <span className={cn("block text-xs", checked ? "text-emerald-700" : "text-muted-foreground")}>{description}</span>
      </span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </label>
  )
}

function DetailGrid({ rows }: { rows: Array<[string, ReactNode]> }) {
  return (
    <dl className="grid gap-3 sm:grid-cols-2">
      {rows.map(([label, value]) => (
        <div key={label} className="rounded-md bg-muted/30 px-3 py-2">
          <dt className="text-xs text-muted-foreground">{label}</dt>
          <dd className="mt-1 text-sm font-medium text-foreground">{value || "Not set"}</dd>
        </div>
      ))}
    </dl>
  )
}

function setField<K extends keyof TenantFormState>(setForm: Dispatch<SetStateAction<TenantFormState>>, key: K, value: TenantFormState[K]) {
  setForm((current) => ({ ...current, [key]: value }))
}

function setTenantName(setForm: Dispatch<SetStateAction<TenantFormState>>, value: string, isEdit: boolean) {
  setForm((current) => {
    if (isEdit || current.slug.trim()) {
      return { ...current, name: value }
    }

    const nextSlug = slugify(value)
    return { ...current, name: value, slug: nextSlug, dbName: databaseName(nextSlug) }
  })
}

function setTenantSlug(setForm: Dispatch<SetStateAction<TenantFormState>>, value: string, isEdit: boolean) {
  const nextSlug = slugify(value)
  setForm((current) => ({
    ...current,
    slug: nextSlug,
    dbName: isEdit ? current.dbName : databaseName(nextSlug),
  }))
}

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9_]+/g, "_").replace(/^_+|_+$/g, "")
}

function databaseName(value: string) {
  const normalized = slugify(value).replace(/_db$/, "")
  return normalized ? `${normalized}_db` : ""
}

function formatJsonText(value: string) {
  try {
    return JSON.stringify(JSON.parse(value), null, 2)
  } catch {
    return value || "{}"
  }
}

function isValidJsonObject(value: string) {
  try {
    const parsed = JSON.parse(value)
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
  } catch {
    return false
  }
}
