import { Inject } from '../../../core/decorators/inject.js'
import { Injectable } from '../../../core/decorators/injectable.js'
import { BadRequestException, ForbiddenException, NotFoundException } from '../../../core/exceptions/http.exception.js'
import { TenantContextService, type TenantRequestHeaders } from '../../../core/tenant/tenant-context.service.js'
import type {
  TirupurConnectBuyerCompanyInput,
  TirupurConnectProductInput,
  TirupurConnectPublicInquiryInput,
  TirupurConnectRfqInput,
  TirupurConnectSettings,
  TirupurConnectSupplierProfileInput,
} from '../core/tirupur-connect.types.js'
import { TirupurConnectPublicRepository } from '../infrastructure/tirupur-connect-public.repository.js'
import { TirupurConnectRepository } from '../infrastructure/tirupur-connect.repository.js'

@Injectable()
export class TirupurConnectService {
  constructor(
    @Inject(TenantContextService) private readonly tenants: TenantContextService,
    @Inject(TirupurConnectRepository) private readonly tirupurConnect: TirupurConnectRepository,
    @Inject(TirupurConnectPublicRepository) private readonly publicMarketplace: TirupurConnectPublicRepository,
  ) {}

  async overview(headers: TenantRequestHeaders) {
    const context = await this.tenants.resolve(headers, 'company.manage')
    return this.tirupurConnect.overview(context)
  }

  async upsertSettings(headers: TenantRequestHeaders, input: Partial<TirupurConnectSettings>) {
    const context = await this.tenants.resolve(headers, 'company.manage')
    return { ok: true, overview: await this.tirupurConnect.upsertSettings(context, input) }
  }

  async listSuppliers(headers: TenantRequestHeaders) {
    const context = await this.tenants.resolve(headers, 'company.manage')
    return { ok: true, records: await this.tirupurConnect.listSuppliers(context) }
  }

  async createSupplier(headers: TenantRequestHeaders, input: TirupurConnectSupplierProfileInput) {
    const context = await this.tenants.resolve(headers, 'company.manage')
    await this.tirupurConnect.createSupplier(context, input)
    return { ok: true, records: await this.tirupurConnect.listSuppliers(context) }
  }

  async listBuyers(headers: TenantRequestHeaders) {
    const context = await this.tenants.resolve(headers, 'company.manage')
    this.assertMarketplace(context)
    return { ok: true, records: await this.tirupurConnect.listBuyers(context) }
  }

  async createBuyer(headers: TenantRequestHeaders, input: TirupurConnectBuyerCompanyInput) {
    const context = await this.tenants.resolve(headers, 'company.manage')
    this.assertMarketplace(context)
    await this.tirupurConnect.createBuyer(context, input)
    return { ok: true, records: await this.tirupurConnect.listBuyers(context) }
  }

  async listProducts(headers: TenantRequestHeaders) {
    const context = await this.tenants.resolve(headers, 'company.manage')
    return { ok: true, records: await this.tirupurConnect.listProducts(context) }
  }

  async createProduct(headers: TenantRequestHeaders, input: TirupurConnectProductInput) {
    const context = await this.tenants.resolve(headers, 'company.manage')
    await this.tirupurConnect.createProduct(context, input)
    return { ok: true, records: await this.tirupurConnect.listProducts(context) }
  }

  async listRfqs(headers: TenantRequestHeaders) {
    const context = await this.tenants.resolve(headers, 'company.manage')
    this.assertMarketplace(context)
    return { ok: true, records: await this.tirupurConnect.listRfqs(context) }
  }

  async createRfq(headers: TenantRequestHeaders, input: TirupurConnectRfqInput) {
    const context = await this.tenants.resolve(headers, 'company.manage')
    this.assertMarketplace(context)
    await this.tirupurConnect.createRfq(context, input)
    return { ok: true, records: await this.tirupurConnect.listRfqs(context) }
  }

  async publishSupplier(headers: TenantRequestHeaders, input: { uuid?: string }) {
    const context = await this.tenants.resolve(headers, 'company.manage')
    if (this.tirupurConnect.isMarketplaceTenant(context)) {
      throw new ForbiddenException('Marketplace tenant manages reviews directly; client publish API is not used here.')
    }
    if (!input.uuid) throw new ForbiddenException('Supplier UUID is required.')
    await this.tirupurConnect.publishSupplier(context, input.uuid)
    return { ok: true, records: await this.tirupurConnect.listSuppliers(context) }
  }

  async publishProduct(headers: TenantRequestHeaders, input: { uuid?: string }) {
    const context = await this.tenants.resolve(headers, 'company.manage')
    if (this.tirupurConnect.isMarketplaceTenant(context)) {
      throw new ForbiddenException('Marketplace tenant manages reviews directly; client publish API is not used here.')
    }
    if (!input.uuid) throw new ForbiddenException('Product UUID is required.')
    await this.tirupurConnect.publishProduct(context, input.uuid)
    return { ok: true, records: await this.tirupurConnect.listProducts(context) }
  }

  async listSupplierPublications(headers: TenantRequestHeaders) {
    const context = await this.tenants.resolve(headers, 'company.manage')
    this.assertMarketplace(context)
    return { ok: true, records: await this.tirupurConnect.listSupplierPublications(context) }
  }

  async reviewSupplierPublication(headers: TenantRequestHeaders, input: { uuid?: string; status?: string }) {
    const context = await this.tenants.resolve(headers, 'company.manage')
    this.assertMarketplace(context)
    if (!input.uuid) throw new ForbiddenException('Publication UUID is required.')
    await this.tirupurConnect.reviewSupplierPublication(context, input.uuid, input.status ?? 'pending_review')
    return { ok: true, records: await this.tirupurConnect.listSupplierPublications(context) }
  }

  async listProductPublications(headers: TenantRequestHeaders) {
    const context = await this.tenants.resolve(headers, 'company.manage')
    this.assertMarketplace(context)
    return { ok: true, records: await this.tirupurConnect.listProductPublications(context) }
  }

  async reviewProductPublication(headers: TenantRequestHeaders, input: { uuid?: string; status?: string }) {
    const context = await this.tenants.resolve(headers, 'company.manage')
    this.assertMarketplace(context)
    if (!input.uuid) throw new ForbiddenException('Publication UUID is required.')
    await this.tirupurConnect.reviewProductPublication(context, input.uuid, input.status ?? 'pending_review')
    return { ok: true, records: await this.tirupurConnect.listProductPublications(context) }
  }

  async publicSuppliers() {
    return { ok: true, records: await this.publicMarketplace.listSuppliers() }
  }

  async publicSupplier(uuid: string) {
    const record = await this.publicMarketplace.getSupplier(uuid)
    if (!record) throw new NotFoundException('Approved supplier publication was not found.')
    return { ok: true, record }
  }

  async publicProducts() {
    return { ok: true, records: await this.publicMarketplace.listProducts() }
  }

  async publicProduct(uuidOrSlug: string) {
    const record = await this.publicMarketplace.getProduct(uuidOrSlug)
    if (!record) throw new NotFoundException('Approved product publication was not found.')
    return { ok: true, record }
  }

  async publicRfqs() {
    return { ok: true, records: await this.publicMarketplace.listRfqs() }
  }

  async publicRfq(uuid: string) {
    const record = await this.publicMarketplace.getRfq(uuid)
    if (!record) throw new NotFoundException('Open RFQ was not found.')
    return { ok: true, record }
  }

  async createPublicInquiry(input: TirupurConnectPublicInquiryInput) {
    const entityType = normalizeEntityType(input.entityType)
    const buyerName = requiredText(input.buyerName, 'Buyer name')
    const message = requiredText(input.message, 'Message')
    await this.publicMarketplace.createInquiry({
      ...input,
      buyerName,
      entityType,
      message,
      companyName: optionalText(input.companyName),
      email: optionalText(input.email),
      entityUuid: optionalText(input.entityUuid),
      phone: optionalText(input.phone),
      sourceTenantSlug: optionalText(input.sourceTenantSlug),
    })
    return { ok: true }
  }

  private assertMarketplace(context: Awaited<ReturnType<TenantContextService['resolve']>>) {
    if (!this.tirupurConnect.isMarketplaceTenant(context)) {
      throw new ForbiddenException('This Tirupur Connect desk is client-side. RFQ, leads, messages, membership, and analytics belong to the central Tirupur Connect tenant.')
    }
  }
}

function normalizeEntityType(value: unknown) {
  if (value === 'supplier' || value === 'product' || value === 'rfq') return value
  throw new BadRequestException('Inquiry target is required.')
}

function requiredText(value: unknown, label: string) {
  if (typeof value !== 'string' || !value.trim()) throw new BadRequestException(`${label} is required.`)
  return value.trim()
}

function optionalText(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}
