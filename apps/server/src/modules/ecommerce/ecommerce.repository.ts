import { type Kysely } from 'kysely'
import { BadRequestException } from '../../core/exceptions/http.exception.js'
import { Injectable } from '../../core/decorators/injectable.js'
import type { TenantRuntimeContext } from '../../core/tenant/tenant-context.service.js'
import { dispatchPublicUuid } from '../../shared/helpers/public-uuid.js'
import type {
  EcommerceCustomerInput,
  EcommerceCustomerProfile,
  EcommerceOrder,
  EcommerceProductInput,
  EcommerceProductPublication,
  EcommerceSettings,
  EcommerceSettingsInput,
  EcommerceWorkspace,
} from './ecommerce.types.js'

type DynamicDatabase = Record<string, Record<string, unknown>>

@Injectable()
export class EcommerceRepository {
  async workspace(context: TenantRuntimeContext): Promise<EcommerceWorkspace> {
    const [settings, products, customers, orders, carts, shipments, returns, coupons, reviews, wishlists, portalAccounts, source] = await Promise.all([
      this.settings(context),
      this.products(context),
      this.customers(context),
      this.orders(context),
      this.simpleList(context, 'ecommerce_carts'),
      this.simpleList(context, 'ecommerce_shipments'),
      this.simpleList(context, 'ecommerce_returns'),
      this.simpleList(context, 'ecommerce_coupons'),
      this.simpleList(context, 'ecommerce_reviews'),
      this.simpleList(context, 'ecommerce_wishlists'),
      this.simpleList(context, 'ecommerce_customer_portal_accounts'),
      this.sourceCounts(context),
    ])

    return {
      settings,
      products,
      customers,
      orders,
      carts,
      shipments,
      returns,
      coupons,
      reviews,
      wishlists,
      portalAccounts,
      source,
      dashboard: {
        publishedProducts: products.filter((product) => product.status === 'published').length,
        draftProducts: products.filter((product) => product.status !== 'published').length,
        activeCustomers: customers.filter((customer) => customer.portal_status === 'active').length,
        openOrders: orders.filter((order) => !['delivered', 'cancelled', 'returned'].includes(order.status)).length,
        paidOrders: orders.filter((order) => order.payment_status === 'paid').length,
        revenue: orders.reduce((total, order) => total + Number(order.grand_total ?? 0), 0),
        activeCarts: carts.filter((cart) => String(cart.status) === 'active').length,
        pendingReturns: returns.filter((item) => ['requested', 'approved'].includes(String(item.status))).length,
      },
    }
  }

  async settings(context: TenantRuntimeContext): Promise<EcommerceSettings> {
    const row = await this.database(context)
      .selectFrom('ecommerce_store_settings')
      .selectAll()
      .where('tenant_id', '=', context.tenant.id)
      .where('deleted_at', 'is', null)
      .executeTakeFirst()

    if (row) return toSettings(row)

    await this.database(context)
      .insertInto('ecommerce_store_settings')
      .values({
        uuid: dispatchPublicUuid(),
        tenant_id: context.tenant.id,
        store_name: context.tenant.name,
        store_status: 'draft',
        default_tax_mode: 'exclusive',
        order_prefix: 'EC',
        settings_json: JSON.stringify({}),
        is_active: true,
        updated_at: new Date(),
      })
      .execute()

    return this.settings(context)
  }

  async saveSettings(context: TenantRuntimeContext, input: EcommerceSettingsInput): Promise<EcommerceWorkspace> {
    const settings = await this.settings(context)
    await this.database(context)
      .updateTable('ecommerce_store_settings')
      .set({
        store_name: input.store_name?.trim() || settings.store_name,
        store_status: clean(input.store_status) ?? settings.store_status,
        default_tax_mode: clean(input.default_tax_mode) ?? settings.default_tax_mode,
        order_prefix: input.order_prefix?.trim() || settings.order_prefix,
        public_contact_email: emptyAsNull(input.public_contact_email),
        public_contact_phone: emptyAsNull(input.public_contact_phone),
        return_policy: emptyAsNull(input.return_policy),
        shipping_policy: emptyAsNull(input.shipping_policy),
        privacy_policy: emptyAsNull(input.privacy_policy),
        terms: emptyAsNull(input.terms),
        is_active: input.is_active ?? settings.is_active,
        updated_at: new Date(),
      })
      .where('id', '=', settings.id)
      .execute()
    return this.workspace(context)
  }

  async products(context: TenantRuntimeContext): Promise<EcommerceProductPublication[]> {
    const rows = await this.database(context)
      .selectFrom('ecommerce_product_publications as publication')
      .leftJoin('masters_products as product', 'product.id', 'publication.product_id')
      .leftJoin('common_product_categories as category', 'category.id', 'publication.category_id')
      .selectAll('publication')
      .select([
        'product.code as product_code',
        'product.name as product_name',
        'category.name as category_name',
      ])
      .where('publication.tenant_id', '=', context.tenant.id)
      .where('publication.deleted_at', 'is', null)
      .orderBy('publication.updated_at', 'desc')
      .orderBy('publication.id', 'desc')
      .execute()
    return rows.map(toProduct)
  }

  async upsertProduct(context: TenantRuntimeContext, input: EcommerceProductInput): Promise<EcommerceWorkspace> {
    const productId = numberOrNull(input.product_id)
    if (!productId) throw new BadRequestException('Product master reference is required.')
    const source = await this.database(context).selectFrom('masters_products').select(['id', 'name']).where('id', '=', productId).where('deleted_at', 'is', null).executeTakeFirst()
    if (!source) throw new BadRequestException('Selected product was not found.')
    const title = input.title?.trim() || String(source.name)
    const patch = {
      product_id: productId,
      category_id: numberOrNull(input.category_id),
      slug: slugValue(input.slug || title),
      title,
      short_description: emptyAsNull(input.short_description),
      status: clean(input.status) ?? 'draft',
      visibility: clean(input.visibility) ?? 'public',
      sale_price: numberValue(input.sale_price),
      compare_at_price: numberValue(input.compare_at_price),
      stock_status: clean(input.stock_status) ?? 'in_stock',
      is_featured: Boolean(input.is_featured),
      published_at: input.status === 'published' ? new Date() : null,
      updated_at: new Date(),
    }
    const existing = input.uuid || input.id
      ? await this.database(context).selectFrom('ecommerce_product_publications').select('id').where('tenant_id', '=', context.tenant.id).where(idColumn(String(input.uuid ?? input.id)), '=', idValue(String(input.uuid ?? input.id))).where('deleted_at', 'is', null).executeTakeFirst()
      : await this.database(context).selectFrom('ecommerce_product_publications').select('id').where('tenant_id', '=', context.tenant.id).where('product_id', '=', productId).where('deleted_at', 'is', null).executeTakeFirst()

    if (existing) {
      await this.database(context).updateTable('ecommerce_product_publications').set(patch).where('id', '=', existing.id).execute()
    } else {
      await this.database(context).insertInto('ecommerce_product_publications').values({ uuid: dispatchPublicUuid(), tenant_id: context.tenant.id, ...patch }).execute()
    }
    return this.workspace(context)
  }

  async customers(context: TenantRuntimeContext): Promise<EcommerceCustomerProfile[]> {
    const rows = await this.database(context)
      .selectFrom('ecommerce_customer_profiles as profile')
      .leftJoin('masters_contacts as contact', 'contact.id', 'profile.contact_id')
      .selectAll('profile')
      .select(['contact.code as contact_code', 'contact.name as contact_name'])
      .where('profile.tenant_id', '=', context.tenant.id)
      .where('profile.deleted_at', 'is', null)
      .orderBy('profile.updated_at', 'desc')
      .orderBy('profile.id', 'desc')
      .execute()
    const orders = await this.orders(context)
    return rows.map((row) => {
      const customerOrders = orders.filter((order) => order.customer_profile_id === Number(row.id) || order.contact_id === Number(row.contact_id))
      return toCustomer(row, customerOrders.length, customerOrders.reduce((total, order) => total + order.grand_total, 0))
    })
  }

  async upsertCustomer(context: TenantRuntimeContext, input: EcommerceCustomerInput): Promise<EcommerceWorkspace> {
    const contactId = numberOrNull(input.contact_id)
    if (!contactId) throw new BadRequestException('Contact master reference is required.')
    const source = await this.database(context).selectFrom('masters_contacts').select(['id', 'code', 'name', 'primary_email', 'primary_phone']).where('id', '=', contactId).where('deleted_at', 'is', null).executeTakeFirst()
    if (!source) throw new BadRequestException('Selected contact was not found.')
    const patch = {
      contact_id: contactId,
      customer_no: input.customer_no?.trim() || String(source.code || `EC-${contactId}`),
      portal_status: clean(input.portal_status) ?? 'invited',
      login_email: emptyAsNull(input.login_email) ?? emptyAsNull(source.primary_email),
      login_phone: emptyAsNull(input.login_phone) ?? emptyAsNull(source.primary_phone),
      marketing_opt_in: Boolean(input.marketing_opt_in),
      updated_at: new Date(),
    }
    const existing = input.uuid || input.id
      ? await this.database(context).selectFrom('ecommerce_customer_profiles').select('id').where('tenant_id', '=', context.tenant.id).where(idColumn(String(input.uuid ?? input.id)), '=', idValue(String(input.uuid ?? input.id))).where('deleted_at', 'is', null).executeTakeFirst()
      : await this.database(context).selectFrom('ecommerce_customer_profiles').select('id').where('tenant_id', '=', context.tenant.id).where('contact_id', '=', contactId).where('deleted_at', 'is', null).executeTakeFirst()

    let customerId = Number(existing?.id ?? 0)
    if (existing) {
      await this.database(context).updateTable('ecommerce_customer_profiles').set(patch).where('id', '=', existing.id).execute()
    } else {
      const result = await this.database(context).insertInto('ecommerce_customer_profiles').values({ uuid: dispatchPublicUuid(), tenant_id: context.tenant.id, settings_json: JSON.stringify({}), is_active: true, ...patch }).executeTakeFirst()
      customerId = Number(result.insertId)
    }
    await this.ensurePortalAccount(context, customerId, contactId, patch.login_email, patch.login_phone, patch.portal_status)
    return this.workspace(context)
  }

  async orders(context: TenantRuntimeContext): Promise<EcommerceOrder[]> {
    const rows = await this.database(context)
      .selectFrom('ecommerce_orders as orders')
      .leftJoin('masters_contacts as contact', 'contact.id', 'orders.contact_id')
      .selectAll('orders')
      .select('contact.name as contact_name')
      .where('orders.tenant_id', '=', context.tenant.id)
      .where('orders.deleted_at', 'is', null)
      .orderBy('orders.id', 'desc')
      .execute()
    return rows.map(toOrder)
  }

  private async ensurePortalAccount(context: TenantRuntimeContext, customerProfileId: number, contactId: number, email: string | null, phone: string | null, status: string) {
    const existing = await this.database(context)
      .selectFrom('ecommerce_customer_portal_accounts')
      .select('id')
      .where('tenant_id', '=', context.tenant.id)
      .where('customer_profile_id', '=', customerProfileId)
      .where('deleted_at', 'is', null)
      .executeTakeFirst()
    if (existing) {
      await this.database(context).updateTable('ecommerce_customer_portal_accounts').set({ email, phone, status, updated_at: new Date() }).where('id', '=', existing.id).execute()
      return
    }
    await this.database(context).insertInto('ecommerce_customer_portal_accounts').values({
      uuid: dispatchPublicUuid(),
      tenant_id: context.tenant.id,
      customer_profile_id: customerProfileId,
      contact_id: contactId,
      email,
      phone,
      status,
      settings_json: JSON.stringify({}),
      updated_at: new Date(),
    }).execute()
  }

  private async simpleList(context: TenantRuntimeContext, table: string) {
    return this.database(context).selectFrom(table).selectAll().where('tenant_id', '=', context.tenant.id).where('deleted_at', 'is', null).orderBy('id', 'desc').execute()
  }

  private async sourceCounts(context: TenantRuntimeContext) {
    const [productRows, contactRows, categoryRows] = await Promise.all([
      this.database(context).selectFrom('masters_products').select('id').where('deleted_at', 'is', null).execute(),
      this.database(context).selectFrom('masters_contacts').select('id').where('deleted_at', 'is', null).execute(),
      this.database(context).selectFrom('common_product_categories').select('id').where('deleted_at', 'is', null).execute(),
    ])
    return { productCount: productRows.length, contactCount: contactRows.length, categoryCount: categoryRows.length }
  }

  private database(context: TenantRuntimeContext) {
    return context.database as unknown as Kysely<DynamicDatabase>
  }
}

function toSettings(row: Record<string, unknown>): EcommerceSettings {
  return {
    id: Number(row.id),
    uuid: String(row.uuid),
    tenant_id: Number(row.tenant_id),
    store_name: String(row.store_name),
    store_status: String(row.store_status),
    default_tax_mode: String(row.default_tax_mode),
    order_prefix: String(row.order_prefix),
    public_contact_email: emptyAsNull(row.public_contact_email),
    public_contact_phone: emptyAsNull(row.public_contact_phone),
    return_policy: emptyAsNull(row.return_policy),
    shipping_policy: emptyAsNull(row.shipping_policy),
    privacy_policy: emptyAsNull(row.privacy_policy),
    terms: emptyAsNull(row.terms),
    is_active: Boolean(row.is_active),
    created_at: row.created_at as Date,
    updated_at: row.updated_at as Date,
    deleted_at: row.deleted_at as Date | null,
  }
}

function toProduct(row: Record<string, unknown>): EcommerceProductPublication {
  return {
    id: Number(row.id),
    uuid: String(row.uuid),
    tenant_id: Number(row.tenant_id),
    product_id: Number(row.product_id),
    category_id: numberOrNull(row.category_id),
    product_code: emptyAsNull(row.product_code),
    product_name: emptyAsNull(row.product_name),
    category_name: emptyAsNull(row.category_name),
    slug: String(row.slug),
    title: String(row.title),
    short_description: emptyAsNull(row.short_description),
    status: String(row.status),
    visibility: String(row.visibility),
    sale_price: numberValue(row.sale_price),
    compare_at_price: numberValue(row.compare_at_price),
    stock_status: String(row.stock_status),
    is_featured: Boolean(row.is_featured),
    published_at: row.published_at as Date | null,
    created_at: row.created_at as Date,
    updated_at: row.updated_at as Date,
    deleted_at: row.deleted_at as Date | null,
  }
}

function toCustomer(row: Record<string, unknown>, orderCount: number, totalSpend: number): EcommerceCustomerProfile {
  return {
    id: Number(row.id),
    uuid: String(row.uuid),
    tenant_id: Number(row.tenant_id),
    contact_id: Number(row.contact_id),
    contact_code: emptyAsNull(row.contact_code),
    contact_name: emptyAsNull(row.contact_name),
    customer_no: String(row.customer_no),
    portal_status: String(row.portal_status),
    login_email: emptyAsNull(row.login_email),
    login_phone: emptyAsNull(row.login_phone),
    marketing_opt_in: Boolean(row.marketing_opt_in),
    order_count: orderCount,
    total_spend: totalSpend,
    created_at: row.created_at as Date,
    updated_at: row.updated_at as Date,
    deleted_at: row.deleted_at as Date | null,
  }
}

function toOrder(row: Record<string, unknown>): EcommerceOrder {
  return {
    id: Number(row.id),
    uuid: String(row.uuid),
    tenant_id: Number(row.tenant_id),
    order_no: String(row.order_no),
    contact_id: numberOrNull(row.contact_id),
    customer_profile_id: numberOrNull(row.customer_profile_id),
    contact_name: emptyAsNull(row.contact_name),
    status: String(row.status),
    payment_status: String(row.payment_status),
    fulfillment_status: String(row.fulfillment_status),
    grand_total: numberValue(row.grand_total),
    sales_entry_uuid: emptyAsNull(row.sales_entry_uuid),
    created_at: row.created_at as Date,
    updated_at: row.updated_at as Date,
    deleted_at: row.deleted_at as Date | null,
  }
}

function idColumn(idOrUuid: string) {
  return /^\d+$/.test(idOrUuid) && idOrUuid.length !== 8 ? 'id' : 'uuid'
}

function idValue(idOrUuid: string) {
  return idColumn(idOrUuid) === 'id' ? Number(idOrUuid) : idOrUuid
}

function slugValue(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || dispatchPublicUuid().toLowerCase()
}

function clean(value: unknown) {
  const text = typeof value === 'string' ? value.trim() : ''
  return text ? text : null
}

function emptyAsNull(value: unknown) {
  const text = value === null || value === undefined ? '' : String(value).trim()
  return text ? text : null
}

function numberValue(value: unknown) {
  const number = Number(value ?? 0)
  return Number.isFinite(number) ? number : 0
}

function numberOrNull(value: unknown) {
  if (value === null || value === undefined || value === '') return null
  const number = Number(value)
  return Number.isFinite(number) && number > 0 ? number : null
}
