import { Inject } from '../../../../core/decorators/inject.js'
import { Injectable } from '../../../../core/decorators/injectable.js'
import { TenantContextService, type TenantRequestHeaders } from '../../../../core/tenant/tenant-context.service.js'
import { siteSliderEvent } from '../domain/events/site-slider.events.js'
import { SiteSliderRepository } from '../infrastructure/site-slider.repository.js'
import type { SiteSliderInput } from '../site-slider.types.js'
import { SiteSliderEventBus } from './site-slider-event-bus.js'

@Injectable()
export class SiteSliderService {
  constructor(
    @Inject(() => TenantContextService) private readonly tenants: TenantContextService,
    @Inject(SiteSliderRepository) private readonly sliders: SiteSliderRepository,
    @Inject(SiteSliderEventBus) private readonly events: SiteSliderEventBus,
  ) {}

  async list(headers: TenantRequestHeaders) {
    const context = await this.tenants.resolve(headers, 'company.manage')
    return this.sliders.list(context)
  }

  async get(headers: TenantRequestHeaders, idOrUuid: string) {
    const context = await this.tenants.resolve(headers, 'company.manage')
    return this.sliders.find(context, idOrUuid)
  }

  async upsert(headers: TenantRequestHeaders, input: SiteSliderInput) {
    const context = await this.tenants.resolve(headers, 'company.manage')
    const existed = Boolean(input.uuid)
    const slider = await this.sliders.upsert(context, input)
    if (slider) {
      await this.events.publish(siteSliderEvent(existed ? 'site.slider.updated' : 'site.slider.created', context.tenant.id, slider.uuid))
    }
    return { ok: true, slider }
  }

  async destroy(headers: TenantRequestHeaders, idOrUuid: string) {
    const context = await this.tenants.resolve(headers, 'company.manage')
    const slider = await this.sliders.destroy(context, idOrUuid)
    await this.events.publish(siteSliderEvent('site.slider.deleted', context.tenant.id, slider.uuid))
    return { ok: true }
  }
}
