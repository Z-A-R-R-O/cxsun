"use client";

import { useEffect, useMemo, useState } from "react";
import { MasterListPageFrame } from "@cxnext/ui";
import { formatMoney, listSales } from "../../../sales/application/sales-service";
import type { SalesRecord } from "../../../sales/domain/sales";
import { listPurchase } from "../../../purchase/application/purchase-service";
import type { PurchaseRecord } from "../../../purchase/domain/purchase";
import { listReceipts } from "../../../receipt/application/receipt-service";
import type { ReceiptRecord } from "../../../receipt/domain/receipt";
import { listPayments } from "../../../payment/application/payment-service";
import type { PaymentRecord } from "../../../payment/domain/payment";
import { getActiveCompany } from "../../../company/application/company-service";
import type { CompanyRecord } from "../../../company/domain/company";
import { listContacts } from "../../../contact/application/contact-list.service";
import type { ContactRecord } from "../../../contact/domain/contact";
import { listCommonRecords, type CommonRecord } from "../../../common/application/common-service";
import { readStoredApplicationContext } from "../../../auth/infrastructure/session-storage";
import { loadCompanySoftwareSettingsFromServer } from "../../../settings/application/software-settings-service";
import {
  defaultSoftwareSettingsState,
  type DutiesTaxSettings,
} from "../../../settings/domain/software-settings";
import {
  GstReportCard,
  GstSideTable,
  GstSummaryCards,
  PrintButton,
  ReportPrintSheet,
  ReportTable,
  type GstRow,
  type GstTotals,
} from "./report-print-components";
import {
  ReportFilters,
  type ReportFiltersValue,
  type ReportMonthOption,
} from "./report-filter-components";

type ReportKind = "customer" | "gst" | "supplier";
type StatementContactType = "customer" | "supplier";

const reportContactTypeIds: Record<StatementContactType, readonly string[]> = {
  customer: ["contact-type:customer", "contact-type:vendor-customer"],
  supplier: ["contact-type:supplier", "contact-type:vendor-customer"],
};

export function CustomerStatementReportPage() {
  const [sales, setSales] = useState<readonly SalesRecord[]>([]);
  const [receipts, setReceipts] = useState<readonly ReceiptRecord[]>([]);
  const [filters, setFilters] = useReportFilters();
  const company = useReportCompany();
  const contacts = useReportContacts("customer");

  useEffect(() => {
    const controller = new AbortController();
    void Promise.all([
      listSales({ signal: controller.signal }).catch(() => []),
      listReceipts({ signal: controller.signal }).catch(() => []),
    ]).then(([salesRecords, receiptRecords]) => {
      setSales(salesRecords);
      setReceipts(receiptRecords);
    });
    return () => controller.abort();
  }, []);

  const rows = useMemo(
    () => buildCustomerStatementRows(sales, receipts, filters),
    [filters, receipts, sales],
  );

  return (
    <StatementReportFrame
      description="Review customer sales invoices, balances, and references."
      filters={filters}
      kind="customer"
      company={company}
      contacts={contacts}
      rows={rows}
      title="Customer Statement"
      onFiltersChange={setFilters}
    />
  );
}

export function SupplierStatementReportPage() {
  const [purchases, setPurchases] = useState<readonly PurchaseRecord[]>([]);
  const [payments, setPayments] = useState<readonly PaymentRecord[]>([]);
  const [filters, setFilters] = useReportFilters();
  const company = useReportCompany();
  const contacts = useReportContacts("supplier");

  useEffect(() => {
    const controller = new AbortController();
    void Promise.all([
      listPurchase({ signal: controller.signal }).catch(() => []),
      listPayments({ signal: controller.signal }).catch(() => []),
    ]).then(([purchaseRecords, paymentRecords]) => {
      setPurchases(purchaseRecords);
      setPayments(paymentRecords);
    });
    return () => controller.abort();
  }, []);

  const rows = useMemo(
    () => buildSupplierStatementRows(purchases, payments, filters),
    [filters, payments, purchases],
  );

  return (
    <StatementReportFrame
      description="Review supplier purchase bills, balances, and references."
      filters={filters}
      kind="supplier"
      company={company}
      contacts={contacts}
      rows={rows}
      title="Supplier Statement"
      onFiltersChange={setFilters}
    />
  );
}

export function GstStatementReportPage() {
  const [sales, setSales] = useState<readonly SalesRecord[]>([]);
  const [purchases, setPurchases] = useState<readonly PurchaseRecord[]>([]);
  const company = useReportCompany();
  const defaultMonth = useMemo(() => currentReportMonth(), []);
  const [filters, setFilters] = useReportFilters(defaultMonth);
  const [monthOptions, setMonthOptions] = useState<readonly ReportMonthOption[]>([defaultMonth]);
  const [dutiesTaxSettings, setDutiesTaxSettings] = useState<DutiesTaxSettings>(
    defaultSoftwareSettingsState.dutiesTaxSettings,
  );

  useEffect(() => {
    const controller = new AbortController();
    const companyId = readStoredApplicationContext()?.company.id ?? null;
    void loadCompanySoftwareSettingsFromServer(companyId, { signal: controller.signal })
      .then((settings) => {
        if (controller.signal.aborted) return;
        setDutiesTaxSettings(settings.dutiesTaxSettings);
      })
      .catch(() => undefined);
    void Promise.all([
      listSales({ signal: controller.signal }).catch(() => []),
      listPurchase({ signal: controller.signal }).catch(() => []),
    ]).then(([salesRecords, purchaseRecords]) => {
      setSales(salesRecords);
      setPurchases(purchaseRecords);
    });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void listCommonRecords("months", { signal: controller.signal })
      .then((records) => {
        if (controller.signal.aborted) return;
        const options = toReportMonthOptions(records);
        if (!options.length) return;
        setMonthOptions(options);
        const selected = options.find((option) => option.value === filters.monthId) ?? options[0];
        setFilters((current) => ({
          ...current,
          monthId: selected.value,
          fromDate: selected.fromDate,
          toDate: selected.toDate,
        }));
      })
      .catch(() => {
        setMonthOptions(
          Array.from({ length: 12 }, (_, index) => reportMonthFor(new Date().getFullYear(), index)),
        );
      });
    return () => controller.abort();
  }, []);

  const salesRows = useMemo(() => buildGstRows(sales, filters), [filters, sales]);
  const purchaseRows = useMemo(() => buildGstRows(purchases, filters), [filters, purchases]);
  const salesTotals = useMemo(() => gstRowTotals(salesRows), [salesRows]);
  const purchaseTotals = useMemo(() => gstRowTotals(purchaseRows), [purchaseRows]);
  const openingTotals = useMemo(
    () => buildOpeningGstTotals(sales, purchases, filters, dutiesTaxSettings),
    [dutiesTaxSettings, filters, purchases, sales],
  );
  const yearSalesTotals = useMemo(() => buildYearGstTotals(sales, filters), [filters, sales]);
  const yearPurchaseTotals = useMemo(
    () => buildYearGstTotals(purchases, filters),
    [filters, purchases],
  );
  const balanceGst = openingTotals.gst + purchaseTotals.gst - salesTotals.gst;

  return (
    <MasterListPageFrame
      action={<PrintButton />}
      className="w-[calc(100%-2rem)] max-w-[1500px] sm:w-[calc(100%-3rem)] lg:w-[calc(100%-4rem)]"
      description="Review GST taxable value, tax amount, and total movement."
      technicalName="page.reports.gst-statement"
      title="GST Statement"
    >
      <ReportFilters
        filters={filters}
        monthOptions={monthOptions}
        showPartyFilter={false}
        onChange={setFilters}
      />
      <ReportPrintSheet company={company} title="GST Statement">
        <div className="grid gap-5">
          <GstReportCard>
            <div className="grid gap-4 xl:grid-cols-2">
              <GstSideTable rows={salesRows} title="Sales" />
              <GstSideTable rows={purchaseRows} title="Purchase" />
            </div>
          </GstReportCard>
          <GstReportCard>
            <GstSummaryCards
              balanceGst={balanceGst}
              openingTotals={openingTotals}
              purchaseTotals={purchaseTotals}
              salesTotals={salesTotals}
              yearPurchaseTotals={yearPurchaseTotals}
              yearSalesTotals={yearSalesTotals}
            />
          </GstReportCard>
        </div>
      </ReportPrintSheet>
    </MasterListPageFrame>
  );
}

interface StatementRow {
  readonly age: number;
  readonly balance: number;
  readonly credit: number;
  readonly date: string;
  readonly debit: number;
  readonly description: string;
  readonly party: string;
  readonly reference: string;
  readonly type: string;
  readonly voucherNo: string;
}

function StatementReportFrame({
  company,
  contacts,
  description,
  filters,
  kind,
  onFiltersChange,
  rows,
  title,
}: {
  readonly company: CompanyRecord | null;
  readonly contacts: readonly ContactRecord[];
  readonly description: string;
  readonly filters: ReportFiltersValue;
  readonly kind: ReportKind;
  readonly onFiltersChange: (value: ReportFiltersValue) => void;
  readonly rows: readonly StatementRow[];
  readonly title: string;
}) {
  return (
    <MasterListPageFrame
      action={<PrintButton />}
      className="w-[calc(100%-2rem)] max-w-[1500px] sm:w-[calc(100%-3rem)] lg:w-[calc(100%-4rem)]"
      description={description}
      technicalName={`page.reports.${kind}-statement`}
      title={title}
    >
      <ReportFilters
        contactOptions={contacts}
        filters={filters}
        partyLabel={kind === "supplier" ? "Supplier" : "Customer"}
        onChange={onFiltersChange}
      />
      <ReportPrintSheet company={company} title={title}>
        <ReportTable
          headers={[
            "Date",
            "Type",
            "Voucher",
            kind === "supplier" ? "Supplier" : "Customer",
            "Reference",
            kind === "supplier" ? "Purchase" : "Sales",
            kind === "supplier" ? "Payment" : "Receipt",
            "Balance",
            "Age",
          ]}
          rows={rows.map((row) => [
            formatDate(row.date),
            row.type,
            row.voucherNo,
            row.party,
            row.reference,
            formatMoney(row.debit),
            formatMoney(row.credit),
            formatMoney(row.balance),
            String(row.age),
          ])}
          totals={[
            "",
            "",
            "",
            "",
            "TOTALS.",
            formatMoney(sum(rows, "debit")),
            formatMoney(sum(rows, "credit")),
            formatMoney(rows.at(-1)?.balance ?? 0),
            "",
          ]}
        />
      </ReportPrintSheet>
    </MasterListPageFrame>
  );
}

function useReportFilters(initialMonth?: ReportMonthOption) {
  return useState<ReportFiltersValue>({
    fromDate: initialMonth?.fromDate ?? "",
    monthId: initialMonth?.value ?? "",
    party: "",
    toDate: initialMonth?.toDate ?? "",
  });
}

function useReportCompany() {
  const [company, setCompany] = useState<CompanyRecord | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    void getActiveCompany({ signal: controller.signal })
      .then((company) => {
        if (controller.signal.aborted) return;
        setCompany(company);
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setCompany(null);
        }
      });
    return () => controller.abort();
  }, []);

  return company;
}

function useReportContacts(type: StatementContactType) {
  const [contacts, setContacts] = useState<readonly ContactRecord[]>([]);

  useEffect(() => {
    const controller = new AbortController();
    void listContacts({ signal: controller.signal })
      .then((records) => {
        if (controller.signal.aborted) return;
        const contactTypeIds = reportContactTypeIds[type];
        setContacts(
          records
            .filter((contact) => contact.isActive && isReportContact(contact, contactTypeIds, type))
            .sort((left, right) => left.name.localeCompare(right.name)),
        );
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setContacts([]);
        }
      });
    return () => controller.abort();
  }, [type]);

  return contacts;
}

function isReportContact(
  contact: ContactRecord,
  contactTypeIds: readonly string[],
  type: StatementContactType,
) {
  if (contact.contactTypeId && contactTypeIds.includes(contact.contactTypeId)) return true;
  const normalizedLedger = contact.ledgerName?.trim().toLowerCase() ?? "";
  if (normalizedLedger === "vendor customer") return true;
  if (type === "customer") return normalizedLedger === "customer" || normalizedLedger === "sundry debtors";
  return normalizedLedger === "supplier" || normalizedLedger === "sundry creditors";
}

function currentReportMonth() {
  const today = new Date();
  return reportMonthFor(today.getFullYear(), today.getMonth());
}

function reportMonthFor(year: number, monthIndex: number): ReportMonthOption {
  const month = String(monthIndex + 1).padStart(2, "0");
  const lastDay = new Date(year, monthIndex + 1, 0).getDate();
  const fromDate = `${year}-${month}-01`;
  const toDate = `${year}-${month}-${String(lastDay).padStart(2, "0")}`;
  return {
    fromDate,
    label: monthLabel(year, monthIndex),
    toDate,
    value: `${year}-${month}`,
  };
}

function toReportMonthOptions(records: readonly CommonRecord[]): readonly ReportMonthOption[] {
  const options = records
    .map((record) => {
      const fromDate = stringValue(record.startDate ?? record.start_date);
      const toDate = stringValue(record.endDate ?? record.end_date);
      if (!fromDate || !toDate) return null;
      const fallbackValue = fromDate.slice(0, 7);
      const date = new Date(`${fromDate}T00:00:00`);
      const label = stringValue(record.name) || monthLabel(date.getFullYear(), date.getMonth());
      return {
        fromDate,
        label,
        toDate,
        value: stringValue(record.code) || fallbackValue,
      };
    })
    .filter((option): option is ReportMonthOption => Boolean(option));

  return options.length
    ? options.sort((left, right) => left.fromDate.localeCompare(right.fromDate))
    : Array.from({ length: 12 }, (_, index) => reportMonthFor(new Date().getFullYear(), index));
}

function monthLabel(year: number, monthIndex: number) {
  const monthName = new Intl.DateTimeFormat("en-US", { month: "long" }).format(
    new Date(year, monthIndex, 1),
  );
  return `${monthName} -${year}`;
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value : "";
}

function buildCustomerStatementRows(
  sales: readonly SalesRecord[],
  receipts: readonly ReceiptRecord[],
  filters: ReportFiltersValue,
) {
  return withRunningBalance(
    [
      ...sales.map((record) => statementRow(record, "Sales", record.grandTotal, 0)),
      ...receipts.map((record) => statementRow(record, "Receipt", 0, record.netAmount)),
    ],
    filters,
  );
}

function buildSupplierStatementRows(
  purchases: readonly PurchaseRecord[],
  payments: readonly PaymentRecord[],
  filters: ReportFiltersValue,
) {
  return withRunningBalance(
    [
      ...purchases.map((record) => supplierPurchaseStatementRow(record)),
      ...payments.map((record) => statementRow(record, "Payment", 0, record.netAmount)),
    ],
    filters,
  );
}

function supplierPurchaseStatementRow(record: PurchaseRecord): StatementRow {
  return statementRow(
    {
      documentDate: record.supplierInvoiceDate ?? record.documentDate,
      documentNo: record.supplierInvoiceNo ?? record.documentNo,
      partyName: record.partyName,
      referenceNo: record.referenceNo,
    },
    "Purchase",
    record.grandTotal,
    0,
  );
}

function statementRow(
  record: Pick<SalesRecord, "documentDate" | "documentNo" | "partyName" | "referenceNo">,
  type: string,
  debit: number,
  credit: number,
): StatementRow {
  return {
    age: ageInDays(record.documentDate),
    balance: 0,
    credit,
    date: record.documentDate,
    debit,
    description: type,
    party: record.partyName,
    reference: record.referenceNo ?? "",
    type,
    voucherNo: record.documentNo,
  };
}

function withRunningBalance(rows: readonly StatementRow[], filters: ReportFiltersValue) {
  let balance = 0;
  return rows
    .filter((row) => inDateRange(row.date, filters.fromDate, filters.toDate))
    .filter((row) => matchesParty(row.party, filters.party))
    .sort((left, right) => left.date.localeCompare(right.date))
    .map((row) => {
      balance += row.debit - row.credit;
      return { ...row, balance };
    });
}

function buildGstRows(
  records: readonly (PurchaseRecord | SalesRecord)[],
  filters: ReportFiltersValue,
) {
  return records
    .filter((record) => inDateRange(record.documentDate, filters.fromDate, filters.toDate))
    .filter((record) => matchesParty(record.partyName, filters.party))
    .map((record): GstRow => {
      const totals = gstTotals(record);
      return {
        cgst: totals.cgst,
        date: record.documentDate,
        gst: totals.gst,
        igst: totals.igst,
        party: record.partyName,
        sgst: totals.sgst,
        taxable: totals.taxable,
        total: totals.total,
        voucherNo: record.documentNo,
      };
    })
    .sort((left, right) => left.date.localeCompare(right.date));
}

function gstTotals(record: PurchaseRecord | SalesRecord): GstTotals {
  const taxable = record.items.reduce((sumTotal, item) => sumTotal + item.quantity * item.rate, 0);
  const gst = record.items.reduce(
    (sumTotal, item) => sumTotal + (item.quantity * item.rate * item.taxRate) / 100,
    0,
  );
  const isIgst = record.placeOfSupply === "igst";
  const igst = isIgst ? gst : 0;
  const cgst = isIgst ? 0 : gst / 2;
  const sgst = isIgst ? 0 : gst / 2;
  return { cgst, gst, igst, sgst, taxable, total: taxable + gst + Number(record.roundOff ?? 0) };
}

function buildOpeningGstTotals(
  sales: readonly SalesRecord[],
  purchases: readonly PurchaseRecord[],
  filters: ReportFiltersValue,
  settings: DutiesTaxSettings,
) {
  const configuredOpening = openingGstTotalsFromSettings(settings);
  if (!filters.fromDate) return configuredOpening;
  const asOnDate = settings.openingGstAsOnDate;
  const afterAsOnDate = (record: PurchaseRecord | SalesRecord) =>
    !asOnDate || record.documentDate.slice(0, 10) > asOnDate;
  const priorSalesTotals = aggregateGstRecords(
    sales
      .filter((record) => afterAsOnDate(record))
      .filter((record) => record.documentDate.slice(0, 10) < filters.fromDate)
      .filter((record) => matchesParty(record.partyName, filters.party)),
  );
  const priorPurchaseTotals = aggregateGstRecords(
    purchases
      .filter((record) => afterAsOnDate(record))
      .filter((record) => record.documentDate.slice(0, 10) < filters.fromDate)
      .filter((record) => matchesParty(record.partyName, filters.party)),
  );
  return addGstTotals(configuredOpening, subtractGstTotals(priorPurchaseTotals, priorSalesTotals));
}

function buildYearGstTotals(
  records: readonly (PurchaseRecord | SalesRecord)[],
  filters: ReportFiltersValue,
) {
  const year = (filters.fromDate || filters.toDate || new Date().toISOString()).slice(0, 4);
  return aggregateGstRecords(
    records
      .filter((record) => record.documentDate.slice(0, 4) === year)
      .filter((record) => matchesParty(record.partyName, filters.party)),
  );
}

function aggregateGstRecords(records: readonly (PurchaseRecord | SalesRecord)[]) {
  return records.reduce(
    (total, record) => addGstTotals(total, gstTotals(record)),
    emptyGstTotals(),
  );
}

function gstRowTotals(rows: readonly GstRow[]): GstTotals {
  return {
    cgst: sum(rows, "cgst"),
    gst: sum(rows, "gst"),
    igst: sum(rows, "igst"),
    sgst: sum(rows, "sgst"),
    taxable: sum(rows, "taxable"),
    total: sum(rows, "total"),
  };
}

function emptyGstTotals(): GstTotals {
  return { cgst: 0, gst: 0, igst: 0, sgst: 0, taxable: 0, total: 0 };
}

function openingGstTotalsFromSettings(settings: DutiesTaxSettings): GstTotals {
  const igst = Number(settings.openingGstIgst || 0);
  const cgst = Number(settings.openingGstCgst || 0);
  const sgst = Number(settings.openingGstSgst || 0);
  const gst = igst + cgst + sgst;
  return { cgst, gst, igst, sgst, taxable: 0, total: gst };
}

function addGstTotals(left: GstTotals, right: GstTotals): GstTotals {
  return {
    cgst: left.cgst + right.cgst,
    gst: left.gst + right.gst,
    igst: left.igst + right.igst,
    sgst: left.sgst + right.sgst,
    taxable: left.taxable + right.taxable,
    total: left.total + right.total,
  };
}

function subtractGstTotals(left: GstTotals, right: GstTotals): GstTotals {
  return {
    cgst: left.cgst - right.cgst,
    gst: left.gst - right.gst,
    igst: left.igst - right.igst,
    sgst: left.sgst - right.sgst,
    taxable: left.taxable - right.taxable,
    total: left.total - right.total,
  };
}

function inDateRange(value: string, fromDate: string, toDate: string) {
  const date = value.slice(0, 10);
  return (!fromDate || date >= fromDate) && (!toDate || date <= toDate);
}

function matchesParty(partyName: string, filter: string) {
  return !filter.trim() || partyName.toLowerCase().includes(filter.trim().toLowerCase());
}

function sum<T>(rows: readonly T[], key: keyof T) {
  return rows.reduce((total, row) => total + Number(row[key] ?? 0), 0);
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(date);
}

function ageInDays(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 0;
  return Math.max(0, Math.floor((Date.now() - date.getTime()) / 86_400_000));
}
