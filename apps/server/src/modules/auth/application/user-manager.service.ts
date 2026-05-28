import { Inject } from '../../../core/decorators/inject.js'
import { Injectable } from '../../../core/decorators/injectable.js'
import { ForbiddenException, UnauthorizedException } from '../../../core/exceptions/http.exception.js'
import { TenantContextService, type TenantRequestHeaders } from '../../../core/tenant/tenant-context.service.js'
import { verifyJwt, type AuthTokenPayload } from '../../../infrastructure/auth/jwt.js'
import type { AdminUserUpsertInput, PlatformUserStatus, PlatformUserUpsertInput } from '../domain/auth.types.js'
import { AuthRepository, type RequiredAdminUserInput, type RequiredPlatformUserInput } from '../infrastructure/auth.repository.js'

@Injectable()
export class UserManagerService {
  constructor(
    @Inject(AuthRepository) private readonly users: AuthRepository,
    @Inject(TenantContextService) private readonly tenantContext: TenantContextService,
  ) {}

  listAdminUsers(headers: TenantRequestHeaders) {
    this.requireSuperAdminAccess(headers)
    return this.users.listAdminUsers()
  }

  async upsertAdminUser(headers: TenantRequestHeaders, input: AdminUserUpsertInput) {
    const actor = this.requireSuperAdminAccess(headers)
    const normalized = await this.normalizeAdminUser(input)
    if ('error' in normalized) return normalized

    const duplicate = await this.users.findAdminUserByEmailForUpsert(normalized.email, normalized.id)
    if (duplicate) {
      return { ok: false, error: 'Email is already used by another admin user.' }
    }

    const existingUser = normalized.id ? await this.users.findAdminUserById(normalized.id) : undefined
    if (normalized.id && !existingUser) {
      return { ok: false, error: 'Admin user was not found.' }
    }

    if (existingUser?.role === 'super-admin' && (normalized.role !== 'super-admin' || normalized.status !== 'active')) {
      const activeSuperAdminCount = await this.users.countActiveSuperAdmins()
      if (activeSuperAdminCount <= 1) {
        return { ok: false, error: 'At least one active super admin is required.' }
      }
    }

    if (normalized.id === actor.sub && normalized.status !== 'active') {
      return { ok: false, error: 'You cannot suspend your own admin account.' }
    }

    const user = await this.users.upsertAdminUser(normalized)
    if (!user) {
      return { ok: false, error: 'Admin user save failed.' }
    }

    return { ok: true, user }
  }

  listTenantSummaries(headers: TenantRequestHeaders) {
    this.requirePlatformUserManagerAccess(headers)
    return this.users.listUserTenantSummaries()
  }

  async listTenantUsers(headers: TenantRequestHeaders, tenantId: number) {
    const platformAccess = this.platformAccess(headers)
    if (!platformAccess) {
      const context = await this.tenantContext.resolve(headers)
      if (context.tenant.id !== tenantId) {
        throw new ForbiddenException('User list is limited to the authenticated tenant.')
      }
    }

    return this.users.listUsersByTenant(tenantId)
  }

  async upsert(headers: TenantRequestHeaders, input: PlatformUserUpsertInput) {
    const normalized = await this.normalize(input)
    if ('error' in normalized) return normalized
    await this.requireTenantUserManagerAccess(headers, normalized.tenant_id)

    const duplicate = await this.users.findUserByEmailForUpsert(normalized.tenant_id, normalized.email, normalized.user_id)
    if (duplicate) {
      return { ok: false, error: 'Email is already used by another user.' }
    }

    const existingUser = normalized.user_id ? await this.users.findUserById(normalized.tenant_id, normalized.user_id) : undefined
    if (normalized.user_id && !existingUser) {
      return { ok: false, error: 'User was not found.' }
    }

    const user = await this.users.upsertTenantUser(normalized)
    if (!user) {
      return { ok: false, error: 'User save failed.' }
    }

    return { ok: true, user }
  }

  private async normalize(input: PlatformUserUpsertInput): Promise<RequiredPlatformUserInput | { ok: false; error: string }> {
    const tenantId = numberOrUndefined(input.tenant_id ?? input.tenantId)
    const userId = numberOrUndefined(input.user_id)
    const accessId = numberOrUndefined(input.access_id)
    const name = input.name?.trim() ?? ''
    const email = input.email?.trim().toLowerCase() ?? ''
    const password = input.password?.trim() ?? ''
    const role = normalizeRole(input.role)
    const status = normalizeStatus(input.status)

    if (!tenantId) return { ok: false, error: 'Tenant is required.' }
    if (!name) return { ok: false, error: 'Name is required.' }
    if (!email || !email.includes('@')) return { ok: false, error: 'Valid email is required.' }
    if (!userId && !password) return { ok: false, error: 'Password is required for new users.' }
    if (!role) return { ok: false, error: 'Role must be admin, manager, staff, user, or software-admin.' }

    return {
      access_id: accessId,
      user_id: userId,
      tenant_id: tenantId,
      name,
      email,
      password,
      role,
      status,
    }
  }

  private async normalizeAdminUser(input: AdminUserUpsertInput): Promise<RequiredAdminUserInput | { ok: false; error: string }> {
    const id = numberOrUndefined(input.id)
    const name = input.name?.trim() ?? ''
    const email = input.email?.trim().toLowerCase() ?? ''
    const password = input.password?.trim() ?? ''
    const role = normalizeAdminRole(input.role)
    const status = normalizeStatus(input.status)

    if (!name) return { ok: false, error: 'Name is required.' }
    if (!email || !email.includes('@')) return { ok: false, error: 'Valid email is required.' }
    if (!id && !password) return { ok: false, error: 'Password is required for new admin users.' }
    if (!role) return { ok: false, error: 'Role must be super-admin, software-admin, support-admin, or helpdesk-admin.' }

    return {
      id,
      name,
      email,
      password,
      role,
      status,
    }
  }

  private requireSuperAdminAccess(headers: TenantRequestHeaders) {
    const auth = this.platformAccess(headers)
    if (!auth || auth.role !== 'super-admin') {
      throw new ForbiddenException('Super-admin access is required.')
    }

    return auth
  }

  private requirePlatformUserManagerAccess(headers: TenantRequestHeaders) {
    if (!this.platformAccess(headers)) {
      throw new ForbiddenException('Platform user-manager access is required.')
    }
  }

  private async requireTenantUserManagerAccess(headers: TenantRequestHeaders, tenantId: number) {
    if (this.platformAccess(headers)) {
      return
    }

    const context = await this.tenantContext.resolve(headers)
    if (context.tenant.id !== tenantId) {
      throw new ForbiddenException('User management is limited to the authenticated tenant.')
    }

    if (!['admin', 'manager', 'software-admin'].includes(context.user.role)) {
      throw new ForbiddenException('Tenant admin or manager access is required.')
    }
  }

  private platformAccess(headers: TenantRequestHeaders): AuthTokenPayload | undefined {
    const auth = verifyJwt(bearerToken(firstHeader(headers.authorization)))
    if (!auth) {
      throw new UnauthorizedException('Authentication is required.')
    }

    if (auth.identitySource !== 'platform') {
      return undefined
    }

    return isPlatformUserManagerRole(auth.role) ? auth : undefined
  }
}

function numberOrUndefined(value: unknown) {
  const numberValue = Number(value)
  return Number.isInteger(numberValue) && numberValue > 0 ? numberValue : undefined
}

function normalizeStatus(value: unknown): PlatformUserStatus {
  return value === 'active' || value === 'inactive' || value === 'suspend' ? value : 'active'
}

function normalizeRole(value: unknown) {
  const role = String(value ?? '').trim()
  if (!role) return 'user'
  if (['admin', 'manager', 'staff', 'user', 'software-admin'].includes(role)) return role
  return ''
}

function normalizeAdminRole(value: unknown) {
  const role = String(value ?? '').trim()
  if (!role) return 'software-admin'
  if (['super-admin', 'software-admin', 'support-admin', 'helpdesk-admin'].includes(role)) return role
  return ''
}

function firstHeader(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value
}

function bearerToken(value?: string) {
  if (!value?.toLowerCase().startsWith('bearer ')) {
    return undefined
  }

  return value.slice('bearer '.length).trim()
}

function isPlatformUserManagerRole(role: string) {
  return ['super-admin', 'software-admin', 'support-admin', 'helpdesk-admin'].includes(role)
}
