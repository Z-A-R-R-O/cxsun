import { useEffect, useMemo, useState, type Dispatch, type ReactNode, type SetStateAction } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { ArrowLeft, Check, Mail, MessageCircle, Paperclip, Pencil, Plus, Printer, RotateCcw, Save, Send, Tag, Trash2, UserRound, X } from "lucide-react"
import { Button } from "src/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "src/components/ui/card"
import { Input } from "src/components/ui/input"
import { Label } from "src/components/ui/label"
import { RadioGroup, RadioGroupItem } from "src/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "src/components/ui/select"
import { Textarea } from "src/components/ui/textarea"
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
import type { AuthSession } from "src/features/auth/auth-client"
import { listCompanies, type CompanyRecord } from "src/features/company/company-client"
import { LetterheadBuilder } from "src/features/company/letterhead-builder"
import { listContacts, type ContactRecord } from "src/features/contact/contact-client"
import { WorkOrderAutocomplete } from "src/features/master-data/interface/components/work-order-autocomplete"
import { nextDocumentNumberSetting, type DocumentEntryKind } from "src/features/settings/document-settings-client"
import { useCompanySoftwareSettings } from "src/features/settings/use-company-software-settings"
import { cn } from "src/lib/utils"
import {
  addAccountBookComment,
  destroyAccountBookEntry,
  emptyAccountBookEntry,
  listAccountBookEntries,
  listAccountLedgers,
  restoreAccountBookEntry,
  runAccountBookTool,
  upsertAccountLedger,
  upsertAccountBookEntry,
  type AccountBookEntry,
  type AccountBookEntryInput,
  type AccountBookType,
  type AccountLedger,
} from "./accounts-client"

type View = { mode: "list" } | { mode: "show"; entry: AccountBookEntry } | { mode: "upsert"; entry: AccountBookEntry | null }
type AccountToolId = "email" | "assign" | "attachments" | "tags" | "whatsapp"

export function CashBookPage({ session }: { session: AuthSession }) {
  return <AccountBookPage bookType="cash" session={session} title="Cash Book" description="Track cash receipts and cash payments across cash ledgers." />
}

export function BankBookPage({ session }: { session: AuthSession }) {
  return <AccountBookPage bookType="bank" session={session} title="Bank Book" description="Track bank deposits and bank payments across bank ledgers." />
}

function AccountBookPage({ bookType, description, session, title }: { bookType: AccountBookType; description: string; session: AuthSession; title: string }) {
  const queryClient = useQueryClient()
  const [view, setView] = useState<View>({ mode: "list" })
  const [searchValue, setSearchValue] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState(100)
  const entriesKey = ["account-book", session.selectedTenant.slug, bookType]
  const ledgersKey = ["account-ledgers", session.selectedTenant.slug, bookType]
  const entriesQuery = useQuery({ queryKey: entriesKey, queryFn: () => listAccountBookEntries(session, bookType) })
  const ledgersQuery = useQuery({ queryKey: ledgersKey, queryFn: () => listAccountLedgers(session, bookType) })
  const upsertMutation = useMutation({ mutationFn: (input: AccountBookEntryInput) => upsertAccountBookEntry(session, bookType, input) })
  const destroyMutation = useMutation({ mutationFn: (entry: AccountBookEntry) => destroyAccountBookEntry(session, bookType, entry) })
  const restoreMutation = useMutation({ mutationFn: (entry: AccountBookEntry) => restoreAccountBookEntry(session, bookType, entry) })
  const commentMutation = useMutation({ mutationFn: ({ entry, body }: { entry: AccountBookEntry; body: string }) => addAccountBookComment(session, bookType, entry, body) })
  const toolMutation = useMutation({ mutationFn: ({ entry, tool }: { entry: AccountBookEntry; tool: string }) => runAccountBookTool(session, bookType, entry, tool) })
  const entries = entriesQuery.data ?? []
  const ledgers = ledgersQuery.data ?? []
  const filteredEntries = useMemo(() => searchEntries(entries, ledgers, searchValue), [entries, ledgers, searchValue])
  const totalPages = Math.max(1, Math.ceil(filteredEntries.length / rowsPerPage))
  const pageEntries = filteredEntries.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage)

  useEffect(() => {
    if (entriesQuery.error) toast.error(`${title} load failed`, { description: entriesQuery.error instanceof Error ? entriesQuery.error.message : "Unable to load entries." })
  }, [entriesQuery.error, title])

  async function refresh() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: entriesKey }),
      queryClient.invalidateQueries({ queryKey: ledgersKey }),
    ])
  }

  async function save(input: AccountBookEntryInput, printAfterSave = false) {
    const entry = await upsertMutation.mutateAsync(input)
    toast.success(input.uuid ? `${title} entry updated` : `${title} entry created`, { description: entry.voucher_no })
    queryClient.removeQueries({ queryKey: ["document-number-next-preview", session.selectedTenant.slug, documentKindForBook(bookType)] })
    await queryClient.invalidateQueries({ queryKey: ["document-number-next-preview", session.selectedTenant.slug] })
    await refresh()
    setView({ mode: "show", entry })
    if (printAfterSave) window.setTimeout(() => window.print(), 300)
  }

  async function destroy(entry: AccountBookEntry) {
    await destroyMutation.mutateAsync(entry)
    toast.error(`${title} entry suspended`, { description: entry.voucher_no })
    await refresh()
  }

  async function restore(entry: AccountBookEntry) {
    await restoreMutation.mutateAsync(entry)
    toast.success(`${title} entry restored`, { description: entry.voucher_no })
    await refresh()
  }

  if (view.mode === "upsert") {
    return <AccountBookUpsertPage bookType={bookType} entry={view.entry} isSaving={upsertMutation.isPending} ledgers={ledgers} session={session} onBack={() => setView(view.entry ? { mode: "show", entry: view.entry } : { mode: "list" })} onSubmit={save} title={title} />
  }

  if (view.mode === "show") {
    const entry = entries.find((item) => item.uuid === view.entry.uuid) ?? view.entry
    return (
      <AccountBookShowPage
        entry={entry}
        isWorking={commentMutation.isPending || toolMutation.isPending}
        ledger={ledgerFor(entry, ledgers)}
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
          toast.success("Action recorded", { description: "The activity was recorded for this entry." })
          await refresh()
          setView({ mode: "show", entry: updated })
        }}
        title={title}
      />
    )
  }

  return (
    <MasterListPageFrame
      title={title}
      description={description}
      technicalName={`page.accounts.${bookType}.list`}
      action={<Button onClick={() => setView({ mode: "upsert", entry: null })} type="button" className="h-9 rounded-xl"><Plus className="size-4" />New {title}</Button>}
    >
      <MasterListToolbarCard
        columns={[]}
        filterOptions={[]}
        filterValue="all"
        onFilterValueChange={() => undefined}
        onShowAllColumns={() => undefined}
        searchPlaceholder={`Search ${title.toLowerCase()}, ledger, party, reference, narration`}
        searchValue={searchValue}
        onSearchValueChange={(value) => {
          setSearchValue(value)
          setCurrentPage(1)
        }}
      />
      <MasterListTableCard className="rounded-md">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] border-collapse text-sm">
            <thead className="bg-muted/55">
              <tr>
                <ListHeader>Voucher</ListHeader>
                <ListHeader>Date</ListHeader>
                <ListHeader>Ledger</ListHeader>
                <ListHeader>Party / Particulars</ListHeader>
                <ListHeader className="text-right">Received</ListHeader>
                <ListHeader className="text-right">Paid</ListHeader>
                <ListHeader className="text-right">Balance</ListHeader>
                <ListHeader>Status</ListHeader>
                <ListHeader className="text-right">Action</ListHeader>
              </tr>
            </thead>
            <tbody>
              {pageEntries.map((entry) => (
                <tr key={entry.uuid} className={cn("border-b border-border/60 last:border-b-0", !isActive(entry) && "bg-muted/20 text-muted-foreground")}>
                  <td className="px-4 py-2.5"><button className="font-medium text-foreground hover:underline" type="button" onClick={() => setView({ mode: "show", entry })}>{entry.voucher_no}</button></td>
                  <td className="px-4 py-2.5 text-muted-foreground">{formatDate(entry.voucher_date)}</td>
                  <td className="px-4 py-2.5">{ledgerFor(entry, ledgers)?.name ?? "-"}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{entry.party_name || entry.particulars || "-"}</td>
                  <td className="px-4 py-2.5 text-right">{entry.direction === "in" ? formatMoney(entry.amount) : "-"}</td>
                  <td className="px-4 py-2.5 text-right">{entry.direction === "out" ? formatMoney(entry.amount) : "-"}</td>
                  <td className="px-4 py-2.5 text-right">{formatMoney(entry.balance_after)}</td>
                  <td className="px-4 py-2.5">{entry.status}</td>
                  <td className="px-4 py-2 text-right">
                    <MasterListRowActions title={entry.voucher_no} isSuspended={!isActive(entry)} onDelete={() => void destroy(entry)} onEdit={() => setView({ mode: "upsert", entry })} onRestore={() => void restore(entry)} onView={() => setView({ mode: "show", entry })} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {pageEntries.length === 0 ? <MasterListEmptyState>{entriesQuery.isFetching ? `Loading ${title.toLowerCase()}.` : `No ${title.toLowerCase()} entries found.`}</MasterListEmptyState> : null}
      </MasterListTableCard>
      <MasterListPaginationCard
        page={currentPage}
        rowsPerPage={rowsPerPage}
        showingLabel={buildMasterListShowingLabel({ page: currentPage, pageSize: rowsPerPage, totalCount: filteredEntries.length })}
        singularLabel="entry"
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

function AccountBookShowPage({ entry, isWorking, ledger, onBack, onComment, onDestroy, onEdit, onRestore, onTool, session, title }: { entry: AccountBookEntry; isWorking: boolean; ledger?: AccountLedger; onBack(): void; onComment(entry: AccountBookEntry, body: string): Promise<void>; onDestroy(): void; onEdit(): void; onRestore(): void; onTool(entry: AccountBookEntry, tool: string): Promise<void>; session: AuthSession; title: string }) {
  const [comment, setComment] = useState("")
  const [openTool, setOpenTool] = useState<AccountToolId | null>(null)
  const [emailAddress, setEmailAddress] = useState("")
  const [whatsappNumber, setWhatsappNumber] = useState("")
  const [assigneeInput, setAssigneeInput] = useState("")
  const [tagInput, setTagInput] = useState("")
  const [assignees, setAssignees] = useState<string[]>([])
  const [attachments, setAttachments] = useState<string[]>([])
  const [tags, setTags] = useState<string[]>([])
  const companyQuery = useQuery({ queryKey: ["account-book-print-company", session.selectedTenant.slug], queryFn: () => listCompanies(session) })
  const company = (companyQuery.data ?? []).find((item) => item.isPrimary) ?? companyQuery.data?.[0] ?? null
  const [softwareSettings] = useCompanySoftwareSettings(session)
  const entryTools: Array<{ icon: typeof Mail; id: AccountToolId; label: string }> = [
    { icon: Mail, id: "email", label: "Send to Email" },
    { icon: UserRound, id: "assign", label: "Assign" },
    { icon: Paperclip, id: "attachments", label: "Attachments" },
    { icon: Tag, id: "tags", label: "Tags" },
    { icon: MessageCircle, id: "whatsapp", label: "Send to WhatsApp" },
  ]

  function addListValue(value: string, setValue: (value: string) => void, setValues: Dispatch<SetStateAction<string[]>>, activityMessage: (value: string) => string) {
    const next = value.trim()
    if (!next) return
    setValues((current) => current.includes(next) ? current : [...current, next])
    void onTool(entry, activityMessage(next))
    setValue("")
  }

  function removeListValue(value: string, setValues: Dispatch<SetStateAction<string[]>>) {
    setValues((current) => current.filter((item) => item !== value))
  }

  return (
    <main className="theme-shell account-print-page mx-auto min-h-screen w-[94%] pb-8 pt-8 text-black sm:w-[92%] lg:w-[90%] print:fixed print:inset-0 print:z-[9999] print:min-h-0 print:w-full print:overflow-visible print:bg-white print:p-0">
      <div className="mx-auto mb-3 grid w-full gap-2 print:hidden">
        <div>
          <h1 className="text-3xl font-semibold tracking-normal text-foreground">{entry.party_name || entry.particulars || title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{entry.voucher_no}</p>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Button type="button" variant="outline" className="h-9 rounded-xl" onClick={onBack}><ArrowLeft className="size-4" />Back</Button>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button className="rounded-xl" onClick={() => window.print()} type="button"><Printer className="size-4" />Print</Button>
            <Button type="button" variant="outline" className="rounded-xl" onClick={onEdit}><Pencil className="size-4" />Edit</Button>
            {isActive(entry) ? <Button onClick={onDestroy} type="button" variant="destructive" className="rounded-xl"><Trash2 className="size-4" />Suspend</Button> : <Button onClick={onRestore} type="button" variant="outline" className="rounded-xl"><RotateCcw className="size-4" />Restore</Button>}
          </div>
        </div>
      </div>
      <section className="mx-auto w-fit max-w-full overflow-visible rounded-md border border-border/70 bg-card shadow-sm print:contents">
        <div className="overflow-x-auto p-3 print:contents sm:p-4">
          <AccountBookPrintDocument bookType={entry.book_type} company={company} entry={entry} ledger={ledger} letterheadSettings={softwareSettings.letterheadSettings} />
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
                {entry.activities.map((item) => (
                  <div key={item.id} className="relative grid gap-1 pl-6 text-sm">
                    <span className="absolute left-0 top-1 size-3 rounded-full border-2 border-background bg-primary" />
                    <span className="font-medium">{item.message}</span>
                    <span className="text-xs text-muted-foreground">{item.actor_email} - {formatDateTime(item.created_at)}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="h-fit rounded-md border-border/70">
          <CardHeader><CardTitle className="text-lg">Entry Tools</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {entryTools.map((tool) => {
              const ToolIcon = tool.icon
              return (
                <div key={tool.id} className="rounded-md border border-border/70">
                  <button type="button" className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left text-sm font-medium" onClick={() => setOpenTool(openTool === tool.id ? null : tool.id)}>
                    <span className="flex items-center gap-2"><ToolIcon className="size-4" />{tool.label}</span>
                    <span className="text-muted-foreground">{openTool === tool.id ? "-" : "+"}</span>
                  </button>
                  {openTool === tool.id ? (
                    <div className="border-t border-border/70 p-3">
                      {tool.id === "email" ? <ToolSendInput disabled={isWorking} placeholder="Email address" value={emailAddress} onChange={setEmailAddress} onSend={(value) => void onTool(entry, `Send to Email: ${value}`).then(() => setEmailAddress(""))} /> : null}
                      {tool.id === "assign" ? <Input value={assigneeInput} onChange={(event) => setAssigneeInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addListValue(assigneeInput, setAssigneeInput, setAssignees, (value) => `Assigned ${entry.voucher_no} to ${value}`) } }} placeholder="User name or email" className="h-9 rounded-md" /> : null}
                      {tool.id === "attachments" ? <Input type="file" multiple className="h-9 rounded-md" onChange={(event) => { const names = Array.from(event.target.files ?? []).map((file) => file.name); if (names.length) setAttachments((current) => [...current, ...names.filter((name) => !current.includes(name))]); names.forEach((name) => void onTool(entry, `Attached file ${name}`)); event.currentTarget.value = "" }} /> : null}
                      {tool.id === "tags" ? <Input value={tagInput} onChange={(event) => setTagInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addListValue(tagInput, setTagInput, setTags, (value) => `Added tag ${value}`) } }} placeholder="Tag" className="h-9 rounded-md" /> : null}
                      {tool.id === "whatsapp" ? <ToolSendInput disabled={isWorking} placeholder="WhatsApp number" value={whatsappNumber} onChange={setWhatsappNumber} onSend={(value) => void onTool(entry, `Send to WhatsApp: ${value}`).then(() => setWhatsappNumber(""))} /> : null}
                      {tool.id === "assign" ? <ToolPills values={assignees} onRemove={(value) => removeListValue(value, setAssignees)} /> : null}
                      {tool.id === "attachments" ? <ToolPills values={attachments} onRemove={(value) => removeListValue(value, setAttachments)} /> : null}
                      {tool.id === "tags" ? <ToolPills values={tags} onRemove={(value) => removeListValue(value, setTags)} /> : null}
                    </div>
                  ) : null}
                </div>
              )
            })}
          </CardContent>
        </Card>
      </div>
    </main>
  )
}

function AccountBookPrintDocument({ bookType, company, entry, ledger, letterheadSettings }: { bookType: AccountBookType; company: CompanyRecord | null; entry: AccountBookEntry; ledger?: AccountLedger; letterheadSettings?: Parameters<typeof LetterheadBuilder>[0]["settings"] }) {
  const received = entry.direction === "in" ? formatMoney(entry.amount) : "-"
  const paid = entry.direction === "out" ? formatMoney(entry.amount) : "-"
  const printTitle = bookType === "cash" ? "Cash Voucher" : "Bank Voucher"
  const compactLetterheadSettings = {
    ...letterheadSettings,
    heightMm: Math.min(Number(letterheadSettings?.heightMm ?? 38), 38),
  }
  const narrationLines = [
    `Ledger: ${ledger?.name ?? "-"}`,
    entry.particulars ? `Particulars: ${entry.particulars}` : "",
    entry.narration || entry.notes || "",
  ].filter(Boolean)

  return (
    <div className="account-print-sheet w-[198mm] max-w-[calc(100vw-2rem)] border border-gray-500 bg-white font-[Verdana,Arial,sans-serif] text-[10px] text-black print:w-[186mm] print:max-w-none">
      <div className="grid grid-cols-[1fr_auto_1fr] border-b border-gray-400 px-2 py-1">
        <span />
        <span className="text-[12px] font-bold">{printTitle.toUpperCase()}</span>
        <span className="text-right">Original Copy</span>
      </div>
      <div className="border-b border-gray-400">
        <LetterheadBuilder className="py-1" company={company} settings={compactLetterheadSettings} />
      </div>
      <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 border-b border-gray-400 px-2 py-2.5 text-[13px]">
        <PrintLine label="Voucher no">{entry.voucher_no}</PrintLine>
        <PrintLine label="Date">{formatDate(entry.voucher_date)}</PrintLine>
        <PrintLine label="Party">{entry.party_name || "-"}</PrintLine>
        <PrintLine label="Direction">{directionLabel(entry.direction)}</PrintLine>
        <PrintLine label="Reference">{entry.reference_no || "-"}</PrintLine>
      </div>
      <table className="mt-3 w-full border-collapse text-[13px]">
        <thead>
          <tr className="bg-gray-100">
            <th className="border border-gray-500 px-2 py-1.5 text-left">Narration</th>
            <th className="border border-gray-500 px-2 py-1.5 text-right">Received</th>
            <th className="border border-gray-500 px-2 py-1.5 text-right">Paid</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="border border-gray-500 px-2 py-2 align-top leading-snug">
              {narrationLines.length ? narrationLines.map((line) => <div key={line}>{line}</div>) : "-"}
            </td>
            <td className="border border-gray-500 px-2 py-2 text-right align-top">{received}</td>
            <td className="border border-gray-500 px-2 py-2 text-right align-top">{paid}</td>
          </tr>
        </tbody>
      </table>
      {entry.notes ? <div className="mt-3 px-2 text-[13px]"><span className="font-bold">Notes:</span> {entry.notes}</div> : null}
      <div className="mt-8 grid grid-cols-2 px-2 pb-2 text-[13px]">
        <span>Prepared by</span>
        <span className="text-right">Authorised signatory</span>
      </div>
    </div>
  )
}

function AccountBookUpsertPage({ bookType, entry, isSaving, ledgers, onBack, onSubmit, session, title }: { bookType: AccountBookType; entry: AccountBookEntry | null; isSaving: boolean; ledgers: AccountLedger[]; onBack(): void; onSubmit(input: AccountBookEntryInput, printAfterSave?: boolean): Promise<void>; session: AuthSession; title: string }) {
  const queryClient = useQueryClient()
  const [draft, setDraft] = useState<AccountBookEntryInput>(() => entryToInput(entry, ledgers))
  const ledgerOptions = ledgers.filter((ledger) => ledger.account_type === bookType && isActive(ledger))
  const documentKind = documentKindForBook(bookType)
  const nextVoucherQuery = useQuery({ enabled: !entry, queryKey: ["document-number-next-preview", session.selectedTenant.slug, documentKind], queryFn: () => nextDocumentNumberSetting(session, documentKind), refetchOnMount: "always" })
  const contactsQuery = useQuery({ queryKey: ["account-book-contacts", session.selectedTenant.slug], queryFn: () => listContacts(session) })
  const ledgerMutation = useMutation({ mutationFn: (name: string) => upsertAccountLedger(session, bookType, { name }) })
  const canSave = Boolean(draft.ledger_id && Number(draft.amount ?? 0) > 0 && !isSaving)

  useEffect(() => {
    if (!draft.ledger_id && ledgerOptions[0]) setDraft((current) => ({ ...current, ledger_id: ledgerOptions[0].id }))
  }, [draft.ledger_id, ledgerOptions])

  useEffect(() => {
    if (entry || draft.voucher_no || !nextVoucherQuery.data?.preview) return
    setDraft((current) => current.voucher_no ? current : { ...current, voucher_no: nextVoucherQuery.data.preview })
  }, [draft.voucher_no, entry, nextVoucherQuery.data?.preview])

  async function createLedger(name: string) {
    const ledger = await ledgerMutation.mutateAsync(name)
    toast.success("Ledger created", { description: ledger.name })
    setDraft((current) => ({ ...current, ledger_id: ledger.id }))
    await queryClient.invalidateQueries({ queryKey: ["account-ledgers", session.selectedTenant.slug, bookType] })
  }

  const tabs: AnimatedTab[] = [
    { value: "details", label: "Details", content: <AccountBookDetailsTab bookType={bookType} contacts={contactsQuery.data ?? []} form={draft} isCreatingLedger={ledgerMutation.isPending} ledgerOptions={ledgerOptions} session={session} setForm={setDraft} onCreateLedger={createLedger} /> },
    { value: "notes", label: "Notes", content: <AccountBookNotesTab form={draft} setForm={setDraft} /> },
  ]

  return (
    <MasterListPageFrame
      title={entry ? `Edit ${title.toLowerCase()}` : `New ${title.toLowerCase()}`}
      description={`Create a ${bookType === "cash" ? "cash" : "bank"} ledger entry with receipt and payment style controls.`}
      technicalName="page.accounts.entry.upsert"
      action={<Button type="button" variant="outline" className="rounded-xl" onClick={onBack}><X className="size-4" />Cancel</Button>}
      className="w-[calc(100%-2rem)] max-w-[1500px] sm:w-[calc(100%-3rem)] lg:w-[calc(100%-4rem)]"
    >
      <MasterListUpsertLayout>
        <MasterListUpsertCard className="overflow-hidden p-0 [&>div]:p-0">
          <form onSubmit={(event) => { event.preventDefault(); if (canSave) void onSubmit(draft) }}>
            <div className="px-0 pb-4 pt-3 md:pb-5">
              <AnimatedTabs
                className="[&>div:first-child]:rounded-none [&>div:first-child]:border-x-0 [&>div:first-child]:border-t-0 [&>div:first-child]:border-b [&>div:first-child]:border-border/70 [&>div:first-child]:bg-card [&>div:first-child]:px-4 [&>div:first-child]:py-0.5 [&>div:first-child]:shadow-none md:[&>div:first-child]:px-6 [&>div:first-child_button]:min-h-8 [&>div:first-child_button]:py-1 [&>div:last-child]:mx-auto [&>div:last-child]:mt-3 [&>div:last-child]:w-full [&>div:last-child]:px-4 [&>div:last-child]:pb-3 md:[&>div:last-child]:px-6 md:[&>div:last-child]:pb-4"
                tabs={tabs}
              />
            </div>
            <div className="flex flex-wrap justify-start gap-3 border-t border-border/70 bg-muted/20 px-4 py-4 md:px-6">
              <Button type="submit" disabled={!canSave} className="rounded-xl"><Save className={cn("size-4", isSaving && "animate-spin")} />Save</Button>
              <Button type="button" disabled={!canSave} variant="secondary" onClick={() => void onSubmit({ ...draft, status: "posted" }, true)} className="rounded-xl"><Printer className="size-4" />Save & Print</Button>
              <Button type="button" variant="outline" onClick={onBack} className="rounded-xl"><ArrowLeft className="size-4" />Cancel</Button>
            </div>
          </form>
        </MasterListUpsertCard>
      </MasterListUpsertLayout>
    </MasterListPageFrame>
  )
}

function AccountBookDetailsTab({ bookType, contacts, form, isCreatingLedger, ledgerOptions, onCreateLedger, session, setForm }: { bookType: AccountBookType; contacts: ContactRecord[]; form: AccountBookEntryInput; isCreatingLedger: boolean; ledgerOptions: AccountLedger[]; onCreateLedger(name: string): Promise<void>; session: AuthSession; setForm: Dispatch<SetStateAction<AccountBookEntryInput>> }) {
  const selectedLedger = ledgerOptions.find((ledger) => Number(ledger.id) === Number(form.ledger_id))
  const selectedContact = contacts.find((contact) => String(contact.uuid) === String(form.party_id ?? "") || String(contact.id) === String(form.party_id ?? ""))

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <div className="space-y-5">
        <LedgerAutocompleteLookup
          label={`${bookType === "cash" ? "Cash" : "Bank"} ledger *`}
          options={ledgerOptions}
          placeholder={`Search ${bookType} ledger`}
          selectedId={form.ledger_id ? String(form.ledger_id) : null}
          selectedLabel={selectedLedger?.name ?? ""}
          onPick={(ledger) => setForm((current) => ({ ...current, ledger_id: ledger.id }))}
          onTextChange={() => setForm((current) => ({ ...current, ledger_id: undefined }))}
          onCreate={onCreateLedger}
          createLabel={isCreatingLedger ? "Creating ledger" : "Create ledger"}
        />
        <ContactAutocompleteLookup
          label="Party"
          options={contacts}
          placeholder="Search party"
          selectedId={form.party_id ?? null}
          selectedLabel={selectedContact?.name ?? form.party_name ?? ""}
          onPick={(contact) => setForm((current) => ({ ...current, party_id: contact.uuid, party_name: contact.name }))}
          onTextChange={() => setForm((current) => ({ ...current, party_id: null, party_name: null }))}
        />
        <TextField label="Particulars" placeholder="Mention non-party details" value={form.particulars ?? ""} onChange={(value) => setForm((current) => ({ ...current, particulars: value }))} />
        <DecimalInput value={String(form.amount ?? 0)} onChange={(value) => setForm((current) => ({ ...current, amount: parseDecimalInput(value) }))} label="Amount" />
        <WorkOrderAutocomplete session={session} value={form.reference_no ?? ""} onChange={(value) => setForm((current) => ({ ...current, reference_no: value }))} />
      </div>
      <div className="space-y-5">
        <TextField label="Voucher no" placeholder="Auto" value={form.voucher_no ?? ""} onChange={(value) => setForm((current) => ({ ...current, voucher_no: value }))} />
        <TextField label="Date" type="date" value={String(form.voucher_date ?? "")} onChange={(value) => setForm((current) => ({ ...current, voucher_date: value }))} />
        <DirectionRadioField value={form.direction ?? "in"} onChange={(direction) => setForm((current) => ({ ...current, direction }))} />
        <SelectField label="Status" value={form.status ?? "draft"} onValueChange={(value) => setForm((current) => ({ ...current, status: value }))}>
          <SelectItem value="draft">draft</SelectItem>
          <SelectItem value="posted">posted</SelectItem>
          <SelectItem value="cancelled">cancelled</SelectItem>
        </SelectField>
        <TextAreaField label="Narration" value={form.narration ?? ""} onChange={(value) => setForm((current) => ({ ...current, narration: value }))} />
      </div>
    </div>
  )
}

function AccountBookNotesTab({ form, setForm }: { form: AccountBookEntryInput; setForm: Dispatch<SetStateAction<AccountBookEntryInput>> }) {
  return (
    <div className="grid gap-5">
      <TextAreaField label="Notes" value={form.notes ?? ""} onChange={(value) => setForm((current) => ({ ...current, notes: value }))} />
    </div>
  )
}

function ListHeader({ children, className }: { children: ReactNode; className?: string }) {
  return <th className={cn("border-b border-border/70 px-4 py-2.5 text-left text-sm font-medium text-foreground", className)}>{children}</th>
}

function DirectionRadioField({ onChange, value }: { onChange(value: "in" | "out"): void; value: "in" | "out" }) {
  return (
    <div className="grid gap-2">
      <Label className="text-sm font-medium text-muted-foreground">Direction</Label>
      <RadioGroup value={value} onValueChange={(next) => onChange(next === "out" ? "out" : "in")} className="grid h-11 grid-cols-2 gap-2">
        <label className={cn("flex cursor-pointer items-center gap-2 rounded-md border border-input bg-background px-3 text-sm font-medium transition-colors", value === "in" && "border-emerald-500/70 bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200")}>
          <RadioGroupItem value="in" />
          Received
        </label>
        <label className={cn("flex cursor-pointer items-center gap-2 rounded-md border border-input bg-background px-3 text-sm font-medium transition-colors", value === "out" && "border-emerald-500/70 bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200")}>
          <RadioGroupItem value="out" />
          Paid
        </label>
      </RadioGroup>
    </div>
  )
}

function SelectField({ children, label, onValueChange, value }: { children: ReactNode; label: string; onValueChange(value: string): void; value: string }) {
  return (
    <div className="grid gap-2">
      <Label className="text-sm font-medium text-muted-foreground">{label}</Label>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className="h-11 min-h-11 w-full rounded-md bg-background px-3 text-left font-normal"><SelectValue /></SelectTrigger>
        <SelectContent align="start" position="popper" className="w-[var(--radix-select-trigger-width)]">{children}</SelectContent>
      </Select>
    </div>
  )
}

function TextField({ label, onChange, placeholder, type = "text", value }: { label: string; onChange(value: string): void; placeholder?: string; type?: string; value: string }) {
  return <div className="grid gap-2"><Label className="text-sm font-medium text-muted-foreground">{label}</Label><Input className="h-11 rounded-md" placeholder={placeholder} type={type} value={value} onChange={(event) => onChange(event.target.value)} /></div>
}

function TextAreaField({ label, onChange, value }: { label: string; onChange(value: string): void; value: string }) {
  return <div className="grid gap-2"><Label className="text-sm font-medium text-muted-foreground">{label}</Label><Textarea className="min-h-[5.5rem] rounded-md" value={value} onChange={(event) => onChange(event.target.value)} /></div>
}

function DecimalInput({ label, onChange, value }: { label: string; onChange(value: string): void; value: string }) {
  const [displayValue, setDisplayValue] = useState(value)
  const [isFocused, setIsFocused] = useState(false)

  useEffect(() => {
    if (!isFocused) setDisplayValue(value)
  }, [isFocused, value])

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

function LedgerAutocompleteLookup({ createLabel = "Create ledger", label, onCreate, onPick, onTextChange, options, placeholder, selectedId, selectedLabel }: { createLabel?: string; label: string; onCreate?(query: string): Promise<void>; onPick(option: AccountLedger): void; onTextChange(value: string): void; options: AccountLedger[]; placeholder: string; selectedId: string | null; selectedLabel: string }) {
  const lookupOptions = options.map((ledger) => ({ id: String(ledger.id), label: ledger.code ? `${ledger.code} - ${ledger.name}` : ledger.name, ledger }))
  const [activeIndex, setActiveIndex] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState(selectedLabel)
  const normalizedQuery = query.trim().toLowerCase()
  const filteredOptions = lookupOptions.filter((option) => option.label.toLowerCase().includes(normalizedQuery) || option.ledger.name.toLowerCase().includes(normalizedQuery) || option.ledger.code.toLowerCase().includes(normalizedQuery))
  const exactOption = lookupOptions.find((option) => option.label.toLowerCase() === normalizedQuery || option.ledger.name.toLowerCase() === normalizedQuery || option.ledger.code.toLowerCase() === normalizedQuery)
  const canCreate = Boolean(onCreate && query.trim() && !exactOption)
  const optionCount = filteredOptions.length + (canCreate ? 1 : 0)

  useEffect(() => {
    if (!isOpen) setQuery(selectedLabel)
  }, [isOpen, selectedLabel])

  function selectOption(option: { id: string; label: string; ledger: AccountLedger }) {
    setQuery(option.ledger.name)
    onPick(option.ledger)
    setIsOpen(false)
  }

  return (
    <div className="relative z-10 grid w-full gap-2 focus-within:z-[90]">
      <Label className="text-sm font-medium text-muted-foreground">{label}</Label>
      <Input
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
          if (event.key === "Enter") { event.preventDefault(); if (filteredOptions[activeIndex]) selectOption(filteredOptions[activeIndex]); else if (canCreate && activeIndex === filteredOptions.length) void onCreate?.(query.trim()).then(() => setIsOpen(false)) }
          if (event.key === "Escape") { event.preventDefault(); setIsOpen(false); setQuery(selectedLabel) }
        }}
      />
      {isOpen && optionCount ? (
        <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-[100] max-h-60 overflow-y-auto rounded-md border border-border bg-card p-1 shadow-2xl" onMouseDown={(event) => event.preventDefault()}>
          {filteredOptions.map((option, index) => (
            <button key={option.id} type="button" className={activeIndex === index ? "flex w-full items-center justify-between gap-3 rounded-md bg-muted px-3 py-2 text-left text-sm" : "flex w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-left text-sm hover:bg-muted"} onMouseDown={(event) => { event.preventDefault(); selectOption(option) }}>
              <span className="min-w-0 truncate">{option.label}</span>
              {selectedId === option.id ? <Check className="size-4 shrink-0 text-emerald-600" strokeWidth={3} /> : <span className="size-4 shrink-0" />}
            </button>
          ))}
          {canCreate ? (
            <button type="button" className={activeIndex === filteredOptions.length ? "flex w-full items-center gap-2 rounded-md bg-muted px-3 py-2 text-left text-sm font-medium" : "flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-medium hover:bg-muted"} onMouseDown={(event) => { event.preventDefault(); void onCreate?.(query.trim()).then(() => setIsOpen(false)) }}>
              <Plus className="size-4" />{createLabel} "{query.trim()}"
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

function ContactAutocompleteLookup({ label, onPick, onTextChange, options, placeholder, selectedId, selectedLabel }: { label: string; onPick(option: ContactRecord): void; onTextChange(value: string): void; options: ContactRecord[]; placeholder: string; selectedId: string | null; selectedLabel: string }) {
  const [activeIndex, setActiveIndex] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState(selectedLabel)
  const normalizedQuery = query.trim().toLowerCase()
  const filteredOptions = options.filter((option) => contactLabel(option).toLowerCase().includes(normalizedQuery) || option.name.toLowerCase().includes(normalizedQuery) || option.code.toLowerCase().includes(normalizedQuery))

  useEffect(() => {
    if (!isOpen) setQuery(selectedLabel)
  }, [isOpen, selectedLabel])

  function selectOption(option: ContactRecord) {
    setQuery(option.name)
    onPick(option)
    setIsOpen(false)
  }

  return (
    <div className="relative z-10 grid w-full gap-2 focus-within:z-[90]">
      <Label className="text-sm font-medium text-muted-foreground">{label}</Label>
      <Input
        role="combobox"
        className="h-11 w-full rounded-md bg-background"
        placeholder={placeholder}
        value={query}
        onBlur={() => window.setTimeout(() => { setIsOpen(false); setQuery(selectedLabel) }, 120)}
        onChange={(event) => { setQuery(event.target.value); setIsOpen(true); setActiveIndex(0); onTextChange(event.target.value) }}
        onFocus={() => setIsOpen(true)}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") { event.preventDefault(); setIsOpen(true); setActiveIndex((current) => filteredOptions.length ? (current + 1) % filteredOptions.length : 0) }
          if (event.key === "ArrowUp") { event.preventDefault(); setIsOpen(true); setActiveIndex((current) => filteredOptions.length ? (current - 1 + filteredOptions.length) % filteredOptions.length : 0) }
          if (event.key === "Enter" && filteredOptions[activeIndex]) { event.preventDefault(); selectOption(filteredOptions[activeIndex]) }
          if (event.key === "Escape") { event.preventDefault(); setIsOpen(false); setQuery(selectedLabel) }
        }}
      />
      {isOpen && filteredOptions.length ? (
        <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-[100] max-h-60 overflow-y-auto rounded-md border border-border bg-card p-1 shadow-2xl" onMouseDown={(event) => event.preventDefault()}>
          {filteredOptions.map((option, index) => (
            <button key={`${option.uuid}-${index}`} type="button" className={activeIndex === index ? "flex w-full items-center justify-between gap-3 rounded-md bg-muted px-3 py-2 text-left text-sm" : "flex w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-left text-sm hover:bg-muted"} onMouseDown={(event) => { event.preventDefault(); selectOption(option) }}>
              <span className="min-w-0 truncate">{contactLabel(option)}</span>
              {selectedId === option.uuid || selectedId === String(option.id) ? <Check className="size-4 shrink-0 text-emerald-600" strokeWidth={3} /> : <span className="size-4 shrink-0" />}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}

function ToolSendInput({ disabled, onChange, onSend, placeholder, value }: { disabled: boolean; onChange(value: string): void; onSend(value: string): void; placeholder: string; value: string }) {
  return <div className="flex gap-2"><Input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="h-9 rounded-md" /><Button disabled={disabled || !value.trim()} onClick={() => onSend(value.trim())} type="button" className="size-9 rounded-md p-0"><Send className="size-4" /></Button></div>
}

function ToolPills({ onRemove, values }: { onRemove(value: string): void; values: readonly string[] }) {
  return <div className="mt-2 flex flex-wrap gap-2">{values.map((value) => <span key={value} className="inline-flex h-7 max-w-full items-center gap-1 rounded-md bg-muted px-2 text-xs font-medium"><span className="truncate">{value}</span><button aria-label={`Remove ${value}`} className="rounded-sm text-muted-foreground hover:text-foreground" onClick={() => onRemove(value)} type="button"><X className="size-3" /></button></span>)}</div>
}

function SideNote({ body, meta, title }: { body: string; meta: string; title: string }) {
  return <div className="grid grid-cols-[1fr_auto] gap-4 rounded-md border border-border/70 px-3 py-3"><div className="text-sm">{body}</div><div className="text-right"><div className="text-sm font-semibold">{title}</div><div className="mt-1 text-xs text-muted-foreground">{meta}</div></div></div>
}

function PrintLine({ children, label }: { children: ReactNode; label: string }) {
  return <div className="grid grid-cols-[98px_1fr] gap-2"><span className="whitespace-nowrap font-bold">{label}:</span><span>{children}</span></div>
}

function entryToInput(entry: AccountBookEntry | null, ledgers: AccountLedger[]): AccountBookEntryInput {
  if (!entry) return { ...emptyAccountBookEntry(), ledger_id: ledgers[0]?.id }
  return {
    id: entry.id,
    uuid: entry.uuid,
    ledger_id: entry.ledger_id,
    voucher_no: entry.voucher_no,
    voucher_date: String(entry.voucher_date).slice(0, 10),
    direction: entry.direction,
    party_id: entry.party_id,
    party_name: entry.party_name,
    particulars: entry.particulars,
    narration: entry.narration,
    reference_no: entry.reference_no,
    amount: entry.amount,
    status: entry.status,
    notes: entry.notes,
    is_active: entry.is_active,
  }
}

function searchEntries(entries: AccountBookEntry[], ledgers: AccountLedger[], searchValue: string) {
  const query = searchValue.trim().toLowerCase()
  if (!query) return entries
  return entries.filter((entry) => [
    entry.voucher_no,
    entry.party_name,
    entry.particulars,
    entry.reference_no,
    entry.narration,
    entry.status,
    ledgerFor(entry, ledgers)?.name,
  ].some((value) => String(value ?? "").toLowerCase().includes(query)))
}

function ledgerFor(entry: AccountBookEntry, ledgers: AccountLedger[]) {
  return ledgers.find((ledger) => Number(ledger.id) === Number(entry.ledger_id))
}

function isActive(record: { is_active: boolean | number; deleted_at?: string | null }) {
  return (record.is_active === true || record.is_active === 1) && !record.deleted_at
}

function formatDate(value: string | Date) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? String(value) : new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(date)
}

function formatDateTime(value?: string | null) {
  if (!value) return "Not set"
  return new Intl.DateTimeFormat(undefined, { day: "2-digit", hour: "2-digit", hour12: true, minute: "2-digit", month: "short", year: "numeric" }).format(new Date(value))
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-IN", { currency: "INR", style: "currency" }).format(Number(value ?? 0))
}

function directionLabel(value: string) {
  return value === "out" ? "Paid" : "Received"
}

function documentKindForBook(bookType: AccountBookType): DocumentEntryKind {
  return bookType === "cash" ? "cashBook" : "bankBook"
}

function contactLabel(contact: ContactRecord) {
  return [contact.code, contact.name].filter(Boolean).join(" - ") || contact.name
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
