import { useEffect, useMemo, useState, type ReactNode } from "react"
import { Save } from "lucide-react"
import { toast } from "sonner"
import { AnimatedTabs } from "src/components/ui/animated-tabs"
import { Badge } from "src/components/ui/badge"
import { Button } from "src/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "src/components/ui/card"
import { Switch } from "src/components/ui/switch"
import { MasterListPageFrame } from "src/components/blocks/lists/master-list"
import type { AuthSession } from "src/features/auth/auth-client"
import { cn } from "src/lib/utils"
import {
  documentNumberKindOrder,
  documentNumberLabels,
  listDocumentNumberSettings,
  saveDocumentNumberSettings,
  type DocumentNumberSetting,
  type DocumentNumberSettingInput,
} from "./document-settings-client"
import { type SoftwareToggleSetting } from "./software-settings"
import {
  updateCustomiseSetting,
  updateFeatureSetting,
  updateSalesBillingLayoutSetting,
  updateSalesPrintingOption,
  updateSalesPrintingSetting,
} from "./software-settings-service"
import { useCompanySoftwareSettings } from "./use-company-software-settings"

export function SalesSettingsPage({ session }: { session: AuthSession }) {
  const [state, setState, context] = useCompanySoftwareSettings(session)

  return (
    <MasterListPageFrame
      action={
        <Button className="h-9 rounded-md" disabled={!context.isLoaded} onClick={() => void context.saveNow()}>
          <Save className="size-4" />
          Publish live
        </Button>
      }
      description={`Configure sales layout, customisation, and print controls for ${context.companyName}.`}
      technicalName="page.settings.sales"
      title="Sales Settings"
    >
      <AnimatedTabs
        tabs={[
          {
            value: "layout",
            label: "Layout",
            content: (
              <SettingsCard title="Sales Layout" description="Toggle fields used by sales entry and print screens.">
                {state.salesBillingLayout.map((setting) => (
                  <SettingSwitchRow key={setting.id} setting={setting} onToggle={(enabled) => setState((current) => updateSalesBillingLayoutSetting(current, setting.id, enabled))} />
                ))}
              </SettingsCard>
            ),
          },
          {
            value: "printing",
            label: "Printing",
            content: (
              <SettingsCard title="Sales Printing" description="Control presentation options for sales invoice printing.">
                {state.salesPrintingSettings.map((setting) => (
                  <SettingSwitchRow key={setting.id} setting={setting} onToggle={(enabled) => setState((current) => updateSalesPrintingSetting(current, setting.id, enabled))} />
                ))}
                <label className="grid gap-2 rounded-md border border-border/70 bg-background px-4 py-3">
                  <span className="text-sm font-medium text-foreground">Custom terms</span>
                  <textarea className="min-h-24 resize-y rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-foreground/40" value={state.salesPrintingOptions.customTerms} onChange={(event) => setState((current) => updateSalesPrintingOption(current, event.target.value))} />
                </label>
              </SettingsCard>
            ),
          },
          {
            value: "customise",
            label: "Customise",
            content: (
              <div className="grid gap-4">
                {state.customiseGroups.map((group) => (
                  <SettingsCard key={group.id} title={group.title} description={group.description}>
                    {group.settings.map((setting) => (
                      <SettingSwitchRow key={setting.id} setting={setting} onToggle={(enabled) => setState((current) => updateCustomiseSetting(current, setting.id, enabled))} />
                    ))}
                  </SettingsCard>
                ))}
              </div>
            ),
          },
          {
            value: "features",
            label: "Features",
            content: (
              <div className="grid gap-3">
                {state.features.map((setting) => (
                  <SettingSwitchRow key={setting.id} setting={setting} onToggle={(enabled) => setState((current) => updateFeatureSetting(current, setting.id, enabled))} />
                ))}
              </div>
            ),
          },
        ]}
      />
    </MasterListPageFrame>
  )
}

export function DocumentSettingsPage({ session }: { session: AuthSession }) {
  const [records, setRecords] = useState<readonly DocumentNumberSetting[]>([])
  const [drafts, setDrafts] = useState<Record<string, DocumentNumberSettingInput>>({})

  useEffect(() => {
    const controller = new AbortController()
    void listDocumentNumberSettings(session, { signal: controller.signal })
      .then((settings) => {
        setRecords(settings)
        setDrafts(Object.fromEntries(settings.map((setting) => [setting.kind, toInput(setting)])))
      })
      .catch((error) => {
        if (!isAbortError(error)) toast.error("Could not load document settings", { description: error instanceof Error ? error.message : "Please try again." })
      })
    return () => controller.abort()
  }, [session])

  const orderedDrafts = useMemo(() => documentNumberKindOrder.map((kind) => drafts[kind]).filter(Boolean), [drafts])

  async function save() {
    try {
      const saved = await saveDocumentNumberSettings(session, orderedDrafts)
      setRecords(saved)
      setDrafts(Object.fromEntries(saved.map((setting) => [setting.kind, toInput(setting)])))
      toast.success("Document settings saved")
    } catch (error) {
      toast.error("Could not save document settings", { description: error instanceof Error ? error.message : "Please try again." })
    }
  }

  return (
    <MasterListPageFrame
      action={<Button className="h-9 rounded-md" onClick={() => void save()} disabled={orderedDrafts.length === 0}><Save className="size-4" />Save</Button>}
      description="Configure automatic document numbers for sales, purchase, payment, and receipt vouchers."
      technicalName="page.settings.document-settings"
      title="Document Settings"
    >
      <div className="grid gap-4">
        {documentNumberKindOrder.map((kind) => {
          const draft = drafts[kind]
          const record = records.find((item) => item.kind === kind)
          if (!draft) return null
          return (
            <Card key={kind} className="rounded-md border-border/70">
              <CardHeader className="pb-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-base">{documentNumberLabels[kind]}</CardTitle>
                    <CardDescription>Next automatic number: {preview(draft)}</CardDescription>
                  </div>
                  <label className="flex items-center gap-3 text-sm font-medium">
                    <span>{draft.autoEnabled ? "Automatic" : "Manual only"}</span>
                    <Switch checked={draft.autoEnabled} onCheckedChange={(autoEnabled) => setDraft(kind, { ...draft, autoEnabled })} />
                  </label>
                </div>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-4">
                <DocField label="Prefix" value={draft.prefix} onChange={(value) => setDraft(kind, { ...draft, prefix: value.toUpperCase() })} />
                <DocField label="Separator" value={draft.separator} onChange={(value) => setDraft(kind, { ...draft, separator: value.slice(0, 3) })} />
                <DocField label="Next number" type="number" value={String(draft.nextNumber)} onChange={(value) => setDraft(kind, { ...draft, nextNumber: Number(value || 1) })} />
                <DocField label="Padding" type="number" value={String(draft.padding)} onChange={(value) => setDraft(kind, { ...draft, padding: Number(value || 1) })} />
                <div className="rounded-md border border-border/70 bg-muted/20 px-3 py-2 text-sm text-muted-foreground md:col-span-4">
                  Saved preview: <span className="font-medium text-foreground">{record?.preview ?? "-"}</span>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </MasterListPageFrame>
  )

  function setDraft(kind: string, input: DocumentNumberSettingInput) {
    setDrafts((current) => ({ ...current, [kind]: sanitizeInput(input) }))
  }
}

function SettingsCard({ children, description, title }: { children: ReactNode; description: string; title: string }) {
  return (
    <Card className="rounded-md border-border/70">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">{children}</CardContent>
    </Card>
  )
}

function SettingSwitchRow({ setting, onToggle }: { setting: SoftwareToggleSetting; onToggle(enabled: boolean): void }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-md border border-border/70 bg-card px-4 py-3 shadow-sm">
      <div className="min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-medium text-foreground">{setting.label}</p>
          <Badge className={cn("rounded-md border px-2 py-0.5 text-[11px] capitalize", setting.scope === "industry" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-sky-200 bg-sky-50 text-sky-700")} variant="outline">
            {setting.scope}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">{setting.description}</p>
      </div>
      <Switch checked={setting.enabled} aria-label={setting.label} onCheckedChange={onToggle} />
    </div>
  )
}

function DocField({ label, onChange, type = "text", value }: { label: string; onChange(value: string): void; type?: "number" | "text"; value: string }) {
  return (
    <label className="grid gap-2 rounded-md border border-border/70 bg-background px-3 py-3">
      <span className="text-sm font-medium text-foreground">{label}</span>
      <input className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus:border-foreground/40" min={type === "number" ? 1 : undefined} type={type} value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  )
}

function toInput(setting: DocumentNumberSetting): DocumentNumberSettingInput {
  return {
    autoEnabled: setting.autoEnabled,
    kind: setting.kind,
    nextNumber: setting.nextNumber,
    padding: setting.padding,
    prefix: setting.prefix,
    separator: setting.separator,
  }
}

function sanitizeInput(input: DocumentNumberSettingInput): DocumentNumberSettingInput {
  return {
    ...input,
    nextNumber: Math.max(1, Math.floor(Number(input.nextNumber || 1))),
    padding: Math.max(1, Math.min(12, Math.floor(Number(input.padding || 1)))),
    prefix: input.prefix.trim().toUpperCase(),
    separator: input.separator || "-",
  }
}

function preview(input: DocumentNumberSettingInput) {
  const serial = String(input.nextNumber).padStart(input.padding, "0")
  return [input.prefix.trim(), serial].filter(Boolean).join(input.separator || "-")
}

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === "AbortError"
}
