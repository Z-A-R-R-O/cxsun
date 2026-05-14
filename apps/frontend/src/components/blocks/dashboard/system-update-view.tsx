import { useEffect, useState } from "react"
import { AlertCircle, CheckCircle2, RefreshCw, Terminal } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "src/components/ui/alert"
import { Badge } from "src/components/ui/badge"
import { Button } from "src/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "src/components/ui/card"
import { Progress } from "src/components/ui/progress"
import { cn } from "src/lib/utils"

const configuredApiBaseUrl =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:6001"
const apiBaseUrl = configuredApiBaseUrl.replace(/\/api\/?$/, "").replace(/\/$/, "")

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
}

export function SystemUpdateView() {
  const [status, setStatus] = useState<SystemUpdateStatus | null>(null)
  const [running, setRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void loadStatus()
  }, [])

  async function loadStatus() {
    const response = await fetch(`${apiBaseUrl}/api/system-update/status`)
    if (!response.ok) {
      return
    }

    const payload = (await response.json()) as SystemUpdateStatus
    setStatus(payload)
    setRunning(payload.running)
  }

  async function runUpdate() {
    const confirmed = window.confirm(
      "System update will force rollback local changes, remove untracked files, pull from Git, install dependencies, build, and health-check the app. Continue?",
    )

    if (!confirmed) {
      return
    }

    setRunning(true)
    setError(null)

    try {
      const response = await fetch(`${apiBaseUrl}/api/system-update/run`, {
        method: "POST",
      })
      const payload = (await response.json()) as SystemUpdateResult

      setStatus({ running: false, lastResult: payload })
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
        <Button disabled={running} onClick={runUpdate} type="button">
          <RefreshCw className={cn("size-4", running && "animate-spin")} />
          {running ? "Updating" : "Collect new update"}
        </Button>
      </div>

      <Alert variant="destructive">
        <AlertCircle />
        <AlertTitle>Force rollback enabled</AlertTitle>
        <AlertDescription>
          This action runs `git reset --hard` and `git clean -fd` before pulling updates.
        </AlertDescription>
      </Alert>

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
