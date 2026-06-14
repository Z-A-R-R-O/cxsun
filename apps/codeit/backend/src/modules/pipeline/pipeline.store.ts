import { Injectable } from '../../core/decorators/injectable.js'
import type { PipelineDefinition } from './pipeline.types.js'

@Injectable()
export class PipelineStore {
  private pipelines = new Map<string, PipelineDefinition>([
    [
      'default-agent-chain',
      {
        id: 'default-agent-chain',
        name: 'Standard Agent Chain',
        stages: [
          { id: 'stage-1', agentId: 'orchestrator', label: 'Architecture Planning' },
          { id: 'stage-2', agentId: 'implementation', label: 'Feature Development' },
          { id: 'stage-3', agentId: 'review', label: 'Code Review' },
          { id: 'stage-4', agentId: 'security', label: 'Security Audit' },
          { id: 'stage-5', agentId: 'test-gen', label: 'Test Suite Generation' },
          { id: 'stage-6', agentId: 'acceptance', label: 'Acceptance Verification' },
        ],
        edges: [
          { source: 'stage-1', target: 'stage-2' },
          { source: 'stage-2', target: 'stage-3' },
          { source: 'stage-3', target: 'stage-4' },
          { source: 'stage-4', target: 'stage-5' },
          { source: 'stage-5', target: 'stage-6' },
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ],
  ])

  getAll(): PipelineDefinition[] {
    return Array.from(this.pipelines.values())
  }

  getById(id: string): PipelineDefinition | undefined {
    return this.pipelines.get(id)
  }

  save(pipeline: PipelineDefinition): void {
    this.pipelines.set(pipeline.id, {
      ...pipeline,
      updatedAt: new Date().toISOString(),
    })
  }

  delete(id: string): boolean {
    return this.pipelines.delete(id)
  }
}
