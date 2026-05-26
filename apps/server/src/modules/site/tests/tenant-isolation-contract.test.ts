import assert from 'node:assert/strict'
import { initializeDatabase, getDatabase, closeDatabase } from '../../../infrastructure/database/connection.js'
import { DomainResolutionEngine } from '../../../core/tenant-domain/application/domain-resolution.engine.js'
import { TenantDomainRepository } from '../../../core/tenant-domain/infrastructure/tenant-domain.repository.js'
import { SiteService } from '../site.service.js'

const marker = `tenant-isolation-${Date.now()}`

await initializeDatabase()

try {
  const database = getDatabase()
  const site = new SiteService(new DomainResolutionEngine(new TenantDomainRepository()))

  const sukraa = await site.createMessage({
    domain: 'sukraa.local',
    name: 'Isolation Test Sukraa',
    email: 'tenant-isolation+sukraa@example.test',
    message: marker,
  })
  const tirupur = await site.createMessage({
    domain: 'tirupurdirect.local',
    name: 'Isolation Test Tirupur',
    email: 'tenant-isolation+tirupur@example.test',
    message: marker,
  })
  const unknown = await site.createMessage({
    domain: 'unknown.local',
    name: 'Isolation Test Unknown',
    email: 'tenant-isolation+unknown@example.test',
    message: marker,
  })

  assert.equal(sukraa.ok, true, 'sukraa.local contact must save')
  assert.equal(tirupur.ok, true, 'tirupurdirect.local contact must save')
  assert.equal(unknown.ok, false, 'unknown.local contact must fail closed')

  const rows = await database
    .selectFrom('site_messages')
    .select(['tenant_id', 'tenant_slug', 'domain', 'email'])
    .where('message', '=', marker)
    .orderBy('email', 'asc')
    .execute()

  assert.equal(rows.length, 2, 'only resolved tenant contact messages should be stored')
  assert.deepEqual(
    rows.map((row) => row.tenant_slug).sort(),
    ['sathasivam_garments', 'tirupur_direct'],
    'sample contact transactions must be tenant-bound',
  )
  assert.equal(new Set(rows.map((row) => row.tenant_id)).size, 2, 'sample transactions must use different tenant ids')
  assert.deepEqual(
    rows.map((row) => row.domain).sort(),
    ['sukraa.local', 'tirupurdirect.local'],
    'sample transactions must preserve resolved domain',
  )

  console.info(`tenant isolation contract ok: ${rows.length} sample transactions isolated`)
} finally {
  await getDatabase().deleteFrom('site_messages').where('message', '=', marker).execute()
  await closeDatabase()
}
