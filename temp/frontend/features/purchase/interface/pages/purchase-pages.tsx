"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import {
  ArrowLeft,
  Check,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Plus,
  Printer,
  Trash2,
  X,
} from "lucide-react";
import {
  AnimatedTabs,
  Button,
  Input,
  Label,
  MasterListEmptyState,
  MasterListPageFrame,
  MasterListPaginationCard,
  MasterListTableCard,
  MasterListToolbarCard,
  MasterListUpsertCard,
  MasterListUpsertLayout,
  RowActionMenu,
  SavePrintButtons,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  buildMasterListShowingLabel,
} from "@cxnext/ui";
import { getActiveCompany } from "../../../company/application/company-service";
import type { CompanyRecord } from "../../../company/domain/company";
import { EntryCollaborationPanel } from "../../../entries/interface/components/entry-collaboration-panel";
import { getCoreEnvSettings } from "../../../settings/infrastructure/core-settings-api";
import { getNextDocumentNumber } from "../../../document-settings/infrastructure/document-settings-api";
import { resolveSalesBillingLayout } from "../../../sales/application/sales-billing-layout-service";
import {
  listSalesProductLookups,
  listSupplierContactLookups,
} from "../../../sales/application/sales-service";
import type { SalesLookupOption, SalesRecord } from "../../../sales/domain/sales";
import {
  ContactAutocompleteField,
  ProductAutocompleteField,
  SalesItemMasterLookupField,
} from "../../../sales/interface/components/sales-voucher-form";
import {
  createCommonRecord,
  listCommonRecords,
  type CommonRecord,
} from "../../../common/application/common-service";
import {
  SalesInvoiceDocument,
  type SalesPrintCopy,
  type SalesPrintDetailLine,
} from "../../../sales/interface/pages/sales-print-page";
import {
  buildPurchaseColumnOptions,
  deletePurchase,
  filterPurchase,
  formatEntryDate,
  formatMoney,
  getPurchase,
  listPurchase,
  preparePurchaseInput,
  upsertPurchase,
} from "../../application/purchase-service";
import {
  defaultPurchaseInput,
  defaultPurchaseItem,
  defaultPurchaseColumnVisibility,
  purchaseStatusFilters,
  type PurchaseColumnId,
  type PurchaseInput,
  type PurchaseRecord,
  type PurchaseStatusFilter,
} from "../../domain/purchase";

const purchaseTypeOptions = [
  { label: "CGST-SGST", value: "cgst-sgst" },
  { label: "IGST", value: "igst" },
] as const;

export function PurchaseListPage() {
  const [records, setRecords] = useState<readonly PurchaseRecord[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<PurchaseStatusFilter>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [visibleColumns, setVisibleColumns] = useState<Record<PurchaseColumnId, boolean>>(
    defaultPurchaseColumnVisibility,
  );
  useEffect(() => void listPurchase().then(setRecords), []);
  const filtered = useMemo(
    () =>
      filterPurchase(records, search, statusFilter).sort((left, right) =>
        left.documentNo.localeCompare(right.documentNo),
      ),
    [records, search, statusFilter],
  );
  const totalPages = Math.max(1, Math.ceil(filtered.length / rowsPerPage));
  const pageRecords = filtered.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);
  const columnOptions = useMemo(
    () =>
      buildPurchaseColumnOptions({
        visibleColumns,
        onToggle: (columnId, checked) =>
          setVisibleColumns((currentValue) => ({ ...currentValue, [columnId]: checked })),
      }),
    [visibleColumns],
  );

  async function remove(record: PurchaseRecord) {
    try {
      await deletePurchase(record.id);
      setRecords((currentRecords) => currentRecords.filter((item) => item.id !== record.id));
      toast.success("Purchase deleted");
    } catch (error) {
      toast.error("Could not delete purchase", { description: getErrorMessage(error) });
    }
  }

  async function restore(record: PurchaseRecord) {
    try {
      const restored = await upsertPurchase(
        preparePurchaseInput({
          ...defaultPurchaseInput(),
          ...record,
          documentDate: record.documentDate.slice(0, 10),
          dueDate: record.dueDate ? record.dueDate.slice(0, 10) : null,
          supplierInvoiceDate: record.supplierInvoiceDate
            ? record.supplierInvoiceDate.slice(0, 10)
            : null,
          isActive: true,
        }),
        record.id,
      );
      setRecords((currentRecords) =>
        currentRecords.map((item) => (item.id === restored.id ? restored : item)),
      );
      toast.success("Purchase restored");
    } catch (error) {
      toast.error("Could not restore purchase", { description: getErrorMessage(error) });
    }
  }

  return (
    <MasterListPageFrame
      action={
        <Button asChild className="rounded-xl">
          <Link href="/desk/purchase/new">
            <Plus className="size-4" />
            New Purchase
          </Link>
        </Button>
      }
      description="Create and review supplier purchase bills."
      technicalName="page.entries.purchase.list"
      title="Purchase"
    >
      <MasterListToolbarCard
        columns={columnOptions}
        filterOptions={purchaseStatusFilters}
        filterValue={statusFilter}
        onFilterValueChange={(nextValue) => {
          setStatusFilter(nextValue as PurchaseStatusFilter);
          setCurrentPage(1);
        }}
        onSearchValueChange={(nextValue) => {
          setSearch(nextValue);
          setCurrentPage(1);
        }}
        onShowAllColumns={() => setVisibleColumns(defaultPurchaseColumnVisibility)}
        searchPlaceholder="Search bill, supplier, supplier invoice, reference, or status"
        searchValue={search}
      />
      <MasterListTableCard className="rounded-md">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1040px] border-collapse text-sm">
            <thead className="bg-muted/55">
              <tr>
                {visibleColumns.documentNo ? <ListHeader>Entry no</ListHeader> : null}
                {visibleColumns.documentDate ? <ListHeader>Entry date</ListHeader> : null}
                {visibleColumns.party ? <ListHeader>Supplier</ListHeader> : null}
                {visibleColumns.supplierInvoice ? <ListHeader>Supplier bill no</ListHeader> : null}
                {visibleColumns.status ? <ListHeader>Status</ListHeader> : null}
                {visibleColumns.paymentStatus ? <ListHeader>Payment</ListHeader> : null}
                {visibleColumns.total ? <ListHeader align="right">Total</ListHeader> : null}
                {visibleColumns.balance ? <ListHeader align="right">Balance</ListHeader> : null}
                {visibleColumns.updated ? <ListHeader>Updated</ListHeader> : null}
                <ListHeader align="right">Action</ListHeader>
              </tr>
            </thead>
            <tbody>
              {pageRecords.map((record) => (
                <tr key={record.id} className="border-b border-border/60 last:border-b-0">
                  {visibleColumns.documentNo ? (
                    <td className="px-4 py-2.5">
                      <Link
                        href={`/desk/purchase/${record.id}`}
                        className="font-medium text-foreground hover:underline"
                      >
                        {record.documentNo}
                      </Link>
                    </td>
                  ) : null}
                  {visibleColumns.documentDate ? (
                    <td className="px-4 py-2.5 text-muted-foreground">
                      {formatEntryDate(record.documentDate)}
                    </td>
                  ) : null}
                  {visibleColumns.party ? (
                    <td className="px-4 py-2.5">{record.partyName}</td>
                  ) : null}
                  {visibleColumns.supplierInvoice ? (
                    <td className="px-4 py-2.5 text-muted-foreground">
                      {record.supplierInvoiceNo ?? "-"}
                    </td>
                  ) : null}
                  {visibleColumns.status ? <td className="px-4 py-2.5">{record.status}</td> : null}
                  {visibleColumns.paymentStatus ? (
                    <td className="px-4 py-2.5 text-muted-foreground">{record.paymentStatus}</td>
                  ) : null}
                  {visibleColumns.total ? (
                    <td className="px-4 py-2.5 text-right">{formatMoney(record.grandTotal)}</td>
                  ) : null}
                  {visibleColumns.balance ? (
                    <td className="px-4 py-2.5 text-right">{formatMoney(record.balanceAmount)}</td>
                  ) : null}
                  {visibleColumns.updated ? (
                    <td className="px-4 py-2.5 text-muted-foreground">
                      {formatEntryDate(record.updatedAt)}
                    </td>
                  ) : null}
                  <td className="px-4 py-2 text-right">
                    <RowActionMenu
                      editHref={`/desk/purchase/${record.id}/edit`}
                      isActive={record.isActive}
                      printHref={`/desk/purchase/${record.id}?print=1`}
                      viewHref={`/desk/purchase/${record.id}`}
                      onDelete={() => void remove(record)}
                      onRestore={() => void restore(record)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {pageRecords.length === 0 ? (
          <MasterListEmptyState>No purchase bills found.</MasterListEmptyState>
        ) : null}
      </MasterListTableCard>
      <MasterListPaginationCard
        page={currentPage}
        rowsPerPage={rowsPerPage}
        showingLabel={buildMasterListShowingLabel({
          page: currentPage,
          pageSize: rowsPerPage,
          totalCount: filtered.length,
        })}
        singularLabel="purchase bills"
        totalCount={filtered.length}
        totalPages={totalPages}
        onPageChange={(nextPage) => setCurrentPage(nextPage)}
        onNextPage={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
        onPreviousPage={() => setCurrentPage((page) => Math.max(1, page - 1))}
        onRowsPerPageChange={(nextValue) => {
          setRowsPerPage(nextValue);
          setCurrentPage(1);
        }}
      />
    </MasterListPageFrame>
  );
}

export function PurchaseShowPage({
  purchaseId,
  shouldPrint = false,
}: {
  readonly purchaseId: number;
  readonly shouldPrint?: boolean;
}) {
  const [record, setRecord] = useState<PurchaseRecord | null>(null);
  const [industryCode, setIndustryCode] = useState<string | null>(null);
  const [industryName, setIndustryName] = useState<string | null>(null);
  const [printCompany, setPrintCompany] = useState<CompanyRecord | null>(null);
  const [printCopies, setPrintCopies] = useState<readonly SalesPrintCopy[]>(["original"]);

  useEffect(() => void getPurchase(purchaseId).then(setRecord), [purchaseId]);

  useEffect(() => {
    const controller = new AbortController();
    Promise.all([
      getActiveCompany({ signal: controller.signal }),
      getCoreEnvSettings({ signal: controller.signal }).catch(() => null),
    ])
      .then(([company, settings]) => {
        if (controller.signal.aborted) return;
        setPrintCompany(company);
        setIndustryCode(getAppTypeFromSettings(settings) ?? company?.industryCode ?? null);
        setIndustryName(company?.industryName ?? null);
      })
      .catch((error) => {
        if (isAbortError(error)) return;
        setPrintCompany(null);
        setIndustryCode(null);
        setIndustryName(null);
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!record || !shouldPrint) return;
    const printTimer = window.setTimeout(() => window.print(), 250);
    return () => window.clearTimeout(printTimer);
  }, [record, shouldPrint]);

  if (!record) {
    return (
      <MasterListPageFrame
        description="Loading purchase bill."
        technicalName="page.entries.purchase.show"
        title="Purchase"
      >
        <div className="rounded-md border border-border/70 bg-card p-6 text-sm text-muted-foreground">
          Loading.
        </div>
      </MasterListPageFrame>
    );
  }

  const previousPurchaseId = purchaseId > 1 ? purchaseId - 1 : null;
  const industryValue = industryCode ?? industryName;
  const purchaseLayout = resolveSalesBillingLayout(industryValue);
  const selectedPrintCopies = purchasePrintCopyOptions
    .map((option) => option.value)
    .filter((copy) => printCopies.includes(copy));
  const purchasePrintRecord = toSalesPrintRecord(record);
  const detailLines: readonly SalesPrintDetailLine[] = [
    { label: "Entry No:", value: record.documentNo, strong: true },
    { label: "Entry Date:", value: printDate(record.documentDate), strong: true },
  ];
  const rightDetailLines: readonly SalesPrintDetailLine[] = [
    { label: "Supplier Bill No:", value: record.supplierInvoiceNo ?? "" },
    {
      label: "Purchase Bill Dt:",
      value: record.supplierInvoiceDate ? printDate(record.supplierInvoiceDate) : "",
    },
    { label: "PO/Order Ref:", value: record.referenceNo ?? "" },
  ];

  function togglePrintCopy(copy: SalesPrintCopy) {
    setPrintCopies((currentCopies) => {
      if (!currentCopies.includes(copy)) return [...currentCopies, copy];
      if (currentCopies.length === 1) return currentCopies;
      return currentCopies.filter((currentCopy) => currentCopy !== copy);
    });
  }

  return (
    <main className="theme-shell mx-auto min-h-screen w-[94%] pb-8 pt-8 text-black sm:w-[92%] lg:w-[90%] print:fixed print:inset-0 print:z-[9999] print:min-h-0 print:w-full print:overflow-visible print:bg-white print:p-0">
      <div className="mx-auto mb-3 flex w-full flex-wrap items-center justify-between gap-3 print:hidden">
        <div>
          <h1 className="text-3xl font-semibold tracking-normal text-foreground">
            {record.partyName}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">{record.documentNo}</p>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <div className="flex min-h-10 flex-wrap items-center gap-1 rounded-xl border border-border bg-card px-2 py-1 text-sm shadow-sm">
            {purchasePrintCopyOptions.map((option) => (
              <label
                key={option.value}
                className="flex h-8 cursor-pointer items-center gap-1.5 rounded-md px-2 font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <input
                  type="checkbox"
                  className="size-3.5 accent-primary"
                  checked={printCopies.includes(option.value)}
                  onChange={() => togglePrintCopy(option.value)}
                />
                {option.label}
              </label>
            ))}
          </div>
          <Button className="rounded-xl" onClick={() => window.print()}>
            <Printer className="size-4" />
            Print
          </Button>
          <Button asChild variant="outline" className="rounded-xl">
            <Link href={`/desk/purchase/${purchaseId}/edit`}>
              <Pencil className="size-4" />
              Edit
            </Link>
          </Button>
          <Button asChild variant="outline" className="rounded-xl">
            <Link href="/desk/purchase">
              <ArrowLeft className="size-4" />
              Back
            </Link>
          </Button>
          {previousPurchaseId ? (
            <Button asChild variant="outline" className="rounded-xl">
              <Link href={`/desk/purchase/${previousPurchaseId}`}>
                <ChevronLeft className="size-4" />
                Prev
              </Link>
            </Button>
          ) : (
            <Button variant="outline" className="rounded-xl" disabled>
              <ChevronLeft className="size-4" />
              Prev
            </Button>
          )}
          <Button asChild variant="outline" className="rounded-xl">
            <Link href={`/desk/purchase/${purchaseId + 1}`}>
              <ChevronRight className="size-4" />
              Next
            </Link>
          </Button>
        </div>
      </div>
      <section className="mx-auto w-fit max-w-full overflow-hidden rounded-md border border-border/70 bg-card shadow-sm print:contents">
        <div className="grid gap-4 overflow-x-auto p-3 print:contents sm:p-4">
          {selectedPrintCopies.map((copy, index) => (
            <div
              key={copy}
              className={
                index === selectedPrintCopies.length - 1 ? "print:contents" : "print:break-after-page"
              }
            >
              <SalesInvoiceDocument
                company={printCompany}
                copy={copy}
                detailLines={detailLines}
                documentTitle="PURCHASE RECEIPT BILL"
                industryName={industryValue}
                partyAddressLabel="Supplier"
                record={purchasePrintRecord}
                rightDetailLines={rightDetailLines}
                salesLayout={purchaseLayout}
                showEInvoiceDetails={false}
                showFooterDetails={false}
              />
            </div>
          ))}
        </div>
      </section>
      <div className="mx-auto mt-4 w-full print:hidden">
        <EntryCollaborationPanel
          entryId={purchaseId}
          entryKind="purchase"
          entryLabel={record.documentNo}
        />
      </div>
    </main>
  );
}

export function PurchaseUpsertPage({ purchaseId }: { readonly purchaseId?: number }) {
  const router = useRouter();
  const [form, setForm] = useState<PurchaseInput>(defaultPurchaseInput());
  const [contacts, setContacts] = useState<readonly SalesLookupOption[]>([]);
  const [products, setProducts] = useState<readonly SalesLookupOption[]>([]);
  useEffect(() => {
    const lookupController = new AbortController();
    void listSupplierContactLookups({ signal: lookupController.signal })
      .then(setContacts)
      .catch((error) => {
        if (!isAbortError(error)) setContacts([]);
      });
    void listSalesProductLookups({ signal: lookupController.signal })
      .then(setProducts)
      .catch((error) => {
        if (!isAbortError(error)) setProducts([]);
      });

    if (purchaseId)
      void getPurchase(purchaseId).then(
        (record) =>
          record &&
          setForm({
            ...defaultPurchaseInput(),
            ...record,
            autoDocumentNo: false,
            documentDate: record.documentDate.slice(0, 10),
            supplierInvoiceDate: record.supplierInvoiceDate
              ? record.supplierInvoiceDate.slice(0, 10)
              : null,
          }),
      );
    if (!purchaseId) {
      const controller = new AbortController();
      void getNextDocumentNumber("purchase", { signal: controller.signal })
        .then((setting) => {
          if (!setting.autoEnabled) {
            setForm((current) => ({ ...current, autoDocumentNo: false }));
            return;
          }
          setForm((current) =>
            current.autoDocumentNo || !current.documentNo.trim()
              ? { ...current, autoDocumentNo: true, documentNo: setting.preview }
              : current,
          );
        })
        .catch((error) => {
          if (!isAbortError(error)) {
            toast.error("Could not load next purchase number", {
              description: getErrorMessage(error),
            });
          }
        });
      return () => {
        controller.abort();
        lookupController.abort();
      };
    }

    return () => lookupController.abort();
  }, [purchaseId]);
  async function save(printAfterSave = false) {
    const record = await upsertPurchase(preparePurchaseInput(form), purchaseId);
    toast.success(purchaseId ? "Purchase updated" : "Purchase created");
    if (printAfterSave) {
      router.push(`/desk/purchase/${record.id}?print=1`);
      return;
    }
    router.push(`/desk/purchase/${record.id}`);
  }
  return (
    <MasterListPageFrame
      action={
        <Button asChild variant="outline" className="rounded-xl">
          <Link href={purchaseId ? `/desk/purchase/${purchaseId}` : "/desk/purchase"}>
            <X className="size-4" />
            Cancel
          </Link>
        </Button>
      }
      className="w-[calc(100%-2rem)] max-w-[1500px] sm:w-[calc(100%-3rem)] lg:w-[calc(100%-4rem)]"
      description="Create a tabbed purchase bill with item-level GST totals."
      technicalName="page.entries.purchase.upsert"
      title={purchaseId ? "Edit purchase" : "New purchase"}
    >
      <MasterListUpsertLayout>
        <MasterListUpsertCard className="overflow-hidden p-0 [&>div]:p-0">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void save();
            }}
          >
            <div className="px-0 pb-4 pt-3 md:pb-5">
              <PurchaseVoucherTabs
                contacts={contacts}
                form={form}
                products={products}
                setForm={setForm}
              />
            </div>
            <div className="flex flex-wrap justify-start gap-3 border-t border-border/70 bg-muted/20 px-4 py-4 md:px-6">
              <SavePrintButtons saveLabel="Save" onSavePrint={() => void save(true)} />
              <Button asChild type="button" variant="outline" className="rounded-xl">
                <Link href={purchaseId ? `/desk/purchase/${purchaseId}` : "/desk/purchase"}>
                  <ArrowLeft className="size-4" />
                  Cancel
                </Link>
              </Button>
            </div>
          </form>
        </MasterListUpsertCard>
      </MasterListUpsertLayout>
    </MasterListPageFrame>
  );
}

function PurchaseVoucherTabs({
  contacts,
  form,
  products,
  setForm,
}: {
  readonly contacts: readonly SalesLookupOption[];
  readonly form: PurchaseInput;
  readonly products: readonly SalesLookupOption[];
  readonly setForm: (value: PurchaseInput) => void;
}) {
  const totals = useMemo(() => calculatePurchaseTotals(form), [form.items, form.roundOff]);
  const tabs = [
    {
      value: "details",
      label: "Details",
      content: (
        <PurchaseDetailsTab
          contacts={contacts}
          form={form}
          products={products}
          setForm={setForm}
          totals={totals}
        />
      ),
    },
    {
      value: "address",
      label: "Address",
      content: <PurchaseAddressTab form={form} setForm={setForm} />,
    },
    {
      value: "terms",
      label: "Terms",
      content: <PurchaseTermsTab form={form} setForm={setForm} />,
    },
  ];

  return (
    <AnimatedTabs
      className="[&>div:first-child]:rounded-none [&>div:first-child]:border-x-0 [&>div:first-child]:border-t-0 [&>div:first-child]:border-b [&>div:first-child]:border-border/70 [&>div:first-child]:bg-card [&>div:first-child]:px-4 [&>div:first-child]:py-0.5 [&>div:first-child]:shadow-none md:[&>div:first-child]:px-6 [&>div:first-child_button]:min-h-8 [&>div:first-child_button]:py-1 [&>div:last-child]:mx-auto [&>div:last-child]:mt-3 [&>div:last-child]:w-full [&>div:last-child]:px-4 [&>div:last-child]:pb-3 md:[&>div:last-child]:px-6 md:[&>div:last-child]:pb-4"
      tabs={tabs}
    />
  );
}

function PurchaseDetailsTab({
  contacts,
  form,
  products,
  setForm,
  totals,
}: {
  readonly contacts: readonly SalesLookupOption[];
  readonly form: PurchaseInput;
  readonly products: readonly SalesLookupOption[];
  readonly setForm: (value: PurchaseInput) => void;
  readonly totals: PurchaseTotals;
}) {
  const [itemDraft, setItemDraft] = useState(defaultPurchaseItem());
  const [itemLookups, setItemLookups] = useState<PurchaseItemLookupMap>({
    colours: [],
    sizes: [],
  });
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    void Promise.all([
      listCommonRecords("sizes", { signal: controller.signal }),
      listCommonRecords("colours", { signal: controller.signal }),
    ])
      .then(([sizes, colours]) => {
        if (!controller.signal.aborted) setItemLookups({ colours, sizes });
      })
      .catch(() => {
        if (!controller.signal.aborted) setItemLookups({ colours: [], sizes: [] });
      });

    return () => controller.abort();
  }, []);

  async function createPurchaseItemLookup(moduleKey: PurchaseItemLookupKey, label: string) {
    try {
      const record = await createCommonRecord(
        moduleKey,
        buildPurchaseItemLookupCreatePayload(moduleKey, label),
      );
      setItemLookups((current) => ({
        ...current,
        [moduleKey]: [...current[moduleKey], record],
      }));
      toast.success(`${purchaseItemLookupLabel(moduleKey)} created`);
      return record;
    } catch (error) {
      toast.error(`Could not create ${purchaseItemLookupLabel(moduleKey).toLowerCase()}`, {
        description: getErrorMessage(error),
      });
      return null;
    }
  }

  function addItem() {
    if (!itemDraft.productName.trim()) return;
    if (editingItemIndex !== null) {
      setForm({
        ...form,
        items: form.items.map((item, index) =>
          index === editingItemIndex
            ? { ...itemDraft, productName: itemDraft.productName.trim(), sortOrder: index + 1 }
            : item,
        ),
      });
      setItemDraft(defaultPurchaseItem());
      setEditingItemIndex(null);
      return;
    }
    setForm({
      ...form,
      items: [
        ...form.items.filter((item) => item.productName.trim()),
        { ...itemDraft, productName: itemDraft.productName.trim(), sortOrder: form.items.length + 1 },
      ],
    });
    setItemDraft(defaultPurchaseItem());
  }

  function editItem(index: number) {
    const item = form.items[index];
    if (!item) return;
    setItemDraft(item);
    setEditingItemIndex(index);
  }

  function deleteItem(index: number) {
    setForm({ ...form, items: form.items.filter((_, itemIndex) => itemIndex !== index) });
    if (editingItemIndex === index) {
      setItemDraft(defaultPurchaseItem());
      setEditingItemIndex(null);
    }
  }

  function cancelItemEdit() {
    setItemDraft(defaultPurchaseItem());
    setEditingItemIndex(null);
  }

  return (
    <div className="space-y-8">
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="space-y-5">
          <ContactAutocompleteField
            label="Supplier name"
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
              })
            }
          />
          <Field label="Supplier bill no">
            <Input
              className="h-11 rounded-md"
              value={form.supplierInvoiceNo ?? ""}
              onChange={(event) => setForm({ ...form, supplierInvoiceNo: event.target.value })}
            />
          </Field>
          <Field label="Purchase bill date">
            <Input
              className="h-11 rounded-md text-right"
              type="date"
              value={form.supplierInvoiceDate ?? ""}
              onChange={(event) =>
                setForm({ ...form, supplierInvoiceDate: event.target.value || null })
              }
            />
          </Field>
          <Field label="PO/Order Reference">
            <Input
              className="h-11 rounded-md"
              value={form.referenceNo ?? ""}
              onChange={(event) => setForm({ ...form, referenceNo: event.target.value })}
            />
          </Field>
        </div>
        <div className="space-y-5">
          <Field label="Entry no">
            <Input
              className="h-11 rounded-md text-left"
              value={form.documentNo}
              onChange={(event) =>
                setForm({ ...form, autoDocumentNo: false, documentNo: event.target.value })
              }
            />
          </Field>
          <Field label="Entry date">
            <Input
              className="h-11 rounded-md text-right"
              type="date"
              value={form.documentDate}
              onChange={(event) => setForm({ ...form, documentDate: event.target.value })}
            />
          </Field>
          <Field label="Purchase tax type">
            <Select
              value={form.placeOfSupply ?? purchaseTypeOptions[0].value}
              onValueChange={(value) => setForm({ ...form, placeOfSupply: value })}
            >
              <SelectTrigger className="h-11 rounded-md">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {purchaseTypeOptions.map((option) => (
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
          Purchase Items
        </h2>
        <div className="grid gap-3 lg:grid-cols-[repeat(6,minmax(0,1fr))_auto]">
          <ProductAutocompleteField
            label="Product name"
            options={products}
            placeholder=""
            selectedId={itemDraft.productId}
            selectedLabel={itemDraft.productName}
            onPick={(option) =>
              setItemDraft({
                ...itemDraft,
                colour: option.colour ?? itemDraft.colour,
                hsnCodeId: option.hsnCodeId ?? null,
                mrp: option.mrp ?? 0,
                productId: option.id,
                productName: option.label,
                productSku: option.productSku ?? null,
                rate: option.rate ?? 0,
                size: option.size ?? itemDraft.size,
                taxId: option.taxId ?? null,
                taxRate: option.taxRate ?? 0,
                unitId: option.unitId ?? null,
              })
            }
          />
          <Field label="Description">
            <Input
              className="h-11 rounded-md"
              value={itemDraft.description ?? ""}
              onChange={(event) => setItemDraft({ ...itemDraft, description: event.target.value })}
            />
          </Field>
          <SalesItemMasterLookupField
            label="Size"
            moduleKey="sizes"
            options={itemLookups.sizes}
            value={itemDraft.size}
            onChange={(value) => setItemDraft({ ...itemDraft, size: value })}
            onCreateLookup={createPurchaseItemLookup}
          />
          <SalesItemMasterLookupField
            label="Colour"
            moduleKey="colours"
            options={itemLookups.colours}
            value={itemDraft.colour}
            onChange={(value) => setItemDraft({ ...itemDraft, colour: value })}
            onCreateLookup={createPurchaseItemLookup}
          />
          <Field label="Quantity">
            <Input
              className="h-11 rounded-md text-right"
              inputMode="decimal"
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
              {editingItemIndex === null ? <Plus className="size-4" /> : <Check className="size-4" />}
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
        <PurchaseItemsTable
          form={form}
          onDeleteItem={deleteItem}
          onEditItem={editItem}
          totals={totals}
        />
        <PurchaseTotalsFooter form={form} setForm={setForm} totals={totals} />
      </section>
    </div>
  );
}

function PurchaseAddressTab({
  form,
  setForm,
}: {
  readonly form: PurchaseInput;
  readonly setForm: (value: PurchaseInput) => void;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Field label="Billing address">
        <textarea
          className="min-h-32 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
          value={form.billingAddress ?? ""}
          placeholder="Supplier billing address"
          onChange={(event) => setForm({ ...form, billingAddress: event.target.value })}
        />
      </Field>
      <div className="grid gap-4">
        <Field label="Place of supply">
          <Input
            value={form.placeOfSupply ?? ""}
            placeholder="Place of supply"
            onChange={(event) => setForm({ ...form, placeOfSupply: event.target.value })}
          />
        </Field>
        <Field label="Due date">
          <Input
            type="date"
            value={form.dueDate ?? ""}
            onChange={(event) => setForm({ ...form, dueDate: event.target.value || null })}
          />
        </Field>
      </div>
    </div>
  );
}

function PurchaseTermsTab({
  form,
  setForm,
}: {
  readonly form: PurchaseInput;
  readonly setForm: (value: PurchaseInput) => void;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Field label="Terms">
        <textarea
          className="min-h-32 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
          value={form.terms ?? ""}
          placeholder="Purchase terms"
          onChange={(event) => setForm({ ...form, terms: event.target.value })}
        />
      </Field>
      <Field label="Notes">
        <textarea
          className="min-h-32 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
          value={form.notes ?? ""}
          placeholder="Internal notes"
          onChange={(event) => setForm({ ...form, notes: event.target.value })}
        />
      </Field>
    </div>
  );
}

function PurchaseItemsTable({
  form,
  onDeleteItem,
  onEditItem,
  totals,
}: {
  readonly form: PurchaseInput;
  readonly onDeleteItem: (index: number) => void;
  readonly onEditItem: (index: number) => void;
  readonly totals: PurchaseTotals;
}) {
  const taxMode = form.placeOfSupply === "igst" ? "igst" : "cgst-sgst";
  return (
    <div className="w-full overflow-hidden rounded-md border border-border/70">
      <table className="w-full min-w-0 table-fixed border-collapse text-[11px] sm:text-xs xl:text-sm">
        <thead className="bg-muted/45 text-muted-foreground">
          <tr>
            <PurchaseItemHeader className="w-[3%] text-center">#</PurchaseItemHeader>
            <PurchaseItemHeader className="w-[17%] text-left">Product name</PurchaseItemHeader>
            <PurchaseItemHeader className="w-[15%] text-left">Description</PurchaseItemHeader>
            <PurchaseItemHeader className="w-[6%] text-center">HSN Code</PurchaseItemHeader>
            <PurchaseItemHeader className="w-[6%] text-center">Size</PurchaseItemHeader>
            <PurchaseItemHeader className="w-[6%] text-center">Colour</PurchaseItemHeader>
            <PurchaseItemHeader className="w-[6%] text-center">Quantity</PurchaseItemHeader>
            <PurchaseItemHeader className="w-[7%] text-right">Price</PurchaseItemHeader>
            <PurchaseItemHeader className="w-[8%] text-right">Taxable</PurchaseItemHeader>
            <PurchaseItemHeader className="w-[6%] text-center">GST Percent</PurchaseItemHeader>
            {taxMode === "igst" ? (
              <PurchaseItemHeader className="w-[7%] text-right">IGST</PurchaseItemHeader>
            ) : (
              <>
                <PurchaseItemHeader className="w-[7%] text-right">CGST</PurchaseItemHeader>
                <PurchaseItemHeader className="w-[7%] text-right">SGST</PurchaseItemHeader>
              </>
            )}
            <PurchaseItemHeader className="w-[8%] text-right">Sub Total</PurchaseItemHeader>
            <PurchaseItemHeader className="w-[4%] text-center">Action</PurchaseItemHeader>
          </tr>
        </thead>
        <tbody>
          {form.items.map((item, index) => {
            const taxable = item.quantity * item.rate;
            const gst = (taxable * item.taxRate) / 100;
            const splitGst = gst / 2;
            return (
              <tr key={`${item.productName}-${index}`} className="border-b border-border/60 last:border-b-0">
                <PurchaseItemCell className="text-center text-muted-foreground">{index + 1}</PurchaseItemCell>
                <PurchaseItemCell className="text-left">{item.productName}</PurchaseItemCell>
                <PurchaseItemCell className="text-left">{item.description ?? ""}</PurchaseItemCell>
                <PurchaseItemCell className="text-center">{item.hsnCodeId ?? "-"}</PurchaseItemCell>
                <PurchaseItemCell className="text-center">{item.size ?? ""}</PurchaseItemCell>
                <PurchaseItemCell className="text-center">{item.colour ?? ""}</PurchaseItemCell>
                <PurchaseItemCell className="text-center">{item.quantity}</PurchaseItemCell>
                <PurchaseItemCell className="text-right">{formatMoney(item.rate)}</PurchaseItemCell>
                <PurchaseItemCell className="text-right">{formatMoney(taxable)}</PurchaseItemCell>
                <PurchaseItemCell className="text-center">{item.taxRate}%</PurchaseItemCell>
                {taxMode === "igst" ? (
                  <PurchaseItemCell className="text-right">{formatMoney(gst)}</PurchaseItemCell>
                ) : (
                  <>
                    <PurchaseItemCell className="text-right">{formatMoney(splitGst)}</PurchaseItemCell>
                    <PurchaseItemCell className="text-right">{formatMoney(splitGst)}</PurchaseItemCell>
                  </>
                )}
                <PurchaseItemCell className="text-right">{formatMoney(taxable + gst)}</PurchaseItemCell>
                <PurchaseItemCell className="text-center">
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
                </PurchaseItemCell>
              </tr>
            );
          })}
          <tr className="bg-muted/20 font-medium">
            <td className="border-r border-border/70 px-1.5 py-2" />
            <td className="border-r border-border/70 px-1.5 py-2 text-center">TOTALS.</td>
            <td className="border-r border-border/70 px-1.5 py-2" />
            <td className="border-r border-border/70 px-1.5 py-2" />
            <td className="border-r border-border/70 px-1.5 py-2" />
            <td className="border-r border-border/70 px-1.5 py-2" />
            <td className="border-r border-border/70 px-1.5 py-2 text-center">{totals.quantity}</td>
            <td className="border-r border-border/70 px-1.5 py-2" />
            <td className="border-r border-border/70 px-1.5 py-2 text-right">{formatMoney(totals.taxableAmount)}</td>
            <td className="border-r border-border/70 px-1.5 py-2" />
            {taxMode === "igst" ? (
              <td className="border-r border-border/70 px-1.5 py-2 text-right">{formatMoney(totals.gstTotal)}</td>
            ) : (
              <>
                <td className="border-r border-border/70 px-1.5 py-2 text-right">{formatMoney(totals.gstTotal / 2)}</td>
                <td className="border-r border-border/70 px-1.5 py-2 text-right">{formatMoney(totals.gstTotal / 2)}</td>
              </>
            )}
            <td className="border-r border-border/70 px-1.5 py-2 text-right">{formatMoney(totals.grandTotal)}</td>
            <td className="px-1.5 py-2" />
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function PurchaseTotalsFooter({
  form,
  setForm,
  totals,
}: {
  readonly form: PurchaseInput;
  readonly setForm: (value: PurchaseInput) => void;
  readonly totals: PurchaseTotals;
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
    <div className={`grid grid-cols-[1fr_auto_8rem] gap-4 ${strong ? "font-semibold" : ""}`}>
      <span className="font-medium text-muted-foreground">{label}</span>
      <span>:</span>
      <span className="text-right">{value}</span>
    </div>
  );
}
function PurchaseItemHeader({
  children,
  className = "",
}: {
  readonly children: ReactNode;
  readonly className?: string;
}) {
  return <th className={`border-r border-border/70 px-2 py-2 font-medium last:border-r-0 ${className}`}>{children}</th>;
}

function PurchaseItemCell({
  children,
  className = "",
}: {
  readonly children?: ReactNode;
  readonly className?: string;
}) {
  return <td className={`border-r border-border/70 px-2 py-2 align-middle last:border-r-0 ${className}`}>{children}</td>;
}

function Field({ children, label }: { readonly children: ReactNode; readonly label: string }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

interface PurchaseTotals {
  readonly grandTotal: number;
  readonly gstPercentDisplay: string;
  readonly gstTotal: number;
  readonly quantity: number;
  readonly taxableAmount: number;
}

type PurchaseItemLookupKey = "colours" | "sizes";

interface PurchaseItemLookupMap {
  readonly colours: readonly CommonRecord[];
  readonly sizes: readonly CommonRecord[];
}

function calculatePurchaseTotals(form: PurchaseInput): PurchaseTotals {
  const quantity = form.items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  const taxableAmount = form.items.reduce(
    (sum, item) => sum + Number(item.quantity || 0) * Number(item.rate || 0),
    0,
  );
  const gstTotal = form.items.reduce(
    (sum, item) =>
      sum +
      (Number(item.quantity || 0) * Number(item.rate || 0) * Number(item.taxRate || 0)) / 100,
    0,
  );
  const taxRates = [...new Set(form.items.map((item) => Number(item.taxRate || 0)))].filter(
    (rate) => rate > 0,
  );
  return {
    grandTotal: taxableAmount + gstTotal + Number(form.roundOff || 0),
    gstPercentDisplay: taxRates.length === 1 ? `${taxRates[0]}%` : taxRates.length ? "Mixed" : "-",
    gstTotal,
    quantity,
    taxableAmount,
  };
}

function buildPurchaseItemLookupCreatePayload(
  moduleKey: PurchaseItemLookupKey,
  label: string,
) {
  const trimmedLabel = label.trim();
  const code =
    trimmedLabel
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 40) || "NEW";

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

function purchaseItemLookupLabel(moduleKey: PurchaseItemLookupKey) {
  return moduleKey === "colours" ? "Colour" : "Size";
}

function setItem(
  form: PurchaseInput,
  setForm: (value: PurchaseInput) => void,
  index: number,
  patch: Partial<PurchaseInput["items"][number]>,
) {
  setForm({
    ...form,
    items: form.items.map((item, itemIndex) =>
      itemIndex === index ? { ...item, ...patch } : item,
    ),
  });
}

const purchasePrintCopyOptions: readonly {
  readonly label: string;
  readonly value: SalesPrintCopy;
}[] = [
  { label: "Original", value: "original" },
  { label: "Duplicate", value: "duplicate" },
  { label: "Office Copy", value: "triplicate" },
];

function toSalesPrintRecord(record: PurchaseRecord): SalesRecord {
  return {
    id: record.id,
    balanceAmount: record.balanceAmount,
    billingAddress: record.billingAddress,
    documentDate: record.documentDate,
    documentNo: record.documentNo,
    dueDate: record.dueDate,
    eInvoiceAckDate: null,
    eInvoiceAckNo: null,
    eInvoiceIrn: null,
    eInvoiceSignedQr: null,
    ewayBillDate: null,
    ewayBillNo: null,
    grandTotal: record.grandTotal,
    isActive: record.isActive,
    items: record.items,
    notes: record.notes,
    partyId: record.partyId,
    partyName: record.partyName,
    paymentStatus: record.paymentStatus,
    placeOfSupply: record.placeOfSupply,
    referenceNo: record.referenceNo,
    roundOff: record.roundOff ?? 0,
    shippingAddress: record.billingAddress,
    status: record.status,
    terms: record.terms,
    updatedAt: record.updatedAt,
  };
}

function getAppTypeFromSettings(
  settings: Awaited<ReturnType<typeof getCoreEnvSettings>> | null,
) {
  return settings?.groups
    .flatMap((group) => group.settings)
    .find((setting) => setting.key === "APP_TYPE")
    ?.value.trim() || null;
}

function printDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-GB").format(date).replaceAll("/", "-");
}

function ListHeader({
  align = "left",
  children,
}: {
  readonly align?: "left" | "right";
  readonly children: ReactNode;
}) {
  return (
    <th
      className={`border-b border-border/70 px-4 py-2.5 text-${align} text-sm font-medium text-foreground`}
    >
      {children}
    </th>
  );
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Please try again.";
}

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === "AbortError";
}
