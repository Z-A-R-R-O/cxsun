import { DomainEvent } from "@cxnext/core";

type AuthLoggedInPayload = Record<string, unknown> & {
  readonly userId: string;
  readonly tenantId: string;
  readonly sessionId: string;
};

export class AuthLoggedInEvent extends DomainEvent<AuthLoggedInPayload> {
  public constructor(
    userId: string,
    tenantId: string,
    sessionId: string,
  ) {
    super("auth.user-logged-in", userId, { userId, tenantId, sessionId });
  }
}
