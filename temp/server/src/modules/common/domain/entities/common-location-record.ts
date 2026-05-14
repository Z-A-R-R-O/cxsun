export interface CommonLocationRecord {
  readonly id: number;
  readonly countryId?: number | null;
  readonly stateId?: number | null;
  readonly districtId?: number | null;
  readonly cityId?: number | null;
  readonly code: string;
  readonly name?: string | null;
  readonly phoneCode?: string | null;
  readonly areaName?: string | null;
  readonly isActive: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly deletedAt: Date | null;
}

export type CommonLocationUpsertParams = Omit<
  CommonLocationRecord,
  "id" | "createdAt" | "updatedAt" | "deletedAt"
>;
