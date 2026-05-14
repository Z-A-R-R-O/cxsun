import type {
  ApplicationContextRecord,
  DefaultCompanyRecord,
} from "../../domain/application-context-record";

export interface DefaultCompanyUpdateParams {
  readonly tenantId: number;
  readonly industryId: number;
  readonly companyId: number;
  readonly accountingYearId: number;
}

export interface ApplicationContextRepository {
  getDefaultCompanyContext(): Promise<ApplicationContextRecord | null>;
  getDefaultCompanyRecord(): Promise<DefaultCompanyRecord | null>;
  updateDefaultCompany(params: DefaultCompanyUpdateParams): Promise<DefaultCompanyRecord>;
}

export const APPLICATION_CONTEXT_REPOSITORY = Symbol("APPLICATION_CONTEXT_REPOSITORY");
