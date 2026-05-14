import 'reflect-metadata'
import { Module } from '../../core/decorators/module.js'
import { AuthService } from './application/auth.service.js'
import { AuthRepository } from './infrastructure/auth.repository.js'
import { AuthV1Controller } from './interface/http/auth-v1.controller.js'

@Module({
  controllers: [AuthV1Controller],
  providers: [AuthService, AuthRepository],
})
export class AuthModule {}
