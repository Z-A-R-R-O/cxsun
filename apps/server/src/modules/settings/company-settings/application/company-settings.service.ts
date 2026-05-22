import { Inject } from '../../../../core/decorators/inject.js'
import { Injectable } from '../../../../core/decorators/injectable.js'
import { BadRequestException } from '../../../../core/exceptions/http.exception.js'
import type { TenantRequestHeaders } from '../../../../core/tenant/tenant-context.service.js'
import { companySettingKeys, type CompanySettingInput, type CompanySettingKey } from '../domain/company-setting-record.js'
import { CompanySettingsRepository } from '../infrastructure/company-settings.repository.js'

@Injectable()
export class CompanySettingsService {
  constructor(@Inject(CompanySettingsRepository) private readonly settings: CompanySettingsRepository) {}

  get(headers: TenantRequestHeaders, key: string, query: Record<string, unknown>) {
    return this.settings.get(headers, parseCompanyId(query.companyId), parseKey(key))
  }

  save(headers: TenantRequestHeaders, key: string, query: Record<string, unknown>, input: CompanySettingInput) {
    return this.settings.save(headers, parseCompanyId(query.companyId), parseKey(key), input)
  }
}

function parseKey(value: string): CompanySettingKey {
  if (companySettingKeys.includes(value as CompanySettingKey)) return value as CompanySettingKey
  throw new BadRequestException('Unsupported company setting key.')
}

function parseCompanyId(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : ''
}

