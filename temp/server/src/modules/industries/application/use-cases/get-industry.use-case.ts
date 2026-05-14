import { Inject, Injectable } from "@nestjs/common";
import { INDUSTRY_REPOSITORY, type IndustryRepository } from "../services/industry.repository";

@Injectable()
export class GetIndustryUseCase {
  public constructor(
    @Inject(INDUSTRY_REPOSITORY) private readonly industryRepository: IndustryRepository,
  ) {}

  public execute(industryId: string) {
    return this.industryRepository.getById(industryId);
  }
}
