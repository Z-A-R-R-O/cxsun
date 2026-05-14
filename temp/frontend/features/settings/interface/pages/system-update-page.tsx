"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { CheckCircle2, GitBranch, Play, RefreshCcw, RotateCcw, ServerCog } from "lucide-react";
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
  getSystemUpdateStatus,
  runSystemUpdateAction,
  type SystemUpdateAction,
  type SystemUpdateResponse,
} from "../../infrastructure/system-update-api";

export function SystemUpdateSettingsPage() {
  const { show } = useGlobalLoader();
  const [status, setStatus] = useState<SystemUpdateResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [runningAction, setRunningAction] = useState<SystemUpdateAction | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const hide = show();
    void getSystemUpdateStatus({ signal: controller.signal })
      .then((nextStatus) => {
        setStatus(nextStatus);
        setError(null);
      })
      .catch((loadError) => {
        if (isAbortError(loadError)) return;
        setError(loadError instanceof Error ? loadError.message : "Could not load system update status.");
      })
      .finally(() => {
        if (!controller.signal.aborted) hide();
      });

    return () => {
      controller.abort();
      hide();
    };
  }, [show]);

  async function runAction(action: SystemUpdateAction) {
    const rollbackTarget = action === "rollback" ? status?.rollbackTarget : null;
    if (!confirmSystemUpdateAction(action, rollbackTarget)) return;

    setRunningAction(action);
    setError(null);
    const hide = show();
    try {
      const result = await runSystemUpdateAction(action, action === "rollback" ? { targetCommit: rollbackTarget } : undefined);
      setStatus(result);
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : `Could not run ${action}.`);
    } finally {
      setRunningAction(null);
      hide();
    }
  }

  async function refreshStatus() {
    try {
      const nextStatus = await getSystemUpdateStatus();
      setStatus(nextStatus);
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not refresh system update status.");
    }
  }

  const git = useMemo(() => readObject(status?.git), [status]);
  const preflight = useMemo(() => readObject(status?.preflight), [status]);
  const activeOperation = useMemo(() => readObject(status?.activeOperation), [status]);
  const history = Array.isArray(status?.history) ? status.history : [];
  const problems = Array.isArray(preflight?.problems) ? preflight.problems.map(String) : [];
  const remoteRunningAction = typeof status?.runningAction === "string" ? status.runningAction : null;
  const busyAction = runningAction ?? remoteRunningAction;
  const actionsDisabled = Boolean(busyAction);

  useEffect(() => {
    if (!busyAction) return;
    const intervalId = window.setInterval(() => {
      void refreshStatus();
    }, 4000);
    return () => window.clearInterval(intervalId);
  }, [busyAction]);

  return (
    <CommonListPageFrame
      action={
        <div className="flex flex-wrap gap-2">
          <Button
            className="rounded-xl"
            variant="outline"
            onClick={() => void runAction("preflight")}
            disabled={Boolean(runningAction)}
          >
            <CheckCircle2 className="size-4" />
            Preflight
          </Button>
          <Button
            className="rounded-xl"
            onClick={() => void runAction("deploy")}
            disabled={actionsDisabled}
          >
            <RefreshCcw className="size-4" />
            {busyAction === "deploy" ? "Running..." : "Pull GitHub, Build & Restart"}
          </Button>
        </div>
      }
      description="Pull the latest GitHub version, rebuild the Docker app image, and restart the running application."
      technicalName="page.settings.system-update"
      title="System Update"
    >
      {error ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      {remoteRunningAction ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Maintenance is in progress: system update {remoteRunningAction} is already running
          {typeof activeOperation?.startedAt === "string" ? ` since ${formatDateTime(activeOperation.startedAt)}` : ""}.
          Keep users out of critical entry work until this finishes.
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-3">
        <StatusCard
          icon={<ServerCog className="size-5" />}
          label="Update status"
          title={status?.status ?? "unknown"}
          value={status?.message ?? status?.timestamp ?? "No status loaded yet."}
        />
        <StatusCard
          icon={<GitBranch className="size-5" />}
          label="Repository"
          title={String(status?.gitUrl ?? status?.deployDir ?? "-")}
          value={`Branch: ${String(status?.gitBranch ?? git?.branch ?? "-")}`}
        />
        <StatusCard
          icon={<RotateCcw className="size-5" />}
          label="Version"
          title={String(git?.packageVersion ?? "-")}
          value={`Local: ${shortHash(git?.localCommit)} | Latest: ${shortHash(git?.remoteCommit)}`}
        />
      </div>

      <Card className="rounded-md border-border/70">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Manual Actions</CardTitle>
          <CardDescription>
            Run the stages separately when you want to inspect each step before restart.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {manualActions.map(({ action, label }) => (
            <Button
              key={action}
              className="rounded-xl capitalize"
              variant="outline"
              onClick={() => void runAction(action)}
              disabled={actionsDisabled}
            >
              <Play className="size-4" />
              {busyAction === action ? "Running..." : label}
            </Button>
          ))}
        </CardContent>
      </Card>

      <Card className="rounded-md border-border/70">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Preflight</CardTitle>
          <CardDescription>
            Required system checks for update, build, and restart.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          <Badge
            variant="outline"
            className={
              preflight?.ok
                ? "w-fit rounded-md border-emerald-200 bg-emerald-50 text-emerald-700"
                : "w-fit rounded-md border-amber-200 bg-amber-50 text-amber-700"
            }
          >
            {preflight?.ok ? "ready" : "needs review"}
          </Badge>
          {problems.length ? (
            <div className="grid gap-2">
              {problems.map((problem) => (
                <div key={problem} className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                  {problem}
                </div>
              ))}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card className="rounded-md border-border/70">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Rollback</CardTitle>
          <CardDescription>
            Rebuild and restart from the previous commit recorded by the last successful deploy.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-3">
          <Button
            className="rounded-xl"
            variant="outline"
            onClick={() => void runAction("rollback")}
            disabled={actionsDisabled || !status?.rollbackTarget}
          >
            <RotateCcw className="size-4" />
            {busyAction === "rollback" ? "Running..." : "Rollback"}
          </Button>
          <div className="text-xs text-muted-foreground">Target: {shortHash(status?.rollbackTarget)}</div>
        </CardContent>
      </Card>

      <Card className="rounded-md border-border/70">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">History</CardTitle>
          <CardDescription>Recent update operations with persisted progress and results.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2">
          {history.length ? (
            history.map((record) => (
              <div
                key={record.operationId}
                className="grid gap-1 rounded-md border border-border/70 px-3 py-2 text-sm md:grid-cols-[160px_1fr_120px]"
              >
                <div className="font-medium capitalize">{record.action}</div>
                <div className="min-w-0 text-muted-foreground">
                  <div className="truncate">{record.message ?? "-"}</div>
                  <div className="text-xs">
                    {record.startedAt ? formatDateTime(record.startedAt) : "-"} | {shortHash(record.previousCommit)} to{" "}
                    {shortHash(record.targetCommit ?? record.localCommit)}
                  </div>
                </div>
                <Badge variant="outline" className="w-fit rounded-md">
                  {record.status} {typeof record.progressPercent === "number" ? `${record.progressPercent}%` : ""}
                </Badge>
              </div>
            ))
          ) : (
            <div className="rounded-md border border-border/70 px-3 py-2 text-sm text-muted-foreground">
              No update history recorded yet.
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="rounded-md border-border/70">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Last Result</CardTitle>
          <CardDescription>Raw update response for troubleshooting.</CardDescription>
        </CardHeader>
        <CardContent>
          <pre className="max-h-[360px] overflow-auto rounded-md border border-border/70 bg-muted/25 p-4 text-xs">
            {JSON.stringify(status, null, 2)}
          </pre>
        </CardContent>
      </Card>
    </CommonListPageFrame>
  );
}

const manualActions: readonly {
  readonly action: SystemUpdateAction;
  readonly label: string;
}[] = [
  { action: "sync", label: "Pull latest GitHub version" },
  { action: "build", label: "Build" },
  { action: "restart", label: "Restart" },
  { action: "smoke", label: "Smoke" },
];

function confirmSystemUpdateAction(action: SystemUpdateAction, targetCommit?: string | null) {
  if (action === "deploy") {
    return window.confirm(
      "Pull the latest GitHub version, back up the database, run migrations, build the app image, and restart the application?",
    );
  }
  if (action === "restart") {
    return window.confirm("Restart the running application now?");
  }
  if (action === "rollback") {
    return window.confirm(`Rollback, build, and restart using commit ${shortHash(targetCommit)}?`);
  }
  return true;
}

function StatusCard({
  icon,
  label,
  title,
  value,
}: {
  readonly icon: ReactNode;
  readonly label: string;
  readonly title: string;
  readonly value: string;
}) {
  return (
    <Card className="rounded-md border-border/70">
      <CardContent className="flex gap-3 p-4">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-muted text-foreground">
          {icon}
        </div>
        <div className="min-w-0">
          <div className="text-xs font-medium uppercase text-muted-foreground">{label}</div>
          <div className="mt-1 truncate text-sm font-semibold text-foreground">{title}</div>
          <div className="mt-1 text-xs text-muted-foreground">{value}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function readObject(value: unknown) {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function shortHash(value: unknown) {
  return typeof value === "string" && value ? value.slice(0, 8) : "-";
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === "AbortError";
}
