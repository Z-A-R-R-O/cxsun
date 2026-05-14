"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { ArrowLeft, Check, ChevronLeft, ChevronRight, Pencil, Plus, Printer, X } from "lucide-react";
import { toast } from "sonner";
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
import { getNextDocumentNumber } from "../../../document-settings/infrastructure/document-settings-api";
import type { CompanyRecord } from "../../../company/domain/company";
import { EntryCollaborationPanel } from "../../../entries/interface/components/entry-collaboration-panel";
import type { CommonRecord } from "../../../common/domain/common-master";
import { MasterAutocompleteLookup } from "../../../common/interface/components/master-autocomplete-lookup";
import {
  buildPaymentColumnOptions,
  deletePayment,
  filterPayments,
  formatEntryDate,
  formatMoney,
  getPayment,
  listPayments,
  preparePaymentInput,
  upsertPayment,
} from "../../application/payment-service";
import {
  prepareContactForSave,
  upsertContact,
} from "../../../contact/application/contact-upsert.service";
import { createDefaultContactFormValues } from "../../../contact/domain/contact-form";
import { listSupplierContactLookups } from "../../../sales/application/sales-service";
import type { SalesLookupOption } from "../../../sales/domain/sales";
import {
  defaultPaymentAllocation,
  defaultPaymentInput,
  defaultPaymentColumnVisibility,
  paymentStatusFilters,
  type PaymentColumnId,
  type PaymentInput,
  type PaymentRecord,
  type PaymentStatusFilter,
} from "../../domain/payment";

const paymentModeOptions = [
  { label: "Cash", value: "cash" },
  { label: "RTGS Transfer", value: "rtgs-transfer" },
  { label: "NEFT Transfer", value: "neft-transfer" },
  { label: "UPI Transfer", value: "upi-transfer" },
] as const;

export function PaymentListPage() {
  const [records, setRecords] = useState<readonly PaymentRecord[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<PaymentStatusFilter>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [visibleColumns, setVisibleColumns] = useState<Record<PaymentColumnId, boolean>>(
    defaultPaymentColumnVisibility,
  );

  useEffect(() => void listPayments().then(setRecords), []);

  const filtered = useMemo(
    () =>
      filterPayments(records, search, statusFilter).sort((left, right) =>
        left.documentNo.localeCompare(right.documentNo),
      ),
    [records, search, statusFilter],
  );
  const totalPages = Math.max(1, Math.ceil(filtered.length / rowsPerPage));
  const pageRecords = filtered.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);
  const columnOptions = useMemo(
    () =>
      buildPaymentColumnOptions({
        visibleColumns,
        onToggle: (columnId, checked) =>
          setVisibleColumns((currentValue) => ({ ...currentValue, [columnId]: checked })),
      }),
    [visibleColumns],
  );

  async function remove(record: PaymentRecord) {
    try {
      await deletePayment(record.id);
      setRecords((currentRecords) => currentRecords.filter((item) => item.id !== record.id));
      toast.success("Payment deleted");
    } catch (error) {
      toast.error("Could not delete payment", { description: getErrorMessage(error) });
    }
  }

  async function restore(record: PaymentRecord) {
    try {
      const restored = await upsertPayment(
        preparePaymentInput({
          ...defaultPaymentInput(),
          ...record,
          documentDate: record.documentDate.slice(0, 10),
          referenceDate: record.referenceDate ? record.referenceDate.slice(0, 10) : null,
          isActive: true,
        }),
        record.id,
      );
      setRecords((currentRecords) =>
        currentRecords.map((item) => (item.id === restored.id ? restored : item)),
      );
      toast.success("Payment restored");
    } catch (error) {
      toast.error("Could not restore payment", { description: getErrorMessage(error) });
    }
  }

  return (
    <MasterListPageFrame
      action={
        <Button asChild className="rounded-xl">
          <Link href="/desk/payment/new">
            <Plus className="size-4" />
            New Payment
          </Link>
        </Button>
      }
      description="Track supplier payments and purchase allocations."
      technicalName="page.entries.payment.list"
      title="Payment"
    >
      <MasterListToolbarCard
        columns={columnOptions}
        filterOptions={paymentStatusFilters}
        filterValue={statusFilter}
        onFilterValueChange={(nextValue) => {
          setStatusFilter(nextValue as PaymentStatusFilter);
          setCurrentPage(1);
        }}
        onSearchValueChange={(nextValue) => {
          setSearch(nextValue);
          setCurrentPage(1);
        }}
        onShowAllColumns={() => setVisibleColumns(defaultPaymentColumnVisibility)}
        searchPlaceholder="Search payment, supplier, mode, ledger, reference, or status"
        searchValue={search}
      />
      <MasterListTableCard className="rounded-md">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1040px] border-collapse text-sm">
            <thead className="bg-muted/55">
              <tr>
                {visibleColumns.documentNo ? <ListHeader>Payment</ListHeader> : null}
                {visibleColumns.documentDate ? <ListHeader>Date</ListHeader> : null}
                {visibleColumns.party ? <ListHeader>Supplier</ListHeader> : null}
                {visibleColumns.mode ? <ListHeader>Mode</ListHeader> : null}
                {visibleColumns.ledger ? <ListHeader>Ledger</ListHeader> : null}
                {visibleColumns.status ? <ListHeader>Status</ListHeader> : null}
                {visibleColumns.amount ? <ListHeader align="right">Amount</ListHeader> : null}
                {visibleColumns.unallocated ? (
                  <ListHeader align="right">Unallocated</ListHeader>
                ) : null}
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
                        href={`/desk/payment/${record.id}`}
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
                  {visibleColumns.mode ? (
                    <td className="px-4 py-2.5 text-muted-foreground">{record.mode}</td>
                  ) : null}
                  {visibleColumns.ledger ? (
                    <td className="px-4 py-2.5 text-muted-foreground">
                      {record.ledgerName ?? "-"}
                    </td>
                  ) : null}
                  {visibleColumns.status ? <td className="px-4 py-2.5">{record.status}</td> : null}
                  {visibleColumns.amount ? (
                    <td className="px-4 py-2.5 text-right">{formatMoney(record.netAmount)}</td>
                  ) : null}
                  {visibleColumns.unallocated ? (
                    <td className="px-4 py-2.5 text-right">
                      {formatMoney(record.unallocatedAmount)}
                    </td>
                  ) : null}
                  {visibleColumns.updated ? (
                    <td className="px-4 py-2.5 text-muted-foreground">
                      {formatEntryDate(record.updatedAt)}
                    </td>
                  ) : null}
                  <td className="px-4 py-2 text-right">
                    <RowActionMenu
                      editHref={`/desk/payment/${record.id}/edit`}
                      isActive={record.isActive}
                      printHref={`/desk/payment/${record.id}?print=1`}
                      viewHref={`/desk/payment/${record.id}`}
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
          <MasterListEmptyState>No payments found.</MasterListEmptyState>
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
        singularLabel="payments"
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

export function PaymentShowPage({
  paymentId,
  shouldPrint = false,
}: {
  readonly paymentId: number;
  readonly shouldPrint?: boolean;
}) {
  const [record, setRecord] = useState<PaymentRecord | null>(null);
  const [company, setCompany] = useState<CompanyRecord | null>(null);

  useEffect(() => void getPayment(paymentId).then(setRecord), [paymentId]);
  useEffect(() => {
    const controller = new AbortController();
    void getActiveCompany({ signal: controller.signal })
      .then(setCompany)
      .catch(() => setCompany(null));
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
        description="Loading payment."
        technicalName="page.entries.payment.show"
        title="Payment"
      >
        <div className="rounded-md border border-border/70 bg-card p-6 text-sm text-muted-foreground">
          Loading.
        </div>
      </MasterListPageFrame>
    );
  }

  const previousPaymentId = paymentId > 1 ? paymentId - 1 : null;

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
          <Button className="rounded-xl" onClick={() => window.print()}>
            <Printer className="size-4" />
            Print
          </Button>
          <Button asChild variant="outline" className="rounded-xl">
            <Link href={`/desk/payment/${paymentId}/edit`}>
              <Pencil className="size-4" />
              Edit
            </Link>
          </Button>
          <Button asChild variant="outline" className="rounded-xl">
            <Link href="/desk/payment">
              <ArrowLeft className="size-4" />
              Back
            </Link>
          </Button>
          {previousPaymentId ? (
            <Button asChild variant="outline" className="rounded-xl">
              <Link href={`/desk/payment/${previousPaymentId}`}>
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
            <Link href={`/desk/payment/${paymentId + 1}`}>
              <ChevronRight className="size-4" />
              Next
            </Link>
          </Button>
        </div>
      </div>
      <section className="mx-auto w-fit max-w-full overflow-hidden rounded-md border border-border/70 bg-card shadow-sm print:contents">
        <div className="overflow-x-auto p-3 print:contents sm:p-4">
          <PaymentPrintDocument company={company} record={record} />
        </div>
      </section>
      <div className="mx-auto mt-4 w-full print:hidden">
        <EntryCollaborationPanel
          entryId={paymentId}
          entryKind="payment"
          entryLabel={record.documentNo}
        />
      </div>
    </main>
  );
}

export function PaymentUpsertPage({ paymentId }: { readonly paymentId?: number }) {
  const router = useRouter();
  const [form, setForm] = useState<PaymentInput>(defaultPaymentInput());
  const [companyBankAccounts, setCompanyBankAccounts] = useState<CompanyRecord["bankAccounts"]>([]);
  const [contacts, setContacts] = useState<readonly SalesLookupOption[]>([]);

  useEffect(() => {
    if (!paymentId) return;
    void getPayment(paymentId).then((record) => {
      if (record)
        setForm({
          ...defaultPaymentInput(),
          ...record,
          autoDocumentNo: false,
          documentDate: record.documentDate.slice(0, 10),
        });
    });
  }, [paymentId]);

  useEffect(() => {
    if (paymentId) return;
    const controller = new AbortController();
    void getNextDocumentNumber("payment", { signal: controller.signal })
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
          toast.error("Could not load next payment number", {
            description: getErrorMessage(error),
          });
        }
      });
    return () => controller.abort();
  }, [paymentId]);

  useEffect(() => {
    const controller = new AbortController();
    void listSupplierContactLookups({ signal: controller.signal })
      .then(setContacts)
      .catch((error) => {
        if (!isAbortError(error)) setContacts([]);
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void getActiveCompany({ signal: controller.signal })
      .then((company) => {
        if (!controller.signal.aborted) setCompanyBankAccounts(company?.bankAccounts ?? []);
      })
      .catch(() => {
        if (!controller.signal.aborted) setCompanyBankAccounts([]);
      });
    return () => controller.abort();
  }, []);

  async function save(printAfterSave = false) {
    const record = await upsertPayment(preparePaymentInput(form), paymentId);
    toast.success(paymentId ? "Payment updated" : "Payment created");
    if (printAfterSave) {
      router.push(`/desk/payment/${record.id}?print=1`);
      return;
    }
    router.push(`/desk/payment/${record.id}`);
  }

  return (
    <MasterListPageFrame
      action={
        <Button asChild variant="outline" className="rounded-xl">
          <Link href={paymentId ? `/desk/payment/${paymentId}` : "/desk/payment"}>
            <X className="size-4" />
            Cancel
          </Link>
        </Button>
      }
      className="w-[calc(100%-2rem)] max-w-[1500px] sm:w-[calc(100%-3rem)] lg:w-[calc(100%-4rem)]"
      description="Create a tabbed outgoing payment with allocation details."
      technicalName="page.entries.payment.upsert"
      title={paymentId ? "Edit payment" : "New payment"}
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
              <AnimatedTabs
                className="[&>div:first-child]:rounded-none [&>div:first-child]:border-x-0 [&>div:first-child]:border-t-0 [&>div:first-child]:border-b [&>div:first-child]:border-border/70 [&>div:first-child]:bg-card [&>div:first-child]:px-4 [&>div:first-child]:py-0.5 [&>div:first-child]:shadow-none md:[&>div:first-child]:px-6 [&>div:first-child_button]:min-h-8 [&>div:first-child_button]:py-1 [&>div:last-child]:mx-auto [&>div:last-child]:mt-3 [&>div:last-child]:w-full [&>div:last-child]:px-4 [&>div:last-child]:pb-3 md:[&>div:last-child]:px-6 md:[&>div:last-child]:pb-4"
                tabs={[
                  {
                    value: "details",
                    label: "Details",
                    content: (
                      <PaymentDetailsTab
                        bankAccounts={companyBankAccounts}
                        contacts={contacts}
                        form={form}
                        setForm={setForm}
                      />
                    ),
                  },
                  {
                    value: "allocations",
                    label: "Allocations",
                    content: <PaymentAllocationsTab form={form} setForm={setForm} />,
                  },
                ]}
              />
            </div>
            <div className="flex flex-wrap justify-start gap-3 border-t border-border/70 bg-muted/20 px-4 py-4 md:px-6">
              <SavePrintButtons saveLabel="Save" onSavePrint={() => void save(true)} />
              <Button asChild type="button" variant="outline" className="rounded-xl">
                <Link href={paymentId ? `/desk/payment/${paymentId}` : "/desk/payment"}>
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

function PaymentDetailsTab({
  bankAccounts,
  contacts,
  form,
  setForm,
}: {
  readonly bankAccounts: CompanyRecord["bankAccounts"];
  readonly contacts: readonly SalesLookupOption[];
  readonly form: PaymentInput;
  readonly setForm: (value: PaymentInput) => void;
}) {
  const needsBank = isBankTransferMode(form.mode);
  const bankOptions = useMemo(() => toCompanyBankLookupOptions(bankAccounts), [bankAccounts]);

  return (
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
              partyId: option.id,
              partyName: option.label,
            })
          }
        />
        <Field label="Amount">
          <Input
            className="h-12 rounded-md text-left text-lg font-semibold"
            inputMode="decimal"
            type="text"
            value={form.amount}
            onChange={(event) => {
              const value = event.target.value.replace(/[^0-9.]/g, "");
              setForm({ ...form, amount: Number(value || 0) });
            }}
          />
        </Field>
        <Field label="Reference no">
          <Input className="h-11 rounded-md" value={form.referenceNo ?? ""} onChange={(event) => setForm({ ...form, referenceNo: event.target.value })} />
        </Field>
      </div>
      <div className="space-y-5">
        <Field label="Payment no">
          <Input
            className="h-11 rounded-md"
            value={form.documentNo}
            onChange={(event) =>
              setForm({ ...form, autoDocumentNo: false, documentNo: event.target.value })
            }
          />
        </Field>
        <Field label="Payment Date">
          <Input className="h-11 rounded-md text-right" type="date" value={form.documentDate} onChange={(event) => setForm({ ...form, documentDate: event.target.value })} />
        </Field>
        <Field label="Mode">
          <Select
            value={form.mode}
            onValueChange={(value) =>
              setForm({
                ...form,
                bankAccountId: null,
                ledgerName: isBankTransferMode(value) ? null : "Cash",
                mode: value,
              })
            }
          >
            <SelectTrigger className="h-11 rounded-md">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {paymentModeOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        {needsBank ? (
          <MasterAutocompleteLookup
            defaultId=""
            defaultLabel=""
            label="Paid from bank"
            getOptionLabel={companyBankAccountLabel}
            options={bankOptions}
            placeholder="Search company bank account"
            value={form.bankAccountId}
            onChange={(value, record) =>
              setForm({
                ...form,
                bankAccountId: value,
                ledgerName: record ? companyBankAccountLabel(record) : null,
              })
            }
          />
        ) : null}
        <Field label="Notes">
          <textarea
            className="min-h-[5.5rem] w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-foreground/40"
            value={form.notes ?? ""}
            onChange={(event) => setForm({ ...form, notes: event.target.value })}
          />
        </Field>
      </div>
    </div>
  );
}

function PaymentAllocationsTab({
  form,
  setForm,
}: {
  readonly form: PaymentInput;
  readonly setForm: (value: PaymentInput) => void;
}) {
  return (
    <div className="space-y-3">
      {form.allocations.map((allocation, index) => (
        <div
          key={index}
          className="grid gap-3 rounded-md border border-border/70 p-3 md:grid-cols-4"
        >
          <Input
            value={allocation.documentNo}
            placeholder="Purchase no"
            onChange={(event) =>
              setAllocation(form, setForm, index, { documentNo: event.target.value })
            }
          />
          <Input
            type="date"
            value={allocation.documentDate ?? ""}
            onChange={(event) =>
              setAllocation(form, setForm, index, { documentDate: event.target.value })
            }
          />
          <Input
            type="number"
            value={allocation.previousBalance}
            placeholder="Balance"
            onChange={(event) =>
              setAllocation(form, setForm, index, {
                previousBalance: Number(event.target.value || 0),
              })
            }
          />
          <Input
            type="number"
            value={allocation.allocatedAmount}
            placeholder="Allocated"
            onChange={(event) =>
              setAllocation(form, setForm, index, {
                allocatedAmount: Number(event.target.value || 0),
              })
            }
          />
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        className="rounded-xl"
        onClick={() =>
          setForm({ ...form, allocations: [...form.allocations, defaultPaymentAllocation()] })
        }
      >
        Add allocation
      </Button>
    </div>
  );
}

function setAllocation(
  form: PaymentInput,
  setForm: (value: PaymentInput) => void,
  index: number,
  patch: Partial<PaymentInput["allocations"][number]>,
) {
  setForm({
    ...form,
    allocations: form.allocations.map((item, itemIndex) =>
      itemIndex === index ? { ...item, ...patch } : item,
    ),
  });
}

function PaymentPrintDocument({
  company,
  record,
}: {
  readonly company: CompanyRecord | null;
  readonly record: PaymentRecord;
}) {
  const companyName = company?.legalName?.trim() || company?.name || "";
  const amountInWords = numberToIndianCurrencyWords(record.netAmount);
  return (
    <section className="mx-auto w-[210mm] max-w-full bg-white p-4 font-[Verdana,Arial,sans-serif] text-[10px] text-black print:w-[198mm] print:p-0">
      <div className="grid grid-cols-[1fr_auto_1fr] border border-gray-400 border-b-0 px-2 py-1">
        <span />
        <span className="text-[12px] font-bold">PAYMENT VOUCHER</span>
        <span className="text-right">Original Copy</span>
      </div>
      <div className="grid min-h-[110px] grid-cols-[130px_1fr] border border-gray-400 border-b-0">
        <div className="flex items-center justify-center border-r border-gray-400 text-4xl font-bold">
          {(companyName || "C").slice(0, 2).toUpperCase()}
        </div>
        <div className="flex flex-col items-center justify-center px-4 text-center">
          <div className="font-['Times_New_Roman'] text-[30px] font-bold leading-tight">
            {companyName}
          </div>
          {company?.gstinUin ? <div>GSTIN: {company.gstinUin}</div> : null}
          {company?.primaryEmail ? <div>Email: {company.primaryEmail}</div> : null}
        </div>
      </div>
      <div className="grid grid-cols-2 border border-gray-400 border-b-0">
        <div className="space-y-1 border-r border-gray-400 p-2">
          <PrintLine label="Payment No">{record.documentNo}</PrintLine>
          <PrintLine label="Payment Date">{formatEntryDate(record.documentDate)}</PrintLine>
          <PrintLine label="Supplier">{record.partyName}</PrintLine>
        </div>
        <div className="space-y-1 p-2">
          <PrintLine label="Mode">{record.mode}</PrintLine>
          <PrintLine label={isBankTransferMode(record.mode) ? "Paid from bank" : "Ledger"}>
            {record.ledgerName ?? ""}
          </PrintLine>
          <PrintLine label="Reference">{record.referenceNo ?? ""}</PrintLine>
        </div>
      </div>
      <table className="w-full border-collapse border border-gray-400">
        <tbody>
          <tr>
            <td className="w-1/2 border-r border-gray-400 p-2 align-top">
              <div className="text-[8px]">Amount (in words)</div>
              <b>{amountInWords} Only</b>
            </td>
            <td className="w-1/2 p-0 align-top">
              <table className="w-full border-collapse">
                <tbody>
                  <PaymentSummaryLine label="Amount" value={formatMoney(record.amount)} />
                  <PaymentSummaryLine label="Round Off" value={formatMoney(record.roundOff)} />
                  <PaymentSummaryLine label="Net Amount" value={formatMoney(record.netAmount)} strong />
                </tbody>
              </table>
            </td>
          </tr>
          <tr>
            <td className="h-14 border-r border-t border-gray-400 p-2">Receiver Sign</td>
            <td className="h-14 border-t border-gray-400 p-2 text-right align-bottom">
              Authorised Signatory
            </td>
          </tr>
        </tbody>
      </table>
    </section>
  );
}

function PrintLine({ children, label }: { readonly children: ReactNode; readonly label: string }) {
  return (
    <div className="grid grid-cols-[90px_1fr] gap-2">
      <span className="font-bold">{label}:</span>
      <span>{children}</span>
    </div>
  );
}

function PaymentSummaryLine({
  label,
  strong = false,
  value,
}: {
  readonly label: string;
  readonly strong?: boolean;
  readonly value: string;
}) {
  return (
    <tr className={strong ? "font-bold" : ""}>
      <td className="border-b border-r border-gray-400 px-2 py-1">{label}</td>
      <td className="border-b border-gray-400 px-2 py-1 text-right">{value}</td>
    </tr>
  );
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

function Field({ children, label }: { readonly children: ReactNode; readonly label: string }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function isBankTransferMode(mode: string) {
  return mode !== "cash";
}

function toCompanyBankLookupOptions(
  bankAccounts: CompanyRecord["bankAccounts"],
): readonly CommonRecord[] {
  return bankAccounts
    .filter((bankAccount) => bankAccount.isActive)
    .sort((left, right) => Number(right.isPrimary) - Number(left.isPrimary))
    .map((bankAccount) => ({
      ...bankAccount,
      id: Number(bankAccount.id),
      code: bankAccount.accountNumber,
      name: bankAccount.bankName,
      createdAt: "",
      updatedAt: "",
      deletedAt: null,
      isActive: bankAccount.isActive,
    }));
}

function companyBankAccountLabel(record: CommonRecord) {
  const bankName = typeof record.bankName === "string" ? record.bankName.trim() : "";
  const accountNumber =
    typeof record.accountNumber === "string" ? record.accountNumber.trim() : "";
  const branch = typeof record.branch === "string" ? record.branch.trim() : "";
  const suffix = [accountNumber ? maskAccountNumber(accountNumber) : "", branch]
    .filter(Boolean)
    .join(" / ");
  return suffix ? `${bankName || "Bank"} - ${suffix}` : bankName || String(record.id);
}

function maskAccountNumber(value: string) {
  const trimmedValue = value.trim();
  if (trimmedValue.length <= 4) return trimmedValue;
  return `****${trimmedValue.slice(-4)}`;
}

function ContactAutocompleteField({
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
  const [draft, setDraft] = useState(() => createContactDraft(selectedLabel));
  const [createError, setCreateError] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
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

  function selectOption(option: SalesLookupOption) {
    setQuery(option.label);
    onPick(option);
    setIsOpen(false);
  }

  function selectActiveOption() {
    const activeOption = filteredOptions[activeIndex];
    if (activeOption) selectOption(activeOption);
  }

  async function createContact() {
    if (!draft.name.trim()) return;
    setIsSaving(true);
    setCreateError(null);
    try {
      const savedContact = await upsertContact(prepareContactForSave(toContactInput(draft)));
      const option = contactRecordToLookupOption(savedContact);
      setCreatedOptions((current) => [option, ...current]);
      selectOption(option);
      setIsCreateOpen(false);
      setDraft(createContactDraft(""));
      toast.success("Contact created");
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
                setDraft(createContactDraft(query));
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
        {isOpen ? (
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
                  setDraft(createContactDraft(query));
                  setIsCreateOpen(true);
                  setIsOpen(false);
                }}
              >
                + Create contact "{query.trim()}"
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
      {isCreateOpen ? (
        <div className="fixed inset-0 z-[120] grid place-items-center bg-background/55 p-4 backdrop-blur-sm">
          <div className="relative w-[min(520px,calc(100vw-2rem))] rounded-md border-2 border-border bg-card p-5 shadow-2xl ring-1 ring-foreground/10">
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="absolute right-3 top-3 size-8 rounded-md"
              onClick={() => setIsCreateOpen(false)}
              aria-label="Close contact popup"
            >
              <X className="size-4" />
            </Button>
            <div className="space-y-1 pr-10">
              <h2 className="text-lg font-semibold text-foreground">New contact</h2>
              <p className="text-sm text-muted-foreground">
                Add the minimum supplier details and select it for this payment.
              </p>
            </div>
            <div className="mt-5 grid gap-4">
              <Field label="Name">
                <Input
                  autoFocus
                  className="h-11 rounded-md"
                  value={draft.name}
                  onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
                />
              </Field>
              <Field label="Mobile">
                <Input
                  className="h-11 rounded-md"
                  value={draft.phoneNumber}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, phoneNumber: event.target.value }))
                  }
                />
              </Field>
              <Field label="GSTIN">
                <Input
                  className="h-11 rounded-md uppercase"
                  value={draft.gstin}
                  onChange={(event) => setDraft((current) => ({ ...current, gstin: event.target.value }))}
                />
              </Field>
            </div>
            {createError ? (
              <p className="mt-4 text-sm font-medium text-destructive">{createError}</p>
            ) : null}
            <div className="mt-5 flex flex-wrap justify-end gap-3 border-t border-border/70 pt-4">
              <Button
                type="button"
                variant="outline"
                className="rounded-xl"
                onClick={() => setIsCreateOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                className="rounded-xl"
                disabled={isSaving || !draft.name.trim()}
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
  readonly gstin: string;
  readonly name: string;
  readonly phoneNumber: string;
}

function createContactDraft(name: string): ContactCreateDraft {
  return { gstin: "", name: name.trim(), phoneNumber: "" };
}

function toContactInput(draft: ContactCreateDraft) {
  const input = createDefaultContactFormValues();
  return {
    ...input,
    code: "-",
    gstin: draft.gstin.trim() || null,
    gstDetails: draft.gstin.trim()
      ? [{ gstin: draft.gstin.trim().toUpperCase(), isDefault: true, state: "-" }]
      : [],
    name: draft.name.trim(),
    phones: draft.phoneNumber.trim()
      ? [{ isPrimary: true, phoneNumber: draft.phoneNumber.trim(), phoneType: "mobile" }]
      : [],
  };
}

function contactRecordToLookupOption(contact: Awaited<ReturnType<typeof upsertContact>>) {
  return {
    id: String(contact.id),
    label: contact.name,
    secondaryLabel: [contact.code, contact.ledgerName, contact.gstin].filter(Boolean).join(" / ") || null,
  } satisfies SalesLookupOption;
}

function numberToIndianCurrencyWords(value: number) {
  const amount = Math.abs(Number(value || 0));
  const rupees = Math.floor(amount);
  const paise = Math.round((amount - rupees) * 100);
  const paiseText = paise ? ` and ${numberToIndianWords(paise)} Paise` : "";
  return `${value < 0 ? "Minus " : ""}${numberToIndianWords(rupees)} Rupees${paiseText}`;
}

function numberToIndianWords(value: number): string {
  if (value === 0) return "Zero";
  const parts: string[] = [];
  const crore = Math.floor(value / 10_000_000);
  value %= 10_000_000;
  const lakh = Math.floor(value / 100_000);
  value %= 100_000;
  const thousand = Math.floor(value / 1_000);
  value %= 1_000;
  const hundred = Math.floor(value / 100);
  const rest = value % 100;
  if (crore) parts.push(`${numberBelowHundred(crore)} Crore`);
  if (lakh) parts.push(`${numberBelowHundred(lakh)} Lakh`);
  if (thousand) parts.push(`${numberBelowHundred(thousand)} Thousand`);
  if (hundred) parts.push(`${ones[hundred]} Hundred`);
  if (rest) parts.push(numberBelowHundred(rest));
  return parts.join(" ");
}

function numberBelowHundred(value: number) {
  if (value < 20) return ones[value];
  const ten = Math.floor(value / 10);
  const unit = value % 10;
  return unit ? `${tens[ten]} ${ones[unit]}` : tens[ten];
}

const ones = [
  "Zero",
  "One",
  "Two",
  "Three",
  "Four",
  "Five",
  "Six",
  "Seven",
  "Eight",
  "Nine",
  "Ten",
  "Eleven",
  "Twelve",
  "Thirteen",
  "Fourteen",
  "Fifteen",
  "Sixteen",
  "Seventeen",
  "Eighteen",
  "Nineteen",
] as const;

const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"] as const;

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Please try again.";
}

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === "AbortError";
}
