import { useEffect, useMemo, useState, type ReactNode } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { ArrowLeft, Check, CheckCircle2, MessageSquare, Pencil, Plus, Printer, RefreshCw, RotateCcw, Save, Send, Settings2, Trash2, X } from "lucide-react"
import { Badge } from "src/components/ui/badge"
import { Button } from "src/components/ui/button"
import { AnimatedTabs } from "src/components/ui/animated-tabs"
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
import {
  addSalesComment,
  destroySalesEntry,
  emptySalesEntry,
  emptySalesItem,
  listSalesCommonLookups,
  listSalesContactLookups,
  listSalesEntries,
  listSalesProductLookups,
  restoreSalesEntry,
  runSalesTool,
  upsertSalesEntry,
  type SalesLookupOption,
  type SalesEntry,
  type SalesEntryInput,
  type SalesEntryItem,
} from "./sales-client"

type SalesView = { mode: "list" } | { mode: "show"; entry: SalesEntry } | { mode: "upsert"; entry: SalesEntry | null }

export function SalesPage({ session }: { session: AuthSession }) {
  const queryClient = useQueryClient()
  const [view, setView] = useState<SalesView>({ mode: "list" })
  const [searchValue, setSearchValue] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const queryKey = ["sales-entries", session.selectedTenant.slug]
  const entriesQuery = useQuery({ queryKey, queryFn: () => listSalesEntries(session) })
  const upsertMutation = useMutation({ mutationFn: (input: SalesEntryInput) => upsertSalesEntry(session, input) })
  const destroyMutation = useMutation({ mutationFn: (entry: SalesEntry) => destroySalesEntry(session, entry) })
  const restoreMutation = useMutation({ mutationFn: (entry: SalesEntry) => restoreSalesEntry(session, entry) })
  const commentMutation = useMutation({ mutationFn: ({ entry, body }: { entry: SalesEntry; body: string }) => addSalesComment(session, entry, body) })
  const toolMutation = useMutation({ mutationFn: ({ entry, tool }: { entry: SalesEntry; tool: string }) => runSalesTool(session, entry, tool) })
  const entries = entriesQuery.data ?? []
  const filteredEntries = useMemo(() => searchSales(entries, searchValue), [entries, searchValue])
  const totalPages = Math.max(1, Math.ceil(filteredEntries.length / rowsPerPage))
  const pageEntries = filteredEntries.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage)

  useEffect(() => {
    if (entriesQuery.error) toast.error("Sales load failed", { description: entriesQuery.error instanceof Error ? entriesQuery.error.message : "Unable to load sales entries." })
  }, [entriesQuery.error])

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey })
  }

  async function save(input: SalesEntryInput) {
    const entry = await upsertMutation.mutateAsync(input)
    toast.success(input.uuid ? "Sales entry updated" : "Sales entry created", { description: entry.invoice_no })
    await refresh()
    setView({ mode: "show", entry })
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
    return (
      <SalesShowPage
        entry={entries.find((entry) => entry.uuid === view.entry.uuid) ?? view.entry}
        isWorking={commentMutation.isPending || toolMutation.isPending}
        onBack={() => setView({ mode: "list" })}
        onComment={async (entry, body) => {
          const updated = await commentMutation.mutateAsync({ entry, body })
          await refresh()
          setView({ mode: "show", entry: updated })
        }}
        onDestroy={() => void destroy(view.entry)}
        onEdit={() => setView({ mode: "upsert", entry: view.entry })}
        onRestore={() => void restore(view.entry)}
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
      description="Tenant-isolated sales entries with queue events, print preview, comments, tools, and activity history."
      technicalName="page.entries.sales"
      action={
        <div className="flex items-center gap-2">
          <Button disabled={entriesQuery.isFetching} onClick={() => void entriesQuery.refetch()} type="button" variant="outline" className="h-9 rounded-md"><RefreshCw className={cn("size-4", entriesQuery.isFetching && "animate-spin")} />Refresh</Button>
          <Button onClick={() => setView({ mode: "upsert", entry: null })} type="button" className="h-9 rounded-md"><Plus className="size-4" />New</Button>
        </div>
      }
    >
      <MasterListToolbarCard
        searchPlaceholder="Search invoice, customer, status, amount"
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
                <ListHeader>Invoice</ListHeader>
                <ListHeader>Date</ListHeader>
                <ListHeader>Customer</ListHeader>
                <ListHeader className="text-right">Total</ListHeader>
                <ListHeader className="text-right">Balance</ListHeader>
                <ListHeader>Status</ListHeader>
                <ListHeader className="text-right">Action</ListHeader>
              </tr>
            </thead>
            <tbody>
              {pageEntries.map((entry) => (
                <tr key={entry.uuid} className={cn("border-b border-border/70", !isActive(entry) && "bg-muted/20 text-muted-foreground")}>
                  <td className="px-4 py-2">
                    <button className="font-semibold hover:underline" onClick={() => setView({ mode: "show", entry })} type="button">{entry.invoice_no}</button>
                    <div className="font-mono text-xs text-muted-foreground">{entry.uuid}</div>
                  </td>
                  <td className="px-4 py-2">{formatDate(entry.invoice_date)}</td>
                  <td className="px-4 py-2">{entry.customer_name}</td>
                  <td className="px-4 py-2 text-right font-semibold">{formatMoney(entry.grand_total)}</td>
                  <td className="px-4 py-2 text-right">{formatMoney(entry.balance_amount)}</td>
                  <td className="px-4 py-2"><StatusBadge entry={entry} /></td>
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

function SalesShowPage({ entry, isWorking, onBack, onComment, onDestroy, onEdit, onRestore, onTool }: {
  entry: SalesEntry
  isWorking: boolean
  onBack(): void
  onComment(entry: SalesEntry, body: string): Promise<void>
  onDestroy(): void
  onEdit(): void
  onRestore(): void
  onTool(entry: SalesEntry, tool: string): Promise<void>
}) {
  const [comment, setComment] = useState("")

  return (
    <MasterListPageFrame
      title={`${entry.invoice_no} - ${entry.customer_name}`}
      description="Print-preview sales voucher with comments, tools, and activity."
      technicalName="page.entries.sales.show"
      action={
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={onBack} type="button" variant="outline" className="h-9 rounded-md"><ArrowLeft className="size-4" />Back</Button>
          <Button onClick={onEdit} type="button" className="h-9 rounded-md"><Save className="size-4" />Edit</Button>
          <Button onClick={() => window.print()} type="button" variant="outline" className="h-9 rounded-md"><Printer className="size-4" />Print</Button>
          {isActive(entry) ? (
            <Button onClick={onDestroy} type="button" variant="destructive" className="h-9 rounded-md"><Trash2 className="size-4" />Suspend</Button>
          ) : (
            <Button onClick={onRestore} type="button" variant="outline" className="h-9 rounded-md"><RotateCcw className="size-4" />Restore</Button>
          )}
        </div>
      }
    >
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card className="rounded-md border-border/70 bg-white text-slate-950 shadow-sm">
          <CardContent className="p-8">
            <div className="flex items-start justify-between gap-6 border-b border-slate-200 pb-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Tax Invoice</p>
                <h2 className="mt-1 text-2xl font-bold">CXSun Tenant Company</h2>
                <p className="mt-1 max-w-md text-sm text-slate-600">Tenant isolated billing document generated from the selected tenant database.</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold">{entry.invoice_no}</p>
                <p className="text-sm text-slate-500">{formatDate(entry.invoice_date)}</p>
                <StatusBadge entry={entry} />
              </div>
            </div>
            <div className="grid gap-4 border-b border-slate-200 py-5 md:grid-cols-2">
              <PreviewBlock title="Bill To">{entry.customer_name}<br />{entry.billing_address || "Billing address not set"}</PreviewBlock>
              <PreviewBlock title="Ship To">{entry.shipping_address || entry.billing_address || "Shipping address not set"}<br />{entry.place_of_supply || "Place of supply not set"}</PreviewBlock>
            </div>
            <div className="overflow-x-auto py-5">
              <table className="w-full min-w-[720px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-300 bg-slate-50">
                    <PrintHeader>#</PrintHeader>
                    <PrintHeader>Item</PrintHeader>
                    <PrintHeader className="text-right">Qty</PrintHeader>
                    <PrintHeader className="text-right">Rate</PrintHeader>
                    <PrintHeader className="text-right">Tax</PrintHeader>
                    <PrintHeader className="text-right">Total</PrintHeader>
                  </tr>
                </thead>
                <tbody>
                  {entry.items.map((item, index) => (
                    <tr key={`${item.id ?? index}`} className="border-b border-slate-100">
                      <td className="px-3 py-3 text-slate-500">{index + 1}</td>
                      <td className="px-3 py-3">
                        <div className="font-semibold">{item.product_name}</div>
                        <div className="text-xs text-slate-500">{item.description || item.hsn_code || "No description"}</div>
                      </td>
                      <td className="px-3 py-3 text-right">{item.quantity} {item.unit}</td>
                      <td className="px-3 py-3 text-right">{formatMoney(item.rate)}</td>
                      <td className="px-3 py-3 text-right">{formatMoney(item.tax_amount ?? 0)}</td>
                      <td className="px-3 py-3 text-right font-semibold">{formatMoney(item.line_total ?? 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="grid gap-5 border-t border-slate-200 pt-5 md:grid-cols-[1fr_280px]">
              <div className="text-sm text-slate-600">
                <p className="font-semibold text-slate-900">Terms</p>
                <p className="mt-1">{entry.terms || "No terms configured."}</p>
                {entry.notes ? <p className="mt-4"><span className="font-semibold text-slate-900">Notes:</span> {entry.notes}</p> : null}
              </div>
              <div className="rounded-md border border-slate-200">
                <AmountRow label="Subtotal" value={entry.subtotal} />
                <AmountRow label="Discount" value={entry.discount_total} />
                <AmountRow label="Tax" value={entry.tax_total} />
                <AmountRow label="Round Off" value={entry.round_off} />
                <AmountRow label="Grand Total" value={entry.grand_total} strong />
                <AmountRow label="Balance" value={entry.balance_amount} strong />
              </div>
            </div>
          </CardContent>
        </Card>
        <div className="space-y-4">
          <Card className="rounded-md border-border/70">
            <CardHeader><CardTitle className="flex items-center gap-2 text-base"><MessageSquare className="size-4" />Comments</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Textarea value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Add a comment" className="min-h-24 rounded-md" />
              <Button disabled={isWorking || !comment.trim()} onClick={() => void onComment(entry, comment).then(() => setComment(""))} type="button" className="rounded-md"><Send className="size-4" />Post</Button>
              <div className="space-y-2">
                {entry.comments.map((item) => <SideNote key={item.id} title={item.author_email} body={item.body} meta={formatDate(item.created_at)} />)}
              </div>
            </CardContent>
          </Card>
          <Card className="rounded-md border-border/70">
            <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Settings2 className="size-4" />Tools</CardTitle></CardHeader>
            <CardContent className="grid gap-2">
              {["Email invoice", "Generate PDF", "Queue reminder"].map((tool) => (
                <Button key={tool} disabled={isWorking} onClick={() => void onTool(entry, tool)} type="button" variant="outline" className="justify-start rounded-md">{tool}</Button>
              ))}
            </CardContent>
          </Card>
          <Card className="rounded-md border-border/70">
            <CardHeader><CardTitle className="text-base">Activities</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {entry.activities.map((item) => <SideNote key={item.id} title={item.message} body={item.actor_email} meta={formatDate(item.created_at)} />)}
            </CardContent>
          </Card>
        </div>
      </div>
    </MasterListPageFrame>
  )
}

function SalesUpsertPage({ entry, isSaving, session, onBack, onSubmit }: {
  entry: SalesEntry | null
  isSaving: boolean
  session: AuthSession
  onBack(): void
  onSubmit(input: SalesEntryInput): Promise<void>
}) {
  const [draft, setDraft] = useState<SalesEntryInput>(() => entry ? { ...entry, items: entry.items.map((item) => ({ ...item })) } : emptySalesEntry())
  const totals = useMemo(() => calculateDraftTotals(draft.items, Number(draft.paid_amount ?? 0)), [draft.items, draft.paid_amount])
  const contactsQuery = useQuery({ queryKey: ["sales-lookups", session.selectedTenant.slug, "contacts"], queryFn: () => listSalesContactLookups(session) })
  const productsQuery = useQuery({ queryKey: ["sales-lookups", session.selectedTenant.slug, "products"], queryFn: () => listSalesProductLookups(session) })
  const hsnCodesQuery = useQuery({ queryKey: ["sales-lookups", session.selectedTenant.slug, "hsnCodes"], queryFn: () => listSalesCommonLookups(session, "hsnCodes") })
  const unitsQuery = useQuery({ queryKey: ["sales-lookups", session.selectedTenant.slug, "units"], queryFn: () => listSalesCommonLookups(session, "units") })
  const taxesQuery = useQuery({ queryKey: ["sales-lookups", session.selectedTenant.slug, "taxes"], queryFn: () => listSalesCommonLookups(session, "taxes") })

  return (
    <MasterListPageFrame
      title={entry ? `Edit ${entry.invoice_no}` : "New Sales"}
      description="Create or update a tenant-isolated sales voucher."
      technicalName="page.entries.sales.upsert"
      action={<Button type="button" variant="outline" onClick={onBack} className="rounded-md"><X className="size-4" />Cancel</Button>}
    >
      <MasterListUpsertLayout>
        <MasterListUpsertCard className="overflow-hidden p-0 [&>div]:p-0">
          <form className="space-y-6" onSubmit={(event) => { event.preventDefault(); void onSubmit(draft) }}>
            <div className="px-0 pb-4 pt-3 md:pb-5">
              <SalesVoucherTabs
                contacts={contactsQuery.data ?? []}
                form={draft}
                hsnCodes={hsnCodesQuery.data ?? []}
                products={productsQuery.data ?? []}
                setForm={setDraft}
                taxes={taxesQuery.data ?? []}
                totals={totals}
                units={unitsQuery.data ?? []}
              />
            </div>
            <div className="flex flex-wrap items-center gap-3 border-t border-border/70 bg-muted/20 px-4 py-4 md:px-6">
              <Button type="submit" disabled={isSaving} className="rounded-md"><Save className={cn("size-4", isSaving && "animate-spin")} />Save</Button>
              <Button type="button" disabled={isSaving} variant="secondary" onClick={() => void onSubmit({ ...draft, status: "posted" })} className="rounded-md"><Printer className="size-4" />Save & Print</Button>
              <Button type="button" variant="outline" onClick={onBack} className="rounded-md"><X className="size-4" />Cancel</Button>
            </div>
          </form>
        </MasterListUpsertCard>
      </MasterListUpsertLayout>
    </MasterListPageFrame>
  )
}

function SalesVoucherTabs({ contacts, form, hsnCodes, products, setForm, taxes, totals, units }: {
  contacts: SalesLookupOption[]
  form: SalesEntryInput
  hsnCodes: SalesLookupOption[]
  products: SalesLookupOption[]
  setForm(updater: (current: SalesEntryInput) => SalesEntryInput): void
  taxes: SalesLookupOption[]
  totals: DraftTotals
  units: SalesLookupOption[]
}) {
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null)
  const [itemDraft, setItemDraft] = useState<SalesEntryItem>(() => emptySalesItem())

  function addItem() {
    if (!itemDraft.product_name.trim()) return
    setForm((current) => {
      const normalizedItem = normalizeSalesItem(itemDraft, editingItemIndex ?? current.items.length)
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

  const tabs = [
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
          products={products}
          setEditingItemIndex={setEditingItemIndex}
          setForm={setForm}
          setItemDraft={setItemDraft}
          taxes={taxes}
          totals={totals}
          units={units}
        />
      ),
    },
    {
      value: "address",
      label: "Address",
      content: <SalesAddressTab form={form} setForm={setForm} />,
    },
    {
      value: "eway",
      label: "E-way",
      content: <SalesDocumentTab form={form} setForm={setForm} type="eway" />,
    },
    {
      value: "einvoice",
      label: "E-invoice",
      content: <SalesDocumentTab form={form} setForm={setForm} type="einvoice" />,
    },
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

function SalesDetailsTab({ addItem, contacts, deleteItem, editItem, editingItemIndex, form, hsnCodes, itemDraft, products, setEditingItemIndex, setForm, setItemDraft, taxes, totals, units }: {
  addItem(): void
  contacts: SalesLookupOption[]
  deleteItem(index: number): void
  editItem(index: number): void
  editingItemIndex: number | null
  form: SalesEntryInput
  hsnCodes: SalesLookupOption[]
  itemDraft: SalesEntryItem
  products: SalesLookupOption[]
  setEditingItemIndex(value: number | null): void
  setForm(updater: (current: SalesEntryInput) => SalesEntryInput): void
  setItemDraft(value: SalesEntryItem | ((current: SalesEntryItem) => SalesEntryItem)): void
  taxes: SalesLookupOption[]
  totals: DraftTotals
  units: SalesLookupOption[]
}) {
  function cancelItemEdit() {
    setItemDraft(() => emptySalesItem())
    setEditingItemIndex(null)
  }

  return (
    <div className="space-y-8">
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="space-y-5">
          <MasterAutocompleteLookup
            label="Customer name"
            options={contacts}
            placeholder=""
            selectedId={form.customer_id ?? null}
            selectedLabel={form.customer_name ?? ""}
            onPick={(option) => setForm((current) => ({
              ...current,
              billing_address: option.billingAddress ?? current.billing_address,
              customer_id: option.id,
              customer_name: option.label,
              shipping_address: option.shippingAddress ?? option.billingAddress ?? current.shipping_address,
            }))}
            onTextChange={(value) => setForm((current) => ({ ...current, customer_id: null, customer_name: value }))}
          />
          <Field label="Order no" value={form.reference_no ?? ""} onChange={(value) => setForm((current) => ({ ...current, reference_no: value }))} />
        </div>
        <div className="space-y-5">
          <Field label="Invoice no" value={form.invoice_no ?? ""} onChange={(value) => setForm((current) => ({ ...current, invoice_no: value }))} />
          <Field label="Date" type="date" value={String(form.invoice_date ?? "")} onChange={(value) => setForm((current) => ({ ...current, invoice_date: value }))} />
          <SalesTypeField value={form.place_of_supply ?? "cgst-sgst"} onChange={(value) => setForm((current) => ({ ...current, place_of_supply: value }))} />
        </div>
      </div>
      <section className="space-y-5">
        <h2 className="text-lg font-semibold text-primary underline underline-offset-4">Sales Items</h2>
        <div className="grid gap-3 lg:grid-cols-[repeat(6,minmax(0,1fr))_auto]">
          <MasterAutocompleteLookup
            label="Product name"
            options={products}
            placeholder=""
            selectedId={itemDraft.product_id ?? null}
            selectedLabel={itemDraft.product_name}
            onPick={(option) => setItemDraft((current) => ({
              ...current,
              description: option.description ?? current.description,
              product_id: option.id,
              product_name: option.label,
              rate: option.rate ?? current.rate,
            }))}
            onTextChange={(value) => setItemDraft((current) => ({ ...current, product_id: null, product_name: value }))}
          />
          <MasterAutocompleteLookup
            label="HSN code"
            options={hsnCodes}
            placeholder=""
            selectedId={null}
            selectedLabel={itemDraft.hsn_code ?? ""}
            onPick={(option) => setItemDraft((current) => ({ ...current, hsn_code: option.hsnCode ?? option.code ?? option.label }))}
            onTextChange={(value) => setItemDraft((current) => ({ ...current, hsn_code: value }))}
          />
          <MasterAutocompleteLookup
            label="Unit"
            options={units}
            placeholder=""
            selectedId={null}
            selectedLabel={itemDraft.unit ?? ""}
            onPick={(option) => setItemDraft((current) => ({ ...current, unit: option.unit ?? option.code ?? option.label }))}
            onTextChange={(value) => setItemDraft((current) => ({ ...current, unit: value }))}
          />
          <Field numeric label="Quantity" type="text" value={String(itemDraft.quantity)} onChange={(value) => setItemDraft((current) => ({ ...current, quantity: Number(value.replace(/[^0-9.]/g, "") || 0) }))} />
          <Field numeric label="Price" type="text" value={String(itemDraft.rate)} onChange={(value) => setItemDraft((current) => ({ ...current, rate: Number(value.replace(/[^0-9.]/g, "") || 0) }))} />
          <MasterAutocompleteLookup
            label="GST %"
            options={taxes}
            placeholder=""
            selectedId={null}
            selectedLabel={String(itemDraft.tax_rate ?? "")}
            onPick={(option) => setItemDraft((current) => ({ ...current, tax_rate: option.taxRate ?? current.tax_rate }))}
            onTextChange={(value) => setItemDraft((current) => ({ ...current, tax_rate: Number(value.replace(/[^0-9.]/g, "") || 0) }))}
          />
          <div className="mt-6 flex h-11 items-center gap-2">
            <Button type="button" className="h-11 rounded-md" disabled={!itemDraft.product_name.trim()} onClick={addItem}>
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
        <Field label="Description" value={itemDraft.description ?? ""} onChange={(value) => setItemDraft((current) => ({ ...current, description: value }))} />
        <SalesItemsPreviewTable items={form.items} onDeleteItem={deleteItem} onEditItem={editItem} />
        <TotalsFooter form={form} setForm={setForm} totals={totals} />
      </section>
    </div>
  )
}

function SalesItemsPreviewTable({ items, onDeleteItem, onEditItem }: { items: SalesEntryItem[]; onDeleteItem(index: number): void; onEditItem(index: number): void }) {
  return (
    <div className="w-full overflow-hidden rounded-md border border-border/70">
      <table className="w-full min-w-[1120px] table-fixed border-collapse text-[11px] sm:text-xs xl:text-sm">
        <thead className="bg-muted/45 text-muted-foreground">
          <tr>
            <ItemHeader className="w-[4%]">#</ItemHeader>
            <ItemHeader className="w-[22%]">Product name</ItemHeader>
            <ItemHeader className="w-[18%]">Description</ItemHeader>
            <ItemHeader className="w-[8%]">HSN Code</ItemHeader>
            <ItemHeader className="w-[7%]">Unit</ItemHeader>
            <ItemHeader className="w-[7%]">Quantity</ItemHeader>
            <ItemHeader className="w-[9%]">Price</ItemHeader>
            <ItemHeader className="w-[9%]">Taxable</ItemHeader>
            <ItemHeader className="w-[8%]">GST %</ItemHeader>
            <ItemHeader className="w-[10%]">Sub Total</ItemHeader>
            <ItemHeader className="w-[8%]">Action</ItemHeader>
          </tr>
        </thead>
        <tbody>
          {items.length === 0 ? (
            <tr>
              <td colSpan={11} className="px-4 py-8 text-center text-sm text-muted-foreground">No sales items added.</td>
            </tr>
          ) : items.map((item, index) => {
            const taxable = Math.max(0, Number(item.quantity || 0) * Number(item.rate || 0) - Number(item.discount_amount || 0))
            const taxAmount = taxable * Number(item.tax_rate || 0) / 100
            return (
              <tr key={index} className="border-b border-border/60 last:border-b-0">
                <td className="border-r border-border/70 px-1.5 py-2 text-center text-muted-foreground">{index + 1}</td>
                <ItemCell>{item.product_name || "-"}</ItemCell>
                <ItemCell>{item.description || "-"}</ItemCell>
                <ItemCell>{item.hsn_code || "-"}</ItemCell>
                <ItemCell>{item.unit || "-"}</ItemCell>
                <ItemCell numeric>{Number(item.quantity || 0).toLocaleString()}</ItemCell>
                <ItemCell numeric>{formatMoney(Number(item.rate || 0))}</ItemCell>
                <ItemCell numeric>{formatMoney(taxable)}</ItemCell>
                <ItemCell numeric>{Number(item.tax_rate || 0)}%</ItemCell>
                <td className="border-r border-border/70 px-2 py-2 text-right font-medium">{formatMoney(taxable + taxAmount)}</td>
                <td className="px-1.5 py-1.5 text-right">
                  <div className="flex justify-end gap-1">
                    <Button type="button" size="icon" variant="ghost" className="size-8 rounded-md" onClick={() => onEditItem(index)} aria-label="Edit item">
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button type="button" size="icon" variant="ghost" className="size-8 rounded-md text-destructive hover:text-destructive" onClick={() => onDeleteItem(index)} aria-label="Delete item">
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

function SalesAddressTab({ form, setForm }: {
  form: SalesEntryInput
  setForm(updater: (current: SalesEntryInput) => SalesEntryInput): void
}) {
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <TextField label="Billing address" value={form.billing_address ?? ""} onChange={(value) => setForm((current) => ({ ...current, billing_address: value }))} />
      <TextField label="Shipping address" value={form.shipping_address ?? ""} onChange={(value) => setForm((current) => ({ ...current, shipping_address: value }))} />
      <Field label="Place of supply" value={form.place_of_supply ?? ""} onChange={(value) => setForm((current) => ({ ...current, place_of_supply: value }))} />
      <Field label="Due date" type="date" value={String(form.due_date ?? "")} onChange={(value) => setForm((current) => ({ ...current, due_date: value }))} />
    </div>
  )
}

function SalesDocumentTab({ form, setForm, type }: {
  form: SalesEntryInput
  setForm(updater: (current: SalesEntryInput) => SalesEntryInput): void
  type: "eway" | "einvoice"
}) {
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Field label={type === "eway" ? "E-way bill no" : "IRN"} value="" onChange={() => undefined} />
      <Field label={type === "eway" ? "E-way bill date" : "Ack date"} type="date" value="" onChange={() => undefined} />
      <TextField
        label={type === "eway" ? "Transport / vehicle notes" : "Signed QR / acknowledgement"}
        value={type === "eway" ? form.notes ?? "" : form.terms ?? ""}
        onChange={(value) => setForm((current) => type === "eway" ? { ...current, notes: value } : { ...current, terms: value })}
      />
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
      <Field label="Paid amount" type="number" value={String(form.paid_amount ?? 0)} onChange={(value) => setForm((current) => ({ ...current, paid_amount: Number(value || 0) }))} />
      <StatusField value={form.status ?? "draft"} onChange={(value) => setForm((current) => ({ ...current, status: value }))} />
    </div>
  )
}

function TotalsFooter({ form, setForm, totals }: {
  form: SalesEntryInput
  setForm(updater: (current: SalesEntryInput) => SalesEntryInput): void
  totals: DraftTotals
}) {
  return (
    <div className="ml-auto grid w-full max-w-sm gap-3 text-sm">
      <SummaryRow label="Taxable amount" value={formatMoney(totals.taxableAmount)} />
      <SummaryRow label="GST total" value={formatMoney(totals.gstTotal)} />
      <div className="grid grid-cols-[1fr_auto_8rem] items-center gap-4">
        <span className="font-medium text-muted-foreground">Paid</span>
        <span>:</span>
        <Input className="h-9 rounded-md text-right" inputMode="decimal" type="number" value={String(form.paid_amount ?? 0)} onChange={(event) => setForm((current) => ({ ...current, paid_amount: Number(event.target.value || 0) }))} />
      </div>
      <SummaryRow label="Grand total" value={formatMoney(totals.grandTotal)} strong />
      <SummaryRow label="Balance" value={formatMoney(totals.balanceAmount)} strong />
    </div>
  )
}

function Field({ label, numeric = false, onChange, type = "text", value }: { label: string; numeric?: boolean; onChange(value: string): void; type?: string; value: string }) {
  return (
    <div className="grid gap-2">
      <Label className="text-sm font-medium text-muted-foreground">{label}</Label>
      <Input className={cn("h-11 rounded-md", numeric && "text-right")} inputMode={numeric ? "decimal" : undefined} type={type} value={value} onChange={(event) => onChange(event.target.value)} />
    </div>
  )
}

function TextField({ label, onChange, value }: { label: string; onChange(value: string): void; value: string }) {
  return <div className="grid gap-2"><Label className="text-sm font-medium text-muted-foreground">{label}</Label><Textarea className="min-h-24 rounded-md" value={value} onChange={(event) => onChange(event.target.value)} /></div>
}

function MasterAutocompleteLookup({
  label,
  onPick,
  onTextChange,
  options,
  placeholder,
  selectedId,
  selectedLabel,
}: {
  label: string
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
  const normalizedQuery = query.trim().toLowerCase()
  const filteredOptions = options.filter((option) => option.label.toLowerCase().includes(normalizedQuery) || (option.code ?? "").toLowerCase().includes(normalizedQuery))
  const optionCount = filteredOptions.length
  const exactOption = options.find((option) => option.label.toLowerCase() === normalizedQuery || (option.code ?? "").toLowerCase() === normalizedQuery)

  useEffect(() => {
    if (!isOpen) setQuery(selectedLabel)
  }, [isOpen, selectedLabel])

  function selectOption(option: SalesLookupOption) {
    setQuery(option.label)
    onPick(option)
    setIsOpen(false)
  }

  function selectActiveOption() {
    const activeOption = filteredOptions[activeIndex]
    if (activeOption) selectOption(activeOption)
  }

  return (
    <div className="relative z-10 grid w-full gap-2 focus-within:z-[90]">
      <Label className="text-sm font-medium text-muted-foreground">{label}</Label>
      <Input
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
            selectActiveOption()
            return
          }
          if (event.key === "Escape") {
            event.preventDefault()
            setIsOpen(false)
            setQuery(selectedLabel)
          }
        }}
      />
      {isOpen && optionCount > 0 ? (
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
                <span className="min-w-0 truncate">{option.label}</span>
                {isSelected ? <Check className="size-4 shrink-0 text-emerald-600" strokeWidth={3} /> : <span className="size-4 shrink-0" />}
              </button>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}

function SalesTypeField({ onChange, value }: { onChange(value: string): void; value: string }) {
  return (
    <div className="grid gap-2">
      <Label>Sales type</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-11 rounded-md">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="cgst-sgst">CGST-SGST</SelectItem>
          <SelectItem value="igst">IGST</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}

function StatusField({ onChange, value }: { onChange(value: string): void; value: string }) {
  return (
    <div className="grid gap-2">
      <Label>Status</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-11 rounded-md">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="draft">Draft</SelectItem>
          <SelectItem value="posted">Posted</SelectItem>
          <SelectItem value="cancelled">Cancelled</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}

function ItemHeader({ children, className }: { children: ReactNode; className?: string }) {
  return <th className={cn("border-b border-r border-border/70 px-1 py-2 text-center text-[10px] font-medium leading-tight last:border-r-0 sm:text-[11px] xl:text-xs", className)}>{children}</th>
}

function ItemCell({ children, numeric = false }: { children: ReactNode; numeric?: boolean }) {
  return <td className={cn("border-r border-border/70 px-2 py-2 align-top", numeric && "text-right")}>{children}</td>
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
  grandTotal: number
  balanceAmount: number
}

function normalizeSalesItem(item: SalesEntryItem, index: number): SalesEntryItem {
  const taxable = Math.max(0, Number(item.quantity || 0) * Number(item.rate || 0) - Number(item.discount_amount || 0))
  const taxAmount = taxable * Number(item.tax_rate || 0) / 100
  return {
    ...item,
    description: item.description ?? "",
    discount_amount: Number(item.discount_amount || 0),
    hsn_code: item.hsn_code ?? "",
    line_total: taxable + taxAmount,
    product_name: item.product_name.trim(),
    quantity: Number(item.quantity || 0),
    rate: Number(item.rate || 0),
    sort_order: item.sort_order ?? index,
    tax_amount: taxAmount,
    tax_rate: Number(item.tax_rate || 0),
    unit: item.unit ?? "",
  }
}

function calculateDraftTotals(items: SalesEntryItem[], paidAmount: number): DraftTotals {
  const taxableAmount = items.reduce(
    (total, item) => total + Math.max(0, Number(item.quantity || 0) * Number(item.rate || 0) - Number(item.discount_amount || 0)),
    0,
  )
  const gstTotal = items.reduce((total, item) => {
    const taxable = Math.max(0, Number(item.quantity || 0) * Number(item.rate || 0) - Number(item.discount_amount || 0))
    return total + taxable * Number(item.tax_rate || 0) / 100
  }, 0)
  const grandTotal = taxableAmount + gstTotal
  return {
    taxableAmount,
    gstTotal,
    grandTotal,
    balanceAmount: grandTotal - Number(paidAmount || 0),
  }
}

function PreviewBlock({ children, title }: { children: ReactNode; title: string }) {
  return <div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</p><div className="mt-1 text-sm leading-6">{children}</div></div>
}

function PrintHeader({ children, className }: { children: ReactNode; className?: string }) {
  return <th className={cn("px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-600", className)}>{children}</th>
}

function AmountRow({ label, strong, value }: { label: string; strong?: boolean; value: number }) {
  return <div className={cn("flex justify-between border-b border-slate-200 px-4 py-2 text-sm last:border-b-0", strong && "bg-slate-50 font-bold")}><span>{label}</span><span>{formatMoney(value)}</span></div>
}

function SideNote({ body, meta, title }: { body: string; meta: string; title: string }) {
  return <div className="rounded-md border border-border/70 bg-muted/20 p-3"><p className="text-sm font-semibold">{title}</p><p className="mt-1 text-sm text-muted-foreground">{body}</p><p className="mt-2 text-xs text-muted-foreground">{meta}</p></div>
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
  return entries.filter((entry) => [entry.invoice_no, entry.uuid, entry.customer_name, entry.status, entry.payment_status, String(entry.grand_total)].some((value) => value.toLowerCase().includes(term)))
}

function isActive(entry: SalesEntry) {
  return entry.is_active === true || entry.is_active === 1
}

function formatDate(value?: string | null) {
  if (!value) return "Not set"
  return new Intl.DateTimeFormat(undefined, { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value))
}

function formatMoney(value: number) {
  return new Intl.NumberFormat(undefined, { currency: "INR", maximumFractionDigits: 2, style: "currency" }).format(Number(value ?? 0))
}
