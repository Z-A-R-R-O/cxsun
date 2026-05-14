export type DocumentEntryKind = "payment" | "purchase" | "receipt" | "sales";

export interface DocumentNumberContext {
  readonly companyId: string;
  readonly accountingYearId: string;
}

export interface DocumentNumberSettingRecord extends DocumentNumberContext {
  readonly id: string;
  readonly kind: DocumentEntryKind;
  readonly prefix: string;
  readonly separator: string;
  readonly nextNumber: number;
  readonly padding: number;
  readonly autoEnabled: boolean;
  readonly preview: string;
  readonly updatedAt: Date;
}

export interface DocumentNumberSettingInput {
  readonly kind: DocumentEntryKind;
  readonly prefix?: string | null;
  readonly separator?: string | null;
  readonly nextNumber?: number | string | null;
  readonly padding?: number | string | null;
  readonly autoEnabled?: boolean | number | null;
}
