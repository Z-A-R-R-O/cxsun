import { useMemo, type ReactNode } from "react"
import qrcode from "qrcode-generator"
import type { CompanyRecord } from "src/features/company/company-client"
import { LetterheadBuilder } from "src/features/company/letterhead-builder"
import type { LetterheadSettings } from "src/features/settings/software-settings"
import { MainPrintTemplate } from "./main-print-template"
import { getSalesPrintLinePlan } from "./sales-print-line-plan"
import type { SalesEntry, SalesEntryItem } from "./sales-client"

const tableClass = "w-full border-collapse border border-gray-400"
const baseCell = "border-r border-gray-400 align-top p-[3px]"
const itemCell = `${baseCell} h-[26px] border-b-4 border-double border-gray-400 p-0 text-center text-[9px] leading-none`
const lineItemCell = `${baseCell} h-[28px] text-center text-[9px] leading-[1.08]`
const totalItemCell = `${baseCell} h-[18px] border-y border-gray-400 text-center text-[9px] leading-none`
export type SalesPrintCopy = "duplicate" | "original" | "triplicate"
export interface SalesPrintAddressLabels {
  cities(value: unknown): string
  countries(value: unknown): string
  districts(value: unknown): string
  pincodes(value: unknown): string
  states(value: unknown): string
}
export interface SalesPrintPartyDetails {
  addressLine: string
  gstin: string
  locationLine: string
  stateCode: string
  stateName: string
}

export function SalesInvoiceDocument({
  addressLabels,
  billingParty,
  company,
  copy = "original",
  customTerms,
  documentTitle = "TAX INVOICE",
  letterheadSettings,
  record,
  showBankAccountNumber = true,
  showColour = false,
  showDc = true,
  showFooterDetails = true,
  showLogo = true,
  showPo = true,
  showQrAccountDetails = true,
  shippingParty,
  showSize = false,
}: {
  readonly addressLabels?: SalesPrintAddressLabels
  readonly billingParty?: SalesPrintPartyDetails | null
  readonly company?: CompanyRecord | null
  readonly copy?: SalesPrintCopy
  readonly customTerms?: string | null
  readonly documentTitle?: string
  readonly letterheadSettings?: Partial<LetterheadSettings>
  readonly record: SalesEntry
  readonly showBankAccountNumber?: boolean
  readonly showColour?: boolean
  readonly showDc?: boolean
  readonly showFooterDetails?: boolean
  readonly showLogo?: boolean
  readonly showPo?: boolean
  readonly showQrAccountDetails?: boolean
  readonly shippingParty?: SalesPrintPartyDetails | null
  readonly showSize?: boolean
}) {
  void showQrAccountDetails
  const isCgstSgst = (record.place_of_supply ?? "cgst-sgst") !== "igst"
  const totals = useMemo(() => calculatePrintTotals(record), [record])
  const itemColumns = printItemColumns(isCgstSgst, { showColour, showDc, showPo, showSize })
  const preQtyColumnCount = itemColumns.findIndex((column) => column.key === "quantity")
  const itemLinePlan = getSalesPrintLinePlan(record.items)
  const companyName = printableText(company?.legalName) || printableText(company?.name) || "CXSun Tenant Company"
  const companyBank = company ? primaryBankAccount(company) : null
  const termsLines = salesPrintTerms(customTerms || record.terms)
  const hasIrn = Boolean(salesDocumentValue(record, "irn"))
  const eInvoiceQrValue = useMemo(() => buildSalesEinvoiceQrPayload(record, company ?? null, totals), [company, record, totals])
  const hasEInvoiceQr = hasIrn && Boolean(eInvoiceQrValue)

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
            <td className={`${baseCell} ${hasEInvoiceQr ? "" : "border-r-0"} p-0 align-middle`} colSpan={hasEInvoiceQr ? 2 : 3}>
              <LetterheadBuilder addressLabels={addressLabels} company={company ?? null} settings={letterheadSettings} showLogo={showLogo} />
            </td>
            {hasEInvoiceQr ? (
              <td className={`${baseCell} w-[160px] border-r-0 align-middle`}>
                <div className="mx-auto flex size-[154px] items-center justify-center bg-white p-[2px]">
                  <EInvoiceQrData value={eInvoiceQrValue} />
                </div>
              </td>
            ) : null}
          </tr>
        </tbody>
      </table>
      <table className={tableClass}>
        <tbody>
          <tr>
            <td className={`${baseCell} border-t border-gray-400 p-[5px]`}>
              <BillDetailsBlock lines={[
                { label: "Invoice No:", value: record.invoice_no, strong: true },
                { label: "Date:", value: formatDate(record.invoice_date), strong: true },
                { label: "Work Order:", value: record.reference_no ?? "" },
              ]} />
            </td>
            <td className={`${baseCell} border-t border-gray-400 border-r-0 p-[5px]`}>
              <IrnDetailsBlock record={record} />
            </td>
          </tr>
          <tr>
            <td className={`${baseCell} h-[74px] w-1/2 border-y border-gray-400 px-2.5 pb-2 pt-1 leading-tight`}>
              <PartyAddressBlock
                address={record.billing_address}
                details={billingParty}
                gstin={record.customer_gstin}
                label="Buyer (Bill to)"
                partyName={record.customer_name}
                stateCode={record.customer_state_code}
                stateName={record.customer_state_name}
              />
            </td>
            <td className={`${baseCell} h-[74px] w-1/2 border-y border-gray-400 border-r-0 px-2.5 pb-2 pt-1 leading-tight`}>
              <PartyAddressBlock
                address={record.shipping_address ?? record.billing_address}
                details={shippingParty ?? billingParty}
                gstin={record.customer_gstin}
                label="Buyer (Ship to)"
                partyName={record.customer_name}
                stateCode={record.customer_state_code}
                stateName={record.customer_state_name}
              />
            </td>
          </tr>
        </tbody>
      </table>
      <table className={`${tableClass} border-t-0`} data-print-template={itemLinePlan.requiresTwoPageTemplate ? "two-page-required" : "single-page"}>
        <thead>
          <tr className="bg-gray-50">
            {itemColumns.map((header) => (
              <th key={header.label} className={`${itemCell} ${header.widthClass}`}>
                <span className="flex h-[26px] items-center justify-center">{header.label}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            {itemColumns.map((column, index) => (
              <td key={`item-spacer-${column.key}`} className={`${baseCell} h-[2px] p-0 text-[1px] leading-none ${index === itemColumns.length - 1 ? "border-r-0" : ""}`}>&nbsp;</td>
            ))}
          </tr>
          {itemLinePlan.rows.map((row) => row.kind === "item"
            ? <SalesPrintItemRow key={`item-${row.index}`} columns={itemColumns} index={row.index} isCgstSgst={isCgstSgst} item={row.item} />
            : <BlankSalesPrintItemRow key={`blank-${row.index}`} columns={itemColumns} />)}
          <tr>
            {itemColumns.map((column, index) => (
              <td key={`item-bottom-spacer-${column.key}`} className={`${baseCell} h-[2px] p-0 text-[1px] leading-none ${index === itemColumns.length - 1 ? "border-r-0" : ""}`}>&nbsp;</td>
            ))}
          </tr>
          <tr>
            {preQtyColumnCount > 1 ? (
              <>
                <td className={`${totalItemCell} text-left text-[8px]`}>E&amp;OE</td>
                <td className={`${totalItemCell} font-bold`} colSpan={preQtyColumnCount - 1}>Total</td>
              </>
            ) : (
              <td className={`${totalItemCell} font-bold`}>Total</td>
            )}
            <td className={totalItemCell}>{sumQty(record.items)}</td>
            <td className={`${totalItemCell} text-right`}>{money(totals.taxableAmount)}</td>
            <td className={totalItemCell}>&nbsp;</td>
            {isCgstSgst ? (
              <>
                <td className={`${totalItemCell} text-right`}>{money(splitTax(totals.gstTotal).first)}</td>
                <td className={`${totalItemCell} text-right`}>{money(splitTax(totals.gstTotal).second)}</td>
              </>
            ) : <td className={`${totalItemCell} text-right`}>{money(totals.gstTotal)}</td>}
            <td className={`${totalItemCell} border-r-0 text-right`}>{money(totals.grandTotal)}</td>
          </tr>
          <tr>
            <td className={`${baseCell} border-r-0 p-0 leading-tight`} colSpan={itemColumns.length}>
              <div className="grid grid-cols-[1fr_255px]">
                <div className="min-h-[96px] p-1.5 text-[8px] leading-[1.15]">
                  <div>We hereby certify that our registration under the GST Act 2017 is in force on the date on which sale of goods specified in this invoice is made by us and the sale is effected in the regular course of business.</div>
                  <div className="mt-2 space-y-0.5 font-bold">
                    {termsLines.map((line) => <div key={line}>* {line}</div>)}
                  </div>
                  {showFooterDetails ? <AccountDetailsBlock bank={companyBank} showAccountNumber={showBankAccountNumber} /> : null}
                </div>
                <div className="border-l border-gray-400">
                  <PrintTotalTable
                    isCgstSgst={isCgstSgst}
                    roundOff={Number(record.round_off ?? 0)}
                    totals={totals}
                  />
                </div>
              </div>
              <div className="border-t border-gray-400 px-2 py-0.5 text-[8px] leading-tight">
                <div>Amount (in words)</div>
                <div className="font-bold">{amountInWords(totals.grandTotal)}</div>
              </div>
              <div className="grid h-[92px] grid-cols-[1fr_1fr] border-t border-gray-400 text-[9px]">
                <div className="p-2">Receiver Sign</div>
                <div className="border-l border-gray-400 p-2">
                  <div className="font-bold">For {companyName}</div>
                  <div className="mt-14 font-bold">Authorised Signatory</div>
                </div>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
      <div className="px-2 py-0.5 text-left text-[8px] font-bold">Subject to Tiruppur Jurisdiction</div>
    </MainPrintTemplate>
  )
}

type PrintItemColumnKey = "cgst" | "colour" | "gstPercent" | "hsn" | "igst" | "poDc" | "product" | "quantity" | "serial" | "sgst" | "size" | "taxable" | "total"

function printItemColumns(isCgstSgst: boolean, settings: { showColour: boolean; showDc: boolean; showPo: boolean; showSize: boolean }) {
  const showPoDc = settings.showPo || settings.showDc
  return [
    { key: "serial", label: "S.no", widthClass: "w-[28px] text-[8px]" },
    { key: "product", label: "Particulars", widthClass: settings.showColour || settings.showSize || showPoDc ? "w-[178px]" : "w-[258px]" },
    { key: "hsn", label: "HSN", widthClass: "w-[48px]" },
    ...(settings.showColour ? [{ key: "colour" as const, label: "Colour", widthClass: "w-[54px]" }] : []),
    ...(settings.showSize ? [{ key: "size" as const, label: "Size", widthClass: "w-[42px]" }] : []),
    ...(showPoDc ? [{ key: "poDc" as const, label: [settings.showPo ? "PO" : null, settings.showDc ? "DC" : null].filter(Boolean).join(" / "), widthClass: "w-[58px]" }] : []),
    { key: "quantity", label: "Qty", widthClass: "w-[42px]" },
    { key: "taxable", label: "Taxable", widthClass: "w-[70px]" },
    { key: "gstPercent", label: "GST %", widthClass: "w-[42px]" },
    ...(isCgstSgst ? [{ key: "cgst" as const, label: "CGST", widthClass: "w-[58px]" }, { key: "sgst" as const, label: "SGST", widthClass: "w-[58px]" }] : [{ key: "igst" as const, label: "IGST", widthClass: "w-[66px]" }]),
    { key: "total", label: "Total", widthClass: "w-[78px]" },
  ] satisfies Array<{ key: PrintItemColumnKey; label: string; widthClass: string }>
}

function SalesPrintItemRow({ columns, index, isCgstSgst, item }: { columns: ReturnType<typeof printItemColumns>; index: number; isCgstSgst: boolean; item: SalesEntryItem }) {
  const taxable = itemTaxable(item)
  const gst = itemTax(item)
  const split = splitTax(gst)
  const total = item.line_total ?? roundMoney(taxable + gst)
  const cells: Record<PrintItemColumnKey, ReactNode> = {
    cgst: money(split.first),
    colour: item.colour ?? "",
    gstPercent: `${Number(item.tax_rate || 0)}%`,
    hsn: item.hsn_code ?? "",
    igst: money(gst),
    poDc: [item.po_no, item.dc_no].filter(Boolean).join(" / "),
    product: (
      <div className="overflow-hidden leading-[1.18] [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]">
        <span className="font-bold">{item.product_name}</span>
        {item.description ? <><br /><span className="inline-block pt-px">{item.description}</span></> : null}
      </div>
    ),
    quantity: item.quantity,
    serial: index + 1,
    sgst: money(isCgstSgst ? split.second : 0),
    size: item.size ?? "",
    taxable: money(taxable),
    total: money(total),
  }
  const rightAlignedKeys = new Set<PrintItemColumnKey>(["cgst", "igst", "sgst", "taxable", "total"])
  return (
    <tr>
      {columns.map((column, columnIndex) => <td key={column.key} className={`${lineItemCell} ${column.key === "product" ? "break-words text-left" : ""} ${rightAlignedKeys.has(column.key) ? "text-right" : ""} ${columnIndex === columns.length - 1 ? "border-r-0" : ""}`}>{cells[column.key]}</td>)}
      {columns.length === 0 ? null : null}
    </tr>
  )
}

function BlankSalesPrintItemRow({ columns }: { columns: ReturnType<typeof printItemColumns> }) {
  return <tr>{columns.map((column, index) => <td key={`${column.label}-${index}`} className={index === columns.length - 1 ? `${lineItemCell} border-r-0` : lineItemCell}>&nbsp;</td>)}</tr>
}

function BillDetailsBlock({ labelWidthClassName = "grid-cols-[82px_1fr]", lines }: { labelWidthClassName?: string; lines: ReadonlyArray<{ label: string; strong?: boolean; value: ReactNode }> }) {
  return <div className="space-y-0.5">{lines.map((line) => <div key={line.label} className={`grid ${labelWidthClassName} gap-1`}><span>{line.label}</span><span className={line.strong ? "font-bold" : ""}>{line.value || "-"}</span></div>)}</div>
}

function PartyAddressBlock({
  address,
  details,
  gstin,
  label,
  partyName,
  stateCode,
  stateName,
}: {
  address: string | null | undefined
  details?: SalesPrintPartyDetails | null
  gstin?: string | null
  label: string
  partyName: string
  stateCode?: string | null
  stateName?: string | null
}) {
  const fallback = parsePartyAddress(address)
  const gstinText = printableText(details?.gstin) || printableText(gstin) || fallback.gstin
  const stateNameText = printableText(details?.stateName) || printableText(stateName) || fallback.stateName
  const stateCodeText = printableText(details?.stateCode) || printableText(stateCode) || fallback.stateCode
  const addressLineText = printableText(details?.addressLine) || fallback.addressLine
  const locationLineText = printableText(details?.locationLine) || fallback.locationLine
  return (
    <div className="leading-tight">
      <div>{label}</div>
      <div className="font-bold">M/s. {partyName}</div>
      <div>{addressLineText || "Address not set"}</div>
      {locationLineText ? <div>{locationLineText}</div> : null}
      <div className="grid grid-cols-[62px_1fr] gap-1"><span>GSTIN/UIN</span><span>: {gstinText}</span></div>
      <div className="grid grid-cols-[62px_1fr_70px_1fr] gap-1">
        <span>State Name</span>
        <span>: {stateNameText}</span>
        <span>State Code</span>
        <span>: {stateCodeText}</span>
      </div>
    </div>
  )
}

function EInvoiceQrData({ value }: { value: string }) {
  const svgMarkup = createQrSvg(value)
  if (!svgMarkup) return null
  return <div className="size-full [&_svg]:block [&_svg]:size-full" dangerouslySetInnerHTML={{ __html: svgMarkup }} />
}

function IrnDetailsBlock({ record }: { record: SalesEntry }) {
  return (
    <div className="grid gap-1">
      <div className="grid grid-cols-[34px_1fr] gap-1">
        <span className="font-bold">IRN :</span>
        <span className="break-all font-bold leading-tight">{salesDocumentValue(record, "irn") || record.uuid}</span>
      </div>
      <div className="grid gap-y-0.5">
        <InlinePrintPairRow
          leftLabel="Ack No.:"
          leftValue={salesDocumentValue(record, "ack_no")}
          rightLabel="Ack Date:"
          rightValue={formatDate(salesDocumentValue(record, "ack_date"))}
        />
        <InlinePrintPairRow
          leftLabel="E-Way Bill No.:"
          leftValue={salesDocumentValue(record, "eway_bill_no")}
          rightLabel="Date:"
          rightValue={formatDate(salesDocumentValue(record, "eway_bill_date"))}
        />
      </div>
    </div>
  )
}

function InlinePrintPairRow({
  leftLabel,
  leftValue,
  rightLabel,
  rightValue,
}: {
  leftLabel: string
  leftValue: ReactNode
  rightLabel: string
  rightValue: ReactNode
}) {
  return (
    <div className="grid grid-cols-[auto_minmax(78px,1fr)_auto_auto] gap-x-2 whitespace-nowrap font-bold">
      <span>{leftLabel}</span>
      <span>{leftValue || "-"}</span>
      <span className="pl-2">{rightLabel}</span>
      <span>{rightValue || "-"}</span>
    </div>
  )
}

function PrintTotalTable({
  isCgstSgst,
  roundOff,
  totals,
}: {
  isCgstSgst: boolean
  roundOff: number
  totals: ReturnType<typeof calculatePrintTotals>
}) {
  const taxSplit = splitTax(totals.gstTotal)
  const rows = isCgstSgst
    ? [
        ["Taxable Value", money(totals.taxableAmount)],
        ["Total CGST", money(taxSplit.first)],
        ["Total SGST", money(taxSplit.second)],
        ["Total GST", money(totals.gstTotal)],
        ["Round Off", money(roundOff)],
        ["GRAND TOTAL", money(totals.grandTotal)],
      ]
    : [
        ["Taxable Value", money(totals.taxableAmount)],
        ["Total IGST", money(totals.gstTotal)],
        ["Total GST", money(totals.gstTotal)],
        ["Round Off", money(roundOff)],
        ["GRAND TOTAL", money(totals.grandTotal)],
      ]

  return (
    <table className="h-full w-full border-collapse text-[9px]">
      <tbody>
        {rows.map(([label, value], index) => (
          <tr key={`${label}-${index}`} className={label === "GRAND TOTAL" ? "font-bold" : ""}>
            <td className="h-[19px] border-b border-gray-400 px-1.5">{label}</td>
            <td className="h-[19px] border-b border-l border-gray-400 px-1.5 text-right">{value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function AccountDetailsBlock({ bank, showAccountNumber }: { bank: CompanyRecord["bankAccounts"][number] | null; showAccountNumber: boolean }) {
  if (!bank) return null
  return (
    <div className="mt-6 grid grid-cols-[105px_1fr] gap-x-4 gap-y-0.5 text-[9px] font-bold leading-[1.25]">
      {showAccountNumber ? <><span>ACCOUNT NO</span><span>: {bank.accountNumber}</span></> : null}
      <span>IFSC CODE</span><span>: {bank.ifsc}</span>
      <span>BANK NAME</span><span>: {bank.bankName}</span>
      {bank.branch ? <><span>BRANCH</span><span>: {bank.branch}</span></> : null}
    </div>
  )
}

function calculatePrintTotals(record: SalesEntry) {
  return {
    taxableAmount: roundMoney(record.taxable_total),
    gstTotal: roundMoney(record.tax_total),
    grandTotal: roundMoney(record.grand_total),
  }
}

function createQrSvg(value: string) {
  try {
    const qr = qrcode(0, "M")
    qr.addData(value)
    qr.make()
    return qr.createSvgTag({ cellSize: 2, margin: 1, scalable: true })
  } catch {
    try {
      const qr = qrcode(0, "L")
      qr.addData(value)
      qr.make()
      return qr.createSvgTag({ cellSize: 2, margin: 1, scalable: true })
    } catch {
      return ""
    }
  }
}

function buildSalesEinvoiceQrPayload(record: SalesEntry, company: CompanyRecord | null, totals: ReturnType<typeof calculatePrintTotals>) {
  const signedQr = printableText(record.signed_qr)
  if (signedQr && !/signed qr will be populated/i.test(signedQr)) return signedQr

  const irn = salesDocumentValue(record, "irn")
  if (!irn) return ""

  return JSON.stringify({
    BuyerGstin: printableText(record.customer_gstin),
    DocDt: formatGstPortalDate(record.invoice_date),
    DocNo: record.invoice_no,
    DocTyp: "INV",
    Irn: irn,
    IrnDt: formatGstPortalDateTime(record.ack_date || record.invoice_date),
    ItemCnt: record.items.length,
    MainHsnCode: record.items.find((item) => printableText(item.hsn_code))?.hsn_code ?? "",
    SellerGstin: printableText(company?.gstinUin),
    TotInvVal: Number(totals.grandTotal.toFixed(2)),
  })
}

function itemTaxable(item: SalesEntryItem) {
  return roundMoney(Math.max(0, Number(item.quantity || 0) * Number(item.rate || 0) - Number(item.discount_amount || 0)))
}

function itemTax(item: SalesEntryItem) {
  return roundMoney(item.tax_amount ?? itemTaxable(item) * Number(item.tax_rate || 0) / 100)
}

function splitTax(value: number) {
  const first = roundMoney(Number(value || 0) / 2)
  return { first, second: roundMoney(Number(value || 0) - first) }
}

function roundMoney(value: number) {
  return Math.round(Number(value || 0) * 100) / 100
}

function sumQty(items: readonly SalesEntryItem[]) {
  return items.reduce((sum, item) => sum + Number(item.quantity || 0), 0).toLocaleString("en-IN")
}

function primaryBankAccount(company: CompanyRecord) {
  return company.bankAccounts.find((item) => item.isPrimary) ?? company.bankAccounts[0] ?? null
}

function salesPrintTerms(value?: string | null) {
  const lines = String(value ?? "").split(/\r?\n/).map((line) => line.replace(/^\*\s*/, "").trim()).filter(Boolean)
  return lines.length ? lines : [
    "Goods once sold cannot be returned back or exchanged",
    "Seller cannot be responsible for any damage/mistakes.",
  ]
}

function salesPrintCopyLabel(copy: SalesPrintCopy) {
  if (copy === "duplicate") return "Duplicate"
  if (copy === "triplicate") return "Office Copy"
  return "Original"
}

function salesDocumentValue(record: SalesEntry, key: string) {
  const value = (record as unknown as Record<string, unknown>)[key]
  if (value instanceof Date) return value.toISOString().slice(0, 10)
  return typeof value === "string" ? value.trim() : value === null || value === undefined ? "" : String(value)
}

function parsePartyAddress(address: string | null | undefined) {
  const parts = String(address ?? "").split(",").map((part) => part.trim()).filter(Boolean)
  const pincode = parts.findLast((part) => /\b\d{6}\b/.test(part))?.match(/\b\d{6}\b/)?.[0] ?? ""
  const countryIndex = parts.findIndex((part) => part.toLowerCase() === "india")
  const stateName = countryIndex > 0 ? parts[countryIndex - 1] : parts.length >= 3 ? parts[parts.length - (pincode ? 3 : 2)] ?? "" : ""
  const addressLine = [parts[0], parts[1]].filter(Boolean).join(", ")
  const city = parts[2] ?? ""
  const district = parts[3] && parts[3] !== stateName ? parts[3] : ""
  const locationLine = [city, district].filter(Boolean).join(", ") + (pincode ? ` - ${pincode}` : "")

  return {
    addressLine,
    gstin: "",
    locationLine: locationLine.trim(),
    stateCode: "",
    stateName,
  }
}

function printableText(value: unknown) {
  return typeof value === "string" ? value.trim() : ""
}

function formatDate(value?: string | null) {
  if (!value) return "-"
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value))
}

function formatGstPortalDate(value?: string | null) {
  if (!value) return ""
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""
  return [
    String(date.getDate()).padStart(2, "0"),
    String(date.getMonth() + 1).padStart(2, "0"),
    date.getFullYear(),
  ].join("/")
}

function formatGstPortalDateTime(value?: string | null) {
  if (!value) return ""
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")} 00:00:00`
}

function money(value: number | null | undefined) {
  return Number(value ?? 0).toLocaleString("en-IN", { maximumFractionDigits: 2, minimumFractionDigits: 2 })
}

function amountInWords(value: number) {
  const roundedPaise = Math.round(Number(value || 0) * 100)
  const rupees = Math.floor(roundedPaise / 100)
  const paise = roundedPaise % 100
  const rupeesWords = integerToIndianWords(rupees)
  const paiseWords = paise ? ` and ${integerToIndianWords(paise)} Paise` : ""
  return `${rupeesWords} Rupees${paiseWords} Only`
}

function integerToIndianWords(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "Zero"

  const units = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"]
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"]
  const twoDigitWords = (number: number) => {
    if (number < 20) return units[number] ?? ""
    return [tens[Math.floor(number / 10)] ?? "", units[number % 10] ?? ""].filter(Boolean).join(" ")
  }
  const threeDigitWords = (number: number) => {
    const hundred = Math.floor(number / 100)
    const rest = number % 100
    return [hundred ? `${units[hundred]} Hundred` : "", rest ? twoDigitWords(rest) : ""].filter(Boolean).join(" ")
  }

  const parts: string[] = []
  const crore = Math.floor(value / 10000000)
  value %= 10000000
  const lakh = Math.floor(value / 100000)
  value %= 100000
  const thousand = Math.floor(value / 1000)
  value %= 1000

  if (crore) parts.push(`${threeDigitWords(crore)} Crore`)
  if (lakh) parts.push(`${threeDigitWords(lakh)} Lakh`)
  if (thousand) parts.push(`${threeDigitWords(thousand)} Thousand`)
  if (value) parts.push(threeDigitWords(value))
  return parts.join(" ")
}
