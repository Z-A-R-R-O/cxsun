import type { CompanyRecord } from "../company-record";
import { CompanyCreatedEvent } from "../events/company-created.event";
import { CompanyDeletedEvent } from "../events/company-deleted.event";
import { CompanyUpdatedEvent } from "../events/company-updated.event";
import { CompanyEntity } from "../entities/company.entity";

export class CompanyAggregate {
  private constructor(private readonly company: CompanyEntity) {}

  public static fromRecord(record: CompanyRecord): CompanyAggregate {
    return new CompanyAggregate(CompanyEntity.fromRecord(record));
  }

  public createdEvent(): CompanyCreatedEvent {
    return new CompanyCreatedEvent(this.company.id, this.payload());
  }

  public updatedEvent(): CompanyUpdatedEvent {
    return new CompanyUpdatedEvent(this.company.id, this.payload());
  }

  public static deletedEvent(companyId: string): CompanyDeletedEvent {
    return new CompanyDeletedEvent(companyId, { id: companyId });
  }

  private payload() {
    return {
      id: this.company.id,
      code: this.company.code,
      name: this.company.name,
      tenantId: this.company.tenantId,
      industryId: this.company.industryId,
      isActive: this.company.isActive,
    };
  }
}
