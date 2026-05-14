import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { Injectable } from "@nestjs/common";

@Injectable()
export class PasswordService {
  public hash(password: string): string {
    const salt = randomBytes(16).toString("base64url");
    const hash = scryptSync(password, salt, 64).toString("base64url");

    return `scrypt$${salt}$${hash}`;
  }

  public verify(password: string, passwordHash: string): boolean {
    const [scheme, salt, expectedHash] = passwordHash.split("$");

    if (scheme !== "scrypt" || !salt || !expectedHash) {
      return false;
    }

    const actual = Buffer.from(scryptSync(password, salt, 64).toString("base64url"));
    const expected = Buffer.from(expectedHash);

    return actual.length === expected.length && timingSafeEqual(actual, expected);
  }
}
