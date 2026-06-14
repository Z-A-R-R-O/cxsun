import { Controller, Get, Post } from '../../core/decorators/controller.js'
import { Body, Param, Res } from '../../core/decorators/http-params.js'
import { Inject } from '../../core/decorators/inject.js'
import { RunService } from './run.service.js'
import { runEventBus } from './run.events.js'
import type { FastifyReply } from 'fastify'

@Controller('api/v1/runs')
export class RunController {
  constructor(
    @Inject(RunService) private readonly runService: RunService,
  ) {}

  @Get()
  async getRuns() {
    return this.runService.getRuns()
  }

  @Get(':id')
  async getRun(@Param('id') id: string) {
    const run = this.runService.getRun(id)
    if (!run) {
      return { error: 'Run not found', statusCode: 404 }
    }
    return run
  }

  @Post()
  async createRun(@Body() body: { pipelineId: string; prompt: string }) {
    if (!body.pipelineId || !body.prompt) {
      return { error: 'pipelineId and prompt are required', statusCode: 400 }
    }
    try {
      const run = this.runService.createRun(body.pipelineId, body.prompt)
      return run
    } catch (err: any) {
      return { error: err.message, statusCode: 400 }
    }
  }

  @Get(':id/stream')
  async stream(@Param('id') id: string, @Res() reply: FastifyReply) {
    const raw = reply.raw
    raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    })

    const onEvent = (event: any) => {
      if (event.runId === id) {
        raw.write(`data: ${JSON.stringify(event)}\n\n`)
      }
    }

    runEventBus.on('event', onEvent)

    raw.on('close', () => {
      runEventBus.off('event', onEvent)
    })
  }
}
