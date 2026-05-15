import { useEffect, useMemo, useState, type Dispatch, type ReactNode, type SetStateAction } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { ArrowLeft, CheckCircle2, Pencil, Plus, RefreshCw, RotateCcw, Save, Trash2, X } from "lucide-react"
import { AnimatedTabs } from "src/components/ui/animated-tabs"
import { Badge } from "src/components/ui/badge"
import { Button } from "src/components/ui/button"
import { Input } from "src/components/ui/input"
import { Label } from "src/components/ui/label"
import { Separator } from "src/components/ui/separator"
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
import {
  destroyIndustry,
  emptyIndustry,
  listIndustries,
  restoreIndustry,
  toIndustryInput,
  upsertIndustry,
  type IndustryRecord,
  type IndustryUpsertInput,
} from "./industry-client"

type IndustryColumnId = "name" | "code" | "features" | "updated" | "status"
type IndustryStatusFilter = "all" | IndustryRecord["status"]
type IndustryTab = "identity" | "payload" | "defaults"
type IndustryUpsertState = { industry: IndustryRecord | null; returnTo: "list" | "show" }

const statusFilters = [
  { id: "all", label: "All industries" },
  { id: "active", label: "Active" },
  { id: "not_active", label: "Not active" },
  { id: "suspend", label: "Suspended" },
]

const defaultColumns: Record<IndustryColumnId, boolean> = {
  name: true,
  code: true,
  features: true,
  updated: true,
  status: true,
}

export function IndustryPage() {
  const queryClient = useQueryClient()
  const [selectedIndustry, setSelectedIndustry] = useState<IndustryRecord | null>(null)
  const [upsertState, setUpsertState] = useState<IndustryUpsertState | null>(null)
  const [searchValue, setSearchValue] = useState("")
  const [statusFilter, setStatusFilter] = useState<IndustryStatusFilter>("all")
  const [currentPage, setCurrentPage] = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [visibleColumns, setVisibleColumns] = useState(defaultColumns)
  const industriesQuery = useQuery({ queryKey: ["industries"], queryFn: () => listIndustries() })
  const upsertMutation = useMutation({ mutationFn: upsertIndustry })
  const destroyMutation = useMutation({ mutationFn: (industry: IndustryRecord) => destroyIndustry(industry.id) })
  const restoreMutation = useMutation({ mutationFn: (industry: IndustryRecord) => restoreIndustry(industry.id) })
  const industries = industriesQuery.data ?? []
  const isLoading = industriesQuery.isFetching

  useEffect(() => {
    if (industriesQuery.error) {
      toast.error("Industry load failed", {
        description: industriesQuery.error instanceof Error ? industriesQuery.error.message : "Unable to load industries.",
      })
    }
  }, [industriesQuery.error])

  useEffect(() => {
    setSelectedIndustry((current) => industries.find((industry) => industry.id === current?.id) ?? null)
  }, [industries])

  const filteredIndustries = useMemo(() => {
    const query = searchValue.trim().toLowerCase()
    return industries.filter((industry) => {
      const matchesStatus = statusFilter === "all" || industry.status === statusFilter
      const target = [industry.code, industry.name, industry.status, industry.default_features, industry.default_ui_settings].join(" ").toLowerCase()
      return matchesStatus && (!query || target.includes(query))
    })
  }, [industries, searchValue, statusFilter])
  const totalPages = Math.max(1, Math.ceil(filteredIndustries.length / rowsPerPage))
  const pageIndustries = filteredIndustries.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage)

  async function saveIndustry(input: IndustryUpsertInput) {
    const industry = await upsertMutation.mutateAsync(input)
    toast.success(input.id ? "Industry updated" : "Industry created", {
      description: `${industry.name} is ready in the master list.`,
    })
    await queryClient.invalidateQueries({ queryKey: ["industries"] })
    setUpsertState(null)
    setSelectedIndustry(upsertState?.returnTo === "show" ? industry : null)
  }

  async function destroy(industry: IndustryRecord) {
    try {
      await destroyMutation.mutateAsync(industry)
      toast.error("Industry suspended", {
        description: `${industry.name} is hidden from active defaults until it is restored.`,
      })
      await queryClient.invalidateQueries({ queryKey: ["industries"] })
    } catch (error) {
      toast.error("Industry suspend failed", {
        description: error instanceof Error ? error.message : "Unable to suspend industry.",
      })
    }
  }

  async function restore(industry: IndustryRecord) {
    try {
      await restoreMutation.mutateAsync(industry)
      toast.success("Industry restored", {
        description: `${industry.name} is active again and available for tenant defaults.`,
      })
      await queryClient.invalidateQueries({ queryKey: ["industries"] })
    } catch (error) {
      toast.error("Industry restore failed", {
        description: error instanceof Error ? error.message : "Unable to restore industry.",
      })
    }
  }

  if (upsertState) {
    return <IndustryUpsertPage industry={upsertState.industry} onBack={() => setUpsertState(null)} onSubmit={saveIndustry} />
  }

  if (selectedIndustry) {
    return (
      <IndustryShowPage
        industry={selectedIndustry}
        onBack={() => setSelectedIndustry(null)}
        onDestroy={() => void destroy(selectedIndustry)}
        onEdit={() => setUpsertState({ industry: selectedIndustry, returnTo: "show" })}
        onRestore={() => void restore(selectedIndustry)}
      />
    )
  }

  return (
    <MasterListPageFrame
      title="Industries"
      description="Master industry records for tenant defaults, feature flags, payload schema, and UI settings."
      technicalName="page.industry.list"
      action={
        <div className="flex items-center gap-2">
          <Button disabled={isLoading} onClick={() => void industriesQuery.refetch()} type="button" variant="outline" className="h-9 rounded-md">
            <RefreshCw className={cn("size-4", isLoading && "animate-spin")} />
            Refresh
          </Button>
          <Button onClick={() => setUpsertState({ industry: null, returnTo: "list" })} type="button" className="h-9 rounded-md">
            <Plus className="size-4" />
            New industry
          </Button>
        </div>
      }
    >
      <MasterListToolbarCard
        columns={(Object.keys(visibleColumns) as IndustryColumnId[]).map((column) => ({
          id: column,
          label: columnLabel(column),
          checked: visibleColumns[column],
          onCheckedChange: (checked) => setVisibleColumns((current) => ({ ...current, [column]: checked })),
        }))}
        filterOptions={statusFilters}
        filterValue={statusFilter}
        onFilterValueChange={(nextValue) => {
          setStatusFilter(nextValue as IndustryStatusFilter)
          setCurrentPage(1)
        }}
        onSearchValueChange={(value) => {
          setSearchValue(value)
          setCurrentPage(1)
        }}
        onShowAllColumns={() => setVisibleColumns(defaultColumns)}
        searchPlaceholder="Search industry, code, features, settings, or status"
        searchValue={searchValue}
      />
      <MasterListTableCard>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] border-collapse text-sm">
            <thead className="bg-muted/50">
              <tr>
                <ListHeader>#</ListHeader>
                {visibleColumns.name ? <ListHeader>Industry</ListHeader> : null}
                {visibleColumns.code ? <ListHeader>Code</ListHeader> : null}
                {visibleColumns.features ? <ListHeader>Features</ListHeader> : null}
                {visibleColumns.updated ? <ListHeader>Updated</ListHeader> : null}
                {visibleColumns.status ? <ListHeader>Status</ListHeader> : null}
                <ListHeader className="text-right">Action</ListHeader>
              </tr>
            </thead>
            <tbody>
              {pageIndustries.map((industry, index) => (
                <tr key={industry.id} className={cn("border-b border-border/70", industry.deleted_at && "bg-muted/20 text-muted-foreground")}>
                  <td className="px-4 py-2 text-muted-foreground">{(currentPage - 1) * rowsPerPage + index + 1}</td>
                  {visibleColumns.name ? (
                    <td className="px-4 py-2">
                      <button className="cursor-pointer font-medium hover:underline" type="button" onClick={() => setSelectedIndustry(industry)}>
                        {industry.name}
                      </button>
                    </td>
                  ) : null}
                  {visibleColumns.code ? <td className="px-4 py-2 font-mono text-xs text-muted-foreground">{industry.code}</td> : null}
                  {visibleColumns.features ? <td className="px-4 py-2 text-muted-foreground">{formatFeatures(industry.default_features)}</td> : null}
                  {visibleColumns.updated ? <td className="px-4 py-2 text-muted-foreground">{formatDate(industry.updated_at)}</td> : null}
                  {visibleColumns.status ? (
                    <td className="px-4 py-2">
                      <IndustryStatusToggle
                        industry={industry}
                        onDestroy={destroy}
                        onRestore={restore}
                      />
                    </td>
                  ) : null}
                  <td className="px-4 py-1.5 text-right">
                    <IndustryActions industry={industry} onDestroy={destroy} onEdit={(item) => setUpsertState({ industry: item, returnTo: "list" })} onRestore={restore} onView={setSelectedIndustry} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {pageIndustries.length === 0 ? (
          <MasterListEmptyState>{isLoading ? "Loading industries from database." : "No industries found."}</MasterListEmptyState>
        ) : null}
      </MasterListTableCard>
      <MasterListPaginationCard
        page={currentPage}
        rowsPerPage={rowsPerPage}
        showingLabel={buildMasterListShowingLabel({ page: currentPage, pageSize: rowsPerPage, totalCount: filteredIndustries.length })}
        singularLabel="industries"
        totalCount={filteredIndustries.length}
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

function IndustryShowPage({ industry, onBack, onDestroy, onEdit, onRestore }: {
  industry: IndustryRecord
  onBack(): void
  onDestroy(): void
  onEdit(): void
  onRestore(): void
}) {
  return (
    <MasterListPageFrame
      title={`${industry.code} - ${industry.name}`}
      description="Industry defaults, schema, and lifecycle details."
      technicalName="page.industry.show"
      action={
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={onBack} type="button" variant="outline" className="h-9 rounded-md"><ArrowLeft className="size-4" />Back</Button>
          <Button onClick={onEdit} type="button" className="h-9 rounded-md"><Pencil className="size-4" />Edit</Button>
          {industry.status === "suspend" ? (
            <Button onClick={onRestore} type="button" variant="outline" className="h-9 rounded-md"><RotateCcw className="size-4" />Restore</Button>
          ) : (
            <Button onClick={onDestroy} type="button" variant="destructive" className="h-9 rounded-md"><Trash2 className="size-4" />Suspend</Button>
          )}
        </div>
      }
    >
      <MasterListShowLayout>
        <div className="space-y-4">
          <MasterListShowCard title="Industry profile">
            <DetailGrid rows={[["Name", industry.name], ["Code", industry.code], ["Status", <StatusBadge key="status" status={industry.status} />], ["Features", formatFeatures(industry.default_features)]]} />
          </MasterListShowCard>
          <MasterListShowCard title="Payload schema">
            <pre className="max-h-80 overflow-auto rounded-md bg-muted/40 p-3 text-xs">{formatJsonText(industry.payload_schema)}</pre>
          </MasterListShowCard>
        </div>
        <div className="space-y-4">
          <MasterListShowCard title="UI settings">
            <pre className="max-h-80 overflow-auto rounded-md bg-muted/40 p-3 text-xs">{formatJsonText(industry.default_ui_settings)}</pre>
          </MasterListShowCard>
          <MasterListShowCard title="Timestamps">
            <DetailGrid rows={[["Created", formatDate(industry.created_at)], ["Updated", formatDate(industry.updated_at)], ["Deleted", formatDate(industry.deleted_at)]]} />
          </MasterListShowCard>
        </div>
      </MasterListShowLayout>
    </MasterListPageFrame>
  )
}

function IndustryUpsertPage({ industry, onBack, onSubmit }: {
  industry: IndustryRecord | null
  onBack(): void
  onSubmit(input: IndustryUpsertInput): Promise<void>
}) {
  const [form, setForm] = useState<IndustryUpsertInput>(emptyIndustry())
  const [tab, setTab] = useState<IndustryTab>("identity")
  const [payloadSchemaText, setPayloadSchemaText] = useState("{}")
  const [uiSettingsText, setUiSettingsText] = useState("{}")
  const [featuresText, setFeaturesText] = useState("company.manage")
  const [isSaving, setIsSaving] = useState(false)
  const isEdit = Boolean(industry)

  useEffect(() => {
    const next = industry ? toIndustryInput(industry) : emptyIndustry()
    setForm(next)
    setPayloadSchemaText(JSON.stringify(next.payload_schema, null, 2))
    setUiSettingsText(JSON.stringify(next.default_ui_settings, null, 2))
    setFeaturesText(next.default_features.join(", "))
    setTab("identity")
  }, [industry])

  async function submit() {
    if (!form.code.trim() || !form.name.trim()) {
      toast.error("Industry code and name are required")
      return
    }

    const payload = parseJson(payloadSchemaText)
    const uiSettings = parseJson(uiSettingsText)
    if (!payload || !uiSettings) {
      toast.error("Payload schema and UI settings must be valid JSON objects")
      return
    }

    setIsSaving(true)
    try {
      await onSubmit({
        ...form,
        code: normalizeCode(form.code),
        payload_schema: payload,
        default_features: featuresText.split(",").map((item) => item.trim()).filter(Boolean),
        default_ui_settings: uiSettings,
      })
    } catch (error) {
      toast.error("Industry save failed", {
        description: error instanceof Error ? error.message : "Unable to save industry.",
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <MasterListPageFrame
      title={isEdit ? "Edit industry" : "New industry"}
      description={isEdit ? "Update industry defaults, schema, and UI settings." : "Create an industry master used by tenant defaults."}
      technicalName="page.industry.upsert"
      action={<Button type="button" variant="outline" onClick={onBack} className="rounded-md"><X className="size-4" />Cancel</Button>}
    >
      <MasterListUpsertLayout>
        <MasterListUpsertCard>
          <form className="space-y-6" onSubmit={(event) => { event.preventDefault(); void submit() }}>
            <AnimatedTabs
              value={tab}
              onValueChange={(value) => setTab(value as IndustryTab)}
              tabs={buildIndustryTabs({ featuresText, form, payloadSchemaText, setFeaturesText, setForm, setPayloadSchemaText, setUiSettingsText, uiSettingsText })}
            />
            <Separator />
            <div className="flex flex-wrap items-center gap-3">
              <Button type="submit" disabled={isSaving} className="rounded-md"><Save className={cn("size-4", isSaving && "animate-spin")} />{isEdit ? "Update industry" : "Create industry"}</Button>
              <Button type="button" variant="outline" onClick={onBack} className="rounded-md"><X className="size-4" />Cancel</Button>
            </div>
          </form>
        </MasterListUpsertCard>
      </MasterListUpsertLayout>
    </MasterListPageFrame>
  )
}

function buildIndustryTabs({
  featuresText,
  form,
  payloadSchemaText,
  setFeaturesText,
  setForm,
  setPayloadSchemaText,
  setUiSettingsText,
  uiSettingsText,
}: {
  featuresText: string
  form: IndustryUpsertInput
  payloadSchemaText: string
  setFeaturesText(value: string): void
  setForm: Dispatch<SetStateAction<IndustryUpsertInput>>
  setPayloadSchemaText(value: string): void
  setUiSettingsText(value: string): void
  uiSettingsText: string
}) {
  return [
    {
      value: "identity",
      label: "Details",
      content: (
        <div className="space-y-6 rounded-2xl border border-border/70 bg-card/80 p-4 shadow-sm md:p-6">
          <div className="grid gap-x-6 gap-y-5 md:grid-cols-2">
            <TextField label="Industry code" value={form.code} inputClassName="font-mono lowercase" onChange={(value) => setField(setForm, "code", normalizeCode(value))} />
            <TextField label="Industry name" value={form.name} onChange={(value) => setField(setForm, "name", value)} />
            <SwitchRow
              checked={form.status === "active"}
              label="Active"
              description="Active industries are available for tenant defaults."
              onChange={(checked) => setField(setForm, "status", checked ? "active" : "suspend")}
            />
          </div>
        </div>
      ),
    },
    {
      value: "payload",
      label: "Payload",
      content: (
        <div className="rounded-2xl border border-border/70 bg-card/80 p-4 shadow-sm md:p-6">
          <FieldShell label="Payload schema JSON">
            <textarea className="min-h-64 rounded-xl border border-border/70 bg-background p-3 font-mono text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" value={payloadSchemaText} onChange={(event) => setPayloadSchemaText(event.target.value)} />
          </FieldShell>
        </div>
      ),
    },
    {
      value: "defaults",
      label: "Defaults",
      content: (
        <div className="space-y-5 rounded-2xl border border-border/70 bg-card/80 p-4 shadow-sm md:p-6">
          <TextField label="Default features" value={featuresText} onChange={setFeaturesText} />
          <FieldShell label="Default UI settings JSON">
            <textarea className="min-h-48 rounded-xl border border-border/70 bg-background p-3 font-mono text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" value={uiSettingsText} onChange={(event) => setUiSettingsText(event.target.value)} />
          </FieldShell>
        </div>
      ),
    },
  ] as const
}

function IndustryActions({ industry, onDestroy, onEdit, onRestore, onView }: {
  industry: IndustryRecord
  onDestroy(industry: IndustryRecord): void
  onEdit(industry: IndustryRecord): void
  onRestore(industry: IndustryRecord): void
  onView(industry: IndustryRecord): void
}) {
  return (
    <MasterListRowActions
      title={industry.name}
      isSuspended={industry.status === "suspend"}
      onDelete={() => onDestroy(industry)}
      onEdit={() => onEdit(industry)}
      onRestore={() => onRestore(industry)}
      onView={() => onView(industry)}
    />
  )
}

function ListHeader({ children, className }: { children: ReactNode; className?: string }) {
  return <th className={cn("border-b border-border/70 px-4 py-3.5 text-left font-medium text-foreground", className)}>{children}</th>
}

function StatusBadge({ status }: { status: IndustryRecord["status"] }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "h-6 gap-1 rounded-md px-2 text-[11px]",
        status === "active" && "border-emerald-200 bg-emerald-50 text-emerald-700",
        status === "suspend" && "border-amber-200 bg-amber-50 text-amber-700",
        status === "not_active" && "border-slate-200 bg-slate-50 text-slate-600",
      )}
    >
      {status === "active" ? <CheckCircle2 className="size-3" /> : null}
      {status.replace("_", " ")}
    </Badge>
  )
}

function IndustryStatusToggle({
  industry,
  onDestroy,
  onRestore,
}: {
  industry: IndustryRecord
  onDestroy(industry: IndustryRecord): void
  onRestore(industry: IndustryRecord): void
}) {
  const active = industry.status === "active"
  const suspended = industry.status === "suspend"

  return (
    <Button
      aria-label={suspended ? `Restore ${industry.name}` : `Suspend ${industry.name}`}
      className={cn(
        "h-6 rounded-md border px-2 text-[11px] font-medium shadow-none",
        active && "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100",
        suspended && "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100",
        industry.status === "not_active" && "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100",
      )}
      onClick={() => suspended ? onRestore(industry) : onDestroy(industry)}
      title={suspended ? "Suspended. Click to restore this industry." : "Click to suspend this industry."}
      type="button"
      variant="outline"
    >
      {active ? <CheckCircle2 className="size-3" /> : suspended ? <RotateCcw className="size-3" /> : null}
      {suspended ? "Restore" : industry.status.replace("_", " ")}
    </Button>
  )
}

function FieldShell({ children, className, label }: { children: ReactNode; className?: string; label: string }) {
  return <div className={cn("grid gap-2", className)}><Label className="text-sm font-medium">{label}</Label>{children}</div>
}

function TextField({ inputClassName, label, onChange, value }: { inputClassName?: string; label: string; value: string | number | null; onChange(value: string): void }) {
  return <FieldShell label={label}><Input className={cn("h-11 rounded-xl", inputClassName)} value={value ?? ""} onChange={(event) => onChange(event.target.value)} /></FieldShell>
}

function SwitchRow({
  checked,
  description,
  label,
  onChange,
}: {
  checked: boolean
  description: string
  label: string
  onChange(checked: boolean): void
}) {
  return (
    <label className={cn("flex cursor-pointer items-center justify-between gap-4 rounded-xl border px-4 py-3", checked ? "border-emerald-200 bg-emerald-50 text-emerald-950" : "border-border/70 bg-muted/10")}>
      <span>
        <span className="flex items-center gap-1.5 text-sm font-medium">
          {checked ? <CheckCircle2 className="size-3.5 text-emerald-600" /> : null}
          {label}
        </span>
        <span className={cn("block text-xs", checked ? "text-emerald-700" : "text-muted-foreground")}>{description}</span>
      </span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </label>
  )
}

function DetailGrid({ rows }: { rows: Array<[string, ReactNode]> }) {
  return (
    <dl className="grid gap-3 sm:grid-cols-2">
      {rows.map(([label, value]) => (
        <div key={label} className="rounded-md bg-muted/30 px-3 py-2">
          <dt className="text-xs text-muted-foreground">{label}</dt>
          <dd className="mt-1 text-sm font-medium text-foreground">{value || "Not set"}</dd>
        </div>
      ))}
    </dl>
  )
}

function setField<K extends keyof IndustryUpsertInput>(setForm: Dispatch<SetStateAction<IndustryUpsertInput>>, key: K, value: IndustryUpsertInput[K]) {
  setForm((current) => ({ ...current, [key]: value }))
}

function columnLabel(column: IndustryColumnId) {
  return ({ code: "Code", features: "Features", name: "Industry", status: "Status", updated: "Updated" } satisfies Record<IndustryColumnId, string>)[column]
}

function normalizeCode(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9_]+/g, "_").replace(/^_+|_+$/g, "")
}

function formatDate(value: string | null) {
  return value ? new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "-"
}

function formatJsonText(value: string) {
  try {
    return JSON.stringify(JSON.parse(value), null, 2)
  } catch {
    return value || "{}"
  }
}

function formatFeatures(value: string) {
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed.join(", ") : value
  } catch {
    return value
  }
}

function parseJson(value: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(value)
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : null
  } catch {
    return null
  }
}
