import { Module } from "@nestjs/common";
import { CreateContactUseCase } from "./application/use-cases/create-contact.use-case";
import { DeleteContactUseCase } from "./application/use-cases/delete-contact.use-case";
import { GetContactUseCase } from "./application/use-cases/get-contact.use-case";
import { ListContactsUseCase } from "./application/use-cases/list-contacts.use-case";
import { UpdateContactUseCase } from "./application/use-cases/update-contact.use-case";
import { ContactsRegistryBootstrap } from "./contacts.registry";
import { contactProviders } from "./infrastructure/contacts.providers";
import { ContactsResolver } from "./interface/graphql/contacts.resolver";
import { ContactsController } from "./interface/http/contacts.controller";

@Module({
  controllers: [ContactsController],
  providers: [
    ContactsRegistryBootstrap,
    ListContactsUseCase,
    GetContactUseCase,
    CreateContactUseCase,
    UpdateContactUseCase,
    DeleteContactUseCase,
    ContactsResolver,
    ...contactProviders,
  ],
})
export class ContactsModule {}
