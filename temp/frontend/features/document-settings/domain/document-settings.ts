export type DocumentEntryKind = "payment" | "purchase" | "receipt" | "sales";

export interface DocumentNumberSetting {
  readonly id: string;
  readonly companyId: string;
  readonly accountingYearId: string;
  readonly kind: DocumentEntryKind;
  readonly prefix: string;
  readonly separator: string;
  readonly nextNumber: number;
  readonly padding: number;
  readonly autoEnabled: boolean;
  readonly preview: string;
}

export interface DocumentNumberSettingInput {
  readonly kind: DocumentEntryKind;
  readonly prefix: string;
  readonly separator: string;
  readonly nextNumber: number;
  readonly padding: number;
  readonly autoEnabled: boolean;
}

export const documentNumberLabels: Record<DocumentEntryKind, string> = {
  sales: "Sales",
  purchase: "Purchase",
  payment: "Payment",
  receipt: "Receipt",
};

export const documentNumberKindOrder: readonly DocumentEntryKind[] = [
  "sales",
  "purchase",
  "payment",
  "receipt",
];
