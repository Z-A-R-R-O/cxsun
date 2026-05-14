import { Body, Delete, Inject, NotFoundException, Param, Patch, Post } from "@nestjs/common";
import { RequirePermissions } from "../../../auth/interface/http/auth-context";
import { modulePermission } from "../../../auth/interface/http/module-permissions";
import type { CommonLocationUpsertParams } from "../../domain/entities/common-location-record";
import type { CommonLocationModuleKey } from "../../domain/value-objects/common-location-definition";
import { getCommonLocationDefinition } from "../../domain/value-objects/common-location-definition";
import { CreateCommonLocationRecordUseCase } from "../../application/use-cases/location/create-common-location-record.use-case";
import { DeleteCommonLocationRecordUseCase } from "../../application/use-cases/location/delete-common-location-record.use-case";
import { GetCommonLocationRecordUseCase } from "../../application/use-cases/location/get-common-location-record.use-case";
import { ListCommonLocationRecordsUseCase } from "../../application/use-cases/location/list-common-location-records.use-case";
import { UpdateCommonLocationRecordUseCase } from "../../application/use-cases/location/update-common-location-record.use-case";

export interface CommonLocationUpsertRequest {
  readonly countryId?: unknown;
  readonly stateId?: unknown;
  readonly districtId?: unknown;
  readonly cityId?: unknown;
  readonly code?: unknown;
  readonly name?: unknown;
  readonly phoneCode?: unknown;
  readonly areaName?: unknown;
  readonly isActive?: unknown;
}

export abstract class CommonLocationControllerBase {
  protected constructor(
    private readonly moduleKey: CommonLocationModuleKey,
    @Inject(ListCommonLocationRecordsUseCase)
    private readonly listCommonLocationRecordsUseCase: ListCommonLocationRecordsUseCase,
    @Inject(GetCommonLocationRecordUseCase)
    private readonly getCommonLocationRecordUseCase: GetCommonLocationRecordUseCase,
    @Inject(CreateCommonLocationRecordUseCase)
    private readonly createCommonLocationRecordUseCase: CreateCommonLocationRecordUseCase,
    @Inject(UpdateCommonLocationRecordUseCase)
    private readonly updateCommonLocationRecordUseCase: UpdateCommonLocationRecordUseCase,
    @Inject(DeleteCommonLocationRecordUseCase)
    private readonly deleteCommonLocationRecordUseCase: DeleteCommonLocationRecordUseCase,
  ) {}

  protected listRecords() {
    return this.listCommonLocationRecordsUseCase.execute(this.moduleKey);
  }

  protected async getRecord(id: string) {
    const record = await this.getCommonLocationRecordUseCase.execute(this.moduleKey, id);
    if (!record) {
      throw new NotFoundException(
        `${getCommonLocationDefinition(this.moduleKey).label} "${id}" was not found.`,
      );
    }
    return record;
  }

  @Post()
  @RequirePermissions(modulePermission("common", "create"))
  public create(@Body() body: CommonLocationUpsertRequest) {
    return this.createCommonLocationRecordUseCase.execute(
      this.moduleKey,
      parseCommonLocationRequest(body),
    );
  }

  @Patch(":id")
  @RequirePermissions(modulePermission("common", "update"))
  public async update(@Param("id") id: string, @Body() body: CommonLocationUpsertRequest) {
    const record = await this.updateCommonLocationRecordUseCase.execute(
      this.moduleKey,
      id,
      parseCommonLocationRequest(body),
    );

    if (!record) {
      throw new NotFoundException(
        `${getCommonLocationDefinition(this.moduleKey).label} "${id}" was not found.`,
      );
    }

    return record;
  }

  @Delete(":id")
  @RequirePermissions(modulePermission("common", "delete"))
  public async softDelete(@Param("id") id: string) {
    const wasDeleted = await this.deleteCommonLocationRecordUseCase.execute(this.moduleKey, id);

    if (!wasDeleted) {
      throw new NotFoundException(
        `${getCommonLocationDefinition(this.moduleKey).label} "${id}" was not found.`,
      );
    }

    return { deleted: true };
  }
}

function parseCommonLocationRequest(body: CommonLocationUpsertRequest): CommonLocationUpsertParams {
  return {
    countryId: toNullableNumberValue(body.countryId),
    stateId: toNullableNumberValue(body.stateId),
    districtId: toNullableNumberValue(body.districtId),
    cityId: toNullableNumberValue(body.cityId),
    code: toStringValue(body.code),
    name: toNullableStringValue(body.name),
    phoneCode: toNullableStringValue(body.phoneCode),
    areaName: toNullableStringValue(body.areaName),
    isActive: body.isActive === undefined ? true : Boolean(body.isActive),
  };
}

function toStringValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function toNullableStringValue(value: unknown) {
  if (typeof value !== "string") return null;
  return value.trim() || null;
}

function toNullableNumberValue(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  return Number(value);
}
