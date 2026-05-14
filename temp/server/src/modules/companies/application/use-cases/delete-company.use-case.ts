import { Inject, Injectable } from "@nestjs/common";
import { COMPANY_REPOSITORY, type CompanyRepository } from "../services/company.repository";
import {
  DOMAIN_EVENT_PUBLISHER,
  type DomainEventPublisher,
} from "../services/domain-event-publisher";
import { CompanyAggregate } from "../../domain/aggregates/company.aggregate";

@Injectable()
export class DeleteCompanyUseCase {
  public constructor(
    @Inject(COMPANY_REPOSITORY)
    private readonly companyRepository: CompanyRepository,
    @Inject(DOMAIN_EVENT_PUBLISHER)
    private readonly domainEventPublisher: DomainEventPublisher,
  ) {}

  public async execute(companyId: string) {
    const deleted = await this.companyRepository.softDelete(companyId);

    if (deleted) {
      await this.domainEventPublisher.publishAll([CompanyAggregate.deletedEvent(companyId)]);
    }

    return deleted;
  }
}
