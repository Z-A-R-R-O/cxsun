import { Injectable } from "@nestjs/common";
import { ModuleRegistry, type BaseModule } from "@cxnext/core";
import { validateModuleBoundaries } from "./module-boundary";

@Injectable()
export class ModuleRegistryService {
  private readonly registry = new ModuleRegistry();

  public register(module: BaseModule): void {
    const violations = validateModuleBoundaries(module, this.registry.list());
    if (violations.length > 0) {
      throw new Error(`Module boundary violation: ${JSON.stringify(violations)}`);
    }

    this.registry.register(module);
  }

  public list(): BaseModule[] {
    return this.registry.list();
  }
}
