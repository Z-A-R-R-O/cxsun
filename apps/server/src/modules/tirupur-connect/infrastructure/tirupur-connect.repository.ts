import { sql, type Kysely } from 'kysely'
import { Injectable } from '../../../core/decorators/injectable.js'
import type { TenantRuntimeContext } from '../../../core/tenant/tenant-context.service.js'
import type { Tenant } from '../../../core/tenant/domain/tenant.types.js'
import { getDatabase } from '../../../infrastructure/database/connection.js'
import { getTenantDatabase } from '../../../infrastructure/tenant-database/tenant-database.connection.js'
import { dispatchPublicUuid } from '../../../shared/helpers/public-uuid.js'
import { defaultTirupurConnectSettings } from '../core/tirupur-connect.defaults.js'
import { tirupurConnectTenantSlug } from './database/migrations/tirupur-connect.migration.js'
import type {
  TirupurConnectBuyerCompany,
  TirupurConnectBuyerCompanyInput,
  TirupurConnectOverview,
  TirupurConnectProduct,
  TirupurConnectProductInput,
  TirupurConnectProductPublication,
  TirupurConnectRfq,
  TirupurConnectRfqInput,
  TirupurConnectSettings,
  TirupurConnectSupplierPublication,
  TirupurConnectSupplierProfile,
  TirupurConnectSupplierProfileInput,
} from '../core/tirupur-connect.types.js'

type DynamicDatabase = Record<string, Record<string, unknown>>

const settingsKey = 'module-settings'

@Injectable()
export class TirupurConnectRepository {
  async overview(context: TenantRuntimeContext): Promise<TirupurConnectOverview> {
    const marketplace = this.isMarketplaceTenant(context)
    const [settings, suppliers, products] = await Promise.all([
      this.settings(context),
      this.count(context, 'tc_supplier_profiles'),
      this.count(context, 'tc_products'),
    ])
    const [buyers, rfqs, events, news, messages] = marketplace
      ? await Promise.all([
        this.count(context, 'tc_buyer_companies'),
        this.count(context, 'tc_rfq'),
        this.count(context, 'tc_events'),
        this.count(context, 'tc_news_articles'),
        this.count(context, 'tc_messages'),
      ])
      : [0, 0, 0, 0, 0]

    return {
      settings,
      mode: marketplace ? 'marketplace' : 'client',
      counts: { suppliers, buyers, products, rfqs, events, news, messages },
    }
  }

  async settings(context: TenantRuntimeContext): Promise<TirupurConnectSettings> {
    const row = await this.database(context)
      .selectFrom('tc_system_settings')
      .select('setting_value')
      .where('tenant_id', '=', context.tenant.id)
      .where('company_id', 'is', null)
      .where('setting_key', '=', settingsKey)
      .where('deleted_at', 'is', null)
      .executeTakeFirst()

    return normalizeSettings(row?.setting_value)
  }

  async upsertSettings(context: TenantRuntimeContext, input: Partial<TirupurConnectSettings>): Promise<TirupurConnectOverview> {
    const current = await this.settings(context)
    const next = normalizeSettings({ ...current, ...input })
    const existing = await this.database(context)
      .selectFrom('tc_system_settings')
      .select('id')
      .where('tenant_id', '=', context.tenant.id)
      .where('company_id', 'is', null)
      .where('setting_key', '=', settingsKey)
      .where('deleted_at', 'is', null)
      .executeTakeFirst()

    const patch = {
      setting_value: JSON.stringify(next),
      updated_by: context.user.id,
    }

    if (existing) {
      await this.database(context).updateTable('tc_system_settings').set(patch).where('id', '=', Number(existing.id)).execute()
    } else {
      await this.database(context)
        .insertInto('tc_system_settings')
        .values({
          uuid: dispatchPublicUuid(),
          tenant_id: context.tenant.id,
          company_id: null,
          setting_key: settingsKey,
          created_by: context.user.id,
          ...patch,
        })
        .execute()
    }

    return this.overview(context)
  }

  async listSuppliers(context: TenantRuntimeContext): Promise<TirupurConnectSupplierProfile[]> {
    const result = await sql<{
      id: number
      uuid: string
      contact_id: number
      brand_name: string | null
      business_type: string | null
      monthly_capacity: string | null
      min_order_qty: number | null
      verification_level: string
      publication_status: string
      published_at: Date | string | null
      status: string
      created_at: Date | string
    }>`
      SELECT id, uuid, contact_id, brand_name, business_type, monthly_capacity, min_order_qty, verification_level, publication_status, published_at, status, created_at
      FROM tc_supplier_profiles
      WHERE tenant_id = ${context.tenant.id}
        AND deleted_at IS NULL
      ORDER BY id DESC
      LIMIT 100
    `.execute(this.database(context))

    return result.rows.map((row) => ({
      id: Number(row.id),
      uuid: row.uuid,
      contactId: Number(row.contact_id),
      brandName: row.brand_name,
      businessType: row.business_type,
      monthlyCapacity: row.monthly_capacity,
      minOrderQty: row.min_order_qty === null ? null : Number(row.min_order_qty),
      verificationLevel: row.verification_level,
      publicationStatus: row.publication_status,
      publishedAt: row.published_at ? toIsoString(row.published_at) : null,
      status: row.status,
      createdAt: toIsoString(row.created_at),
    }))
  }

  async createSupplier(context: TenantRuntimeContext, input: TirupurConnectSupplierProfileInput) {
    const contactId = requiredNumber(input.contactId, 'contactId')
    await sql`
      INSERT INTO tc_supplier_profiles (
        uuid, tenant_id, company_id, contact_id, brand_name, business_type, about, factory_address,
        monthly_capacity, min_order_qty, status, created_by, updated_by
      ) VALUES (
        ${dispatchPublicUuid()}, ${context.tenant.id}, NULL, ${contactId}, ${optionalString(input.brandName)}, ${optionalString(input.businessType)},
        ${optionalString(input.about)}, ${optionalString(input.factoryAddress)}, ${optionalString(input.monthlyCapacity)}, ${optionalNumber(input.minOrderQty)},
        ${statusOrDefault(input.status, 'draft')}, ${context.user.id}, ${context.user.id}
      )
    `.execute(this.database(context))
  }

  async listBuyers(context: TenantRuntimeContext): Promise<TirupurConnectBuyerCompany[]> {
    const result = await sql<{
      id: number
      uuid: string
      contact_id: number
      buyer_type: string | null
      annual_volume: string | null
      description: string | null
      status: string
      created_at: Date | string
    }>`
      SELECT id, uuid, contact_id, buyer_type, annual_volume, description, status, created_at
      FROM tc_buyer_companies
      WHERE tenant_id = ${context.tenant.id}
        AND deleted_at IS NULL
      ORDER BY id DESC
      LIMIT 100
    `.execute(this.database(context))

    return result.rows.map((row) => ({
      id: Number(row.id),
      uuid: row.uuid,
      contactId: Number(row.contact_id),
      buyerType: row.buyer_type,
      annualVolume: row.annual_volume,
      description: row.description,
      status: row.status,
      createdAt: toIsoString(row.created_at),
    }))
  }

  async createBuyer(context: TenantRuntimeContext, input: TirupurConnectBuyerCompanyInput) {
    const contactId = requiredNumber(input.contactId, 'contactId')
    await sql`
      INSERT INTO tc_buyer_companies (
        uuid, tenant_id, company_id, contact_id, buyer_type, annual_volume, description, status, created_by, updated_by
      ) VALUES (
        ${dispatchPublicUuid()}, ${context.tenant.id}, NULL, ${contactId}, ${optionalString(input.buyerType)},
        ${optionalString(input.annualVolume)}, ${optionalString(input.description)}, ${statusOrDefault(input.status, 'draft')},
        ${context.user.id}, ${context.user.id}
      )
    `.execute(this.database(context))
  }

  async listProducts(context: TenantRuntimeContext): Promise<TirupurConnectProduct[]> {
    const result = await sql<{
      id: number
      uuid: string
      product_id: number
      supplier_profile_id: number
      slug: string
      description: string | null
      moq: number | null
      lead_time: string | null
      publication_status: string
      published_at: Date | string | null
      status: string
      created_at: Date | string
    }>`
      SELECT id, uuid, product_id, supplier_profile_id, slug, description, moq, lead_time, publication_status, published_at, status, created_at
      FROM tc_products
      WHERE tenant_id = ${context.tenant.id}
        AND deleted_at IS NULL
      ORDER BY id DESC
      LIMIT 100
    `.execute(this.database(context))

    return result.rows.map((row) => ({
      id: Number(row.id),
      uuid: row.uuid,
      productId: Number(row.product_id),
      supplierProfileId: Number(row.supplier_profile_id),
      slug: row.slug,
      description: row.description,
      moq: row.moq === null ? null : Number(row.moq),
      leadTime: row.lead_time,
      publicationStatus: row.publication_status,
      publishedAt: row.published_at ? toIsoString(row.published_at) : null,
      status: row.status,
      createdAt: toIsoString(row.created_at),
    }))
  }

  async createProduct(context: TenantRuntimeContext, input: TirupurConnectProductInput) {
    const productId = requiredNumber(input.productId, 'productId')
    const supplierProfileId = requiredNumber(input.supplierProfileId, 'supplierProfileId')
    const slug = requiredString(input.slug, 'slug')
    await sql`
      INSERT INTO tc_products (
        uuid, tenant_id, company_id, product_id, supplier_profile_id, slug, description, moq, lead_time,
        fabric_details, certification_details, status, created_by, updated_by
      ) VALUES (
        ${dispatchPublicUuid()}, ${context.tenant.id}, NULL, ${productId}, ${supplierProfileId}, ${slug},
        ${optionalString(input.description)}, ${optionalNumber(input.moq)}, ${optionalString(input.leadTime)},
        ${optionalString(input.fabricDetails)}, ${optionalString(input.certificationDetails)}, ${statusOrDefault(input.status, 'draft')},
        ${context.user.id}, ${context.user.id}
      )
    `.execute(this.database(context))
  }

  async listRfqs(context: TenantRuntimeContext): Promise<TirupurConnectRfq[]> {
    const result = await sql<{
      id: number
      uuid: string
      buyer_company_id: number
      title: string
      description: string | null
      quantity: number
      delivery_deadline: Date | string | null
      budget_min: number | null
      budget_max: number | null
      status: string
      created_at: Date | string
    }>`
      SELECT id, uuid, buyer_company_id, title, description, quantity, delivery_deadline, budget_min, budget_max, status, created_at
      FROM tc_rfq
      WHERE tenant_id = ${context.tenant.id}
        AND deleted_at IS NULL
      ORDER BY id DESC
      LIMIT 100
    `.execute(this.database(context))

    return result.rows.map((row) => ({
      id: Number(row.id),
      uuid: row.uuid,
      buyerCompanyId: Number(row.buyer_company_id),
      title: row.title,
      description: row.description,
      quantity: Number(row.quantity),
      deliveryDeadline: row.delivery_deadline ? toDateString(row.delivery_deadline) : null,
      budgetMin: row.budget_min === null ? null : Number(row.budget_min),
      budgetMax: row.budget_max === null ? null : Number(row.budget_max),
      status: row.status,
      createdAt: toIsoString(row.created_at),
    }))
  }

  async createRfq(context: TenantRuntimeContext, input: TirupurConnectRfqInput) {
    const buyerCompanyId = requiredNumber(input.buyerCompanyId, 'buyerCompanyId')
    const title = requiredString(input.title, 'title')
    await sql`
      INSERT INTO tc_rfq (
        uuid, tenant_id, company_id, buyer_company_id, title, description, quantity, delivery_deadline,
        budget_min, budget_max, status, created_by, updated_by
      ) VALUES (
        ${dispatchPublicUuid()}, ${context.tenant.id}, NULL, ${buyerCompanyId}, ${title}, ${optionalString(input.description)},
        ${optionalNumber(input.quantity) ?? 0}, ${optionalDate(input.deliveryDeadline)}, ${optionalNumber(input.budgetMin)},
        ${optionalNumber(input.budgetMax)}, ${statusOrDefault(input.status, 'open')}, ${context.user.id}, ${context.user.id}
      )
    `.execute(this.database(context))
  }

  async listSupplierPublications(context: TenantRuntimeContext): Promise<TirupurConnectSupplierPublication[]> {
    const result = await sql<{
      id: number
      uuid: string
      source_tenant_id: number
      source_tenant_slug: string
      source_supplier_uuid: string
      brand_name: string | null
      business_type: string | null
      monthly_capacity: string | null
      min_order_qty: number | null
      publication_status: string
      created_at: Date | string
      reviewed_at: Date | string | null
    }>`
      SELECT id, uuid, source_tenant_id, source_tenant_slug, source_supplier_uuid, brand_name, business_type,
             monthly_capacity, min_order_qty, publication_status, created_at, reviewed_at
      FROM tc_supplier_publications
      WHERE tenant_id = ${context.tenant.id}
        AND deleted_at IS NULL
      ORDER BY FIELD(publication_status, 'pending_review', 'approved', 'rejected'), id DESC
      LIMIT 200
    `.execute(this.database(context))

    return result.rows.map((row) => ({
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
    }))
  }

  async listProductPublications(context: TenantRuntimeContext): Promise<TirupurConnectProductPublication[]> {
    const result = await sql<{
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
    }>`
      SELECT id, uuid, source_tenant_id, source_tenant_slug, source_product_uuid, source_supplier_uuid, slug,
             description, moq, lead_time, publication_status, created_at, reviewed_at
      FROM tc_product_publications
      WHERE tenant_id = ${context.tenant.id}
        AND deleted_at IS NULL
      ORDER BY FIELD(publication_status, 'pending_review', 'approved', 'rejected'), id DESC
      LIMIT 200
    `.execute(this.database(context))

    return result.rows.map((row) => ({
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
    }))
  }

  async reviewSupplierPublication(context: TenantRuntimeContext, uuid: string, status: string) {
    await this.reviewPublication(context, 'tc_supplier_publications', uuid, status)
  }

  async reviewProductPublication(context: TenantRuntimeContext, uuid: string, status: string) {
    await this.reviewPublication(context, 'tc_product_publications', uuid, status)
  }

  async listPublicSuppliers(): Promise<TirupurConnectSupplierPublication[]> {
    const central = await this.centralMarketplace()
    const result = await sql<{
      id: number
      uuid: string
      source_tenant_id: number
      source_tenant_slug: string
      source_supplier_uuid: string
      brand_name: string | null
      business_type: string | null
      monthly_capacity: string | null
      min_order_qty: number | null
      publication_status: string
      created_at: Date | string
      reviewed_at: Date | string | null
    }>`
      SELECT id, uuid, source_tenant_id, source_tenant_slug, source_supplier_uuid, brand_name, business_type,
             monthly_capacity, min_order_qty, publication_status, created_at, reviewed_at
      FROM tc_supplier_publications
      WHERE tenant_id = ${central.tenant.id}
        AND publication_status = 'approved'
        AND deleted_at IS NULL
      ORDER BY reviewed_at DESC, id DESC
      LIMIT 100
    `.execute(central.database)

    return result.rows.map((row) => ({
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
    }))
  }

  async listPublicProducts(): Promise<TirupurConnectProductPublication[]> {
    const central = await this.centralMarketplace()
    const result = await sql<{
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
    }>`
      SELECT id, uuid, source_tenant_id, source_tenant_slug, source_product_uuid, source_supplier_uuid, slug,
             description, moq, lead_time, publication_status, created_at, reviewed_at
      FROM tc_product_publications
      WHERE tenant_id = ${central.tenant.id}
        AND publication_status = 'approved'
        AND deleted_at IS NULL
      ORDER BY reviewed_at DESC, id DESC
      LIMIT 100
    `.execute(central.database)

    return result.rows.map((row) => ({
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
    }))
  }

  async publishSupplier(context: TenantRuntimeContext, supplierUuid: string) {
    const supplier = await sql<{
      id: number
      uuid: string
      contact_id: number
      brand_name: string | null
      business_type: string | null
      about: string | null
      factory_address: string | null
      monthly_capacity: string | null
      min_order_qty: number | null
      verification_level: string
    }>`
      SELECT id, uuid, contact_id, brand_name, business_type, about, factory_address, monthly_capacity, min_order_qty, verification_level
      FROM tc_supplier_profiles
      WHERE tenant_id = ${context.tenant.id}
        AND uuid = ${supplierUuid}
        AND deleted_at IS NULL
      LIMIT 1
    `.execute(this.database(context))

    const row = supplier.rows[0]
    if (!row) throw new Error('Supplier profile was not found.')

    const central = await this.centralMarketplace()
    const existing = await sql<{ uuid: string }>`
      SELECT uuid FROM tc_supplier_publications
      WHERE source_tenant_id = ${context.tenant.id}
        AND source_supplier_uuid = ${row.uuid}
        AND deleted_at IS NULL
      LIMIT 1
    `.execute(central.database)

    const publicationUuid = existing.rows[0]?.uuid ?? dispatchPublicUuid()
    if (existing.rows[0]) {
      await sql`
        UPDATE tc_supplier_publications
        SET source_tenant_slug = ${context.tenant.slug},
            source_contact_id = ${Number(row.contact_id)},
            brand_name = ${row.brand_name},
            business_type = ${row.business_type},
            about = ${row.about},
            factory_address = ${row.factory_address},
            monthly_capacity = ${row.monthly_capacity},
            min_order_qty = ${row.min_order_qty},
            verification_level = ${row.verification_level},
            publication_status = 'pending_review',
            updated_by = ${context.user.id}
        WHERE uuid = ${publicationUuid}
      `.execute(central.database)
    } else {
      await sql`
        INSERT INTO tc_supplier_publications (
          uuid, tenant_id, company_id, source_tenant_id, source_tenant_slug, source_supplier_uuid, source_contact_id,
          brand_name, business_type, about, factory_address, monthly_capacity, min_order_qty, verification_level,
          publication_status, created_by, updated_by
        ) VALUES (
          ${publicationUuid}, ${central.tenant.id}, NULL, ${context.tenant.id}, ${context.tenant.slug}, ${row.uuid}, ${Number(row.contact_id)},
          ${row.brand_name}, ${row.business_type}, ${row.about}, ${row.factory_address}, ${row.monthly_capacity}, ${row.min_order_qty},
          ${row.verification_level}, 'pending_review', ${context.user.id}, ${context.user.id}
        )
      `.execute(central.database)
    }

    await sql`
      UPDATE tc_supplier_profiles
      SET publication_status = 'pending_review',
          published_at = CURRENT_TIMESTAMP,
          central_publication_uuid = ${publicationUuid},
          updated_by = ${context.user.id}
      WHERE id = ${Number(row.id)}
    `.execute(this.database(context))
  }

  async publishProduct(context: TenantRuntimeContext, productUuid: string) {
    const product = await sql<{
      id: number
      uuid: string
      product_id: number
      supplier_profile_id: number
      supplier_uuid: string | null
      slug: string
      description: string | null
      moq: number | null
      lead_time: string | null
      fabric_details: string | null
      certification_details: string | null
    }>`
      SELECT tc_products.id, tc_products.uuid, tc_products.product_id, tc_products.supplier_profile_id,
             tc_supplier_profiles.uuid AS supplier_uuid, tc_products.slug, tc_products.description, tc_products.moq,
             tc_products.lead_time, tc_products.fabric_details, tc_products.certification_details
      FROM tc_products
      LEFT JOIN tc_supplier_profiles ON tc_supplier_profiles.id = tc_products.supplier_profile_id
      WHERE tc_products.tenant_id = ${context.tenant.id}
        AND tc_products.uuid = ${productUuid}
        AND tc_products.deleted_at IS NULL
      LIMIT 1
    `.execute(this.database(context))

    const row = product.rows[0]
    if (!row) throw new Error('Product listing was not found.')

    const central = await this.centralMarketplace()
    const existing = await sql<{ uuid: string }>`
      SELECT uuid FROM tc_product_publications
      WHERE source_tenant_id = ${context.tenant.id}
        AND source_product_uuid = ${row.uuid}
        AND deleted_at IS NULL
      LIMIT 1
    `.execute(central.database)

    const publicationUuid = existing.rows[0]?.uuid ?? dispatchPublicUuid()
    if (existing.rows[0]) {
      await sql`
        UPDATE tc_product_publications
        SET source_tenant_slug = ${context.tenant.slug},
            source_product_id = ${Number(row.product_id)},
            source_supplier_uuid = ${row.supplier_uuid},
            source_supplier_profile_id = ${Number(row.supplier_profile_id)},
            slug = ${row.slug},
            description = ${row.description},
            moq = ${row.moq},
            lead_time = ${row.lead_time},
            fabric_details = ${row.fabric_details},
            certification_details = ${row.certification_details},
            publication_status = 'pending_review',
            updated_by = ${context.user.id}
        WHERE uuid = ${publicationUuid}
      `.execute(central.database)
    } else {
      await sql`
        INSERT INTO tc_product_publications (
          uuid, tenant_id, company_id, source_tenant_id, source_tenant_slug, source_product_uuid, source_product_id,
          source_supplier_uuid, source_supplier_profile_id, slug, description, moq, lead_time, fabric_details,
          certification_details, publication_status, created_by, updated_by
        ) VALUES (
          ${publicationUuid}, ${central.tenant.id}, NULL, ${context.tenant.id}, ${context.tenant.slug}, ${row.uuid}, ${Number(row.product_id)},
          ${row.supplier_uuid}, ${Number(row.supplier_profile_id)}, ${row.slug}, ${row.description}, ${row.moq}, ${row.lead_time},
          ${row.fabric_details}, ${row.certification_details}, 'pending_review', ${context.user.id}, ${context.user.id}
        )
      `.execute(central.database)
    }

    await sql`
      UPDATE tc_products
      SET publication_status = 'pending_review',
          published_at = CURRENT_TIMESTAMP,
          central_publication_uuid = ${publicationUuid},
          updated_by = ${context.user.id}
      WHERE id = ${Number(row.id)}
    `.execute(this.database(context))
  }

  isMarketplaceTenant(context: TenantRuntimeContext) {
    return context.tenant.slug === tirupurConnectTenantSlug
  }

  private async count(context: TenantRuntimeContext, table: string) {
    const result = await sql<{ total: number | string | bigint }>`
      SELECT COUNT(*) AS total
      FROM ${sql.table(table)}
      WHERE tenant_id = ${context.tenant.id}
        AND deleted_at IS NULL
    `.execute(this.database(context))
    return Number(result.rows[0]?.total ?? 0)
  }

  private database(context: TenantRuntimeContext) {
    return context.database as unknown as Kysely<DynamicDatabase>
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
      database: getTenantDatabase(tenant),
    }
  }

  private async reviewPublication(context: TenantRuntimeContext, table: string, uuid: string, status: string) {
    const nextStatus = normalizePublicationStatus(status)
    await sql`
      UPDATE ${sql.table(table)}
      SET publication_status = ${nextStatus},
          reviewed_by = ${context.user.id},
          reviewed_at = CURRENT_TIMESTAMP,
          updated_by = ${context.user.id}
      WHERE tenant_id = ${context.tenant.id}
        AND uuid = ${uuid}
        AND deleted_at IS NULL
    `.execute(this.database(context))
  }
}

function requiredNumber(value: unknown, field: string) {
  const number = Number(value)
  if (!Number.isFinite(number) || number <= 0) throw new Error(`${field} is required.`)
  return Math.floor(number)
}

function optionalNumber(value: unknown) {
  if (value === undefined || value === null || value === '') return null
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

function requiredString(value: unknown, field: string) {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${field} is required.`)
  return value.trim()
}

function optionalString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function optionalDate(value: unknown) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null
}

function statusOrDefault(value: unknown, fallback: string) {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback
}

function normalizePublicationStatus(value: string) {
  return value === 'approved' || value === 'rejected' || value === 'pending_review' ? value : 'pending_review'
}

function toIsoString(value: Date | string) {
  return value instanceof Date ? value.toISOString() : String(value)
}

function toDateString(value: Date | string) {
  if (value instanceof Date) return value.toISOString().slice(0, 10)
  return String(value).slice(0, 10)
}

function normalizeSettings(value: unknown): TirupurConnectSettings {
  const parsed = parseJsonObject(value)
  const status = parsed.status === 'draft' || parsed.status === 'paused' || parsed.status === 'active'
    ? parsed.status
    : defaultTirupurConnectSettings.status

  return {
    platformName: stringOrDefault(parsed.platformName, defaultTirupurConnectSettings.platformName),
    tagline: stringOrDefault(parsed.tagline, defaultTirupurConnectSettings.tagline),
    positioning: stringOrDefault(parsed.positioning, defaultTirupurConnectSettings.positioning),
    status,
  }
}

function parseJsonObject(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }

  if (typeof value === 'string' && value.trim()) {
    try {
      const parsed = JSON.parse(value) as unknown
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {}
    } catch {
      return {}
    }
  }

  return {}
}

function stringOrDefault(value: unknown, fallback: string) {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback
}
