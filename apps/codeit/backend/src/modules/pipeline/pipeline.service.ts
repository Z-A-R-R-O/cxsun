import { Injectable } from '../../core/decorators/injectable.js'
import { Inject } from '../../core/decorators/inject.js'
import { PipelineStore } from './pipeline.store.js'
import type { PipelineDefinition } from './pipeline.types.js'

@Injectable()
export class PipelineService {
  constructor(
    @Inject(PipelineStore) private readonly store: PipelineStore,
  ) {}

  getPipelines(): PipelineDefinition[] {
    return this.store.getAll()
  }

  getPipeline(id: string): PipelineDefinition | undefined {
    return this.store.getById(id)
  }

  savePipeline(pipeline: PipelineDefinition): void {
    if (!this.isValidDAG(pipeline)) {
      throw new Error('Invalid pipeline: must be a Directed Acyclic Graph (DAG) with no cycles.')
    }
    this.store.save(pipeline)
  }

  deletePipeline(id: string): boolean {
    return this.store.delete(id)
  }

  private isValidDAG(pipeline: PipelineDefinition): boolean {
    const adj = new Map<string, string[]>()
    for (const stage of pipeline.stages) {
      adj.set(stage.id, [])
    }

    for (const edge of pipeline.edges) {
      if (!adj.has(edge.source) || !adj.has(edge.target)) {
        return false
      }
      adj.get(edge.source)!.push(edge.target)
    }

    const visited = new Map<string, 'visiting' | 'visited'>()

    const hasCycle = (node: string): boolean => {
      visited.set(node, 'visiting')
      const neighbors = adj.get(node) ?? []
      for (const next of neighbors) {
        const state = visited.get(next)
        if (state === 'visiting') return true
        if (state === 'visited') continue
        if (hasCycle(next)) return true
      }
      visited.set(node, 'visited')
      return false
    }

    for (const stage of pipeline.stages) {
      if (!visited.has(stage.id)) {
        if (hasCycle(stage.id)) return false
      }
    }

    return true
  }
}
