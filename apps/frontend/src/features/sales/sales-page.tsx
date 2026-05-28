import { useEffect, useMemo, useRef, useState, type Dispatch, type ReactNode, type Ref, type SetStateAction } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { ArrowLeft, Check, CheckCircle2, ChevronLeft, ChevronRight, Mail, MessageCircle, Paperclip, Pencil, Plus, Printer, RefreshCw, RotateCcw, Save, Send, Settings2, Tag, Trash2, UserRound, X } from "lucide-react"
import { Badge } from "src/components/ui/badge"
import { Button } from "src/components/ui/button"
import { AnimatedTabs } from "src/components/ui/animated-tabs"
import type { AnimatedTab } from "src/components/ui/animated-tabs"
import { Input } from "src/components/ui/input"
import { Label } from "src/components/ui/label"
import { Textarea } from "src/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "src/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "src/components/ui/select"
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
import { emptyAddress, emptyContact, upsertContact, type ContactAddress, type ContactInput, type ContactRecord } from "src/features/contact/contact-client"
import { listCompanies } from "src/features/company/company-client"
import type { MasterDataRecord } from "src/features/master-data/domain/master-data"
import { CityAutocompleteLookup } from "src/features/master-data/interface/components/city-autocomplete-lookup"
import { CountryAutocompleteLookup } from "src/features/master-data/interface/components/country-autocomplete-lookup"
import { DistrictAutocompleteLookup } from "src/features/master-data/interface/components/district-autocomplete-lookup"
import { PincodeAutocompleteLookup } from "src/features/master-data/interface/components/pincode-autocomplete-lookup"
import { StateAutocompleteLookup } from "src/features/master-data/interface/components/state-autocomplete-lookup"
import { CommonRecordAutocompleteLookup, getCommonRecordName } from "src/features/master-data/interface/components/common-record-autocomplete-lookup"
import { ProductAutocomplete, productRecordCommonValue, productRecordId, productRecordName, productRecordTaxRate } from "src/features/master-data/interface/components/product-autocomplete"
import { WorkOrderAutocomplete } from "src/features/master-data/interface/components/work-order-autocomplete"
import { listMasterDataRecords, upsertMasterDataRecord } from "src/features/master-data/infrastructure/master-data-client"
import { isSoftwareSettingEnabled } from "src/features/settings/software-settings"
import type { SoftwareSettingsState } from "src/features/settings/software-settings"
import { nextDocumentNumberSetting } from "src/features/settings/document-settings-client"
import { useCompanySoftwareSettings } from "src/features/settings/use-company-software-settings"
import { filterStockContactLookupOptions, stockContactTypeId } from "src/features/stock/contact-role-filter"
import {
  addSalesComment,
  destroySalesEntry,
  emptySalesEntry,
  emptySalesItem,
  listSalesContactLookups,
  listSalesCommonLookups,
  listSalesEntries,
  restoreSalesEntry,
  runSalesTool,
  upsertSalesEntry,
  type SalesLookupOption,
  type SalesEntry,
  type SalesEntryInput,
  type SalesEntryItem,
} from "./sales-client"
import { SalesInvoiceDocument, type SalesPrintCopy, type SalesPrintPartyDetails } from "./sales-print-page"

type SalesView = { mode: "list" } | { mode: "show"; entry: SalesEntry } | { mode: "upsert"; entry: SalesEntry | null }
type SalesColumnId = "invoice" | "date" | "customer" | "status" | "payment" | "total" | "balance" | "updated"
type SalesEntryToolId = "email" | "assign" | "attachments" | "tags" | "whatsapp"
type SalesAddressLabels = {
  addressTypes(value: unknown): string
  cities(value: unknown): string
  countries(value: unknown): string
  districts(value: unknown): string
  pincodes(value: unknown): string
  states(value: unknown): string
  stateCodes(value: unknown): string
}

const salesPrintCopyOptions: readonly { label: string; value: SalesPrintCopy }[] = [
  { label: "Original", value: "original" },
  { label: "Duplicate", value: "duplicate" },
  { label: "Office Copy", value: "triplicate" },
]
const salesStatusFilters = [
  { id: "all", label: "All sales" },
  { id: "draft", label: "draft" },
  { id: "posted", label: "posted" },
  { id: "cancelled", label: "cancelled" },
]
const defaultSalesColumnVisibility: Record<SalesColumnId, boolean> = {
  balance: false,
  customer: true,
  date: true,
  invoice: true,
  payment: true,
  status: true,
  total: true,
  updated: false,
}
const salesColumnCatalog: Array<{ id: SalesColumnId; label: string }> = [
  { id: "invoice", label: "Invoice" },
  { id: "date", label: "Date" },
  { id: "customer", label: "Customer" },
  { id: "status", label: "Status" },
  { id: "payment", label: "Payment" },
  { id: "total", label: "Total" },
  { id: "balance", label: "Balance" },
  { id: "updated", label: "Updated" },
]

export function SalesPage({ session }: { session: AuthSession }) {
  const queryClient = useQueryClient()
  const [view, setView] = useState<SalesView>({ mode: "list" })
  const [searchValue, setSearchValue] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [visibleColumns, setVisibleColumns] = useState(defaultSalesColumnVisibility)
  const [currentPage, setCurrentPage] = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState(20)
  const queryKey = ["sales-entries", session.selectedTenant.slug]
  const entriesQuery = useQuery({ queryKey, queryFn: () => listSalesEntries(session) })
  const upsertMutation = useMutation({ mutationFn: (input: SalesEntryInput) => upsertSalesEntry(session, input) })
  const destroyMutation = useMutation({ mutationFn: (entry: SalesEntry) => destroySalesEntry(session, entry) })
  const restoreMutation = useMutation({ mutationFn: (entry: SalesEntry) => restoreSalesEntry(session, entry) })
  const commentMutation = useMutation({ mutationFn: ({ entry, body }: { entry: SalesEntry; body: string }) => addSalesComment(session, entry, body) })
  const toolMutation = useMutation({ mutationFn: ({ entry, tool }: { entry: SalesEntry; tool: string }) => runSalesTool(session, entry, tool) })
  const entries = entriesQuery.data ?? []
  const filteredEntries = useMemo(() => filterSales(searchSales(entries, searchValue), statusFilter).sort((left, right) => String(left.invoice_no).localeCompare(String(right.invoice_no))), [entries, searchValue, statusFilter])
  const totalPages = Math.max(1, Math.ceil(filteredEntries.length / rowsPerPage))
  const pageEntries = filteredEntries.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage)

  useEffect(() => {
    if (entriesQuery.error) toast.error("Sales load failed", { description: entriesQuery.error instanceof Error ? entriesQuery.error.message : "Unable to load sales entries." })
  }, [entriesQuery.error])

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey })
  }

  async function save(input: SalesEntryInput, printAfterSave = false) {
    const entry = await upsertMutation.mutateAsync(input)
    toast.success(input.uuid ? "Sales entry updated" : "Sales entry created", { description: entry.invoice_no })
    await refresh()
    setView({ mode: "show", entry })
    if (printAfterSave) window.setTimeout(() => window.print(), 300)
  }

  async function destroy(entry: SalesEntry) {
    await destroyMutation.mutateAsync(entry)
    toast.error("Sales entry suspended", { description: entry.invoice_no })
    await refresh()
  }

  async function restore(entry: SalesEntry) {
    await restoreMutation.mutateAsync(entry)
    toast.success("Sales entry restored", { description: entry.invoice_no })
    await refresh()
  }

  if (view.mode === "upsert") {
    return <SalesUpsertPage entry={view.entry} isSaving={upsertMutation.isPending} session={session} onBack={() => setView(view.entry ? { mode: "show", entry: view.entry } : { mode: "list" })} onSubmit={save} />
  }

  if (view.mode === "show") {
    const entry = entries.find((entry) => entry.uuid === view.entry.uuid) ?? view.entry
    return (
      <SalesShowPage
        entry={entry}
        isWorking={commentMutation.isPending || toolMutation.isPending}
        session={session}
        onBack={() => setView({ mode: "list" })}
        onComment={async (entry, body) => {
          const updated = await commentMutation.mutateAsync({ entry, body })
          await refresh()
          setView({ mode: "show", entry: updated })
        }}
        onDestroy={() => void destroy(entry)}
        onEdit={() => setView({ mode: "upsert", entry })}
        onRestore={() => void restore(entry)}
        onTool={async (entry, tool) => {
          const updated = await toolMutation.mutateAsync({ entry, tool })
          toast.success(`${tool} queued`, { description: "The activity was recorded for this sales entry." })
          await refresh()
          setView({ mode: "show", entry: updated })
        }}
      />
    )
  }

  return (
    <MasterListPageFrame
      title="Sales"
      description="Create and review sales invoices."
      technicalName="page.entries.sales.list"
      action={
        <div className="flex items-center gap-2">
          <Button disabled={entriesQuery.isFetching} onClick={() => void entriesQuery.refetch()} type="button" variant="outline" className="h-9 rounded-md"><RefreshCw className={cn("size-4", entriesQuery.isFetching && "animate-spin")} />Refresh</Button>
          <Button onClick={() => setView({ mode: "upsert", entry: null })} type="button" className="h-9 rounded-md"><Plus className="size-4" />New</Button>
        </div>
      }
    >
      <MasterListToolbarCard
        columns={salesColumnCatalog.map((column) => ({
          id: column.id,
          label: column.label,
          checked: visibleColumns[column.id],
          disabled: column.id === "invoice",
          onCheckedChange: (checked) => setVisibleColumns((current) => ({ ...current, [column.id]: checked })),
        }))}
        filterOptions={salesStatusFilters}
        filterValue={statusFilter}
        onFilterValueChange={(value) => {
          setStatusFilter(value)
          setCurrentPage(1)
        }}
        onShowAllColumns={() => setVisibleColumns(defaultSalesColumnVisibility)}
        searchPlaceholder="Search invoice, customer, date, work order, or status"
        searchValue={searchValue}
        onSearchValueChange={(value) => {
          setSearchValue(value)
          setCurrentPage(1)
        }}
      />
      <MasterListTableCard>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] border-collapse text-sm">
            <thead className="bg-muted/50">
              <tr>
                {visibleColumns.invoice ? <ListHeader>Invoice</ListHeader> : null}
                {visibleColumns.date ? <ListHeader>Date</ListHeader> : null}
                {visibleColumns.customer ? <ListHeader>Customer</ListHeader> : null}
                {visibleColumns.status ? <ListHeader>Status</ListHeader> : null}
                {visibleColumns.payment ? <ListHeader>Payment</ListHeader> : null}
                {visibleColumns.total ? <ListHeader className="text-right">Total</ListHeader> : null}
                {visibleColumns.balance ? <ListHeader className="text-right">Balance</ListHeader> : null}
                {visibleColumns.updated ? <ListHeader>Updated</ListHeader> : null}
                <ListHeader className="text-right">Action</ListHeader>
              </tr>
            </thead>
            <tbody>
              {pageEntries.map((entry) => (
                <tr key={entry.uuid} className={cn("border-b border-border/70", !isActive(entry) && "bg-muted/20 text-muted-foreground")}>
                  {visibleColumns.invoice ? <td className="px-4 py-2">
                    <button className="font-semibold hover:underline" onClick={() => setView({ mode: "show", entry })} type="button">{entry.invoice_no}</button>
                    <div className="font-mono text-xs text-muted-foreground">{entry.uuid}</div>
                  </td> : null}
                  {visibleColumns.date ? <td className="px-4 py-2">{formatDate(entry.invoice_date)}</td> : null}
                  {visibleColumns.customer ? <td className="px-4 py-2">{entry.customer_name}</td> : null}
                  {visibleColumns.status ? <td className="px-4 py-2"><StatusBadge entry={entry} /></td> : null}
                  {visibleColumns.payment ? <td className="px-4 py-2 text-muted-foreground">{entry.payment_status}</td> : null}
                  {visibleColumns.total ? <td className="px-4 py-2 text-right font-semibold">{formatMoney(entry.grand_total)}</td> : null}
                  {visibleColumns.balance ? <td className="px-4 py-2 text-right">{formatMoney(entry.balance_amount)}</td> : null}
                  {visibleColumns.updated ? <td className="px-4 py-2 text-muted-foreground">{formatDate(entry.updated_at)}</td> : null}
                  <td className="px-4 py-1.5 text-right">
                    <MasterListRowActions
                      title={entry.invoice_no}
                      isSuspended={!isActive(entry)}
                      onDelete={() => void destroy(entry)}
                      onEdit={() => setView({ mode: "upsert", entry })}
                      onRestore={() => void restore(entry)}
                      onView={() => setView({ mode: "show", entry })}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {pageEntries.length === 0 ? <MasterListEmptyState>{entriesQuery.isFetching ? "Loading sales entries." : "No sales entries found."}</MasterListEmptyState> : null}
      </MasterListTableCard>
      <MasterListPaginationCard
        page={currentPage}
        rowsPerPage={rowsPerPage}
        showingLabel={buildMasterListShowingLabel({ page: currentPage, pageSize: rowsPerPage, totalCount: filteredEntries.length })}
        singularLabel="sales"
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

function SalesShowPage({ entry, isWorking, onBack, onComment, onDestroy, onEdit, onRestore, onTool, session }: {
  entry: SalesEntry
  isWorking: boolean
  onBack(): void
  onComment(entry: SalesEntry, body: string): Promise<void>
  onDestroy(): void
  onEdit(): void
  onRestore(): void
  onTool(entry: SalesEntry, tool: string): Promise<void>
  session: AuthSession
}) {
  const [comment, setComment] = useState("")
  const [printCopies, setPrintCopies] = useState<readonly SalesPrintCopy[]>(["original"])
  const [openTool, setOpenTool] = useState<SalesEntryToolId | null>(null)
  const [emailAddress, setEmailAddress] = useState("")
  const [whatsappNumber, setWhatsappNumber] = useState("")
  const [assigneeInput, setAssigneeInput] = useState("")
  const [tagInput, setTagInput] = useState("")
  const [assignees, setAssignees] = useState<string[]>([])
  const [attachments, setAttachments] = useState<string[]>([])
  const [tags, setTags] = useState<string[]>([])
  const [toolActivities, setToolActivities] = useState<Array<{ id: string; message: string; created_at: string }>>([])
  const [softwareSettings] = useCompanySoftwareSettings(session)
  const addressLabels = useSalesAddressLabels(session)
  const companyQuery = useQuery({ queryKey: ["sales-print-company", session.selectedTenant.slug], queryFn: () => listCompanies(session) })
  const contactsQuery = useQuery({ queryKey: ["sales-print-contacts", session.selectedTenant.slug], queryFn: () => listSalesContactLookups(session) })
  const printCompany = (companyQuery.data ?? []).find((company) => company.isPrimary) ?? companyQuery.data?.[0] ?? null
  const selectedContact = (contactsQuery.data ?? []).find((contact) => contact.id === entry.customer_id) ?? null
  const billingParty = buildSalesPrintPartyDetails(entry, selectedContact, entry.billing_address, addressLabels)
  const shippingParty = buildSalesPrintPartyDetails(entry, selectedContact, entry.shipping_address ?? entry.billing_address, addressLabels)
  const selectedPrintCopies = salesPrintCopyOptions.map((option) => option.value).filter((copy) => printCopies.includes(copy))
  const customTerms = softwareSettings.salesPrintingOptions.customTerms
  const printItemSettings = {
    showColour: isSoftwareSettingEnabled(softwareSettings, "sales-use-colour"),
    showDc: isSoftwareSettingEnabled(softwareSettings, "sales-use-dc"),
    showPo: isSoftwareSettingEnabled(softwareSettings, "sales-use-po"),
    showSize: isSoftwareSettingEnabled(softwareSettings, "sales-use-size"),
  }

  function togglePrintCopy(copy: SalesPrintCopy) {
    setPrintCopies((currentCopies) => {
      if (!currentCopies.includes(copy)) return [...currentCopies, copy]
      if (currentCopies.length === 1) return currentCopies
      return currentCopies.filter((currentCopy) => currentCopy !== copy)
    })
  }

  function toggleEntryTool(tool: SalesEntryToolId) {
    setOpenTool((current) => current === tool ? null : tool)
  }

  function recordToolActivity(message: string) {
    setToolActivities((current) => [{ id: `${Date.now()}-${current.length}`, message, created_at: new Date().toISOString() }, ...current])
  }

  function addListValue(value: string, setValue: (value: string) => void, setValues: Dispatch<SetStateAction<string[]>>, activityMessage: (value: string) => string) {
    const next = value.trim()
    if (!next) return
    setValues((current) => {
      if (current.includes(next)) return current
      recordToolActivity(activityMessage(next))
      return [...current, next]
    })
    setValue("")
  }

  function removeListValue(value: string, setValues: Dispatch<SetStateAction<string[]>>) {
    setValues((current) => current.filter((item) => item !== value))
  }

  const entryTools: Array<{ icon: typeof Mail; id: SalesEntryToolId; label: string }> = [
    { icon: Mail, id: "email", label: "Send to Email" },
    { icon: UserRound, id: "assign", label: "Assign" },
    { icon: Paperclip, id: "attachments", label: "Attachments" },
    { icon: Tag, id: "tags", label: "Tags" },
    { icon: MessageCircle, id: "whatsapp", label: "Send to WhatsApp" },
  ]
  const activityItems = [...toolActivities, ...entry.activities]

  return (
    <main className="theme-shell mx-auto min-h-screen w-[94%] pb-8 pt-8 text-black sm:w-[92%] lg:w-[90%] print:fixed print:inset-0 print:z-[9999] print:min-h-0 print:w-full print:overflow-visible print:bg-white print:p-0">
      <div className="mx-auto mb-3 grid w-full gap-2 print:hidden">
        <div>
          <h1 className="text-3xl font-semibold tracking-normal text-foreground">{entry.customer_name}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{entry.invoice_no}</p>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" className="h-9 rounded-xl" onClick={onBack}><ArrowLeft className="size-4" />Back</Button>
            <Button type="button" variant="outline" className="h-9 rounded-xl" disabled><ChevronLeft className="size-4" />Prev</Button>
            <Button type="button" variant="outline" className="h-9 rounded-xl" disabled><ChevronRight className="size-4" />Next</Button>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <div className="flex min-h-9 flex-wrap items-center gap-1 rounded-xl border border-border bg-card px-2 py-1 text-sm shadow-sm">
              {salesPrintCopyOptions.map((option) => (
                <label key={option.value} className="flex h-8 cursor-pointer items-center gap-1.5 rounded-md px-2 font-medium text-muted-foreground hover:bg-muted hover:text-foreground">
                  <input type="checkbox" className="size-3.5 accent-primary" checked={printCopies.includes(option.value)} onChange={() => togglePrintCopy(option.value)} />
                  {option.label}
                </label>
              ))}
            </div>
            <Button className="rounded-xl" onClick={() => window.print()} type="button"><Printer className="size-4" />Print</Button>
            <Button type="button" variant="outline" className="rounded-xl" onClick={onEdit}><Pencil className="size-4" />Edit</Button>
            {isActive(entry) ? (
              <Button onClick={onDestroy} type="button" variant="destructive" className="rounded-xl"><Trash2 className="size-4" />Suspend</Button>
            ) : (
              <Button onClick={onRestore} type="button" variant="outline" className="rounded-xl"><RotateCcw className="size-4" />Restore</Button>
            )}
          </div>
        </div>
      </div>
      <section className="mx-auto w-fit max-w-full overflow-hidden rounded-md border border-border/70 bg-card shadow-sm print:contents">
        <div className="grid gap-4 overflow-x-auto p-3 print:contents sm:p-4">
          {selectedPrintCopies.map((copy, index) => (
            <div key={copy} className={index === selectedPrintCopies.length - 1 ? "print:contents" : "print:break-after-page"}>
              <SalesInvoiceDocument addressLabels={addressLabels} billingParty={billingParty} company={printCompany} copy={copy} customTerms={customTerms} letterheadSettings={softwareSettings.letterheadSettings} record={entry} shippingParty={shippingParty} {...printItemSettings} />
            </div>
          ))}
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
            {entry.comments.length ? (
              <div className="space-y-2">
                {entry.comments.map((item) => <SideNote key={item.id} title={item.author_email} body={item.body} meta={formatDateTimeWithZone(item.created_at)} />)}
              </div>
            ) : null}
            <div>
              <h2 className="mb-5 text-lg font-semibold">Activity</h2>
              <div className="relative space-y-5 before:absolute before:left-[6px] before:top-1 before:h-[calc(100%-0.25rem)] before:border-l-2 before:border-border">
                {activityItems.map((item) => (
                  <div key={item.id} className="relative pl-9 text-sm">
                    <span className="absolute left-0 top-0.5 flex size-3.5 items-center justify-center rounded-full border border-muted-foreground/10 bg-muted-foreground/10 shadow-sm backdrop-blur-[1px]">
                      <span className="size-1.5 rounded-full bg-muted-foreground" />
                    </span>
                    <span>{item.message}</span>
                    <span className="text-muted-foreground"> · {formatDate(item.created_at)}</span>
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
                <button disabled={isWorking} onClick={() => toggleEntryTool(tool.id)} type="button" className="flex min-h-12 w-full items-center gap-3 px-3 py-2 text-left text-sm font-medium text-muted-foreground hover:bg-muted/50 disabled:cursor-not-allowed disabled:opacity-60">
                  <tool.icon className="size-4" />
                  <span className="flex-1">{tool.label}</span>
                  <Plus className={cn("size-4 transition-transform", openTool === tool.id ? "rotate-45" : "")} />
                </button>
                {tool.id === "assign" && assignees.length ? (
                  <div className="px-3 pb-2"><ToolPills values={assignees} onRemove={(value) => removeListValue(value, setAssignees)} /></div>
                ) : null}
                {tool.id === "attachments" && attachments.length ? (
                  <div className="px-3 pb-2"><ToolPills values={attachments} onRemove={(value) => removeListValue(value, setAttachments)} /></div>
                ) : null}
                {tool.id === "tags" && tags.length ? (
                  <div className="px-3 pb-2"><ToolPills values={tags} onRemove={(value) => removeListValue(value, setTags)} /></div>
                ) : null}
                {openTool === tool.id ? (
                  <div className="px-3 pb-2">
                    {tool.id === "email" ? (
                      <div className="flex gap-2">
                        <Input value={emailAddress} onChange={(event) => setEmailAddress(event.target.value)} placeholder="Email address" className="h-9 rounded-md" />
                        <Button disabled={isWorking || !emailAddress.trim()} onClick={() => {
                          const email = emailAddress.trim()
                          void onTool(entry, `Send to Email: ${email}`).then(() => {
                            recordToolActivity(`Sent invoice email to ${email}`)
                            setEmailAddress("")
                          })
                        }} type="button" className="size-9 rounded-md p-0"><Send className="size-4" /></Button>
                      </div>
                    ) : null}
                    {tool.id === "assign" ? (
                      <div className="space-y-2">
                        <Input value={assigneeInput} onChange={(event) => setAssigneeInput(event.target.value)} onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault()
                            addListValue(assigneeInput, setAssigneeInput, setAssignees, (value) => `Assigned ${entry.invoice_no} to ${value}`)
                          }
                        }} placeholder="User name or email" className="h-9 rounded-md" />
                      </div>
                    ) : null}
                    {tool.id === "attachments" ? (
                      <div className="space-y-2">
                        <Input type="file" multiple className="h-9 rounded-md" onChange={(event) => {
                          const names = Array.from(event.target.files ?? []).map((file) => file.name)
                          if (names.length) setAttachments((current) => {
                            const nextNames = names.filter((name) => !current.includes(name))
                            nextNames.forEach((name) => recordToolActivity(`Attached file ${name}`))
                            return [...current, ...nextNames]
                          })
                          event.currentTarget.value = ""
                        }} />
                      </div>
                    ) : null}
                    {tool.id === "tags" ? (
                      <div className="space-y-2">
                        <Input value={tagInput} onChange={(event) => setTagInput(event.target.value)} onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault()
                            addListValue(tagInput, setTagInput, setTags, (value) => `Added tag ${value}`)
                          }
                        }} placeholder="Tag" className="h-9 rounded-md" />
                      </div>
                    ) : null}
                    {tool.id === "whatsapp" ? (
                      <div className="flex gap-2">
                        <Input value={whatsappNumber} onChange={(event) => setWhatsappNumber(event.target.value)} placeholder="WhatsApp number" className="h-9 rounded-md" />
                        <Button disabled={isWorking || !whatsappNumber.trim()} onClick={() => {
                          const number = whatsappNumber.trim()
                          void onTool(entry, `Send to WhatsApp: ${number}`).then(() => {
                            recordToolActivity(`Sent WhatsApp message to ${number}`)
                            setWhatsappNumber("")
                          })
                        }} type="button" className="size-9 rounded-md p-0"><Send className="size-4" /></Button>
                      </div>
                    ) : null}
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

function ToolPills({ onRemove, values }: { onRemove(value: string): void; values: readonly string[] }) {
  if (!values.length) return null
  return (
    <div className="flex flex-wrap gap-2">
      {values.map((value) => (
        <span key={value} className="inline-flex h-7 max-w-full items-center gap-1 rounded-md bg-muted px-2 text-xs font-medium text-foreground">
          <span className="truncate">{value}</span>
          <button aria-label={`Remove ${value}`} className="rounded-sm text-muted-foreground hover:text-foreground" onClick={() => onRemove(value)} type="button">
            <X className="size-3" />
          </button>
        </span>
      ))}
    </div>
  )
}

function SalesUpsertPage({ entry, isSaving, session, onBack, onSubmit }: {
  entry: SalesEntry | null
  isSaving: boolean
  session: AuthSession
  onBack(): void
  onSubmit(input: SalesEntryInput, printAfterSave?: boolean): Promise<void>
}) {
  const [draft, setDraft] = useState<SalesEntryInput>(() => entry ? { ...entry, items: entry.items.map((item) => ({ ...item })) } : emptySalesEntry())
  const [contactCreateInitialName, setContactCreateInitialName] = useState<string | null>(null)
  const totals = useMemo(() => calculateDraftTotals(draft.items, draft.round_off, draft.place_of_supply), [draft.items, draft.place_of_supply, draft.round_off])
  const contactsQuery = useQuery({ queryKey: ["sales-lookups", session.selectedTenant.slug, "contacts"], queryFn: () => listSalesContactLookups(session) })
  const contactTypesQuery = useQuery({ queryKey: ["sales-lookups", session.selectedTenant.slug, "contactTypes"], queryFn: () => listMasterDataRecords(session, "contactTypes") })
  const hsnCodesQuery = useQuery({ queryKey: ["sales-lookups", session.selectedTenant.slug, "hsnCodes"], queryFn: () => listSalesCommonLookups(session, "hsnCodes") })
  const taxesQuery = useQuery({ queryKey: ["sales-lookups", session.selectedTenant.slug, "taxes"], queryFn: () => listSalesCommonLookups(session, "taxes") })
  const unitsQuery = useQuery({ queryKey: ["sales-lookups", session.selectedTenant.slug, "units"], queryFn: () => listSalesCommonLookups(session, "units") })
  const transportsQuery = useQuery({ queryKey: ["sales-lookups", session.selectedTenant.slug, "transports"], queryFn: () => listMasterDataRecords(session, "transports") })
  const nextInvoiceQuery = useQuery({
    enabled: !entry,
    queryKey: ["document-number-next-preview", session.selectedTenant.slug, "sales"],
    queryFn: () => nextDocumentNumberSetting(session, "sales"),
  })
  const [softwareSettings] = useCompanySoftwareSettings(session)
  const customerContacts = useMemo(() => filterStockContactLookupOptions(contactsQuery.data ?? [], contactTypesQuery.data ?? [], "customer"), [contactsQuery.data, contactTypesQuery.data])

  useEffect(() => {
    if (entry || draft.invoice_no || !nextInvoiceQuery.data?.preview) return
    setDraft((current) => current.invoice_no ? current : { ...current, invoice_no: nextInvoiceQuery.data.preview })
  }, [draft.invoice_no, entry, nextInvoiceQuery.data?.preview])

  return (
    <MasterListPageFrame
      title={entry ? `Edit ${entry.invoice_no}` : "New Sales"}
      description="Create or update a tenant-isolated sales voucher."
      technicalName="page.entries.sales.upsert"
      action={<Button type="button" variant="outline" onClick={onBack} className="rounded-md"><X className="size-4" />Cancel</Button>}
    >
      <MasterListUpsertLayout>
        <MasterListUpsertCard className="overflow-hidden p-0 [&>div]:p-0">
          <form className="space-y-6" onSubmit={(event) => { event.preventDefault(); void onSubmit(buildSalesSaveInput(draft)) }}>
            <div className="px-0 pb-4 pt-3 md:pb-5">
              <SalesVoucherTabs
                contacts={customerContacts}
                onContactsRefresh={() => void contactsQuery.refetch()}
                onCreateContact={setContactCreateInitialName}
                form={draft}
                hsnCodes={hsnCodesQuery.data ?? []}
                session={session}
                setForm={setDraft}
                softwareSettings={softwareSettings}
                taxes={taxesQuery.data ?? []}
                totals={totals}
                transports={transportsQuery.data ?? []}
                units={unitsQuery.data ?? []}
              />
            </div>
            <div className="flex flex-wrap items-center gap-3 border-t border-border/70 bg-muted/20 px-4 py-4 md:px-6">
              <Button type="submit" disabled={isSaving} className="rounded-md"><Save className={cn("size-4", isSaving && "animate-spin")} />Save</Button>
              <Button type="button" disabled={isSaving} variant="secondary" onClick={() => void onSubmit(buildSalesSaveInput({ ...draft, status: "posted" }), true)} className="rounded-md"><Printer className="size-4" />Save & Print</Button>
              <Button type="button" variant="outline" onClick={onBack} className="rounded-md"><X className="size-4" />Cancel</Button>
            </div>
          </form>
        </MasterListUpsertCard>
      </MasterListUpsertLayout>
      {contactCreateInitialName !== null ? (
        <SalesContactCreateDialog
          contacts={contactsQuery.data ?? []}
          initialName={contactCreateInitialName}
          isSaving={isSaving}
          session={session}
          onClose={() => setContactCreateInitialName(null)}
          onCreated={(contact) => {
            setDraft((current) => ({
              ...current,
              billing_address: contact.billingAddress ?? current.billing_address,
              customer_id: contact.id,
              customer_name: salesLookupInputName(contact),
              shipping_address: contact.shippingAddress ?? contact.billingAddress ?? current.shipping_address,
            }))
            void contactsQuery.refetch()
            setContactCreateInitialName(null)
          }}
        />
      ) : null}
    </MasterListPageFrame>
  )
}

function SalesVoucherTabs({ contacts, form, hsnCodes, onContactsRefresh, onCreateContact, session, setForm, softwareSettings, taxes, totals, transports, units }: {
  contacts: SalesLookupOption[]
  form: SalesEntryInput
  hsnCodes: SalesLookupOption[]
  onContactsRefresh(): void
  onCreateContact(name: string): void
  session: AuthSession
  setForm(updater: (current: SalesEntryInput) => SalesEntryInput): void
  softwareSettings: SoftwareSettingsState
  taxes: SalesLookupOption[]
  totals: DraftTotals
  transports: MasterDataRecord[]
  units: SalesLookupOption[]
}) {
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null)
  const [itemDraft, setItemDraft] = useState<SalesEntryItem>(() => emptySalesItem())
  const addressLabels = useSalesAddressLabels(session)

  function addItem() {
    if (!itemDraft.product_name.trim()) return
    setForm((current) => {
      const normalizedItem = normalizeSalesItem(itemDraft, editingItemIndex ?? current.items.length, current.place_of_supply)
      if (editingItemIndex === null) return { ...current, items: [...current.items, normalizedItem] }
      return {
        ...current,
        items: current.items.map((item, index) => index === editingItemIndex ? normalizedItem : item),
      }
    })
    setItemDraft(emptySalesItem())
    setEditingItemIndex(null)
  }

  function editItem(index: number) {
    const item = form.items[index]
    if (!item) return
    setItemDraft({ ...item })
    setEditingItemIndex(index)
  }

  function deleteItem(index: number) {
    setForm((current) => ({ ...current, items: current.items.filter((_, itemIndex) => itemIndex !== index) }))
    if (editingItemIndex === index) {
      setItemDraft(emptySalesItem())
      setEditingItemIndex(null)
      return
    }
    if (editingItemIndex !== null && editingItemIndex > index) setEditingItemIndex(editingItemIndex - 1)
  }

  const tabs: AnimatedTab[] = [
    {
      value: "details",
      label: "Details",
      content: (
        <SalesDetailsTab
          addItem={addItem}
          contacts={contacts}
          deleteItem={deleteItem}
          editItem={editItem}
          editingItemIndex={editingItemIndex}
          form={form}
          hsnCodes={hsnCodes}
          itemDraft={itemDraft}
          addressLabels={addressLabels}
          onCreateContact={onCreateContact}
          session={session}
          setEditingItemIndex={setEditingItemIndex}
          setForm={setForm}
          setItemDraft={setItemDraft}
          softwareSettings={softwareSettings}
          taxes={taxes}
          totals={totals}
          units={units}
        />
      ),
    },
    {
      value: "address",
      label: "Address",
      content: <SalesAddressTab addressLabels={addressLabels} contacts={contacts} form={form} onContactsRefresh={onContactsRefresh} session={session} setForm={setForm} />,
    },
    ...(isSoftwareSettingEnabled(softwareSettings, "sales-use-eway") ? [{
      value: "eway",
      label: "E-way",
      content: <SalesDocumentTab form={form} session={session} setForm={setForm} transports={transports} type="eway" />,
    }] : []),
    ...(isSoftwareSettingEnabled(softwareSettings, "sales-use-einvoice") ? [{
      value: "einvoice",
      label: "E-invoice",
      content: <SalesDocumentTab form={form} session={session} setForm={setForm} transports={transports} type="einvoice" />,
    }] : []),
    {
      value: "terms",
      label: "Terms",
      content: <SalesTermsTab form={form} setForm={setForm} />,
    },
  ]

  return (
    <AnimatedTabs
      className="[&>div:first-child]:rounded-none [&>div:first-child]:border-x-0 [&>div:first-child]:border-t-0 [&>div:first-child]:border-b [&>div:first-child]:border-border/70 [&>div:first-child]:bg-card [&>div:first-child]:px-4 [&>div:first-child]:py-0.5 [&>div:first-child]:shadow-none md:[&>div:first-child]:px-6 [&>div:first-child_button]:min-h-8 [&>div:first-child_button]:py-1 [&>div:last-child]:mx-auto [&>div:last-child]:mt-3 [&>div:last-child]:w-full [&>div:last-child]:px-4 [&>div:last-child]:pb-3 md:[&>div:last-child]:px-6 md:[&>div:last-child]:pb-4"
      tabs={tabs}
    />
  )
}

function SalesDetailsTab({ addItem, addressLabels, contacts, deleteItem, editItem, editingItemIndex, form, hsnCodes, itemDraft, onCreateContact, session, setEditingItemIndex, setForm, setItemDraft, softwareSettings, taxes, totals, units }: {
  addItem(): void
  addressLabels: SalesAddressLabels
  contacts: SalesLookupOption[]
  deleteItem(index: number): void
  editItem(index: number): void
  editingItemIndex: number | null
  form: SalesEntryInput
  hsnCodes: SalesLookupOption[]
  itemDraft: SalesEntryItem
  onCreateContact(name: string): void
  session: AuthSession
  setEditingItemIndex(value: number | null): void
  setForm(updater: (current: SalesEntryInput) => SalesEntryInput): void
  setItemDraft(value: SalesEntryItem | ((current: SalesEntryItem) => SalesEntryItem)): void
  softwareSettings: SoftwareSettingsState
  taxes: SalesLookupOption[]
  totals: DraftTotals
  units: SalesLookupOption[]
}) {
  const productInputRef = useRef<HTMLInputElement | null>(null)
  const usePo = isSoftwareSettingEnabled(softwareSettings, "sales-use-po")
  const useDc = isSoftwareSettingEnabled(softwareSettings, "sales-use-dc")
  const useColour = isSoftwareSettingEnabled(softwareSettings, "sales-use-colour")
  const useSize = isSoftwareSettingEnabled(softwareSettings, "sales-use-size")
  const isCgstSgst = (form.place_of_supply ?? "cgst-sgst") !== "igst"
  const isOffsetLayout = usePo || useDc
  const isGarmentLayout = useColour || useSize
  const itemRowClassName = cn(
    "grid items-end gap-1 sm:grid-cols-2 lg:grid-cols-4",
    isOffsetLayout
      ? "xl:grid-cols-[minmax(5rem,.42fr)_minmax(5rem,.42fr)_minmax(18rem,2fr)_minmax(11rem,1fr)_minmax(5rem,.45fr)_minmax(6rem,.55fr)_auto]"
      : isGarmentLayout
        ? "xl:grid-cols-[minmax(18rem,2.1fr)_minmax(11rem,1fr)_minmax(8rem,.72fr)_minmax(8rem,.72fr)_minmax(5rem,.45fr)_minmax(6rem,.55fr)_auto]"
        : "xl:grid-cols-[minmax(22rem,2.3fr)_minmax(14rem,1fr)_minmax(5rem,.45fr)_minmax(6rem,.55fr)_auto]",
  )

  function cancelItemEdit() {
    setItemDraft(() => emptySalesItem())
    setEditingItemIndex(null)
  }

  function addItemAndFocus() {
    if (!itemDraft.product_name.trim()) return
    addItem()
    window.setTimeout(() => productInputRef.current?.focus(), 0)
  }

  return (
    <div className="space-y-8">
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="space-y-5">
          <MasterAutocompleteLookup
            label="Customer name *"
            options={contacts}
            placeholder=""
            createLabel="Create contact"
            selectedId={form.customer_id ?? null}
            selectedLabel={selectedSalesLookupInputLabel(contacts, form.customer_id ?? null, form.customer_name ?? "")}
            inputLabel={salesLookupInputName}
            optionLabel={salesLookupInputName}
            onCreate={onCreateContact}
            onPick={(option) => {
              const address = preferredContactAddress(option)
              const addressLine = address ? addressText(address, addressLabels) : undefined
              setForm((current) => ({
                ...current,
                billing_address: addressLine ?? option.billingAddress ?? current.billing_address,
                customer_gstin: contactLookupGstin(option),
                customer_id: option.id,
                customer_name: salesLookupInputName(option),
                customer_state_code: address ? addressLabels.stateCodes(address.stateId) : "",
                customer_state_name: address ? addressLabels.states(address.stateId) : "",
                shipping_address: addressLine ?? option.shippingAddress ?? option.billingAddress ?? current.shipping_address,
              }))
            }}
            onTextChange={(value) => setForm((current) => ({ ...current, customer_gstin: "", customer_id: null, customer_name: value, customer_state_code: "", customer_state_name: "" }))}
          />
          <WorkOrderAutocomplete session={session} value={form.reference_no ?? ""} onChange={(value) => setForm((current) => ({ ...current, reference_no: value }))} />
        </div>
        <div className="space-y-5">
          <Field label="Invoice no" value={form.invoice_no ?? ""} onChange={(value) => setForm((current) => ({ ...current, invoice_no: value }))} />
          <Field label="Date" type="date" value={String(form.invoice_date ?? "")} onChange={(value) => setForm((current) => ({ ...current, invoice_date: value }))} />
          <SalesTypeField value={form.place_of_supply ?? "cgst-sgst"} onChange={(value) => setForm((current) => ({ ...current, place_of_supply: value }))} />
        </div>
      </div>
      <section className="space-y-5">
        <h2 className="text-lg font-semibold text-primary underline underline-offset-4">Sales Items</h2>
        <div className={itemRowClassName}>
          {isOffsetLayout ? <Field compact centeredLabel label="PO" value={itemDraft.po_no ?? ""} onChange={(value) => setItemDraft((current) => ({ ...current, po_no: value }))} /> : null}
          {isOffsetLayout ? <Field compact centeredLabel label="DC" value={itemDraft.dc_no ?? ""} onChange={(value) => setItemDraft((current) => ({ ...current, dc_no: value }))} /> : null}
          <ProductAutocomplete
            className="gap-1"
            inputRef={productInputRef}
            session={session}
            value={itemDraft.product_name}
            onChange={(value, record) => setItemDraft((current) => record ? ({
              ...current,
              product_id: productRecordId(record),
              product_name: productRecordName(record),
              hsn_code: productRecordCommonValue(record, "hsn_code_id", hsnCodes),
              tax_rate: productRecordTaxRate(record, taxes),
              unit: productRecordCommonValue(record, "unit_id", units),
            }) : { ...current, product_id: null, product_name: value })}
          />
          <Field compact centeredLabel label="Description" value={itemDraft.description ?? ""} onChange={(value) => setItemDraft((current) => ({ ...current, description: value }))} />
          {isGarmentLayout ? <CommonRecordAutocompleteLookup label="Colour" className="gap-1" labelClassName="text-center" moduleKey="colours" placeholder="Search colour" session={session} value={itemDraft.colour ?? ""} onChange={(value, record) => setItemDraft((current) => ({ ...current, colour: record ? getCommonRecordName(record) : value === null ? "" : String(value) }))} /> : null}
          {isGarmentLayout ? <CommonRecordAutocompleteLookup label="Size" className="gap-1" labelClassName="text-center" moduleKey="sizes" placeholder="Search size" session={session} value={itemDraft.size ?? ""} onChange={(value, record) => setItemDraft((current) => ({ ...current, size: record ? getCommonRecordName(record) : value === null ? "" : String(value) }))} /> : null}
          <Field compact centeredLabel numeric label="Quantity" type="text" value={String(itemDraft.quantity)} onChange={(value) => setItemDraft((current) => ({ ...current, quantity: parseDecimalInput(value) }))} />
          <Field compact centeredLabel numeric decimalScale={2} label="Price" type="text" value={String(itemDraft.rate)} onChange={(value) => setItemDraft((current) => ({ ...current, rate: parseDecimalInput(value) }))} />
          <div className="flex h-11 items-center gap-1">
            <Button type="button" className="h-11 w-full rounded-md px-3 xl:w-auto" disabled={!itemDraft.product_name.trim()} onClick={addItemAndFocus}>
              {editingItemIndex === null ? <Plus className="size-4" /> : <Check className="size-4" />}
              {editingItemIndex === null ? "Add" : "Update"}
            </Button>
            {editingItemIndex !== null ? (
              <Button type="button" size="icon" variant="outline" className="size-11 rounded-md" onClick={cancelItemEdit} aria-label="Cancel item edit">
                <X className="size-4" />
              </Button>
            ) : null}
          </div>
        </div>
        <SalesItemsPreviewTable isCgstSgst={isCgstSgst} items={form.items} onDeleteItem={deleteItem} onEditItem={editItem} useColour={useColour} useDc={useDc} usePo={usePo} useSize={useSize} />
        <TotalsFooter setForm={setForm} totals={totals} />
      </section>
    </div>
  )
}

function SalesItemsPreviewTable({ isCgstSgst, items, onDeleteItem, onEditItem, useColour, useDc, usePo, useSize }: { isCgstSgst: boolean; items: SalesEntryItem[]; onDeleteItem(index: number): void; onEditItem(index: number): void; useColour: boolean; useDc: boolean; usePo: boolean; useSize: boolean }) {
  const emptyColSpan = 11 + (usePo ? 1 : 0) + (useDc ? 1 : 0) + (useColour ? 1 : 0) + (useSize ? 1 : 0) + (isCgstSgst ? 2 : 1)

  return (
    <div className="w-full overflow-x-auto rounded-md border border-border/70">
      <table className="w-full min-w-[980px] table-fixed border-collapse text-[10px] sm:text-[11px] xl:text-xs">
        <thead className="bg-muted/45 text-muted-foreground">
          <tr>
            <ItemHeader className="w-[2.5%]">#</ItemHeader>
            {usePo ? <ItemHeader className="w-[5%]">PO</ItemHeader> : null}
            {useDc ? <ItemHeader className="w-[5%]">DC</ItemHeader> : null}
            <ItemHeader className="w-[24%]">Particulars</ItemHeader>
            <ItemHeader className="w-[5%]">HSN Code</ItemHeader>
            {useColour ? <ItemHeader className="w-[6%]">Colour</ItemHeader> : null}
            {useSize ? <ItemHeader className="w-[5%]">Size</ItemHeader> : null}
            <ItemHeader className="w-[5%]">Qty</ItemHeader>
            <ItemHeader className="w-[7%]">Rate</ItemHeader>
            <ItemHeader className="w-[5%]">Unit</ItemHeader>
            <ItemHeader className="w-[7%]">Taxable</ItemHeader>
            <ItemHeader className="w-[4%]">GST %</ItemHeader>
            {isCgstSgst ? <ItemHeader className="w-[7%]">CGST</ItemHeader> : null}
            {isCgstSgst ? <ItemHeader className="w-[7%]">SGST</ItemHeader> : null}
            {!isCgstSgst ? <ItemHeader className="w-[8%]">IGST</ItemHeader> : null}
            <ItemHeader className="w-[8%]">Total</ItemHeader>
            <ItemHeader className="w-[4.5%]">Action</ItemHeader>
          </tr>
        </thead>
        <tbody>
          {items.length === 0 ? (
            <tr>
              <td colSpan={emptyColSpan} className="px-4 py-8 text-center text-sm text-muted-foreground">No sales items added.</td>
            </tr>
          ) : items.map((item, index) => {
            const tax = salesItemTaxBreakup(item, isCgstSgst)
            return (
              <tr key={index} className="border-b border-border/60 last:border-b-0">
                <td className="border-r border-border/70 px-1 py-1.5 text-center align-middle text-muted-foreground">{index + 1}</td>
                {usePo ? <ItemCell align="center">{item.po_no || "-"}</ItemCell> : null}
                {useDc ? <ItemCell align="center">{item.dc_no || "-"}</ItemCell> : null}
                <ItemCell>{formatParticulars(item)}</ItemCell>
                <ItemCell align="center">{item.hsn_code || "-"}</ItemCell>
                {useColour ? <ItemCell>{item.colour || "-"}</ItemCell> : null}
                {useSize ? <ItemCell>{item.size || "-"}</ItemCell> : null}
                <ItemCell align="center">{Number(item.quantity || 0).toLocaleString()}</ItemCell>
                <ItemCell align="right">{formatMoney(Number(item.rate || 0))}</ItemCell>
                <ItemCell align="center">{item.unit || "-"}</ItemCell>
                <ItemCell align="right">{formatMoney(tax.taxable)}</ItemCell>
                <ItemCell align="center">{Number(item.tax_rate || 0)}%</ItemCell>
                {isCgstSgst ? <ItemCell align="right">{formatMoney(tax.cgstAmount)}</ItemCell> : null}
                {isCgstSgst ? <ItemCell align="right">{formatMoney(tax.sgstAmount)}</ItemCell> : null}
                {!isCgstSgst ? <ItemCell align="right">{formatMoney(tax.igstAmount)}</ItemCell> : null}
                <td className="border-r border-border/70 px-1.5 py-1.5 text-right align-middle font-medium">{formatMoney(tax.total)}</td>
                <td className="px-1 py-1.5 text-center align-middle">
                  <div className="flex items-center justify-center gap-1">
                    <Button type="button" size="icon" variant="ghost" className="size-7 rounded-md" onClick={() => onEditItem(index)} aria-label="Edit item">
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button type="button" size="icon" variant="ghost" className="size-7 rounded-md text-destructive hover:text-destructive" onClick={() => onDeleteItem(index)} aria-label="Delete item">
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function SalesAddressTab({ addressLabels, contacts, form, onContactsRefresh, session, setForm }: {
  addressLabels: SalesAddressLabels
  contacts: SalesLookupOption[]
  form: SalesEntryInput
  onContactsRefresh(): void
  session: AuthSession
  setForm(updater: (current: SalesEntryInput) => SalesEntryInput): void
}) {
  const [createAddress, setCreateAddress] = useState<{ initialText: string; kind: "billing" | "shipping" } | null>(null)
  const selectedContact = contacts.find((contact) => contact.id === form.customer_id) ?? null
  const addressOptions = buildContactAddressOptions(selectedContact, addressLabels)

  function pickAddress(kind: "billing" | "shipping", option: SalesLookupOption) {
    const text = option.label
    const address = (option.record as { address?: ContactAddress }).address
    setForm((current) => {
      const taxFields = address ? {
        customer_state_code: addressLabels.stateCodes(address.stateId),
        customer_state_name: addressLabels.states(address.stateId),
      } : {}
      if (kind === "billing") {
        return {
          ...current,
          billing_address: text,
          ...taxFields,
          shipping_address: current.shipping_address?.trim() ? current.shipping_address : text,
        }
      }

      return { ...current, ...taxFields, shipping_address: text || current.billing_address || "" }
    })
  }

  return (
    <>
      <div className="grid gap-5 lg:grid-cols-2">
        <MasterAutocompleteLookup
          createLabel="Create address"
          label="Billing address"
          options={addressOptions}
          placeholder=""
          selectedId={null}
          selectedLabel={form.billing_address ?? ""}
          onCreate={(query) => setCreateAddress({ initialText: query, kind: "billing" })}
          onPick={(option) => pickAddress("billing", option)}
          onTextChange={(value) => setForm((current) => ({ ...current, billing_address: value, shipping_address: current.shipping_address?.trim() ? current.shipping_address : value }))}
        />
        <MasterAutocompleteLookup
          createLabel="Create address"
          label="Shipping address"
          options={addressOptions}
          placeholder=""
          selectedId={null}
          selectedLabel={form.shipping_address ?? form.billing_address ?? ""}
          onCreate={(query) => setCreateAddress({ initialText: query, kind: "shipping" })}
          onPick={(option) => pickAddress("shipping", option)}
          onTextChange={(value) => setForm((current) => ({ ...current, shipping_address: value }))}
        />
        <Field label="Place of supply" value={form.place_of_supply ?? ""} onChange={(value) => setForm((current) => ({ ...current, place_of_supply: value }))} />
        <Field label="Due date" type="date" value={String(form.due_date ?? "")} onChange={(value) => setForm((current) => ({ ...current, due_date: value }))} />
      </div>
      {createAddress && selectedContact ? (
        <SalesAddressCreateDialog
          contact={selectedContact}
          initialText={createAddress.initialText}
          kind={createAddress.kind}
          addressLabels={addressLabels}
          session={session}
          onClose={() => setCreateAddress(null)}
          onCreated={(addressText) => {
            pickAddress(createAddress.kind, { id: addressText, label: addressText, record: { id: 0, uuid: addressText, is_active: true, created_at: null, updated_at: null, deleted_at: null, name: addressText } })
            onContactsRefresh()
            setCreateAddress(null)
          }}
        />
      ) : null}
    </>
  )
}

function SalesAddressCreateDialog({ addressLabels, contact, initialText, kind, onClose, onCreated, session }: {
  addressLabels: SalesAddressLabels
  contact: SalesLookupOption
  initialText: string
  kind: "billing" | "shipping"
  onClose(): void
  onCreated(addressText: string): void
  session: AuthSession
}) {
  const [countryOptions, setCountryOptions] = useState<MasterDataRecord[]>([])
  const [draft, setDraft] = useState<ContactAddress>(() => ({
    ...emptyAddress(),
    addressLine1: initialText,
    addressLine2: "",
    isDefault: kind === "billing",
  }))
  const saveMutation = useMutation({
    mutationFn: async () => {
      const input = contactLookupToInput(contact)
      const savedAddress = { ...draft, addressLine1: draft.addressLine1.trim(), isActive: true }
      const saved = await upsertContact(session, {
        ...input,
        addresses: [...input.addresses.filter((address) => address.addressLine1.trim()), savedAddress],
      })
      return addressText(savedAddress, addressLabels) || contactAddressPreview(saved) || savedAddress.addressLine1
    },
    onError: (error) => toast.error("Could not create address", { description: error instanceof Error ? error.message : "Please try again." }),
    onSuccess: (text) => {
      toast.success("Address created")
      onCreated(text)
    },
  })

  useEffect(() => {
    if (draft.countryId || countryOptions.length === 0) return
    const firstCountry = countryOptions[0]
    if (firstCountry) setDraft((current) => ({ ...current, countryId: String(firstCountry.id) }))
  }, [countryOptions, draft.countryId])

  return (
    <div className="fixed inset-0 z-[170] grid place-items-center bg-background/55 p-4 backdrop-blur-sm">
      <div className="w-[min(760px,calc(100vw-2rem))] overflow-hidden rounded-md border border-border/70 bg-card shadow-xl">
        <div className="flex items-center justify-between border-b border-border/70 px-5 py-4">
          <div>
            <h2 className="text-base font-semibold">Create {kind} address</h2>
            <p className="text-sm text-muted-foreground">{salesLookupInputName(contact)}</p>
          </div>
          <Button size="icon" variant="ghost" onClick={onClose} type="button"><X className="size-4" /></Button>
        </div>
        <div className="grid max-h-[min(68vh,36rem)] gap-4 overflow-y-auto p-5 md:grid-cols-2">
          <CommonRecordAutocompleteLookup label="Address type" moduleKey="addressTypes" session={session} value={draft.addressTypeId} onChange={(value) => setDraft((current) => ({ ...current, addressTypeId: value === null ? null : String(value) }))} />
          <Field label="Address line 1" value={draft.addressLine1} onChange={(addressLine1) => setDraft((current) => ({ ...current, addressLine1 }))} />
          <Field label="Address line 2" value={draft.addressLine2 ?? ""} onChange={(addressLine2) => setDraft((current) => ({ ...current, addressLine2 }))} />
          <CountryAutocompleteLookup label="Country" onOptionsChange={setCountryOptions} session={session} value={draft.countryId} onChange={(countryId) => setDraft((current) => ({ ...current, countryId: countryId === null ? null : String(countryId), stateId: null, districtId: null, cityId: null, pincodeId: null }))} />
          <StateAutocompleteLookup countryId={draft.countryId} label="State" session={session} value={draft.stateId} onChange={(stateId) => setDraft((current) => ({ ...current, stateId: stateId === null ? null : String(stateId), districtId: null, cityId: null, pincodeId: null }))} />
          <DistrictAutocompleteLookup label="District" session={session} stateId={draft.stateId} value={draft.districtId} onChange={(districtId) => setDraft((current) => ({ ...current, districtId: districtId === null ? null : String(districtId), cityId: null, pincodeId: null }))} />
          <CityAutocompleteLookup districtId={draft.districtId} label="City" session={session} value={draft.cityId} onChange={(cityId) => setDraft((current) => ({ ...current, cityId: cityId === null ? null : String(cityId), pincodeId: null }))} />
          <PincodeAutocompleteLookup cityId={draft.cityId} label="Pincode" session={session} value={draft.pincodeId} onChange={(pincodeId) => setDraft((current) => ({ ...current, pincodeId: pincodeId === null ? null : String(pincodeId) }))} />
        </div>
        <div className="flex flex-wrap items-center gap-3 border-t border-border/70 bg-muted/20 px-5 py-4">
          <Button className="rounded-md" disabled={saveMutation.isPending || !draft.addressLine1.trim()} onClick={() => void saveMutation.mutateAsync()} type="button"><Save className={cn("size-4", saveMutation.isPending && "animate-spin")} />Finalise</Button>
          <Button className="rounded-md" disabled={saveMutation.isPending} onClick={onClose} type="button" variant="outline"><X className="size-4" />Cancel</Button>
        </div>
      </div>
    </div>
  )
}

function SalesDocumentTab({ form, session, setForm, transports, type }: {
  form: SalesEntryInput
  session: AuthSession
  setForm(updater: (current: SalesEntryInput) => SalesEntryInput): void
  transports: MasterDataRecord[]
  type: "eway" | "einvoice"
}) {
  const einvoiceStatus = form.irn || form.ack_no || form.signed_qr ? "Generated" : "Not generated"
  const ewayStatus = form.eway_bill_no ? "Generated" : "Not generated"
  const transport = salesTransportDraftFromForm(form)
  const setTransport = (nextTransport: SalesTransportDraft) => setForm((current) => ({ ...current, ...salesTransportDraftToForm(nextTransport) }))

  function generateEinvoice() {
    const toastId = toast.loading("Sending e-invoice request...")
    setForm((current) => ({ ...current, status: "posted" }))
    window.setTimeout(() => {
      setForm((current) => ({ ...current, ack_date: new Date().toISOString().slice(0, 10), ack_no: String(Math.floor(1000000000000 + Math.random() * 9000000000000)), irn: generatePreviewIrn(), signed_qr: "Signed QR will be populated after live e-invoice integration." }))
      toast.success("E-invoice generated", { description: "Invoice posted. Live gateway wiring will be added later.", id: toastId })
    }, 900)
  }

  function generateEway() {
    const toastId = toast.loading("Sending E-way bill request...")
    setForm((current) => ({ ...current, status: "posted" }))
    window.setTimeout(() => {
      setForm((current) => ({ ...current, eway_bill_date: new Date().toISOString().slice(0, 10), eway_bill_no: String(Math.floor(100000000000 + Math.random() * 900000000000)), eway_part: salesTransportDraftFromForm(current).name.trim() && salesTransportDraftFromForm(current).name.trim() !== "-" ? "part-a" : "part-b" }))
      toast.success("E-way bill generated", { description: "Invoice posted. Live gateway wiring will be added later.", id: toastId })
    }, 900)
  }

  if (type === "einvoice") {
    return (
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-md bg-muted/40 px-3 py-2.5">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <span>E-invoice status</span>
            <Badge variant="outline" className={cn("h-6 rounded-md px-2 text-[11px]", einvoiceStatus === "Generated" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-700")}>{einvoiceStatus}</Badge>
          </div>
          <Button className="h-9 rounded-md" type="button" onClick={generateEinvoice}><Send className="size-4" />Generate</Button>
        </div>
        <Field label="IRN" value={form.irn ?? ""} onChange={(irn) => setForm((current) => ({ ...current, irn }))} />
        <div className="grid gap-5 lg:grid-cols-2">
          <Field label="Ack no" value={form.ack_no ?? ""} onChange={(ack_no) => setForm((current) => ({ ...current, ack_no }))} />
          <Field label="Ack date" type="date" value={String(form.ack_date ?? "")} onChange={(ack_date) => setForm((current) => ({ ...current, ack_date }))} />
        </div>
        <TextField label="Signed QR" value={form.signed_qr ?? ""} onChange={(signed_qr) => setForm((current) => ({ ...current, signed_qr }))} />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-md bg-muted/40 px-3 py-2.5">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <span>E-way status</span>
          <Badge variant="outline" className={cn("h-6 rounded-md px-2 text-[11px]", ewayStatus === "Generated" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-700")}>{ewayStatus}</Badge>
        </div>
        <Button className="h-9 rounded-md" type="button" onClick={generateEway}><Send className="size-4" />Generate</Button>
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <Field label="E-way bill no" value={form.eway_bill_no ?? ""} onChange={(eway_bill_no) => setForm((current) => ({ ...current, eway_bill_no }))} />
        <Field label="E-way bill date" type="date" value={String(form.eway_bill_date ?? "")} onChange={(eway_bill_date) => setForm((current) => ({ ...current, eway_bill_date }))} />
      </div>
      <TransportFields session={session} transport={transport} transports={transports} onChange={setTransport} />
      <TextField
        label="Transport / vehicle notes"
        value={form.notes ?? ""}
        onChange={(value) => setForm((current) => ({ ...current, notes: value }))}
      />
    </div>
  )
}

type SalesTransportDraft = {
  address: string
  contactNo: string
  contactPerson: string
  gst: string
  name: string
  transportId: string | null
  vehicleNo: string
}

function salesTransportDraftFromForm(form: SalesEntryInput): SalesTransportDraft {
  return {
    address: form.transport_address ?? "",
    contactNo: form.transport_contact_no ?? "",
    contactPerson: form.transport_contact_person ?? "",
    gst: form.transport_gst ?? "",
    name: form.transport_name ?? "",
    transportId: form.transport_id ?? null,
    vehicleNo: form.vehicle_no ?? "",
  }
}

function salesTransportDraftToForm(transport: SalesTransportDraft): Partial<SalesEntryInput> {
  const hasTransport = Boolean(transport.name.trim() && transport.name.trim() !== "-")
  return {
    eway_part: hasTransport ? "part-a" : "part-b",
    transport_address: transport.address,
    transport_contact_no: transport.contactNo,
    transport_contact_person: transport.contactPerson,
    transport_gst: transport.gst,
    transport_id: transport.transportId,
    transport_name: transport.name,
    vehicle_no: transport.vehicleNo,
  }
}

function TransportFields({ onChange, session, transport, transports }: { onChange(value: SalesTransportDraft): void; session: AuthSession; transport: SalesTransportDraft; transports: MasterDataRecord[] }) {
  const [createTransportName, setCreateTransportName] = useState<string | null>(null)
  const selectedTransport = transports.find((record) => String(record.uuid ?? record.id) === transport.transportId) ?? null
  const hasTransport = Boolean(transport.name.trim() && transport.name.trim() !== "-")
  const part = hasTransport ? "Part A" : "Part B"
  const options = transports.map(transportRecordToLookupOption)

  function applyTransport(record: MasterDataRecord | null, fallbackName = "") {
    onChange(record ? transportDraftFromRecord(record) : { ...transport, address: "", contactNo: "", contactPerson: "", gst: "", name: fallbackName, transportId: null })
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-[minmax(16rem,1.4fr)_minmax(8rem,.7fr)_minmax(9rem,.7fr)]">
        <MasterAutocompleteLookup
          createLabel="Create transport"
          label="Transport"
          options={options}
          placeholder=""
          selectedId={transport.transportId}
          selectedLabel={selectedTransport ? getCommonRecordName(selectedTransport) : transport.name}
          inputLabel={(option) => option.label}
          optionLabel={(option) => option.label}
          onCreate={setCreateTransportName}
          onPick={(option) => applyTransport(option.record)}
          onTextChange={(name) => applyTransport(null, name)}
        />
        <ReadonlyField label="E-way part" value={part} />
        <Field label="Vehicle no" value={transport.vehicleNo} onChange={(vehicleNo) => onChange({ ...transport, vehicleNo: vehicleNo.toUpperCase() })} />
      </div>
      {hasTransport ? (
        <div className="grid gap-5 lg:grid-cols-4">
          <Field label="Transport GST" value={transport.gst} onChange={(gst) => onChange({ ...transport, gst: gst.toUpperCase() })} />
          <Field label="Address" value={transport.address} onChange={(address) => onChange({ ...transport, address })} />
          <Field label="Contact no" value={transport.contactNo} onChange={(contactNo) => onChange({ ...transport, contactNo })} />
          <Field label="Contact person" value={transport.contactPerson} onChange={(contactPerson) => onChange({ ...transport, contactPerson })} />
        </div>
      ) : null}
      {createTransportName !== null ? (
        <TransportCreateDialog
          initialName={createTransportName}
          session={session}
          onClose={() => setCreateTransportName(null)}
          onCreated={(record) => {
            applyTransport(record)
            setCreateTransportName(null)
          }}
        />
      ) : null}
    </div>
  )
}

function TransportCreateDialog({ initialName, onClose, onCreated, session }: { initialName: string; onClose(): void; onCreated(record: MasterDataRecord): void; session: AuthSession }) {
  const [draft, setDraft] = useState(() => ({ address: "", contact_no: "", contact_person: "", gst: "", name: initialName, vehicle_no: "" }))
  const saveMutation = useMutation({
    mutationFn: () => upsertMasterDataRecord(session, "transports", { ...draft, gst: draft.gst.toUpperCase(), vehicle_no: draft.vehicle_no.toUpperCase(), is_active: true }),
    onSuccess: (record) => {
      toast.success("Transport created", { description: getCommonRecordName(record) })
      onCreated(record)
    },
    onError: (error) => toast.error("Transport create failed", { description: error instanceof Error ? error.message : "Please try again." }),
  })

  return (
    <div className="fixed inset-0 z-[180] grid place-items-center bg-background/55 p-4 backdrop-blur-sm">
      <div className="w-[min(760px,calc(100vw-2rem))] overflow-hidden rounded-md border border-border/70 bg-card shadow-xl">
        <div className="flex items-center justify-between border-b border-border/70 px-5 py-4">
          <h2 className="text-base font-semibold">Create transport</h2>
          <Button size="icon" variant="ghost" onClick={onClose} type="button"><X className="size-4" /></Button>
        </div>
        <div className="grid gap-4 p-5 md:grid-cols-2">
          <Field label="Name" value={draft.name} onChange={(name) => setDraft((current) => ({ ...current, name }))} />
          <Field label="GST" value={draft.gst} onChange={(gst) => setDraft((current) => ({ ...current, gst }))} />
          <Field label="Vehicle no" value={draft.vehicle_no} onChange={(vehicle_no) => setDraft((current) => ({ ...current, vehicle_no }))} />
          <Field label="Contact no" value={draft.contact_no} onChange={(contact_no) => setDraft((current) => ({ ...current, contact_no }))} />
          <Field label="Contact person" value={draft.contact_person} onChange={(contact_person) => setDraft((current) => ({ ...current, contact_person }))} />
          <TextField label="Address" value={draft.address} onChange={(address) => setDraft((current) => ({ ...current, address }))} />
        </div>
        <div className="flex flex-wrap items-center gap-3 border-t border-border/70 bg-muted/20 px-5 py-4">
          <Button className="rounded-md" disabled={saveMutation.isPending || !draft.name.trim()} onClick={() => void saveMutation.mutateAsync()} type="button"><Save className={cn("size-4", saveMutation.isPending && "animate-spin")} />Save transport</Button>
          <Button className="rounded-md" disabled={saveMutation.isPending} onClick={onClose} type="button" variant="outline"><X className="size-4" />Cancel</Button>
        </div>
      </div>
    </div>
  )
}

function ReadonlyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-2">
      <Label className="text-sm font-medium text-muted-foreground">{label}</Label>
      <div className="flex h-11 items-center rounded-md border border-input bg-muted/30 px-3 text-sm font-medium">{value}</div>
    </div>
  )
}

function SalesTermsTab({ form, setForm }: {
  form: SalesEntryInput
  setForm(updater: (current: SalesEntryInput) => SalesEntryInput): void
}) {
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <TextField label="Notes" value={form.notes ?? ""} onChange={(value) => setForm((current) => ({ ...current, notes: value }))} />
      <TextField label="Terms" value={form.terms ?? ""} onChange={(value) => setForm((current) => ({ ...current, terms: value }))} />
      <StatusField value={form.status ?? "draft"} onChange={(value) => setForm((current) => ({ ...current, status: value }))} />
    </div>
  )
}

function TotalsFooter({ setForm, totals }: {
  setForm(updater: (current: SalesEntryInput) => SalesEntryInput): void
  totals: DraftTotals
}) {
  return (
    <div className="ml-auto grid w-full max-w-sm gap-3 text-sm">
      <SummaryRow label="Taxable amount" value={formatMoney(totals.taxableAmount)} />
      <SummaryRow label="GST total" value={formatMoney(totals.gstTotal)} />
      <div className="grid grid-cols-[1fr_auto_8rem] items-center gap-4">
        <span className="font-medium text-muted-foreground">Round off</span>
        <span>:</span>
        <SignedDecimalInput className="h-9 w-24 justify-self-end rounded-md text-right" decimalScale={2} value={String(totals.roundOff)} onChange={(value) => setForm((current) => ({ ...current, round_off: parseMoneyInput(value) }))} />
      </div>
      <SummaryRow label="Grand total" value={formatMoney(totals.grandTotal)} strong />
    </div>
  )
}

function SalesContactCreateDialog({ contacts, initialName, onClose, onCreated, session }: {
  contacts: SalesLookupOption[]
  initialName: string
  isSaving: boolean
  onClose(): void
  onCreated(contact: SalesLookupOption): void
  session: AuthSession
}) {
  const [draft, setDraft] = useState<ContactInput>(() => ({
    ...emptyContact(),
    code: normalizeContactCode(initialName),
    contactTypeId: "contact-type:customer",
    ledgerId: "ledger:sundry-debitors",
    ledgerName: "Customer",
    legalName: initialName,
    name: initialName,
  }))
  const [error, setError] = useState<string | null>(null)
  const contactTypesQuery = useQuery({ queryKey: ["Sales-contact-types", session.selectedTenant.slug], queryFn: () => listMasterDataRecords(session, "contactTypes") })
  const createMutation = useMutation({
    mutationFn: (input: ContactInput) => upsertContact(session, input),
    onSuccess: (contact) => {
      toast.success("Contact created", { description: contact.name })
      onCreated({
        id: String(contact.uuid ?? contact.id),
        label: [contact.code, contact.name].filter(Boolean).join(" - ") || contact.name,
        code: contact.code,
        billingAddress: contactAddressPreview(contact),
        shippingAddress: contactAddressPreview(contact),
        record: contact as unknown as MasterDataRecord,
      } as SalesLookupOption)
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
    await createMutation.mutateAsync({
      ...draft,
      code: String(draft.code ?? "").trim() || normalizeContactCode(name),
      contactTypeId: stockContactTypeId(contactTypes, "customer"),
      gstin,
      ledgerId: draft.ledgerId ?? "ledger:sundry-debitors",
      ledgerName: draft.ledgerName ?? "Customer",
      legalName: String(draft.legalName ?? "").trim() || name,
      name,
    })
  }

  return (
    <div className="fixed inset-0 z-[160] grid place-items-center bg-background/55 p-4 backdrop-blur-sm">
      <div className="w-[min(860px,calc(100vw-2rem))] overflow-hidden rounded-md border border-border/70 bg-card shadow-xl">
        <div className="flex items-center justify-between border-b border-border/70 px-5 py-4">
          <div>
            <h2 className="text-base font-semibold">Create contact</h2>
            <p className="text-sm text-muted-foreground">Add invoice-ready customer details.</p>
          </div>
          <Button size="icon" variant="ghost" onClick={onClose} type="button"><X className="size-4" /></Button>
        </div>
        <AnimatedTabs
          className="[&>div:first-child]:rounded-none [&>div:first-child]:border-x-0 [&>div:first-child]:border-t-0 [&>div:first-child]:border-b [&>div:first-child]:border-border/70 [&>div:first-child]:bg-card [&>div:first-child]:px-4 [&>div:first-child]:py-0.5 [&>div:first-child]:shadow-none [&>div:last-child]:max-h-[min(62vh,32rem)] [&>div:last-child]:overflow-y-auto [&>div:last-child]:p-5"
          tabs={[
            {
              value: "details",
              label: "Details",
              content: (
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Customer name *" value={String(draft.name ?? "")} onChange={(name) => setDraft((current) => ({ ...current, name, legalName: current.legalName || name }))} />
                  <Field label="Code" value={String(draft.code ?? "")} onChange={(code) => setDraft((current) => ({ ...current, code: normalizeContactCode(code) }))} />
                  <Field label="Legal name" value={String(draft.legalName ?? "")} onChange={(legalName) => setDraft((current) => ({ ...current, legalName }))} />
                  <Field label="GSTIN" value={String(draft.gstin ?? "")} onChange={(gstin) => setDraft((current) => ({ ...current, gstin: gstin.toUpperCase(), gstDetails: gstin.trim() ? [{ gstin: gstin.toUpperCase(), state: "", isDefault: true, isActive: true }] : [] }))} />
                  <Field label="Phone" value={draft.phones[0]?.phoneNumber ?? ""} onChange={(phoneNumber) => setDraft((current) => ({ ...current, primaryPhone: phoneNumber, phones: [{ phoneNumber, phoneType: "mobile", isPrimary: true, isActive: true }] }))} />
                  <Field label="Email" value={draft.emails[0]?.email ?? ""} onChange={(email) => setDraft((current) => ({ ...current, primaryEmail: email, emails: [{ email, emailType: "primary", isPrimary: true, isActive: true }] }))} />
                </div>
              ),
            },
            {
              value: "address",
              label: "Address",
              content: (
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Address line 1" value={draft.addresses[0]?.addressLine1 ?? ""} onChange={(addressLine1) => setDraft((current) => ({ ...current, addresses: [{ ...(current.addresses[0] ?? emptyAddress()), addressLine1, isDefault: true }] }))} />
                  <Field label="Address line 2" value={draft.addresses[0]?.addressLine2 ?? ""} onChange={(addressLine2) => setDraft((current) => ({ ...current, addresses: [{ ...(current.addresses[0] ?? emptyAddress()), addressLine2, isDefault: true }] }))} />
                  <CountryAutocompleteLookup label="Country" session={session} value={draft.addresses[0]?.countryId ?? null} onChange={(countryId) => setDraft((current) => ({ ...current, addresses: [{ ...(current.addresses[0] ?? emptyAddress()), countryId: countryId === null ? null : String(countryId), stateId: null, districtId: null, cityId: null, pincodeId: null, isDefault: true }] }))} />
                  <StateAutocompleteLookup countryId={draft.addresses[0]?.countryId ?? null} label="State" session={session} value={draft.addresses[0]?.stateId ?? null} onChange={(stateId) => setDraft((current) => ({ ...current, addresses: [{ ...(current.addresses[0] ?? emptyAddress()), stateId: stateId === null ? null : String(stateId), districtId: null, cityId: null, pincodeId: null, isDefault: true }] }))} />
                  <DistrictAutocompleteLookup label="District" session={session} stateId={draft.addresses[0]?.stateId ?? null} value={draft.addresses[0]?.districtId ?? null} onChange={(districtId) => setDraft((current) => ({ ...current, addresses: [{ ...(current.addresses[0] ?? emptyAddress()), districtId: districtId === null ? null : String(districtId), cityId: null, pincodeId: null, isDefault: true }] }))} />
                  <CityAutocompleteLookup districtId={draft.addresses[0]?.districtId ?? null} label="City" session={session} value={draft.addresses[0]?.cityId ?? null} onChange={(cityId) => setDraft((current) => ({ ...current, addresses: [{ ...(current.addresses[0] ?? emptyAddress()), cityId: cityId === null ? null : String(cityId), pincodeId: null, isDefault: true }] }))} />
                  <PincodeAutocompleteLookup cityId={draft.addresses[0]?.cityId ?? null} label="Pincode" session={session} value={draft.addresses[0]?.pincodeId ?? null} onChange={(pincodeId) => setDraft((current) => ({ ...current, addresses: [{ ...(current.addresses[0] ?? emptyAddress()), pincodeId: pincodeId === null ? null : String(pincodeId), isDefault: true }] }))} />
                </div>
              ),
            },
          ]}
        />
        {error ? <p className="px-5 pb-3 text-sm font-medium text-destructive">{error}</p> : null}
        <div className="flex flex-wrap items-center gap-3 border-t border-border/70 bg-muted/20 px-5 py-4">
          <Button disabled={createMutation.isPending} onClick={() => void save()} type="button" className="rounded-md"><Save className={cn("size-4", createMutation.isPending && "animate-spin")} />Save contact</Button>
          <Button disabled={createMutation.isPending} onClick={onClose} type="button" variant="outline" className="rounded-md"><X className="size-4" />Cancel</Button>
        </div>
      </div>
    </div>
  )
}

function normalizeContactCode(value: string) {
  return value.trim().toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 40)
}

function generatePreviewIrn() {
  return Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("")
}

function transportRecordToLookupOption(record: MasterDataRecord): SalesLookupOption {
  return {
    id: String(record.uuid ?? record.id),
    label: getCommonRecordName(record),
    code: typeof record.code === "string" ? record.code : undefined,
    record,
  }
}

function transportDraftFromRecord(record: MasterDataRecord): SalesTransportDraft {
  return {
    address: readRecordString(record.address),
    contactNo: readRecordString(record.contact_no),
    contactPerson: readRecordString(record.contact_person),
    gst: readRecordString(record.gst),
    name: getCommonRecordName(record),
    transportId: String(record.uuid ?? record.id),
    vehicleNo: readRecordString(record.vehicle_no),
  }
}

function readRecordString(value: unknown) {
  return typeof value === "string" ? value : value === null || value === undefined ? "" : String(value)
}

function buildContactAddressOptions(contact: SalesLookupOption | null, labels: SalesAddressLabels): SalesLookupOption[] {
  const options: SalesLookupOption[] = []

  contactAddresses(contact).forEach((address, index) => {
    const label = addressText(address, labels)
    if (!label) return
    options.push({
        id: String(address.id ?? `${contact?.id ?? "contact"}-${index}`),
        label,
        record: { id: index + 1, uuid: String(address.id ?? index), is_active: true, created_at: null, updated_at: null, deleted_at: null, name: label, address } as MasterDataRecord & { address: ContactAddress },
    })
  })

  return options
}

function contactAddresses(contact: SalesLookupOption | null): ContactAddress[] {
  const record = contact?.record as unknown as Partial<ContactRecord> | undefined
  return Array.isArray(record?.addresses) ? record.addresses : []
}

function contactLookupToInput(contact: SalesLookupOption): ContactInput {
  const record = contact.record as unknown as Partial<ContactRecord>
  return {
    ...emptyContact(),
    ...record,
    addresses: Array.isArray(record.addresses) ? record.addresses : [],
    bankAccounts: Array.isArray(record.bankAccounts) ? record.bankAccounts : [],
    emails: Array.isArray(record.emails) ? record.emails : [],
    gstDetails: Array.isArray(record.gstDetails) ? record.gstDetails : [],
    phones: Array.isArray(record.phones) ? record.phones : [],
    socialLinks: Array.isArray(record.socialLinks) ? record.socialLinks : [],
  }
}

function contactAddressPreview(contact: { addresses?: Array<{ addressLine1?: string; addressLine2?: string | null }> }) {
  const address = contact.addresses?.find((item) => item.addressLine1) ?? contact.addresses?.[0]
  if (!address) return undefined
  return [address.addressLine1, address.addressLine2].filter(Boolean).join(", ") || undefined
}

function preferredContactAddress(contact: SalesLookupOption) {
  return contactAddresses(contact).find((item) => item.isDefault && item.addressLine1.trim()) ?? contactAddresses(contact).find((item) => item.addressLine1.trim()) ?? contactAddresses(contact)[0]
}

function contactLookupGstin(contact: SalesLookupOption) {
  const record = contact.record as unknown as Partial<ContactRecord>
  return String(record.gstin ?? record.gstDetails?.find((item) => item.isDefault)?.gstin ?? record.gstDetails?.[0]?.gstin ?? "").trim().toUpperCase()
}

function addressText(address: Pick<ContactAddress, "addressLine1" | "addressLine2" | "cityId" | "districtId" | "stateId" | "countryId" | "pincodeId">, labels: SalesAddressLabels) {
  return [
    address.addressLine1,
    address.addressLine2,
    labels.cities(address.cityId),
    labels.districts(address.districtId),
    labels.states(address.stateId),
    labels.countries(address.countryId),
    labels.pincodes(address.pincodeId),
  ].filter(Boolean).join(", ")
}

function buildSalesPrintPartyDetails(entry: SalesEntry, contact: SalesLookupOption | null, savedAddress: string | null | undefined, labels: SalesAddressLabels): SalesPrintPartyDetails {
  const address = contact ? findMatchingContactAddress(contact, savedAddress, labels) : null
  const fallback = parseSavedSalesAddress(savedAddress)
  const contactGstin = contact ? contactLookupGstin(contact) : ""

  if (!address) {
    return {
      addressLine: fallback.addressLine,
      gstin: contactGstin || entry.customer_gstin || "",
      locationLine: fallback.locationLine,
      stateCode: entry.customer_state_code || "",
      stateName: entry.customer_state_name || fallback.stateName,
    }
  }

  return {
    addressLine: [address.addressLine1, address.addressLine2].map((value) => String(value ?? "").trim()).filter(Boolean).join(", "),
    gstin: contactGstin || entry.customer_gstin || "",
    locationLine: [labels.cities(address.cityId), districtPrintLabel(labels.districts(address.districtId)), labels.pincodes(address.pincodeId)].filter(Boolean).join(", "),
    stateCode: labels.stateCodes(address.stateId),
    stateName: labels.states(address.stateId),
  }
}

function findMatchingContactAddress(contact: SalesLookupOption, savedAddress: string | null | undefined, labels: SalesAddressLabels) {
  const addresses = contactAddresses(contact)
  if (addresses.length === 0) return null
  const saved = normalizeAddressMatch(savedAddress)
  return addresses.find((address) => normalizeAddressMatch(addressText(address, labels)) === saved)
    ?? addresses.find((address) => address.isDefault && address.addressLine1.trim())
    ?? addresses.find((address) => address.addressLine1.trim())
    ?? addresses[0]
}

function parseSavedSalesAddress(address: string | null | undefined) {
  const parts = String(address ?? "").split(",").map((part) => part.trim()).filter(Boolean)
  const pincode = parts.findLast((part) => /\b\d{6}\b/.test(part))?.match(/\b\d{6}\b/)?.[0] ?? ""
  const stateName = parts.length > 2 ? parts[parts.length - (pincode ? 3 : 2)] ?? "" : ""
  return {
    addressLine: [parts[0], parts[1]].filter(Boolean).join(", "),
    locationLine: parts.slice(2).filter((part) => part !== stateName && part.toLowerCase() !== "india").join(", "),
    stateName,
  }
}

function normalizeAddressMatch(value: string | null | undefined) {
  return String(value ?? "").replace(/\s+/g, " ").trim().toLowerCase()
}

function districtPrintLabel(value: string) {
  const label = value.trim()
  if (!label || label === "-") return ""
  return /\bdist\.?$/i.test(label) ? label : `${label} -Dist`
}

function useSalesAddressLabels(session: AuthSession): SalesAddressLabels {
  const modules = ["addressTypes", "countries", "states", "districts", "cities", "pincodes"] as const
  const queries = modules.map((moduleKey) => useQuery({ queryKey: ["sales-address-labels", session.selectedTenant.slug, moduleKey], queryFn: () => listMasterDataRecords(session, moduleKey) }))
  const maps = Object.fromEntries(modules.map((moduleKey, index) => [moduleKey, buildSalesLabelMap(queries[index].data ?? [])])) as Record<(typeof modules)[number], Map<string, string>>

  return {
    addressTypes: (value: unknown) => salesLabelFrom(maps.addressTypes, value),
    cities: (value: unknown) => salesLabelFrom(maps.cities, value),
    countries: (value: unknown) => salesLabelFrom(maps.countries, value),
    districts: (value: unknown) => salesLabelFrom(maps.districts, value),
    pincodes: (value: unknown) => salesLabelFrom(maps.pincodes, value),
    states: (value: unknown) => salesLabelFrom(maps.states, value),
    stateCodes: (value: unknown) => salesCodeFrom(queries[2].data ?? [], value),
  }
}

function buildSalesLabelMap(records: MasterDataRecord[]) {
  const map = new Map<string, string>()
  for (const record of records) {
    const label = getCommonRecordName(record)
    for (const key of [record.id, record.uuid, record.name, record.code]) {
      if (key !== null && key !== undefined && key !== "") map.set(String(key), label)
    }
  }
  return map
}

function salesLabelFrom(map: ReadonlyMap<string, string>, value: unknown) {
  if (value === null || value === undefined || value === "") return ""
  return map.get(String(value)) ?? String(value)
}

function salesCodeFrom(records: MasterDataRecord[], value: unknown) {
  if (value === null || value === undefined || value === "") return ""
  const key = String(value)
  const record = records.find((item) => [item.id, item.uuid, item.name, item.code].some((candidate) => candidate !== null && candidate !== undefined && String(candidate) === key))
  return record ? String(record.code ?? "").trim() : ""
}

function Field({ centeredLabel = false, compact = false, decimalScale, label, numeric = false, onChange, type = "text", value }: { centeredLabel?: boolean; compact?: boolean; decimalScale?: number; label: string; numeric?: boolean; onChange(value: string): void; type?: string; value: string }) {
  const [displayValue, setDisplayValue] = useState(formatDecimalDisplay(value, decimalScale))
  const [isFocused, setIsFocused] = useState(false)

  useEffect(() => {
    if (!isFocused) setDisplayValue(formatDecimalDisplay(value, decimalScale))
  }, [decimalScale, isFocused, value])

  if (numeric) {
    return (
      <div className={cn("grid", compact ? "gap-1" : "gap-2")}>
        <Label className={cn("text-sm font-medium text-muted-foreground", centeredLabel && "text-center")}>{label}</Label>
        <Input
          className="h-11 rounded-md text-right"
          inputMode="decimal"
          type="text"
          value={displayValue}
          onBlur={() => {
            setIsFocused(false)
            setDisplayValue(formatDecimalDisplay(String(parseDecimalInput(displayValue)), decimalScale))
          }}
          onChange={(event) => {
            const nextValue = sanitizeDecimalInput(event.target.value)
            setDisplayValue(nextValue)
            onChange(nextValue)
          }}
          onFocus={() => {
            setIsFocused(true)
            setDisplayValue(formatDecimalDisplay(value, decimalScale))
          }}
        />
      </div>
    )
  }

  return (
    <div className={cn("grid", compact ? "gap-1" : "gap-2")}>
      <Label className={cn("text-sm font-medium text-muted-foreground", centeredLabel && "text-center")}>{label}</Label>
      <Input className={cn("h-11 rounded-md", numeric && "text-right")} inputMode={numeric ? "decimal" : undefined} type={type} value={value} onChange={(event) => onChange(event.target.value)} />
    </div>
  )
}

function SignedDecimalInput({ className, decimalScale, onChange, value }: { className?: string; decimalScale?: number; onChange(value: string): void; value: string }) {
  const [displayValue, setDisplayValue] = useState(formatDecimalDisplay(value, decimalScale))
  const [isFocused, setIsFocused] = useState(false)

  useEffect(() => {
    if (!isFocused) setDisplayValue(formatDecimalDisplay(value, decimalScale))
  }, [decimalScale, isFocused, value])

  return (
    <Input
      className={className}
      inputMode="decimal"
      type="text"
      value={displayValue}
      onBlur={() => {
        setIsFocused(false)
        setDisplayValue(formatDecimalDisplay(String(parseMoneyInput(displayValue)), decimalScale))
      }}
      onChange={(event) => {
        const nextValue = sanitizeSignedDecimalInput(event.target.value)
        setDisplayValue(nextValue)
        onChange(nextValue)
      }}
      onFocus={() => {
        setIsFocused(true)
        setDisplayValue(formatDecimalDisplay(value, decimalScale))
      }}
    />
  )
}

function TextField({ label, onChange, value }: { label: string; onChange(value: string): void; value: string }) {
  return <div className="grid gap-2"><Label className="text-sm font-medium text-muted-foreground">{label}</Label><Textarea className="min-h-24 rounded-md" value={value} onChange={(event) => onChange(event.target.value)} /></div>
}

function MasterAutocompleteLookup({
  centeredLabel = false,
  className,
  createLabel,
  inputLabel,
  inputRef,
  label,
  onCreate,
  optionLabel,
  onPick,
  onTextChange,
  options,
  placeholder,
  selectedId,
  selectedLabel,
}: {
  centeredLabel?: boolean
  className?: string
  createLabel?: string
  inputLabel?(option: SalesLookupOption): string
  inputRef?: Ref<HTMLInputElement>
  label: string
  onCreate?(query: string): void
  optionLabel?(option: SalesLookupOption): string
  onPick(option: SalesLookupOption): void
  onTextChange(value: string): void
  options: SalesLookupOption[]
  placeholder: string
  selectedId: string | null
  selectedLabel: string
}) {
  const [activeIndex, setActiveIndex] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState(selectedLabel)
  const getOptionLabel = optionLabel ?? ((option: SalesLookupOption) => option.label)
  const normalizedQuery = query.trim().toLowerCase()
  const filteredOptions = options.filter((option) => getOptionLabel(option).toLowerCase().includes(normalizedQuery) || option.label.toLowerCase().includes(normalizedQuery) || (option.code ?? "").toLowerCase().includes(normalizedQuery))
  const optionCount = filteredOptions.length
  const exactOption = options.find((option) => getOptionLabel(option).toLowerCase() === normalizedQuery || option.label.toLowerCase() === normalizedQuery || (option.code ?? "").toLowerCase() === normalizedQuery)
  const canCreate = Boolean(onCreate && query.trim() && !exactOption)

  useEffect(() => {
    if (!isOpen) setQuery(selectedLabel)
  }, [isOpen, selectedLabel])

  function selectOption(option: SalesLookupOption) {
    setQuery(inputLabel ? inputLabel(option) : option.label)
    onPick(option)
    setIsOpen(false)
  }

  function selectActiveOption() {
    const activeOption = filteredOptions[activeIndex]
    if (activeOption) selectOption(activeOption)
  }

  return (
    <div className={cn("relative z-10 grid w-full gap-2 focus-within:z-[90]", className)}>
      <Label className={cn("text-sm font-medium text-muted-foreground", centeredLabel && "text-center")}>{label}</Label>
      <Input
        ref={inputRef}
        aria-autocomplete="list"
        aria-expanded={isOpen}
        role="combobox"
        className="h-11 w-full rounded-md bg-background"
        placeholder={placeholder}
        value={query}
        onBlur={() => {
          if (exactOption) {
            selectOption(exactOption)
            return
          }
          window.setTimeout(() => {
            setIsOpen(false)
            setQuery(selectedLabel)
          }, 120)
        }}
        onChange={(event) => {
          const value = event.target.value
          setQuery(value)
          setIsOpen(true)
          setActiveIndex(0)
          onTextChange(value)
        }}
        onFocus={() => setIsOpen(true)}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") {
            event.preventDefault()
            setIsOpen(true)
            setActiveIndex((current) => optionCount ? (current + 1) % optionCount : 0)
            return
          }
          if (event.key === "ArrowUp") {
            event.preventDefault()
            setIsOpen(true)
            setActiveIndex((current) => optionCount ? (current - 1 + optionCount) % optionCount : 0)
            return
          }
          if (event.key === "Enter") {
            event.preventDefault()
            if (filteredOptions[activeIndex]) selectActiveOption()
            else if (canCreate) {
              setIsOpen(false)
              onCreate?.(query.trim())
            }
            return
          }
          if (event.key === "Escape") {
            event.preventDefault()
            setIsOpen(false)
            setQuery(selectedLabel)
          }
        }}
      />
      {isOpen && (optionCount > 0 || canCreate) ? (
        <div
          role="listbox"
          className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-[100] max-h-60 overflow-y-auto overscroll-contain rounded-md border border-border bg-card p-1 shadow-2xl ring-1 ring-black/5"
          onMouseDown={(event) => event.preventDefault()}
        >
          {filteredOptions.map((option, index) => {
            const isSelected = selectedId ? option.id === selectedId : option.label === selectedLabel || option.code === selectedLabel
            return (
              <button
                key={`${option.id}-${index}`}
                role="option"
                aria-selected={isSelected}
                type="button"
                className={activeIndex === index ? "flex w-full cursor-pointer items-center justify-between gap-3 rounded-md bg-muted px-3 py-2 text-left text-sm text-foreground" : "flex w-full cursor-pointer items-center justify-between gap-3 rounded-md bg-card px-3 py-2 text-left text-sm text-foreground hover:bg-muted"}
                onMouseDown={(event) => {
                  event.preventDefault()
                  selectOption(option)
                }}
              >
                <span className="min-w-0 truncate">{getOptionLabel(option)}</span>
                {isSelected ? <Check className="size-4 shrink-0 text-emerald-600" strokeWidth={3} /> : <span className="size-4 shrink-0" />}
              </button>
            )
          })}
          {canCreate ? (
            <button
              type="button"
              className="flex w-full cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-medium text-primary hover:bg-muted"
              onMouseDown={(event) => {
                event.preventDefault()
                setIsOpen(false)
                onCreate?.(query.trim())
              }}
            >
              <Plus className="size-4" />
              {createLabel ?? "Create"} "{query.trim()}"
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

function selectedSalesLookupInputLabel(options: SalesLookupOption[], selectedId: string | null, fallback: string) {
  const selected = selectedId ? options.find((option) => option.id === selectedId) : null
  return selected ? salesLookupInputName(selected) : fallback
}

function salesLookupInputName(option: SalesLookupOption) {
  const recordName = typeof option.record.name === "string" ? option.record.name.trim() : ""
  return recordName || option.label
}

function formatParticulars(item: SalesEntryItem) {
  const product = item.product_name.trim() || "-"
  const description = String(item.description ?? "").trim()
  return description ? `${product} - ${description}` : product
}

const SALES_TAX_TYPE_OPTIONS: SalesLookupOption[] = [
  { id: "cgst-sgst", label: "CGST-SGST", code: "CGST-SGST", record: lookupRecord("cgst-sgst", "CGST-SGST") },
  { id: "igst", label: "IGST", code: "IGST", record: lookupRecord("igst", "IGST") },
]

function SalesTypeField({ onChange, value }: { onChange(value: string): void; value: string }) {
  const selectedLabel = SALES_TAX_TYPE_OPTIONS.find((option) => option.id === value)?.label ?? ""

  return (
    <MasterAutocompleteLookup
      label="Sales tax type"
      options={SALES_TAX_TYPE_OPTIONS}
      placeholder=""
      selectedId={value}
      selectedLabel={selectedLabel}
      onPick={(option) => onChange(option.id)}
      onTextChange={() => undefined}
    />
  )
}

function lookupRecord(id: string, name: string): MasterDataRecord {
  return {
    id: 0,
    uuid: id,
    is_active: true,
    created_at: null,
    updated_at: null,
    deleted_at: null,
    name,
  }
}

function StatusField({ onChange, value }: { onChange(value: string): void; value: string }) {
  return (
    <div className="grid gap-2">
      <Label className="text-sm font-medium text-muted-foreground">Status</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-11 min-h-11 w-full rounded-xl border-input bg-background px-3 text-left font-normal leading-none">
          <SelectValue />
        </SelectTrigger>
        <SelectContent align="start" position="popper" sideOffset={4} className="z-[130] w-[var(--radix-select-trigger-width)] rounded-xl p-1">
          <SelectItem className="h-8 rounded-lg px-2 pr-8" value="draft">Draft</SelectItem>
          <SelectItem className="h-8 rounded-lg px-2 pr-8" value="posted">Posted</SelectItem>
          <SelectItem className="h-8 rounded-lg px-2 pr-8" value="cancelled">Cancelled</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}

function ItemHeader({ children, className }: { children: ReactNode; className?: string }) {
  return <th className={cn("border-b border-r border-border/70 px-1 py-1.5 text-center align-middle font-medium leading-tight last:border-r-0", className)}>{children}</th>
}

function ItemCell({ align = "left", children }: { align?: "center" | "left" | "right"; children: ReactNode }) {
  return <td className={cn("break-words border-r border-border/70 px-1.5 py-1.5 align-middle", align === "center" && "text-center", align === "right" && "text-right")}>{children}</td>
}

function SummaryRow({ label, strong = false, value }: { label: string; strong?: boolean; value: string }) {
  return (
    <div className={strong ? "grid grid-cols-[1fr_auto_8rem] gap-4 font-semibold" : "grid grid-cols-[1fr_auto_8rem] gap-4"}>
      <span className="text-muted-foreground">{label}</span>
      <span>:</span>
      <span className="text-right">{value}</span>
    </div>
  )
}

interface DraftTotals {
  taxableAmount: number
  gstTotal: number
  roundOff: number
  grandTotal: number
}

function buildSalesSaveInput(input: SalesEntryInput): SalesEntryInput {
  const items = input.items.map((item, index) => normalizeSalesItem(item, index, input.place_of_supply))
  const totals = calculateDraftTotals(items, input.round_off, input.place_of_supply)
  const subtotal = roundMoney(items.reduce((total, item) => total + roundMoney(Number(item.quantity || 0) * Number(item.rate || 0)), 0))
  const discountTotal = roundMoney(items.reduce((total, item) => total + Number(item.discount_amount || 0), 0))

  return {
    ...input,
    balance_amount: roundMoney(totals.grandTotal - Number(input.paid_amount || 0)),
    discount_total: discountTotal,
    grand_total: totals.grandTotal,
    items,
    round_off: totals.roundOff,
    subtotal,
    tax_total: totals.gstTotal,
    taxable_total: totals.taxableAmount,
  }
}

function normalizeSalesItem(item: SalesEntryItem, index: number, placeOfSupply: unknown): SalesEntryItem {
  const amounts = salesItemAmounts(item, (placeOfSupply ?? "cgst-sgst") !== "igst")
  return {
    ...item,
    colour: item.colour ?? "",
    description: item.description ?? "",
    dc_no: item.dc_no ?? "",
    discount_amount: Number(item.discount_amount || 0),
    hsn_code: item.hsn_code ?? "",
    line_total: amounts.total,
    po_no: item.po_no ?? "",
    product_name: item.product_name.trim(),
    quantity: Number(item.quantity || 0),
    rate: Number(item.rate || 0),
    size: item.size ?? "",
    sort_order: item.sort_order ?? index,
    tax_amount: amounts.taxAmount,
    tax_rate: Number(item.tax_rate || 0),
    unit: item.unit ?? "",
  }
}

function salesItemTaxBreakup(item: SalesEntryItem, isCgstSgst: boolean) {
  const amounts = salesItemAmounts(item, isCgstSgst)
  const halfTax = isCgstSgst ? roundMoney(amounts.taxAmount / 2) : 0
  return {
    cgstAmount: isCgstSgst ? halfTax : 0,
    igstAmount: isCgstSgst ? 0 : amounts.taxAmount,
    sgstAmount: isCgstSgst ? halfTax : 0,
    taxable: amounts.taxable,
    taxAmount: amounts.taxAmount,
    total: amounts.total,
  }
}

function calculateDraftTotals(items: SalesEntryItem[], roundOffValue: unknown, placeOfSupply: unknown): DraftTotals {
  const isCgstSgst = (placeOfSupply ?? "cgst-sgst") !== "igst"
  const taxableAmount = roundMoney(items.reduce((total, item) => total + salesItemAmounts(item, isCgstSgst).taxable, 0))
  const gstTotal = roundMoney(items.reduce((total, item) => total + salesItemAmounts(item, isCgstSgst).taxAmount, 0))
  const beforeRoundOff = taxableAmount + gstTotal
  const roundOff = roundOffValue === null || roundOffValue === undefined || roundOffValue === "" ? roundMoney(Math.round(beforeRoundOff) - beforeRoundOff) : roundMoney(Number(roundOffValue || 0))
  const grandTotal = roundMoney(beforeRoundOff + roundOff)
  return {
    taxableAmount,
    gstTotal,
    roundOff,
    grandTotal,
  }
}

function salesItemAmounts(item: SalesEntryItem, isCgstSgst: boolean) {
  const taxable = roundMoney(Math.max(0, Number(item.quantity || 0) * Number(item.rate || 0) - Number(item.discount_amount || 0)))
  const rawTax = taxable * Number(item.tax_rate || 0) / 100
  const taxAmount = isCgstSgst ? roundMoney(roundMoney(rawTax / 2) * 2) : roundMoney(rawTax)
  return { taxable, taxAmount, total: roundMoney(taxable + taxAmount) }
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100
}

function parseMoneyInput(value: string) {
  const normalized = value.replace(/[^0-9.-]/g, "")
  if (normalized === "" || normalized === "-" || normalized === "." || normalized === "-.") return 0
  return Number(normalized)
}

function sanitizeDecimalInput(value: string) {
  const sanitized = value.replace(/[^0-9.]/g, "")
  const [integerPart = "", ...decimalParts] = sanitized.split(".")
  return decimalParts.length ? `${integerPart}.${decimalParts.join("")}` : integerPart
}

function sanitizeSignedDecimalInput(value: string) {
  const negative = value.trim().startsWith("-")
  const sanitized = value.replace(/[^0-9.]/g, "")
  const [integerPart = "", ...decimalParts] = sanitized.split(".")
  const normalized = decimalParts.length ? `${integerPart}.${decimalParts.join("")}` : integerPart
  return `${negative ? "-" : ""}${normalized}`
}

function parseDecimalInput(value: string) {
  const normalized = sanitizeDecimalInput(value)
  if (normalized === "" || normalized === ".") return 0
  return Number(normalized)
}

function formatDecimalDisplay(value: string, decimalScale?: number) {
  if (decimalScale === undefined) return value
  const numberValue = Number(value || 0)
  return Number.isFinite(numberValue) ? numberValue.toFixed(decimalScale) : (0).toFixed(decimalScale)
}

function SideNote({ body, meta, title }: { body: string; meta: string; title: string }) {
  return (
    <div className="grid gap-3 rounded-md border border-border/70 bg-muted/20 p-3 text-sm sm:grid-cols-[minmax(0,1fr)_220px]">
      <p className="min-w-0 whitespace-pre-wrap break-words text-foreground">{body}</p>
      <div className="text-left sm:text-right">
        <p className="font-semibold text-foreground">{title}</p>
        <p className="mt-1 text-xs text-muted-foreground">{meta}</p>
      </div>
    </div>
  )
}

function StatusBadge({ entry }: { entry: SalesEntry }) {
  const active = isActive(entry)
  return (
    <Badge variant="outline" className={cn("h-6 gap-1 rounded-md px-2 text-[11px]", active ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-700")}>
      {active ? <CheckCircle2 className="size-3" /> : <RotateCcw className="size-3" />}
      {active ? entry.status : "suspended"}
    </Badge>
  )
}

function ListHeader({ children, className }: { children: ReactNode; className?: string }) {
  return <th className={cn("border-b border-border/70 px-4 py-3.5 text-left font-medium text-foreground", className)}>{children}</th>
}

function searchSales(entries: SalesEntry[], searchValue: string) {
  const term = searchValue.trim().toLowerCase()
  if (!term) return entries
  return entries.filter((entry) => [entry.invoice_no, entry.uuid, entry.customer_name, entry.invoice_date, entry.reference_no, entry.status, entry.payment_status, String(entry.grand_total)].some((value) => String(value ?? "").toLowerCase().includes(term)))
}

function filterSales(entries: SalesEntry[], statusFilter: string) {
  if (statusFilter === "all") return entries
  return entries.filter((entry) => entry.status === statusFilter)
}

function isActive(entry: SalesEntry) {
  return entry.is_active === true || entry.is_active === 1
}

function formatDate(value?: string | null) {
  if (!value) return "Not set"
  return new Intl.DateTimeFormat(undefined, { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value))
}

function formatDateTimeWithZone(value?: string | null) {
  if (!value) return "Not set"
  return new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    hour12: true,
    minute: "2-digit",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value))
}

function formatMoney(value: number) {
  return new Intl.NumberFormat(undefined, { currency: "INR", maximumFractionDigits: 2, style: "currency" }).format(Number(value ?? 0))
}
