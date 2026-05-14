import { describe, expect, it } from "vitest";
import { ModuleRegistry, type BaseModule } from "../src";

function moduleDefinition(name: string, dependencies: readonly string[] = []): BaseModule {
  return {
    name,
    boundedContext: name,
    dependencies,
    layers: ["domain", "application", "infrastructure", "interface"],
  };
}

describe("ModuleRegistry", () => {
  it("registers modules and lists them in registration order", () => {
    const registry = new ModuleRegistry();

    registry.register(moduleDefinition("foundation"));
    registry.register(moduleDefinition("dependent", ["foundation"]));

    expect(registry.list().map((module) => module.name)).toEqual(["foundation", "dependent"]);
  });

  it("rejects duplicate module names", () => {
    const registry = new ModuleRegistry();

    registry.register(moduleDefinition("foundation"));

    expect(() => registry.register(moduleDefinition("foundation"))).toThrow(
      'Module "foundation" is already registered.',
    );
  });

  it("rejects dependencies that have not been registered", () => {
    const registry = new ModuleRegistry();

    expect(() => registry.register(moduleDefinition("dependent", ["missing"]))).toThrow(
      'Module "dependent" depends on "missing", but it has not been registered.',
    );
  });
});
