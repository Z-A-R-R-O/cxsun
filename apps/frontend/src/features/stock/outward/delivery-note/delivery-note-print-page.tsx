import { useMemo, type ReactNode } from "react"
import qrcode from "qrcode-generator"
import type { CompanyRecord } from "src/features/company/company-client"
import { MainPrintTemplate } from "./main-print-template"
import { getDeliveryNotePrintLinePlan } from "./delivery-note-print-line-plan"
import type { DeliveryNoteEntry, DeliveryNoteEntryItem } from "./delivery-note-client"

const tableClass = "w-full border-collapse border border-gray-400"
const baseCell = "border-r border-gray-400 align-top p-[3px]"
const itemCell = `${baseCell} h-[26px] border-b-4 border-double border-gray-400 p-0 text-center text-[9px] leading-none`
const lineItemCell = `${baseCell} h-[28px] text-center text-[9px] leading-[1.08]`
const totalItemCell = `${baseCell} h-[18px] border-y border-gray-400 text-center text-[9px] leading-none`
const times = "font-['Times_New_Roman']"

export type DeliveryNotePrintCopy = "duplicate" | "original" | "triplicate"
export interface DeliveryNotePrintAddressLabels {
  cities(value: unknown): string
  countries(value: unknown): string
  districts(value: unknown): string
  pincodes(value: unknown): string
  states(value: unknown): string
}
export interface DeliveryNotePrintPartyDetails {
  addressLine: string
  gstin: string
  locationLine: string
  stateCode: string
  stateName: string
}

export function DeliveryNoteEntryDocument({
  addressLabels,
  billingParty,
  company,
  copy = "original",
  customTerms,
  documentTitle = "DELIVERY NOTE",
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
  readonly addressLabels?: DeliveryNotePrintAddressLabels
  readonly billingParty?: DeliveryNotePrintPartyDetails | null
  readonly company?: CompanyRecord | null
  readonly copy?: DeliveryNotePrintCopy
  readonly customTerms?: string | null
  readonly documentTitle?: string
  readonly record: DeliveryNoteEntry
  readonly showBankAccountNumber?: boolean
  readonly showColour?: boolean
  readonly showDc?: boolean
  readonly showFooterDetails?: boolean
  readonly showLogo?: boolean
  readonly showPo?: boolean
  readonly showQrAccountDetails?: boolean
  readonly shippingParty?: DeliveryNotePrintPartyDetails | null
  readonly showSize?: boolean
}) {
  void showQrAccountDetails
  const itemColumns = printItemColumns({ showColour, showDc, showPo, showSize })
  const preQtyColumnCount = itemColumns.findIndex((column) => column.key === "quantity")
  const itemLinePlan = getDeliveryNotePrintLinePlan(record.items)
  const companyName = printableText(company?.legalName) || printableText(company?.name) || "CXSun Tenant Company"
  const companyHeaderLines = company ? companyHeaderDetails(company, addressLabels) : { address: [], contact: "", taxGstin: "", taxMsme: "" }
  const companyBank = company ? primaryBankAccount(company) : null
  const termsLines = DeliveryNotePrintTerms(customTerms || record.terms)
  const hasIrn = Boolean(DeliveryNoteDocumentValue(record, "irn"))
  const einvoiceQrValue = useMemo(() => buildDeliveryNoteEinvoiceQrPayload(record, company ?? null), [company, record])
  const hasEinvoiceQr = hasIrn && Boolean(einvoiceQrValue)

  return (
    <MainPrintTemplate>
      <div className="grid grid-cols-[1fr_auto_1fr] p-px text-[9px]">
        <span />
        <span className="text-[12px] font-bold">{documentTitle}</span>
        <span className="text-right">{DeliveryNotePrintCopyLabel(copy)}</span>
      </div>
      <table className={`${tableClass} border-b-0`}>
        <tbody>
          <tr>
            <td className={`${baseCell} h-[160px] w-[130px] border-r-0 text-center align-middle`}>
              {showLogo ? <CompanyLogo company={company ?? null} companyName={companyName} /> : null}
            </td>
            <td className={`${baseCell} h-[160px] ${hasEinvoiceQr ? "" : "border-r-0"} text-center align-middle`}>
              <div className="flex h-[150px] flex-col items-center justify-center">
                <div className={`${times} max-w-full whitespace-nowrap text-[clamp(25px,4.1vw,34px)] font-bold leading-tight`}>{companyName}</div>
                <div className={`${times} mx-auto mt-3 max-w-[580px] text-[12px] font-medium leading-[1.45] tracking-wide`}>
                  {companyHeaderLines.address.map((line) => <div key={line}>{line}</div>)}
                  {companyHeaderLines.contact ? <div>{companyHeaderLines.contact}</div> : null}
                  {companyHeaderLines.taxGstin || companyHeaderLines.taxMsme ? (
                    <div className="text-[11px] font-bold tracking-wide">
                      {companyHeaderLines.taxGstin ? <span>{companyHeaderLines.taxGstin}</span> : null}
                      {companyHeaderLines.taxMsme ? <span className="ml-2">{companyHeaderLines.taxMsme}</span> : null}
                    </div>
                  ) : null}
                </div>
              </div>
            </td>
            {hasEinvoiceQr ? (
              <td className={`${baseCell} w-[160px] border-r-0 align-middle`}>
                <div className="mx-auto flex size-[154px] items-center justify-center bg-white p-[2px]">
                  <EinvoiceQrData value={einvoiceQrValue} />
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
                { label: "Entry No:", value: record.entry_no, strong: true },
                { label: "Entry Date:", value: formatDate(record.entry_date), strong: true },
                { label: "Supplier Bill No:", value: record.supplier_bill_no ?? "" },
                { label: "Supplier Bill Date:", value: formatDate(record.supplier_bill_date), strong: true },
                { label: "Reference:", value: record.reference_no ?? "" },
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
                gstin={record.supplier_gstin}
                label="Supplier (Bill from)"
                partyName={record.supplier_name}
                stateCode={record.supplier_state_code}
                stateName={record.supplier_state_name}
              />
            </td>
            <td className={`${baseCell} h-[74px] w-1/2 border-y border-gray-400 border-r-0 px-2.5 pb-2 pt-1 leading-tight`}>
              <PartyAddressBlock
                address={record.shipping_address ?? record.billing_address}
                details={shippingParty ?? billingParty}
                gstin={record.supplier_gstin}
                label="Supplier (Receipt to)"
                partyName={record.supplier_name}
                stateCode={record.supplier_state_code}
                stateName={record.supplier_state_name}
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
            ? <DeliveryNotePrintItemRow key={`item-${row.index}`} columns={itemColumns} index={row.index} item={row.item} />
            : <BlankDeliveryNotePrintItemRow key={`blank-${row.index}`} columns={itemColumns} />)}
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
            <td className={`${totalItemCell} border-r-0`}>&nbsp;</td>
          </tr>
          <tr>
            <td className={`${baseCell} border-r-0 p-0 leading-tight`} colSpan={itemColumns.length}>
              <div className="min-h-[96px] p-1.5 text-[8px] leading-[1.15]">
                <div>This delivery note records material delivery only. Pricing is retained for reference and does not post finance.</div>
                <div className="mt-2 space-y-0.5 font-bold">
                  {termsLines.map((line) => <div key={line}>* {line}</div>)}
                </div>
                {showFooterDetails ? <AccountDetailsBlock bank={companyBank} showAccountNumber={showBankAccountNumber} /> : null}
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

type PrintItemColumnKey = "colour" | "hsn" | "poDc" | "product" | "quantity" | "rate" | "serial" | "size"

function printItemColumns(settings: { showColour: boolean; showDc: boolean; showPo: boolean; showSize: boolean }) {
  const showPoDc = settings.showPo || settings.showDc
  return [
    { key: "serial", label: "S.no", widthClass: "w-[28px] text-[8px]" },
    { key: "product", label: "Particulars", widthClass: settings.showColour || settings.showSize || showPoDc ? "w-[260px]" : "w-[380px]" },
    { key: "hsn", label: "HSN", widthClass: "w-[48px]" },
    ...(settings.showColour ? [{ key: "colour" as const, label: "Colour", widthClass: "w-[54px]" }] : []),
    ...(settings.showSize ? [{ key: "size" as const, label: "Size", widthClass: "w-[42px]" }] : []),
    ...(showPoDc ? [{ key: "poDc" as const, label: [settings.showPo ? "PO" : null, settings.showDc ? "DC" : null].filter(Boolean).join(" / "), widthClass: "w-[58px]" }] : []),
    { key: "quantity", label: "Qty", widthClass: "w-[42px]" },
    { key: "rate", label: "Price", widthClass: "w-[70px]" },
  ] satisfies Array<{ key: PrintItemColumnKey; label: string; widthClass: string }>
}

function DeliveryNotePrintItemRow({ columns, index, item }: { columns: ReturnType<typeof printItemColumns>; index: number; item: DeliveryNoteEntryItem }) {
  const cells: Record<PrintItemColumnKey, ReactNode> = {
    colour: item.colour ?? "",
    hsn: item.hsn_code ?? "",
    poDc: [item.po_no, item.dc_no].filter(Boolean).join(" / "),
    product: (
      <div className="overflow-hidden leading-[1.18] [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]">
        <span className="font-bold">{item.product_name}</span>
        {item.description ? <><br /><span className="inline-block pt-px">{item.description}</span></> : null}
      </div>
    ),
    quantity: item.quantity,
    rate: money(Number(item.rate || 0)),
    serial: index + 1,
    size: item.size ?? "",
  }
  const rightAlignedKeys = new Set<PrintItemColumnKey>(["rate"])
  return (
    <tr>
      {columns.map((column, columnIndex) => <td key={column.key} className={`${lineItemCell} ${column.key === "product" ? "break-words text-left" : ""} ${rightAlignedKeys.has(column.key) ? "text-right" : ""} ${columnIndex === columns.length - 1 ? "border-r-0" : ""}`}>{cells[column.key]}</td>)}
      {columns.length === 0 ? null : null}
    </tr>
  )
}

function BlankDeliveryNotePrintItemRow({ columns }: { columns: ReturnType<typeof printItemColumns> }) {
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
  details?: DeliveryNotePrintPartyDetails | null
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

function CompanyLogo({ company, companyName }: { company: CompanyRecord | null; companyName: string }) {
  void company
  return <img src="/logo.svg" alt={companyName || "CXSUN"} className="mx-auto mt-4 max-h-[104px] max-w-[116px] object-contain" />
}

function EinvoiceQrData({ value }: { value: string }) {
  const svgMarkup = createQrSvg(value)
  if (!svgMarkup) return null
  return <div className="size-full [&_svg]:block [&_svg]:size-full" dangerouslySetInnerHTML={{ __html: svgMarkup }} />
}

function IrnDetailsBlock({ record }: { record: DeliveryNoteEntry }) {
  return (
    <div className="grid gap-1">
      <div className="grid grid-cols-[34px_1fr] gap-1">
        <span className="font-bold">IRN :</span>
        <span className="break-all font-bold leading-tight">{DeliveryNoteDocumentValue(record, "irn") || record.uuid}</span>
      </div>
      <div className="grid gap-y-0.5">
        <InlinePrintPairRow
          leftLabel="Ack No.:"
          leftValue={DeliveryNoteDocumentValue(record, "ack_no")}
          rightLabel="Ack Date:"
          rightValue={formatDate(DeliveryNoteDocumentValue(record, "ack_date"))}
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

function buildDeliveryNoteEinvoiceQrPayload(record: DeliveryNoteEntry, company: CompanyRecord | null) {
  const signedQr = printableText(record.signed_qr)
  if (signedQr && !/signed qr will be populated/i.test(signedQr)) return signedQr

  const irn = DeliveryNoteDocumentValue(record, "irn")
  if (!irn) return ""

  return JSON.stringify({
    BuyerGstin: printableText(company?.gstinUin),
    DocDt: formatGstPortalDate(record.supplier_bill_date || record.entry_date),
    DocNo: printableText(record.supplier_bill_no) || record.entry_no,
    DocTyp: "INV",
    Irn: irn,
    IrnDt: formatGstPortalDateTime(record.ack_date || record.entry_date),
    ItemCnt: record.items.length,
    MainHsnCode: record.items.find((item) => printableText(item.hsn_code))?.hsn_code ?? "",
    SellerGstin: printableText(record.supplier_gstin),
    TotInvVal: Number(record.items.reduce((sum, item) => sum + Number(item.quantity || 0) * Number(item.rate || 0), 0).toFixed(2)),
  })
}

function sumQty(items: readonly DeliveryNoteEntryItem[]) {
  return items.reduce((sum, item) => sum + Number(item.quantity || 0), 0).toLocaleString("en-IN")
}

function companyHeaderDetails(company: CompanyRecord, labels?: DeliveryNotePrintAddressLabels) {
  const address = company.addresses.find((item) => item.isActive && item.isDefault) ?? company.addresses.find((item) => item.isActive) ?? company.addresses[0]
  const addressLines = address ? [
    [address.addressLine1, address.addressLine2].map(printableText).filter(Boolean).join(", "),
    [
      [labelOrRaw(labels?.cities, address.cityId), districtLabel(labelOrRaw(labels?.districts, address.districtId)), labelOrRaw(labels?.states, address.stateId), labelOrRaw(labels?.countries, address.countryId)].filter(Boolean).join(", "),
      labelOrRaw(labels?.pincodes, address.pincodeId),
    ].filter(Boolean).join(" - "),
  ].filter(Boolean) : []

  const email = printableText(company.primaryEmail) || printableText(company.emails.find((item) => item.isActive)?.email)
  const phone = printableText(company.primaryPhone) || printableText(company.phones.find((item) => item.isActive && item.isPrimary)?.phoneNumber) || printableText(company.phones.find((item) => item.isActive)?.phoneNumber)
  const gstin = printableText(company.gstinUin)
  const msme = [printableText(company.msmeCategory), printableText(company.msmeNo)].filter(Boolean).join(" / ")

  return {
    address: addressLines,
    contact: [email ? `Email: ${email}` : "", phone ? `Phone: ${phone}` : ""].filter(Boolean).join("    "),
    taxGstin: gstin ? `GSTIN/UIN: ${gstin}` : "",
    taxMsme: msme ? `MSME: ${msme}` : "",
  }
}

function labelOrRaw(resolver: ((value: unknown) => string) | undefined, value: unknown) {
  const resolved = resolver?.(value)
  return printableText(resolved) || printableText(value)
}

function districtLabel(value: string) {
  const label = printableText(value)
  if (!label || label === "-") return ""
  return /\bdist\.?$/i.test(label) ? label : `${label} -Dist`
}

function primaryBankAccount(company: CompanyRecord) {
  return company.bankAccounts.find((item) => item.isPrimary) ?? company.bankAccounts[0] ?? null
}

function DeliveryNotePrintTerms(value?: string | null) {
  const lines = String(value ?? "").split(/\r?\n/).map((line) => line.replace(/^\*\s*/, "").trim()).filter(Boolean)
  return lines.length ? lines : [
    "Supplier bill accepted subject to goods, rate, quantity, and quality verification.",
    "Acceptance may be revised for shortage, damage, or mismatch found later.",
  ]
}

function DeliveryNotePrintCopyLabel(copy: DeliveryNotePrintCopy) {
  if (copy === "duplicate") return "Duplicate"
  if (copy === "triplicate") return "Office Copy"
  return "Original"
}

function DeliveryNoteDocumentValue(record: DeliveryNoteEntry, key: string) {
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

