import { Inject, Injectable } from "@nestjs/common";
import {
  COMMON_DOMAIN_EVENT_PUBLISHER,
  type DomainEventPublisher,
} from "../../services/domain-event-publisher";
import {
  COMMON_LOCATION_REPOSITORY,
  type CommonLocationRepository,
} from "../../services/common-location.repository";
import { CommonLocationRecordDeletedEvent } from "../../../domain/events/common-location-record-deleted.event";
import type { CommonLocationModuleKey } from "../../../domain/value-objects/common-location-definition";

@Injectable()
export class DeleteCommonLocationRecordUseCase {
  public constructor(
    @Inject(COMMON_LOCATION_REPOSITORY)
    private readonly commonLocationRepository: CommonLocationRepository,
    @Inject(COMMON_DOMAIN_EVENT_PUBLISHER)
    private readonly domainEventPublisher: DomainEventPublisher,
  ) {}

  public async execute(moduleKey: CommonLocationModuleKey, id: string) {
    const wasDeleted = await this.commonLocationRepository.softDelete(moduleKey, id);

    if (wasDeleted) {
      await this.domainEventPublisher.publishAll([
        new CommonLocationRecordDeletedEvent(id, { moduleKey }),
      ]);
    }

    return wasDeleted;
  }
}
