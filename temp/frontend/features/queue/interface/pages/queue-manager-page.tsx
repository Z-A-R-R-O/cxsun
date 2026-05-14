"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CommonListPageFrame,
  useGlobalLoader,
} from "@cxnext/ui";
import {
  LoaderCircle,
  Play,
  RefreshCcw,
  RotateCcw,
  Search,
  Square,
  Trash2,
} from "lucide-react";
import { readStoredApplicationContext } from "../../../auth/infrastructure/session-storage";
import {
  cancelQueueJob,
  createQueueJob,
  deleteQueueJob,
  getQueueCatalog,
  getQueueStats,
  listQueueJobs,
  retryQueueJob,
  type QueueCatalogRecord,
  type QueueJobRecord,
  type QueueJobStatus,
  type QueueStatsRecord,
} from "../../infrastructure/queue-api";

const emptyStats: QueueStatsRecord = {
  total: 0,
  waiting: 0,
  active: 0,
  completed: 0,
  failed: 0,
  cancelled: 0,
};

const statusOptions: readonly { value: QueueJobStatus | "all"; label: string }[] = [
  { value: "all", label: "All status" },
  { value: "waiting", label: "Waiting" },
  { value: "active", label: "Active" },
  { value: "completed", label: "Completed" },
  { value: "failed", label: "Failed" },
  { value: "cancelled", label: "Cancelled" },
] as const;

export function QueueManagerPage() {
  const { show } = useGlobalLoader();
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState("Active company");
  const [catalog, setCatalog] = useState<QueueCatalogRecord>({ queues: [] });
  const [stats, setStats] = useState<QueueStatsRecord>(emptyStats);
  const [items, setItems] = useState<readonly QueueJobRecord[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [searchDraft, setSearchDraft] = useState("");
  const [statusFilter, setStatusFilter] = useState<QueueJobStatus | "all">("all");
  const [queueFilter, setQueueFilter] = useState<string>("all");
  const [selectedQueueName, setSelectedQueueName] = useState("");
  const [selectedJobName, setSelectedJobName] = useState("");
  const [payloadText, setPayloadText] = useState("{}");
  const [priority, setPriority] = useState("0");
  const [maxAttempts, setMaxAttempts] = useState("3");
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [busyJobId, setBusyJobId] = useState<string | null>(null);

  const selectedQueue = useMemo(
    () => catalog.queues.find((queue) => queue.queueName === selectedQueueName) ?? null,
    [catalog.queues, selectedQueueName],
  );
  const selectedJob = useMemo(
    () => selectedQueue?.jobs.find((job) => job.jobName === selectedJobName) ?? null,
    [selectedJobName, selectedQueue],
  );

  useEffect(() => {
    const context = readStoredApplicationContext();
    const activeCompanyId = context?.company.id ?? null;
    setCompanyId(activeCompanyId);
    setCompanyName(context?.company.name ?? "Active company");
  }, []);

  useEffect(() => {
    const hide = show();
    void Promise.all([getQueueCatalog(), getQueueStats(companyId)]).then(
      ([nextCatalog, nextStats]) => {
        setCatalog(nextCatalog);
        setStats(nextStats);
        const defaultQueue = nextCatalog.queues[0];
        if (defaultQueue) {
          setSelectedQueueName((current) => current || defaultQueue.queueName);
          setSelectedJobName((current) => current || defaultQueue.jobs[0]?.jobName || "");
          if (!payloadText.trim() || payloadText === "{}") {
            setPayloadText(JSON.stringify(defaultQueue.jobs[0]?.samplePayload ?? {}, null, 2));
          }
        }
      },
    ).catch((error: unknown) => {
      toast.error("Could not load queue manager", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    }).finally(hide);
  }, [companyId, payloadText, show]);

  useEffect(() => {
    if (!selectedQueue && catalog.queues[0]) {
      setSelectedQueueName(catalog.queues[0].queueName);
      return;
    }
    if (!selectedQueue) {
      return;
    }
    const fallbackJob = selectedQueue.jobs[0];
    if (!selectedQueue.jobs.some((job) => job.jobName === selectedJobName) && fallbackJob) {
      setSelectedJobName(fallbackJob.jobName);
      setPayloadText(JSON.stringify(fallbackJob.samplePayload, null, 2));
    }
  }, [catalog.queues, selectedJobName, selectedQueue]);

  useEffect(() => {
    void refreshJobs();
  }, [companyId, queueFilter, search, statusFilter]);

  async function refreshJobs() {
    const hide = show();
    try {
      const [jobPage, nextStats] = await Promise.all([
        listQueueJobs({
          companyId,
          limit: 12,
          queueName: queueFilter === "all" ? null : queueFilter,
          search: search || null,
          status: statusFilter === "all" ? null : statusFilter,
        }),
        getQueueStats(companyId),
      ]);
      setItems(jobPage.items);
      setNextCursor(jobPage.nextCursor);
      setStats(nextStats);
    } catch (error) {
      toast.error("Could not load queue jobs", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      hide();
    }
  }

  async function loadMore() {
    if (!nextCursor) {
      return;
    }
    setIsLoadingMore(true);
    try {
      const page = await listQueueJobs({
        companyId,
        cursor: nextCursor,
        limit: 12,
        queueName: queueFilter === "all" ? null : queueFilter,
        search: search || null,
        status: statusFilter === "all" ? null : statusFilter,
      });
      setItems((current) => [...current, ...page.items]);
      setNextCursor(page.nextCursor);
    } catch (error) {
      toast.error("Could not load more jobs", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setIsLoadingMore(false);
    }
  }

  async function enqueueJob() {
    if (!selectedQueueName || !selectedJobName) {
      toast.error("Choose a queue and job first.");
      return;
    }

    let payload: Record<string, unknown>;
    try {
      payload = parsePayloadText(payloadText);
    } catch (error) {
      toast.error("Payload must be valid JSON", {
        description: error instanceof Error ? error.message : "Please correct the payload.",
      });
      return;
    }

    const hide = show();
    try {
      await createQueueJob({
        companyId,
        queueName: selectedQueueName,
        jobName: selectedJobName,
        payload,
        maxAttempts: Number(maxAttempts || "3"),
        priority: Number(priority || "0"),
      });
      toast.success("Queue job added", {
        description: `${selectedQueueName} / ${selectedJobName} is now waiting to run.`,
      });
      await refreshJobs();
    } catch (error) {
      toast.error("Could not enqueue job", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      hide();
    }
  }

  async function mutateJob(
    jobId: string,
    action: "retry" | "cancel" | "delete",
  ) {
    setBusyJobId(jobId);
    try {
      if (action === "retry") {
        await retryQueueJob(jobId);
      } else if (action === "cancel") {
        await cancelQueueJob(jobId);
      } else {
        await deleteQueueJob(jobId);
      }
      await refreshJobs();
    } catch (error) {
      toast.error(`Could not ${action} job`, {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setBusyJobId(null);
    }
  }

  function applySelectedJobPayload() {
    if (!selectedJob) {
      return;
    }
    setPayloadText(JSON.stringify(selectedJob.samplePayload, null, 2));
  }

  return (
    <CommonListPageFrame
      action={
        <Button className="rounded-xl" onClick={() => void refreshJobs()}>
          <RefreshCcw className="size-4" />
          Refresh
        </Button>
      }
      description={`Manage local background jobs for ${companyName}. Jobs persist in the database now and can move to BullMQ with Redis later.`}
      technicalName="page.settings.queue"
      title="Queue Manager"
    >
      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="grid gap-4">
          <Card className="rounded-md border-border/70">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Overview</CardTitle>
              <CardDescription>
                Local worker execution with persisted jobs and lazy-loaded history.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {queueMetricCards(stats).map((metric) => (
                <div
                  key={metric.label}
                  className="rounded-md border border-border/70 bg-card px-4 py-3 shadow-sm"
                >
                  <p className="text-sm text-muted-foreground">{metric.label}</p>
                  <p className="mt-1 text-2xl font-semibold text-foreground">{metric.value}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="rounded-md border-border/70">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Enqueue Job</CardTitle>
              <CardDescription>
                Create a local job now. The driver shape is ready to map to BullMQ workers later.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              <label className="grid gap-2">
                <span className="text-sm font-medium text-foreground">Queue</span>
                <select
                  className="h-11 rounded-md border border-input bg-background px-3 text-sm outline-none transition-colors focus:border-foreground/40"
                  value={selectedQueueName}
                  onChange={(event) => {
                    const nextQueueName = event.target.value;
                    setSelectedQueueName(nextQueueName);
                    const queue = catalog.queues.find((item) => item.queueName === nextQueueName);
                    const nextJob = queue?.jobs[0];
                    setSelectedJobName(nextJob?.jobName ?? "");
                    setPayloadText(JSON.stringify(nextJob?.samplePayload ?? {}, null, 2));
                  }}
                >
                  {catalog.queues.map((queue) => (
                    <option key={queue.queueName} value={queue.queueName}>
                      {queue.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-medium text-foreground">Job</span>
                <select
                  className="h-11 rounded-md border border-input bg-background px-3 text-sm outline-none transition-colors focus:border-foreground/40"
                  value={selectedJobName}
                  onChange={(event) => {
                    const nextJobName = event.target.value;
                    setSelectedJobName(nextJobName);
                    const nextJob = selectedQueue?.jobs.find((job) => job.jobName === nextJobName);
                    if (nextJob) {
                      setPayloadText(JSON.stringify(nextJob.samplePayload, null, 2));
                    }
                  }}
                >
                  {(selectedQueue?.jobs ?? []).map((job) => (
                    <option key={job.jobName} value={job.jobName}>
                      {job.label}
                    </option>
                  ))}
                </select>
              </label>

              {selectedJob ? (
                <div className="rounded-md border border-border/70 bg-muted/15 px-4 py-3 text-sm text-muted-foreground">
                  <p className="font-medium text-foreground">{selectedJob.label}</p>
                  <p className="mt-1">{selectedJob.description}</p>
                </div>
              ) : null}

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="grid gap-2">
                  <span className="text-sm font-medium text-foreground">Priority</span>
                  <input
                    className="h-11 rounded-md border border-input bg-background px-3 text-sm outline-none transition-colors focus:border-foreground/40"
                    type="number"
                    value={priority}
                    onChange={(event) => setPriority(event.target.value)}
                  />
                </label>
                <label className="grid gap-2">
                  <span className="text-sm font-medium text-foreground">Max attempts</span>
                  <input
                    className="h-11 rounded-md border border-input bg-background px-3 text-sm outline-none transition-colors focus:border-foreground/40"
                    type="number"
                    value={maxAttempts}
                    onChange={(event) => setMaxAttempts(event.target.value)}
                  />
                </label>
              </div>

              <label className="grid gap-2">
                <span className="text-sm font-medium text-foreground">Payload</span>
                <textarea
                  className="min-h-36 rounded-md border border-input bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-foreground/40"
                  value={payloadText}
                  onChange={(event) => setPayloadText(event.target.value)}
                />
              </label>

              <div className="flex flex-wrap gap-2">
                <Button className="rounded-xl" onClick={() => void enqueueJob()}>
                  <Play className="size-4" />
                  Enqueue
                </Button>
                <Button variant="outline" className="rounded-xl" onClick={applySelectedJobPayload}>
                  Use sample payload
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="rounded-md border-border/70">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Jobs</CardTitle>
            <CardDescription>
              Filter the recent job stream. Older jobs load on demand instead of loading the whole history up front.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-3 lg:grid-cols-[1.2fr_0.8fr_0.8fr_auto]">
              <label className="grid gap-2">
                <span className="text-sm font-medium text-foreground">Search</span>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-3 size-4 text-muted-foreground" />
                  <input
                    className="h-11 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm outline-none transition-colors focus:border-foreground/40"
                    placeholder="Job, queue, or requester"
                    value={searchDraft}
                    onChange={(event) => setSearchDraft(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        setSearch(searchDraft.trim());
                      }
                    }}
                  />
                </div>
              </label>
              <label className="grid gap-2">
                <span className="text-sm font-medium text-foreground">Status</span>
                <select
                  className="h-11 rounded-md border border-input bg-background px-3 text-sm outline-none transition-colors focus:border-foreground/40"
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value as QueueJobStatus | "all")}
                >
                  {statusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-2">
                <span className="text-sm font-medium text-foreground">Queue</span>
                <select
                  className="h-11 rounded-md border border-input bg-background px-3 text-sm outline-none transition-colors focus:border-foreground/40"
                  value={queueFilter}
                  onChange={(event) => setQueueFilter(event.target.value)}
                >
                  <option value="all">All queues</option>
                  {catalog.queues.map((queue) => (
                    <option key={queue.queueName} value={queue.queueName}>
                      {queue.label}
                    </option>
                  ))}
                </select>
              </label>
              <div className="flex items-end gap-2">
                <Button variant="outline" className="rounded-xl" onClick={() => setSearch(searchDraft.trim())}>
                  Apply
                </Button>
              </div>
            </div>

            <div className="grid gap-3">
              {items.length === 0 ? (
                <div className="rounded-md border border-dashed border-border/70 bg-muted/15 px-4 py-8 text-sm text-muted-foreground">
                  No jobs match the current filters yet.
                </div>
              ) : (
                items.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-md border border-border/70 bg-card px-4 py-4 shadow-sm"
                  >
                    <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                      <div className="min-w-0 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium text-foreground">
                            {item.queueName} / {item.jobName}
                          </p>
                          <Badge variant="outline" className={statusBadgeClass(item.status)}>
                            {item.status}
                          </Badge>
                          <Badge variant="secondary">#{item.id}</Badge>
                        </div>
                        <div className="grid gap-1 text-sm text-muted-foreground">
                          <p>
                            Requested by {item.requestedByName ?? "System"} · attempts {item.attemptsMade}/
                            {item.maxAttempts} · priority {item.priority}
                          </p>
                          <p>
                            Created {formatDateTime(item.createdAt)}
                            {item.finishedAt ? ` · finished ${formatDateTime(item.finishedAt)}` : ""}
                          </p>
                          {item.lastError ? <p className="text-destructive">{item.lastError}</p> : null}
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>Progress</span>
                            <span>{item.progressPercent}%</span>
                          </div>
                          <div className="h-2 rounded-full bg-muted">
                            <div
                              className="h-2 rounded-full bg-foreground transition-all"
                              style={{ width: `${item.progressPercent}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 xl:justify-end">
                        {item.status === "failed" || item.status === "cancelled" ? (
                          <Button
                            variant="outline"
                            className="rounded-xl"
                            disabled={busyJobId === item.id}
                            onClick={() => void mutateJob(item.id, "retry")}
                          >
                            {busyJobId === item.id ? (
                              <LoaderCircle className="size-4 animate-spin" />
                            ) : (
                              <RotateCcw className="size-4" />
                            )}
                            Retry
                          </Button>
                        ) : null}
                        {item.status === "waiting" || item.status === "active" ? (
                          <Button
                            variant="outline"
                            className="rounded-xl"
                            disabled={busyJobId === item.id}
                            onClick={() => void mutateJob(item.id, "cancel")}
                          >
                            <Square className="size-4" />
                            Cancel
                          </Button>
                        ) : null}
                        <Button
                          variant="outline"
                          className="rounded-xl text-destructive hover:text-destructive"
                          disabled={busyJobId === item.id}
                          onClick={() => void mutateJob(item.id, "delete")}
                        >
                          <Trash2 className="size-4" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {nextCursor ? (
              <div className="flex justify-center">
                <Button
                  variant="outline"
                  className="rounded-xl"
                  disabled={isLoadingMore}
                  onClick={() => void loadMore()}
                >
                  {isLoadingMore ? <LoaderCircle className="size-4 animate-spin" /> : null}
                  Load more
                </Button>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </CommonListPageFrame>
  );
}

function queueMetricCards(stats: QueueStatsRecord) {
  return [
    { label: "Total", value: stats.total },
    { label: "Waiting", value: stats.waiting },
    { label: "Active", value: stats.active },
    { label: "Completed", value: stats.completed },
    { label: "Failed", value: stats.failed },
    { label: "Cancelled", value: stats.cancelled },
  ];
}

function parsePayloadText(value: string) {
  const parsed = JSON.parse(value) as unknown;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Payload must be a JSON object.");
  }
  return parsed as Record<string, unknown>;
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function statusBadgeClass(status: QueueJobStatus) {
  if (status === "completed") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  if (status === "failed") {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }
  if (status === "active") {
    return "border-sky-200 bg-sky-50 text-sky-700";
  }
  if (status === "cancelled") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }
  return "border-slate-200 bg-slate-50 text-slate-700";
}
