import { useEffect, useState } from "react"
import { AlertCircle, CheckCircle2, GitBranch, RefreshCw, RotateCcw, Terminal } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "src/components/ui/alert"
import { Badge } from "src/components/ui/badge"
import { Button } from "src/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "src/components/ui/card"
import { Progress } from "src/components/ui/progress"
import { cn } from "src/lib/utils"
import { authHeaders, type AuthSession } from "src/features/auth/auth-client"
import { apiBaseUrl } from "src/lib/api-base-url"

interface SystemUpdateStep {
  name: string
  command?: string
  ok: boolean
  required: boolean
  startedAt: string
  finishedAt: string
  output: string
}

interface SystemUpdateResult {
  ok: boolean
  phase: "idle" | "updating" | "rollback" | "completed" | "failed"
  startedAt: string
  finishedAt: string
  repositoryRoot: string
  runId: string
  backupId?: string
  backupPath?: string
  previousCommit?: string
  targetCommit?: string | null
  lastCommand?: string
  logPath?: string
  recoveryAction?: string
  backendHealth: boolean
  frontendHealth: boolean
  steps: SystemUpdateStep[]
  error?: string
}

interface SystemUpdateStatus {
  running: boolean
  lastResult: SystemUpdateResult | null
  lastPreflight: SystemUpdatePreflight | null
}

interface SystemUpdateStartResponse extends SystemUpdateStatus {
  accepted: boolean
  message: string
}

interface SystemUpdatePreflight {
  ok: boolean
  repositoryRoot: string
  localVersion: string
  cloudVersion: string | null
  localCommit: string
  cloudCommit: string | null
  branch: string
  upstream: string | null
  dirty: boolean
  updateAvailable: boolean
  backendHealth: boolean
  frontendHealth: boolean
  checkedAt: string
  error?: string
}

export function SystemUpdateView({ session }: { session: AuthSession }) {
  const [status, setStatus] = useState<SystemUpdateStatus | null>(null)
  const [running, setRunning] = useState(false)
  const [checking, setChecking] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void loadStatus()
  }, [session])

  async function loadStatus() {
    const response = await fetch(`${apiBaseUrl}/api/system-update/status`, {
      headers: authHeaders(session),
    })
    if (!response.ok) {
      return
    }

    const payload = await parseJsonResponse<SystemUpdateStatus>(response, "Unable to load update status.")
    setStatus(payload)
    setRunning(payload.running)
  }

  async function checkLatest() {
    setChecking(true)
    setError(null)

    try {
      const response = await fetch(`${apiBaseUrl}/api/system-update/preflight`, {
        headers: authHeaders(session),
      })
      const payload = await parseJsonResponse<SystemUpdatePreflight>(
        response,
        "Unable to check cloud version.",
      )

      setStatus((current) => ({
        running: current?.running ?? false,
        lastResult: current?.lastResult ?? null,
        lastPreflight: payload,
      }))

      if (!payload.ok) {
        setError(payload.error ?? "Unable to check cloud version.")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to check cloud version.")
    } finally {
      setChecking(false)
    }
  }

  async function runUpdate() {
    const confirmed = window.confirm(
      "System update will take a database backup, reset code to the release target, install dependencies, run migrations, remove old build output, rebuild, restart, and health-check the app. Continue?",
    )

    if (!confirmed) {
      return
    }

    setRunning(true)
    setError(null)

    try {
      const response = await fetch(`${apiBaseUrl}/api/system-update/run`, {
        headers: authHeaders(session),
        method: "POST",
      })
      const payload = await parseJsonResponse<SystemUpdateStartResponse>(
        response,
        "Unable to start system update.",
      )

      setStatus((current) => ({
        running: payload.running,
        lastResult: payload.lastResult ?? current?.lastResult ?? null,
        lastPreflight: current?.lastPreflight ?? null,
      }))
      if (!payload.accepted) {
        setError(payload.message || "System update is already running.")
        return
      }

      await pollUpdateStatus()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to run system update.")
    } finally {
      setRunning(false)
    }
  }

  async function runUpdateScript() {
    const confirmed = window.confirm(
      "Run update.sh recovery update? This will fetch Git, hard reset to the remote branch, clean untracked non-ignored files, install dependencies, build, and restart. Continue?",
    )

    if (!confirmed) {
      return
    }

    setRunning(true)
    setError(null)

    try {
      const response = await fetch(`${apiBaseUrl}/api/system-update/run-script`, {
        headers: authHeaders(session),
        method: "POST",
      })
      const payload = await parseJsonResponse<SystemUpdateStartResponse>(
        response,
        "Unable to start update.sh.",
      )

      setStatus((current) => ({
        running: payload.running,
        lastResult: payload.lastResult ?? current?.lastResult ?? null,
        lastPreflight: current?.lastPreflight ?? null,
      }))
      if (!payload.accepted) {
        setError(payload.message || "System update is already running.")
        return
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to run update.sh.")
    } finally {
      setRunning(false)
    }
  }

  async function runRollback() {
    const backupId = status?.lastResult?.backupId
    const previousCommit = status?.lastResult?.previousCommit
    const confirmed = window.confirm(
      `Rollback to previous version? This will restore database backup ${backupId ?? "unknown"} and reset code to ${shortCommit(previousCommit ?? null)} before rebuilding and restarting.`,
    )

    if (!confirmed) {
      return
    }

    setRunning(true)
    setError(null)

    try {
      const response = await fetch(`${apiBaseUrl}/api/system-update/rollback`, {
        headers: authHeaders(session),
        method: "POST",
      })
      const payload = await parseJsonResponse<SystemUpdateStartResponse>(
        response,
        "Unable to start rollback.",
      )

      setStatus((current) => ({
        running: payload.running,
        lastResult: payload.lastResult ?? current?.lastResult ?? null,
        lastPreflight: current?.lastPreflight ?? null,
      }))
      if (!payload.accepted) {
        setError(payload.message || "Rollback could not start.")
        return
      }

      await pollUpdateStatus()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to run rollback.")
    } finally {
      setRunning(false)
    }
  }

  async function pollUpdateStatus() {
    const maxAttempts = 240

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      await delay(3_000)

      try {
        const response = await fetch(`${apiBaseUrl}/api/system-update/status`, {
          headers: authHeaders(session),
        })
        const payload = await parseJsonResponse<SystemUpdateStatus>(
          response,
          "Unable to load update status.",
        )

        setStatus(payload)
        setRunning(payload.running)

        if (!payload.running) {
          if (payload.lastResult && !payload.lastResult.ok) {
            setError(payload.lastResult.error ?? "System update finished with failed checks.")
          }

          return
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to load update status.")
      }
    }

    setError("System update is still running. Check status again in a few minutes.")
  }

  const result = status?.lastResult ?? null
  const preflight = status?.lastPreflight ?? null
  const completedSteps = result?.steps.filter((step) => step.ok).length ?? 0
  const progress = result?.steps.length ? (completedSteps / result.steps.length) * 100 : running ? 15 : 0
  const canRollback = Boolean(result?.backupId && result.previousCommit)

  return (
    <div className="flex flex-col gap-4 px-4 py-4 md:gap-6 md:px-6 md:py-6">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">System Update</h1>
          <p className="text-sm text-muted-foreground">
            Pull the latest Git revision, rebuild active apps, and verify frontend/backend health.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button disabled={checking || running} onClick={checkLatest} type="button" variant="outline">
            <RefreshCw className={cn("size-4", checking && "animate-spin")} />
            {checking ? "Checking" : "Check latest version"}
          </Button>
          <Button disabled={running} onClick={runUpdate} type="button">
            <RefreshCw className={cn("size-4", running && "animate-spin")} />
            {running ? "Updating" : "Update and restart"}
          </Button>
          <Button disabled={running || !canRollback} onClick={runRollback} type="button" variant="outline">
            <RotateCcw className="size-4" />
            Rollback
          </Button>
          <Button disabled={running} onClick={runUpdateScript} type="button" variant="destructive">
            <Terminal className="size-4" />
            Run update.sh
          </Button>
        </div>
      </div>

      {preflight ? (
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <CardTitle>Latest version check</CardTitle>
              <Badge variant={preflight.updateAvailable ? "default" : "outline"}>
                {preflight.updateAvailable ? "update available" : "up to date"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            <InfoTile label="Local version" value={preflight.localVersion || "not found"} />
            <InfoTile label="GitHub version" value={preflight.cloudVersion ?? "not found"} />
            <InfoTile label="Branch" value={preflight.branch || preflight.upstream || "not found"} />
            <InfoTile label="Workspace" value={preflight.dirty ? "dirty" : "clean"} />
            <InfoTile label="Local commit" value={shortCommit(preflight.localCommit)} />
            <InfoTile label="Cloud commit" value={shortCommit(preflight.cloudCommit)} />
            <InfoTile label="Upstream" value={preflight.upstream ?? "not configured"} />
            <InfoTile label="Checked at" value={formatDate(preflight.checkedAt)} />
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader className="gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle>Update status</CardTitle>
            <Badge variant={result?.ok ? "default" : error ? "destructive" : "outline"}>
              {running ? "running" : result?.ok ? "healthy" : error ? "failed" : "ready"}
            </Badge>
          </div>
          <Progress value={progress} />
        </CardHeader>
        <CardContent className="grid gap-4">
          {error ? (
            <Alert variant="destructive">
              <AlertCircle />
              <AlertTitle>Update failed</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          {result ? (
            <div className="grid gap-3 md:grid-cols-3">
              <HealthCard label="Backend health" ok={result.backendHealth} />
              <HealthCard label="Frontend health" ok={result.frontendHealth} />
              <HealthCard label="Build result" ok={result.ok} />
            </div>
          ) : null}

          {result ? (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
              <InfoTile label="Run phase" value={result.phase} />
              <InfoTile label="Backup ID" value={result.backupId ?? "not captured"} />
              <InfoTile label="Previous commit" value={shortCommit(result.previousCommit ?? null)} />
              <InfoTile label="Target commit" value={shortCommit(result.targetCommit ?? null)} />
              <InfoTile label="Last command" value={result.lastCommand ?? "not captured"} />
              <InfoTile label="Log path" value={result.logPath ?? "not captured"} />
              <InfoTile label="Backup path" value={result.backupPath ?? "not captured"} />
              <InfoTile label="Finished at" value={formatDate(result.finishedAt)} />
            </div>
          ) : null}

          {result?.recoveryAction ? (
            <Alert variant={result.ok ? "default" : "destructive"}>
              <RotateCcw />
              <AlertTitle>Recovery action</AlertTitle>
              <AlertDescription className="break-words font-mono text-xs">
                {result.recoveryAction}
              </AlertDescription>
            </Alert>
          ) : null}

          <div className="grid gap-3">
            {(result?.steps ?? []).map((step) => (
              <Card key={`${step.name}-${step.startedAt}`} className="overflow-hidden">
                <CardHeader className="border-b py-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <CardTitle className="text-sm">{step.name}</CardTitle>
                    <Badge variant={step.ok ? "default" : "destructive"}>
                      {step.ok ? "ok" : "failed"}
                    </Badge>
                  </div>
                  {step.command ? (
                    <p className="font-mono text-xs text-muted-foreground">{step.command}</p>
                  ) : null}
                </CardHeader>
                <CardContent className="pt-3">
                  <pre className="max-h-64 overflow-auto rounded-lg bg-muted p-3 text-xs text-muted-foreground">
                    {step.output || "No output"}
                  </pre>
                </CardContent>
              </Card>
            ))}
          </div>

          {!result && !running ? (
            <div className="grid min-h-48 place-items-center rounded-lg border border-dashed text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Terminal className="size-4" />
                No update has been run from this session.
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}

function HealthCard({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border bg-card p-4">
      {ok ? (
        <CheckCircle2 className="size-5 text-secondary" />
      ) : (
        <AlertCircle className="size-5 text-destructive" />
      )}
      <div>
        <p className="text-sm font-semibold">{label}</p>
        <p className="text-xs text-muted-foreground">{ok ? "Passed" : "Failed"}</p>
      </div>
    </div>
  )
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <p className="flex items-center gap-1 text-xs font-medium uppercase text-muted-foreground">
        <GitBranch className="size-3" />
        {label}
      </p>
      <p className="mt-1 break-all font-mono text-sm">{value || "not found"}</p>
    </div>
  )
}

function shortCommit(value: string | null) {
  return value ? value.slice(0, 12) : "not found"
}

function formatDate(value: string) {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return date.toLocaleString()
}

async function parseJsonResponse<T>(response: Response, fallbackMessage: string): Promise<T> {
  const contentType = response.headers.get("content-type") ?? ""
  const body = await response.text()

  if (!contentType.includes("application/json")) {
    const message = response.ok
      ? fallbackMessage
      : `${fallbackMessage} Server returned ${response.status} ${response.statusText || ""}.`
    throw new Error(message.trim())
  }

  let payload: T
  try {
    payload = JSON.parse(body) as T
  } catch {
    throw new Error(fallbackMessage)
  }

  if (!response.ok) {
    const error = payload as { error?: string; message?: string }
    throw new Error(error.error ?? error.message ?? fallbackMessage)
  }

  return payload
}

function delay(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms))
}
