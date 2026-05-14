"use client";

import { type ReactNode } from "react";
import { Printer } from "lucide-react";
import { Button } from "@cxnext/ui";
import { formatMoney } from "../../../sales/application/sales-service";
import type { CompanyRecord } from "../../../company/domain/company";

export interface GstRow {
  readonly cgst: number;
  readonly date: string;
  readonly gst: number;
  readonly igst: number;
  readonly party: string;
  readonly sgst: number;
  readonly taxable: number;
  readonly total: number;
  readonly voucherNo: string;
}

export interface GstTotals {
  readonly cgst: number;
  readonly gst: number;
  readonly igst: number;
  readonly sgst: number;
  readonly taxable: number;
  readonly total: number;
}

export function ReportPrintSheet({
  children,
  company,
  title,
}: {
  readonly children: ReactNode;
  readonly company: CompanyRecord | null;
  readonly title: string;
}) {
  return (
    <>
      <style jsx global>{`
        @page {
          size: A4 portrait;
          margin: 7mm 4mm 5mm;
        }

        @media print {
          body * {
            visibility: hidden;
          }

          .report-print-sheet,
          .report-print-sheet * {
            visibility: visible;
          }
        }
      `}</style>
      <section className="report-print-sheet rounded-md border border-border/70 bg-card p-4 print:fixed print:inset-0 print:z-[9999] print:mx-auto print:block print:min-h-0 print:w-full print:overflow-visible print:border-0 print:bg-white print:p-0 print:text-black">
        <div className="hidden print:mx-auto print:block print:w-[198mm] print:max-w-none">
          <ReportLetterhead company={company} title={title} />
          {children}
        </div>
        <div className="print:hidden">{children}</div>
      </section>
    </>
  );
}

export function GstReportCard({ children }: { readonly children: ReactNode }) {
  return (
    <section className="rounded-md border border-border/70 bg-card p-3 shadow-sm print:border-0 print:bg-white print:p-0 print:shadow-none">
      {children}
    </section>
  );
}

export function ReportTable({
  headers,
  rows,
  totals,
}: {
  readonly headers: readonly string[];
  readonly rows: readonly (readonly string[])[];
  readonly totals: readonly string[];
}) {
  return (
    <div className="overflow-x-auto print:overflow-visible">
      <table className="w-full min-w-[900px] border-collapse text-sm print:min-w-0 print:text-[10px]">
        <thead className="bg-muted/55 print:bg-white">
          <tr>
            {headers.map((header, index) => (
              <th key={header} className={reportTableCellClass(headers, index, true)}>
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={`${row[0]}-${row[2]}-${index}`}>
              {row.map((cell, cellIndex) => (
                <td key={`${cell}-${cellIndex}`} className={reportTableCellClass(headers, cellIndex)}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
          <tr className="bg-muted/20 font-semibold print:bg-white">
            {totals.map((cell, index) => (
              <td key={`${cell}-${index}`} className={reportTableCellClass(headers, index)}>
                {cell}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

export function GstSideTable({
  rows,
  title,
}: {
  readonly rows: readonly GstRow[];
  readonly title: string;
}) {
  return (
    <div className="overflow-x-auto rounded-md border border-border/70 print:overflow-visible">
      <div className="border-b border-border/70 bg-muted/45 px-3 py-2 text-sm font-semibold print:bg-white print:text-[10px]">
        {title}
      </div>
      <table className="w-full min-w-[620px] border-collapse text-sm print:min-w-0 print:text-[10px]">
        <thead>
          <tr>
            {["Date", "Voucher", "Party", "Taxable", "GST", "Total"].map((header) => (
              <th key={header} className="border border-border/70 px-3 py-2 text-left font-medium print:px-1.5 print:py-1">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.voucherNo}>
              <td className="border border-border/70 px-3 py-2 print:px-1.5 print:py-1">{formatDate(row.date)}</td>
              <td className="border border-border/70 px-3 py-2 print:px-1.5 print:py-1">{row.voucherNo}</td>
              <td className="border border-border/70 px-3 py-2 print:px-1.5 print:py-1">{row.party}</td>
              <td className="border border-border/70 px-3 py-2 text-right print:px-1.5 print:py-1">{formatMoney(row.taxable)}</td>
              <td className="border border-border/70 px-3 py-2 text-right print:px-1.5 print:py-1">{formatMoney(row.gst)}</td>
              <td className="border border-border/70 px-3 py-2 text-right print:px-1.5 print:py-1">{formatMoney(row.total)}</td>
            </tr>
          ))}
          <tr className="bg-muted/20 font-semibold print:bg-white">
            <td className="border border-border/70 px-3 py-2 print:px-1.5 print:py-1" colSpan={3}>TOTALS.</td>
            <td className="border border-border/70 px-3 py-2 text-right print:px-1.5 print:py-1">{formatMoney(sum(rows, "taxable"))}</td>
            <td className="border border-border/70 px-3 py-2 text-right print:px-1.5 print:py-1">{formatMoney(sum(rows, "gst"))}</td>
            <td className="border border-border/70 px-3 py-2 text-right print:px-1.5 print:py-1">{formatMoney(sum(rows, "total"))}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

export function GstSummaryCards({
  balanceGst,
  openingTotals,
  purchaseTotals,
  salesTotals,
  yearPurchaseTotals,
  yearSalesTotals,
}: {
  readonly balanceGst: number;
  readonly openingTotals: GstTotals;
  readonly purchaseTotals: GstTotals;
  readonly salesTotals: GstTotals;
  readonly yearPurchaseTotals: GstTotals;
  readonly yearSalesTotals: GstTotals;
}) {
  const balanceTotals = {
    cgst: openingTotals.cgst + purchaseTotals.cgst - salesTotals.cgst,
    gst: balanceGst,
    igst: openingTotals.igst + purchaseTotals.igst - salesTotals.igst,
    sgst: openingTotals.sgst + purchaseTotals.sgst - salesTotals.sgst,
    taxable: openingTotals.taxable + purchaseTotals.taxable - salesTotals.taxable,
    total: openingTotals.total + purchaseTotals.total - salesTotals.total,
  };

  return (
    <div className="grid gap-3 text-sm print:text-[10px]">
      <GstBalanceCard
        balanceGst={balanceGst}
        openingGst={openingTotals.gst}
        purchaseGst={purchaseTotals.gst}
        salesGst={salesTotals.gst}
      />
      <GstSplitCard
        balanceTotals={balanceTotals}
        openingTotals={openingTotals}
        purchaseTotals={purchaseTotals}
        salesTotals={salesTotals}
      />
      <GstPeriodCard
        purchaseTotals={purchaseTotals}
        salesTotals={salesTotals}
        yearPurchaseTotals={yearPurchaseTotals}
        yearSalesTotals={yearSalesTotals}
      />
    </div>
  );
}

export function PrintButton() {
  return (
    <Button className="rounded-xl print:hidden" onClick={() => window.print()}>
      <Printer className="size-4" />
      Print
    </Button>
  );
}

function ReportLetterhead({
  company,
  title,
}: {
  readonly company: CompanyRecord | null;
  readonly title: string;
}) {
  const companyName = printableText(company?.legalName) || printableText(company?.name);
  const addressLines = company ? companyAddress(company) : [];
  const contactLine = company ? companyContact(company) : "";

  return (
    <header className="mb-3 border border-border/70 text-center font-[Verdana,Arial,sans-serif] text-[10px]">
      <div className="grid min-h-[25mm] grid-cols-[28mm_1fr_28mm] items-center border-b border-border/70 px-3 py-2">
        <div className="justify-self-start">
          <CompanyLogo company={company} companyName={companyName} />
        </div>
        <div className="space-y-0.5">
          <div className="text-[18px] font-bold leading-tight">{companyName || "Company"}</div>
          {addressLines.map((line) => (
            <div key={line}>{line}</div>
          ))}
          {contactLine ? <div>{contactLine}</div> : null}
          {company?.gstinUin ? <div>GSTIN: {company.gstinUin}</div> : null}
        </div>
        <div />
      </div>
      <div className="py-1.5 text-[12px] font-bold uppercase">{title}</div>
    </header>
  );
}

function CompanyLogo({
  company,
  companyName,
}: {
  readonly company: CompanyRecord | null;
  readonly companyName: string;
}) {
  const logoUrl =
    company?.logos.find((logo) => logo.isActive)?.logoUrl.trim() || "/storage/logo/logo.svg";
  return <img src={logoUrl} alt={companyName || "cxnext"} className="max-h-[20mm] max-w-[24mm] object-contain" />;
}

function GstBalanceCard({
  balanceGst,
  openingGst,
  purchaseGst,
  salesGst,
}: {
  readonly balanceGst: number;
  readonly openingGst: number;
  readonly purchaseGst: number;
  readonly salesGst: number;
}) {
  return (
    <GstSummarySection title="GST Balance">
      <GstMetricCard label="Opening GST" value={formatMoney(openingGst)} />
      <GstMetricCard label="Purchase GST" value={formatMoney(purchaseGst)} />
      <GstMetricCard label="Sales GST" value={formatMoney(salesGst)} />
      <GstMetricCard label="Balance" toneValue={balanceGst} value={formatSignedMoney(balanceGst)} strong />
    </GstSummarySection>
  );
}

function GstSplitCard({
  balanceTotals,
  openingTotals,
  purchaseTotals,
  salesTotals,
}: {
  readonly balanceTotals: GstTotals;
  readonly openingTotals: GstTotals;
  readonly purchaseTotals: GstTotals;
  readonly salesTotals: GstTotals;
}) {
  return (
    <GstSummarySection title="Tax Split">
      <GstTaxSplitCard label="Opening" totals={openingTotals} />
      <GstTaxSplitCard label="Purchase" totals={purchaseTotals} />
      <GstTaxSplitCard label="Sales" totals={salesTotals} />
      <GstTaxSplitCard label="Balance" totals={balanceTotals} strong />
    </GstSummarySection>
  );
}

function GstPeriodCard({
  purchaseTotals,
  salesTotals,
  yearPurchaseTotals,
  yearSalesTotals,
}: {
  readonly purchaseTotals: GstTotals;
  readonly salesTotals: GstTotals;
  readonly yearPurchaseTotals: GstTotals;
  readonly yearSalesTotals: GstTotals;
}) {
  return (
    <GstSummarySection title="Period Comparison">
      <GstPeriodMiniCard title="This month" purchaseTotals={purchaseTotals} salesTotals={salesTotals} />
      <GstPeriodMiniCard title="This year" purchaseTotals={yearPurchaseTotals} salesTotals={yearSalesTotals} />
    </GstSummarySection>
  );
}

function GstSummarySection({
  children,
  title,
}: {
  readonly children: ReactNode;
  readonly title: string;
}) {
  return (
    <section className="rounded-md border border-border/70 bg-card p-3 shadow-sm print:bg-white print:p-2 print:shadow-none">
      <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground print:mb-2 print:text-[9px]">
        {title}
      </div>
      <div className="grid overflow-hidden rounded-md border border-border divide-y divide-border md:grid-cols-2 md:divide-x md:divide-y-0 xl:grid-cols-4">
        {children}
      </div>
    </section>
  );
}

function GstMetricCard({
  label,
  strong = false,
  toneValue,
  value,
}: {
  readonly label: string;
  readonly strong?: boolean;
  readonly toneValue?: number;
  readonly value: string;
}) {
  return (
    <div className="grid min-h-20 grid-rows-[auto_1fr] bg-card px-3 py-2 print:min-h-14 print:bg-white">
      <div className="text-xs font-medium text-muted-foreground print:text-[9px]">{label}</div>
      <div className={`self-end text-right text-base tabular-nums print:text-[10px] ${strong ? "font-semibold" : ""} ${toneClass(toneValue)}`}>
        {value}
      </div>
    </div>
  );
}

function GstTaxSplitCard({
  label,
  strong = false,
  totals,
}: {
  readonly label: string;
  readonly strong?: boolean;
  readonly totals: GstTotals;
}) {
  return (
    <div className={`grid bg-card print:bg-white ${strong ? "font-semibold" : ""}`}>
      <div className="border-b border-border px-3 py-2 text-xs font-medium text-muted-foreground print:px-2 print:py-1 print:text-[9px]">{label}</div>
      <div className="grid grid-cols-3 divide-x divide-border text-xs print:text-[9px]">
        <TaxSplitValue label="IGST" value={totals.igst} />
        <TaxSplitValue label="CGST" value={totals.cgst} />
        <TaxSplitValue label="SGST" value={totals.sgst} />
      </div>
    </div>
  );
}

function TaxSplitValue({ label, value }: { readonly label: string; readonly value: number }) {
  return (
    <div className="grid gap-1 px-3 py-2 print:px-2 print:py-1">
      <span className="text-muted-foreground">{label}</span>
      <span className={`text-right tabular-nums ${toneClass(value)}`}>{formatMoney(value)}</span>
    </div>
  );
}

function GstPeriodMiniCard({
  purchaseTotals,
  salesTotals,
  title,
}: {
  readonly purchaseTotals: GstTotals;
  readonly salesTotals: GstTotals;
  readonly title: string;
}) {
  const differenceTotals = subtractGstTotals(salesTotals, purchaseTotals);
  return (
    <div className="bg-card print:bg-white xl:col-span-2">
      <div className="border-b border-border px-3 py-2 text-xs font-medium text-muted-foreground print:px-2 print:py-1 print:text-[9px]">{title}</div>
      <div className="grid grid-cols-[6rem_repeat(3,minmax(0,1fr))] border-b border-border bg-muted/20 text-xs text-muted-foreground print:bg-white print:text-[9px]">
        <span />
        <span className="border-l border-border px-2 py-1.5 text-right print:py-1">Taxable</span>
        <span className="border-l border-border px-2 py-1.5 text-right print:py-1">Tax</span>
        <span className="border-l border-border px-2 py-1.5 text-right print:py-1">Total</span>
      </div>
      <GstPeriodLine label="Sales" totals={salesTotals} />
      <GstPeriodLine label="Purchase" totals={purchaseTotals} />
      <GstPeriodLine label="Difference" totals={differenceTotals} strong />
    </div>
  );
}

function GstPeriodLine({
  label,
  strong = false,
  totals,
}: {
  readonly label: string;
  readonly strong?: boolean;
  readonly totals: GstTotals;
}) {
  return (
    <div className={`grid grid-cols-[6rem_repeat(3,minmax(0,1fr))] border-b border-border last:border-b-0 ${strong ? "bg-muted/15 font-semibold print:bg-white" : ""}`}>
      <span className="px-3 py-1.5 print:px-2 print:py-1">{label}</span>
      <span className={`border-l border-border px-2 py-1.5 text-right tabular-nums print:py-1 ${toneClass(strong ? totals.taxable : undefined)}`}>{formatMoney(totals.taxable)}</span>
      <span className={`border-l border-border px-2 py-1.5 text-right tabular-nums print:py-1 ${toneClass(strong ? totals.gst : undefined)}`}>{formatMoney(totals.gst)}</span>
      <span className={`border-l border-border px-2 py-1.5 text-right tabular-nums print:py-1 ${toneClass(strong ? totals.total : undefined)}`}>{formatMoney(totals.total)}</span>
    </div>
  );
}

function reportTableCellClass(headers: readonly string[], index: number, isHeader = false) {
  const header = headers[index];
  const alignment =
    header === "Age"
      ? "text-center"
      : ["Sales", "Purchase", "Payment", "Receipt", "Balance"].includes(header)
        ? "text-right"
        : "text-left";
  const weight = isHeader ? "font-medium" : "";
  return ["border border-border/70 px-3 py-2 print:px-1.5 print:py-1", alignment, weight].filter(Boolean).join(" ");
}

function companyAddress(company: CompanyRecord) {
  const address =
    company.addresses.find((item) => item.isDefault && item.isActive) ??
    company.addresses.find((item) => item.isActive) ??
    company.addresses[0];

  return [address?.addressLine1, address?.addressLine2].map(printableText).filter(Boolean);
}

function companyContact(company: CompanyRecord) {
  const phone =
    printableText(company.primaryPhone) ||
    printableText(company.phones.find((item) => item.isPrimary && item.isActive)?.phoneNumber) ||
    printableText(company.phones.find((item) => item.isActive)?.phoneNumber);
  const email =
    printableText(company.primaryEmail) ||
    printableText(company.emails.find((item) => item.isActive)?.email);
  return [phone ? `Mobile: ${phone}` : "", email ? `Email: ${email}` : ""].filter(Boolean).join(" | ");
}

function printableText(value: string | null | undefined) {
  return value?.trim() ?? "";
}

function sum<T>(rows: readonly T[], key: keyof T) {
  return rows.reduce((total, row) => total + Number(row[key] ?? 0), 0);
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(date);
}

function formatSignedMoney(value: number) {
  if (value === 0) return formatMoney(0);
  return `${value > 0 ? "+" : "-"} ${formatMoney(Math.abs(value))}`;
}

function toneClass(value: number | undefined) {
  if (value === undefined) return "";
  if (value < 0) return "text-red-600";
  if (value > 0) return "text-emerald-700";
  return "text-muted-foreground";
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
