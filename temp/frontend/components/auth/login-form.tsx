"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { z } from "zod";
import { ArrowRight } from "lucide-react";
import { Button } from "@cxnext/ui";
import { getDefaultApplicationContext } from "../../features/application-context/infrastructure/application-context-api";
import { login } from "../../features/auth/infrastructure/auth-api";
import { persistStoredAuthSession } from "../../features/auth/infrastructure/session-storage";
import { loadCompanySoftwareSettings } from "../../features/settings/application/software-settings-service";
import { AuthField, AuthSubmitError } from "./auth-form-fields";

const loginSchema = z.object({
  login: z.string().min(2, "Enter username or email"),
  password: z.string().min(8, "Use at least 8 characters"),
});

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [values, setValues] = useState({ login: "", password: "" });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    void router.prefetch("/desk");
    void router.prefetch("/desk/billing");
  }, [router]);

  function updateField(key: keyof typeof values, value: string) {
    setValues((current) => ({ ...current, [key]: value }));
    setFieldErrors((current) => {
      const next = { ...current };
      delete next[key];
      return next;
    });
    setSubmitError(null);
  }

  async function handleSubmit() {
    if (isSubmitting) return;

    setSubmitError(null);
    const result = loginSchema.safeParse(values);

    if (!result.success) {
      setFieldErrors(
        Object.fromEntries(
          result.error.issues.map((issue) => [String(issue.path[0] ?? "form"), issue.message]),
        ),
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const session = await login(result.data);
      persistStoredAuthSession(session);
      const nextDestination = searchParams.get("next");
      const destination = nextDestination ?? resolveStoredWorkspaceDestination(session);

      router.replace(destination);
      router.refresh();
      void hydrateSessionContext(session);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Could not sign in.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        event.stopPropagation();
        void handleSubmit();
      }}
    >
      <AuthField
        autoComplete="username"
        error={fieldErrors.login}
        label="Username or email"
        name="login"
        placeholder="admin or you@company.com"
        value={values.login}
        onChange={(value) => updateField("login", value)}
      />
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <label htmlFor="password" className="text-sm font-medium text-foreground">
            Password
          </label>
          <Link
            href="/password-reset"
            className="text-sm font-medium text-foreground underline underline-offset-4"
          >
            Forgot password?
          </Link>
        </div>
        <AuthField
          autoComplete="current-password"
          error={fieldErrors.password}
          label=""
          name="password"
          placeholder="Enter password"
          type="password"
          value={values.password}
          onChange={(value) => updateField("password", value)}
        />
      </div>
      {submitError ? <AuthSubmitError>{submitError}</AuthSubmitError> : null}
      <Button type="submit" size="lg" className="mt-2 h-11 w-full gap-2 rounded-xl" disabled={isSubmitting}>
        {isSubmitting ? "Checking..." : "Login"}
        <ArrowRight className="size-4" />
      </Button>
    </form>
  );
}

function resolveStoredWorkspaceDestination(session: Awaited<ReturnType<typeof login>>) {
  const companyId = session.context?.company.id ?? null;
  if (!companyId) {
    return "/desk";
  }

  const softwareSettings = loadCompanySoftwareSettings(companyId);
  return softwareSettings.favoriteDashboardApp === "billing" ? "/desk/billing" : "/desk";
}

async function hydrateSessionContext(session: Awaited<ReturnType<typeof login>>) {
  if (session.context) {
    persistStoredAuthSession(session);
    return;
  }

  try {
    const context = await getDefaultApplicationContext();
    persistStoredAuthSession({ ...session, context });
  } catch {
    persistStoredAuthSession(session);
  }
}
