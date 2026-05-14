export type SoftwareSettingScope = "industry" | "client";

export interface SoftwareToggleSetting {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  readonly scope: SoftwareSettingScope;
  readonly enabled: boolean;
}

export interface SoftwareCustomiseGroup {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly settings: readonly SoftwareToggleSetting[];
}

export interface SoftwareSettingsState {
  readonly customiseGroups: readonly SoftwareCustomiseGroup[];
  readonly dutiesTaxSettings: DutiesTaxSettings;
  readonly features: readonly SoftwareToggleSetting[];
  readonly favoriteDashboardApp: string;
  readonly salesBillingLayout: readonly SoftwareToggleSetting[];
  readonly salesDocumentSettings: SalesDocumentSettings;
  readonly salesPrintingOptions: SalesPrintingOptions;
  readonly salesPrintingSettings: readonly SoftwareToggleSetting[];
}

export interface DutiesTaxSettings {
  readonly openingGstAsOnDate: string;
  readonly openingGstCgst: string;
  readonly openingGstIgst: string;
  readonly openingGstSgst: string;
}

export interface SalesDocumentSettings {
  readonly invoicePrefix: string;
  readonly invoiceSerialStart: string;
}

export interface SalesPrintingOptions {
  readonly customTerms: string;
}

export type FavoriteDashboardApp = "application" | "billing";

export const defaultSoftwareSettingsState: SoftwareSettingsState = {
  favoriteDashboardApp: "application",
  dutiesTaxSettings: {
    openingGstAsOnDate: "",
    openingGstCgst: "0",
    openingGstIgst: "0",
    openingGstSgst: "0",
  },
  salesDocumentSettings: {
    invoicePrefix: "SAL",
    invoiceSerialStart: "0001",
  },
  salesPrintingOptions: {
    customTerms: "",
  },
  salesBillingLayout: [
    {
      id: "sales-use-po",
      label: "Use PO in sales",
      description: "Shows PO number on sales item entry and invoice item rows.",
      scope: "industry",
      enabled: true,
    },
    {
      id: "sales-use-dc",
      label: "Use DC in sales",
      description: "Shows DC number on sales item entry and invoice item rows.",
      scope: "industry",
      enabled: true,
    },
    {
      id: "sales-use-colour",
      label: "Use Colour in sales",
      description: "Shows colour on sales item entry and invoice item rows.",
      scope: "industry",
      enabled: false,
    },
    {
      id: "sales-use-size",
      label: "Use Size in sales",
      description: "Shows size on sales item entry and invoice item rows.",
      scope: "industry",
      enabled: false,
    },
    {
      id: "sales-use-einvoice",
      label: "Use E-invoice in sales",
      description: "Shows the E-invoice details tab on sales upsert.",
      scope: "industry",
      enabled: true,
    },
    {
      id: "sales-use-eway",
      label: "Use E-way in sales",
      description: "Shows the E-way details tab on sales upsert.",
      scope: "industry",
      enabled: true,
    },
  ],
  salesPrintingSettings: [
    {
      id: "sales-print-with-logo",
      label: "Print with logo",
      description: "Shows the active company logo in the sales invoice print header.",
      scope: "client",
      enabled: true,
    },
    {
      id: "sales-print-account-no",
      label: "Print account no",
      description:
        "Shows or hides the company bank account number in sales invoice bank details when an account number is available.",
      scope: "client",
      enabled: true,
    },
    {
      id: "sales-print-qr-account-details",
      label: "Print QR account details",
      description: "Controls whether QR account details are enabled for sales invoice printing.",
      scope: "client",
      enabled: true,
    },
  ],
  customiseGroups: [
    {
      id: "billing-layout",
      title: "Billing Layout",
      description: "Industry-specific invoice, tax, address, and print presentation choices.",
      settings: [
        {
          id: "billing-print-template",
          label: "Use textile invoice print template",
          description:
            "Keeps garment-style PO, DC, HSN, GST, and blank-line fitting controls ready.",
          scope: "industry",
          enabled: true,
        },
        {
          id: "billing-shipping-address",
          label: "Show shipping address block",
          description:
            "Adds buyer shipping details beside billing details on sales and purchase bills.",
          scope: "client",
          enabled: true,
        },
        {
          id: "billing-irn-qr",
          label: "Show IRN and QR area",
          description:
            "Reserves the e-invoice acknowledgement and QR position in the print header.",
          scope: "client",
          enabled: true,
        },
      ],
    },
    {
      id: "master-data",
      title: "Master Data",
      description: "Controls which master fields are visible for the selected industry profile.",
      settings: [
        {
          id: "product-garment-fields",
          label: "Enable garment product fields",
          description: "Shows style, size, colour, HSN, unit, and GST controls in product setup.",
          scope: "industry",
          enabled: true,
        },
        {
          id: "contact-tax-fields",
          label: "Enable contact tax details",
          description: "Keeps GSTIN/UIN, PAN, TAN, MSME, and TDS-ready fields available.",
          scope: "industry",
          enabled: true,
        },
      ],
    },
    {
      id: "workflow",
      title: "Workflow",
      description:
        "Basic application behavior that can later branch per tenant, company, or industry.",
      settings: [
        {
          id: "workflow-default-company",
          label: "Require default company context",
          description:
            "Loads company, accounting year, tenant, and industry context before desk pages.",
          scope: "client",
          enabled: true,
        },
        {
          id: "workflow-compact-sidebar",
          label: "Load side menu compact",
          description: "Keeps menu groups closed on first load for a cleaner desk workspace.",
          scope: "client",
          enabled: true,
        },
      ],
    },
  ],
  features: [
    {
      id: "feature-billing",
      label: "Billing",
      description: "Sales, purchase, receipt, payment, and report modules for simple billing.",
      scope: "industry",
      enabled: true,
    },
  ],
};
