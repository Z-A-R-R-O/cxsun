import { Inject, Injectable } from "@nestjs/common";
import {
  INDUSTRY_REPOSITORY,
  type IndustryRepository,
  type IndustryUpsertParams,
} from "../services/industry.repository";
import {
  DOMAIN_EVENT_PUBLISHER,
  type DomainEventPublisher,
} from "../services/domain-event-publisher";
import { IndustryAggregate } from "../../domain/aggregates/industry.aggregate";

@Injectable()
export class UpdateIndustryUseCase {
  public constructor(
    @Inject(INDUSTRY_REPOSITORY)
    private readonly industryRepository: IndustryRepository,
    @Inject(DOMAIN_EVENT_PUBLISHER)
    private readonly domainEventPublisher: DomainEventPublisher,
  ) {}

  public async execute(industryId: string, params: IndustryUpsertParams) {
    const industry = await this.industryRepository.update(industryId, params);

    if (!industry) {
      return null;
    }

    await this.domainEventPublisher.publishAll([
      IndustryAggregate.fromRecord(industry).updatedEvent(),
    ]);

    return industry;
  }
}
