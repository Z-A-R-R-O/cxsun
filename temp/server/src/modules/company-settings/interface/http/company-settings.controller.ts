import { BadRequestException, Body, Controller, Get, Param, Patch, Query } from "@nestjs/common";
import { RequirePermissions } from "../../../auth/interface/http/auth-context";
import { modulePermission } from "../../../auth/interface/http/module-permissions";
import { CompanySettingsService } from "../../application/company-settings.service";
import {
  companySettingKeys,
  type CompanySettingInput,
  type CompanySettingKey,
} from "../../domain/company-setting-record";

@Controller("company-settings")
export class CompanySettingsController {
  public constructor(private readonly companySettingsService: CompanySettingsService) {}

  @Get(":key")
  @RequirePermissions(modulePermission("company", "read"))
  public async get(@Param("key") key: string, @Query() query: Record<string, unknown>) {
    return this.companySettingsService.get(parseContext(query), parseKey(key));
  }

  @Patch(":key")
  @RequirePermissions(modulePermission("company", "update"))
  public async save(
    @Param("key") key: string,
    @Query() query: Record<string, unknown>,
    @Body() body: CompanySettingInput,
  ) {
    return this.companySettingsService.save(parseContext(query), parseKey(key), body);
  }
}

function parseContext(source: Record<string, unknown>) {
  const companyId = textValue(source.companyId);
  if (!companyId) {
    throw new BadRequestException("Company context is required.");
  }
  return { companyId };
}

function parseKey(value: string): CompanySettingKey {
  if (companySettingKeys.includes(value as CompanySettingKey)) {
    return value as CompanySettingKey;
  }
  throw new BadRequestException("Unsupported company setting key.");
}

function textValue(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return null;
  const trimmed = value.trim();
  return Number.isInteger(Number(trimmed)) && Number(trimmed) > 0 ? trimmed : null;
}
