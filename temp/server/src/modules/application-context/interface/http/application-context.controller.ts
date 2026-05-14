import {
  Body,
  Controller,
  Get,
  Inject,
  NotFoundException,
  Param,
  Patch,
} from "@nestjs/common";
import { RequirePermissions } from "../../../auth/interface/http/auth-context";
import { modulePermission } from "../../../auth/interface/http/module-permissions";
import {
  GetDefaultCompanyContextUseCase,
  GetDefaultCompanyRecordUseCase,
  UpdateDefaultCompanyUseCase,
} from "../../application/use-cases/get-default-company-context.use-case";

interface DefaultCompanyUpdateRequest {
  readonly tenantId?: unknown;
  readonly industryId?: unknown;
  readonly companyId?: unknown;
  readonly accountingYearId?: unknown;
}

@Controller("application")
export class ApplicationContextController {
  public constructor(
    @Inject(GetDefaultCompanyContextUseCase)
    private readonly getDefaultCompanyContextUseCase: GetDefaultCompanyContextUseCase,
    @Inject(GetDefaultCompanyRecordUseCase)
    private readonly getDefaultCompanyRecordUseCase: GetDefaultCompanyRecordUseCase,
    @Inject(UpdateDefaultCompanyUseCase)
    private readonly updateDefaultCompanyUseCase: UpdateDefaultCompanyUseCase,
  ) {}

  @Get("default-company")
  @RequirePermissions(modulePermission("company", "read"))
  public async getDefaultCompany() {
    const context = await this.getDefaultCompanyContextUseCase.execute();

    if (!context) {
      throw new NotFoundException("Default company context was not configured.");
    }

    return context;
  }

  @Get("default-companies")
  @RequirePermissions(modulePermission("company", "read"))
  public async listDefaultCompanies() {
    const record = await this.getDefaultCompanyRecordUseCase.execute();
    return record ? [toDefaultCompanyResponse(record)] : [];
  }

  @Patch("default-company")
  @RequirePermissions(modulePermission("company", "update"))
  public async updateDefaultCompany(@Body() body: DefaultCompanyUpdateRequest) {
    const record = await this.updateDefaultCompanyUseCase.execute({
      tenantId: Number(body.tenantId),
      industryId: Number(body.industryId),
      companyId: Number(body.companyId),
      accountingYearId: Number(body.accountingYearId),
    });
    return toDefaultCompanyResponse(record);
  }
}

function toDefaultCompanyResponse(record: {
  readonly id: string;
  readonly tenant: unknown;
  readonly industry: unknown;
  readonly company: unknown;
  readonly accountingYear: unknown;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}) {
  return {
    ...record,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}
