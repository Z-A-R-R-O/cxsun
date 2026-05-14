import { commonModuleDefinitions, type CommonModuleDefinition } from "../../common-modules";

export function commonDefinition(key: string): CommonModuleDefinition {
  const definition = commonModuleDefinitions.find((item) => item.key === key);
  if (!definition) throw new Error(`Missing common module definition for ${key}.`);
  return definition;
}

export function simpleRows(rows: readonly [string, string][]) {
  return rows.map(([code, name]) => ({ code, name, description: `${name} default` }));
}

export function defaultRow(extra: Record<string, unknown> = {}) {
  return { code: "-", name: "-", description: "-", ...extra };
}

export function rowsWithDefault(
  rows: readonly Record<string, unknown>[],
  extra: Record<string, unknown> = {},
) {
  return [defaultRow(extra), ...rows];
}

export function simpleRowsWithDefault(rows: readonly [string, string][]) {
  return rowsWithDefault(simpleRows(rows));
}
