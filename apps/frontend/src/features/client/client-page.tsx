import { useEffect, useMemo, useState, type Dispatch, type ReactNode, type SetStateAction } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { ArrowLeft, CheckCircle2, Plus, RefreshCw, RotateCcw, Save, Trash2, X } from "lucide-react"
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
  MasterListShowLayout,
  MasterListTableCard,
  MasterListToolbarCard,
  MasterListUpsertCard,
  MasterListUpsertLayout,
  buildMasterListShowingLabel,
} from "src/components/blocks/lists/master-list"
import { cn } from "src/lib/utils"
import { destroyClient, emptyClient, listClients, restoreClient, toClientInput, upsertClient, type ClientRecord, type ClientUpsertInput } from "./client-client"

export function ClientPage() {
  const queryClient = useQueryClient()
  const [searchValue, setSearchValue] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [currentPage, setCurrentPage] = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [selectedClient, setSelectedClient] = useState<ClientRecord | null>(null)
  const [editing, setEditing] = useState<ClientRecord | null>(null)
  const [creating, setCreating] = useState(false)
  const clientsQuery = useQuery({ queryKey: ["clients"], queryFn: listClients })
  const upsertMutation = useMutation({ mutationFn: upsertClient })
  const clients = clientsQuery.data ?? []

  useEffect(() => {
    if (clientsQuery.error) {
      toast.error("Client load failed", {
        description: clientsQuery.error instanceof Error ? clientsQuery.error.message : "Unable to load clients.",
      })
    }
  }, [clientsQuery.error])

  const filteredClients = useMemo(() => {
    const query = searchValue.trim().toLowerCase()
    return clients.filter((client) => {
      const matchesStatus = statusFilter === "all" || client.status === statusFilter
      const target = [client.name, client.company_name, client.category, client.source, client.phone, client.email, client.location, client.notes, client.status].filter(Boolean).join(" ").toLowerCase()
      return matchesStatus && (!query || target.includes(query))
    })
  }, [clients, searchValue, statusFilter])
  const totalPages = Math.max(1, Math.ceil(filteredClients.length / rowsPerPage))
  const pageClients = filteredClients.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage)

  async function save(input: ClientUpsertInput) {
    const client = await upsertMutation.mutateAsync(input)
    toast.success(input.id ? "Client note updated" : "Client note created", {
      description: `${client.name} is stored in the independent client manager.`,
    })
    await queryClient.invalidateQueries({ queryKey: ["clients"] })
    setEditing(null)
    setCreating(false)
    setSelectedClient(null)
  }

  async function destroy(client: ClientRecord) {
    await destroyClient(client.id)
    toast.error("Client note suspended", { description: `${client.name} is hidden from active notes.` })
    await queryClient.invalidateQueries({ queryKey: ["clients"] })
  }

  async function restore(client: ClientRecord) {
    await restoreClient(client.id)
    toast.success("Client note restored", { description: `${client.name} is active again.` })
    await queryClient.invalidateQueries({ queryKey: ["clients"] })
  }

  if (creating || editing) {
    return <ClientUpsertPage client={editing} onBack={() => { setCreating(false); setEditing(null) }} onSubmit={save} />
  }

  if (selectedClient) {
    return (
      <ClientShowPage
        client={selectedClient}
        onBack={() => setSelectedClient(null)}
        onDestroy={() => void destroy(selectedClient)}
        onEdit={() => {
          setEditing(selectedClient)
          setSelectedClient(null)
        }}
        onRestore={() => void restore(selectedClient)}
      />
    )
  }

  return (
    <MasterListPageFrame
      title="Client Manager"
      description="Independent scratch information center for clients, leads, memories, and loose notes."
      technicalName="page.client.list"
      action={
        <div className="flex items-center gap-2">
          <Button disabled={clientsQuery.isFetching} onClick={() => void clientsQuery.refetch()} type="button" variant="outline" className="h-9 rounded-md">
            <RefreshCw className={cn("size-4", clientsQuery.isFetching && "animate-spin")} />
            Refresh
          </Button>
          <Button onClick={() => setCreating(true)} type="button" className="h-9 rounded-md">
            <Plus className="size-4" />
            New client note
          </Button>
        </div>
      }
    >
      <MasterListToolbarCard
        filterOptions={[{ id: "all", label: "All clients" }, { id: "active", label: "Active" }, { id: "inactive", label: "Inactive" }, { id: "suspend", label: "Suspended" }]}
        filterValue={statusFilter}
        onFilterValueChange={(value) => { setStatusFilter(value); setCurrentPage(1) }}
        onSearchValueChange={(value) => { setSearchValue(value); setCurrentPage(1) }}
        searchPlaceholder="Search client, company, phone, email, location, or note"
        searchValue={searchValue}
      />
      <MasterListTableCard>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] border-collapse text-sm">
            <thead className="bg-muted/50">
              <tr>
                <ListHeader>#</ListHeader>
                <ListHeader>Client</ListHeader>
                <ListHeader>Company</ListHeader>
                <ListHeader>Category</ListHeader>
                <ListHeader>Contact</ListHeader>
                <ListHeader>Location</ListHeader>
                <ListHeader>Status</ListHeader>
                <ListHeader className="text-right">Action</ListHeader>
              </tr>
            </thead>
            <tbody>
              {pageClients.map((client, index) => (
                <tr key={client.id} className="border-b border-border/70">
                  <td className="px-4 py-2 text-muted-foreground">{(currentPage - 1) * rowsPerPage + index + 1}</td>
                  <td className="px-4 py-2">
                    <button className="font-medium text-foreground transition-colors hover:text-primary" onClick={() => setSelectedClient(client)} type="button">{client.name}</button>
                    <div className="max-w-[260px] truncate text-xs text-muted-foreground">{client.notes || "No note"}</div>
                  </td>
                  <td className="px-4 py-2 text-muted-foreground">{client.company_name || "Not set"}</td>
                  <td className="px-4 py-2 text-muted-foreground">{client.category || "scratch"}</td>
                  <td className="px-4 py-2 text-muted-foreground">{client.phone || client.email || "Not set"}</td>
                  <td className="px-4 py-2 text-muted-foreground">{client.location || "Not set"}</td>
                  <td className="px-4 py-2"><StatusBadge status={client.status} /></td>
                  <td className="px-4 py-1.5 text-right">
                    <ClientActions client={client} onDestroy={destroy} onEdit={setEditing} onRestore={restore} onView={setSelectedClient} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {pageClients.length === 0 ? <MasterListEmptyState>{clientsQuery.isFetching ? "Loading client notes." : "No client notes found."}</MasterListEmptyState> : null}
      </MasterListTableCard>
      <MasterListPaginationCard
        page={currentPage}
        rowsPerPage={rowsPerPage}
        showingLabel={buildMasterListShowingLabel({ page: currentPage, pageSize: rowsPerPage, totalCount: filteredClients.length })}
        singularLabel="clients"
        totalCount={filteredClients.length}
        totalPages={totalPages}
        onNextPage={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
        onPageChange={setCurrentPage}
        onPreviousPage={() => setCurrentPage((page) => Math.max(1, page - 1))}
        onRowsPerPageChange={(value) => { setRowsPerPage(value); setCurrentPage(1) }}
      />
    </MasterListPageFrame>
  )
}

function ClientShowPage({
  client,
  onBack,
  onDestroy,
  onEdit,
  onRestore,
}: {
  client: ClientRecord
  onBack(): void
  onDestroy(): void
  onEdit(): void
  onRestore(): void
}) {
  return (
    <MasterListPageFrame
      title={client.name}
      description={client.company_name || "Client manager scratch note and contact details."}
      technicalName="page.client.show"
      action={
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={onBack} type="button" variant="outline" className="h-9 rounded-md"><ArrowLeft className="size-4" />Back</Button>
          <Button onClick={onEdit} type="button" className="h-9 rounded-md">Edit</Button>
          {client.status === "suspend" ? (
            <Button onClick={onRestore} type="button" variant="outline" className="h-9 rounded-md"><RotateCcw className="size-4" />Restore</Button>
          ) : (
            <Button onClick={onDestroy} type="button" variant="destructive" className="h-9 rounded-md"><Trash2 className="size-4" />Suspend</Button>
          )}
        </div>
      }
    >
      <MasterListShowLayout>
        <MasterListShowCard title="Client details">
          <DetailGrid
            rows={[
              ["Name", client.name],
              ["Company", client.company_name],
              ["Category", client.category],
              ["Source", client.source],
              ["Status", <StatusBadge key="status" status={client.status} />],
            ]}
          />
        </MasterListShowCard>
        <div className="space-y-4">
          <MasterListShowCard title="Contact">
            <DetailGrid rows={[["Phone", client.phone], ["Email", client.email], ["Location", client.location]]} />
          </MasterListShowCard>
          <MasterListShowCard title="Notes">
            <p className="whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{client.notes || "No note added."}</p>
          </MasterListShowCard>
        </div>
      </MasterListShowLayout>
    </MasterListPageFrame>
  )
}

function ClientUpsertPage({ client, onBack, onSubmit }: { client: ClientRecord | null; onBack(): void; onSubmit(input: ClientUpsertInput): Promise<void> }) {
  const [form, setForm] = useState<ClientUpsertInput>(emptyClient())
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    setForm(client ? toClientInput(client) : emptyClient())
  }, [client])

  async function submit() {
    if (!form.name.trim()) {
      toast.error("Client name is required")
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
      title={client ? "Edit client note" : "New client note"}
      description="Record scratch information independently. This does not connect to tenant, company, or industry records."
      action={<Button type="button" variant="outline" onClick={onBack} className="rounded-md"><X className="size-4" />Cancel</Button>}
    >
      <MasterListUpsertLayout>
      <MasterListUpsertCard title="Client note" description="Keep client manager records independent from tenant-owned business data.">
        <form className="space-y-5" onSubmit={(event) => { event.preventDefault(); void submit() }}>
          <div className="grid gap-x-6 gap-y-5 md:grid-cols-2">
            <TextField label="Client name" value={form.name} onChange={(value) => setFormField(setForm, "name", value)} />
            <TextField label="Company name" value={form.company_name} onChange={(value) => setFormField(setForm, "company_name", value || null)} />
            <TextField label="Category" value={form.category} onChange={(value) => setFormField(setForm, "category", value || null)} />
            <TextField label="Source" value={form.source} onChange={(value) => setFormField(setForm, "source", value || null)} />
            <TextField label="Phone" value={form.phone} onChange={(value) => setFormField(setForm, "phone", value || null)} />
            <TextField label="Email" value={form.email} onChange={(value) => setFormField(setForm, "email", value || null)} />
            <TextField label="Location" value={form.location} onChange={(value) => setFormField(setForm, "location", value || null)} />
            <label className={cn("flex cursor-pointer items-center justify-between gap-4 rounded-xl border px-4 py-3", form.status === "active" ? "border-emerald-200 bg-emerald-50 text-emerald-950" : "border-border/70 bg-muted/10")}>
              <span>
                <span className="flex items-center gap-1.5 text-sm font-medium">{form.status === "active" ? <CheckCircle2 className="size-3.5 text-emerald-600" /> : null}Active</span>
                <span className={cn("block text-xs", form.status === "active" ? "text-emerald-700" : "text-muted-foreground")}>Active notes stay visible in the client information center.</span>
              </span>
              <Switch checked={form.status === "active"} onCheckedChange={(checked) => setFormField(setForm, "status", checked ? "active" : "suspend")} />
            </label>
          </div>
          <FieldShell label="Notes">
            <textarea className="min-h-36 rounded-xl border border-border/70 bg-background p-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" value={form.notes} onChange={(event) => setFormField(setForm, "notes", event.target.value)} />
          </FieldShell>
          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" disabled={isSaving} className="rounded-md"><Save className={cn("size-4", isSaving && "animate-spin")} />Save client note</Button>
            <Button type="button" variant="outline" onClick={onBack} className="rounded-md"><X className="size-4" />Cancel</Button>
          </div>
        </form>
      </MasterListUpsertCard>
      </MasterListUpsertLayout>
    </MasterListPageFrame>
  )
}

function ClientActions({ client, onDestroy, onEdit, onRestore, onView }: { client: ClientRecord; onDestroy(client: ClientRecord): void; onEdit(client: ClientRecord): void; onRestore(client: ClientRecord): void; onView(client: ClientRecord): void }) {
  return (
    <MasterListRowActions
      title={client.name}
      isSuspended={client.status === "suspend"}
      onDelete={() => onDestroy(client)}
      onEdit={() => onEdit(client)}
      onRestore={() => onRestore(client)}
      onView={() => onView(client)}
    />
  )
}

function StatusBadge({ status }: { status: ClientRecord["status"] }) {
  return <Badge variant="outline" className={cn("h-6 gap-1 rounded-md px-2 text-[11px]", status === "active" && "border-emerald-200 bg-emerald-50 text-emerald-700", status === "suspend" && "border-amber-200 bg-amber-50 text-amber-700", status === "inactive" && "border-slate-200 bg-slate-50 text-slate-600")}>{status === "active" ? <CheckCircle2 className="size-3" /> : null}{status}</Badge>
}

function ListHeader({ children, className }: { children: ReactNode; className?: string }) {
  return <th className={cn("border-b border-border/70 px-4 py-3.5 text-left font-medium text-foreground", className)}>{children}</th>
}

function FieldShell({ children, label }: { children: ReactNode; label: string }) {
  return <div className="grid gap-2"><Label className="text-sm font-medium">{label}</Label>{children}</div>
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

function TextField({ label, onChange, value }: { label: string; value: string | number | null; onChange(value: string): void }) {
  return <FieldShell label={label}><Input className="h-11 rounded-xl" value={value ?? ""} onChange={(event) => onChange(event.target.value)} /></FieldShell>
}

function setFormField<K extends keyof ClientUpsertInput>(setForm: Dispatch<SetStateAction<ClientUpsertInput>>, key: K, value: ClientUpsertInput[K]) {
  setForm((current) => ({ ...current, [key]: value }))
}
