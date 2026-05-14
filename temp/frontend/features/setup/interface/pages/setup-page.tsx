"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Download, Play, RefreshCcw, Save, ServerCog } from "lucide-react";
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label, useGlobalLoader } from "@cxnext/ui";
import {
  configureSetup,
  getSetupStatus,
  runSetupAction,
  type SetupAction,
  type SetupConfigureInput,
  type SetupResponse,
} from "../../infrastructure/setup-api";

const defaultForm: SetupConfigureInput = {
  appHost: "0.0.0.0",
  appHttpPort: "4000",
  frontendHttpPort: "3000",
  dbHost: "mariadb",
  dbPort: "3306",
  dbName: "cxnext_db",
  dbUser: "root",
  dbPassword: "DbPass1@@",
  jwtSecret: "",
  gitUrl: "https://github.com/sundar-aaran/cxnext.git",
  gitBranch: "main",
  deployDir: "/opt/cxnext",
};

export function SetupPage() {
  const { show } = useGlobalLoader();
  const [form, setForm] = useState(defaultForm);
  const [status, setStatus] = useState<SetupResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    void getSetupStatus({ signal: controller.signal })
      .then((result) => {
        setStatus(result);
        const values = result.setup?.values;
        if (values) {
          setForm((current) => ({
            ...current,
            appHost: values.APP_HOST || current.appHost,
            appHttpPort: values.APP_HTTP_PORT || current.appHttpPort,
            frontendHttpPort: values.FRONTEND_HTTP_PORT || current.frontendHttpPort,
            dbHost: values.DB_HOST || current.dbHost,
            dbPort: values.DB_PORT || current.dbPort,
            dbName: values.DB_NAME || current.dbName,
            dbUser: values.DB_USER || current.dbUser,
            gitUrl: values.GIT_URL || current.gitUrl,
            gitBranch: values.GIT_BRANCH || current.gitBranch,
            deployDir: values.DEPLOY_DIR || current.deployDir,
          }));
        }
      })
      .catch((loadError) => {
        if (isAbortError(loadError)) return;
        setError(loadError instanceof Error ? loadError.message : "Could not load setup status.");
      });
    return () => controller.abort();
  }, []);

  async function saveConfig() {
    setRunning("configure");
    setError(null);
    const hide = show();
    try {
      const result = await configureSetup({
        ...form,
        jwtSecret: form.jwtSecret || createSecret(),
      });
      setStatus(result);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not save setup.");
    } finally {
      setRunning(null);
      hide();
    }
  }

  async function runAction(action: SetupAction) {
    setRunning(action);
    setError(null);
    const hide = show();
    try {
      const result = await runSetupAction(action);
      setStatus(result);
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : `Could not run ${action}.`);
    } finally {
      setRunning(null);
      hide();
    }
  }

  const configured = Boolean(status?.setup?.configured);
  const missing = status?.setup?.missing ?? [];

  return (
    <main className="min-h-screen bg-background px-5 py-8">
      <div className="mx-auto grid max-w-6xl gap-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-primary">cxnext setup</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-normal">Install application</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Configure database and deployment values, download the latest source, build the container, and start the web app.
            </p>
          </div>
          <StatusPill configured={configured} envExists={Boolean(status?.setup?.envExists)} />
        </div>

        {error ? (
          <div className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        <Card className="rounded-md border-border/70">
          <CardHeader>
            <CardTitle className="text-base">Environment</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <Field label="App host" value={form.appHost} onChange={(value) => update("appHost", value)} />
            <Field label="Backend port" value={form.appHttpPort} onChange={(value) => update("appHttpPort", value)} />
            <Field label="Frontend port" value={form.frontendHttpPort} onChange={(value) => update("frontendHttpPort", value)} />
            <Field label="Deploy directory" value={form.deployDir} onChange={(value) => update("deployDir", value)} />
            <Field label="Git URL" value={form.gitUrl} onChange={(value) => update("gitUrl", value)} />
            <Field label="Git branch" value={form.gitBranch} onChange={(value) => update("gitBranch", value)} />
          </CardContent>
        </Card>

        <Card className="rounded-md border-border/70">
          <CardHeader>
            <CardTitle className="text-base">Database</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <Field label="Host" value={form.dbHost} onChange={(value) => update("dbHost", value)} />
            <Field label="Port" value={form.dbPort} onChange={(value) => update("dbPort", value)} />
            <Field label="Database" value={form.dbName} onChange={(value) => update("dbName", value)} />
            <Field label="User" value={form.dbUser} onChange={(value) => update("dbUser", value)} />
            <Field label="Password" type="password" value={form.dbPassword} onChange={(value) => update("dbPassword", value)} />
            <Field label="JWT secret" type="password" value={form.jwtSecret} placeholder="Auto-generate on save" onChange={(value) => update("jwtSecret", value)} />
          </CardContent>
        </Card>

        <Card className="rounded-md border-border/70">
          <CardHeader>
            <CardTitle className="text-base">Install Steps</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button onClick={() => void saveConfig()} disabled={Boolean(running)}>
              <Save className="size-4" />
              {running === "configure" ? "Saving..." : "Save Setup"}
            </Button>
            <Button variant="outline" onClick={() => void runAction("pull")} disabled={Boolean(running)}>
              <Download className="size-4" />
              Pull Latest
            </Button>
            <Button variant="outline" onClick={() => void runAction("build")} disabled={Boolean(running)}>
              <ServerCog className="size-4" />
              Build
            </Button>
            <Button variant="outline" onClick={() => void runAction("start")} disabled={Boolean(running)}>
              <Play className="size-4" />
              Start
            </Button>
            <Button variant="outline" onClick={() => void runAction("smoke")} disabled={Boolean(running)}>
              <CheckCircle2 className="size-4" />
              Smoke Test
            </Button>
            <Button onClick={() => void runAction("deploy")} disabled={Boolean(running)}>
              <RefreshCcw className="size-4" />
              Pull, Build & Start
            </Button>
          </CardContent>
        </Card>

        {missing.length ? (
          <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Missing values: {missing.join(", ")}
          </div>
        ) : null}

        <Card className="rounded-md border-border/70">
          <CardHeader>
            <CardTitle className="text-base">Last Result</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="max-h-[320px] overflow-auto rounded-md border border-border/70 bg-muted/25 p-4 text-xs">
              {JSON.stringify(status, null, 2)}
            </pre>
          </CardContent>
        </Card>
      </div>
    </main>
  );

  function update(key: keyof SetupConfigureInput, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }
}

function Field({
  label,
  onChange,
  placeholder,
  type = "text",
  value,
}: {
  readonly label: string;
  readonly onChange: (value: string) => void;
  readonly placeholder?: string;
  readonly type?: string;
  readonly value: string;
}) {
  return (
    <label className="grid gap-2">
      <Label>{label}</Label>
      <Input type={type} value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function StatusPill({ configured, envExists }: { readonly configured: boolean; readonly envExists: boolean }) {
  return (
    <div
      className={
        configured
          ? "inline-flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700"
          : "inline-flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800"
      }
    >
      <CheckCircle2 className="size-4" />
      {configured ? "Configured" : envExists ? "Needs values" : "Setup required"}
    </div>
  );
}

function createSecret() {
  const randomValues = new Uint32Array(8);
  crypto.getRandomValues(randomValues);
  return `cxnext-${Array.from(randomValues, (value) => value.toString(16).padStart(8, "0")).join("")}`;
}

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === "AbortError";
}
