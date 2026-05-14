import { Inject, Injectable } from "@nestjs/common";
import {
  COMMON_DOMAIN_EVENT_PUBLISHER,
  type DomainEventPublisher,
} from "../../services/domain-event-publisher";
import {
  COMMON_MASTER_REPOSITORY,
  type CommonMasterRepository,
} from "../../services/common-master.repository";
import { CommonMasterRecordDeletedEvent } from "../../../domain/events/common-master-record-deleted.event";
import type { CommonMasterModuleKey } from "../../../domain/value-objects/common-master-definition";

@Injectable()
export class DeleteCommonMasterRecordUseCase {
  public constructor(
    @Inject(COMMON_MASTER_REPOSITORY)
    private readonly commonMasterRepository: CommonMasterRepository,
    @Inject(COMMON_DOMAIN_EVENT_PUBLISHER)
    private readonly domainEventPublisher: DomainEventPublisher,
  ) {}

  public async execute(moduleKey: CommonMasterModuleKey, id: string, force = false) {
    const wasDeleted = force
      ? await this.commonMasterRepository.forceDelete(moduleKey, id)
      : await this.commonMasterRepository.softDelete(moduleKey, id);

    if (wasDeleted) {
      await this.domainEventPublisher.publishAll([
        new CommonMasterRecordDeletedEvent(id, { moduleKey, force }),
      ]);
    }

    return wasDeleted;
  }
}
