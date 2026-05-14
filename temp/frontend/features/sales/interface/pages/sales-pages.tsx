"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { ArrowLeft, ChevronLeft, ChevronRight, Pencil, Plus, Printer } from "lucide-react";
import {
  Button,
  MasterListEmptyState,
  MasterListPageFrame,
  MasterListPaginationCard,
  MasterListTableCard,
  MasterListToolbarCard,
  RowActionMenu,
  buildMasterListShowingLabel,
  useGlobalLoader,
} from "@cxnext/ui";
import {
  buildSalesColumnOptions,
  deleteSales,
  formatEntryDate,
  filterSales,
  formatMoney,
  getSales,
  listSales,
  prepareSalesInput,
  upsertSales,
} from "../../application/sales-service";
import { resolveSalesBillingLayout } from "../../application/sales-billing-layout-service";
import { getActiveCompany } from "../../../company/application/company-service";
import type { CompanyRecord } from "../../../company/domain/company";
import { getCoreEnvSettings } from "../../../settings/infrastructure/core-settings-api";
import {
  loadCompanySoftwareSettings,
  loadCompanySoftwareSettingsFromServer,
} from "../../../settings/application/software-settings-service";
import { EntryCollaborationPanel } from "../../../entries/interface/components/entry-collaboration-panel";
import {
  defaultSalesInput,
  defaultSalesColumnVisibility,
  salesStatusFilters,
  type SalesColumnId,
  type SalesRecord,
  type SalesStatusFilter,
} from "../../domain/sales";
import { SalesInvoiceDocument, type SalesPrintCopy } from "./sales-print-page";

export { SalesUpsertPage } from "./sales-upsert-page";

export function SalesListPage() {
  const [records, setRecords] = useState<readonly SalesRecord[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<SalesStatusFilter>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [visibleColumns, setVisibleColumns] = useState<Record<SalesColumnId, boolean>>(
    defaultSalesColumnVisibility,
  );
  const { show } = useGlobalLoader();

  useEffect(() => {
    const controller = new AbortController();
    const hide = show();
    listSales({ signal: controller.signal })
      .then(setRecords)
      .catch((error) => {
        if (isAbortError(error)) return;
        toast.error("Could not load sales", { description: getErrorMessage(error) });
      })
      .finally(() => {
        if (!controller.signal.aborted) hide();
      });
    return () => {
      controller.abort();
      hide();
    };
  }, [show]);

  const filtered = useMemo(
    () =>
      filterSales(records, search, statusFilter).sort((left, right) =>
        left.documentNo.localeCompare(right.documentNo),
      ),
    [records, search, statusFilter],
  );
  const totalPages = Math.max(1, Math.ceil(filtered.length / rowsPerPage));
  const pageRecords = filtered.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);
  const columnOptions = useMemo(
    () =>
      buildSalesColumnOptions({
        visibleColumns,
        onToggle: (columnId, checked) =>
          setVisibleColumns((currentValue) => ({ ...currentValue, [columnId]: checked })),
      }),
    [visibleColumns],
  );

  async function remove(record: SalesRecord) {
    const hide = show();
    try {
      await deleteSales(record.id);
      setRecords((currentRecords) => currentRecords.filter((item) => item.id !== record.id));
      toast.success("Sales deleted");
    } catch (error) {
      toast.error("Could not delete sales", { description: getErrorMessage(error) });
    } finally {
      hide();
    }
  }

  async function restore(record: SalesRecord) {
    const hide = show();
    try {
      const restored = await upsertSales(
        prepareSalesInput({
          ...defaultSalesInput(),
          ...record,
          documentDate: record.documentDate.slice(0, 10),
          dueDate: record.dueDate ? record.dueDate.slice(0, 10) : null,
          eInvoiceAckDate: record.eInvoiceAckDate ? record.eInvoiceAckDate.slice(0, 10) : null,
          ewayBillDate: record.ewayBillDate ? record.ewayBillDate.slice(0, 10) : null,
          isActive: true,
        }),
        record.id,
      );
      setRecords((currentRecords) =>
        currentRecords.map((item) => (item.id === restored.id ? restored : item)),
      );
      toast.success("Sales restored");
    } catch (error) {
      toast.error("Could not restore sales", { description: getErrorMessage(error) });
    } finally {
      hide();
    }
  }

  return (
    <MasterListPageFrame
      action={
        <Button asChild className="rounded-xl">
          <Link href="/desk/sales/new">
            <Plus className="size-4" />
            New Sales
          </Link>
        </Button>
      }
      description="Create and review basic sales invoices."
      technicalName="page.entries.sales.list"
      title="Sales"
    >
      <MasterListToolbarCard
        columns={columnOptions}
        filterOptions={salesStatusFilters}
        filterValue={statusFilter}
        onFilterValueChange={(nextValue) => {
          setStatusFilter(nextValue as SalesStatusFilter);
          setCurrentPage(1);
        }}
        onSearchValueChange={(nextValue) => {
          setSearch(nextValue);
          setCurrentPage(1);
        }}
        onShowAllColumns={() => setVisibleColumns(defaultSalesColumnVisibility)}
        searchPlaceholder="Search invoice, customer, date, reference, or status"
        searchValue={search}
      />
      <MasterListTableCard className="rounded-md">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] border-collapse text-sm">
            <thead className="bg-muted/55">
              <tr>
                {visibleColumns.documentNo ? <ListHeader>Invoice</ListHeader> : null}
                {visibleColumns.documentDate ? <ListHeader>Date</ListHeader> : null}
                {visibleColumns.party ? <ListHeader>Customer</ListHeader> : null}
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
                        href={`/desk/sales/${record.id}`}
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
                      editHref={`/desk/sales/${record.id}/edit`}
                      isActive={record.isActive}
                      printHref={`/desk/sales/${record.id}?print=1`}
                      viewHref={`/desk/sales/${record.id}`}
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
          <MasterListEmptyState>No sales found.</MasterListEmptyState>
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
        singularLabel="sales"
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

export function SalesShowPage({
  salesId,
  shouldPrint = false,
}: {
  readonly salesId: number;
  readonly shouldPrint?: boolean;
}) {
  const { show } = useGlobalLoader();
  const [record, setRecord] = useState<SalesRecord | null>(null);
  const [industryCode, setIndustryCode] = useState<string | null>(null);
  const [industryName, setIndustryName] = useState<string | null>(null);
  const [printCompany, setPrintCompany] = useState<CompanyRecord | null>(null);
  const [printCopies, setPrintCopies] = useState<readonly SalesPrintCopy[]>(["original"]);
  const [printCustomTerms, setPrintCustomTerms] = useState("");
  const [showPrintAccountNumber, setShowPrintAccountNumber] = useState(true);
  const [showPrintLogo, setShowPrintLogo] = useState(true);
  const [showPrintQrAccountDetails, setShowPrintQrAccountDetails] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    const hide = show();
    getSales(salesId, { signal: controller.signal })
      .then(setRecord)
      .catch((error) => {
        if (isAbortError(error)) return;
        toast.error("Could not load sales", { description: getErrorMessage(error) });
      })
      .finally(() => {
        if (!controller.signal.aborted) hide();
      });
    return () => {
      controller.abort();
      hide();
    };
  }, [salesId, show]);

  useEffect(() => {
    const controller = new AbortController();
    Promise.all([
      getActiveCompany({ signal: controller.signal }),
      getCoreEnvSettings({ signal: controller.signal }).catch(() => null),
    ])
      .then(async ([company, settings]) => {
        if (controller.signal.aborted) return;
        setPrintCompany(company);
        setIndustryCode(getAppTypeFromSettings(settings) ?? company?.industryCode ?? null);
        setIndustryName(company?.industryName ?? null);
        const softwareSettings = await loadSalesPrintSoftwareSettings(
          company?.id,
          controller.signal,
        );
        if (controller.signal.aborted) return;
        setPrintCustomTerms(softwareSettings.salesPrintingOptions.customTerms);
        setShowPrintAccountNumber(
          getSalesPrintToggleSetting(softwareSettings, "sales-print-account-no"),
        );
        setShowPrintLogo(getSalesPrintToggleSetting(softwareSettings, "sales-print-with-logo"));
        setShowPrintQrAccountDetails(
          getSalesPrintToggleSetting(softwareSettings, "sales-print-qr-account-details"),
        );
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
        description="Loading sales invoice."
        technicalName="page.entries.sales.show"
        title="Sales"
      >
        <div className="rounded-md border border-border/70 bg-card p-6 text-sm text-muted-foreground">
          Loading.
        </div>
      </MasterListPageFrame>
    );
  }

  const previousSalesId = salesId > 1 ? salesId - 1 : null;
  const industryValue = industryCode ?? industryName;
  const salesLayout = resolveSalesBillingLayout(industryValue);
  const selectedPrintCopies = salesPrintCopyOptions
    .map((option) => option.value)
    .filter((copy) => printCopies.includes(copy));

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
            {salesPrintCopyOptions.map((option) => (
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
            <Link href={`/desk/sales/${salesId}/edit`}>
              <Pencil className="size-4" />
              Edit
            </Link>
          </Button>
          <Button asChild variant="outline" className="rounded-xl">
            <Link href="/desk/sales">
              <ArrowLeft className="size-4" />
              Back
            </Link>
          </Button>
          {previousSalesId ? (
            <Button asChild variant="outline" className="rounded-xl">
              <Link href={`/desk/sales/${previousSalesId}`}>
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
            <Link href={`/desk/sales/${salesId + 1}`}>
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
              className={index === selectedPrintCopies.length - 1 ? "print:contents" : "print:break-after-page"}
            >
              <SalesInvoiceDocument
                company={printCompany}
                copy={copy}
                customTerms={printCustomTerms}
                industryName={industryValue}
                record={record}
                salesLayout={salesLayout}
                showBankAccountNumber={showPrintAccountNumber}
                showQrAccountDetails={showPrintQrAccountDetails}
                showLogo={showPrintLogo}
              />
            </div>
          ))}
        </div>
      </section>
      <div className="mx-auto mt-4 w-full print:hidden">
        <EntryCollaborationPanel
          entryId={salesId}
          entryKind="sales"
          entryLabel={record.documentNo}
        />
      </div>
    </main>
  );
}

const salesPrintCopyOptions: readonly {
  readonly label: string;
  readonly value: SalesPrintCopy;
}[] = [
  { label: "Original", value: "original" },
  { label: "Duplicate", value: "duplicate" },
  { label: "Office Copy", value: "triplicate" },
];

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

function getAppTypeFromSettings(
  settings: Awaited<ReturnType<typeof getCoreEnvSettings>> | null,
) {
  return settings?.groups
    .flatMap((group) => group.settings)
    .find((setting) => setting.key === "APP_TYPE")
    ?.value.trim() || null;
}

function getSalesPrintToggleSetting(
  settings: ReturnType<typeof loadCompanySoftwareSettings>,
  settingId: string,
) {
  return (
    settings.salesPrintingSettings.find((setting) => setting.id === settingId)?.enabled ?? true
  );
}

async function loadSalesPrintSoftwareSettings(
  companyId: number | string | null | undefined,
  signal: AbortSignal,
) {
  const normalizedCompanyId = companyId ? String(companyId) : null;
  const localSettings = loadCompanySoftwareSettings(normalizedCompanyId);
  if (!normalizedCompanyId) return localSettings;

  try {
    return await loadCompanySoftwareSettingsFromServer(normalizedCompanyId, { signal });
  } catch {
    return localSettings;
  }
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Please try again.";
}

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === "AbortError";
}
