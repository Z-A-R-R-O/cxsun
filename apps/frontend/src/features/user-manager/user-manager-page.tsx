import { useEffect, useMemo, useState, type Dispatch, type ReactNode, type SetStateAction } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { ArrowLeft, CheckCircle2, Plus, RefreshCw, Save, UserRoundCog, X } from "lucide-react"
import { AnimatedTabs } from "src/components/ui/animated-tabs"
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
import type { AuthSession } from "src/features/auth/auth-client"
import { listTenants } from "src/features/tenant/infrastructure/tenant-api"
import type { TenantRecord } from "src/features/tenant/domain/tenant"
import {
  emptyAdminUser,
  emptyTenantUser,
  listAdminUsers,
  listTenantUserSummaries,
  listTenantUsers,
  toAdminUserInput,
  toTenantUserInput,
  upsertAdminUser,
  upsertTenantUser,
  type AdminUserRecord,
  type AdminUserRole,
  type AdminUserStatus,
  type AdminUserUpsertInput,
  type TenantUserRecord,
  type TenantUserRole,
  type TenantUserSummary,
  type TenantUserUpsertInput,
} from "./user-manager-client"

type AdminUserManagerState =
  | { mode: "list" }
  | { mode: "show"; user: AdminUserRecord }
  | { mode: "upsert"; user: AdminUserRecord | null }

type AdminUserStatusFilter = "all" | AdminUserStatus
type AdminUserColumnId = "user" | "email" | "role" | "status" | "updated"
type UserManagerMode = "platform" | "tenant"
type TenantUserTenantOption = Pick<TenantRecord, "id" | "code" | "slug" | "name" | "status">

const adminUserStatusFilters = [
  { id: "all", label: "All admin users" },
  { id: "active", label: "Active" },
  { id: "inactive", label: "Inactive" },
  { id: "suspend", label: "Suspended" },
]

const adminUserRoles: Array<{ value: AdminUserRole; label: string }> = [
  { value: "super-admin", label: "Super admin" },
  { value: "software-admin", label: "Software admin" },
  { value: "support-admin", label: "Support admin" },
  { value: "helpdesk-admin", label: "Helpdesk admin" },
]

export function UserManagerPage({ mode = "platform", session }: { mode?: UserManagerMode; session: AuthSession }) {
  if (mode === "tenant") {
    return <TenantUserManagerPage mode="tenant" session={session} />
  }

  return (
    <AnimatedTabs
      defaultValue="tenant-users"
      tabs={[
        {
          value: "tenant-users",
          label: "Tenant Users",
          content: <TenantUserManagerPage mode="platform" session={session} />,
        },
        {
          value: "admin-users",
          label: "Admin Users",
          content: <AdminUserManagerPage session={session} />,
        },
      ]}
    />
  )
}

function AdminUserManagerPage({ session }: { session: AuthSession }) {
  const queryClient = useQueryClient()
  const [state, setState] = useState<AdminUserManagerState>({ mode: "list" })
  const usersQuery = useQuery({ queryKey: ["admin-user-manager"], queryFn: () => listAdminUsers(session) })
  const upsertMutation = useMutation({ mutationFn: (input: AdminUserUpsertInput) => upsertAdminUser(session, input) })
  const users = usersQuery.data ?? []

  useEffect(() => {
    if (usersQuery.error) {
      toast.error("Admin user manager load failed", {
        description: usersQuery.error instanceof Error ? usersQuery.error.message : "Unable to load admin users.",
      })
    }
  }, [usersQuery.error])

  async function save(input: AdminUserUpsertInput) {
    const user = await upsertMutation.mutateAsync(input)
    toast.success(input.id ? "Admin user updated" : "Admin user created", {
      description: `${user.name} can use the ${roleLabel(user.role)} surface.`,
    })
    await queryClient.invalidateQueries({ queryKey: ["admin-user-manager"] })
    setState({ mode: "show", user })
  }

  if (state.mode === "show") {
    return (
      <AdminUserShowPage
        user={state.user}
        onBack={() => setState({ mode: "list" })}
        onEdit={(user) => setState({ mode: "upsert", user })}
      />
    )
  }

  if (state.mode === "upsert") {
    return (
      <AdminUserUpsertPage
        user={state.user}
        onBack={() => setState(state.user ? { mode: "show", user: state.user } : { mode: "list" })}
        onSubmit={save}
      />
    )
  }

  return (
    <AdminUserListPage
      isFetching={usersQuery.isFetching}
      users={users}
      onAdd={() => setState({ mode: "upsert", user: null })}
      onEdit={(user) => setState({ mode: "upsert", user })}
      onRefresh={() => void usersQuery.refetch()}
      onShow={(user) => setState({ mode: "show", user })}
      onStatusChange={save}
    />
  )
}

function AdminUserListPage({
  isFetching,
  onAdd,
  onEdit,
  onRefresh,
  onShow,
  onStatusChange,
  users,
}: {
  isFetching: boolean
  onAdd(): void
  onEdit(user: AdminUserRecord): void
  onRefresh(): void
  onShow(user: AdminUserRecord): void
  onStatusChange(input: AdminUserUpsertInput): Promise<void>
  users: AdminUserRecord[]
}) {
  const [searchValue, setSearchValue] = useState("")
  const [statusFilter, setStatusFilter] = useState<AdminUserStatusFilter>("all")
  const [currentPage, setCurrentPage] = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [visibleColumns, setVisibleColumns] = useState<Record<AdminUserColumnId, boolean>>({
    user: true,
    email: true,
    role: true,
    status: true,
    updated: true,
  })
  const filtered = useMemo(() => {
    const query = searchValue.trim().toLowerCase()
    return users.filter((user) => {
      const matchesStatus = statusFilter === "all" || user.status === statusFilter
      const matchesSearch = [user.name, user.email, user.role, user.status].join(" ").toLowerCase().includes(query)
      return matchesStatus && matchesSearch
    })
  }, [searchValue, statusFilter, users])
  const totalPages = Math.max(1, Math.ceil(filtered.length / rowsPerPage))
  const pageRows = filtered.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage)

  async function setAdminStatus(user: AdminUserRecord, status: AdminUserStatus) {
    try {
      await onStatusChange({ ...toAdminUserInput(user), status })
    } catch (error) {
      toast.error("Admin user status update failed", {
        description: error instanceof Error ? error.message : "Unable to update this admin user.",
      })
    }
  }

  return (
    <MasterListPageFrame
      title="Admin User Manager"
      description="Manage platform admin identities that can sign in to the admin and super-admin desks."
      technicalName="page.admin-user-manager.list"
      action={
        <div className="flex flex-wrap items-center gap-2">
          <Button disabled={isFetching} onClick={onRefresh} type="button" variant="outline" className="h-9 rounded-md">
            <RefreshCw className={cn("size-4", isFetching && "animate-spin")} />
            Refresh
          </Button>
          <Button onClick={onAdd} type="button" className="h-9 rounded-md">
            <Plus className="size-4" />
            Add admin
          </Button>
        </div>
      }
    >
      <MasterListToolbarCard
        columns={(Object.keys(visibleColumns) as AdminUserColumnId[]).map((column) => ({
          id: column,
          label: adminUserColumnLabel(column),
          checked: visibleColumns[column],
          disabled: column === "user",
          onCheckedChange: (checked) => setVisibleColumns((current) => ({ ...current, [column]: checked })),
        }))}
        filterOptions={adminUserStatusFilters}
        filterValue={statusFilter}
        onFilterValueChange={(value) => { setStatusFilter(value as AdminUserStatusFilter); setCurrentPage(1) }}
        onSearchValueChange={(value) => { setSearchValue(value); setCurrentPage(1) }}
        onShowAllColumns={() => setVisibleColumns({ user: true, email: true, role: true, status: true, updated: true })}
        searchPlaceholder="Search admin name, email, role, or status"
        searchValue={searchValue}
      />
      <MasterListTableCard>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] border-collapse text-sm">
            <thead className="bg-muted/50">
              <tr>
                <ListHeader>#</ListHeader>
                {visibleColumns.user ? <ListHeader>Admin user</ListHeader> : null}
                {visibleColumns.email ? <ListHeader>Email</ListHeader> : null}
                {visibleColumns.role ? <ListHeader>Role</ListHeader> : null}
                {visibleColumns.status ? <ListHeader>Status</ListHeader> : null}
                {visibleColumns.updated ? <ListHeader>Updated</ListHeader> : null}
                <ListHeader className="text-right">Action</ListHeader>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((user, index) => (
                <tr key={user.id} className="border-b border-border/70">
                  <td className="px-4 py-2 text-muted-foreground">{(currentPage - 1) * rowsPerPage + index + 1}</td>
                  {visibleColumns.user ? (
                    <td className="px-4 py-2">
                      <button className="text-left font-medium text-foreground transition-colors hover:text-primary" onClick={() => onShow(user)} type="button">
                        {user.name}
                      </button>
                    </td>
                  ) : null}
                  {visibleColumns.email ? <td className="px-4 py-2 text-muted-foreground">{user.email}</td> : null}
                  {visibleColumns.role ? <td className="px-4 py-2 font-mono text-xs text-muted-foreground">{roleLabel(user.role)}</td> : null}
                  {visibleColumns.status ? <td className="px-4 py-2"><StatusBadge status={user.status} /></td> : null}
                  {visibleColumns.updated ? <td className="px-4 py-2 text-muted-foreground">{formatDate(user.updated_at)}</td> : null}
                  <td className="px-4 py-1.5 text-right">
                    <MasterListRowActions
                      title={user.name}
                      isSuspended={user.status === "suspend"}
                      onDelete={() => void setAdminStatus(user, "suspend")}
                      onEdit={() => onEdit(user)}
                      onRestore={() => void setAdminStatus(user, "active")}
                      onView={() => onShow(user)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {pageRows.length === 0 ? <MasterListEmptyState>{isFetching ? "Loading admin users." : "No admin users found."}</MasterListEmptyState> : null}
      </MasterListTableCard>
      <MasterListPaginationCard
        page={currentPage}
        rowsPerPage={rowsPerPage}
        showingLabel={buildMasterListShowingLabel({ page: currentPage, pageSize: rowsPerPage, totalCount: filtered.length })}
        singularLabel="admin users"
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

function AdminUserShowPage({
  onBack,
  onEdit,
  user,
}: {
  onBack(): void
  onEdit(user: AdminUserRecord): void
  user: AdminUserRecord
}) {
  return (
    <MasterListPageFrame
      title={user.name}
      description="Platform admin identity details."
      technicalName="page.admin-user-manager.show"
      action={
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={onBack} type="button" variant="outline" className="h-9 rounded-md"><ArrowLeft className="size-4" />Back</Button>
          <Button onClick={() => onEdit(user)} type="button" className="h-9 rounded-md">Edit admin</Button>
        </div>
      }
    >
      <AdminUserShowCard title="Admin user">
        <DetailTable rows={[
          ["Name", user.name],
          ["Email", user.email],
          ["Role", roleLabel(user.role)],
          ["Status", <StatusBadge key="status" status={user.status} />],
          ["Created", formatDate(user.created_at)],
          ["Updated", formatDate(user.updated_at)],
        ]} />
      </AdminUserShowCard>
    </MasterListPageFrame>
  )
}

function AdminUserUpsertPage({
  onBack,
  onSubmit,
  user,
}: {
  onBack(): void
  onSubmit(input: AdminUserUpsertInput): Promise<void>
  user: AdminUserRecord | null
}) {
  const [form, setForm] = useState<AdminUserUpsertInput>(() => user ? toAdminUserInput(user) : emptyAdminUser())
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    setForm(user ? toAdminUserInput(user) : emptyAdminUser())
  }, [user])

  async function submit() {
    if (!form.name.trim() || !form.email.trim()) {
      toast.error("Name and email are required")
      return
    }
    if (!form.id && !form.password?.trim()) {
      toast.error("Password is required for new admin users")
      return
    }
    setIsSaving(true)
    try {
      await onSubmit(form)
    } catch (error) {
      toast.error("Tenant user save failed", {
        description: error instanceof Error ? error.message : "Unable to save this tenant user.",
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <MasterListPageFrame
      title={user ? "Edit admin user" : "New admin user"}
      description="Create or update platform identities for the admin desks."
      technicalName="page.admin-user-manager.upsert"
      action={<Button type="button" variant="outline" onClick={onBack} className="rounded-md"><X className="size-4" />Cancel</Button>}
    >
      <MasterListUpsertLayout>
        <MasterListUpsertCard title="Admin user" description="Admin users live in the master database and are separate from tenant workspace users.">
          <form className="space-y-5" onSubmit={(event) => { event.preventDefault(); void submit() }}>
            <div className="grid gap-x-6 gap-y-5 md:grid-cols-2">
              <TextField label="Name" value={form.name} onChange={(value) => setField(setForm, "name", value)} />
              <TextField label="Email" value={form.email} onChange={(value) => setField(setForm, "email", value)} />
              <TextField label={user ? "New password" : "Password"} value={form.password ?? ""} onChange={(value) => setField(setForm, "password", value)} />
              <FieldShell label="Role">
                <select className="h-11 rounded-xl border border-border/70 bg-background px-3 text-sm" value={form.role} onChange={(event) => setField(setForm, "role", event.target.value as AdminUserRole)}>
                  {adminUserRoles.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}
                </select>
              </FieldShell>
              <SwitchRow checked={form.status === "active"} label="Active" description="Active admin users can sign in when their role matches the admin surface." onChange={(checked) => setField(setForm, "status", checked ? "active" : "suspend")} />
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button type="submit" disabled={isSaving} className="rounded-md"><Save className={cn("size-4", isSaving && "animate-spin")} />Save admin user</Button>
              <Button type="button" variant="outline" onClick={onBack} className="rounded-md"><X className="size-4" />Cancel</Button>
            </div>
          </form>
        </MasterListUpsertCard>
      </MasterListUpsertLayout>
    </MasterListPageFrame>
  )
}

type TenantUserManagerState =
  | { mode: "list" }
  | { mode: "show"; user: TenantUserRecord }
  | { mode: "upsert"; user: TenantUserRecord | null; tenantId: number }

type TenantUserStatusFilter = "all" | AdminUserStatus
type TenantUserColumnId = "user" | "email" | "role" | "tenant" | "status" | "updated"

const tenantUserRoles: Array<{ value: TenantUserRole; label: string }> = [
  { value: "admin", label: "Admin" },
  { value: "manager", label: "Manager" },
  { value: "staff", label: "Staff" },
  { value: "user", label: "User" },
  { value: "software-admin", label: "Software admin" },
]

function TenantUserManagerPage({ mode, session }: { mode: UserManagerMode; session: AuthSession }) {
  const isPlatformMode = mode === "platform"
  const queryClient = useQueryClient()
  const sessionTenant: TenantUserTenantOption = {
    id: session.selectedTenant.id,
    code: session.selectedTenant.code,
    slug: session.selectedTenant.slug,
    name: session.selectedTenant.name,
    status: session.selectedTenant.status as TenantUserTenantOption["status"],
  }
  const tenantsQuery = useQuery({ enabled: isPlatformMode, queryKey: ["tenant-user-manager-tenants"], queryFn: () => listTenants(session) })
  const summariesQuery = useQuery({ enabled: isPlatformMode, queryKey: ["tenant-user-manager-summary"], queryFn: () => listTenantUserSummaries(session) })
  const tenants: TenantUserTenantOption[] = isPlatformMode ? tenantsQuery.data ?? [] : [sessionTenant]
  const summaries = summariesQuery.data ?? []
  const [selectedTenantId, setSelectedTenantId] = useState<number>(() => session.selectedTenant.id)
  const activeTenantId = tenants.some((tenant) => tenant.id === selectedTenantId) ? selectedTenantId : tenants[0]?.id ?? session.selectedTenant.id
  const usersQuery = useQuery({
    enabled: Boolean(activeTenantId),
    queryKey: ["tenant-user-manager", activeTenantId],
    queryFn: () => listTenantUsers(session, activeTenantId),
  })
  const upsertMutation = useMutation({ mutationFn: (input: TenantUserUpsertInput) => upsertTenantUser(session, input) })
  const [state, setState] = useState<TenantUserManagerState>({ mode: "list" })
  const users = usersQuery.data ?? []

  useEffect(() => {
    if (!tenants.some((tenant) => tenant.id === selectedTenantId) && tenants[0]) {
      setSelectedTenantId(tenants[0].id)
    }
  }, [selectedTenantId, tenants])

  useEffect(() => {
    const error = (isPlatformMode ? tenantsQuery.error ?? summariesQuery.error : null) ?? usersQuery.error
    if (error) {
      toast.error("Tenant user manager load failed", {
        description: error instanceof Error ? error.message : "Unable to load tenant users.",
      })
    }
  }, [isPlatformMode, summariesQuery.error, tenantsQuery.error, usersQuery.error])

  async function save(input: TenantUserUpsertInput) {
    const user = await upsertMutation.mutateAsync(input)
    toast.success(input.user_id ? "Tenant user updated" : "Tenant user created", {
      description: `${user.name} can access ${user.tenant_name} as ${roleLabel(user.role)}.`,
    })
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["tenant-user-manager", user.tenant_id] }),
      isPlatformMode ? queryClient.invalidateQueries({ queryKey: ["tenant-user-manager-summary"] }) : Promise.resolve(),
    ])
    setSelectedTenantId(user.tenant_id)
    setState({ mode: "show", user })
  }

  async function setTenantUserStatus(user: TenantUserRecord, status: AdminUserStatus) {
    try {
      await save({ ...toTenantUserInput(user), status })
    } catch (error) {
      toast.error("Tenant user status update failed", {
        description: error instanceof Error ? error.message : "Unable to update this tenant user.",
      })
    }
  }

  if (state.mode === "show") {
    return (
      <TenantUserShowPage
        user={state.user}
        onBack={() => setState({ mode: "list" })}
        onEdit={(user) => setState({ mode: "upsert", user, tenantId: user.tenant_id })}
      />
    )
  }

  if (state.mode === "upsert") {
    return (
      <TenantUserUpsertPage
        mode={mode}
        tenantId={state.tenantId}
        tenants={tenants}
        user={state.user}
        onBack={() => setState(state.user ? { mode: "show", user: state.user } : { mode: "list" })}
        onSubmit={save}
      />
    )
  }

  return (
    <TenantUserListPage
      isFetching={(isPlatformMode && (tenantsQuery.isFetching || summariesQuery.isFetching)) || usersQuery.isFetching}
      mode={mode}
      selectedTenantId={activeTenantId}
      summaries={summaries}
      tenants={tenants}
      users={users}
      onAdd={() => setState({ mode: "upsert", user: null, tenantId: activeTenantId })}
      onEdit={(user) => setState({ mode: "upsert", user, tenantId: user.tenant_id })}
      onRefresh={() => {
        if (isPlatformMode) {
          void tenantsQuery.refetch()
          void summariesQuery.refetch()
        }
        void usersQuery.refetch()
      }}
      onSelectTenant={(tenantId) => {
        setSelectedTenantId(tenantId)
        setState({ mode: "list" })
      }}
      onShow={(user) => setState({ mode: "show", user })}
      onStatusChange={setTenantUserStatus}
    />
  )
}

function TenantUserListPage({
  isFetching,
  mode,
  onAdd,
  onEdit,
  onRefresh,
  onSelectTenant,
  onShow,
  onStatusChange,
  selectedTenantId,
  summaries,
  tenants,
  users,
}: {
  isFetching: boolean
  mode: UserManagerMode
  onAdd(): void
  onEdit(user: TenantUserRecord): void
  onRefresh(): void
  onSelectTenant(tenantId: number): void
  onShow(user: TenantUserRecord): void
  onStatusChange(user: TenantUserRecord, status: AdminUserStatus): Promise<void>
  selectedTenantId: number
  summaries: TenantUserSummary[]
  tenants: TenantUserTenantOption[]
  users: TenantUserRecord[]
}) {
  const [searchValue, setSearchValue] = useState("")
  const [statusFilter, setStatusFilter] = useState<TenantUserStatusFilter>("all")
  const [currentPage, setCurrentPage] = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [visibleColumns, setVisibleColumns] = useState<Record<TenantUserColumnId, boolean>>({
    user: true,
    email: true,
    role: true,
    tenant: true,
    status: true,
    updated: true,
  })
  const selectedTenant = tenants.find((tenant) => tenant.id === selectedTenantId)
  const selectedSummary = summaries.find((summary) => summary.tenant_id === selectedTenantId)
  const filtered = useMemo(() => {
    const query = searchValue.trim().toLowerCase()
    return users.filter((user) => {
      const matchesStatus = statusFilter === "all" || user.status === statusFilter
      const matchesSearch = [user.name, user.email, user.role, user.status, user.tenant_name, user.tenant_slug].join(" ").toLowerCase().includes(query)
      return matchesStatus && matchesSearch
    })
  }, [searchValue, statusFilter, users])
  const totalPages = Math.max(1, Math.ceil(filtered.length / rowsPerPage))
  const pageRows = filtered.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage)

  return (
    <MasterListPageFrame
      title="Tenant Users"
      description="Create and review tenant-local users with role, status, tenant database context, and lifecycle controls."
      technicalName="page.tenant-user.list"
      action={
        <div className="flex flex-wrap items-center gap-2">
          <Button disabled={isFetching} onClick={onRefresh} type="button" variant="outline" className="h-9 rounded-md">
            <RefreshCw className={cn("size-4", isFetching && "animate-spin")} />
            Refresh
          </Button>
          <Button disabled={!selectedTenantId} onClick={onAdd} type="button" className="h-9 rounded-md">
            <Plus className="size-4" />
            New tenant user
          </Button>
        </div>
      }
    >
      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_15rem]">
        {mode === "platform" ? (
          <FieldShell label="Tenant">
            <select className="h-11 rounded-xl border border-border/70 bg-background px-3 text-sm" value={selectedTenantId || ""} onChange={(event) => { onSelectTenant(Number(event.target.value)); setCurrentPage(1) }}>
              {tenants.map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.code} - {tenant.name}</option>)}
            </select>
          </FieldShell>
        ) : (
          <div className="grid gap-2">
            <Label className="text-sm font-medium">Tenant</Label>
            <div className="flex h-11 items-center rounded-xl border border-border/70 bg-muted/30 px-3 text-sm font-medium">
              {selectedTenant ? `${selectedTenant.code} - ${selectedTenant.name}` : "Tenant workspace"}
            </div>
          </div>
        )}
        <div className="rounded-md border border-border/70 bg-card/95 px-4 py-2.5 text-sm shadow-sm">
          <div className="font-medium">{selectedTenant?.slug ?? "No tenant"}</div>
          <div className="text-xs text-muted-foreground">{selectedSummary?.user_count ?? users.length} users in tenant database</div>
        </div>
      </div>
      <MasterListToolbarCard
        columns={(Object.keys(visibleColumns) as TenantUserColumnId[]).map((column) => ({
          id: column,
          label: tenantUserColumnLabel(column),
          checked: visibleColumns[column],
          disabled: column === "user",
          onCheckedChange: (checked) => setVisibleColumns((current) => ({ ...current, [column]: checked })),
        }))}
        filterOptions={adminUserStatusFilters}
        filterValue={statusFilter}
        onFilterValueChange={(value) => { setStatusFilter(value as TenantUserStatusFilter); setCurrentPage(1) }}
        onSearchValueChange={(value) => { setSearchValue(value); setCurrentPage(1) }}
        onShowAllColumns={() => setVisibleColumns({ user: true, email: true, role: true, tenant: true, status: true, updated: true })}
        searchPlaceholder="Search tenant user, email, role, tenant, or status"
        searchValue={searchValue}
      />
      <MasterListTableCard>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[940px] border-collapse text-sm">
            <thead className="bg-muted/50">
              <tr>
                <ListHeader>#</ListHeader>
                {visibleColumns.user ? <ListHeader>Tenant user</ListHeader> : null}
                {visibleColumns.email ? <ListHeader>Email</ListHeader> : null}
                {visibleColumns.role ? <ListHeader>Role</ListHeader> : null}
                {visibleColumns.tenant ? <ListHeader>Tenant</ListHeader> : null}
                {visibleColumns.status ? <ListHeader>Status</ListHeader> : null}
                {visibleColumns.updated ? <ListHeader>Updated</ListHeader> : null}
                <ListHeader className="text-right">Action</ListHeader>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((user, index) => (
                <tr key={user.access_id} className={cn("border-b border-border/70", user.status === "suspend" && "bg-muted/20 text-muted-foreground")}>
                  <td className="px-4 py-2 text-muted-foreground">{(currentPage - 1) * rowsPerPage + index + 1}</td>
                  {visibleColumns.user ? (
                    <td className="px-4 py-2">
                      <button className="cursor-pointer font-medium hover:underline" onClick={() => onShow(user)} type="button">{user.name}</button>
                    </td>
                  ) : null}
                  {visibleColumns.email ? <td className="px-4 py-2 text-muted-foreground">{user.email}</td> : null}
                  {visibleColumns.role ? <td className="px-4 py-2 font-mono text-xs text-muted-foreground">{roleLabel(user.role)}</td> : null}
                  {visibleColumns.tenant ? (
                    <td className="px-4 py-2">
                      <div className="font-medium">{user.tenant_name}</div>
                      <div className="font-mono text-xs text-muted-foreground">{user.tenant_slug}</div>
                    </td>
                  ) : null}
                  {visibleColumns.status ? <td className="px-4 py-2"><StatusBadge status={user.status} /></td> : null}
                  {visibleColumns.updated ? <td className="px-4 py-2 text-muted-foreground">{formatDate(user.updated_at)}</td> : null}
                  <td className="px-4 py-1.5 text-right">
                    <MasterListRowActions
                      title={user.name}
                      isSuspended={user.status === "suspend"}
                      onDelete={() => void onStatusChange(user, "suspend")}
                      onEdit={() => onEdit(user)}
                      onRestore={() => void onStatusChange(user, "active")}
                      onView={() => onShow(user)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {pageRows.length === 0 ? <MasterListEmptyState>{isFetching ? "Loading tenant users from database." : "No tenant users found."}</MasterListEmptyState> : null}
      </MasterListTableCard>
      <MasterListPaginationCard
        page={currentPage}
        rowsPerPage={rowsPerPage}
        showingLabel={buildMasterListShowingLabel({ page: currentPage, pageSize: rowsPerPage, totalCount: filtered.length })}
        singularLabel="tenant users"
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

function TenantUserShowPage({ onBack, onEdit, user }: { onBack(): void; onEdit(user: TenantUserRecord): void; user: TenantUserRecord }) {
  return (
    <MasterListPageFrame
      title={user.name}
      description="Tenant-local user identity, tenant binding, and workspace access details."
      technicalName="page.tenant-user.show"
      action={
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={onBack} type="button" variant="outline" className="h-9 rounded-md"><ArrowLeft className="size-4" />Back</Button>
          <Button onClick={() => onEdit(user)} type="button" className="h-9 rounded-md"><UserRoundCog className="size-4" />Edit user</Button>
        </div>
      }
    >
      <MasterListShowCard title="Tenant user" className="gap-0 py-0 [&>div:first-child]:px-4 [&>div:first-child]:py-3">
        <DetailTable rows={[
          ["Name", user.name],
          ["Email", user.email],
          ["Role", roleLabel(user.role)],
          ["Tenant", `${user.tenant_name} (${user.tenant_slug})`],
          ["Tenant code", user.tenant_code],
          ["Status", <StatusBadge key="status" status={user.status} />],
          ["Access created", formatDate(user.access_created_at)],
          ["Created", formatDate(user.created_at)],
          ["Updated", formatDate(user.updated_at)],
        ]} />
      </MasterListShowCard>
    </MasterListPageFrame>
  )
}

function TenantUserUpsertPage({
  mode,
  onBack,
  onSubmit,
  tenantId,
  tenants,
  user,
}: {
  mode: UserManagerMode
  onBack(): void
  onSubmit(input: TenantUserUpsertInput): Promise<void>
  tenantId: number
  tenants: TenantUserTenantOption[]
  user: TenantUserRecord | null
}) {
  const [form, setForm] = useState<TenantUserUpsertInput>(() => user ? toTenantUserInput(user) : emptyTenantUser(tenantId))
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    setForm(user ? toTenantUserInput(user) : emptyTenantUser(tenantId))
  }, [tenantId, user])

  async function submit() {
    if (!form.tenant_id) {
      toast.error("Tenant is required")
      return
    }
    if (!form.name.trim() || !form.email.trim()) {
      toast.error("Name and email are required")
      return
    }
    if (!form.user_id && !form.password?.trim()) {
      toast.error("Password is required for new tenant users")
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
      title={user ? "Edit tenant user" : "New tenant user"}
      description={user ? "Update tenant user identity, tenant database access, role, and status." : "Create a tenant-local workspace user for the selected tenant database."}
      technicalName="page.tenant-user.upsert"
      action={<Button type="button" variant="outline" onClick={onBack} className="rounded-md"><X className="size-4" />Cancel</Button>}
    >
      <MasterListUpsertLayout>
        <MasterListUpsertCard title="Tenant user" description="Tenant users live in the tenant database and are separate from platform admin identities.">
          <form className="space-y-5" onSubmit={(event) => { event.preventDefault(); void submit() }}>
            <div className="grid gap-x-6 gap-y-5 md:grid-cols-2">
              <FieldShell label="Tenant">
                {mode === "platform" ? (
                  <select className="h-11 rounded-xl border border-border/70 bg-background px-3 text-sm" value={form.tenant_id} onChange={(event) => setTenantUserField(setForm, "tenant_id", Number(event.target.value))}>
                    {tenants.map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.code} - {tenant.name}</option>)}
                  </select>
                ) : (
                  <div className="flex h-11 items-center rounded-xl border border-border/70 bg-muted/30 px-3 text-sm font-medium">
                    {tenants[0] ? `${tenants[0].code} - ${tenants[0].name}` : "Tenant workspace"}
                  </div>
                )}
              </FieldShell>
              <TextField label="Name" value={form.name} onChange={(value) => setTenantUserField(setForm, "name", value)} />
              <TextField label="Email" value={form.email} onChange={(value) => setTenantUserField(setForm, "email", value)} />
              <TextField label={user ? "New password" : "Password"} value={form.password ?? ""} onChange={(value) => setTenantUserField(setForm, "password", value)} />
              <FieldShell label="Role">
                <select className="h-11 rounded-xl border border-border/70 bg-background px-3 text-sm" value={form.role} onChange={(event) => setTenantUserField(setForm, "role", event.target.value as TenantUserRole)}>
                  {tenantUserRoles.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}
                </select>
              </FieldShell>
              <SwitchRow checked={form.status === "active"} label="Active" description="Active tenant users can sign in to the selected tenant workspace." onChange={(checked) => setTenantUserField(setForm, "status", checked ? "active" : "suspend")} />
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button type="submit" disabled={isSaving} className="rounded-md"><Save className={cn("size-4", isSaving && "animate-spin")} />Save tenant user</Button>
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

function AdminUserShowCard({ children, title }: { children: ReactNode; title: string }) {
  return <MasterListShowCard title={title} className="gap-0 py-0 [&>div:first-child]:px-4 [&>div:first-child]:py-3">{children}</MasterListShowCard>
}

function FieldShell({ children, label }: { children: ReactNode; label: string }) {
  return <div className="grid gap-2"><Label className="text-sm font-medium">{label}</Label>{children}</div>
}

function TextField({ label, onChange, value }: { label: string; value: string | number | null; onChange(value: string): void }) {
  return <FieldShell label={label}><Input className="h-11 rounded-xl" value={value ?? ""} onChange={(event) => onChange(event.target.value)} /></FieldShell>
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

function StatusBadge({ status }: { status: AdminUserStatus }) {
  return <Badge variant="outline" className={cn("h-6 w-fit gap-1 rounded-md px-2 text-[11px]", status === "active" && "border-emerald-200 bg-emerald-50 text-emerald-700", status === "suspend" && "border-amber-200 bg-amber-50 text-amber-700", status === "inactive" && "border-slate-200 bg-slate-50 text-slate-600")}>{status === "active" ? <CheckCircle2 className="size-3" /> : null}{status}</Badge>
}

function ListHeader({ children, className }: { children: ReactNode; className?: string }) {
  return <th className={cn("border-b border-border/70 px-4 py-3.5 text-left font-medium text-foreground", className)}>{children}</th>
}

function setField<K extends keyof AdminUserUpsertInput>(setForm: Dispatch<SetStateAction<AdminUserUpsertInput>>, key: K, value: AdminUserUpsertInput[K]) {
  setForm((current) => ({ ...current, [key]: value }))
}

function adminUserColumnLabel(column: AdminUserColumnId) {
  return ({ user: "Admin user", email: "Email", role: "Role", status: "Status", updated: "Updated" })[column]
}

function tenantUserColumnLabel(column: TenantUserColumnId) {
  return ({ user: "Tenant user", email: "Email", role: "Role", tenant: "Tenant", status: "Status", updated: "Updated" })[column]
}

function setTenantUserField<K extends keyof TenantUserUpsertInput>(setForm: Dispatch<SetStateAction<TenantUserUpsertInput>>, key: K, value: TenantUserUpsertInput[K]) {
  setForm((current) => ({ ...current, [key]: value }))
}

function roleLabel(role: string) {
  return role.split("-").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ")
}

function formatDate(value: string) {
  if (!value) return "Not set"
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value))
}
