import { Body, Controller, Get, Inject, Post } from "@nestjs/common";
import { CurrentAuth, RequirePermissions, type AuthRequestContext } from "../../modules/auth/interface/http/auth-context";
import { modulePermission } from "../../modules/auth/interface/http/module-permissions";
import { SystemUpdateService } from "./system-update.service";

@Controller("system-update")
@RequirePermissions(modulePermission("system-update", "run"))
export class SystemUpdateController {
  public constructor(
    @Inject(SystemUpdateService)
    private readonly systemUpdateService: SystemUpdateService,
  ) {}

  @Get("status")
  @RequirePermissions(modulePermission("system-update", "read"))
  public status() {
    return this.systemUpdateService.status();
  }

  @Post("preflight")
  public preflight() {
    return this.systemUpdateService.preflight();
  }

  @Post("sync")
  public sync(@CurrentAuth() auth: AuthRequestContext | null) {
    return this.systemUpdateService.sync(auth);
  }

  @Post("build")
  public build(@CurrentAuth() auth: AuthRequestContext | null) {
    return this.systemUpdateService.build(auth);
  }

  @Post("restart")
  public restart(@CurrentAuth() auth: AuthRequestContext | null) {
    return this.systemUpdateService.restart(auth);
  }

  @Post("smoke")
  public smoke(@CurrentAuth() auth: AuthRequestContext | null) {
    return this.systemUpdateService.smoke(auth);
  }

  @Post("deploy")
  public deploy(@CurrentAuth() auth: AuthRequestContext | null) {
    return this.systemUpdateService.deploy(auth);
  }

  @Post("rollback")
  public rollback(
    @CurrentAuth() auth: AuthRequestContext | null,
    @Body() body: { readonly targetCommit?: string | null } = {},
  ) {
    return this.systemUpdateService.rollback(auth, body.targetCommit);
  }

  @Get("history")
  @RequirePermissions(modulePermission("system-update", "read"))
  public history() {
    return this.systemUpdateService.listHistory(20);
  }
}
