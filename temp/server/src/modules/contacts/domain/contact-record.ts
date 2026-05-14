export interface ContactAddressRecord {
  readonly id: string;
  readonly contactId: string;
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

export interface ContactEmailRecord {
  readonly id: string;
  readonly contactId: string;
  readonly email: string;
  readonly emailType: string;
  readonly isPrimary: boolean;
  readonly isActive: boolean;
}

export interface ContactPhoneRecord {
  readonly id: string;
  readonly contactId: string;
  readonly phoneNumber: string;
  readonly phoneType: string;
  readonly isPrimary: boolean;
  readonly isActive: boolean;
}

export interface ContactSocialLinkRecord {
  readonly id: string;
  readonly contactId: string;
  readonly platform: string;
  readonly url: string;
  readonly isActive: boolean;
}

export interface ContactBankAccountRecord {
  readonly id: string;
  readonly contactId: string;
  readonly bankName: string;
  readonly accountNumber: string;
  readonly accountHolderName: string;
  readonly ifsc: string;
  readonly branch: string | null;
  readonly isPrimary: boolean;
  readonly isActive: boolean;
}

export interface ContactGstDetailRecord {
  readonly id: string;
  readonly contactId: string;
  readonly gstin: string;
  readonly state: string;
  readonly isDefault: boolean;
  readonly isActive: boolean;
}

export interface ContactRecord {
  readonly id: string;
  readonly uuid: string;
  readonly code: string;
  readonly contactTypeId: string | null;
  readonly ledgerId: string | null;
  readonly ledgerName: string | null;
  readonly name: string;
  readonly legalName: string | null;
  readonly pan: string | null;
  readonly gstin: string | null;
  readonly msmeType: string | null;
  readonly msmeNo: string | null;
  readonly tan: string | null;
  readonly tdsAvailable: boolean;
  readonly tcsAvailable: boolean;
  readonly openingBalance: number;
  readonly balanceType: string | null;
  readonly creditLimit: number;
  readonly website: string | null;
  readonly description: string | null;
  readonly primaryEmail: string | null;
  readonly primaryPhone: string | null;
  readonly isActive: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly deletedAt: Date | null;
  readonly addresses: readonly ContactAddressRecord[];
  readonly emails: readonly ContactEmailRecord[];
  readonly phones: readonly ContactPhoneRecord[];
  readonly socialLinks: readonly ContactSocialLinkRecord[];
  readonly bankAccounts: readonly ContactBankAccountRecord[];
  readonly gstDetails: readonly ContactGstDetailRecord[];
}
