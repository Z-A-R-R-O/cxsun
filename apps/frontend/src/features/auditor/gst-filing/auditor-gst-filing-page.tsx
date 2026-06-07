import { useEffect, useMemo, useState, type ReactNode } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { CheckCircle2, Pencil, Save, Trash2, X } from "lucide-react"
import { toast } from "sonner"

import { MasterListEmptyState, MasterListPageFrame, MasterListTableCard } from "src/components/blocks/lists/master-list"
import { Badge } from "src/components/ui/badge"
import { Button } from "src/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "src/components/ui/dialog"
import { Input } from "src/components/ui/input"
import { Label } from "src/components/ui/label"
import { Switch } from "src/components/ui/switch"
import type { AuthSession } from "src/features/auth/auth-client"
import { listContacts, type ContactRecord } from "src/features/contact/contact-client"
import { CommonRecordAutocompleteLookup, getCommonRecordName } from "src/features/master-data/interface/components/common-record-autocomplete-lookup"
import { listMasterDataRecords } from "src/features/master-data/infrastructure/master-data-client"
import { cn } from "src/lib/utils"
import { deleteAuditorGstFiling, listAuditorGstFilings, upsertAuditorGstFiling, type AuditorGstFilingInput, type AuditorGstFilingRecord } from "./auditor-gst-filing-client"

type FilingRow = AuditorGstFilingRecord & { isExisting: boolean }

export function AuditorGstFilingPage({ session }: { session: AuthSession }) {
  const queryClient = useQueryClient()
  const [monthId, setMonthId] = useState("")
  const [monthName, setMonthName] = useState("")
  const [accountingYearId, setAccountingYearId] = useState("")
  const [accountingYearName, setAccountingYearName] = useState("")
  const [editing, setEditing] = useState<FilingRow | null>(null)
  const contactsQuery = useQuery({ queryKey: ["contacts", session.selectedTenant.slug, "auditor-gst-filing"], queryFn: () => listContacts(session) })
  const filingsQueryKey = ["auditor-gst-filings", session.selectedTenant.slug, monthName, accountingYearName]
  const filingsQuery = useQuery({ enabled: Boolean(monthName && accountingYearName), queryKey: filingsQueryKey, queryFn: () => listAuditorGstFilings(session, { accountingYearName, monthName }) })
  const monthsQuery = useQuery({ queryKey: ["master-data-records", session.selectedTenant.slug, "months", "auditor-default"], queryFn: () => listMasterDataRecords(session, "months") })
  const yearsQuery = useQuery({ queryKey: ["master-data-records", session.selectedTenant.slug, "accountingYear", "auditor-default"], queryFn: () => listMasterDataRecords(session, "accountingYear") })
  const saveMutation = useMutation({ mutationFn: (input: AuditorGstFilingInput) => upsertAuditorGstFiling(session, input) })
  const deleteMutation = useMutation({ mutationFn: (record: AuditorGstFilingRecord) => deleteAuditorGstFiling(session, record) })

  useEffect(() => {
    const month = monthsQuery.data?.[new Date().getMonth()] ?? monthsQuery.data?.[0]
    if (!month || monthName) return
    setMonthId(String(month.id))
    setMonthName(getCommonRecordName(month))
  }, [monthName, monthsQuery.data])

  useEffect(() => {
    const year = yearsQuery.data?.find((record) => record.is_current_year || record.is_active) ?? yearsQuery.data?.[0]
    if (!year || accountingYearName) return
    setAccountingYearId(String(year.id))
    setAccountingYearName(getCommonRecordName(year))
  }, [accountingYearName, yearsQuery.data])

  const rows = useMemo(() => buildRows(contactsQuery.data ?? [], filingsQuery.data ?? [], { accountingYearId, accountingYearName, monthId, monthName }), [accountingYearId, accountingYearName, contactsQuery.data, filingsQuery.data, monthId, monthName])

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: filingsQueryKey })
  }

  async function save(input: AuditorGstFilingInput) {
    try {
      await saveMutation.mutateAsync(input)
      toast.success("GST filing saved", { description: input.contactName })
      setEditing(null)
      await refresh()
    } catch (error) {
      toast.error("GST filing save failed", { description: error instanceof Error ? error.message : "Please try again." })
    }
  }

  async function remove(row: FilingRow) {
    if (!row.isExisting) return
    try {
      await deleteMutation.mutateAsync(row)
      toast.success("GST filing removed", { description: row.contactName })
      await refresh()
    } catch (error) {
      toast.error("GST filing delete failed", { description: error instanceof Error ? error.message : "Please try again." })
    }
  }

  return <MasterListPageFrame title="GST Filing" description="Track monthly GSTR-1 and GSTR-3B filing ARN details for contacts." technicalName="page.auditor.gst-filing">
    <div className="grid gap-5 rounded-md border border-border/70 bg-card p-4 md:grid-cols-[1fr_1fr]">
      <CommonRecordAutocompleteLookup label="Month" moduleKey="months" placeholder="Search month" session={session} value={monthId || monthName} onChange={(value, record) => { setMonthId(value === null ? "" : String(value)); setMonthName(record ? getCommonRecordName(record) : "") }} />
      <CommonRecordAutocompleteLookup label="Year" moduleKey="accountingYear" placeholder="Search year" session={session} value={accountingYearId || accountingYearName} onChange={(value, record) => { setAccountingYearId(value === null ? "" : String(value)); setAccountingYearName(record ? getCommonRecordName(record) : "") }} />
    </div>
    <MasterListTableCard>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[980px] border-collapse text-sm">
          <thead className="bg-muted/45"><tr><Header className="w-12">Sl.no</Header><Header>Contact</Header><Header>GSTR-1</Header><Header>GSTR-3B</Header><Header>Status</Header><Header className="w-28 text-right">Action</Header></tr></thead>
          <tbody>{rows.map((row, index) => <tr className="border-b border-border/70 last:border-0" key={`${row.contactId}-${row.uuid || "draft"}`}><td className="border-r border-border/60 px-3 py-3 text-center">{index + 1}</td><td className="border-r border-border/60 px-3 py-3 text-center font-semibold uppercase tracking-wide">{row.contactName}</td><td className="border-r border-border/60 px-3 py-3 text-center">{formatFilingValue(row.gstr1Arn, row.gstr1Date)}</td><td className="border-r border-border/60 px-3 py-3 text-center">{formatFilingValue(row.gstr3bArn, row.gstr3bDate)}</td><td className="border-r border-border/60 px-3 py-2 text-center"><StatusBadge status={row.status} /></td><td className="px-3 py-2 text-right"><div className="flex justify-end gap-1"><Button aria-label={`Edit ${row.contactName}`} size="icon-sm" type="button" variant="ghost" onClick={() => setEditing(row)}><Pencil className="size-4 text-blue-500" /></Button><Button aria-label={`Delete ${row.contactName}`} disabled={!row.isExisting || deleteMutation.isPending} size="icon-sm" type="button" variant="ghost" onClick={() => void remove(row)}><Trash2 className="size-4 text-red-500" /></Button></div></td></tr>)}</tbody>
        </table>
      </div>
      {!rows.length ? <MasterListEmptyState>{contactsQuery.isFetching || filingsQuery.isFetching ? "Loading GST filing rows." : "No contacts found."}</MasterListEmptyState> : null}
    </MasterListTableCard>
    {editing ? <GstFilingDialog isSaving={saveMutation.isPending} row={editing} onClose={() => setEditing(null)} onSave={save} /> : null}
  </MasterListPageFrame>
}

function GstFilingDialog({ isSaving, onClose, onSave, row }: { isSaving: boolean; onClose(): void; onSave(input: AuditorGstFilingInput): Promise<void>; row: FilingRow }) {
  const [draft, setDraft] = useState<AuditorGstFilingInput>(() => rowToInput(row))
  return <Dialog open onOpenChange={(open) => { if (!open) onClose() }}><DialogContent className="w-[min(680px,calc(100vw-2rem))] p-0 sm:max-w-2xl" showCloseButton={false}><DialogHeader className="border-b border-border/70 px-5 py-4"><DialogTitle>{row.isExisting ? "Edit Entry" : "New Entry"}</DialogTitle></DialogHeader><div className="grid gap-3 p-5"><DialogField label="Contact" readOnly value={draft.contactName} onChange={() => undefined} /><DialogField label="GSTR-1 ARN" value={draft.gstr1Arn} onChange={(value) => setDraft((current) => ({ ...current, gstr1Arn: value }))} /><DialogField label="GSTR-1 Date" type="date" value={draft.gstr1Date} onChange={(value) => setDraft((current) => ({ ...current, gstr1Date: value }))} /><DialogField label="3B ARN" value={draft.gstr3bArn} onChange={(value) => setDraft((current) => ({ ...current, gstr3bArn: value }))} /><DialogField label="3B Date" type="date" value={draft.gstr3bDate} onChange={(value) => setDraft((current) => ({ ...current, gstr3bDate: value }))} /><label className={cn("mt-2 flex h-11 cursor-pointer items-center justify-between rounded-md border px-3", draft.status === "finished" ? "border-emerald-200 bg-emerald-50" : "border-border/70")}><span className="text-sm font-medium">Finished</span><Switch checked={draft.status === "finished"} onCheckedChange={(checked) => setDraft((current) => ({ ...current, status: checked ? "finished" : "pending", isActive: checked }))} /></label></div><DialogFooter className="rounded-none px-5 py-4"><Button className="rounded-md" disabled={isSaving} type="button" onClick={() => void onSave(draft)}><Save className={cn("size-4", isSaving && "animate-spin")} />Save</Button><Button className="rounded-md" type="button" variant="outline" onClick={onClose}><X className="size-4" />Cancel</Button></DialogFooter></DialogContent></Dialog>
}

function DialogField({ label, onChange, readOnly = false, type = "text", value }: { label: string; onChange(value: string): void; readOnly?: boolean; type?: "text" | "date"; value: string }) {
  return <div className="grid items-center gap-3 md:grid-cols-[120px_1fr]"><Label className="text-muted-foreground">{label}</Label><Input className="h-11 rounded-md" readOnly={readOnly} type={type} value={value} onChange={(event) => onChange(event.target.value)} /></div>
}

function buildRows(contacts: ContactRecord[], filings: AuditorGstFilingRecord[], period: { accountingYearId: string; accountingYearName: string; monthId: string; monthName: string }): FilingRow[] {
  const filingByContact = new Map(filings.map((filing) => [filing.contactId, filing]))
  return contacts.filter((contact) => contact.isActive).map((contact) => {
    const filing = filingByContact.get(contact.id)
    return filing ? { ...filing, isExisting: true } : {
      id: 0, uuid: "", contactId: contact.id, contactName: contact.name, monthId: period.monthId || null, monthName: period.monthName,
      accountingYearId: period.accountingYearId || null, accountingYearName: period.accountingYearName, gstr1Arn: null, gstr1Date: null,
      gstr3bArn: null, gstr3bDate: null, status: "pending", isActive: true, isExisting: false,
    }
  })
}

function rowToInput(row: FilingRow): AuditorGstFilingInput {
  return { id: row.id || undefined, uuid: row.uuid || undefined, contactId: row.contactId, contactName: row.contactName, monthId: row.monthId, monthName: row.monthName, accountingYearId: row.accountingYearId, accountingYearName: row.accountingYearName, gstr1Arn: row.gstr1Arn ?? "", gstr1Date: row.gstr1Date ?? "", gstr3bArn: row.gstr3bArn ?? "", gstr3bDate: row.gstr3bDate ?? "", status: row.status, isActive: row.isActive }
}

function Header({ children, className }: { children: ReactNode; className?: string }) {
  return <th className={cn("border-b border-r border-border/70 px-3 py-2.5 text-center text-xs font-semibold uppercase text-muted-foreground last:border-r-0", className)}>{children}</th>
}

function StatusBadge({ status }: { status: string }) {
  const finished = status === "finished"
  return <Badge className={cn("h-9 min-w-36 justify-center rounded-none border-0 text-base font-semibold", finished ? "bg-emerald-500 text-white" : "bg-amber-100 text-amber-800")}><CheckCircle2 className="size-4" />{finished ? "Finished" : "Pending"}</Badge>
}

function formatFilingValue(arn: string | null, date: string | null) {
  return [arn, formatDate(date)].filter(Boolean).join(" - ") || "-"
}

function formatDate(value: string | null) {
  if (!value) return ""
  const [year, month, day] = value.slice(0, 10).split("-")
  return year && month && day ? `${day}-${month}-${year}` : value
}
