import { HealthModule } from './health/health.module.js'
import { HomeModule } from './home/home.module.js'
import { SiteModule } from './site/index.js'
import { SystemUpdateModule } from './system-update/system-update.module.js'
import { Module } from '../core/decorators/module.js'

@Module({
  imports: [HomeModule, HealthModule, SiteModule, SystemUpdateModule],
})
export class AppModule {}
