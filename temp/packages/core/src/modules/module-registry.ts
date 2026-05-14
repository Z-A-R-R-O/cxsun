import type { BaseModule } from "./base-module";

export class ModuleRegistry {
  private readonly modules = new Map<string, BaseModule>();

  public register(module: BaseModule): void {
    if (this.modules.has(module.name)) {
      throw new Error(`Module "${module.name}" is already registered.`);
    }

    this.assertDependenciesExist(module);
    this.modules.set(module.name, module);
  }

  public list(): BaseModule[] {
    return [...this.modules.values()];
  }

  public get(name: string): BaseModule | undefined {
    return this.modules.get(name);
  }

  private assertDependenciesExist(module: BaseModule): void {
    for (const dependency of module.dependencies) {
      if (!this.modules.has(dependency)) {
        throw new Error(
          `Module "${module.name}" depends on "${dependency}", but it has not been registered.`,
        );
      }
    }
  }
}
