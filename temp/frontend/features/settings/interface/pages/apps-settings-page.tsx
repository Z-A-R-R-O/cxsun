"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Check,
  CheckCircle2,
  ClipboardList,
  FileBarChart2,
  ReceiptText,
  ShoppingBag,
  WalletCards,
} from "lucide-react";
import { Badge, Button, Card, CardContent, CommonListPageFrame, cn } from "@cxnext/ui";
import { toast } from "sonner";
import { readStoredApplicationContext } from "../../../auth/infrastructure/session-storage";
import { getCompanySetting, saveCompanySetting } from "../../infrastructure/company-settings-api";

const storageKey = "cxnext.settings.apps.enabled";
const companyStorageKeyPrefix = `${storageKey}:company:`;

type AppModule = {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly icon: typeof ReceiptText;
  readonly defaultEnabled?: boolean;
};

type AppModuleGroup = {
  readonly id: string;
  readonly title: string;
  readonly modules: readonly AppModule[];
};

const appModuleGroups: readonly AppModuleGroup[] = [
  {
    id: "entries",
    title: "Entries",
    modules: [
      {
        id: "sales",
        title: "Sales",
        description: "Create invoices and sales vouchers",
        icon: ReceiptText,
        defaultEnabled: true,
      },
      {
        id: "purchase",
        title: "Purchase",
        description: "Record supplier bills and purchases",
        icon: ShoppingBag,
        defaultEnabled: true,
      },
      {
        id: "receipt",
        title: "Receipt",
        description: "Record incoming customer receipts",
        icon: ReceiptText,
        defaultEnabled: true,
      },
      {
        id: "payment",
        title: "Payment",
        description: "Record outgoing supplier payments",
        icon: WalletCards,
        defaultEnabled: true,
      },
      {
        id: "reports",
        title: "Reports",
        description: "Review statements and GST reports",
        icon: FileBarChart2,
        defaultEnabled: true,
      },
    ],
  },
];

const defaultEnabledApps = Object.fromEntries(
  appModuleGroups.flatMap((group) =>
    group.modules.map((module) => [module.id, Boolean(module.defaultEnabled)]),
  ),
);

const appFeature = {
  id: "billing",
  title: "Billing",
  description: "Simple billing workspace for entries, payments, receipts, and reports.",
  icon: ClipboardList,
} as const;

export function AppsSettingsPage() {
  const FeatureIcon = appFeature.icon;
  const [enabledApps, setEnabledApps] = useState<Record<string, boolean>>(defaultEnabledApps);
  const [activatedApps, setActivatedApps] = useState<Record<string, boolean>>(defaultEnabledApps);
  const [isActivating, setIsActivating] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [activeCompany, setActiveCompany] = useState<{
    readonly id: string | null;
    readonly name: string;
  }>({ id: null, name: "Active company" });

  useEffect(() => {
    const controller = new AbortController();
    const context = readStoredApplicationContext();
    const companyId = context?.company.id ?? null;
    setActiveCompany({
      id: companyId,
      name: context?.company.name ?? "Active company",
    });

    try {
      const stored = companyId ? window.localStorage.getItem(companyStorageKey(companyId)) : null;
      if (stored) {
        const storedApps = normalizeEnabledApps(JSON.parse(stored) as Record<string, unknown>);
        setActivatedApps(storedApps);
        setEnabledApps(storedApps);
      }
    } catch {
      setActivatedApps(defaultEnabledApps);
      setEnabledApps(defaultEnabledApps);
    }

    if (companyId) {
      void getCompanySetting<Record<string, boolean>>("apps", companyId, {
        signal: controller.signal,
      })
        .then((record) => {
          if (controller.signal.aborted) return;
          const serverApps = normalizeEnabledApps(record.values);
          setActivatedApps(serverApps);
          setEnabledApps(serverApps);
          window.localStorage.setItem(companyStorageKey(companyId), JSON.stringify(serverApps));
        })
        .catch((error: unknown) => {
          if (isAbortError(error)) return;
          toast.error("Could not load app settings", {
            description: error instanceof Error ? error.message : "Using local settings for now.",
          });
        })
        .finally(() => {
          if (!controller.signal.aborted) setIsLoaded(true);
        });
    } else {
      setIsLoaded(true);
    }

    return () => controller.abort();
  }, []);

  const enabledCount = useMemo(
    () => Object.values(enabledApps).filter(Boolean).length,
    [enabledApps],
  );
  const totalCount = appModuleGroups.reduce((total, group) => total + group.modules.length, 0);
  const hasDraftChanges = !areAppMapsEqual(enabledApps, activatedApps);

  function toggleModule(moduleId: string) {
    setEnabledApps((current) => ({ ...current, [moduleId]: !current[moduleId] }));
  }

  async function activateApps() {
    if (!activeCompany.id) return;
    setIsActivating(true);

    try {
      const activationPayload = normalizeEnabledApps(enabledApps);
      const record = await saveCompanySetting("apps", activeCompany.id, activationPayload);
      const nextActivatedApps = normalizeEnabledApps(record.values);
      setActivatedApps(nextActivatedApps);
      setEnabledApps(nextActivatedApps);
      window.localStorage.setItem(
        companyStorageKey(activeCompany.id),
        JSON.stringify(nextActivatedApps),
      );
      toast.success("Apps activated", {
        description: `${activeCompany.name} now uses the selected apps.`,
      });
    } catch (error) {
      toast.error("Could not activate apps", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setIsActivating(false);
    }
  }

  return (
    <CommonListPageFrame
      action={
        <Button
          className="rounded-xl"
          disabled={!activeCompany.id || !isLoaded || !hasDraftChanges || isActivating}
          onClick={() => void activateApps()}
        >
          <CheckCircle2 className="size-4" />
          {isActivating ? "Activating" : "Activate"}
        </Button>
      }
      description={`Enable the application modules available for ${activeCompany.name}.`}
      technicalName="page.settings.apps"
      title="Apps"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border/70 bg-card px-4 py-3 shadow-sm">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-emerald-50 text-emerald-700">
            <FeatureIcon className="size-5" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground">{appFeature.title}</p>
            <p className="text-sm text-muted-foreground">{appFeature.description}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm text-muted-foreground">
            {enabledCount} of {totalCount} modules selected
          </p>
          <Badge
            variant="outline"
            className={cn(
              "rounded-md",
              hasDraftChanges
                ? "border-amber-200 bg-amber-50 text-amber-700"
                : "border-emerald-200 bg-emerald-50 text-emerald-700",
            )}
          >
            {hasDraftChanges ? "Activation pending" : "Activated modules"}
          </Badge>
        </div>
      </div>

      <div className="grid gap-8">
        {appModuleGroups.map((group) => (
          <section key={group.id} className="grid gap-4">
            <h2 className="text-xl font-semibold text-foreground">{group.title}</h2>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {group.modules.map((module) => (
                <AppModuleCard
                  key={module.id}
                  module={module}
                  enabled={Boolean(enabledApps[module.id])}
                  onToggle={() => toggleModule(module.id)}
                />
              ))}
            </div>
          </section>
        ))}
      </div>
    </CommonListPageFrame>
  );
}

function companyStorageKey(companyId: string) {
  return `${companyStorageKeyPrefix}${companyId}`;
}

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === "AbortError";
}

function areAppMapsEqual(left: Record<string, boolean>, right: Record<string, boolean>) {
  const keys = Object.keys(defaultEnabledApps);
  return keys.every((key) => Boolean(left[key]) === Boolean(right[key]));
}

function normalizeEnabledApps(values: Record<string, unknown>): Record<string, boolean> {
  return Object.fromEntries(
    Object.keys(defaultEnabledApps).map((key) => [
      key,
      Boolean(values[key] ?? defaultEnabledApps[key]),
    ]),
  );
}

function AppModuleCard({
  enabled,
  module,
  onToggle,
}: {
  readonly enabled: boolean;
  readonly module: AppModule;
  readonly onToggle: () => void;
}) {
  const Icon = module.icon;

  return (
    <Card
      role="checkbox"
      aria-checked={enabled}
      tabIndex={0}
      className={cn(
        "rounded-md border-border/70 bg-card shadow-sm transition-colors hover:border-foreground/25",
        enabled && "border-emerald-300 bg-emerald-50/55",
      )}
      onClick={onToggle}
      onKeyDown={(event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        onToggle();
      }}
    >
      <CardContent className="grid min-h-24 grid-cols-[3rem_1fr_auto] items-center gap-3 p-3">
        <span
          className={cn(
            "flex size-11 items-center justify-center rounded-md bg-muted text-foreground",
            enabled && "bg-emerald-100 text-emerald-700",
          )}
        >
          <Icon className="size-5" />
        </span>
        <span className="min-w-0">
          <span className="block text-sm font-semibold text-foreground">{module.title}</span>
          <span className="mt-1 block text-xs leading-5 text-muted-foreground">
            {module.description}
          </span>
        </span>
        <span
          className={cn(
            "flex size-7 items-center justify-center rounded-full border border-border text-muted-foreground",
            enabled && "border-emerald-300 bg-emerald-600 text-white",
          )}
          aria-hidden="true"
        >
          {enabled ? <Check className="size-4" /> : null}
        </span>
      </CardContent>
    </Card>
  );
}
