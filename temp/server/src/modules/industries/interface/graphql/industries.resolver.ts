import { Inject } from "@nestjs/common";
import { Args, Query, Resolver } from "@nestjs/graphql";
import type { IndustryRecord } from "../../domain/industry-record";
import { GetIndustryUseCase } from "../../application/use-cases/get-industry.use-case";
import { ListIndustriesUseCase } from "../../application/use-cases/list-industries.use-case";
import { IndustryModel } from "./industry.model";

@Resolver(() => IndustryModel)
export class IndustriesResolver {
  public constructor(
    @Inject(ListIndustriesUseCase)
    private readonly listIndustriesUseCase: ListIndustriesUseCase,
    @Inject(GetIndustryUseCase)
    private readonly getIndustryUseCase: GetIndustryUseCase,
  ) {}

  @Query(() => [IndustryModel], { name: "industries" })
  public async listIndustries(): Promise<IndustryModel[]> {
    const industries = await this.listIndustriesUseCase.execute();
    return industries.map((industry) => toIndustryModel(industry));
  }

  @Query(() => IndustryModel, { name: "industry", nullable: true })
  public async getIndustry(
    @Args("industryId", { type: () => String }) industryId: string,
  ): Promise<IndustryModel | null> {
    const industry = await this.getIndustryUseCase.execute(industryId);
    return industry ? toIndustryModel(industry) : null;
  }
}

function toIndustryModel(industry: IndustryRecord): IndustryModel {
  return {
    id: industry.id,
    code: industry.code,
    name: industry.name,
    isActive: industry.isActive,
    createdAt: industry.createdAt.toISOString(),
    updatedAt: industry.updatedAt.toISOString(),
    deletedAt: industry.deletedAt ? industry.deletedAt.toISOString() : null,
  };
}
