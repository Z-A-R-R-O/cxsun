import { useEffect, useMemo, useState, type Dispatch, type ReactNode, type Ref, type SetStateAction } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { ArrowLeft, Check, ChevronLeft, ChevronRight, Download, Mail, MessageCircle, Paperclip, Pencil, Plus, Printer, RefreshCw, RotateCcw, Save, Send, Settings2, Tag, Trash2, UserRound, X } from "lucide-react"
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
import { capturePrintDocument } from "src/shared/print/capture-print-document"
import type { AuthSession } from "src/features/auth/auth-client"
import { listCompanies, type CompanyRecord } from "src/features/company/company-client"
import { LetterheadBuilder } from "src/features/company/letterhead-builder"
import { emptyContact, upsertContact, type ContactInput, type ContactRecord } from "src/features/contact/contact-client"
import { LedgerAutocompleteLookup } from "src/features/accounts/accounts-book-page"
import { listAllAccountLedgers, type AccountLedger } from "src/features/accounts/accounts-client"
import type { MasterDataRecord } from "src/features/master-data/domain/master-data"
import { WorkOrderAutocomplete } from "src/features/master-data/interface/components/work-order-autocomplete"
import { listMasterDataRecords } from "src/features/master-data/infrastructure/master-data-client"
import { nextDocumentNumberSetting } from "src/features/settings/document-settings-client"
import { useCompanySoftwareSettings } from "src/features/settings/use-company-software-settings"
import { filterStockContactLookupOptions, stockContactTypeId } from "src/features/stock/contact-role-filter"
import { listSalesEntries, type SalesEntry } from "src/features/sales/sales-client"
import {
  addReceiptComment,
  createReceiptCorrection,
  createReceiptReversal,
  downloadReceiptPdf,
  destroyReceiptEntry,
  emptyReceiptAllocation,
  emptyReceiptEntry,
  listReceiptContactLookups,
  listReceiptEntries,
  restoreReceiptEntry,
  runReceiptTool,
  upsertReceiptEntry,
  type ReceiptAllocation,
  type ReceiptEntry,
  type ReceiptEntryInput,
  type ReceiptLookupOption,
} from "./receipt-client"

type ReceiptView = { mode: "list" } | { mode: "show"; entry: ReceiptEntry } | { mode: "upsert"; entry: ReceiptEntry | null }
type ReceiptColumnId = "amount" | "date" | "ledger" | "mode" | "party" | "receipt" | "status" | "unallocated" | "updated"
type ReceiptToolId = "downloadPdf" | "email" | "assign" | "attachments" | "tags" | "whatsapp"
type EntryListViewMode = "day" | "month"
type MonthlyReceiptSummary = { month: string; entryCount: number; amount: number; tdsAmount: number; discountAmount: number; roundOff: number; netAmount: number; allocatedAmount: number; unallocatedAmount: number }

const receiptModeOptions = [
  { label: "Cash", value: "cash" },
  { label: "RTGS Transfer", value: "rtgs-transfer" },
  { label: "NEFT Transfer", value: "neft-transfer" },
  { label: "UPI Transfer", value: "upi-transfer" },
] as const

const receiptStatusFilters = [
  { id: "all", label: "All receipts" },
  { id: "draft", label: "draft" },
  { id: "posted", label: "posted" },
  { id: "cancelled", label: "cancelled" },
]

const defaultReceiptColumnVisibility: Record<ReceiptColumnId, boolean> = {
  amount: true,
  date: true,
  ledger: false,
  mode: true,
  party: true,
  receipt: true,
  status: true,
  unallocated: true,
  updated: false,
}

const receiptColumnCatalog: Array<{ id: ReceiptColumnId; label: string }> = [
  { id: "receipt", label: "Receipt" },
  { id: "date", label: "Date" },
  { id: "party", label: "Customer" },
  { id: "mode", label: "Mode" },
  { id: "ledger", label: "Ledger" },
  { id: "status", label: "Status" },
  { id: "amount", label: "Amount" },
  { id: "unallocated", label: "Unallocated" },
  { id: "updated", label: "Updated" },
]

export function ReceiptPage({ initialEntryUuid, session }: { initialEntryUuid?: string | null; session: AuthSession }) {
  const queryClient = useQueryClient()
  const [view, setView] = useState<ReceiptView>({ mode: "list" })
  const [searchValue, setSearchValue] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [visibleColumns, setVisibleColumns] = useState(defaultReceiptColumnVisibility)
  const [listViewMode, setListViewMode] = useState<EntryListViewMode>("day")
  const [currentPage, setCurrentPage] = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState(100)
  const queryKey = ["receipt-entries", session.selectedTenant.slug]
  const entriesQuery = useQuery({ queryKey, queryFn: () => listReceiptEntries(session) })
  const upsertMutation = useMutation({ mutationFn: (input: ReceiptEntryInput) => upsertReceiptEntry(session, input) })
  const destroyMutation = useMutation({ mutationFn: (entry: ReceiptEntry) => destroyReceiptEntry(session, entry) })
  const restoreMutation = useMutation({ mutationFn: (entry: ReceiptEntry) => restoreReceiptEntry(session, entry) })
  const commentMutation = useMutation({ mutationFn: ({ entry, body }: { entry: ReceiptEntry; body: string }) => addReceiptComment(session, entry, body) })
  const correctionMutation = useMutation({ mutationFn: (entry: ReceiptEntry) => createReceiptCorrection(session, entry) })
  const toolMutation = useMutation({ mutationFn: ({ entry, printHtml, tool }: { entry: ReceiptEntry; printHtml?: string; tool: string }) => runReceiptTool(session, entry, tool, printHtml) })
  const reversalMutation = useMutation({ mutationFn: (entry: ReceiptEntry) => createReceiptReversal(session, entry) })
  const entries = entriesQuery.data ?? []
  const filteredEntries = useMemo(() => filterReceipts(searchReceipts(entries, searchValue), statusFilter).sort((left, right) => left.receipt_no.localeCompare(right.receipt_no)), [entries, searchValue, statusFilter])
  const monthlyEntries = useMemo(() => summarizeReceiptsByMonth(filteredEntries), [filteredEntries])
  const monthlyTotal = useMemo(() => totalMonthlyReceipts(monthlyEntries), [monthlyEntries])
  const activeRowCount = listViewMode === "month" ? monthlyEntries.length : filteredEntries.length
  const totalPages = Math.max(1, Math.ceil(activeRowCount / rowsPerPage))
  const pageEntries = filteredEntries.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage)
  const pageMonthlyEntries = monthlyEntries.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage)

  useEffect(() => {
    if (entriesQuery.error) toast.error("Receipt load failed", { description: entriesQuery.error instanceof Error ? entriesQuery.error.message : "Unable to load receipt entries." })
  }, [entriesQuery.error])

  useEffect(() => {
    if (!initialEntryUuid || !entries.length) return
    const entry = entries.find((item) => String(item.uuid ?? item.id) === initialEntryUuid)
    if (entry) setView({ mode: "show", entry })
  }, [entries, initialEntryUuid])

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey })
  }

  async function save(input: ReceiptEntryInput, printAfterSave = false) {
    const entry = await upsertMutation.mutateAsync(prepareReceiptInput(input))
    toast.success(input.uuid ? "Receipt updated" : "Receipt created", { description: entry.document_number_warning ?? entry.receipt_no })
    queryClient.removeQueries({ queryKey: ["document-number-next-preview", session.selectedTenant.slug, "receipt"] })
    await queryClient.invalidateQueries({ queryKey: ["document-number-next-preview", session.selectedTenant.slug] })
    await refresh()
    setView({ mode: "show", entry })
    if (printAfterSave) window.setTimeout(() => window.print(), 300)
  }

  async function destroy(entry: ReceiptEntry) {
    await destroyMutation.mutateAsync(entry)
    toast.error("Receipt suspended", { description: entry.receipt_no })
    await refresh()
  }

  async function restore(entry: ReceiptEntry) {
    await restoreMutation.mutateAsync(entry)
    toast.success("Receipt restored", { description: entry.receipt_no })
    await refresh()
  }

  function openNewEntry() {
    queryClient.removeQueries({ queryKey: ["document-number-next-preview", session.selectedTenant.slug, "receipt"] })
    setView({ mode: "upsert", entry: null })
  }

  if (view.mode === "upsert") {
    return <ReceiptUpsertPage entry={view.entry} isSaving={upsertMutation.isPending} session={session} onBack={() => setView(view.entry ? { mode: "show", entry: view.entry } : { mode: "list" })} onSubmit={save} />
  }

  if (view.mode === "show") {
    const entry = entries.find((item) => item.uuid === view.entry.uuid) ?? view.entry
    const entryIndex = filteredEntries.findIndex((item) => item.uuid === entry.uuid)
    const previousEntry = entryIndex > 0 ? filteredEntries[entryIndex - 1] : null
    const nextEntry = entryIndex >= 0 && entryIndex < filteredEntries.length - 1 ? filteredEntries[entryIndex + 1] : null
    return (
      <ReceiptShowPage
        entry={entry}
        isWorking={commentMutation.isPending || toolMutation.isPending}
        session={session}
        onBack={() => setView({ mode: "list" })}
        onComment={async (entryValue, body) => {
          const updated = await commentMutation.mutateAsync({ entry: entryValue, body })
          await refresh()
          setView({ mode: "show", entry: updated })
        }}
        onCorrection={async (entryValue) => {
          const correction = await correctionMutation.mutateAsync(entryValue)
          toast.success("Correction draft created", { description: correction?.receipt_no ?? entryValue.receipt_no })
          await refresh()
          if (correction) setView({ mode: "show", entry: correction })
        }}
        onDestroy={() => void destroy(entry)}
        onDownloadPdf={async (entryValue) => {
          await downloadReceiptPdf(session, entryValue, capturePrintDocument(".receipt-print-page"))
          toast.success("PDF downloaded", { description: entryValue.receipt_no })
        }}
        onEdit={() => setView({ mode: "upsert", entry })}
        onNew={openNewEntry}
        onNext={nextEntry ? () => setView({ mode: "show", entry: nextEntry }) : undefined}
        onPrevious={previousEntry ? () => setView({ mode: "show", entry: previousEntry }) : undefined}
        onRestore={() => void restore(entry)}
        onReversal={async (entryValue) => {
          const reversal = await reversalMutation.mutateAsync(entryValue)
          toast.success("Reversal voucher created", { description: reversal?.receipt_no ?? entryValue.receipt_no })
          await refresh()
          if (reversal) setView({ mode: "show", entry: reversal })
        }}
        onTool={async (entryValue, tool) => {
          const isEmail = tool.startsWith("Send to Email:")
          const updated = await toolMutation.mutateAsync({ entry: entryValue, printHtml: isEmail ? capturePrintDocument(".receipt-print-page") : undefined, tool })
          toast.success(isEmail ? "Email queued" : "Action recorded", { description: isEmail ? "The receipt PDF was queued for email delivery." : "The activity was recorded for this receipt." })
          await refresh()
          setView({ mode: "show", entry: updated })
        }}
      />
    )
  }

  return (
    <MasterListPageFrame
      title="Receipt"
      description="Track customer receipts and sales allocations."
      technicalName="page.entries.receipt.list"
      action={
        <div className="flex items-center gap-2">
          <Button disabled={entriesQuery.isFetching} onClick={() => void entriesQuery.refetch()} type="button" variant="outline" className="h-9 rounded-md"><RefreshCw className={cn("size-4", entriesQuery.isFetching && "animate-spin")} />Refresh</Button>
          <Button onClick={openNewEntry} type="button" className="h-9 rounded-md"><Plus className="size-4" />New Receipt</Button>
        </div>
      }
    >
      <MasterListToolbarCard
        columns={receiptColumnCatalog.map((column) => ({ id: column.id, label: column.label, checked: visibleColumns[column.id], disabled: column.id === "receipt", onCheckedChange: (checked) => setVisibleColumns((current) => ({ ...current, [column.id]: checked })) }))}
        filterOptions={receiptStatusFilters}
        filterValue={statusFilter}
        onFilterValueChange={(value) => {
          setStatusFilter(value)
          setCurrentPage(1)
        }}
        onShowAllColumns={() => setVisibleColumns(defaultReceiptColumnVisibility)}
        searchPlaceholder="Search receipt, customer, mode, ledger, work order, or status"
        searchValue={searchValue}
        onSearchValueChange={(value) => {
          setSearchValue(value)
          setCurrentPage(1)
        }}
        toolbarAction={
          <EntryViewModeSelect
            value={listViewMode}
            onChange={(value) => {
              setListViewMode(value)
              setCurrentPage(1)
            }}
          />
        }
      />
      <MasterListTableCard className="rounded-md">
        <div className="overflow-x-auto">
          {listViewMode === "month" ? (
          <table className="w-full min-w-[1040px] border-collapse text-sm">
            <thead className="bg-muted/55">
              <tr>
                <ListHeader>Month</ListHeader>
                <ListHeader className="text-center">Receipts</ListHeader>
                <ListHeader className="text-right">Amount</ListHeader>
                <ListHeader className="text-right">TDS</ListHeader>
                <ListHeader className="text-right">Discount</ListHeader>
                <ListHeader className="text-right">Round Off</ListHeader>
                <ListHeader className="text-right">Net Amount</ListHeader>
                <ListHeader className="text-right">Allocated</ListHeader>
                <ListHeader className="text-right">Unallocated</ListHeader>
              </tr>
            </thead>
            <tbody>
              {pageMonthlyEntries.map((row) => (
                <tr key={row.month} className="border-b border-border/60 last:border-b-0">
                  <td className="px-4 py-2.5 font-semibold">{formatMonth(row.month)}</td>
                  <td className="px-4 py-2.5 text-center">{row.entryCount}</td>
                  <td className="px-4 py-2.5 text-right">{formatMoney(row.amount)}</td>
                  <td className="px-4 py-2.5 text-right">{formatMoney(row.tdsAmount)}</td>
                  <td className="px-4 py-2.5 text-right">{formatMoney(row.discountAmount)}</td>
                  <td className="px-4 py-2.5 text-right">{formatMoney(row.roundOff)}</td>
                  <td className="px-4 py-2.5 text-right font-semibold">{formatMoney(row.netAmount)}</td>
                  <td className="px-4 py-2.5 text-right">{formatMoney(row.allocatedAmount)}</td>
                  <td className="px-4 py-2.5 text-right">{formatMoney(row.unallocatedAmount)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t border-border/80 bg-muted/40 font-semibold">
              <tr>
                <td className="px-4 py-2.5">Total</td>
                <td className="px-4 py-2.5 text-center">{monthlyTotal.entryCount}</td>
                <td className="px-4 py-2.5 text-right">{formatMoney(monthlyTotal.amount)}</td>
                <td className="px-4 py-2.5 text-right">{formatMoney(monthlyTotal.tdsAmount)}</td>
                <td className="px-4 py-2.5 text-right">{formatMoney(monthlyTotal.discountAmount)}</td>
                <td className="px-4 py-2.5 text-right">{formatMoney(monthlyTotal.roundOff)}</td>
                <td className="px-4 py-2.5 text-right">{formatMoney(monthlyTotal.netAmount)}</td>
                <td className="px-4 py-2.5 text-right">{formatMoney(monthlyTotal.allocatedAmount)}</td>
                <td className="px-4 py-2.5 text-right">{formatMoney(monthlyTotal.unallocatedAmount)}</td>
              </tr>
            </tfoot>
          </table>
          ) : (
          <table className="w-full min-w-[1040px] border-collapse text-sm">
            <thead className="bg-muted/55">
              <tr>
                {visibleColumns.receipt ? <ListHeader>Receipt</ListHeader> : null}
                {visibleColumns.date ? <ListHeader>Date</ListHeader> : null}
                {visibleColumns.party ? <ListHeader>Customer</ListHeader> : null}
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
                  {visibleColumns.receipt ? <td className="px-4 py-2.5"><button className="font-medium text-foreground hover:underline" onClick={() => setView({ mode: "show", entry })} type="button">{entry.receipt_no}</button></td> : null}
                  {visibleColumns.date ? <td className="px-4 py-2.5 text-muted-foreground">{formatDate(entry.receipt_date)}</td> : null}
                  {visibleColumns.party ? <td className="px-4 py-2.5">{entry.party_name}</td> : null}
                  {visibleColumns.mode ? <td className="px-4 py-2.5 text-muted-foreground">{modeLabel(entry.receipt_mode)}</td> : null}
                  {visibleColumns.ledger ? <td className="px-4 py-2.5 text-muted-foreground">{entry.ledger_name ?? "-"}</td> : null}
                  {visibleColumns.status ? <td className="px-4 py-2.5">{entry.status}</td> : null}
                  {visibleColumns.amount ? <td className="px-4 py-2.5 text-right">{formatMoney(entry.net_amount)}</td> : null}
                  {visibleColumns.unallocated ? <td className="px-4 py-2.5 text-right">{formatMoney(entry.unallocated_amount)}</td> : null}
                  {visibleColumns.updated ? <td className="px-4 py-2.5 text-muted-foreground">{formatDate(entry.updated_at)}</td> : null}
                  <td className="px-4 py-2 text-right">
                    <MasterListRowActions title={entry.receipt_no} isSuspended={!isActive(entry)} onDelete={() => void destroy(entry)} onEdit={() => setView({ mode: "upsert", entry })} onRestore={() => void restore(entry)} onView={() => setView({ mode: "show", entry })} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          )}
        </div>
        {(listViewMode === "month" ? pageMonthlyEntries.length : pageEntries.length) === 0 ? <MasterListEmptyState>{entriesQuery.isFetching ? "Loading receipts." : "No receipts found."}</MasterListEmptyState> : null}
      </MasterListTableCard>
      <MasterListPaginationCard
        page={currentPage}
        rowsPerPage={rowsPerPage}
        showingLabel={buildMasterListShowingLabel({ page: currentPage, pageSize: rowsPerPage, totalCount: activeRowCount })}
        singularLabel="receipt"
        totalCount={activeRowCount}
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

function ReceiptShowPage({ entry, isWorking, onBack, onComment, onCorrection, onDestroy, onDownloadPdf, onEdit, onNew, onNext, onPrevious, onRestore, onReversal, onTool, session }: {
  entry: ReceiptEntry
  isWorking: boolean
  onBack(): void
  onComment(entry: ReceiptEntry, body: string): Promise<void>
  onCorrection(entry: ReceiptEntry): Promise<void>
  onDestroy(): void
  onDownloadPdf(entry: ReceiptEntry): Promise<void>
  onEdit(): void
  onNew(): void
  onNext?(): void
  onPrevious?(): void
  onRestore(): void
  onReversal(entry: ReceiptEntry): Promise<void>
  onTool(entry: ReceiptEntry, tool: string): Promise<void>
  session: AuthSession
}) {
  const [comment, setComment] = useState("")
  const [openTool, setOpenTool] = useState<ReceiptToolId | null>(null)
  const [emailAddress, setEmailAddress] = useState("")
  const [whatsappNumber, setWhatsappNumber] = useState("")
  const [assigneeInput, setAssigneeInput] = useState("")
  const [tagInput, setTagInput] = useState("")
  const [assignees, setAssignees] = useState<string[]>([])
  const [attachments, setAttachments] = useState<string[]>([])
  const [tags, setTags] = useState<string[]>([])
  const [toolActivities, setToolActivities] = useState<Array<{ id: string; message: string; created_at: string }>>([])
  const companyQuery = useQuery({ queryKey: ["receipt-print-company", session.selectedTenant.slug], queryFn: () => listCompanies(session) })
  const company = (companyQuery.data ?? []).find((item) => item.isPrimary) ?? companyQuery.data?.[0] ?? null
  const [softwareSettings] = useCompanySoftwareSettings(session)
  const entryTools: Array<{ icon: typeof Mail; id: ReceiptToolId; label: string }> = [
    { icon: Download, id: "downloadPdf", label: "Download PDF" },
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
    <main className="theme-shell mx-auto min-h-screen w-[94%] pb-8 pt-8 text-black sm:w-[92%] lg:w-[90%] print:fixed print:inset-0 print:z-[9999] print:min-h-0 print:w-full print:overflow-visible print:bg-white print:p-0 receipt-print-page">
      <div className="mx-auto mb-3 grid w-full gap-2 print:hidden">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-3xl font-semibold tracking-normal text-foreground">{entry.party_name}</h1>
            <p className="mt-2 text-sm text-muted-foreground">{entry.receipt_no}</p>
          </div>
          <Button type="button" className="h-9 shrink-0 rounded-md" onClick={onNew}><Plus className="size-4" />New</Button>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" className="h-9 rounded-xl" onClick={onBack}><ArrowLeft className="size-4" />Back</Button>
            <Button type="button" variant="outline" className="h-9 rounded-xl" disabled={!onPrevious} onClick={onPrevious}><ChevronLeft className="size-4" />Prev</Button>
            <Button type="button" variant="outline" className="h-9 rounded-xl" disabled={!onNext} onClick={onNext}><ChevronRight className="size-4" />Next</Button>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button className="rounded-xl" onClick={() => window.print()} type="button"><Printer className="size-4" />Print</Button>
            <Button type="button" variant="outline" className="rounded-xl" onClick={onEdit}><Pencil className="size-4" />Edit</Button>
            {entry.status === "posted" ? <Button type="button" variant="outline" className="rounded-xl" onClick={() => void onCorrection(entry)}><Pencil className="size-4" />Correction</Button> : null}
            {entry.status === "posted" ? <Button type="button" variant="outline" className="rounded-xl" onClick={() => void onReversal(entry)}><RotateCcw className="size-4" />Reversal</Button> : null}
            {isActive(entry) ? <Button onClick={onDestroy} type="button" variant="destructive" className="rounded-xl"><Trash2 className="size-4" />Suspend</Button> : <Button onClick={onRestore} type="button" variant="outline" className="rounded-xl"><RotateCcw className="size-4" />Restore</Button>}
          </div>
        </div>
      </div>
      <section className="mx-auto w-fit max-w-full overflow-hidden rounded-md border border-border/70 bg-card shadow-sm print:contents">
        <div className="overflow-x-auto p-3 print:contents sm:p-4">
          <ReceiptPrintDocument company={company} letterheadSettings={softwareSettings.letterheadSettings} record={entry} />
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
                <button disabled={isWorking} onClick={() => {
                  if (tool.id === "downloadPdf") {
                    void onDownloadPdf(entry)
                      .then(() => recordToolActivity(`Downloaded PDF ${entry.receipt_no}`))
                      .catch((error) => toast.error("PDF download failed", { description: error instanceof Error ? error.message : "Unable to generate the PDF." }))
                    return
                  }
                  setOpenTool((current) => current === tool.id ? null : tool.id)
                }} type="button" className="flex min-h-12 w-full items-center gap-3 px-3 py-2 text-left text-sm font-medium text-muted-foreground hover:bg-muted/50 disabled:cursor-not-allowed disabled:opacity-60">
                  <tool.icon className="size-4" />
                  <span className="flex-1">{tool.label}</span>
                  <Plus className={cn("size-4 transition-transform", openTool === tool.id ? "rotate-45" : "")} />
                </button>
                {tool.id === "assign" && assignees.length ? <div className="px-3 pb-2"><ToolPills values={assignees} onRemove={(value) => removeListValue(value, setAssignees)} /></div> : null}
                {tool.id === "attachments" && attachments.length ? <div className="px-3 pb-2"><ToolPills values={attachments} onRemove={(value) => removeListValue(value, setAttachments)} /></div> : null}
                {tool.id === "tags" && tags.length ? <div className="px-3 pb-2"><ToolPills values={tags} onRemove={(value) => removeListValue(value, setTags)} /></div> : null}
                {openTool === tool.id ? (
                  <div className="px-3 pb-2">
                    {tool.id === "email" ? <ToolSendInput disabled={isWorking} placeholder="Email address" value={emailAddress} onChange={setEmailAddress} onSend={(value) => void onTool(entry, `Send to Email: ${value}`).then(() => { recordToolActivity(`Queued receipt email to ${value}`); setEmailAddress("") })} /> : null}
                    {tool.id === "assign" ? <Input value={assigneeInput} onChange={(event) => setAssigneeInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addListValue(assigneeInput, setAssigneeInput, setAssignees, (value) => `Assigned ${entry.receipt_no} to ${value}`) } }} placeholder="User name or email" className="h-9 rounded-md" /> : null}
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

function ReceiptUpsertPage({ entry, isSaving, onBack, onSubmit, session }: {
  entry: ReceiptEntry | null
  isSaving: boolean
  onBack(): void
  onSubmit(input: ReceiptEntryInput, printAfterSave?: boolean): Promise<void>
  session: AuthSession
}) {
  const [draft, setDraft] = useState<ReceiptEntryInput>(() => entry ? { ...entry, allocations: entry.allocations.map((item) => ({ ...item })) } : emptyReceiptEntry())
  const [contactCreateInitialName, setContactCreateInitialName] = useState<string | null>(null)
  const contactsQuery = useQuery({ queryKey: ["receipt-contact-lookups", session.selectedTenant.slug], queryFn: () => listReceiptContactLookups(session) })
  const contactTypesQuery = useQuery({ queryKey: ["receipt-contact-types", session.selectedTenant.slug], queryFn: () => listMasterDataRecords(session, "contactTypes") })
  const ledgersQuery = useQuery({ queryKey: ["receipt-money-ledgers", session.selectedTenant.slug], queryFn: () => listAllAccountLedgers(session) })
  const nextReceiptQuery = useQuery({ enabled: !entry, queryKey: ["document-number-next-preview", session.selectedTenant.slug, "receipt"], queryFn: () => nextDocumentNumberSetting(session, "receipt"), refetchOnMount: "always" })
  const ledgers = ledgersQuery.data ?? []
  const customerContacts = useMemo(() => filterStockContactLookupOptions(contactsQuery.data ?? [], contactTypesQuery.data ?? [], "customer"), [contactsQuery.data, contactTypesQuery.data])

  useEffect(() => {
    if (entry || draft.receipt_no || !nextReceiptQuery.data?.preview) return
    setDraft((current) => current.receipt_no ? current : { ...current, receipt_no: nextReceiptQuery.data.preview })
  }, [draft.receipt_no, entry, nextReceiptQuery.data?.preview])

  const tabs: AnimatedTab[] = [
    { value: "details", label: "Details", content: <ReceiptDetailsTab contacts={customerContacts} form={draft} ledgers={ledgers} onCreateContact={setContactCreateInitialName} session={session} setForm={setDraft} /> },
    { value: "allocations", label: "Allocations", content: <ReceiptAllocationsTab form={draft} session={session} setForm={setDraft} /> },
  ]

  return (
    <MasterListPageFrame
      title={entry ? "Edit receipt" : "New receipt"}
      description="Create a tabbed incoming receipt with allocation details."
      technicalName="page.entries.receipt.upsert"
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
            <ReceiptContactCreateDialog
              contacts={contactsQuery.data ?? []}
              initialName={contactCreateInitialName}
              session={session}
              onClose={() => setContactCreateInitialName(null)}
              onCreated={(contact) => {
                setDraft((current) => ({ ...current, party_id: contact.id, party_name: lookupName(contact), party_type: "customer" }))
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

function ReceiptDetailsTab({ contacts, form, ledgers, onCreateContact, session, setForm }: { contacts: ReceiptLookupOption[]; form: ReceiptEntryInput; ledgers: AccountLedger[]; onCreateContact(name: string): void; session: AuthSession; setForm: Dispatch<SetStateAction<ReceiptEntryInput>> }) {
  const needsBank = isBankTransferMode(form.receipt_mode ?? "cash")
  const moneyLedgers = useMemo(() => ledgers.filter((ledger) => ledger.account_type === (needsBank ? "bank" : "cash") && isActiveLedger(ledger)), [ledgers, needsBank])

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <div className="space-y-5">
        <MasterAutocompleteLookup
          createLabel="Create contact"
          label="Customer name *"
          options={contacts}
          placeholder="Search customer"
          selectedId={form.party_id ?? null}
          selectedLabel={form.party_name ?? ""}
          onPick={(option) => setForm((current) => ({ ...current, party_id: option.id, party_name: lookupName(option), party_type: "customer" }))}
          onCreate={onCreateContact}
          onTextChange={(value) => setForm((current) => ({ ...current, party_id: null, party_name: value }))}
        />
        <Field label="Amount" numeric value={String(form.amount ?? 0)} onChange={(value) => setForm((current) => ({ ...current, amount: parseDecimalInput(value) }))} />
        <WorkOrderAutocomplete session={session} value={form.reference_no ?? ""} onChange={(value) => setForm((current) => ({ ...current, reference_no: value }))} />
      </div>
      <div className="space-y-5">
        <Field label="Receipt no" value={form.receipt_no ?? ""} onChange={(value) => setForm((current) => ({ ...current, receipt_no: value }))} />
        <Field label="Date" type="date" value={String(form.receipt_date ?? "")} onChange={(value) => setForm((current) => ({ ...current, receipt_date: value }))} />
        <div className="grid gap-2">
          <Label className="text-sm font-medium text-muted-foreground">Mode</Label>
          <Select value={form.receipt_mode ?? "cash"} onValueChange={(value) => setForm((current) => ({ ...current, bank_account_id: null, ledger_id: null, ledger_name: null, receipt_mode: value }))}>
            <SelectTrigger className="h-11 min-h-11 w-full rounded-md bg-background px-3 text-left font-normal"><SelectValue /></SelectTrigger>
            <SelectContent align="start" position="popper" className="w-[var(--radix-select-trigger-width)]">{receiptModeOptions.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <LedgerAutocompleteLookup
          createLabel="Create ledger in Accounts"
          label={needsBank ? "Deposit in bank ledger *" : "Cash ledger *"}
          options={moneyLedgers}
          placeholder={needsBank ? "Search bank ledger" : "Search cash ledger"}
          selectedId={form.ledger_id ?? null}
          selectedLabel={form.ledger_name ?? ""}
          onPick={(ledger) => setForm((current) => ({ ...current, bank_account_id: null, ledger_id: String(ledger.id), ledger_name: ledger.name }))}
          onTextChange={(value) => setForm((current) => ({ ...current, bank_account_id: null, ledger_id: null, ledger_name: value }))}
        />
        <TextField label="Notes" value={form.notes ?? ""} onChange={(value) => setForm((current) => ({ ...current, notes: value }))} />
      </div>
    </div>
  )
}

function ReceiptAllocationsTab({ form, session, setForm }: { form: ReceiptEntryInput; session: AuthSession; setForm: Dispatch<SetStateAction<ReceiptEntryInput>> }) {
  const salesQuery = useQuery({ queryKey: ["receipt-open-sales", session.selectedTenant.slug], queryFn: () => listSalesEntries(session) })
  const allocations = form.allocations?.length ? form.allocations : [emptyReceiptAllocation()]
  const openInvoices = useMemo(() => openSalesInvoiceOptions(salesQuery.data ?? [], allocations), [allocations, salesQuery.data])
  return (
    <div className="space-y-3">
      {allocations.map((allocation, index) => (
        <div key={index} className="grid gap-3 rounded-md border border-border/70 p-3 md:grid-cols-4">
          <OpenDocumentLookup
            label="Sales invoice"
            options={openInvoices}
            placeholder="Search open invoice"
            selectedLabel={allocation.document_no}
            onPick={(option) => setAllocation(setForm, index, {
              allocated_amount: option.balance,
              document_date: option.date,
              document_id: option.id,
              document_no: option.documentNo,
              document_total: option.total,
              document_type: "sales",
              previous_balance: option.balance,
            })}
            onTextChange={(value) => setAllocation(setForm, index, { document_id: null, document_no: value })}
          />
          <Input type="date" value={allocation.document_date ?? ""} onChange={(event) => setAllocation(setForm, index, { document_date: event.target.value })} />
          <DecimalInput value={String(allocation.previous_balance ?? 0)} placeholder="Balance" onChange={(value) => setAllocation(setForm, index, { previous_balance: parseDecimalInput(value) })} />
          <DecimalInput value={String(allocation.allocated_amount ?? 0)} placeholder="Allocated" onChange={(value) => setAllocation(setForm, index, { allocated_amount: parseDecimalInput(value) })} />
        </div>
      ))}
      <Button type="button" variant="outline" className="rounded-xl" onClick={() => setForm((current) => ({ ...current, allocations: [...allocations, { ...emptyReceiptAllocation(), sort_order: allocations.length + 1 }] }))}>Add allocation</Button>
    </div>
  )
}

function ReceiptPrintDocument({ company, letterheadSettings, record }: { company: CompanyRecord | null; letterheadSettings?: Parameters<typeof LetterheadBuilder>[0]["settings"]; record: ReceiptEntry }) {
  const companyName = company?.legalName?.trim() || company?.name || ""
  return (
    <section className="mx-auto w-[210mm] max-w-full bg-white p-4 font-[Verdana,Arial,sans-serif] text-[10px] text-black print:w-[198mm] print:p-0 receipt-print-sheet">
      <div className="grid grid-cols-[1fr_auto_1fr] border border-gray-400 border-b-0 px-2 py-1">
        <span />
        <span className="text-[12px] font-bold">RECEIPT VOUCHER</span>
        <span className="text-right">Original Copy</span>
      </div>
      <div className="border border-gray-400 border-b-0">
        <LetterheadBuilder company={company} settings={letterheadSettings} />
      </div>
      <div className="grid grid-cols-2 border border-gray-400 border-b-0">
        <div className="space-y-1 border-r border-gray-400 p-2">
          <PrintLine label="Receipt No">{record.receipt_no}</PrintLine>
          <PrintLine label="Receipt Date">{formatDate(record.receipt_date)}</PrintLine>
          <PrintLine label="Customer">{record.party_name}</PrintLine>
        </div>
        <div className="space-y-1 p-2">
          <PrintLine label="Mode">{modeLabel(record.receipt_mode)}</PrintLine>
          <PrintLine label={isBankTransferMode(record.receipt_mode) ? "Deposit in bank" : "Ledger"}>{record.ledger_name ?? ""}</PrintLine>
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
                  <ReceiptSummaryLine label="Amount" value={formatMoney(record.amount)} />
                  <ReceiptSummaryLine label="Round Off" value={formatMoney(record.round_off)} />
                  <ReceiptSummaryLine label="Net Amount" value={formatMoney(record.net_amount)} strong />
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

function setAllocation(setForm: Dispatch<SetStateAction<ReceiptEntryInput>>, index: number, patch: Partial<ReceiptAllocation>) {
  setForm((current) => ({ ...current, allocations: (current.allocations.length ? current.allocations : [emptyReceiptAllocation()]).map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item) }))
}

function prepareReceiptInput(input: ReceiptEntryInput): ReceiptEntryInput {
  return {
    ...input,
    amount: Number(input.amount || 0),
    discount_amount: Number(input.discount_amount || 0),
    party_name: String(input.party_name ?? "").trim(),
    receipt_no: String(input.receipt_no ?? "").trim(),
    round_off: Number(input.round_off || 0),
    tds_amount: Number(input.tds_amount || 0),
    allocations: input.allocations.map((allocation, index) => ({ ...allocation, allocated_amount: Number(allocation.allocated_amount || 0), document_no: allocation.document_no.trim(), document_total: Number(allocation.document_total || 0), previous_balance: Number(allocation.previous_balance || 0), sort_order: index + 1 })).filter((allocation) => allocation.document_no || allocation.allocated_amount > 0),
  }
}

function ReceiptContactCreateDialog({ contacts, initialName, onClose, onCreated, session }: { contacts: ReceiptLookupOption[]; initialName: string; onClose(): void; onCreated(contact: ReceiptLookupOption): void; session: AuthSession }) {
  const [draft, setDraft] = useState<ContactInput>(() => ({ ...emptyContact(), code: normalizeContactCode(initialName), contactTypeId: "contact-type:customer", ledgerId: "ledger:sundry-debitors", ledgerName: "Customer", legalName: initialName, name: initialName }))
  const [error, setError] = useState<string | null>(null)
  const contactTypesQuery = useQuery({ queryKey: ["Receipt-contact-types", session.selectedTenant.slug], queryFn: () => listMasterDataRecords(session, "contactTypes") })
  const createMutation = useMutation({
    mutationFn: (input: ContactInput) => upsertContact(session, input),
    onSuccess: (contact) => {
      toast.success("Contact created", { description: contact.name })
      onCreated(contactToReceiptLookupOption(contact))
    },
  })

  async function save() {
    const name = String(draft.name ?? "").trim()
    if (!name) {
      setError("Customer name is required.")
      return
    }
    const gstin = String(draft.gstin ?? "").trim().toUpperCase()
    if (gstin && contacts.some((contact) => String(contact.record.gstin ?? "").trim().toUpperCase() === gstin)) {
      setError(`GSTIN ${gstin} already exists in contacts.`)
      return
    }
    const contactTypes = contactTypesQuery.data ?? (await contactTypesQuery.refetch()).data ?? []
    setError(null)
    await createMutation.mutateAsync({ ...draft, code: String(draft.code ?? "").trim() || normalizeContactCode(name), contactTypeId: stockContactTypeId(contactTypes, "customer"), gstin, ledgerId: draft.ledgerId ?? "ledger:sundry-debitors", ledgerName: draft.ledgerName ?? "Customer", legalName: String(draft.legalName ?? "").trim() || name, name })
  }

  return (
    <div className="fixed inset-0 z-[160] grid place-items-center bg-background/55 p-4 backdrop-blur-sm">
      <div className="w-[min(560px,calc(100vw-2rem))] overflow-hidden rounded-md border border-border/70 bg-card shadow-xl">
        <div className="flex items-center justify-between border-b border-border/70 px-5 py-4">
          <div>
            <h2 className="text-base font-semibold">Create contact</h2>
            <p className="text-sm text-muted-foreground">Add receipt-ready customer details.</p>
          </div>
          <Button size="icon" variant="ghost" onClick={onClose} type="button"><X className="size-4" /></Button>
        </div>
        <div className="grid gap-4 p-5 md:grid-cols-2">
          <Field label="Customer name *" value={String(draft.name ?? "")} onChange={(name) => setDraft((current) => ({ ...current, name, legalName: current.legalName || name }))} />
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

function contactToReceiptLookupOption(contact: ContactRecord): ReceiptLookupOption {
  return { id: String(contact.uuid ?? contact.id), label: [contact.code, contact.name].filter(Boolean).join(" - ") || contact.name, code: contact.code, record: contact as unknown as MasterDataRecord }
}

interface OpenDocumentOption {
  balance: number
  date: string
  documentNo: string
  id: string
  label: string
  partyName: string
  total: number
}

function OpenDocumentLookup({ label, onPick, onTextChange, options, placeholder, selectedLabel }: { label: string; onPick(option: OpenDocumentOption): void; onTextChange(value: string): void; options: OpenDocumentOption[]; placeholder: string; selectedLabel: string }) {
  const [activeIndex, setActiveIndex] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState(selectedLabel)
  const normalizedQuery = query.trim().toLowerCase()
  const filteredOptions = options.filter((option) => [option.documentNo, option.partyName, option.label, option.date].some((value) => value.toLowerCase().includes(normalizedQuery)))
  const exactOption = options.find((option) => option.documentNo.toLowerCase() === normalizedQuery)

  useEffect(() => {
    if (!isOpen) setQuery(selectedLabel)
  }, [isOpen, selectedLabel])

  function selectOption(option: OpenDocumentOption) {
    setQuery(option.documentNo)
    onPick(option)
    setIsOpen(false)
  }

  return (
    <div className="relative z-10 grid w-full gap-2 focus-within:z-[90]">
      <Label className="sr-only">{label}</Label>
      <Input
        role="combobox"
        className="h-10 w-full rounded-md bg-background"
        placeholder={placeholder}
        value={query}
        onBlur={() => { if (exactOption) selectOption(exactOption); else window.setTimeout(() => { setIsOpen(false); setQuery(selectedLabel) }, 120) }}
        onChange={(event) => { setQuery(event.target.value); setIsOpen(true); setActiveIndex(0); onTextChange(event.target.value) }}
        onFocus={() => setIsOpen(true)}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") { event.preventDefault(); setIsOpen(true); setActiveIndex((current) => filteredOptions.length ? (current + 1) % filteredOptions.length : 0) }
          if (event.key === "ArrowUp") { event.preventDefault(); setIsOpen(true); setActiveIndex((current) => filteredOptions.length ? (current - 1 + filteredOptions.length) % filteredOptions.length : 0) }
          if (event.key === "Enter") { event.preventDefault(); if (filteredOptions[activeIndex]) selectOption(filteredOptions[activeIndex]) }
          if (event.key === "Escape") { event.preventDefault(); setIsOpen(false); setQuery(selectedLabel) }
        }}
      />
      {isOpen && filteredOptions.length ? (
        <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-[100] max-h-64 overflow-y-auto rounded-md border border-border bg-card p-1 shadow-2xl" onMouseDown={(event) => event.preventDefault()}>
          {filteredOptions.map((option, index) => (
            <button key={option.id} type="button" className={activeIndex === index ? "grid w-full gap-0.5 rounded-md bg-muted px-3 py-2 text-left text-sm" : "grid w-full gap-0.5 rounded-md px-3 py-2 text-left text-sm hover:bg-muted"} onMouseDown={(event) => { event.preventDefault(); selectOption(option) }}>
              <span className="flex items-center justify-between gap-3 font-medium"><span className="truncate">{option.documentNo}</span><span className="shrink-0 text-xs text-muted-foreground">{formatMoney(option.balance)}</span></span>
              <span className="truncate text-xs text-muted-foreground">{option.partyName} • {formatDate(option.date)}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}

function MasterAutocompleteLookup({ createLabel, inputRef, label, onCreate, onPick, onTextChange, options, placeholder, selectedId, selectedLabel }: { createLabel?: string; inputRef?: Ref<HTMLInputElement>; label: string; onCreate?(query: string): void; onPick(option: ReceiptLookupOption): void; onTextChange(value: string): void; options: ReceiptLookupOption[]; placeholder: string; selectedId: string | null; selectedLabel: string }) {
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

  function selectOption(option: ReceiptLookupOption) {
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

function ReceiptSummaryLine({ label, strong = false, value }: { label: string; strong?: boolean; value: string }) {
  return <tr className={strong ? "font-bold" : ""}><td className="border-b border-r border-gray-400 px-2 py-1">{label}</td><td className="border-b border-gray-400 px-2 py-1 text-right">{value}</td></tr>
}

function ListHeader({ children, className }: { children: ReactNode; className?: string }) {
  return <th className={cn("border-b border-border/70 px-4 py-2.5 text-left text-sm font-medium text-foreground", className)}>{children}</th>
}

function EntryViewModeSelect({ onChange, value }: { onChange(value: EntryListViewMode): void; value: EntryListViewMode }) {
  return (
    <Select value={value} onValueChange={(nextValue) => onChange(nextValue === "month" ? "month" : "day")}>
      <SelectTrigger className="h-8 min-w-28 rounded-md border-border/80 bg-background text-sm shadow-none">
        <SelectValue />
      </SelectTrigger>
      <SelectContent align="end" className="rounded-md">
        <SelectItem value="day">Day view</SelectItem>
        <SelectItem value="month">Month view</SelectItem>
      </SelectContent>
    </Select>
  )
}

function isBankTransferMode(mode: string) {
  return mode !== "cash"
}

function isActive(entry: ReceiptEntry) {
  return entry.is_active === true || entry.is_active === 1
}

function isActiveLedger(ledger: AccountLedger) {
  return ledger.is_active === true || ledger.is_active === 1
}

function lookupName(option: ReceiptLookupOption) {
  const name = typeof option.record.name === "string" ? option.record.name.trim() : ""
  return name || option.label
}

function openSalesInvoiceOptions(entries: SalesEntry[], allocations: ReceiptAllocation[]): OpenDocumentOption[] {
  const allocatedByDocument = new Map<string, number>()
  for (const allocation of allocations) {
    const key = String(allocation.document_id || allocation.document_no || "").trim()
    if (!key) continue
    allocatedByDocument.set(key, (allocatedByDocument.get(key) ?? 0) + Number(allocation.allocated_amount || 0))
  }
  return entries
    .filter((entry) => entry.status === "posted" && Number(entry.balance_amount || 0) > 0)
    .map((entry) => {
      const allocated = (allocatedByDocument.get(String(entry.id)) ?? 0) + (allocatedByDocument.get(entry.uuid) ?? 0) + (allocatedByDocument.get(entry.invoice_no) ?? 0)
      const balance = Math.max(0, Number(entry.balance_amount || 0) - allocated)
      return { balance, date: entry.invoice_date, documentNo: entry.invoice_no, id: String(entry.id), label: `${entry.invoice_no} ${entry.customer_name}`, partyName: entry.customer_name, total: Number(entry.grand_total || 0) }
    })
    .filter((entry) => entry.balance > 0)
}

function modeLabel(value: string) {
  return receiptModeOptions.find((option) => option.value === value)?.label ?? value
}

function searchReceipts(entries: ReceiptEntry[], searchValue: string) {
  const normalized = searchValue.trim().toLowerCase()
  if (!normalized) return entries
  return entries.filter((entry) => [entry.receipt_no, entry.receipt_date, entry.party_name, entry.receipt_mode, entry.ledger_name, entry.reference_no, entry.status].filter(Boolean).some((value) => String(value).toLowerCase().includes(normalized)))
}

function filterReceipts(entries: ReceiptEntry[], statusFilter: string) {
  return statusFilter === "all" ? entries : entries.filter((entry) => entry.status === statusFilter)
}

function summarizeReceiptsByMonth(entries: ReceiptEntry[]): MonthlyReceiptSummary[] {
  const grouped = new Map<string, MonthlyReceiptSummary>()
  for (const entry of entries) {
    const month = monthKey(entry.receipt_date)
    const existing = grouped.get(month) ?? { month, entryCount: 0, amount: 0, tdsAmount: 0, discountAmount: 0, roundOff: 0, netAmount: 0, allocatedAmount: 0, unallocatedAmount: 0 }
    existing.entryCount += 1
    existing.amount += Number(entry.amount || 0)
    existing.tdsAmount += Number(entry.tds_amount || 0)
    existing.discountAmount += Number(entry.discount_amount || 0)
    existing.roundOff += Number(entry.round_off || 0)
    existing.netAmount += Number(entry.net_amount || 0)
    existing.allocatedAmount += Number(entry.allocated_amount || 0)
    existing.unallocatedAmount += Number(entry.unallocated_amount || 0)
    grouped.set(month, existing)
  }
  return [...grouped.values()].sort((left, right) => right.month.localeCompare(left.month))
}

function totalMonthlyReceipts(rows: MonthlyReceiptSummary[]): MonthlyReceiptSummary {
  return rows.reduce(
    (total, row) => ({
      month: "total",
      entryCount: total.entryCount + row.entryCount,
      amount: total.amount + row.amount,
      tdsAmount: total.tdsAmount + row.tdsAmount,
      discountAmount: total.discountAmount + row.discountAmount,
      roundOff: total.roundOff + row.roundOff,
      netAmount: total.netAmount + row.netAmount,
      allocatedAmount: total.allocatedAmount + row.allocatedAmount,
      unallocatedAmount: total.unallocatedAmount + row.unallocatedAmount,
    }),
    { month: "total", entryCount: 0, amount: 0, tdsAmount: 0, discountAmount: 0, roundOff: 0, netAmount: 0, allocatedAmount: 0, unallocatedAmount: 0 },
  )
}

function monthKey(value?: string | null) {
  const date = value ? new Date(value) : new Date()
  if (Number.isNaN(date.getTime())) return "Not set"
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
}

function formatMonth(value: string) {
  if (value === "Not set") return value
  return new Intl.DateTimeFormat("en-IN", { month: "short", year: "numeric" }).format(new Date(`${value}-01T00:00:00`))
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
