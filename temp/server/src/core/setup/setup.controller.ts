import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { SetupService, type SetupAction, type SetupConfigureInput } from "./setup.service";

const setupActions = new Set<SetupAction>(["build", "deploy", "prepare-db", "pull", "smoke", "start", "status"]);

@Controller("setup")
export class SetupController {
  public constructor(private readonly setupService: SetupService) {}

  @Get("status")
  public status() {
    return this.setupService.status();
  }

  @Post("configure")
  public configure(@Body() body: SetupConfigureInput) {
    return this.setupService.configure(body);
  }

  @Post(":action")
  public runAction(@Param("action") action: string) {
    if (!setupActions.has(action as SetupAction)) {
      return {
        message: `Unknown setup action: ${action}`,
        status: "failed",
      };
    }

    return this.setupService.runAction(action as SetupAction);
  }
}
