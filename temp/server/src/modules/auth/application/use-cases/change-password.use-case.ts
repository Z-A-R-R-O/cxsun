import { BadRequestException, Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import { AUTH_REPOSITORY, type AuthRepository } from "../services/auth.repository";
import { PasswordService } from "../services/password.service";

@Injectable()
export class ChangePasswordUseCase {
  public constructor(
    @Inject(AUTH_REPOSITORY) private readonly repository: AuthRepository,
    private readonly passwords: PasswordService,
  ) {}

  public async execute(params: {
    readonly userId: string;
    readonly currentPassword: string;
    readonly nextPassword: string;
  }) {
    if (params.nextPassword.length < 8) {
      throw new BadRequestException("Use at least 8 characters.");
    }

    if (params.currentPassword === params.nextPassword) {
      throw new BadRequestException("New password must be different.");
    }

    const userPassword = await this.repository.findUserPasswordById(params.userId);
    if (
      !userPassword ||
      !this.passwords.verify(params.currentPassword, userPassword.passwordHash)
    ) {
      throw new UnauthorizedException("Current password is wrong.");
    }

    const updated = await this.repository.updateUserPassword(
      params.userId,
      this.passwords.hash(params.nextPassword),
    );
    if (!updated) {
      throw new BadRequestException("Password could not be changed.");
    }

    return { changed: true };
  }
}
