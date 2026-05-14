import type { MasterListColumnOption, MasterListFilterOption } from "@cxnext/ui";

export interface ContactAddress {
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

export interface ContactEmail {
  readonly id: string;
  readonly contactId: string;
  readonly email: string;
  readonly emailType: string;
  readonly isPrimary: boolean;
  readonly isActive: boolean;
}

export interface ContactPhone {
  readonly id: string;
  readonly contactId: string;
  readonly phoneNumber: string;
  readonly phoneType: string;
  readonly isPrimary: boolean;
  readonly isActive: boolean;
}

export interface ContactSocialLink {
  readonly id: string;
  readonly contactId: string;
  readonly platform: string;
  readonly url: string;
  readonly isActive: boolean;
}

export interface ContactBankAccount {
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

export interface ContactGstDetail {
  readonly id: string;
  readonly contactId: string;
  readonly gstin: string;
  readonly state: string;
  readonly isDefault: boolean;
  readonly isActive: boolean;
}

export interface ContactRecord {
  readonly id: number;
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
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly deletedAt: string | null;
  readonly addresses: readonly ContactAddress[];
  readonly emails: readonly ContactEmail[];
  readonly phones: readonly ContactPhone[];
  readonly socialLinks: readonly ContactSocialLink[];
  readonly bankAccounts: readonly ContactBankAccount[];
  readonly gstDetails: readonly ContactGstDetail[];
}

export interface ContactUpsertInput {
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
  readonly isActive: boolean;
  readonly addresses: readonly ContactAddressInput[];
  readonly emails: readonly ContactEmailInput[];
  readonly phones: readonly ContactPhoneInput[];
  readonly socialLinks: readonly ContactSocialLinkInput[];
  readonly bankAccounts: readonly ContactBankAccountInput[];
  readonly gstDetails: readonly ContactGstDetailInput[];
}

export interface ContactAddressInput {
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
}

export interface ContactEmailInput {
  readonly email: string;
  readonly emailType: string;
  readonly isPrimary: boolean;
}

export interface ContactPhoneInput {
  readonly phoneNumber: string;
  readonly phoneType: string;
  readonly isPrimary: boolean;
}

export interface ContactSocialLinkInput {
  readonly platform: string;
  readonly url: string;
  readonly isActive: boolean;
}

export interface ContactBankAccountInput {
  readonly bankName: string;
  readonly accountNumber: string;
  readonly accountHolderName: string;
  readonly ifsc: string;
  readonly branch: string | null;
  readonly isPrimary: boolean;
}

export interface ContactGstDetailInput {
  readonly gstin: string;
  readonly state: string;
  readonly isDefault: boolean;
}

export type ContactColumnId = "code" | "name" | "ledger" | "phone" | "email" | "status" | "updated";

export type ContactStatusFilter = "all" | "active" | "inactive";
export type ContactColumnOption = MasterListColumnOption;

export const contactColumnCatalog: readonly {
  readonly id: ContactColumnId;
  readonly label: string;
}[] = [
  { id: "code", label: "Code" },
  { id: "name", label: "Contact" },
  { id: "ledger", label: "Ledger" },
  { id: "phone", label: "Phone" },
  { id: "email", label: "Email" },
  { id: "status", label: "Status" },
  { id: "updated", label: "Updated" },
];

export const defaultContactColumnVisibility: Record<ContactColumnId, boolean> = {
  code: true,
  name: true,
  ledger: true,
  phone: true,
  email: true,
  status: true,
  updated: true,
};

export const contactStatusFilters: readonly MasterListFilterOption[] = [
  { id: "all", label: "All contacts" },
  { id: "active", label: "active" },
  { id: "inactive", label: "inactive" },
];
