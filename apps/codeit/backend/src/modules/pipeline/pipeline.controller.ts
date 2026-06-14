import { Controller, Get, Post, Put, Delete } from '../../core/decorators/controller.js'
import { Body, Param } from '../../core/decorators/http-params.js'
import { Inject } from '../../core/decorators/inject.js'
import { PipelineService } from './pipeline.service.js'
import type { PipelineDefinition } from './pipeline.types.js'

@Controller('api/v1/pipelines')
export class PipelineController {
  constructor(
    @Inject(PipelineService) private readonly pipelineService: PipelineService,
  ) {}

  @Get()
  async getPipelines() {
    return this.pipelineService.getPipelines()
  }

  @Get(':id')
  async getPipeline(@Param('id') id: string) {
    const pipeline = this.pipelineService.getPipeline(id)
    if (!pipeline) {
      return { error: 'Pipeline not found', statusCode: 404 }
    }
    return pipeline
  }

  @Post()
  async createPipeline(@Body() pipeline: PipelineDefinition) {
    try {
      this.pipelineService.savePipeline(pipeline)
      return { success: true, pipeline }
    } catch (err: any) {
      return { error: err.message, statusCode: 400 }
    }
  }

  @Put(':id')
  async updatePipeline(@Param('id') id: string, @Body() pipeline: PipelineDefinition) {
    try {
      pipeline.id = id
      this.pipelineService.savePipeline(pipeline)
      return { success: true, pipeline }
    } catch (err: any) {
      return { error: err.message, statusCode: 400 }
    }
  }

  @Delete(':id')
  async deletePipeline(@Param('id') id: string) {
    const deleted = this.pipelineService.deletePipeline(id)
    if (!deleted) {
      return { error: 'Pipeline not found', statusCode: 404 }
    }
    return { success: true }
  }
}
