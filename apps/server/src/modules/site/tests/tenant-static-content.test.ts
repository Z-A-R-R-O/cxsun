import assert from 'node:assert/strict'
import { liveClientScopes } from '../../../core/tenant/live-client-scope.js'
import {
  appLandingPage,
  buildTenantStaticContent,
  publicAppKeys,
  publicAppPageSlug,
} from '../tenant-static-content.js'

assert.ok(liveClientScopes.length > 0, 'live client scope must not be empty')

const allDomains = liveClientScopes.flatMap((client) => client.domains)
assertUnique(allDomains, 'tenant domain')
assert.ok(!allDomains.includes('smaupvc.local'), 'typo domain smaupvc.local must not be active')
assert.ok(!allDomains.includes('smsupvc.local'), 'SMS UPVC must not be seeded during first install')
assert.deepEqual(
  liveClientScopes.map((client) => client.slug).sort(),
  ['aaran_associates', 'codexsun'],
  'first install must seed only CODEXSUN and Aaran Associates',
)

const publicApps = new Set(publicAppKeys())

for (const client of liveClientScopes) {
  assert.ok(client.domains.length > 0, `${client.slug} must have at least one strict domain`)
  assert.ok(client.apps.includes(client.landingApp), `${client.slug} landing app must be enabled`)

  const content = buildTenantStaticContent({
    tenantName: client.name,
    industryKey: client.industry,
    industryName: client.industryName,
    enabledApps: client.apps,
    landingApp: client.landingApp,
    companies: client.companies,
    requirements: client.requirements,
  })

  const pages = new Map(content.pages.map((page) => [page.slug, page]))
  const services = new Set(content.services.map((service) => service.title))

  assert.ok(pages.has('home'), `${client.slug} must have a home page`)
  assert.ok(pages.has('about'), `${client.slug} must have an about page`)
  assert.ok(pages.has('contact'), `${client.slug} must have a contact page`)

  const home = pages.get('home')
  assert.ok(home?.title.includes(client.name), `${client.slug} home title must name the tenant`)
  assert.equal(home?.eyebrow, client.industryName, `${client.slug} home eyebrow must show industry`)

  for (const company of client.companies) {
    assert.ok(
      `${home?.summary ?? ''} ${pages.get('about')?.summary ?? ''}`.includes(company),
      `${client.slug} content must mention company ${company}`,
    )
  }

  const landingSlug = appLandingPage(client.landingApp)
  assert.ok(pages.has(landingSlug), `${client.slug} must expose landing app page ${landingSlug}`)

  for (const app of client.apps) {
    const slug = publicAppPageSlug(app)
    if (slug) {
      assert.ok(pages.has(slug), `${client.slug} must expose enabled public app page ${slug}`)
    }
  }

  for (const app of publicApps) {
    const slug = publicAppPageSlug(app)
    assert.ok(slug, `${app} must have a public app slug`)

    if (!client.apps.includes(app)) {
      assert.ok(!pages.has(slug), `${client.slug} must not expose disabled app page ${slug}`)
    }
  }

  for (const service of content.services) {
    assert.ok(services.has(service.title), `${client.slug} service title must be stable`)
  }
}

console.info(`tenant static content ok: ${liveClientScopes.length} tenants, ${allDomains.length} domains`)

function assertUnique(values: string[], label: string) {
  const seen = new Set<string>()

  for (const value of values) {
    assert.ok(value, `${label} must not be empty`)
    assert.ok(!seen.has(value), `${label} "${value}" must be unique`)
    seen.add(value)
  }
}
