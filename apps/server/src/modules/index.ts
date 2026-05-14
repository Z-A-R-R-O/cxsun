import { HealthModule } from './health/health.module.js'
import { HomeModule } from './home/home.module.js'
import { SiteModule } from './site/index.js'
import { Module } from '../core/decorators/module.js'

@Module({
  imports: [HomeModule, HealthModule, SiteModule],
})
export class AppModule {}
