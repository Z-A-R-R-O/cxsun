import { DomainEvent } from "@cxnext/core";

type AuthUserAccessUpdatedPayload = Record<string, unknown> & {
  readonly userId: string;
  readonly tenantId: string;
  readonly roleKeys: readonly string[];
  readonly permissionKeys: readonly string[];
  readonly isActive: boolean;
};

export class AuthUserAccessUpdatedEvent extends DomainEvent<AuthUserAccessUpdatedPayload> {
  public constructor(
    userId: string,
    tenantId: string,
    roleKeys: readonly string[],
    permissionKeys: readonly string[],
    isActive: boolean,
  ) {
    super("auth.user-access-updated", userId, {
      userId,
      tenantId,
      roleKeys,
      permissionKeys,
      isActive,
    });
  }
}
