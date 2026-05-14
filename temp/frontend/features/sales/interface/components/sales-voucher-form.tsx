"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Check, Pencil, Plus, Send, Sparkles, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import {
  AnimatedTabs,
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator,
} from "@cxnext/ui";
import { calculateSalesTotals, formatMoney } from "../../application/sales-service";
import {
  getContact,
  prepareContactForSave,
  upsertContact,
} from "../../../contact/application/contact-upsert.service";
import {
  createDefaultContactFormValues,
  toContactFormValues,
} from "../../../contact/domain/contact-form";
import type { ContactAddress, ContactRecord } from "../../../contact/domain/contact";
import {
  prepareProductForSave,
  upsertProduct,
} from "../../../product/application/product-upsert.service";
import { createDefaultProductFormValues } from "../../../product/domain/product-form";
import {
  createCommonRecord,
  listCommonRecords,
  type CommonRecord,
} from "../../../common/application/common-service";
import {
  MasterAutocompleteLookup,
  masterAutocompleteDefaultId,
} from "../../../common/interface/components/master-autocomplete-lookup";
import {
  commonLocationDefinitions,
  type CommonLocationRecord,
} from "../../../common/location/domain/common-location";
import { listCommonLocation } from "../../../common/location/infrastructure/common-location-api";
import {
  resolveSalesBillingLayout,
  type SalesBillingLayout,
} from "../../application/sales-billing-layout-service";
import {
  defaultSalesItem,
  getSalesIndustryKind,
  salesStatusOptions,
  type SalesInput,
  type SalesIndustryKind,
  type SalesItemInput,
  type SalesLookupOption,
} from "../../domain/sales";

export const salesTypeOptions = [
  { label: "CGST-SGST", value: "cgst-sgst" },
  { label: "IGST", value: "igst" },
] as const;

export function SalesVoucherTabs({
  contacts,
  form,
  industryCode,
  industryName,
  products,
  setForm,
}: {
  readonly contacts: readonly SalesLookupOption[];
  readonly form: SalesInput;
  readonly industryCode?: string | null;
  readonly industryName?: string | null;
  readonly products: readonly SalesLookupOption[];
  readonly setForm: (value: SalesInput) => void;
}) {
  const [itemDraft, setItemDraft] = useState<SalesItemInput>(defaultSalesItem());
  const [salesLayout, setSalesLayout] = useState(() =>
    resolveSalesBillingLayout(industryCode ?? industryName),
  );
  const totals = useMemo(
    () => calculateSalesTotals(form.items, form.roundOff),
    [form.items, form.roundOff],
  );

  useEffect(() => {
    setSalesLayout(resolveSalesBillingLayout(industryCode ?? industryName));
  }, [industryCode, industryName]);

  const tabs = [
    {
      value: "details",
      label: "Details",
      content: (
        <DetailsTab
          contacts={contacts}
          form={form}
          industryKind={getSalesIndustryKind(industryCode ?? industryName)}
          itemDraft={itemDraft}
          products={products}
          salesLayout={salesLayout}
          setForm={setForm}
          setItemDraft={setItemDraft}
          totals={totals}
        />
      ),
    },
    {
      value: "address",
      label: "Address",
      content: <AddressTab form={form} setForm={setForm} />,
    },
    ...(salesLayout.useEInvoice
      ? [
          {
            value: "einvoice",
            label: "E-invoice",
            content: <EInvoiceTab form={form} setForm={setForm} />,
          },
        ]
      : []),
    ...(salesLayout.useEway
      ? [
          {
            value: "eway",
            label: "E-way",
            content: <EwayTab form={form} setForm={setForm} />,
          },
        ]
      : []),
    { value: "terms", label: "Terms", content: <TermsTab form={form} setForm={setForm} /> },
  ];

  return (
    <AnimatedTabs
      className="[&>div:first-child]:rounded-none [&>div:first-child]:border-x-0 [&>div:first-child]:border-t-0 [&>div:first-child]:border-b [&>div:first-child]:border-border/70 [&>div:first-child]:bg-card [&>div:first-child]:px-4 [&>div:first-child]:py-0.5 [&>div:first-child]:shadow-none md:[&>div:first-child]:px-6 [&>div:first-child_button]:min-h-8 [&>div:first-child_button]:py-1 [&>div:last-child]:mx-auto [&>div:last-child]:mt-3 [&>div:last-child]:w-full [&>div:last-child]:px-4 [&>div:last-child]:pb-3 md:[&>div:last-child]:px-6 md:[&>div:last-child]:pb-4"
      tabs={tabs}
    />
  );
}

function DetailsTab({
  contacts,
  form,
  industryKind,
  itemDraft,
  products,
  salesLayout,
  setForm,
  setItemDraft,
  totals,
}: {
  readonly contacts: readonly SalesLookupOption[];
  readonly form: SalesInput;
  readonly industryKind: SalesIndustryKind;
  readonly itemDraft: SalesItemInput;
  readonly products: readonly SalesLookupOption[];
  readonly salesLayout: SalesBillingLayout;
  readonly setForm: (value: SalesInput) => void;
  readonly setItemDraft: (value: SalesItemInput) => void;
  readonly totals: ReturnType<typeof calculateSalesTotals>;
}) {
  const [itemLookups, setItemLookups] = useState<SalesItemLookupMap>({
    colours: [],
    hsnCodes: [],
    sizes: [],
  });
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    void Promise.all([
      listCommonRecords("sizes", { signal: controller.signal }),
      listCommonRecords("colours", { signal: controller.signal }),
      listCommonRecords("hsnCodes", { signal: controller.signal }),
    ])
      .then(([sizes, colours, hsnCodes]) => {
        if (controller.signal.aborted) return;
        setItemLookups({ colours, hsnCodes, sizes });
      })
      .catch(() => {
        if (!controller.signal.aborted) setItemLookups({ colours: [], hsnCodes: [], sizes: [] });
      });

    return () => controller.abort();
  }, []);

  async function createSalesItemLookup(moduleKey: SalesItemLookupKey, label: string) {
    try {
      const record = await createCommonRecord(
        moduleKey,
        buildSalesItemLookupCreatePayload(moduleKey, label),
      );
      setItemLookups((current) => ({
        ...current,
        [moduleKey]: [...current[moduleKey], record],
      }));
      toast.success(`${salesItemLookupLabel(moduleKey)} created`, {
        description: commonRecordLabel(record, moduleKey),
      });
      return record;
    } catch (error) {
      toast.error(`Could not create ${salesItemLookupLabel(moduleKey).toLowerCase()}`, {
        description: getSalesItemLookupErrorMessage(error),
      });
      return null;
    }
  }

  function addItem() {
    if (!itemDraft.productId || !itemDraft.productName.trim()) return;
    if (editingItemIndex !== null) {
      setForm({
        ...form,
        items: form.items.map((item, index) =>
          index === editingItemIndex
            ? { ...itemDraft, sortOrder: item.sortOrder ?? editingItemIndex + 1 }
            : item,
        ),
      });
      setItemDraft(defaultSalesItem());
      setEditingItemIndex(null);
      return;
    }

    setForm({
      ...form,
      items: [...form.items, { ...itemDraft, sortOrder: form.items.length + 1 }],
    });
    setItemDraft(defaultSalesItem());
  }

  function editItem(index: number) {
    const item = form.items[index];
    if (!item) return;
    setItemDraft({
      ...item,
      colour: item.colour ?? null,
      size: item.size ?? null,
    });
    setEditingItemIndex(index);
  }

  function deleteItem(index: number) {
    setForm({
      ...form,
      items: form.items.filter((_, itemIndex) => itemIndex !== index),
    });
    if (editingItemIndex === index) {
      setItemDraft(defaultSalesItem());
      setEditingItemIndex(null);
      return;
    }
    if (editingItemIndex !== null && editingItemIndex > index) {
      setEditingItemIndex(editingItemIndex - 1);
    }
  }

  function cancelItemEdit() {
    setItemDraft(defaultSalesItem());
    setEditingItemIndex(null);
  }

  return (
    <div className="space-y-8">
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="space-y-5">
          <ContactAutocompleteField
            label="Customer name"
            options={contacts}
            placeholder=""
            selectedId={form.partyId}
            selectedLabel={form.partyName}
            onPick={(option) =>
              setForm({
                ...form,
                billingAddress: option.billingAddress ?? form.billingAddress,
                partyId: option.id,
                partyName: option.label,
                shippingAddress: option.shippingAddress ?? option.billingAddress ?? form.shippingAddress,
              })
            }
          />
          <Field label="Order no">
            <Input
              className="h-11 rounded-md text-left"
              value={form.referenceNo ?? ""}
              onChange={(event) => setForm({ ...form, referenceNo: event.target.value })}
            />
          </Field>
        </div>
        <div className="space-y-5">
          <Field label="Invoice no">
            <Input
              className="h-11 rounded-md text-left"
              value={form.documentNo}
              onChange={(event) =>
                setForm({ ...form, autoDocumentNo: false, documentNo: event.target.value })
              }
            />
          </Field>
          <Field label="Date">
            <Input
              className="h-11 rounded-md text-right"
              type="date"
              value={form.documentDate}
              onChange={(event) => setForm({ ...form, documentDate: event.target.value })}
            />
          </Field>
          <Field label="Sales type">
            <Select
              value={form.placeOfSupply ?? salesTypeOptions[0].value}
              onValueChange={(value) => setForm({ ...form, placeOfSupply: value })}
            >
              <SelectTrigger className="h-11 rounded-md">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {salesTypeOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>
      </div>
      <section className="space-y-5">
        <h2 className="text-lg font-semibold text-primary underline underline-offset-4">
          Sales Items
        </h2>
        <div className="grid gap-3 lg:grid-cols-[repeat(6,minmax(0,1fr))_auto]">
          <IndustryItemDraftFields
            itemDraft={itemDraft}
            itemLookups={itemLookups}
            kind={industryKind}
            section="beforeProduct"
            onCreateLookup={createSalesItemLookup}
            salesLayout={salesLayout}
            setItemDraft={setItemDraft}
          />
          <ProductAutocompleteField
            label="Product name"
            options={products}
            placeholder=""
            selectedId={itemDraft.productId}
            selectedLabel={itemDraft.productName}
            onPick={(option) =>
              setItemDraft({
                ...itemDraft,
                hsnCodeId: option.hsnCodeId ?? null,
                mrp: option.mrp ?? 0,
                productId: option.id,
                productName: option.label,
                productSku: option.productSku ?? null,
                rate: option.rate ?? 0,
                colour: option.colour ?? itemDraft.colour,
                size: option.size ?? itemDraft.size,
                taxId: option.taxId ?? null,
                taxRate: option.taxRate ?? 0,
                unitId: option.unitId ?? null,
              })
            }
          />
          <IndustryItemDraftFields
            itemDraft={itemDraft}
            itemLookups={itemLookups}
            kind={industryKind}
            section="afterProduct"
            onCreateLookup={createSalesItemLookup}
            salesLayout={salesLayout}
            setItemDraft={setItemDraft}
          />
          <Field label="Quantity">
            <Input
              className="h-11 rounded-md text-right"
              inputMode="decimal"
              style={{ textAlign: "right" }}
              type="text"
              value={itemDraft.quantity}
              onChange={(event) => {
                const value = event.target.value.replace(/[^0-9.]/g, "");
                setItemDraft({ ...itemDraft, quantity: Number(value || 0) });
              }}
            />
          </Field>
          <Field label="Price">
            <Input
              className="h-11 rounded-md text-right"
              inputMode="decimal"
              style={{ textAlign: "right" }}
              type="text"
              value={itemDraft.rate}
              onChange={(event) => {
                const value = event.target.value.replace(/[^0-9.]/g, "");
                setItemDraft({ ...itemDraft, rate: Number(value || 0) });
              }}
            />
          </Field>
          <div className="mt-6 flex h-11 items-center gap-2">
            <Button
              type="button"
              className="h-11 rounded-md"
              disabled={!itemDraft.productId}
              onClick={addItem}
            >
              {editingItemIndex === null ? (
                <Plus className="size-4" />
              ) : (
                <Check className="size-4" />
              )}
              {editingItemIndex === null ? "Add" : "Update"}
            </Button>
            {editingItemIndex !== null ? (
              <Button
                type="button"
                size="icon"
                variant="outline"
                className="size-11 rounded-md"
                onClick={cancelItemEdit}
                aria-label="Cancel item edit"
              >
                <X className="size-4" />
              </Button>
            ) : null}
          </div>
        </div>
        <SalesItemsTable
          form={form}
          industryKind={industryKind}
          onDeleteItem={deleteItem}
          onEditItem={editItem}
          hsnCodes={itemLookups.hsnCodes}
          salesLayout={salesLayout}
        />
        <TotalsFooter form={form} setForm={setForm} totals={totals} />
      </section>
    </div>
  );
}

function SalesItemsTable({
  form,
  hsnCodes,
  industryKind,
  onDeleteItem,
  onEditItem,
  salesLayout,
}: {
  readonly form: SalesInput;
  readonly hsnCodes: readonly CommonRecord[];
  readonly industryKind: SalesIndustryKind;
  readonly onDeleteItem: (index: number) => void;
  readonly onEditItem: (index: number) => void;
  readonly salesLayout: SalesBillingLayout;
}) {
  const totals = calculateSalesTotals(form.items, form.roundOff);
  const taxMode = form.placeOfSupply === "igst" ? "igst" : "cgst-sgst";
  const headers = getItemTableHeaders(industryKind, taxMode, salesLayout);

  return (
    <div className="w-full overflow-hidden rounded-md border border-border/70">
      <table className="w-full min-w-0 table-fixed border-collapse text-[11px] sm:text-xs xl:text-sm">
        <thead className="bg-muted/45 text-muted-foreground">
          <tr>
            {headers.map((header) => (
              <th
                key={header.id}
                className={headerCellClassName(header.id)}
              >
                {header.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {form.items.map((item, index) => {
            const taxable = item.quantity * item.rate;
            const gst = (taxable * item.taxRate) / 100;
            const splitGst = gst / 2;
            return (
              <tr
                key={`${item.productName}-${index}`}
                className="border-b border-border/60 last:border-b-0"
              >
                <td className="border-r border-border/70 px-1.5 py-2 text-center text-muted-foreground">
                  {index + 1}
                </td>
                {headers.slice(1, -1).map((header) => (
                  <td key={header.id} className={itemCellClassName(header.id)}>
                    <div className={itemCellContentClassName(header.id)}>
                      {itemTableValue(header.id, item, taxable, gst, splitGst, hsnCodes)}
                    </div>
                  </td>
                ))}
                <td className="px-1 py-2 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="size-7 rounded-full"
                      onClick={() => onEditItem(index)}
                      aria-label="Edit item"
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="size-7 rounded-full"
                      onClick={() => onDeleteItem(index)}
                      aria-label="Delete item"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            );
          })}
          <tr className="bg-muted/20 font-medium">
            {headers.map((header) => (
              <td key={header.id} className={totalCellClassName(header.id)}>
                {itemTableTotalValue(header.id, form, totals)}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function TotalsFooter({
  form,
  setForm,
  totals,
}: {
  readonly form: SalesInput;
  readonly setForm: (value: SalesInput) => void;
  readonly totals: ReturnType<typeof calculateSalesTotals>;
}) {
  return (
    <div className="ml-auto grid w-full max-w-sm gap-3 text-sm">
      <SummaryRow label="Taxable amount" value={formatMoney(totals.taxableAmount)} />
      <SummaryRow label="GST total" value={formatMoney(totals.gstTotal)} />
      <div className="grid grid-cols-[1fr_auto_8rem] items-center gap-4">
        <span className="font-medium text-muted-foreground">Round off</span>
        <span>:</span>
        <Input
          className="h-9 rounded-md text-right"
          inputMode="decimal"
          type="text"
          value={form.roundOff}
          onChange={(event) => {
            const value = event.target.value.replace(/[^0-9.-]/g, "");
            setForm({ ...form, roundOff: Number(value || 0) });
          }}
        />
      </div>
      <SummaryRow label="Grand total" value={formatMoney(totals.grandTotal)} strong />
    </div>
  );
}

function IndustryItemDraftFields({
  itemDraft,
  itemLookups,
  kind,
  onCreateLookup,
  section,
  salesLayout,
  setItemDraft,
}: {
  readonly itemDraft: SalesItemInput;
  readonly itemLookups: SalesItemLookupMap;
  readonly kind: SalesIndustryKind;
  readonly onCreateLookup: (
    moduleKey: SalesItemLookupKey,
    label: string,
  ) => Promise<CommonRecord | null>;
  readonly section: "beforeProduct" | "afterProduct";
  readonly salesLayout: SalesBillingLayout;
  readonly setItemDraft: (value: SalesItemInput) => void;
}) {
  if (section === "beforeProduct") {
    return (
      <>
        {salesLayout.usePo ? (
          <Field label="PO no">
            <Input
              className="h-11 rounded-md"
              value={itemDraft.poNo ?? ""}
              onChange={(event) => setItemDraft({ ...itemDraft, poNo: event.target.value })}
            />
          </Field>
        ) : null}
        {salesLayout.useDc ? (
          <Field label="DC no">
            <Input
              className="h-11 rounded-md"
              value={itemDraft.dcNo ?? ""}
              onChange={(event) => setItemDraft({ ...itemDraft, dcNo: event.target.value })}
            />
          </Field>
        ) : null}
      </>
    );
  }

  return (
    <>
      <Field label="Description">
        <Input
          className="h-11 rounded-md"
          value={itemDraft.description ?? ""}
          onChange={(event) => setItemDraft({ ...itemDraft, description: event.target.value })}
        />
      </Field>
      {salesLayout.useSize ? (
        <SalesItemMasterLookupField
          label="Size"
          moduleKey="sizes"
          options={itemLookups.sizes}
          value={itemDraft.size}
          onChange={(value) => setItemDraft({ ...itemDraft, size: value })}
          onCreateLookup={onCreateLookup}
        />
      ) : null}
      {salesLayout.useColour ? (
        <SalesItemMasterLookupField
          label="Colour"
          moduleKey="colours"
          options={itemLookups.colours}
          value={itemDraft.colour}
          onChange={(value) => setItemDraft({ ...itemDraft, colour: value })}
          onCreateLookup={onCreateLookup}
        />
      ) : null}
      {kind === "upvc" ? (
        <Field label="Area sq">
          <Input
            className="h-11 rounded-md"
            min="0"
            type="number"
            value={itemDraft.areaSq}
            onChange={(event) =>
              setItemDraft({ ...itemDraft, areaSq: Number(event.target.value || 0) })
            }
          />
        </Field>
      ) : null}
    </>
  );
}

type SalesItemLookupKey = "colours" | "sizes";
interface SalesItemLookupMap {
  readonly colours: readonly CommonRecord[];
  readonly hsnCodes: readonly CommonRecord[];
  readonly sizes: readonly CommonRecord[];
}

export function SalesItemMasterLookupField({
  label,
  moduleKey,
  onChange,
  onCreateLookup,
  options,
  value,
}: {
  readonly label: string;
  readonly moduleKey: SalesItemLookupKey;
  readonly onChange: (value: string | null) => void;
  readonly onCreateLookup: (
    moduleKey: SalesItemLookupKey,
    label: string,
  ) => Promise<CommonRecord | null>;
  readonly options: readonly CommonRecord[];
  readonly value: string | null;
}) {
  const [query, setQuery] = useState(value ?? "");
  const [activeIndex, setActiveIndex] = useState(0);
  const [isCreating, setIsCreating] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const listRef = useRef<HTMLDivElement | null>(null);
  const normalizedQuery = query.trim().toLowerCase();
  const filteredOptions = options
    .filter((record) => commonRecordLabel(record, moduleKey).toLowerCase().includes(normalizedQuery))
    .slice(0, 12);
  const exactOption = options.find(
    (record) => commonRecordLabel(record, moduleKey).toLowerCase() === normalizedQuery,
  );
  const canCreate = Boolean(query.trim() && !exactOption);
  const optionCount = filteredOptions.length + (canCreate ? 1 : 0);

  useEffect(() => {
    setQuery(value ?? "");
  }, [value]);

  useEffect(() => {
    if (!isOpen) return;
    const activeOption = listRef.current?.querySelector<HTMLElement>("[data-active='true']");
    activeOption?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, isOpen]);

  function selectOption(record: CommonRecord) {
    const labelValue = commonRecordLabel(record, moduleKey);
    setQuery(labelValue);
    onChange(labelValue);
    setIsOpen(false);
  }

  async function createAndSelect() {
    if (!canCreate || isCreating) return;
    setIsCreating(true);
    try {
      const record = await onCreateLookup(moduleKey, query.trim());
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
    <Label className="relative z-10 grid gap-2 text-sm font-medium text-muted-foreground focus-within:z-[90]">
      <span>{label}</span>
      <Input
        aria-autocomplete="list"
        aria-expanded={isOpen}
        role="combobox"
        className="h-11 rounded-md"
        disabled={isCreating}
        value={query}
        onBlur={() => window.setTimeout(() => setIsOpen(false), 120)}
        onChange={(event) => {
          const nextQuery = event.target.value;
          setQuery(nextQuery);
          setIsOpen(true);
          setActiveIndex(0);
          onChange(nextQuery.trim() || null);
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
          }
        }}
      />
      {isOpen && (filteredOptions.length > 0 || canCreate) ? (
        <div
          role="listbox"
          ref={listRef}
          className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-[100] max-h-60 overflow-y-auto overscroll-contain rounded-md border border-border bg-card p-1 shadow-2xl ring-1 ring-black/5"
          onMouseDown={(event) => event.preventDefault()}
        >
          {filteredOptions.map((record, index) => {
            const recordLabel = commonRecordLabel(record, moduleKey);
            const isSelected = recordLabel.trim().toLowerCase() === (value ?? "").trim().toLowerCase();
            return (
              <button
                key={record.id}
                type="button"
                role="option"
                aria-selected={isSelected}
                data-active={activeIndex === index}
                className={
                  activeIndex === index
                    ? "flex w-full cursor-pointer items-center justify-between gap-3 rounded-md bg-muted px-3 py-2 text-left text-sm text-foreground"
                    : "flex w-full cursor-pointer items-center justify-between gap-3 rounded-md bg-card px-3 py-2 text-left text-sm text-foreground hover:bg-muted"
                }
                onMouseDown={(event) => {
                  event.preventDefault();
                  selectOption(record);
                }}
              >
                <span className="min-w-0 truncate">{recordLabel}</span>
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
    </Label>
  );
}

function AddressTab({
  form,
  setForm,
}: {
  readonly form: SalesInput;
  readonly setForm: (value: SalesInput) => void;
}) {
  const [addressTypes, setAddressTypes] = useState<readonly CommonRecord[]>([]);
  const [contact, setContact] = useState<ContactRecord | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    void listCommonRecords("addressTypes", { signal: controller.signal })
      .then(setAddressTypes)
      .catch(() => setAddressTypes([]));
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const contactId = Number(form.partyId);
    if (!form.partyId || !Number.isFinite(contactId)) {
      setContact(null);
      return;
    }

    const controller = new AbortController();
    setIsLoading(true);
    void getContact(contactId, { signal: controller.signal })
      .then((record) => {
        if (controller.signal.aborted) return;
        setContact(record);
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        setContact(null);
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });

    return () => controller.abort();
  }, [form.partyId]);

  async function createAddress(input: AddressCreateDraft) {
    if (!contact) {
      toast.error("Select contact first");
      return null;
    }

    const addressLine1 = input.addressLine1.trim();
    if (!addressLine1) return null;

    const contactInput = toContactFormValues(contact);
    const savedContact = await upsertContact(
      prepareContactForSave({
        ...contactInput,
        addresses: [
          ...contactInput.addresses,
          {
            ...createDefaultContactFormValues().addresses[0],
            addressLine1,
            addressLine2: input.addressLine2.trim() || null,
            addressTypeId: input.addressTypeId || defaultAddressTypeId(addressTypes),
            isDefault: contactInput.addresses.length === 0,
          },
        ],
      }),
      contact.id,
    );
    setContact(savedContact);

    return savedContact.addresses[savedContact.addresses.length - 1] ?? null;
  }

  return (
    <div className="grid gap-5 md:grid-cols-2">
      <AddressAutocompleteField
        addressTypes={addressTypes}
        disabled={!form.partyId || isLoading}
        label="Billing address"
        options={contact?.addresses ?? []}
        value={form.billingAddress ?? ""}
        onChange={(value) => setForm({ ...form, billingAddress: value })}
        onCreate={createAddress}
      />
      <AddressAutocompleteField
        addressTypes={addressTypes}
        disabled={!form.partyId || isLoading}
        label="Shipping address"
        options={contact?.addresses ?? []}
        value={form.shippingAddress ?? ""}
        onChange={(value) => setForm({ ...form, shippingAddress: value })}
        onCreate={createAddress}
      />
    </div>
  );
}

function EInvoiceTab({
  form,
  setForm,
}: {
  readonly form: SalesInput;
  readonly setForm: (value: SalesInput) => void;
}) {
  const status = form.eInvoiceIrn || form.eInvoiceAckNo ? "Generated" : "Pending";

  return (
    <div className="space-y-5">
      <DetailStatusBanner
        status={status}
        title="E-invoice status"
        onGenerate={() =>
          toast.info("E-invoice generation is ready for gateway integration.", {
            description: "Save the invoice details here until the live provider is connected.",
          })
        }
        onSend={() =>
          toast.info("E-invoice send is ready for gateway integration.", {
            description: form.eInvoiceIrn ? `IRN ${form.eInvoiceIrn} is selected.` : "Generate or enter IRN first.",
          })
        }
      />
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
      <DetailField label="IRN" className="md:col-span-2 xl:col-span-3">
        <Input
          className="h-10 rounded-md"
          value={form.eInvoiceIrn ?? ""}
          onChange={(event) => setForm({ ...form, eInvoiceIrn: event.target.value })}
        />
      </DetailField>
      <DetailField label="Ack no">
        <Input
          className="h-10 rounded-md"
          value={form.eInvoiceAckNo ?? ""}
          onChange={(event) => setForm({ ...form, eInvoiceAckNo: event.target.value })}
        />
      </DetailField>
      <DetailField label="Ack date">
        <Input
          className="h-10 rounded-md"
          type="date"
          value={form.eInvoiceAckDate ?? ""}
          onChange={(event) => setForm({ ...form, eInvoiceAckDate: event.target.value })}
        />
      </DetailField>
      <DetailField label="Signed QR" className="md:col-span-2 xl:col-span-3">
        <Input
          className="h-10 rounded-md"
          value={form.eInvoiceSignedQr ?? ""}
          onChange={(event) => setForm({ ...form, eInvoiceSignedQr: event.target.value })}
        />
      </DetailField>
      </div>
    </div>
  );
}

function EwayTab({
  form,
  setForm,
}: {
  readonly form: SalesInput;
  readonly setForm: (value: SalesInput) => void;
}) {
  const status = form.ewayBillNo || form.ewayBillDate ? "Generated" : "Pending";

  return (
    <div className="space-y-5">
      <DetailStatusBanner
        status={status}
        title="E-way status"
        onGenerate={() =>
          toast.info("E-way generation is ready for gateway integration.", {
            description: "Save the e-way details here until the live provider is connected.",
          })
        }
        onSend={() =>
          toast.info("E-way send is ready for gateway integration.", {
            description: form.ewayBillNo ? `E-way bill ${form.ewayBillNo} is selected.` : "Generate or enter E-way bill no first.",
          })
        }
      />
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
      <DetailField label="Due date">
        <Input
          className="h-10 rounded-md"
          type="date"
          value={form.dueDate ?? ""}
          onChange={(event) => setForm({ ...form, dueDate: event.target.value })}
        />
      </DetailField>
      <DetailField label="E-way bill no">
        <Input
          className="h-10 rounded-md"
          value={form.ewayBillNo ?? ""}
          onChange={(event) => setForm({ ...form, ewayBillNo: event.target.value })}
        />
      </DetailField>
      <DetailField label="E-way bill date">
        <Input
          className="h-10 rounded-md"
          type="date"
          value={form.ewayBillDate ?? ""}
          onChange={(event) => setForm({ ...form, ewayBillDate: event.target.value })}
        />
      </DetailField>
      <DetailField label="Notes" className="md:col-span-2 xl:col-span-3">
        <Input
          className="h-10 rounded-md"
          value={form.notes ?? ""}
          onChange={(event) => setForm({ ...form, notes: event.target.value })}
        />
      </DetailField>
      </div>
    </div>
  );
}

function DetailStatusBanner({
  onGenerate,
  onSend,
  status,
  title,
}: {
  readonly onGenerate: () => void;
  readonly onSend: () => void;
  readonly status: string;
  readonly title: string;
}) {
  const isGenerated = status.toLowerCase() === "generated";

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-md bg-muted/35 px-3 py-2">
      <div className="flex items-center gap-2 text-sm">
        <span className="font-medium text-muted-foreground">{title}</span>
        <span
          className={
            isGenerated
              ? "rounded-md bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700"
              : "rounded-md bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700"
          }
        >
          {status}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" className="h-9 rounded-md" onClick={onGenerate}>
          <Sparkles className="size-4" />
          Generate
        </Button>
        <Button type="button" className="h-9 rounded-md" onClick={onSend}>
          <Send className="size-4" />
          Send
        </Button>
      </div>
    </div>
  );
}

function DetailField({
  children,
  className = "",
  label,
}: {
  readonly children: React.ReactNode;
  readonly className?: string;
  readonly label: string;
}) {
  return (
    <Label className={`grid gap-2 text-sm font-medium text-muted-foreground ${className}`}>
      <span>{label}</span>
      {children}
    </Label>
  );
}

interface AddressCreateDraft {
  readonly addressLine1: string;
  readonly addressLine2: string;
  readonly addressTypeId: string | null;
}

function AddressAutocompleteField({
  addressTypes,
  disabled,
  label,
  onChange,
  onCreate,
  options,
  value,
}: {
  readonly addressTypes: readonly CommonRecord[];
  readonly disabled: boolean;
  readonly label: string;
  readonly onChange: (value: string) => void;
  readonly onCreate: (input: AddressCreateDraft) => Promise<ContactAddress | null>;
  readonly options: readonly ContactAddress[];
  readonly value: string;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [createDraft, setCreateDraft] = useState<AddressCreateDraft>(() =>
    createAddressDraft(value, addressTypes),
  );
  const [createError, setCreateError] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const normalizedQuery = value.trim().toLowerCase();
  const activeOptions = options.filter((option) => option.isActive !== false);
  const filteredOptions = activeOptions.filter((option) =>
    addressOptionLabel(option, addressTypes).toLowerCase().includes(normalizedQuery),
  );
  const exactOption = activeOptions.find(
    (option) => addressText(option).toLowerCase() === normalizedQuery,
  );
  const canCreate = Boolean(value.trim()) && !exactOption && !disabled;
  const optionCount = filteredOptions.length + (canCreate ? 1 : 0);

  useEffect(() => {
    if (!isCreateOpen) return;

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        closeCreate();
      }
    }

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [isCreateOpen]);

  function selectAddress(address: ContactAddress) {
    onChange(addressText(address));
    setIsOpen(false);
  }

  async function selectActiveOption() {
    const activeOption = filteredOptions[activeIndex];
    if (activeOption) {
      selectAddress(activeOption);
      return;
    }
    if (canCreate && activeIndex === filteredOptions.length) {
      openCreate(value);
    }
  }

  function openCreate(seed: string) {
    setCreateDraft(createAddressDraft(seed, addressTypes));
    setCreateError(null);
    setIsCreateOpen(true);
    setIsOpen(false);
  }

  function closeCreate() {
    setIsCreateOpen(false);
    setCreateError(null);
  }

  async function saveAddress() {
    if (!createDraft.addressLine1.trim()) return;
    setIsSaving(true);
    setCreateError(null);

    try {
      const address = await onCreate(createDraft);
      if (address) {
        onChange(addressText(address));
        toast.success("Address created");
        closeCreate();
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not create address.";
      setCreateError(message);
      toast.error("Could not create address", { description: message });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <>
      <Field label={label}>
        <div className="relative z-10 focus-within:z-[90]">
        <Input
          className="h-11 rounded-md bg-background"
          disabled={disabled}
          value={value}
          onBlur={() => {
            if (exactOption) {
              selectAddress(exactOption);
              return;
            }
            window.setTimeout(() => setIsOpen(false), 120);
          }}
          onChange={(event) => {
            onChange(event.target.value);
            setIsOpen(true);
            setActiveIndex(0);
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
              setActiveIndex((current) =>
                optionCount ? (current - 1 + optionCount) % optionCount : 0,
              );
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
              const isSelected = addressText(option) === value;
              return (
                <button
                  key={option.id}
                  role="option"
                  aria-selected={isSelected}
                  type="button"
                  className={
                    activeIndex === index
                      ? "flex w-full cursor-pointer items-center justify-between gap-3 rounded-md bg-muted px-3 py-2 text-left text-sm text-foreground"
                      : "flex w-full cursor-pointer items-center justify-between gap-3 rounded-md bg-card px-3 py-2 text-left text-sm text-foreground hover:bg-muted"
                  }
                  onMouseDown={(event) => {
                    event.preventDefault();
                    selectAddress(option);
                  }}
                >
                  <span className="min-w-0 truncate">{addressOptionLabel(option, addressTypes)}</span>
                  {isSelected ? (
                    <Check className="size-4 shrink-0 text-emerald-600" strokeWidth={3} />
                  ) : (
                    <span className="size-4 shrink-0" />
                  )}
                </button>
              );
            })}
            {canCreate ? (
              <button
                type="button"
                role="option"
                className={
                  activeIndex === filteredOptions.length
                    ? "block w-full cursor-pointer rounded-md bg-muted px-3 py-2 text-left text-sm font-medium text-primary"
                    : "block w-full cursor-pointer rounded-md bg-card px-3 py-2 text-left text-sm font-medium text-primary hover:bg-muted"
                }
                onMouseDown={(event) => {
                  event.preventDefault();
                  openCreate(value);
                }}
              >
                + Create address "{value.trim()}"
              </button>
            ) : null}
          </div>
        ) : null}
        </div>
      </Field>
      {isCreateOpen ? (
        <div className="fixed inset-0 z-[120] grid place-items-center bg-background/55 p-4 backdrop-blur-sm">
          <div className="relative w-[min(620px,calc(100vw-2rem))] rounded-md border-2 border-border bg-card p-5 shadow-2xl ring-1 ring-foreground/10">
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="absolute right-3 top-3 size-8 rounded-md"
              onClick={closeCreate}
              aria-label="Close address popup"
            >
              <X className="size-4" />
            </Button>
            <div className="space-y-1 pr-10">
              <h2 className="text-lg font-semibold text-foreground">New address</h2>
              <p className="text-sm text-muted-foreground">
                Add this address to the selected contact and use it for this invoice.
              </p>
            </div>
            <div className="mt-5 grid gap-4">
              <MasterAutocompleteLookup
                label="Address type"
                moduleKey="addressTypes"
                options={addressTypes}
                placeholder="Search address type"
                value={createDraft.addressTypeId}
                onChange={(nextValue) =>
                  setCreateDraft((current) => ({ ...current, addressTypeId: nextValue }))
                }
              />
              <Field label="Address line 1">
                <Input
                  autoFocus
                  className="h-11 rounded-md"
                  value={createDraft.addressLine1}
                  onChange={(event) =>
                    setCreateDraft((current) => ({
                      ...current,
                      addressLine1: event.target.value,
                    }))
                  }
                />
              </Field>
              <Field label="Address line 2">
                <Input
                  className="h-11 rounded-md"
                  value={createDraft.addressLine2}
                  onChange={(event) =>
                    setCreateDraft((current) => ({
                      ...current,
                      addressLine2: event.target.value,
                    }))
                  }
                />
              </Field>
            </div>
            {createError ? (
              <p className="mt-4 text-sm font-medium text-destructive">{createError}</p>
            ) : null}
            <div className="mt-5 flex flex-wrap justify-end gap-3 border-t border-border/70 pt-4">
              <Button type="button" variant="outline" className="rounded-xl" onClick={closeCreate}>
                Cancel
              </Button>
              <Button
                type="button"
                className="rounded-xl"
                disabled={isSaving || !createDraft.addressLine1.trim()}
                onClick={() => void saveAddress()}
              >
                {isSaving ? "Creating..." : "Create address"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function createAddressDraft(value: string, addressTypes: readonly CommonRecord[]): AddressCreateDraft {
  return {
    addressLine1: value.trim(),
    addressLine2: "",
    addressTypeId: defaultAddressTypeId(addressTypes),
  };
}

function addressText(address: ContactAddress) {
  return [address.addressLine1, address.addressLine2]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(", ");
}

function addressOptionLabel(address: ContactAddress, addressTypes: readonly CommonRecord[]) {
  return `${addressTypeName(address.addressTypeId, addressTypes)} - ${addressText(address) || "-"}`;
}

function addressTypeName(addressTypeId: string | null, addressTypes: readonly CommonRecord[]) {
  const addressType = addressTypes.find((record) => String(record.id) === String(addressTypeId));
  const name = typeof addressType?.name === "string" ? addressType.name.trim() : "";
  const code = typeof addressType?.code === "string" ? addressType.code.trim() : "";
  return name || code || "-";
}

function defaultAddressTypeId(addressTypes: readonly CommonRecord[]) {
  return String(addressTypes[0]?.id ?? masterAutocompleteDefaultId);
}

function TermsTab({
  form,
  setForm,
}: {
  readonly form: SalesInput;
  readonly setForm: (value: SalesInput) => void;
}) {
  return (
    <div className="space-y-5">
      <Field label="Terms">
        <textarea
          className="min-h-[7.5rem] w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-foreground/40"
          rows={5}
          value={form.terms ?? ""}
          onChange={(event) => setForm({ ...form, terms: event.target.value })}
        />
      </Field>
      <Separator />
      <Field label="Status">
        <Select value={form.status} onValueChange={(value) => setForm({ ...form, status: value })}>
          <SelectTrigger className="h-11 rounded-md">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {salesStatusOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
    </div>
  );
}

export function ProductAutocompleteField({
  label,
  onPick,
  options,
  placeholder,
  selectedId,
  selectedLabel,
}: {
  readonly label: string;
  readonly onPick: (option: SalesLookupOption) => void;
  readonly options: readonly SalesLookupOption[];
  readonly placeholder: string;
  readonly selectedId: string | null;
  readonly selectedLabel: string;
}) {
  const [createdOptions, setCreatedOptions] = useState<readonly SalesLookupOption[]>([]);
  const [query, setQuery] = useState(selectedLabel);
  const [createDraft, setCreateDraft] = useState(() => createProductDraft(selectedLabel));
  const [createError, setCreateError] = useState<string | null>(null);
  const [hsnCodes, setHsnCodes] = useState<readonly CommonRecord[]>([]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [taxes, setTaxes] = useState<readonly CommonRecord[]>([]);
  const [units, setUnits] = useState<readonly CommonRecord[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const allOptions = [...createdOptions, ...options].filter(
    (option, index, records) => records.findIndex((item) => item.id === option.id) === index,
  );
  const normalizedQuery = query.trim().toLowerCase();
  const filteredOptions = allOptions.filter((option) =>
    option.label.toLowerCase().includes(normalizedQuery),
  );
  const optionCount = filteredOptions.length;
  const exactOption = allOptions.find(
    (option) => option.label.toLowerCase() === normalizedQuery && normalizedQuery.length > 0,
  );

  useEffect(() => {
    setQuery(selectedLabel);
  }, [selectedLabel]);

  useEffect(() => {
    if (!isCreateOpen || hsnCodes.length || taxes.length || units.length) return;

    const controller = new AbortController();
    Promise.all([
      listCommonRecords("hsnCodes", { signal: controller.signal }),
      listCommonRecords("taxes", { signal: controller.signal }),
      listCommonRecords("units", { signal: controller.signal }),
    ])
      .then(([hsnRecords, taxRecords, unitRecords]) => {
        setHsnCodes(hsnRecords);
        setTaxes(taxRecords);
        setUnits(unitRecords);
        setLookupError(null);
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setLookupError(error instanceof Error ? error.message : "Could not load product masters.");
      });

    return () => controller.abort();
  }, [hsnCodes.length, isCreateOpen, taxes.length, units.length]);

  useEffect(() => {
    if (!isCreateOpen) return;

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        closeCreateProduct();
      }
    }

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [isCreateOpen]);

  function selectOption(option: SalesLookupOption) {
    setQuery(option.label);
    onPick(option);
    setIsOpen(false);
  }

  function selectActiveOption() {
    const activeOption = filteredOptions[activeIndex];
    if (activeOption) selectOption(activeOption);
  }

  function closeCreateProduct() {
    setIsCreateOpen(false);
    setCreateError(null);
    setLookupError(null);
  }

  async function createProduct() {
    if (!createDraft.name.trim()) return;
    setIsSaving(true);
    setCreateError(null);

    try {
      const savedProduct = await upsertProduct(prepareProductForSave(toProductInput(createDraft)));
      const option = productRecordToLookupOption(savedProduct, taxes);
      setCreatedOptions((current) => [option, ...current]);
      selectOption(option);
      toast.success("Product created");
      closeCreateProduct();
      setCreateDraft(createProductDraft(""));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not create product.";
      setCreateError(message);
      toast.error("Could not create product", { description: message });
    } finally {
      setIsSaving(false);
    }
  }

  async function createProductPopupLookup(
    moduleKey: ProductPopupLookupKey,
    label: string,
  ) {
    try {
      const record = await createCommonRecord(
        moduleKey,
        buildProductPopupLookupCreatePayload(moduleKey, label),
      );

      if (moduleKey === "hsnCodes") {
        setHsnCodes((current) => [...current, record]);
      } else if (moduleKey === "units") {
        setUnits((current) => [...current, record]);
      } else {
        setTaxes((current) => [...current, record]);
      }

      toast.success(`${productPopupLookupLabel(moduleKey)} created`, {
        description: commonRecordLabel(record, moduleKey),
      });
      return record;
    } catch (error) {
      toast.error(`Could not create ${productPopupLookupLabel(moduleKey).toLowerCase()}`, {
        description: getSalesItemLookupErrorMessage(error),
      });
      return null;
    }
  }

  return (
    <>
      <Field label={label}>
        <div className="relative z-10 focus-within:z-[90]">
        <Input
          aria-autocomplete="list"
          aria-expanded={isOpen}
          role="combobox"
          className="h-11 rounded-md bg-background"
          placeholder={placeholder}
          value={query}
          onBlur={() => {
            if (exactOption) {
              selectOption(exactOption);
              return;
            }
            window.setTimeout(() => {
              setIsOpen(false);
              setQuery(selectedLabel);
            }, 120);
          }}
          onChange={(event) => {
            setQuery(event.target.value);
            setIsOpen(true);
            setActiveIndex(0);
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
              setActiveIndex((current) =>
                optionCount ? (current - 1 + optionCount) % optionCount : 0,
              );
              return;
            }
            if (event.key === "Enter") {
              event.preventDefault();
              if (optionCount > 0) {
                selectActiveOption();
              } else if (query.trim()) {
                setCreateDraft(createProductDraft(query));
                setIsCreateOpen(true);
                setIsOpen(false);
              }
              return;
            }
            if (event.key === "Escape") {
              event.preventDefault();
              setIsOpen(false);
              setQuery(selectedLabel);
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
              const isSelected = option.id === selectedId;
              return (
                <button
                  key={option.id}
                  role="option"
                  aria-selected={isSelected}
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
                  <span className="min-w-0 truncate">{option.label}</span>
                  {isSelected ? (
                    <Check className="size-4 shrink-0 text-emerald-600" strokeWidth={3} />
                  ) : (
                    <span className="size-4 shrink-0" />
                  )}
                </button>
              );
            })}
            {query.trim() ? (
              <button
                type="button"
                role="option"
                className="block w-full cursor-pointer rounded-md bg-card px-3 py-2 text-left text-sm font-medium text-primary hover:bg-muted"
                onMouseDown={(event) => {
                  event.preventDefault();
                  setCreateDraft(createProductDraft(query));
                  setIsCreateOpen(true);
                  setIsOpen(false);
                }}
              >
                + Create product "{query.trim()}"
              </button>
            ) : null}
          </div>
        ) : query.trim() && isOpen ? (
          <div
            role="listbox"
            className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-[100] overflow-hidden rounded-md border border-border bg-card p-1 shadow-2xl ring-1 ring-black/5"
            onMouseDown={(event) => event.preventDefault()}
          >
            <button
              type="button"
              role="option"
              className="block w-full cursor-pointer rounded-md bg-card px-3 py-2 text-left text-sm font-medium text-primary hover:bg-muted"
              onMouseDown={(event) => {
                event.preventDefault();
                setCreateDraft(createProductDraft(query));
                setIsCreateOpen(true);
                setIsOpen(false);
              }}
            >
              + Create product "{query.trim()}"
            </button>
          </div>
        ) : null}
        </div>
      </Field>
      {isCreateOpen ? (
        <div className="fixed inset-0 z-[120] grid place-items-center bg-background/55 p-4 backdrop-blur-sm">
          <div className="relative w-[min(640px,calc(100vw-2rem))] rounded-md border-2 border-border bg-card p-5 shadow-2xl ring-1 ring-foreground/10">
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="absolute right-3 top-3 size-8 rounded-md"
              onClick={closeCreateProduct}
              aria-label="Close product popup"
            >
              <X className="size-4" />
            </Button>
            <div className="space-y-1 pr-10">
              <h2 className="text-lg font-semibold text-foreground">New product</h2>
              <p className="text-sm text-muted-foreground">
                Add the minimum details and select it for this sales invoice.
              </p>
            </div>
            <div className="mt-5 grid gap-4">
              <Field label="Name">
                <Input
                  autoFocus
                  className="h-11 rounded-md"
                  value={createDraft.name}
                  onChange={(event) =>
                    setCreateDraft((current) => ({ ...current, name: event.target.value }))
                  }
                />
              </Field>
              <MasterAutocompleteLookup
                allowCreate
                label="HSN code"
                moduleKey="hsnCodes"
                getOptionLabel={(record) => commonRecordLabel(record, "hsnCodes")}
                options={hsnCodes}
                placeholder="Search HSN code"
                value={createDraft.hsnCodeId}
                onChange={(value) =>
                  setCreateDraft((current) => ({ ...current, hsnCodeId: value }))
                }
                onQuickCreate={({ label }) =>
                  createProductPopupLookup("hsnCodes", label)
                }
              />
              <MasterAutocompleteLookup
                allowCreate
                label="Unit"
                moduleKey="units"
                getOptionLabel={(record) => commonRecordLabel(record, "units")}
                options={units}
                placeholder="Search unit"
                value={createDraft.unitId}
                onChange={(value) =>
                  setCreateDraft((current) => ({ ...current, unitId: value }))
                }
                onQuickCreate={({ label }) => createProductPopupLookup("units", label)}
              />
              <MasterAutocompleteLookup
                allowCreate
                label="GST percent"
                moduleKey="taxes"
                getOptionLabel={(record) => commonRecordLabel(record, "taxes")}
                options={taxes}
                placeholder="Search GST percent"
                value={createDraft.taxId}
                onChange={(value) =>
                  setCreateDraft((current) => ({ ...current, taxId: value }))
                }
                onQuickCreate={({ label }) => createProductPopupLookup("taxes", label)}
              />
            </div>
            {lookupError ? (
              <p className="mt-4 text-sm font-medium text-destructive">{lookupError}</p>
            ) : null}
            {createError ? (
              <p className="mt-4 text-sm font-medium text-destructive">{createError}</p>
            ) : null}
            <div className="mt-5 flex flex-wrap justify-end gap-3 border-t border-border/70 pt-4">
              <Button
                type="button"
                variant="outline"
                className="rounded-xl"
                onClick={closeCreateProduct}
              >
                Cancel
              </Button>
              <Button
                type="button"
                className="rounded-xl"
                disabled={isSaving || !createDraft.name.trim()}
                onClick={() => void createProduct()}
              >
                {isSaving ? "Creating..." : "Create product"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

export function ContactAutocompleteField({
  label,
  onPick,
  options,
  placeholder,
  selectedId,
  selectedLabel,
}: {
  readonly label: string;
  readonly onPick: (option: SalesLookupOption) => void;
  readonly options: readonly SalesLookupOption[];
  readonly placeholder: string;
  readonly selectedId: string | null;
  readonly selectedLabel: string;
}) {
  const [query, setQuery] = useState(selectedLabel);
  const [createDraft, setCreateDraft] = useState(() => createContactDraft(selectedLabel));
  const [createError, setCreateError] = useState<string | null>(null);
  const [countries, setCountries] = useState<readonly CommonLocationRecord[]>([]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [pincodes, setPincodes] = useState<readonly CommonLocationRecord[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const normalizedQuery = query.trim().toLowerCase();
  const filteredOptions = options.filter((option) =>
    option.label.toLowerCase().includes(normalizedQuery),
  );
  const optionCount = filteredOptions.length;
  const exactOption = options.find(
    (option) => option.label.toLowerCase() === normalizedQuery && normalizedQuery.length > 0,
  );

  useEffect(() => {
    setQuery(selectedLabel);
  }, [selectedLabel]);

  useEffect(() => {
    if (!isCreateOpen || countries.length || pincodes.length) return;

    const controller = new AbortController();
    Promise.all([
      listCommonLocation(commonLocationDefinitions.countries, { signal: controller.signal }),
      listCommonLocation(commonLocationDefinitions.pincodes, { signal: controller.signal }),
    ])
      .then(([countryRecords, pincodeRecords]) => {
        setCountries(countryRecords);
        setPincodes(pincodeRecords);
        setLocationError(null);
        const india = resolveIndia(countryRecords);
        if (india) {
          setCreateDraft((current) => ({ ...current, countryId: current.countryId ?? india.id }));
        }
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setLocationError(error instanceof Error ? error.message : "Could not load location masters.");
      });

    return () => controller.abort();
  }, [countries.length, isCreateOpen, pincodes.length]);

  useEffect(() => {
    if (!isCreateOpen) return;

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        closeCreateContact();
      }
    }

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [isCreateOpen]);

  function selectOption(option: SalesLookupOption) {
    setQuery(option.label);
    onPick(option);
    setIsOpen(false);
  }

  function selectActiveOption() {
    const activeOption = filteredOptions[activeIndex];
    if (activeOption) selectOption(activeOption);
  }

  function closeCreateContact() {
    setIsCreateOpen(false);
    setCreateError(null);
    setLocationError(null);
  }

  async function createContact() {
    if (!createDraft.name.trim()) return;
    setIsSaving(true);
    setCreateError(null);

    try {
      const savedContact = await upsertContact(prepareContactForSave(toContactInput(createDraft)));
      const option = contactRecordToLookupOption(savedContact);
      selectOption(option);
      toast.success("Contact created");
      closeCreateContact();
      setCreateDraft(createContactDraft(""));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not create contact.";
      setCreateError(message);
      toast.error("Could not create contact", { description: message });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Field label={label}>
      <div className="relative z-10 focus-within:z-[90]">
        <Input
          aria-autocomplete="list"
          aria-expanded={isOpen}
          role="combobox"
          className="h-11 rounded-md bg-background"
          placeholder={placeholder}
          value={query}
          onBlur={() => {
            if (exactOption) {
              selectOption(exactOption);
              return;
            }
            window.setTimeout(() => {
              setIsOpen(false);
              setQuery(selectedLabel);
            }, 120);
          }}
          onChange={(event) => {
            setQuery(event.target.value);
            setIsOpen(true);
            setActiveIndex(0);
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
              setActiveIndex((current) =>
                optionCount ? (current - 1 + optionCount) % optionCount : 0,
              );
              return;
            }
            if (event.key === "Enter") {
              event.preventDefault();
              if (optionCount > 0) {
                selectActiveOption();
              } else if (query.trim()) {
                setCreateDraft(createContactDraft(query));
                setIsCreateOpen(true);
                setIsOpen(false);
              }
              return;
            }
            if (event.key === "Escape") {
              event.preventDefault();
              setIsOpen(false);
              setQuery(selectedLabel);
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
              const isSelected = option.id === selectedId;
              return (
                <button
                  key={option.id}
                  role="option"
                  aria-selected={isSelected}
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
                  <span className="min-w-0 truncate">{option.label}</span>
                  {isSelected ? (
                    <Check className="size-4 shrink-0 text-emerald-600" strokeWidth={3} />
                  ) : (
                    <span className="size-4 shrink-0" />
                  )}
                </button>
              );
            })}
            {query.trim() ? (
              <button
                type="button"
                role="option"
                className="block w-full cursor-pointer rounded-md bg-card px-3 py-2 text-left text-sm font-medium text-primary hover:bg-muted"
                onMouseDown={(event) => {
                  event.preventDefault();
                  setCreateDraft(createContactDraft(query));
                  setIsCreateOpen(true);
                  setIsOpen(false);
                }}
              >
                + Create contact "{query.trim()}"
              </button>
            ) : null}
          </div>
        ) : query.trim() && isOpen ? (
          <div
            role="listbox"
            className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-[100] overflow-hidden rounded-md border border-border bg-card p-1 shadow-2xl ring-1 ring-black/5"
            onMouseDown={(event) => event.preventDefault()}
          >
            <button
              type="button"
              role="option"
              className="block w-full cursor-pointer rounded-md bg-card px-3 py-2 text-left text-sm font-medium text-primary hover:bg-muted"
              onMouseDown={(event) => {
                event.preventDefault();
                setCreateDraft(createContactDraft(query));
                setIsCreateOpen(true);
                setIsOpen(false);
              }}
            >
              + Create contact "{query.trim()}"
            </button>
          </div>
        ) : null}
      </div>
      {isCreateOpen ? (
        <div className="fixed inset-0 z-[120] grid place-items-center bg-background/55 p-4 backdrop-blur-sm">
          <div className="relative w-[min(620px,calc(100vw-2rem))] rounded-md border-2 border-border bg-card p-5 shadow-2xl ring-1 ring-foreground/10">
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="absolute right-3 top-3 size-8 rounded-md"
              onClick={closeCreateContact}
              aria-label="Close contact popup"
            >
              <X className="size-4" />
            </Button>
            <div className="space-y-1 pr-10">
              <h2 className="text-lg font-semibold text-foreground">New contact</h2>
              <p className="text-sm text-muted-foreground">
                Add the minimum details and select it for this sales invoice.
              </p>
            </div>
            <div className="mt-5 grid gap-4">
              <Field label="Name">
                <Input
                  autoFocus
                  className="h-11 rounded-md"
                  value={createDraft.name}
                  onChange={(event) =>
                    setCreateDraft((current) => ({ ...current, name: event.target.value }))
                  }
                />
              </Field>
              <Field label="Mobile">
                <Input
                  className="h-11 rounded-md"
                  value={createDraft.phoneNumber}
                  onChange={(event) =>
                    setCreateDraft((current) => ({ ...current, phoneNumber: event.target.value }))
                  }
                />
              </Field>
              <Field label="GSTIN">
                <Input
                  className="h-11 rounded-md uppercase"
                  value={createDraft.gstin}
                  onChange={(event) =>
                    setCreateDraft((current) => ({ ...current, gstin: event.target.value }))
                  }
                />
              </Field>
              <Field label="Billing address">
                <Input
                  className="h-11 rounded-md"
                  value={createDraft.addressLine1}
                  onChange={(event) =>
                    setCreateDraft((current) => ({ ...current, addressLine1: event.target.value }))
                  }
                />
              </Field>
              <PincodeAutocompleteField
                pincodes={pincodes}
                selectedPincodeId={createDraft.pincodeId}
                onPick={(pincode) =>
                  setCreateDraft((current) => ({
                    ...current,
                    addressLine1: current.addressLine1 || pincode.areaName || "",
                    cityId: pincode.cityId,
                    countryId: pincode.countryId ?? resolveIndia(countries)?.id ?? current.countryId,
                    districtId: pincode.districtId,
                    pincodeId: pincode.id,
                    pincodeText: pincode.code,
                    stateId: pincode.stateId,
                  }))
                }
                onTextChange={(value) =>
                  setCreateDraft((current) => ({
                    ...current,
                    cityId: null,
                    districtId: null,
                    pincodeId: null,
                    pincodeText: value,
                    stateId: null,
                  }))
                }
              />
              <div className="grid gap-3 rounded-md border border-border/70 bg-muted/20 p-3 text-sm md:grid-cols-2">
                <LocationPreview label="Country" value={locationName(countries, createDraft.countryId) ?? "India"} />
                <LocationPreview label="State" value={locationNameById(pincodes, createDraft.pincodeId, "stateName")} />
                <LocationPreview label="District" value={locationNameById(pincodes, createDraft.pincodeId, "districtName")} />
                <LocationPreview label="City" value={locationNameById(pincodes, createDraft.pincodeId, "cityName")} />
              </div>
            </div>
            {locationError ? (
              <p className="mt-4 text-sm font-medium text-destructive">{locationError}</p>
            ) : null}
            {createError ? (
              <p className="mt-4 text-sm font-medium text-destructive">{createError}</p>
            ) : null}
            <div className="mt-5 flex flex-wrap justify-end gap-3 border-t border-border/70 pt-4">
              <Button
                type="button"
                variant="outline"
                className="rounded-xl"
                onClick={closeCreateContact}
              >
                Cancel
              </Button>
              <Button
                type="button"
                className="rounded-xl"
                disabled={isSaving || !createDraft.name.trim()}
                onClick={() => void createContact()}
              >
                {isSaving ? "Creating..." : "Create contact"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </Field>
  );
}

interface ContactCreateDraft {
  readonly addressLine1: string;
  readonly cityId: string | null;
  readonly countryId: string | null;
  readonly districtId: string | null;
  readonly gstin: string;
  readonly name: string;
  readonly phoneNumber: string;
  readonly pincodeId: string | null;
  readonly pincodeText: string;
  readonly stateId: string | null;
}

function createContactDraft(name: string): ContactCreateDraft {
  return {
    addressLine1: "",
    cityId: null,
    countryId: "country:in",
    districtId: null,
    gstin: "",
    name: name.trim(),
    phoneNumber: "",
    pincodeId: null,
    pincodeText: "",
    stateId: null,
  };
}

function toContactInput(draft: ContactCreateDraft) {
  const input = createDefaultContactFormValues();

  return {
    ...input,
    code: "-",
    gstin: draft.gstin.trim() || null,
    name: draft.name.trim(),
    addresses: draft.addressLine1.trim() || draft.pincodeId
      ? [
          {
            ...input.addresses[0],
            addressLine1: draft.addressLine1.trim() || "-",
            cityId: draft.cityId,
            countryId: draft.countryId ?? "country:in",
            districtId: draft.districtId,
            pincodeId: draft.pincodeId,
            stateId: draft.stateId,
          },
        ]
      : [],
    gstDetails: draft.gstin.trim()
      ? [{ gstin: draft.gstin.trim().toUpperCase(), isDefault: true, state: "-" }]
      : [],
    phones: draft.phoneNumber.trim()
      ? [{ isPrimary: true, phoneNumber: draft.phoneNumber.trim(), phoneType: "mobile" }]
      : [],
  };
}

function PincodeAutocompleteField({
  onPick,
  onTextChange,
  pincodes,
  selectedPincodeId,
}: {
  readonly onPick: (pincode: CommonLocationRecord) => void;
  readonly onTextChange: (value: string) => void;
  readonly pincodes: readonly CommonLocationRecord[];
  readonly selectedPincodeId: string | null;
}) {
  const selected = pincodes.find((pincode) => pincode.id === selectedPincodeId);
  const [query, setQuery] = useState(selected?.code ?? "");
  const [isOpen, setIsOpen] = useState(false);
  const filteredPincodes = pincodes
    .filter((pincode) => {
      const normalized = query.trim().toLowerCase();
      return (
        !normalized ||
        pincode.code.toLowerCase().includes(normalized) ||
        (pincode.areaName ?? "").toLowerCase().includes(normalized)
      );
    })
    .slice(0, 12);

  useEffect(() => {
    setQuery(selected?.code ?? "");
  }, [selected?.code]);

  return (
    <Field label="Pincode">
      <div className="relative z-10 focus-within:z-[90]">
        <Input
          className="h-11 rounded-md"
          inputMode="numeric"
          value={query}
          placeholder="Search pincode"
          onBlur={() => window.setTimeout(() => setIsOpen(false), 120)}
          onChange={(event) => {
            setQuery(event.target.value);
            onTextChange(event.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
        />
        {isOpen && filteredPincodes.length > 0 ? (
          <div
            className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-[100] max-h-60 overflow-y-auto rounded-md border border-border bg-card p-1 shadow-2xl ring-1 ring-black/5"
            onMouseDown={(event) => event.preventDefault()}
          >
            {filteredPincodes.map((pincode) => (
              <button
                key={pincode.id}
                type="button"
                className="flex w-full cursor-pointer items-center justify-between gap-3 rounded-md bg-card px-3 py-2 text-left text-sm text-foreground hover:bg-muted"
                onMouseDown={(event) => {
                  event.preventDefault();
                  setQuery(pincode.code);
                  onPick(pincode);
                  setIsOpen(false);
                }}
              >
                <span className="font-medium">{pincode.code}</span>
                <span className="min-w-0 truncate text-muted-foreground">
                  {pincode.areaName ?? pincode.cityName ?? ""}
                </span>
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </Field>
  );
}

function LocationPreview({ label, value }: { readonly label: string; readonly value: string | null }) {
  return (
    <div className="grid gap-0.5">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <span className="truncate font-medium text-foreground">{value || "-"}</span>
    </div>
  );
}

function resolveIndia(countries: readonly CommonLocationRecord[]) {
  return (
    countries.find((country) => country.code.toUpperCase() === "IN") ??
    countries.find((country) => country.name?.toLowerCase() === "india") ??
    null
  );
}

function locationName(records: readonly CommonLocationRecord[], id: string | null) {
  return records.find((record) => record.id === id)?.name ?? null;
}

function locationNameById(
  pincodes: readonly CommonLocationRecord[],
  pincodeId: string | null,
  key: "cityName" | "districtName" | "stateName",
) {
  return pincodes.find((pincode) => pincode.id === pincodeId)?.[key] ?? null;
}

function contactRecordToLookupOption(contact: Awaited<ReturnType<typeof upsertContact>>) {
  const address =
    contact.addresses.find((item) => item.isDefault && item.isActive !== false) ??
    contact.addresses.find((item) => item.isActive !== false) ??
    contact.addresses[0];
  const resolvedAddress = [address?.addressLine1, address?.addressLine2]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(", ");

  return {
    id: String(contact.id),
    label: contact.name,
    secondaryLabel: null,
    billingAddress: resolvedAddress,
    shippingAddress: resolvedAddress,
  } satisfies SalesLookupOption;
}

interface ProductCreateDraft {
  readonly hsnCodeId: string | null;
  readonly name: string;
  readonly taxId: string | null;
  readonly unitId: string | null;
}

type ProductPopupLookupKey = "hsnCodes" | "taxes" | "units";

function createProductDraft(name: string): ProductCreateDraft {
  const trimmedName = name.trim();

  return {
    hsnCodeId: masterAutocompleteDefaultId,
    name: trimmedName,
    taxId: masterAutocompleteDefaultId,
    unitId: masterAutocompleteDefaultId,
  };
}

function buildProductPopupLookupCreatePayload(
  moduleKey: ProductPopupLookupKey,
  label: string,
) {
  const trimmedLabel = label.trim();
  const code = toSalesItemLookupCode(trimmedLabel);

  if (moduleKey === "hsnCodes") {
    return {
      code,
      description: trimmedLabel,
      isActive: true,
      name: trimmedLabel,
    };
  }

  if (moduleKey === "units") {
    return {
      code,
      description: null,
      isActive: true,
      name: trimmedLabel,
      symbol: code.slice(0, 8),
    };
  }

  return {
    code,
    description: null,
    isActive: true,
    name: trimmedLabel,
    ratePercent: Number.parseFloat(trimmedLabel.replace(/[^0-9.]+/g, "")) || 0,
    taxType: "GST",
  };
}

function productPopupLookupLabel(moduleKey: ProductPopupLookupKey) {
  if (moduleKey === "hsnCodes") return "HSN Code";
  if (moduleKey === "units") return "Unit";
  return "GST Tax";
}

function toProductInput(draft: ProductCreateDraft) {
  const input = createDefaultProductFormValues();

  return {
    ...input,
    basePrice: 0,
    code: "-",
    costPrice: 0,
    hsnCodeId: draft.hsnCodeId ?? masterAutocompleteDefaultId,
    name: draft.name.trim(),
    sku: "",
    taxId: draft.taxId ?? masterAutocompleteDefaultId,
    unitId: draft.unitId ?? masterAutocompleteDefaultId,
  };
}

function productRecordToLookupOption(
  product: Awaited<ReturnType<typeof upsertProduct>>,
  taxes: readonly CommonRecord[],
) {
  return {
    id: String(product.id),
    label: product.name,
    secondaryLabel: null,
    hsnCodeId: product.hsnCodeId,
    mrp: product.basePrice,
    productSku: product.sku,
    rate: product.basePrice,
    colour: null,
    size: null,
    taxId: product.taxId,
    taxRate: commonTaxRate(taxes.find((tax) => String(tax.id) === String(product.taxId))),
    unitId: product.unitId,
  } satisfies SalesLookupOption;
}

type SalesCommonLookupKey = "colours" | "hsnCodes" | "sizes" | "taxes" | "units";

function commonRecordLabel(record: CommonRecord, moduleKey: SalesCommonLookupKey) {
  const name = typeof record.name === "string" ? record.name.trim() : "";
  const code = typeof record.code === "string" ? record.code.trim() : "";
  if (moduleKey === "hsnCodes") return code || name || String(record.id);
  if (moduleKey === "units") return name || code || String(record.id);
  if (moduleKey === "taxes") {
    const rate = commonTaxRate(record);
    if (rate > 0) return `${rate}%`;
  }
  return name || code || String(record.id);
}

function buildSalesItemLookupCreatePayload(moduleKey: SalesItemLookupKey, label: string) {
  const trimmedLabel = label.trim();
  const code = toSalesItemLookupCode(trimmedLabel);

  if (moduleKey === "colours") {
    return {
      code,
      description: null,
      hexCode: null,
      isActive: true,
      name: trimmedLabel,
    };
  }

  return {
    code,
    description: null,
    isActive: true,
    name: trimmedLabel,
    sortOrder: 0,
  };
}

function salesItemLookupLabel(moduleKey: SalesItemLookupKey) {
  return moduleKey === "colours" ? "Colour" : "Size";
}

function getSalesItemLookupErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Please try again.";
}

function toSalesItemLookupCode(label: string) {
  return (
    label
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 40) || "NEW"
  );
}

function commonTaxRate(record: CommonRecord | undefined) {
  if (!record) return 0;
  const rawRate = record.ratePercent ?? record.rate_percent;
  const rate = typeof rawRate === "number" ? rawRate : Number(rawRate ?? 0);
  return Number.isFinite(rate) ? rate : 0;
}

function Field({
  children,
  label,
}: {
  readonly children: React.ReactNode;
  readonly label: string;
}) {
  return (
    <Label className="grid gap-2 text-sm font-medium text-muted-foreground">
      <span>{label}</span>
      {children}
    </Label>
  );
}

function SummaryRow({
  label,
  strong = false,
  value,
}: {
  readonly label: string;
  readonly strong?: boolean;
  readonly value: string;
}) {
  return (
    <div
      className={
        strong
          ? "grid grid-cols-[1fr_auto_8rem] gap-4 font-semibold"
          : "grid grid-cols-[1fr_auto_8rem] gap-4"
      }
    >
      <span className="text-muted-foreground">{label}</span>
      <span>:</span>
      <span className="text-right">{value}</span>
    </div>
  );
}

type ItemTableColumnId =
  | "action"
  | "areaSq"
  | "cgst"
  | "colour"
  | "dcNo"
  | "description"
  | "gst"
  | "hsnCode"
  | "igst"
  | "particulars"
  | "poNo"
  | "price"
  | "quantity"
  | "sgst"
  | "serialNo"
  | "size"
  | "subTotal"
  | "taxPercent"
  | "taxableAmount";

type SalesTaxMode = "cgst-sgst" | "igst";

function getItemTableHeaders(
  kind: SalesIndustryKind,
  taxMode: SalesTaxMode,
  salesLayout: SalesBillingLayout,
) {
  const quantityPriceHeaders = [
    header("quantity", "Quantity"),
    header("price", "Price"),
  ];
  const taxHeaders = [
    header("taxableAmount", "Taxable"),
    header("taxPercent", "GST Percent"),
    ...(taxMode === "cgst-sgst"
      ? [header("cgst", "CGST"), header("sgst", "SGST")]
      : [header("igst", "IGST")]),
    header("subTotal", "Sub Total"),
    header("action", "Action"),
  ];

  if (kind === "garment") {
    return [
      header("serialNo", "#"),
      ...(salesLayout.usePo ? [header("poNo", "PO no")] : []),
      ...(salesLayout.useDc ? [header("dcNo", "DC no")] : []),
      header("particulars", "Product name"),
      header("description", "Description"),
      header("hsnCode", "HSN Code"),
      ...(salesLayout.useSize ? [header("size", "Size")] : []),
      ...(salesLayout.useColour ? [header("colour", "Colour")] : []),
      ...quantityPriceHeaders,
      ...taxHeaders,
    ];
  }

  if (kind === "upvc") {
    return [
      header("serialNo", "#"),
      ...(salesLayout.usePo ? [header("poNo", "PO no")] : []),
      ...(salesLayout.useDc ? [header("dcNo", "DC no")] : []),
      header("particulars", "Product name"),
      header("description", "Description"),
      ...(salesLayout.useSize ? [header("size", "Size")] : []),
      ...(salesLayout.useColour ? [header("colour", "Colour")] : []),
      ...quantityPriceHeaders,
      header("areaSq", "Area sq"),
      ...taxHeaders,
    ];
  }

  return [
    header("serialNo", "#"),
    ...(salesLayout.usePo ? [header("poNo", "PO no")] : []),
    ...(salesLayout.useDc ? [header("dcNo", "DC no")] : []),
    header("particulars", "Product name"),
    header("description", "Description"),
    header("hsnCode", "HSN Code"),
    ...(salesLayout.useSize ? [header("size", "Size")] : []),
    ...(salesLayout.useColour ? [header("colour", "Colour")] : []),
    ...quantityPriceHeaders,
    ...taxHeaders,
  ];
}

function header(id: ItemTableColumnId, label: string) {
  return { id, label };
}

function itemTableValue(
  columnId: ItemTableColumnId,
  item: SalesItemInput,
  taxable: number,
  gst: number,
  splitGst: number,
  hsnCodes: readonly CommonRecord[],
) {
  const values: Record<ItemTableColumnId, ReactNode> = {
    action: "",
    areaSq: item.areaSq || "-",
    cgst: formatMoney(splitGst),
    colour: item.colour ?? "-",
    dcNo: item.dcNo ?? "-",
    description: item.description ?? "-",
    gst: formatMoney(gst),
    hsnCode: hsnCodeName(hsnCodes, item.hsnCodeId),
    igst: formatMoney(gst),
    particulars: item.productName,
    poNo: item.poNo ?? "-",
    price: formatMoney(item.rate),
    quantity: item.quantity,
    serialNo: "",
    sgst: formatMoney(splitGst),
    size: item.size ?? "-",
    subTotal: formatMoney(taxable + gst),
    taxPercent: `${item.taxRate}%`,
    taxableAmount: formatMoney(taxable),
  };

  return values[columnId];
}

function itemTableTotalValue(
  columnId: ItemTableColumnId,
  form: SalesInput,
  totals: ReturnType<typeof calculateSalesTotals>,
) {
  const values: Partial<Record<ItemTableColumnId, ReactNode>> = {
    cgst: formatMoney(totals.gstTotal / 2),
    igst: formatMoney(totals.gstTotal),
    particulars: "TOTALS.",
    quantity: form.items.reduce((sum, item) => sum + item.quantity, 0),
    sgst: formatMoney(totals.gstTotal / 2),
    subTotal: formatMoney(totals.grandTotal),
    taxableAmount: formatMoney(totals.taxableAmount),
  };

  return values[columnId] ?? "";
}

function totalCellClassName(columnId: ItemTableColumnId) {
  if (columnId === "action") return "px-1.5 py-2 text-center";
  if (columnId === "particulars") return "border-r border-border/70 px-1.5 py-2 text-center";
  if (columnId === "quantity") return "border-r border-border/70 px-1.5 py-2 text-center";
  if (columnId === "serialNo") return "border-r border-border/70 px-1.5 py-2 text-center";
  return "border-r border-border/70 px-1.5 py-2 text-right";
}

function itemCellClassName(columnId: ItemTableColumnId) {
  if (
    columnId === "colour" ||
    columnId === "quantity" ||
    columnId === "size" ||
    columnId === "taxPercent"
  ) {
    return "border-r border-border/70 px-1.5 py-2 text-center";
  }
  if (columnId === "description" || columnId === "particulars") {
    return "border-r border-border/70 px-1.5 py-2 text-left";
  }
  if (isRightAlignedItemColumn(columnId)) return "border-r border-border/70 px-1.5 py-2 text-right";
  return "border-r border-border/70 px-1.5 py-2";
}

function headerCellClassName(columnId: ItemTableColumnId) {
  const base =
    "border-b border-r border-border/70 px-1 py-2 text-center text-[10px] font-medium leading-tight last:border-r-0 sm:text-[11px] xl:text-xs";
  const widths: Partial<Record<ItemTableColumnId, string>> = {
    action: "w-[4%]",
    areaSq: "w-[5%]",
    cgst: "w-[7%]",
    colour: "w-[5%]",
    dcNo: "w-[5%]",
    description: "w-[16%]",
    hsnCode: "w-[5%]",
    igst: "w-[7%]",
    particulars: "w-[18%]",
    poNo: "w-[5%]",
    price: "w-[7%]",
    quantity: "w-[5%]",
    sgst: "w-[7%]",
    serialNo: "w-[3%]",
    size: "w-[5%]",
    subTotal: "w-[7%]",
    taxPercent: "w-[5%]",
    taxableAmount: "w-[7%]",
  };
  return `${base} ${widths[columnId] ?? "w-[5%]"}`;
}

function itemCellContentClassName(columnId: ItemTableColumnId) {
  if (columnId === "description" || columnId === "particulars") return "truncate text-left";
  if (
    columnId === "colour" ||
    columnId === "hsnCode" ||
    columnId === "size" ||
    columnId === "taxPercent"
  ) {
    return "truncate text-center";
  }
  if (isRightAlignedItemColumn(columnId)) return "truncate text-right";
  return "truncate";
}

function isRightAlignedItemColumn(columnId: ItemTableColumnId) {
  return ["cgst", "igst", "price", "sgst", "subTotal", "taxableAmount"].includes(columnId);
}

function hsnCodeName(hsnCodes: readonly CommonRecord[], value: string | null) {
  if (!value) return "-";
  const match = hsnCodes.find((record) => String(record.id) === String(value));
  if (!match) return "-";
  const name = typeof match.name === "string" ? match.name.trim() : "";
  return name || "-";
}
