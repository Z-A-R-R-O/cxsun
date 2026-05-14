import type { BaseModule } from "@cxnext/core";

export interface ModuleBoundaryViolation {
  readonly moduleName: string;
  readonly dependencyName: string;
  readonly reason: string;
}

export function validateModuleBoundaries(
  candidate: BaseModule,
  registeredModules: readonly BaseModule[],
): ModuleBoundaryViolation[] {
  const registeredNames = new Set(registeredModules.map((module) => module.name));

  return candidate.dependencies
    .filter((dependencyName) => !registeredNames.has(dependencyName))
    .map((dependencyName) => ({
      moduleName: candidate.name,
      dependencyName,
      reason: "Modules may depend only on previously registered public module contracts.",
    }));
}
