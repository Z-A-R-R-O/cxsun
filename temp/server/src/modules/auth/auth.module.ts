import { Module } from "@nestjs/common";
import { APP_GUARD, Reflector } from "@nestjs/core";
import { AUTH_DOMAIN_EVENT_PUBLISHER } from "./application/services/domain-event-publisher";
import { AUTH_REPOSITORY } from "./application/services/auth.repository";
import { JwtService } from "./application/services/jwt.service";
import { PasswordService } from "./application/services/password.service";
import { ChangePasswordUseCase } from "./application/use-cases/change-password.use-case";
import { LoginUseCase } from "./application/use-cases/login.use-case";
import {
  CreateAuthRoleUseCase,
  CreateAuthPermissionModuleUseCase,
  CreateAuthPolicyUseCase,
  CreateAuthUserUseCase,
  DeleteAuthPermissionModuleUseCase,
  DeleteAuthPolicyUseCase,
  DeleteAuthRoleUseCase,
  GetAuthUserUseCase,
  ListAuthGatesUseCase,
  ListAuthPermissionsUseCase,
  ListAuthPoliciesUseCase,
  ListAuthRolesUseCase,
  ListAuthUsersUseCase,
  UpdateAuthPermissionModuleUseCase,
  UpdateAuthPolicyUseCase,
  UpdateAuthRoleUseCase,
  UpdateAuthUserUseCase,
} from "./application/use-cases/user-admin.use-cases";
import { KyselyAuthRepository } from "./infrastructure/persistence/kysely-auth.repository";
import { EventBusAuthDomainEventPublisher } from "./infrastructure/adapters/event-bus-domain-event-publisher";
import { AuthController } from "./interface/http/auth.controller";
import { AuthGuard } from "./interface/http/auth.guard";

@Module({
  controllers: [AuthController],
  providers: [
    Reflector,
    JwtService,
    PasswordService,
    LoginUseCase,
    ChangePasswordUseCase,
    ListAuthUsersUseCase,
    GetAuthUserUseCase,
    CreateAuthUserUseCase,
    UpdateAuthUserUseCase,
    ListAuthRolesUseCase,
    CreateAuthRoleUseCase,
    UpdateAuthRoleUseCase,
    DeleteAuthRoleUseCase,
    ListAuthPermissionsUseCase,
    CreateAuthPermissionModuleUseCase,
    UpdateAuthPermissionModuleUseCase,
    DeleteAuthPermissionModuleUseCase,
    ListAuthPoliciesUseCase,
    CreateAuthPolicyUseCase,
    UpdateAuthPolicyUseCase,
    DeleteAuthPolicyUseCase,
    ListAuthGatesUseCase,
    {
      provide: AUTH_REPOSITORY,
      useClass: KyselyAuthRepository,
    },
    {
      provide: AUTH_DOMAIN_EVENT_PUBLISHER,
      useClass: EventBusAuthDomainEventPublisher,
    },
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
  ],
  exports: [JwtService, AUTH_REPOSITORY],
})
export class AuthModule {}
