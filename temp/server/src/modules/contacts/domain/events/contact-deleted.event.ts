import { DomainEvent } from "@cxnext/core";

export class ContactDeletedEvent extends DomainEvent<{ readonly id: string }> {
  public constructor(aggregateId: string, payload: { readonly id: string }) {
    super("contacts.contact-deleted", aggregateId, payload);
  }
}
