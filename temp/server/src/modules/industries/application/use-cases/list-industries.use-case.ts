import { Inject, Injectable } from "@nestjs/common";
import { INDUSTRY_REPOSITORY, type IndustryRepository } from "../services/industry.repository";

@Injectable()
export class ListIndustriesUseCase {
  public constructor(
    @Inject(INDUSTRY_REPOSITORY) private readonly industryRepository: IndustryRepository,
  ) {}

  public execute() {
    return this.industryRepository.list();
  }
}
