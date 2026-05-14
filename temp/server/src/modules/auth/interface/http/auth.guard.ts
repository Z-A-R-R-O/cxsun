import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { AUTH_REPOSITORY, type AuthRepository } from "../../application/services/auth.repository";
import { JwtService } from "../../application/services/jwt.service";
import {
  requiredPermissionsMetadataKey,
  type AuthPermissionRequirement,
  type AuthRequestContext,
} from "./auth-context";

@Injectable()
export class AuthGuard implements CanActivate {
  public constructor(
    private readonly reflector: Reflector,
    private readonly jwt: JwtService,
    @Inject(AUTH_REPOSITORY) private readonly repository: AuthRepository,
  ) {}

  public async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions =
      this.reflector.getAllAndOverride<readonly AuthPermissionRequirement[]>(requiredPermissionsMetadataKey, [
        context.getHandler(),
        context.getClass(),
      ]) ?? [];

    if (requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{
      headers: Record<string, string | string[] | undefined>;
      params?: Record<string, string | undefined>;
      query?: Record<string, unknown>;
      body?: unknown;
      auth?: AuthRequestContext;
    }>();
    const resolvedPermissions = requiredPermissions.flatMap((permission) =>
      typeof permission === "function" ? [...permission(request)] : [permission],
    );
    const authorization = request.headers.authorization;
    const header = Array.isArray(authorization) ? authorization[0] : authorization;
    const token = header?.startsWith("Bearer ") ? header.slice("Bearer ".length) : null;

    if (!token) {
      throw new UnauthorizedException("Bearer token is required.");
    }

    const payload = this.jwt.verify(token);
    const session = await this.repository.findSession(payload.jti);

    if (!session || session.revokedAt || session.expiresAt <= new Date()) {
      throw new UnauthorizedException("Session is no longer active.");
    }

    const user = await this.repository.findUserById(payload.sub);

    if (!user || !user.isActive) {
      throw new UnauthorizedException("Authenticated user is not active.");
    }

    const permissionSet = new Set(user.permissions.map((permission) => permission.key));
    const isAllowed = resolvedPermissions.every((permission) => permissionSet.has(permission));

    if (!isAllowed) {
      throw new ForbiddenException("You do not have permission to access this resource.");
    }

    request.auth = {
      user,
      sessionId: payload.sessionId,
      tokenId: payload.jti,
      permissions: [...permissionSet],
    };

    return true;
  }
}
