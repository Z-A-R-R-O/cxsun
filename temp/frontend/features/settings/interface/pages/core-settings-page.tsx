"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Save } from "lucide-react";
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
  useGlobalLoader,
} from "@cxnext/ui";
import { listIndustries } from "../../../industry/application/industry-service";
import {
  getCoreEnvSettings,
  updateCoreEnvSettings,
  type CoreEnvGroup,
  type CoreEnvPolicy,
  type CoreEnvPolicyItem,
  type CoreEnvSettingsResponse,
  type CoreEnvSetting,
  type CoreEnvSettingOption,
} from "../../infrastructure/core-settings-api";

export function CoreSettingsPage() {
  const { show } = useGlobalLoader();
  const [industryOptions, setIndustryOptions] = useState<readonly CoreEnvSettingOption[]>([]);
  const [settings, setSettings] = useState<CoreEnvSettingsResponse | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const hide = show();
    Promise.all([
      getCoreEnvSettings({ signal: controller.signal }),
      listIndustries({ signal: controller.signal }).catch(() => []),
    ])
      .then(([nextSettings, industries]) => {
        const nextIndustryOptions = industries
          .filter((industry) => industry.isActive)
          .map((industry) => ({
            value: industry.code,
            label: `${industry.code} - ${industry.name}`,
            description: `Use ${industry.code} (${industry.name}) as the active billing industry.`,
          }));
        setSettings(nextSettings);
        setIndustryOptions(nextIndustryOptions);
        setValues(normalizeCoreValues(flattenEnvValues(nextSettings.groups), nextIndustryOptions));
        setLoadError(null);
      })
      .catch((error: unknown) => {
        if (isAbortError(error)) return;
        setLoadError(error instanceof Error ? error.message : "Could not load core settings.");
      })
      .finally(() => {
        if (!controller.signal.aborted) hide();
      });

    return () => {
      controller.abort();
      hide();
    };
  }, [show]);

  async function save() {
    const hide = show();
    try {
      const nextSettings = await updateCoreEnvSettings(values);
      setSettings(nextSettings);
      setValues(normalizeCoreValues(flattenEnvValues(nextSettings.groups), industryOptions));
      toast.success(".env updated");
    } catch (error) {
      toast.error("Could not update .env", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      hide();
    }
  }

  const tabs =
    settings?.groups.map((group) => ({
      value: group.id,
      label: group.label,
      content: (
        <CoreSettingsGroupForm
          group={group}
          industryOptions={industryOptions}
          values={values}
          onChange={(key, value) => setValues((current) => ({ ...current, [key]: value }))}
        />
      ),
    })) ?? [];

  return (
    <CommonListPageFrame
      action={
        <Button className="rounded-xl" onClick={() => void save()} disabled={!settings}>
          <Save className="size-4" />
          Save .env
        </Button>
      }
      description="Grouped editor for the root .env values used by startup, database, API, frontend, and security."
      technicalName="page.settings.core"
      title="Core Settings"
    >
      {settings?.envFilePath ? (
        <p className="rounded-md border border-border/70 bg-card px-4 py-3 text-sm text-muted-foreground shadow-sm">
          Editing <span className="font-medium text-foreground">{settings.envFilePath}</span>
        </p>
      ) : null}
      {loadError ? (
        <Card className="rounded-md border-destructive/40">
          <CardContent className="p-4 text-sm text-destructive">{loadError}</CardContent>
        </Card>
      ) : null}
      {settings ? (
        <AnimatedTabs
          tabs={[
            ...tabs,
            {
              value: "policy",
              label: "Env Policy",
              content: <EnvPolicy policy={settings.policy} />,
            },
            {
              value: "raw",
              label: ".env reference",
              content: <EnvReference raw={settings.raw} />,
            },
          ]}
        />
      ) : null}
    </CommonListPageFrame>
  );
}

function CoreSettingsGroupForm({
  group,
  industryOptions,
  values,
  onChange,
}: {
  readonly group: CoreEnvGroup;
  readonly industryOptions: readonly CoreEnvSettingOption[];
  readonly values: Record<string, string>;
  readonly onChange: (key: string, value: string) => void;
}) {
  return (
    <Card className="rounded-md border-border/70">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{group.label}</CardTitle>
        <CardDescription>{group.description}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2">
        {group.settings.map((setting) => (
          <CoreEnvField
            key={setting.key}
            industryOptions={industryOptions}
            setting={setting}
            value={values[setting.key] ?? ""}
            onChange={(value) => onChange(setting.key, value)}
          />
        ))}
      </CardContent>
    </Card>
  );
}

function CoreEnvField({
  industryOptions,
  setting,
  value,
  onChange,
}: {
  readonly industryOptions: readonly CoreEnvSettingOption[];
  readonly setting: CoreEnvSetting;
  readonly value: string;
  readonly onChange: (value: string) => void;
}) {
  const isBoolean = value === "true" || value === "false";
  const options =
    setting.key === "APP_TYPE" && industryOptions.length > 0 ? industryOptions : setting.options;

  return (
    <label className="grid gap-2 rounded-md border border-border/70 bg-background px-3 py-3">
      <span className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-foreground">{setting.label}</span>
        <Badge variant="outline" className="rounded-md text-[11px]">
          {setting.key}
        </Badge>
      </span>
      {options?.length ? (
        <select
          className="h-10 rounded-md border border-input bg-background px-3 text-sm capitalize outline-none transition-colors focus:border-foreground/40"
          value={value}
          onChange={(event) => onChange(event.target.value)}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      ) : isBoolean ? (
        <span className="flex items-center justify-between gap-4">
          <span className="text-sm text-muted-foreground">
            {value === "true" ? "Enabled" : "Disabled"}
          </span>
          <Switch
            checked={value === "true"}
            aria-label={setting.label}
            onCheckedChange={(checked) => onChange(String(checked))}
          />
        </span>
      ) : (
        <input
          className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none transition-colors focus:border-foreground/40"
          type={setting.sensitive ? "password" : "text"}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      )}
      {options?.length ? (
        <span className="text-xs leading-5 text-muted-foreground">
          {options.find((option) => option.value === value)?.description ?? setting.description}
        </span>
      ) : null}
      {!options?.length ? (
        <span className="text-xs leading-5 text-muted-foreground">{setting.description}</span>
      ) : null}
    </label>
  );
}

function EnvReference({ raw }: { readonly raw: string }) {
  return (
    <Card className="rounded-md border-border/70">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">.env Reference</CardTitle>
        <CardDescription>
          Current root .env content after comments and grouping are preserved.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <textarea
          readOnly
          className="min-h-[420px] w-full resize-y rounded-md border border-border/70 bg-muted/35 p-4 font-mono text-xs leading-5 text-foreground outline-none"
          value={raw}
        />
      </CardContent>
    </Card>
  );
}

function EnvPolicy({ policy }: { readonly policy: CoreEnvPolicy }) {
  return (
    <div className="grid gap-4">
      <EnvPolicySection
        description="These values belong in .env and are editable from Core Settings."
        items={policy.managed}
        title="Keep In .env"
      />
      <EnvPolicySection
        description="These values are intentionally excluded. Saving Core Settings removes excluded keys from .env."
        items={policy.excluded}
        title="Do Not Keep In .env"
      />
      <EnvPolicySection
        description="These keys are present in .env but are not part of the current policy. Review before keeping long term."
        emptyText="No unmanaged keys found."
        items={policy.unmanaged}
        title="Needs Review"
      />
    </div>
  );
}

function EnvPolicySection({
  description,
  emptyText,
  items,
  title,
}: {
  readonly description: string;
  readonly emptyText?: string;
  readonly items: readonly CoreEnvPolicyItem[];
  readonly title: string;
}) {
  return (
    <Card className="rounded-md border-border/70">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-2">
        {items.length === 0 ? (
          <p className="rounded-md border border-border/70 bg-muted/25 px-3 py-2 text-sm text-muted-foreground">
            {emptyText ?? "No keys."}
          </p>
        ) : (
          items.map((item) => (
            <div
              key={`${item.status}-${item.key}`}
              className="grid gap-1 rounded-md border border-border/70 bg-background px-3 py-2"
            >
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="rounded-md font-mono text-[11px]">
                  {item.key}
                </Badge>
                <Badge
                  variant="outline"
                  className={cn(
                    "rounded-md text-[11px] capitalize",
                    item.status === "managed" &&
                      "border-emerald-200 bg-emerald-50 text-emerald-700",
                    item.status === "excluded" && "border-rose-200 bg-rose-50 text-rose-700",
                    item.status === "unmanaged" && "border-amber-200 bg-amber-50 text-amber-700",
                  )}
                >
                  {item.status}
                </Badge>
              </div>
              <p className="text-xs leading-5 text-muted-foreground">{item.reason}</p>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

function flattenEnvValues(groups: readonly CoreEnvGroup[]) {
  return Object.fromEntries(
    groups.flatMap((group) => group.settings.map((setting) => [setting.key, setting.value])),
  );
}

function normalizeCoreValues(
  values: Record<string, string>,
  industryOptions: readonly CoreEnvSettingOption[],
) {
  return {
    ...values,
    APP_TYPE: normalizeAppTypeToIndustry(values.APP_TYPE, industryOptions),
  };
}

function normalizeAppTypeToIndustry(
  value: string | undefined,
  industryOptions: readonly CoreEnvSettingOption[],
) {
  if (!value) return industryOptions[0]?.value ?? "";
  const exact = industryOptions.find(
    (option) => option.value.toLowerCase() === value.toLowerCase(),
  );
  if (exact) return exact.value;

  const normalizedValue = normalizeIndustryText(value);
  const labelMatched = industryOptions.find((option) =>
    normalizeIndustryText(option.label).includes(normalizedValue),
  );
  if (labelMatched) return labelMatched.value;

  const industryKind = normalizeIndustryKind(value);
  const matched = industryOptions.find(
    (option) => normalizeIndustryKind(option.value) === industryKind,
  );
  return matched?.value ?? value;
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

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === "AbortError";
}
