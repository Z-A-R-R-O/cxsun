import { Body, Controller, Get, Inject, Patch } from "@nestjs/common";
import { RequirePermissions } from "../../modules/auth/interface/http/auth-context";
import { modulePermission } from "../../modules/auth/interface/http/module-permissions";
import { CoreSettingsService } from "./core-settings.service";

interface CoreSettingsUpdateRequest {
  readonly values?: Record<string, unknown>;
}

@Controller("core-settings")
export class CoreSettingsController {
  public constructor(
    @Inject(CoreSettingsService)
    private readonly coreSettingsService: CoreSettingsService,
  ) {}

  @Get("env")
  @RequirePermissions(modulePermission("auth", "update"))
  public async getEnvSettings() {
    return this.coreSettingsService.listEnvSettings();
  }

  @Patch("env")
  @RequirePermissions(modulePermission("auth", "update"))
  public async updateEnvSettings(@Body() body: CoreSettingsUpdateRequest) {
    return this.coreSettingsService.updateEnvSettings(body.values ?? {});
  }
}
