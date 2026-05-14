import type { IndustryRecord } from "../industry-record";
import { IndustryEntity } from "../entities/industry.entity";
import { IndustryCreatedEvent } from "../events/industry-created.event";
import { IndustryDeletedEvent } from "../events/industry-deleted.event";
import { IndustryUpdatedEvent } from "../events/industry-updated.event";

export class IndustryAggregate {
  private constructor(private readonly industry: IndustryEntity) {}

  public static fromRecord(record: IndustryRecord): IndustryAggregate {
    return new IndustryAggregate(IndustryEntity.fromRecord(record));
  }

  public createdEvent(): IndustryCreatedEvent {
    return new IndustryCreatedEvent(this.industry.id, this.payload());
  }

  public updatedEvent(): IndustryUpdatedEvent {
    return new IndustryUpdatedEvent(this.industry.id, this.payload());
  }

  public static deletedEvent(industryId: string): IndustryDeletedEvent {
    return new IndustryDeletedEvent(industryId, { id: industryId });
  }

  private payload() {
    return {
      id: this.industry.id,
      code: this.industry.code,
      name: this.industry.name,
      isActive: this.industry.isActive,
    };
  }
}
