import { Injectable } from '../../core/decorators/injectable.js'
import { Inject } from '../../core/decorators/inject.js'
import { RunStore } from './run.store.js'
import { PipelineService } from '../pipeline/pipeline.service.js'
import { AgentService } from '../agent/agent.service.js'
import { ProviderRegistry } from '../../providers/provider.registry.js'
import { TokenService } from '../token/token.service.js'
import { QueueService } from '../../infrastructure/queue/queue.service.js'
import { runEventBus } from './run.events.js'
import type { RunRecord, StageResult } from './run.types.js'

@Injectable()
export class RunService {
  constructor(
    @Inject(RunStore) private readonly store: RunStore,
    @Inject(PipelineService) private readonly pipelineService: PipelineService,
    @Inject(AgentService) private readonly agentService: AgentService,
    @Inject(ProviderRegistry) private readonly providerRegistry: ProviderRegistry,
    @Inject(TokenService) private readonly tokenService: TokenService,
    @Inject(QueueService) private readonly queueService: QueueService,
  ) {
    // Register queue worker when RunService is instantiated
    this.queueService.process('agent.run', async (job) => {
      const { runId } = job.payload as { runId: string }
      await this.executeRun(runId)
    })
  }

  getRuns(): RunRecord[] {
    return this.store.getAll()
  }

  getRun(id: string): RunRecord | undefined {
    return this.store.getById(id)
  }

  createRun(pipelineId: string, prompt: string): RunRecord {
    const pipeline = this.pipelineService.getPipeline(pipelineId)
    if (!pipeline) {
      throw new Error(`Pipeline '${pipelineId}' not found.`)
    }

    const runId = Math.random().toString(36).substring(2, 15)
    const stageResults: StageResult[] = pipeline.stages.map((stage) => ({
      stageId: stage.id,
      agentId: stage.agentId,
      status: 'pending',
      input: '',
    }))

    const record: RunRecord = {
      id: runId,
      pipelineId,
      prompt,
      status: 'pending',
      stageResults,
      tokensUsed: 0,
      createdAt: new Date().toISOString(),
    }

    this.store.save(record)

    this.queueService.enqueue({
      type: 'agent.run',
      payload: { runId },
    })

    return record
  }

  async executeRun(runId: string): Promise<void> {
    const run = this.store.getById(runId)
    if (!run) return

    run.status = 'running'
    run.startedAt = new Date().toISOString()
    this.store.save(run)
    runEventBus.emitRunStarted(runId)

    const pipeline = this.pipelineService.getPipeline(run.pipelineId)
    if (!pipeline) {
      const err = `Pipeline '${run.pipelineId}' not found during execution.`
      run.status = 'failed'
      run.error = err
      this.store.save(run)
      runEventBus.emitRunFailed(runId, err)
      return
    }

    try {
      const sortedStageIds = this.topologicalSort(pipeline)
      const stageMap = new Map(pipeline.stages.map((s) => [s.id, s]))
      const outputs = new Map<string, string>()

      for (const stageId of sortedStageIds) {
        const stage = stageMap.get(stageId)
        if (!stage) continue

        const stageResult = run.stageResults.find((r) => r.stageId === stageId)
        if (!stageResult) continue

        stageResult.status = 'running'
        stageResult.startedAt = new Date().toISOString()
        this.store.save(run)
        runEventBus.emitStageStarted(runId, stageId)

        const incomingEdges = pipeline.edges.filter((e) => e.target === stageId)
        let input = ''
        if (incomingEdges.length > 0) {
          input = incomingEdges
            .map((e) => `[Output of ${stageMap.get(e.source)?.label}]:\n${outputs.get(e.source) ?? ''}`)
            .join('\n\n')
        } else {
          input = run.prompt
        }

        stageResult.input = input

        const agent = this.agentService.getAgentById(stage.agentId)
        if (!agent) {
          throw new Error(`Agent '${stage.agentId}' not found for stage '${stage.label}'.`)
        }

        const budget = agent.config.tokenBudget
        const compressedInput = this.tokenService.compress(input, budget)

        const provider = this.providerRegistry.get(agent.config.provider)

        const messages = [
          { role: 'system' as const, content: agent.config.systemPrompt },
          { role: 'user' as const, content: compressedInput },
        ]

        let stageOutput = ''
        try {
          stageOutput = await provider.stream(
            messages,
            {
              model: agent.config.model,
              temperature: agent.config.temperature,
            },
            (chunk) => {
              runEventBus.emitStageChunk(runId, stageId, chunk)
            },
          )

          const inputTokens = this.tokenService.countTokens(agent.config.systemPrompt + compressedInput)
          const outputTokens = this.tokenService.countTokens(stageOutput)
          const stageTokens = inputTokens + outputTokens

          stageResult.status = 'completed'
          stageResult.output = stageOutput
          stageResult.tokensUsed = stageTokens
          stageResult.completedAt = new Date().toISOString()

          run.tokensUsed += stageTokens
          this.store.save(run)

          outputs.set(stageId, stageOutput)
          runEventBus.emitStageCompleted(runId, stageId, stageOutput, stageTokens)
        } catch (stageErr: any) {
          const errMsg = stageErr?.message ?? String(stageErr)
          stageResult.status = 'failed'
          stageResult.error = errMsg
          stageResult.completedAt = new Date().toISOString()
          this.store.save(run)
          runEventBus.emitStageFailed(runId, stageId, errMsg)
          throw stageErr
        }
      }

      run.status = 'completed'
      run.completedAt = new Date().toISOString()
      this.store.save(run)
      runEventBus.emitRunFinished(runId, run.tokensUsed)
    } catch (err: any) {
      const errMsg = err?.message ?? String(err)
      run.status = 'failed'
      run.error = errMsg
      run.completedAt = new Date().toISOString()
      this.store.save(run)
      runEventBus.emitRunFailed(runId, errMsg)
    }
  }

  private topologicalSort(pipeline: {
    stages: { id: string }[]
    edges: { source: string; target: string }[]
  }): string[] {
    const inDegree = new Map<string, number>()
    const adj = new Map<string, string[]>()

    for (const stage of pipeline.stages) {
      inDegree.set(stage.id, 0)
      adj.set(stage.id, [])
    }

    for (const edge of pipeline.edges) {
      adj.get(edge.source)!.push(edge.target)
      inDegree.set(edge.target, (inDegree.get(edge.target) ?? 0) + 1)
    }

    const queue: string[] = []
    for (const [id, deg] of inDegree.entries()) {
      if (deg === 0) queue.push(id)
    }

    const order: string[] = []
    while (queue.length > 0) {
      const node = queue.shift()!
      order.push(node)

      for (const next of adj.get(node) ?? []) {
        const nextDeg = (inDegree.get(next) ?? 1) - 1
        inDegree.set(next, nextDeg)
        if (nextDeg === 0) {
          queue.push(next)
        }
      }
    }

    return order
  }
}
