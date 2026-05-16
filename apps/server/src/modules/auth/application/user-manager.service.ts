import { Inject } from '../../../core/decorators/inject.js'
import { Injectable } from '../../../core/decorators/injectable.js'
import type { PlatformUserStatus, PlatformUserUpsertInput } from '../domain/auth.types.js'
import { AuthRepository, type RequiredPlatformUserInput } from '../infrastructure/auth.repository.js'

@Injectable()
export class UserManagerService {
  constructor(
    @Inject(AuthRepository) private readonly users: AuthRepository,
  ) {}

  listTenantSummaries() {
    return this.users.listUserTenantSummaries()
  }

  listTenantUsers(tenantId: number) {
    return this.users.listUsersByTenant(tenantId)
  }

  async upsert(input: PlatformUserUpsertInput) {
    const normalized = await this.normalize(input)
    if ('error' in normalized) return normalized

    const duplicate = await this.users.findUserByEmailForUpsert(normalized.email, normalized.user_id)
    if (duplicate) {
      return { ok: false, error: 'Email is already used by another user.' }
    }

    const existingUser = normalized.user_id ? await this.users.findUserById(normalized.user_id) : undefined
    if (normalized.user_id && !existingUser) {
      return { ok: false, error: 'User was not found.' }
    }

    const user = await this.users.upsertPlatformUser(normalized)
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
