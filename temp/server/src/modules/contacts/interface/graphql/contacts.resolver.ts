import { Inject } from "@nestjs/common";
import { Query, Resolver } from "@nestjs/graphql";
import { ListContactsUseCase } from "../../application/use-cases/list-contacts.use-case";
import { ContactModel } from "./contact.model";

@Resolver(() => ContactModel)
export class ContactsResolver {
  public constructor(
    @Inject(ListContactsUseCase)
    private readonly listContactsUseCase: ListContactsUseCase,
  ) {}

  @Query(() => [ContactModel])
  public async contacts(): Promise<ContactModel[]> {
    const contacts = await this.listContactsUseCase.execute();

    return contacts.map((contact) => ({
      id: contact.id,
      code: contact.code,
      name: contact.name,
      contactTypeId: contact.contactTypeId,
      ledgerId: contact.ledgerId,
      isActive: contact.isActive,
    }));
  }
}
