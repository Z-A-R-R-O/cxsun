import { Body, Headers } from '../../../../core/decorators/http-params.js'
import { Controller, Get, Post } from '../../../../core/decorators/controller.js'
import { Inject } from '../../../../core/decorators/inject.js'
import type { TenantRequestHeaders } from '../../../../core/tenant/tenant-context.service.js'
import type {
  TirupurConnectBuyerCompanyInput,
  TirupurConnectProductInput,
  TirupurConnectRfqInput,
  TirupurConnectSettings,
  TirupurConnectSupplierProfileInput,
} from '../../core/tirupur-connect.types.js'
import { TirupurConnectService } from '../../application/tirupur-connect.service.js'

@Controller('api/v1/tirupur-connect')
export class TirupurConnectController {
  constructor(@Inject(TirupurConnectService) private readonly tirupurConnect: TirupurConnectService) {}

  @Get()
  overview(@Headers() headers: TenantRequestHeaders) {
    return this.tirupurConnect.overview(headers)
  }

  @Get('public/suppliers')
  publicSuppliers() {
    return this.tirupurConnect.publicSuppliers()
  }

  @Get('public/products')
  publicProducts() {
    return this.tirupurConnect.publicProducts()
  }

  @Post('settings')
  upsertSettings(@Headers() headers: TenantRequestHeaders, @Body() body: Partial<TirupurConnectSettings>) {
    return this.tirupurConnect.upsertSettings(headers, body)
  }

  @Get('suppliers')
  suppliers(@Headers() headers: TenantRequestHeaders) {
    return this.tirupurConnect.listSuppliers(headers)
  }

  @Post('suppliers')
  createSupplier(@Headers() headers: TenantRequestHeaders, @Body() body: TirupurConnectSupplierProfileInput) {
    return this.tirupurConnect.createSupplier(headers, body)
  }

  @Post('suppliers/publish')
  publishSupplier(@Headers() headers: TenantRequestHeaders, @Body() body: { uuid?: string }) {
    return this.tirupurConnect.publishSupplier(headers, body)
  }

  @Get('buyers')
  buyers(@Headers() headers: TenantRequestHeaders) {
    return this.tirupurConnect.listBuyers(headers)
  }

  @Post('buyers')
  createBuyer(@Headers() headers: TenantRequestHeaders, @Body() body: TirupurConnectBuyerCompanyInput) {
    return this.tirupurConnect.createBuyer(headers, body)
  }

  @Get('products')
  products(@Headers() headers: TenantRequestHeaders) {
    return this.tirupurConnect.listProducts(headers)
  }

  @Post('products')
  createProduct(@Headers() headers: TenantRequestHeaders, @Body() body: TirupurConnectProductInput) {
    return this.tirupurConnect.createProduct(headers, body)
  }

  @Post('products/publish')
  publishProduct(@Headers() headers: TenantRequestHeaders, @Body() body: { uuid?: string }) {
    return this.tirupurConnect.publishProduct(headers, body)
  }

  @Get('publications/suppliers')
  supplierPublications(@Headers() headers: TenantRequestHeaders) {
    return this.tirupurConnect.listSupplierPublications(headers)
  }

  @Post('publications/suppliers/review')
  reviewSupplierPublication(@Headers() headers: TenantRequestHeaders, @Body() body: { uuid?: string; status?: string }) {
    return this.tirupurConnect.reviewSupplierPublication(headers, body)
  }

  @Get('publications/products')
  productPublications(@Headers() headers: TenantRequestHeaders) {
    return this.tirupurConnect.listProductPublications(headers)
  }

  @Post('publications/products/review')
  reviewProductPublication(@Headers() headers: TenantRequestHeaders, @Body() body: { uuid?: string; status?: string }) {
    return this.tirupurConnect.reviewProductPublication(headers, body)
  }

  @Get('rfqs')
  rfqs(@Headers() headers: TenantRequestHeaders) {
    return this.tirupurConnect.listRfqs(headers)
  }

  @Post('rfqs')
  createRfq(@Headers() headers: TenantRequestHeaders, @Body() body: TirupurConnectRfqInput) {
    return this.tirupurConnect.createRfq(headers, body)
  }
}
