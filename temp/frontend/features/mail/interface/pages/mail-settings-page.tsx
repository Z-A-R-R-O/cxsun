"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CommonListPageFrame,
  useGlobalLoader,
} from "@cxnext/ui";
import { Eye, Save, Send, ShieldCheck } from "lucide-react";
import { readStoredApplicationContext } from "../../../auth/infrastructure/session-storage";
import {
  getCompanySetting,
  saveCompanySetting,
  type CompanySettingRecord,
} from "../../../settings/infrastructure/company-settings-api";
import type {
  CompanyMailSettings,
  MailStatusResponse,
  MailTemplateKey,
  MailTemplatePreview,
  MailTemplateRecord,
} from "../../domain/mail";
import {
  defaultCompanyMailSettings,
  getMailStatus,
  getMailTemplates,
  previewMailTemplate,
  sendMailTest,
} from "../../infrastructure/mail-api";

const fallbackPreviewVariables = JSON.stringify(
  {
    recipientName: "Operator",
    companyName: "CODEXSUN",
    otp: "748201",
    resetLink: "https://example.com/reset",
    invoiceNumber: "INV-2026-001",
    reportName: "Customer Statement",
    message: "Everything looks healthy from the worker side.",
    subject: "Transactional notification",
    previewText: "Transactional preview",
  },
  null,
  2,
);

export function MailSettingsPage() {
  const { show } = useGlobalLoader();
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState("Active company");
  const [status, setStatus] = useState<MailStatusResponse | null>(null);
  const [templates, setTemplates] = useState<readonly MailTemplateRecord[]>([]);
  const [settings, setSettings] = useState<CompanyMailSettings>(defaultCompanyMailSettings);
  const [testRecipient, setTestRecipient] = useState("");
  const [previewTemplateKey, setPreviewTemplateKey] = useState<MailTemplateKey>("test");
  const [previewVariablesText, setPreviewVariablesText] = useState(fallbackPreviewVariables);
  const [preview, setPreview] = useState<MailTemplatePreview | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);

  useEffect(() => {
    const context = readStoredApplicationContext();
    setCompanyId(context?.company.id ?? null);
    setCompanyName(context?.company.name ?? "Active company");
    setTestRecipient("");
  }, []);

  useEffect(() => {
    if (!companyId) {
      return;
    }

    const hide = show();
    void Promise.all([
      getMailStatus(companyId),
      getMailTemplates(),
      getCompanySetting<Partial<CompanyMailSettings>>("mail", companyId),
    ])
      .then(([nextStatus, nextTemplates, record]) => {
        setStatus(nextStatus);
        setTemplates(nextTemplates);
        setSettings(mergeCompanyMailSettings(record));
      })
      .catch((error: unknown) => {
        toast.error("Could not load mail settings", {
          description: error instanceof Error ? error.message : "Please try again.",
        });
      })
      .finally(hide);
  }, [companyId, show]);

  async function saveSettings() {
    if (!companyId) {
      toast.error("Choose an active company first.");
      return;
    }

    setIsSaving(true);
    try {
      const record = await saveCompanySetting("mail", companyId, settings);
      setSettings(mergeCompanyMailSettings(record));
      setStatus(await getMailStatus(companyId));
      toast.success("Mail sender settings saved", {
        description: `${companyName} will use these sender overrides when available.`,
      });
    } catch (error) {
      toast.error("Could not save mail settings", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setIsSaving(false);
    }
  }

  async function sendTest() {
    if (!companyId) {
      toast.error("Choose an active company first.");
      return;
    }

    setIsSending(true);
    try {
      const result = await sendMailTest({ companyId, recipientEmail: testRecipient });
      toast.success("Test email queued", {
        description: `${result.verification.message} Queue id ${result.queued.queueJobId ?? result.queued.id}.`,
      });
    } catch (error) {
      toast.error("Could not send test email", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setIsSending(false);
    }
  }

  async function runPreview() {
    setIsPreviewing(true);
    try {
      const variables = parseJsonObject(previewVariablesText);
      const result = await previewMailTemplate(previewTemplateKey, { companyId, variables });
      setPreview(result);
    } catch (error) {
      toast.error("Could not preview template", {
        description: error instanceof Error ? error.message : "Preview variables must be valid JSON.",
      });
    } finally {
      setIsPreviewing(false);
    }
  }

  return (
    <CommonListPageFrame
      action={
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" className="rounded-xl">
            <Link href="/desk/admin/mail">Open mail logs</Link>
          </Button>
          <Button
            className="rounded-xl"
            disabled={!companyId || isSaving}
            onClick={() => void saveSettings()}
          >
            <Save className="size-4" />
            Save
          </Button>
        </div>
      }
      description={`Configure sender overrides, test delivery, and template preview for ${companyName}.`}
      technicalName="page.settings.mail"
      title="Mail"
    >
      <div className="grid gap-4 xl:grid-cols-[0.92fr_1.08fr]">
        <div className="grid gap-4">
          <Card className="rounded-md border-border/70">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Transport status</CardTitle>
              <CardDescription>
                Core Settings owns SMTP values. This page shows the active delivery mode and company overrides.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <StatusMetric
                label="Mode"
                value={status?.transport.mode === "smtp" ? "SMTP" : "Local stream"}
                badge={status?.transport.configured ? "Configured" : "Fallback"}
              />
              <StatusMetric
                label="Host"
                value={status?.transport.host ?? "Not configured"}
                badge={status?.transport.secure ? "TLS" : "Plain"}
              />
              <StatusMetric
                label="Default sender"
                value={status?.transport.defaultFromEmail ?? "Missing"}
                badge={status?.transport.defaultFromName ?? "No name"}
              />
              <StatusMetric
                label="Operational recipients"
                value={status?.sender.operationalRecipients.join(", ") || "Not set"}
                badge={`${status?.sender.operationalRecipients.length ?? 0} recipients`}
              />
            </CardContent>
          </Card>

          <Card className="rounded-md border-border/70">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Company sender overrides</CardTitle>
              <CardDescription>
                These values sit on top of global SMTP defaults for the active company.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              <FormField
                label="From email"
                value={settings.fromEmail}
                onChange={(value) => setSettings((current) => ({ ...current, fromEmail: value }))}
              />
              <FormField
                label="From name"
                value={settings.fromName}
                onChange={(value) => setSettings((current) => ({ ...current, fromName: value }))}
              />
              <FormField
                label="Reply-to"
                value={settings.replyTo}
                onChange={(value) => setSettings((current) => ({ ...current, replyTo: value }))}
              />
              <label className="grid gap-2">
                <span className="text-sm font-medium text-foreground">Operational recipients</span>
                <textarea
                  className="min-h-28 rounded-md border border-input bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-foreground/40"
                  placeholder="ops@example.com, finance@example.com"
                  value={settings.operationalRecipients}
                  onChange={(event) =>
                    setSettings((current) => ({
                      ...current,
                      operationalRecipients: event.target.value,
                    }))
                  }
                />
              </label>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4">
          <Card className="rounded-md border-border/70">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Test delivery</CardTitle>
              <CardDescription>
                Verify the transport and queue a real outbound test message for this company.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              <FormField
                label="Recipient email"
                value={testRecipient}
                onChange={setTestRecipient}
                placeholder="operator@example.com"
              />
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="rounded-md">
                  <ShieldCheck className="mr-1 size-3.5" />
                  Queued through the local worker
                </Badge>
              </div>
              <Button
                className="w-fit rounded-xl"
                disabled={isSending}
                onClick={() => void sendTest()}
              >
                <Send className="size-4" />
                Send test email
              </Button>
            </CardContent>
          </Card>

          <Card className="rounded-md border-border/70">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Template preview</CardTitle>
              <CardDescription>
                Preview rendered subject and body before wiring mail into more business flows.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              <label className="grid gap-2">
                <span className="text-sm font-medium text-foreground">Template</span>
                <select
                  className="h-11 rounded-md border border-input bg-background px-3 text-sm outline-none transition-colors focus:border-foreground/40"
                  value={previewTemplateKey}
                  onChange={(event) => setPreviewTemplateKey(event.target.value as MailTemplateKey)}
                >
                  {templates.map((template) => (
                    <option key={template.key} value={template.key}>
                      {template.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-2">
                <span className="text-sm font-medium text-foreground">Preview variables</span>
                <textarea
                  className="min-h-40 rounded-md border border-input bg-background px-3 py-2 font-mono text-sm outline-none transition-colors focus:border-foreground/40"
                  value={previewVariablesText}
                  onChange={(event) => setPreviewVariablesText(event.target.value)}
                />
              </label>
              <Button
                className="w-fit rounded-xl"
                variant="outline"
                disabled={isPreviewing}
                onClick={() => void runPreview()}
              >
                <Eye className="size-4" />
                Preview
              </Button>
              {preview ? (
                <div className="grid gap-3 rounded-md border border-border/70 bg-muted/15 px-4 py-4">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Subject
                    </p>
                    <p className="mt-1 text-sm text-foreground">{preview.subject}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Text
                    </p>
                    <pre className="mt-1 whitespace-pre-wrap text-sm text-foreground">
                      {preview.text}
                    </pre>
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      HTML
                    </p>
                    <div
                      className="mt-1 rounded-md border border-border/70 bg-background px-3 py-3 text-sm text-foreground"
                      dangerouslySetInnerHTML={{ __html: preview.html }}
                    />
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </div>
    </CommonListPageFrame>
  );
}

function mergeCompanyMailSettings(record: CompanySettingRecord<Partial<CompanyMailSettings>>) {
  return {
    ...defaultCompanyMailSettings,
    ...record.values,
  };
}

function parseJsonObject(value: string) {
  const parsed = JSON.parse(value) as unknown;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Preview variables must be a JSON object.");
  }
  return parsed as Record<string, unknown>;
}

function StatusMetric({
  badge,
  label,
  value,
}: {
  readonly badge: string;
  readonly label: string;
  readonly value: string;
}) {
  return (
    <div className="rounded-md border border-border/70 bg-card px-4 py-3 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">{label}</p>
        <Badge variant="outline" className="rounded-md">
          {badge}
        </Badge>
      </div>
      <p className="mt-1 text-sm font-medium text-foreground">{value}</p>
    </div>
  );
}

function FormField({
  label,
  onChange,
  placeholder,
  value,
}: {
  readonly label: string;
  readonly onChange: (value: string) => void;
  readonly placeholder?: string;
  readonly value: string;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-medium text-foreground">{label}</span>
      <input
        className="h-11 rounded-md border border-input bg-background px-3 text-sm outline-none transition-colors focus:border-foreground/40"
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}
