import { sql, type Kysely } from 'kysely'
import { Injectable } from '../../../core/decorators/injectable.js'
import type { Tenant } from '../../../core/tenant/domain/tenant.types.js'
import { getDatabase } from '../../../infrastructure/database/connection.js'
import { getTenantDatabase } from '../../../infrastructure/tenant-database/tenant-database.connection.js'
import { dispatchPublicUuid } from '../../../shared/helpers/public-uuid.js'
import type {
  TirupurConnectProductPublication,
  TirupurConnectProductPublicationDetail,
  TirupurConnectPublicInquiryInput,
  TirupurConnectPublicRfq,
  TirupurConnectSupplierPublication,
  TirupurConnectSupplierPublicationDetail,
} from '../core/tirupur-connect.types.js'
import { tirupurConnectTenantSlug } from './database/migrations/tirupur-connect.migration.js'

type DynamicDatabase = Record<string, Record<string, unknown>>

@Injectable()
export class TirupurConnectPublicRepository {
  async listSuppliers(): Promise<TirupurConnectSupplierPublication[]> {
    const central = await this.centralMarketplace()
    const result = await sql<PublicSupplierRow>`
      SELECT id, uuid, source_tenant_id, source_tenant_slug, source_supplier_uuid, brand_name, business_type,
             monthly_capacity, min_order_qty, verification_level, publication_status, created_at, reviewed_at
      FROM tc_supplier_publications
      WHERE tenant_id = ${central.tenant.id}
        AND publication_status = 'approved'
        AND deleted_at IS NULL
      ORDER BY reviewed_at DESC, id DESC
      LIMIT 100
    `.execute(central.database)

    return result.rows.map(mapSupplierPublication)
  }

  async getSupplier(uuid: string): Promise<TirupurConnectSupplierPublicationDetail | null> {
    const central = await this.centralMarketplace()
    const result = await sql<PublicSupplierRow & { about: string | null; factory_address: string | null }>`
      SELECT id, uuid, source_tenant_id, source_tenant_slug, source_supplier_uuid, brand_name, business_type,
             about, factory_address, monthly_capacity, min_order_qty, verification_level, publication_status,
             created_at, reviewed_at
      FROM tc_supplier_publications
      WHERE tenant_id = ${central.tenant.id}
        AND uuid = ${uuid}
        AND publication_status = 'approved'
        AND deleted_at IS NULL
      LIMIT 1
    `.execute(central.database)

    const row = result.rows[0]
    return row
      ? {
        ...mapSupplierPublication(row),
        about: row.about,
        factoryAddress: row.factory_address,
        verificationLevel: row.verification_level,
      }
      : null
  }

  async listProducts(): Promise<TirupurConnectProductPublication[]> {
    const central = await this.centralMarketplace()
    const result = await sql<PublicProductRow>`
      SELECT id, uuid, source_tenant_id, source_tenant_slug, source_product_uuid, source_supplier_uuid, slug,
             description, moq, lead_time, publication_status, created_at, reviewed_at
      FROM tc_product_publications
      WHERE tenant_id = ${central.tenant.id}
        AND publication_status = 'approved'
        AND deleted_at IS NULL
      ORDER BY reviewed_at DESC, id DESC
      LIMIT 100
    `.execute(central.database)

    return result.rows.map(mapProductPublication)
  }

  async getProduct(uuidOrSlug: string): Promise<TirupurConnectProductPublicationDetail | null> {
    const central = await this.centralMarketplace()
    const result = await sql<PublicProductRow & { fabric_details: string | null; certification_details: string | null }>`
      SELECT id, uuid, source_tenant_id, source_tenant_slug, source_product_uuid, source_supplier_uuid, slug,
             description, moq, lead_time, fabric_details, certification_details, publication_status, created_at, reviewed_at
      FROM tc_product_publications
      WHERE tenant_id = ${central.tenant.id}
        AND (uuid = ${uuidOrSlug} OR slug = ${uuidOrSlug})
        AND publication_status = 'approved'
        AND deleted_at IS NULL
      LIMIT 1
    `.execute(central.database)

    const row = result.rows[0]
    return row
      ? { ...mapProductPublication(row), fabricDetails: row.fabric_details, certificationDetails: row.certification_details }
      : null
  }

  async listRfqs(): Promise<TirupurConnectPublicRfq[]> {
    const central = await this.centralMarketplace()
    const result = await sql<PublicRfqRow>`
      SELECT id, uuid, title, description, quantity, delivery_deadline, budget_min, budget_max, status, created_at
      FROM tc_rfq
      WHERE tenant_id = ${central.tenant.id}
        AND status = 'open'
        AND deleted_at IS NULL
      ORDER BY created_at DESC, id DESC
      LIMIT 100
    `.execute(central.database)

    return result.rows.map(mapRfq)
  }

  async getRfq(uuid: string): Promise<TirupurConnectPublicRfq | null> {
    const central = await this.centralMarketplace()
    const result = await sql<PublicRfqRow>`
      SELECT id, uuid, title, description, quantity, delivery_deadline, budget_min, budget_max, status, created_at
      FROM tc_rfq
      WHERE tenant_id = ${central.tenant.id}
        AND uuid = ${uuid}
        AND status = 'open'
        AND deleted_at IS NULL
      LIMIT 1
    `.execute(central.database)

    const row = result.rows[0]
    return row ? mapRfq(row) : null
  }

  async createInquiry(input: Required<Pick<TirupurConnectPublicInquiryInput, 'buyerName' | 'entityType' | 'message'>> & TirupurConnectPublicInquiryInput) {
    const central = await this.centralMarketplace()
    await sql`
      INSERT INTO tc_inquiries (
        uuid, tenant_id, company_id, entity_type, entity_uuid, source_tenant_slug, buyer_name,
        company_name, email, phone, message, status, created_by, updated_by
      ) VALUES (
        ${dispatchPublicUuid()}, ${central.tenant.id}, NULL, ${input.entityType}, ${input.entityUuid ?? null},
        ${input.sourceTenantSlug ?? null}, ${input.buyerName}, ${input.companyName ?? null},
        ${input.email ?? null}, ${input.phone ?? null}, ${input.message}, 'new', NULL, NULL
      )
    `.execute(central.database)
  }

  private async centralMarketplace() {
    const tenant = await getDatabase()
      .selectFrom('tenants')
      .selectAll()
      .where('slug', '=', tirupurConnectTenantSlug)
      .where('deleted_at', 'is', null)
      .executeTakeFirst() as Tenant | undefined

    if (!tenant) throw new Error('Central Tirupur Connect tenant is not provisioned.')

    return {
      tenant,
      database: getTenantDatabase(tenant) as unknown as Kysely<DynamicDatabase>,
    }
  }
}

type PublicSupplierRow = {
  id: number
  uuid: string
  source_tenant_id: number
  source_tenant_slug: string
  source_supplier_uuid: string
  brand_name: string | null
  business_type: string | null
  monthly_capacity: string | null
  min_order_qty: number | null
  verification_level: string
  publication_status: string
  created_at: Date | string
  reviewed_at: Date | string | null
}

type PublicProductRow = {
  id: number
  uuid: string
  source_tenant_id: number
  source_tenant_slug: string
  source_product_uuid: string
  source_supplier_uuid: string | null
  slug: string
  description: string | null
  moq: number | null
  lead_time: string | null
  publication_status: string
  created_at: Date | string
  reviewed_at: Date | string | null
}

type PublicRfqRow = {
  id: number
  uuid: string
  title: string
  description: string | null
  quantity: number
  delivery_deadline: Date | string | null
  budget_min: number | null
  budget_max: number | null
  status: string
  created_at: Date | string
}

function mapSupplierPublication(row: PublicSupplierRow): TirupurConnectSupplierPublication {
  return {
    id: Number(row.id),
    uuid: row.uuid,
    sourceTenantId: Number(row.source_tenant_id),
    sourceTenantSlug: row.source_tenant_slug,
    sourceSupplierUuid: row.source_supplier_uuid,
    brandName: row.brand_name,
    businessType: row.business_type,
    monthlyCapacity: row.monthly_capacity,
    minOrderQty: row.min_order_qty === null ? null : Number(row.min_order_qty),
    publicationStatus: row.publication_status,
    createdAt: toIsoString(row.created_at),
    reviewedAt: row.reviewed_at ? toIsoString(row.reviewed_at) : null,
  }
}

function mapProductPublication(row: PublicProductRow): TirupurConnectProductPublication {
  return {
    id: Number(row.id),
    uuid: row.uuid,
    sourceTenantId: Number(row.source_tenant_id),
    sourceTenantSlug: row.source_tenant_slug,
    sourceProductUuid: row.source_product_uuid,
    sourceSupplierUuid: row.source_supplier_uuid,
    slug: row.slug,
    description: row.description,
    moq: row.moq === null ? null : Number(row.moq),
    leadTime: row.lead_time,
    publicationStatus: row.publication_status,
    createdAt: toIsoString(row.created_at),
    reviewedAt: row.reviewed_at ? toIsoString(row.reviewed_at) : null,
  }
}

function mapRfq(row: PublicRfqRow): TirupurConnectPublicRfq {
  return {
    id: Number(row.id),
    uuid: row.uuid,
    title: row.title,
    description: row.description,
    quantity: Number(row.quantity),
    deliveryDeadline: row.delivery_deadline ? toDateString(row.delivery_deadline) : null,
    budgetMin: row.budget_min === null ? null : Number(row.budget_min),
    budgetMax: row.budget_max === null ? null : Number(row.budget_max),
    status: row.status,
    createdAt: toIsoString(row.created_at),
  }
}

function toIsoString(value: Date | string) {
  return value instanceof Date ? value.toISOString() : String(value)
}

function toDateString(value: Date | string) {
  if (value instanceof Date) return value.toISOString().slice(0, 10)
  return String(value).slice(0, 10)
}
