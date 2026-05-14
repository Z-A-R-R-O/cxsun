"use client";

import { useMemo, type ReactNode } from "react";
import { calculateSalesTotals } from "../../application/sales-service";
import {
  resolveSalesBillingLayout,
  type SalesBillingLayout,
} from "../../application/sales-billing-layout-service";
import {
  getSalesIndustryKind,
  type SalesIndustryKind,
  type SalesItemInput,
  type SalesRecord,
} from "../../domain/sales";
import type { CompanyRecord } from "../../../company/domain/company";
import { MainPrintTemplate } from "./main-print-template";
import { getSalesPrintLinePlan } from "./sales-print-line-plan";

const tableClass = "w-full border-collapse border border-gray-400";
const baseCell = "border-r border-gray-400 align-top p-[3px]";
const itemCell = `${baseCell} h-[18px] border-b-4 border-double border-gray-400 text-center text-[9px] align-middle`;
const lineItemCell = `${baseCell} h-[18px] text-center text-[9px] leading-[1.08]`;
const totalItemCell = `${lineItemCell} border-y border-gray-400`;
const times = "font-['Times_New_Roman']";

export type SalesPrintCopy = "duplicate" | "original" | "triplicate";

export interface SalesPrintDetailLine {
  readonly label: string;
  readonly strong?: boolean;
  readonly value: ReactNode;
}

export function SalesInvoiceDocument({
  company,
  copy = "original",
  detailLines,
  documentTitle = "TAX INVOICE",
  industryName,
  partyAddressLabel = "Buyer",
  record,
  rightDetailLines,
  salesLayout: providedSalesLayout,
  customTerms,
  showEInvoiceDetails = true,
  showFooterDetails = true,
  showBankAccountNumber = true,
  showLogo = true,
  showQrAccountDetails = true,
}: {
  readonly company?: CompanyRecord | null;
  readonly copy?: SalesPrintCopy;
  readonly detailLines?: readonly SalesPrintDetailLine[];
  readonly documentTitle?: string;
  readonly industryName?: string | null;
  readonly partyAddressLabel?: string;
  readonly record: SalesRecord;
  readonly rightDetailLines?: readonly SalesPrintDetailLine[];
  readonly salesLayout?: SalesBillingLayout;
  readonly customTerms?: string | null;
  readonly showEInvoiceDetails?: boolean;
  readonly showFooterDetails?: boolean;
  readonly showBankAccountNumber?: boolean;
  readonly showLogo?: boolean;
  readonly showQrAccountDetails?: boolean;
}) {
  const totals = useMemo(
    () => calculateSalesTotals(record.items, Number(record.roundOff ?? 0)),
    [record],
  );
  const gstPercent = record.items[0]?.taxRate ?? 0;
  const isCgstSgst = (record.placeOfSupply ?? "cgst-sgst") !== "igst";
  const industryKind = getSalesIndustryKind(industryName);
  const salesLayout = providedSalesLayout ?? resolveSalesBillingLayout(industryName);
  const itemColumns = getPrintItemColumns(industryKind, salesLayout);
  const itemLinePlan = getSalesPrintLinePlan(record.items, industryKind, salesLayout);
  const companyName = printableText(company?.legalName) || printableText(company?.name);
  const companyAddressLines = company ? companyAddress(company) : [];
  const companyContactLine = company ? companyContact(company) : "";
  const companyBank = company ? primaryBankAccount(company) : null;
  const summaryValueColSpan = 2;
  const summaryLabelColSpan = 2;
  const summaryLeftColSpan = Math.max(
    1,
    itemColumns.length - summaryLabelColSpan - summaryValueColSpan,
  );
  const signatureLeftColSpan = Math.max(1, Math.floor(itemColumns.length / 2));
  const signatureRightColSpan = Math.max(1, itemColumns.length - signatureLeftColSpan);
  const termsLines = salesPrintTerms(customTerms || record.terms);
  const hasEInvoiceBarcode = Boolean(
    printableText(record.eInvoiceIrn) && printableText(record.eInvoiceSignedQr),
  );

  return (
    <MainPrintTemplate>
      <div className="grid grid-cols-[1fr_auto_1fr] p-px text-[9px]">
        <span />
        <span className="text-[12px] font-bold">{documentTitle}</span>
        <span className="text-right">{salesPrintCopyLabel(copy)}</span>
      </div>
      <table className={`${tableClass} border-b-0`}>
        <tbody>
          <tr>
            <td className={`${baseCell} h-[160px] w-[145px] border-r-0 text-center align-middle`}>
              {showLogo ? (
                <CompanyLogo company={company ?? null} companyName={companyName} />
              ) : null}
            </td>
            <td
              className={`${baseCell} ${hasEInvoiceBarcode ? "" : "border-r-0"} text-center leading-[1.6]`}
            >
              <div className={`${times} text-[34px] font-bold leading-tight`}>{companyName}</div>
              {companyAddressLines.map((line) => (
                <div key={line} className={times}>
                  {line}
                </div>
              ))}
              {companyContactLine ? <div className={times}>{companyContactLine}</div> : null}
              {company?.gstinUin ? <div className={times}>GSTIN: {company.gstinUin}</div> : null}
            </td>
            <td className={`${baseCell} w-[160px] border-r-0 align-middle`}>
              <div className="mx-auto flex size-[150px] items-center justify-center p-[2px]">
                <EInvoiceQrData irn={record.eInvoiceIrn} value={record.eInvoiceSignedQr} />
              </div>
            </td>
          </tr>
        </tbody>
      </table>
      <table className={tableClass}>
        <tbody>
          <tr>
            <td className={`${baseCell} border-t border-gray-400 border-r-0 p-[5px]`} colSpan={3}>
              <div className="grid grid-cols-2">
                <div className="border-r border-gray-400 pr-[10px]">
                  <BillDetailsBlock
                    lines={
                      detailLines ?? [
                        { label: "Invoice No:", value: record.documentNo, strong: true },
                        { label: "Date:", value: formatDate(record.documentDate), strong: true },
                        { label: "Reference:", value: record.referenceNo ?? "" },
                      ]
                    }
                  />
                </div>
                <div className="pl-[10px]">
                  {rightDetailLines ? (
                    <BillDetailsBlock lines={rightDetailLines} labelWidthClassName="grid-cols-[104px_1fr]" />
                  ) : showEInvoiceDetails ? (
                    <EInvoiceQrSection record={record} />
                  ) : null}
                </div>
              </div>
            </td>
          </tr>
          <tr>
            <td
              className={`${baseCell} h-[58px] w-1/2 border-y border-gray-400 px-2.5 py-1 leading-tight`}
            >
              <PartyAddressBlock
                address={record.billingAddress}
                label={`${partyAddressLabel} (Bill to)`}
                partyName={record.partyName}
              />
            </td>
            <td
              className={`${baseCell} h-[58px] w-1/2 border-y border-gray-400 border-r-0 px-2.5 py-1 leading-tight`}
            >
              <PartyAddressBlock
                address={record.shippingAddress ?? record.billingAddress}
                label={`${partyAddressLabel} (Ship to)`}
                partyName={record.partyName}
              />
            </td>
          </tr>
        </tbody>
      </table>
      <table
        className={`${tableClass} border-t-0`}
        data-print-template={
          itemLinePlan.requiresTwoPageTemplate ? "two-page-required" : "single-page"
        }
      >
        <thead>
          <tr className="bg-gray-50">
            {itemColumns.map((header) => (
              <th key={header.label} className={`${itemCell} ${header.widthClass}`}>
                {header.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {itemLinePlan.rows.map((row) =>
            row.kind === "item" ? (
              <SalesPrintItemRow
                key={`item-${row.index}`}
                columns={itemColumns}
                index={row.index}
                item={row.item}
              />
            ) : (
              <BlankSalesPrintItemRow key={`blank-${row.index}`} columns={itemColumns} />
            ),
          )}
          <tr>
            <td className={`${totalItemCell} text-left`}>E&amp;OE</td>
            <td
              colSpan={Math.max(1, itemColumns.length - 7)}
              className={`${totalItemCell} text-right font-bold`}
            >
              Total&nbsp;&nbsp;
            </td>
            <td className={totalItemCell}>{sumQty(record.items)}</td>
            <td className={totalItemCell} />
            <td className={`${totalItemCell} text-right`}>{money(totals.taxableAmount)}</td>
            <td colSpan={2} className={`${totalItemCell} text-right`}>
              {money(totals.gstTotal)}
            </td>
            <td className={`${totalItemCell} border-r-0 text-right`}>{money(totals.grandTotal)}</td>
          </tr>
          <tr>
            <td
              rowSpan={2}
              colSpan={summaryLeftColSpan}
              className={`${baseCell} p-[3px] text-[8px] leading-tight`}
            >
              {showFooterDetails && company?.gstinUin
                ? "We hereby certify that our registration under the GST Act 2017 is in force on the date on which sale of goods specified in this invoice is made by us and the sale is effected in the regular course of business."
                : ""}
            </td>
            <SummaryLabel colSpan={summaryLabelColSpan}>Taxable Value</SummaryLabel>
            <SummaryValue colSpan={summaryValueColSpan}>{money(totals.taxableAmount)}</SummaryValue>
          </tr>
          <tr>
            <SummaryLabel colSpan={summaryLabelColSpan}>
              {isCgstSgst ? "Total CGST" : ""}
            </SummaryLabel>
            <SummaryValue colSpan={summaryValueColSpan}>
              {isCgstSgst ? money(totals.gstTotal / 2) : ""}
            </SummaryValue>
          </tr>
          <tr>
            <td
              colSpan={summaryLeftColSpan}
              className={`${baseCell} p-[3px] text-[8px] font-bold leading-tight`}
            >
              {showFooterDetails
                ? termsLines.map((line) => <div key={line}>{line}</div>)
                : null}
            </td>
            <SummaryLabel colSpan={summaryLabelColSpan}>
              {isCgstSgst ? "Total SGST" : `IGST @ ${gstPercent}%`}
            </SummaryLabel>
            <SummaryValue colSpan={summaryValueColSpan}>
              {money(isCgstSgst ? totals.gstTotal / 2 : totals.gstTotal)}
            </SummaryValue>
          </tr>
          <tr>
            <td colSpan={summaryLeftColSpan} className={baseCell} />
            <SummaryLabel colSpan={summaryLabelColSpan}>Total GST</SummaryLabel>
            <SummaryValue colSpan={summaryValueColSpan}>{money(totals.gstTotal)}</SummaryValue>
          </tr>
          {showFooterDetails ? (
            <>
              <tr>
                <td
                  rowSpan={2}
                  colSpan={summaryLeftColSpan}
                  className={`${baseCell} p-[3px] text-[9px] font-bold leading-tight`}
                >
                  <BankDetailsBlock
                    bank={companyBank}
                    showAccountNumber={showBankAccountNumber}
                    showQrAccountDetails={showQrAccountDetails}
                  />
                </td>
                <SummaryLabel colSpan={summaryLabelColSpan}>&nbsp;</SummaryLabel>
                <SummaryValue colSpan={summaryValueColSpan}>&nbsp;</SummaryValue>
              </tr>
              <tr>
                <SummaryLabel colSpan={summaryLabelColSpan}>Round Off</SummaryLabel>
                <SummaryValue colSpan={summaryValueColSpan}>
                  {money(Number(record.roundOff ?? 0))}
                </SummaryValue>
              </tr>
            </>
          ) : (
            <tr>
              <td colSpan={summaryLeftColSpan} className={baseCell} />
              <SummaryLabel colSpan={summaryLabelColSpan}>Round Off</SummaryLabel>
              <SummaryValue colSpan={summaryValueColSpan}>
                {money(Number(record.roundOff ?? 0))}
              </SummaryValue>
            </tr>
          )}
          <tr>
            <td
              colSpan={summaryLeftColSpan}
              className={`${baseCell} border-y border-gray-400 p-[3px] align-middle`}
            >
              <div className="text-[8px]">Amount (in words)</div>
              <b className={times}>{amountInWords(totals.grandTotal)} Only</b>
            </td>
            <SummaryLabel colSpan={summaryLabelColSpan}>
              <b>GRAND TOTAL</b>
            </SummaryLabel>
            <SummaryValue colSpan={summaryValueColSpan}>
              <b>{money(totals.grandTotal)}</b>
            </SummaryValue>
          </tr>
          <tr>
            <td colSpan={signatureLeftColSpan} className={`${baseCell} h-[34px] p-[3px]`}>
              Receiver Sign
            </td>
            <td
              colSpan={signatureRightColSpan}
              className={`${baseCell} h-[34px] border-r-0 p-[3px] text-left`}
            >
              For <b className={times}>{companyName}</b>
            </td>
          </tr>
          <tr>
            <td colSpan={signatureLeftColSpan} className={baseCell} />
            <td colSpan={signatureRightColSpan} className={`${baseCell} border-r-0 text-left`}>
              Authorised Signatory
            </td>
          </tr>
        </tbody>
      </table>
    </MainPrintTemplate>
  );
}

function SalesPrintItemRow({
  columns,
  index,
  item,
}: {
  readonly columns: readonly SalesPrintColumn[];
  readonly index: number;
  readonly item: SalesItemInput;
}) {
  const taxable = item.quantity * item.rate;
  const gst = (taxable * item.taxRate) / 100;
  return (
    <tr>
      {columns.map((column, columnIndex) => (
        <td
          key={column.id}
          className={`${lineItemCell} pt-[5px] ${column.align === "right" ? "text-right" : column.align === "left" ? "text-left" : ""}${columnIndex === columns.length - 1 ? " border-r-0" : ""}`}
        >
          {renderPrintCell(column.id, index, item, taxable, gst)}
        </td>
      ))}
    </tr>
  );
}

function BlankSalesPrintItemRow({ columns }: { readonly columns: readonly SalesPrintColumn[] }) {
  return (
    <tr aria-hidden="true">
      {columns.map((column, columnIndex) => (
        <td
          key={column.id}
          className={`${lineItemCell}${columnIndex === columns.length - 1 ? " border-r-0" : ""}`}
        >
          &nbsp;
        </td>
      ))}
    </tr>
  );
}

function renderPrintCell(
  columnId: SalesPrintColumnId,
  index: number,
  item: SalesItemInput,
  taxable: number,
  gst: number,
) {
  const valueByColumn: Record<SalesPrintColumnId, ReactNode> = {
    areaSq: item.areaSq || "",
    colour: item.colour ?? "",
    dcNo: item.dcNo ?? "",
    description: item.description ?? "",
    gst: money(gst),
    hsnCode: item.hsnCodeId ?? "",
    particulars: printableText(item.productName),
    poNo: item.poNo ?? "",
    price: money(item.rate),
    quantity: item.quantity,
    serialNo: index + 1,
    size: item.size ?? "",
    subTotal: money(taxable + gst),
    taxPercent: item.taxRate,
    taxableAmount: money(taxable),
  };

  if (columnId === "particulars" || columnId === "description") {
    return (
      <div className="overflow-hidden whitespace-pre-line [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:3]">
        {valueByColumn[columnId]}
      </div>
    );
  }

  return valueByColumn[columnId];
}

function SummaryLabel({
  children,
  colSpan,
}: {
  readonly children: ReactNode;
  readonly colSpan: number;
}) {
  return (
    <td
      className={`${baseCell} border-b border-l border-gray-400 p-[3px] text-left text-[10px] align-middle`}
      colSpan={colSpan}
    >
      {children}
    </td>
  );
}

function SummaryValue({
  children,
  colSpan,
}: {
  readonly children: ReactNode;
  readonly colSpan: number;
}) {
  return (
    <td
      className={`${baseCell} border-b border-r-0 border-gray-400 p-[3px] text-right text-[9px] align-middle`}
      colSpan={colSpan}
    >
      {children}
    </td>
  );
}

function PartyAddressBlock({
  address,
  label,
  partyName,
}: {
  readonly address: string | null;
  readonly label: string;
  readonly partyName: string;
}) {
  const addressLines = normalizedPartyAddress(address);
  const displayPartyName = printableText(partyName);

  return (
    <div className="leading-[1.15]">
      <div>{label}</div>
      <div className="text-[11px] font-bold uppercase tracking-[0.08em]">
        {displayPartyName ? `M/s. ${displayPartyName}` : ""}
      </div>
      {addressLines.map((line) => (
        <div key={`${label}-${line}`} className={times}>
          {line}
        </div>
      ))}
      <div className="grid grid-cols-[74px_8px_1fr]">
        <span>GSTIN/UIN</span>
        <span>:</span>
        <span />
      </div>
      <div className="grid grid-cols-[74px_8px_1fr]">
        <span>State Name</span>
        <span>:</span>
        <span />
      </div>
    </div>
  );
}

function BillDetailsBlock({
  labelWidthClassName = "grid-cols-[76px_1fr]",
  lines,
}: {
  readonly labelWidthClassName?: string;
  readonly lines: readonly SalesPrintDetailLine[];
}) {
  return (
    <div className="space-y-[1px] leading-[1.35]">
      {lines.map((line) => (
        <BillDetailsLine key={line.label} label={line.label} labelWidthClassName={labelWidthClassName}>
          <BillValue strong={line.strong}>{line.value}</BillValue>
        </BillDetailsLine>
      ))}
    </div>
  );
}

function BillDetailsLine({
  children,
  label,
  labelWidthClassName,
}: {
  readonly children: ReactNode;
  readonly label: string;
  readonly labelWidthClassName: string;
}) {
  return (
    <div className={`grid ${labelWidthClassName} gap-[10px]`}>
      <span className="font-bold">{label}</span>
      <span className="min-w-0">{children}</span>
    </div>
  );
}

function BillValue({
  children,
  strong = false,
}: {
  readonly children: ReactNode;
  readonly strong?: boolean;
}) {
  return (
    <span
      className={`inline-block origin-left scale-x-[1.08] font-mono ${
        strong ? "text-[12px] font-bold" : "text-[10.5px]"
      }`}
    >
      {children}
    </span>
  );
}

function EInvoiceQrSection({ record }: { readonly record: SalesRecord }) {
  return (
    <div className="w-full space-y-[1px] break-words text-[9.5px] font-semibold leading-[1.25] [overflow-wrap:anywhere]">
      <EInvoiceDetailsLine label="IRN :">{record.eInvoiceIrn ?? ""}</EInvoiceDetailsLine>
      <EInvoiceDetailsPair
        leftLabel="Ack No. :"
        leftValue={record.eInvoiceAckNo ?? ""}
        rightLabel="Ack Date :"
        rightValue={record.eInvoiceAckDate ? formatDate(record.eInvoiceAckDate) : ""}
      />
      <EInvoiceDetailsPair
        leftLabel="E-Way Bill No. :"
        leftValue={record.ewayBillNo ?? ""}
        rightLabel="Date :"
        rightValue={record.ewayBillDate ? formatDate(record.ewayBillDate) : ""}
      />
    </div>
  );
}

function EInvoiceDetailsLine({
  children,
  label,
}: {
  readonly children: ReactNode;
  readonly label: string;
}) {
  return (
    <div className="grid grid-cols-[58px_1fr] gap-[8px]">
      <span className="font-bold">{label}</span>
      <span className="min-w-0">{children}</span>
    </div>
  );
}

function EInvoiceDetailsPair({
  leftLabel,
  leftValue,
  rightLabel,
  rightValue,
}: {
  readonly leftLabel: string;
  readonly leftValue: ReactNode;
  readonly rightLabel: string;
  readonly rightValue: ReactNode;
}) {
  return (
    <div className="grid grid-cols-2 gap-[12px]">
      <EInvoiceInlineDetail label={leftLabel}>{leftValue}</EInvoiceInlineDetail>
      <EInvoiceInlineDetail label={rightLabel}>{rightValue}</EInvoiceInlineDetail>
    </div>
  );
}

function EInvoiceInlineDetail({
  children,
  label,
}: {
  readonly children: ReactNode;
  readonly label: string;
}) {
  return (
    <span>
      <b>{label}</b> {children}
    </span>
  );
}

function CompanyLogo({
  company,
  companyName,
}: {
  readonly company: CompanyRecord | null;
  readonly companyName: string;
}) {
  const logoUrl = company?.logos.find((logo) => logo.isActive)?.logoUrl.trim() ?? "";
  if (!logoUrl) return null;

  return (
    <img src={logoUrl} alt={companyName || "cxnext"} className="mx-auto max-h-[105px] max-w-[120px] object-contain" />
  );
}

function EInvoiceQrData({
  irn,
  value,
}: {
  readonly irn: string | null;
  readonly value: string | null;
}) {
  if (!printableText(irn)) return null;
  const qrData = printableText(value);
  if (!qrData) return null;

  return (
    <div className="size-full overflow-hidden border border-gray-700 bg-white p-1 text-[6px] leading-[1.05] [overflow-wrap:anywhere]">
      {qrData}
    </div>
  );
}

function BankDetailsBlock({
  bank,
  showAccountNumber,
  showQrAccountDetails,
}: {
  readonly bank: CompanyRecord["bankAccounts"][number] | null;
  readonly showAccountNumber: boolean;
  readonly showQrAccountDetails: boolean;
}) {
  const rows = [
    showAccountNumber ? (["ACCOUNT NO", bank?.accountNumber] as const) : null,
    ["IFSC CODE", bank?.ifsc],
    ["BANK NAME", bank?.bankName],
    ["BRANCH", bank?.branch],
  ].filter(Boolean) as readonly (readonly [string, string | null | undefined])[];
  const qrImageUrl = showQrAccountDetails ? printableText(bank?.qrImageUrl) : "";

  return (
    <div className={qrImageUrl ? "grid grid-cols-[1fr_58px] gap-2" : ""}>
      <div>
        {rows.map(([label, value]) => (
          <div key={label} className="grid grid-cols-[94px_8px_1fr]">
            <span>{label}</span>
            <span>:</span>
            <span>{printableText(value)}</span>
          </div>
        ))}
      </div>
      {qrImageUrl ? (
        <img
          src={qrImageUrl}
          alt="Account QR"
          className="size-[56px] border border-gray-500 bg-white object-contain p-[2px]"
        />
      ) : null}
    </div>
  );
}

type SalesPrintColumnId =
  | "areaSq"
  | "colour"
  | "dcNo"
  | "description"
  | "gst"
  | "hsnCode"
  | "particulars"
  | "poNo"
  | "price"
  | "quantity"
  | "serialNo"
  | "size"
  | "subTotal"
  | "taxPercent"
  | "taxableAmount";

type SalesPrintColumn = {
  readonly align?: "center" | "left" | "right";
  readonly id: SalesPrintColumnId;
  readonly label: string;
  readonly widthClass: string;
};

function getPrintItemColumns(
  industryKind: SalesIndustryKind,
  salesLayout: SalesBillingLayout,
): readonly SalesPrintColumn[] {
  if (industryKind === "garment") {
    return [
      column("serialNo", "S.No", "w-[4%]"),
      column("hsnCode", "HSN Code", "w-[7%]"),
      ...(salesLayout.usePo ? [column("poNo", "PO.No", "w-[6%]")] : []),
      ...(salesLayout.useDc ? [column("dcNo", "DC.No", "w-[6%]")] : []),
      column("particulars", "Particulars", "w-auto", "left"),
      column("description", "Description", "w-[13%]", "left"),
      ...(salesLayout.useSize ? [column("size", "Size", "w-[5%]")] : []),
      ...(salesLayout.useColour ? [column("colour", "Colour", "w-[6%]")] : []),
      ...amountColumns,
    ];
  }

  if (industryKind === "upvc") {
    return [
      column("serialNo", "S.No", "w-[4%]"),
      ...(salesLayout.usePo ? [column("poNo", "PO.No", "w-[6%]")] : []),
      ...(salesLayout.useDc ? [column("dcNo", "DC.No", "w-[6%]")] : []),
      column("particulars", "Particulars", "w-auto", "left"),
      column("description", "Description", "w-[16%]", "left"),
      ...(salesLayout.useSize ? [column("size", "Size", "w-[6%]")] : []),
      ...(salesLayout.useColour ? [column("colour", "Colour", "w-[6%]")] : []),
      column("areaSq", "Area Sq", "w-[7%]", "right"),
      ...amountColumns,
    ];
  }

  return [
    column("serialNo", "S.No", "w-[4.33%]"),
    ...(salesLayout.usePo ? [column("poNo", "PO.No", "w-[6.33%]")] : []),
    ...(salesLayout.useDc ? [column("dcNo", "DC.No", "w-[7.33%]")] : []),
    column("particulars", "Particulars", "w-auto", "left"),
    column("hsnCode", "HSN Code", "w-[7.5%]"),
    ...(salesLayout.useSize ? [column("size", "Size", "w-[5%]")] : []),
    ...(salesLayout.useColour ? [column("colour", "Colour", "w-[6%]")] : []),
    ...amountColumns,
  ];
}

const amountColumns = [
  column("quantity", "Quantity", "w-[6.44%]"),
  column("price", "Price", "w-[8.44%]", "right"),
  column("taxableAmount", "Taxable Amount", "w-[8.33%]", "right"),
  column("taxPercent", "%", "w-[4.4%]"),
  column("gst", "GST", "w-[9.66%]", "right"),
  column("subTotal", "Sub Total", "w-[9.66%]", "right"),
] as const;

function column(
  id: SalesPrintColumnId,
  label: string,
  widthClass: string,
  align: SalesPrintColumn["align"] = "center",
): SalesPrintColumn {
  return { align, id, label, widthClass };
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
  return [
    phone ? `Mobile: ${phone}` : "",
    email ? `Email: ${email}` : "",
  ]
    .filter(Boolean)
    .join(" | ");
}

function primaryBankAccount(company: CompanyRecord) {
  return (
    company.bankAccounts.find((item) => item.isPrimary && item.isActive) ??
    company.bankAccounts.find((item) => item.isActive) ??
    null
  );
}

const defaultSalesPrintTerms = [
  "* Goods once sold cannot be returned back or exchanged",
  "* Seller cannot be responsible for any damage/mistakes.",
] as const;

function salesPrintTerms(value: string | null) {
  const lines = value
    ?.split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  return lines?.length ? lines : defaultSalesPrintTerms;
}

function normalizedPartyAddress(value: string | null) {
  return value
    ?.split(/\r?\n|,\s*/)
    .map((line) => line.trim())
    .filter(Boolean) ?? [];
}

function sumQty(items: readonly SalesItemInput[]) {
  return items.reduce((sum, item) => sum + item.quantity, 0);
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-GB").format(date).replaceAll("/", "-");
}

function money(value: number) {
  return Number(value || 0).toFixed(2);
}

function amountInWords(value: number) {
  const amount = Math.abs(Number(value || 0));
  const rupees = Math.floor(amount);
  const paise = Math.round((amount - rupees) * 100);
  const rupeeText = `${numberToIndianWords(rupees)} Rupees`;
  const paiseText = paise > 0 ? ` and ${numberToIndianWords(paise)} Paise` : "";
  return `${value < 0 ? "Minus " : ""}${rupeeText}${paiseText}`;
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

const tens = [
  "",
  "",
  "Twenty",
  "Thirty",
  "Forty",
  "Fifty",
  "Sixty",
  "Seventy",
  "Eighty",
  "Ninety",
] as const;

function printableText(value: string | null | undefined) {
  return value?.trim() ?? "";
}

function salesPrintCopyLabel(copy: SalesPrintCopy) {
  const labels: Record<SalesPrintCopy, string> = {
    duplicate: "Duplicate Copy",
    original: "Original Copy",
    triplicate: "Office Copy",
  };
  return labels[copy];
}
