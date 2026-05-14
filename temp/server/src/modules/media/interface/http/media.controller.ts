import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Post,
  Query,
  Res,
} from "@nestjs/common";
import type { FastifyReply } from "fastify";
import { RequirePermissions } from "../../../auth/interface/http/auth-context";
import { modulePermission } from "../../../auth/interface/http/module-permissions";
import { MediaService } from "../../application/media.service";
import {
  mediaVisibilities,
  type MediaUploadInput,
  type MediaVisibility,
} from "../../domain/media-record";

@Controller("media")
export class MediaController {
  public constructor(private readonly mediaService: MediaService) {}

  @Get()
  @RequirePermissions(modulePermission("company", "read"))
  public async list(@Query() query: Record<string, unknown>) {
    parseCompanyContext(query);
    return this.mediaService.list(parseVisibility(query.visibility), {
      folder: textValue(query.folder),
    });
  }

  @Get("file")
  @RequirePermissions(modulePermission("company", "read"))
  public async getFile(
    @Query() query: Record<string, unknown>,
    @Res({ passthrough: false }) reply: FastifyReply,
  ) {
    parseCompanyContext(query);
    const visibility = parseVisibility(query.visibility);
    if (visibility !== "private") {
      throw new BadRequestException("Only private downloads are handled by this endpoint.");
    }
    const mediaPath = textValue(query.path);
    if (!mediaPath) {
      throw new BadRequestException("Media path is required.");
    }

    const file = await this.mediaService.readPrivateFile(mediaPath);
    reply.header("Content-Disposition", `inline; filename="${file.fileName}"`);
    reply.header("Content-Type", file.mimeType ?? "application/octet-stream");
    return reply.send(file.content);
  }

  @Delete()
  @RequirePermissions(modulePermission("company", "update"))
  public async delete(@Query() query: Record<string, unknown>) {
    parseCompanyContext(query);
    const mediaPath = textValue(query.path);
    if (!mediaPath) {
      throw new BadRequestException("Media path is required.");
    }
    return this.mediaService.delete(parseVisibility(query.visibility), mediaPath);
  }

  @Post("upload")
  @Header("Cache-Control", "no-store")
  @RequirePermissions(modulePermission("company", "update"))
  public async upload(@Body() body: MediaUploadInput, @Query() query: Record<string, unknown>) {
    parseCompanyContext(query);
    return this.mediaService.upload(body);
  }
}

function parseCompanyContext(source: Record<string, unknown>) {
  const companyId = textValue(source.companyId);
  if (!companyId) {
    throw new BadRequestException("Company context is required.");
  }
  return { companyId };
}

function parseVisibility(value: unknown): MediaVisibility {
  if (typeof value === "string" && mediaVisibilities.includes(value as MediaVisibility)) {
    return value as MediaVisibility;
  }
  return "public";
}

function textValue(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return null;
  return value.trim();
}
