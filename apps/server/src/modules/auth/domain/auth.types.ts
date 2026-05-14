export interface LoginInput {
  email?: string
  password?: string
  tenantCode?: string
}

export interface AuthTenantAccess {
  id: number
  code: number
  slug: string
  name: string
  status: string
  role: string
}
