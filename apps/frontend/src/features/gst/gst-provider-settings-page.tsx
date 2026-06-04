import { useEffect, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { toast } from "sonner"
import { RefreshCw, Save } from "lucide-react"
import { AnimatedTabs } from "src/components/ui/animated-tabs"
import { Badge } from "src/components/ui/badge"
import { Button } from "src/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "src/components/ui/card"
import { Input } from "src/components/ui/input"
import { Label } from "src/components/ui/label"
import { Switch } from "src/components/ui/switch"
import type { AuthSession } from "src/features/auth/auth-client"
import { getGstProviderGlobalSettings, saveGstProviderGlobalSettings, type GstProviderPurpose } from "./gst-compliance-client"

type GstEnvironment = "production" | "sandbox"

interface ProviderDraft {
  baseUrl: string
  clientId: string
  clientSecret: string
  email: string
  environment: GstEnvironment
  ipAddress: string
  isEnabled: boolean
  purpose: GstProviderPurpose
}

const environments: Array<{ label: string; value: GstEnvironment }> = [
  { label: "Sandbox", value: "sandbox" },
  { label: "Production", value: "production" },
]

const purposes: Array<{ description: string; label: string; value: GstProviderPurpose }> = [
  { description: "Used when tenant sales generate IRN and e-way from e-invoice.", label: "E-invoice + E-way", value: "einvoice_eway" },
  { description: "Used when tenant sales are configured for e-way-only GSP credentials.", label: "E-way only", value: "eway_only" },
]

export function GstProviderSettingsPage({ session }: { session: AuthSession }) {
  return (
    <div className="@container/main flex flex-1 flex-col gap-4 px-4 py-4 md:py-6 lg:px-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-normal">GST API</h1>
        <p className="mt-2 text-sm text-muted-foreground">Global WhiteBooks GSP credentials served to tenant GST API calls.</p>
      </div>
      <AnimatedTabs
        tabs={environments.map((environment) => ({
          value: environment.value,
          label: environment.label,
          content: (
            <div className="grid gap-4 xl:grid-cols-2">
              {purposes.map((purpose) => (
                <ProviderSettingsCard environment={environment.value} key={purpose.value} purpose={purpose} session={session} />
              ))}
            </div>
          ),
        }))}
      />
    </div>
  )
}

function ProviderSettingsCard({ environment, purpose, session }: { environment: GstEnvironment; purpose: typeof purposes[number]; session: AuthSession }) {
  const [draft, setDraft] = useState<ProviderDraft>(() => emptyDraft(environment, purpose.value))
  const [isSaving, setIsSaving] = useState(false)
  const settingsQuery = useQuery({
    queryKey: ["gst-provider-global-settings", environment, purpose.value],
    queryFn: () => getGstProviderGlobalSettings(session, environment, purpose.value),
  })
  const settings = settingsQuery.data

  useEffect(() => {
    if (!settings) return
    setDraft({
      baseUrl: settings.baseUrl || defaultBaseUrl(settings.environment),
      clientId: settings.clientId || "",
      clientSecret: settings.clientSecret || "",
      email: settings.email || "",
      environment: settings.environment,
      ipAddress: settings.ipAddress || "0.0.0.0",
      isEnabled: settings.isEnabled,
      purpose: settings.purpose,
    })
  }, [settings])

  async function saveSettings() {
    setIsSaving(true)
    try {
      const saved = await saveGstProviderGlobalSettings(session, {
        baseUrl: draft.baseUrl || defaultBaseUrl(environment),
        clientId: draft.clientId,
        clientSecret: draft.clientSecret,
        email: draft.email,
        environment,
        ipAddress: draft.ipAddress,
        isEnabled: draft.isEnabled,
        provider: "whitebooks",
        purpose: purpose.value,
      })
      setDraft({
        baseUrl: saved.baseUrl || defaultBaseUrl(saved.environment),
        clientId: saved.clientId || "",
        clientSecret: saved.clientSecret || "",
        email: saved.email || "",
        environment: saved.environment,
        ipAddress: saved.ipAddress || "0.0.0.0",
        isEnabled: saved.isEnabled,
        purpose: saved.purpose,
      })
      await settingsQuery.refetch()
      toast.success("GST API provider settings saved", { description: `${environmentLabel(environment)} ${purpose.label}` })
    } catch (error) {
      toast.error("GST API provider settings not saved", { description: error instanceof Error ? error.message : "Please try again." })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Card className="rounded-md border-border/70">
      <CardHeader className="border-b border-border/70 px-4 py-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base">{purpose.label}</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">{purpose.description}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="rounded-md">{environmentLabel(environment)}</Badge>
            {draft.isEnabled ? <Badge className="rounded-md bg-emerald-600">Enabled</Badge> : <Badge variant="destructive" className="rounded-md">Disabled</Badge>}
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4 p-4">
        <SettingsField label="Registered Email">
          <Input value={draft.email} onChange={(event) => setDraft((current) => ({ ...current, email: event.target.value }))} placeholder="email@example.com" />
        </SettingsField>
        <SettingsField label="Client ID">
          <Input value={draft.clientId} onChange={(event) => setDraft((current) => ({ ...current, clientId: event.target.value }))} placeholder="WhiteBooks client id" />
        </SettingsField>
        <SettingsField label="Client Secret">
          <Input value={draft.clientSecret} onChange={(event) => setDraft((current) => ({ ...current, clientSecret: event.target.value }))} placeholder="WhiteBooks client secret" />
        </SettingsField>
        <SettingsField label="IP Address">
          <Input value={draft.ipAddress} onChange={(event) => setDraft((current) => ({ ...current, ipAddress: event.target.value }))} placeholder="0.0.0.0" />
        </SettingsField>
        <SettingsField label="Base URL">
          <Input value={draft.baseUrl} onChange={(event) => setDraft((current) => ({ ...current, baseUrl: event.target.value }))} placeholder={defaultBaseUrl(environment)} />
        </SettingsField>
        <div className="flex items-end justify-between gap-3 rounded-md border border-border/70 px-3 py-2">
          <div>
            <div className="text-sm font-medium">Enabled</div>
            <div className="text-xs text-muted-foreground">Serve this credential set to tenant GST API calls.</div>
          </div>
          <Switch checked={draft.isEnabled} onCheckedChange={(checked) => setDraft((current) => ({ ...current, isEnabled: checked }))} />
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => void settingsQuery.refetch()}><RefreshCw className="size-4" />Refresh</Button>
          <Button type="button" disabled={isSaving} onClick={() => void saveSettings()}><Save className="size-4" />{isSaving ? "Saving..." : "Save"}</Button>
        </div>
      </CardContent>
    </Card>
  )
}

function SettingsField({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <div className="grid gap-2">
      <Label>{label}</Label>
      {children}
    </div>
  )
}

function emptyDraft(environment: GstEnvironment, purpose: GstProviderPurpose): ProviderDraft {
  return {
    baseUrl: defaultBaseUrl(environment),
    clientId: "",
    clientSecret: "",
    email: "",
    environment,
    ipAddress: "0.0.0.0",
    isEnabled: false,
    purpose,
  }
}

function defaultBaseUrl(environment: GstEnvironment) {
  return environment === "production" ? "https://api.whitebooks.in" : "https://apisandbox.whitebooks.in"
}

function environmentLabel(environment: GstEnvironment) {
  return environment === "production" ? "Production" : "Sandbox"
}
