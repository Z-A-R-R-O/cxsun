import { Global, Module } from "@nestjs/common";
import { ModuleRegistryService } from "./modules/module-registry.service";
import { CoreSettingsController } from "./settings/core-settings.controller";
import { CoreSettingsService } from "./settings/core-settings.service";
import { SetupController } from "./setup/setup.controller";
import { SetupService } from "./setup/setup.service";
import { SystemUpdateController } from "./system-update/system-update.controller";
import { SystemUpdateService } from "./system-update/system-update.service";

@Global()
@Module({
  controllers: [CoreSettingsController, SetupController, SystemUpdateController],
  providers: [CoreSettingsService, ModuleRegistryService, SetupService, SystemUpdateService],
  exports: [CoreSettingsService, ModuleRegistryService, SetupService, SystemUpdateService],
})
export class CoreModule {}
