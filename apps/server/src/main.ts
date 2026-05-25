import 'reflect-metadata'
import { CxApp } from './core/bootstrap.js'
import { initializeDatabase } from './infrastructure/database/connection.js'
import { TenantDatabaseProvisioner } from './infrastructure/tenant-database/tenant-database.provisioner.js'
import { AppModule } from './modules/index.js'

await initializeDatabase()

const app = await CxApp.create(AppModule)

const provisioner = app.container.get<TenantDatabaseProvisioner>(TenantDatabaseProvisioner)
const provisioning = await provisioner.provisionAll()

for (const result of provisioning) {
  if (result.ok) {
    console.log(`  ok Tenant database ready: ${result.tenant} -> ${result.database}`)
  } else {
    console.warn(`  ! Tenant database failed: ${result.tenant} -> ${result.error}`)
  }
}

try {
  await app.start()

  const healthUrl = `http://localhost:${(app as any).port || 6001}/health`
  const res = await fetch(healthUrl)
  const body = await res.json()
  console.log(`  ok Health check: ${JSON.stringify(body)}`)
} catch (err) {
  console.error(err)
  process.exit(1)
}
