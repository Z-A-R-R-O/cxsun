import { Inject } from '../../../core/decorators/inject.js'
import { Injectable } from '../../../core/decorators/injectable.js'
import type { TenantRequestHeaders } from '../../../core/tenant/tenant-context.service.js'
import { signJwt } from '../../../infrastructure/auth/jwt.js'
import { verifyPassword } from '../../../infrastructure/auth/password-hash.js'
import type { LoginInput } from '../domain/auth.types.js'
import { AuthRepository } from '../infrastructure/auth.repository.js'

@Injectable()
export class AuthService {
  constructor(
    @Inject(AuthRepository) private readonly auth: AuthRepository,
  ) {}

  async login(input: LoginInput, headers: TenantRequestHeaders = {}) {
    const email = input.email?.trim().toLowerCase()
    const password = input.password ?? ''

    if (!email || !password) {
      return { ok: false, error: 'Email and password are required.' }
    }

    const user = await this.auth.findUserByEmail(email)

    if (!user || user.status !== 'active' || !verifyPassword(password, user.password_hash)) {
      return { ok: false, error: 'Invalid email or password.' }
    }

    const tenants = await this.auth.listTenantAccess(user.id)

    if (tenants.length === 0) {
      return { ok: false, error: 'User does not have tenant access.' }
    }

    const domainTenantSlug = await this.auth.findTenantSlugByDomain(firstHeader(headers.host) ?? '')
    const selectedTenant = tenants.find((tenant) => tenant.slug === domainTenantSlug) ?? tenants[0]

    const token = signJwt({
      sub: user.id,
      email: user.email,
      role: selectedTenant.role,
      tenantCode: selectedTenant.slug,
      superAdmin: selectedTenant.role === 'super-admin',
    })

    return {
      ok: true,
      token,
      user: { id: user.id, name: user.name, email: user.email },
      tenants,
      selectedTenant,
    }
  }
}

function firstHeader(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value
}
