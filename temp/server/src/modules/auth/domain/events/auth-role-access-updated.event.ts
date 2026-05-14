import { DomainEvent } from "@cxnext/core";

type AuthRoleAccessUpdatedPayload = Record<string, unknown> & {
  readonly roleId: string;
  readonly roleKey: string;
  readonly permissionKeys: readonly string[];
  readonly isActive: boolean;
};

export class AuthRoleAccessUpdatedEvent extends DomainEvent<AuthRoleAccessUpdatedPayload> {
  public constructor(
    roleId: string,
    roleKey: string,
    permissionKeys: readonly string[],
    isActive: boolean,
  ) {
    super("auth.role-access-updated", roleId, {
      roleId,
      roleKey,
      permissionKeys,
      isActive,
    });
  }
}
