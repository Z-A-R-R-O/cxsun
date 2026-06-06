import type { CSSProperties } from "react"
import type { CompanyRecord } from "src/features/company/company-client"
import { companyLogoUrl } from "src/features/company/company-logo"
import { defaultSoftwareSettingsState, type LetterheadSettings } from "src/features/settings/software-settings"

export interface LetterheadAddressLabels {
  cities?(value: unknown): string
  countries?(value: unknown): string
  districts?(value: unknown): string
  pincodes?(value: unknown): string
  states?(value: unknown): string
}

export function LetterheadBuilder({
  addressLabels,
  className = "",
  company,
  settings,
  showLogo = true,
}: {
  addressLabels?: LetterheadAddressLabels
  className?: string
  company: CompanyRecord | null
  settings?: Partial<LetterheadSettings>
  showLogo?: boolean
}) {
  const style = normalizeLetterheadSettings(settings)
  const companyName = printableText(company?.legalName) || printableText(company?.name) || "Company"
  const lines = company ? companyLetterheadLines(company, addressLabels) : { address: [], contact: "", taxGstin: "", taxMsme: "" }
  const logoUrl = companyLogoUrl(company, "logo", { fallback: false })

  return (
    <div className={`relative grid grid-cols-[32mm_1fr_32mm] items-center px-2 py-2 text-center ${className}`} style={{ borderColor: style.borderColor, minHeight: `${style.heightMm}mm` }}>
      <div>
        {showLogo && logoUrl ? (
          <img
            src={logoUrl}
            alt={companyName}
            className="absolute object-contain"
            onError={(event) => {
              event.currentTarget.removeAttribute("src")
            }}
            style={{ left: `${style.logoLeftMm}mm`, maxHeight: `${style.logoHeightMm}mm`, maxWidth: `${style.logoWidthMm}mm`, top: `${style.logoTopMm}mm` }}
          />
        ) : null}
      </div>
      <div className="flex min-w-0 flex-col items-center justify-center">
        <div className="max-w-full whitespace-nowrap font-bold leading-tight" style={companyNameStyle(style)}>{companyName}</div>
        <div className="mx-auto mt-2 max-w-[150mm] font-medium leading-[1.35]" style={addressStyle(style)}>
          {lines.address.map((line) => <div key={line}>{line}</div>)}
          {lines.contact ? <div style={{ color: style.contactColor, fontSize: `${style.contactFontSize}px` }}>{lines.contact}</div> : null}
          {lines.taxGstin || lines.taxMsme ? (
            <div className="font-bold tracking-wide" style={{ color: style.taxColor, fontSize: `${style.taxFontSize}px` }}>
              {lines.taxGstin ? <span>{lines.taxGstin}</span> : null}
              {lines.taxMsme ? <span className="ml-2">{lines.taxMsme}</span> : null}
            </div>
          ) : null}
        </div>
      </div>
      <div />
    </div>
  )
}

export function companyLetterheadLines(company: CompanyRecord, labels?: LetterheadAddressLabels) {
  const address = company.addresses.find((item) => item.isActive && item.isDefault) ?? company.addresses.find((item) => item.isActive) ?? company.addresses[0]
  const addressLines = address ? [
    [address.addressLine1, address.addressLine2].map(printableText).filter(Boolean).join(", "),
    [
      [labelOrRaw(labels?.cities, address.cityName ?? address.cityId), districtLabel(labelOrRaw(labels?.districts, address.districtName ?? address.districtId)), labelOrRaw(labels?.states, address.stateName ?? address.stateId), labelOrRaw(labels?.countries, address.countryName ?? address.countryId)].filter(Boolean).join(", "),
      labelOrRaw(labels?.pincodes, address.pincodeName ?? address.pincodeId),
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

export function normalizeLetterheadSettings(settings?: Partial<LetterheadSettings>): LetterheadSettings {
  const defaults = defaultSoftwareSettingsState.letterheadSettings
  return {
    ...defaults,
    ...(settings ?? {}),
    addressFontSize: clampNumber(settings?.addressFontSize, 8, 24, defaults.addressFontSize),
    companyNameFontSize: clampNumber(settings?.companyNameFontSize, 16, 48, defaults.companyNameFontSize),
    contactFontSize: clampNumber(settings?.contactFontSize, 8, 20, defaults.contactFontSize),
    heightMm: clampNumber(settings?.heightMm, 24, 70, defaults.heightMm),
    logoHeightMm: clampNumber(settings?.logoHeightMm, 10, 50, defaults.logoHeightMm),
    logoLeftMm: clampNumber(settings?.logoLeftMm, -20, 200, defaults.logoLeftMm),
    logoTopMm: clampNumber(settings?.logoTopMm, -20, 70, defaults.logoTopMm),
    logoWidthMm: clampNumber(settings?.logoWidthMm, 10, 60, defaults.logoWidthMm),
    taxFontSize: clampNumber(settings?.taxFontSize, 8, 20, defaults.taxFontSize),
  }
}

function companyNameStyle(settings: LetterheadSettings): CSSProperties {
  return { color: settings.companyNameColor, fontFamily: settings.companyNameFontFamily, fontSize: `${settings.companyNameFontSize}px` }
}

function addressStyle(settings: LetterheadSettings): CSSProperties {
  return { color: settings.addressColor, fontFamily: settings.addressFontFamily, fontSize: `${settings.addressFontSize}px` }
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

function printableText(value: unknown) {
  return String(value ?? "").trim()
}

function clampNumber(value: unknown, min: number, max: number, fallback: number) {
  const numberValue = Number(value)
  if (!Number.isFinite(numberValue)) return fallback
  return Math.min(max, Math.max(min, numberValue))
}
