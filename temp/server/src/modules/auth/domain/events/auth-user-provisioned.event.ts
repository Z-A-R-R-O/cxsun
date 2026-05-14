import { DomainEvent } from "@cxnext/core";

type AuthUserProvisionedPayload = Record<string, unknown> & {
  readonly userId: string;
  readonly tenantId: string;
  readonly roleKeys: readonly string[];
  readonly permissionKeys: readonly string[];
};

export class AuthUserProvisionedEvent extends DomainEvent<AuthUserProvisionedPayload> {
  public constructor(
    userId: string,
    tenantId: string,
    roleKeys: readonly string[],
    permissionKeys: readonly string[],
  ) {
    super("auth.user-provisioned", userId, {
      userId,
      tenantId,
      roleKeys,
      permissionKeys,
    });
  }
}
