import { Inject, Injectable } from "@nestjs/common";
import { ContactAggregate } from "../../domain/aggregates/contact.aggregate";
import {
  CONTACT_REPOSITORY,
  type ContactRepository,
  type ContactUpsertParams,
} from "../services/contact.repository";
import {
  DOMAIN_EVENT_PUBLISHER,
  type DomainEventPublisher,
} from "../services/domain-event-publisher";
import { assertContactCanBeSaved, normalizeContactUpsert } from "./contact-upsert-normalizer";

@Injectable()
export class UpdateContactUseCase {
  public constructor(
    @Inject(CONTACT_REPOSITORY)
    private readonly contactRepository: ContactRepository,
    @Inject(DOMAIN_EVENT_PUBLISHER)
    private readonly domainEventPublisher: DomainEventPublisher,
  ) {}

  public async execute(contactId: string, params: ContactUpsertParams) {
    const contacts = await this.contactRepository.list();
    const existing = contacts.find((contact) => contact.id === contactId) ?? null;

    if (!existing) {
      return null;
    }

    const normalizedParams = normalizeContactUpsert(params, contacts, existing);
    assertContactCanBeSaved(contacts, normalizedParams, contactId);

    const contact = await this.contactRepository.update(contactId, normalizedParams);

    if (contact) {
      await this.domainEventPublisher.publishAll([
        ContactAggregate.fromRecord(contact).updatedEvent(),
      ]);
    }

    return contact;
  }
}
