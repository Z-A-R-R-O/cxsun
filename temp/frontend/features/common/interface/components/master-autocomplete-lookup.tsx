"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Plus } from "lucide-react";
import { Button, Input, Label } from "@cxnext/ui";
import type { CommonRecord } from "../../domain/common-master";

export const masterAutocompleteDefaultId = "1";
export const masterAutocompleteDefaultLabel = "-";

export interface MasterAutocompleteCreatePayload {
  readonly label: string;
  readonly moduleKey?: string;
}

export interface MasterAutocompleteLookupProps {
  readonly allowCreate?: boolean;
  readonly className?: string;
  readonly defaultId?: string;
  readonly defaultLabel?: string;
  readonly disabled?: boolean;
  readonly getOptionLabel?: (option: CommonRecord) => string;
  readonly label: string;
  readonly moduleKey?: string;
  readonly onChange: (value: string | null, record: CommonRecord | null) => void;
  readonly onQuickCreate?: (
    payload: MasterAutocompleteCreatePayload,
  ) => Promise<CommonRecord | null> | CommonRecord | null;
  readonly options: readonly CommonRecord[];
  readonly placeholder?: string;
  readonly value: string | null;
}

/**
 * Reference autocomplete lookup for master/common records.
 *
 * Use this tone for new lookup controls:
 * type-to-search, ArrowUp/ArrowDown navigation, Enter select/create,
 * Escape cancel, selected check mark, default id `1` rendered as `-`,
 * and optional quick-create for common modules through `onQuickCreate`.
 */
export function MasterAutocompleteLookup({
  allowCreate = false,
  className = "",
  defaultId = masterAutocompleteDefaultId,
  defaultLabel = masterAutocompleteDefaultLabel,
  disabled = false,
  getOptionLabel = defaultOptionLabel,
  label,
  moduleKey,
  onChange,
  onQuickCreate,
  options,
  placeholder,
  value,
}: MasterAutocompleteLookupProps) {
  const selectedOption = useMemo(
    () => findMasterOption(options, value),
    [options, value],
  );
  const [activeIndex, setActiveIndex] = useState(0);
  const [isCreating, setIsCreating] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const listRef = useRef<HTMLDivElement | null>(null);
  const [query, setQuery] = useState(() =>
    selectedOption ? selectedOptionLabel(selectedOption, value, defaultId, defaultLabel, getOptionLabel) : defaultQueryLabel(value, defaultId, defaultLabel),
  );
  const normalizedQuery = query.trim().toLowerCase();
  const filteredOptions = options.filter((option) =>
    getOptionLabel(option).toLowerCase().includes(normalizedQuery),
  );
  const exactOption = options.find(
    (option) => getOptionLabel(option).toLowerCase() === normalizedQuery,
  );
  const canCreate = Boolean(
    allowCreate && onQuickCreate && query.trim() && !exactOption && query.trim() !== defaultLabel,
  );
  const optionCount = filteredOptions.length + (canCreate ? 1 : 0);

  useEffect(() => {
    if (isOpen) return;
    setQuery(
      selectedOption
        ? selectedOptionLabel(selectedOption, value, defaultId, defaultLabel, getOptionLabel)
        : defaultQueryLabel(value, defaultId, defaultLabel),
    );
  }, [defaultId, defaultLabel, getOptionLabel, isOpen, selectedOption, value]);

  useEffect(() => {
    if (!isOpen) return;
    const activeOption = listRef.current?.querySelector<HTMLElement>("[data-active='true']");
    activeOption?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, isOpen]);

  function resetQuery() {
    setQuery(
      selectedOption
        ? selectedOptionLabel(selectedOption, value, defaultId, defaultLabel, getOptionLabel)
        : defaultQueryLabel(value, defaultId, defaultLabel),
    );
  }

  function selectOption(option: CommonRecord) {
    const nextValue = String(option.id);
    setQuery(getOptionLabel(option));
    onChange(nextValue, option);
    setIsOpen(false);
  }

  async function createAndSelect() {
    if (!canCreate || !onQuickCreate) return;
    setIsCreating(true);
    try {
      const record = await onQuickCreate({ label: query.trim(), moduleKey });
      if (record) selectOption(record);
    } finally {
      setIsCreating(false);
    }
  }

  async function selectActiveOption() {
    const activeOption = filteredOptions[activeIndex];
    if (activeOption) {
      selectOption(activeOption);
      return;
    }
    if (canCreate && activeIndex === filteredOptions.length) await createAndSelect();
  }

  return (
    <div className={`relative z-10 grid w-full gap-2 focus-within:z-[90] ${className}`}>
      <Label className="text-sm font-medium text-muted-foreground">{label}</Label>
      <Input
        aria-autocomplete="list"
        aria-expanded={isOpen}
        role="combobox"
        className="h-11 w-full rounded-md bg-background"
        disabled={disabled || isCreating}
        placeholder={placeholder ?? `Search ${label.toLowerCase()}`}
        value={query}
        onBlur={() => {
          if (exactOption) {
            selectOption(exactOption);
            return;
          }
          window.setTimeout(() => {
            setIsOpen(false);
            if (!value) onChange(defaultId, findMasterOption(options, defaultId) ?? null);
            resetQuery();
          }, 120);
        }}
        onChange={(event) => {
          const nextQuery = event.target.value;
          const matchingOption = options.find(
            (option) => getOptionLabel(option).toLowerCase() === nextQuery.trim().toLowerCase(),
          );
          setQuery(nextQuery);
          setIsOpen(true);
          setActiveIndex(0);
          onChange(matchingOption ? String(matchingOption.id) : null, matchingOption ?? null);
        }}
        onFocus={() => setIsOpen(true)}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") {
            event.preventDefault();
            setIsOpen(true);
            setActiveIndex((current) => (optionCount ? (current + 1) % optionCount : 0));
            return;
          }
          if (event.key === "ArrowUp") {
            event.preventDefault();
            setIsOpen(true);
            setActiveIndex((current) => (optionCount ? (current - 1 + optionCount) % optionCount : 0));
            return;
          }
          if (event.key === "Enter") {
            event.preventDefault();
            void selectActiveOption();
            return;
          }
          if (event.key === "Escape") {
            event.preventDefault();
            setIsOpen(false);
            resetQuery();
          }
        }}
      />
      {isOpen && optionCount > 0 ? (
        <div
          role="listbox"
          ref={listRef}
          className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-[100] max-h-60 overflow-y-auto overscroll-contain rounded-md border border-border bg-card p-1 shadow-2xl ring-1 ring-black/5"
          onMouseDown={(event) => event.preventDefault()}
        >
          {filteredOptions.map((option, index) => {
            const isSelected = isMasterOptionSelected(option, value);
            return (
              <button
                key={option.id}
                role="option"
                aria-selected={isSelected}
                data-active={activeIndex === index}
                type="button"
                className={
                  activeIndex === index
                    ? "flex w-full cursor-pointer items-center justify-between gap-3 rounded-md bg-muted px-3 py-2 text-left text-sm text-foreground"
                    : "flex w-full cursor-pointer items-center justify-between gap-3 rounded-md bg-card px-3 py-2 text-left text-sm text-foreground hover:bg-muted"
                }
                onMouseDown={(event) => {
                  event.preventDefault();
                  selectOption(option);
                }}
              >
                <span className="min-w-0 truncate">
                  {selectedOptionLabel(option, String(option.id), defaultId, defaultLabel, getOptionLabel)}
                </span>
                {isSelected ? (
                  <Check className="size-4 shrink-0 text-emerald-600" strokeWidth={3} />
                ) : (
                  <span className="size-4 shrink-0" />
                )}
              </button>
            );
          })}
          {canCreate ? (
            <Button
              type="button"
              variant="ghost"
              data-active={activeIndex === filteredOptions.length}
              className={
                activeIndex === filteredOptions.length
                  ? "h-auto w-full justify-start rounded-md bg-muted px-3 py-2 text-left text-sm font-medium text-primary"
                  : "h-auto w-full justify-start rounded-md px-3 py-2 text-left text-sm font-medium text-primary hover:bg-muted"
              }
              disabled={isCreating}
              onMouseDown={async (event) => {
                event.preventDefault();
                await createAndSelect();
              }}
            >
              <Plus className="size-4" />
              Create {label} "{query.trim()}"
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function defaultOptionLabel(option: CommonRecord) {
  const name = typeof option.name === "string" ? option.name.trim() : "";
  const code = typeof option.code === "string" ? option.code.trim() : "";
  return name || code || String(option.id);
}

function selectedOptionLabel(
  option: CommonRecord,
  value: string | null,
  defaultId: string,
  defaultLabel: string,
  getOptionLabel: (option: CommonRecord) => string,
) {
  if (String(value) === defaultId) return defaultLabel;
  return getOptionLabel(option);
}

function defaultQueryLabel(value: string | null, defaultId: string, defaultLabel: string) {
  return String(value) === defaultId ? defaultLabel : "";
}

function findMasterOption(options: readonly CommonRecord[], value: string | null) {
  if (!value) return undefined;
  return options.find((option) => isMasterOptionSelected(option, value));
}

function isMasterOptionSelected(option: CommonRecord, value: string | null) {
  if (!value) return false;
  return String(option.id) === String(value);
}
