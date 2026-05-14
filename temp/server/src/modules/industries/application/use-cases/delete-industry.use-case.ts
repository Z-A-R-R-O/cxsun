import { Inject, Injectable } from "@nestjs/common";
import { INDUSTRY_REPOSITORY, type IndustryRepository } from "../services/industry.repository";
import {
  DOMAIN_EVENT_PUBLISHER,
  type DomainEventPublisher,
} from "../services/domain-event-publisher";
import { IndustryAggregate } from "../../domain/aggregates/industry.aggregate";

@Injectable()
export class DeleteIndustryUseCase {
  public constructor(
    @Inject(INDUSTRY_REPOSITORY)
    private readonly industryRepository: IndustryRepository,
    @Inject(DOMAIN_EVENT_PUBLISHER)
    private readonly domainEventPublisher: DomainEventPublisher,
  ) {}

  public async execute(industryId: string) {
    const deleted = await this.industryRepository.softDelete(industryId);

    if (deleted) {
      await this.domainEventPublisher.publishAll([IndustryAggregate.deletedEvent(industryId)]);
    }

    return deleted;
  }
}
