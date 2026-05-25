import { useEffect, useState } from "react"
import { AlertCircle, CheckCircle2, GitBranch, RefreshCw, Terminal } from "lucide-react"

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
  startedAt: string
  finishedAt: string
  output: string
}

interface SystemUpdateResult {
  ok: boolean
  startedAt: string
  finishedAt: string
  repositoryRoot: string
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

    const payload = (await response.json()) as SystemUpdateStatus
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
      const payload = (await response.json()) as SystemUpdatePreflight

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
      "System update will force rollback tracked local changes, pull from Git, install dependencies, build, restart when configured, and health-check the app. .env, storage, and build are kept untouched. Continue?",
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
      const payload = (await response.json()) as SystemUpdateResult

      setStatus((current) => ({
        running: false,
        lastResult: payload,
        lastPreflight: current?.lastPreflight ?? null,
      }))
      if (!payload.ok) {
        setError(payload.error ?? "System update finished with failed checks.")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to run system update.")
    } finally {
      setRunning(false)
    }
  }

  const result = status?.lastResult ?? null
  const preflight = status?.lastPreflight ?? null
  const completedSteps = result?.steps.filter((step) => step.ok).length ?? 0
  const progress = result?.steps.length ? (completedSteps / result.steps.length) * 100 : running ? 15 : 0

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
