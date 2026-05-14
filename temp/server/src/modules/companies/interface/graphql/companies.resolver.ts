import { Inject } from "@nestjs/common";
import { Args, Query, Resolver } from "@nestjs/graphql";
import type { CompanyRecord } from "../../domain/company-record";
import { GetCompanyUseCase } from "../../application/use-cases/get-company.use-case";
import { ListCompaniesUseCase } from "../../application/use-cases/list-companies.use-case";
import { CompanyModel } from "./company.model";

@Resolver(() => CompanyModel)
export class CompaniesResolver {
  public constructor(
    @Inject(ListCompaniesUseCase)
    private readonly listCompaniesUseCase: ListCompaniesUseCase,
    @Inject(GetCompanyUseCase)
    private readonly getCompanyUseCase: GetCompanyUseCase,
  ) {}

  @Query(() => [CompanyModel], { name: "companies" })
  public async listCompanies(): Promise<CompanyModel[]> {
    const companies = await this.listCompaniesUseCase.execute();
    return companies.map((company) => toCompanyModel(company));
  }

  @Query(() => CompanyModel, { name: "company", nullable: true })
  public async getCompany(
    @Args("companyId", { type: () => String }) companyId: string,
  ): Promise<CompanyModel | null> {
    const company = await this.getCompanyUseCase.execute(companyId);
    return company ? toCompanyModel(company) : null;
  }
}

function toCompanyModel(company: CompanyRecord): CompanyModel {
  return {
    id: company.id,
    tenantId: company.tenantId,
    tenantName: company.tenantName,
    industryId: company.industryId,
    industryCode: company.industryCode,
    industryName: company.industryName,
    code: company.code,
    name: company.name,
    legalName: company.legalName,
    tagline: company.tagline,
    shortAbout: company.shortAbout,
    gstinUin: company.gstinUin,
    pan: company.pan,
    dateOfIncorporation: company.dateOfIncorporation,
    msmeNo: company.msmeNo,
    msmeCategory: company.msmeCategory,
    tan: company.tan,
    tdsAvailable: company.tdsAvailable,
    tdsSection: company.tdsSection,
    tdsRatePercent: company.tdsRatePercent,
    tcsAvailable: company.tcsAvailable,
    tcsSection: company.tcsSection,
    tcsRatePercent: company.tcsRatePercent,
    primaryEmail: company.primaryEmail,
    primaryPhone: company.primaryPhone,
    isPrimary: company.isPrimary,
    isActive: company.isActive,
    createdAt: company.createdAt.toISOString(),
    updatedAt: company.updatedAt.toISOString(),
    deletedAt: company.deletedAt ? company.deletedAt.toISOString() : null,
  };
}
