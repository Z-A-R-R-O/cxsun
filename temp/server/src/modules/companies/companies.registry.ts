import { Inject, Injectable, type OnModuleInit } from "@nestjs/common";
import { ModuleRegistryService } from "../../core/modules/module-registry.service";
import { CompaniesDefinition } from "./companies.definition";

@Injectable()
export class CompaniesRegistryBootstrap implements OnModuleInit {
  public constructor(
    @Inject(ModuleRegistryService)
    private readonly moduleRegistryService: ModuleRegistryService,
  ) {}

  public onModuleInit(): void {
    this.moduleRegistryService.register(new CompaniesDefinition());
  }
}
