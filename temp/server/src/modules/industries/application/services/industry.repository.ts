import type { IndustryRecord } from "../../domain/industry-record";

export interface IndustryUpsertParams {
  readonly code: string;
  readonly name: string;
  readonly isActive: boolean;
}

export interface IndustryRepository {
  list(): Promise<readonly IndustryRecord[]>;
  getById(industryId: string): Promise<IndustryRecord | null>;
  create(params: IndustryUpsertParams): Promise<IndustryRecord>;
  update(industryId: string, params: IndustryUpsertParams): Promise<IndustryRecord | null>;
  softDelete(industryId: string): Promise<boolean>;
}

export const INDUSTRY_REPOSITORY = Symbol("INDUSTRY_REPOSITORY");
