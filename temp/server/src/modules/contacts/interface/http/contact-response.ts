import type { ContactRecord } from "../../domain/contact-record";

export type ContactResponse = ReturnType<typeof toContactResponse>;

export function toContactResponse(contact: ContactRecord) {
  return {
    id: contact.id,
    uuid: contact.uuid,
    code: contact.code,
    contactTypeId: contact.contactTypeId,
    ledgerId: contact.ledgerId,
    ledgerName: contact.ledgerName,
    name: contact.name,
    legalName: contact.legalName,
    pan: contact.pan,
    gstin: contact.gstin,
    msmeType: contact.msmeType,
    msmeNo: contact.msmeNo,
    tan: contact.tan,
    tdsAvailable: contact.tdsAvailable,
    tcsAvailable: contact.tcsAvailable,
    openingBalance: contact.openingBalance,
    balanceType: contact.balanceType,
    creditLimit: contact.creditLimit,
    website: contact.website,
    description: contact.description,
    primaryEmail: contact.primaryEmail,
    primaryPhone: contact.primaryPhone,
    isActive: contact.isActive,
    createdAt: contact.createdAt.toISOString(),
    updatedAt: contact.updatedAt.toISOString(),
    deletedAt: contact.deletedAt ? contact.deletedAt.toISOString() : null,
    addresses: contact.addresses,
    emails: contact.emails,
    phones: contact.phones,
    socialLinks: contact.socialLinks,
    bankAccounts: contact.bankAccounts,
    gstDetails: contact.gstDetails,
  };
}
