import { useEffect, useMemo, useState, type ReactNode } from "react"
import { useQuery } from "@tanstack/react-query"
import { toast } from "sonner"
import { CheckCircle2, ListChecks, Play, RefreshCw, Server, XCircle } from "lucide-react"
import { Badge } from "src/components/ui/badge"
import { Button } from "src/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "src/components/ui/card"
import { Label } from "src/components/ui/label"
import { Input } from "src/components/ui/input"
import { NativeSelect, NativeSelectOption } from "src/components/ui/native-select"
import { Textarea } from "src/components/ui/textarea"
import { cn } from "src/lib/utils"
import type { AuthSession } from "src/features/auth/auth-client"
import { getGstComplianceSettings, getGstComplianceTokenStatus, listGstComplianceOperations, runGstComplianceOperation, saveGstComplianceSettings, type GstComplianceOperation, type GstProviderPurpose } from "./gst-compliance-client"
import { listTenants } from "src/features/tenant/infrastructure/tenant-api"

interface OperationDefinition {
  description: string
  documentDate?: string
  documentNo?: string
  endpoint: string
  method: "GET" | "POST"
  name: GstComplianceOperation
  payload: unknown
  query: Record<string, unknown>
  sourceType?: string
}

type RunState = {
  error?: string
  input?: unknown
  ok: boolean
  output?: unknown
  ranAt: string
}

interface SettingsDraft {
  baseUrl: string
  clientId: string
  clientSecret: string
  email: string
  environment: "production" | "sandbox"
  gstin: string
  ipAddress: string
  isEnabled: boolean
  password: string
  username: string
}

const today = new Date().toISOString().slice(0, 10)

const operationDefinitions: OperationDefinition[] = [
  { name: "authenticate", endpoint: "/einvoice/authenticate", method: "GET", description: "WhiteBooks auth token", query: {}, payload: null },
  { name: "gstnDetails", endpoint: "/einvoice/type/GSTNDETAILS/version/V1_03", method: "GET", description: "GSTIN profile lookup", query: { param1: "33DYJPS8168F1ZW" }, payload: null },
  { name: "syncGstinFromCommonPortal", endpoint: "/einvoice/type/SYNC_GSTIN_FROMCP/version/V1_03", method: "GET", description: "Common portal GSTIN sync", query: { param1: "33DYJPS8168F1ZW" }, payload: null },
  { name: "generateIrn", endpoint: "/einvoice/type/GENERATE/version/V1_03", method: "POST", description: "Generate invoice IRN", documentDate: today, documentNo: `GST-${today.replaceAll("-", "")}`, query: {}, payload: sampleInvoicePayload(), sourceType: "gst-sales" },
  { name: "getEinvoiceByIrn", endpoint: "/einvoice/type/GETIRN/version/V1_03", method: "GET", description: "Fetch e-invoice by IRN", query: { param1: "" }, payload: null },
  { name: "getIrnByDocument", endpoint: "/einvoice/type/GETIRNBYDOCDETAILS/version/V1_03", method: "GET", description: "Fetch IRN by document details", query: { param1: "INV", docnum: "", docdate: formatGstDate(today) }, payload: null },
  { name: "getRejectedIrns", endpoint: "/einvoice/type/GETREJECTEDIRNS/version/V1_03", method: "GET", description: "Rejected IRN list", query: { fromdate: formatGstDate(today), todate: formatGstDate(today) }, payload: null },
  { name: "generateEwaybillByIrn", endpoint: "/einvoice/type/GENERATE_EWAYBILL/version/V1_03", method: "POST", description: "Generate e-way bill from IRN", documentDate: today, documentNo: `EWB-${today.replaceAll("-", "")}`, query: {}, payload: { Irn: "", Distance: 100, TransMode: "1", TransId: "29DPZPS4403C1ZF", TransName: "GST Transport", TransDocDt: formatGstDate(today), TransDocNo: `EWB-${today.replaceAll("-", "")}`, VehNo: "KA12ER1234", VehType: "R" }, sourceType: "gst-sales" },
  { name: "getEwaybillByIrn", endpoint: "/einvoice/type/GETEWAYBILLIRN/version/V1_03", method: "GET", description: "Fetch e-way bill by IRN", query: { param1: "", supplier_gstn: "29AAGCB1286Q000" }, payload: null },
  { name: "cancelEwaybill", endpoint: "/einvoice/type/CANCEL_EWAYBILL/version/V1_03", method: "POST", description: "Cancel e-way bill", query: {}, payload: { ewbNo: "", cancelRsnCode: "2", cancelRmrk: "GST e-way cancellation test" } },
  { name: "getB2cQrCode", endpoint: "/einvoice/qrcode", method: "GET", description: "B2C QR code details", query: { sgstin: "29AAGCB1286Q000", docno: "", docdate: formatQrDate(today), totinvval: "118", upiid: "", bankaccno: "5697389713210", bankifsccode: "SBIN11000", accountholdername: "ABCDE", igstamount: "18", cgstamount: "0", sgstamount: "0", cessamount: "0" }, payload: null },
  { name: "cancelIrn", endpoint: "/einvoice/type/CANCEL/version/V1_03", method: "POST", description: "Cancel IRN", query: {}, payload: { Irn: "", CnlRsn: "1", CnlRem: "GST cancellation test" } },
]

export function GstSandboxPage({ allowEnvironmentSelect = false, preferredEnvironment = "production", session, showTenantSelector = false }: { allowEnvironmentSelect?: boolean; preferredEnvironment?: "production" | "sandbox"; session: AuthSession; showTenantSelector?: boolean }) {
  const tenantsQuery = useQuery({ enabled: showTenantSelector, queryKey: ["gst-compliance", "tenants", session.selectedTenant.slug], queryFn: () => listTenants(session) })
  const [selectedTenantCode, setSelectedTenantCode] = useState("")
  const [settingsDraft, setSettingsDraft] = useState<SettingsDraft>(() => emptySettingsDraft(initialEnvironment(preferredEnvironment, session.selectedTenant.slug, showTenantSelector)))
  const [selectedPurpose, setSelectedPurpose] = useState<GstProviderPurpose>("einvoice_eway")
  const [isSavingSettings, setIsSavingSettings] = useState(false)
  const tenantCode = showTenantSelector ? selectedTenantCode : session.selectedTenant.slug
  const selectedEnvironment = allowEnvironmentSelect ? settingsDraft.environment : "production"
  const requestOptions = tenantCode ? { environment: selectedEnvironment, ...(showTenantSelector ? { purpose: selectedPurpose } : {}), tenantCode } : { environment: selectedEnvironment }
  const settingsQuery = useQuery({ enabled: !showTenantSelector || Boolean(tenantCode), queryKey: ["gst-compliance", "settings", tenantCode, selectedEnvironment, selectedPurpose], queryFn: () => getGstComplianceSettings(session, requestOptions) })
  const tokenQuery = useQuery({ enabled: !showTenantSelector || Boolean(tenantCode), queryKey: ["gst-compliance", "token", tenantCode, selectedEnvironment, selectedPurpose], queryFn: () => getGstComplianceTokenStatus(session, requestOptions) })
  const historyQuery = useQuery({ enabled: !showTenantSelector || Boolean(tenantCode), queryKey: ["gst-compliance", "operations", tenantCode, selectedEnvironment, selectedPurpose], queryFn: () => listGstComplianceOperations(session, requestOptions) })
  const [activeOperation, setActiveOperation] = useState<GstComplianceOperation>("authenticate")
  const [isRunning, setIsRunning] = useState(false)
  const [queryText, setQueryText] = useState(() => definitionMap())
  const [payloadText, setPayloadText] = useState(() => definitionMap("payload"))
  const [sourceText, setSourceText] = useState(() => sourceMap())
  const [results, setResults] = useState<Partial<Record<GstComplianceOperation, RunState>>>({})

  const settings = settingsQuery.data
  const tenants = tenantsQuery.data ?? []
  const activeDefinition = useMemo(() => operationDefinitions.find((item) => item.name === activeOperation) ?? operationDefinitions[0], [activeOperation])
  const activeResult = results[activeOperation]
  const handshakeResult = results.gstnDetails ?? results.authenticate
  const activeUrl = operationUrl(settings?.baseUrl ?? settingsDraft.baseUrl, activeDefinition.endpoint, queryText[activeOperation], settings?.email ?? settingsDraft.email, selectedEnvironment)
  const tenantReady = !showTenantSelector || Boolean(tenantCode)

  useEffect(() => {
    if (!tenantCode) return
    localStorage.setItem(gstEnvironmentStorageKey(tenantCode), selectedEnvironment)
  }, [selectedEnvironment, tenantCode])

  useEffect(() => {
    if (!showTenantSelector || selectedTenantCode || !tenants[0]) return
    setSelectedTenantCode(tenants[0].slug)
  }, [selectedTenantCode, showTenantSelector, tenants])

  useEffect(() => {
    if (!settings) return
    const environment = allowEnvironmentSelect ? settings.uuid === "ENV" ? preferredEnvironment : settings.environment : "production"
    setSettingsDraft({
      baseUrl: settings.uuid === "ENV" ? defaultBaseUrl(environment) : settings.baseUrl || defaultBaseUrl(environment),
      clientId: "",
      clientSecret: "",
      email: settings.email || "",
      environment,
      gstin: settings.gstin || "",
      ipAddress: settings.ipAddress || "0.0.0.0",
      isEnabled: true,
      password: settings.password || "",
      username: settings.username || "",
    })
  }, [allowEnvironmentSelect, preferredEnvironment, settings])

  async function runOne(operation: GstComplianceOperation, overrides?: { query?: Record<string, unknown> }) {
    const definition = operationDefinitions.find((item) => item.name === operation) ?? operationDefinitions[0]
    const query = overrides?.query ?? parseJsonObject(queryText[operation], "Query JSON")
    const payload = preparePayload(operation, parseJsonValue(payloadText[operation], "Payload JSON"))
    const source = parseJsonObject(sourceText[operation], "Source JSON")
    const documentDetails = invoiceDocumentDetails(payload)
      const input = {
      ...source,
      documentDate: typeof source.documentDate === "string" && source.documentDate ? source.documentDate : documentDetails.date || definition.documentDate,
      documentNo: typeof source.documentNo === "string" && source.documentNo ? source.documentNo : documentDetails.no || definition.documentNo,
      environment: selectedEnvironment,
      ...(showTenantSelector ? { purpose: selectedPurpose } : {}),
      payload,
      query,
      sourceType: typeof source.sourceType === "string" ? source.sourceType : definition.sourceType,
    }
    const response = await runGstComplianceOperation(session, operation, input, requestOptions)
    applyChainedResponse(operation, response, input)
    setResults((current) => ({ ...current, [operation]: { input, ok: true, output: response, ranAt: new Date().toISOString() } }))
    return response
  }

  async function runSelected() {
    setIsRunning(true)
    try {
      await runOne(activeOperation)
      await historyQuery.refetch()
      await tokenQuery.refetch()
      toast.success("GST API completed", { description: activeOperation })
    } catch (error) {
      const message = error instanceof Error ? error.message : "GST API failed."
      setResults((current) => ({ ...current, [activeOperation]: { error: message, ok: false, ranAt: new Date().toISOString() } }))
      toast.error("GST API failed", { description: message })
    } finally {
      setIsRunning(false)
    }
  }

  async function runAll() {
    setIsRunning(true)
    let passed = 0
    for (const operation of operationDefinitions.map((definition) => definition.name)) {
      try {
        await runOne(operation)
        passed += 1
      } catch (error) {
        const message = error instanceof Error ? error.message : "GST API failed."
        setResults((current) => ({ ...current, [operation]: { error: message, ok: false, ranAt: new Date().toISOString() } }))
      }
    }
    await historyQuery.refetch()
    await tokenQuery.refetch()
    setIsRunning(false)
    toast.success("GST API run finished", { description: `${passed}/${operationDefinitions.length} APIs completed.` })
  }

  async function runHandshake() {
    setIsRunning(true)
    try {
      const savedSettings = await saveGstComplianceSettings(session, {
        environment: selectedEnvironment,
        gstin: settingsDraft.gstin,
        isEnabled: true,
        password: settingsDraft.password,
        provider: "whitebooks",
        username: settingsDraft.username,
      }, requestOptions)
      setSettingsDraft((current) => ({ ...current, password: savedSettings.password || current.password }))
      await settingsQuery.refetch()
      await runOne("authenticate")
      const gstin = (savedSettings.gstin || settingsDraft.gstin || settings?.gstin || "").trim().toUpperCase()
      const response = await runOne("gstnDetails", { query: { param1: gstin } })
      setQueryText((current) => ({ ...current, gstnDetails: stringify({ param1: gstin }) }))
      await historyQuery.refetch()
      await tokenQuery.refetch()
      toast.success("GST API handshake completed", { description: "Token generated and GSTIN profile verified." })
      return response
    } catch (error) {
      const message = error instanceof Error ? error.message : "GST API handshake failed."
      setResults((current) => ({ ...current, gstnDetails: { error: message, ok: false, ranAt: new Date().toISOString() } }))
      toast.error("GST API handshake failed", { description: message })
    } finally {
      setIsRunning(false)
    }
  }

  function resetActive() {
    setQueryText((current) => ({ ...current, [activeOperation]: stringify(activeDefinition.query) }))
    setPayloadText((current) => ({ ...current, [activeOperation]: stringify(activeDefinition.payload) }))
    setSourceText((current) => ({ ...current, [activeOperation]: stringify(defaultSource(activeDefinition)) }))
  }

  async function saveSettings() {
    if (!tenantReady) {
      toast.error("Select a tenant before saving GST settings.")
      return
    }
    setIsSavingSettings(true)
    try {
      const saved = await saveGstComplianceSettings(session, {
        environment: selectedEnvironment,
        gstin: settingsDraft.gstin,
        isEnabled: true,
        password: settingsDraft.password,
        provider: "whitebooks",
        username: settingsDraft.username,
      }, requestOptions)
      setSettingsDraft((current) => ({ ...current, clientSecret: saved.clientSecret || current.clientSecret, password: saved.password || current.password }))
      await settingsQuery.refetch()
      await tokenQuery.refetch()
      toast.success("GST provider settings saved", { description: `${saved.environment} ${saved.gstin}` })
    } catch (error) {
      toast.error("GST settings not saved", { description: error instanceof Error ? error.message : "Please try again." })
    } finally {
      setIsSavingSettings(false)
    }
  }

  function applyChainedResponse(operation: GstComplianceOperation, response: unknown, input: { documentDate?: string | null; documentNo?: string | null; payload?: unknown }) {
    if (operation !== "generateIrn") return
    const irn = findNestedString(response, ["Irn", "IRN", "irn"])
    if (!irn) return
    const doc = invoiceDocumentDetails(input.payload)
    const docNo = doc.no || input.documentNo || ""
    const docDate = doc.date || input.documentDate || formatGstDate(today)
    const supplierGstin = settings?.gstin || "29AAGCB1286Q000"
    setQueryText((current) => ({
      ...current,
      getEinvoiceByIrn: stringify({ param1: irn }),
      getIrnByDocument: stringify({ param1: "INV", docnum: docNo, docdate: docDate }),
      getEwaybillByIrn: stringify({ param1: irn, supplier_gstn: supplierGstin }),
      getB2cQrCode: stringify({ sgstin: supplierGstin, docno: docNo, docdate: slashDateToDashDate(docDate), totinvval: "118", upiid: "", bankaccno: "5697389713210", bankifsccode: "SBIN11000", accountholdername: "ABCDE", igstamount: "18", cgstamount: "0", sgstamount: "0", cessamount: "0" }),
    }))
    setPayloadText((current) => ({
      ...current,
      cancelIrn: stringify({ Irn: irn, CnlRsn: "1", CnlRem: "GST cancellation test" }),
      generateEwaybillByIrn: stringify({ Irn: irn, Distance: 100, TransMode: "1", TransId: "29DPZPS4403C1ZF", TransName: "GST Transport", TransDocDt: docDate, TransDocNo: `EWB-${Date.now()}`, VehNo: "KA12ER1234", VehType: "R" }),
    }))
  }

  return (
    <div className="@container/main flex flex-1 flex-col gap-4 px-4 py-4 md:py-6 lg:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal">{showTenantSelector ? "WhiteBooks GST API Test" : "GST API"}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <Badge variant="outline" className={cn("rounded-md", (settings?.environment ?? selectedEnvironment) === "production" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-700")}>{settings?.environment ?? selectedEnvironment}</Badge>
            {showTenantSelector ? <span>{settings?.baseUrl ?? "WhiteBooks endpoint"}</span> : null}
            {settings?.isEnabled ? <Badge className="rounded-md bg-emerald-600">Enabled</Badge> : <Badge variant="destructive" className="rounded-md">Disabled</Badge>}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={() => void settingsQuery.refetch()}><RefreshCw className="size-4" />Refresh</Button>
          {showTenantSelector ? (
            <>
              <Button type="button" variant="outline" disabled={isRunning || !tenantReady} onClick={() => void runAll()}><ListChecks className="size-4" />Run all</Button>
              <Button type="button" disabled={isRunning || !tenantReady} onClick={() => void runSelected()}><Play className={cn("size-4", isRunning && "animate-spin")} />Run selected</Button>
            </>
          ) : (
            <Button type="button" disabled={isRunning || !tenantReady || !settingsDraft.gstin.trim()} onClick={() => void runHandshake()}><Play className={cn("size-4", isRunning && "animate-spin")} />Handshake</Button>
          )}
        </div>
      </div>

      <Card className="rounded-md border-border/70">
        <CardHeader className="border-b border-border/70 px-4 py-3">
          <CardTitle className="text-base">Provider Settings</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 p-4">
          {showTenantSelector ? (
            <div className="grid gap-3 md:grid-cols-[minmax(0,24rem)_1fr]">
              <SettingsField label="Tenant">
                <NativeSelect className="w-full" value={selectedTenantCode} onChange={(event) => setSelectedTenantCode(event.target.value)}>
                  {tenants.map((tenant) => (
                    <NativeSelectOption key={tenant.slug} value={tenant.slug}>{tenant.name} ({tenant.slug})</NativeSelectOption>
                  ))}
                </NativeSelect>
              </SettingsField>
              <div className="rounded-md border border-border/70 bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
                Super-admin tests run against the selected tenant database.
              </div>
            </div>
          ) : null}
          {allowEnvironmentSelect ? (
            <div className="grid gap-3 md:grid-cols-2">
              <SettingsField label="Environment">
                <NativeSelect className="w-full" value={settingsDraft.environment} onChange={(event) => setSettingsDraft((current) => ({ ...current, environment: event.target.value as "production" | "sandbox", baseUrl: defaultBaseUrl(event.target.value as "production" | "sandbox") }))}>
                  <NativeSelectOption value="production">Production</NativeSelectOption>
                  <NativeSelectOption value="sandbox">Sandbox</NativeSelectOption>
                </NativeSelect>
              </SettingsField>
              {showTenantSelector ? (
                <SettingsField label="GSP Credential Purpose">
                  <NativeSelect className="w-full" value={selectedPurpose} onChange={(event) => setSelectedPurpose(event.target.value as GstProviderPurpose)}>
                    <NativeSelectOption value="einvoice_eway">E-invoice + E-way</NativeSelectOption>
                    <NativeSelectOption value="eway_only">E-way only</NativeSelectOption>
                  </NativeSelect>
                </SettingsField>
              ) : null}
            </div>
          ) : null}
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="grid content-start gap-3">
              <SettingsField label="User Name">
                <Input value={settingsDraft.username} onChange={(event) => setSettingsDraft((current) => ({ ...current, username: event.target.value }))} placeholder="GST portal user name" />
              </SettingsField>
              <SettingsField label={`Password${settings?.hasPassword ? " saved" : ""}`}>
                <Input value={settingsDraft.password} onChange={(event) => setSettingsDraft((current) => ({ ...current, password: event.target.value }))} placeholder={settings?.hasPassword ? "Leave blank to keep saved" : "GST password"} />
              </SettingsField>
              <SettingsField label="GSTIN">
                <Input value={settingsDraft.gstin} onChange={(event) => setSettingsDraft((current) => ({ ...current, gstin: event.target.value.toUpperCase() }))} placeholder="33AAGCB1286Q003" />
              </SettingsField>
            </div>
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => settings && setSettingsDraft({ baseUrl: settings.baseUrl || defaultBaseUrl(allowEnvironmentSelect ? settings.environment : "production"), clientId: "", clientSecret: "", email: settings.email || "", environment: allowEnvironmentSelect ? settings.environment : "production", gstin: settings.gstin || "", ipAddress: settings.ipAddress || "0.0.0.0", isEnabled: true, password: settings.password || "", username: settings.username || "" })}>Reset</Button>
            <Button type="button" disabled={isSavingSettings || !tenantReady} onClick={() => void saveSettings()}>{isSavingSettings ? "Saving..." : "Save Settings"}</Button>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-md border-border/70">
        <CardContent className="grid gap-3 p-4 md:grid-cols-4">
          <StatusTile label="Token" value={tokenQuery.data?.hasToken ? "Generated" : "Not generated"} tone={tokenQuery.data?.hasToken && !tokenQuery.data.isExpired ? "good" : "warn"} />
          <StatusTile label="Generated token" value={tokenQuery.data?.tokenPreview || "-"} tone={tokenQuery.data?.hasToken && !tokenQuery.data.isExpired ? "good" : "warn"} />
          <StatusTile label="Token balance" value={formatTokenBalance(tokenQuery.data?.expiresInSeconds)} tone={tokenQuery.data?.hasToken && !tokenQuery.data.isExpired ? "good" : "warn"} />
          <StatusTile label="Token expiry" value={tokenQuery.data?.tokenExpiry ? formatDateTime(tokenQuery.data.tokenExpiry) : "-"} />
        </CardContent>
      </Card>

      {showTenantSelector ? (
      <div className="grid gap-4 xl:grid-cols-[24rem_minmax(0,1fr)]">
        <Card className="rounded-md border-border/70">
          <CardHeader className="border-b border-border/70 px-4 py-3">
            <CardTitle className="flex items-center gap-2 text-base"><Server className="size-4" />APIs</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 p-3">
            {operationDefinitions.map((definition) => {
              const result = results[definition.name]
              return (
                <button
                  className={cn("grid min-h-[4.5rem] w-full grid-cols-[minmax(0,1fr)_1.25rem] items-center gap-3 rounded-md border px-3 py-2 text-left text-sm transition-colors", activeOperation === definition.name ? "border-emerald-300 bg-emerald-50 text-emerald-950" : "border-border/70 hover:bg-muted/50")}
                  key={definition.name}
                  onClick={() => setActiveOperation(definition.name)}
                  type="button"
                >
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{definition.name}</span>
                    <span className="block truncate text-xs text-muted-foreground">{definition.method} {definition.description}</span>
                    <span className="mt-1 block truncate font-mono text-[11px] text-muted-foreground">{definition.endpoint}</span>
                  </span>
                  <span className="grid size-5 place-items-center">
                    {result ? result.ok ? <CheckCircle2 className="size-4 text-emerald-600" /> : <XCircle className="size-4 text-destructive" /> : null}
                  </span>
                </button>
              )
            })}
          </CardContent>
        </Card>

        <div className="grid gap-4">
          <Card className="rounded-md border-border/70">
            <CardHeader className="flex flex-row items-start justify-between gap-3 border-b border-border/70 px-4 py-3">
              <div>
                <CardTitle className="text-base">{activeDefinition.name}</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">{activeDefinition.method} {activeDefinition.description}</p>
                <p className="mt-2 max-w-[58rem] truncate font-mono text-xs text-muted-foreground">{activeUrl}</p>
              </div>
              <Button type="button" variant="outline" onClick={resetActive}>Reset JSON</Button>
            </CardHeader>
            <CardContent className="grid gap-4 p-4 lg:grid-cols-3">
              <JsonEditor label="Query JSON" value={queryText[activeOperation] ?? "{}"} onChange={(value) => setQueryText((current) => ({ ...current, [activeOperation]: value }))} />
              <JsonEditor label="Payload JSON" value={payloadText[activeOperation] ?? "null"} onChange={(value) => setPayloadText((current) => ({ ...current, [activeOperation]: value }))} />
              <JsonEditor label="Source JSON" value={sourceText[activeOperation] ?? "{}"} onChange={(value) => setSourceText((current) => ({ ...current, [activeOperation]: value }))} />
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="rounded-md border-border/70">
              <CardHeader className="border-b border-border/70 px-4 py-3">
                <CardTitle className="text-base">Result</CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <pre className="max-h-[32rem] overflow-auto rounded-md bg-muted/50 p-3 text-xs leading-5">{activeResult ? stringify(activeResult) : "No response yet."}</pre>
              </CardContent>
            </Card>

            <Card className="rounded-md border-border/70">
              <CardHeader className="border-b border-border/70 px-4 py-3">
                <CardTitle className="text-base">Recent Calls</CardTitle>
              </CardHeader>
              <CardContent className="grid max-h-[32rem] gap-2 overflow-auto p-3">
                {(historyQuery.data ?? []).slice(0, 20).map((item) => (
                  <button className="rounded-md border border-border/70 px-3 py-2 text-left text-sm hover:bg-muted/50" key={item.uuid} onClick={() => setActiveOperation(item.operation)} type="button">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">{item.operation}</span>
                      <Badge variant={item.success ? "outline" : "destructive"} className="rounded-md">{item.success ? "ok" : "failed"}</Badge>
                    </div>
                    <div className="mt-1 truncate text-xs text-muted-foreground">{item.httpStatus ?? "-"} {item.endpoint}</div>
                    {item.errorMessage ? <div className="mt-1 truncate text-xs text-destructive">{item.errorMessage}</div> : null}
                  </button>
                ))}
                {historyQuery.data?.length ? null : <p className="p-2 text-sm text-muted-foreground">No GST API calls recorded yet.</p>}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      ) : (
        <Card className="rounded-md border-border/70">
          <CardHeader className="border-b border-border/70 px-4 py-3">
            <CardTitle className="text-base">GSTIN Smoke Test</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 p-4 lg:grid-cols-[minmax(0,24rem)_1fr]">
            <div className="rounded-md border border-border/70 bg-muted/30 px-3 py-2">
              <div className="text-sm font-medium">gstnDetails</div>
              <div className="mt-1 text-xs text-muted-foreground">GET GSTIN profile lookup after token generation.</div>
              <div className="mt-2 font-mono text-xs text-muted-foreground">param1: {settingsDraft.gstin || "-"}</div>
            </div>
            <pre className="max-h-[24rem] overflow-auto rounded-md bg-muted/50 p-3 text-xs leading-5">{handshakeResult ? stringify(handshakeResult) : "No handshake response yet."}</pre>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function JsonEditor({ label, onChange, value }: { label: string; onChange(value: string): void; value: string }) {
  return (
    <div className="grid gap-2">
      <Label>{label}</Label>
      <Textarea className="min-h-56 resize-y font-mono text-xs leading-5" spellCheck={false} value={value} onChange={(event) => onChange(event.target.value)} />
    </div>
  )
}

function SettingsField({ children, className, label }: { children: ReactNode; className?: string; label: string }) {
  return (
    <div className={cn("grid gap-2", className)}>
      <Label>{label}</Label>
      {children}
    </div>
  )
}

function StatusTile({ label, tone, value }: { label: string; tone?: "good" | "warn"; value: string }) {
  return (
    <div className="rounded-md border border-border/70 bg-background px-3 py-2">
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <div className={cn("mt-1 truncate text-sm font-semibold", tone === "good" && "text-emerald-700", tone === "warn" && "text-amber-700")}>{value}</div>
    </div>
  )
}

function emptySettingsDraft(environment: "production" | "sandbox" = "production"): SettingsDraft {
  return {
    baseUrl: defaultBaseUrl(environment),
    clientId: "",
    clientSecret: "",
    email: "",
    environment,
    gstin: "",
    ipAddress: "0.0.0.0",
    isEnabled: true,
    password: "",
    username: "",
  }
}

function defaultBaseUrl(environment: "production" | "sandbox") {
  return environment === "production" ? "https://api.whitebooks.in" : "https://apisandbox.whitebooks.in"
}

function initialEnvironment(preferredEnvironment: "production" | "sandbox", tenantCode: string, showTenantSelector: boolean) {
  if (showTenantSelector) return preferredEnvironment
  const stored = localStorage.getItem(gstEnvironmentStorageKey(tenantCode))
  return stored === "sandbox" || stored === "production" ? stored : preferredEnvironment
}

function gstEnvironmentStorageKey(tenantCode: string) {
  return `gst-api-environment:${tenantCode}`
}

function definitionMap(kind: "payload" | "query" = "query") {
  return Object.fromEntries(operationDefinitions.map((definition) => [definition.name, stringify(kind === "payload" ? definition.payload : definition.query)])) as Record<GstComplianceOperation, string>
}

function sourceMap() {
  return Object.fromEntries(operationDefinitions.map((definition) => [definition.name, stringify(defaultSource(definition))])) as Record<GstComplianceOperation, string>
}

function defaultSource(definition: OperationDefinition) {
  return {
    documentDate: definition.documentDate ?? null,
    documentNo: definition.documentNo ?? null,
    sourceType: definition.sourceType ?? null,
  }
}

function parseJsonObject(value: string, label: string): Record<string, unknown> {
  const parsed = parseJsonValue(value, label)
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error(`${label} must be a JSON object.`)
  return parsed as Record<string, unknown>
}

function parseJsonValue(value: string, label: string): unknown {
  try {
    return JSON.parse(value)
  } catch {
    throw new Error(`${label} is not valid JSON.`)
  }
}

function stringify(value: unknown) {
  return JSON.stringify(value, null, 2)
}

function operationUrl(baseUrl: string | null | undefined, endpoint: string, queryText: string | undefined, email: string | null | undefined, environment: "production" | "sandbox" = "production") {
  const root = (baseUrl || defaultBaseUrl(environment)).replace(/\/+$/, "")
  const query = safeJsonObject(queryText)
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    if (value === null || value === undefined || value === "") continue
    if (["docnum", "docdate", "sgstin", "docno", "totinvval", "upiid", "bankaccno", "bankifsccode", "accountholdername", "igstamount", "cgstamount", "sgstamount", "cessamount"].includes(key)) continue
    params.set(key, String(value))
  }
  if (email) params.set("email", email)
  const suffix = params.toString()
  return `${root}${endpoint}${suffix ? `?${suffix}` : ""}`
}

function safeJsonObject(value: string | undefined): Record<string, unknown> {
  if (!value) return {}
  try {
    const parsed = JSON.parse(value) as unknown
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {}
  } catch {
    return {}
  }
}

function formatGstDate(value: string) {
  const [year, month, day] = value.split("-")
  return `${day}/${month}/${year}`
}

function formatQrDate(value: string) {
  const [year, month, day] = value.split("-")
  return `${day}-${month}-${year}`
}

function slashDateToDashDate(value: string) {
  return value.replaceAll("/", "-")
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value))
}

function formatTokenBalance(value: number | null | undefined) {
  if (value === null || value === undefined) return "-"
  if (value <= 0) return "Expired"
  const hours = Math.floor(value / 3600)
  const minutes = Math.floor((value % 3600) / 60)
  if (hours > 0) return `${hours}h ${minutes}m left`
  return `${minutes}m left`
}

function sampleInvoicePayload() {
  const docNo = `GST-${today.replaceAll("-", "")}`
  return {
    Version: "1.1",
    TranDtls: { TaxSch: "GST", SupTyp: "B2B", RegRev: "N", IgstOnIntra: "N" },
    DocDtls: { Typ: "INV", No: docNo, Dt: formatGstDate(today) },
    SellerDtls: { Gstin: "29AAGCB1286Q000", LglNm: "ABC company pvt ltd", TrdNm: "NIC Industries", Addr1: "5th block, kuvempu layout", Addr2: "kuvempu layout", Loc: "GANDHINAGAR", Pin: 560001, Stcd: "29", Ph: "9000000000", Em: "abc@gmail.com" },
    BuyerDtls: { Gstin: "29AWGPV7107B1Z1", LglNm: "XYZ company pvt ltd", TrdNm: "XYZ Industries", Pos: "37", Addr1: "7th block, kuvempu layout", Addr2: "kuvempu layout", Loc: "GANDHINAGAR", Pin: 560004, Stcd: "29", Ph: "9000000000", Em: "abc@gmail.com" },
    ItemList: [{ SlNo: "1", PrdDesc: "Rice", IsServc: "N", HsnCd: "100610", Qty: 1, Unit: "NOS", UnitPrice: 100, TotAmt: 100, Discount: 0, AssAmt: 100, GstRt: 18, IgstAmt: 18, CgstAmt: 0, SgstAmt: 0, TotItemVal: 118 }],
    ValDtls: { AssVal: 100, CgstVal: 0, SgstVal: 0, IgstVal: 18, Discount: 0, OthChrg: 0, RndOffAmt: 0, TotInvVal: 118 },
  }
}

function preparePayload(operation: GstComplianceOperation, payload: unknown) {
  if (operation !== "generateIrn" || !payload || typeof payload !== "object" || Array.isArray(payload)) return payload
  const next = structuredClone(payload) as Record<string, unknown>
  const doc = next.DocDtls && typeof next.DocDtls === "object" && !Array.isArray(next.DocDtls) ? next.DocDtls as Record<string, unknown> : {}
  doc.No = `GST-${new Date().toISOString().replace(/\D/g, "").slice(4, 14)}`
  doc.Dt = formatGstDate(today)
  next.DocDtls = doc
  return next
}

function invoiceDocumentDetails(payload: unknown) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return { date: "", no: "" }
  const doc = (payload as Record<string, unknown>).DocDtls
  if (!doc || typeof doc !== "object" || Array.isArray(doc)) return { date: "", no: "" }
  const record = doc as Record<string, unknown>
  return { date: typeof record.Dt === "string" ? record.Dt : "", no: typeof record.No === "string" ? record.No : "" }
}

function findNestedString(value: unknown, keys: string[]): string {
  if (!value || typeof value !== "object") return ""
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findNestedString(item, keys)
      if (found) return found
    }
    return ""
  }
  const record = value as Record<string, unknown>
  for (const key of keys) {
    const entry = record[key]
    if (typeof entry === "string" && entry.trim()) return entry.trim()
  }
  for (const entry of Object.values(record)) {
    const found = findNestedString(entry, keys)
    if (found) return found
  }
  return ""
}
