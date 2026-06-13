import { Inject } from '../../../../core/decorators/inject.js'
import { Injectable } from '../../../../core/decorators/injectable.js'
import { NotFoundException } from '../../../../core/exceptions/http.exception.js'
import { TenantContextService, type TenantRequestHeaders } from '../../../../core/tenant/tenant-context.service.js'
import { AuditorContactCredentialRepository } from '../infrastructure/persistence/auditor-contact-credential.repository.js'

@Injectable()
export class AuditorContactCredentialService {
  constructor(
    @Inject(() => TenantContextService) private readonly tenantContext: TenantContextService,
    @Inject(AuditorContactCredentialRepository) private readonly credentials: AuditorContactCredentialRepository,
  ) {}

  async list(headers: TenantRequestHeaders) {
    const context = await this.tenantContext.resolve(headers, 'company.manage')
    return this.credentials.list(context)
  }

  async upsert(headers: TenantRequestHeaders, input: Record<string, unknown>) {
    const context = await this.tenantContext.resolve(headers, 'company.manage')
    const record = await this.credentials.upsert(context, input)
    if (!record) throw new NotFoundException('Contact credentials were not found.')
    return { ok: true, record }
  }
}
