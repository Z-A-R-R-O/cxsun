import 'reflect-metadata'
import { TenantContextService } from '../../core/tenant/tenant-context.service.js'
import { Module } from '../../core/decorators/module.js'
import { AuthService } from './application/auth.service.js'
import { UserManagerService } from './application/user-manager.service.js'
import { AuthRepository } from './infrastructure/auth.repository.js'
import { AuthV1Controller } from './interface/http/auth-v1.controller.js'
import { AdminUsersV1Controller, UsersV1Controller } from './interface/http/users-v1.controller.js'

@Module({
  controllers: [AuthV1Controller, UsersV1Controller, AdminUsersV1Controller],
  providers: [AuthService, UserManagerService, AuthRepository, TenantContextService],
})
export class AuthModule {}
