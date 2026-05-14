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
import { CreateTenantUseCase } from "../../application/use-cases/create-tenant.use-case";
import { DeleteTenantUseCase } from "../../application/use-cases/delete-tenant.use-case";
import { GetTenantUseCase } from "../../application/use-cases/get-tenant.use-case";
import { ListTenantsUseCase } from "../../application/use-cases/list-tenants.use-case";
import { UpdateTenantUseCase } from "../../application/use-cases/update-tenant.use-case";
import { toTenantResponse } from "./tenant-response";

interface TenantUpsertRequest {
  readonly name?: unknown;
  readonly slug?: unknown;
  readonly isActive?: unknown;
}

@Controller("tenants")
export class TenantsController {
  public constructor(
    @Inject(ListTenantsUseCase)
    private readonly listTenantsUseCase: ListTenantsUseCase,
    @Inject(GetTenantUseCase)
    private readonly getTenantUseCase: GetTenantUseCase,
    @Inject(CreateTenantUseCase)
    private readonly createTenantUseCase: CreateTenantUseCase,
    @Inject(UpdateTenantUseCase)
    private readonly updateTenantUseCase: UpdateTenantUseCase,
    @Inject(DeleteTenantUseCase)
    private readonly deleteTenantUseCase: DeleteTenantUseCase,
  ) {}

  @Get()
  @RequirePermissions(modulePermission("tenant", "read"))
  public async list() {
    const tenants = await this.listTenantsUseCase.execute();
    return tenants.map((tenant) => toTenantResponse(tenant));
  }

  @Get(":tenantId")
  @RequirePermissions(modulePermission("tenant", "read"))
  public async getById(@Param("tenantId") tenantId: string) {
    const tenant = await this.getTenantUseCase.execute(tenantId);

    if (!tenant) {
      throw new NotFoundException(`Tenant "${tenantId}" was not found.`);
    }

    return toTenantResponse(tenant);
  }

  @Post()
  @RequirePermissions(modulePermission("tenant", "create"))
  public async create(@Body() body: TenantUpsertRequest) {
    const tenant = await this.createTenantUseCase.execute(parseTenantRequest(body));
    return toTenantResponse(tenant);
  }

  @Patch(":tenantId")
  @RequirePermissions(modulePermission("tenant", "update"))
  public async update(@Param("tenantId") tenantId: string, @Body() body: TenantUpsertRequest) {
    const tenant = await this.updateTenantUseCase.execute(tenantId, parseTenantRequest(body));

    if (!tenant) {
      throw new NotFoundException(`Tenant "${tenantId}" was not found.`);
    }

    return toTenantResponse(tenant);
  }

  @Delete(":tenantId")
  @RequirePermissions(modulePermission("tenant", "delete"))
  public async softDelete(@Param("tenantId") tenantId: string) {
    const wasDeleted = await this.deleteTenantUseCase.execute(tenantId);

    if (!wasDeleted) {
      throw new NotFoundException(`Tenant "${tenantId}" was not found.`);
    }

    return { deleted: true };
  }
}

function parseTenantRequest(body: TenantUpsertRequest) {
  return {
    name: typeof body.name === "string" ? body.name : "",
    slug: typeof body.slug === "string" ? body.slug : "",
    isActive: Boolean(body.isActive),
  };
}
