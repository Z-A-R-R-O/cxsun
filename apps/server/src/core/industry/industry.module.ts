import 'reflect-metadata'
import { Module } from '../decorators/module.js'
import { IndustryService } from './application/industry.service.js'
import { IndustryRepository } from './infrastructure/industry.repository.js'
import { IndustriesV1Controller } from './interface/http/industries-v1.controller.js'

@Module({
  controllers: [IndustriesV1Controller],
  providers: [IndustryService, IndustryRepository],
})
export class IndustryModule {}
