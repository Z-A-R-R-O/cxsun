import 'reflect-metadata'
import { Module } from '../../../core/decorators/module.js'
import { TenantContextService } from '../../../core/tenant/tenant-context.service.js'
import { CompanyService } from './application/company.service.js'
import { CompanyRepository } from './infrastructure/company.repository.js'
import { CompaniesV1Controller } from './interface/http/companies-v1.controller.js'

@Module({
  controllers: [CompaniesV1Controller],
  providers: [TenantContextService, CompanyService, CompanyRepository],
})
export class CompanyModule {}

