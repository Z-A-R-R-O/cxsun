import { Inject, Injectable } from "@nestjs/common";
import { COMPANY_REPOSITORY, type CompanyRepository } from "../services/company.repository";

@Injectable()
export class GetCompanyUseCase {
  public constructor(
    @Inject(COMPANY_REPOSITORY) private readonly companyRepository: CompanyRepository,
  ) {}

  public execute(companyId: string) {
    return this.companyRepository.getById(companyId);
  }
}
