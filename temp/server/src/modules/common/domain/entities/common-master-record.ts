export interface CommonMasterRecord {
  readonly id: number;
  readonly code: string | null;
  readonly name: string | null;
  readonly description: string | null;
  readonly image?: string | null;
  readonly positionOrder?: number | null;
  readonly sortOrder?: number | null;
  readonly hexCode?: string | null;
  readonly symbol?: string | null;
  readonly taxType?: string | null;
  readonly ratePercent?: number | null;
  readonly isDefaultLocation?: boolean | null;
  readonly country?: string | null;
  readonly state?: string | null;
  readonly district?: string | null;
  readonly city?: string | null;
  readonly pincode?: string | null;
  readonly addressLine1?: string | null;
  readonly addressLine2?: string | null;
  readonly decimalPlaces?: number | null;
  readonly dueDays?: number | null;
  readonly startDate?: string | null;
  readonly endDate?: string | null;
  readonly booksStart?: string | null;
  readonly showOnStorefrontTopMenu?: boolean | null;
  readonly showOnStorefrontCatalog?: boolean | null;
  readonly isActive: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly deletedAt: Date | null;
}

export type CommonMasterUpsertParams = Omit<
  CommonMasterRecord,
  "id" | "createdAt" | "updatedAt" | "deletedAt"
>;
