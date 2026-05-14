"use client";

import Link from "next/link";
import { useState } from "react";
import { z } from "zod";
import { ArrowRight } from "lucide-react";
import { Button } from "@cxnext/ui";
import { AuthField, AuthSubmitError } from "./auth-form-fields";

const registerSchema = z.object({
  name: z.string().min(2, "Enter your name"),
  login: z.string().min(2, "Enter username or email"),
  password: z.string().min(8, "Use at least 8 characters"),
});

export function RegisterForm() {
  const [values, setValues] = useState({ name: "", login: "", password: "" });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);

  function updateField(key: keyof typeof values, value: string) {
    setValues((current) => ({ ...current, [key]: value }));
    setFieldErrors((current) => {
      const next = { ...current };
      delete next[key];
      return next;
    });
    setSubmitError(null);
  }

  function handleSubmit() {
    setSubmitError(null);
    const result = registerSchema.safeParse(values);
    if (!result.success) {
      setFieldErrors(
        Object.fromEntries(
          result.error.issues.map((issue) => [String(issue.path[0] ?? "form"), issue.message]),
        ),
      );
      return;
    }

    setSubmitError("Registration flow is not wired yet.");
  }

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        event.stopPropagation();
        handleSubmit();
      }}
    >
      <AuthField
        autoComplete="name"
        error={fieldErrors.name}
        label="Name"
        name="name"
        placeholder="Your name"
        value={values.name}
        onChange={(value) => updateField("name", value)}
      />
      <AuthField
        autoComplete="username"
        error={fieldErrors.login}
        label="Username or email"
        name="login"
        placeholder="you@company.com"
        value={values.login}
        onChange={(value) => updateField("login", value)}
      />
      <AuthField
        autoComplete="new-password"
        error={fieldErrors.password}
        label="Password"
        name="password"
        placeholder="Create password"
        type="password"
        value={values.password}
        onChange={(value) => updateField("password", value)}
      />
      {submitError ? <AuthSubmitError>{submitError}</AuthSubmitError> : null}
      <Button type="submit" size="lg" className="mt-2 h-11 w-full gap-2 rounded-xl">
        Create account
        <ArrowRight className="size-4" />
      </Button>
      <div className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-foreground underline underline-offset-4">
          Login
        </Link>
      </div>
    </form>
  );
}
