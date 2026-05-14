import { Inject, Injectable, type OnModuleInit } from "@nestjs/common";
import { ModuleRegistryService } from "../../core/modules/module-registry.service";
import { EntriesDefinition } from "./entries.definition";

@Injectable()
export class EntriesRegistryBootstrap implements OnModuleInit {
  public constructor(
    @Inject(ModuleRegistryService)
    private readonly moduleRegistryService: ModuleRegistryService,
  ) {}

  public onModuleInit(): void {
    this.moduleRegistryService.register(new EntriesDefinition());
  }
}
