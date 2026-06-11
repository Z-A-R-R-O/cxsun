import { useEffect, useMemo, useState } from "react"
import { useMutation, useQuery } from "@tanstack/react-query"
import { Bot, CheckCircle2, Database, KeyRound, ListChecks, Network, RefreshCw, ShieldCheck, Sparkles, type LucideIcon } from "lucide-react"
import { toast } from "sonner"

import { MasterListPageFrame } from "src/components/blocks/lists/master-list"
import { Badge } from "src/components/ui/badge"
import { Button } from "src/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "src/components/ui/card"
import { Input } from "src/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "src/components/ui/select"
import type { AuthSession } from "src/features/auth/auth-client"
import { cn } from "src/lib/utils"
import { getAgentOsStatus, saveZetroApiConnection, testZetroApiConnection } from "./agent-os-client"

export function AgentOsPage({ session }: { session: AuthSession }) {
  const [apiKeyDraft, setApiKeyDraft] = useState("")
  const [providerKey, setProviderKey] = useState("openrouter")
  const [baseUrl, setBaseUrl] = useState("")
  const [defaultModel, setDefaultModel] = useState("")
  const [freeModels, setFreeModels] = useState("")
  const [premiumModels, setPremiumModels] = useState("")
  const statusQuery = useQuery({
    queryKey: ["agent-os-status", session.selectedTenant.slug],
    queryFn: () => getAgentOsStatus(session),
  })
  const status = statusQuery.data ?? null
  const activeProvider = useMemo(
    () => status?.provider_connections.find((connection) => connection.provider === providerKey) ?? status?.api_connection ?? null,
    [providerKey, status?.api_connection, status?.provider_connections],
  )
  const freeModelCount = status?.models.filter((model) => model.tier === "free").length ?? 0
  const premiumModelCount = status?.models.filter((model) => model.tier === "premium").length ?? 0

  useEffect(() => {
    if (!status?.api_connection) return
    setProviderKey(status.api_connection.provider)
  }, [status?.api_connection])

  useEffect(() => {
    if (!activeProvider) return
    setBaseUrl(activeProvider.base_url)
    setDefaultModel(activeProvider.default_model)
    setFreeModels(activeProvider.free_models)
    setPremiumModels(activeProvider.premium_models)
  }, [activeProvider])

  const apiTestMutation = useMutation({
    mutationFn: () => testZetroApiConnection(session, {
      apiKey: apiKeyDraft.trim() || undefined,
      providerKey,
      model: defaultModel || status?.default_model?.id,
    }),
    onSuccess: (response) => {
      if (response.ok) {
        toast.success("ZETRO API test connected", {
          description: response.message ?? "Provider responded successfully.",
        })
        setApiKeyDraft("")
        void statusQuery.refetch()
        return
      }

      toast.error("ZETRO API test failed", {
        description: response.error ?? "Check the key and provider model.",
      })
    },
    onError: (error) => {
      toast.error("ZETRO API test failed", {
        description: error instanceof Error ? error.message : "Please try again.",
      })
    },
  })
  const apiSaveMutation = useMutation({
    mutationFn: () => saveZetroApiConnection(session, {
      apiKey: apiKeyDraft.trim() || undefined,
      providerKey,
      providerName: activeProvider?.provider_name,
      providerKind: activeProvider?.provider_kind,
      baseUrl,
      defaultModel,
      freeModels,
      premiumModels,
      isActive: true,
      testAfterSave: true,
    }),
    onSuccess: (response) => {
      toast.success("ZETRO API saved", {
        description: response.test?.message ?? "Saved as the active provider for chat.",
      })
      setApiKeyDraft("")
      void statusQuery.refetch()
    },
    onError: (error) => {
      toast.error("ZETRO API save failed", {
        description: error instanceof Error ? error.message : "Please check the provider settings.",
      })
    },
  })

  return (
    <MasterListPageFrame
      title="ZETRO"
      description="Universal AI chat base for helper knowledge, safe tools, workflows, planning, analytics, and memory."
      technicalName="page.agent-os.base"
      action={
        <Button className="rounded-md" variant="outline" type="button" onClick={() => void statusQuery.refetch()}>
          <RefreshCw className={cn("size-4", statusQuery.isFetching && "animate-spin")} />
          Refresh
        </Button>
      }
    >
      <div className="grid gap-3 md:grid-cols-5">
        <StatusCard icon={Bot} label="Phase" value={status?.phase ?? "P1 Site Helper Agent"} />
        <StatusCard icon={KeyRound} label="API" value={status?.api_connected ? "Connected" : "Needs key"} />
        <StatusCard icon={ShieldCheck} label="Automation" value={status?.automation_enabled ? "Enabled" : "Off"} />
        <StatusCard icon={Network} label="Router" value={status?.router_enabled ? "Enabled" : "Planned"} />
        <StatusCard icon={Sparkles} label="Helper" value={status?.helper_enabled ? "Enabled" : "Base only"} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
        <Card className="rounded-md border-border/70 bg-card/95 shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <CardTitle>Base foundation</CardTitle>
              <Badge variant={status?.ok ? "default" : "secondary"}>{status?.mode ?? "base"}</Badge>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-3 md:grid-cols-3">
              <TableStat label="Conversations" value={status?.tables.conversations ?? 0} />
              <TableStat label="Agent logs" value={status?.tables.agent_logs ?? 0} />
              <TableStat label="Knowledge docs" value={status?.tables.knowledge_documents ?? 0} />
            </div>
            <div className="rounded-md border border-border/70 bg-background p-4">
              <div className="text-xs font-semibold uppercase text-muted-foreground">Switchable model</div>
              <div className="mt-2 text-sm font-semibold">{status?.default_model?.label ?? "Deepseek Chat V3 0324 Free"}</div>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Backend config exposes {freeModelCount} free model{freeModelCount === 1 ? "" : "s"} first and {premiumModelCount} premium model{premiumModelCount === 1 ? "" : "s"} after that.
              </p>
            </div>
            <div className="rounded-md border border-border/70 bg-background p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-semibold uppercase text-muted-foreground">API connection</div>
                  <div className="mt-2 flex items-center gap-2 text-sm font-semibold">
                    {status?.api_connection.connected ? (
                      <>
                        <CheckCircle2 className="size-4 text-emerald-600" />
                        Connected by {status.api_connection.configured_by}
                      </>
                    ) : (
                      <>
                        <KeyRound className="size-4 text-amber-600" />
                        Waiting for provider key
                      </>
                    )}
                  </div>
                </div>
                <Badge className="rounded-md" variant={activeProvider?.connected ? "default" : "outline"}>
                  {activeProvider?.provider_name ?? "OpenRouter"}
                </Badge>
              </div>
              <div className="mt-4 grid gap-2">
                <Select value={providerKey} onValueChange={setProviderKey}>
                  <SelectTrigger className="h-10 rounded-md">
                    <SelectValue placeholder="Provider" />
                  </SelectTrigger>
                  <SelectContent>
                    {(status?.provider_connections ?? fallbackProviders).map((provider) => (
                      <SelectItem key={provider.provider} value={provider.provider}>
                        {provider.provider_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  className="h-10 rounded-md font-mono text-xs"
                  onChange={(event) => setBaseUrl(event.target.value)}
                  placeholder="Provider base URL"
                  value={baseUrl}
                />
                <Input
                  className="h-10 rounded-md font-mono text-xs"
                  onChange={(event) => setDefaultModel(event.target.value)}
                  placeholder="Default model"
                  value={defaultModel}
                />
                <Input
                  className="h-10 rounded-md font-mono text-xs"
                  onChange={(event) => setFreeModels(event.target.value)}
                  placeholder="Free model IDs, comma separated"
                  value={freeModels}
                />
                <Input
                  className="h-10 rounded-md font-mono text-xs"
                  onChange={(event) => setPremiumModels(event.target.value)}
                  placeholder="Premium model IDs, comma separated"
                  value={premiumModels}
                />
                <Input
                  className="h-10 rounded-md font-mono text-xs"
                  onChange={(event) => setApiKeyDraft(event.target.value)}
                  placeholder={activeProvider?.connected ? "Paste new key to replace saved key" : "Paste API key to save"}
                  type="password"
                  value={apiKeyDraft}
                />
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    className="rounded-md"
                    disabled={apiSaveMutation.isPending || (!apiKeyDraft.trim() && !activeProvider?.connected)}
                    size="sm"
                    type="button"
                    onClick={() => apiSaveMutation.mutate()}
                  >
                    <KeyRound className="size-4" />
                    {apiSaveMutation.isPending ? "Saving..." : "Save & test"}
                  </Button>
                  <Button
                    className="rounded-md"
                    disabled={apiTestMutation.isPending || (!apiKeyDraft.trim() && !activeProvider?.connected)}
                    size="sm"
                    type="button"
                    variant="outline"
                    onClick={() => apiTestMutation.mutate()}
                  >
                    <KeyRound className="size-4" />
                    {apiTestMutation.isPending ? "Testing..." : "Test API"}
                  </Button>
                  <span className="text-xs leading-5 text-muted-foreground">
                    Saved keys are encrypted server-side and used by ZETRO chat.
                  </span>
                </div>
                {activeProvider?.last_test_message ? (
                  <div className="rounded-md border border-border/70 bg-muted/20 p-3 text-xs leading-5 text-muted-foreground">
                    {activeProvider.last_test_message}
                  </div>
                ) : null}
              </div>
              <div className="mt-4 grid gap-2 text-xs text-muted-foreground">
                {(status?.api_connection.required_env ?? fallbackRequiredEnv).map((item) => (
                  <div key={item} className="rounded-md border border-border/70 bg-muted/20 px-2.5 py-2 font-mono">
                    {item}
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-md border border-border/70 bg-muted/20 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Database className="size-4 text-muted-foreground" />
                Master database tables
              </div>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                The base keeps Agent OS platform records in the master database. Tenant business actions will still resolve through tenant context when Operator tools are added.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-md border-border/70 bg-card/95 shadow-sm">
          <CardHeader>
            <CardTitle>Recommended updates</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            {(status?.recommended_updates.length ? status.recommended_updates : fallbackRecommended).map((item) => (
              <div key={item.title} className="flex items-start gap-3 rounded-md border border-border/70 bg-background p-3">
                <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <ListChecks className="size-4" />
                </span>
                <span className="min-w-0">
                  <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    {item.title}
                    <Badge className="rounded-md" variant={item.priority === "high" ? "default" : "outline"}>{item.priority}</Badge>
                  </span>
                  <span className="mt-1 block text-sm leading-6 text-muted-foreground">{item.detail}</span>
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </MasterListPageFrame>
  )
}

const fallbackRequiredEnv = [
  "OPENROUTER_API_KEY",
  "ZETRO_FREE_MODELS",
  "ZETRO_PREMIUM_MODELS",
  "ZETRO_DEFAULT_MODEL",
]

const fallbackProviders = [
  {
    provider: "openrouter",
    provider_name: "OpenRouter",
    provider_kind: "openai-compatible",
    connected: false,
    configured_by: null,
    base_url: "https://openrouter.ai/api/v1",
    app_title: "CXSun ZETRO",
    default_model: "deepseek/deepseek-chat-v3-0324:free",
    free_models: "deepseek/deepseek-chat-v3-0324:free,qwen/qwen3-235b-a22b:free,deepseek/deepseek-r1:free",
    premium_models: "openai/gpt-5.2,anthropic/claude-sonnet-4.5,google/gemini-2.5-pro",
    free_model_count: 3,
    premium_model_count: 3,
    required_env: fallbackRequiredEnv,
    is_active: true,
    status: "not_configured",
    last_test_status: null,
    last_test_message: null,
    last_tested_at: null,
  },
  {
    provider: "openai",
    provider_name: "OpenAI",
    provider_kind: "openai-compatible",
    connected: false,
    configured_by: null,
    base_url: "https://api.openai.com/v1",
    app_title: "CXSun ZETRO",
    default_model: "gpt-4.1-mini",
    free_models: "",
    premium_models: "gpt-4.1-mini,gpt-4o-mini",
    free_model_count: 0,
    premium_model_count: 2,
    required_env: ["OPENAI_API_KEY"],
    is_active: false,
    status: "not_configured",
    last_test_status: null,
    last_test_message: null,
    last_tested_at: null,
  },
  {
    provider: "gemini",
    provider_name: "Gemini",
    provider_kind: "gemini",
    connected: false,
    configured_by: null,
    base_url: "https://generativelanguage.googleapis.com/v1beta",
    app_title: "CXSun ZETRO",
    default_model: "gemini-2.5-flash",
    free_models: "gemini-2.5-flash",
    premium_models: "gemini-2.5-pro",
    free_model_count: 1,
    premium_model_count: 1,
    required_env: ["GEMINI_API_KEY"],
    is_active: false,
    status: "not_configured",
    last_test_status: null,
    last_test_message: null,
    last_tested_at: null,
  },
  {
    provider: "custom",
    provider_name: "Custom / OpenAI Compatible",
    provider_kind: "openai-compatible",
    connected: false,
    configured_by: null,
    base_url: "http://localhost:11434/v1",
    app_title: "CXSun ZETRO",
    default_model: "llama3.1",
    free_models: "llama3.1",
    premium_models: "",
    free_model_count: 1,
    premium_model_count: 0,
    required_env: ["CUSTOM_AI_API_KEY"],
    is_active: false,
    status: "not_configured",
    last_test_status: null,
    last_test_message: null,
    last_tested_at: null,
  },
]

const fallbackRecommended = [
  {
    title: "Connect OpenRouter API",
    detail: "Save a provider key in the ZETRO API panel, then run Save & test so chat uses the active saved provider.",
    priority: "high" as const,
  },
]

function StatusCard({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <Card className="rounded-md border-border/70 bg-card/95 shadow-sm">
      <CardContent className="flex items-center gap-3 p-4">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
          <Icon className="size-5" />
        </span>
        <div className="min-w-0">
          <div className="text-xs font-semibold uppercase text-muted-foreground">{label}</div>
          <div className="truncate text-sm font-semibold text-foreground">{value}</div>
        </div>
      </CardContent>
    </Card>
  )
}

function TableStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-border/70 bg-background p-4">
      <div className="text-xs font-semibold uppercase text-muted-foreground">{label}</div>
      <div className="mt-2 text-2xl font-semibold tracking-tight">{value}</div>
    </div>
  )
}
