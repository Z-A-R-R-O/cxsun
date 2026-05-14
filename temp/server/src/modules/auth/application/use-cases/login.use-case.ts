import { randomUUID } from "node:crypto";
import { Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import { AUTH_REPOSITORY, type AuthRepository } from "../services/auth.repository";
import {
  AUTH_DOMAIN_EVENT_PUBLISHER,
  type AuthDomainEventPublisher,
} from "../services/domain-event-publisher";
import { JwtService } from "../services/jwt.service";
import { PasswordService } from "../services/password.service";
import { AuthLoggedInEvent } from "../../domain/events/auth-logged-in.event";

@Injectable()
export class LoginUseCase {
  public constructor(
    @Inject(AUTH_REPOSITORY) private readonly repository: AuthRepository,
    @Inject(AUTH_DOMAIN_EVENT_PUBLISHER)
    private readonly eventPublisher: AuthDomainEventPublisher,
    private readonly passwords: PasswordService,
    private readonly jwt: JwtService,
  ) {}

  public async execute(params: { readonly login: string; readonly password: string }) {
    const user = await this.repository.findUserByLogin(params.login);

    if (!user || !user.isActive || !this.passwords.verify(params.password, user.passwordHash)) {
      throw new UnauthorizedException("Username or password is wrong.");
    }

    const sessionId = randomUUID();
    const permissions = user.permissions.map((permission) => permission.key);
    const token = this.jwt.issue({
      userId: user.id,
      tenantId: user.tenant.id,
      sessionId,
      permissions,
    });

    await this.repository.createSession({
      sessionId,
      tokenId: token.payload.jti,
      userId: user.id,
      tenantId: user.tenant.id,
      expiresAt: token.expiresAt,
    });
    await this.repository.touchLogin(user.id);
    await this.eventPublisher.publishAll([
      new AuthLoggedInEvent(user.id, user.tenant.id, sessionId),
    ]);

    return {
      accessToken: token.accessToken,
      expiresAt: token.expiresAt.toISOString(),
      sessionId,
      user,
      tenant: user.tenant,
      permissions,
    };
  }
}
