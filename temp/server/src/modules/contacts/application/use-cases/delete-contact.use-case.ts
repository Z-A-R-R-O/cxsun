import { Inject, Injectable } from "@nestjs/common";
import { ContactAggregate } from "../../domain/aggregates/contact.aggregate";
import { CONTACT_REPOSITORY, type ContactRepository } from "../services/contact.repository";
import {
  DOMAIN_EVENT_PUBLISHER,
  type DomainEventPublisher,
} from "../services/domain-event-publisher";

@Injectable()
export class DeleteContactUseCase {
  public constructor(
    @Inject(CONTACT_REPOSITORY)
    private readonly contactRepository: ContactRepository,
    @Inject(DOMAIN_EVENT_PUBLISHER)
    private readonly domainEventPublisher: DomainEventPublisher,
  ) {}

  public async execute(contactId: string) {
    const wasDeleted = await this.contactRepository.softDelete(contactId);

    if (wasDeleted) {
      await this.domainEventPublisher.publishAll([ContactAggregate.deletedEvent(contactId)]);
    }

    return wasDeleted;
  }
}
