import { Module } from '../../core/decorators/module.js'
import { TenantRepository } from '../../core/tenant/infrastructure/tenant.repository.js'
import { TenantDomainRepository } from '../../core/tenant-domain/infrastructure/tenant-domain.repository.js'
import { AuthRepository } from '../auth/infrastructure/auth.repository.js'
import { BlogController } from './blog.controller.js'
import { BlogRepository } from './blog.repository.js'
import { BlogService } from './blog.service.js'

@Module({
  controllers: [BlogController],
  providers: [
    AuthRepository,
    TenantRepository,
    TenantDomainRepository,
    BlogRepository,
    BlogService,
  ],
})
export class BlogModule {}
