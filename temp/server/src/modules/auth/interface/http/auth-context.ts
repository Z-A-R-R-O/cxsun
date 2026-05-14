import { createParamDecorator, SetMetadata, type ExecutionContext } from "@nestjs/common";
import type { AuthUserRecord } from "../../domain/auth-record";

export const requiredPermissionsMetadataKey = "cxnext:required-permissions";

export interface AuthPermissionResolutionContext {
  readonly headers: Record<string, string | string[] | undefined>;
  readonly params?: Record<string, string | undefined>;
  readonly query?: Record<string, unknown>;
  readonly body?: unknown;
}

export type AuthPermissionRequirement =
  | string
  | ((request: AuthPermissionResolutionContext) => readonly string[]);

export interface AuthRequestContext {
  readonly user: AuthUserRecord;
  readonly sessionId: string;
  readonly tokenId: string;
  readonly permissions: readonly string[];
}

export function RequirePermissions(...permissions: AuthPermissionRequirement[]) {
  return SetMetadata(requiredPermissionsMetadataKey, permissions);
}

export const CurrentAuth = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthRequestContext | null => {
    const request = context.switchToHttp().getRequest<{ auth?: AuthRequestContext }>();
    return request.auth ?? null;
  },
);
