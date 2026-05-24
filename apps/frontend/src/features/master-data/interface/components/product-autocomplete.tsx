import { useEffect, useMemo, useState, type Ref } from "react"
import { createPortal } from "react-dom"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Check, Plus, Save, X } from "lucide-react"
import { toast } from "sonner"
import { Button } from "src/components/ui/button"
import { Input } from "src/components/ui/input"
import { Label } from "src/components/ui/label"
import { Textarea } from "src/components/ui/textarea"
import { cn } from "src/lib/utils"
import type { AuthSession } from "src/features/auth/auth-client"
import type { MasterDataRecord, MasterDataUpsertInput } from "src/features/master-data/domain/master-data"
import { listMasterDataRecords, upsertMasterDataRecord } from "src/features/master-data/infrastructure/master-data-client"
import { CommonRecordAutocompleteLookup } from "./common-record-autocomplete-lookup"

type ProductAutocompleteProps = {
  className?: string
  inputRef?: Ref<HTMLInputElement>
  label?: string
  onChange(value: string, record?: MasterDataRecord | null): void
  placeholder?: string
  session: AuthSession
  value: string
}

type ProductDraft = {
  brand_id: number | null
  code: string
  colour_id: number | null
  description: string
  hsn_code_id: number | null
  name: string
  product_category_id: number | null
  product_group_id: number | null
  product_type_id: number | null
  size_id: number | null
  style_id: number | null
  tax_id: number | null
  unit_id: number | null
}

export type ProductCommonLookup = {
  code?: string
  hsnCode?: string
  id: string
  label: string
  record: MasterDataRecord
  taxRate?: number
  unit?: string
}

export function ProductAutocomplete({ className, inputRef, label = "Product name", onChange, placeholder = "", session, value }: ProductAutocompleteProps) {
  const queryClient = useQueryClient()
  const [activeIndex, setActiveIndex] = useState(0)
  const [createInitialValue, setCreateInitialValue] = useState<string | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState(value)
  const queryKey = productLookupQueryKey(session)
  const recordsQuery = useQuery({ queryKey, queryFn: () => listMasterDataRecords(session, "products") })
  const records = recordsQuery.data ?? []
  const normalizedQuery = query.trim().toLowerCase()
  const filteredRecords = useMemo(() => {
    if (!normalizedQuery) return records.slice(0, 12)
    return records
      .filter((record) => [productRecordLabel(record), productRecordName(record), record.code].filter(Boolean).some((field) => String(field).toLowerCase().includes(normalizedQuery)))
      .slice(0, 12)
  }, [normalizedQuery, records])
  const exactRecord = records.find((record) => [productRecordLabel(record), productRecordName(record), record.code].some((field) => String(field ?? "").trim().toLowerCase() === normalizedQuery))

  useEffect(() => {
    if (!isOpen) setQuery(value)
  }, [isOpen, value])

  function selectRecord(record: MasterDataRecord) {
    const nextValue = productRecordName(record)
    setQuery(nextValue)
    onChange(nextValue, record)
    setIsOpen(false)
  }

  function openCreateDialog(initialValue = query) {
    setCreateInitialValue(initialValue.trim())
    setIsOpen(false)
  }

  return (
    <div className={cn("relative z-10 grid w-full gap-2 focus-within:z-[90]", className)}>
      <Label className="text-sm font-medium text-muted-foreground">{label}</Label>
      <Input
        role="combobox"
        ref={inputRef}
        className="h-11 w-full rounded-md bg-background"
        placeholder={placeholder}
        value={query}
        onBlur={() => {
          if (exactRecord) {
            selectRecord(exactRecord)
            return
          }
          window.setTimeout(() => { setIsOpen(false); setQuery(value) }, 120)
        }}
        onChange={(event) => {
          setQuery(event.target.value)
          setIsOpen(true)
          setActiveIndex(0)
          onChange(event.target.value, null)
        }}
        onFocus={() => setIsOpen(true)}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") { event.preventDefault(); setIsOpen(true); setActiveIndex((current) => filteredRecords.length ? (current + 1) % filteredRecords.length : 0) }
          if (event.key === "ArrowUp") { event.preventDefault(); setIsOpen(true); setActiveIndex((current) => filteredRecords.length ? (current - 1 + filteredRecords.length) % filteredRecords.length : 0) }
          if (event.key === "Enter") {
            event.preventDefault()
            if (filteredRecords[activeIndex]) selectRecord(filteredRecords[activeIndex])
            else if (query.trim()) openCreateDialog(query)
          }
          if (event.key === "Escape") { event.preventDefault(); setIsOpen(false); setQuery(value) }
        }}
      />
      {isOpen ? (
        <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-[100] max-h-72 overflow-y-auto rounded-md border border-border bg-card p-1 shadow-2xl" onMouseDown={(event) => event.preventDefault()}>
          {filteredRecords.map((record, index) => {
            const isSelected = productRecordName(record) === value || productRecordLabel(record) === value
            return (
              <button key={String(record.uuid ?? record.id ?? index)} type="button" className={activeIndex === index ? "flex w-full items-center justify-between gap-3 rounded-md bg-muted px-3 py-2 text-left text-sm" : "flex w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-left text-sm hover:bg-muted"} onMouseDown={(event) => { event.preventDefault(); selectRecord(record) }}>
                <span className="min-w-0 truncate font-medium">{productRecordLabel(record)}</span>
                {isSelected ? <Check className="size-4 shrink-0 text-emerald-600" strokeWidth={3} /> : <span className="size-4 shrink-0" />}
              </button>
            )
          })}
          {query.trim() ? (
            <button type="button" className="mt-1 flex w-full items-center gap-2 rounded-md border border-dashed border-border px-3 py-2 text-left text-sm font-medium text-primary hover:bg-muted" onMouseDown={(event) => { event.preventDefault(); openCreateDialog(query) }}>
              <Plus className="size-4" />Create product
            </button>
          ) : null}
          {!recordsQuery.isFetching && !filteredRecords.length && !query.trim() ? <div className="px-3 py-2 text-sm text-muted-foreground">No products found.</div> : null}
        </div>
      ) : null}
      {createInitialValue !== null ? createPortal(
        <ProductCreateDialog
          initialValue={createInitialValue}
          session={session}
          onClose={() => setCreateInitialValue(null)}
          onCreated={(record) => {
            queryClient.setQueryData<MasterDataRecord[]>(queryKey, (current = []) => [...current.filter((item) => item.id !== record.id), record])
            void queryClient.invalidateQueries({ queryKey })
            const nextValue = productRecordName(record)
            setQuery(nextValue)
            onChange(nextValue, record)
            setCreateInitialValue(null)
          }}
        />,
        document.body,
      ) : null}
    </div>
  )
}

function ProductCreateDialog({ initialValue, onClose, onCreated, session }: {
  initialValue: string
  onClose(): void
  onCreated(record: MasterDataRecord): void
  session: AuthSession
}) {
  const [draft, setDraft] = useState<ProductDraft>(() => ({
    brand_id: null,
    code: normalizeProductCode(initialValue),
    colour_id: null,
    description: "",
    hsn_code_id: null,
    name: initialValue.trim(),
    product_category_id: null,
    product_group_id: null,
    product_type_id: null,
    size_id: null,
    style_id: null,
    tax_id: null,
    unit_id: null,
  }))
  const createMutation = useMutation({
    mutationFn: (input: MasterDataUpsertInput) => upsertMasterDataRecord(session, "products", input),
    onError: (error) => toast.error("Product save failed", { description: error instanceof Error ? error.message : "Unable to save product." }),
  })

  async function submit() {
    const name = draft.name.trim()
    if (!name) {
      toast.error("Product name is required.")
      return
    }
    const record = await createMutation.mutateAsync({
      ...draft,
      code: normalizeProductCode(draft.code || name),
      description: draft.description.trim(),
      is_active: true,
      name,
    })
    toast.success("Product created", { description: productRecordLabel(record) })
    onCreated(record)
  }

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/45 p-4" role="dialog" aria-modal="true">
      <div className="max-h-[92vh] w-full max-w-4xl overflow-hidden rounded-md border border-border bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-base font-semibold">Create product</h2>
          <Button type="button" variant="ghost" size="icon" className="size-8 rounded-md" onClick={onClose} aria-label="Close"><X className="size-4" /></Button>
        </div>
        <div className="max-h-[calc(92vh-8.5rem)] overflow-y-auto px-4 py-4">
          <div className="grid gap-x-5 gap-y-4 md:grid-cols-2">
            <TextInput label="Code" value={draft.code} onChange={(value) => setDraft((current) => ({ ...current, code: value }))} />
            <TextInput label="Name" value={draft.name} autoFocus onChange={(value) => setDraft((current) => ({ ...current, name: value }))} />
            <CommonRecordAutocompleteLookup allowCreate label="Product Group" moduleKey="productGroups" session={session} value={draft.product_group_id} onChange={(value) => setDraft((current) => ({ ...current, product_group_id: value }))} />
            <CommonRecordAutocompleteLookup allowCreate label="Category" moduleKey="productCategories" session={session} value={draft.product_category_id} onChange={(value) => setDraft((current) => ({ ...current, product_category_id: value }))} />
            <CommonRecordAutocompleteLookup allowCreate label="Product Type" moduleKey="productTypes" session={session} value={draft.product_type_id} onChange={(value) => setDraft((current) => ({ ...current, product_type_id: value }))} />
            <CommonRecordAutocompleteLookup allowCreate label="HSN Code" moduleKey="hsnCodes" session={session} value={draft.hsn_code_id} createInput={createHsnInput} onChange={(value) => setDraft((current) => ({ ...current, hsn_code_id: value }))} />
            <CommonRecordAutocompleteLookup allowCreate label="Brand" moduleKey="brands" session={session} value={draft.brand_id} onChange={(value) => setDraft((current) => ({ ...current, brand_id: value }))} />
            <CommonRecordAutocompleteLookup allowCreate label="Colour" moduleKey="colours" session={session} value={draft.colour_id} onChange={(value) => setDraft((current) => ({ ...current, colour_id: value }))} />
            <CommonRecordAutocompleteLookup allowCreate label="Size" moduleKey="sizes" session={session} value={draft.size_id} onChange={(value) => setDraft((current) => ({ ...current, size_id: value }))} />
            <CommonRecordAutocompleteLookup allowCreate label="Unit" moduleKey="units" session={session} value={draft.unit_id} onChange={(value) => setDraft((current) => ({ ...current, unit_id: value }))} />
            <CommonRecordAutocompleteLookup allowCreate label="GST %" createLabel="GST %" moduleKey="taxes" session={session} value={draft.tax_id} createInput={createTaxInput} onChange={(value) => setDraft((current) => ({ ...current, tax_id: value }))} />
            <CommonRecordAutocompleteLookup allowCreate label="Style" moduleKey="styles" session={session} value={draft.style_id} onChange={(value) => setDraft((current) => ({ ...current, style_id: value }))} />
            <div className="grid gap-2 md:col-span-2">
              <Label className="text-sm font-medium text-muted-foreground">Description</Label>
              <Textarea className="min-h-[5.5rem] rounded-md" value={draft.description} onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))} />
            </div>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-border px-4 py-3">
          <Button type="button" variant="outline" className="rounded-md" onClick={onClose}>Cancel</Button>
          <Button type="button" className="rounded-md" disabled={createMutation.isPending} onClick={() => void submit()}><Save className={cn("size-4", createMutation.isPending && "animate-spin")} />Save</Button>
        </div>
      </div>
    </div>
  )
}

function TextInput({ autoFocus = false, label, onChange, value }: { autoFocus?: boolean; label: string; onChange(value: string): void; value: string }) {
  return (
    <div className="grid gap-2">
      <Label className="text-sm font-medium text-muted-foreground">{label}</Label>
      <Input autoFocus={autoFocus} className="h-11 rounded-md" value={value} onChange={(event) => onChange(event.target.value)} />
    </div>
  )
}

export function productLookupQueryKey(session: AuthSession) {
  return ["product-autocomplete", session.selectedTenant.slug] as const
}

export function productRecordName(record: MasterDataRecord) {
  return String(record.name ?? record.code ?? "").trim()
}

export function productRecordLabel(record: MasterDataRecord) {
  const code = String(record.code ?? "").trim()
  const name = productRecordName(record)
  if (code && name && code !== name) return `${code} - ${name}`
  return name || code || String(record.uuid ?? record.id)
}

export function productRecordCommonValue(record: MasterDataRecord, key: "hsn_code_id" | "unit_id", options: ProductCommonLookup[], fallback = "") {
  const selectedId = record[key]
  const option = options.find((item) => String(item.record.id) === String(selectedId) || String(item.id) === String(selectedId))
  if (!option) return fallback
  return option.hsnCode ?? option.unit ?? option.code ?? option.label
}

export function productRecordTaxRate(record: MasterDataRecord, taxes: ProductCommonLookup[]) {
  const taxId = record.tax_id
  const tax = taxes.find((option) => String(option.record.id) === String(taxId) || String(option.id) === String(taxId))
  return tax?.taxRate ?? readNumber(record.rate_percent) ?? 0
}

export function productRecordId(record: MasterDataRecord) {
  return String(record.uuid ?? record.id)
}

function normalizeProductCode(value: string) {
  return value.trim().toUpperCase().replace(/[^A-Z0-9/_-]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 40) || "PRODUCT"
}

function createHsnInput(name: string): MasterDataUpsertInput {
  const code = name.trim().toUpperCase()
  return { code, description: code, is_active: true }
}

function createTaxInput(name: string): MasterDataUpsertInput {
  const rate = readNumber(name.replace("%", "")) ?? 0
  return { description: `GST ${rate}%`, is_active: true, rate_percent: rate }
}

function readNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : undefined
  }
  return undefined
}
