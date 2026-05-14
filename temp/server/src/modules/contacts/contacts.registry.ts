import { Inject, Injectable, type OnModuleInit } from "@nestjs/common";
import { ModuleRegistryService } from "../../core/modules/module-registry.service";
import { ContactsDefinition } from "./contacts.definition";

@Injectable()
export class ContactsRegistryBootstrap implements OnModuleInit {
  public constructor(
    @Inject(ModuleRegistryService)
    private readonly moduleRegistryService: ModuleRegistryService,
  ) {}

  public onModuleInit(): void {
    this.moduleRegistryService.register(new ContactsDefinition());
  }
}
