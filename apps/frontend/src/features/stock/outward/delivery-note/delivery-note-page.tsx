import { useEffect, useMemo, useRef, useState, type Dispatch, type ReactNode, type Ref, type SetStateAction } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { ArrowLeft, Check, ChevronLeft, ChevronRight, Mail, MessageCircle, Paperclip, Pencil, Plus, Printer, RefreshCw, RotateCcw, Save, Send, Settings2, Tag, Trash2, UserRound, X } from "lucide-react"
import { Button } from "src/components/ui/button"
import { AnimatedTabs } from "src/components/ui/animated-tabs"
import type { AnimatedTab } from "src/components/ui/animated-tabs"
import { Input } from "src/components/ui/input"
import { Label } from "src/components/ui/label"
import { Textarea } from "src/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "src/components/ui/card"
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
import { ProductAutocomplete, productRecordCommonValue, productRecordId, productRecordName } from "src/features/master-data/interface/components/product-autocomplete"
import { WorkOrderAutocomplete } from "src/features/master-data/interface/components/work-order-autocomplete"
import { listMasterDataRecords } from "src/features/master-data/infrastructure/master-data-client"
import { isSoftwareSettingEnabled } from "src/features/settings/software-settings"
import type { SoftwareSettingsState } from "src/features/settings/software-settings"
import { nextDocumentNumberSetting } from "src/features/settings/document-settings-client"
import { useCompanySoftwareSettings } from "src/features/settings/use-company-software-settings"
import { stockContactTypeId } from "src/features/stock/contact-role-filter"
import {
  addDeliveryNoteComment,
  destroyDeliveryNoteEntry,
  emptyDeliveryNoteEntry,
  emptyDeliveryNoteItem,
  listDeliveryNoteContactLookups,
  listDeliveryNoteCommonLookups,
  listDeliveryNoteEntries,
  restoreDeliveryNoteEntry,
  runDeliveryNoteTool,
  upsertDeliveryNoteEntry,
  type DeliveryNoteLookupOption,
  type DeliveryNoteEntry,
  type DeliveryNoteEntryInput,
  type DeliveryNoteEntryItem,
} from "./delivery-note-client"
import { DeliveryNoteEntryDocument, type DeliveryNotePrintCopy, type DeliveryNotePrintPartyDetails } from "./delivery-note-print-page"

type DeliveryNoteView = { mode: "list" } | { mode: "show"; entry: DeliveryNoteEntry } | { mode: "upsert"; entry: DeliveryNoteEntry | null }
type DeliveryNoteColumnId = "entry" | "date" | "supplier" | "updated"
type DeliveryNoteEntryToolId = "email" | "assign" | "attachments" | "tags" | "whatsapp"
type DeliveryNoteAddressLabels = {
  addressTypes(value: unknown): string
  cities(value: unknown): string
  countries(value: unknown): string
  districts(value: unknown): string
  pincodes(value: unknown): string
  states(value: unknown): string
  stateCodes(value: unknown): string
}

const purchasePrintCopyOptions: readonly { label: string; value: DeliveryNotePrintCopy }[] = [
  { label: "Original", value: "original" },
  { label: "Duplicate", value: "duplicate" },
  { label: "Office Copy", value: "triplicate" },
]
const defaultDeliveryNoteColumnVisibility: Record<DeliveryNoteColumnId, boolean> = {
  supplier: true,
  date: true,
  entry: true,
  updated: false,
}
const purchaseColumnCatalog: Array<{ id: DeliveryNoteColumnId; label: string }> = [
  { id: "entry", label: "Entry" },
  { id: "date", label: "Date" },
  { id: "supplier", label: "Customer" },
  { id: "updated", label: "Updated" },
]

export function DeliveryNotePage({ session }: { session: AuthSession }) {
  const queryClient = useQueryClient()
  const [view, setView] = useState<DeliveryNoteView>({ mode: "list" })
  const [searchValue, setSearchValue] = useState("")
  const [visibleColumns, setVisibleColumns] = useState(defaultDeliveryNoteColumnVisibility)
  const [currentPage, setCurrentPage] = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState(20)
  const queryKey = ["delivery-note-entries", session.selectedTenant.slug]
  const entriesQuery = useQuery({ queryKey, queryFn: () => listDeliveryNoteEntries(session) })
  const upsertMutation = useMutation({ mutationFn: (input: DeliveryNoteEntryInput) => upsertDeliveryNoteEntry(session, input) })
  const destroyMutation = useMutation({ mutationFn: (entry: DeliveryNoteEntry) => destroyDeliveryNoteEntry(session, entry) })
  const restoreMutation = useMutation({ mutationFn: (entry: DeliveryNoteEntry) => restoreDeliveryNoteEntry(session, entry) })
  const commentMutation = useMutation({ mutationFn: ({ entry, body }: { entry: DeliveryNoteEntry; body: string }) => addDeliveryNoteComment(session, entry, body) })
  const toolMutation = useMutation({ mutationFn: ({ entry, tool }: { entry: DeliveryNoteEntry; tool: string }) => runDeliveryNoteTool(session, entry, tool) })
  const entries = entriesQuery.data ?? []
  const filteredEntries = useMemo(() => searchDeliveryNote(entries, searchValue).sort((left, right) => String(left.entry_no).localeCompare(String(right.entry_no))), [entries, searchValue])
  const totalPages = Math.max(1, Math.ceil(filteredEntries.length / rowsPerPage))
  const pageEntries = filteredEntries.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage)

  useEffect(() => {
    if (entriesQuery.error) toast.error("Delivery note load failed", { description: entriesQuery.error instanceof Error ? entriesQuery.error.message : "Unable to load Delivery note entries." })
  }, [entriesQuery.error])

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey })
  }

  async function save(input: DeliveryNoteEntryInput, printAfterSave = false) {
    const entry = await upsertMutation.mutateAsync(input)
    toast.success(input.uuid ? "Delivery note entry updated" : "Delivery note entry created", { description: entry.entry_no })
    await refresh()
    setView({ mode: "show", entry })
    if (printAfterSave) window.setTimeout(() => window.print(), 300)
  }

  async function destroy(entry: DeliveryNoteEntry) {
    await destroyMutation.mutateAsync(entry)
    toast.error("Delivery note entry suspended", { description: entry.entry_no })
    await refresh()
  }

  async function restore(entry: DeliveryNoteEntry) {
    await restoreMutation.mutateAsync(entry)
    toast.success("Delivery note entry restored", { description: entry.entry_no })
    await refresh()
  }

  if (view.mode === "upsert") {
    return <DeliveryNoteUpsertPage entry={view.entry} isSaving={upsertMutation.isPending} session={session} onBack={() => setView(view.entry ? { mode: "show", entry: view.entry } : { mode: "list" })} onSubmit={save} />
  }

  if (view.mode === "show") {
    const entry = entries.find((entry) => entry.uuid === view.entry.uuid) ?? view.entry
    return (
      <DeliveryNoteShowPage
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
          toast.success(`${tool} queued`, { description: "The activity was recorded for this Delivery note entry." })
          await refresh()
          setView({ mode: "show", entry: updated })
        }}
      />
    )
  }

  return (
    <MasterListPageFrame
      title="Delivery Note"
      description="Create and review delivery note entries."
      technicalName="page.entries.purchase.list"
      action={
        <div className="flex items-center gap-2">
          <Button disabled={entriesQuery.isFetching} onClick={() => void entriesQuery.refetch()} type="button" variant="outline" className="h-9 rounded-md"><RefreshCw className={cn("size-4", entriesQuery.isFetching && "animate-spin")} />Refresh</Button>
          <Button onClick={() => setView({ mode: "upsert", entry: null })} type="button" className="h-9 rounded-md"><Plus className="size-4" />New</Button>
        </div>
      }
    >
      <MasterListToolbarCard
        columns={purchaseColumnCatalog.map((column) => ({
          id: column.id,
          label: column.label,
          checked: visibleColumns[column.id],
          disabled: column.id === "entry",
          onCheckedChange: (checked) => setVisibleColumns((current) => ({ ...current, [column.id]: checked })),
        }))}
        onShowAllColumns={() => setVisibleColumns(defaultDeliveryNoteColumnVisibility)}
        searchPlaceholder="Search entry, customer, date, or work order"
        searchValue={searchValue}
        onSearchValueChange={(value) => {
          setSearchValue(value)
          setCurrentPage(1)
        }}
      />
      <MasterListTableCard>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-sm">
            <thead className="bg-muted/50">
              <tr>
                {visibleColumns.entry ? <ListHeader>Entry</ListHeader> : null}
                {visibleColumns.date ? <ListHeader>Date</ListHeader> : null}
                {visibleColumns.supplier ? <ListHeader>Customer</ListHeader> : null}
                {visibleColumns.updated ? <ListHeader>Updated</ListHeader> : null}
                <ListHeader className="text-right">Action</ListHeader>
              </tr>
            </thead>
            <tbody>
              {pageEntries.map((entry) => (
                <tr key={entry.uuid} className={cn("border-b border-border/70", !isActive(entry) && "bg-muted/20 text-muted-foreground")}>
                  {visibleColumns.entry ? <td className="px-4 py-2">
                    <button className="font-semibold hover:underline" onClick={() => setView({ mode: "show", entry })} type="button">{entry.entry_no}</button>
                    <div className="font-mono text-xs text-muted-foreground">{entry.uuid}</div>
                  </td> : null}
                  {visibleColumns.date ? <td className="px-4 py-2">{formatDate(entry.entry_date)}</td> : null}
                  {visibleColumns.supplier ? <td className="px-4 py-2">{entry.supplier_name}</td> : null}
                  {visibleColumns.updated ? <td className="px-4 py-2 text-muted-foreground">{formatDate(entry.updated_at)}</td> : null}
                  <td className="px-4 py-1.5 text-right">
                    <MasterListRowActions
                      title={entry.entry_no}
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
        {pageEntries.length === 0 ? <MasterListEmptyState>{entriesQuery.isFetching ? "Loading purchase entries." : "No purchase entries found."}</MasterListEmptyState> : null}
      </MasterListTableCard>
      <MasterListPaginationCard
        page={currentPage}
        rowsPerPage={rowsPerPage}
        showingLabel={buildMasterListShowingLabel({ page: currentPage, pageSize: rowsPerPage, totalCount: filteredEntries.length })}
        singularLabel="Delivery Note"
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

function DeliveryNoteShowPage({ entry, isWorking, onBack, onComment, onDestroy, onEdit, onRestore, onTool, session }: {
  entry: DeliveryNoteEntry
  isWorking: boolean
  onBack(): void
  onComment(entry: DeliveryNoteEntry, body: string): Promise<void>
  onDestroy(): void
  onEdit(): void
  onRestore(): void
  onTool(entry: DeliveryNoteEntry, tool: string): Promise<void>
  session: AuthSession
}) {
  const [comment, setComment] = useState("")
  const [printCopies, setPrintCopies] = useState<readonly DeliveryNotePrintCopy[]>(["original"])
  const [openTool, setOpenTool] = useState<DeliveryNoteEntryToolId | null>(null)
  const [emailAddress, setEmailAddress] = useState("")
  const [whatsappNumber, setWhatsappNumber] = useState("")
  const [assigneeInput, setAssigneeInput] = useState("")
  const [tagInput, setTagInput] = useState("")
  const [assignees, setAssignees] = useState<string[]>([])
  const [attachments, setAttachments] = useState<string[]>([])
  const [tags, setTags] = useState<string[]>([])
  const [toolActivities, setToolActivities] = useState<Array<{ id: string; message: string; created_at: string }>>([])
  const [softwareSettings] = useCompanySoftwareSettings(session)
  const addressLabels = useDeliveryNoteAddressLabels(session)
  const companyQuery = useQuery({ queryKey: ["DeliveryNote-print-company", session.selectedTenant.slug], queryFn: () => listCompanies(session) })
  const contactsQuery = useQuery({ queryKey: ["DeliveryNote-print-contacts", session.selectedTenant.slug], queryFn: () => listDeliveryNoteContactLookups(session) })
  const printCompany = (companyQuery.data ?? []).find((company) => company.isPrimary) ?? companyQuery.data?.[0] ?? null
  const selectedContact = (contactsQuery.data ?? []).find((contact) => contact.id === entry.supplier_id) ?? null
  const billingParty = buildDeliveryNotePrintPartyDetails(entry, selectedContact, entry.billing_address, addressLabels)
  const shippingParty = buildDeliveryNotePrintPartyDetails(entry, selectedContact, entry.shipping_address ?? entry.billing_address, addressLabels)
  const selectedPrintCopies = purchasePrintCopyOptions.map((option) => option.value).filter((copy) => printCopies.includes(copy))
  const customTerms = softwareSettings.salesPrintingOptions.customTerms
  const printItemSettings = {
    showColour: isSoftwareSettingEnabled(softwareSettings, "sales-use-colour"),
    showDc: isSoftwareSettingEnabled(softwareSettings, "sales-use-dc"),
    showPo: isSoftwareSettingEnabled(softwareSettings, "sales-use-po"),
    showSize: isSoftwareSettingEnabled(softwareSettings, "sales-use-size"),
  }

  function togglePrintCopy(copy: DeliveryNotePrintCopy) {
    setPrintCopies((currentCopies) => {
      if (!currentCopies.includes(copy)) return [...currentCopies, copy]
      if (currentCopies.length === 1) return currentCopies
      return currentCopies.filter((currentCopy) => currentCopy !== copy)
    })
  }

  function toggleEntryTool(tool: DeliveryNoteEntryToolId) {
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

  const entryTools: Array<{ icon: typeof Mail; id: DeliveryNoteEntryToolId; label: string }> = [
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
          <h1 className="text-3xl font-semibold tracking-normal text-foreground">{entry.supplier_name}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{entry.entry_no}</p>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" className="h-9 rounded-xl" onClick={onBack}><ArrowLeft className="size-4" />Back</Button>
            <Button type="button" variant="outline" className="h-9 rounded-xl" disabled><ChevronLeft className="size-4" />Prev</Button>
            <Button type="button" variant="outline" className="h-9 rounded-xl" disabled><ChevronRight className="size-4" />Next</Button>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <div className="flex min-h-9 flex-wrap items-center gap-1 rounded-xl border border-border bg-card px-2 py-1 text-sm shadow-sm">
              {purchasePrintCopyOptions.map((option) => (
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
              <DeliveryNoteEntryDocument addressLabels={addressLabels} billingParty={billingParty} company={printCompany} copy={copy} customTerms={customTerms} record={entry} shippingParty={shippingParty} {...printItemSettings} />
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
                            recordToolActivity(`Sent entry email to ${email}`)
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
                            addListValue(assigneeInput, setAssigneeInput, setAssignees, (value) => `Assigned ${entry.entry_no} to ${value}`)
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

function DeliveryNoteUpsertPage({ entry, isSaving, session, onBack, onSubmit }: {
  entry: DeliveryNoteEntry | null
  isSaving: boolean
  session: AuthSession
  onBack(): void
  onSubmit(input: DeliveryNoteEntryInput, printAfterSave?: boolean): Promise<void>
}) {
  const [draft, setDraft] = useState<DeliveryNoteEntryInput>(() => entry ? { ...entry, items: entry.items.map((item) => ({ ...item })) } : emptyDeliveryNoteEntry())
  const [contactCreateInitialName, setContactCreateInitialName] = useState<string | null>(null)
  const contactsQuery = useQuery({ queryKey: ["DeliveryNote-lookups", session.selectedTenant.slug, "contacts"], queryFn: () => listDeliveryNoteContactLookups(session) })
  const hsnCodesQuery = useQuery({ queryKey: ["DeliveryNote-lookups", session.selectedTenant.slug, "hsnCodes"], queryFn: () => listDeliveryNoteCommonLookups(session, "hsnCodes") })
  const unitsQuery = useQuery({ queryKey: ["DeliveryNote-lookups", session.selectedTenant.slug, "units"], queryFn: () => listDeliveryNoteCommonLookups(session, "units") })
  const nextEntryQuery = useQuery({
    enabled: !entry,
    queryKey: ["document-number-next-preview", session.selectedTenant.slug, "purchase"],
    queryFn: () => nextDocumentNumberSetting(session, "deliveryNote"),
  })
  const [softwareSettings] = useCompanySoftwareSettings(session)

  useEffect(() => {
    if (entry || draft.entry_no || !nextEntryQuery.data?.preview) return
    setDraft((current) => current.entry_no ? current : { ...current, entry_no: nextEntryQuery.data.preview })
  }, [draft.entry_no, entry, nextEntryQuery.data?.preview])

  return (
    <MasterListPageFrame
      title={entry ? `Edit ${entry.entry_no}` : "New Delivery Note"}
      description="Create or update a tenant-isolated delivery note."
      technicalName="page.entries.purchase.upsert"
      action={<Button type="button" variant="outline" onClick={onBack} className="rounded-md"><X className="size-4" />Cancel</Button>}
    >
      <MasterListUpsertLayout>
        <MasterListUpsertCard className="overflow-hidden p-0 [&>div]:p-0">
          <form className="space-y-6" onSubmit={(event) => { event.preventDefault(); void onSubmit(draft) }}>
            <div className="px-0 pb-4 pt-3 md:pb-5">
              <DeliveryNoteVoucherTabs
                contacts={contactsQuery.data ?? []}
                onContactsRefresh={() => void contactsQuery.refetch()}
                onCreateContact={setContactCreateInitialName}
                form={draft}
                hsnCodes={hsnCodesQuery.data ?? []}
                session={session}
                setForm={setDraft}
                softwareSettings={softwareSettings}
                units={unitsQuery.data ?? []}
              />
            </div>
            <div className="flex flex-wrap items-center gap-3 border-t border-border/70 bg-muted/20 px-4 py-4 md:px-6">
              <Button type="submit" disabled={isSaving} className="rounded-md"><Save className={cn("size-4", isSaving && "animate-spin")} />Save</Button>
              <Button type="button" disabled={isSaving} variant="secondary" onClick={() => void onSubmit(draft, true)} className="rounded-md"><Printer className="size-4" />Save & Print</Button>
              <Button type="button" variant="outline" onClick={onBack} className="rounded-md"><X className="size-4" />Cancel</Button>
            </div>
          </form>
        </MasterListUpsertCard>
      </MasterListUpsertLayout>
      {contactCreateInitialName !== null ? (
        <DeliveryNoteContactCreateDialog
          contacts={contactsQuery.data ?? []}
          initialName={contactCreateInitialName}
          isSaving={isSaving}
          session={session}
          onClose={() => setContactCreateInitialName(null)}
          onCreated={(contact) => {
            setDraft((current) => ({
              ...current,
              billing_address: contact.billingAddress ?? current.billing_address,
              supplier_id: contact.id,
              supplier_name: DeliveryNoteLookupInputName(contact),
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

function DeliveryNoteVoucherTabs({ contacts, form, hsnCodes, onContactsRefresh, onCreateContact, session, setForm, softwareSettings, units }: {
  contacts: DeliveryNoteLookupOption[]
  form: DeliveryNoteEntryInput
  hsnCodes: DeliveryNoteLookupOption[]
  onContactsRefresh(): void
  onCreateContact(name: string): void
  session: AuthSession
  setForm(updater: (current: DeliveryNoteEntryInput) => DeliveryNoteEntryInput): void
  softwareSettings: SoftwareSettingsState
  units: DeliveryNoteLookupOption[]
}) {
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null)
  const [itemDraft, setItemDraft] = useState<DeliveryNoteEntryItem>(() => emptyDeliveryNoteItem())
  const addressLabels = useDeliveryNoteAddressLabels(session)

  function addItem() {
    if (!itemDraft.product_name.trim()) return
    setForm((current) => {
      const normalizedItem = normalizeDeliveryNoteItem(itemDraft, editingItemIndex ?? current.items.length)
      if (editingItemIndex === null) return { ...current, items: [...current.items, normalizedItem] }
      return {
        ...current,
        items: current.items.map((item, index) => index === editingItemIndex ? normalizedItem : item),
      }
    })
    setItemDraft(emptyDeliveryNoteItem())
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
      setItemDraft(emptyDeliveryNoteItem())
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
        <DeliveryNoteDetailsTab
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
          units={units}
        />
      ),
    },
    {
      value: "address",
      label: "Address",
      content: <DeliveryNoteAddressTab addressLabels={addressLabels} contacts={contacts} form={form} onContactsRefresh={onContactsRefresh} session={session} setForm={setForm} />,
    },
    {
      value: "terms",
      label: "Notes",
      content: <DeliveryNoteTermsTab form={form} setForm={setForm} />,
    },
  ]

  return (
    <AnimatedTabs
      className="[&>div:first-child]:rounded-none [&>div:first-child]:border-x-0 [&>div:first-child]:border-t-0 [&>div:first-child]:border-b [&>div:first-child]:border-border/70 [&>div:first-child]:bg-card [&>div:first-child]:px-4 [&>div:first-child]:py-0.5 [&>div:first-child]:shadow-none md:[&>div:first-child]:px-6 [&>div:first-child_button]:min-h-8 [&>div:first-child_button]:py-1 [&>div:last-child]:mx-auto [&>div:last-child]:mt-3 [&>div:last-child]:w-full [&>div:last-child]:px-4 [&>div:last-child]:pb-3 md:[&>div:last-child]:px-6 md:[&>div:last-child]:pb-4"
      tabs={tabs}
    />
  )
}

function DeliveryNoteDetailsTab({ addItem, addressLabels, contacts, deleteItem, editItem, editingItemIndex, form, hsnCodes, itemDraft, onCreateContact, session, setEditingItemIndex, setForm, setItemDraft, softwareSettings, units }: {
  addItem(): void
  addressLabels: DeliveryNoteAddressLabels
  contacts: DeliveryNoteLookupOption[]
  deleteItem(index: number): void
  editItem(index: number): void
  editingItemIndex: number | null
  form: DeliveryNoteEntryInput
  hsnCodes: DeliveryNoteLookupOption[]
  itemDraft: DeliveryNoteEntryItem
  onCreateContact(name: string): void
  session: AuthSession
  setEditingItemIndex(value: number | null): void
  setForm(updater: (current: DeliveryNoteEntryInput) => DeliveryNoteEntryInput): void
  setItemDraft(value: DeliveryNoteEntryItem | ((current: DeliveryNoteEntryItem) => DeliveryNoteEntryItem)): void
  softwareSettings: SoftwareSettingsState
  units: DeliveryNoteLookupOption[]
}) {
  const productInputRef = useRef<HTMLInputElement | null>(null)
  const usePo = isSoftwareSettingEnabled(softwareSettings, "sales-use-po")
  const useDc = isSoftwareSettingEnabled(softwareSettings, "sales-use-dc")
  const useColour = isSoftwareSettingEnabled(softwareSettings, "sales-use-colour")
  const useSize = isSoftwareSettingEnabled(softwareSettings, "sales-use-size")
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
    setItemDraft(() => emptyDeliveryNoteItem())
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
            label="Customer name"
            options={contacts}
            placeholder=""
            createLabel="Create contact"
            selectedId={form.supplier_id ?? null}
            selectedLabel={selectedDeliveryNoteLookupInputLabel(contacts, form.supplier_id ?? null, form.supplier_name ?? "")}
            inputLabel={DeliveryNoteLookupInputName}
            optionLabel={DeliveryNoteLookupInputName}
            onCreate={onCreateContact}
            onPick={(option) => {
              const address = preferredContactAddress(option)
              const addressLine = address ? addressText(address, addressLabels) : undefined
              setForm((current) => ({
                ...current,
                billing_address: addressLine ?? option.billingAddress ?? current.billing_address,
                supplier_gstin: contactLookupGstin(option),
                supplier_id: option.id,
                supplier_name: DeliveryNoteLookupInputName(option),
                supplier_state_code: address ? addressLabels.stateCodes(address.stateId) : "",
                supplier_state_name: address ? addressLabels.states(address.stateId) : "",
                shipping_address: addressLine ?? option.shippingAddress ?? option.billingAddress ?? current.shipping_address,
              }))
            }}
            onTextChange={(value) => setForm((current) => ({ ...current, supplier_gstin: "", supplier_id: null, supplier_name: value, supplier_state_code: "", supplier_state_name: "" }))}
          />
          <WorkOrderAutocomplete session={session} value={form.reference_no ?? ""} onChange={(value) => setForm((current) => ({ ...current, reference_no: value }))} />
        </div>
        <div className="space-y-5">
          <Field label="Delivery no" value={form.entry_no ?? ""} onChange={(value) => setForm((current) => ({ ...current, entry_no: value }))} />
          <Field label="Delivery date" type="date" value={String(form.entry_date ?? "")} onChange={(value) => setForm((current) => ({ ...current, entry_date: value }))} />
        </div>
      </div>
      <section className="space-y-5">
        <h2 className="text-lg font-semibold text-primary underline underline-offset-4">Delivery Note Items</h2>
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
              tax_rate: 0,
              unit: productRecordCommonValue(record, "unit_id", units),
            }) : { ...current, product_id: null, product_name: value })}
          />
          <Field compact centeredLabel label="Description" value={itemDraft.description ?? ""} onChange={(value) => setItemDraft((current) => ({ ...current, description: value }))} />
          {isGarmentLayout ? <CommonRecordAutocompleteLookup label="Colour" className="gap-1" labelClassName="text-center" moduleKey="colours" placeholder="Search colour" session={session} value={itemDraft.colour ?? ""} onChange={(value, record) => setItemDraft((current) => ({ ...current, colour: record ? getCommonRecordName(record) : value === null ? "" : String(value) }))} /> : null}
          {isGarmentLayout ? <CommonRecordAutocompleteLookup label="Size" className="gap-1" labelClassName="text-center" moduleKey="sizes" placeholder="Search size" session={session} value={itemDraft.size ?? ""} onChange={(value, record) => setItemDraft((current) => ({ ...current, size: record ? getCommonRecordName(record) : value === null ? "" : String(value) }))} /> : null}
          <Field compact centeredLabel numeric label="Quantity" type="text" value={String(itemDraft.quantity)} onChange={(value) => setItemDraft((current) => ({ ...current, quantity: Number(value.replace(/[^0-9.]/g, "") || 0) }))} />
          <Field compact centeredLabel numeric label="Price" type="text" value={String(itemDraft.rate)} onChange={(value) => setItemDraft((current) => ({ ...current, rate: Number(value.replace(/[^0-9.]/g, "") || 0) }))} />
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
        <DeliveryNoteItemsPreviewTable items={form.items} onDeleteItem={deleteItem} onEditItem={editItem} useColour={useColour} useDc={useDc} usePo={usePo} useSize={useSize} />
      </section>
    </div>
  )
}

function DeliveryNoteItemsPreviewTable({ items, onDeleteItem, onEditItem, useColour, useDc, usePo, useSize }: { items: DeliveryNoteEntryItem[]; onDeleteItem(index: number): void; onEditItem(index: number): void; useColour: boolean; useDc: boolean; usePo: boolean; useSize: boolean }) {
  const emptyColSpan = 7 + (usePo ? 1 : 0) + (useDc ? 1 : 0) + (useColour ? 1 : 0) + (useSize ? 1 : 0)
  const totalQuantity = items.reduce((total, item) => total + Number(item.quantity || 0), 0)

  return (
    <div className="w-full overflow-x-auto rounded-md border border-border/70">
      <table className="w-full min-w-[760px] table-fixed border-collapse text-[10px] sm:text-[11px] xl:text-xs">
        <thead className="bg-muted/45 text-muted-foreground">
          <tr>
            <ItemHeader className="w-[2.5%]">#</ItemHeader>
            {usePo ? <ItemHeader className="w-[5%]">PO</ItemHeader> : null}
            {useDc ? <ItemHeader className="w-[5%]">DC</ItemHeader> : null}
            <ItemHeader className="w-[32%]">Particulars</ItemHeader>
            <ItemHeader className="w-[7%]">HSN Code</ItemHeader>
            {useColour ? <ItemHeader className="w-[6%]">Colour</ItemHeader> : null}
            {useSize ? <ItemHeader className="w-[5%]">Size</ItemHeader> : null}
            <ItemHeader className="w-[5%]">Qty</ItemHeader>
            <ItemHeader className="w-[7%]">Rate</ItemHeader>
            <ItemHeader className="w-[5%]">Unit</ItemHeader>
            <ItemHeader className="w-[4.5%]">Action</ItemHeader>
          </tr>
        </thead>
        <tbody>
          {items.length === 0 ? (
            <tr>
              <td colSpan={emptyColSpan} className="px-4 py-8 text-center text-sm text-muted-foreground">No delivery note items added.</td>
            </tr>
          ) : items.map((item, index) => (
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
          ))}
        </tbody>
      </table>
      <div className="flex justify-end border-t border-border/70 bg-muted/20 px-3 py-2 text-sm">
        <div className="grid min-w-48 grid-cols-[1fr_auto] gap-6">
          <span className="font-medium text-muted-foreground">Total Qty</span>
          <span className="text-right font-semibold text-foreground">{totalQuantity.toLocaleString()}</span>
        </div>
      </div>
    </div>
  )
}

function DeliveryNoteAddressTab({ addressLabels, contacts, form, onContactsRefresh, session, setForm }: {
  addressLabels: DeliveryNoteAddressLabels
  contacts: DeliveryNoteLookupOption[]
  form: DeliveryNoteEntryInput
  onContactsRefresh(): void
  session: AuthSession
  setForm(updater: (current: DeliveryNoteEntryInput) => DeliveryNoteEntryInput): void
}) {
  const [createAddress, setCreateAddress] = useState<{ initialText: string; kind: "billing" | "shipping" } | null>(null)
  const selectedContact = contacts.find((contact) => contact.id === form.supplier_id) ?? null
  const addressOptions = buildContactAddressOptions(selectedContact, addressLabels)

  function pickAddress(kind: "billing" | "shipping", option: DeliveryNoteLookupOption) {
    const text = option.label
    const address = (option.record as { address?: ContactAddress }).address
    setForm((current) => {
      const taxFields = address ? {
        supplier_state_code: addressLabels.stateCodes(address.stateId),
        supplier_state_name: addressLabels.states(address.stateId),
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
      </div>
      {createAddress && selectedContact ? (
        <DeliveryNoteAddressCreateDialog
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

function DeliveryNoteAddressCreateDialog({ addressLabels, contact, initialText, kind, onClose, onCreated, session }: {
  addressLabels: DeliveryNoteAddressLabels
  contact: DeliveryNoteLookupOption
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
            <p className="text-sm text-muted-foreground">{DeliveryNoteLookupInputName(contact)}</p>
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

function DeliveryNoteTermsTab({ form, setForm }: {
  form: DeliveryNoteEntryInput
  setForm(updater: (current: DeliveryNoteEntryInput) => DeliveryNoteEntryInput): void
}) {
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <TextField label="Notes" value={form.notes ?? ""} onChange={(value) => setForm((current) => ({ ...current, notes: value }))} />
      <TextField label="Custom terms" value={form.terms ?? ""} onChange={(value) => setForm((current) => ({ ...current, terms: value }))} />
    </div>
  )
}

function DeliveryNoteContactCreateDialog({ contacts, initialName, onClose, onCreated, session }: {
  contacts: DeliveryNoteLookupOption[]
  initialName: string
  isSaving: boolean
  onClose(): void
  onCreated(contact: DeliveryNoteLookupOption): void
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
  const contactTypesQuery = useQuery({ queryKey: ["DeliveryNote-contact-types", session.selectedTenant.slug], queryFn: () => listMasterDataRecords(session, "contactTypes") })
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
      } as DeliveryNoteLookupOption)
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
            <p className="text-sm text-muted-foreground">Add entry-ready customer details.</p>
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
                  <Field label="Customer name" value={String(draft.name ?? "")} onChange={(name) => setDraft((current) => ({ ...current, name, legalName: current.legalName || name }))} />
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

function buildContactAddressOptions(contact: DeliveryNoteLookupOption | null, labels: DeliveryNoteAddressLabels): DeliveryNoteLookupOption[] {
  const options: DeliveryNoteLookupOption[] = []

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

function contactAddresses(contact: DeliveryNoteLookupOption | null): ContactAddress[] {
  const record = contact?.record as unknown as Partial<ContactRecord> | undefined
  return Array.isArray(record?.addresses) ? record.addresses : []
}

function contactLookupToInput(contact: DeliveryNoteLookupOption): ContactInput {
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

function preferredContactAddress(contact: DeliveryNoteLookupOption) {
  return contactAddresses(contact).find((item) => item.isDefault && item.addressLine1.trim()) ?? contactAddresses(contact).find((item) => item.addressLine1.trim()) ?? contactAddresses(contact)[0]
}

function contactLookupGstin(contact: DeliveryNoteLookupOption) {
  const record = contact.record as unknown as Partial<ContactRecord>
  return String(record.gstin ?? record.gstDetails?.find((item) => item.isDefault)?.gstin ?? record.gstDetails?.[0]?.gstin ?? "").trim().toUpperCase()
}

function addressText(address: Pick<ContactAddress, "addressLine1" | "addressLine2" | "cityId" | "districtId" | "stateId" | "countryId" | "pincodeId">, labels: DeliveryNoteAddressLabels) {
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

function buildDeliveryNotePrintPartyDetails(entry: DeliveryNoteEntry, contact: DeliveryNoteLookupOption | null, savedAddress: string | null | undefined, labels: DeliveryNoteAddressLabels): DeliveryNotePrintPartyDetails {
  const address = contact ? findMatchingContactAddress(contact, savedAddress, labels) : null
  const fallback = parseSavedDeliveryNoteAddress(savedAddress)
  const contactGstin = contact ? contactLookupGstin(contact) : ""

  if (!address) {
    return {
      addressLine: fallback.addressLine,
      gstin: contactGstin || entry.supplier_gstin || "",
      locationLine: fallback.locationLine,
      stateCode: entry.supplier_state_code || "",
      stateName: entry.supplier_state_name || fallback.stateName,
    }
  }

  return {
    addressLine: [address.addressLine1, address.addressLine2].map((value) => String(value ?? "").trim()).filter(Boolean).join(", "),
    gstin: contactGstin || entry.supplier_gstin || "",
    locationLine: [labels.cities(address.cityId), districtPrintLabel(labels.districts(address.districtId)), labels.pincodes(address.pincodeId)].filter(Boolean).join(", "),
    stateCode: labels.stateCodes(address.stateId),
    stateName: labels.states(address.stateId),
  }
}

function findMatchingContactAddress(contact: DeliveryNoteLookupOption, savedAddress: string | null | undefined, labels: DeliveryNoteAddressLabels) {
  const addresses = contactAddresses(contact)
  if (addresses.length === 0) return null
  const saved = normalizeAddressMatch(savedAddress)
  return addresses.find((address) => normalizeAddressMatch(addressText(address, labels)) === saved)
    ?? addresses.find((address) => address.isDefault && address.addressLine1.trim())
    ?? addresses.find((address) => address.addressLine1.trim())
    ?? addresses[0]
}

function parseSavedDeliveryNoteAddress(address: string | null | undefined) {
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

function useDeliveryNoteAddressLabels(session: AuthSession): DeliveryNoteAddressLabels {
  const modules = ["addressTypes", "countries", "states", "districts", "cities", "pincodes"] as const
  const queries = modules.map((moduleKey) => useQuery({ queryKey: ["DeliveryNote-address-labels", session.selectedTenant.slug, moduleKey], queryFn: () => listMasterDataRecords(session, moduleKey) }))
  const maps = Object.fromEntries(modules.map((moduleKey, index) => [moduleKey, buildDeliveryNoteLabelMap(queries[index].data ?? [])])) as Record<(typeof modules)[number], Map<string, string>>

  return {
    addressTypes: (value: unknown) => DeliveryNoteLabelFrom(maps.addressTypes, value),
    cities: (value: unknown) => DeliveryNoteLabelFrom(maps.cities, value),
    countries: (value: unknown) => DeliveryNoteLabelFrom(maps.countries, value),
    districts: (value: unknown) => DeliveryNoteLabelFrom(maps.districts, value),
    pincodes: (value: unknown) => DeliveryNoteLabelFrom(maps.pincodes, value),
    states: (value: unknown) => DeliveryNoteLabelFrom(maps.states, value),
    stateCodes: (value: unknown) => DeliveryNoteCodeFrom(queries[2].data ?? [], value),
  }
}

function buildDeliveryNoteLabelMap(records: MasterDataRecord[]) {
  const map = new Map<string, string>()
  for (const record of records) {
    const label = getCommonRecordName(record)
    for (const key of [record.id, record.uuid, record.name, record.code]) {
      if (key !== null && key !== undefined && key !== "") map.set(String(key), label)
    }
  }
  return map
}

function DeliveryNoteLabelFrom(map: ReadonlyMap<string, string>, value: unknown) {
  if (value === null || value === undefined || value === "") return ""
  return map.get(String(value)) ?? String(value)
}

function DeliveryNoteCodeFrom(records: MasterDataRecord[], value: unknown) {
  if (value === null || value === undefined || value === "") return ""
  const key = String(value)
  const record = records.find((item) => [item.id, item.uuid, item.name, item.code].some((candidate) => candidate !== null && candidate !== undefined && String(candidate) === key))
  return record ? String(record.code ?? "").trim() : ""
}

function Field({ centeredLabel = false, compact = false, label, numeric = false, onChange, type = "text", value }: { centeredLabel?: boolean; compact?: boolean; label: string; numeric?: boolean; onChange(value: string): void; type?: string; value: string }) {
  return (
    <div className={cn("grid", compact ? "gap-1" : "gap-2")}>
      <Label className={cn("text-sm font-medium text-muted-foreground", centeredLabel && "text-center")}>{label}</Label>
      <Input className={cn("h-11 rounded-md", numeric && "text-right")} inputMode={numeric ? "decimal" : undefined} type={type} value={value} onChange={(event) => onChange(event.target.value)} />
    </div>
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
  inputLabel?(option: DeliveryNoteLookupOption): string
  inputRef?: Ref<HTMLInputElement>
  label: string
  onCreate?(query: string): void
  optionLabel?(option: DeliveryNoteLookupOption): string
  onPick(option: DeliveryNoteLookupOption): void
  onTextChange(value: string): void
  options: DeliveryNoteLookupOption[]
  placeholder: string
  selectedId: string | null
  selectedLabel: string
}) {
  const [activeIndex, setActiveIndex] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState(selectedLabel)
  const getOptionLabel = optionLabel ?? ((option: DeliveryNoteLookupOption) => option.label)
  const normalizedQuery = query.trim().toLowerCase()
  const filteredOptions = options.filter((option) => getOptionLabel(option).toLowerCase().includes(normalizedQuery) || option.label.toLowerCase().includes(normalizedQuery) || (option.code ?? "").toLowerCase().includes(normalizedQuery))
  const optionCount = filteredOptions.length
  const exactOption = options.find((option) => getOptionLabel(option).toLowerCase() === normalizedQuery || option.label.toLowerCase() === normalizedQuery || (option.code ?? "").toLowerCase() === normalizedQuery)
  const canCreate = Boolean(onCreate && query.trim() && !exactOption)

  useEffect(() => {
    if (!isOpen) setQuery(selectedLabel)
  }, [isOpen, selectedLabel])

  function selectOption(option: DeliveryNoteLookupOption) {
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

function selectedDeliveryNoteLookupInputLabel(options: DeliveryNoteLookupOption[], selectedId: string | null, fallback: string) {
  const selected = selectedId ? options.find((option) => option.id === selectedId) : null
  return selected ? DeliveryNoteLookupInputName(selected) : fallback
}

function DeliveryNoteLookupInputName(option: DeliveryNoteLookupOption) {
  const recordName = typeof option.record.name === "string" ? option.record.name.trim() : ""
  return recordName || option.label
}

function formatParticulars(item: DeliveryNoteEntryItem) {
  const product = item.product_name.trim() || "-"
  const description = String(item.description ?? "").trim()
  return description ? `${product} - ${description}` : product
}

function ItemHeader({ children, className }: { children: ReactNode; className?: string }) {
  return <th className={cn("border-b border-r border-border/70 px-1 py-1.5 text-center align-middle font-medium leading-tight last:border-r-0", className)}>{children}</th>
}

function ItemCell({ align = "left", children }: { align?: "center" | "left" | "right"; children: ReactNode }) {
  return <td className={cn("break-words border-r border-border/70 px-1.5 py-1.5 align-middle", align === "center" && "text-center", align === "right" && "text-right")}>{children}</td>
}

function normalizeDeliveryNoteItem(item: DeliveryNoteEntryItem, index: number): DeliveryNoteEntryItem {
  const quantity = Number(item.quantity || 0)
  const rate = Number(item.rate || 0)
  return {
    ...item,
    colour: item.colour ?? "",
    description: item.description ?? "",
    dc_no: item.dc_no ?? "",
    discount_amount: 0,
    hsn_code: item.hsn_code ?? "",
    line_total: quantity * rate,
    po_no: item.po_no ?? "",
    product_name: item.product_name.trim(),
    quantity,
    rate,
    size: item.size ?? "",
    sort_order: item.sort_order ?? index,
    tax_amount: 0,
    tax_rate: 0,
    unit: item.unit ?? "",
  }
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

function ListHeader({ children, className }: { children: ReactNode; className?: string }) {
  return <th className={cn("border-b border-border/70 px-4 py-3.5 text-left font-medium text-foreground", className)}>{children}</th>
}

function searchDeliveryNote(entries: DeliveryNoteEntry[], searchValue: string) {
  const term = searchValue.trim().toLowerCase()
  if (!term) return entries
  return entries.filter((entry) => [entry.entry_no, entry.uuid, entry.supplier_name, entry.entry_date, entry.reference_no].some((value) => String(value ?? "").toLowerCase().includes(term)))
}

function isActive(entry: DeliveryNoteEntry) {
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

