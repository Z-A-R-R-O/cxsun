export interface ContactAddressValue {
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

export class ContactAddress {
  private constructor(public readonly value: ContactAddressValue) {}

  public static create(value: ContactAddressValue): ContactAddress {
    if (value.addressLine1.trim().length === 0) {
      throw new Error("Contact address line 1 is required.");
    }

    return new ContactAddress({
      ...value,
      addressLine1: value.addressLine1.trim(),
      addressLine2: value.addressLine2?.trim() || null,
    });
  }
}
