import { useEffect, useMemo, useState, type ReactNode } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { ArrowLeft, CheckCircle2, Pencil, Plus, RefreshCw, RotateCcw, Save, Trash2, X } from "lucide-react"
import { Badge } from "src/components/ui/badge"
import { Button } from "src/components/ui/button"
import { AnimatedTabs } from "src/components/ui/animated-tabs"
import { Input } from "src/components/ui/input"
import { Label } from "src/components/ui/label"
import { Switch } from "src/components/ui/switch"
import {
  MasterListEmptyState,
  MasterListPageFrame,
  MasterListPaginationCard,
  MasterListRowActions,
  MasterListShowCard,
  MasterListShowLayout,
  MasterListTableCard,
  MasterListToolbarCard,
  MasterListUpsertCard,
  MasterListUpsertLayout,
  buildMasterListShowingLabel,
} from "src/components/blocks/lists/master-list"
import { cn } from "src/lib/utils"
import type { AuthSession } from "src/features/auth/auth-client"
import type { MasterDataColumnDefinition, MasterDataModuleDefinition, MasterDataRecord, MasterDataUpsertInput } from "../../domain/master-data"
import { buildDraft, formatDate, formatValue, isActive, searchRecords, validateDraft } from "../../application/master-data-service"
import { destroyMasterDataRecord, listMasterDataModules, listMasterDataRecords, restoreMasterDataRecord, upsertMasterDataRecord } from "../../infrastructure/master-data-client"

type UpsertState = { record: MasterDataRecord | null; returnTo: "list" | "show" }

export function MasterDataPage({ moduleKey, session }: { moduleKey: string; session: AuthSession }) {
  const queryClient = useQueryClient()
  const [selectedRecord, setSelectedRecord] = useState<MasterDataRecord | null>(null)
  const [upsertState, setUpsertState] = useState<UpsertState | null>(null)
  const [searchValue, setSearchValue] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const modulesQuery = useQuery({ queryKey: ["master-data-modules", "master", session.selectedTenant.slug], queryFn: () => listMasterDataModules(session, "master") })
  const recordsQuery = useQuery({ queryKey: ["master-data-records", session.selectedTenant.slug, moduleKey], queryFn: () => listMasterDataRecords(session, moduleKey) })
  const upsertMutation = useMutation({ mutationFn: (input: MasterDataUpsertInput) => upsertMasterDataRecord(session, moduleKey, input) })
  const destroyMutation = useMutation({ mutationFn: (record: MasterDataRecord) => destroyMasterDataRecord(session, moduleKey, record.uuid) })
  const restoreMutation = useMutation({ mutationFn: (record: MasterDataRecord) => restoreMasterDataRecord(session, moduleKey, record.uuid) })
  const definition = modulesQuery.data?.find((module) => module.key === moduleKey) ?? null
  const records = recordsQuery.data ?? []
  const listColumns = definition ? definition.columns.slice(0, 5) : []
  const filteredRecords = useMemo(() => searchRecords(records, searchValue), [records, searchValue])
  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / rowsPerPage))
  const pageRecords = filteredRecords.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage)
  const isLoading = modulesQuery.isFetching || recordsQuery.isFetching

  useEffect(() => {
    setSelectedRecord((current) => records.find((record) => record.uuid === current?.uuid) ?? null)
  }, [records])

  useEffect(() => {
    const error = modulesQuery.error ?? recordsQuery.error
    if (error) toast.error("Master list failed", { description: error instanceof Error ? error.message : "Unable to load master module." })
  }, [modulesQuery.error, recordsQuery.error])

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: ["master-data-records", session.selectedTenant.slug, moduleKey] })
  }

  async function save(input: MasterDataUpsertInput) {
    const saved = await upsertMutation.mutateAsync(input)
    toast.success(input.uuid ? "Master updated" : "Master created", { description: `${definition?.label ?? "Record"} is ready.` })
    await refresh()
    setUpsertState(null)
    setSelectedRecord(upsertState?.returnTo === "show" ? saved : null)
  }

  async function destroy(record: MasterDataRecord) {
    await destroyMutation.mutateAsync(record)
    toast.error("Master suspended", { description: `${definition?.label ?? "Record"} is hidden until restored.` })
    await refresh()
  }

  async function restore(record: MasterDataRecord) {
    await restoreMutation.mutateAsync(record)
    toast.success("Master restored", { description: `${definition?.label ?? "Record"} is active again.` })
    await refresh()
  }

  if (definition && upsertState) {
    return <MasterDataUpsertPage definition={definition} isSaving={upsertMutation.isPending} record={upsertState.record} onBack={() => setUpsertState(null)} onSubmit={save} />
  }

  if (definition && selectedRecord) {
    return (
      <MasterDataShowPage
        definition={definition}
        record={selectedRecord}
        onBack={() => setSelectedRecord(null)}
        onDestroy={() => void destroy(selectedRecord)}
        onEdit={() => setUpsertState({ record: selectedRecord, returnTo: "show" })}
        onRestore={() => void restore(selectedRecord)}
      />
    )
  }

  return (
    <MasterListPageFrame
      title={definition?.label ?? "Master"}
      description="Tenant master values used across operational workflows and public references."
      technicalName={`page.master.${moduleKey}`}
      action={
        <div className="flex items-center gap-2">
          <Button disabled={isLoading} onClick={() => void recordsQuery.refetch()} type="button" variant="outline" className="h-9 rounded-md"><RefreshCw className={cn("size-4", isLoading && "animate-spin")} />Refresh</Button>
          <Button disabled={!definition} onClick={() => setUpsertState({ record: null, returnTo: "list" })} type="button" className="h-9 rounded-md"><Plus className="size-4" />New</Button>
        </div>
      }
    >
      <MasterListToolbarCard
        searchPlaceholder="Search id, uuid, code, name, description, or status"
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
                <ListHeader>#</ListHeader>
                <ListHeader>UUID</ListHeader>
                {listColumns.map((column) => <ListHeader key={column.key}>{column.label}</ListHeader>)}
                <ListHeader>Status</ListHeader>
                <ListHeader>Updated</ListHeader>
                <ListHeader className="text-right">Action</ListHeader>
              </tr>
            </thead>
            <tbody>
              {pageRecords.map((record, index) => (
                <tr key={record.uuid} className={cn("border-b border-border/70", !isActive(record) && "bg-muted/20 text-muted-foreground")}>
                  <td className="px-4 py-2 text-muted-foreground">{(currentPage - 1) * rowsPerPage + index + 1}</td>
                  <td className="px-4 py-2 font-mono text-xs text-muted-foreground">{record.uuid}</td>
                  {listColumns.map((column) => (
                    <td key={column.key} className="px-4 py-2">
                      {column.key === "name" ? (
                        <button className="cursor-pointer font-medium hover:underline" onClick={() => setSelectedRecord(record)} type="button">
                          {formatValue(record, column)}
                        </button>
                      ) : formatValue(record, column)}
                    </td>
                  ))}
                  <td className="px-4 py-2"><StatusBadge active={isActive(record)} /></td>
                  <td className="px-4 py-2 text-muted-foreground">{formatDate(record.updated_at)}</td>
                  <td className="px-4 py-1.5 text-right">
                    <MasterListRowActions
                      title={String(record.name ?? record.uuid)}
                      isSuspended={!isActive(record)}
                      onDelete={() => void destroy(record)}
                      onEdit={() => setUpsertState({ record, returnTo: "list" })}
                      onRestore={() => void restore(record)}
                      onView={() => setSelectedRecord(record)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {pageRecords.length === 0 ? <MasterListEmptyState>{isLoading ? "Loading records." : "No records found."}</MasterListEmptyState> : null}
      </MasterListTableCard>
      <MasterListPaginationCard
        page={currentPage}
        rowsPerPage={rowsPerPage}
        showingLabel={buildMasterListShowingLabel({ page: currentPage, pageSize: rowsPerPage, totalCount: filteredRecords.length })}
        singularLabel="records"
        totalCount={filteredRecords.length}
        totalPages={totalPages}
        onNextPage={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
        onPageChange={setCurrentPage}
        onPreviousPage={() => setCurrentPage((page) => Math.max(1, page - 1))}
        onRowsPerPageChange={(nextValue) => {
          setRowsPerPage(nextValue)
          setCurrentPage(1)
        }}
      />
    </MasterListPageFrame>
  )
}

function MasterDataShowPage({ definition, onBack, onDestroy, onEdit, onRestore, record }: {
  definition: MasterDataModuleDefinition
  onBack(): void
  onDestroy(): void
  onEdit(): void
  onRestore(): void
  record: MasterDataRecord
}) {
  return (
    <MasterListPageFrame
      title={`${record.uuid} - ${String(record.name ?? definition.label)}`}
      description={`${definition.label} details from the tenant master database.`}
      technicalName={`page.master.${definition.key}.show`}
      action={
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={onBack} type="button" variant="outline" className="h-9 rounded-md"><ArrowLeft className="size-4" />Back</Button>
          <Button onClick={onEdit} type="button" className="h-9 rounded-md"><Pencil className="size-4" />Edit</Button>
          {isActive(record) ? (
            <Button onClick={onDestroy} type="button" variant="destructive" className="h-9 rounded-md"><Trash2 className="size-4" />Suspend</Button>
          ) : (
            <Button onClick={onRestore} type="button" variant="outline" className="h-9 rounded-md"><RotateCcw className="size-4" />Restore</Button>
          )}
        </div>
      }
    >
      <MasterListShowLayout>
        <MasterListShowCard title="Details">
          <DetailTable rows={[["UUID", record.uuid], ...definition.columns.map((column) => [column.label, formatValue(record, column)] as [string, ReactNode]), ["Status", <StatusBadge key="status" active={isActive(record)} />]]} />
        </MasterListShowCard>
        <MasterListShowCard title="Timestamps">
          <DetailTable rows={[["Created", formatDate(record.created_at)], ["Updated", formatDate(record.updated_at)], ["Deleted", formatDate(record.deleted_at)]]} />
        </MasterListShowCard>
      </MasterListShowLayout>
    </MasterListPageFrame>
  )
}

function MasterDataUpsertPage({ definition, isSaving, onBack, onSubmit, record }: {
  definition: MasterDataModuleDefinition
  isSaving: boolean
  onBack(): void
  onSubmit(input: MasterDataUpsertInput): Promise<void>
  record: MasterDataRecord | null
}) {
  const [draft, setDraft] = useState(() => buildDraft(definition, record))

  async function submit() {
    const validationError = validateDraft(definition, draft)
    if (validationError) {
      toast.error(validationError)
      return
    }
    await onSubmit(draft)
  }

  return (
    <MasterListPageFrame
      title={record ? `Edit ${definition.label}` : `New ${definition.label}`}
      description="Save tenant master data into its own module table."
      technicalName={`page.master.${definition.key}.upsert`}
      action={<Button type="button" variant="outline" onClick={onBack} className="h-10 rounded-md px-4"><X className="size-4" />Cancel</Button>}
    >
      <MasterListUpsertLayout>
        <MasterListUpsertCard className="overflow-hidden p-0 [&>div]:p-0">
          <form onSubmit={(event) => { event.preventDefault(); void submit() }}>
            <AnimatedTabs
              className="[&>div:first-child]:rounded-none [&>div:first-child]:border-x-0 [&>div:first-child]:border-t-0 [&>div:first-child]:border-b [&>div:first-child]:border-border/70 [&>div:first-child]:bg-card [&>div:first-child]:px-4 [&>div:first-child]:py-0.5 [&>div:first-child]:shadow-none md:[&>div:first-child]:px-6 [&>div:first-child_button]:min-h-8 [&>div:first-child_button]:py-1 [&>div:last-child]:mx-auto [&>div:last-child]:mt-6 [&>div:last-child]:w-full [&>div:last-child]:px-4 [&>div:last-child]:pb-4 md:[&>div:last-child]:px-6"
              tabs={[{
                value: "details",
                label: "Details",
                content: (
                  <div className="grid gap-x-6 gap-y-5 md:grid-cols-2">
                    {definition.columns.map((column) => <EditorField key={column.key} column={column} draft={draft} setDraft={setDraft} />)}
                    <ActiveField draft={draft} setDraft={setDraft} />
                  </div>
                ),
              }]}
            />
            <div className="flex flex-wrap items-center gap-3 border-t border-border/70 bg-muted/20 px-4 py-4 md:px-6">
              <Button type="submit" disabled={isSaving} className="h-10 rounded-md px-5"><Save className={cn("size-4", isSaving && "animate-spin")} />Save</Button>
              <Button type="button" variant="outline" onClick={onBack} className="h-10 rounded-md px-5"><X className="size-4" />Cancel</Button>
            </div>
          </form>
        </MasterListUpsertCard>
      </MasterListUpsertLayout>
    </MasterListPageFrame>
  )
}

function EditorField({ column, draft, setDraft }: {
  column: MasterDataColumnDefinition
  draft: MasterDataUpsertInput
  setDraft(updater: (current: MasterDataUpsertInput) => MasterDataUpsertInput): void
}) {
  if (column.type === "boolean") {
    return (
      <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-border/70 bg-muted/10 px-4 py-3">
        <span className="text-sm font-medium">{column.label}</span>
        <Switch checked={Boolean(draft[column.key])} onCheckedChange={(checked) => setDraft((current) => ({ ...current, [column.key]: checked }))} />
      </label>
    )
  }

  return (
    <div className="grid gap-2">
      <Label className="text-sm font-medium">{column.label}</Label>
      <Input
        className="h-11 rounded-xl"
        type={column.type === "number" ? "number" : "text"}
        value={String(draft[column.key] ?? "")}
        onChange={(event) => setDraft((current) => ({ ...current, [column.key]: column.type === "number" ? Number(event.target.value || 0) : event.target.value }))}
      />
    </div>
  )
}

function ActiveField({ draft, setDraft }: {
  draft: MasterDataUpsertInput
  setDraft(updater: (current: MasterDataUpsertInput) => MasterDataUpsertInput): void
}) {
  const checked = Boolean(draft.is_active)

  return (
    <label className={cn("flex cursor-pointer items-center justify-between gap-4 rounded-xl border px-4 py-3", checked ? "border-emerald-200 bg-emerald-50 text-emerald-950" : "border-border/70 bg-muted/10")}>
      <span>
        <span className="flex items-center gap-1.5 text-sm font-medium">
          {checked ? <CheckCircle2 className="size-3.5 text-emerald-600" /> : null}
          Active
        </span>
      </span>
      <Switch checked={checked} onCheckedChange={(nextChecked) => setDraft((current) => ({ ...current, is_active: nextChecked }))} />
    </label>
  )
}

function DetailTable({ rows }: { rows: Array<[string, ReactNode]> }) {
  return (
    <div className="-mx-5 -mb-5 -mt-5 overflow-hidden rounded-b-md border-t border-border/70">
      <table className="w-full border-collapse text-sm">
        <tbody>
          {rows.map(([label, value]) => (
            <tr key={label} className="border-b border-border/60 last:border-b-0">
              <th className="w-40 border-r border-border/70 bg-muted/35 px-3 py-2.5 text-left align-top text-xs font-semibold uppercase text-muted-foreground">{label}</th>
              <td className="px-3 py-2.5 align-top font-medium text-foreground">{value || "Not set"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function StatusBadge({ active }: { active: boolean }) {
  return (
    <Badge variant="outline" className={cn("h-6 gap-1 rounded-md px-2 text-[11px]", active ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-700")}>
      {active ? <CheckCircle2 className="size-3" /> : <RotateCcw className="size-3" />}
      {active ? "active" : "suspend"}
    </Badge>
  )
}

function ListHeader({ children, className }: { children: ReactNode; className?: string }) {
  return <th className={cn("border-b border-border/70 px-4 py-3.5 text-left font-medium text-foreground", className)}>{children}</th>
}
