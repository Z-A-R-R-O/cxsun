import { EventEmitter } from 'events'

export interface RunEvent {
  type:
    | 'run_started'
    | 'stage_started'
    | 'stage_chunk'
    | 'stage_completed'
    | 'stage_failed'
    | 'run_finished'
    | 'run_failed'
  runId: string
  stageId?: string
  chunk?: string
  output?: string
  tokensUsed?: number
  error?: string
}

class RunEventBus extends EventEmitter {
  emitRunStarted(runId: string) {
    this.emit('event', { type: 'run_started', runId } as RunEvent)
  }

  emitStageStarted(runId: string, stageId: string) {
    this.emit('event', { type: 'stage_started', runId, stageId } as RunEvent)
  }

  emitStageChunk(runId: string, stageId: string, chunk: string) {
    this.emit('event', { type: 'stage_chunk', runId, stageId, chunk } as RunEvent)
  }

  emitStageCompleted(runId: string, stageId: string, output: string, tokensUsed: number) {
    this.emit('event', { type: 'stage_completed', runId, stageId, output, tokensUsed } as RunEvent)
  }

  emitStageFailed(runId: string, stageId: string, error: string) {
    this.emit('event', { type: 'stage_failed', runId, stageId, error } as RunEvent)
  }

  emitRunFinished(runId: string, tokensUsed: number) {
    this.emit('event', { type: 'run_finished', runId, tokensUsed } as RunEvent)
  }

  emitRunFailed(runId: string, error: string) {
    this.emit('event', { type: 'run_failed', runId, error } as RunEvent)
  }
}

export const runEventBus = new RunEventBus()
