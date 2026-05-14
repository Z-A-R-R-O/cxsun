import type {
  ContactAddressRecord,
  ContactBankAccountRecord,
  ContactEmailRecord,
  ContactGstDetailRecord,
  ContactPhoneRecord,
  ContactRecord,
  ContactSocialLinkRecord,
} from "../../domain/contact-record";

export interface ContactAddressInput {
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
}

export interface ContactEmailInput {
  readonly email: string;
  readonly emailType: string;
  readonly isPrimary?: boolean;
}

export interface ContactPhoneInput {
  readonly phoneNumber: string;
  readonly phoneType: string;
  readonly isPrimary?: boolean;
}

export interface ContactSocialLinkInput {
  readonly platform: string;
  readonly url: string;
  readonly isActive?: boolean;
}

export interface ContactBankAccountInput {
  readonly bankName: string;
  readonly accountNumber: string;
  readonly accountHolderName: string;
  readonly ifsc: string;
  readonly branch?: string | null;
  readonly isPrimary?: boolean;
}

export interface ContactGstDetailInput {
  readonly gstin: string;
  readonly state: string;
  readonly isDefault?: boolean;
}

export interface ContactUpsertParams {
  readonly code?: string | null;
  readonly contactTypeId?: string | null;
  readonly ledgerId?: string | null;
  readonly ledgerName?: string | null;
  readonly name: string;
  readonly legalName?: string | null;
  readonly pan?: string | null;
  readonly gstin?: string | null;
  readonly msmeType?: string | null;
  readonly msmeNo?: string | null;
  readonly tan?: string | null;
  readonly tdsAvailable?: boolean;
  readonly tcsAvailable?: boolean;
  readonly openingBalance?: number;
  readonly balanceType?: string | null;
  readonly creditLimit?: number;
  readonly website?: string | null;
  readonly description?: string | null;
  readonly isActive?: boolean;
  readonly addresses?: readonly ContactAddressInput[];
  readonly emails?: readonly ContactEmailInput[];
  readonly phones?: readonly ContactPhoneInput[];
  readonly socialLinks?: readonly ContactSocialLinkInput[];
  readonly bankAccounts?: readonly ContactBankAccountInput[];
  readonly gstDetails?: readonly ContactGstDetailInput[];
}

export interface NormalizedContactUpsertParams {
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
  readonly addresses: readonly ContactAddressRecord[];
  readonly emails: readonly ContactEmailRecord[];
  readonly phones: readonly ContactPhoneRecord[];
  readonly socialLinks: readonly ContactSocialLinkRecord[];
  readonly bankAccounts: readonly ContactBankAccountRecord[];
  readonly gstDetails: readonly ContactGstDetailRecord[];
}

export interface ContactRepository {
  list(): Promise<readonly ContactRecord[]>;
  getById(contactId: string): Promise<ContactRecord | null>;
  create(params: NormalizedContactUpsertParams): Promise<ContactRecord>;
  update(contactId: string, params: NormalizedContactUpsertParams): Promise<ContactRecord | null>;
  softDelete(contactId: string): Promise<boolean>;
}

export const CONTACT_REPOSITORY = Symbol("CONTACT_REPOSITORY");
