import { useEffect, useMemo, useState, type ReactNode } from "react"
import { useMutation, useQuery } from "@tanstack/react-query"
import {
  Cable,
  CheckCircle2,
  CircleAlert,
  DatabaseZap,
  RefreshCw,
  Save,
  Send,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react"
import { toast } from "sonner"
import { MasterListEmptyState, MasterListPageFrame } from "src/components/blocks/lists/master-list"
import { Badge } from "src/components/ui/badge"
import { Button } from "src/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "src/components/ui/card"
import { Input } from "src/components/ui/input"
import { Label } from "src/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "src/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "src/components/ui/table"
import type { AuthSession } from "src/features/auth/auth-client"
import { cn } from "src/lib/utils"
import {
  createTallySyncJob,
  getTallyWorkspace,
  saveTallySettings,
  validateTallyConnection,
  type TallyConnectionValidation,
  type TallySettings,
  type TallySyncJob,
  type TallyWorkspace,
} from "./tally-client"

type TallyView = "handshake" | "desk" | "jobs"

interface TallyHandshakeDraft {
  tally_host: string
  tally_port: number
  company_name: string
}

export function TallyPage({ session, view = "handshake" }: { session: AuthSession; view?: TallyView }) {
  const query = useQuery({
    queryKey: ["tally-workspace", session.selectedTenant.slug],
    queryFn: () => getTallyWorkspace(session),
  })
  const workspace = query.data ?? null
  const settings = workspace?.settings ?? null
  const handshake = readHandshake(settings?.settings)
  const [draft, setDraft] = useState<TallyHandshakeDraft>(() => draftFromSettings(null))
  const [operation, setOperation] = useState<string>(singleOperationOptions[0].value)

  useEffect(() => {
    if (settings) {
      setDraft(draftFromSettings(settings))
    }
  }, [settings])

  const saveMutation = useMutation({
    mutationFn: () => saveTallySettings(session, draft),
    onSuccess: async () => {
      toast.success("Tally connection draft saved")
      await query.refetch()
    },
    onError: (error) => {
      toast.error("Tally draft not saved", {
        description: error instanceof Error ? error.message : "Please try again.",
      })
    },
  })

  const validateMutation = useMutation({
    mutationFn: () => validateTallyConnection(session, draft),
    onSuccess: async (result) => {
      if (result.ok) {
        toast.success("Tally handshake validated", {
          description: result.validation.detail,
        })
      } else {
        toast.error("Tally handshake failed", {
          description: result.validation.detail,
        })
      }
      await query.refetch()
    },
    onError: (error) => {
      toast.error("Tally handshake failed", {
        description: error instanceof Error ? error.message : "Please try again.",
      })
    },
  })

  const selectedOperation = useMemo(
    () => singleOperationOptions.find((item) => item.value === operation) ?? singleOperationOptions[0],
    [operation],
  )

  const syncMutation = useMutation({
    mutationFn: () => createTallySyncJob(session, {
      job_type: "single-operation",
      direction: selectedOperation.direction,
      payload: {
        mode: "single-operation",
        operation: selectedOperation.value,
        operation_label: selectedOperation.label,
        company_name: draft.company_name.trim() || null,
      },
    }),
    onSuccess: async () => {
      toast.success("Tally operation queued", {
        description: `${selectedOperation.label} is now queued.`,
      })
      await query.refetch()
    },
    onError: (error) => {
      toast.error("Tally operation not queued", {
        description: error instanceof Error ? error.message : "Please validate the Tally handshake first.",
      })
    },
  })

  const isWorking = query.isFetching || saveMutation.isPending || validateMutation.isPending || syncMutation.isPending
  const isHandshakeReady = Boolean(settings?.enabled) && Boolean(handshake?.ok) && normalizeText(handshake?.requested_company) === normalizeText(settings?.company_name)
  const canValidateHandshake = Boolean(draft.company_name.trim()) && !isWorking

  return (
    <MasterListPageFrame
      title={pageTitle(view)}
      description={pageDescription(view)}
      technicalName={`page.tally.${view}`}
      action={
        <div className="flex flex-wrap gap-2">
          <Button className="rounded-md" variant="outline" type="button" onClick={() => void query.refetch()}>
            <RefreshCw className={cn("size-4", query.isFetching && "animate-spin")} />
            Refresh
          </Button>
          {view === "handshake" ? (
            <>
              <Button className="rounded-md" variant="outline" type="button" disabled={isWorking} onClick={() => saveMutation.mutate()}>
                <Save className="size-4" />
                Save Draft
              </Button>
              <Button className="rounded-md" type="button" disabled={!canValidateHandshake} onClick={() => validateMutation.mutate()}>
                <ShieldCheck className="size-4" />
                Validate Connection
              </Button>
            </>
          ) : null}
          {view === "desk" ? (
            <Button className="rounded-md" type="button" disabled={isWorking || !isHandshakeReady} onClick={() => syncMutation.mutate()}>
              <Send className="size-4" />
              Queue Operation
            </Button>
          ) : null}
        </div>
      }
    >
      <div className="grid gap-3 md:grid-cols-3">
        <StatCard icon={Cable} label="Endpoint" value={`${draft.tally_host || "localhost"}:${draft.tally_port || 9000}`} />
        <StatCard icon={DatabaseZap} label="Mode" value="Single operation" />
        <StatCard icon={isHandshakeReady ? CheckCircle2 : CircleAlert} label="Handshake" value={isHandshakeReady ? "Connection established" : "Validation pending"} />
      </div>

      {view === "handshake" ? (
        <HandshakeView
          draft={draft}
          handshake={handshake}
          isWorking={isWorking}
          onChange={setDraft}
        />
      ) : null}

      {view === "desk" ? (
        <DeskView
          companyName={draft.company_name}
          handshake={handshake}
          isHandshakeReady={isHandshakeReady}
          operation={operation}
          onChangeOperation={setOperation}
        />
      ) : null}

      {view !== "handshake" ? <TallyJobs workspace={workspace} isLoading={query.isFetching} /> : null}
    </MasterListPageFrame>
  )
}

function HandshakeView({
  draft,
  handshake,
  isWorking,
  onChange,
}: {
  draft: TallyHandshakeDraft
  handshake: TallyConnectionValidation | null
  isWorking: boolean
  onChange(next: TallyHandshakeDraft | ((current: TallyHandshakeDraft) => TallyHandshakeDraft)): void
}) {
  const statusTone = handshake?.ok ? "border-emerald-200 bg-emerald-50/80 text-emerald-900" : handshake ? "border-amber-200 bg-amber-50/80 text-amber-900" : "border-border/70 bg-card/95 text-foreground"

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
      <Card className="rounded-md border-border/70 bg-card/95 shadow-sm">
        <CardHeader>
          <CardTitle>Tally handshake</CardTitle>
          <p className="text-sm text-muted-foreground">
            Enter the Tally host, port, and the exact company name. Validation calls Tally directly and stores the result for this workspace.
          </p>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <Field label="Tally Host">
            <Input
              value={draft.tally_host}
              onChange={(event) => onChange((current) => ({ ...current, tally_host: event.target.value }))}
              placeholder="localhost"
            />
          </Field>
          <Field label="Tally Port">
            <Input
              type="number"
              min={1}
              value={draft.tally_port}
              onChange={(event) => onChange((current) => ({ ...current, tally_port: Number(event.target.value) || 9000 }))}
            />
          </Field>
          <div className="md:col-span-2">
            <Field label="Tally Company Name">
              <Input
                value={draft.company_name}
                onChange={(event) => onChange((current) => ({ ...current, company_name: event.target.value }))}
                placeholder="Enter the exact company shown in Tally"
              />
            </Field>
          </div>
          <div className="md:col-span-2 rounded-md border border-dashed border-border/70 bg-muted/20 p-3 text-sm text-muted-foreground">
            Validation checks the selected company against the configured Tally endpoint. A successful handshake enables the desk for queued single operations.
          </div>
        </CardContent>
      </Card>

      <Card className={cn("rounded-md shadow-sm", statusTone)}>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <CardTitle>Handshake result</CardTitle>
            <Badge variant={handshake?.ok ? "default" : handshake ? "secondary" : "outline"}>
              {handshake?.ok ? "Connected" : handshake ? "Needs attention" : "Not checked"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm">
          <div>
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Company</div>
            <div className="mt-1 font-medium">{handshake?.matched_company || handshake?.requested_company || draft.company_name || "-"}</div>
          </div>
          {handshake?.matched_company && normalizeText(handshake.matched_company) !== normalizeText(handshake.requested_company) ? (
            <div>
              <div className="text-xs uppercase tracking-wide text-muted-foreground">Requested company</div>
              <div className="mt-1 font-medium">{handshake.requested_company}</div>
            </div>
          ) : null}
          <div>
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Endpoint</div>
            <div className="mt-1 font-medium">{handshake?.endpoint || `${draft.tally_host || "localhost"}:${draft.tally_port || 9000}`}</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Last checked</div>
            <div className="mt-1 font-medium">{formatDate(handshake?.checked_at ?? null)}</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Detail</div>
            <div className="mt-1 leading-6">{handshake?.detail || "Run Validate Connection to confirm Tally communication."}</div>
          </div>
          {handshake?.line_error ? (
            <div>
              <div className="text-xs uppercase tracking-wide text-muted-foreground">Tally line error</div>
              <div className="mt-1 break-words leading-6">{handshake.line_error}</div>
            </div>
          ) : null}
          {handshake && handshake.http_status !== null ? (
            <div>
              <div className="text-xs uppercase tracking-wide text-muted-foreground">HTTP status</div>
              <div className="mt-1 font-medium">{handshake.http_status}</div>
            </div>
          ) : null}
          {!handshake?.ok && handshake?.available_companies?.length ? (
            <div>
              <div className="text-xs uppercase tracking-wide text-muted-foreground">Available companies</div>
              <div className="mt-1 leading-6">{handshake.available_companies.join(", ")}</div>
            </div>
          ) : null}
          {isWorking ? <div className="text-xs text-muted-foreground">Working on the latest request...</div> : null}
        </CardContent>
      </Card>
    </div>
  )
}

function DeskView({
  companyName,
  handshake,
  isHandshakeReady,
  operation,
  onChangeOperation,
}: {
  companyName: string
  handshake: TallyConnectionValidation | null
  isHandshakeReady: boolean
  operation: string
  onChangeOperation(value: string): void
}) {
  const selectedOperation = singleOperationOptions.find((item) => item.value === operation) ?? singleOperationOptions[0]

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(300px,0.9fr)]">
      <Card className="rounded-md border-border/70 bg-card/95 shadow-sm">
        <CardHeader>
          <CardTitle>Single operation desk</CardTitle>
          <p className="text-sm text-muted-foreground">
            Queue one Tally action at a time so each sync event stays isolated and easier to retry or inspect.
          </p>
        </CardHeader>
        <CardContent className="grid gap-4">
          <Field label="Operation">
            <Select value={operation} onValueChange={onChangeOperation}>
              <SelectTrigger className="h-9 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {singleOperationOptions.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <div className="rounded-md border border-border/70 bg-background p-4">
            <div className="font-medium text-foreground">{selectedOperation.label}</div>
            <div className="mt-1 text-sm leading-6 text-muted-foreground">{selectedOperation.description}</div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge variant="outline">Direction: {selectedOperation.direction}</Badge>
              <Badge variant="outline">Company: {companyName || "Not set"}</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-md border-border/70 bg-card/95 shadow-sm">
        <CardHeader>
          <CardTitle>Desk status</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm">
          <div className="rounded-md border border-border/70 bg-background p-3">
            <div className="font-medium text-foreground">{isHandshakeReady ? "Ready to queue" : "Handshake required"}</div>
            <div className="mt-1 leading-6 text-muted-foreground">
              {isHandshakeReady
                ? `Connection established for ${companyName || handshake?.requested_company || "the selected company"}.`
                : "Open Tally Handshake, validate the selected company, and then return here."}
            </div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Last validation</div>
            <div className="mt-1 font-medium">{formatDate(handshake?.checked_at ?? null)}</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Validation note</div>
            <div className="mt-1 leading-6 text-muted-foreground">{handshake?.detail || "No validation recorded yet."}</div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function TallyJobs({ isLoading, workspace }: { isLoading: boolean; workspace: TallyWorkspace | null }) {
  const jobs = workspace?.jobs ?? []
  return (
    <Card className="rounded-md border-border/70 bg-card/95 shadow-sm">
      <CardHeader>
        <CardTitle>Recent Tally operations</CardTitle>
        <p className="text-sm text-muted-foreground">Each queued row represents one isolated Tally action.</p>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Job</TableHead>
              <TableHead>Operation</TableHead>
              <TableHead>Direction</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Requested By</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {jobs.map((job) => (
              <TableRow key={job.uuid}>
                <TableCell>
                  <div className="font-medium">{job.job_type}</div>
                  <div className="text-xs text-muted-foreground">{job.uuid}</div>
                </TableCell>
                <TableCell>{jobOperationLabel(job)}</TableCell>
                <TableCell>{job.direction}</TableCell>
                <TableCell><StatusBadge status={job.status} /></TableCell>
                <TableCell>{job.requested_by}</TableCell>
                <TableCell>{formatDate(job.created_at)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {!jobs.length ? <MasterListEmptyState>{isLoading ? "Loading Tally operations." : "No Tally operations queued yet."}</MasterListEmptyState> : null}
      </CardContent>
    </Card>
  )
}

function StatusBadge({ status }: { status: string }) {
  const variant = status === "failed" ? "destructive" : status === "completed" ? "default" : "secondary"
  return <Badge variant={variant}>{status}</Badge>
}

function StatCard({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <Card className="rounded-md border-border/70 bg-card/95 shadow-sm">
      <CardContent className="flex items-center gap-3 p-4">
        <span className="flex size-10 items-center justify-center rounded-md bg-primary/10 text-primary"><Icon className="size-5" /></span>
        <span>
          <span className="block text-xs text-muted-foreground">{label}</span>
          <span className="mt-1 block font-semibold text-foreground">{value}</span>
        </span>
      </CardContent>
    </Card>
  )
}

function Field({ children, label }: { children: ReactNode; label: string }) {
  return (
    <div className="grid gap-2">
      <Label>{label}</Label>
      {children}
    </div>
  )
}

function draftFromSettings(settings: TallySettings | null): TallyHandshakeDraft {
  return {
    tally_host: settings?.tally_host ?? "localhost",
    tally_port: Number(settings?.tally_port ?? 9000),
    company_name: settings?.company_name ?? "",
  }
}

function readHandshake(value: string | null | undefined) {
  const parsed = safeJson(value)
  const handshake = parsed?.handshake
  if (!handshake || typeof handshake !== "object" || Array.isArray(handshake)) return null
  return handshake as TallyConnectionValidation
}

function safeJson(value: string | null | undefined) {
  try {
    const parsed = value ? JSON.parse(value) : null
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : null
  } catch {
    return null
  }
}

function normalizeText(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase()
}

function jobOperationLabel(job: TallySyncJob) {
  const payload = safeJson(job.payload)
  const label = typeof payload?.operation_label === "string" ? payload.operation_label : null
  const operation = typeof payload?.operation === "string" ? payload.operation : null
  return label || operation || "-"
}

function formatDate(value: string | null) {
  if (!value) return "-"
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString()
}

function pageTitle(view: TallyView) {
  if (view === "handshake") return "Tally Handshake"
  if (view === "jobs") return "Tally Sync Jobs"
  return "Tally Desk"
}

function pageDescription(view: TallyView) {
  if (view === "handshake") {
    return "Validate the Tally connection against one selected company before you queue any sync work."
  }
  if (view === "jobs") {
    return "Review queued single-operation Tally actions and their current state."
  }
  return "Queue one Tally action at a time after the workspace handshake is established."
}

const singleOperationOptions = [
  {
    value: "export-sales-vouchers",
    label: "Export Sales Vouchers",
    description: "Send sales vouchers from this software into the selected Tally company.",
    direction: "export",
  },
  {
    value: "export-purchase-vouchers",
    label: "Export Purchase Vouchers",
    description: "Send purchase vouchers to the selected Tally company as one isolated operation.",
    direction: "export",
  },
  {
    value: "export-receipt-vouchers",
    label: "Export Receipt Vouchers",
    description: "Push one receipt voucher batch into Tally without mixing it with other actions.",
    direction: "export",
  },
  {
    value: "export-payment-vouchers",
    label: "Export Payment Vouchers",
    description: "Push payment vouchers to Tally in a standalone queue operation.",
    direction: "export",
  },
  {
    value: "export-ledger-contacts",
    label: "Export Ledger Contacts",
    description: "Create or update customer and supplier ledgers in Tally as a separate job.",
    direction: "export",
  },
  {
    value: "import-ledgers",
    label: "Import Ledgers",
    description: "Read ledgers from the selected Tally company back into this workspace.",
    direction: "import",
  },
] as const
