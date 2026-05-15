import { Body, Headers } from '../../../../core/decorators/http-params.js'
import { Controller, Post } from '../../../../core/decorators/controller.js'
import { Inject } from '../../../../core/decorators/inject.js'
import type { TenantRequestHeaders } from '../../../../core/tenant/tenant-context.service.js'
import { AuthService } from '../../application/auth.service.js'
import type { LoginInput } from '../../domain/auth.types.js'

@Controller('api/v1/auth')
export class AuthV1Controller {
  constructor(
    @Inject(AuthService) private readonly authService: AuthService,
  ) {}

  @Post('login')
  login(@Body() body: LoginInput, @Headers() headers: TenantRequestHeaders) {
    return this.authService.login(body, headers)
  }
}
