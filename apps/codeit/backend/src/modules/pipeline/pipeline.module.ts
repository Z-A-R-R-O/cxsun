import { Module } from '../../core/decorators/module.js'
import { PipelineController } from './pipeline.controller.js'
import { PipelineService } from './pipeline.service.js'
import { PipelineStore } from './pipeline.store.js'

@Module({
  controllers: [PipelineController],
  providers: [PipelineService, PipelineStore],
})
export class PipelineModule {}
