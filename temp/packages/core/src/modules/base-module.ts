export type ModuleLayer = "domain" | "application" | "infrastructure" | "interface";

export interface BaseModule {
  readonly name: string;
  readonly boundedContext: string;
  readonly dependencies: readonly string[];
  readonly layers: readonly ModuleLayer[];
}

export abstract class CxModule implements BaseModule {
  public abstract readonly name: string;
  public abstract readonly boundedContext: string;
  public readonly dependencies: readonly string[] = [];
  public readonly layers: readonly ModuleLayer[] = [
    "domain",
    "application",
    "infrastructure",
    "interface",
  ];
}
