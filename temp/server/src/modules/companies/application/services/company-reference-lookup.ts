export interface CompanyReferenceNameRecord {
  readonly name: string;
  readonly code?: string | null;
}

export interface CompanyReferenceNameLookup {
  findNamesByIds(ids: readonly number[]): Promise<ReadonlyMap<number, CompanyReferenceNameRecord>>;
}

export const COMPANY_TENANT_NAME_LOOKUP = Symbol("COMPANY_TENANT_NAME_LOOKUP");
export const COMPANY_INDUSTRY_NAME_LOOKUP = Symbol("COMPANY_INDUSTRY_NAME_LOOKUP");
