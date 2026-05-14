import { Inject, Injectable, type OnModuleInit } from "@nestjs/common";
import { ModuleRegistryService } from "../../core/modules/module-registry.service";
import { IndustriesDefinition } from "./industries.definition";

@Injectable()
export class IndustriesRegistryBootstrap implements OnModuleInit {
  public constructor(
    @Inject(ModuleRegistryService)
    private readonly moduleRegistryService: ModuleRegistryService,
  ) {}

  public onModuleInit(): void {
    this.moduleRegistryService.register(new IndustriesDefinition());
  }
}
