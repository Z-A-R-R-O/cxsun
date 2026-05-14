export interface ApplicationContextTenantRecord {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
}

export interface ApplicationContextIndustryRecord {
  readonly id: string;
  readonly code: string;
  readonly name: string;
}

export interface ApplicationContextCompanyRecord {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly legalName: string | null;
  readonly gstinUin: string | null;
  readonly pan: string | null;
}

export interface ApplicationContextAccountingYearRecord {
  readonly id: string;
  readonly name: string;
  readonly startDate: string;
  readonly endDate: string;
  readonly booksStart: string | null;
  readonly isActive: boolean;
}

export interface ApplicationContextRecord {
  readonly tenant: ApplicationContextTenantRecord;
  readonly industry: ApplicationContextIndustryRecord;
  readonly company: ApplicationContextCompanyRecord;
  readonly accountingYear: ApplicationContextAccountingYearRecord;
}

export interface DefaultCompanyRecord extends ApplicationContextRecord {
  readonly id: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}
