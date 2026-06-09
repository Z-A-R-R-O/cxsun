import { Injectable } from '../../core/decorators/injectable.js'
import { Inject } from '../../core/decorators/inject.js'
import { DomainResolutionEngine } from '../../core/tenant-domain/application/domain-resolution.engine.js'
import { getDatabase } from '../../infrastructure/database/connection.js'
import { buildTenantStaticContent } from './tenant-static-content.js'
import { SiteSliderRepository } from './slider/infrastructure/site-slider.repository.js'

export interface SiteMessageInput {
  name: string
  email: string
  message: string
  domain?: string
}

@Injectable()
export class SiteService {
  constructor(
    @Inject(DomainResolutionEngine) private readonly domainResolution: DomainResolutionEngine,
    @Inject(SiteSliderRepository) private readonly sliders: SiteSliderRepository,
  ) {}

  async getLandingContent() {
    const database = getDatabase()

    const [pages, services, posts] = await Promise.all([
      database
        .selectFrom('site_pages')
        .selectAll()
        .orderBy('sort_order', 'asc')
        .execute(),
      database
        .selectFrom('site_services')
        .selectAll()
        .orderBy('sort_order', 'asc')
        .execute(),
      database
        .selectFrom('site_posts')
        .selectAll()
        .orderBy('sort_order', 'asc')
        .execute(),
    ])

    return { pages, services, posts }
  }

  async getTenantStaticSite(hostOrDomain: string) {
    const resolution = await this.domainResolution.resolve(hostOrDomain)

    if (!resolution.ok) {
      return {
        ok: false,
        mode: 'tenant' as const,
        resolved: false,
        error: resolution.error,
        tenant: null,
        domain: null,
        apps: null,
        pages: [],
        services: [],
        posts: [],
      }
    }

    const enabledApps = resolution.tenant.apps.enabled
    const sliders = await this.sliders.listPublished(resolution.tenant)
    const content = buildTenantStaticContent({
      tenantName: resolution.tenant.name,
      industryKey: resolution.tenant.industryKey,
      industryName: resolution.tenant.industryName,
      enabledApps,
      landingApp: resolution.tenant.apps.landing,
      companies: resolution.tenant.liveScope?.companies,
      domain: resolution.domain.domain,
      requirements: resolution.tenant.liveScope?.requirements,
      tenantSlug: resolution.tenant.slug,
    })

    return {
      ok: true,
      mode: 'tenant' as const,
      resolved: true,
      tenant: {
        id: resolution.tenant.id,
        code: resolution.tenant.code,
        slug: resolution.tenant.slug,
        name: resolution.tenant.name,
        status: resolution.tenant.status,
        industryKey: resolution.tenant.industryKey,
        industryName: resolution.tenant.industryName,
        companies: resolution.tenant.liveScope?.companies ?? [],
        features: resolution.tenant.features,
      },
      domain: resolution.domain,
      apps: resolution.tenant.apps,
      sliders,
      pages: content.pages,
      services: content.services,
      posts: content.posts,
    }
  }

  async createMessage(input: SiteMessageInput, hostOrDomain = '') {
    const database = getDatabase()

    const name = input.name.trim()
    const email = input.email.trim()
    const message = input.message.trim()
    const resolution = await this.domainResolution.resolve(input.domain || hostOrDomain)

    if (!name || !email || !message) {
      return { ok: false, error: 'Name, email, and message are required.' }
    }

    if (!resolution.ok) {
      return { ok: false, error: resolution.error }
    }

    await database
      .insertInto('site_messages')
      .values({
        tenant_id: resolution.tenant.id,
        tenant_slug: resolution.tenant.slug,
        domain: resolution.domain.domain,
        name,
        email,
        message,
      })
      .execute()

    return { ok: true, tenant: resolution.tenant.slug, domain: resolution.domain.domain }
  }
}
