import type { ContactRecord } from "../contact-record";
import { ContactEntity } from "../entities/contact.entity";
import { ContactCreatedEvent } from "../events/contact-created.event";
import { ContactDeletedEvent } from "../events/contact-deleted.event";
import { ContactUpdatedEvent } from "../events/contact-updated.event";

export class ContactAggregate {
  private constructor(private readonly contact: ContactEntity) {}

  public static fromRecord(record: ContactRecord): ContactAggregate {
    return new ContactAggregate(ContactEntity.fromRecord(record));
  }

  public createdEvent(): ContactCreatedEvent {
    return new ContactCreatedEvent(this.contact.id, this.payload());
  }

  public updatedEvent(): ContactUpdatedEvent {
    return new ContactUpdatedEvent(this.contact.id, this.payload());
  }

  public static deletedEvent(contactId: string): ContactDeletedEvent {
    return new ContactDeletedEvent(contactId, { id: contactId });
  }

  private payload() {
    return {
      id: this.contact.id,
      code: this.contact.code,
      name: this.contact.name,
      contactTypeId: this.contact.contactTypeId,
      ledgerId: this.contact.ledgerId,
      isActive: this.contact.isActive,
    };
  }
}
