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
import { CreateCompanyUseCase } from "../../application/use-cases/create-company.use-case";
import { DeleteCompanyUseCase } from "../../application/use-cases/delete-company.use-case";
import { GetCompanyUseCase } from "../../application/use-cases/get-company.use-case";
import { ListCompaniesUseCase } from "../../application/use-cases/list-companies.use-case";
import { UpdateCompanyUseCase } from "../../application/use-cases/update-company.use-case";
import { toCompanyResponse } from "./company-response";

interface CompanyUpsertRequest {
  readonly tenantId?: unknown;
  readonly industryId?: unknown;
  readonly code?: unknown;
  readonly name?: unknown;
  readonly legalName?: unknown;
  readonly tagline?: unknown;
  readonly shortAbout?: unknown;
  readonly gstinUin?: unknown;
  readonly pan?: unknown;
  readonly dateOfIncorporation?: unknown;
  readonly msmeNo?: unknown;
  readonly msmeCategory?: unknown;
  readonly tan?: unknown;
  readonly tdsAvailable?: unknown;
  readonly tdsSection?: unknown;
  readonly tdsRatePercent?: unknown;
  readonly tcsAvailable?: unknown;
  readonly tcsSection?: unknown;
  readonly tcsRatePercent?: unknown;
  readonly website?: unknown;
  readonly description?: unknown;
  readonly primaryEmail?: unknown;
  readonly primaryPhone?: unknown;
  readonly isPrimary?: unknown;
  readonly isActive?: unknown;
  readonly logos?: unknown;
  readonly addresses?: unknown;
  readonly emails?: unknown;
  readonly phones?: unknown;
  readonly socialLinks?: unknown;
  readonly bankAccounts?: unknown;
}

@Controller("companies")
export class CompaniesController {
  public constructor(
    @Inject(ListCompaniesUseCase)
    private readonly listCompaniesUseCase: ListCompaniesUseCase,
    @Inject(GetCompanyUseCase)
    private readonly getCompanyUseCase: GetCompanyUseCase,
    @Inject(CreateCompanyUseCase)
    private readonly createCompanyUseCase: CreateCompanyUseCase,
    @Inject(UpdateCompanyUseCase)
    private readonly updateCompanyUseCase: UpdateCompanyUseCase,
    @Inject(DeleteCompanyUseCase)
    private readonly deleteCompanyUseCase: DeleteCompanyUseCase,
  ) {}

  @Get()
  @RequirePermissions(modulePermission("company", "read"))
  public async list() {
    const companies = await this.listCompaniesUseCase.execute();
    return companies.map((company) => toCompanyResponse(company));
  }

  @Get(":companyId")
  @RequirePermissions(modulePermission("company", "read"))
  public async getById(@Param("companyId") companyId: string) {
    const company = await this.getCompanyUseCase.execute(companyId);

    if (!company) {
      throw new NotFoundException(`Company "${companyId}" was not found.`);
    }

    return toCompanyResponse(company);
  }

  @Post()
  @RequirePermissions(modulePermission("company", "create"))
  public async create(@Body() body: CompanyUpsertRequest) {
    const company = await this.createCompanyUseCase.execute(parseCompanyRequest(body));
    return toCompanyResponse(company);
  }

  @Patch(":companyId")
  @RequirePermissions(modulePermission("company", "update"))
  public async update(@Param("companyId") companyId: string, @Body() body: CompanyUpsertRequest) {
    const company = await this.updateCompanyUseCase.execute(companyId, parseCompanyRequest(body));

    if (!company) {
      throw new NotFoundException(`Company "${companyId}" was not found.`);
    }

    return toCompanyResponse(company);
  }

  @Delete(":companyId")
  @RequirePermissions(modulePermission("company", "delete"))
  public async softDelete(@Param("companyId") companyId: string) {
    const wasDeleted = await this.deleteCompanyUseCase.execute(companyId);

    if (!wasDeleted) {
      throw new NotFoundException(`Company "${companyId}" was not found.`);
    }

    return { deleted: true };
  }
}

function parseCompanyRequest(body: CompanyUpsertRequest) {
  return {
    tenantId: Number(body.tenantId),
    industryId: Number(body.industryId),
    code: typeof body.code === "string" ? body.code : "",
    name: typeof body.name === "string" ? body.name : "",
    legalName: typeof body.legalName === "string" ? body.legalName : null,
    tagline: typeof body.tagline === "string" ? body.tagline : null,
    shortAbout: typeof body.shortAbout === "string" ? body.shortAbout : null,
    gstinUin: typeof body.gstinUin === "string" ? body.gstinUin : null,
    pan: typeof body.pan === "string" ? body.pan : null,
    dateOfIncorporation:
      typeof body.dateOfIncorporation === "string" ? body.dateOfIncorporation : null,
    msmeNo: typeof body.msmeNo === "string" ? body.msmeNo : null,
    msmeCategory: typeof body.msmeCategory === "string" ? body.msmeCategory : null,
    tan: typeof body.tan === "string" ? body.tan : null,
    tdsAvailable: body.tdsAvailable === true,
    tdsSection: typeof body.tdsSection === "string" ? body.tdsSection : null,
    tdsRatePercent: numberOrNull(body.tdsRatePercent),
    tcsAvailable: body.tcsAvailable === true,
    tcsSection: typeof body.tcsSection === "string" ? body.tcsSection : null,
    tcsRatePercent: numberOrNull(body.tcsRatePercent),
    website: typeof body.website === "string" ? body.website : null,
    description: typeof body.description === "string" ? body.description : null,
    primaryEmail: typeof body.primaryEmail === "string" ? body.primaryEmail : null,
    primaryPhone: typeof body.primaryPhone === "string" ? body.primaryPhone : null,
    isPrimary: Boolean(body.isPrimary),
    isActive: Boolean(body.isActive),
    logos: parseLogos(body.logos),
    addresses: parseAddresses(body.addresses),
    emails: parseEmails(body.emails),
    phones: parsePhones(body.phones),
    socialLinks: parseSocialLinks(body.socialLinks),
    bankAccounts: parseBankAccounts(body.bankAccounts),
  };
}

function parseLogos(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => {
    const record = item as Record<string, unknown>;
    return {
      logoUrl: typeof record.logoUrl === "string" ? record.logoUrl : "",
      logoType: typeof record.logoType === "string" ? record.logoType : "logo",
      isActive: record.isActive !== false,
    };
  });
}

function parseAddresses(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => {
    const record = item as Record<string, unknown>;
    return {
      addressTypeId: typeof record.addressTypeId === "string" ? record.addressTypeId : null,
      addressLine1: typeof record.addressLine1 === "string" ? record.addressLine1 : "",
      addressLine2: typeof record.addressLine2 === "string" ? record.addressLine2 : null,
      cityId: typeof record.cityId === "string" ? record.cityId : null,
      districtId: typeof record.districtId === "string" ? record.districtId : null,
      stateId: typeof record.stateId === "string" ? record.stateId : null,
      countryId: typeof record.countryId === "string" ? record.countryId : null,
      pincodeId: typeof record.pincodeId === "string" ? record.pincodeId : null,
      latitude: numberOrNull(record.latitude),
      longitude: numberOrNull(record.longitude),
      isDefault: record.isDefault === true,
      isActive: record.isActive !== false,
    };
  });
}

function parseEmails(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => {
    const record = item as Record<string, unknown>;
    return {
      email: typeof record.email === "string" ? record.email : "",
      emailType: typeof record.emailType === "string" ? record.emailType : "primary",
      isPrimary: record.isPrimary === true,
      isActive: record.isActive !== false,
    };
  });
}

function parsePhones(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => {
    const record = item as Record<string, unknown>;
    return {
      phoneNumber: typeof record.phoneNumber === "string" ? record.phoneNumber : "",
      phoneType: typeof record.phoneType === "string" ? record.phoneType : "mobile",
      isPrimary: record.isPrimary === true,
      isActive: record.isActive !== false,
    };
  });
}

function parseSocialLinks(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => {
    const record = item as Record<string, unknown>;
    return {
      platform: typeof record.platform === "string" ? record.platform : "",
      url: typeof record.url === "string" ? record.url : "",
      isActive: record.isActive !== false,
    };
  });
}

function parseBankAccounts(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => {
    const record = item as Record<string, unknown>;
    return {
      bankName: typeof record.bankName === "string" ? record.bankName : "",
      accountNumber: typeof record.accountNumber === "string" ? record.accountNumber : "",
      accountHolderName:
        typeof record.accountHolderName === "string" ? record.accountHolderName : "",
      ifsc: typeof record.ifsc === "string" ? record.ifsc : "",
      branch: typeof record.branch === "string" ? record.branch : null,
      qrImageUrl: typeof record.qrImageUrl === "string" ? record.qrImageUrl : null,
      isPrimary: record.isPrimary === true,
      isActive: record.isActive !== false,
    };
  });
}

function numberOrNull(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    const parsedValue = Number(value);
    return Number.isFinite(parsedValue) ? parsedValue : null;
  }

  return null;
}
