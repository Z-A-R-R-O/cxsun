import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import { RequirePermissions } from "../../../auth/interface/http/auth-context";
import { entryPermission } from "../../../auth/interface/http/module-permissions";
import type { BillingEntryKind, MoneyEntryKind } from "../../domain/entry-record";
import { CreateBillingEntryUseCase } from "../../application/use-cases/create-billing-entry.use-case";
import { CreateMoneyEntryUseCase } from "../../application/use-cases/create-money-entry.use-case";
import { DeleteBillingEntryUseCase } from "../../application/use-cases/delete-billing-entry.use-case";
import { DeleteMoneyEntryUseCase } from "../../application/use-cases/delete-money-entry.use-case";
import { GetBillingEntryUseCase } from "../../application/use-cases/get-billing-entry.use-case";
import { GetMoneyEntryUseCase } from "../../application/use-cases/get-money-entry.use-case";
import { ListBillingEntriesUseCase } from "../../application/use-cases/list-billing-entries.use-case";
import { ListMoneyEntriesUseCase } from "../../application/use-cases/list-money-entries.use-case";
import { UpdateBillingEntryUseCase } from "../../application/use-cases/update-billing-entry.use-case";
import { UpdateMoneyEntryUseCase } from "../../application/use-cases/update-money-entry.use-case";
import type {
  BillingEntryInput,
  EntryContextCriteria,
  MoneyEntryInput,
} from "../../application/services/entries.repository";
import { toBillingEntryResponse, toMoneyEntryResponse } from "./entry-response";

@Controller("entries")
export class EntriesController {
  public constructor(
    @Inject(ListBillingEntriesUseCase)
    private readonly listBillingUseCase: ListBillingEntriesUseCase,
    @Inject(GetBillingEntryUseCase) private readonly getBillingUseCase: GetBillingEntryUseCase,
    @Inject(CreateBillingEntryUseCase)
    private readonly createBillingUseCase: CreateBillingEntryUseCase,
    @Inject(UpdateBillingEntryUseCase)
    private readonly updateBillingUseCase: UpdateBillingEntryUseCase,
    @Inject(DeleteBillingEntryUseCase)
    private readonly deleteBillingUseCase: DeleteBillingEntryUseCase,
    @Inject(ListMoneyEntriesUseCase) private readonly listMoneyUseCase: ListMoneyEntriesUseCase,
    @Inject(GetMoneyEntryUseCase) private readonly getMoneyUseCase: GetMoneyEntryUseCase,
    @Inject(CreateMoneyEntryUseCase) private readonly createMoneyUseCase: CreateMoneyEntryUseCase,
    @Inject(UpdateMoneyEntryUseCase) private readonly updateMoneyUseCase: UpdateMoneyEntryUseCase,
    @Inject(DeleteMoneyEntryUseCase) private readonly deleteMoneyUseCase: DeleteMoneyEntryUseCase,
  ) {}

  @Get(":kind")
  @RequirePermissions(entryPermission("read"))
  public async list(@Param("kind") kind: string, @Query() query: Record<string, unknown>) {
    const context = parseContext(query);
    if (isBillingKind(kind)) {
      return (await this.listBillingUseCase.execute(kind, context)).map(toBillingEntryResponse);
    }
    if (isMoneyKind(kind)) {
      return (await this.listMoneyUseCase.execute(kind, context)).map(toMoneyEntryResponse);
    }
    throw new NotFoundException(`Entry kind "${kind}" was not found.`);
  }

  @Get(":kind/:entryId")
  @RequirePermissions(entryPermission("read"))
  public async getById(
    @Param("kind") kind: string,
    @Param("entryId") entryId: string,
    @Query() query: Record<string, unknown>,
  ) {
    const context = parseContext(query);
    if (isBillingKind(kind)) {
      const entry = await this.getBillingUseCase.execute(kind, entryId, context);
      if (!entry) throw new NotFoundException(`Entry "${entryId}" was not found.`);
      return toBillingEntryResponse(entry);
    }
    if (isMoneyKind(kind)) {
      const entry = await this.getMoneyUseCase.execute(kind, entryId, context);
      if (!entry) throw new NotFoundException(`Entry "${entryId}" was not found.`);
      return toMoneyEntryResponse(entry);
    }
    throw new NotFoundException(`Entry kind "${kind}" was not found.`);
  }

  @Post(":kind")
  @RequirePermissions(entryPermission("create"))
  public async create(
    @Param("kind") kind: string,
    @Body() body: BillingEntryInput | MoneyEntryInput,
  ) {
    parseContext(body as unknown as Record<string, unknown>);
    if (isBillingKind(kind)) {
      return toBillingEntryResponse(
        await this.createBillingUseCase.execute(kind, body as BillingEntryInput),
      );
    }
    if (isMoneyKind(kind)) {
      return toMoneyEntryResponse(
        await this.createMoneyUseCase.execute(kind, body as MoneyEntryInput),
      );
    }
    throw new NotFoundException(`Entry kind "${kind}" was not found.`);
  }

  @Patch(":kind/:entryId")
  @RequirePermissions(entryPermission("update"))
  public async update(
    @Param("kind") kind: string,
    @Param("entryId") entryId: string,
    @Body() body: BillingEntryInput | MoneyEntryInput,
  ) {
    parseContext(body as unknown as Record<string, unknown>);
    if (isBillingKind(kind)) {
      const entry = await this.updateBillingUseCase.execute(
        kind,
        entryId,
        body as BillingEntryInput,
      );
      if (!entry) throw new NotFoundException(`Entry "${entryId}" was not found.`);
      return toBillingEntryResponse(entry);
    }
    if (isMoneyKind(kind)) {
      const entry = await this.updateMoneyUseCase.execute(kind, entryId, body as MoneyEntryInput);
      if (!entry) throw new NotFoundException(`Entry "${entryId}" was not found.`);
      return toMoneyEntryResponse(entry);
    }
    throw new NotFoundException(`Entry kind "${kind}" was not found.`);
  }

  @Delete(":kind/:entryId")
  @RequirePermissions(entryPermission("delete"))
  public async softDelete(
    @Param("kind") kind: string,
    @Param("entryId") entryId: string,
    @Query() query: Record<string, unknown>,
  ) {
    const context = parseContext(query);
    const wasDeleted = isBillingKind(kind)
      ? await this.deleteBillingUseCase.execute(kind, entryId, context)
      : isMoneyKind(kind)
        ? await this.deleteMoneyUseCase.execute(kind, entryId, context)
        : false;
    if (!wasDeleted) throw new NotFoundException(`Entry "${entryId}" was not found.`);
    return { deleted: true };
  }
}

function parseContext(source: Record<string, unknown>): EntryContextCriteria {
  const companyId = textValue(source.companyId);
  const accountingYearId = textValue(source.accountingYearId);
  if (!companyId || !accountingYearId) {
    throw new BadRequestException("Company and accounting year context are required.");
  }
  return { companyId, accountingYearId };
}

function textValue(value: unknown) {
  if (typeof value !== "string" || !value.trim()) {
    return null;
  }

  const trimmed = value.trim();
  const numericValue = Number(trimmed);
  return Number.isInteger(numericValue) && numericValue > 0 ? trimmed : null;
}

function isBillingKind(kind: string): kind is BillingEntryKind {
  return kind === "sales" || kind === "purchase";
}

function isMoneyKind(kind: string): kind is MoneyEntryKind {
  return kind === "payment" || kind === "receipt";
}
