import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
  type OnModuleDestroy,
  type OnModuleInit,
} from "@nestjs/common";
import {
  createDatabaseConnection,
  loadDatabaseEnv,
  type DatabaseConnection,
} from "@cxnext/db";
import type { Kysely } from "kysely";
import type { AuthRequestContext } from "../../auth/interface/http/auth-context";
import type {
  QueueCatalogRecord,
  QueueJobInput,
  QueueJobListResult,
  QueueJobRecord,
  QueueJobStatus,
  QueueStatsRecord,
} from "../domain/queue-job-record";
import type {
  QueueJobExecutionContext,
  QueueJobHandlerDefinition,
} from "../domain/queue-job-handler";

type DynamicDatabase = Record<string, Record<string, unknown>>;
type QueueJobRow = Record<string, unknown>;

interface QueueListFilters {
  readonly companyId?: string | null;
  readonly cursor?: string | null;
  readonly limit?: number;
  readonly queueName?: string | null;
  readonly search?: string | null;
  readonly status?: QueueJobStatus | null;
}

const defaultQueueJobCatalog: readonly QueueJobHandlerDefinition[] = [
  {
    queueName: "lazy-load",
    jobName: "warm-route-cache",
    label: "Warm route cache",
    description: "Prepares route and list caches for the selected workspace.",
    samplePayload: { route: "/desk", target: "application-desk" },
    run: async (context, payload) => {
      await context.setProgress(18);
      await sleep(220);
      await context.setProgress(48);
      await sleep(260);
      await context.setProgress(82);
      await sleep(220);
      return {
        warmedRoute: typeof payload.route === "string" ? payload.route : "/desk",
        target: typeof payload.target === "string" ? payload.target : "application-desk",
      };
    },
  },
  {
    queueName: "reports",
    jobName: "materialize-summary",
    label: "Materialize summary",
    description: "Builds a cached report summary payload for faster follow-up views.",
    samplePayload: { report: "customer-statement", range: "current-year" },
    run: async (context, payload) => {
      await context.setProgress(24);
      await sleep(260);
      await context.setProgress(56);
      await sleep(320);
      await context.setProgress(88);
      await sleep(240);
      return {
        report: typeof payload.report === "string" ? payload.report : "customer-statement",
        range: typeof payload.range === "string" ? payload.range : "current-year",
        rowsCached: 128,
      };
    },
  },
  {
    queueName: "maintenance",
    jobName: "audit-media-storage",
    label: "Audit media storage",
    description: "Checks storage consistency and reports duplicate or missing assets.",
    samplePayload: { folder: "logo", visibility: "public" },
    run: async (context, payload) => {
      await context.setProgress(20);
      await sleep(180);
      await context.setProgress(42);
      await sleep(220);
      await context.setProgress(72);
      await sleep(200);
      if (payload.forceFail === true) {
        throw new Error("Storage audit found a forced failure for testing.");
      }
      await context.setProgress(92);
      await sleep(120);
      return {
        folder: typeof payload.folder === "string" ? payload.folder : "logo",
        visibility: payload.visibility === "private" ? "private" : "public",
        duplicatesFound: 0,
      };
    },
  },
] as const;

@Injectable()
export class QueueService implements OnModuleInit, OnModuleDestroy {
  private readonly connection: DatabaseConnection;
  private readonly handlerDefinitions = new Map<string, QueueJobHandlerDefinition>();
  private readonly logger = new Logger(QueueService.name);
  private processing = false;
  private pollHandle: NodeJS.Timeout | null = null;
  private queueUnavailableReason: string | null = null;

  public constructor() {
    this.connection = createDatabaseConnection(loadDatabaseEnv().env);
    this.registerHandlers(defaultQueueJobCatalog);
  }

  public onModuleInit() {
    this.pollHandle = setInterval(() => {
      void this.processAvailableJobsSafely();
    }, 600);
  }

  public async onModuleDestroy(): Promise<void> {
    if (this.pollHandle) {
      clearInterval(this.pollHandle);
      this.pollHandle = null;
    }
    await this.connection.destroy();
  }

  public async list(filters: QueueListFilters): Promise<QueueJobListResult> {
    this.assertQueueAvailable();
    const limit = normalizeLimit(filters.limit);
    const cursor = normalizeCursor(filters.cursor);
    let query = this.db().selectFrom("queue_jobs").selectAll().orderBy("id", "desc").limit(limit + 1);

    if (filters.companyId) {
      query = query.where("company_id", "=", Number(filters.companyId));
    }
    if (filters.queueName) {
      query = query.where("queue_name", "=", filters.queueName);
    }
    if (filters.status) {
      query = query.where("status", "=", filters.status);
    }
    if (filters.search) {
      const likeValue = `%${filters.search}%`;
      query = query.where((expressionBuilder) =>
        expressionBuilder.or([
          expressionBuilder("job_name", "like", likeValue),
          expressionBuilder("queue_name", "like", likeValue),
          expressionBuilder("requested_by_name", "like", likeValue),
        ]),
      );
    }
    if (cursor !== null) {
      query = query.where("id", "<", cursor);
    }

    const rows = await query.execute();
    const hasMore = rows.length > limit;
    const pageRows = hasMore ? rows.slice(0, limit) : rows;
    return {
      items: pageRows.map(toQueueJobRecord),
      nextCursor: hasMore ? String(pageRows.at(-1)?.id ?? "") : null,
    };
  }

  public async stats(companyId?: string | null): Promise<QueueStatsRecord> {
    this.assertQueueAvailable();
    let query = this.db()
      .selectFrom("queue_jobs")
      .select(["status"])
      .select((expressionBuilder) => expressionBuilder.fn.count("id").as("total"))
      .groupBy("status");

    if (companyId) {
      query = query.where("company_id", "=", Number(companyId));
    }

    const rows = await query.execute();
    const stats: {
      total: number;
      waiting: number;
      active: number;
      completed: number;
      failed: number;
      cancelled: number;
    } = {
      total: 0,
      waiting: 0,
      active: 0,
      completed: 0,
      failed: 0,
      cancelled: 0,
    };

    for (const row of rows) {
      const status = normalizeStatus(row.status);
      const total = Number(row.total ?? 0);
      stats.total += total;
      stats[status] += total;
    }

    return stats;
  }

  public catalog(): QueueCatalogRecord {
    const grouped = new Map<
      string,
      {
        queueName: string;
        label: string;
        jobs: Array<QueueCatalogRecord["queues"][number]["jobs"][number]>;
      }
    >();

    for (const definition of this.handlerDefinitions.values()) {
      const existing = grouped.get(definition.queueName);
      if (existing) {
        existing.jobs = [
          ...existing.jobs,
          {
            jobName: definition.jobName,
            label: definition.label,
            description: definition.description,
            samplePayload: definition.samplePayload,
          },
        ];
        continue;
      }

      grouped.set(definition.queueName, {
        queueName: definition.queueName,
        label: humanizeKey(definition.queueName),
        jobs: [
          {
            jobName: definition.jobName,
            label: definition.label,
            description: definition.description,
            samplePayload: definition.samplePayload,
          },
        ],
      });
    }

    return { queues: Array.from(grouped.values()) };
  }

  public async enqueue(input: QueueJobInput, auth: AuthRequestContext | null) {
    this.assertQueueAvailable();
    const definition = this.findQueueDefinition(input.queueName, input.jobName);
    const now = new Date();

    const inserted = await this.db()
      .insertInto("queue_jobs")
      .values({
        queue_name: definition.queueName,
        job_name: definition.jobName,
        status: "waiting",
        payload_json: JSON.stringify(cleanObject(input.payload)),
        result_json: JSON.stringify({}),
        progress_percent: 0,
        attempts_made: 0,
        max_attempts: normalizeAttempts(input.maxAttempts),
        priority: normalizePriority(input.priority),
        company_id: input.companyId ? Number(input.companyId) : null,
        requested_by_user_id: auth?.user.id ?? null,
        requested_by_name: auth?.user.displayName ?? null,
        available_at: now,
        locked_at: null,
        started_at: null,
        finished_at: null,
        last_error: null,
        created_at: now,
        updated_at: now,
      })
      .executeTakeFirst();

    const jobId = String(inserted.insertId ?? "");
    await this.processAvailableJobs();
    return this.getRequired(jobId);
  }

  public async retry(jobId: string) {
    this.assertQueueAvailable();
    const row = await this.getRequiredRow(jobId);
    if (row.status !== "failed" && row.status !== "cancelled") {
      throw new BadRequestException("Only failed or cancelled jobs can be retried.");
    }

    await this.db()
      .updateTable("queue_jobs")
      .set({
        status: "waiting",
        progress_percent: 0,
        available_at: new Date(),
        locked_at: null,
        started_at: null,
        finished_at: null,
        last_error: null,
        result_json: JSON.stringify({}),
        updated_at: new Date(),
      })
      .where("id", "=", Number(jobId))
      .executeTakeFirst();

    await this.processAvailableJobs();
    return this.getRequired(jobId);
  }

  public async cancel(jobId: string) {
    this.assertQueueAvailable();
    const row = await this.getRequiredRow(jobId);
    if (row.status === "completed") {
      throw new BadRequestException("Completed jobs cannot be cancelled.");
    }

    await this.db()
      .updateTable("queue_jobs")
      .set({
        status: "cancelled",
        finished_at: new Date(),
        updated_at: new Date(),
      })
      .where("id", "=", Number(jobId))
      .executeTakeFirst();

    return this.getRequired(jobId);
  }

  public async remove(jobId: string) {
    this.assertQueueAvailable();
    const deleted = await this.db()
      .deleteFrom("queue_jobs")
      .where("id", "=", Number(jobId))
      .executeTakeFirst();

    if (!Number(deleted.numDeletedRows ?? 0)) {
      throw new NotFoundException(`Queue job "${jobId}" was not found.`);
    }

    return { deleted: true };
  }

  private async getRequired(jobId: string) {
    const row = await this.getRequiredRow(jobId);
    return toQueueJobRecord(row);
  }

  private async getRequiredRow(jobId: string) {
    const row = await this.db()
      .selectFrom("queue_jobs")
      .selectAll()
      .where("id", "=", Number(jobId))
      .executeTakeFirst();
    if (!row) {
      throw new NotFoundException(`Queue job "${jobId}" was not found.`);
    }
    return row;
  }

  private db(): Kysely<DynamicDatabase> {
    return this.connection.db as unknown as Kysely<DynamicDatabase>;
  }

  public registerHandlers(definitions: readonly QueueJobHandlerDefinition[]) {
    for (const definition of definitions) {
      this.handlerDefinitions.set(this.handlerKey(definition.queueName, definition.jobName), definition);
    }
  }

  private async processAvailableJobsSafely() {
    if (this.queueUnavailableReason) {
      return;
    }

    try {
      await this.processAvailableJobs();
    } catch (error) {
      if (isMissingQueueJobsTableError(error)) {
        this.disableQueue(
          "Queue storage is unavailable because the `queue_jobs` table is missing. Run the latest database migrations to enable queue and mail jobs.",
        );
        return;
      }
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Queue worker polling failed: ${message}`, error instanceof Error ? error.stack : undefined);
    }
  }

  private async processAvailableJobs() {
    if (this.processing) {
      return;
    }

    this.processing = true;
    try {
      while (true) {
        const row = await this.claimNextWaitingJob();
        if (!row) {
          return;
        }
        await this.runJob(row);
      }
    } finally {
      this.processing = false;
    }
  }

  private async claimNextWaitingJob() {
    const now = new Date();
    const next = await this.db()
      .selectFrom("queue_jobs")
      .selectAll()
      .where("status", "=", "waiting")
      .where("available_at", "<=", now)
      .orderBy("priority", "desc")
      .orderBy("id", "asc")
      .executeTakeFirst();

    if (!next) {
      return null;
    }

    await this.db()
      .updateTable("queue_jobs")
      .set({
        status: "active",
        attempts_made: Number(next.attempts_made) + 1,
        progress_percent: 3,
        locked_at: now,
        started_at: next.started_at ?? now,
        updated_at: now,
      })
      .where("id", "=", next.id)
      .executeTakeFirst();

    return this.getRequiredRow(String(next.id));
  }

  private async runJob(row: QueueJobRow) {
    const definition = this.findQueueDefinition(stringValue(row.queue_name), stringValue(row.job_name));
    const attemptsMade = Number(row.attempts_made ?? 0);
    const maxAttempts = Number(row.max_attempts ?? 1);
    try {
      const result = await definition.run(
        {
          setProgress: async (progressPercent) => {
            await this.db()
              .updateTable("queue_jobs")
              .set({
                progress_percent: clampProgress(progressPercent),
                updated_at: new Date(),
              })
              .where("id", "=", row.id)
              .executeTakeFirst();
          },
        } satisfies QueueJobExecutionContext,
        parseJsonObject(row.payload_json),
      );

      await this.db()
        .updateTable("queue_jobs")
        .set({
          status: "completed",
          progress_percent: 100,
          result_json: JSON.stringify(cleanObject(result)),
          finished_at: new Date(),
          updated_at: new Date(),
        })
        .where("id", "=", row.id)
        .executeTakeFirst();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Queue job failed.";
      if (attemptsMade < maxAttempts) {
        await this.db()
          .updateTable("queue_jobs")
          .set({
            status: "waiting",
            available_at: new Date(Date.now() + retryDelayMilliseconds(attemptsMade)),
            locked_at: null,
            last_error: message,
            updated_at: new Date(),
          })
          .where("id", "=", row.id)
          .executeTakeFirst();
        return;
      }

      await this.db()
        .updateTable("queue_jobs")
        .set({
          status: "failed",
          finished_at: new Date(),
          last_error: message,
          updated_at: new Date(),
        })
        .where("id", "=", row.id)
        .executeTakeFirst();
    }
  }

  private handlerKey(queueName: string, jobName: string) {
    return `${queueName}::${jobName}`;
  }

  private findQueueDefinition(queueName: string, jobName: string) {
    const definition = this.handlerDefinitions.get(this.handlerKey(queueName, jobName));
    if (!definition) {
      throw new BadRequestException(`Unsupported queue job "${queueName}/${jobName}".`);
    }
    return definition;
  }

  private assertQueueAvailable() {
    if (!this.queueUnavailableReason) {
      return;
    }
    throw new ServiceUnavailableException(this.queueUnavailableReason);
  }

  private disableQueue(reason: string) {
    if (this.queueUnavailableReason) {
      return;
    }
    this.queueUnavailableReason = reason;
    if (this.pollHandle) {
      clearInterval(this.pollHandle);
      this.pollHandle = null;
    }
    this.logger.warn(reason);
  }
}

function toQueueJobRecord(row: QueueJobRow): QueueJobRecord {
  return {
    id: String(row.id),
    queueName: stringValue(row.queue_name),
    jobName: stringValue(row.job_name),
    status: normalizeStatus(row.status),
    payload: parseJsonObject(row.payload_json),
    result: parseJsonObject(row.result_json),
    progressPercent: Number(row.progress_percent ?? 0),
    attemptsMade: Number(row.attempts_made ?? 0),
    maxAttempts: Number(row.max_attempts ?? 0),
    priority: Number(row.priority ?? 0),
    companyId: row.company_id === null ? null : String(row.company_id),
    requestedByUserId: stringOrNull(row.requested_by_user_id),
    requestedByName: stringOrNull(row.requested_by_name),
    availableAt: toIsoString(dateValue(row.available_at)),
    lockedAt: toNullableIsoString(dateOrNull(row.locked_at)),
    startedAt: toNullableIsoString(dateOrNull(row.started_at)),
    finishedAt: toNullableIsoString(dateOrNull(row.finished_at)),
    lastError: stringOrNull(row.last_error),
    createdAt: toIsoString(dateValue(row.created_at)),
    updatedAt: toIsoString(dateValue(row.updated_at)),
  };
}

function parseJsonObject(value: unknown) {
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as unknown;
      return cleanObject(parsed);
    } catch {
      return {};
    }
  }
  return cleanObject(value);
}

function cleanObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  return value as Record<string, unknown>;
}

function normalizeStatus(value: unknown): QueueJobStatus {
  return value === "active" ||
    value === "completed" ||
    value === "failed" ||
    value === "cancelled"
    ? value
    : "waiting";
}

function normalizeLimit(limit: number | undefined) {
  if (!Number.isFinite(limit)) {
    return 20;
  }
  return Math.min(50, Math.max(1, Math.trunc(limit ?? 20)));
}

function normalizeCursor(value: string | null | undefined) {
  if (!value) {
    return null;
  }
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function normalizeAttempts(value: number | undefined) {
  if (!Number.isFinite(value)) {
    return 3;
  }
  return Math.min(10, Math.max(1, Math.trunc(value ?? 3)));
}

function normalizePriority(value: number | undefined) {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.min(100, Math.max(0, Math.trunc(value ?? 0)));
}

function clampProgress(value: number) {
  return Math.min(100, Math.max(0, Math.round(value)));
}

function toIsoString(value: Date | string) {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function toNullableIsoString(value: Date | string | null) {
  if (!value) {
    return null;
  }
  return toIsoString(value);
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value : String(value ?? "");
}

function stringOrNull(value: unknown) {
  return typeof value === "string" ? value : null;
}

function dateValue(value: unknown) {
  return value instanceof Date || typeof value === "string" ? value : new Date(0);
}

function dateOrNull(value: unknown) {
  return value instanceof Date || typeof value === "string" ? value : null;
}

function humanizeKey(value: string) {
  return value
    .split(/[-_]/g)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function sleep(milliseconds: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

function retryDelayMilliseconds(attemptsMade: number) {
  return Math.min(30_000, Math.max(1, attemptsMade) * 1_500);
}

function isMissingQueueJobsTableError(error: unknown) {
  if (!error || typeof error !== "object") {
    return false;
  }

  const candidate = error as {
    code?: unknown;
    sqlMessage?: unknown;
    message?: unknown;
  };

  if (candidate.code === "ER_NO_SUCH_TABLE") {
    const sqlMessage = typeof candidate.sqlMessage === "string" ? candidate.sqlMessage : "";
    const message = typeof candidate.message === "string" ? candidate.message : "";
    return sqlMessage.includes("queue_jobs") || message.includes("queue_jobs");
  }

  return false;
}
