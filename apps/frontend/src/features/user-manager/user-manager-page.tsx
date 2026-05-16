import { useEffect, useMemo, useState, type Dispatch, type ReactNode, type SetStateAction } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { ArrowLeft, CheckCircle2, Plus, RefreshCw, Save, X } from "lucide-react"
import { Badge } from "src/components/ui/badge"
import { Button } from "src/components/ui/button"
import { Input } from "src/components/ui/input"
import { Label } from "src/components/ui/label"
import { Switch } from "src/components/ui/switch"
import {
  MasterListEmptyState,
  MasterListPageFrame,
  MasterListPaginationCard,
  MasterListRowActions,
  MasterListShowCard,
  MasterListTableCard,
  MasterListToolbarCard,
  MasterListUpsertCard,
  MasterListUpsertLayout,
  buildMasterListShowingLabel,
} from "src/components/blocks/lists/master-list"
import { cn } from "src/lib/utils"
import {
  emptyPlatformUser,
  listTenantUsers,
  listUserTenantSummaries,
  toPlatformUserInput,
  upsertPlatformUser,
  type PlatformUserStatus,
  type PlatformUserUpsertInput,
  type TenantUserRecord,
  type TenantUserSummary,
} from "./user-manager-client"

type UserManagerState =
  | { mode: "list" }
  | { mode: "show"; tenant: TenantUserSummary }
  | { mode: "upsert"; tenant: TenantUserSummary; user: TenantUserRecord | null }

type MappedUserStatusFilter = "all" | PlatformUserStatus
type MappedUserColumnId = "user" | "email" | "role" | "status" | "tenant"

const mappedUserStatusFilters = [
  { id: "all", label: "All users" },
  { id: "active", label: "Active" },
  { id: "inactive", label: "Inactive" },
  { id: "suspend", label: "Suspended" },
]

export function UserManagerPage() {
  const queryClient = useQueryClient()
  const [state, setState] = useState<UserManagerState>({ mode: "list" })
  const summariesQuery = useQuery({ queryKey: ["user-manager", "tenant-summary"], queryFn: listUserTenantSummaries })
  const upsertMutation = useMutation({ mutationFn: upsertPlatformUser })
  const summaries = summariesQuery.data ?? []

  useEffect(() => {
    if (summariesQuery.error) {
      toast.error("User manager load failed", {
        description: summariesQuery.error instanceof Error ? summariesQuery.error.message : "Unable to load user manager.",
      })
    }
  }, [summariesQuery.error])

  async function save(input: PlatformUserUpsertInput) {
    const user = await upsertMutation.mutateAsync(input)
    toast.success(input.user_id ? "User updated" : "User created", {
      description: `${user.name} is assigned to ${user.tenant_name}.`,
    })
    await queryClient.invalidateQueries({ queryKey: ["user-manager"] })
    const tenant = summaries.find((summary) => summary.tenant_id === user.tenant_id) ?? {
      tenant_id: user.tenant_id,
      tenant_code: user.tenant_code,
      tenant_slug: user.tenant_slug,
      tenant_name: user.tenant_name,
      tenant_status: "active",
      user_count: 0,
    }
    setState({ mode: "show", tenant })
  }

  if (state.mode === "show") {
    return (
      <TenantUsersShowPage
        tenant={state.tenant}
        onAdd={() => setState({ mode: "upsert", tenant: state.tenant, user: null })}
        onBack={() => setState({ mode: "list" })}
        onEdit={(user) => setState({ mode: "upsert", tenant: state.tenant, user })}
      />
    )
  }

  if (state.mode === "upsert") {
    return (
      <PlatformUserUpsertPage
        tenant={state.tenant}
        user={state.user}
        onBack={() => setState({ mode: "show", tenant: state.tenant })}
        onSubmit={save}
      />
    )
  }

  return (
    <UserTenantSummaryListPage
      isFetching={summariesQuery.isFetching}
      summaries={summaries}
      onRefresh={() => void summariesQuery.refetch()}
      onShow={(tenant) => setState({ mode: "show", tenant })}
    />
  )
}

function UserTenantSummaryListPage({
  isFetching,
  onRefresh,
  onShow,
  summaries,
}: {
  isFetching: boolean
  onRefresh(): void
  onShow(tenant: TenantUserSummary): void
  summaries: TenantUserSummary[]
}) {
  const [searchValue, setSearchValue] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const filtered = useMemo(() => {
    const query = searchValue.trim().toLowerCase()
    return summaries.filter((tenant) => [tenant.tenant_name, tenant.tenant_slug, tenant.tenant_code, tenant.tenant_status].join(" ").toLowerCase().includes(query))
  }, [searchValue, summaries])
  const totalPages = Math.max(1, Math.ceil(filtered.length / rowsPerPage))
  const pageRows = filtered.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage)

  return (
    <MasterListPageFrame
      title="User Manager"
      description="Master user access by tenant, sourced from platform users and user_tenants."
      technicalName="page.user-manager.list"
      action={
        <Button disabled={isFetching} onClick={onRefresh} type="button" variant="outline" className="h-9 rounded-md">
          <RefreshCw className={cn("size-4", isFetching && "animate-spin")} />
          Refresh
        </Button>
      }
    >
      <MasterListToolbarCard
        onSearchValueChange={(value) => { setSearchValue(value); setCurrentPage(1) }}
        searchPlaceholder="Search tenant, slug, code, or status"
        searchValue={searchValue}
      />
      <MasterListTableCard>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-sm">
            <thead className="bg-muted/50">
              <tr>
                <ListHeader>#</ListHeader>
                <ListHeader>Tenant</ListHeader>
                <ListHeader>Code</ListHeader>
                <ListHeader>Status</ListHeader>
                <ListHeader>Users</ListHeader>
                <ListHeader className="text-right">Action</ListHeader>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((tenant, index) => (
                <tr key={tenant.tenant_id} className="border-b border-border/70">
                  <td className="px-4 py-2 text-muted-foreground">{(currentPage - 1) * rowsPerPage + index + 1}</td>
                  <td className="px-4 py-2">
                    <button className="text-left font-medium text-foreground transition-colors hover:text-primary" onClick={() => onShow(tenant)} type="button">
                      {tenant.tenant_name}
                    </button>
                    <div className="font-mono text-xs text-muted-foreground">{tenant.tenant_slug}</div>
                  </td>
                  <td className="px-4 py-2 font-mono text-xs text-muted-foreground">{tenant.tenant_code}</td>
                  <td className="px-4 py-2"><StatusBadge status={tenant.tenant_status as PlatformUserStatus} /></td>
                  <td className="px-4 py-2 tabular-nums">{tenant.user_count}</td>
                  <td className="px-4 py-1.5 text-right">
                    <MasterListRowActions title={tenant.tenant_name} onView={() => onShow(tenant)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {pageRows.length === 0 ? <MasterListEmptyState>{isFetching ? "Loading tenants." : "No tenant users found."}</MasterListEmptyState> : null}
      </MasterListTableCard>
      <MasterListPaginationCard
        page={currentPage}
        rowsPerPage={rowsPerPage}
        showingLabel={buildMasterListShowingLabel({ page: currentPage, pageSize: rowsPerPage, totalCount: filtered.length })}
        singularLabel="tenants"
        totalCount={filtered.length}
        totalPages={totalPages}
        onNextPage={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
        onPageChange={setCurrentPage}
        onPreviousPage={() => setCurrentPage((page) => Math.max(1, page - 1))}
        onRowsPerPageChange={(value) => { setRowsPerPage(value); setCurrentPage(1) }}
      />
    </MasterListPageFrame>
  )
}

function TenantUsersShowPage({
  onAdd,
  onBack,
  onEdit,
  tenant,
}: {
  onAdd(): void
  onBack(): void
  onEdit(user: TenantUserRecord): void
  tenant: TenantUserSummary
}) {
  const queryClient = useQueryClient()
  const usersQuery = useQuery({ queryKey: ["user-manager", "tenant-users", tenant.tenant_id], queryFn: () => listTenantUsers(tenant.tenant_id) })
  const statusMutation = useMutation({ mutationFn: upsertPlatformUser })
  const users = usersQuery.data ?? []
  const mappedUserCount = usersQuery.data ? users.length : tenant.user_count
  const [searchValue, setSearchValue] = useState("")
  const [statusFilter, setStatusFilter] = useState<MappedUserStatusFilter>("all")
  const [currentPage, setCurrentPage] = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [visibleColumns, setVisibleColumns] = useState<Record<MappedUserColumnId, boolean>>({
    user: true,
    email: true,
    role: true,
    status: true,
    tenant: true,
  })
  const filteredUsers = useMemo(() => {
    const query = searchValue.trim().toLowerCase()
    return users.filter((user) => {
      const matchesStatus = statusFilter === "all" || user.status === statusFilter
      const matchesSearch = [user.name, user.email, user.role, user.status, user.tenant_name, user.tenant_slug].join(" ").toLowerCase().includes(query)
      return matchesStatus && matchesSearch
    })
  }, [searchValue, statusFilter, users])
  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / rowsPerPage))
  const pageRows = filteredUsers.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage)

  async function setUserStatus(user: TenantUserRecord, status: PlatformUserStatus) {
    try {
      const updatedUser = await statusMutation.mutateAsync({ ...toPlatformUserInput(user), status })
      toast.success(status === "active" ? "User restored" : "User suspended", {
        description: `${updatedUser.name} is ${status === "active" ? "active again" : "now suspended"}.`,
      })
      await queryClient.invalidateQueries({ queryKey: ["user-manager"] })
    } catch (error) {
      toast.error("User status update failed", {
        description: error instanceof Error ? error.message : "Unable to update this mapped user.",
      })
    }
  }

  return (
    <MasterListPageFrame
      title={`${tenant.tenant_code} - ${tenant.tenant_name}`}
      description="Detailed users assigned to this tenant."
      technicalName="page.user-manager.show"
      action={
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={onBack} type="button" variant="outline" className="h-9 rounded-md"><ArrowLeft className="size-4" />Back</Button>
          <Button onClick={onAdd} type="button" className="h-9 rounded-md"><Plus className="size-4" />Add new</Button>
        </div>
      }
    >
      <div className="grid gap-4">
        <UserShowCard title="Tenant">
          <DetailTable rows={[["Name", tenant.tenant_name], ["Code", tenant.tenant_code], ["Slug", tenant.tenant_slug], ["Mapped users", mappedUserCount], ["Status", <StatusBadge key="status" status={tenant.tenant_status as PlatformUserStatus} />]]} />
        </UserShowCard>
        <MasterListToolbarCard
          columns={(Object.keys(visibleColumns) as MappedUserColumnId[]).map((column) => ({
            id: column,
            label: mappedUserColumnLabel(column),
            checked: visibleColumns[column],
            disabled: column === "user",
            onCheckedChange: (checked) => setVisibleColumns((current) => ({ ...current, [column]: checked })),
          }))}
          filterOptions={mappedUserStatusFilters}
          filterValue={statusFilter}
          onFilterValueChange={(value) => { setStatusFilter(value as MappedUserStatusFilter); setCurrentPage(1) }}
          onSearchValueChange={(value) => { setSearchValue(value); setCurrentPage(1) }}
          onShowAllColumns={() => setVisibleColumns({ user: true, email: true, role: true, status: true, tenant: true })}
          searchPlaceholder="Search mapped users by name, email, role, or status"
          searchValue={searchValue}
        />
        <MasterListTableCard>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] border-collapse text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <ListHeader>#</ListHeader>
                  {visibleColumns.user ? <ListHeader>User</ListHeader> : null}
                  {visibleColumns.email ? <ListHeader>Email</ListHeader> : null}
                  {visibleColumns.role ? <ListHeader>Role</ListHeader> : null}
                  {visibleColumns.status ? <ListHeader>Status</ListHeader> : null}
                  {visibleColumns.tenant ? <ListHeader>Mapped tenant</ListHeader> : null}
                  <ListHeader className="text-right">Action</ListHeader>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((user, index) => (
                  <tr key={user.access_id} className="border-b border-border/70">
                    <td className="px-4 py-2 text-muted-foreground">{(currentPage - 1) * rowsPerPage + index + 1}</td>
                    {visibleColumns.user ? <td className="px-4 py-2 font-medium">{user.name}</td> : null}
                    {visibleColumns.email ? <td className="px-4 py-2 text-muted-foreground">{user.email}</td> : null}
                    {visibleColumns.role ? <td className="px-4 py-2 font-mono text-xs text-muted-foreground">{user.role}</td> : null}
                    {visibleColumns.status ? <td className="px-4 py-2"><StatusBadge status={user.status} /></td> : null}
                    {visibleColumns.tenant ? (
                      <td className="px-4 py-2">
                        <div className="font-medium text-foreground">{user.tenant_name}</div>
                        <div className="font-mono text-xs text-muted-foreground">{user.tenant_slug}</div>
                      </td>
                    ) : null}
                    <td className="px-4 py-1.5 text-right">
                      <MasterListRowActions
                        title={user.name}
                        isSuspended={user.status === "suspend"}
                        onDelete={() => void setUserStatus(user, "suspend")}
                        onEdit={() => onEdit(user)}
                        onRestore={() => void setUserStatus(user, "active")}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {pageRows.length === 0 ? <MasterListEmptyState>{usersQuery.isFetching ? "Loading users." : "No mapped users found."}</MasterListEmptyState> : null}
        </MasterListTableCard>
        <MasterListPaginationCard
          page={currentPage}
          rowsPerPage={rowsPerPage}
          showingLabel={buildMasterListShowingLabel({ page: currentPage, pageSize: rowsPerPage, totalCount: filteredUsers.length })}
          singularLabel="mapped users"
          totalCount={filteredUsers.length}
          totalPages={totalPages}
          onNextPage={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
          onPageChange={setCurrentPage}
          onPreviousPage={() => setCurrentPage((page) => Math.max(1, page - 1))}
          onRowsPerPageChange={(value) => { setRowsPerPage(value); setCurrentPage(1) }}
        />
      </div>
    </MasterListPageFrame>
  )
}

function PlatformUserUpsertPage({
  onBack,
  onSubmit,
  tenant,
  user,
}: {
  onBack(): void
  onSubmit(input: PlatformUserUpsertInput): Promise<void>
  tenant: TenantUserSummary
  user: TenantUserRecord | null
}) {
  const [form, setForm] = useState<PlatformUserUpsertInput>(() => user ? toPlatformUserInput(user) : emptyPlatformUser(tenant.tenant_id))
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    setForm(user ? toPlatformUserInput(user) : emptyPlatformUser(tenant.tenant_id))
  }, [tenant.tenant_id, user])

  async function submit() {
    if (!form.name.trim() || !form.email.trim()) {
      toast.error("Name and email are required")
      return
    }
    if (!form.user_id && !form.password?.trim()) {
      toast.error("Password is required for new users")
      return
    }
    setIsSaving(true)
    try {
      await onSubmit(form)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <MasterListPageFrame
      title={user ? "Edit user" : "New user"}
      description={`Assign platform user access for ${tenant.tenant_name}.`}
      technicalName="page.user-manager.upsert"
      action={<Button type="button" variant="outline" onClick={onBack} className="rounded-md"><X className="size-4" />Cancel</Button>}
    >
      <MasterListUpsertLayout>
        <MasterListUpsertCard title="User access" description="User identity lives in master users; tenant access lives in user_tenants.">
          <form className="space-y-5" onSubmit={(event) => { event.preventDefault(); void submit() }}>
            <div className="grid gap-x-6 gap-y-5 md:grid-cols-2">
              <ReadOnlyField label="Tenant" value={`${tenant.tenant_name} (${tenant.tenant_slug})`} />
              <TextField label="Name" value={form.name} onChange={(value) => setField(setForm, "name", value)} />
              <TextField label="Email" value={form.email} onChange={(value) => setField(setForm, "email", value)} />
              <TextField label={user ? "New password" : "Password"} value={form.password ?? ""} onChange={(value) => setField(setForm, "password", value)} />
              <FieldShell label="Role">
                <select className="h-11 rounded-xl border border-border/70 bg-background px-3 text-sm" value={form.role} onChange={(event) => setField(setForm, "role", event.target.value)}>
                  <option value="admin">admin</option>
                  <option value="manager">manager</option>
                  <option value="staff">staff</option>
                  <option value="user">user</option>
                  {form.role === "software-admin" ? <option value="software-admin">software-admin</option> : null}
                </select>
              </FieldShell>
              <SwitchRow checked={form.status === "active"} label="Active" description="Active users can authenticate when their role matches the surface." onChange={(checked) => setField(setForm, "status", checked ? "active" : "suspend")} />
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button type="submit" disabled={isSaving} className="rounded-md"><Save className={cn("size-4", isSaving && "animate-spin")} />Save user</Button>
              <Button type="button" variant="outline" onClick={onBack} className="rounded-md"><X className="size-4" />Cancel</Button>
            </div>
          </form>
        </MasterListUpsertCard>
      </MasterListUpsertLayout>
    </MasterListPageFrame>
  )
}

function DetailTable({ rows }: { rows: Array<[string, ReactNode]> }) {
  return (
    <div className="-mx-5 -mb-5 -mt-5 overflow-hidden rounded-b-md border-t border-border/70">
      <table className="w-full border-collapse text-sm">
        <tbody>
          {rows.map(([label, value]) => (
            <tr key={label} className="border-b border-border/60 last:border-b-0">
              <th className="w-40 border-r border-border/70 bg-muted/35 px-3 py-2.5 text-left align-top text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</th>
              <td className="px-3 py-2.5 align-top font-medium text-foreground">{value || "Not set"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function UserShowCard({ children, title }: { children: ReactNode; title: string }) {
  return <MasterListShowCard title={title} className="gap-0 py-0 [&>div:first-child]:px-4 [&>div:first-child]:py-3">{children}</MasterListShowCard>
}

function FieldShell({ children, label }: { children: ReactNode; label: string }) {
  return <div className="grid gap-2"><Label className="text-sm font-medium">{label}</Label>{children}</div>
}

function TextField({ label, onChange, value }: { label: string; value: string | number | null; onChange(value: string): void }) {
  return <FieldShell label={label}><Input className="h-11 rounded-xl" value={value ?? ""} onChange={(event) => onChange(event.target.value)} /></FieldShell>
}

function ReadOnlyField({ label, value }: { label: string; value: ReactNode }) {
  return <FieldShell label={label}><div className="flex h-11 items-center rounded-xl border border-border/70 bg-muted/30 px-3 text-sm text-muted-foreground">{value}</div></FieldShell>
}

function SwitchRow({ checked, description, label, onChange }: { checked: boolean; description: string; label: string; onChange(checked: boolean): void }) {
  return (
    <label className={cn("flex cursor-pointer items-center justify-between gap-4 rounded-xl border px-4 py-3", checked ? "border-emerald-200 bg-emerald-50 text-emerald-950" : "border-border/70 bg-muted/10")}>
      <span>
        <span className="flex items-center gap-1.5 text-sm font-medium">{checked ? <CheckCircle2 className="size-3.5 text-emerald-600" /> : null}{label}</span>
        <span className={cn("block text-xs", checked ? "text-emerald-700" : "text-muted-foreground")}>{description}</span>
      </span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </label>
  )
}

function StatusBadge({ status }: { status: PlatformUserStatus }) {
  return <Badge variant="outline" className={cn("h-6 w-fit gap-1 rounded-md px-2 text-[11px]", status === "active" && "border-emerald-200 bg-emerald-50 text-emerald-700", status === "suspend" && "border-amber-200 bg-amber-50 text-amber-700", status === "inactive" && "border-slate-200 bg-slate-50 text-slate-600")}>{status === "active" ? <CheckCircle2 className="size-3" /> : null}{status}</Badge>
}

function ListHeader({ children, className }: { children: ReactNode; className?: string }) {
  return <th className={cn("border-b border-border/70 px-4 py-3.5 text-left font-medium text-foreground", className)}>{children}</th>
}

function setField<K extends keyof PlatformUserUpsertInput>(setForm: Dispatch<SetStateAction<PlatformUserUpsertInput>>, key: K, value: PlatformUserUpsertInput[K]) {
  setForm((current) => ({ ...current, [key]: value }))
}

function mappedUserColumnLabel(column: MappedUserColumnId) {
  return ({ user: "User", email: "Email", role: "Role", status: "Status", tenant: "Mapped tenant" })[column]
}
