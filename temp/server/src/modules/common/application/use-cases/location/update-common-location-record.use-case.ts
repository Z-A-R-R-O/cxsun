import { Inject, Injectable } from "@nestjs/common";
import {
  COMMON_DOMAIN_EVENT_PUBLISHER,
  type DomainEventPublisher,
} from "../../services/domain-event-publisher";
import {
  COMMON_LOCATION_REPOSITORY,
  type CommonLocationRepository,
} from "../../services/common-location.repository";
import type { CommonLocationUpsertParams } from "../../../domain/entities/common-location-record";
import { CommonLocationRecordUpdatedEvent } from "../../../domain/events/common-location-record-updated.event";
import type { CommonLocationModuleKey } from "../../../domain/value-objects/common-location-definition";

@Injectable()
export class UpdateCommonLocationRecordUseCase {
  public constructor(
    @Inject(COMMON_LOCATION_REPOSITORY)
    private readonly commonLocationRepository: CommonLocationRepository,
    @Inject(COMMON_DOMAIN_EVENT_PUBLISHER)
    private readonly domainEventPublisher: DomainEventPublisher,
  ) {}

  public async execute(
    moduleKey: CommonLocationModuleKey,
    id: string,
    params: CommonLocationUpsertParams,
  ) {
    const record = await this.commonLocationRepository.update(moduleKey, id, params);

    if (record) {
      await this.domainEventPublisher.publishAll([
        new CommonLocationRecordUpdatedEvent(String(record.id), {
          moduleKey,
          code: record.code,
          name: record.name ?? null,
          isActive: record.isActive,
        }),
      ]);
    }

    return record;
  }
}
