"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  CheckCircle2,
  Circle,
  Dot,
  FileKey2,
  Grid3X3,
  Inbox,
  LayoutDashboard,
  Landmark,
  LibraryBig,
  Mail,
  ReceiptText,
  RefreshCcw,
  Save,
  ScrollText,
} from "lucide-react";
import {
  AnimatedTabs,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CommonListPageFrame,
  Switch,
  cn,
} from "@cxnext/ui";
import {
  hasPublishedCompanySoftwareSettings,
  loadCompanySoftwareSettings,
  loadCompanySoftwareSettingsFromServer,
  saveCompanySoftwareSettings,
  saveCompanySoftwareSettingsToServer,
  updateCustomiseSetting,
  updateDutiesTaxSetting,
  updateFeatureSetting,
  updateFavoriteDashboardApp,
  updateSalesBillingLayoutSetting,
  updateSalesPrintingOption,
  updateSalesPrintingSetting,
} from "../../application/software-settings-service";
import { useCompanySoftwareSettingsState } from "../../application/use-company-software-settings-state";
import {
  defaultSoftwareSettingsState,
  type DutiesTaxSettings,
  type FavoriteDashboardApp,
  type SoftwareSettingsState,
  type SoftwareToggleSetting,
} from "../../domain/software-settings";
import { getCoreEnvSettings, type CoreEnvGroup } from "../../infrastructure/core-settings-api";
import { readStoredApplicationContext, readStoredAuthSession } from "../../../auth/infrastructure/session-storage";
import { formatMoney } from "../../../sales/application/sales-service";

export function SettingsIndexPage() {
  const [canRunSystemUpdate, setCanRunSystemUpdate] = useState(false);

  useEffect(() => {
    const session = readStoredAuthSession();
    setCanRunSystemUpdate(session?.user.roles.some((role) => role.key === "super_admin") ?? false);
  }, []);

  return (
    <CommonListPageFrame
      description="Configure software behavior and feature availability for the active application context."
      technicalName="page.settings.index"
      title="Settings"
    >
      <div className="grid gap-4 md:grid-cols-2">
        <SettingsLinkCard
          description="Enable application modules from a grouped app catalog."
          href="/desk/settings/apps"
          icon={<Grid3X3 className="size-5" />}
          title="Apps"
        />
        <SettingsLinkCard
          description="Choose the default favorite app shown first in the application dashboard workspace."
          href="/desk/settings/dashboard"
          icon={<LayoutDashboard className="size-5" />}
          title="Dashboard"
        />
        <SettingsLinkCard
          description="Configure SMTP sender overrides, queue-backed test mail, and template preview."
          href="/desk/settings/mail"
          icon={<Mail className="size-5" />}
          title="Mail"
        />
        <SettingsLinkCard
          description="Upload and manage public or private storage assets, including logo files."
          href="/desk/settings/media"
          icon={<LibraryBig className="size-5" />}
          title="Media Manager"
        />
        <SettingsLinkCard
          description="Operate persisted local queue jobs now, with a path to BullMQ and Redis later."
          href="/desk/settings/queue"
          icon={<Inbox className="size-5" />}
          title="Queue Manager"
        />
        <SettingsLinkCard
          description="Edit grouped runtime .env values for application, frontend, backend, database, and security."
          href="/desk/settings/core"
          icon={<FileKey2 className="size-5" />}
          title="Core Settings"
        />
        <SettingsLinkCard
          description="Configure sales billing item fields by selected industry."
          href="/desk/settings/billing-layout"
          icon={<ReceiptText className="size-5" />}
          title="Sales Settings"
        />
        <SettingsLinkCard
          description="Configure automatic numbering for sales, purchase, payment, and receipt vouchers."
          href="/desk/settings/document-settings"
          icon={<ScrollText className="size-5" />}
          title="Document Settings"
        />
        <SettingsLinkCard
          description="Maintain duties, taxes, and opening GST balances for reports."
          href="/desk/settings/duties-taxes"
          icon={<Landmark className="size-5" />}
          title="Duties & Taxes"
        />
        {canRunSystemUpdate ? (
          <SettingsLinkCard
            description="Run deployment preflight, sync from GitHub, rebuild Docker, and restart the app."
            href="/desk/settings/system-update"
            icon={<RefreshCcw className="size-5" />}
            title="System Update"
          />
        ) : null}
      </div>
    </CommonListPageFrame>
  );
}

export function CustomiseSettingsPage() {
  const [state, setState, context] = useCompanySoftwareSettingsState();

  return (
    <CommonListPageFrame
      description={`Scaffold industry-specific and client-specific application configuration for ${context.companyName}.`}
      technicalName="page.settings.customise"
      title="Customise"
    >
      <div className="grid gap-4">
        {state.customiseGroups.map((group) => (
          <Card key={group.id} className="rounded-md border-border/70">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{group.title}</CardTitle>
              <CardDescription>{group.description}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              {group.settings.map((setting) => (
                <SettingSwitchRow
                  key={setting.id}
                  setting={setting}
                  onToggle={(enabled) =>
                    setState((current) => updateCustomiseSetting(current, setting.id, enabled))
                  }
                />
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </CommonListPageFrame>
  );
}

export function SalesBillingLayoutSettingsPage() {
  const [activeCompanyId, setActiveCompanyId] = useState<string | null>(null);
  const [activeCompanyName, setActiveCompanyName] = useState<string>("Active company");
  const [publishedState, setPublishedState] = useState<SoftwareSettingsState>(
    defaultSoftwareSettingsState,
  );
  const [draftState, setDraftState] = useState<SoftwareSettingsState>(defaultSoftwareSettingsState);
  const hasUnpublishedChanges = !areSoftwareSettingsEqual(publishedState, draftState);

  useEffect(() => {
    const controller = new AbortController();
    const context = readStoredApplicationContext();
    const companyId = context?.company.id ?? null;
    setActiveCompanyId(companyId);
    setActiveCompanyName(context?.company.name ?? "Active company");

    const loadedSettings = loadCompanySoftwareSettings(companyId);
    setPublishedState(loadedSettings);
    setDraftState(loadedSettings);
    if (companyId) {
      void loadCompanySoftwareSettingsFromServer(companyId, { signal: controller.signal })
        .then((settings) => {
          if (controller.signal.aborted) return;
          setPublishedState(settings);
          setDraftState(settings);
        })
        .catch((error: unknown) => {
          if (error instanceof DOMException && error.name === "AbortError") return;
          toast.error("Could not load sales settings", {
            description: error instanceof Error ? error.message : "Using local settings for now.",
          });
        });
    }

    if (hasPublishedCompanySoftwareSettings(companyId)) {
      return () => controller.abort();
    }

    void getCoreEnvSettings({ signal: controller.signal })
      .then((settings) => {
        const appType = flattenEnvValues(settings.groups).APP_TYPE;
        setDraftState((current) => ({
          ...current,
          salesBillingLayout: salesBillingLayoutDefaultsForIndustry(appType),
        }));
      })
      .catch(() => undefined);

    return () => controller.abort();
  }, []);

  async function publishLive() {
    try {
      const savedState = await saveCompanySoftwareSettingsToServer(activeCompanyId, draftState);
      setPublishedState(savedState);
      setDraftState(savedState);
      toast.success("Sales settings published", {
        description: `${activeCompanyName} now uses these sales settings.`,
      });
    } catch (error) {
      saveCompanySoftwareSettings(activeCompanyId, draftState);
      setPublishedState(draftState);
      toast.error("Sales settings saved locally only", {
        description: error instanceof Error ? error.message : "Server save failed.",
      });
    }
  }

  return (
    <CommonListPageFrame
      action={
        <Button
          className="rounded-xl"
          disabled={!activeCompanyId || !hasUnpublishedChanges}
          onClick={() => void publishLive()}
        >
          <Save className="size-4" />
          Publish live
        </Button>
      }
      description={`Configure sales layout, customisation, and feature switches for ${activeCompanyName}. Document numbering is managed from Document Settings.`}
      technicalName="page.settings.billing-layout"
      title="Sales Settings"
    >
      <AnimatedTabs
        tabs={[
          {
            value: "layout",
            label: "Layout",
            content: (
              <Card className="rounded-md border-border/70">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Sales Layout</CardTitle>
                  <CardDescription>
                    Toggle fields as a draft, then publish live to update sales entry and print
                    screens.
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-3">
                  {draftState.salesBillingLayout.map((setting) => (
                    <SettingSwitchRow
                      key={setting.id}
                      setting={setting}
                      onToggle={(enabled) =>
                        setDraftState((current) =>
                          updateSalesBillingLayoutSetting(current, setting.id, enabled),
                        )
                      }
                    />
                  ))}
                </CardContent>
              </Card>
            ),
          },
          {
            value: "printing",
            label: "Printing",
            content: (
              <Card className="rounded-md border-border/70">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Sales Printing</CardTitle>
                  <CardDescription>
                    Control presentation options used when printing sales invoices.
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-3">
                  {draftState.salesPrintingSettings.map((setting) => (
                    <SettingSwitchRow
                      key={setting.id}
                      setting={setting}
                      onToggle={(enabled) =>
                        setDraftState((current) =>
                          updateSalesPrintingSetting(current, setting.id, enabled),
                        )
                      }
                    />
                  ))}
                  <label className="grid gap-2 rounded-md border border-border/70 bg-background px-4 py-3">
                    <span className="text-sm font-medium text-foreground">Custom terms</span>
                    <textarea
                      className="min-h-24 resize-y rounded-md border border-input bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-foreground/40"
                      placeholder="Enter one term per line"
                      value={draftState.salesPrintingOptions.customTerms}
                      onChange={(event) =>
                        setDraftState((current) =>
                          updateSalesPrintingOption(current, "customTerms", event.target.value),
                        )
                      }
                    />
                  </label>
                </CardContent>
              </Card>
            ),
          },
          {
            value: "customise",
            label: "Customise",
            content: (
              <div className="grid gap-4">
                {draftState.customiseGroups.map((group) => (
                  <Card key={group.id} className="rounded-md border-border/70">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">{group.title}</CardTitle>
                      <CardDescription>{group.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-3">
                      {group.settings.map((setting) => (
                        <SettingSwitchRow
                          key={setting.id}
                          setting={setting}
                          onToggle={(enabled) =>
                            setDraftState((current) =>
                              updateCustomiseSetting(current, setting.id, enabled),
                            )
                          }
                        />
                      ))}
                    </CardContent>
                  </Card>
                ))}
              </div>
            ),
          },
          {
            value: "features",
            label: "Features",
            content: (
              <div className="grid gap-3">
                {draftState.features.map((feature) => (
                  <SettingSwitchRow
                    key={feature.id}
                    setting={feature}
                    onToggle={(enabled) =>
                      setDraftState((current) => updateFeatureSetting(current, feature.id, enabled))
                    }
                  />
                ))}
              </div>
            ),
          },
        ]}
      />
    </CommonListPageFrame>
  );
}

function areSettingsEqual(
  left: readonly SoftwareToggleSetting[],
  right: readonly SoftwareToggleSetting[],
) {
  if (left.length !== right.length) return false;
  return left.every((setting, index) => {
    const other = right[index];
    return other?.id === setting.id && other.enabled === setting.enabled;
  });
}

function areSoftwareSettingsEqual(left: SoftwareSettingsState, right: SoftwareSettingsState) {
  return (
    areSettingsEqual(left.salesBillingLayout, right.salesBillingLayout) &&
    areSettingsEqual(left.salesPrintingSettings, right.salesPrintingSettings) &&
    left.salesPrintingOptions.customTerms === right.salesPrintingOptions.customTerms &&
    areDutiesTaxSettingsEqual(left.dutiesTaxSettings, right.dutiesTaxSettings) &&
    areSettingsEqual(left.features, right.features) &&
    left.customiseGroups.length === right.customiseGroups.length &&
    left.customiseGroups.every(
      (group, index) =>
        group.id === right.customiseGroups[index]?.id &&
        areSettingsEqual(group.settings, right.customiseGroups[index]?.settings ?? []),
    )
  );
}

function areDutiesTaxSettingsEqual(left: DutiesTaxSettings, right: DutiesTaxSettings) {
  return (
    left.openingGstAsOnDate === right.openingGstAsOnDate &&
    left.openingGstCgst === right.openingGstCgst &&
    left.openingGstIgst === right.openingGstIgst &&
    left.openingGstSgst === right.openingGstSgst
  );
}

function salesBillingLayoutDefaultsForIndustry(appType: string | undefined) {
  const industryKind = normalizeIndustryKind(appType);
  const garment = industryKind === "garment";
  const offset = industryKind === "offset" || !garment;

  return defaultSoftwareSettingsState.salesBillingLayout.map((setting) => {
    if (setting.id === "sales-use-po") return { ...setting, enabled: offset };
    if (setting.id === "sales-use-dc") return { ...setting, enabled: offset };
    if (setting.id === "sales-use-colour") return { ...setting, enabled: garment };
    if (setting.id === "sales-use-size") return { ...setting, enabled: garment };
    if (setting.id === "sales-use-einvoice") return { ...setting, enabled: garment };
    if (setting.id === "sales-use-eway") return { ...setting, enabled: true };
    return setting;
  });
}

export function FeatureSettingsPage() {
  const [state, setState, context] = useCompanySoftwareSettingsState();
  const enabledCount = useMemo(
    () => state.features.filter((feature) => feature.enabled).length,
    [state.features],
  );

  return (
    <CommonListPageFrame
      description="Toggle software features by industry and client scope."
      technicalName="page.settings.features"
      title="Features"
    >
      <div className="rounded-md border border-border/70 bg-card px-4 py-3 text-sm text-muted-foreground shadow-sm">
        <span className="font-medium text-foreground">{enabledCount}</span> of{" "}
        <span className="font-medium text-foreground">{state.features.length}</span> features
        enabled for {context.companyName}.
      </div>
      <div className="grid gap-3">
        {state.features.map((feature) => (
          <SettingSwitchRow
            key={feature.id}
            setting={feature}
            onToggle={(enabled) =>
              setState((current) => updateFeatureSetting(current, feature.id, enabled))
            }
          />
        ))}
      </div>
    </CommonListPageFrame>
  );
}

export function DutiesTaxesSettingsPage() {
  const [state, setState, context, actions] = useCompanySoftwareSettingsState();
  const openingGstTotal = totalOpeningGst(state.dutiesTaxSettings);

  return (
    <CommonListPageFrame
      action={
        <Button
          className="rounded-xl"
          disabled={!context.companyId}
          onClick={() => void actions.saveNow()}
        >
          <Save className="size-4" />
          Save
        </Button>
      }
      description={`Set opening GST balances used by GST Statement reports for ${context.companyName}.`}
      technicalName="page.settings.duties-taxes"
      title="Duties & Taxes"
    >
      <Card className="rounded-md border-border/70">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Opening GST</CardTitle>
          <CardDescription>
            Enter opening IGST, CGST, and SGST balances with the date this balance applies from.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-3 lg:grid-cols-[1.2fr_repeat(4,1fr)]">
            <DutiesTaxField
              label="As on date"
              type="date"
              value={state.dutiesTaxSettings.openingGstAsOnDate}
              onChange={(value) =>
                setState((current) => updateDutiesTaxSetting(current, "openingGstAsOnDate", value))
              }
            />
            <DutiesTaxField
              label="IGST"
              value={state.dutiesTaxSettings.openingGstIgst}
              onChange={(value) =>
                setState((current) => updateDutiesTaxSetting(current, "openingGstIgst", value))
              }
            />
            <DutiesTaxField
              label="CGST"
              value={state.dutiesTaxSettings.openingGstCgst}
              onChange={(value) =>
                setState((current) => updateDutiesTaxSetting(current, "openingGstCgst", value))
              }
            />
            <DutiesTaxField
              label="SGST"
              value={state.dutiesTaxSettings.openingGstSgst}
              onChange={(value) =>
                setState((current) => updateDutiesTaxSetting(current, "openingGstSgst", value))
              }
            />
            <label className="grid gap-2 rounded-md border border-border/70 bg-muted/25 px-3 py-3">
              <span className="text-sm font-medium text-foreground">Total</span>
              <input
                readOnly
                className="h-10 rounded-md border border-input bg-background px-3 text-right text-sm font-semibold outline-none"
                value={formatMoney(openingGstTotal)}
              />
            </label>
          </div>
        </CardContent>
      </Card>
    </CommonListPageFrame>
  );
}

const dashboardFavoriteApps = [
  {
    id: "application",
    label: "Application",
    description: "Open the main application dashboard first at /desk.",
  },
  {
    id: "billing",
    label: "Billing",
    description: "Open the billing workspace first at /desk/billing.",
  },
] as const satisfies readonly {
  readonly id: FavoriteDashboardApp;
  readonly label: string;
  readonly description: string;
}[];

export function DashboardSettingsPage() {
  const [state, setState, context, actions] = useCompanySoftwareSettingsState();

  return (
    <CommonListPageFrame
      action={
        <Button
          className="rounded-xl"
          disabled={!context.companyId}
          onClick={() => void actions.saveNow()}
        >
          <Save className="size-4" />
          Save
        </Button>
      }
      description={`Choose which app card should be treated as the favorite dashboard app for ${context.companyName}.`}
      technicalName="page.settings.dashboard"
      title="Dashboard"
    >
      <div className="grid gap-3">
        {dashboardFavoriteApps.map((app) => {
          const isSelected = state.favoriteDashboardApp === app.id;
          return (
            <label
              key={app.id}
              className={cn(
                "flex cursor-pointer items-start justify-between gap-4 rounded-md border px-4 py-4 shadow-sm transition-colors",
                isSelected
                  ? "border-foreground/30 bg-card ring-1 ring-foreground/10"
                  : "border-border/70 bg-card hover:border-foreground/20",
              )}
            >
              <div className="min-w-0 space-y-1">
                <div className="flex items-center gap-3">
                  <span
                    className={cn(
                      "flex size-5 items-center justify-center rounded-full border transition-colors",
                      isSelected
                        ? "border-foreground bg-foreground text-background"
                        : "border-muted-foreground/40 bg-background text-transparent",
                    )}
                  >
                    {isSelected ? <Dot className="size-4" /> : <Circle className="size-3" />}
                  </span>
                  <span className="font-medium text-foreground">{app.label}</span>
                </div>
                <p className="pl-8 text-sm text-muted-foreground">{app.description}</p>
              </div>
              <input
                checked={isSelected}
                className="sr-only"
                name="favorite-dashboard-app"
                type="radio"
                value={app.id}
                onChange={() =>
                  setState((current) => updateFavoriteDashboardApp(current, app.id))
                }
              />
            </label>
          );
        })}
      </div>
    </CommonListPageFrame>
  );
}

function DutiesTaxField({
  label,
  onChange,
  type = "number",
  value,
}: {
  readonly label: string;
  readonly onChange: (value: string) => void;
  readonly type?: "date" | "number";
  readonly value: string;
}) {
  return (
    <label className="grid gap-2 rounded-md border border-border/70 bg-background px-3 py-3">
      <span className="text-sm font-medium text-foreground">{label}</span>
      <input
        className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none transition-colors focus:border-foreground/40"
        min={type === "number" ? "0" : undefined}
        step={type === "number" ? "0.01" : undefined}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function totalOpeningGst(settings: DutiesTaxSettings) {
  return (
    Number(settings.openingGstIgst || 0) +
    Number(settings.openingGstCgst || 0) +
    Number(settings.openingGstSgst || 0)
  );
}

function SettingsLinkCard({
  description,
  href,
  icon,
  title,
}: {
  readonly description: string;
  readonly href: string;
  readonly icon: ReactNode;
  readonly title: string;
}) {
  return (
    <Card className="rounded-md border-border/70 transition-colors hover:border-foreground/25">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex size-10 items-center justify-center rounded-md bg-muted text-foreground">
            {icon}
          </div>
          <Button asChild variant="outline" className="rounded-xl">
            <Link href={href}>Open</Link>
          </Button>
        </div>
        <CardTitle className="text-lg">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
    </Card>
  );
}

function SettingSwitchRow({
  setting,
  onToggle,
}: {
  readonly setting: SoftwareToggleSetting;
  readonly onToggle: (enabled: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-md border border-border/70 bg-card px-4 py-3 shadow-sm">
      <div className="min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-medium text-foreground">{setting.label}</p>
          <Badge
            className={cn(
              "rounded-md border px-2 py-0.5 text-[11px] capitalize",
              setting.scope === "industry"
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-sky-200 bg-sky-50 text-sky-700",
            )}
            variant="outline"
          >
            {setting.scope}
          </Badge>
          {setting.enabled ? (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
              <CheckCircle2 className="size-3.5" />
              Enabled
            </span>
          ) : null}
        </div>
        <p className="text-sm text-muted-foreground">{setting.description}</p>
      </div>
      <Switch checked={setting.enabled} aria-label={setting.label} onCheckedChange={onToggle} />
    </div>
  );
}

function flattenEnvValues(groups: readonly CoreEnvGroup[]) {
  return Object.fromEntries(
    groups.flatMap((group) => group.settings.map((setting) => [setting.key, setting.value])),
  );
}

function normalizeIndustryText(value: string | undefined) {
  return (
    value
      ?.toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim() ?? ""
  );
}

function normalizeIndustryKind(value: string | undefined) {
  const normalized = normalizeIndustryText(value);
  if (normalized === "100" || normalized === "200") return "garment";
  if (normalized === "300") return "offset";
  if (normalized === "400") return "upvc";
  if (normalized === "500" || normalized === "600") return "shop";
  if (normalized.includes("garment") || normalized.includes("textile")) return "garment";
  if (normalized.includes("offset") || normalized.includes("printing")) return "offset";
  if (normalized.includes("upvc") || normalized.includes("u pvc")) return "upvc";
  if (normalized.includes("shop") || normalized.includes("commerce")) return "shop";
  return "other";
}
