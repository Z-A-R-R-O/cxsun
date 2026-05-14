import { Inject, Injectable } from "@nestjs/common";
import {
  COMMON_DOMAIN_EVENT_PUBLISHER,
  type DomainEventPublisher,
} from "../../services/domain-event-publisher";
import {
  COMMON_MASTER_REPOSITORY,
  type CommonMasterRepository,
} from "../../services/common-master.repository";
import type { CommonMasterUpsertParams } from "../../../domain/entities/common-master-record";
import { CommonMasterRecordUpdatedEvent } from "../../../domain/events/common-master-record-updated.event";
import type { CommonMasterModuleKey } from "../../../domain/value-objects/common-master-definition";

@Injectable()
export class UpdateCommonMasterRecordUseCase {
  public constructor(
    @Inject(COMMON_MASTER_REPOSITORY)
    private readonly commonMasterRepository: CommonMasterRepository,
    @Inject(COMMON_DOMAIN_EVENT_PUBLISHER)
    private readonly domainEventPublisher: DomainEventPublisher,
  ) {}

  public async execute(
    moduleKey: CommonMasterModuleKey,
    id: string,
    params: CommonMasterUpsertParams,
  ) {
    const record = await this.commonMasterRepository.update(moduleKey, id, params);

    if (record) {
      await this.domainEventPublisher.publishAll([
        new CommonMasterRecordUpdatedEvent(String(record.id), {
          moduleKey,
          code: record.code,
          name: record.name,
          isActive: record.isActive,
        }),
      ]);
    }

    return record;
  }
}
