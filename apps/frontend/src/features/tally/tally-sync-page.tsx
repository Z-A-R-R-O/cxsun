import { useEffect, useMemo, useState, type ReactNode } from "react"
import { useMutation, useQuery } from "@tanstack/react-query"
import { BadgeCheck, PackageSearch, ReceiptText, RefreshCw, Send, ShoppingCart, UsersRound } from "lucide-react"
import { toast } from "sonner"
import { MasterListEmptyState, MasterListPageFrame } from "src/components/blocks/lists/master-list"
import { Badge } from "src/components/ui/badge"
import { Button } from "src/components/ui/button"
import { Card, CardContent } from "src/components/ui/card"
import { Checkbox } from "src/components/ui/checkbox"
import { Input } from "src/components/ui/input"
import { Label } from "src/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "src/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "src/components/ui/table"
import type { AuthSession } from "src/features/auth/auth-client"
import { cn } from "src/lib/utils"
import {
  getTallySyncList,
  runTallySync,
  type TallyContactSyncRow,
  type TallyEntrySyncRow,
  type TallyProductSyncRow,
  type TallySyncResource,
} from "./tally-client"

type TallySyncView = "contacts" | "products" | "sales" | "purchase"
type TallySyncRow = TallyContactSyncRow | TallyProductSyncRow | TallyEntrySyncRow
type CheckedState = boolean | "indeterminate"

interface SelectionHeaderProps {
  allSelected: boolean
  someSelected: boolean
  onToggleAll(checked: CheckedState): void
}

interface SelectionRowProps<TRow extends { uuid: string }> {
  row: TRow
  selectable: boolean
  selected: boolean
  onSelectedChange(id: string, checked: CheckedState): void
}

export function TallySyncPage({ session, view }: { session: AuthSession; view: TallySyncView }) {
  const [searchValue, setSearchValue] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [classificationFilter, setClassificationFilter] = useState("all")
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set())

  const query = useQuery({
    queryKey: ["tally-sync-list", session.selectedTenant.slug, view, searchValue, statusFilter, classificationFilter],
    queryFn: () =>
      getTallySyncList(session, view, {
        search: searchValue || undefined,
        status: statusFilter === "all" ? undefined : statusFilter,
        classification: view === "contacts" && classificationFilter !== "all" ? classificationFilter : undefined,
      }),
  })

  const rows = (query.data?.rows ?? []) as TallySyncRow[]
  const syncableIds = useMemo(() => syncableRecordIds(view, rows), [rows, view])
  const syncableIdSet = useMemo(() => new Set(syncableIds), [syncableIds])
  const selectedSyncableIds = useMemo(() => syncableIds.filter((id) => selectedIds.has(id)), [selectedIds, syncableIds])
  const syncedCount = useMemo(() => rows.filter((row) => Boolean(row.synced_to_tally)).length, [rows])
  const allSyncableSelected = syncableIds.length > 0 && selectedSyncableIds.length === syncableIds.length
  const someSyncableSelected = selectedSyncableIds.length > 0 && !allSyncableSelected

  useEffect(() => {
    setSelectedIds((current) => {
      const next = new Set<string>()
      for (const id of current) {
        if (syncableIdSet.has(id)) next.add(id)
      }
      return next.size === current.size ? current : next
    })
  }, [syncableIdSet])

  const syncMutation = useMutation({
    mutationFn: (ids: string[]) => runTallySync(session, view, ids),
    onSuccess: async (result) => {
      toast.success(syncActionLabel(view), {
        description: summarizeResult(view, result.summary),
      })
      await query.refetch()
    },
    onError: (error) => {
      toast.error("Tally sync action failed", {
        description: error instanceof Error ? error.message : "Please try again.",
      })
    },
  })

  function toggleSelected(id: string, checked: CheckedState) {
    setSelectedIds((current) => {
      const next = new Set(current)
      if (checked === true) next.add(id)
      else next.delete(id)
      return next
    })
  }

  function toggleAll(checked: CheckedState) {
    setSelectedIds(checked === true ? new Set(syncableIds) : new Set())
  }

  return (
    <MasterListPageFrame
      title={pageTitle(view)}
      description={pageDescription(view)}
      technicalName={`page.tally.sync.${view}`}
      action={
        <div className="flex flex-wrap gap-2">
          <Button className="rounded-md" variant="outline" type="button" onClick={() => void query.refetch()}>
            <RefreshCw className={cn("size-4", query.isFetching && "animate-spin")} />
            Refresh
          </Button>
          <Button
            className="rounded-md"
            type="button"
            disabled={syncMutation.isPending || selectedSyncableIds.length === 0}
            onClick={() => syncMutation.mutate(selectedSyncableIds)}
          >
            <Send className="size-4" />
            {view === "contacts" || view === "products" ? `Sync selected (${selectedSyncableIds.length})` : `Queue selected (${selectedSyncableIds.length})`}
          </Button>
        </div>
      }
    >
      <div className="grid gap-3 md:grid-cols-3">
        <StatCard icon={pageIcon(view)} label="Visible records" value={String(rows.length)} />
        <StatCard icon={BadgeCheck} label="Synced to Tally" value={String(syncedCount)} />
        <StatCard
          icon={Send}
          label={view === "contacts" || view === "products" ? "Ready to sync" : "Ready to queue"}
          value={String(syncableIds.length)}
        />
      </div>

      <Card className="rounded-md border-border/70 bg-card/95 shadow-sm">
        <CardContent className="grid gap-4 p-4 md:grid-cols-3 xl:grid-cols-4">
          <Field label="Search">
            <Input
              value={searchValue}
              onChange={(event) => setSearchValue(event.target.value)}
              placeholder={searchPlaceholder(view)}
            />
          </Field>
          <Field label="Status">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-9 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {statusOptions(view).map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          {view === "contacts" ? (
            <Field label="Classification">
              <Select value={classificationFilter} onValueChange={setClassificationFilter}>
                <SelectTrigger className="h-9 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All classifications</SelectItem>
                  <SelectItem value="customer">Customer</SelectItem>
                  <SelectItem value="supplier">Supplier</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          ) : null}
        </CardContent>
      </Card>

      <Card className="rounded-md border-border/70 bg-card/95 shadow-sm">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              {view === "contacts" ? (
                <ContactHeader allSelected={allSyncableSelected} someSelected={someSyncableSelected} onToggleAll={toggleAll} />
              ) : view === "products" ? (
                <ProductHeader allSelected={allSyncableSelected} someSelected={someSyncableSelected} onToggleAll={toggleAll} />
              ) : (
                <EntryHeader allSelected={allSyncableSelected} someSelected={someSyncableSelected} onToggleAll={toggleAll} />
              )}
            </TableHeader>
            <TableBody>
              {view === "contacts"
                ? (rows as TallyContactSyncRow[]).map((row) => (
                  <ContactRow
                    key={row.uuid}
                    row={row}
                    selected={selectedIds.has(row.uuid)}
                    selectable={syncableIdSet.has(row.uuid)}
                    onSelectedChange={toggleSelected}
                  />
                ))
                : view === "products"
                  ? (rows as TallyProductSyncRow[]).map((row) => (
                    <ProductRow
                      key={row.uuid}
                      row={row}
                      selected={selectedIds.has(row.uuid)}
                      selectable={syncableIdSet.has(row.uuid)}
                      onSelectedChange={toggleSelected}
                    />
                  ))
                  : (rows as TallyEntrySyncRow[]).map((row) => (
                    <EntryRow
                      key={row.uuid}
                      row={row}
                      view={view}
                      selected={selectedIds.has(row.uuid)}
                      selectable={syncableIdSet.has(row.uuid)}
                      onSelectedChange={toggleSelected}
                    />
                  ))}
            </TableBody>
          </Table>
          {!rows.length ? (
            <MasterListEmptyState>
              {query.isFetching ? "Loading Tally sync rows." : "No rows found for this filter."}
            </MasterListEmptyState>
          ) : null}
        </CardContent>
      </Card>
    </MasterListPageFrame>
  )
}

function ContactHeader({ allSelected, someSelected, onToggleAll }: SelectionHeaderProps) {
  return (
    <TableRow>
      <TableHead className="w-12">
        <Checkbox checked={allSelected ? true : someSelected ? "indeterminate" : false} onCheckedChange={onToggleAll} aria-label="Select all syncable contacts" />
      </TableHead>
      <TableHead>Contact</TableHead>
      <TableHead>Classification</TableHead>
      <TableHead>GSTIN</TableHead>
      <TableHead>Address</TableHead>
      <TableHead>Status</TableHead>
      <TableHead>Last sync</TableHead>
    </TableRow>
  )
}

function ContactRow({ row, selectable, selected, onSelectedChange }: SelectionRowProps<TallyContactSyncRow>) {
  return (
    <TableRow>
      <TableCell>
        <Checkbox
          checked={selected}
          disabled={!selectable}
          onCheckedChange={(checked) => onSelectedChange(row.uuid, checked)}
          aria-label={`Select ${row.name || row.uuid}`}
        />
      </TableCell>
      <TableCell>
        <div className="font-medium">{row.name}</div>
        <div className="text-xs text-muted-foreground">
          {[row.code, row.legal_name].filter(Boolean).join(" - ") || row.uuid}
        </div>
      </TableCell>
      <TableCell>
        <div>{labelize(row.classification)}</div>
        <div className="text-xs text-muted-foreground">{row.tally_group || "-"}</div>
      </TableCell>
      <TableCell>{row.gstin || "-"}</TableCell>
      <TableCell className="max-w-[280px] whitespace-normal">{row.address || "-"}</TableCell>
      <TableCell>
        <StatusBadge status={row.sync_status} synced={row.synced_to_tally} />
      </TableCell>
      <TableCell>
        <div>{formatDate(row.last_synced_at)}</div>
        {row.last_error ? <div className="text-xs text-destructive">{row.last_error}</div> : null}
      </TableCell>
    </TableRow>
  )
}

function ProductHeader({ allSelected, someSelected, onToggleAll }: SelectionHeaderProps) {
  return (
    <TableRow>
      <TableHead className="w-12">
        <Checkbox checked={allSelected ? true : someSelected ? "indeterminate" : false} onCheckedChange={onToggleAll} aria-label="Select all syncable products" />
      </TableHead>
      <TableHead>Product</TableHead>
      <TableHead>Type</TableHead>
      <TableHead>HSN</TableHead>
      <TableHead>Unit</TableHead>
      <TableHead>GST</TableHead>
      <TableHead>Status</TableHead>
      <TableHead>Last sync</TableHead>
    </TableRow>
  )
}

function ProductRow({ row, selectable, selected, onSelectedChange }: SelectionRowProps<TallyProductSyncRow>) {
  return (
    <TableRow>
      <TableCell>
        <Checkbox
          checked={selected}
          disabled={!selectable}
          onCheckedChange={(checked) => onSelectedChange(row.uuid, checked)}
          aria-label={`Select ${row.name || row.uuid}`}
        />
      </TableCell>
      <TableCell>
        <div className="font-medium">{row.name}</div>
        <div className="text-xs text-muted-foreground">{row.code || row.uuid}</div>
      </TableCell>
      <TableCell>{row.product_type || "-"}</TableCell>
      <TableCell>{row.hsn_code || "-"}</TableCell>
      <TableCell>{row.unit || "-"}</TableCell>
      <TableCell>{row.tax_rate || "-"}</TableCell>
      <TableCell>
        <StatusBadge status={row.sync_status} synced={row.synced_to_tally} />
      </TableCell>
      <TableCell>
        <div>{formatDate(row.last_synced_at)}</div>
        {row.last_error ? <div className="text-xs text-destructive">{row.last_error}</div> : null}
      </TableCell>
    </TableRow>
  )
}

function EntryHeader({ allSelected, someSelected, onToggleAll }: SelectionHeaderProps) {
  return (
    <TableRow>
      <TableHead className="w-12">
        <Checkbox checked={allSelected ? true : someSelected ? "indeterminate" : false} onCheckedChange={onToggleAll} aria-label="Select all queueable entries" />
      </TableHead>
      <TableHead>Document</TableHead>
      <TableHead>Party</TableHead>
      <TableHead>Items</TableHead>
      <TableHead>Total</TableHead>
      <TableHead>Prerequisite</TableHead>
      <TableHead>Status</TableHead>
      <TableHead>Last state</TableHead>
    </TableRow>
  )
}

function EntryRow({
  row,
  view,
  selectable,
  selected,
  onSelectedChange,
}: SelectionRowProps<TallyEntrySyncRow> & { view: "sales" | "purchase" }) {
  return (
    <TableRow>
      <TableCell>
        <Checkbox
          checked={selected}
          disabled={!selectable}
          onCheckedChange={(checked) => onSelectedChange(row.uuid, checked)}
          aria-label={`Select ${row.document_no || row.uuid}`}
        />
      </TableCell>
      <TableCell>
        <div className="font-medium">{row.document_no}</div>
        <div className="text-xs text-muted-foreground">
          {formatDate(row.document_date)} - {view === "sales" ? "Sales" : "Purchase"}
        </div>
      </TableCell>
      <TableCell>{row.party_name}</TableCell>
      <TableCell>{row.item_count}</TableCell>
      <TableCell>{formatMoney(row.grand_total)}</TableCell>
      <TableCell>
        <StatusBadge status={row.prerequisite_status} synced={row.prerequisite_status === "ready"} />
        {row.missing_masters.length ? (
          <div className="mt-1 text-xs text-destructive">{row.missing_masters.join(", ")}</div>
        ) : null}
      </TableCell>
      <TableCell>
        <StatusBadge status={row.sync_status} synced={row.synced_to_tally} />
      </TableCell>
      <TableCell>
        <div>{formatDate(row.last_synced_at)}</div>
        {row.last_error ? <div className="text-xs text-destructive">{row.last_error}</div> : null}
      </TableCell>
    </TableRow>
  )
}

function StatusBadge({ status, synced }: { status: string; synced: boolean }) {
  const tone =
    status === "synced" || synced
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : status === "queued" || status === "ready"
        ? "border-blue-200 bg-blue-50 text-blue-700"
        : status === "failed" || status === "missing-masters" || status === "unsupported"
          ? "border-amber-200 bg-amber-50 text-amber-700"
          : "border-border/70 bg-muted/30 text-muted-foreground"

  return (
    <Badge variant="outline" className={cn("h-6 rounded-md px-2 text-[11px]", tone)}>
      {labelize(status)}
    </Badge>
  )
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
}) {
  return (
    <Card className="rounded-md border-border/70 bg-card/95 shadow-sm">
      <CardContent className="flex items-center gap-3 p-4">
        <span className="flex size-10 items-center justify-center rounded-md bg-primary/10 text-primary">
          <Icon className="size-5" />
        </span>
        <span>
          <span className="block text-xs text-muted-foreground">{label}</span>
          <span className="mt-1 block font-semibold text-foreground">{value}</span>
        </span>
      </CardContent>
    </Card>
  )
}

function Field({ children, label }: { children: ReactNode; label: string }) {
  return (
    <div className="grid gap-2">
      <Label>{label}</Label>
      {children}
    </div>
  )
}

function syncableRecordIds(view: TallySyncResource, rows: TallySyncRow[]) {
  return rows
    .filter((row) => {
      if (view === "contacts") return ["not-synced", "failed"].includes((row as TallyContactSyncRow).sync_status)
      if (view === "products") return ["not-synced", "failed"].includes((row as TallyProductSyncRow).sync_status)
      return (row as TallyEntrySyncRow).prerequisite_status === "ready" && ["ready", "failed"].includes((row as TallyEntrySyncRow).sync_status)
    })
    .map((row) => row.uuid)
}

function pageTitle(view: TallySyncView) {
  if (view === "contacts") return "Tally Contact Sync"
  if (view === "products") return "Tally Product Sync"
  if (view === "sales") return "Tally Sales Sync"
  return "Tally Purchase Sync"
}

function pageDescription(view: TallySyncView) {
  if (view === "contacts") return "Sync customer and supplier contacts to Tally ledgers with GST and address details."
  if (view === "products") return "Sync product masters to Tally stock items and keep reusable item status in one place."
  if (view === "sales") return "Check whether each sales invoice already has synced masters before it is queued to Tally."
  return "Check whether each purchase entry already has synced masters before it is queued to Tally."
}

function pageIcon(view: TallySyncView) {
  if (view === "contacts") return UsersRound
  if (view === "products") return PackageSearch
  if (view === "sales") return ReceiptText
  return ShoppingCart
}

function searchPlaceholder(view: TallySyncView) {
  if (view === "contacts") return "Search contact, code, GSTIN, phone, or address"
  if (view === "products") return "Search product, HSN, unit, or GST"
  return "Search document, party, or missing master"
}

function statusOptions(view: TallySyncView) {
  if (view === "contacts" || view === "products") {
    return [
      { value: "all", label: "All statuses" },
      { value: "not-synced", label: "Not synced" },
      { value: "synced", label: "Synced" },
      { value: "failed", label: "Failed" },
      ...(view === "contacts" ? [{ value: "unsupported", label: "Unsupported" }] : []),
    ]
  }

  return [
    { value: "all", label: "All statuses" },
    { value: "ready", label: "Ready" },
    { value: "queued", label: "Queued" },
    { value: "failed", label: "Failed" },
    { value: "missing-masters", label: "Missing masters" },
  ]
}

function syncActionLabel(view: TallySyncView) {
  if (view === "contacts") return "Contact sync completed"
  if (view === "products") return "Product sync completed"
  if (view === "sales") return "Sales export queued"
  return "Purchase export queued"
}

function summarizeResult(view: TallySyncView, summary: Record<string, number>) {
  if (view === "contacts" || view === "products") {
    return `${summary.synced ?? 0} synced, ${summary.failed ?? 0} failed`
  }
  return `${summary.queued ?? 0} queued, ${summary.failed ?? 0} blocked`
}

function formatDate(value: string | null) {
  if (!value) return "-"
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString()
}

function formatMoney(value: number) {
  return new Intl.NumberFormat(undefined, {
    currency: "INR",
    style: "currency",
    maximumFractionDigits: 2,
  }).format(Number(value ?? 0))
}

function labelize(value: string) {
  return value.replace(/[_-]+/g, " ").replace(/\b[a-z]/g, (letter) => letter.toUpperCase())
}
