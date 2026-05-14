export type CommonMasterColumnType = "string" | "number" | "boolean";

export interface CommonMasterColumn {
  readonly key: string;
  readonly type: CommonMasterColumnType;
}

export function toCamelCase(value: string) {
  return value.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase());
}

export function readBodyValue(body: Record<string, unknown>, key: string) {
  return body[toCamelCase(key)] ?? body[key];
}

export function toDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
}

export function parseValue(column: CommonMasterColumn, body: Record<string, unknown>) {
  const value = readBodyValue(body, column.key);
  if (column.type === "boolean") return Boolean(value);
  if (column.type === "number") return value === null || value === undefined || value === "" ? 0 : Number(value);
  return typeof value === "string" ? value.trim() || null : value ?? null;
}
