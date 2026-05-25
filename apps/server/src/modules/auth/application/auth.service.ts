import { Inject } from '../../../core/decorators/inject.js'
import { Injectable } from '../../../core/decorators/injectable.js'
import type { TenantRequestHeaders } from '../../../core/tenant/tenant-context.service.js'
import { signJwt } from '../../../infrastructure/auth/jwt.js'
import { verifyPassword } from '../../../infrastructure/auth/password-hash.js'
import { getTenantDatabase } from '../../../infrastructure/tenant-database/tenant-database.connection.js'
import type { Tenant } from '../../../core/tenant/domain/tenant.types.js'
import type { AuthTenantAccess, LoginInput } from '../domain/auth.types.js'
import { AuthRepository } from '../infrastructure/auth.repository.js'

@Injectable()
export class AuthService {
  constructor(
    @Inject(AuthRepository) private readonly auth: AuthRepository,
  ) {}

  async login(input: LoginInput, _headers: TenantRequestHeaders = {}) {
    const email = input.email?.trim().toLowerCase()
    const password = input.password ?? ''
    const corporateId = input.corporateId?.trim() ?? ''
    const surface = input.surface ?? 'tenant'

    if (!email || !password) {
      return { ok: false, error: 'Email and password are required.' }
    }

    if (surface !== 'tenant') {
      return this.loginPlatformUser({ email, password, surface })
    }

    if (!corporateId) {
      return { ok: false, error: 'Corporate ID or mobile, email, and password are required.' }
    }

    const loginTenant = await this.auth.findTenantByLoginIdentifier(corporateId)
    if (!loginTenant || loginTenant.status !== 'active') {
      return { ok: false, error: 'Invalid login details.' }
    }

    return this.loginTenantUser({ email, password, loginTenant })
  }

  private async loginTenantUser({
    email,
    password,
    loginTenant,
  }: {
    email: string
    password: string
    loginTenant: Tenant
  }) {
    const tenantDatabase = getTenantDatabase(loginTenant)
    const user = await tenantDatabase
      .selectFrom('users')
      .innerJoin('user_tenants', 'user_tenants.user_id', 'users.id')
      .select(['users.id', 'users.name', 'users.email', 'users.password_hash', 'user_tenants.role', 'users.status'])
      .where('email', '=', email)
      .where('user_tenants.status', '=', 'active')
      .executeTakeFirst()

    if (!user || user.status !== 'active' || !verifyPassword(password, user.password_hash)) {
      return { ok: false, error: 'Invalid login details.' }
    }

    const selectedTenant = {
      ...loginTenant,
      role: user.role,
    }

    const token = signJwt({
      sub: user.id,
      email: user.email,
      role: user.role,
      tenantCode: loginTenant.slug,
      identitySource: 'tenant',
      superAdmin: false,
    })

    return {
      ok: true,
      token,
      user: { id: user.id, name: user.name, email: user.email },
      tenants: [selectedTenant],
      selectedTenant,
    }
  }

  private async loginPlatformUser({
    email,
    password,
    surface,
  }: {
    email: string
    password: string
    surface: 'admin' | 'super-admin'
  }) {
    const user = await this.auth.findAdminUserByEmail(email)

    if (!user || user.status !== 'active' || !verifyPassword(password, user.password_hash)) {
      return { ok: false, error: 'Invalid login details.' }
    }

    const selectedTenant = platformTenant(user.role)

    const token = signJwt({
      sub: user.id,
      email: user.email,
      role: user.role,
      tenantCode: selectedTenant.slug,
      identitySource: 'platform',
      superAdmin: user.role === 'super-admin',
    })

    if (!roleMatchesSurface(user.role, surface)) {
      return { ok: false, error: 'Invalid login details.' }
    }

    return {
      ok: true,
      token,
      user: { id: user.id, name: user.name, email: user.email },
      tenants: [selectedTenant],
      selectedTenant,
    }
  }
}

function platformTenant(role: string): AuthTenantAccess {
  const isSuperAdmin = role === 'super-admin'
  return {
    id: 0,
    code: 0,
    corporate_id: null,
    mobile: null,
    slug: isSuperAdmin ? 'super-admin' : 'admin',
    name: isSuperAdmin ? 'Super Admin Desk' : 'Admin Desk',
    status: 'active',
    role,
  }
}

function roleMatchesSurface(role: string, surface: 'admin' | 'super-admin') {
  if (surface === 'super-admin') return role === 'super-admin'
  return ['software-admin', 'support-admin', 'helpdesk-admin'].includes(role)
}
