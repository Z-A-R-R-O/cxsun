import { useEffect, useMemo, useState, type ReactNode } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { ArrowLeft, CheckCircle2, Pencil, Plus, RefreshCw, RotateCcw, Save, Trash2, X } from "lucide-react"
import { AnimatedTabs } from "src/components/ui/animated-tabs"
import { Badge } from "src/components/ui/badge"
import { Button } from "src/components/ui/button"
import { Input } from "src/components/ui/input"
import { Label } from "src/components/ui/label"
import { Switch } from "src/components/ui/switch"
import { Textarea } from "src/components/ui/textarea"
import {
  MasterListEmptyState,
  MasterListPageFrame,
  MasterListPaginationCard,
  MasterListRowActions,
  MasterListShowCard,
  MasterListTableCard,
  MasterListToolbarCard,
  MasterListUpsertCard,
  MasterListUpsertLayout,
  buildMasterListShowingLabel,
} from "src/components/blocks/lists/master-list"
import { cn } from "src/lib/utils"
import type { AuthSession } from "src/features/auth/auth-client"
import type { MasterDataRecord, MasterDataUpsertInput } from "src/features/master-data/domain/master-data"
import { formatDate, isActive, searchRecords } from "src/features/master-data/application/master-data-service"
import { destroyMasterDataRecord, listMasterDataRecords, restoreMasterDataRecord, upsertMasterDataRecord } from "src/features/master-data/infrastructure/master-data-client"
import { CommonRecordAutocompleteLookup, getCommonRecordName } from "src/features/master-data/interface/components/common-record-autocomplete-lookup"

type ProductView = { mode: "list" } | { mode: "show"; product: MasterDataRecord } | { mode: "upsert"; product: MasterDataRecord | null }
type ProductColumnId = "name" | "code" | "hsn_code_id" | "unit_id" | "tax_id" | "description" | "updated"

const productColumnCatalog: Array<{ id: ProductColumnId; label: string }> = [
  { id: "name", label: "Name" },
  { id: "code", label: "Code" },
  { id: "hsn_code_id", label: "HSN Code" },
  { id: "unit_id", label: "Unit" },
  { id: "tax_id", label: "Tax" },
  { id: "description", label: "Description" },
  { id: "updated", label: "Updated" },
]

const defaultProductColumnVisibility: Record<ProductColumnId, boolean> = {
  code: true,
  description: false,
  hsn_code_id: true,
  name: true,
  tax_id: true,
  unit_id: true,
  updated: true,
}

const productStatusFilters = [
  { id: "all", label: "All products" },
  { id: "active", label: "active" },
  { id: "suspend", label: "suspend" },
]

export function ProductPage({ session }: { session: AuthSession }) {
  const queryClient = useQueryClient()
  const [view, setView] = useState<ProductView>({ mode: "list" })
  const [searchValue, setSearchValue] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [visibleColumns, setVisibleColumns] = useState(defaultProductColumnVisibility)
  const [currentPage, setCurrentPage] = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const queryKey = ["master-data-records", session.selectedTenant.slug, "products"]
  const productsQuery = useQuery({ queryKey, queryFn: () => listMasterDataRecords(session, "products") })
  const upsertMutation = useMutation({ mutationFn: (input: MasterDataUpsertInput) => upsertMasterDataRecord(session, "products", input) })
  const destroyMutation = useMutation({ mutationFn: (record: MasterDataRecord) => destroyMasterDataRecord(session, "products", record.uuid) })
  const restoreMutation = useMutation({ mutationFn: (record: MasterDataRecord) => restoreMasterDataRecord(session, "products", record.uuid) })
  const references = useProductReferences(session)
  const products = productsQuery.data ?? []
  const filteredProducts = useMemo(() => filterProducts(searchRecords(products, searchValue), statusFilter), [products, searchValue, statusFilter])
  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / rowsPerPage))
  const pageProducts = filteredProducts.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage)

  useEffect(() => {
    if (productsQuery.error) toast.error("Product list failed", { description: productsQuery.error instanceof Error ? productsQuery.error.message : "Unable to load products." })
  }, [productsQuery.error])

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey })
  }

  async function save(input: MasterDataUpsertInput) {
    const saved = await upsertMutation.mutateAsync(input)
    toast.success(input.uuid ? "Product updated" : "Product created", { description: String(saved.name ?? "Product") })
    await refresh()
    setView({ mode: "show", product: saved })
  }

  async function destroy(record: MasterDataRecord) {
    await destroyMutation.mutateAsync(record)
    toast.error("Product suspended", { description: String(record.name ?? "Product") })
    await refresh()
  }

  async function restore(record: MasterDataRecord) {
    await restoreMutation.mutateAsync(record)
    toast.success("Product restored", { description: String(record.name ?? "Product") })
    await refresh()
  }

  if (view.mode === "upsert") {
    return <ProductUpsertPage isSaving={upsertMutation.isPending} product={view.product} session={session} onBack={() => setView(view.product ? { mode: "show", product: view.product } : { mode: "list" })} onSubmit={save} />
  }

  if (view.mode === "show") {
    const product = products.find((item) => item.uuid === view.product.uuid) ?? view.product
    return <ProductShowPage product={product} references={references} onBack={() => setView({ mode: "list" })} onDestroy={() => void destroy(product)} onEdit={() => setView({ mode: "upsert", product })} onRestore={() => void restore(product)} />
  }

  return (
    <MasterListPageFrame
      title="Products"
      description="Tenant master values used across operational workflows and public references."
      technicalName="page.master.products"
      action={<div className="flex items-center gap-2"><Button disabled={productsQuery.isFetching} onClick={() => void productsQuery.refetch()} type="button" variant="outline" className="h-9 rounded-md"><RefreshCw className={cn("size-4", productsQuery.isFetching && "animate-spin")} />Refresh</Button><Button onClick={() => setView({ mode: "upsert", product: null })} type="button" className="h-9 rounded-md"><Plus className="size-4" />New</Button></div>}
    >
      <MasterListToolbarCard
        columns={productColumnCatalog.map((column) => ({
          id: column.id,
          label: column.label,
          checked: visibleColumns[column.id],
          disabled: column.id === "name",
          onCheckedChange: (checked) => setVisibleColumns((current) => ({ ...current, [column.id]: checked })),
        }))}
        filterOptions={productStatusFilters}
        filterValue={statusFilter}
        onFilterValueChange={(value) => {
          setStatusFilter(value)
          setCurrentPage(1)
        }}
        onShowAllColumns={() => setVisibleColumns(defaultProductColumnVisibility)}
        searchPlaceholder="Search name, code, description, or status"
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
                {visibleColumns.name ? <ListHeader>Name</ListHeader> : null}
                {visibleColumns.code ? <ListHeader>Code</ListHeader> : null}
                {visibleColumns.hsn_code_id ? <ListHeader>HSN Code</ListHeader> : null}
                {visibleColumns.unit_id ? <ListHeader>Unit</ListHeader> : null}
                {visibleColumns.tax_id ? <ListHeader>Tax</ListHeader> : null}
                {visibleColumns.description ? <ListHeader>Description</ListHeader> : null}
                <ListHeader>Status</ListHeader>
                {visibleColumns.updated ? <ListHeader>Updated</ListHeader> : null}
                <ListHeader className="text-right">Action</ListHeader>
              </tr>
            </thead>
            <tbody>
              {pageProducts.map((product, index) => (
                <tr key={product.uuid} className={cn("border-b border-border/70", !isActive(product) && "bg-muted/20 text-muted-foreground")}>
                  <td className="px-4 py-2 text-muted-foreground">{(currentPage - 1) * rowsPerPage + index + 1}</td>
                  {visibleColumns.name ? <td className="px-4 py-2"><button className="font-medium hover:underline" onClick={() => setView({ mode: "show", product })} type="button">{product.name ? String(product.name) : "-"}</button></td> : null}
                  {visibleColumns.code ? <td className="px-4 py-2">{product.code ? String(product.code) : "-"}</td> : null}
                  {visibleColumns.hsn_code_id ? <td className="px-4 py-2">{references.hsnCodes(product.hsn_code_id)}</td> : null}
                  {visibleColumns.unit_id ? <td className="px-4 py-2">{references.units(product.unit_id)}</td> : null}
                  {visibleColumns.tax_id ? <td className="px-4 py-2">{references.taxes(product.tax_id)}</td> : null}
                  {visibleColumns.description ? <td className="px-4 py-2">{product.description ? String(product.description) : "-"}</td> : null}
                  <td className="px-4 py-2"><StatusBadge active={isActive(product)} /></td>
                  {visibleColumns.updated ? <td className="px-4 py-2 text-muted-foreground">{formatDate(product.updated_at)}</td> : null}
                  <td className="px-4 py-1.5 text-right"><MasterListRowActions title={String(product.name ?? product.uuid)} isSuspended={!isActive(product)} onDelete={() => void destroy(product)} onEdit={() => setView({ mode: "upsert", product })} onRestore={() => void restore(product)} onView={() => setView({ mode: "show", product })} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {pageProducts.length === 0 ? <MasterListEmptyState>{productsQuery.isFetching ? "Loading products." : "No products found."}</MasterListEmptyState> : null}
      </MasterListTableCard>
      <MasterListPaginationCard page={currentPage} rowsPerPage={rowsPerPage} showingLabel={buildMasterListShowingLabel({ page: currentPage, pageSize: rowsPerPage, totalCount: filteredProducts.length })} singularLabel="products" totalCount={filteredProducts.length} totalPages={totalPages} onNextPage={() => setCurrentPage((page) => Math.min(totalPages, page + 1))} onPageChange={setCurrentPage} onPreviousPage={() => setCurrentPage((page) => Math.max(1, page - 1))} onRowsPerPageChange={(value) => { setRowsPerPage(value); setCurrentPage(1) }} />
    </MasterListPageFrame>
  )
}

function ProductShowPage({ onBack, onDestroy, onEdit, onRestore, product, references }: { onBack(): void; onDestroy(): void; onEdit(): void; onRestore(): void; product: MasterDataRecord; references: ProductReferenceLabels }) {
  return (
    <MasterListPageFrame title={[product.code, product.name ?? "Product"].map((value) => String(value)).filter(Boolean).join(" - ")} description="Products details from the tenant master database." technicalName="page.master.products.show" action={<div className="flex flex-wrap items-center gap-2"><Button onClick={onBack} type="button" variant="outline" className="h-9 rounded-md"><ArrowLeft className="size-4" />Back</Button><Button onClick={onEdit} type="button" className="h-9 rounded-md"><Pencil className="size-4" />Edit</Button>{isActive(product) ? <Button onClick={onDestroy} type="button" variant="destructive" className="h-9 rounded-md"><Trash2 className="size-4" />Suspend</Button> : <Button onClick={onRestore} type="button" variant="outline" className="h-9 rounded-md"><RotateCcw className="size-4" />Restore</Button>}</div>}>
      <div className="grid gap-4">
        <ProductShowCard title="Details">
          <DetailTable rows={[["Name", text(product.name)], ["Code", text(product.code)], ["Category", references.productCategories(product.product_category_id)], ["Product Type", references.productTypes(product.product_type_id)], ["HSN Code", references.hsnCodes(product.hsn_code_id)], ["Unit", references.units(product.unit_id)], ["Tax", references.taxes(product.tax_id)], ["Description", text(product.description)], ["Status", <StatusBadge key="status" active={isActive(product)} />]]} />
        </ProductShowCard>
        <ProductShowCard title="Timestamps">
          <DetailTable rows={[["Created", formatDate(product.created_at)], ["Updated", formatDate(product.updated_at)], ["Deleted", formatDate(product.deleted_at)]]} />
        </ProductShowCard>
      </div>
    </MasterListPageFrame>
  )
}

function ProductUpsertPage({ isSaving, onBack, onSubmit, product, session }: { isSaving: boolean; onBack(): void; onSubmit(input: MasterDataUpsertInput): Promise<void>; product: MasterDataRecord | null; session: AuthSession }) {
  const [draft, setDraft] = useState<MasterDataUpsertInput>(() => ({
    code: product?.code ?? "",
    description: product?.description ?? "",
    hsn_code_id: product?.hsn_code_id ?? "",
    id: product?.id,
    is_active: product ? isActive(product) : true,
    name: product?.name ?? "",
    product_category_id: product?.product_category_id ?? "",
    product_type_id: product?.product_type_id ?? "",
    tax_id: product?.tax_id ?? "",
    unit_id: product?.unit_id ?? "",
    uuid: product?.uuid,
  }))

  async function submit() {
    if (!String(draft.name ?? "").trim()) {
      toast.error("Name is required.")
      return
    }
    await onSubmit(draft)
  }

  return (
    <MasterListPageFrame title={product ? "Edit Product" : "New Product"} description="Save tenant product master data with product-specific fields." technicalName="page.master.products.upsert" action={<Button type="button" variant="outline" onClick={onBack} className="h-10 rounded-md px-4"><X className="size-4" />Cancel</Button>}>
      <MasterListUpsertLayout>
        <MasterListUpsertCard className="overflow-hidden p-0 [&>div]:p-0">
          <form onSubmit={(event) => { event.preventDefault(); void submit() }}>
            <AnimatedTabs className="[&>div:first-child]:rounded-none [&>div:first-child]:border-x-0 [&>div:first-child]:border-t-0 [&>div:first-child]:border-b [&>div:first-child]:border-border/70 [&>div:first-child]:bg-card [&>div:first-child]:px-4 [&>div:first-child]:py-0.5 [&>div:first-child]:shadow-none md:[&>div:first-child]:px-6 [&>div:first-child_button]:min-h-8 [&>div:first-child_button]:py-1 [&>div:last-child]:mx-auto [&>div:last-child]:mt-6 [&>div:last-child]:w-full [&>div:last-child]:px-4 [&>div:last-child]:pb-4 md:[&>div:last-child]:px-6" tabs={[{ value: "details", label: "Details", content: (
              <div className="grid gap-x-6 gap-y-5 md:grid-cols-2">
                <Field label="Name *" value={String(draft.name ?? "")} onChange={(value) => setDraft((current) => ({ ...current, name: value }))} />
                <Field label="Code" value={String(draft.code ?? "")} onChange={(value) => setDraft((current) => ({ ...current, code: value.toUpperCase() }))} />
                <CommonRecordAutocompleteLookup allowCreate label="Category" moduleKey="productCategories" session={session} value={draft.product_category_id} onChange={(value) => setDraft((current) => ({ ...current, product_category_id: value }))} />
                <CommonRecordAutocompleteLookup allowCreate label="Product Type" moduleKey="productTypes" session={session} value={draft.product_type_id} onChange={(value) => setDraft((current) => ({ ...current, product_type_id: value }))} />
                <CommonRecordAutocompleteLookup allowCreate label="HSN Code" moduleKey="hsnCodes" session={session} value={draft.hsn_code_id} onChange={(value) => setDraft((current) => ({ ...current, hsn_code_id: value }))} />
                <CommonRecordAutocompleteLookup allowCreate label="Unit" moduleKey="units" session={session} value={draft.unit_id} onChange={(value) => setDraft((current) => ({ ...current, unit_id: value }))} />
                <CommonRecordAutocompleteLookup allowCreate label="Tax" moduleKey="taxes" session={session} value={draft.tax_id} onChange={(value) => setDraft((current) => ({ ...current, tax_id: value }))} />
                <ActiveField checked={Boolean(draft.is_active)} onChange={(checked) => setDraft((current) => ({ ...current, is_active: checked }))} />
                <div className="grid gap-2 md:col-span-2"><Label className="text-sm font-medium">Description</Label><Textarea className="min-h-28 rounded-xl" value={String(draft.description ?? "")} onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))} /></div>
              </div>
            ) }]} />
            <div className="flex flex-wrap items-center gap-3 border-t border-border/70 bg-muted/20 px-4 py-4 md:px-6"><Button type="submit" disabled={isSaving} className="h-10 rounded-md px-5"><Save className={cn("size-4", isSaving && "animate-spin")} />Save</Button><Button type="button" variant="outline" onClick={onBack} className="h-10 rounded-md px-5"><X className="size-4" />Cancel</Button></div>
          </form>
        </MasterListUpsertCard>
      </MasterListUpsertLayout>
    </MasterListPageFrame>
  )
}

function useProductReferences(session: AuthSession): ProductReferenceLabels {
  const modules = ["hsnCodes", "productCategories", "productTypes", "taxes", "units"] as const
  const queries = modules.map((moduleKey) => useQuery({ queryKey: ["product-reference-labels", session.selectedTenant.slug, moduleKey], queryFn: () => listMasterDataRecords(session, moduleKey) }))
  const maps = Object.fromEntries(modules.map((moduleKey, index) => [moduleKey, buildLabelMap(queries[index].data ?? [])])) as Record<(typeof modules)[number], Map<string, string>>

  return {
    hsnCodes: (value) => labelFrom(maps.hsnCodes, value),
    productCategories: (value) => labelFrom(maps.productCategories, value),
    productTypes: (value) => labelFrom(maps.productTypes, value),
    taxes: (value) => labelFrom(maps.taxes, value),
    units: (value) => labelFrom(maps.units, value),
  }
}

interface ProductReferenceLabels {
  hsnCodes(value: unknown): string
  productCategories(value: unknown): string
  productTypes(value: unknown): string
  taxes(value: unknown): string
  units(value: unknown): string
}

function buildLabelMap(records: MasterDataRecord[]) {
  const map = new Map<string, string>()
  for (const record of records) {
    const label = getCommonRecordName(record)
    for (const key of [record.id, record.uuid, record.code, record.name]) {
      if (key !== null && key !== undefined && key !== "") map.set(String(key), label)
    }
  }
  return map
}

function labelFrom(map: ReadonlyMap<string, string>, value: unknown) {
  if (value === null || value === undefined || value === "") return "-"
  return map.get(String(value)) ?? String(value)
}

function text(value: unknown) {
  return value === null || value === undefined || value === "" ? "" : String(value)
}

function filterProducts(records: MasterDataRecord[], statusFilter: string) {
  if (statusFilter === "active") return records.filter((record) => isActive(record))
  if (statusFilter === "suspend") return records.filter((record) => !isActive(record))
  return records
}

function Field({ label, onChange, value }: { label: string; onChange(value: string): void; value: string }) {
  return <div className="grid gap-2"><Label className="text-sm font-medium">{label}</Label><Input className="h-11 rounded-xl" value={value} onChange={(event) => onChange(event.target.value)} /></div>
}

function ActiveField({ checked, onChange }: { checked: boolean; onChange(checked: boolean): void }) {
  return <label className={cn("flex cursor-pointer items-center justify-between gap-4 rounded-xl border px-4 py-3", checked ? "border-emerald-200 bg-emerald-50 text-emerald-950" : "border-border/70 bg-muted/10")}><span className="flex items-center gap-1.5 text-sm font-medium">{checked ? <CheckCircle2 className="size-3.5 text-emerald-600" /> : null}Active</span><Switch checked={checked} onCheckedChange={onChange} /></label>
}

function ProductShowCard({ children, title }: { children: ReactNode; title: string }) {
  return <MasterListShowCard title={title} className="gap-0 py-0 [&>div:first-child]:px-4 [&>div:first-child]:py-3">{children}</MasterListShowCard>
}

function DetailTable({ rows }: { rows: Array<[string, ReactNode]> }) {
  return <div className="-mx-5 -mb-5 -mt-5 overflow-hidden rounded-b-md border-t border-border/70"><table className="w-full border-collapse text-sm"><tbody>{rows.map(([label, value]) => <tr key={label} className="border-b border-border/60 last:border-b-0"><th className="w-40 border-r border-border/70 bg-muted/35 px-3 py-2.5 text-left align-top text-xs font-semibold uppercase text-muted-foreground">{label}</th><td className="px-3 py-2.5 align-top font-medium text-foreground">{value || "Not set"}</td></tr>)}</tbody></table></div>
}

function StatusBadge({ active }: { active: boolean }) {
  return <Badge variant="outline" className={cn("h-6 gap-1 rounded-md px-2 text-[11px]", active ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-700")}>{active ? <CheckCircle2 className="size-3" /> : <RotateCcw className="size-3" />}{active ? "active" : "suspend"}</Badge>
}

function ListHeader({ children, className }: { children: ReactNode; className?: string }) {
  return <th className={cn("border-b border-border/70 px-4 py-3.5 text-left font-medium text-foreground", className)}>{children}</th>
}
