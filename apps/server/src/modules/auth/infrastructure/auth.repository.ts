import { Injectable } from '../../../core/decorators/injectable.js'
import { getDatabase } from '../../../infrastructure/database/connection.js'
import type { AuthTenantAccess } from '../domain/auth.types.js'

@Injectable()
export class AuthRepository {
  findUserByEmail(email: string) {
    return getDatabase()
      .selectFrom('users')
      .select(['id', 'name', 'email', 'password_hash', 'status'])
      .where('email', '=', email)
      .executeTakeFirst()
  }

  listTenantAccess(userId: number): Promise<AuthTenantAccess[]> {
    return getDatabase()
      .selectFrom('user_tenants')
      .innerJoin('tenants', 'tenants.id', 'user_tenants.tenant_id')
      .select([
        'tenants.id as id',
        'tenants.code as code',
        'tenants.slug as slug',
        'tenants.name as name',
        'tenants.status as status',
        'user_tenants.role as role',
      ])
      .where('user_tenants.user_id', '=', userId)
      .orderBy('tenants.code', 'asc')
      .execute() as Promise<AuthTenantAccess[]>
  }
}
