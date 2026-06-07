import { useEffect, useMemo, useState, type ReactNode } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { ArrowLeft, Building2, Check, CheckCircle2, ChevronDown, ContactRound, Copy, KeyRound, MapPin, Pencil, Plus, RefreshCw, RotateCcw, Save, Search, Trash2, X, type LucideIcon } from "lucide-react"
import { toast } from "sonner"

import {
  MasterListEmptyState, MasterListPageFrame, MasterListPaginationCard, MasterListRowActions, MasterListTableCard,
  MasterListToolbarCard, MasterListUpsertCard, MasterListUpsertLayout, buildMasterListShowingLabel,
} from "src/components/blocks/lists/master-list"
import { Badge } from "src/components/ui/badge"
import { AnimatedTabs } from "src/components/ui/animated-tabs"
import { Button } from "src/components/ui/button"
import { Input } from "src/components/ui/input"
import { Label } from "src/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "src/components/ui/popover"
import { Switch } from "src/components/ui/switch"
import type { AuthSession } from "src/features/auth/auth-client"
import { CityAutocompleteLookup } from "src/features/master-data/interface/components/city-autocomplete-lookup"
import { PincodeAutocompleteLookup } from "src/features/master-data/interface/components/pincode-autocomplete-lookup"
import { StateAutocompleteLookup } from "src/features/master-data/interface/components/state-autocomplete-lookup"
import { getCommonRecordName } from "src/features/master-data/interface/components/common-record-autocomplete-lookup"
import { cn } from "src/lib/utils"
import {
  emptyAuditorClient, listAuditorClients, restoreAuditorClient, suspendAuditorClient, upsertAuditorClient,
  type AuditorClientInput, type AuditorClientRecord,
} from "./auditor-client-client"

type ClientView = { mode: "list" } | { mode: "show"; client: AuditorClientRecord } | { mode: "upsert"; client: AuditorClientRecord | null }
type CredentialKey = "gst" | "einvoice" | "eway" | "einvoiceApi" | "ewayApi" | "emailAccount"

const credentialRows: Array<{ key: CredentialKey; label: string }> = [
  { key: "gst", label: "GST User" }, { key: "einvoice", label: "E-Invoice User" }, { key: "eway", label: "E-Way User" },
  { key: "einvoiceApi", label: "E-Invoice API" }, { key: "ewayApi", label: "E-Way API" }, { key: "emailAccount", label: "E-mail Account" },
]
const clientTabsClassName = "[&>div:first-child]:rounded-md [&>div:first-child]:border-border/70 [&>div:first-child]:bg-card [&>div:first-child]:shadow-none [&>div:last-child]:mt-4"
const clientUpsertTabsClassName = "[&>div:first-child]:rounded-none [&>div:first-child]:border-x-0 [&>div:first-child]:border-t-0 [&>div:first-child]:border-b [&>div:first-child]:border-border/70 [&>div:first-child]:bg-card [&>div:first-child]:px-4 [&>div:first-child]:py-0.5 [&>div:first-child]:shadow-none md:[&>div:first-child]:px-6 [&>div:first-child_button]:min-h-8 [&>div:first-child_button]:py-1 [&>div:last-child]:mx-auto [&>div:last-child]:mt-6 [&>div:last-child]:w-full [&>div:last-child]:px-4 [&>div:last-child]:pb-5 md:[&>div:last-child]:px-6"

export function AuditorClientPage({ session }: { session: AuthSession }) {
  const queryClient = useQueryClient()
  const [view, setView] = useState<ClientView>({ mode: "list" })
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState("all")
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(100)
  const queryKey = ["auditor-clients", session.selectedTenant.slug]
  const clientsQuery = useQuery({ queryKey, queryFn: () => listAuditorClients(session) })
  const saveMutation = useMutation({ mutationFn: (input: AuditorClientInput) => upsertAuditorClient(session, input) })
  const clients = clientsQuery.data ?? []
  const filtered = useMemo(() => clients.filter((client) => {
    const term = search.trim().toLowerCase()
    const matchesSearch = !term || [client.id, client.uuid, client.name, client.group, client.gstin, client.mobile].some((value) => String(value ?? "").toLowerCase().includes(term))
    return matchesSearch && (status === "all" || (status === "active" ? client.isActive : !client.isActive))
  }), [clients, search, status])
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const pageClients = filtered.slice((page - 1) * pageSize, page * pageSize)

  useEffect(() => {
    if (clientsQuery.error) toast.error("Auditor clients could not be loaded", { description: clientsQuery.error instanceof Error ? clientsQuery.error.message : "Please try again." })
  }, [clientsQuery.error])

  async function refresh() { await queryClient.invalidateQueries({ queryKey }) }
  async function save(input: AuditorClientInput) {
    try {
      const client = await saveMutation.mutateAsync(input)
      toast.success(input.uuid ? "Client updated" : "Client created", { description: client.name })
      await refresh()
      setView({ mode: "show", client })
      return true
    } catch (error) {
      toast.error("Client save failed", { description: error instanceof Error ? error.message : "Please try again." })
      return false
    }
  }
  async function changeStatus(client: AuditorClientRecord, nextActive: boolean) {
    try {
      await (nextActive ? restoreAuditorClient(session, client) : suspendAuditorClient(session, client))
      toast.success(nextActive ? "Client restored" : "Client suspended", { description: client.name })
      await refresh()
      setView({ mode: "list" })
    } catch (error) { toast.error("Client status update failed", { description: error instanceof Error ? error.message : "Please try again." }) }
  }

  if (view.mode === "upsert") return <ClientUpsertPage client={view.client} isSaving={saveMutation.isPending} session={session} onBack={() => setView(view.client ? { mode: "show", client: view.client } : { mode: "list" })} onSave={save} />
  if (view.mode === "show") {
    const client = clients.find((item) => item.uuid === view.client.uuid) ?? view.client
    return <ClientShowPage client={client} clients={clients} isSaving={saveMutation.isPending} onBack={() => setView({ mode: "list" })} onEdit={() => setView({ mode: "upsert", client })} onSave={save} onSelect={(selected) => setView({ mode: "show", client: selected })} onStatusChange={(active) => void changeStatus(client, active)} />
  }

  return <MasterListPageFrame
    action={<div className="flex gap-2"><Button className="h-9 rounded-md" disabled={clientsQuery.isFetching} type="button" variant="outline" onClick={() => void clientsQuery.refetch()}><RefreshCw className={cn("size-4", clientsQuery.isFetching && "animate-spin")} />Refresh</Button><Button className="h-9 rounded-md" type="button" onClick={() => setView({ mode: "upsert", client: null })}><Plus className="size-4" />New client</Button></div>}
    description="Manage the auditor office client register, details, and credentials." technicalName="page.auditor.clients" title="Clients"
  >
    <MasterListToolbarCard filterOptions={[{ id: "all", label: "All clients" }, { id: "active", label: "Active" }, { id: "suspended", label: "Suspended" }]} filterValue={status} onFilterValueChange={(value) => { setStatus(value); setPage(1) }} onSearchValueChange={(value) => { setSearch(value); setPage(1) }} searchPlaceholder="Search client, GSTIN, mobile, group, or ID" searchValue={search} />
    <MasterListTableCard><div className="overflow-x-auto"><table className="w-full min-w-[820px] border-collapse text-sm"><thead className="bg-muted/50"><tr><Header>ID</Header><Header>Name</Header><Header>GSTIN</Header><Header>Contact</Header><Header>Group</Header><Header>Status</Header><Header className="text-right">Action</Header></tr></thead><tbody>{pageClients.map((client) => <tr className={cn("border-b border-border/70", !client.isActive && "bg-muted/20 text-muted-foreground")} key={client.uuid}><td className="px-4 py-2 font-mono text-xs">{client.id}</td><td className="px-4 py-2"><button className="font-semibold hover:underline" type="button" onClick={() => setView({ mode: "show", client })}>{client.name}</button></td><td className="px-4 py-2 font-mono text-xs">{client.gstin || "-"}</td><td className="px-4 py-2">{client.mobile || client.email || "-"}</td><td className="px-4 py-2">{client.group || "-"}</td><td className="px-4 py-2"><StatusBadge active={client.isActive} /></td><td className="px-4 py-1.5 text-right"><MasterListRowActions isSuspended={!client.isActive} onDelete={() => void changeStatus(client, false)} onEdit={() => setView({ mode: "upsert", client })} onRestore={() => void changeStatus(client, true)} onView={() => setView({ mode: "show", client })} title={client.name} /></td></tr>)}</tbody></table></div>{!pageClients.length ? <MasterListEmptyState>{clientsQuery.isFetching ? "Loading clients." : "No clients found."}</MasterListEmptyState> : null}</MasterListTableCard>
    <MasterListPaginationCard page={page} rowsPerPage={pageSize} showingLabel={buildMasterListShowingLabel({ page, pageSize, totalCount: filtered.length })} singularLabel="clients" totalCount={filtered.length} totalPages={totalPages} onNextPage={() => setPage((current) => Math.min(totalPages, current + 1))} onPageChange={setPage} onPreviousPage={() => setPage((current) => Math.max(1, current - 1))} onRowsPerPageChange={(value) => { setPageSize(value); setPage(1) }} />
  </MasterListPageFrame>
}

function ClientShowPage({ client, clients, isSaving, onBack, onEdit, onSave, onSelect, onStatusChange }: { client: AuditorClientRecord; clients: AuditorClientRecord[]; isSaving: boolean; onBack(): void; onEdit(): void; onSave(input: AuditorClientInput): Promise<boolean>; onSelect(client: AuditorClientRecord): void; onStatusChange(active: boolean): void }) {
  return <MasterListPageFrame title="Client details" description="Auditor client workspace." technicalName="page.auditor.clients.show" action={<div className="flex gap-2"><Button className="h-9 rounded-md" type="button" variant="outline" onClick={onBack}><ArrowLeft className="size-4" />Back</Button><Button className="h-9 rounded-md" type="button" onClick={onEdit}><Pencil className="size-4" />Edit</Button>{client.isActive ? <Button className="h-9 rounded-md" type="button" variant="destructive" onClick={() => onStatusChange(false)}><Trash2 className="size-4" />Suspend</Button> : <Button className="h-9 rounded-md" type="button" variant="outline" onClick={() => onStatusChange(true)}><RotateCcw className="size-4" />Restore</Button>}</div>}>
    <div className="grid gap-4">
      <div className="grid items-center gap-4 border-b border-border/70 pb-4 md:grid-cols-[1fr_2fr_1fr]"><div className="flex items-center gap-3 text-sm text-muted-foreground">Client ID <span className="grid size-10 place-items-center rounded-full bg-amber-100 font-semibold text-amber-900">{client.id}</span></div><h2 className="text-center text-xl font-semibold uppercase tracking-[0.12em]">{client.name}</h2><ClientQuickSelect clients={clients} selected={client} onSelect={onSelect} /></div>
      <AnimatedTabs className={clientTabsClassName} tabs={[
        { value: "client", label: <TabLabel icon={Building2}>Client</TabLabel>, content: <ShowSection onEdit={onEdit}><DetailsTable title="Client details" rows={[["Client ID", client.id], ["Public ID", client.uuid], ["Name", client.name], ["Group", client.group], ["GSTIN", client.gstin], ["Status", <StatusBadge active={client.isActive} key="status" />]]} /></ShowSection> },
        { value: "contact", label: <TabLabel icon={ContactRound}>Contact</TabLabel>, content: <ShowSection onEdit={onEdit}><DetailsTable title="Contact details" rows={[["Contact Person", client.contactPerson], ["Mobile", client.mobile], ["Whatsapp", client.whatsapp], ["Email", client.email], ["GSTIN", client.gstin]]} /></ShowSection> },
        { value: "address", label: <TabLabel icon={MapPin}>Address</TabLabel>, content: <ShowSection onEdit={onEdit}><DetailsTable title="Address" rows={[["Address", client.addressLine1], ["Address line 2", client.addressLine2], ["City", client.city], ["State", client.state], ["Pincode", client.pincode]]} /></ShowSection> },
        { value: "credentials", label: <TabLabel icon={KeyRound}>Credentials</TabLabel>, content: <CredentialsTable client={client} isSaving={isSaving} onSave={onSave} /> },
      ]} />
    </div>
  </MasterListPageFrame>
}

function ClientUpsertPage({ client, isSaving, onBack, onSave, session }: { client: AuditorClientRecord | null; isSaving: boolean; onBack(): void; onSave(input: AuditorClientInput): Promise<boolean>; session: AuthSession }) {
  const [form, setForm] = useState<AuditorClientInput>(() => client ? recordToInput(client) : emptyAuditorClient())
  const [submitted, setSubmitted] = useState(false)
  const update = (key: keyof AuditorClientInput, value: string | boolean) => setForm((current) => ({ ...current, [key]: value }))
  return <MasterListPageFrame title={client ? "Edit client" : "New client"} description="Maintain client contact, address, and access details." technicalName="page.auditor.clients.upsert" action={<Button className="h-9 rounded-md" type="button" variant="outline" onClick={onBack}><ArrowLeft className="size-4" />Back</Button>}><form className="grid gap-4" onSubmit={(event) => { event.preventDefault(); setSubmitted(true); if (!form.name.trim()) return void toast.warning("Client name is required"); void onSave(form) }}>
    <MasterListUpsertLayout><MasterListUpsertCard className="overflow-hidden p-0 [&>div]:p-0" title="">
      <AnimatedTabs className={clientUpsertTabsClassName} tabs={[
        { value: "client", label: <TabLabel icon={Building2}>Client</TabLabel>, content: <div className="grid gap-4 md:grid-cols-2"><Field error={submitted && !form.name.trim()} label="Name *" value={form.name} onChange={(value) => update("name", value)} /><Field label="Group" value={form.group} onChange={(value) => update("group", value)} /><Field label="GSTIN" value={form.gstin} onChange={(value) => update("gstin", value)} /><label className={cn("flex h-11 cursor-pointer items-center justify-between self-end rounded-md border px-3", form.isActive ? "border-emerald-200 bg-emerald-50" : "border-border/70")}><span className="text-sm font-medium">Active</span><Switch checked={form.isActive} onCheckedChange={(value) => update("isActive", value)} /></label></div> },
        { value: "contact", label: <TabLabel icon={ContactRound}>Contact</TabLabel>, content: <div className="grid gap-4 md:grid-cols-2"><Field label="Contact person" value={form.contactPerson} onChange={(value) => update("contactPerson", value)} /><Field label="Mobile" type="tel" value={form.mobile} onChange={(value) => update("mobile", value)} /><Field label="Whatsapp" type="tel" value={form.whatsapp} onChange={(value) => update("whatsapp", value)} /><Field label="Email" type="email" value={form.email} onChange={(value) => update("email", value)} /></div> },
        { value: "address", label: <TabLabel icon={MapPin}>Address</TabLabel>, content: <div className="grid gap-4 md:grid-cols-2"><Field className="md:col-span-2" label="Address line 1" value={form.addressLine1} onChange={(value) => update("addressLine1", value)} /><Field className="md:col-span-2" label="Address line 2" value={form.addressLine2} onChange={(value) => update("addressLine2", value)} /><StateAutocompleteLookup session={session} value={form.stateId || form.state} onChange={(value, record) => setForm((current) => ({ ...current, stateId: value === null ? "" : String(value), state: record ? getCommonRecordName(record) : "", cityId: "", city: "", pincodeId: "", pincode: "" }))} /><CityAutocompleteLookup session={session} stateId={form.stateId} value={form.cityId || form.city} onChange={(value, record) => setForm((current) => ({ ...current, cityId: value === null ? "" : String(value), city: record ? getCommonRecordName(record) : "", pincodeId: "", pincode: "" }))} /><PincodeAutocompleteLookup cityId={form.cityId} session={session} value={form.pincodeId || form.pincode} onChange={(value, record) => setForm((current) => ({ ...current, pincodeId: value === null ? "" : String(value), pincode: record ? getCommonRecordName(record) : "" }))} /></div> },
        { value: "credentials", label: <TabLabel icon={KeyRound}>Credentials</TabLabel>, content: <div className="grid gap-5">{credentialRows.map(({ key, label }) => <div className="grid gap-4 border-b border-border/60 pb-5 last:border-0 last:pb-0 md:grid-cols-[180px_1fr_1fr]" key={key}><div className="pt-2 text-sm font-semibold">{label}</div><Field label="User / Account" value={form[`${key}User`]} onChange={(value) => update(`${key}User`, value)} /><Field label="Password / Secret" type="password" value={form[`${key}Pass`]} onChange={(value) => update(`${key}Pass`, value)} /></div>)}</div> },
      ]} />
    </MasterListUpsertCard></MasterListUpsertLayout>
    <div className="flex gap-2"><Button disabled={isSaving} type="submit"><Save className={cn("size-4", isSaving && "animate-spin")} />Save client</Button><Button type="button" variant="outline" onClick={onBack}><X className="size-4" />Cancel</Button></div>
  </form></MasterListPageFrame>
}

function ShowSection({ children, onEdit }: { children: ReactNode; onEdit(): void }) {
  return <section className="overflow-hidden rounded-md border border-border/70 bg-card">{children}<div className="flex justify-end border-t border-border/70 px-4 py-2"><Button size="sm" type="button" variant="ghost" onClick={onEdit}><Pencil className="size-3.5" />Edit details</Button></div></section>
}

function CredentialsTable({ client, isSaving, onSave }: { client: AuditorClientRecord; isSaving: boolean; onSave(input: AuditorClientInput): Promise<boolean> }) {
  return <section className="overflow-hidden rounded-md border border-border/70 bg-card"><div className="border-b border-border/70 px-4 py-3"><h3 className="font-semibold">Credentials</h3><p className="text-xs text-muted-foreground">Edit and save each service independently.</p></div><div className="overflow-x-auto"><table className="w-full min-w-[720px] text-sm"><thead className="bg-muted/35 text-left text-xs uppercase text-muted-foreground"><tr><th className="px-4 py-2">Service</th><th className="px-4 py-2">User / Account</th><th className="px-4 py-2">Password / Secret</th><th className="w-28 px-4 py-2 text-right">Action</th></tr></thead><tbody>{credentialRows.map(({ key, label }) => <CredentialRow client={client} credentialKey={key} isSaving={isSaving} key={key} label={label} onSave={onSave} />)}</tbody></table></div></section>
}

function TabLabel({ children, icon: Icon }: { children: ReactNode; icon: LucideIcon }) {
  return <span className="flex items-center gap-2"><Icon className="size-4" />{children}</span>
}

function ClientQuickSelect({ clients, selected, onSelect }: { clients: AuditorClientRecord[]; selected: AuditorClientRecord; onSelect(client: AuditorClientRecord): void }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const matches = clients.filter((client) => [client.id, client.name, client.group, client.gstin].some((value) => String(value ?? "").toLowerCase().includes(query.toLowerCase()))).slice(0, 12)
  return <Popover open={open} onOpenChange={setOpen}><PopoverTrigger asChild><Button className="h-11 w-full justify-between rounded-md uppercase tracking-wide" type="button" variant="outline"><span className="truncate">{selected.name}</span><ChevronDown className="size-4 shrink-0 text-muted-foreground" /></Button></PopoverTrigger><PopoverContent align="end" className="w-[340px] rounded-md p-2"><div className="relative mb-2"><Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" /><Input autoFocus className="h-9 pl-9" placeholder="Find client, GSTIN, group, or ID" value={query} onChange={(event) => setQuery(event.target.value)} /></div><div className="max-h-64 overflow-y-auto">{matches.map((client) => <button className="flex w-full items-center justify-between rounded px-3 py-2 text-left text-sm hover:bg-muted" key={client.uuid} type="button" onClick={() => { onSelect(client); setOpen(false); setQuery("") }}><span><span className="block font-medium">{client.name}</span><span className="text-xs text-muted-foreground">ID {client.id}{client.gstin ? ` · ${client.gstin}` : ""}</span></span>{client.uuid === selected.uuid ? <Check className="size-4 text-primary" /> : null}</button>)}</div></PopoverContent></Popover>
}

function DetailsTable({ className, rows, title }: { className?: string; rows: Array<[string, ReactNode]>; title: string }) {
  return <div className={className}><div className="border-b border-border/70 bg-muted/25 px-4 py-2 text-sm font-semibold">{title}</div><table className="w-full text-sm"><tbody>{rows.map(([label, value], index) => <tr className="border-b border-border/60 last:border-0" key={`${label}-${index}`}><th className="w-40 border-r border-border/60 px-4 py-2 text-left font-normal text-muted-foreground">{label}</th><td className="px-4 py-2 font-medium">{value || "Not set"}</td></tr>)}</tbody></table></div>
}

function CredentialRow({ client, credentialKey, isSaving, label, onSave }: { client: AuditorClientRecord; credentialKey: CredentialKey; isSaving: boolean; label: string; onSave(input: AuditorClientInput): Promise<boolean> }) {
  const user = client[`${credentialKey}User`]
  const pass = client[`${credentialKey}Pass`]
  const [editing, setEditing] = useState(false)
  const [draftUser, setDraftUser] = useState(user ?? "")
  const [draftPass, setDraftPass] = useState(pass ?? "")

  useEffect(() => {
    if (!editing) {
      setDraftUser(user ?? "")
      setDraftPass(pass ?? "")
    }
  }, [editing, pass, user])

  async function saveRow() {
    const input = recordToInput(client)
    input[`${credentialKey}User`] = draftUser
    input[`${credentialKey}Pass`] = draftPass
    if (await onSave(input)) setEditing(false)
  }

  return <tr className={cn("border-b border-border/60 last:border-0", editing && "bg-emerald-50/40")}><th className="px-4 py-2 text-left font-medium">{label}</th>{editing ? <><td className="px-4 py-2"><Input aria-label={`${label} user or account`} autoFocus className="h-9 rounded-md" value={draftUser} onChange={(event) => setDraftUser(event.target.value)} /></td><td className="px-4 py-2"><Input aria-label={`${label} password or secret`} className="h-9 rounded-md" value={draftPass} onChange={(event) => setDraftPass(event.target.value)} /></td><td className="px-4 py-2"><div className="flex justify-end gap-1"><Button aria-label={`Save ${label}`} disabled={isSaving} size="icon-sm" type="button" onClick={() => void saveRow()}><Save className={cn("size-3.5", isSaving && "animate-spin")} /></Button><Button aria-label={`Cancel ${label} edit`} disabled={isSaving} size="icon-sm" type="button" variant="outline" onClick={() => setEditing(false)}><X className="size-3.5" /></Button></div></td></> : <><CredentialValue value={user} /><CredentialValue value={pass} /><td className="px-4 py-2 text-right"><Button aria-label={`Edit ${label}`} size="icon-sm" type="button" variant="outline" onClick={() => setEditing(true)}><Pencil className="size-3.5" /></Button></td></>}</tr>
}

function CredentialValue({ value }: { value: string | null }) {
  return <td className="px-4 py-2"><div className="flex min-h-8 items-center justify-between gap-2"><span className={cn("break-all", !value && "text-muted-foreground")}>{value || "Not set"}</span>{value ? <Button aria-label="Copy value" size="icon-sm" type="button" variant="ghost" onClick={() => void copyCredentialValue(value)}><Copy className="size-3.5" /></Button> : null}</div></td>
}

async function copyCredentialValue(value: string) {
  try {
    if (navigator.clipboard?.writeText && window.isSecureContext) {
      await navigator.clipboard.writeText(value)
    } else {
      fallbackCopyText(value)
    }
    toast.success("Copied to clipboard")
  } catch {
    try {
      fallbackCopyText(value)
      toast.success("Copied to clipboard")
    } catch {
      toast.error("Copy failed", { description: "Select the value and copy it manually." })
    }
  }
}

function fallbackCopyText(value: string) {
  const textarea = document.createElement("textarea")
  textarea.value = value
  textarea.setAttribute("readonly", "")
  textarea.style.position = "fixed"
  textarea.style.left = "-9999px"
  textarea.style.top = "0"
  document.body.appendChild(textarea)
  textarea.focus()
  textarea.select()
  const copied = document.execCommand("copy")
  document.body.removeChild(textarea)
  if (!copied) throw new Error("Clipboard fallback failed.")
}

function recordToInput(client: AuditorClientRecord): AuditorClientInput {
  const input = emptyAuditorClient()
  for (const key of Object.keys(input) as Array<keyof AuditorClientInput>) {
    if (key in client) Object.assign(input, { [key]: client[key as keyof AuditorClientRecord] ?? "" })
  }
  return { ...input, id: client.id, uuid: client.uuid, isActive: client.isActive }
}

function Field({ className, error = false, label, onChange, type = "text", value }: { className?: string; error?: boolean; label: string; onChange(value: string): void; type?: "text" | "password" | "email" | "tel"; value: string }) {
  return <div className={cn("grid gap-2", className)}><Label className={cn(error && "text-destructive")}>{label}</Label><Input aria-invalid={error} className={cn("h-11 rounded-md", error && "border-destructive")} type={type} value={value} onChange={(event) => onChange(event.target.value)} /></div>
}
function Header({ children, className }: { children: ReactNode; className?: string }) { return <th className={cn("border-b border-border/70 px-4 py-3 text-left font-medium", className)}>{children}</th> }
function StatusBadge({ active }: { active: boolean }) { return <Badge className={cn("h-6 rounded-md px-2 text-[11px]", active ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-700")} variant="outline">{active ? <CheckCircle2 className="size-3" /> : null}{active ? "Active" : "Suspended"}</Badge> }
