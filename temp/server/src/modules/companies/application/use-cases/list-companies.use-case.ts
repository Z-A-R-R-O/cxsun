import { Inject, Injectable } from "@nestjs/common";
import { COMPANY_REPOSITORY, type CompanyRepository } from "../services/company.repository";

@Injectable()
export class ListCompaniesUseCase {
  public constructor(
    @Inject(COMPANY_REPOSITORY) private readonly companyRepository: CompanyRepository,
  ) {}

  public execute() {
    return this.companyRepository.list();
  }
}
