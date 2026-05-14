import type { ContactRecord, ContactUpsertInput } from "./contact";

export function createDefaultContactFormValues(): ContactUpsertInput {
  return {
    code: "",
    contactTypeId: null,
    ledgerId: null,
    ledgerName: null,
    name: "",
    legalName: null,
    pan: null,
    gstin: null,
    msmeType: null,
    msmeNo: null,
    tan: null,
    tdsAvailable: false,
    tcsAvailable: false,
    openingBalance: 0,
    balanceType: null,
    creditLimit: 0,
    website: null,
    description: null,
    isActive: true,
    addresses: [
      {
        addressTypeId: null,
        addressLine1: "",
        addressLine2: null,
        cityId: null,
        districtId: null,
        stateId: null,
        countryId: null,
        pincodeId: null,
        latitude: null,
        longitude: null,
        isDefault: true,
      },
    ],
    emails: [{ email: "", emailType: "primary", isPrimary: true }],
    phones: [{ phoneNumber: "", phoneType: "mobile", isPrimary: true }],
    socialLinks: [],
    bankAccounts: [],
    gstDetails: [],
  };
}

export function toContactFormValues(contact: ContactRecord): ContactUpsertInput {
  return {
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
    isActive: contact.isActive,
    addresses: contact.addresses.length
      ? contact.addresses.map((address) => ({
          addressTypeId: address.addressTypeId,
          addressLine1: address.addressLine1,
          addressLine2: address.addressLine2,
          cityId: address.cityId,
          districtId: address.districtId,
          stateId: address.stateId,
          countryId: address.countryId,
          pincodeId: address.pincodeId,
          latitude: address.latitude,
          longitude: address.longitude,
          isDefault: address.isDefault,
        }))
      : createDefaultContactFormValues().addresses,
    emails: contact.emails.length
      ? contact.emails.map((email) => ({
          email: email.email,
          emailType: email.emailType,
          isPrimary: email.isPrimary,
        }))
      : createDefaultContactFormValues().emails,
    phones: contact.phones.length
      ? contact.phones.map((phone) => ({
          phoneNumber: phone.phoneNumber,
          phoneType: phone.phoneType,
          isPrimary: phone.isPrimary,
        }))
      : createDefaultContactFormValues().phones,
    socialLinks: contact.socialLinks.map((link) => ({
      platform: link.platform,
      url: link.url,
      isActive: link.isActive,
    })),
    bankAccounts: contact.bankAccounts.map((bankAccount) => ({
      bankName: bankAccount.bankName,
      accountNumber: bankAccount.accountNumber,
      accountHolderName: bankAccount.accountHolderName,
      ifsc: bankAccount.ifsc,
      branch: bankAccount.branch,
      isPrimary: bankAccount.isPrimary,
    })),
    gstDetails: contact.gstDetails.map((gstDetail) => ({
      gstin: gstDetail.gstin,
      state: gstDetail.state,
      isDefault: gstDetail.isDefault,
    })),
  };
}
