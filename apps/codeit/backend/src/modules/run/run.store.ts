import { Injectable } from '../../core/decorators/injectable.js'
import type { RunRecord } from './run.types.js'

@Injectable()
export class RunStore {
  private runs = new Map<string, RunRecord>()

  getAll(): RunRecord[] {
    return Array.from(this.runs.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
  }

  getById(id: string): RunRecord | undefined {
    return this.runs.get(id)
  }

  save(run: RunRecord): void {
    this.runs.set(run.id, run)
  }
}
