export interface ApiResponse<TData> {
  readonly data: TData;
  readonly meta?: Record<string, unknown>;
}

export interface ApiErrorResponse {
  readonly error: {
    readonly code: string;
    readonly message: string;
    readonly details?: Record<string, unknown>;
  };
}

export type Nullable<TValue> = TValue | null;
export type Optional<TValue> = TValue | undefined;

export * from "./auth/rbac-catalog";
