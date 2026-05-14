import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  NotFoundException,
  Param,
  Patch,
  Post,
} from "@nestjs/common";
import { RequirePermissions } from "../../../auth/interface/http/auth-context";
import { modulePermission } from "../../../auth/interface/http/module-permissions";
import { CreateIndustryUseCase } from "../../application/use-cases/create-industry.use-case";
import { DeleteIndustryUseCase } from "../../application/use-cases/delete-industry.use-case";
import { GetIndustryUseCase } from "../../application/use-cases/get-industry.use-case";
import { ListIndustriesUseCase } from "../../application/use-cases/list-industries.use-case";
import { UpdateIndustryUseCase } from "../../application/use-cases/update-industry.use-case";
import { toIndustryResponse } from "./industry-response";

interface IndustryUpsertRequest {
  readonly code?: unknown;
  readonly name?: unknown;
  readonly isActive?: unknown;
}

@Controller("industries")
export class IndustriesController {
  public constructor(
    @Inject(ListIndustriesUseCase)
    private readonly listIndustriesUseCase: ListIndustriesUseCase,
    @Inject(GetIndustryUseCase)
    private readonly getIndustryUseCase: GetIndustryUseCase,
    @Inject(CreateIndustryUseCase)
    private readonly createIndustryUseCase: CreateIndustryUseCase,
    @Inject(UpdateIndustryUseCase)
    private readonly updateIndustryUseCase: UpdateIndustryUseCase,
    @Inject(DeleteIndustryUseCase)
    private readonly deleteIndustryUseCase: DeleteIndustryUseCase,
  ) {}

  @Get()
  @RequirePermissions(modulePermission("industry", "read"))
  public async list() {
    const industries = await this.listIndustriesUseCase.execute();
    return industries.map((industry) => toIndustryResponse(industry));
  }

  @Get(":industryId")
  @RequirePermissions(modulePermission("industry", "read"))
  public async getById(@Param("industryId") industryId: string) {
    const industry = await this.getIndustryUseCase.execute(industryId);

    if (!industry) {
      throw new NotFoundException(`Industry "${industryId}" was not found.`);
    }

    return toIndustryResponse(industry);
  }

  @Post()
  @RequirePermissions(modulePermission("industry", "create"))
  public async create(@Body() body: IndustryUpsertRequest) {
    const industry = await this.createIndustryUseCase.execute(parseIndustryRequest(body));
    return toIndustryResponse(industry);
  }

  @Patch(":industryId")
  @RequirePermissions(modulePermission("industry", "update"))
  public async update(
    @Param("industryId") industryId: string,
    @Body() body: IndustryUpsertRequest,
  ) {
    const industry = await this.updateIndustryUseCase.execute(
      industryId,
      parseIndustryRequest(body),
    );

    if (!industry) {
      throw new NotFoundException(`Industry "${industryId}" was not found.`);
    }

    return toIndustryResponse(industry);
  }

  @Delete(":industryId")
  @RequirePermissions(modulePermission("industry", "delete"))
  public async softDelete(@Param("industryId") industryId: string) {
    const wasDeleted = await this.deleteIndustryUseCase.execute(industryId);

    if (!wasDeleted) {
      throw new NotFoundException(`Industry "${industryId}" was not found.`);
    }

    return { deleted: true };
  }
}

function parseIndustryRequest(body: IndustryUpsertRequest) {
  return {
    code: typeof body.code === "string" ? body.code : "",
    name: typeof body.name === "string" ? body.name : "",
    isActive: Boolean(body.isActive),
  };
}
