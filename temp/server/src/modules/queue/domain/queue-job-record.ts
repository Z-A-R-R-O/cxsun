export const queueJobStatuses = [
  "waiting",
  "active",
  "completed",
  "failed",
  "cancelled",
] as const;

export type QueueJobStatus = (typeof queueJobStatuses)[number];

export interface QueueJobRecord {
  readonly id: string;
  readonly queueName: string;
  readonly jobName: string;
  readonly status: QueueJobStatus;
  readonly payload: Record<string, unknown>;
  readonly result: Record<string, unknown>;
  readonly progressPercent: number;
  readonly attemptsMade: number;
  readonly maxAttempts: number;
  readonly priority: number;
  readonly companyId: string | null;
  readonly requestedByUserId: string | null;
  readonly requestedByName: string | null;
  readonly availableAt: string;
  readonly lockedAt: string | null;
  readonly startedAt: string | null;
  readonly finishedAt: string | null;
  readonly lastError: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface QueueJobInput {
  readonly queueName: string;
  readonly jobName: string;
  readonly payload: Record<string, unknown>;
  readonly maxAttempts?: number;
  readonly priority?: number;
  readonly companyId?: string | null;
}

export interface QueueJobListResult {
  readonly items: readonly QueueJobRecord[];
  readonly nextCursor: string | null;
}

export interface QueueStatsRecord {
  readonly total: number;
  readonly waiting: number;
  readonly active: number;
  readonly completed: number;
  readonly failed: number;
  readonly cancelled: number;
}

export interface QueueCatalogRecord {
  readonly queues: readonly {
    readonly queueName: string;
    readonly label: string;
    readonly jobs: readonly {
      readonly jobName: string;
      readonly label: string;
      readonly description: string;
      readonly samplePayload: Record<string, unknown>;
    }[];
  }[];
}
