import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
} from "@nestjs/common";
import { CurrentAuth, RequirePermissions, type AuthRequestContext } from "../../../auth/interface/http/auth-context";
import { modulePermission } from "../../../auth/interface/http/module-permissions";
import { QueueService } from "../../application/queue.service";
import { queueJobStatuses, type QueueJobStatus } from "../../domain/queue-job-record";

interface QueueJobCreateRequest {
  readonly queueName?: unknown;
  readonly jobName?: unknown;
  readonly payload?: unknown;
  readonly maxAttempts?: unknown;
  readonly priority?: unknown;
}

@Controller("queue")
export class QueueController {
  public constructor(private readonly queueService: QueueService) {}

  @Get("catalog")
  @RequirePermissions(modulePermission("auth", "read"))
  public catalog() {
    return this.queueService.catalog();
  }

  @Get("stats")
  @RequirePermissions(modulePermission("auth", "read"))
  public stats(@Query() query: Record<string, unknown>) {
    return this.queueService.stats(textValue(query.companyId));
  }

  @Get("jobs")
  @RequirePermissions(modulePermission("auth", "read"))
  public list(@Query() query: Record<string, unknown>) {
    return this.queueService.list({
      companyId: textValue(query.companyId),
      cursor: textValue(query.cursor),
      limit: numberValue(query.limit),
      queueName: textValue(query.queueName),
      search: textValue(query.search),
      status: parseStatus(query.status),
    });
  }

  @Post("jobs")
  @RequirePermissions(modulePermission("auth", "update"))
  public create(
    @Body() body: QueueJobCreateRequest,
    @Query() query: Record<string, unknown>,
    @CurrentAuth() auth: AuthRequestContext | null,
  ) {
    return this.queueService.enqueue(
      {
        queueName: requiredText(body.queueName, "Queue name is required."),
        jobName: requiredText(body.jobName, "Job name is required."),
        payload: objectValue(body.payload),
        maxAttempts: numberValue(body.maxAttempts),
        priority: numberValue(body.priority),
        companyId: textValue(query.companyId),
      },
      auth,
    );
  }

  @Post("jobs/:jobId/retry")
  @RequirePermissions(modulePermission("auth", "update"))
  public retry(@Param("jobId") jobId: string) {
    return this.queueService.retry(jobId);
  }

  @Post("jobs/:jobId/cancel")
  @RequirePermissions(modulePermission("auth", "update"))
  public cancel(@Param("jobId") jobId: string) {
    return this.queueService.cancel(jobId);
  }

  @Delete("jobs/:jobId")
  @RequirePermissions(modulePermission("auth", "update"))
  public remove(@Param("jobId") jobId: string) {
    return this.queueService.remove(jobId);
  }
}

function parseStatus(value: unknown): QueueJobStatus | null {
  if (typeof value === "string" && queueJobStatuses.includes(value as QueueJobStatus)) {
    return value as QueueJobStatus;
  }
  return null;
}

function textValue(value: unknown) {
  if (typeof value !== "string" || !value.trim()) {
    return null;
  }
  return value.trim();
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
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  return value as Record<string, unknown>;
}
