import { useEffect, useMemo, useState, type ReactNode } from "react"
import { Save } from "lucide-react"
import { toast } from "sonner"
import { AnimatedTabs } from "src/components/ui/animated-tabs"
import { Badge } from "src/components/ui/badge"
import { Button } from "src/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "src/components/ui/card"
import { Switch } from "src/components/ui/switch"
import { NativeSelect, NativeSelectOption } from "src/components/ui/native-select"
import { MasterListPageFrame } from "src/components/blocks/lists/master-list"
import { LetterheadBuilder } from "src/features/company/letterhead-builder"
import type { AuthSession } from "src/features/auth/auth-client"
import { cn } from "src/lib/utils"
import {
  documentNumberKindOrder,
  documentNumberLabels,
  listDocumentNumberSettings,
  saveDocumentNumberSettings,
  type DocumentEntryKind,
  type DocumentNumberSetting,
  type DocumentNumberSettingInput,
} from "./document-settings-client"
import { type SoftwareToggleSetting } from "./software-settings"
import {
  updateCustomiseSetting,
  updateFeatureSetting,
  updateLetterheadSetting,
  updateSalesBillingLayoutSetting,
  updateSalesPrintingOption,
  updateSalesPrintingSetting,
} from "./software-settings-service"
import { useCompanySoftwareSettings } from "./use-company-software-settings"

export function SalesSettingsPage({ session }: { session: AuthSession }) {
  const [state, setState, context] = useCompanySoftwareSettings(session)

  function toggleFeature(settingId: string, enabled: boolean) {
    setState((current) => {
      const nextState = updateFeatureSetting(current, settingId, enabled)
      if (context.isLoaded) {
        void context.saveNow(nextState).catch((error) => {
          toast.error("Feature setting not saved", { description: error instanceof Error ? error.message : "Please try again." })
        })
      }
      return nextState
    })
  }

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
                <label className="grid gap-2 rounded-md border border-border/70 bg-background px-4 py-3">
                  <span className="text-sm font-medium text-foreground">GST API mode</span>
                  <NativeSelect className="w-full" value={state.salesGstApiMode} onChange={(event) => setState((current) => ({ ...current, salesGstApiMode: event.target.value === "eway_only" ? "eway_only" : "einvoice_eway" }))}>
                    <NativeSelectOption value="einvoice_eway">E-invoice + E-way</NativeSelectOption>
                    <NativeSelectOption value="eway_only">E-way only</NativeSelectOption>
                  </NativeSelect>
                </label>
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
                <LetterheadDesigner company={context.company} state={state} setState={setState} />
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
                  <SettingSwitchRow key={setting.id} setting={setting} onToggle={(enabled) => toggleFeature(setting.id, enabled)} />
                ))}
              </div>
            ),
          },
        ]}
      />
    </MasterListPageFrame>
  )
}

function LetterheadDesigner({ company, setState, state }: { company: ReturnType<typeof useCompanySoftwareSettings>[2]["company"]; setState: ReturnType<typeof useCompanySoftwareSettings>[1]; state: ReturnType<typeof useCompanySoftwareSettings>[0] }) {
  const value = state.letterheadSettings
  return (
    <div className="grid gap-3 rounded-md border border-border/70 bg-background px-4 py-3">
      <div className="overflow-hidden rounded-md border bg-white text-black shadow-sm" style={{ borderColor: value.borderColor }}>
        <LetterheadBuilder company={company} settings={value} />
      </div>
      <div>
        <p className="text-sm font-medium text-foreground">Letterhead Designer</p>
        <p className="text-xs text-muted-foreground">Used by sales, purchase, receipt, payment, stock documents, and statements.</p>
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <DesignerField label="Company font" value={value.companyNameFontFamily} onChange={(next) => setState((current) => updateLetterheadSetting(current, "companyNameFontFamily", next))} />
        <DesignerField label="Address font" value={value.addressFontFamily} onChange={(next) => setState((current) => updateLetterheadSetting(current, "addressFontFamily", next))} />
        <DesignerField label="Company size" type="number" value={String(value.companyNameFontSize)} onChange={(next) => setState((current) => updateLetterheadSetting(current, "companyNameFontSize", Number(next || 0)))} />
        <DesignerField label="Address size" type="number" value={String(value.addressFontSize)} onChange={(next) => setState((current) => updateLetterheadSetting(current, "addressFontSize", Number(next || 0)))} />
        <DesignerField label="Contact size" type="number" value={String(value.contactFontSize)} onChange={(next) => setState((current) => updateLetterheadSetting(current, "contactFontSize", Number(next || 0)))} />
        <DesignerField label="Tax size" type="number" value={String(value.taxFontSize)} onChange={(next) => setState((current) => updateLetterheadSetting(current, "taxFontSize", Number(next || 0)))} />
        <DesignerField label="Header height mm" type="number" value={String(value.heightMm)} onChange={(next) => setState((current) => updateLetterheadSetting(current, "heightMm", Number(next || 0)))} />
        <DesignerField label="Logo height mm" type="number" value={String(value.logoHeightMm)} onChange={(next) => setState((current) => updateLetterheadSetting(current, "logoHeightMm", Number(next || 0)))} />
        <DesignerField label="Logo width mm" type="number" value={String(value.logoWidthMm)} onChange={(next) => setState((current) => updateLetterheadSetting(current, "logoWidthMm", Number(next || 0)))} />
        <DesignerField label="Logo left mm" type="number" value={String(value.logoLeftMm)} onChange={(next) => setState((current) => updateLetterheadSetting(current, "logoLeftMm", Number(next || 0)))} />
        <DesignerField label="Logo top mm" type="number" value={String(value.logoTopMm)} onChange={(next) => setState((current) => updateLetterheadSetting(current, "logoTopMm", Number(next || 0)))} />
        <DesignerField label="Company color" type="color" value={value.companyNameColor} onChange={(next) => setState((current) => updateLetterheadSetting(current, "companyNameColor", next))} />
        <DesignerField label="Address color" type="color" value={value.addressColor} onChange={(next) => setState((current) => updateLetterheadSetting(current, "addressColor", next))} />
        <DesignerField label="Border color" type="color" value={value.borderColor} onChange={(next) => setState((current) => updateLetterheadSetting(current, "borderColor", next))} />
      </div>
    </div>
  )
}

function DesignerField({ label, onChange, type = "text", value }: { label: string; onChange(value: string): void; type?: "color" | "number" | "text"; value: string }) {
  return (
    <label className="grid gap-1.5 text-sm">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <input className="h-9 rounded-md border border-input bg-background px-2 text-sm outline-none focus:border-foreground/40" type={type} value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  )
}

export function DocumentSettingsPage({ exportSalesEnabled = true, session }: { exportSalesEnabled?: boolean; session: AuthSession }) {
  return (
    <DocumentNumberSettingsPage
      description="Configure automatic document numbers for billing vouchers, cash book, and bank book."
      kinds={exportSalesEnabled ? documentNumberKindOrder : documentNumberKindOrder.filter((kind) => kind !== "exportSales")}
      session={session}
      technicalName="page.settings.document-settings"
      title="Document Settings"
    />
  )
}

export function InventoryDocumentSettingsPage({ session }: { session: AuthSession }) {
  return (
    <DocumentNumberSettingsPage
      description="Configure automatic document numbers for inventory stock documents."
      kinds={["purchaseReceipt", "deliveryNote"]}
      session={session}
      technicalName="page.inventory.settings.document-settings"
      title="Inventory Document Settings"
    />
  )
}

function DocumentNumberSettingsPage({
  description,
  kinds,
  session,
  technicalName,
  title,
}: {
  description: string
  kinds: readonly DocumentEntryKind[]
  session: AuthSession
  technicalName: string
  title: string
}) {
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

  const orderedDrafts = useMemo(() => kinds.map((kind) => drafts[kind]).filter(Boolean), [drafts, kinds])

  async function save() {
    try {
      const saved = await saveDocumentNumberSettings(session, orderedDrafts)
      setRecords(saved)
      setDrafts((current) => ({ ...current, ...Object.fromEntries(saved.map((setting) => [setting.kind, toInput(setting)])) }))
      toast.success("Document settings saved")
    } catch (error) {
      toast.error("Could not save document settings", { description: error instanceof Error ? error.message : "Please try again." })
    }
  }

  return (
    <MasterListPageFrame
      action={<Button className="h-9 rounded-md" onClick={() => void save()} disabled={orderedDrafts.length === 0}><Save className="size-4" />Save</Button>}
      description={description}
      technicalName={technicalName}
      title={title}
    >
      <div className="grid gap-4">
        {kinds.map((kind) => {
          const draft = drafts[kind]
          const record = records.find((item) => item.kind === kind)
          if (!draft) return null
          return (
            <Card key={kind} className="rounded-md border-border/70">
              <CardHeader className="px-4 py-3">
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
              <CardContent className="grid min-w-0 gap-3 px-4 pb-4 pt-0 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                <DocField enabled={draft.prefixEnabled} label="Prefix" value={draft.prefix} onChange={(value) => setDraft(kind, { ...draft, prefix: value.toUpperCase() })} onEnabledChange={(prefixEnabled) => setDraft(kind, { ...draft, prefixEnabled })} />
                <DocField enabled={draft.separatorEnabled} label="Separator" value={draft.separator} onChange={(value) => setDraft(kind, { ...draft, separator: value.slice(0, 3) })} onEnabledChange={(separatorEnabled) => setDraft(kind, { ...draft, separatorEnabled })} />
                <DocField enabled={draft.suffixEnabled} label="Suffix" value={draft.suffix} onChange={(value) => setDraft(kind, { ...draft, suffix: value.toUpperCase() })} onEnabledChange={(suffixEnabled) => setDraft(kind, { ...draft, suffixEnabled })} />
                <DocField label="Next number" type="number" value={String(draft.nextNumber)} onChange={(value) => setDraft(kind, { ...draft, nextNumber: Number(value || 1) })} />
                <DocField label="Padding" type="number" value={String(draft.padding)} onChange={(value) => setDraft(kind, { ...draft, padding: Number(value || 1) })} />
                <div className="min-w-0 rounded-md border border-border/70 bg-muted/20 px-3 py-2 text-sm text-muted-foreground sm:col-span-2 lg:col-span-3 xl:col-span-5">
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

function DocField({ enabled, label, onChange, onEnabledChange, type = "text", value }: { enabled?: boolean; label: string; onChange(value: string): void; onEnabledChange?(enabled: boolean): void; type?: "number" | "text"; value: string }) {
  return (
    <label className="grid min-w-0 gap-2 rounded-md border border-border/70 bg-background px-3 py-2.5">
      <span className="flex items-center justify-between gap-3 text-sm font-medium text-foreground">
        {label}
        {onEnabledChange ? <Switch checked={Boolean(enabled)} onCheckedChange={onEnabledChange} /> : null}
      </span>
      <input className="h-9 min-w-0 rounded-md border border-input bg-background px-3 text-sm outline-none focus:border-foreground/40 disabled:bg-muted/40 disabled:text-muted-foreground" disabled={onEnabledChange ? !enabled : false} min={type === "number" ? 1 : undefined} type={type} value={value} onChange={(event) => onChange(event.target.value)} />
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
    prefixEnabled: setting.prefixEnabled,
    separator: setting.separator,
    separatorEnabled: setting.separatorEnabled,
    suffix: setting.suffix,
    suffixEnabled: setting.suffixEnabled,
  }
}

function sanitizeInput(input: DocumentNumberSettingInput): DocumentNumberSettingInput {
  return {
    ...input,
    nextNumber: Math.max(1, Math.floor(Number(input.nextNumber || 1))),
    padding: Math.max(1, Math.min(12, Math.floor(Number(input.padding || 1)))),
    prefix: input.prefix.trim().toUpperCase(),
    prefixEnabled: Boolean(input.prefixEnabled),
    separator: input.separator || "-",
    separatorEnabled: Boolean(input.separatorEnabled),
    suffix: input.suffix.trim().toUpperCase(),
    suffixEnabled: Boolean(input.suffixEnabled),
  }
}

function preview(input: DocumentNumberSettingInput) {
  const serial = String(input.nextNumber).padStart(input.padding, "0")
  const prefix = input.prefixEnabled ? input.prefix.trim() : ""
  const suffix = input.suffixEnabled ? input.suffix.trim() : ""
  const separator = input.separatorEnabled ? input.separator : ""
  return [prefix, serial, suffix].filter(Boolean).join(separator)
}

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === "AbortError"
}
