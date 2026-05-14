export type TenantEventName = 'tenant.created' | 'tenant.updated' | 'tenant.deleted' | 'tenant.restored'

export interface TenantDomainEvent {
  name: TenantEventName
  tenantId: number
  tenantCode: number
  occurredAt: string
}

export function tenantCreated(tenantId: number, tenantCode: number): TenantDomainEvent {
  return createTenantEvent('tenant.created', tenantId, tenantCode)
}

export function tenantUpdated(tenantId: number, tenantCode: number): TenantDomainEvent {
  return createTenantEvent('tenant.updated', tenantId, tenantCode)
}

export function tenantDeleted(tenantId: number, tenantCode: number): TenantDomainEvent {
  return createTenantEvent('tenant.deleted', tenantId, tenantCode)
}

export function tenantRestored(tenantId: number, tenantCode: number): TenantDomainEvent {
  return createTenantEvent('tenant.restored', tenantId, tenantCode)
}

function createTenantEvent(name: TenantEventName, tenantId: number, tenantCode: number): TenantDomainEvent {
  return {
    name,
    tenantId,
    tenantCode,
    occurredAt: new Date().toISOString(),
  }
}
