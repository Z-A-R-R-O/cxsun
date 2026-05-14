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
import { CommonLocationRecordCreatedEvent } from "../../../domain/events/common-location-record-created.event";
import type { CommonLocationModuleKey } from "../../../domain/value-objects/common-location-definition";

@Injectable()
export class CreateCommonLocationRecordUseCase {
  public constructor(
    @Inject(COMMON_LOCATION_REPOSITORY)
    private readonly commonLocationRepository: CommonLocationRepository,
    @Inject(COMMON_DOMAIN_EVENT_PUBLISHER)
    private readonly domainEventPublisher: DomainEventPublisher,
  ) {}

  public async execute(moduleKey: CommonLocationModuleKey, params: CommonLocationUpsertParams) {
    const record = await this.commonLocationRepository.create(moduleKey, params);

    await this.domainEventPublisher.publishAll([
      new CommonLocationRecordCreatedEvent(String(record.id), {
        moduleKey,
        code: record.code,
        name: record.name ?? null,
        isActive: record.isActive,
      }),
    ]);

    return record;
  }
}
