import { DomainEvent } from "@cxnext/core";
import type { ContactChangedPayload } from "./contact-created.event";

export class ContactUpdatedEvent extends DomainEvent<ContactChangedPayload> {
  public constructor(aggregateId: string, payload: ContactChangedPayload) {
    super("contacts.contact-updated", aggregateId, payload);
  }
}
