export type SoftwareSettingScope = "industry" | "client"

export interface SoftwareToggleSetting {
  id: string
  label: string
  description: string
  scope: SoftwareSettingScope
  enabled: boolean
}

export interface SoftwareCustomiseGroup {
  id: string
  title: string
  description: string
  settings: readonly SoftwareToggleSetting[]
}

export interface SoftwareSettingsState {
  customiseGroups: readonly SoftwareCustomiseGroup[]
  dutiesTaxSettings: DutiesTaxSettings
  features: readonly SoftwareToggleSetting[]
  favoriteDashboardApp: FavoriteDashboardApp
  letterheadSettings: LetterheadSettings
  salesGstApiMode: SalesGstApiMode
  salesBillingLayout: readonly SoftwareToggleSetting[]
  salesPrintingOptions: SalesPrintingOptions
  salesPrintingSettings: readonly SoftwareToggleSetting[]
}

export interface DutiesTaxSettings {
  openingGstAsOnDate: string
  openingGstCgst: string
  openingGstIgst: string
  openingGstSgst: string
}

export interface SalesPrintingOptions {
  customTerms: string
}

export interface LetterheadSettings {
  addressColor: string
  addressFontFamily: string
  addressFontSize: number
  borderColor: string
  companyNameColor: string
  companyNameFontFamily: string
  companyNameFontSize: number
  contactColor: string
  contactFontSize: number
  heightMm: number
  logoHeightMm: number
  logoWidthMm: number
  taxColor: string
  taxFontSize: number
}

export type FavoriteDashboardApp = "application" | "billing"
export type SalesGstApiMode = "einvoice_eway" | "eway_only"

export const defaultSoftwareSettingsState: SoftwareSettingsState = {
  favoriteDashboardApp: "application",
  salesGstApiMode: "einvoice_eway",
  letterheadSettings: {
    addressColor: "#111111",
    addressFontFamily: "Times New Roman",
    addressFontSize: 12,
    borderColor: "#9ca3af",
    companyNameColor: "#000000",
    companyNameFontFamily: "Times New Roman",
    companyNameFontSize: 32,
    contactColor: "#111111",
    contactFontSize: 11,
    heightMm: 42,
    logoHeightMm: 24,
    logoWidthMm: 28,
    taxColor: "#000000",
    taxFontSize: 11,
  },
  dutiesTaxSettings: {
    openingGstAsOnDate: "",
    openingGstCgst: "0",
    openingGstIgst: "0",
    openingGstSgst: "0",
  },
  salesPrintingOptions: {
    customTerms: "",
  },
  salesBillingLayout: [
    { id: "sales-use-po", label: "Use PO in sales", description: "Shows PO number on sales item entry and invoice item rows.", scope: "industry", enabled: true },
    { id: "sales-use-dc", label: "Use DC in sales", description: "Shows DC number on sales item entry and invoice item rows.", scope: "industry", enabled: true },
    { id: "sales-use-colour", label: "Use Colour in sales", description: "Shows colour on sales item entry and invoice item rows.", scope: "industry", enabled: false },
    { id: "sales-use-size", label: "Use Size in sales", description: "Shows size on sales item entry and invoice item rows.", scope: "industry", enabled: false },
    { id: "sales-use-einvoice", label: "Use E-invoice in sales", description: "Shows the E-invoice details tab on sales upsert.", scope: "industry", enabled: true },
    { id: "sales-use-eway", label: "Use E-way in sales", description: "Shows the E-way details tab on sales upsert.", scope: "industry", enabled: true },
  ],
  salesPrintingSettings: [
    { id: "sales-print-with-logo", label: "Print with logo", description: "Shows the active company logo in the sales invoice print header.", scope: "client", enabled: true },
    { id: "sales-print-account-no", label: "Print account no", description: "Shows or hides the company bank account number in sales invoice bank details.", scope: "client", enabled: true },
    { id: "sales-print-qr-account-details", label: "Print QR account details", description: "Controls whether QR account details are enabled for sales invoice printing.", scope: "client", enabled: true },
  ],
  customiseGroups: [
    {
      id: "billing-layout",
      title: "Billing Layout",
      description: "Industry-specific invoice, tax, address, and print presentation choices.",
      settings: [
        { id: "billing-print-template", label: "Use textile invoice print template", description: "Keeps garment-style PO, DC, HSN, GST, and blank-line fitting controls ready.", scope: "industry", enabled: true },
        { id: "billing-shipping-address", label: "Show shipping address block", description: "Adds buyer shipping details beside billing details on sales and purchase bills.", scope: "client", enabled: true },
        { id: "billing-irn-qr", label: "Show IRN and QR area", description: "Reserves the e-invoice acknowledgement and QR position in the print header.", scope: "client", enabled: true },
      ],
    },
  ],
  features: [
    { id: "feature-billing", label: "Billing", description: "Sales, purchase, receipt, payment, and report modules for simple billing.", scope: "industry", enabled: true },
  ],
}

export function isSoftwareSettingEnabled(state: SoftwareSettingsState, id: string) {
  return [
    ...state.salesBillingLayout,
    ...state.salesPrintingSettings,
    ...state.features,
    ...state.customiseGroups.flatMap((group) => group.settings),
  ].find((setting) => setting.id === id)?.enabled ?? false
}
