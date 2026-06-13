import { Inject } from '../../../core/decorators/inject.js'
import { Injectable } from '../../../core/decorators/injectable.js'
import { BadRequestException, ForbiddenException, NotFoundException } from '../../../core/exceptions/http.exception.js'
import { TenantContextService, type TenantRequestHeaders } from '../../../core/tenant/tenant-context.service.js'
import type {
  TConnectBuyerCompanyInput,
  TConnectProductInput,
  TConnectPublicInquiryInput,
  TConnectRfqInput,
  TConnectSettings,
  TConnectSupplierProfileInput,
} from '../core/tconnect.types.js'
import { TConnectPublicRepository } from '../infrastructure/tconnect-public.repository.js'
import { TConnectRepository } from '../infrastructure/tconnect.repository.js'

@Injectable()
export class TConnectService {
  constructor(
    @Inject(() => TenantContextService) private readonly tenants: TenantContextService,
    @Inject(TConnectRepository) private readonly tConnect: TConnectRepository,
    @Inject(TConnectPublicRepository) private readonly publicMarketplace: TConnectPublicRepository,
  ) {}

  async overview(headers: TenantRequestHeaders) {
    const context = await this.tenants.resolve(headers, 'company.manage')
    return this.tConnect.overview(context)
  }

  async upsertSettings(headers: TenantRequestHeaders, input: Partial<TConnectSettings>) {
    const context = await this.tenants.resolve(headers, 'company.manage')
    return { ok: true, overview: await this.tConnect.upsertSettings(context, input) }
  }

  async listSuppliers(headers: TenantRequestHeaders) {
    const context = await this.tenants.resolve(headers, 'company.manage')
    return { ok: true, records: await this.tConnect.listSuppliers(context) }
  }

  async createSupplier(headers: TenantRequestHeaders, input: TConnectSupplierProfileInput) {
    const context = await this.tenants.resolve(headers, 'company.manage')
    await this.tConnect.createSupplier(context, input)
    return { ok: true, records: await this.tConnect.listSuppliers(context) }
  }

  async listBuyers(headers: TenantRequestHeaders) {
    const context = await this.tenants.resolve(headers, 'company.manage')
    this.assertMarketplace(context)
    return { ok: true, records: await this.tConnect.listBuyers(context) }
  }

  async createBuyer(headers: TenantRequestHeaders, input: TConnectBuyerCompanyInput) {
    const context = await this.tenants.resolve(headers, 'company.manage')
    this.assertMarketplace(context)
    await this.tConnect.createBuyer(context, input)
    return { ok: true, records: await this.tConnect.listBuyers(context) }
  }

  async listProducts(headers: TenantRequestHeaders) {
    const context = await this.tenants.resolve(headers, 'company.manage')
    return { ok: true, records: await this.tConnect.listProducts(context) }
  }

  async createProduct(headers: TenantRequestHeaders, input: TConnectProductInput) {
    const context = await this.tenants.resolve(headers, 'company.manage')
    await this.tConnect.createProduct(context, input)
    return { ok: true, records: await this.tConnect.listProducts(context) }
  }

  async listRfqs(headers: TenantRequestHeaders) {
    const context = await this.tenants.resolve(headers, 'company.manage')
    this.assertMarketplace(context)
    return { ok: true, records: await this.tConnect.listRfqs(context) }
  }

  async createRfq(headers: TenantRequestHeaders, input: TConnectRfqInput) {
    const context = await this.tenants.resolve(headers, 'company.manage')
    this.assertMarketplace(context)
    await this.tConnect.createRfq(context, input)
    return { ok: true, records: await this.tConnect.listRfqs(context) }
  }

  async publishSupplier(headers: TenantRequestHeaders, input: { uuid?: string }) {
    const context = await this.tenants.resolve(headers, 'company.manage')
    if (this.tConnect.isMarketplaceTenant(context)) {
      throw new ForbiddenException('Marketplace tenant manages reviews directly; client publish API is not used here.')
    }
    if (!input.uuid) throw new ForbiddenException('Supplier UUID is required.')
    await this.tConnect.publishSupplier(context, input.uuid)
    return { ok: true, records: await this.tConnect.listSuppliers(context) }
  }

  async publishProduct(headers: TenantRequestHeaders, input: { uuid?: string }) {
    const context = await this.tenants.resolve(headers, 'company.manage')
    if (this.tConnect.isMarketplaceTenant(context)) {
      throw new ForbiddenException('Marketplace tenant manages reviews directly; client publish API is not used here.')
    }
    if (!input.uuid) throw new ForbiddenException('Product UUID is required.')
    await this.tConnect.publishProduct(context, input.uuid)
    return { ok: true, records: await this.tConnect.listProducts(context) }
  }

  async listSupplierPublications(headers: TenantRequestHeaders) {
    const context = await this.tenants.resolve(headers, 'company.manage')
    this.assertMarketplace(context)
    return { ok: true, records: await this.tConnect.listSupplierPublications(context) }
  }

  async reviewSupplierPublication(headers: TenantRequestHeaders, input: { uuid?: string; status?: string }) {
    const context = await this.tenants.resolve(headers, 'company.manage')
    this.assertMarketplace(context)
    if (!input.uuid) throw new ForbiddenException('Publication UUID is required.')
    await this.tConnect.reviewSupplierPublication(context, input.uuid, input.status ?? 'pending_review')
    return { ok: true, records: await this.tConnect.listSupplierPublications(context) }
  }

  async listProductPublications(headers: TenantRequestHeaders) {
    const context = await this.tenants.resolve(headers, 'company.manage')
    this.assertMarketplace(context)
    return { ok: true, records: await this.tConnect.listProductPublications(context) }
  }

  async reviewProductPublication(headers: TenantRequestHeaders, input: { uuid?: string; status?: string }) {
    const context = await this.tenants.resolve(headers, 'company.manage')
    this.assertMarketplace(context)
    if (!input.uuid) throw new ForbiddenException('Publication UUID is required.')
    await this.tConnect.reviewProductPublication(context, input.uuid, input.status ?? 'pending_review')
    return { ok: true, records: await this.tConnect.listProductPublications(context) }
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

  async createPublicInquiry(input: TConnectPublicInquiryInput) {
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
    if (!this.tConnect.isMarketplaceTenant(context)) {
      throw new ForbiddenException('This TConnect desk is client-side. RFQ, leads, messages, membership, and analytics belong to the central TConnect tenant.')
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
