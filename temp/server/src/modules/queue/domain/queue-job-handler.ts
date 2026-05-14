export interface QueueJobExecutionContext {
  setProgress(progressPercent: number): Promise<void>;
}

export interface QueueJobHandlerDefinition {
  readonly queueName: string;
  readonly jobName: string;
  readonly label: string;
  readonly description: string;
  readonly samplePayload: Record<string, unknown>;
  readonly run: (
    context: QueueJobExecutionContext,
    payload: Record<string, unknown>,
  ) => Promise<Record<string, unknown>>;
}
