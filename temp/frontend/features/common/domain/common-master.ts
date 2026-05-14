export type CommonColumnType = "string" | "number" | "boolean";

export interface CommonColumnDefinition {
  readonly key: string;
  readonly label: string;
  readonly type: CommonColumnType;
  readonly required?: boolean;
  readonly nullable?: boolean;
}

export interface CommonModuleDefinition {
  readonly key: string;
  readonly label: string;
  readonly tableName: string;
  readonly defaultSortKey: string;
  readonly idPrefix: string;
  readonly columns: readonly CommonColumnDefinition[];
}

export type CommonRecord = Record<string, unknown> & {
  readonly id: number;
  readonly isActive: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly deletedAt: string | null;
};

export type CommonReferenceLookupMap = Record<string, ReadonlyMap<string, string>>;
