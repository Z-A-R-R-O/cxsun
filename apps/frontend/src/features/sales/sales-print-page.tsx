import { useMemo, type ReactNode } from "react"
import type { CompanyRecord } from "src/features/company/company-client"
import { MainPrintTemplate } from "./main-print-template"
import { portalQrPath } from "./sales-print-qr"
import { getSalesPrintLinePlan } from "./sales-print-line-plan"
import type { SalesEntry, SalesEntryItem } from "./sales-client"

const tableClass = "w-full border-collapse border border-gray-400"
const baseCell = "border-r border-gray-400 align-top p-[3px]"
const itemCell = `${baseCell} h-[18px] border-b-4 border-double border-gray-400 text-center text-[9px] align-middle`
const lineItemCell = `${baseCell} h-[18px] text-center text-[9px] leading-[1.08]`
const totalItemCell = `${lineItemCell} border-y border-gray-400`
const times = "font-['Times_New_Roman']"

export type SalesPrintCopy = "duplicate" | "original" | "triplicate"

export function SalesInvoiceDocument({
  company,
  copy = "original",
  customTerms,
  documentTitle = "TAX INVOICE",
  record,
  showBankAccountNumber = true,
  showFooterDetails = true,
  showLogo = true,
  showQrAccountDetails = true,
}: {
  readonly company?: CompanyRecord | null
  readonly copy?: SalesPrintCopy
  readonly customTerms?: string | null
  readonly documentTitle?: string
  readonly record: SalesEntry
  readonly showBankAccountNumber?: boolean
  readonly showFooterDetails?: boolean
  readonly showLogo?: boolean
  readonly showQrAccountDetails?: boolean
}) {
  const totals = useMemo(() => calculatePrintTotals(record.items, Number(record.round_off ?? 0)), [record])
  const isCgstSgst = (record.place_of_supply ?? "cgst-sgst") !== "igst"
  const itemLinePlan = getSalesPrintLinePlan(record.items)
  const companyName = printableText(company?.legalName) || printableText(company?.name) || "CXSun Tenant Company"
  const companyAddressLines = company ? companyAddress(company) : []
  const companyContactLine = company ? companyContact(company) : ""
  const companyBank = company ? primaryBankAccount(company) : null
  const termsLines = salesPrintTerms(customTerms || record.terms)

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
            <td className={`${baseCell} h-[120px] w-[130px] border-r-0 text-center align-middle`}>
              {showLogo ? <CompanyLogo company={company ?? null} companyName={companyName} /> : null}
            </td>
            <td className={`${baseCell} border-r-0 text-center leading-[1.6]`}>
              <div className={`${times} text-[34px] font-bold leading-tight`}>{companyName}</div>
              {companyAddressLines.map((line) => <div key={line} className={times}>{line}</div>)}
              {companyContactLine ? <div className={times}>{companyContactLine}</div> : null}
              {company?.gstinUin ? <div className={times}>GSTIN: {company.gstinUin}</div> : null}
            </td>
            <td className={`${baseCell} w-[145px] border-r-0 align-middle`}>
              <div className="mx-auto flex size-[132px] items-center justify-center p-[2px]">
                <PrintQr value={record.uuid} />
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
                  <BillDetailsBlock lines={[
                    { label: "Invoice No:", value: record.invoice_no, strong: true },
                    { label: "Date:", value: formatDate(record.invoice_date), strong: true },
                    { label: "Reference:", value: record.reference_no ?? "" },
                  ]} />
                </div>
                <div className="pl-[10px]">
                  <BillDetailsBlock lines={[
                    { label: "Status:", value: record.status },
                    { label: "Payment:", value: record.payment_status },
                    { label: "Due date:", value: formatDate(record.due_date) },
                  ]} labelWidthClassName="grid-cols-[104px_1fr]" />
                </div>
              </div>
            </td>
          </tr>
          <tr>
            <td className={`${baseCell} h-[58px] w-1/2 border-y border-gray-400 px-2.5 py-1 leading-tight`}>
              <PartyAddressBlock address={record.billing_address} label="Buyer (Bill to)" partyName={record.customer_name} />
            </td>
            <td className={`${baseCell} h-[58px] w-1/2 border-y border-gray-400 border-r-0 px-2.5 py-1 leading-tight`}>
              <PartyAddressBlock address={record.shipping_address ?? record.billing_address} label="Buyer (Ship to)" partyName={record.customer_name} />
            </td>
          </tr>
        </tbody>
      </table>
      <table className={`${tableClass} border-t-0`} data-print-template={itemLinePlan.requiresTwoPageTemplate ? "two-page-required" : "single-page"}>
        <thead>
          <tr className="bg-gray-50">
            {printItemColumns(isCgstSgst).map((header) => (
              <th key={header.label} className={`${itemCell} ${header.widthClass}`}>{header.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {itemLinePlan.rows.map((row) => row.kind === "item"
            ? <SalesPrintItemRow key={`item-${row.index}`} columns={printItemColumns(isCgstSgst)} index={row.index} item={row.item} isCgstSgst={isCgstSgst} />
            : <BlankSalesPrintItemRow key={`blank-${row.index}`} columns={printItemColumns(isCgstSgst)} />)}
          <tr>
            <td className={`${totalItemCell} text-left`}>E&amp;OE</td>
            <td className={`${totalItemCell} text-right font-bold`} colSpan={2}>Total&nbsp;&nbsp;</td>
            <td className={totalItemCell}>{sumQty(record.items)}</td>
            <td className={`${totalItemCell} text-right`}>{money(totals.taxableAmount)}</td>
            {isCgstSgst ? (
              <>
                <td className={`${totalItemCell} text-right`}>{money(totals.gstTotal / 2)}</td>
                <td className={`${totalItemCell} text-right`}>{money(totals.gstTotal / 2)}</td>
              </>
            ) : <td className={`${totalItemCell} text-right`}>{money(totals.gstTotal)}</td>}
            <td className={`${totalItemCell} border-r-0 text-right`}>{money(totals.grandTotal)}</td>
          </tr>
          <tr>
            <td className={`${baseCell} h-[82px] border-r-0 p-2 leading-tight`} colSpan={printItemColumns(isCgstSgst).length}>
              <div className="grid grid-cols-[1fr_185px] gap-3">
                <div>
                  <div className="font-bold">Amount in words</div>
                  <div>{amountInWords(totals.grandTotal)}</div>
                  {termsLines.length ? <div className="mt-2 font-bold">Terms &amp; Conditions</div> : null}
                  {termsLines.map((line) => <div key={line}>{line}</div>)}
                </div>
                <div className="border-l border-gray-400 pl-2">
                  <SummaryLine label="Taxable" value={money(totals.taxableAmount)} />
                  <SummaryLine label="GST" value={money(totals.gstTotal)} />
                  <SummaryLine label="Round off" value={money(record.round_off)} />
                  <SummaryLine label="Grand total" value={money(totals.grandTotal)} strong />
                </div>
              </div>
            </td>
          </tr>
          <tr>
            <td className={`${baseCell} h-[82px] p-2 leading-tight`} colSpan={Math.max(1, Math.floor(printItemColumns(isCgstSgst).length / 2))}>
              {showFooterDetails && companyBank ? (
                <div>
                  <div className="font-bold">Bank Details</div>
                  <div>{companyBank.bankName}</div>
                  {showBankAccountNumber ? <div>A/c: {companyBank.accountNumber}</div> : null}
                  <div>IFSC: {companyBank.ifsc}</div>
                  {showQrAccountDetails ? <div>{companyBank.branch}</div> : null}
                </div>
              ) : null}
            </td>
            <td className={`${baseCell} border-r-0 p-2 text-right align-bottom`} colSpan={Math.max(1, printItemColumns(isCgstSgst).length - Math.floor(printItemColumns(isCgstSgst).length / 2))}>
              <div className="mb-10 font-bold">For {companyName}</div>
              <div>Authorised Signatory</div>
            </td>
          </tr>
        </tbody>
      </table>
    </MainPrintTemplate>
  )
}

function printItemColumns(isCgstSgst: boolean) {
  return [
    { label: "S.No", widthClass: "w-[28px]" },
    { label: "Product / Description", widthClass: "w-[240px]" },
    { label: "HSN", widthClass: "w-[58px]" },
    { label: "Qty", widthClass: "w-[50px]" },
    { label: "Taxable", widthClass: "w-[72px]" },
    ...(isCgstSgst ? [{ label: "CGST", widthClass: "w-[62px]" }, { label: "SGST", widthClass: "w-[62px]" }] : [{ label: "IGST", widthClass: "w-[72px]" }]),
    { label: "Total", widthClass: "w-[82px]" },
  ]
}

function SalesPrintItemRow({ columns, index, isCgstSgst, item }: { columns: ReturnType<typeof printItemColumns>; index: number; isCgstSgst: boolean; item: SalesEntryItem }) {
  const taxable = itemTaxable(item)
  const gst = itemTax(item)
  const total = taxable + gst
  return (
    <tr>
      <td className={lineItemCell}>{index + 1}</td>
      <td className={`${lineItemCell} text-left`}>
        <div className="font-bold">{item.product_name}</div>
        {item.description ? <div>{item.description}</div> : null}
      </td>
      <td className={lineItemCell}>{item.hsn_code ?? ""}</td>
      <td className={lineItemCell}>{item.quantity} {item.unit ?? ""}</td>
      <td className={`${lineItemCell} text-right`}>{money(taxable)}</td>
      {isCgstSgst ? (
        <>
          <td className={`${lineItemCell} text-right`}>{money(gst / 2)}</td>
          <td className={`${lineItemCell} text-right`}>{money(gst / 2)}</td>
        </>
      ) : <td className={`${lineItemCell} text-right`}>{money(gst)}</td>}
      <td className={`${lineItemCell} border-r-0 text-right`}>{money(total)}</td>
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

function PartyAddressBlock({ address, label, partyName }: { address: string | null | undefined; label: string; partyName: string }) {
  return <div><div className="font-bold">{label}</div><div className="font-bold">{partyName}</div><div className="whitespace-pre-line">{address || "Address not set"}</div></div>
}

function CompanyLogo({ company, companyName }: { company: CompanyRecord | null; companyName: string }) {
  const logo = company?.logos.find((item) => item.isActive && item.logoUrl)?.logoUrl
  if (logo) return <img src={logo} alt={companyName} className="mx-auto max-h-[92px] max-w-[112px] object-contain" />
  return <div className="mx-auto flex size-[92px] items-center justify-center rounded-full border border-gray-400 text-center text-[10px] font-bold">{companyName.slice(0, 2).toUpperCase()}</div>
}

function PrintQr({ value }: { value: string }) {
  return <svg viewBox="0 0 49 49" role="img" aria-label={value} className="size-full"><path d={portalQrPath} fill="currentColor" /></svg>
}

function SummaryLine({ label, strong = false, value }: { label: string; strong?: boolean; value: string }) {
  return <div className={strong ? "grid grid-cols-[1fr_70px] gap-2 font-bold" : "grid grid-cols-[1fr_70px] gap-2"}><span>{label}</span><span className="text-right">{value}</span></div>
}

function calculatePrintTotals(items: readonly SalesEntryItem[], roundOff: number) {
  const taxableAmount = items.reduce((sum, item) => sum + itemTaxable(item), 0)
  const gstTotal = items.reduce((sum, item) => sum + itemTax(item), 0)
  return { taxableAmount, gstTotal, grandTotal: taxableAmount + gstTotal + Number(roundOff || 0) }
}

function itemTaxable(item: SalesEntryItem) {
  return Math.max(0, Number(item.quantity || 0) * Number(item.rate || 0) - Number(item.discount_amount || 0))
}

function itemTax(item: SalesEntryItem) {
  return itemTaxable(item) * Number(item.tax_rate || 0) / 100
}

function sumQty(items: readonly SalesEntryItem[]) {
  return items.reduce((sum, item) => sum + Number(item.quantity || 0), 0).toLocaleString("en-IN")
}

function companyAddress(company: CompanyRecord) {
  const address = company.addresses.find((item) => item.isDefault) ?? company.addresses[0]
  if (!address) return []
  return [[address.addressLine1, address.addressLine2].filter(Boolean).join(", "), [address.cityId, address.districtId, address.stateId, address.pincodeId].filter(Boolean).join(", ")].filter(Boolean)
}

function companyContact(company: CompanyRecord) {
  return [company.primaryPhone, company.primaryEmail, company.website].filter(Boolean).join(" | ")
}

function primaryBankAccount(company: CompanyRecord) {
  return company.bankAccounts.find((item) => item.isPrimary) ?? company.bankAccounts[0] ?? null
}

function salesPrintTerms(value?: string | null) {
  return String(value ?? "").split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
}

function salesPrintCopyLabel(copy: SalesPrintCopy) {
  if (copy === "duplicate") return "Duplicate"
  if (copy === "triplicate") return "Office Copy"
  return "Original"
}

function printableText(value: unknown) {
  return typeof value === "string" ? value.trim() : ""
}

function formatDate(value?: string | null) {
  if (!value) return "-"
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value))
}

function money(value: number | null | undefined) {
  return Number(value ?? 0).toLocaleString("en-IN", { maximumFractionDigits: 2, minimumFractionDigits: 2 })
}

function amountInWords(value: number) {
  return `INR ${money(value)} only`
}
