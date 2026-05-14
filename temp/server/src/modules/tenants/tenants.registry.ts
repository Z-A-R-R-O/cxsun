import { Inject, Injectable, type OnModuleInit } from "@nestjs/common";
import { ModuleRegistryService } from "../../core/modules/module-registry.service";
import { TenantsDefinition } from "./tenants.definition";

@Injectable()
export class TenantsRegistryBootstrap implements OnModuleInit {
  public constructor(
    @Inject(ModuleRegistryService)
    private readonly moduleRegistryService: ModuleRegistryService,
  ) {}

  public onModuleInit(): void {
    this.moduleRegistryService.register(new TenantsDefinition());
  }
}
