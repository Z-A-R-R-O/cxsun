"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type Dispatch, type ReactNode, type SetStateAction } from "react";
import { toast } from "sonner";
import { Check, Save, X } from "lucide-react";
import {
  AnimatedTabs,
  Button,
  Input,
  Label,
  MasterListPageFrame,
  MasterListUpsertCard,
  MasterListUpsertLayout,
  Separator,
  useGlobalLoader,
} from "@cxnext/ui";
import { createCommonRecord, listCommonRecords } from "../../../common/application/common-service";
import type { CommonRecord } from "../../../common/domain/common-master";
import {
  getProduct,
  prepareProductForSave,
  upsertProduct,
} from "../../application/product-upsert.service";
import type { ProductUpsertInput } from "../../domain/product";
import { createDefaultProductFormValues, toProductFormValues } from "../../domain/product-form";
import {
  ProductField,
  ProductSection,
  ProductStatusSwitch,
  ProductTextInput,
} from "../components/product-form-sections";

type ProductEditReturnTo = "list" | "show";
type ProductLookupKey = "productTypes" | "hsnCodes" | "units" | "taxes";
type ProductLookupMap = Record<ProductLookupKey, readonly CommonRecord[]>;

const emptyProductLookups: ProductLookupMap = {
  productTypes: [],
  hsnCodes: [],
  units: [],
  taxes: [],
};

export function ProductUpsertPage({
  productId,
  returnTo = "show",
}: {
  readonly productId?: number;
  readonly returnTo?: ProductEditReturnTo;
}) {
  const router = useRouter();
  const { show: showGlobalLoader } = useGlobalLoader();
  const isEdit = Boolean(productId);
  const [form, setForm] = useState<ProductUpsertInput>(createDefaultProductFormValues());
  const [productLookups, setProductLookups] = useState<ProductLookupMap>(emptyProductLookups);
  const [isLoaded, setIsLoaded] = useState(!isEdit);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    loadProductLookups(controller.signal)
      .then((nextLookups) => setProductLookups(nextLookups))
      .catch((error: unknown) => {
        if (!controller.signal.aborted) console.error(error);
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!productId) {
      setForm(createDefaultProductFormValues());
      setIsLoaded(true);
      return;
    }

    const controller = new AbortController();
    const hideGlobalLoader = showGlobalLoader();

    setIsLoaded(false);
    getProduct(productId, { signal: controller.signal })
      .then((record) => {
        if (record) {
          setForm(toProductFormValues(record));
        }
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          console.error(error);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsLoaded(true);
          hideGlobalLoader();
        }
      });

    return () => {
      controller.abort();
      hideGlobalLoader();
    };
  }, [productId, showGlobalLoader]);

  async function saveProduct() {
    if (form.name.trim().length < 2) {
      setMessage("Enter product name.");
      return;
    }

    const hideGlobalLoader = showGlobalLoader();

    try {
      const product = await upsertProduct(prepareProductForSave(form), productId);
      toast.success(isEdit ? "Product updated" : "Product created", {
        description: `${product.name} was saved.`,
      });
      router.push(isEdit && returnTo === "list" ? "/desk/product" : `/desk/product/${product.id}`);
    } catch (error) {
      hideGlobalLoader();
      const errorMessage = getErrorMessage(error);
      setMessage(errorMessage);
      toast.error("Could not save product", { description: errorMessage });
    }
  }

  async function createProductLookup(moduleKey: ProductLookupKey, label: string) {
    try {
      const record = await createCommonRecord(
        moduleKey,
        buildProductLookupCreatePayload(moduleKey, label),
      );
      setProductLookups((current) => ({
        ...current,
        [moduleKey]: [...current[moduleKey], record],
      }));
      toast.success(`${productLookupLabel(moduleKey)} created`, {
        description: getCommonRecordLabel(record),
      });
      return record;
    } catch (error) {
      toast.error(`Could not create ${productLookupLabel(moduleKey).toLowerCase()}`, {
        description: getErrorMessage(error),
      });
      return null;
    }
  }

  if (isEdit && !isLoaded) {
    return (
      <MasterListPageFrame
        description="Loading product record."
        technicalName="page.product.upsert.loading"
        title="Product"
      >
        <ProductSection title="Product setup">
          <p className="text-sm text-muted-foreground">Loading product.</p>
        </ProductSection>
      </MasterListPageFrame>
    );
  }

  return (
    <MasterListPageFrame
      action={
        <Button asChild variant="outline" className="rounded-xl">
          <Link
            href={productId && returnTo === "show" ? `/desk/product/${productId}` : "/desk/product"}
          >
            <X className="size-4" />
            Cancel
          </Link>
        </Button>
      }
      description={
        isEdit
          ? "Update billing and accounts product details."
          : "Create a billing and accounts product master record."
      }
      technicalName="page.product.upsert"
      title={isEdit ? "Edit product" : "New product"}
    >
      <MasterListUpsertLayout>
        <MasterListUpsertCard>
          <form
            className="space-y-6"
            onSubmit={(event) => {
              event.preventDefault();
              void saveProduct();
            }}
          >
            <AnimatedTabs
              tabs={[
                {
                  value: "details",
                  label: "Details",
                  content: (
                    <ProductDetailsTab
                      form={form}
                      lookups={productLookups}
                      onCreateLookup={createProductLookup}
                      setForm={setForm}
                    />
                  ),
                },
                {
                  value: "notes",
                  label: "Notes",
                  content: <ProductNotesTab form={form} setForm={setForm} />,
                },
              ]}
            />
            {message ? (
              <p className="text-sm font-medium text-muted-foreground">{message}</p>
            ) : null}
            <Separator />
            <Button type="submit" className="rounded-xl">
              <Save className="size-4" />
              {isEdit ? "Update product" : "Create product"}
            </Button>
          </form>
        </MasterListUpsertCard>
      </MasterListUpsertLayout>
    </MasterListPageFrame>
  );
}

type ProductFormStateProps = {
  readonly form: ProductUpsertInput;
  readonly setForm: Dispatch<SetStateAction<ProductUpsertInput>>;
};

function ProductTabPanel({ children }: { readonly children: ReactNode }) {
  return (
    <div className="space-y-4 rounded-2xl border border-border/70 bg-card/80 p-4 shadow-sm md:p-5">
      {children}
    </div>
  );
}

function ProductDetailsTab({
  form,
  lookups,
  onCreateLookup,
  setForm,
}: ProductFormStateProps & {
  readonly lookups: ProductLookupMap;
  readonly onCreateLookup: (
    moduleKey: ProductLookupKey,
    label: string,
  ) => Promise<CommonRecord | null>;
}) {
  return (
    <ProductTabPanel>
      <div className="grid gap-4 md:grid-cols-2">
        <ProductField label="Name">
          <ProductTextInput
            value={form.name}
            onChange={(event) =>
              setForm({
                ...form,
                name: event.target.value,
              })
            }
          />
        </ProductField>
        <ProductField label="Code">
          <ProductTextInput
            value={form.code}
            placeholder="Auto generated"
            onChange={(event) => setForm({ ...form, code: event.target.value.toUpperCase() })}
          />
        </ProductField>
        <ProductField label="Base price">
          <Input
            type="number"
            className="h-11 rounded-xl"
            value={form.basePrice}
            onChange={(event) => setForm({ ...form, basePrice: Number(event.target.value || 0) })}
          />
        </ProductField>
        <ProductField label="Cost price">
          <Input
            type="number"
            className="h-11 rounded-xl"
            value={form.costPrice}
            onChange={(event) => setForm({ ...form, costPrice: Number(event.target.value || 0) })}
          />
        </ProductField>
        <ProductCommonLookupInput
          label="Product Type"
          moduleKey="productTypes"
          options={lookups.productTypes}
          value={form.productTypeId}
          onChange={(value, record) =>
            setForm({
              ...form,
              productTypeId: value,
              productTypeName: record ? getCommonRecordLabel(record) : null,
            })
          }
          onCreate={(label) => onCreateLookup("productTypes", label)}
        />
        <ProductCommonLookupInput
          label="HSN Code"
          moduleKey="hsnCodes"
          options={lookups.hsnCodes}
          value={form.hsnCodeId}
          onChange={(value) => setForm({ ...form, hsnCodeId: value })}
          onCreate={(label) => onCreateLookup("hsnCodes", label)}
        />
        <ProductCommonLookupInput
          label="Unit"
          moduleKey="units"
          options={lookups.units}
          value={form.unitId}
          onChange={(value) => setForm({ ...form, unitId: value })}
          onCreate={(label) => onCreateLookup("units", label)}
        />
        <ProductCommonLookupInput
          label="GST Tax"
          moduleKey="taxes"
          options={lookups.taxes}
          value={form.taxId}
          onChange={(value) => setForm({ ...form, taxId: value })}
          onCreate={(label) => onCreateLookup("taxes", label)}
        />
        <div className="md:col-span-2">
          <ProductStatusSwitch
            checked={form.isActive}
            onCheckedChange={(checked) => setForm({ ...form, isActive: checked })}
          />
        </div>
      </div>
    </ProductTabPanel>
  );
}

function ProductNotesTab({ form, setForm }: ProductFormStateProps) {
  return (
    <ProductTabPanel>
      <ProductField label="Description">
        <textarea
          value={form.description ?? ""}
          className="min-h-28 rounded-xl border border-input bg-background px-3 py-2 text-sm"
          onChange={(event) => setForm({ ...form, description: event.target.value })}
        />
      </ProductField>
    </ProductTabPanel>
  );
}

function ProductCommonLookupInput({
  label,
  moduleKey,
  onChange,
  onCreate,
  options,
  value,
}: {
  readonly label: string;
  readonly moduleKey: ProductLookupKey;
  readonly onChange: (value: string | null, record: CommonRecord | null) => void;
  readonly onCreate: (label: string) => Promise<CommonRecord | null>;
  readonly options: readonly CommonRecord[];
  readonly value: string | null;
}) {
  const [selectedValue, setSelectedValue] = useState<string | null>(value);
  const selectedOption = findCommonOption(options, selectedValue);
  const [query, setQuery] = useState(() =>
    selectedOption
      ? getProductLookupRecordLabel(moduleKey, selectedOption)
      : formatLookupFallback(value),
  );
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const normalizedQuery = query.trim().toLowerCase();
  const filteredOptions = options.filter((option) =>
    getProductLookupRecordLabel(moduleKey, option).toLowerCase().includes(normalizedQuery),
  );
  const exactOption = options.find(
    (option) => getProductLookupRecordLabel(moduleKey, option).toLowerCase() === normalizedQuery,
  );
  const canCreate = Boolean(query.trim()) && !exactOption;
  const optionCount = filteredOptions.length + (canCreate ? 1 : 0);

  useEffect(() => setSelectedValue(value), [value]);
  useEffect(() => {
    setQuery(
      selectedOption
        ? getProductLookupRecordLabel(moduleKey, selectedOption)
        : formatLookupFallback(selectedValue),
    );
  }, [moduleKey, selectedOption, selectedValue]);
  useEffect(() => setActiveIndex(0), [query, options]);

  function selectOption(option: CommonRecord) {
    const nextValue = String(option.id);
    setQuery(getProductLookupRecordLabel(moduleKey, option));
    setSelectedValue(nextValue);
    onChange(nextValue, option);
    setIsOpen(false);
  }

  async function createAndSelect() {
    const labelValue = query.trim();
    if (!labelValue) return;
    const record = await onCreate(labelValue);
    if (!record) return;
    selectOption(record);
  }

  async function selectActiveOption() {
    if (optionCount === 0) return;
    const activeOption = filteredOptions[activeIndex];
    if (activeOption) {
      selectOption(activeOption);
      return;
    }
    if (canCreate && activeIndex === filteredOptions.length) await createAndSelect();
  }

  return (
    <div className="relative z-10 grid gap-2 focus-within:z-[90]">
      <Label className="text-sm font-medium">{label}</Label>
      <Input
        aria-autocomplete="list"
        aria-expanded={isOpen}
        role="combobox"
        className="h-11 cursor-pointer rounded-xl"
        value={query}
        placeholder={`Search ${label.toLowerCase()}`}
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
        onBlur={() => {
          if (exactOption) {
            const nextValue = String(exactOption.id);
            setSelectedValue(nextValue);
            onChange(nextValue, exactOption);
          }
          window.setTimeout(() => setIsOpen(false), 120);
        }}
        onChange={(event) => {
          const nextQuery = event.target.value;
          setQuery(nextQuery);
          setIsOpen(true);
          const matchingOption = options.find(
            (option) =>
              getProductLookupRecordLabel(moduleKey, option).toLowerCase() ===
              nextQuery.trim().toLowerCase(),
          );
          const nextValue = matchingOption ? String(matchingOption.id) : null;
          setSelectedValue(nextValue);
          onChange(nextValue, matchingOption ?? null);
        }}
      />
      {isOpen && optionCount > 0 ? (
        <div
          role="listbox"
          className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-[100] max-h-60 overflow-y-auto overscroll-contain rounded-xl border border-border bg-card p-1 shadow-2xl ring-1 ring-black/5"
          onMouseDown={(event) => event.preventDefault()}
        >
          {filteredOptions.map((option, index) => {
            const isSelected = isCommonOptionSelected(option, selectedValue);
            return (
              <button
                key={option.id}
                role="option"
                aria-selected={isSelected}
                type="button"
                className={
                  activeIndex === index
                    ? "flex w-full cursor-pointer items-center justify-between gap-3 rounded-lg bg-muted px-3 py-2 text-left text-sm text-foreground"
                    : "flex w-full cursor-pointer items-center justify-between gap-3 rounded-lg bg-card px-3 py-2 text-left text-sm text-foreground hover:bg-muted"
                }
                onMouseDown={(event) => {
                  event.preventDefault();
                  selectOption(option);
                }}
              >
                <span className="min-w-0 truncate">
                  {getProductLookupRecordLabel(moduleKey, option)}
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
            <button
              type="button"
              role="option"
              aria-selected={activeIndex === filteredOptions.length}
              className={
                activeIndex === filteredOptions.length
                  ? "block w-full cursor-pointer rounded-lg bg-muted px-3 py-2 text-left text-sm font-medium text-primary"
                  : "block w-full cursor-pointer rounded-lg bg-card px-3 py-2 text-left text-sm font-medium text-primary hover:bg-muted"
              }
              onMouseDown={async (event) => {
                event.preventDefault();
                await createAndSelect();
              }}
            >
              + Create {productLookupLabel(moduleKey)} "{query.trim()}"
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Please try again.";
}

async function loadProductLookups(signal: AbortSignal): Promise<ProductLookupMap> {
  const [productTypes, hsnCodes, units, taxes] = await Promise.all([
    listCommonRecords("productTypes", { signal }),
    listCommonRecords("hsnCodes", { signal }),
    listCommonRecords("units", { signal }),
    listCommonRecords("taxes", { signal }),
  ]);
  return { productTypes, hsnCodes, units, taxes };
}

function buildProductLookupCreatePayload(moduleKey: ProductLookupKey, label: string) {
  const code = toLookupCode(label);
  switch (moduleKey) {
    case "productTypes":
      return { code, name: label, description: null, isActive: true };
    case "hsnCodes":
      return { code, name: label, description: label, isActive: true };
    case "units":
      return { code, name: label, symbol: code.slice(0, 8), description: null, isActive: true };
    case "taxes":
      return {
        code,
        name: label,
        description: null,
        taxType: "GST",
        ratePercent: Number.parseFloat(label.replace(/[^0-9.]+/g, "")) || 0,
        isActive: true,
      };
  }
}

function getCommonRecordLabel(record: CommonRecord) {
  const name = typeof record.name === "string" ? record.name : "";
  const code = typeof record.code === "string" ? record.code : "";
  return name || code || String(record.id);
}

function getProductLookupRecordLabel(moduleKey: ProductLookupKey, record: CommonRecord) {
  const code = typeof record.code === "string" ? record.code.trim() : "";
  if (moduleKey === "hsnCodes") return code || getCommonRecordLabel(record);
  return getCommonRecordLabel(record);
}

function findCommonOption(options: readonly CommonRecord[], value: string | null) {
  if (!value) return undefined;
  return options.find((option) => isCommonOptionSelected(option, value));
}

function isCommonOptionSelected(option: CommonRecord, value: string | null) {
  if (!value) return false;
  const optionId = String(option.id);
  return optionId === String(value) || optionId === String(toNumericId(value));
}

function formatLookupFallback(value: string | null) {
  if (!value) return "";
  const rawValue = String(value);
  const [, suffix] = rawValue.split(":");
  return suffix ? titleCaseLookupValue(suffix) : rawValue;
}

function titleCaseLookupValue(value: string) {
  return value
    .split(/[-_\s]+/g)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function productLookupLabel(moduleKey: ProductLookupKey) {
  return (
    {
      productTypes: "Product Type",
      hsnCodes: "HSN Code",
      units: "Unit",
      taxes: "GST Tax",
    } as const
  )[moduleKey];
}

function toLookupCode(label: string) {
  return label
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
}

function toNumericId(value: string | null) {
  const numberValue = Number(value);
  return Number.isInteger(numberValue) && numberValue > 0 ? numberValue : null;
}
