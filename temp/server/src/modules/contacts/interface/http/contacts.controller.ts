import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  NotFoundException,
  Param,
  Patch,
  Post,
} from "@nestjs/common";
import { RequirePermissions } from "../../../auth/interface/http/auth-context";
import { modulePermission } from "../../../auth/interface/http/module-permissions";
import { CreateContactUseCase } from "../../application/use-cases/create-contact.use-case";
import { DeleteContactUseCase } from "../../application/use-cases/delete-contact.use-case";
import { GetContactUseCase } from "../../application/use-cases/get-contact.use-case";
import { ListContactsUseCase } from "../../application/use-cases/list-contacts.use-case";
import { UpdateContactUseCase } from "../../application/use-cases/update-contact.use-case";
import type { ContactUpsertParams } from "../../application/services/contact.repository";
import { toContactResponse } from "./contact-response";

@Controller("contacts")
export class ContactsController {
  public constructor(
    @Inject(ListContactsUseCase)
    private readonly listContactsUseCase: ListContactsUseCase,
    @Inject(GetContactUseCase)
    private readonly getContactUseCase: GetContactUseCase,
    @Inject(CreateContactUseCase)
    private readonly createContactUseCase: CreateContactUseCase,
    @Inject(UpdateContactUseCase)
    private readonly updateContactUseCase: UpdateContactUseCase,
    @Inject(DeleteContactUseCase)
    private readonly deleteContactUseCase: DeleteContactUseCase,
  ) {}

  @Get()
  @RequirePermissions(modulePermission("contact", "read"))
  public async list() {
    const contacts = await this.listContactsUseCase.execute();
    return contacts.map((contact) => toContactResponse(contact));
  }

  @Get(":contactId")
  @RequirePermissions(modulePermission("contact", "read"))
  public async getById(@Param("contactId") contactId: string) {
    const contact = await this.getContactUseCase.execute(contactId);

    if (!contact) {
      throw new NotFoundException(`Contact "${contactId}" was not found.`);
    }

    return toContactResponse(contact);
  }

  @Post()
  @RequirePermissions(modulePermission("contact", "create"))
  public async create(@Body() body: ContactUpsertParams) {
    const contact = await this.createContactUseCase.execute(parseContactRequest(body));
    return toContactResponse(contact);
  }

  @Patch(":contactId")
  @RequirePermissions(modulePermission("contact", "update"))
  public async update(@Param("contactId") contactId: string, @Body() body: ContactUpsertParams) {
    const contact = await this.updateContactUseCase.execute(contactId, parseContactRequest(body));

    if (!contact) {
      throw new NotFoundException(`Contact "${contactId}" was not found.`);
    }

    return toContactResponse(contact);
  }

  @Delete(":contactId")
  @RequirePermissions(modulePermission("contact", "delete"))
  public async softDelete(@Param("contactId") contactId: string) {
    const wasDeleted = await this.deleteContactUseCase.execute(contactId);

    if (!wasDeleted) {
      throw new NotFoundException(`Contact "${contactId}" was not found.`);
    }

    return { deleted: true };
  }
}

function parseContactRequest(body: ContactUpsertParams): ContactUpsertParams {
  return {
    code: toOptionalString(body.code),
    contactTypeId: toOptionalString(body.contactTypeId),
    ledgerId: toOptionalString(body.ledgerId),
    ledgerName: toOptionalString(body.ledgerName),
    name: typeof body.name === "string" ? body.name : "",
    legalName: toOptionalString(body.legalName),
    pan: toOptionalString(body.pan),
    gstin: toOptionalString(body.gstin),
    msmeType: toOptionalString(body.msmeType),
    msmeNo: toOptionalString(body.msmeNo),
    tan: toOptionalString(body.tan),
    tdsAvailable: body.tdsAvailable === true,
    tcsAvailable: body.tcsAvailable === true,
    openingBalance: Number(body.openingBalance ?? 0),
    balanceType: toOptionalString(body.balanceType),
    creditLimit: Number(body.creditLimit ?? 0),
    website: toOptionalString(body.website),
    description: toOptionalString(body.description),
    isActive: body.isActive ?? true,
    addresses: Array.isArray(body.addresses) ? body.addresses : [],
    emails: Array.isArray(body.emails) ? body.emails : [],
    phones: Array.isArray(body.phones) ? body.phones : [],
    socialLinks: Array.isArray(body.socialLinks) ? body.socialLinks : [],
    bankAccounts: Array.isArray(body.bankAccounts) ? body.bankAccounts : [],
    gstDetails: Array.isArray(body.gstDetails) ? body.gstDetails : [],
  };
}

function toOptionalString(value: unknown) {
  return typeof value === "string" ? value : null;
}
