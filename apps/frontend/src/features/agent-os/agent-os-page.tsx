import { useEffect, useMemo, useRef, useState } from "react"
import { useMutation, useQuery } from "@tanstack/react-query"
import { BarChart3, Bot, BrainCircuit, CheckCircle2, ChevronDown, Cloud, Cpu, Database, ExternalLink, GitBranch, KeyRound, ListChecks, Network, RefreshCw, Route, ShieldCheck, Sparkles, Workflow, Wrench, type LucideIcon } from "lucide-react"
import { toast } from "sonner"

import { MasterListPageFrame } from "src/components/blocks/lists/master-list"
import { Badge } from "src/components/ui/badge"
import { Button } from "src/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "src/components/ui/card"
import { Input } from "src/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "src/components/ui/select"
import type { AuthSession } from "src/features/auth/auth-client"
import { cn } from "src/lib/utils"
import { getAgentOsStatus, getZetroQueryInsights, getZetroQueryRegistry, isZetroAdminRole, learnZetroDocs, saveZetroApiConnection, saveZetroQueryMapping, type ZetroAgentStatus, type ZetroCapability, type ZetroModel, type ZetroProviderConnection } from "./agent-os-client"

export type AgentOsView = "base" | "providers" | "knowledge" | "agents" | "queries" | "updates"

export function AgentOsPage({ session, view = "base" }: { session: AuthSession; view?: AgentOsView }) {
  const adminMode = isZetroAdminRole(session.selectedTenant.role)
  const [apiKeyDraft, setApiKeyDraft] = useState("")
  const [providerKey, setProviderKey] = useState("openrouter")
  const [baseUrl, setBaseUrl] = useState("")
  const [defaultModel, setDefaultModel] = useState("")
  const [freeModels, setFreeModels] = useState("")
  const [premiumModels, setPremiumModels] = useState("")
  const [mappingPhrase, setMappingPhrase] = useState("")
  const [mappingToolKey, setMappingToolKey] = useState("contact.balance")
  const [mappingMatchType, setMappingMatchType] = useState("exact")
  const initialisedRef = useRef(false)
  const statusQuery = useQuery({
    queryKey: ["agent-os-status", session.selectedTenant.slug],
    queryFn: () => getAgentOsStatus(session),
  })
  const queryInsightsQuery = useQuery({
    enabled: adminMode,
    queryKey: ["zetro-query-insights", session.selectedTenant.slug],
    queryFn: () => getZetroQueryInsights(session),
  })
  const queryRegistryQuery = useQuery({
    enabled: adminMode && view === "queries",
    queryKey: ["zetro-query-registry", session.selectedTenant.slug],
    queryFn: () => getZetroQueryRegistry(session),
  })
  const status = statusQuery.data ?? null
  const platformConnections = adminMode ? status?.provider_connections.length ? status.provider_connections : fallbackProviders : []
  const activeProvider = useMemo(
    () => platformConnections.find((connection) => connection.provider === providerKey) ?? status?.api_connection ?? null,
    [providerKey, status?.api_connection, platformConnections],
  )
  const selectedProviderModels = useMemo(() => adminMode ? providerModels(activeProvider) : [], [activeProvider, adminMode])
  const capabilities = status?.capabilities.length ? status.capabilities : fallbackCapabilities
  const agents = status?.agents.length ? status.agents : fallbackAgents
  const freeModelCount = selectedProviderModels.filter((model) => model.tier === "free").length
  const premiumModelCount = selectedProviderModels.filter((model) => model.tier === "premium").length
  const modelChanged = Boolean(activeProvider?.default_model && defaultModel && defaultModel !== activeProvider.default_model)
  const selectedProviderIsActive = Boolean(activeProvider?.is_active)
  const pageMeta = zetroPageMeta(view)

  useEffect(() => {
    if (initialisedRef.current || !status) return
    if (status.default_model?.id) setDefaultModel(status.default_model.id)
    if (status.api_connection?.free_models) setFreeModels(status.api_connection.free_models)
    if (status.api_connection?.premium_models) setPremiumModels(status.api_connection.premium_models)
    if (status.api_connection?.provider) setProviderKey(status.api_connection.provider)
    initialisedRef.current = true
  }, [status])

  useEffect(() => {
    if (!activeProvider) return
    setBaseUrl(activeProvider.base_url)
    setDefaultModel(activeProvider.default_model)
    setFreeModels(activeProvider.free_models)
    setPremiumModels(activeProvider.premium_models)
  }, [activeProvider])

  const apiSaveMutation = useMutation({
    mutationFn: (mode: "key" | "settings" | "model" = "settings") => saveZetroApiConnection(session, {
      apiKey: mode === "key" ? apiKeyDraft.trim() || undefined : undefined,
      providerKey,
      providerName: activeProvider?.provider_name,
      providerKind: activeProvider?.provider_kind,
      baseUrl,
      defaultModel,
      freeModels,
      premiumModels,
      isActive: true,
      testAfterSave: mode !== "settings",
    }),
    onSuccess: (response) => {
      if (response.test && !response.test.ok) {
        toast.error("ZETRO API saved but test failed", {
          description: response.test.error ?? "Check the API key and try again.",
          duration: 8000,
        })
      } else {
        toast.success("ZETRO API connected", {
          description: response.test?.message ?? "Saved as the active provider for chat.",
        })
      }
      setApiKeyDraft("")
      void statusQuery.refetch()
    },
    onError: (error) => {
      toast.error("ZETRO API save failed", {
        description: error instanceof Error ? error.message : "Please check the provider settings.",
      })
    },
  })
  const queryMappingMutation = useMutation({
    mutationFn: () => saveZetroQueryMapping(session, {
      matchType: mappingMatchType,
      phrase: mappingPhrase.trim(),
      toolKey: mappingToolKey,
    }),
    onError(error) {
      toast.error(error instanceof Error ? error.message : "ZETRO query mapping save failed.")
    },
    async onSuccess() {
      toast.success("ZETRO query mapping saved.")
      setMappingPhrase("")
      await Promise.all([queryRegistryQuery.refetch(), queryInsightsQuery.refetch()])
    },
  })

  function selectPlatform(provider: ZetroProviderConnection) {
    setProviderKey(provider.provider)
    setApiKeyDraft("")
    setBaseUrl(provider.base_url)
    setDefaultModel(provider.default_model)
    setFreeModels(provider.free_models)
    setPremiumModels(provider.premium_models)
  }

  const apiLearnMutation = useMutation({
    mutationFn: () => learnZetroDocs(session),
    onSuccess: (response) => {
      toast.success("ZETRO learned approved docs", {
        description: `Indexed ${response.learned} chunks from ${response.source_count} markdown sources.`,
      })
      void statusQuery.refetch()
    },
    onError: (error) => {
      toast.error("ZETRO learn failed", {
        description: error instanceof Error ? error.message : "Please try again.",
      })
    },
  })

  return (
    <MasterListPageFrame
      title={pageMeta.title}
      description={pageMeta.description}
      technicalName={`page.agent-os.${view}`}
      action={
        <div className="flex items-center gap-2">
          {adminMode && view === "knowledge" ? (
            <Button
              className="rounded-md"
              disabled={apiLearnMutation.isPending}
              size="sm"
              type="button"
              variant="outline"
              onClick={() => apiLearnMutation.mutate()}
            >
              <Database className={cn("size-4", apiLearnMutation.isPending && "animate-pulse")} />
              {apiLearnMutation.isPending ? "Learning..." : "Learn docs"}
            </Button>
          ) : null}
          <Button className="rounded-md" variant="outline" type="button" onClick={() => void statusQuery.refetch()}>
            <RefreshCw className={cn("size-4", statusQuery.isFetching && "animate-spin")} />
            Refresh
          </Button>
        </div>
      }
    >
      <div className="grid gap-3 md:grid-cols-5">
        {capabilities.map((capability) => (
          <StatusCard
            key={capability.key}
            detail={capability.detail}
            icon={capabilityIcon(capability.key)}
            label={capability.label}
            state={capability.state}
            value={capability.value}
          />
        ))}
      </div>

      <div className="grid gap-4">
        {view === "base" || view === "providers" || view === "knowledge" ? (
          <Card className="rounded-md border-border/70 bg-card/95 shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <CardTitle>{pageMeta.cardTitle}</CardTitle>
              <Badge variant={status?.ok ? "default" : "secondary"}>{status?.mode ?? "base"}</Badge>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4">
            {view === "base" || view === "knowledge" ? (
              <div className="grid gap-3 md:grid-cols-3">
                <TableStat label="Conversations" value={status?.tables.conversations ?? 0} />
                <TableStat label="Agent logs" value={status?.tables.agent_logs ?? 0} />
                <TableStat label="Knowledge docs" value={status?.tables.knowledge_documents ?? 0} />
              </div>
            ) : null}

            {view === "providers" && adminMode ? (
              <>
            <div className="rounded-md border border-border/70 bg-background p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-xs font-semibold uppercase text-muted-foreground">AI platforms</div>
                  <div className="mt-2 text-sm font-semibold">{platformDisplayName(activeProvider)}</div>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    Connect OpenRouter, GPT, Gemini, OpenCode Zen, or custom OpenAI-compatible providers. Each platform keeps its own key and model list.
                  </p>
                </div>
                <Badge className="rounded-md" variant={selectedProviderIsActive ? "default" : "outline"}>
                  {selectedProviderIsActive ? "active platform" : "available platform"}
                </Badge>
              </div>
              <div className="mt-3 grid gap-2 md:grid-cols-2">
                {platformConnections.map((provider) => (
                  <PlatformButton
                    key={provider.provider}
                    active={provider.provider === providerKey}
                    icon={platformIcon(provider.provider)}
                    provider={provider}
                    onClick={() => selectPlatform(provider)}
                  />
                ))}
              </div>
              <div className="mt-3 rounded-md border border-border/70 bg-muted/15 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-xs font-semibold uppercase text-muted-foreground">Models in {platformDisplayName(activeProvider)}</div>
                  <div className="flex items-center gap-2">
                    <Badge className="rounded-md" variant="outline">{freeModelCount} free</Badge>
                    <Badge className="rounded-md" variant="outline">{premiumModelCount} premium</Badge>
                  </div>
                </div>
                <div className="mt-3 grid max-h-40 gap-2 overflow-y-auto pr-1">
                  {(selectedProviderModels.length ? selectedProviderModels : fallbackModelsForSelect).map((model) => (
                    <div key={model.id} className="flex min-w-0 items-center justify-between gap-3 rounded-md border border-border/60 bg-background px-3 py-2">
                      <span className="min-w-0 truncate text-sm">{model.label}</span>
                      <Badge className="shrink-0 rounded-md" variant={model.tier === "free" ? "secondary" : "outline"}>
                        {model.tier === "free" ? "Free" : "Premium"}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="rounded-md border border-border/70 bg-background p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-xs font-semibold uppercase text-muted-foreground">Switchable model</div>
                  <div className="mt-2 text-sm font-semibold">{modelLabel(defaultModel, status?.models) ?? status?.default_model?.label ?? "Loading model"}</div>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    {freeModelCount} free model{freeModelCount === 1 ? "" : "s"} first, {premiumModelCount} premium model{premiumModelCount === 1 ? "" : "s"} after.
                  </p>
                </div>
                <Badge className="rounded-md" variant={modelChanged ? "default" : "outline"}>
                  {modelChanged ? "unsaved" : "active default"}
                </Badge>
              </div>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <Select value={defaultModel} onValueChange={setDefaultModel}>
                  <SelectTrigger className="h-10 min-w-0 flex-1 rounded-md">
                    <SelectValue placeholder="Select default model" />
                  </SelectTrigger>
                  <SelectContent className="z-[80] max-h-[320px] w-[var(--radix-select-trigger-width)] overflow-y-auto" position="popper" align="start">
                    {(selectedProviderModels.length ? selectedProviderModels : fallbackModelsForSelect).map((model) => (
                      <SelectItem key={model.id} value={model.id}>
                        {model.label} - {model.tier === "free" ? "Free" : "Premium"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  className="rounded-md"
                  disabled={apiSaveMutation.isPending || !defaultModel || !modelChanged}
                  size="sm"
                  type="button"
                  variant={modelChanged ? "default" : "outline"}
                  onClick={() => apiSaveMutation.mutate("model")}
                >
                  <RefreshCw className={cn("size-4", apiSaveMutation.isPending && "animate-spin")} />
                  {apiSaveMutation.isPending ? "Saving..." : "Save model"}
                </Button>
              </div>
            </div>
            <div className="rounded-md border border-border/70 bg-background p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-semibold uppercase text-muted-foreground">API connection</div>
                  <div className="mt-2 flex items-center gap-2 text-sm font-semibold">
                    {status?.api_connection.connected ? (
                      <>
                        <CheckCircle2 className="size-4 text-emerald-600" />
                        Connected{status.api_connection.configured_by ? ` by ${status.api_connection.configured_by}` : ""}
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

              {!activeProvider?.connected ? (
                <div className="mt-4 grid gap-3">
                  <div className="rounded-md bg-muted/30 p-3 text-sm leading-6">
                    <p className="font-semibold">Connect in 3 steps:</p>
                    <ol className="mt-1.5 list-inside list-decimal space-y-1 text-muted-foreground">
                      <li>Get an API key from{" "}
                        <a className="inline-flex items-center gap-1 font-medium text-primary underline underline-offset-2" href={platformKeyUrl(providerKey)} rel="noopener noreferrer" target="_blank">
                          {platformKeyLabel(providerKey)} <ExternalLink className="size-3" />
                        </a>
                      </li>
                      <li>Select the platform and paste its key below</li>
                      <li>Click <strong>Save &amp; test</strong> to verify the connection</li>
                    </ol>
                  </div>
                  <Select value={providerKey} onValueChange={(value) => { setProviderKey(value); setApiKeyDraft("") }}>
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
                    onChange={(event) => setApiKeyDraft(event.target.value)}
                    placeholder={`Paste ${platformDisplayName(activeProvider)} API key`}
                    type="password"
                    value={apiKeyDraft}
                  />
                  <Button
                    className="rounded-md"
                    disabled={apiSaveMutation.isPending || !apiKeyDraft.trim()}
                    size="sm"
                    type="button"
                    onClick={() => apiSaveMutation.mutate("key")}
                  >
                    <KeyRound className={cn("size-4", apiSaveMutation.isPending && "animate-pulse")} />
                    {apiSaveMutation.isPending ? "Saving & testing..." : "Save & test"}
                  </Button>
                  <span className="text-xs leading-5 text-muted-foreground">
                    Key is encrypted server-side. You can change or remove it anytime.
                  </span>
                </div>
              ) : (
                <div className="mt-4 grid gap-3">
                  <div className="grid gap-2">
                    <Input
                      className="h-10 rounded-md font-mono text-xs"
                      onChange={(event) => setApiKeyDraft(event.target.value)}
                      placeholder="Paste a new key to replace the saved key"
                      type="password"
                      value={apiKeyDraft}
                    />
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        className="rounded-md"
                        disabled={apiSaveMutation.isPending || !apiKeyDraft.trim()}
                        size="sm"
                        type="button"
                        onClick={() => apiSaveMutation.mutate("key")}
                      >
                        <KeyRound className={cn("size-4", apiSaveMutation.isPending && "animate-pulse")} />
                        {apiSaveMutation.isPending ? "Updating..." : "Update key"}
                      </Button>
                      <span className="text-xs leading-5 text-muted-foreground">
                        Leave blank to keep the current key.
                      </span>
                    </div>
                  </div>
                  {activeProvider?.last_test_message ? (
                    <div className="rounded-md border border-border/70 bg-muted/20 p-3 text-xs leading-5 text-muted-foreground">
                      {activeProvider.last_test_message}
                    </div>
                  ) : null}
                </div>
              )}

              <DetailsToggle label="Advanced provider settings">
                <div className="mt-3 grid gap-2 border-t border-border/50 pt-3">
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
                  <Button
                    className="w-fit rounded-md"
                    disabled={apiSaveMutation.isPending || !activeProvider?.connected}
                    size="sm"
                    type="button"
                    variant="outline"
                    onClick={() => apiSaveMutation.mutate("settings")}
                  >
                    <RefreshCw className={cn("size-4", apiSaveMutation.isPending && "animate-spin")} />
                    {apiSaveMutation.isPending ? "Saving..." : "Save provider settings"}
                  </Button>
                </div>
              </DetailsToggle>
            </div>
              </>
            ) : view === "providers" ? (
              <div className="rounded-md border border-border/70 bg-background p-4">
                <div className="flex items-start gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <Bot className="size-5" />
                  </span>
                  <div>
                    <div className="text-sm font-semibold">ZETRO user mode</div>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      This view uses approved user and policy docs only. Provider, model, API setup, and recommended technical updates are visible only to admins.
                    </p>
                  </div>
                </div>
              </div>
            ) : null}
            {view === "base" || view === "knowledge" ? (
              <div className="rounded-md border border-border/70 bg-muted/20 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Database className="size-4 text-muted-foreground" />
                Master database tables
              </div>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                The base keeps Agent OS platform records in the master database. Tenant business actions will still resolve through tenant context when Operator tools are added.
              </p>
              </div>
            ) : null}
            {view === "base" || view === "knowledge" ? (
              <div className="rounded-md border border-border/70 bg-background p-4">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <GitBranch className="size-4 text-muted-foreground" />
                Next dynamic steps
              </div>
              <div className="mt-3 grid gap-2">
                {(status?.next.length ? status.next : fallbackNext).map((item) => (
                  <div key={item} className="flex items-start gap-2 text-sm leading-6 text-muted-foreground">
                    <CheckCircle2 className="mt-1 size-3.5 shrink-0 text-emerald-600" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
        ) : null}

        {view === "agents" ? (
          <Card className="rounded-md border-border/70 bg-card/95 shadow-sm">
            <CardHeader>
              <CardTitle>Multi-agent stack</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              {agents.map((agent) => (
                <AgentRow key={agent.key} agent={agent} />
              ))}
            </CardContent>
          </Card>
        ) : null}

          {view === "updates" && adminMode ? <Card className="rounded-md border-border/70 bg-card/95 shadow-sm">
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
          </Card> : null}

          {view === "queries" && adminMode ? (
            <Card className="rounded-md border-border/70 bg-card/95 shadow-sm">
              <CardHeader>
                <CardTitle>Client query review</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4">
                <div className="grid gap-3 rounded-md border border-border/70 bg-background p-3">
                  <div className="text-xs font-semibold uppercase text-muted-foreground">Query registry</div>
                  <div className="grid gap-2 lg:grid-cols-[1fr_220px_150px_auto]">
                    <Input
                      placeholder="Approved phrase, e.g. customer due amount"
                      value={mappingPhrase}
                      onChange={(event) => setMappingPhrase(event.target.value)}
                    />
                    <Select value={mappingToolKey} onValueChange={setMappingToolKey}>
                      <SelectTrigger className="rounded-md">
                        <SelectValue placeholder="Tool" />
                      </SelectTrigger>
                      <SelectContent>
                        {(queryRegistryQuery.data?.tools ?? []).map((tool) => (
                          <SelectItem key={tool.tool_key} value={tool.tool_key}>{tool.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={mappingMatchType} onValueChange={setMappingMatchType}>
                      <SelectTrigger className="rounded-md">
                        <SelectValue placeholder="Match" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="exact">Exact</SelectItem>
                        <SelectItem value="contains">Contains</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      className="rounded-md"
                      disabled={!mappingPhrase.trim() || queryMappingMutation.isPending}
                      onClick={() => queryMappingMutation.mutate()}
                    >
                      Save mapping
                    </Button>
                  </div>
                </div>
                <div className="grid gap-3 lg:grid-cols-3">
                  <InsightCountList
                    emptyLabel="No mapped queries yet"
                    items={queryInsightsQuery.data?.intent_counts ?? []}
                    title="Mapped intents"
                  />
                  <InsightCountList
                    emptyLabel="No repeated questions yet"
                    items={queryInsightsQuery.data?.question_counts ?? []}
                    title="Repeated questions"
                  />
                  <InsightCountList
                    emptyLabel="No tools called yet"
                    items={queryInsightsQuery.data?.tool_counts ?? []}
                    title="Query tools"
                  />
                </div>
                <div className="grid gap-2">
                  <div className="text-xs font-semibold uppercase text-muted-foreground">Recent questions</div>
                  {(queryInsightsQuery.data?.recent ?? []).slice(0, 8).map((item) => (
                    <div key={item.id} className="rounded-md border border-border/70 bg-background p-3">
                      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                        <span className="truncate">{item.intent}</span>
                        <span>{item.status}</span>
                      </div>
                      <p className="mt-1 line-clamp-2 text-sm leading-5">{item.question}</p>
                    </div>
                  ))}
                  {!queryInsightsQuery.data?.recent.length ? (
                    <p className="text-sm leading-6 text-muted-foreground">Mapped client questions will appear here after users ask ZETRO for business summaries.</p>
                  ) : null}
                </div>
                <div className="grid gap-2">
                  <div className="text-xs font-semibold uppercase text-muted-foreground">Mapping candidates</div>
                  <div className="grid gap-2 lg:grid-cols-2">
                    {(queryRegistryQuery.data?.candidates ?? []).slice(0, 8).map((candidate) => (
                      <div key={candidate.normalized_question} className="rounded-md border border-border/70 bg-background p-3">
                        <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                          <span className="truncate">{candidate.suggested_tool ?? candidate.event_type}</span>
                          <span>{candidate.count}x</span>
                        </div>
                        <p className="mt-1 line-clamp-2 text-sm leading-5">{candidate.question}</p>
                        <div className="mt-3 flex items-center justify-between gap-2">
                          <span className="truncate text-xs text-muted-foreground">{candidate.status}</span>
                          <Button
                            className="h-8 rounded-md"
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setMappingPhrase(candidate.question)
                              if (candidate.suggested_tool) setMappingToolKey(candidate.suggested_tool)
                              setMappingMatchType("exact")
                            }}
                          >
                            Map
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                  {!queryRegistryQuery.data?.candidates.length ? (
                    <p className="text-sm leading-6 text-muted-foreground">New mapping candidates will appear after client questions repeat or route through ZETRO.</p>
                  ) : null}
                </div>
                <div className="grid gap-3 lg:grid-cols-2">
                  <div className="grid gap-2">
                    <div className="text-xs font-semibold uppercase text-muted-foreground">Approved mappings</div>
                    {(queryRegistryQuery.data?.mappings ?? []).slice(0, 8).map((mapping) => (
                      <div key={mapping.id} className="rounded-md border border-border/70 bg-background p-3">
                        <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                          <span className="truncate">{mapping.tool_key}</span>
                          <Badge className="rounded-md" variant="outline">{mapping.match_type}</Badge>
                        </div>
                        <p className="mt-1 text-sm font-medium">{mapping.phrase}</p>
                        <p className="mt-1 text-xs text-muted-foreground">Hits: {mapping.hit_count}</p>
                      </div>
                    ))}
                    {!queryRegistryQuery.data?.mappings.length ? (
                      <p className="text-sm leading-6 text-muted-foreground">No approved query aliases have been saved yet.</p>
                    ) : null}
                  </div>
                  <div className="grid gap-2">
                    <div className="text-xs font-semibold uppercase text-muted-foreground">Registry logs</div>
                    {(queryRegistryQuery.data?.logs ?? []).slice(0, 8).map((log) => (
                      <div key={log.id} className="rounded-md border border-border/70 bg-background p-3">
                        <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                          <span className="truncate">{log.tool_key ?? log.mapped_intent ?? "unmapped"}</span>
                          <span>{log.status}</span>
                        </div>
                        <p className="mt-1 line-clamp-2 text-sm leading-5">{log.question}</p>
                        {log.missing_fields.length ? (
                          <p className="mt-1 text-xs text-muted-foreground">Needs: {log.missing_fields.join(", ")}</p>
                        ) : null}
                      </div>
                    ))}
                    {!queryRegistryQuery.data?.logs.length ? (
                      <p className="text-sm leading-6 text-muted-foreground">Business query logs will appear after ZETRO answers client data questions.</p>
                    ) : null}
                  </div>
                </div>
                <div className="grid gap-2">
                  <div className="text-xs font-semibold uppercase text-muted-foreground">Approved tools</div>
                  <div className="grid gap-2 lg:grid-cols-2">
                    {(queryRegistryQuery.data?.tools ?? []).map((tool) => (
                      <div key={tool.tool_key} className="rounded-md border border-border/70 bg-background p-3">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-semibold">{tool.label}</span>
                          <Badge className="rounded-md" variant={tool.is_active ? "default" : "outline"}>{tool.status}</Badge>
                        </div>
                        <p className="mt-1 text-sm leading-5 text-muted-foreground">{tool.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : null}
      </div>
    </MasterListPageFrame>
  )
}

function zetroPageMeta(view: AgentOsView) {
  const meta: Record<AgentOsView, { title: string; description: string; cardTitle: string }> = {
    base: {
      title: "ZETRO Base",
      description: "Core status, records, and next steps for the ZETRO assistant foundation.",
      cardTitle: "Base foundation",
    },
    providers: {
      title: "ZETRO Providers",
      description: "Connect and manage OpenRouter, GPT, Gemini, OpenCode Zen, and compatible AI providers.",
      cardTitle: "API providers",
    },
    knowledge: {
      title: "ZETRO Knowledge",
      description: "Index and monitor the approved ZETRO documentation system used by assistant answers.",
      cardTitle: "Knowledge base",
    },
    agents: {
      title: "ZETRO Agents",
      description: "Review the helper stack and staged agent responsibilities.",
      cardTitle: "Agent stack",
    },
    queries: {
      title: "ZETRO Queries",
      description: "Review client questions, mapped intents, repeated asks, and safe query-tool usage.",
      cardTitle: "Client query review",
    },
    updates: {
      title: "ZETRO Updates",
      description: "Track recommended setup and product updates for the assistant.",
      cardTitle: "Recommended updates",
    },
  }
  return meta[view]
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
    default_model: "nex-agi/nex-n2-pro:free",
    free_models: "nex-agi/nex-n2-pro:free,nvidia/nemotron-3-ultra-550b-a55b:free,nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free,poolside/laguna-xs.2:free,poolside/laguna-m.1:free,google/gemma-4-26b-a4b-it:free,google/gemma-4-31b-it:free,nvidia/nemotron-3-super-120b-a12b:free,liquid/lfm-2.5-1.2b-thinking:free,liquid/lfm-2.5-1.2b-instruct:free,nvidia/nemotron-3-nano-30b-a3b:free,nvidia/nemotron-nano-12b-v2-vl:free,qwen/qwen3-next-80b-a3b-instruct:free,nvidia/nemotron-nano-9b-v2:free,openai/gpt-oss-120b:free,openai/gpt-oss-20b:free,qwen/qwen3-coder:free,cognitivecomputations/dolphin-mistral-24b-venice-edition:free,meta-llama/llama-3.3-70b-instruct:free,meta-llama/llama-3.2-3b-instruct:free,nousresearch/hermes-3-llama-3.1-405b:free,nvidia/nemotron-3.5-content-safety:free",
    premium_models: "openai/gpt-4.1,anthropic/claude-sonnet-4.5,google/gemini-2.5-pro",
    free_model_count: 22,
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
    provider: "opencode",
    provider_name: "OpenCode Zen",
    provider_kind: "openai-compatible",
    connected: false,
    configured_by: null,
    base_url: "https://opencode.ai/zen/v1",
    app_title: "CXSun ZETRO",
    default_model: "deepseek-v4-flash-free",
    free_models: "deepseek-v4-flash-free,mimo-v2.5-free,north-mini-code-free,nemotron-3-ultra-free,big-pickle",
    premium_models: "kimi-k2.6,kimi-k2.5,glm-5.1,glm-5,deepseek-v4-pro,deepseek-v4-flash,minimax-m2.7,minimax-m2.5,grok-build-0.1",
    free_model_count: 5,
    premium_model_count: 9,
    required_env: ["OPENCODE_API_KEY", "OPENCODE_BASE_URL"],
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

const fallbackModelsForSelect = [
  { id: "nex-agi/nex-n2-pro:free", label: "Nex N2 Pro Free", tier: "free" },
  { id: "nvidia/nemotron-3-ultra-550b-a55b:free", label: "Nemotron 3 Ultra 550b A55b Free", tier: "free" },
  { id: "openai/gpt-4.1", label: "Gpt 4.1", tier: "premium" },
]

const fallbackCapabilities: ZetroCapability[] = [
  {
    key: "phase",
    label: "Phase",
    value: "Loading",
    state: "setup",
    detail: "Reading ZETRO status from the backend.",
  },
  {
    key: "api",
    label: "API",
    value: "Checking",
    state: "setup",
    detail: "Provider connection status is loading.",
  },
  {
    key: "knowledge",
    label: "Knowledge",
    value: "Checking",
    state: "setup",
    detail: "Knowledge index status is loading.",
  },
  {
    key: "router",
    label: "Router",
    value: "Queued",
    state: "planned",
    detail: "Router comes after Helper and tool registry.",
  },
  {
    key: "automation",
    label: "Automation",
    value: "Parked",
    state: "planned",
    detail: "Automation is disabled until tools are safe.",
  },
]

const fallbackAgents: ZetroAgentStatus[] = [
  {
    key: "helper",
    name: "Helper Agent",
    role: "Answers project and platform questions.",
    status: "planned",
    stage: "MVP v1",
    model_policy: "Free models first.",
    next_action: "Load backend status.",
  },
]

const fallbackNext = [
  "Load ZETRO status from the backend",
  "Connect provider if needed",
  "Run Learn docs to refresh context",
]

function PlatformButton({
  active,
  icon: Icon,
  provider,
  onClick,
}: {
  active: boolean
  icon: LucideIcon
  provider: ZetroProviderConnection
  onClick: () => void
}) {
  const modelCount = provider.free_model_count + provider.premium_model_count
  return (
    <button
      className={cn(
        "rounded-md border p-3 text-left transition hover:border-primary/40 hover:bg-primary/5",
        active ? "border-primary/50 bg-primary/10" : "border-border/70 bg-card",
      )}
      type="button"
      onClick={onClick}
    >
      <div className="flex items-start gap-3">
        <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-md", providerVerified(provider) ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : provider.connected ? "bg-amber-500/10 text-amber-700 dark:text-amber-300" : "bg-muted text-muted-foreground")}>
          <Icon className="size-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center justify-between gap-2">
            <span className="truncate text-sm font-semibold">{platformDisplayName(provider)}</span>
            <span className={cn("size-1.5 shrink-0 rounded-full", providerVerified(provider) ? "bg-emerald-500" : provider.connected ? "bg-amber-500" : "bg-muted-foreground")} />
          </span>
          <span className="mt-1 block text-xs leading-5 text-muted-foreground">
            {providerStatusText(provider)}
          </span>
          <span className="mt-2 flex flex-wrap items-center gap-1.5">
            <Badge className="rounded-md" variant="outline">{modelCount} models</Badge>
            {provider.is_active ? <Badge className="rounded-md">active</Badge> : null}
          </span>
        </span>
      </div>
    </button>
  )
}

function StatusCard({ detail, icon: Icon, label, state, value }: { detail: string; icon: LucideIcon; label: string; state: ZetroCapability["state"]; value: string }) {
  return (
    <Card className="rounded-md border-border/70 bg-card/95 shadow-sm">
      <CardContent className="flex items-start gap-3 p-4">
        <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-md", stateTone(state).icon)}>
          <Icon className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <div className="text-xs font-semibold uppercase text-muted-foreground">{label}</div>
            <span className={cn("size-1.5 rounded-full", stateTone(state).dot)} />
          </div>
          <div className="mt-1 truncate text-sm font-semibold text-foreground">{value}</div>
          <div className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">{detail}</div>
        </div>
      </CardContent>
    </Card>
  )
}

function AgentRow({ agent }: { agent: ZetroAgentStatus }) {
  const Icon = agentIcon(agent.key)
  return (
    <article className="rounded-md border border-border/70 bg-background p-3">
      <div className="flex items-start gap-3">
        <span className={cn("mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md", stateTone(agent.status).icon)}>
          <Icon className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold">{agent.name}</h3>
            <Badge className="rounded-md" variant={agent.status === "active" ? "default" : "outline"}>{agent.status}</Badge>
            <Badge className="rounded-md" variant="secondary">{agent.stage}</Badge>
          </div>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">{agent.role}</p>
          <div className="mt-2 rounded-md bg-muted/20 px-2.5 py-2 text-xs leading-5 text-muted-foreground">
            <span className="font-medium text-foreground">Next:</span> {agent.next_action}
          </div>
        </div>
      </div>
    </article>
  )
}

function InsightCountList({ emptyLabel, items, title }: { emptyLabel: string; items: Array<{ key: string; count: number }>; title: string }) {
  const visibleItems = items.length ? items : [{ key: emptyLabel, count: 0 }]
  return (
    <div className="grid gap-2">
      <div className="text-xs font-semibold uppercase text-muted-foreground">{title}</div>
      {visibleItems.slice(0, 6).map((item) => (
        <div key={item.key} className="flex items-center justify-between gap-3 rounded-md border border-border/70 bg-background px-3 py-2 text-sm">
          <span className="min-w-0 truncate">{item.key}</span>
          <Badge className="rounded-md" variant="outline">{item.count}</Badge>
        </div>
      ))}
    </div>
  )
}

function capabilityIcon(key: string): LucideIcon {
  return ({
    phase: Bot,
    api: KeyRound,
    knowledge: Database,
    router: Network,
    automation: ShieldCheck,
  } satisfies Record<string, LucideIcon>)[key] ?? Sparkles
}

function modelLabel(modelId: string, models?: Array<{ id: string; label: string }>) {
  if (!modelId) return null
  return models?.find((model) => model.id === modelId)?.label ?? modelId
}

function providerModels(provider: ZetroProviderConnection | null): ZetroModel[] {
  if (!provider) return []
  const freeModels = splitModelIds(provider.free_models).map((id) => ({
    id,
    label: labelFromModelId(id),
    provider: provider.provider,
    tier: "free" as const,
    requiresKey: true,
  }))
  const premiumModels = splitModelIds(provider.premium_models).map((id) => ({
    id,
    label: labelFromModelId(id),
    provider: provider.provider,
    tier: "premium" as const,
    requiresKey: true,
  }))
  return Array.from(new Map([...freeModels, ...premiumModels].map((model) => [model.id, model])).values())
}

function splitModelIds(value: string | null | undefined) {
  return String(value ?? "").split(",").map((item) => item.trim()).filter(Boolean)
}

function labelFromModelId(modelId: string) {
  const lastPart = modelId.split("/").at(-1) ?? modelId
  return lastPart
    .replace(/[-_:]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function platformDisplayName(provider: ZetroProviderConnection | null | undefined) {
  if (!provider) return "OpenRouter"
  if (provider.provider === "openai") return "OpenAI / GPT"
  if (provider.provider === "gemini") return "Google Gemini"
  if (provider.provider === "opencode") return "OpenCode Zen"
  if (provider.provider === "custom") return "Custom API"
  return provider.provider_name
}

function providerVerified(provider: ZetroProviderConnection) {
  return provider.last_test_status === "ok" || provider.status === "connected"
}

function providerStatusText(provider: ZetroProviderConnection) {
  if (providerVerified(provider)) {
    return provider.configured_by ? `Connected by ${provider.configured_by}` : "Connected"
  }
  if (provider.connected && provider.configured_by) {
    return `Configured by ${provider.configured_by}; test recommended`
  }
  if (provider.connected) return "Configured; test recommended"
  return "Needs API key"
}

function platformIcon(providerKey: string): LucideIcon {
  if (providerKey === "openai") return BrainCircuit
  if (providerKey === "gemini") return Sparkles
  if (providerKey === "opencode") return Bot
  if (providerKey === "custom") return Cpu
  return Cloud
}

function platformKeyUrl(providerKey: string) {
  if (providerKey === "openai") return "https://platform.openai.com/api-keys"
  if (providerKey === "gemini") return "https://aistudio.google.com/app/apikey"
  if (providerKey === "opencode") return "https://opencode.ai/auth"
  if (providerKey === "custom") return "http://localhost:11434"
  return "https://openrouter.ai/keys"
}

function platformKeyLabel(providerKey: string) {
  if (providerKey === "openai") return "platform.openai.com/api-keys"
  if (providerKey === "gemini") return "aistudio.google.com/app/apikey"
  if (providerKey === "opencode") return "opencode.ai/auth"
  if (providerKey === "custom") return "your custom provider"
  return "openrouter.ai/keys"
}

function agentIcon(key: string): LucideIcon {
  return ({
    helper: Sparkles,
    operator: Wrench,
    workflow: Workflow,
    planner: BrainCircuit,
    analytics: BarChart3,
    router: Route,
  } satisfies Record<string, LucideIcon>)[key] ?? Bot
}

function stateTone(state: "active" | "setup" | "blocked" | "planned") {
  if (state === "active") return { icon: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300", dot: "bg-emerald-500" }
  if (state === "blocked") return { icon: "bg-destructive/10 text-destructive", dot: "bg-destructive" }
  if (state === "setup") return { icon: "bg-amber-500/10 text-amber-700 dark:text-amber-300", dot: "bg-amber-500" }
  return { icon: "bg-muted text-muted-foreground", dot: "bg-muted-foreground" }
}

function TableStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-border/70 bg-background p-4">
      <div className="text-xs font-semibold uppercase text-muted-foreground">{label}</div>
      <div className="mt-2 text-2xl font-semibold tracking-tight">{value}</div>
    </div>
  )
}

function DetailsToggle({ label, children }: { label: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="mt-3">
      <button
        className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
        onClick={() => setOpen(!open)}
        type="button"
      >
        <ChevronDown className={cn("size-3.5 transition-transform", open && "rotate-180")} />
        {label}
      </button>
      {open ? children : null}
    </div>
  )
}
