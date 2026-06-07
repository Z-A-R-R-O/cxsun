import { useEffect, useMemo, useState, type ReactNode } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Check, Clipboard, KeyRound, Pencil, Plus, Save, Search, X } from "lucide-react"
import { toast } from "sonner"

import { MasterListEmptyState, MasterListPageFrame, MasterListTableCard } from "src/components/blocks/lists/master-list"
import { Badge } from "src/components/ui/badge"
import { Button } from "src/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "src/components/ui/dialog"
import { Input } from "src/components/ui/input"
import { Label } from "src/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "src/components/ui/popover"
import { Switch } from "src/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "src/components/ui/tabs"
import type { AuthSession } from "src/features/auth/auth-client"
import { listContacts, type ContactRecord } from "src/features/contact/contact-client"
import { CommonRecordAutocompleteLookup, getCommonRecordName } from "src/features/master-data/interface/components/common-record-autocomplete-lookup"
import { listMasterDataRecords } from "src/features/master-data/infrastructure/master-data-client"
import { cn } from "src/lib/utils"
import { deleteAuditorGstFiling, listAuditorGstFilings, upsertAuditorGstFiling, type AuditorGstFilingInput, type AuditorGstFilingRecord } from "../gst-filing/auditor-gst-filing-client"
import { emptyCredential, listAuditorContactCredentials, upsertAuditorContactCredential, type AuditorContactCredentialInput, type AuditorContactCredentialRecord, type CredentialServiceKey } from "./auditor-contact-credential-client"

const credentialRows: Array<{ key: CredentialServiceKey; label: string }> = [
  { key: "gst", label: "GST User" },
  { key: "einvoice", label: "E-Invoice User" },
  { key: "eway", label: "E-Way User" },
  { key: "einvoiceApi", label: "E-Invoice API" },
  { key: "ewayApi", label: "E-Way API" },
  { key: "emailAccount", label: "E-mail Account" },
]

export function AuditorContactDetailPage({ session }: { session: AuthSession }) {
  const queryClient = useQueryClient()
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [editingCredential, setEditingCredential] = useState<{ key: CredentialServiceKey; label: string } | null>(null)
  const [editingFiling, setEditingFiling] = useState<AuditorGstFilingRecord | null>(null)
  const contactsQuery = useQuery({ queryKey: ["contacts", session.selectedTenant.slug, "auditor-contact-detail"], queryFn: () => listContacts(session) })
  const credentialsQuery = useQuery({ queryKey: ["auditor-contact-credentials", session.selectedTenant.slug], queryFn: () => listAuditorContactCredentials(session) })
  const filingsQuery = useQuery({ enabled: Boolean(selectedId), queryKey: ["auditor-gst-filings", session.selectedTenant.slug, "contact", selectedId], queryFn: () => listAuditorGstFilings(session, { contactId: selectedId ?? undefined }) })
  const credentialMutation = useMutation({ mutationFn: (input: AuditorContactCredentialInput) => upsertAuditorContactCredential(session, input) })
  const filingMutation = useMutation({ mutationFn: (input: AuditorGstFilingInput) => upsertAuditorGstFiling(session, input) })
  const deleteFilingMutation = useMutation({ mutationFn: (record: AuditorGstFilingRecord) => deleteAuditorGstFiling(session, record) })

  const contacts = contactsQuery.data ?? []
  const selectedContact = contacts.find((contact) => contact.id === selectedId) ?? contacts.find((contact) => contact.isActive) ?? contacts[0] ?? null
  const credential = useMemo(() => credentialsQuery.data?.find((record) => record.contactId === selectedContact?.id) ?? null, [credentialsQuery.data, selectedContact?.id])

  useEffect(() => {
    if (!selectedId && selectedContact) setSelectedId(selectedContact.id)
  }, [selectedContact, selectedId])

  async function refreshCredentials() {
    await queryClient.invalidateQueries({ queryKey: ["auditor-contact-credentials", session.selectedTenant.slug] })
  }

  async function refreshFilings() {
    await queryClient.invalidateQueries({ queryKey: ["auditor-gst-filings", session.selectedTenant.slug, "contact", selectedId] })
    await queryClient.invalidateQueries({ queryKey: ["auditor-gst-filings", session.selectedTenant.slug] })
  }

  async function saveCredential(input: AuditorContactCredentialInput) {
    try {
      await credentialMutation.mutateAsync(input)
      toast.success("Credential saved", { description: selectedContact?.name })
      setEditingCredential(null)
      await refreshCredentials()
    } catch (error) {
      toast.error("Credential save failed", { description: error instanceof Error ? error.message : "Please try again." })
    }
  }

  async function saveFiling(input: AuditorGstFilingInput) {
    try {
      await filingMutation.mutateAsync(input)
      toast.success("GST filing saved", { description: input.contactName })
      setEditingFiling(null)
      await refreshFilings()
    } catch (error) {
      toast.error("GST filing save failed", { description: error instanceof Error ? error.message : "Please try again." })
    }
  }

  async function removeFiling(row: AuditorGstFilingRecord) {
    try {
      await deleteFilingMutation.mutateAsync(row)
      toast.success("GST filing removed", { description: row.monthName })
      await refreshFilings()
    } catch (error) {
      toast.error("GST filing delete failed", { description: error instanceof Error ? error.message : "Please try again." })
    }
  }

  return <MasterListPageFrame title="Contact Details" description="Auditor credentials and monthly GST filing details attached to Contact master." technicalName="page.auditor.contact-details">
    <div className="grid gap-4 rounded-md border border-border/70 bg-card p-4 md:grid-cols-[1fr_2fr_1fr]">
      <div className="flex items-center gap-3 text-sm text-muted-foreground">Contact ID <span className="grid size-10 place-items-center rounded-full bg-amber-100 font-semibold text-amber-900">{selectedContact?.id ?? "-"}</span></div>
      <h2 className="self-center text-center text-xl font-semibold uppercase tracking-[0.16em]">{selectedContact?.name ?? "Select contact"}</h2>
      <ContactPicker contacts={contacts} selected={selectedContact} onSelect={(contact) => setSelectedId(contact.id)} />
    </div>

    <Tabs className="gap-4" defaultValue="credentials">
      <TabsList className="h-auto w-full justify-start rounded-md border border-border/70 bg-card p-2" variant="line">
        <TabsTrigger className="h-9 px-3" value="credentials"><KeyRound className="size-4" />Credentials</TabsTrigger>
        <TabsTrigger className="h-9 px-3" value="gst-filing">GST Filing</TabsTrigger>
      </TabsList>
      <TabsContent value="credentials">
        <CredentialsTable credential={credential} isLoading={credentialsQuery.isFetching} onEdit={setEditingCredential} />
      </TabsContent>
      <TabsContent value="gst-filing">
        <div className="mb-3 flex justify-end">
          <Button disabled={!selectedContact} type="button" onClick={() => selectedContact && setEditingFiling(emptyFiling(selectedContact))}><Plus className="size-4" />New filing</Button>
        </div>
        <FilingTable filings={filingsQuery.data ?? []} isLoading={filingsQuery.isFetching} onDelete={(row) => void removeFiling(row)} onEdit={setEditingFiling} />
      </TabsContent>
    </Tabs>

    {editingCredential && selectedContact ? <CredentialDialog contact={selectedContact} credential={credential} isSaving={credentialMutation.isPending} service={editingCredential} onClose={() => setEditingCredential(null)} onSave={saveCredential} /> : null}
    {editingFiling && selectedContact ? <FilingDialog contact={selectedContact} isSaving={filingMutation.isPending} row={editingFiling} session={session} onClose={() => setEditingFiling(null)} onSave={saveFiling} /> : null}
  </MasterListPageFrame>
}

function ContactPicker({ contacts, onSelect, selected }: { contacts: ContactRecord[]; onSelect(contact: ContactRecord): void; selected: ContactRecord | null }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const matches = contacts.filter((contact) => [contact.id, contact.name, contact.gstin, contact.primaryPhone].some((value) => String(value ?? "").toLowerCase().includes(query.toLowerCase()))).slice(0, 12)
  return <Popover open={open} onOpenChange={setOpen}><PopoverTrigger asChild><Button className="h-11 w-full justify-between rounded-md uppercase tracking-wide" type="button" variant="outline"><span className="truncate">{selected?.name ?? "Choose contact"}</span></Button></PopoverTrigger><PopoverContent align="end" className="w-[360px] rounded-md p-2"><div className="relative mb-2"><Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" /><Input autoFocus className="h-9 pl-9" placeholder="Find contact, GSTIN, phone, or ID" value={query} onChange={(event) => setQuery(event.target.value)} /></div><div className="max-h-72 overflow-y-auto">{matches.map((contact) => <button className="flex w-full items-center justify-between rounded px-3 py-2 text-left text-sm hover:bg-muted" key={contact.uuid} type="button" onClick={() => { onSelect(contact); setOpen(false); setQuery("") }}><span><span className="block font-medium">{contact.name}</span><span className="text-xs text-muted-foreground">ID {contact.id}{contact.gstin ? ` - ${contact.gstin}` : ""}</span></span>{selected?.id === contact.id ? <Check className="size-4 text-primary" /> : null}</button>)}</div></PopoverContent></Popover>
}

function CredentialsTable({ credential, isLoading, onEdit }: { credential: AuditorContactCredentialRecord | null; isLoading: boolean; onEdit(row: { key: CredentialServiceKey; label: string }): void }) {
  return <MasterListTableCard><div className="overflow-x-auto"><table className="w-full min-w-[760px] text-sm"><thead className="bg-muted/35 text-left text-xs uppercase text-muted-foreground"><tr><Header>Service</Header><Header>User / Account</Header><Header>Password / Secret</Header><Header className="w-24 text-right">Action</Header></tr></thead><tbody>{credentialRows.map((row) => <CredentialRow credential={credential} key={row.key} row={row} onEdit={onEdit} />)}</tbody></table></div>{isLoading ? <MasterListEmptyState>Loading credentials.</MasterListEmptyState> : null}</MasterListTableCard>
}

function CredentialRow({ credential, onEdit, row }: { credential: AuditorContactCredentialRecord | null; onEdit(row: { key: CredentialServiceKey; label: string }): void; row: { key: CredentialServiceKey; label: string } }) {
  const user = credential?.[`${row.key}User` as keyof AuditorContactCredentialRecord]
  const pass = credential?.[`${row.key}Pass` as keyof AuditorContactCredentialRecord]
  return <tr className="border-b border-border/70 last:border-0"><td className="px-4 py-3 font-semibold">{row.label}</td><td className="px-4 py-3">{valueWithCopy(String(user ?? ""))}</td><td className="px-4 py-3">{valueWithCopy(String(pass ?? ""))}</td><td className="px-4 py-2 text-right"><Button aria-label={`Edit ${row.label}`} size="icon-sm" type="button" variant="outline" onClick={() => onEdit(row)}><Pencil className="size-4" /></Button></td></tr>
}

function valueWithCopy(value: string) {
  const text = value.trim()
  if (!text) return <span className="text-muted-foreground">Not set</span>
  return <span className="inline-flex max-w-full items-center gap-2"><span className="break-all">{text}</span><Button aria-label="Copy value" className="shrink-0" size="icon-sm" type="button" variant="outline" onClick={() => void copyText(text)}><Clipboard className="size-4" /></Button></span>
}

async function copyText(value: string) {
  try {
    await navigator.clipboard.writeText(value)
    toast.success("Copied")
  } catch {
    toast.error("Copy failed")
  }
}

function CredentialDialog({ contact, credential, isSaving, onClose, onSave, service }: { contact: ContactRecord; credential: AuditorContactCredentialRecord | null; isSaving: boolean; onClose(): void; onSave(input: AuditorContactCredentialInput): Promise<void>; service: { key: CredentialServiceKey; label: string } }) {
  const [user, setUser] = useState(String(credential?.[`${service.key}User` as keyof AuditorContactCredentialRecord] ?? ""))
  const [pass, setPass] = useState(String(credential?.[`${service.key}Pass` as keyof AuditorContactCredentialRecord] ?? ""))
  const base = credentialToInput(contact.id, credential)
  return <Dialog open onOpenChange={(open) => { if (!open) onClose() }}><DialogContent className="sm:max-w-xl"><DialogHeader><DialogTitle>{service.label}</DialogTitle></DialogHeader><div className="grid gap-4"><Field label="User / Account" value={user} onChange={setUser} /><Field label="Password / Secret" value={pass} onChange={setPass} /></div><DialogFooter><Button disabled={isSaving} type="button" onClick={() => void onSave({ ...base, [`${service.key}User`]: user, [`${service.key}Pass`]: pass })}><Save className={cn("size-4", isSaving && "animate-spin")} />Save</Button><Button type="button" variant="outline" onClick={onClose}><X className="size-4" />Cancel</Button></DialogFooter></DialogContent></Dialog>
}

function FilingTable({ filings, isLoading, onDelete, onEdit }: { filings: AuditorGstFilingRecord[]; isLoading: boolean; onDelete(row: AuditorGstFilingRecord): void; onEdit(row: AuditorGstFilingRecord): void }) {
  return <MasterListTableCard><div className="overflow-x-auto"><table className="w-full min-w-[840px] text-sm"><thead className="bg-muted/45"><tr><Header>Month</Header><Header>Year</Header><Header>GSTR-1</Header><Header>GSTR-3B</Header><Header>Status</Header><Header className="w-28 text-right">Action</Header></tr></thead><tbody>{filings.map((row) => <tr className="border-b border-border/70 last:border-0" key={row.uuid}><td className="px-4 py-3 font-semibold">{row.monthName}</td><td className="px-4 py-3">{row.accountingYearName}</td><td className="px-4 py-3">{formatFilingValue(row.gstr1Arn, row.gstr1Date)}</td><td className="px-4 py-3">{formatFilingValue(row.gstr3bArn, row.gstr3bDate)}</td><td className="px-4 py-2"><StatusBadge status={row.status} /></td><td className="px-4 py-2 text-right"><div className="flex justify-end gap-1"><Button size="icon-sm" type="button" variant="ghost" onClick={() => onEdit(row)}><Pencil className="size-4 text-blue-500" /></Button><Button size="icon-sm" type="button" variant="ghost" onClick={() => onDelete(row)}><X className="size-4 text-red-500" /></Button></div></td></tr>)}</tbody></table></div>{!filings.length ? <MasterListEmptyState>{isLoading ? "Loading GST filing rows." : "No GST filing records for this contact."}</MasterListEmptyState> : null}</MasterListTableCard>
}

function FilingDialog({ contact, isSaving, onClose, onSave, row, session }: { contact: ContactRecord; isSaving: boolean; onClose(): void; onSave(input: AuditorGstFilingInput): Promise<void>; row: AuditorGstFilingRecord; session: AuthSession }) {
  const [draft, setDraft] = useState<AuditorGstFilingInput>(() => filingToInput(row, contact))
  const monthsQuery = useQuery({ queryKey: ["master-data-records", session.selectedTenant.slug, "months", "contact-detail"], queryFn: () => listMasterDataRecords(session, "months") })
  const yearsQuery = useQuery({ queryKey: ["master-data-records", session.selectedTenant.slug, "accountingYear", "contact-detail"], queryFn: () => listMasterDataRecords(session, "accountingYear") })
  useEffect(() => {
    if (draft.monthName || !monthsQuery.data?.[0]) return
    const month = monthsQuery.data[new Date().getMonth()] ?? monthsQuery.data[0]
    setDraft((current) => ({ ...current, monthId: String(month.id), monthName: getCommonRecordName(month) }))
  }, [draft.monthName, monthsQuery.data])
  useEffect(() => {
    if (draft.accountingYearName || !yearsQuery.data?.[0]) return
    const year = yearsQuery.data.find((record) => record.is_current_year || record.is_active) ?? yearsQuery.data[0]
    setDraft((current) => ({ ...current, accountingYearId: String(year.id), accountingYearName: getCommonRecordName(year) }))
  }, [draft.accountingYearName, yearsQuery.data])
  return <Dialog open onOpenChange={(open) => { if (!open) onClose() }}><DialogContent className="sm:max-w-2xl"><DialogHeader><DialogTitle>{row.uuid ? "Edit GST Filing" : "New GST Filing"}</DialogTitle></DialogHeader><div className="grid gap-4"><CommonRecordAutocompleteLookup label="Month" moduleKey="months" session={session} value={draft.monthId || draft.monthName} onChange={(value, record) => setDraft((current) => ({ ...current, monthId: value === null ? null : String(value), monthName: record ? getCommonRecordName(record) : "" }))} /><CommonRecordAutocompleteLookup label="Year" moduleKey="accountingYear" session={session} value={draft.accountingYearId || draft.accountingYearName} onChange={(value, record) => setDraft((current) => ({ ...current, accountingYearId: value === null ? null : String(value), accountingYearName: record ? getCommonRecordName(record) : "" }))} /><Field label="GSTR-1 ARN" value={draft.gstr1Arn} onChange={(value) => setDraft((current) => ({ ...current, gstr1Arn: value }))} /><Field label="GSTR-1 Date" type="date" value={draft.gstr1Date} onChange={(value) => setDraft((current) => ({ ...current, gstr1Date: value }))} /><Field label="3B ARN" value={draft.gstr3bArn} onChange={(value) => setDraft((current) => ({ ...current, gstr3bArn: value }))} /><Field label="3B Date" type="date" value={draft.gstr3bDate} onChange={(value) => setDraft((current) => ({ ...current, gstr3bDate: value }))} /><label className={cn("flex h-11 cursor-pointer items-center justify-between rounded-md border px-3", draft.status === "finished" ? "border-emerald-200 bg-emerald-50" : "border-border/70")}><span className="text-sm font-medium">Finished</span><Switch checked={draft.status === "finished"} onCheckedChange={(checked) => setDraft((current) => ({ ...current, status: checked ? "finished" : "pending", isActive: true }))} /></label></div><DialogFooter><Button disabled={isSaving || !draft.monthName || !draft.accountingYearName} type="button" onClick={() => void onSave(draft)}><Save className={cn("size-4", isSaving && "animate-spin")} />Save</Button><Button type="button" variant="outline" onClick={onClose}><X className="size-4" />Cancel</Button></DialogFooter></DialogContent></Dialog>
}

function Field({ label, onChange, type = "text", value }: { label: string; onChange(value: string): void; type?: "text" | "date"; value: string }) {
  return <div className="grid items-center gap-3 md:grid-cols-[130px_1fr]"><Label className="text-muted-foreground">{label}</Label><Input className="h-11 rounded-md" type={type} value={value} onChange={(event) => onChange(event.target.value)} /></div>
}

function Header({ children, className }: { children: ReactNode; className?: string }) {
  return <th className={cn("border-b border-border/70 px-4 py-2.5 text-left text-xs font-semibold uppercase text-muted-foreground", className)}>{children}</th>
}

function StatusBadge({ status }: { status: string }) {
  const finished = status === "finished"
  return <Badge className={cn("h-8 min-w-28 justify-center rounded-none border-0 font-semibold", finished ? "bg-emerald-500 text-white" : "bg-amber-100 text-amber-800")}>{finished ? "Finished" : "Pending"}</Badge>
}

function credentialToInput(contactId: number, credential: AuditorContactCredentialRecord | null): AuditorContactCredentialInput {
  return credential ? { ...credential } : emptyCredential(contactId)
}

function emptyFiling(contact: ContactRecord): AuditorGstFilingRecord {
  return { id: 0, uuid: "", contactId: contact.id, contactName: contact.name, monthId: null, monthName: "", accountingYearId: null, accountingYearName: "", gstr1Arn: null, gstr1Date: null, gstr3bArn: null, gstr3bDate: null, status: "pending", isActive: true }
}

function filingToInput(row: AuditorGstFilingRecord, contact: ContactRecord): AuditorGstFilingInput {
  return { id: row.id || undefined, uuid: row.uuid || undefined, contactId: contact.id, contactName: contact.name, monthId: row.monthId, monthName: row.monthName, accountingYearId: row.accountingYearId, accountingYearName: row.accountingYearName, gstr1Arn: row.gstr1Arn ?? "", gstr1Date: row.gstr1Date ?? "", gstr3bArn: row.gstr3bArn ?? "", gstr3bDate: row.gstr3bDate ?? "", status: row.status, isActive: row.isActive }
}

function formatFilingValue(arn: string | null, date: string | null) {
  return [arn, formatDate(date)].filter(Boolean).join(" - ") || "-"
}

function formatDate(value: string | null) {
  if (!value) return ""
  const [year, month, day] = value.slice(0, 10).split("-")
  return year && month && day ? `${day}-${month}-${year}` : value
}
