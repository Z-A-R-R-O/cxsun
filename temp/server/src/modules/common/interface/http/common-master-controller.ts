import { Body, Delete, Inject, NotFoundException, Param, Patch, Post, Query } from "@nestjs/common";
import { RequirePermissions } from "../../../auth/interface/http/auth-context";
import { modulePermission } from "../../../auth/interface/http/module-permissions";
import type { CommonMasterUpsertParams } from "../../domain/entities/common-master-record";
import type { CommonMasterModuleKey } from "../../domain/value-objects/common-master-definition";
import { getCommonMasterDefinition } from "../../domain/value-objects/common-master-definition";
import { CreateCommonMasterRecordUseCase } from "../../application/use-cases/contact-masters/create-common-master-record.use-case";
import { DeleteCommonMasterRecordUseCase } from "../../application/use-cases/contact-masters/delete-common-master-record.use-case";
import { GetCommonMasterRecordUseCase } from "../../application/use-cases/contact-masters/get-common-master-record.use-case";
import { ListCommonMasterRecordsUseCase } from "../../application/use-cases/contact-masters/list-common-master-records.use-case";
import { UpdateCommonMasterRecordUseCase } from "../../application/use-cases/contact-masters/update-common-master-record.use-case";

export interface CommonMasterUpsertRequest {
  readonly code?: unknown;
  readonly name?: unknown;
  readonly description?: unknown;
  readonly image?: unknown;
  readonly positionOrder?: unknown;
  readonly position_order?: unknown;
  readonly sortOrder?: unknown;
  readonly sort_order?: unknown;
  readonly hexCode?: unknown;
  readonly hex_code?: unknown;
  readonly symbol?: unknown;
  readonly taxType?: unknown;
  readonly tax_type?: unknown;
  readonly ratePercent?: unknown;
  readonly rate_percent?: unknown;
  readonly isDefaultLocation?: unknown;
  readonly is_default_location?: unknown;
  readonly country?: unknown;
  readonly state?: unknown;
  readonly district?: unknown;
  readonly city?: unknown;
  readonly pincode?: unknown;
  readonly addressLine1?: unknown;
  readonly address_line1?: unknown;
  readonly addressLine2?: unknown;
  readonly address_line2?: unknown;
  readonly decimalPlaces?: unknown;
  readonly decimal_places?: unknown;
  readonly dueDays?: unknown;
  readonly due_days?: unknown;
  readonly startDate?: unknown;
  readonly start_date?: unknown;
  readonly endDate?: unknown;
  readonly end_date?: unknown;
  readonly booksStart?: unknown;
  readonly books_start?: unknown;
  readonly showOnStorefrontTopMenu?: unknown;
  readonly show_on_storefront_top_menu?: unknown;
  readonly showOnStorefrontCatalog?: unknown;
  readonly show_on_storefront_catalog?: unknown;
  readonly isActive?: unknown;
}

export abstract class CommonMasterControllerBase {
  protected constructor(
    private readonly moduleKey: CommonMasterModuleKey,
    @Inject(ListCommonMasterRecordsUseCase)
    private readonly listCommonMasterRecordsUseCase: ListCommonMasterRecordsUseCase,
    @Inject(GetCommonMasterRecordUseCase)
    private readonly getCommonMasterRecordUseCase: GetCommonMasterRecordUseCase,
    @Inject(CreateCommonMasterRecordUseCase)
    private readonly createCommonMasterRecordUseCase: CreateCommonMasterRecordUseCase,
    @Inject(UpdateCommonMasterRecordUseCase)
    private readonly updateCommonMasterRecordUseCase: UpdateCommonMasterRecordUseCase,
    @Inject(DeleteCommonMasterRecordUseCase)
    private readonly deleteCommonMasterRecordUseCase: DeleteCommonMasterRecordUseCase,
  ) {}

  protected listRecords() {
    return this.listCommonMasterRecordsUseCase.execute(this.moduleKey);
  }

  protected async getRecord(id: string) {
    const record = await this.getCommonMasterRecordUseCase.execute(this.moduleKey, id);
    if (!record) {
      throw new NotFoundException(
        `${getCommonMasterDefinition(this.moduleKey).label} "${id}" was not found.`,
      );
    }
    return record;
  }

  @Post()
  @RequirePermissions(modulePermission("common", "create"))
  public create(@Body() body: CommonMasterUpsertRequest) {
    return this.createCommonMasterRecordUseCase.execute(
      this.moduleKey,
      parseCommonMasterRequest(body),
    );
  }

  @Patch(":id")
  @RequirePermissions(modulePermission("common", "update"))
  public async update(@Param("id") id: string, @Body() body: CommonMasterUpsertRequest) {
    const record = await this.updateCommonMasterRecordUseCase.execute(
      this.moduleKey,
      id,
      parseCommonMasterRequest(body),
    );

    if (!record) {
      throw new NotFoundException(
        `${getCommonMasterDefinition(this.moduleKey).label} "${id}" was not found.`,
      );
    }

    return record;
  }

  @Delete(":id")
  @RequirePermissions(modulePermission("common", "delete"))
  public async delete(@Param("id") id: string, @Query("force") force?: string) {
    const isForceDelete = force === "true";
    const wasDeleted = await this.deleteCommonMasterRecordUseCase.execute(
      this.moduleKey,
      id,
      isForceDelete,
    );

    if (!wasDeleted) {
      throw new NotFoundException(
        `${getCommonMasterDefinition(this.moduleKey).label} "${id}" was not found.`,
      );
    }

    return { deleted: true, force: isForceDelete };
  }
}

function parseCommonMasterRequest(body: CommonMasterUpsertRequest): CommonMasterUpsertParams {
  return {
    code: toNullableStringValue(body.code),
    name: toNullableStringValue(body.name),
    description: toNullableStringValue(body.description),
    image: toNullableStringValue(body.image),
    positionOrder: toNumberValue(body.positionOrder ?? body.position_order),
    sortOrder: toNumberValue(body.sortOrder ?? body.sort_order),
    hexCode: toNullableStringValue(body.hexCode ?? body.hex_code),
    symbol: toNullableStringValue(body.symbol),
    taxType: toNullableStringValue(body.taxType ?? body.tax_type),
    ratePercent: toNumberValue(body.ratePercent ?? body.rate_percent),
    isDefaultLocation: toBooleanValue(body.isDefaultLocation ?? body.is_default_location),
    country: toNullableStringValue(body.country),
    state: toNullableStringValue(body.state),
    district: toNullableStringValue(body.district),
    city: toNullableStringValue(body.city),
    pincode: toNullableStringValue(body.pincode),
    addressLine1: toNullableStringValue(body.addressLine1 ?? body.address_line1),
    addressLine2: toNullableStringValue(body.addressLine2 ?? body.address_line2),
    decimalPlaces: toNumberValue(body.decimalPlaces ?? body.decimal_places),
    dueDays: toNumberValue(body.dueDays ?? body.due_days),
    startDate: toNullableStringValue(body.startDate ?? body.start_date),
    endDate: toNullableStringValue(body.endDate ?? body.end_date),
    booksStart: toNullableStringValue(body.booksStart ?? body.books_start),
    showOnStorefrontTopMenu: toBooleanValue(
      body.showOnStorefrontTopMenu ?? body.show_on_storefront_top_menu,
    ),
    showOnStorefrontCatalog: toBooleanValue(
      body.showOnStorefrontCatalog ?? body.show_on_storefront_catalog,
    ),
    isActive: body.isActive === undefined ? true : Boolean(body.isActive),
  };
}

function toNullableStringValue(value: unknown) {
  if (typeof value !== "string") return null;
  return value.trim() || null;
}

function toNumberValue(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  return Number(value);
}

function toBooleanValue(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  return Boolean(value);
}
