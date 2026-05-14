import { BadRequestException, Body, Controller, Get, Param, Patch, Query } from "@nestjs/common";
import { RequirePermissions } from "../../../auth/interface/http/auth-context";
import { entryPermission } from "../../../auth/interface/http/module-permissions";
import { DocumentNumberService } from "../../application/document-number.service";
import type {
  DocumentEntryKind,
  DocumentNumberSettingInput,
} from "../../domain/document-number-record";

@Controller("document-settings")
export class DocumentSettingsController {
  public constructor(private readonly documentNumberService: DocumentNumberService) {}

  @Get("numbers")
  @RequirePermissions(entryPermission("read"))
  public async list(@Query() query: Record<string, unknown>) {
    return this.documentNumberService.list(parseContext(query));
  }

  @Patch("numbers")
  @RequirePermissions(entryPermission("update"))
  public async update(
    @Query() query: Record<string, unknown>,
    @Body() body: { readonly settings?: readonly DocumentNumberSettingInput[] },
  ) {
    return this.documentNumberService.updateMany(parseContext(query), body.settings ?? []);
  }

  @Get("numbers/:kind/next")
  @RequirePermissions(entryPermission("read"))
  public async next(
    @Param("kind") kind: DocumentEntryKind,
    @Query() query: Record<string, unknown>,
  ) {
    return this.documentNumberService.nextPreview(kind, parseContext(query));
  }
}

function parseContext(source: Record<string, unknown>) {
  const companyId = textValue(source.companyId);
  const accountingYearId = textValue(source.accountingYearId);
  if (!companyId || !accountingYearId) {
    throw new BadRequestException("Company and accounting year context are required.");
  }
  return { companyId, accountingYearId };
}

function textValue(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return null;
  const trimmed = value.trim();
  return Number.isInteger(Number(trimmed)) && Number(trimmed) > 0 ? trimmed : null;
}
