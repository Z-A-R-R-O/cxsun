import { DomainEvent } from "@cxnext/core";

export type ContactChangedPayload = Record<string, unknown> & {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly contactTypeId: string | null;
  readonly ledgerId: string | null;
  readonly isActive: boolean;
};

export class ContactCreatedEvent extends DomainEvent<ContactChangedPayload> {
  public constructor(aggregateId: string, payload: ContactChangedPayload) {
    super("contacts.contact-created", aggregateId, payload);
  }
}
