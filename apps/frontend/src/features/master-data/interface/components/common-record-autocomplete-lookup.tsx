import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react"
import { createPortal } from "react-dom"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Check, Plus } from "lucide-react"
import { toast } from "sonner"

import { Input } from "src/components/ui/input"
import { Label } from "src/components/ui/label"
import type { AuthSession } from "src/features/auth/auth-client"
import type { MasterDataRecord, MasterDataUpsertInput } from "../../domain/master-data"
import { listMasterDataRecords, upsertMasterDataRecord } from "../../infrastructure/master-data-client"

export interface CommonRecordAutocompleteLookupProps {
  allowCreate?: boolean
  className?: string
  createInput?(name: string, records: MasterDataRecord[]): MasterDataUpsertInput
  createLabel?: string
  disabled?: boolean
  label: string
  labelClassName?: string
  moduleKey: string
  onChange(value: number | null, record: MasterDataRecord | null): void
  onOptionsChange?(records: MasterDataRecord[]): void
  optionFilter?(record: MasterDataRecord): boolean
  placeholder?: string
  session: AuthSession
  value: unknown
}

export function CommonRecordAutocompleteLookup({
  allowCreate = true,
  className = "",
  createInput,
  createLabel,
  disabled = false,
  label,
  labelClassName = "",
  moduleKey,
  onChange,
  onOptionsChange,
  optionFilter,
  placeholder,
  session,
  value,
}: CommonRecordAutocompleteLookupProps) {
  const queryClient = useQueryClient()
  const recordsQuery = useQuery({
    queryKey: commonRecordLookupQueryKey(session, moduleKey),
    queryFn: () => listMasterDataRecords(session, moduleKey),
  })
  const createMutation = useMutation({
    mutationFn: (name: string) => upsertMasterDataRecord(session, moduleKey, createInput ? createInput(name, options) : defaultCreateInput(name)),
  })
  const allOptions = recordsQuery.data ?? []
  const options = optionFilter ? allOptions.filter(optionFilter) : allOptions
  const selectedId = value === null || value === undefined || value === "" ? null : String(value)
  const selectedOption = useMemo(() => options.find((option) => isSelectedCommonRecord(option, selectedId)) ?? null, [options, selectedId])
  const [activeIndex, setActiveIndex] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState(() => selectedOption ? getCommonRecordName(selectedOption) : "")
  const inputRef = useRef<HTMLInputElement | null>(null)
  const listRef = useRef<HTMLDivElement | null>(null)
  const [listStyle, setListStyle] = useState<CSSProperties | null>(null)
  const normalizedQuery = query.trim().toLowerCase()
  const filteredOptions = options.filter((option) => {
    const name = getCommonRecordName(option).toLowerCase()
    const code = String(option.code ?? "").toLowerCase()
    return name.includes(normalizedQuery) || code.includes(normalizedQuery)
  })
  const exactOption = options.find((option) => isExactCommonRecordMatch(option, normalizedQuery))
  const canCreate = Boolean(allowCreate && query.trim() && !exactOption && !createMutation.isPending)
  const optionCount = filteredOptions.length + (canCreate ? 1 : 0)

  useEffect(() => {
    if (recordsQuery.data) onOptionsChange?.(recordsQuery.data)
  }, [onOptionsChange, recordsQuery.data])

  useEffect(() => {
    if (!isOpen) setQuery(selectedOption ? getCommonRecordName(selectedOption) : "")
  }, [isOpen, selectedOption])

  useEffect(() => {
    if (!isOpen) return
    const activeOption = listRef.current?.querySelector<HTMLElement>("[data-active='true']")
    activeOption?.scrollIntoView({ block: "nearest" })
  }, [activeIndex, isOpen])

  useEffect(() => {
    if (!isOpen) return

    function updateListPosition() {
      const rect = inputRef.current?.getBoundingClientRect()
      if (!rect) return

      const preferredHeight = 208
      const viewportPadding = 16
      const belowTop = rect.bottom + 8
      const belowSpace = window.innerHeight - belowTop - viewportPadding
      const aboveTop = Math.max(viewportPadding, rect.top - preferredHeight - 8)
      const top = belowSpace >= 96 ? belowTop : aboveTop
      const maxHeight = Math.min(preferredHeight, Math.max(96, window.innerHeight - top - viewportPadding))

      setListStyle({
        left: rect.left,
        maxHeight,
        top,
        width: rect.width,
      })
    }

    updateListPosition()
    window.addEventListener("resize", updateListPosition)
    window.addEventListener("scroll", updateListPosition, true)
    return () => {
      window.removeEventListener("resize", updateListPosition)
      window.removeEventListener("scroll", updateListPosition, true)
    }
  }, [isOpen])

  function selectOption(option: MasterDataRecord) {
    setQuery(getCommonRecordName(option))
    onChange(Number(option.id), option)
    setIsOpen(false)
  }

  function resetQuery() {
    setQuery(selectedOption ? getCommonRecordName(selectedOption) : "")
  }

  async function createAndSelect() {
    const name = query.trim()
    if (!name || exactOption) return

    try {
      const created = await createMutation.mutateAsync(name)
      queryClient.setQueryData<MasterDataRecord[]>(commonRecordLookupQueryKey(session, moduleKey), (current = []) => {
        const existing = current.filter((record) => record.id !== created.id)
        return [...existing, created].sort((left, right) => getCommonRecordName(left).localeCompare(getCommonRecordName(right)))
      })
      await queryClient.invalidateQueries({ queryKey: commonRecordLookupQueryKey(session, moduleKey) })
      selectOption(created)
      toast.success(`${createLabel ?? label} created`, { description: getCommonRecordName(created) })
    } catch (error) {
      toast.error(`${createLabel ?? label} create failed`, { description: error instanceof Error ? error.message : "Unable to create record." })
    }
  }

  return (
    <div className={`relative z-10 grid w-full gap-3 focus-within:z-[90] ${className}`}>
      <Label className={`text-sm font-medium ${labelClassName}`}>{label}</Label>
      <Input
        ref={inputRef}
        aria-autocomplete="list"
        aria-expanded={isOpen}
        className="h-11 w-full rounded-xl"
        disabled={disabled || createMutation.isPending}
        placeholder={placeholder ?? `Search ${label.toLowerCase()}`}
        role="combobox"
        value={query}
        onBlur={() => {
          if (exactOption) {
            selectOption(exactOption)
            return
          }
          window.setTimeout(() => {
            setIsOpen(false)
            resetQuery()
          }, 120)
        }}
        onChange={(event) => {
          const nextQuery = event.target.value
          const matchingOption = options.find((option) => isExactCommonRecordMatch(option, nextQuery.trim().toLowerCase()))
          setQuery(nextQuery)
          setIsOpen(true)
          setActiveIndex(0)
          onChange(matchingOption ? Number(matchingOption.id) : null, matchingOption ?? null)
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
            const activeOption = filteredOptions[activeIndex]
            if (activeOption) {
              selectOption(activeOption)
              return
            }
            if (canCreate && activeIndex === filteredOptions.length) void createAndSelect()
            return
          }
          if (event.key === "Escape") {
            event.preventDefault()
            setIsOpen(false)
            resetQuery()
          }
        }}
      />
      {isOpen && optionCount > 0 && listStyle && typeof document !== "undefined" ? createPortal(
        <div
          ref={listRef}
          role="listbox"
          style={listStyle}
          className="fixed z-[1200] overflow-y-auto overscroll-contain rounded-md border border-border bg-card p-1 shadow-2xl ring-1 ring-black/5"
          onMouseDown={(event) => event.preventDefault()}
        >
          {filteredOptions.map((option, index) => {
            const isSelected = isSelectedCommonRecord(option, selectedId)
            return (
              <button
                key={option.uuid}
                aria-selected={isSelected}
                data-active={activeIndex === index}
                role="option"
                type="button"
                className={activeIndex === index ? "flex w-full cursor-pointer items-center justify-between gap-3 rounded-md bg-muted px-3 py-2 text-left text-sm text-foreground" : "flex w-full cursor-pointer items-center justify-between gap-3 rounded-md bg-card px-3 py-2 text-left text-sm text-foreground hover:bg-muted"}
                onMouseDown={(event) => {
                  event.preventDefault()
                  selectOption(option)
                }}
              >
                <span className="min-w-0 truncate">{getCommonRecordName(option)}</span>
                {isSelected ? <Check className="size-4 shrink-0 text-emerald-600" strokeWidth={3} /> : <span className="size-4 shrink-0" />}
              </button>
            )
          })}
          {canCreate ? (
            <button
              data-active={activeIndex === filteredOptions.length}
              type="button"
              className={activeIndex === filteredOptions.length ? "flex w-full cursor-pointer items-center gap-2 rounded-md bg-muted px-3 py-2 text-left text-sm font-medium text-primary" : "flex w-full cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-medium text-primary hover:bg-muted"}
              onMouseDown={(event) => {
                event.preventDefault()
                void createAndSelect()
              }}
            >
              <Plus className="size-4" />
              Create {createLabel ?? label} "{query.trim()}"
            </button>
          ) : null}
        </div>,
        document.body,
      ) : null}
    </div>
  )
}

export function commonRecordLookupQueryKey(session: AuthSession, moduleKey: string) {
  return ["master-data-records", session.selectedTenant.slug, moduleKey, "lookup"] as const
}

export function buildCommonRecordLookup(records: MasterDataRecord[]) {
  return new Map(records.map((record) => [String(record.id), getCommonRecordName(record)]))
}

export function getCommonRecordName(record: MasterDataRecord) {
  if (record.rate_percent !== null && record.rate_percent !== undefined) {
    return `${record.rate_percent}%`
  }

  return String(record.name ?? record.code ?? record.description ?? record.id)
}

function isExactCommonRecordMatch(option: MasterDataRecord, normalizedQuery: string) {
  return getCommonRecordName(option).toLowerCase() === normalizedQuery || String(option.code ?? "").toLowerCase() === normalizedQuery
}

function isSelectedCommonRecord(option: MasterDataRecord, selectedValue: string | null) {
  if (!selectedValue) return false

  const normalizedSelectedValue = selectedValue.toLowerCase()
  return String(option.id) === selectedValue ||
    String(option.uuid ?? "").toLowerCase() === normalizedSelectedValue ||
    getCommonRecordName(option).toLowerCase() === normalizedSelectedValue ||
    String(option.code ?? "").toLowerCase() === normalizedSelectedValue
}

function defaultCreateInput(name: string): MasterDataUpsertInput {
  return {
    is_active: true,
    name,
  }
}
