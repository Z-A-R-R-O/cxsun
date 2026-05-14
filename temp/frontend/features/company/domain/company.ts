import type { MasterListColumnOption, MasterListFilterOption } from "@cxnext/ui";

export interface CompanyRecord {
  readonly id: number;
  readonly tenantId: number;
  readonly tenantName: string;
  readonly industryId: number;
  readonly industryCode: string;
  readonly industryName: string;
  readonly code: string;
  readonly name: string;
  readonly legalName: string | null;
  readonly tagline: string | null;
  readonly shortAbout: string | null;
  readonly gstinUin: string | null;
  readonly pan: string | null;
  readonly dateOfIncorporation: string | null;
  readonly msmeNo: string | null;
  readonly msmeCategory: string | null;
  readonly tan: string | null;
  readonly tdsAvailable: boolean;
  readonly tdsSection: string | null;
  readonly tdsRatePercent: number | null;
  readonly tcsAvailable: boolean;
  readonly tcsSection: string | null;
  readonly tcsRatePercent: number | null;
  readonly website: string | null;
  readonly description: string | null;
  readonly primaryEmail: string | null;
  readonly primaryPhone: string | null;
  readonly isPrimary: boolean;
  readonly isActive: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly deletedAt: string | null;
  readonly logos: readonly CompanyLogoRecord[];
  readonly addresses: readonly CompanyAddressRecord[];
  readonly emails: readonly CompanyEmailRecord[];
  readonly phones: readonly CompanyPhoneRecord[];
  readonly socialLinks: readonly CompanySocialLinkRecord[];
  readonly bankAccounts: readonly CompanyBankAccountRecord[];
}

export interface CompanyLogoRecord {
  readonly id: string;
  readonly logoUrl: string;
  readonly logoType: string;
  readonly isActive: boolean;
}

export interface CompanyAddressRecord {
  readonly id: string;
  readonly ownerType: "company" | "contact";
  readonly ownerId: string;
  readonly addressTypeId: string | null;
  readonly addressLine1: string;
  readonly addressLine2: string | null;
  readonly cityId: string | null;
  readonly districtId: string | null;
  readonly stateId: string | null;
  readonly countryId: string | null;
  readonly pincodeId: string | null;
  readonly latitude: number | null;
  readonly longitude: number | null;
  readonly isDefault: boolean;
  readonly isActive: boolean;
}

export interface CompanyEmailRecord {
  readonly id: string;
  readonly email: string;
  readonly emailType: string;
  readonly isActive: boolean;
}

export interface CompanyPhoneRecord {
  readonly id: string;
  readonly phoneNumber: string;
  readonly phoneType: string;
  readonly isPrimary: boolean;
  readonly isActive: boolean;
}

export interface CompanySocialLinkRecord {
  readonly id: string;
  readonly platform: string;
  readonly url: string;
  readonly isActive: boolean;
}

export interface CompanyBankAccountRecord {
  readonly id: string;
  readonly bankName: string;
  readonly accountNumber: string;
  readonly accountHolderName: string;
  readonly ifsc: string;
  readonly branch: string | null;
  readonly qrImageUrl: string | null;
  readonly isPrimary: boolean;
  readonly isActive: boolean;
}

export type CompanyUpsertInput = Pick<
  CompanyRecord,
  | "tenantId"
  | "industryId"
  | "code"
  | "name"
  | "legalName"
  | "tagline"
  | "shortAbout"
  | "gstinUin"
  | "pan"
  | "dateOfIncorporation"
  | "msmeNo"
  | "msmeCategory"
  | "tan"
  | "tdsAvailable"
  | "tdsSection"
  | "tdsRatePercent"
  | "tcsAvailable"
  | "tcsSection"
  | "tcsRatePercent"
  | "website"
  | "description"
  | "primaryEmail"
  | "primaryPhone"
  | "isPrimary"
  | "isActive"
> & {
  readonly logos: readonly Omit<CompanyLogoRecord, "id">[];
  readonly addresses: readonly Omit<CompanyAddressRecord, "id" | "ownerType" | "ownerId">[];
  readonly emails: readonly Omit<CompanyEmailRecord, "id">[];
  readonly phones: readonly Omit<CompanyPhoneRecord, "id">[];
  readonly socialLinks: readonly Omit<CompanySocialLinkRecord, "id">[];
  readonly bankAccounts: readonly Omit<CompanyBankAccountRecord, "id">[];
};

export type CompanyStatusFilter = "all" | "active" | "inactive";
export type CompanyColumnId = "code" | "name" | "tenant" | "industry" | "status" | "updated";

export const companyStatusFilters: readonly MasterListFilterOption[] = [
  { id: "all", label: "All companies" },
  { id: "active", label: "active" },
  { id: "inactive", label: "inactive" },
];

export const companyColumnCatalog = [
  { id: "code", label: "Code" },
  { id: "name", label: "Company" },
  { id: "tenant", label: "Tenant" },
  { id: "industry", label: "Industry" },
  { id: "status", label: "Status" },
  { id: "updated", label: "Updated" },
] as const satisfies readonly {
  readonly id: CompanyColumnId;
  readonly label: string;
}[];

export const defaultCompanyColumnVisibility: Record<CompanyColumnId, boolean> = {
  code: true,
  name: true,
  tenant: true,
  industry: true,
  status: true,
  updated: true,
};

export type CompanyColumnOption = MasterListColumnOption;
