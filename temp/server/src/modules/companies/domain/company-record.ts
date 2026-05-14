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

export interface CompanyRecord {
  readonly id: string;
  readonly tenantId: string;
  readonly tenantName: string;
  readonly industryId: string;
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
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly deletedAt: Date | null;
  readonly logos: readonly CompanyLogoRecord[];
  readonly addresses: readonly CompanyAddressRecord[];
  readonly emails: readonly CompanyEmailRecord[];
  readonly phones: readonly CompanyPhoneRecord[];
  readonly socialLinks: readonly CompanySocialLinkRecord[];
  readonly bankAccounts: readonly CompanyBankAccountRecord[];
}
