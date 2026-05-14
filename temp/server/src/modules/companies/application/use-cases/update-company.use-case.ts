import { Inject, Injectable } from "@nestjs/common";
import {
  COMPANY_REPOSITORY,
  type CompanyRepository,
  type CompanyUpsertParams,
} from "../services/company.repository";
import {
  DOMAIN_EVENT_PUBLISHER,
  type DomainEventPublisher,
} from "../services/domain-event-publisher";
import { CompanyAggregate } from "../../domain/aggregates/company.aggregate";

@Injectable()
export class UpdateCompanyUseCase {
  public constructor(
    @Inject(COMPANY_REPOSITORY)
    private readonly companyRepository: CompanyRepository,
    @Inject(DOMAIN_EVENT_PUBLISHER)
    private readonly domainEventPublisher: DomainEventPublisher,
  ) {}

  public async execute(companyId: string, params: CompanyUpsertParams) {
    const company = await this.companyRepository.update(companyId, params);

    if (!company) {
      return null;
    }

    await this.domainEventPublisher.publishAll([
      CompanyAggregate.fromRecord(company).updatedEvent(),
    ]);

    return company;
  }
}
