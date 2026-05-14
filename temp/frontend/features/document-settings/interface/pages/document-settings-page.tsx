"use client";

import { useEffect, useMemo, useState } from "react";
import { Save } from "lucide-react";
import { toast } from "sonner";
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, CommonListPageFrame, Switch, useGlobalLoader } from "@cxnext/ui";
import {
  documentNumberKindOrder,
  documentNumberLabels,
  type DocumentNumberSetting,
  type DocumentNumberSettingInput,
} from "../../domain/document-settings";
import {
  listDocumentNumberSettings,
  saveDocumentNumberSettings,
} from "../../infrastructure/document-settings-api";
import { readStoredApplicationContext } from "../../../auth/infrastructure/session-storage";

export function DocumentSettingsPage() {
  const { show } = useGlobalLoader();
  const [records, setRecords] = useState<readonly DocumentNumberSetting[]>([]);
  const [drafts, setDrafts] = useState<Record<string, DocumentNumberSettingInput>>({});
const context = readStoredApplicationContext();

  useEffect(() => {
    const controller = new AbortController();
    const hide = show();
    void listDocumentNumberSettings({ signal: controller.signal })
      .then((settings) => {
        setRecords(settings);
        setDrafts(Object.fromEntries(settings.map((setting) => [setting.kind, toInput(setting)])));
      })
      .catch((error) => {
        if (!isAbortError(error)) {
          toast.error("Could not load document settings", {
            description: error instanceof Error ? error.message : "Please try again.",
          });
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) hide();
      });
    return () => {
      controller.abort();
      hide();
    };
  }, [show]);

  const orderedDrafts = useMemo(
    () => documentNumberKindOrder.map((kind) => drafts[kind]).filter(Boolean),
    [drafts],
  );

  async function save() {
    const hide = show();
    try {
      const saved = await saveDocumentNumberSettings(orderedDrafts);
      setRecords(saved);
      setDrafts(Object.fromEntries(saved.map((setting) => [setting.kind, toInput(setting)])));
      toast.success("Document settings saved");
    } catch (error) {
      toast.error("Could not save document settings", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      hide();
    }
  }

  return (
    <CommonListPageFrame
      action={
        <Button className="rounded-xl" onClick={() => void save()} disabled={orderedDrafts.length === 0}>
          <Save className="size-4" />
          Save
        </Button>
      }
      description={`Configure automatic document numbers for ${context?.company.name ?? "active company"} / ${context?.accountingYear.name ?? "active accounting year"}. Manual override remains available in each voucher.`}
      technicalName="page.settings.document-settings"
      title="Document Settings"
    >
      <div className="grid gap-4">
        {documentNumberKindOrder.map((kind) => {
          const draft = drafts[kind];
          const record = records.find((item) => item.kind === kind);
          if (!draft) return null;
          return (
            <Card key={kind} className="rounded-md border-border/70">
              <CardHeader className="pb-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-base">{documentNumberLabels[kind]}</CardTitle>
                    <CardDescription>
                      Next automatic number: {preview(draft)}
                    </CardDescription>
                  </div>
                  <label className="flex items-center gap-3 text-sm font-medium">
                    <span>{draft.autoEnabled ? "Automatic" : "Manual only"}</span>
                    <Switch
                      checked={draft.autoEnabled}
                      onCheckedChange={(autoEnabled) =>
                        setDraft(kind, { ...draft, autoEnabled })
                      }
                    />
                  </label>
                </div>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-4">
                <label className="flex items-center justify-between gap-3 rounded-md border border-border/70 bg-background px-3 py-3 md:col-span-4">
                  <span className="grid gap-1">
                    <span className="text-sm font-medium text-foreground">Use prefix</span>
                    <span className="text-xs text-muted-foreground">
                      Turn this off for plain numbers like {plainPreview(draft)}.
                    </span>
                  </span>
                  <Switch
                    checked={Boolean(draft.prefix.trim())}
                    onCheckedChange={(checked) =>
                      setDraft(kind, {
                        ...draft,
                        prefix: checked ? defaultPrefix(kind) : "",
                      })
                    }
                  />
                </label>
                <DocField
                  label="Prefix"
                  value={draft.prefix}
                  disabled={!draft.prefix.trim()}
                  onChange={(value) => setDraft(kind, { ...draft, prefix: value.toUpperCase() })}
                />
                <DocField
                  label="Separator"
                  value={draft.separator}
                  onChange={(value) => setDraft(kind, { ...draft, separator: value.slice(0, 3) })}
                />
                <DocField
                  label="Next number"
                  type="number"
                  value={String(draft.nextNumber)}
                  onChange={(value) => setDraft(kind, { ...draft, nextNumber: Number(value || 1) })}
                />
                <DocField
                  label="Padding"
                  type="number"
                  value={String(draft.padding)}
                  onChange={(value) => setDraft(kind, { ...draft, padding: Number(value || 1) })}
                />
                <div className="rounded-md border border-border/70 bg-muted/20 px-3 py-2 text-sm text-muted-foreground md:col-span-4">
                  Saved preview: <span className="font-medium text-foreground">{record?.preview ?? "-"}</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </CommonListPageFrame>
  );

  function setDraft(kind: string, input: DocumentNumberSettingInput) {
    setDrafts((current) => ({ ...current, [kind]: sanitizeInput(input) }));
  }
}

function DocField({
  disabled = false,
  label,
  onChange,
  type = "text",
  value,
}: {
  readonly disabled?: boolean;
  readonly label: string;
  readonly onChange: (value: string) => void;
  readonly type?: "number" | "text";
  readonly value: string;
}) {
  return (
    <label className="grid gap-2 rounded-md border border-border/70 bg-background px-3 py-3">
      <span className="text-sm font-medium text-foreground">{label}</span>
      <input
        className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none transition-colors focus:border-foreground/40"
        min={type === "number" ? 1 : undefined}
        type={type}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function toInput(setting: DocumentNumberSetting): DocumentNumberSettingInput {
  return {
    autoEnabled: setting.autoEnabled,
    kind: setting.kind,
    nextNumber: setting.nextNumber,
    padding: setting.padding,
    prefix: setting.prefix,
    separator: setting.separator,
  };
}

function sanitizeInput(input: DocumentNumberSettingInput): DocumentNumberSettingInput {
  return {
    ...input,
    nextNumber: Math.max(1, Math.floor(Number(input.nextNumber || 1))),
    padding: Math.max(1, Math.min(12, Math.floor(Number(input.padding || 1)))),
    prefix: input.prefix.trim().toUpperCase(),
    separator: input.separator || "-",
  };
}

function preview(input: DocumentNumberSettingInput) {
  const serial = String(input.nextNumber).padStart(input.padding, "0");
  return [input.prefix.trim(), serial].filter(Boolean).join(input.separator || "-");
}

function plainPreview(input: DocumentNumberSettingInput) {
  return String(input.nextNumber).padStart(input.padding, "0");
}

function defaultPrefix(kind: string) {
  return {
    payment: "PAY",
    purchase: "PUR",
    receipt: "REC",
    sales: "SAL",
  }[kind] ?? "";
}

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === "AbortError";
}
