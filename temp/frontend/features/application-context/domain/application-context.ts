export interface ApplicationContextTenant {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
}

export interface ApplicationContextIndustry {
  readonly id: string;
  readonly code: string;
  readonly name: string;
}

export interface ApplicationContextCompany {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly legalName: string | null;
  readonly gstinUin: string | null;
  readonly pan: string | null;
}

export interface ApplicationContextAccountingYear {
  readonly id: string;
  readonly name: string;
  readonly startDate: string;
  readonly endDate: string;
  readonly booksStart: string | null;
  readonly isActive: boolean;
}

export interface ApplicationContext {
  readonly tenant: ApplicationContextTenant;
  readonly industry: ApplicationContextIndustry;
  readonly company: ApplicationContextCompany;
  readonly accountingYear: ApplicationContextAccountingYear;
}

export interface DefaultCompanyRecord extends ApplicationContext {
  readonly id: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface DefaultCompanyUpdateInput {
  readonly tenantId: string;
  readonly industryId: string;
  readonly companyId: string;
  readonly accountingYearId: string;
}

export interface AccountingYearRecord extends ApplicationContextAccountingYear {
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly deletedAt: string | null;
}
