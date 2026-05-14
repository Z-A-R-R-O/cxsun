import { randomUUID } from "node:crypto";
import { ContactCode } from "../../domain/value-objects/contact-code.value-object";
import type { ContactRecord } from "../../domain/contact-record";
import type {
  ContactUpsertParams,
  NormalizedContactUpsertParams,
} from "../services/contact.repository";

export function normalizeContactUpsert(
  params: ContactUpsertParams,
  contacts: readonly ContactRecord[],
  existing?: ContactRecord,
): NormalizedContactUpsertParams {
  const contactId = existing?.id ?? "pending";
  const code = ContactCode.create(resolveContactCode(params, contacts, existing)).value;
  const emails = (params.emails ?? []).filter((item) => hasValue(item.email));
  const phones = (params.phones ?? []).filter((item) => hasValue(item.phoneNumber));

  return {
    code,
    contactTypeId: emptyAsNull(params.contactTypeId),
    ledgerId: emptyAsNull(params.ledgerId),
    ledgerName: emptyAsNull(params.ledgerName),
    name: params.name.trim(),
    legalName: emptyAsNull(params.legalName),
    pan: emptyAsNull(params.pan)?.toUpperCase() ?? null,
    gstin: emptyAsNull(params.gstin)?.toUpperCase() ?? null,
    msmeType: emptyAsNull(params.msmeType),
    msmeNo: emptyAsNull(params.msmeNo),
    tan: emptyAsNull(params.tan)?.toUpperCase() ?? null,
    tdsAvailable: params.tdsAvailable ?? false,
    tcsAvailable: params.tcsAvailable ?? false,
    openingBalance: Number(params.openingBalance ?? 0),
    balanceType: emptyAsNull(params.balanceType),
    creditLimit: Number(params.creditLimit ?? 0),
    website: emptyAsNull(params.website),
    description: emptyAsNull(params.description),
    isActive: params.isActive ?? true,
    addresses: (params.addresses ?? [])
      .filter((item) => hasValue(item.addressLine1))
      .map((item, index) => ({
        id: existing?.addresses[index]?.id ?? `contact-address:${randomUUID()}`,
        contactId,
        addressTypeId: emptyAsNull(item.addressTypeId),
        addressLine1: item.addressLine1.trim(),
        addressLine2: emptyAsNull(item.addressLine2),
        cityId: emptyAsNull(item.cityId),
        districtId: emptyAsNull(item.districtId),
        stateId: emptyAsNull(item.stateId),
        countryId: emptyAsNull(item.countryId),
        pincodeId: emptyAsNull(item.pincodeId),
        latitude: item.latitude ?? null,
        longitude: item.longitude ?? null,
        isDefault: item.isDefault ?? false,
        isActive: params.isActive ?? true,
      })),
    emails: emails.map((item, index) => ({
      id: existing?.emails[index]?.id ?? `contact-email:${randomUUID()}`,
      contactId,
      email: item.email.trim(),
      emailType: item.emailType.trim() || "primary",
      isPrimary: item.isPrimary ?? false,
      isActive: params.isActive ?? true,
    })),
    phones: phones.map((item, index) => ({
      id: existing?.phones[index]?.id ?? `contact-phone:${randomUUID()}`,
      contactId,
      phoneNumber: item.phoneNumber.trim(),
      phoneType: item.phoneType.trim() || "mobile",
      isPrimary: item.isPrimary ?? false,
      isActive: params.isActive ?? true,
    })),
    socialLinks: (params.socialLinks ?? [])
      .filter((item) => hasValue(item.url))
      .map((item, index) => ({
        id: existing?.socialLinks[index]?.id ?? `contact-social:${randomUUID()}`,
        contactId,
        platform: item.platform.trim() || "Website",
        url: item.url.trim(),
        isActive: item.isActive ?? true,
      })),
    bankAccounts: (params.bankAccounts ?? [])
      .filter(
        (item) =>
          hasValue(item.bankName) ||
          hasValue(item.accountNumber) ||
          hasValue(item.accountHolderName) ||
          hasValue(item.ifsc) ||
          hasValue(item.branch),
      )
      .map((item, index) => ({
        id: existing?.bankAccounts[index]?.id ?? `contact-bank:${randomUUID()}`,
        contactId,
        bankName: item.bankName.trim() || "-",
        accountNumber: item.accountNumber.trim() || "-",
        accountHolderName: item.accountHolderName.trim() || "-",
        ifsc: item.ifsc.trim() || "-",
        branch: emptyAsNull(item.branch),
        isPrimary: item.isPrimary ?? false,
        isActive: params.isActive ?? true,
      })),
    gstDetails: (params.gstDetails ?? [])
      .filter((item) => hasValue(item.gstin) || hasValue(item.state))
      .map((item, index) => ({
        id: existing?.gstDetails[index]?.id ?? `contact-gst:${randomUUID()}`,
        contactId,
        gstin: item.gstin.trim().toUpperCase() || "-",
        state: item.state.trim() || "-",
        isDefault: item.isDefault ?? false,
        isActive: params.isActive ?? true,
      })),
  };
}

export function assertContactCanBeSaved(
  contacts: readonly ContactRecord[],
  params: NormalizedContactUpsertParams,
  existingId?: string,
): void {
  const normalizedName = params.name.trim().toLowerCase();
  const primaryPhone = params.phones.find((item) => item.isPrimary)?.phoneNumber.trim() ?? "";

  if (params.name.trim().length < 2) {
    throw new Error("Contact name must be at least 2 characters.");
  }

  for (const contact of contacts) {
    if (existingId && contact.id === existingId) {
      continue;
    }

    if (contact.code.trim().toUpperCase() === params.code) {
      throw new Error(`Contact code "${params.code}" already exists.`);
    }

    if (params.gstin && contact.gstin?.trim().toUpperCase() === params.gstin) {
      throw new Error("GSTIN already exists for another contact.");
    }

    if (primaryPhone && contact.primaryPhone?.trim() === primaryPhone) {
      throw new Error("Mobile number already exists for another contact.");
    }

    if (!params.gstin && !primaryPhone && contact.name.trim().toLowerCase() === normalizedName) {
      throw new Error("This name already exists. Enter a mobile number or GSTIN to continue.");
    }
  }
}

function resolveContactCode(
  params: ContactUpsertParams,
  contacts: readonly ContactRecord[],
  existing?: ContactRecord,
) {
  const requestedCode = params.code?.trim().toUpperCase() ?? "";

  if (requestedCode && requestedCode !== "-") {
    return requestedCode;
  }

  const prefix = getContactTypeCode(params.contactTypeId ?? existing?.contactTypeId ?? null);
  let nextNumber = 1;

  for (const contact of contacts) {
    if (existing && contact.id === existing.id) {
      continue;
    }

    const normalizedCode = contact.code.trim().toUpperCase();

    if (!normalizedCode.startsWith(prefix)) {
      continue;
    }

    const numericPart = Number.parseInt(normalizedCode.slice(prefix.length), 10);

    if (Number.isFinite(numericPart)) {
      nextNumber = Math.max(nextNumber, numericPart + 1);
    }
  }

  return `${prefix}${String(nextNumber).padStart(4, "0")}`;
}

function getContactTypeCode(contactTypeId: string | null) {
  if (
    contactTypeId === "contact-type:partner" ||
    contactTypeId === "contact-type:vendor-customer"
  ) {
    return "VC";
  }

  if (contactTypeId === "contact-type:supplier") {
    return "S";
  }

  return "C";
}

function emptyAsNull(value: string | null | undefined) {
  const trimmedValue = value?.trim() ?? "";
  return trimmedValue.length > 0 && trimmedValue !== "1" && trimmedValue !== "-"
    ? trimmedValue
    : null;
}

function hasValue(value: string | null | undefined) {
  const trimmedValue = value?.trim() ?? "";
  return trimmedValue.length > 0 && trimmedValue !== "-";
}
