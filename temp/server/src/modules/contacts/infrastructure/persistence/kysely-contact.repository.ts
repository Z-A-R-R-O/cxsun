import { randomUUID } from "node:crypto";
import { Injectable, type OnModuleDestroy } from "@nestjs/common";
import { createDatabaseConnection, loadDatabaseEnv, type DatabaseConnection } from "@cxnext/db";
import type {
  ContactRepository,
  NormalizedContactUpsertParams,
} from "../../application/services/contact.repository";
import type {
  ContactAddressRecord,
  ContactBankAccountRecord,
  ContactEmailRecord,
  ContactGstDetailRecord,
  ContactPhoneRecord,
  ContactRecord,
  ContactSocialLinkRecord,
} from "../../domain/contact-record";

type DateValue = Date | string;

interface ContactBaseRow {
  readonly id: number;
  readonly uuid: string;
  readonly code: string;
  readonly contact_type_id: string | null;
  readonly ledger_id: string | null;
  readonly ledger_name: string | null;
  readonly name: string;
  readonly legal_name: string | null;
  readonly pan: string | null;
  readonly gstin: string | null;
  readonly msme_type: string | null;
  readonly msme_no: string | null;
  readonly tan: string | null;
  readonly tds_available: boolean | number;
  readonly tcs_available: boolean | number;
  readonly opening_balance: string | number;
  readonly balance_type: string | null;
  readonly credit_limit: string | number;
  readonly website: string | null;
  readonly description: string | null;
  readonly primary_email: string | null;
  readonly primary_phone: string | null;
  readonly is_active: boolean | number;
  readonly created_at: DateValue;
  readonly updated_at: DateValue;
  readonly deleted_at: DateValue | null;
}

@Injectable()
export class KyselyContactRepository implements ContactRepository, OnModuleDestroy {
  private readonly connection: DatabaseConnection;

  public constructor() {
    this.connection = createDatabaseConnection(loadDatabaseEnv().env);
  }

  public async onModuleDestroy(): Promise<void> {
    await this.connection.destroy();
  }

  public async list(): Promise<readonly ContactRecord[]> {
    const rows = await this.selectContactBase()
      .where("contacts.deleted_at", "is", null)
      .orderBy("contacts.name", "asc")
      .execute();

    return Promise.all(rows.map((row) => this.toContactRecord(row)));
  }

  public async getById(contactId: string): Promise<ContactRecord | null> {
    const numericContactId = Number(contactId);

    if (!Number.isInteger(numericContactId)) {
      return null;
    }

    const row = await this.selectContactBase()
      .where("contacts.id", "=", numericContactId)
      .where("contacts.deleted_at", "is", null)
      .executeTakeFirst();

    if (!row) {
      return null;
    }

    return this.toContactRecord(row);
  }

  public async create(params: NormalizedContactUpsertParams): Promise<ContactRecord> {
    const now = new Date();
    const { primaryEmail, primaryPhone } = getPrimaryFields(params);
    const result = await this.connection.db
      .insertInto("contacts")
      .values(toContactValues(params, now, primaryEmail, primaryPhone))
      .executeTakeFirstOrThrow();
    const contactId = Number(result.insertId);

    await this.replaceChildRecords(contactId, params, now);

    const contact = await this.getById(String(contactId));

    if (!contact) {
      throw new Error("Contact was created but could not be read back.");
    }

    return contact;
  }

  public async update(
    contactId: string,
    params: NormalizedContactUpsertParams,
  ): Promise<ContactRecord | null> {
    const numericContactId = Number(contactId);

    if (!Number.isInteger(numericContactId)) {
      return null;
    }

    const { primaryEmail, primaryPhone } = getPrimaryFields(params);

    await this.connection.db
      .updateTable("contacts")
      .set({
        code: params.code,
        contact_type_id: params.contactTypeId,
        ledger_id: params.ledgerId,
        ledger_name: params.ledgerName,
        name: params.name.trim(),
        legal_name: params.legalName,
        pan: params.pan,
        gstin: params.gstin,
        msme_type: params.msmeType,
        msme_no: params.msmeNo,
        tan: params.tan,
        tds_available: params.tdsAvailable,
        tcs_available: params.tcsAvailable,
        opening_balance: params.openingBalance,
        balance_type: params.balanceType,
        credit_limit: params.creditLimit,
        website: params.website,
        description: params.description,
        primary_email: primaryEmail,
        primary_phone: primaryPhone,
        is_active: params.isActive,
        updated_at: new Date(),
      })
      .where("id", "=", numericContactId)
      .where("deleted_at", "is", null)
      .executeTakeFirst();

    await this.replaceChildRecords(numericContactId, params, new Date());

    return this.getById(contactId);
  }

  public async softDelete(contactId: string): Promise<boolean> {
    const numericContactId = Number(contactId);

    if (!Number.isInteger(numericContactId)) {
      return false;
    }

    const result = await this.connection.db
      .updateTable("contacts")
      .set({
        deleted_at: new Date(),
        updated_at: new Date(),
      })
      .where("id", "=", numericContactId)
      .where("deleted_at", "is", null)
      .executeTakeFirst();

    return Number(result.numUpdatedRows) > 0;
  }

  private selectContactBase() {
    return this.connection.db
      .selectFrom("contacts")
      .select([
        "contacts.id",
        "contacts.uuid",
        "contacts.code",
        "contacts.contact_type_id",
        "contacts.ledger_id",
        "contacts.ledger_name",
        "contacts.name",
        "contacts.legal_name",
        "contacts.pan",
        "contacts.gstin",
        "contacts.msme_type",
        "contacts.msme_no",
        "contacts.tan",
        "contacts.tds_available",
        "contacts.tcs_available",
        "contacts.opening_balance",
        "contacts.balance_type",
        "contacts.credit_limit",
        "contacts.website",
        "contacts.description",
        "contacts.primary_email",
        "contacts.primary_phone",
        "contacts.is_active",
        "contacts.created_at",
        "contacts.updated_at",
        "contacts.deleted_at",
      ]);
  }

  private async toContactRecord(row: ContactBaseRow): Promise<ContactRecord> {
    const contactId = Number(row.id);
    const [addresses, emails, phones, socialLinks, bankAccounts, gstDetails] = await Promise.all([
      this.listAddresses(contactId),
      this.listEmails(contactId),
      this.listPhones(contactId),
      this.listSocialLinks(contactId),
      this.listBankAccounts(contactId),
      this.listGstDetails(contactId),
    ]);

    return {
      id: String(row.id),
      uuid: row.uuid,
      code: row.code,
      contactTypeId: row.contact_type_id,
      ledgerId: row.ledger_id,
      ledgerName: row.ledger_name,
      name: row.name,
      legalName: row.legal_name,
      pan: row.pan,
      gstin: row.gstin,
      msmeType: row.msme_type,
      msmeNo: row.msme_no,
      tan: row.tan,
      tdsAvailable: Boolean(row.tds_available),
      tcsAvailable: Boolean(row.tcs_available),
      openingBalance: Number(row.opening_balance),
      balanceType: row.balance_type,
      creditLimit: Number(row.credit_limit),
      website: row.website,
      description: row.description,
      primaryEmail: row.primary_email,
      primaryPhone: row.primary_phone,
      isActive: Boolean(row.is_active),
      createdAt: toDate(row.created_at),
      updatedAt: toDate(row.updated_at),
      deletedAt: row.deleted_at ? toDate(row.deleted_at) : null,
      addresses,
      emails,
      phones,
      socialLinks,
      bankAccounts,
      gstDetails,
    };
  }

  private async replaceChildRecords(
    contactId: number,
    params: NormalizedContactUpsertParams,
    timestamp: Date,
  ) {
    await Promise.all([
      this.connection.db
        .deleteFrom("address_book")
        .where("owner_type", "=", "contact")
        .where("owner_id", "=", contactId)
        .execute(),
      this.connection.db.deleteFrom("contact_emails").where("contact_id", "=", contactId).execute(),
      this.connection.db.deleteFrom("contact_phones").where("contact_id", "=", contactId).execute(),
      this.connection.db
        .deleteFrom("contact_social_links")
        .where("contact_id", "=", contactId)
        .execute(),
      this.connection.db
        .deleteFrom("contact_bank_accounts")
        .where("contact_id", "=", contactId)
        .execute(),
      this.connection.db
        .deleteFrom("contact_gst_details")
        .where("contact_id", "=", contactId)
        .execute(),
    ]);

    await Promise.all([
      insertIfAny(
        params.addresses,
        this.connection.db.insertInto("address_book").values(
          params.addresses.map((item) => ({
            owner_type: "contact",
            owner_id: contactId,
            address_type_id: item.addressTypeId,
            address_line1: item.addressLine1,
            address_line2: item.addressLine2,
            city_id: item.cityId,
            district_id: item.districtId,
            state_id: item.stateId,
            country_id: item.countryId,
            pincode_id: item.pincodeId,
            latitude: item.latitude,
            longitude: item.longitude,
            is_default: item.isDefault,
            is_active: item.isActive,
            created_at: timestamp,
            updated_at: timestamp,
          })),
        ),
      ),
      insertIfAny(
        params.emails,
        this.connection.db.insertInto("contact_emails").values(
          params.emails.map((item) => ({
            contact_id: contactId,
            email: item.email,
            email_type: item.emailType,
            is_primary: item.isPrimary,
            is_active: item.isActive,
            created_at: timestamp,
            updated_at: timestamp,
          })),
        ),
      ),
      insertIfAny(
        params.phones,
        this.connection.db.insertInto("contact_phones").values(
          params.phones.map((item) => ({
            contact_id: contactId,
            phone_number: item.phoneNumber,
            phone_type: item.phoneType,
            is_primary: item.isPrimary,
            is_active: item.isActive,
            created_at: timestamp,
            updated_at: timestamp,
          })),
        ),
      ),
      insertIfAny(
        params.socialLinks,
        this.connection.db.insertInto("contact_social_links").values(
          params.socialLinks.map((item) => ({
            contact_id: contactId,
            platform: item.platform,
            url: item.url,
            is_active: item.isActive,
            created_at: timestamp,
            updated_at: timestamp,
          })),
        ),
      ),
      insertIfAny(
        params.bankAccounts,
        this.connection.db.insertInto("contact_bank_accounts").values(
          params.bankAccounts.map((item) => ({
            contact_id: contactId,
            bank_name: item.bankName,
            account_number: item.accountNumber,
            account_holder_name: item.accountHolderName,
            ifsc: item.ifsc,
            branch: item.branch,
            is_primary: item.isPrimary,
            is_active: item.isActive,
            created_at: timestamp,
            updated_at: timestamp,
          })),
        ),
      ),
      insertIfAny(
        params.gstDetails,
        this.connection.db.insertInto("contact_gst_details").values(
          params.gstDetails.map((item) => ({
            contact_id: contactId,
            gstin: item.gstin,
            state: item.state,
            is_default: item.isDefault,
            is_active: item.isActive,
            created_at: timestamp,
            updated_at: timestamp,
          })),
        ),
      ),
    ]);
  }

  private async listAddresses(contactId: number): Promise<readonly ContactAddressRecord[]> {
    const rows = await this.connection.db
      .selectFrom("address_book")
      .selectAll()
      .where("owner_type", "=", "contact")
      .where("owner_id", "=", contactId)
      .orderBy("id", "asc")
      .execute();

    return rows.map((row) => ({
      id: String(row.id),
      contactId: String(row.owner_id),
      addressTypeId: row.address_type_id,
      addressLine1: row.address_line1,
      addressLine2: row.address_line2,
      cityId: row.city_id,
      districtId: row.district_id,
      stateId: row.state_id,
      countryId: row.country_id,
      pincodeId: row.pincode_id,
      latitude: row.latitude === null ? null : Number(row.latitude),
      longitude: row.longitude === null ? null : Number(row.longitude),
      isDefault: Boolean(row.is_default),
      isActive: Boolean(row.is_active),
    }));
  }

  private async listEmails(contactId: number): Promise<readonly ContactEmailRecord[]> {
    const rows = await this.connection.db
      .selectFrom("contact_emails")
      .selectAll()
      .where("contact_id", "=", contactId)
      .orderBy("id", "asc")
      .execute();

    return rows.map((row) => ({
      id: String(row.id),
      contactId: String(row.contact_id),
      email: row.email,
      emailType: row.email_type,
      isPrimary: Boolean(row.is_primary),
      isActive: Boolean(row.is_active),
    }));
  }

  private async listPhones(contactId: number): Promise<readonly ContactPhoneRecord[]> {
    const rows = await this.connection.db
      .selectFrom("contact_phones")
      .selectAll()
      .where("contact_id", "=", contactId)
      .orderBy("id", "asc")
      .execute();

    return rows.map((row) => ({
      id: String(row.id),
      contactId: String(row.contact_id),
      phoneNumber: row.phone_number,
      phoneType: row.phone_type,
      isPrimary: Boolean(row.is_primary),
      isActive: Boolean(row.is_active),
    }));
  }

  private async listBankAccounts(contactId: number): Promise<readonly ContactBankAccountRecord[]> {
    const rows = await this.connection.db
      .selectFrom("contact_bank_accounts")
      .selectAll()
      .where("contact_id", "=", contactId)
      .orderBy("id", "asc")
      .execute();

    return rows.map((row) => ({
      id: String(row.id),
      contactId: String(row.contact_id),
      bankName: row.bank_name,
      accountNumber: row.account_number,
      accountHolderName: row.account_holder_name,
      ifsc: row.ifsc,
      branch: row.branch,
      isPrimary: Boolean(row.is_primary),
      isActive: Boolean(row.is_active),
    }));
  }

  private async listSocialLinks(contactId: number): Promise<readonly ContactSocialLinkRecord[]> {
    const rows = await this.connection.db
      .selectFrom("contact_social_links")
      .selectAll()
      .where("contact_id", "=", contactId)
      .orderBy("id", "asc")
      .execute();

    return rows.map((row) => ({
      id: String(row.id),
      contactId: String(row.contact_id),
      platform: row.platform,
      url: row.url,
      isActive: Boolean(row.is_active),
    }));
  }

  private async listGstDetails(contactId: number): Promise<readonly ContactGstDetailRecord[]> {
    const rows = await this.connection.db
      .selectFrom("contact_gst_details")
      .selectAll()
      .where("contact_id", "=", contactId)
      .orderBy("id", "asc")
      .execute();

    return rows.map((row) => ({
      id: String(row.id),
      contactId: String(row.contact_id),
      gstin: row.gstin,
      state: row.state,
      isDefault: Boolean(row.is_default),
      isActive: Boolean(row.is_active),
    }));
  }
}

async function insertIfAny<T>(records: readonly T[], query: { execute(): Promise<unknown> }) {
  if (records.length > 0) {
    await query.execute();
  }
}

function toContactValues(
  params: NormalizedContactUpsertParams,
  timestamp: Date,
  primaryEmail: string | null,
  primaryPhone: string | null,
) {
  return {
    uuid: randomUUID(),
    code: params.code,
    contact_type_id: params.contactTypeId,
    ledger_id: params.ledgerId,
    ledger_name: params.ledgerName,
    name: params.name.trim(),
    legal_name: params.legalName,
    pan: params.pan,
    gstin: params.gstin,
    msme_type: params.msmeType,
    msme_no: params.msmeNo,
    tan: params.tan,
    tds_available: params.tdsAvailable,
    tcs_available: params.tcsAvailable,
    opening_balance: params.openingBalance,
    balance_type: params.balanceType,
    credit_limit: params.creditLimit,
    website: params.website,
    description: params.description,
    primary_email: primaryEmail,
    primary_phone: primaryPhone,
    is_active: params.isActive,
    created_at: timestamp,
    updated_at: timestamp,
    deleted_at: null,
  };
}

function getPrimaryFields(params: NormalizedContactUpsertParams) {
  return {
    primaryEmail: params.emails.find((item) => item.isPrimary)?.email ?? null,
    primaryPhone: params.phones.find((item) => item.isPrimary)?.phoneNumber ?? null,
  };
}

function toDate(value: DateValue): Date {
  return value instanceof Date ? value : new Date(value);
}
