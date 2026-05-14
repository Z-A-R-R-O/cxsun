import type { CompanyRecord } from "../../domain/company-record";

export interface CompanyLogoInput {
  readonly logoUrl: string;
  readonly logoType: string;
  readonly isActive?: boolean;
}

export interface CompanyAddressInput {
  readonly addressTypeId?: string | null;
  readonly addressLine1: string;
  readonly addressLine2?: string | null;
  readonly cityId?: string | null;
  readonly districtId?: string | null;
  readonly stateId?: string | null;
  readonly countryId?: string | null;
  readonly pincodeId?: string | null;
  readonly latitude?: number | null;
  readonly longitude?: number | null;
  readonly isDefault?: boolean;
  readonly isActive?: boolean;
}

export interface CompanyEmailInput {
  readonly email: string;
  readonly emailType: string;
  readonly isPrimary?: boolean;
  readonly isActive?: boolean;
}

export interface CompanyPhoneInput {
  readonly phoneNumber: string;
  readonly phoneType: string;
  readonly isPrimary?: boolean;
  readonly isActive?: boolean;
}

export interface CompanySocialLinkInput {
  readonly platform: string;
  readonly url: string;
  readonly isActive?: boolean;
}

export interface CompanyBankAccountInput {
  readonly bankName: string;
  readonly accountNumber: string;
  readonly accountHolderName: string;
  readonly ifsc: string;
  readonly branch?: string | null;
  readonly qrImageUrl?: string | null;
  readonly isPrimary?: boolean;
  readonly isActive?: boolean;
}

export interface CompanyUpsertParams {
  readonly tenantId: number;
  readonly industryId: number;
  readonly code: string;
  readonly name: string;
  readonly legalName?: string | null;
  readonly tagline?: string | null;
  readonly shortAbout?: string | null;
  readonly gstinUin?: string | null;
  readonly pan?: string | null;
  readonly dateOfIncorporation?: string | null;
  readonly msmeNo?: string | null;
  readonly msmeCategory?: string | null;
  readonly tan?: string | null;
  readonly tdsAvailable?: boolean;
  readonly tdsSection?: string | null;
  readonly tdsRatePercent?: number | null;
  readonly tcsAvailable?: boolean;
  readonly tcsSection?: string | null;
  readonly tcsRatePercent?: number | null;
  readonly website?: string | null;
  readonly description?: string | null;
  readonly primaryEmail?: string | null;
  readonly primaryPhone?: string | null;
  readonly isPrimary: boolean;
  readonly isActive: boolean;
  readonly addresses?: readonly CompanyAddressInput[];
  readonly logos?: readonly CompanyLogoInput[];
  readonly emails?: readonly CompanyEmailInput[];
  readonly phones?: readonly CompanyPhoneInput[];
  readonly socialLinks?: readonly CompanySocialLinkInput[];
  readonly bankAccounts?: readonly CompanyBankAccountInput[];
}

export interface CompanyRepository {
  list(): Promise<readonly CompanyRecord[]>;
  getById(companyId: string): Promise<CompanyRecord | null>;
  create(params: CompanyUpsertParams): Promise<CompanyRecord>;
  update(companyId: string, params: CompanyUpsertParams): Promise<CompanyRecord | null>;
  softDelete(companyId: string): Promise<boolean>;
}

export const COMPANY_REPOSITORY = Symbol("COMPANY_REPOSITORY");
