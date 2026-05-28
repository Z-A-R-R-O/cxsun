import { useEffect, useMemo, useState, type Dispatch, type FormEvent, type ReactNode, type SetStateAction } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { ArrowLeft, CheckCircle2, Globe2, Pencil, Plus, RefreshCw, RotateCcw, Save, Trash2, X } from "lucide-react"
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
import { listTenants } from "src/features/tenant/infrastructure/tenant-api"
import { cn } from "src/lib/utils"
import { apiBaseUrl, authHeaders, type AuthSession } from "src/features/auth/auth-client"

type TenantDomainStatus = "active" | "not_active" | "suspend"
type TenantDomainRoute =
  | { mode: "list" }
  | { mode: "new" }
  | { mode: "show"; id: number }
  | { mode: "edit"; id: number }

interface TenantDomainRecord {
  id: number
  tenant_id: number
  tenant_slug: string
  tenant_name: string
  domain: string
  label: string
  is_primary: number
  status: TenantDomainStatus
  settings: string
  created_at: string
  updated_at: string
  deleted_at: string | null
}

interface TenantDomainForm {
  id?: number
  tenant_id: number
  domain: string
  label: string
  is_primary: boolean
  status: TenantDomainStatus
  settings: string
}

async function listDomains(session: AuthSession) {
  const response = await fetch(`${apiBaseUrl}/api/v1/tenant-domains`, {
    cache: "no-store",
    headers: authHeaders(session),
  })

  if (!response.ok) {
    throw new Error(`Domain list failed with status ${response.status}.`)
  }

  return (await response.json()) as TenantDomainRecord[]
}

async function upsertDomain(session: AuthSession, input: TenantDomainForm) {
  const response = await fetch(`${apiBaseUrl}/api/v1/tenant-domains/upsert`, {
    body: JSON.stringify(input),
    cache: "no-store",
    headers: {
      ...authHeaders(session),
      "Content-Type": "application/json",
    },
    method: "POST",
  })

  const result = await response
    .json()
    .catch(() => null) as { ok?: boolean; domain?: TenantDomainRecord; error?: string; message?: string } | null

  if (!response.ok) {
    throw new Error(result?.error ?? result?.message ?? `Domain save failed with status ${response.status}.`)
  }

  if (!result?.ok || !result.domain) {
    throw new Error(result?.error ?? "Domain save failed.")
  }

  return result.domain
}

export function TenantDomainPage({ session }: { session: AuthSession }) {
  const [route, setRoute] = useState<TenantDomainRoute>(() => tenantDomainRouteFromPath())
  const domainsQuery = useQuery({ queryKey: ["tenant-domains", session.selectedTenant.slug], queryFn: () => listDomains(session) })
  const queryClient = useQueryClient()
  const upsertMutation = useMutation({ mutationFn: (input: TenantDomainForm) => upsertDomain(session, input) })
  const domains = domainsQuery.data ?? []

  useEffect(() => {
    function syncRoute() {
      setRoute(tenantDomainRouteFromPath())
    }

    window.addEventListener("popstate", syncRoute)
    return () => window.removeEventListener("popstate", syncRoute)
  }, [])

  useEffect(() => {
    if (domainsQuery.error) {
      toast.error("Domain load failed", {
        description: domainsQuery.error instanceof Error ? domainsQuery.error.message : "Unable to load domains.",
      })
    }
  }, [domainsQuery.error])

  function navigate(nextRoute: TenantDomainRoute) {
    window.history.pushState(null, "", tenantDomainPath(nextRoute))
    setRoute(nextRoute)
  }

  async function changeStatus(domain: TenantDomainRecord, status: TenantDomainStatus) {
    const nextDomain = await upsertMutation.mutateAsync({ ...toForm(domain), status })
    toast.success(status === "suspend" ? "Domain suspended" : "Domain restored", {
      description: `${nextDomain.domain} is now ${status === "suspend" ? "suspended" : "active"}.`,
    })
    await queryClient.invalidateQueries({ queryKey: ["tenant-domains", session.selectedTenant.slug] })
  }

  if (route.mode === "new") {
    return <TenantDomainUpsertPage domains={domains} mode="new" session={session} onBack={() => navigate({ mode: "list" })} onSaved={(domain) => navigate({ mode: "show", id: domain.id })} />
  }

  if (route.mode === "edit") {
    const domain = domains.find((record) => record.id === route.id)
    return <TenantDomainUpsertPage domain={domain} domains={domains} isLoading={domainsQuery.isFetching} mode="edit" session={session} onBack={() => navigate({ mode: "show", id: route.id })} onSaved={(savedDomain) => navigate({ mode: "show", id: savedDomain.id })} />
  }

  if (route.mode === "show") {
    const domain = domains.find((record) => record.id === route.id)
    return (
      <TenantDomainShowPage
        domain={domain}
        isLoading={domainsQuery.isFetching}
        onBack={() => navigate({ mode: "list" })}
        onEdit={() => navigate({ mode: "edit", id: route.id })}
        onRestore={() => { if (domain) void changeStatus(domain, "active") }}
        onSuspend={() => { if (domain) void changeStatus(domain, "suspend") }}
      />
    )
  }

  return (
    <TenantDomainMasterListPage
      domains={domains}
      isFetching={domainsQuery.isFetching}
      onCreate={() => navigate({ mode: "new" })}
      onEdit={(domain) => navigate({ mode: "edit", id: domain.id })}
      onRefresh={() => void domainsQuery.refetch()}
      onRestore={(domain) => void changeStatus(domain, "active")}
      onShow={(domain) => navigate({ mode: "show", id: domain.id })}
      onSuspend={(domain) => void changeStatus(domain, "suspend")}
    />
  )
}

function TenantDomainMasterListPage({
  domains,
  isFetching,
  onCreate,
  onEdit,
  onRefresh,
  onRestore,
  onShow,
  onSuspend,
}: {
  domains: TenantDomainRecord[]
  isFetching: boolean
  onCreate(): void
  onEdit(domain: TenantDomainRecord): void
  onRefresh(): void
  onRestore(domain: TenantDomainRecord): void
  onShow(domain: TenantDomainRecord): void
  onSuspend(domain: TenantDomainRecord): void
}) {
  const [searchValue, setSearchValue] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [currentPage, setCurrentPage] = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState(10)

  const filteredDomains = useMemo(() => {
    const query = searchValue.trim().toLowerCase()
    return domains.filter((domain) => {
      const matchesStatus = statusFilter === "all" || domain.status === statusFilter
      const target = [
        domain.domain,
        domain.label,
        domain.tenant_name,
        domain.tenant_slug,
        domain.status,
      ].join(" ").toLowerCase()
      return matchesStatus && (!query || target.includes(query))
    })
  }, [domains, searchValue, statusFilter])

  const totalPages = Math.max(1, Math.ceil(filteredDomains.length / rowsPerPage))
  const pageDomains = filteredDomains.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage)

  return (
    <MasterListPageFrame
      title="Tenant Domains"
      description="Master list for public domains and local hosts mapped to platform tenants."
      technicalName="page.tenant-domain.master-list"
      action={
        <div className="flex items-center gap-2">
          <Button disabled={isFetching} onClick={onRefresh} type="button" variant="outline" className="h-9 rounded-md">
            <RefreshCw className={cn("size-4", isFetching && "animate-spin")} />
            Refresh
          </Button>
          <Button onClick={onCreate} type="button" className="h-9 rounded-md">
            <Plus className="size-4" />
            New domain
          </Button>
        </div>
      }
    >
      <MasterListToolbarCard
        filterOptions={[
          { id: "all", label: "All domains" },
          { id: "active", label: "Active" },
          { id: "not_active", label: "Not active" },
          { id: "suspend", label: "Suspended" },
        ]}
        filterValue={statusFilter}
        onFilterValueChange={(value) => { setStatusFilter(value); setCurrentPage(1) }}
        onSearchValueChange={(value) => { setSearchValue(value); setCurrentPage(1) }}
        searchPlaceholder="Search domain, label, tenant, or status"
        searchValue={searchValue}
      />
      <MasterListTableCard>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] border-collapse text-sm">
            <thead className="bg-muted/50">
              <tr>
                <ListHeader>#</ListHeader>
                <ListHeader>Domain</ListHeader>
                <ListHeader>Tenant</ListHeader>
                <ListHeader>Label</ListHeader>
                <ListHeader>Primary</ListHeader>
                <ListHeader>Status</ListHeader>
                <ListHeader>Updated</ListHeader>
                <ListHeader className="text-right">Action</ListHeader>
              </tr>
            </thead>
            <tbody>
              {pageDomains.map((domain, index) => (
                <tr className="border-b border-border/70" key={domain.id}>
                  <td className="px-4 py-2 text-muted-foreground">{(currentPage - 1) * rowsPerPage + index + 1}</td>
                  <td className="px-4 py-2">
                    <button className="flex items-center gap-2 font-medium text-foreground transition-colors hover:text-primary" onClick={() => onShow(domain)} type="button">
                      <Globe2 className="size-4 text-primary" />
                      {domain.domain}
                    </button>
                  </td>
                  <td className="px-4 py-2">
                    <div className="font-medium">{domain.tenant_name}</div>
                    <div className="font-mono text-xs text-muted-foreground">{domain.tenant_slug}</div>
                  </td>
                  <td className="px-4 py-2 text-muted-foreground">{domain.label}</td>
                  <td className="px-4 py-2">{domain.is_primary ? "Yes" : "No"}</td>
                  <td className="px-4 py-2"><DomainStatusBadge status={domain.status} /></td>
                  <td className="px-4 py-2 text-muted-foreground">{formatDate(domain.updated_at)}</td>
                  <td className="px-4 py-1.5 text-right">
                    <MasterListRowActions
                      title={domain.domain}
                      isSuspended={domain.status === "suspend"}
                      onDelete={() => onSuspend(domain)}
                      onEdit={() => onEdit(domain)}
                      onRestore={() => onRestore(domain)}
                      onView={() => onShow(domain)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {pageDomains.length === 0 ? (
          <MasterListEmptyState>{isFetching ? "Loading domains." : "No domains found."}</MasterListEmptyState>
        ) : null}
      </MasterListTableCard>
      <MasterListPaginationCard
        page={currentPage}
        rowsPerPage={rowsPerPage}
        showingLabel={buildMasterListShowingLabel({ page: currentPage, pageSize: rowsPerPage, totalCount: filteredDomains.length })}
        singularLabel="domains"
        totalCount={filteredDomains.length}
        totalPages={totalPages}
        onNextPage={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
        onPageChange={setCurrentPage}
        onPreviousPage={() => setCurrentPage((page) => Math.max(1, page - 1))}
        onRowsPerPageChange={(value) => { setRowsPerPage(value); setCurrentPage(1) }}
      />
    </MasterListPageFrame>
  )
}

function TenantDomainShowPage({
  domain,
  isLoading,
  onBack,
  onEdit,
  onRestore,
  onSuspend,
}: {
  domain?: TenantDomainRecord
  isLoading: boolean
  onBack(): void
  onEdit(): void
  onRestore(): void
  onSuspend(): void
}) {
  return (
    <MasterListPageFrame
      title={domain ? domain.domain : "Tenant Domain"}
      description="Review tenant domain mapping, status, and resolver settings."
      technicalName="page.tenant-domain.show"
      action={
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={onBack} type="button" variant="outline" className="h-9 rounded-md">
            <ArrowLeft className="size-4" />
            Back
          </Button>
          {domain ? (
            <Button onClick={onEdit} type="button" className="h-9 rounded-md">
              <Pencil className="size-4" />
              Edit
            </Button>
          ) : null}
          {domain && domain.status === "suspend" ? (
            <Button onClick={onRestore} type="button" variant="outline" className="h-9 rounded-md">
              <RotateCcw className="size-4" />
              Restore
            </Button>
          ) : domain ? (
            <Button onClick={onSuspend} type="button" variant="destructive" className="h-9 rounded-md">
              <Trash2 className="size-4" />
              Suspend
            </Button>
          ) : null}
        </div>
      }
    >
      {!domain ? (
        <MasterListTableCard>
          <MasterListEmptyState>{isLoading ? "Loading domain." : "Domain was not found."}</MasterListEmptyState>
        </MasterListTableCard>
      ) : (
        <div className="grid gap-4 xl:grid-cols-[1fr_0.8fr]">
          <DomainShowCard title="Domain mapping">
            <DetailTable
              rows={[
                ["Domain", <span key="domain" className="font-mono">{domain.domain}</span>],
                ["Label", domain.label],
                ["Tenant", `${domain.tenant_name} (${domain.tenant_slug})`],
                ["Primary", domain.is_primary ? "Yes" : "No"],
                ["Status", <DomainStatusBadge key="status" status={domain.status} />],
                ["Updated", formatDate(domain.updated_at)],
                ["Created", formatDate(domain.created_at)],
                ["Suspended at", formatDate(domain.deleted_at)],
              ]}
            />
          </DomainShowCard>
          <DomainShowCard title="Resolver settings">
            <DetailTable
              rows={[
                ["Settings JSON", <pre key="settings" className="max-h-[420px] overflow-auto whitespace-pre-wrap rounded-md bg-muted/40 p-3 text-xs leading-6 text-muted-foreground">{formatJson(domain.settings)}</pre>],
              ]}
            />
          </DomainShowCard>
        </div>
      )}
    </MasterListPageFrame>
  )
}

function TenantDomainUpsertPage({
  domain,
  domains,
  isLoading = false,
  mode,
  onBack,
  onSaved,
  session,
}: {
  domain?: TenantDomainRecord
  domains: TenantDomainRecord[]
  isLoading?: boolean
  mode: "new" | "edit"
  onBack(): void
  onSaved(domain: TenantDomainRecord): void
  session: AuthSession
}) {
  const queryClient = useQueryClient()
  const tenantsQuery = useQuery({ queryKey: ["tenants", session.selectedTenant.slug], queryFn: () => listTenants(session) })
  const upsertMutation = useMutation({ mutationFn: (input: TenantDomainForm) => upsertDomain(session, input) })
  const tenants = tenantsQuery.data ?? []
  const [form, setForm] = useState<TenantDomainForm>(() => domain ? toForm(domain) : emptyForm(tenants[0]?.id))

  useEffect(() => {
    setForm(domain ? toForm(domain) : emptyForm(tenants[0]?.id))
  }, [domain, tenants])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!form.tenant_id) {
      toast.error("Tenant is required")
      return
    }
    if (!form.domain.trim()) {
      toast.error("Domain is required")
      return
    }
    if (!isJsonObject(form.settings)) {
      toast.error("Settings must be a JSON object")
      return
    }

    const savedDomain = await upsertMutation.mutateAsync(form)
    toast.success(form.id ? "Domain updated" : "Domain created", {
      description: `${savedDomain.domain} is mapped to ${savedDomain.tenant_name}.`,
    })
    await queryClient.invalidateQueries({ queryKey: ["tenant-domains", session.selectedTenant.slug] })
    onSaved(savedDomain)
  }

  if (mode === "edit" && !domain) {
    return (
      <MasterListPageFrame
        title="Edit Domain"
        description="Update an existing tenant domain mapping."
        technicalName="page.tenant-domain.edit-missing"
        action={<BackButton onBack={onBack} />}
      >
        <MasterListTableCard>
          <MasterListEmptyState>{isLoading ? "Loading domain." : "Domain was not found."}</MasterListEmptyState>
        </MasterListTableCard>
      </MasterListPageFrame>
    )
  }

  return (
    <MasterListPageFrame
      title={mode === "new" ? "New Tenant Domain" : "Edit Tenant Domain"}
      description={mode === "new" ? "Create a tenant domain mapping from a dedicated page." : "Update tenant domain mapping from a dedicated page."}
      technicalName={mode === "new" ? "page.tenant-domain.create" : "page.tenant-domain.edit"}
      action={<BackButton onBack={onBack} />}
    >
      <MasterListUpsertLayout>
      <MasterListUpsertCard title="Domain mapping" description="Map a domain or host name to a tenant. The resolver normalizes protocol, paths, and ports.">
        <form className="space-y-6" onSubmit={submit}>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Tenant">
              <select
                className="h-11 rounded-xl border border-border/70 bg-background px-3 text-sm"
                value={form.tenant_id || ""}
                onChange={(event) => setFormField(setForm, "tenant_id", Number(event.target.value))}
              >
                <option value="" disabled>Select tenant</option>
                {tenants.map((tenant) => (
                  <option key={tenant.id} value={tenant.id}>
                    {tenant.name} ({tenant.slug})
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Domain">
              <Input className="h-11 rounded-xl font-mono" value={form.domain} onChange={(event) => setFormField(setForm, "domain", event.target.value)} placeholder="example.com" />
            </Field>
            <Field label="Label">
              <Input className="h-11 rounded-xl" value={form.label} onChange={(event) => setFormField(setForm, "label", event.target.value)} placeholder="Primary storefront" />
            </Field>
            <Field label="Status">
              <select
                className="h-11 rounded-xl border border-border/70 bg-background px-3 text-sm"
                value={form.status}
                onChange={(event) => setFormField(setForm, "status", event.target.value as TenantDomainStatus)}
              >
                <option value="active">Active</option>
                <option value="not_active">Not active</option>
                <option value="suspend">Suspended</option>
              </select>
            </Field>
          </div>
          <label className={cn("flex cursor-pointer items-center justify-between gap-4 rounded-xl border px-4 py-3", form.is_primary ? "border-emerald-200 bg-emerald-50 text-emerald-950" : "border-border/70 bg-muted/10")}>
            <span>
              <span className="flex items-center gap-1.5 text-sm font-medium">{form.is_primary ? <CheckCircle2 className="size-3.5 text-emerald-600" /> : null}Primary domain</span>
              <span className={cn("block text-xs", form.is_primary ? "text-emerald-700" : "text-muted-foreground")}>Marks this as the main domain for the tenant.</span>
            </span>
            <Switch checked={form.is_primary} onCheckedChange={(checked) => setFormField(setForm, "is_primary", checked)} />
          </label>
          <Field label="Settings JSON">
            <textarea
              className="min-h-36 rounded-xl border border-border/70 bg-background p-3 font-mono text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={form.settings}
              onChange={(event) => setFormField(setForm, "settings", event.target.value)}
            />
          </Field>
          <div className="flex flex-wrap justify-between gap-2">
            <p className="text-xs text-muted-foreground">
              Existing domains in master list: {domains.length}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" className="rounded-md" onClick={onBack}>
                <X className="size-4" />
                Cancel
              </Button>
              <Button type="submit" disabled={upsertMutation.isPending} className="rounded-md">
                <Save className={cn("size-4", upsertMutation.isPending && "animate-spin")} />
                Save domain
              </Button>
            </div>
          </div>
        </form>
      </MasterListUpsertCard>
      </MasterListUpsertLayout>
    </MasterListPageFrame>
  )
}

function BackButton({ onBack }: { onBack(): void }) {
  return (
    <Button onClick={onBack} type="button" variant="outline" className="h-9 rounded-md">
      <ArrowLeft className="size-4" />
      Back
    </Button>
  )
}

function emptyForm(tenantId = 0): TenantDomainForm {
  return {
    tenant_id: tenantId,
    domain: "",
    label: "",
    is_primary: false,
    status: "active",
    settings: JSON.stringify({ landing: { mode: "tenant" } }, null, 2),
  }
}

function toForm(domain: TenantDomainRecord): TenantDomainForm {
  return {
    id: domain.id,
    tenant_id: domain.tenant_id,
    domain: domain.domain,
    label: domain.label,
    is_primary: Boolean(domain.is_primary),
    status: domain.status,
    settings: formatJson(domain.settings),
  }
}

function DomainStatusBadge({ status }: { status: TenantDomainStatus }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "h-6 w-fit gap-1 rounded-md px-2 text-[11px]",
        status === "active" && "border-emerald-200 bg-emerald-50 text-emerald-700",
        status === "suspend" && "border-amber-200 bg-amber-50 text-amber-700",
        status === "not_active" && "border-slate-200 bg-slate-50 text-slate-600",
      )}
    >
      {status === "active" ? <CheckCircle2 className="size-3" /> : null}
      {status.replace("_", " ")}
    </Badge>
  )
}

function DetailTable({ rows }: { rows: Array<[string, ReactNode]> }) {
  return (
    <div className="-mx-5 -mb-5 -mt-5 overflow-hidden rounded-b-md border-t border-border/70">
      <table className="w-full border-collapse text-sm">
        <tbody>
          {rows.map(([label, value]) => (
            <tr key={label} className="border-b border-border/60 last:border-b-0">
              <th className="w-40 border-r border-border/70 bg-muted/35 px-3 py-2.5 text-left align-top text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {label}
              </th>
              <td className="px-3 py-2.5 align-top font-medium text-foreground">
                {value || "Not set"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function DomainShowCard({ children, title }: { children: ReactNode; title: string }) {
  return (
    <MasterListShowCard title={title} className="gap-0 py-0 [&>div:first-child]:px-4 [&>div:first-child]:py-3">
      {children}
    </MasterListShowCard>
  )
}

function Field({ children, label }: { children: ReactNode; label: string }) {
  return (
    <div className="grid gap-2">
      <Label className="text-sm font-medium">{label}</Label>
      {children}
    </div>
  )
}

function ListHeader({ children, className }: { children: ReactNode; className?: string }) {
  return <th className={cn("border-b border-border/70 px-4 py-3.5 text-left font-medium text-foreground", className)}>{children}</th>
}

function tenantDomainRouteFromPath(pathname = window.location.pathname): TenantDomainRoute {
  const segments = pathname.split("/").filter(Boolean)
  const tenantDomainIndex = segments.indexOf("tenant-domain")
  const first = tenantDomainIndex >= 0 ? segments[tenantDomainIndex + 1] : undefined
  const second = tenantDomainIndex >= 0 ? segments[tenantDomainIndex + 2] : undefined

  if (first === "new") {
    return { mode: "new" }
  }

  const id = Number(first)
  if (Number.isInteger(id) && id > 0) {
    return second === "edit" ? { mode: "edit", id } : { mode: "show", id }
  }

  return { mode: "list" }
}

function tenantDomainPath(route: TenantDomainRoute) {
  if (route.mode === "new") return "/sa/tenant-domain/new"
  if (route.mode === "show") return `/sa/tenant-domain/${route.id}`
  if (route.mode === "edit") return `/sa/tenant-domain/${route.id}/edit`
  return "/sa/tenant-domain"
}

function formatDate(value: string | null) {
  if (!value) return "Not set"
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString()
}

function formatJson(value: string) {
  try {
    return JSON.stringify(JSON.parse(value), null, 2)
  } catch {
    return value || "{}"
  }
}

function isJsonObject(value: string) {
  try {
    const parsed = JSON.parse(value) as unknown
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
  } catch {
    return false
  }
}

function setFormField<K extends keyof TenantDomainForm>(
  setForm: Dispatch<SetStateAction<TenantDomainForm>>,
  key: K,
  value: TenantDomainForm[K],
) {
  setForm((current) => ({ ...current, [key]: value }))
}
