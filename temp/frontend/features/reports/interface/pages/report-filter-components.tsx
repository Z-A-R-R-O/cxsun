"use client";

import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { Input } from "@cxnext/ui";
import type { ContactRecord } from "../../../contact/domain/contact";

export interface ReportFiltersValue {
  readonly fromDate: string;
  readonly monthId: string;
  readonly party: string;
  readonly toDate: string;
}

export interface ReportMonthOption {
  readonly fromDate: string;
  readonly label: string;
  readonly toDate: string;
  readonly value: string;
}

export function ReportFilters({
  contactOptions = [],
  filters,
  monthOptions,
  onChange,
  partyLabel = "Party",
  showPartyFilter = true,
}: {
  readonly contactOptions?: readonly ContactRecord[];
  readonly filters: ReportFiltersValue;
  readonly monthOptions?: readonly ReportMonthOption[];
  readonly onChange: (value: ReportFiltersValue) => void;
  readonly partyLabel?: string;
  readonly showPartyFilter?: boolean;
}) {
  return (
    <div className="mb-4 grid gap-3 rounded-md border border-border/70 bg-card p-4 print:hidden md:grid-cols-3">
      {showPartyFilter ? (
        <ContactLookupFilter
          contacts={contactOptions}
          label={partyLabel}
          value={filters.party}
          onChange={(party) => onChange({ ...filters, party })}
        />
      ) : null}
      {monthOptions ? (
        <select
          className="h-10 rounded-md border border-input bg-background px-3 text-sm shadow-sm outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/20"
          value={filters.monthId}
          onChange={(event) => {
            const option = monthOptions.find((item) => item.value === event.target.value);
            onChange({
              ...filters,
              monthId: event.target.value,
              fromDate: option?.fromDate ?? filters.fromDate,
              toDate: option?.toDate ?? filters.toDate,
            });
          }}
        >
          {monthOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      ) : null}
      <Input
        type="date"
        value={filters.fromDate}
        onChange={(event) => onChange({ ...filters, fromDate: event.target.value, monthId: "" })}
      />
      <Input
        type="date"
        value={filters.toDate}
        onChange={(event) => onChange({ ...filters, monthId: "", toDate: event.target.value })}
      />
    </div>
  );
}

function ContactLookupFilter({
  contacts,
  label,
  onChange,
  value,
}: {
  readonly contacts: readonly ContactRecord[];
  readonly label: string;
  readonly onChange: (value: string) => void;
  readonly value: string;
}) {
  const [query, setQuery] = useState(value);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const normalizedQuery = query.trim().toLowerCase();
  const options = contacts.filter((contact) => {
    if (!normalizedQuery) return true;
    return [contact.name, contact.legalName, contact.code, contact.ledgerName]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(normalizedQuery);
  });
  const optionCount = options.length;
  const selectedOption = contacts.find((contact) => contact.name === value);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  function selectContact(contact: ContactRecord) {
    setQuery(contact.name);
    onChange(contact.name);
    setIsOpen(false);
  }

  function clearFilter() {
    setQuery("");
    onChange("");
    setIsOpen(false);
  }

  return (
    <div className="relative z-10 focus-within:z-[90]">
      <Input
        aria-autocomplete="list"
        aria-expanded={isOpen}
        aria-label={label}
        role="combobox"
        className="h-10 rounded-md bg-background"
        placeholder={`Filter by ${label.toLowerCase()}`}
        value={query}
        onBlur={() => {
          window.setTimeout(() => {
            setIsOpen(false);
            setQuery(selectedOption?.name ?? "");
          }, 120);
        }}
        onChange={(event) => {
          setQuery(event.target.value);
          setIsOpen(true);
          setActiveIndex(0);
          if (!event.target.value.trim()) onChange("");
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
            const activeOption = options[activeIndex];
            if (activeOption) selectContact(activeOption);
            return;
          }
          if (event.key === "Escape") {
            event.preventDefault();
            setIsOpen(false);
            setQuery(selectedOption?.name ?? "");
          }
        }}
      />
      {isOpen ? (
        <div
          role="listbox"
          className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-[100] max-h-60 overflow-y-auto rounded-md border border-border bg-card p-1 shadow-2xl ring-1 ring-black/5"
          onMouseDown={(event) => event.preventDefault()}
        >
          {value ? (
            <button
              type="button"
              className="block w-full rounded-md px-3 py-2 text-left text-sm text-muted-foreground hover:bg-muted"
              onMouseDown={(event) => {
                event.preventDefault();
                clearFilter();
              }}
            >
              All {label.toLowerCase()}s
            </button>
          ) : null}
          {options.map((contact, index) => {
            const isSelected = contact.name === value;
            return (
              <button
                key={contact.id}
                role="option"
                aria-selected={isSelected}
                type="button"
                className={
                  activeIndex === index
                    ? "flex w-full items-center justify-between gap-3 rounded-md bg-muted px-3 py-2 text-left text-sm text-foreground"
                    : "flex w-full items-center justify-between gap-3 rounded-md bg-card px-3 py-2 text-left text-sm text-foreground hover:bg-muted"
                }
                onMouseDown={(event) => {
                  event.preventDefault();
                  selectContact(contact);
                }}
              >
                <span className="min-w-0 truncate">{contact.name}</span>
                {isSelected ? (
                  <Check className="size-4 shrink-0 text-emerald-600" strokeWidth={3} />
                ) : (
                  <span className="size-4 shrink-0" />
                )}
              </button>
            );
          })}
          {!options.length ? (
            <div className="px-3 py-2 text-sm text-muted-foreground">No {label.toLowerCase()} found</div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
