import { createHmac, randomUUID } from "node:crypto";
import { Injectable, UnauthorizedException } from "@nestjs/common";

interface AuthTokenPayload {
  readonly sub: string;
  readonly tenantId: string;
  readonly sessionId: string;
  readonly jti: string;
  readonly permissions: readonly string[];
  readonly iat: number;
  readonly exp: number;
}

function requireEnv(key: string) {
  const value = process.env[key];

  if (!value) {
    throw new Error(`${key} is required.`);
  }

  return value;
}

function requireOneEnv(keys: readonly string[]) {
  for (const key of keys) {
    const value = process.env[key];

    if (value) {
      return value;
    }
  }

  throw new Error(`${keys[0]} is required.`);
}

function base64Url(input: string | Buffer) {
  return Buffer.from(input).toString("base64url");
}

@Injectable()
export class JwtService {
  private readonly secret = requireEnv("JWT_SECRET");
  private readonly expiresSeconds = Number(
    requireOneEnv(["AUTH_TOKEN_EXPIRES_SECONDS", "JWT_EXPIRES_IN_SECONDS"]),
  );

  public issue(params: {
    readonly userId: string;
    readonly tenantId: string;
    readonly sessionId: string;
    readonly permissions: readonly string[];
  }) {
    if (this.secret.length < 24) {
      throw new Error("JWT_SECRET must be at least 24 characters.");
    }

    const nowSeconds = Math.floor(Date.now() / 1000);
    const payload: AuthTokenPayload = {
      sub: params.userId,
      tenantId: params.tenantId,
      sessionId: params.sessionId,
      jti: randomUUID(),
      permissions: params.permissions,
      iat: nowSeconds,
      exp: nowSeconds + this.expiresSeconds,
    };
    const header = { alg: "HS256", typ: "JWT" };
    const encodedHeader = base64Url(JSON.stringify(header));
    const encodedPayload = base64Url(JSON.stringify(payload));
    const signature = this.sign(`${encodedHeader}.${encodedPayload}`);

    return {
      accessToken: `${encodedHeader}.${encodedPayload}.${signature}`,
      expiresAt: new Date(payload.exp * 1000),
      payload,
    };
  }

  public verify(token: string): AuthTokenPayload {
    const [encodedHeader, encodedPayload, signature] = token.split(".");

    if (!encodedHeader || !encodedPayload || !signature) {
      throw new UnauthorizedException("Invalid bearer token.");
    }

    const expectedSignature = this.sign(`${encodedHeader}.${encodedPayload}`);

    if (signature !== expectedSignature) {
      throw new UnauthorizedException("Invalid bearer token signature.");
    }

    const payload = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf8"),
    ) as AuthTokenPayload;

    if (payload.exp * 1000 <= Date.now()) {
      throw new UnauthorizedException("Bearer token has expired.");
    }

    return payload;
  }

  private sign(value: string) {
    return createHmac("sha256", this.secret).update(value).digest("base64url");
  }
}
