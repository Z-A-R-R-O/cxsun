import { useEffect, useMemo, useState, type Dispatch, type ReactNode, type Ref, type SetStateAction } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { ArrowLeft, Check, ChevronLeft, ChevronRight, Mail, MessageCircle, Paperclip, Pencil, Plus, Printer, RotateCcw, Save, Send, Settings2, Tag, Trash2, UserRound, X } from "lucide-react"
import { Button } from "src/components/ui/button"
import { Input } from "src/components/ui/input"
import { Label } from "src/components/ui/label"
import { Textarea } from "src/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "src/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "src/components/ui/select"
import { AnimatedTabs, type AnimatedTab } from "src/components/ui/animated-tabs"
import {
  MasterListEmptyState,
  MasterListPageFrame,
  MasterListPaginationCard,
  MasterListRowActions,
  MasterListTableCard,
  MasterListToolbarCard,
  MasterListUpsertCard,
  MasterListUpsertLayout,
  buildMasterListShowingLabel,
} from "src/components/blocks/lists/master-list"
import { cn } from "src/lib/utils"
import type { AuthSession } from "src/features/auth/auth-client"
import { listCompanies, type CompanyBankAccount, type CompanyRecord } from "src/features/company/company-client"
import { LetterheadBuilder } from "src/features/company/letterhead-builder"
import { emptyContact, upsertContact, type ContactInput, type ContactRecord } from "src/features/contact/contact-client"
import type { MasterDataRecord } from "src/features/master-data/domain/master-data"
import { WorkOrderAutocomplete } from "src/features/master-data/interface/components/work-order-autocomplete"
import { listMasterDataRecords } from "src/features/master-data/infrastructure/master-data-client"
import { nextDocumentNumberSetting } from "src/features/settings/document-settings-client"
import { useCompanySoftwareSettings } from "src/features/settings/use-company-software-settings"
import { filterStockContactLookupOptions, stockContactTypeId } from "src/features/stock/contact-role-filter"
import {
  addPaymentComment,
  destroyPaymentEntry,
  emptyPaymentAllocation,
  emptyPaymentEntry,
  listPaymentContactLookups,
  listPaymentEntries,
  restorePaymentEntry,
  runPaymentTool,
  upsertPaymentEntry,
  type PaymentAllocation,
  type PaymentEntry,
  type PaymentEntryInput,
  type PaymentLookupOption,
} from "./payment-client"

type PaymentView = { mode: "list" } | { mode: "show"; entry: PaymentEntry } | { mode: "upsert"; entry: PaymentEntry | null }
type PaymentColumnId = "amount" | "date" | "ledger" | "mode" | "party" | "payment" | "status" | "unallocated" | "updated"
type PaymentToolId = "email" | "assign" | "attachments" | "tags" | "whatsapp"

const paymentModeOptions = [
  { label: "Cash", value: "cash" },
  { label: "RTGS Transfer", value: "rtgs-transfer" },
  { label: "NEFT Transfer", value: "neft-transfer" },
  { label: "UPI Transfer", value: "upi-transfer" },
] as const

const paymentStatusFilters = [
  { id: "all", label: "All payments" },
  { id: "draft", label: "draft" },
  { id: "posted", label: "posted" },
  { id: "cancelled", label: "cancelled" },
]

const defaultPaymentColumnVisibility: Record<PaymentColumnId, boolean> = {
  amount: true,
  date: true,
  ledger: false,
  mode: true,
  party: true,
  payment: true,
  status: true,
  unallocated: true,
  updated: false,
}

const paymentColumnCatalog: Array<{ id: PaymentColumnId; label: string }> = [
  { id: "payment", label: "Payment" },
  { id: "date", label: "Date" },
  { id: "party", label: "Supplier" },
  { id: "mode", label: "Mode" },
  { id: "ledger", label: "Ledger" },
  { id: "status", label: "Status" },
  { id: "amount", label: "Amount" },
  { id: "unallocated", label: "Unallocated" },
  { id: "updated", label: "Updated" },
]

export function PaymentPage({ session }: { session: AuthSession }) {
  const queryClient = useQueryClient()
  const [view, setView] = useState<PaymentView>({ mode: "list" })
  const [searchValue, setSearchValue] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [visibleColumns, setVisibleColumns] = useState(defaultPaymentColumnVisibility)
  const [currentPage, setCurrentPage] = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState(100)
  const queryKey = ["payment-entries", session.selectedTenant.slug]
  const entriesQuery = useQuery({ queryKey, queryFn: () => listPaymentEntries(session) })
  const upsertMutation = useMutation({ mutationFn: (input: PaymentEntryInput) => upsertPaymentEntry(session, input) })
  const destroyMutation = useMutation({ mutationFn: (entry: PaymentEntry) => destroyPaymentEntry(session, entry) })
  const restoreMutation = useMutation({ mutationFn: (entry: PaymentEntry) => restorePaymentEntry(session, entry) })
  const commentMutation = useMutation({ mutationFn: ({ entry, body }: { entry: PaymentEntry; body: string }) => addPaymentComment(session, entry, body) })
  const toolMutation = useMutation({ mutationFn: ({ entry, tool }: { entry: PaymentEntry; tool: string }) => runPaymentTool(session, entry, tool) })
  const entries = entriesQuery.data ?? []
  const filteredEntries = useMemo(() => filterPayments(searchPayments(entries, searchValue), statusFilter).sort((left, right) => left.payment_no.localeCompare(right.payment_no)), [entries, searchValue, statusFilter])
  const totalPages = Math.max(1, Math.ceil(filteredEntries.length / rowsPerPage))
  const pageEntries = filteredEntries.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage)

  useEffect(() => {
    if (entriesQuery.error) toast.error("Payment load failed", { description: entriesQuery.error instanceof Error ? entriesQuery.error.message : "Unable to load payment entries." })
  }, [entriesQuery.error])

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey })
  }

  async function save(input: PaymentEntryInput, printAfterSave = false) {
    const entry = await upsertMutation.mutateAsync(preparePaymentInput(input))
    toast.success(input.uuid ? "Payment updated" : "Payment created", { description: entry.document_number_warning ?? entry.payment_no })
    queryClient.removeQueries({ queryKey: ["document-number-next-preview", session.selectedTenant.slug, "payment"] })
    await queryClient.invalidateQueries({ queryKey: ["document-number-next-preview", session.selectedTenant.slug] })
    await refresh()
    setView({ mode: "show", entry })
    if (printAfterSave) window.setTimeout(() => window.print(), 300)
  }

  async function destroy(entry: PaymentEntry) {
    await destroyMutation.mutateAsync(entry)
    toast.error("Payment suspended", { description: entry.payment_no })
    await refresh()
  }

  async function restore(entry: PaymentEntry) {
    await restoreMutation.mutateAsync(entry)
    toast.success("Payment restored", { description: entry.payment_no })
    await refresh()
  }

  function openNewEntry() {
    queryClient.removeQueries({ queryKey: ["document-number-next-preview", session.selectedTenant.slug, "payment"] })
    setView({ mode: "upsert", entry: null })
  }

  if (view.mode === "upsert") {
    return <PaymentUpsertPage entry={view.entry} isSaving={upsertMutation.isPending} session={session} onBack={() => setView(view.entry ? { mode: "show", entry: view.entry } : { mode: "list" })} onSubmit={save} />
  }

  if (view.mode === "show") {
    const entry = entries.find((item) => item.uuid === view.entry.uuid) ?? view.entry
    return (
      <PaymentShowPage
        entry={entry}
        isWorking={commentMutation.isPending || toolMutation.isPending}
        session={session}
        onBack={() => setView({ mode: "list" })}
        onComment={async (entryValue, body) => {
          const updated = await commentMutation.mutateAsync({ entry: entryValue, body })
          await refresh()
          setView({ mode: "show", entry: updated })
        }}
        onDestroy={() => void destroy(entry)}
        onEdit={() => setView({ mode: "upsert", entry })}
        onRestore={() => void restore(entry)}
        onTool={async (entryValue, tool) => {
          const updated = await toolMutation.mutateAsync({ entry: entryValue, tool })
          toast.success("Action recorded", { description: "The activity was recorded for this payment." })
          await refresh()
          setView({ mode: "show", entry: updated })
        }}
      />
    )
  }

  return (
    <MasterListPageFrame
      title="Payment"
      description="Track supplier payments and purchase allocations."
      technicalName="page.entries.payment.list"
      action={<Button onClick={openNewEntry} type="button" className="h-9 rounded-xl"><Plus className="size-4" />New Payment</Button>}
    >
      <MasterListToolbarCard
        columns={paymentColumnCatalog.map((column) => ({ id: column.id, label: column.label, checked: visibleColumns[column.id], disabled: column.id === "payment", onCheckedChange: (checked) => setVisibleColumns((current) => ({ ...current, [column.id]: checked })) }))}
        filterOptions={paymentStatusFilters}
        filterValue={statusFilter}
        onFilterValueChange={(value) => {
          setStatusFilter(value)
          setCurrentPage(1)
        }}
        onShowAllColumns={() => setVisibleColumns(defaultPaymentColumnVisibility)}
        searchPlaceholder="Search payment, supplier, mode, ledger, work order, or status"
        searchValue={searchValue}
        onSearchValueChange={(value) => {
          setSearchValue(value)
          setCurrentPage(1)
        }}
      />
      <MasterListTableCard className="rounded-md">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1040px] border-collapse text-sm">
            <thead className="bg-muted/55">
              <tr>
                {visibleColumns.payment ? <ListHeader>Payment</ListHeader> : null}
                {visibleColumns.date ? <ListHeader>Date</ListHeader> : null}
                {visibleColumns.party ? <ListHeader>Supplier</ListHeader> : null}
                {visibleColumns.mode ? <ListHeader>Mode</ListHeader> : null}
                {visibleColumns.ledger ? <ListHeader>Ledger</ListHeader> : null}
                {visibleColumns.status ? <ListHeader>Status</ListHeader> : null}
                {visibleColumns.amount ? <ListHeader className="text-right">Amount</ListHeader> : null}
                {visibleColumns.unallocated ? <ListHeader className="text-right">Unallocated</ListHeader> : null}
                {visibleColumns.updated ? <ListHeader>Updated</ListHeader> : null}
                <ListHeader className="text-right">Action</ListHeader>
              </tr>
            </thead>
            <tbody>
              {pageEntries.map((entry) => (
                <tr key={entry.uuid} className={cn("border-b border-border/60 last:border-b-0", !isActive(entry) && "bg-muted/20 text-muted-foreground")}>
                  {visibleColumns.payment ? <td className="px-4 py-2.5"><button className="font-medium text-foreground hover:underline" onClick={() => setView({ mode: "show", entry })} type="button">{entry.payment_no}</button></td> : null}
                  {visibleColumns.date ? <td className="px-4 py-2.5 text-muted-foreground">{formatDate(entry.payment_date)}</td> : null}
                  {visibleColumns.party ? <td className="px-4 py-2.5">{entry.party_name}</td> : null}
                  {visibleColumns.mode ? <td className="px-4 py-2.5 text-muted-foreground">{modeLabel(entry.payment_mode)}</td> : null}
                  {visibleColumns.ledger ? <td className="px-4 py-2.5 text-muted-foreground">{entry.ledger_name ?? "-"}</td> : null}
                  {visibleColumns.status ? <td className="px-4 py-2.5">{entry.status}</td> : null}
                  {visibleColumns.amount ? <td className="px-4 py-2.5 text-right">{formatMoney(entry.net_amount)}</td> : null}
                  {visibleColumns.unallocated ? <td className="px-4 py-2.5 text-right">{formatMoney(entry.unallocated_amount)}</td> : null}
                  {visibleColumns.updated ? <td className="px-4 py-2.5 text-muted-foreground">{formatDate(entry.updated_at)}</td> : null}
                  <td className="px-4 py-2 text-right">
                    <MasterListRowActions title={entry.payment_no} isSuspended={!isActive(entry)} onDelete={() => void destroy(entry)} onEdit={() => setView({ mode: "upsert", entry })} onRestore={() => void restore(entry)} onView={() => setView({ mode: "show", entry })} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {pageEntries.length === 0 ? <MasterListEmptyState>{entriesQuery.isFetching ? "Loading payments." : "No payments found."}</MasterListEmptyState> : null}
      </MasterListTableCard>
      <MasterListPaginationCard
        page={currentPage}
        rowsPerPage={rowsPerPage}
        showingLabel={buildMasterListShowingLabel({ page: currentPage, pageSize: rowsPerPage, totalCount: filteredEntries.length })}
        singularLabel="payment"
        totalCount={filteredEntries.length}
        totalPages={totalPages}
        onNextPage={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
        onPageChange={setCurrentPage}
        onPreviousPage={() => setCurrentPage((page) => Math.max(1, page - 1))}
        onRowsPerPageChange={(value) => {
          setRowsPerPage(value)
          setCurrentPage(1)
        }}
      />
    </MasterListPageFrame>
  )
}

function PaymentShowPage({ entry, isWorking, onBack, onComment, onDestroy, onEdit, onRestore, onTool, session }: {
  entry: PaymentEntry
  isWorking: boolean
  onBack(): void
  onComment(entry: PaymentEntry, body: string): Promise<void>
  onDestroy(): void
  onEdit(): void
  onRestore(): void
  onTool(entry: PaymentEntry, tool: string): Promise<void>
  session: AuthSession
}) {
  const [comment, setComment] = useState("")
  const [openTool, setOpenTool] = useState<PaymentToolId | null>(null)
  const [emailAddress, setEmailAddress] = useState("")
  const [whatsappNumber, setWhatsappNumber] = useState("")
  const [assigneeInput, setAssigneeInput] = useState("")
  const [tagInput, setTagInput] = useState("")
  const [assignees, setAssignees] = useState<string[]>([])
  const [attachments, setAttachments] = useState<string[]>([])
  const [tags, setTags] = useState<string[]>([])
  const [toolActivities, setToolActivities] = useState<Array<{ id: string; message: string; created_at: string }>>([])
  const companyQuery = useQuery({ queryKey: ["payment-print-company", session.selectedTenant.slug], queryFn: () => listCompanies(session) })
  const company = (companyQuery.data ?? []).find((item) => item.isPrimary) ?? companyQuery.data?.[0] ?? null
  const [softwareSettings] = useCompanySoftwareSettings(session)
  const entryTools: Array<{ icon: typeof Mail; id: PaymentToolId; label: string }> = [
    { icon: Mail, id: "email", label: "Send to Email" },
    { icon: UserRound, id: "assign", label: "Assign" },
    { icon: Paperclip, id: "attachments", label: "Attachments" },
    { icon: Tag, id: "tags", label: "Tags" },
    { icon: MessageCircle, id: "whatsapp", label: "Send to WhatsApp" },
  ]
  const activityItems = [...toolActivities, ...entry.activities]

  function recordToolActivity(message: string) {
    setToolActivities((current) => [{ id: `${Date.now()}-${current.length}`, message, created_at: new Date().toISOString() }, ...current])
  }

  function addListValue(value: string, setValue: (value: string) => void, setValues: Dispatch<SetStateAction<string[]>>, activityMessage: (value: string) => string) {
    const next = value.trim()
    if (!next) return
    setValues((current) => current.includes(next) ? current : [...current, next])
    recordToolActivity(activityMessage(next))
    setValue("")
  }

  function removeListValue(value: string, setValues: Dispatch<SetStateAction<string[]>>) {
    setValues((current) => current.filter((item) => item !== value))
  }

  return (
    <main className="theme-shell mx-auto min-h-screen w-[94%] pb-8 pt-8 text-black sm:w-[92%] lg:w-[90%] print:fixed print:inset-0 print:z-[9999] print:min-h-0 print:w-full print:overflow-visible print:bg-white print:p-0 payment-print-page">
      <div className="mx-auto mb-3 grid w-full gap-2 print:hidden">
        <div>
          <h1 className="text-3xl font-semibold tracking-normal text-foreground">{entry.party_name}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{entry.payment_no}</p>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" className="h-9 rounded-xl" onClick={onBack}><ArrowLeft className="size-4" />Back</Button>
            <Button type="button" variant="outline" className="h-9 rounded-xl" disabled><ChevronLeft className="size-4" />Prev</Button>
            <Button type="button" variant="outline" className="h-9 rounded-xl" disabled><ChevronRight className="size-4" />Next</Button>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button className="rounded-xl" onClick={() => window.print()} type="button"><Printer className="size-4" />Print</Button>
            <Button type="button" variant="outline" className="rounded-xl" onClick={onEdit}><Pencil className="size-4" />Edit</Button>
            {isActive(entry) ? <Button onClick={onDestroy} type="button" variant="destructive" className="rounded-xl"><Trash2 className="size-4" />Suspend</Button> : <Button onClick={onRestore} type="button" variant="outline" className="rounded-xl"><RotateCcw className="size-4" />Restore</Button>}
          </div>
        </div>
      </div>
      <section className="mx-auto w-fit max-w-full overflow-hidden rounded-md border border-border/70 bg-card shadow-sm print:contents">
        <div className="overflow-x-auto p-3 print:contents sm:p-4">
          <PaymentPrintDocument company={company} letterheadSettings={softwareSettings.letterheadSettings} record={entry} />
        </div>
      </section>
      <div className="mx-auto mt-4 grid w-full gap-4 xl:grid-cols-[minmax(0,1fr)_280px] print:hidden">
        <Card className="min-h-[350px] rounded-md border-border/70">
          <CardHeader><CardTitle className="text-lg">Comments</CardTitle></CardHeader>
          <CardContent className="space-y-8">
            <div className="flex items-center gap-3">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-semibold text-emerald-700">A</div>
              <Input value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Type a reply / comment" className="h-10 rounded-md shadow-sm" />
              <Button disabled={isWorking || !comment.trim()} onClick={() => void onComment(entry, comment).then(() => setComment(""))} type="button" className="h-10 rounded-md px-4">Add</Button>
            </div>
            {entry.comments.length ? <div className="space-y-2">{entry.comments.map((item) => <SideNote key={item.id} title={item.author_email} body={item.body} meta={formatDateTime(item.created_at)} />)}</div> : null}
            <div>
              <h2 className="mb-5 text-lg font-semibold">Activity</h2>
              <div className="relative space-y-5 before:absolute before:left-[6px] before:top-1 before:h-[calc(100%-0.25rem)] before:border-l-2 before:border-border">
                {activityItems.map((item) => (
                  <div key={item.id} className="relative pl-9 text-sm">
                    <span className="absolute left-0 top-0.5 flex size-3.5 items-center justify-center rounded-full border border-muted-foreground/10 bg-muted-foreground/10 shadow-sm backdrop-blur-[1px]"><span className="size-1.5 rounded-full bg-muted-foreground" /></span>
                    <span>{item.message}</span>
                    <span className="text-muted-foreground"> - {formatDate(item.created_at)}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="h-fit rounded-md border-border/70">
          <CardHeader className="flex flex-row items-center justify-between border-b border-border/70 px-3 py-2">
            <CardTitle className="flex items-center gap-2 text-sm"><Settings2 className="size-4" />Entry tools</CardTitle>
          </CardHeader>
          <CardContent className="p-0 [&:last-child]:pb-0">
            {entryTools.map((tool) => (
              <div key={tool.id} className="border-b border-border/70 last:border-b-0">
                <button disabled={isWorking} onClick={() => setOpenTool((current) => current === tool.id ? null : tool.id)} type="button" className="flex min-h-12 w-full items-center gap-3 px-3 py-2 text-left text-sm font-medium text-muted-foreground hover:bg-muted/50 disabled:cursor-not-allowed disabled:opacity-60">
                  <tool.icon className="size-4" />
                  <span className="flex-1">{tool.label}</span>
                  <Plus className={cn("size-4 transition-transform", openTool === tool.id ? "rotate-45" : "")} />
                </button>
                {tool.id === "assign" && assignees.length ? <div className="px-3 pb-2"><ToolPills values={assignees} onRemove={(value) => removeListValue(value, setAssignees)} /></div> : null}
                {tool.id === "attachments" && attachments.length ? <div className="px-3 pb-2"><ToolPills values={attachments} onRemove={(value) => removeListValue(value, setAttachments)} /></div> : null}
                {tool.id === "tags" && tags.length ? <div className="px-3 pb-2"><ToolPills values={tags} onRemove={(value) => removeListValue(value, setTags)} /></div> : null}
                {openTool === tool.id ? (
                  <div className="px-3 pb-2">
                    {tool.id === "email" ? <ToolSendInput disabled={isWorking} placeholder="Email address" value={emailAddress} onChange={setEmailAddress} onSend={(value) => void onTool(entry, `Send to Email: ${value}`).then(() => { recordToolActivity(`Sent payment email to ${value}`); setEmailAddress("") })} /> : null}
                    {tool.id === "assign" ? <Input value={assigneeInput} onChange={(event) => setAssigneeInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addListValue(assigneeInput, setAssigneeInput, setAssignees, (value) => `Assigned ${entry.payment_no} to ${value}`) } }} placeholder="User name or email" className="h-9 rounded-md" /> : null}
                    {tool.id === "attachments" ? <Input type="file" multiple className="h-9 rounded-md" onChange={(event) => { const names = Array.from(event.target.files ?? []).map((file) => file.name); if (names.length) setAttachments((current) => [...current, ...names.filter((name) => !current.includes(name))]); names.forEach((name) => recordToolActivity(`Attached file ${name}`)); event.currentTarget.value = "" }} /> : null}
                    {tool.id === "tags" ? <Input value={tagInput} onChange={(event) => setTagInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addListValue(tagInput, setTagInput, setTags, (value) => `Added tag ${value}`) } }} placeholder="Tag" className="h-9 rounded-md" /> : null}
                    {tool.id === "whatsapp" ? <ToolSendInput disabled={isWorking} placeholder="WhatsApp number" value={whatsappNumber} onChange={setWhatsappNumber} onSend={(value) => void onTool(entry, `Send to WhatsApp: ${value}`).then(() => { recordToolActivity(`Sent WhatsApp message to ${value}`); setWhatsappNumber("") })} /> : null}
                  </div>
                ) : null}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </main>
  )
}

function PaymentUpsertPage({ entry, isSaving, onBack, onSubmit, session }: {
  entry: PaymentEntry | null
  isSaving: boolean
  onBack(): void
  onSubmit(input: PaymentEntryInput, printAfterSave?: boolean): Promise<void>
  session: AuthSession
}) {
  const [draft, setDraft] = useState<PaymentEntryInput>(() => entry ? { ...entry, allocations: entry.allocations.map((item) => ({ ...item })) } : emptyPaymentEntry())
  const [contactCreateInitialName, setContactCreateInitialName] = useState<string | null>(null)
  const contactsQuery = useQuery({ queryKey: ["payment-contact-lookups", session.selectedTenant.slug], queryFn: () => listPaymentContactLookups(session) })
  const contactTypesQuery = useQuery({ queryKey: ["payment-contact-types", session.selectedTenant.slug], queryFn: () => listMasterDataRecords(session, "contactTypes") })
  const companyQuery = useQuery({ queryKey: ["payment-company-bank", session.selectedTenant.slug], queryFn: () => listCompanies(session) })
  const nextPaymentQuery = useQuery({ enabled: !entry, queryKey: ["document-number-next-preview", session.selectedTenant.slug, "payment"], queryFn: () => nextDocumentNumberSetting(session, "payment"), refetchOnMount: "always" })
  const bankAccounts = ((companyQuery.data ?? []).find((company) => company.isPrimary) ?? companyQuery.data?.[0])?.bankAccounts ?? []
  const supplierContacts = useMemo(() => filterStockContactLookupOptions(contactsQuery.data ?? [], contactTypesQuery.data ?? [], "supplier"), [contactsQuery.data, contactTypesQuery.data])

  useEffect(() => {
    if (entry || draft.payment_no || !nextPaymentQuery.data?.preview) return
    setDraft((current) => current.payment_no ? current : { ...current, payment_no: nextPaymentQuery.data.preview })
  }, [draft.payment_no, entry, nextPaymentQuery.data?.preview])

  const tabs: AnimatedTab[] = [
    { value: "details", label: "Details", content: <PaymentDetailsTab bankAccounts={bankAccounts} contacts={supplierContacts} form={draft} onCreateContact={setContactCreateInitialName} session={session} setForm={setDraft} /> },
    { value: "allocations", label: "Allocations", content: <PaymentAllocationsTab form={draft} setForm={setDraft} /> },
  ]

  return (
    <MasterListPageFrame
      title={entry ? "Edit payment" : "New payment"}
      description="Create a tabbed outgoing payment with allocation details."
      technicalName="page.entries.payment.upsert"
      action={<Button type="button" variant="outline" className="rounded-xl" onClick={onBack}><X className="size-4" />Cancel</Button>}
      className="w-[calc(100%-2rem)] max-w-[1500px] sm:w-[calc(100%-3rem)] lg:w-[calc(100%-4rem)]"
    >
      <MasterListUpsertLayout>
        <MasterListUpsertCard className="overflow-hidden p-0 [&>div]:p-0">
          <form onSubmit={(event) => { event.preventDefault(); void onSubmit(draft) }}>
            <div className="px-0 pb-4 pt-3 md:pb-5">
              <AnimatedTabs
                className="[&>div:first-child]:rounded-none [&>div:first-child]:border-x-0 [&>div:first-child]:border-t-0 [&>div:first-child]:border-b [&>div:first-child]:border-border/70 [&>div:first-child]:bg-card [&>div:first-child]:px-4 [&>div:first-child]:py-0.5 [&>div:first-child]:shadow-none md:[&>div:first-child]:px-6 [&>div:first-child_button]:min-h-8 [&>div:first-child_button]:py-1 [&>div:last-child]:mx-auto [&>div:last-child]:mt-3 [&>div:last-child]:w-full [&>div:last-child]:px-4 [&>div:last-child]:pb-3 md:[&>div:last-child]:px-6 md:[&>div:last-child]:pb-4"
                tabs={tabs}
              />
            </div>
            <div className="flex flex-wrap justify-start gap-3 border-t border-border/70 bg-muted/20 px-4 py-4 md:px-6">
              <Button type="submit" disabled={isSaving} className="rounded-xl"><Save className={cn("size-4", isSaving && "animate-spin")} />Save</Button>
              <Button type="button" disabled={isSaving} variant="secondary" onClick={() => void onSubmit({ ...draft, status: "posted" }, true)} className="rounded-xl"><Printer className="size-4" />Save & Print</Button>
              <Button type="button" variant="outline" onClick={onBack} className="rounded-xl"><ArrowLeft className="size-4" />Cancel</Button>
            </div>
          </form>
          {contactCreateInitialName ? (
            <PaymentContactCreateDialog
              contacts={contactsQuery.data ?? []}
              initialName={contactCreateInitialName}
              session={session}
              onClose={() => setContactCreateInitialName(null)}
              onCreated={(contact) => {
                setDraft((current) => ({ ...current, party_id: contact.id, party_name: lookupName(contact), party_type: "supplier" }))
                setContactCreateInitialName(null)
                void contactsQuery.refetch()
              }}
            />
          ) : null}
        </MasterListUpsertCard>
      </MasterListUpsertLayout>
    </MasterListPageFrame>
  )
}

function PaymentDetailsTab({ bankAccounts, contacts, form, onCreateContact, session, setForm }: { bankAccounts: CompanyBankAccount[]; contacts: PaymentLookupOption[]; form: PaymentEntryInput; onCreateContact(name: string): void; session: AuthSession; setForm: Dispatch<SetStateAction<PaymentEntryInput>> }) {
  const needsBank = isBankTransferMode(form.payment_mode ?? "cash")
  const bankOptions = useMemo(() => bankAccounts.filter((bank) => bank.isActive).sort((left, right) => Number(right.isPrimary) - Number(left.isPrimary)), [bankAccounts])
  const selectedBank = bankOptions.find((bank) => String(bank.id ?? bank.accountNumber) === String(form.bank_account_id ?? ""))

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <div className="space-y-5">
        <MasterAutocompleteLookup
          createLabel="Create contact"
          label="Supplier name *"
          options={contacts}
          placeholder="Search supplier"
          selectedId={form.party_id ?? null}
          selectedLabel={form.party_name ?? ""}
          onPick={(option) => setForm((current) => ({ ...current, party_id: option.id, party_name: lookupName(option), party_type: "supplier" }))}
          onCreate={onCreateContact}
          onTextChange={(value) => setForm((current) => ({ ...current, party_id: null, party_name: value }))}
        />
        <Field label="Amount" numeric value={String(form.amount ?? 0)} onChange={(value) => setForm((current) => ({ ...current, amount: parseDecimalInput(value) }))} />
        <WorkOrderAutocomplete session={session} value={form.reference_no ?? ""} onChange={(value) => setForm((current) => ({ ...current, reference_no: value }))} />
      </div>
      <div className="space-y-5">
        <Field label="Payment no" value={form.payment_no ?? ""} onChange={(value) => setForm((current) => ({ ...current, payment_no: value }))} />
        <Field label="Date" type="date" value={String(form.payment_date ?? "")} onChange={(value) => setForm((current) => ({ ...current, payment_date: value }))} />
        <div className="grid gap-2">
          <Label className="text-sm font-medium text-muted-foreground">Mode</Label>
          <Select value={form.payment_mode ?? "cash"} onValueChange={(value) => setForm((current) => ({ ...current, bank_account_id: null, ledger_name: isBankTransferMode(value) ? null : "Cash", payment_mode: value }))}>
            <SelectTrigger className="h-11 min-h-11 w-full rounded-md bg-background px-3 text-left font-normal"><SelectValue /></SelectTrigger>
            <SelectContent align="start" position="popper" className="w-[var(--radix-select-trigger-width)]">{paymentModeOptions.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        {needsBank ? (
          <BankAutocompleteLookup
            label="Paid from bank"
            options={bankOptions}
            placeholder="Search company bank account"
            selectedId={form.bank_account_id ?? null}
            selectedLabel={selectedBank ? companyBankAccountLabel(selectedBank) : ""}
            onPick={(bank) => setForm((current) => ({ ...current, bank_account_id: String(bank.id ?? bank.accountNumber), ledger_name: companyBankAccountLabel(bank) }))}
            onTextChange={(value) => setForm((current) => ({ ...current, bank_account_id: null, ledger_name: value }))}
          />
        ) : null}
        <TextField label="Notes" value={form.notes ?? ""} onChange={(value) => setForm((current) => ({ ...current, notes: value }))} />
      </div>
    </div>
  )
}

function PaymentAllocationsTab({ form, setForm }: { form: PaymentEntryInput; setForm: Dispatch<SetStateAction<PaymentEntryInput>> }) {
  const allocations = form.allocations.length ? form.allocations : [emptyPaymentAllocation()]
  return (
    <div className="space-y-3">
      {allocations.map((allocation, index) => (
        <div key={index} className="grid gap-3 rounded-md border border-border/70 p-3 md:grid-cols-4">
          <Input value={allocation.document_no} placeholder="Purchase no" onChange={(event) => setAllocation(setForm, index, { document_no: event.target.value })} />
          <Input type="date" value={allocation.document_date ?? ""} onChange={(event) => setAllocation(setForm, index, { document_date: event.target.value })} />
          <DecimalInput value={String(allocation.previous_balance ?? 0)} placeholder="Balance" onChange={(value) => setAllocation(setForm, index, { previous_balance: parseDecimalInput(value) })} />
          <DecimalInput value={String(allocation.allocated_amount ?? 0)} placeholder="Allocated" onChange={(value) => setAllocation(setForm, index, { allocated_amount: parseDecimalInput(value) })} />
        </div>
      ))}
      <Button type="button" variant="outline" className="rounded-xl" onClick={() => setForm((current) => ({ ...current, allocations: [...allocations, { ...emptyPaymentAllocation(), sort_order: allocations.length + 1 }] }))}>Add allocation</Button>
    </div>
  )
}

function PaymentPrintDocument({ company, letterheadSettings, record }: { company: CompanyRecord | null; letterheadSettings?: Parameters<typeof LetterheadBuilder>[0]["settings"]; record: PaymentEntry }) {
  const companyName = company?.legalName?.trim() || company?.name || ""
  return (
    <section className="mx-auto w-[210mm] max-w-full bg-white p-4 font-[Verdana,Arial,sans-serif] text-[10px] text-black print:w-[198mm] print:p-0 payment-print-sheet">
      <div className="grid grid-cols-[1fr_auto_1fr] border border-gray-400 border-b-0 px-2 py-1">
        <span />
        <span className="text-[12px] font-bold">PAYMENT VOUCHER</span>
        <span className="text-right">Original Copy</span>
      </div>
      <div className="border border-gray-400 border-b-0">
        <LetterheadBuilder company={company} settings={letterheadSettings} />
      </div>
      <div className="grid grid-cols-2 border border-gray-400 border-b-0">
        <div className="space-y-1 border-r border-gray-400 p-2">
          <PrintLine label="Payment No">{record.payment_no}</PrintLine>
          <PrintLine label="Payment Date">{formatDate(record.payment_date)}</PrintLine>
          <PrintLine label="Supplier">{record.party_name}</PrintLine>
        </div>
        <div className="space-y-1 p-2">
          <PrintLine label="Mode">{modeLabel(record.payment_mode)}</PrintLine>
          <PrintLine label={isBankTransferMode(record.payment_mode) ? "Paid from bank" : "Ledger"}>{record.ledger_name ?? ""}</PrintLine>
          <PrintLine label="Work Order">{record.reference_no ?? ""}</PrintLine>
        </div>
      </div>
      <table className="money-voucher-table w-full border-collapse border border-gray-400">
        <tbody>
          <tr>
            <td className="w-1/2 border-r border-gray-400 p-2 align-top">
              <div className="text-[8px]">Amount (in words)</div>
              <b>{numberToIndianCurrencyWords(record.net_amount)} Only</b>
            </td>
            <td className="w-1/2 p-0 align-top">
              <table className="w-full border-collapse">
                <tbody>
                  <PaymentSummaryLine label="Amount" value={formatMoney(record.amount)} />
                  <PaymentSummaryLine label="Round Off" value={formatMoney(record.round_off)} />
                  <PaymentSummaryLine label="Net Amount" value={formatMoney(record.net_amount)} strong />
                </tbody>
              </table>
            </td>
          </tr>
          <tr className="money-voucher-sign-row">
            <td className="h-24 border-r border-t border-gray-400 p-2 align-top">Receiver Sign</td>
            <td className="h-24 border-t border-gray-400 p-2 align-top">
              <div className="flex h-full flex-col">
                <div className="font-bold">For {companyName}</div>
                <div className="mt-auto text-right font-bold">Authorised Signatory</div>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
      <div className="money-voucher-jurisdiction px-2 py-0.5 text-left text-[8px] font-bold">Subject to Tiruppur Jurisdiction</div>
    </section>
  )
}

function setAllocation(setForm: Dispatch<SetStateAction<PaymentEntryInput>>, index: number, patch: Partial<PaymentAllocation>) {
  setForm((current) => ({ ...current, allocations: (current.allocations.length ? current.allocations : [emptyPaymentAllocation()]).map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item) }))
}

function preparePaymentInput(input: PaymentEntryInput): PaymentEntryInput {
  return {
    ...input,
    amount: Number(input.amount || 0),
    discount_amount: Number(input.discount_amount || 0),
    party_name: String(input.party_name ?? "").trim(),
    payment_no: String(input.payment_no ?? "").trim(),
    round_off: Number(input.round_off || 0),
    tds_amount: Number(input.tds_amount || 0),
    allocations: input.allocations.map((allocation, index) => ({ ...allocation, allocated_amount: Number(allocation.allocated_amount || 0), document_no: allocation.document_no.trim(), document_total: Number(allocation.document_total || 0), previous_balance: Number(allocation.previous_balance || 0), sort_order: index + 1 })).filter((allocation) => allocation.document_no || allocation.allocated_amount > 0),
  }
}

function PaymentContactCreateDialog({ contacts, initialName, onClose, onCreated, session }: { contacts: PaymentLookupOption[]; initialName: string; onClose(): void; onCreated(contact: PaymentLookupOption): void; session: AuthSession }) {
  const [draft, setDraft] = useState<ContactInput>(() => ({ ...emptyContact(), code: normalizeContactCode(initialName), contactTypeId: "contact-type:supplier", ledgerId: "ledger:sundry-creditors", ledgerName: "Supplier", legalName: initialName, name: initialName }))
  const [error, setError] = useState<string | null>(null)
  const contactTypesQuery = useQuery({ queryKey: ["Payment-contact-types", session.selectedTenant.slug], queryFn: () => listMasterDataRecords(session, "contactTypes") })
  const createMutation = useMutation({
    mutationFn: (input: ContactInput) => upsertContact(session, input),
    onSuccess: (contact) => {
      toast.success("Contact created", { description: contact.name })
      onCreated(contactToPaymentLookupOption(contact))
    },
  })

  async function save() {
    const name = String(draft.name ?? "").trim()
    if (!name) {
      setError("Supplier name is required.")
      return
    }
    const gstin = String(draft.gstin ?? "").trim().toUpperCase()
    if (gstin && contacts.some((contact) => String(contact.record.gstin ?? "").trim().toUpperCase() === gstin)) {
      setError(`GSTIN ${gstin} already exists in contacts.`)
      return
    }
    const contactTypes = contactTypesQuery.data ?? (await contactTypesQuery.refetch()).data ?? []
    setError(null)
    await createMutation.mutateAsync({ ...draft, code: String(draft.code ?? "").trim() || normalizeContactCode(name), contactTypeId: stockContactTypeId(contactTypes, "supplier"), gstin, ledgerId: draft.ledgerId ?? "ledger:sundry-creditors", ledgerName: draft.ledgerName ?? "Supplier", legalName: String(draft.legalName ?? "").trim() || name, name })
  }

  return (
    <div className="fixed inset-0 z-[160] grid place-items-center bg-background/55 p-4 backdrop-blur-sm">
      <div className="w-[min(560px,calc(100vw-2rem))] overflow-hidden rounded-md border border-border/70 bg-card shadow-xl">
        <div className="flex items-center justify-between border-b border-border/70 px-5 py-4">
          <div>
            <h2 className="text-base font-semibold">Create contact</h2>
            <p className="text-sm text-muted-foreground">Add payment-ready supplier details.</p>
          </div>
          <Button size="icon" variant="ghost" onClick={onClose} type="button"><X className="size-4" /></Button>
        </div>
        <div className="grid gap-4 p-5 md:grid-cols-2">
          <Field label="Supplier name *" value={String(draft.name ?? "")} onChange={(name) => setDraft((current) => ({ ...current, name, legalName: current.legalName || name }))} />
          <Field label="Code" value={String(draft.code ?? "")} onChange={(code) => setDraft((current) => ({ ...current, code: normalizeContactCode(code) }))} />
          <Field label="Legal name" value={String(draft.legalName ?? "")} onChange={(legalName) => setDraft((current) => ({ ...current, legalName }))} />
          <Field label="GSTIN" value={String(draft.gstin ?? "")} onChange={(gstin) => setDraft((current) => ({ ...current, gstin: gstin.toUpperCase(), gstDetails: gstin.trim() ? [{ gstin: gstin.toUpperCase(), state: "", isDefault: true, isActive: true }] : [] }))} />
        </div>
        {error ? <p className="px-5 pb-3 text-sm font-medium text-destructive">{error}</p> : null}
        <div className="flex flex-wrap items-center gap-3 border-t border-border/70 bg-muted/20 px-5 py-4">
          <Button disabled={createMutation.isPending} onClick={() => void save()} type="button" className="rounded-md"><Save className={cn("size-4", createMutation.isPending && "animate-spin")} />Save contact</Button>
          <Button disabled={createMutation.isPending} onClick={onClose} type="button" variant="outline" className="rounded-md"><X className="size-4" />Cancel</Button>
        </div>
      </div>
    </div>
  )
}

function contactToPaymentLookupOption(contact: ContactRecord): PaymentLookupOption {
  return { id: String(contact.uuid ?? contact.id), label: [contact.code, contact.name].filter(Boolean).join(" - ") || contact.name, code: contact.code, record: contact as unknown as MasterDataRecord }
}

function MasterAutocompleteLookup({ createLabel, inputRef, label, onCreate, onPick, onTextChange, options, placeholder, selectedId, selectedLabel }: { createLabel?: string; inputRef?: Ref<HTMLInputElement>; label: string; onCreate?(query: string): void; onPick(option: PaymentLookupOption): void; onTextChange(value: string): void; options: PaymentLookupOption[]; placeholder: string; selectedId: string | null; selectedLabel: string }) {
  const [activeIndex, setActiveIndex] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState(selectedLabel)
  const normalizedQuery = query.trim().toLowerCase()
  const filteredOptions = options.filter((option) => lookupName(option).toLowerCase().includes(normalizedQuery) || option.label.toLowerCase().includes(normalizedQuery) || (option.code ?? "").toLowerCase().includes(normalizedQuery))
  const exactOption = options.find((option) => lookupName(option).toLowerCase() === normalizedQuery || option.label.toLowerCase() === normalizedQuery || (option.code ?? "").toLowerCase() === normalizedQuery)
  const canCreate = Boolean(onCreate && query.trim() && !exactOption)
  const optionCount = filteredOptions.length + (canCreate ? 1 : 0)

  useEffect(() => {
    if (!isOpen) setQuery(selectedLabel)
  }, [isOpen, selectedLabel])

  function selectOption(option: PaymentLookupOption) {
    setQuery(lookupName(option))
    onPick(option)
    setIsOpen(false)
  }

  return (
    <div className="relative z-10 grid w-full gap-2 focus-within:z-[90]">
      <Label className="text-sm font-medium text-muted-foreground">{label}</Label>
      <Input
        ref={inputRef}
        role="combobox"
        className="h-11 w-full rounded-md bg-background"
        placeholder={placeholder}
        value={query}
        onBlur={() => { if (exactOption) selectOption(exactOption); else window.setTimeout(() => { setIsOpen(false); setQuery(selectedLabel) }, 120) }}
        onChange={(event) => { setQuery(event.target.value); setIsOpen(true); setActiveIndex(0); onTextChange(event.target.value) }}
        onFocus={() => setIsOpen(true)}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") { event.preventDefault(); setIsOpen(true); setActiveIndex((current) => optionCount ? (current + 1) % optionCount : 0) }
          if (event.key === "ArrowUp") { event.preventDefault(); setIsOpen(true); setActiveIndex((current) => optionCount ? (current - 1 + optionCount) % optionCount : 0) }
          if (event.key === "Enter") { event.preventDefault(); if (filteredOptions[activeIndex]) selectOption(filteredOptions[activeIndex]); else if (canCreate && activeIndex === filteredOptions.length) { onCreate?.(query.trim()); setIsOpen(false) } }
          if (event.key === "Escape") { event.preventDefault(); setIsOpen(false); setQuery(selectedLabel) }
        }}
      />
      {isOpen && optionCount ? (
        <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-[100] max-h-60 overflow-y-auto rounded-md border border-border bg-card p-1 shadow-2xl" onMouseDown={(event) => event.preventDefault()}>
          {filteredOptions.map((option, index) => {
            const isSelected = selectedId ? option.id === selectedId : lookupName(option) === selectedLabel
            return (
              <button key={`${option.id}-${index}`} type="button" className={activeIndex === index ? "flex w-full items-center justify-between gap-3 rounded-md bg-muted px-3 py-2 text-left text-sm" : "flex w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-left text-sm hover:bg-muted"} onMouseDown={(event) => { event.preventDefault(); selectOption(option) }}>
                <span className="min-w-0 truncate">{lookupName(option)}</span>
                {isSelected ? <Check className="size-4 shrink-0 text-emerald-600" strokeWidth={3} /> : <span className="size-4 shrink-0" />}
              </button>
            )
          })}
          {canCreate ? (
            <button type="button" className={activeIndex === filteredOptions.length ? "flex w-full items-center gap-2 rounded-md bg-muted px-3 py-2 text-left text-sm font-medium" : "flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-medium hover:bg-muted"} onMouseDown={(event) => { event.preventDefault(); onCreate?.(query.trim()); setIsOpen(false) }}>
              <Plus className="size-4" />{createLabel ?? "Create"} "{query.trim()}"
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

function normalizeContactCode(value: string) {
  return value.trim().toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 40)
}

function BankAutocompleteLookup({ label, onPick, onTextChange, options, placeholder, selectedId, selectedLabel }: { label: string; onPick(option: CompanyBankAccount): void; onTextChange(value: string): void; options: CompanyBankAccount[]; placeholder: string; selectedId: string | null; selectedLabel: string }) {
  const lookupOptions = options.map((bank) => ({ id: String(bank.id ?? bank.accountNumber), label: companyBankAccountLabel(bank), bank }))
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState(selectedLabel)
  const filteredOptions = lookupOptions.filter((option) => option.label.toLowerCase().includes(query.trim().toLowerCase()))

  useEffect(() => {
    if (!isOpen) setQuery(selectedLabel)
  }, [isOpen, selectedLabel])

  return (
    <div className="relative z-10 grid w-full gap-2 focus-within:z-[90]">
      <Label className="text-sm font-medium text-muted-foreground">{label}</Label>
      <Input className="h-11 rounded-md" placeholder={placeholder} value={query} onBlur={() => window.setTimeout(() => { setIsOpen(false); setQuery(selectedLabel) }, 120)} onChange={(event) => { setQuery(event.target.value); setIsOpen(true); onTextChange(event.target.value) }} onFocus={() => setIsOpen(true)} />
      {isOpen && filteredOptions.length ? (
        <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-[100] max-h-60 overflow-y-auto rounded-md border border-border bg-card p-1 shadow-2xl" onMouseDown={(event) => event.preventDefault()}>
          {filteredOptions.map((option) => <button key={option.id} type="button" className="flex w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-left text-sm hover:bg-muted" onMouseDown={(event) => { event.preventDefault(); setQuery(option.label); onPick(option.bank); setIsOpen(false) }}><span className="truncate">{option.label}</span>{selectedId === option.id ? <Check className="size-4 text-emerald-600" /> : <span className="size-4" />}</button>)}
        </div>
      ) : null}
    </div>
  )
}

function DecimalInput({ onChange, placeholder, value }: { onChange(value: string): void; placeholder?: string; value: string }) {
  const [displayValue, setDisplayValue] = useState(value)
  const [isFocused, setIsFocused] = useState(false)

  useEffect(() => {
    if (!isFocused) setDisplayValue(value)
  }, [isFocused, value])

  return (
    <Input
      inputMode="decimal"
      placeholder={placeholder}
      type="text"
      value={displayValue}
      onBlur={() => {
        setIsFocused(false)
        setDisplayValue(String(parseDecimalInput(displayValue)))
      }}
      onChange={(event) => {
        const nextValue = sanitizeDecimalInput(event.target.value)
        setDisplayValue(nextValue)
        onChange(nextValue)
      }}
      onFocus={() => {
        setIsFocused(true)
        setDisplayValue(value)
      }}
    />
  )
}

function Field({ label, numeric = false, onChange, type = "text", value }: { label: string; numeric?: boolean; onChange(value: string): void; type?: string; value: string }) {
  const [displayValue, setDisplayValue] = useState(value)
  const [isFocused, setIsFocused] = useState(false)

  useEffect(() => {
    if (!isFocused) setDisplayValue(value)
  }, [isFocused, value])

  if (numeric) {
    return (
      <div className="grid gap-2">
        <Label className="text-sm font-medium text-muted-foreground">{label}</Label>
        <Input
          className="h-11 rounded-md text-left text-lg font-semibold"
          inputMode="decimal"
          type="text"
          value={displayValue}
          onBlur={() => {
            setIsFocused(false)
            setDisplayValue(String(parseDecimalInput(displayValue)))
          }}
          onChange={(event) => {
            const nextValue = sanitizeDecimalInput(event.target.value)
            setDisplayValue(nextValue)
            onChange(nextValue)
          }}
          onFocus={() => {
            setIsFocused(true)
            setDisplayValue(value)
          }}
        />
      </div>
    )
  }

  return <div className="grid gap-2"><Label className="text-sm font-medium text-muted-foreground">{label}</Label><Input className={cn("h-11 rounded-md", numeric && "text-left text-lg font-semibold")} inputMode={numeric ? "decimal" : undefined} type={type} value={value} onChange={(event) => onChange(event.target.value)} /></div>
}

function sanitizeDecimalInput(value: string) {
  const sanitized = value.replace(/[^0-9.]/g, "")
  const [integerPart = "", ...decimalParts] = sanitized.split(".")
  return decimalParts.length ? `${integerPart}.${decimalParts.join("")}` : integerPart
}

function parseDecimalInput(value: string) {
  const normalized = sanitizeDecimalInput(value)
  if (normalized === "" || normalized === ".") return 0
  return Number(normalized)
}

function TextField({ label, onChange, value }: { label: string; onChange(value: string): void; value: string }) {
  return <div className="grid gap-2"><Label className="text-sm font-medium text-muted-foreground">{label}</Label><Textarea className="min-h-[5.5rem] rounded-md" value={value} onChange={(event) => onChange(event.target.value)} /></div>
}

function ToolSendInput({ disabled, onChange, onSend, placeholder, value }: { disabled: boolean; onChange(value: string): void; onSend(value: string): void; placeholder: string; value: string }) {
  return <div className="flex gap-2"><Input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="h-9 rounded-md" /><Button disabled={disabled || !value.trim()} onClick={() => onSend(value.trim())} type="button" className="size-9 rounded-md p-0"><Send className="size-4" /></Button></div>
}

function ToolPills({ onRemove, values }: { onRemove(value: string): void; values: readonly string[] }) {
  return <div className="flex flex-wrap gap-2">{values.map((value) => <span key={value} className="inline-flex h-7 max-w-full items-center gap-1 rounded-md bg-muted px-2 text-xs font-medium"><span className="truncate">{value}</span><button aria-label={`Remove ${value}`} className="rounded-sm text-muted-foreground hover:text-foreground" onClick={() => onRemove(value)} type="button"><X className="size-3" /></button></span>)}</div>
}

function SideNote({ body, meta, title }: { body: string; meta: string; title: string }) {
  return <div className="grid grid-cols-[1fr_auto] gap-4 rounded-md border border-border/70 px-3 py-3"><div className="text-sm">{body}</div><div className="text-right"><div className="text-sm font-semibold">{title}</div><div className="mt-1 text-xs text-muted-foreground">{meta}</div></div></div>
}

function PrintLine({ children, label }: { children: ReactNode; label: string }) {
  return <div className="grid grid-cols-[90px_1fr] gap-2"><span className="font-bold">{label}:</span><span>{children}</span></div>
}

function PaymentSummaryLine({ label, strong = false, value }: { label: string; strong?: boolean; value: string }) {
  return <tr className={strong ? "font-bold" : ""}><td className="border-b border-r border-gray-400 px-2 py-1">{label}</td><td className="border-b border-gray-400 px-2 py-1 text-right">{value}</td></tr>
}

function ListHeader({ children, className }: { children: ReactNode; className?: string }) {
  return <th className={cn("border-b border-border/70 px-4 py-2.5 text-left text-sm font-medium text-foreground", className)}>{children}</th>
}

function isBankTransferMode(mode: string) {
  return mode !== "cash"
}

function isActive(entry: PaymentEntry) {
  return entry.is_active === true || entry.is_active === 1
}

function lookupName(option: PaymentLookupOption) {
  const name = typeof option.record.name === "string" ? option.record.name.trim() : ""
  return name || option.label
}

function companyBankAccountLabel(bank: CompanyBankAccount) {
  const suffix = [bank.accountNumber ? maskAccountNumber(bank.accountNumber) : "", bank.branch ?? ""].filter(Boolean).join(" / ")
  return suffix ? `${bank.bankName || "Bank"} - ${suffix}` : bank.bankName || "Bank"
}

function maskAccountNumber(value: string) {
  const trimmed = value.trim()
  return trimmed.length <= 4 ? trimmed : `****${trimmed.slice(-4)}`
}

function modeLabel(value: string) {
  return paymentModeOptions.find((option) => option.value === value)?.label ?? value
}

function searchPayments(entries: PaymentEntry[], searchValue: string) {
  const normalized = searchValue.trim().toLowerCase()
  if (!normalized) return entries
  return entries.filter((entry) => [entry.payment_no, entry.payment_date, entry.party_name, entry.payment_mode, entry.ledger_name, entry.reference_no, entry.status].filter(Boolean).some((value) => String(value).toLowerCase().includes(normalized)))
}

function filterPayments(entries: PaymentEntry[], statusFilter: string) {
  return statusFilter === "all" ? entries : entries.filter((entry) => entry.status === statusFilter)
}

function formatDate(value?: string | null) {
  if (!value) return "-"
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(new Date(value))
}

function formatDateTime(value?: string | null) {
  if (!value) return "Not set"
  return new Intl.DateTimeFormat(undefined, { day: "2-digit", hour: "2-digit", hour12: true, minute: "2-digit", month: "short", year: "numeric" }).format(new Date(value))
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-IN", { currency: "INR", style: "currency" }).format(Number(value ?? 0))
}

function numberToIndianCurrencyWords(value: number) {
  const rupees = Math.floor(Math.abs(Number(value) || 0))
  const paise = Math.round((Math.abs(Number(value) || 0) - rupees) * 100)
  const words = `${numberToWords(rupees)} Rupees`
  return paise ? `${words} and ${numberToWords(paise)} Paise` : words
}

function numberToWords(value: number): string {
  const ones = ["Zero", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"]
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"]
  if (value < 20) return ones[value]
  if (value < 100) return `${tens[Math.floor(value / 10)]}${value % 10 ? ` ${ones[value % 10]}` : ""}`
  if (value < 1000) return `${ones[Math.floor(value / 100)]} Hundred${value % 100 ? ` ${numberToWords(value % 100)}` : ""}`
  const units: Array<[number, string]> = [[10000000, "Crore"], [100000, "Lakh"], [1000, "Thousand"]]
  for (const [amount, label] of units) {
    if (value >= amount) return `${numberToWords(Math.floor(value / amount))} ${label}${value % amount ? ` ${numberToWords(value % amount)}` : ""}`
  }
  return "Zero"
}
