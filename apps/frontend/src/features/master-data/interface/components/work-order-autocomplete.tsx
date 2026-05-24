import { useEffect, useMemo, useState } from "react"
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

type WorkOrderAutocompleteProps = {
  className?: string
  label?: string
  onChange(value: string, record?: MasterDataRecord | null): void
  placeholder?: string
  session: AuthSession
  value: string
}

type WorkOrderDraft = {
  code: string
  description: string
  name: string
}

export function WorkOrderAutocomplete({ className, label = "Work Order no", onChange, placeholder = "", session, value }: WorkOrderAutocompleteProps) {
  const queryClient = useQueryClient()
  const [activeIndex, setActiveIndex] = useState(0)
  const [createInitialValue, setCreateInitialValue] = useState<string | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState(value)
  const queryKey = ["work-order-autocomplete", session.selectedTenant.slug]
  const recordsQuery = useQuery({ queryKey, queryFn: () => listMasterDataRecords(session, "orders") })
  const records = recordsQuery.data ?? []
  const normalizedQuery = query.trim().toLowerCase()
  const filteredRecords = useMemo(() => {
    if (!normalizedQuery) return records.slice(0, 12)
    return records
      .filter((record) => [recordLabel(record), recordValue(record), record.description].filter(Boolean).some((field) => String(field).toLowerCase().includes(normalizedQuery)))
      .slice(0, 12)
  }, [normalizedQuery, records])
  const exactRecord = records.find((record) => [recordLabel(record), recordValue(record)].some((field) => String(field).trim().toLowerCase() === normalizedQuery))

  useEffect(() => {
    if (!isOpen) setQuery(value)
  }, [isOpen, value])

  function selectRecord(record: MasterDataRecord) {
    const nextValue = recordValue(record)
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
            const isSelected = recordValue(record) === value || recordLabel(record) === value
            return (
              <button key={String(record.uuid ?? record.id ?? index)} type="button" className={activeIndex === index ? "flex w-full items-center justify-between gap-3 rounded-md bg-muted px-3 py-2 text-left text-sm" : "flex w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-left text-sm hover:bg-muted"} onMouseDown={(event) => { event.preventDefault(); selectRecord(record) }}>
                <span className="min-w-0 truncate font-medium">{recordLabel(record)}</span>
                {isSelected ? <Check className="size-4 shrink-0 text-emerald-600" strokeWidth={3} /> : <span className="size-4 shrink-0" />}
              </button>
            )
          })}
          {query.trim() ? (
            <button type="button" className="mt-1 flex w-full items-center gap-2 rounded-md border border-dashed border-border px-3 py-2 text-left text-sm font-medium text-primary hover:bg-muted" onMouseDown={(event) => { event.preventDefault(); openCreateDialog(query) }}>
              <Plus className="size-4" />Create work order
            </button>
          ) : null}
          {!recordsQuery.isFetching && !filteredRecords.length && !query.trim() ? <div className="px-3 py-2 text-sm text-muted-foreground">No work orders found.</div> : null}
        </div>
      ) : null}
      {createInitialValue !== null ? createPortal(
        <WorkOrderCreateDialog
          initialValue={createInitialValue}
          session={session}
          onClose={() => setCreateInitialValue(null)}
          onCreated={(record) => {
            void queryClient.invalidateQueries({ queryKey })
            const nextValue = recordValue(record)
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

function WorkOrderCreateDialog({ initialValue, onClose, onCreated, session }: {
  initialValue: string
  onClose(): void
  onCreated(record: MasterDataRecord): void
  session: AuthSession
}) {
  const [draft, setDraft] = useState<WorkOrderDraft>(() => ({
    code: normalizeWorkOrderCode(initialValue),
    description: "",
    name: initialValue.trim(),
  }))
  const createMutation = useMutation({
    mutationFn: (input: MasterDataUpsertInput) => upsertMasterDataRecord(session, "orders", input),
    onError: (error) => toast.error("Work order save failed", { description: error instanceof Error ? error.message : "Unable to save work order." }),
  })

  async function submit() {
    const name = draft.name.trim()
    const code = normalizeWorkOrderCode(draft.code || name)
    if (!name) {
      toast.error("Work order name is required.")
      return
    }
    const record = await createMutation.mutateAsync({ code, description: draft.description.trim(), is_active: true, name })
    toast.success("Work order created", { description: recordLabel(record) })
    onCreated(record)
  }

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/45 p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-lg rounded-md border border-border bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-base font-semibold">Create work order</h2>
          <Button type="button" variant="ghost" size="icon" className="size-8 rounded-md" onClick={onClose} aria-label="Close"><X className="size-4" /></Button>
        </div>
        <div className="grid gap-4 px-4 py-4">
          <div className="grid gap-2">
            <Label className="text-sm font-medium text-muted-foreground">Name *</Label>
            <Input autoFocus value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} className="h-11 rounded-md" />
          </div>
          <div className="grid gap-2">
            <Label className="text-sm font-medium text-muted-foreground">Code</Label>
            <Input value={draft.code} onChange={(event) => setDraft((current) => ({ ...current, code: event.target.value }))} className="h-11 rounded-md" />
          </div>
          <div className="grid gap-2">
            <Label className="text-sm font-medium text-muted-foreground">Description</Label>
            <Textarea value={draft.description} onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))} className="min-h-[5.5rem] rounded-md" />
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

function normalizeWorkOrderCode(value: string) {
  const normalized = value.trim().toUpperCase().replace(/[^A-Z0-9/-]+/g, "-").replace(/^-+|-+$/g, "")
  return normalized || `WO-${Date.now()}`
}

function recordLabel(record: MasterDataRecord) {
  const code = String(record.code ?? "").trim()
  const name = String(record.name ?? "").trim()
  if (code && name && code !== name) return `${code} - ${name}`
  return code || name || String(record.label ?? "")
}

function recordValue(record: MasterDataRecord) {
  return String(record.code ?? record.name ?? record.label ?? "").trim()
}
