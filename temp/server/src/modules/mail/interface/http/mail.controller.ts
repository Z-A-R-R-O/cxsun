import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
} from "@nestjs/common";
import { CurrentAuth, RequirePermissions, type AuthRequestContext } from "../../../auth/interface/http/auth-context";
import { modulePermission } from "../../../auth/interface/http/module-permissions";
import { MailService } from "../../application/mail.service";
import { mailCategories, mailStatuses, mailTemplateKeys, type MailCategory, type MailStatus, type MailTemplateKey } from "../../domain/mail-record";

interface MailTestRequest {
  readonly companyId?: unknown;
  readonly recipientEmail?: unknown;
}

interface MailPreviewRequest {
  readonly companyId?: unknown;
  readonly variables?: unknown;
}

@Controller("mail")
export class MailController {
  public constructor(private readonly mailService: MailService) {}

  @Get("status")
  @RequirePermissions(modulePermission("mail", "read"))
  public status(@Query() query: Record<string, unknown>) {
    return this.mailService.status(textValue(query.companyId));
  }

  @Post("test")
  @RequirePermissions(modulePermission("mail", "update"))
  public test(@Body() body: MailTestRequest) {
    return this.mailService.testTransport(
      textValue(body.companyId),
      requiredText(body.recipientEmail, "Recipient email is required."),
    );
  }

  @Get("templates")
  @RequirePermissions(modulePermission("mail", "read"))
  public templates() {
    return this.mailService.templates();
  }

  @Post("templates/:templateKey/preview")
  @RequirePermissions(modulePermission("mail", "read"))
  public preview(
    @Param("templateKey") templateKey: string,
    @Body() body: MailPreviewRequest,
  ) {
    return this.mailService.previewTemplate(parseTemplateKey(templateKey), {
      companyId: textValue(body.companyId),
      variables: objectValue(body.variables),
    });
  }

  @Get("logs")
  @RequirePermissions(modulePermission("mail", "read"))
  public logs(@Query() query: Record<string, unknown>) {
    return this.mailService.listLogs({
      companyId: textValue(query.companyId),
      cursor: textValue(query.cursor),
      limit: numberValue(query.limit),
      search: textValue(query.search),
      category: parseCategory(query.category),
      status: parseStatus(query.status),
    });
  }

  @Get("logs/:mailId")
  @RequirePermissions(modulePermission("mail", "read"))
  public log(@Param("mailId") mailId: string) {
    return this.mailService.getLog(mailId);
  }

  @Post("logs/:mailId/retry")
  @RequirePermissions(modulePermission("mail", "update"))
  public retry(@Param("mailId") mailId: string, @CurrentAuth() _auth: AuthRequestContext | null) {
    return this.mailService.retryLog(mailId);
  }

  @Post("logs/:mailId/cancel")
  @RequirePermissions(modulePermission("mail", "update"))
  public cancel(@Param("mailId") mailId: string) {
    return this.mailService.cancelLog(mailId);
  }
}

function parseTemplateKey(value: string): MailTemplateKey {
  if (mailTemplateKeys.includes(value as MailTemplateKey)) {
    return value as MailTemplateKey;
  }
  throw new BadRequestException("Unsupported mail template.");
}

function parseCategory(value: unknown): MailCategory | null {
  if (typeof value === "string" && mailCategories.includes(value as MailCategory)) {
    return value as MailCategory;
  }
  return null;
}

function parseStatus(value: unknown): MailStatus | null {
  if (typeof value === "string" && mailStatuses.includes(value as MailStatus)) {
    return value as MailStatus;
  }
  return null;
}

function textValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function requiredText(value: unknown, message: string) {
  const text = textValue(value);
  if (!text) {
    throw new BadRequestException(message);
  }
  return text;
}

function numberValue(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function objectValue(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}
