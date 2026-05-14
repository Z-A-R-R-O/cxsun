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
export class CreateContactUseCase {
  public constructor(
    @Inject(CONTACT_REPOSITORY)
    private readonly contactRepository: ContactRepository,
    @Inject(DOMAIN_EVENT_PUBLISHER)
    private readonly domainEventPublisher: DomainEventPublisher,
  ) {}

  public async execute(params: ContactUpsertParams) {
    const contacts = await this.contactRepository.list();
    const normalizedParams = normalizeContactUpsert(params, contacts);

    assertContactCanBeSaved(contacts, normalizedParams);

    const contact = await this.contactRepository.create(normalizedParams);

    await this.domainEventPublisher.publishAll([
      ContactAggregate.fromRecord(contact).createdEvent(),
    ]);

    return contact;
  }
}
