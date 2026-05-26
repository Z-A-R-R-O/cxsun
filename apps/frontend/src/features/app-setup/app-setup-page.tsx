import { useMemo, useState } from "react"
import { useMutation } from "@tanstack/react-query"
import { toast } from "sonner"
import { CheckCircle2, ChevronLeft, ChevronRight, Database, Globe2, Rocket, Settings2 } from "lucide-react"
import { Button } from "src/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "src/components/ui/card"
import { Input } from "src/components/ui/input"
import { Label } from "src/components/ui/label"
import { Separator } from "src/components/ui/separator"
import { Switch } from "src/components/ui/switch"
import { cn } from "src/lib/utils"
import type { AuthSession } from "src/features/auth/auth-client"
import { createAppSetup, type AppSetupInput } from "./app-setup-client"

const steps = [
  { id: "identity", title: "Tenant", icon: Rocket },
  { id: "database", title: "Database", icon: Database },
  { id: "domain", title: "Domain", icon: Globe2 },
  { id: "review", title: "Review", icon: Settings2 },
] as const

const ServerModeField = ({ value, onChange }: { value: "same" | "other"; onChange(value: "same" | "other"): void }) => {
  const isOtherServer = value === "other"

  return (
    <div className="grid gap-2">
      <Label className="text-sm font-medium">Database server</Label>
      <label className="flex h-10 cursor-pointer items-center justify-between gap-3 rounded-md border px-3">
        <span className="text-sm text-muted-foreground">{isOtherServer ? "Other server" : "Same server"}</span>
        <Switch checked={isOtherServer} onCheckedChange={(checked) => onChange(checked ? "other" : "same")} />
      </label>
    </div>
  )
}

export function AppSetupPage({ session }: { session: AuthSession }) {
  const [stepIndex, setStepIndex] = useState(0)
  const [form, setForm] = useState<AppSetupInput>(defaultForm)
  const setupMutation = useMutation({ mutationFn: (input: AppSetupInput) => createAppSetup(session, input) })
  const normalized = useMemo(() => normalizeForm(form), [form])
  const activeStep = steps[stepIndex]
  const ActiveIcon = activeStep.icon
  const isLastStep = stepIndex === steps.length - 1

  function update<K extends keyof AppSetupInput>(key: K, value: AppSetupInput[K]) {
    setForm((current) => {
      const next = { ...current, [key]: value }
      if (key === "name" && !current.slug) {
        next.slug = slugify(String(value))
      }
      if ((key === "name" || key === "slug") && !current.database) {
        next.database = `${slugify(key === "slug" ? String(value) : next.slug || String(value))}_db`
      }
      return next
    })
  }

  function next() {
    const error = validateStep(stepIndex, normalized)
    if (error) {
      toast.error(error)
      return
    }
    setStepIndex((current) => Math.min(current + 1, steps.length - 1))
  }

  async function submit() {
    const error = validateAll(normalized)
    if (error) {
      toast.error(error)
      return
    }

    try {
      const result = await setupMutation.mutateAsync(normalized)
      toast.success("Tenant setup completed", {
        description: `${result.tenant?.name ?? normalized.name} is ready with ${result.tenant?.db_name ?? normalized.database}.`,
      })
      setStepIndex(0)
      setForm(defaultForm())
    } catch (error) {
      toast.error("Tenant setup failed", {
        description: error instanceof Error ? error.message : "Unable to create tenant setup.",
      })
    }
  }

  return (
    <div className="@container/main flex flex-1 flex-col gap-4 px-4 py-4 md:py-6 lg:px-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Tenant Setup</h1>
        <p className="text-sm text-muted-foreground">Create a tenant, database, admin user, and primary domain from one guided setup.</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        <Card className="rounded-lg border-border/70 shadow-sm">
          <CardContent className="p-3">
            <div className="grid gap-2">
              {steps.map((step, index) => {
                const Icon = step.icon
                return (
                  <button
                    className={cn(
                      "flex h-12 items-center gap-3 rounded-md px-3 text-left text-sm font-medium transition",
                      index === stepIndex ? "bg-primary text-primary-foreground" : "hover:bg-muted",
                    )}
                    key={step.id}
                    onClick={() => setStepIndex(index)}
                    type="button"
                  >
                    <Icon className="size-4" />
                    <span>{step.title}</span>
                    {index < stepIndex ? <CheckCircle2 className="ml-auto size-4" /> : null}
                  </button>
                )
              })}
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-lg border-border/70 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <ActiveIcon className="size-5 text-primary" />
              {activeStep.title}
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-5">
            {stepIndex === 0 ? (
              <div className="grid gap-4 md:grid-cols-2">
                <TextField label="Tenant code" value={form.code} onChange={(value) => update("code", value.replace(/\D/g, ""))} />
                <TextField label="Tenant name" value={form.name} onChange={(value) => update("name", value)} />
                <TextField label="Tenant slug" value={form.slug} onChange={(value) => update("slug", slugify(value))} />
                <TextField label="Admin name" value={form.adminName} onChange={(value) => update("adminName", value)} />
                <TextField label="Admin email" value={form.adminEmail} onChange={(value) => update("adminEmail", value)} />
                <TextField label="Admin password" type="password" value={form.adminPassword} onChange={(value) => update("adminPassword", value)} />
              </div>
            ) : stepIndex === 1 ? (
              <div className="grid gap-4 md:grid-cols-2">
                <TextField label="Database name" value={form.database} onChange={(value) => update("database", sanitizeIdentifierInput(value))} />
                <SummaryItem label="Database type" value="MariaDB tenant database" />
                <ServerModeField value={form.dbServerMode} onChange={(value) => update("dbServerMode", value)} />
                <SummaryItem label="Default source" value="Framework settings from .env" />
                {form.dbServerMode === "other" ? (
                  <>
                    <TextField label="Database host" value={form.dbHost} onChange={(value) => update("dbHost", value)} />
                    <TextField label="Database port" value={form.dbPort} onChange={(value) => update("dbPort", value.replace(/\D/g, ""))} />
                    <TextField label="Database user" value={form.dbUser} onChange={(value) => update("dbUser", value)} />
                    <TextField label="Password secret" value={form.dbSecretRef} onChange={(value) => update("dbSecretRef", sanitizeSecretRef(value))} />
                  </>
                ) : null}
              </div>
            ) : stepIndex === 2 ? (
              <div className="grid gap-4 md:grid-cols-2">
                <TextField label="Primary domain" value={form.domain} onChange={(value) => update("domain", value)} />
                <SummaryItem label="Domain rule" value="Required, unique, and mapped to this tenant only" />
              </div>
            ) : (
              <div className="grid gap-3">
                <ReviewRow label="Tenant" value={`${normalized.code} - ${normalized.name} (${normalized.slug})`} />
                <ReviewRow label="Database" value={normalized.dbServerMode === "same" ? `${normalized.database} on same server` : `${normalized.dbUser}@${normalized.dbHost}:${normalized.dbPort}/${normalized.database}`} />
                <ReviewRow label="Server mode" value={normalized.dbServerMode === "same" ? "Same server from .env settings" : "Other database server"} />
                {normalized.dbServerMode === "other" ? <ReviewRow label="Password secret" value={normalized.dbSecretRef} /> : null}
                <ReviewRow label="Domain" value={normalized.domain} />
                <ReviewRow label="Admin" value={normalized.adminEmail ? `${normalized.adminName || "Tenant Admin"} <${normalized.adminEmail}>` : "Not set"} />
                <ReviewRow label="Admin password" value={normalized.adminPassword ? "Set" : "Not set"} />
              </div>
            )}

            <Separator />

            <div className="flex items-center justify-between gap-3">
              <Button disabled={stepIndex === 0 || setupMutation.isPending} onClick={() => setStepIndex((current) => Math.max(0, current - 1))} type="button" variant="outline">
                <ChevronLeft className="size-4" />
                Back
              </Button>
              {isLastStep ? (
                <Button disabled={setupMutation.isPending} onClick={submit} type="button">
                  <Rocket className="size-4" />
                  {setupMutation.isPending ? "Creating" : "Create tenant"}
                </Button>
              ) : (
                <Button disabled={setupMutation.isPending} onClick={next} type="button">
                  Next
                  <ChevronRight className="size-4" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function defaultForm(): AppSetupInput {
  return {
    code: "",
    name: "",
    slug: "",
    database: "",
    dbServerMode: "same",
    dbHost: "",
    dbPort: "3306",
    dbUser: "root",
    dbSecretRef: "DB_PASSWORD",
    domain: "",
    adminName: "",
    adminEmail: "",
    adminPassword: "",
  }
}

function TextField({ label, type = "text", value, onChange }: { label: string; type?: string; value: string; onChange(value: string): void }) {
  return (
    <div className="grid gap-2">
      <Label className="text-sm font-medium">{label}</Label>
      <Input className="h-10 rounded-md" type={type} value={value} onChange={(event) => onChange(event.target.value)} />
    </div>
  )
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-2">
      <Label className="text-sm font-medium">{label}</Label>
      <div className="flex h-10 items-center rounded-md border bg-muted/40 px-3 text-sm">{value}</div>
    </div>
  )
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 rounded-md border p-3">
      <span className="text-xs font-medium uppercase text-muted-foreground">{label}</span>
      <span className="text-sm font-semibold">{value}</span>
    </div>
  )
}

function normalizeForm(form: AppSetupInput): AppSetupInput {
  const slug = slugify(form.slug || form.name)
  return {
    code: form.code.trim(),
    name: form.name.trim(),
    slug,
    database: slugify(form.database || `${slug}_db`),
    dbServerMode: form.dbServerMode === "other" ? "other" : "same",
    dbHost: form.dbHost.trim(),
    dbPort: form.dbPort.trim() || "3306",
    dbUser: form.dbUser.trim() || "root",
    dbSecretRef: form.dbSecretRef.trim() || "DB_PASSWORD",
    domain: form.domain.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "").replace(/:\d+$/, ""),
    adminName: form.adminName.trim(),
    adminEmail: form.adminEmail.trim().toLowerCase(),
    adminPassword: form.adminPassword.trim(),
  }
}

function validateStep(stepIndex: number, form: AppSetupInput) {
  if (stepIndex === 0 && !form.code) return "Tenant code is required."
  if (stepIndex === 0 && Number(form.code) < 100) return "Tenant code must start from 100."
  if (stepIndex === 0 && (!form.name || !form.slug)) return "Tenant name and slug are required."
  if (stepIndex === 0 && !form.adminEmail) return "Admin email is required."
  if (stepIndex === 0 && !form.adminPassword) return "Admin password is required."
  if (stepIndex === 1 && !form.database) return "Database name is required."
  if (stepIndex === 1 && form.dbServerMode === "other" && !form.dbHost) return "Database host is required."
  if (stepIndex === 1 && form.dbServerMode === "other" && !form.dbPort) return "Database port is required."
  if (stepIndex === 1 && form.dbServerMode === "other" && !form.dbUser) return "Database user is required."
  if (stepIndex === 1 && form.dbServerMode === "other" && !form.dbSecretRef) return "Database password secret is required."
  if (stepIndex === 2 && !form.domain) return "Primary domain is required."
  return null
}

function validateAll(form: AppSetupInput) {
  return validateStep(0, form) ?? validateStep(1, form) ?? validateStep(2, form)
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "")
}

function sanitizeIdentifierInput(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9_]+/g, "_").replace(/^_+/, "")
}

function sanitizeSecretRef(value: string) {
  return value.toUpperCase().replace(/[^A-Z0-9_]+/g, "_").replace(/^_+/, "")
}
