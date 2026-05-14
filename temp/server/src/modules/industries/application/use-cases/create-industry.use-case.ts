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
export class CreateIndustryUseCase {
  public constructor(
    @Inject(INDUSTRY_REPOSITORY)
    private readonly industryRepository: IndustryRepository,
    @Inject(DOMAIN_EVENT_PUBLISHER)
    private readonly domainEventPublisher: DomainEventPublisher,
  ) {}

  public async execute(params: IndustryUpsertParams) {
    const industry = await this.industryRepository.create(params);

    await this.domainEventPublisher.publishAll([
      IndustryAggregate.fromRecord(industry).createdEvent(),
    ]);

    return industry;
  }
}
