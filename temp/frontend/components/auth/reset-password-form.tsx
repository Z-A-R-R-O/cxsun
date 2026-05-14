"use client";

import Link from "next/link";
import { useState } from "react";
import { z } from "zod";
import { ArrowRight } from "lucide-react";
import { Button } from "@cxnext/ui";
import { AuthField, AuthSubmitError } from "./auth-form-fields";

const resetPasswordSchema = z.object({
  login: z.string().min(2, "Enter username or email"),
});

export function ResetPasswordForm() {
  const [loginValue, setLoginValue] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  function handleSubmit() {
    setSubmitError(null);
    const result = resetPasswordSchema.safeParse({ login: loginValue });
    if (!result.success) {
      setFieldError(result.error.issues[0]?.message ?? "Enter username or email");
      return;
    }

    setFieldError(null);
    setSubmitError("Password reset flow is not wired yet.");
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
        autoComplete="username"
        error={fieldError ?? undefined}
        label="Username or email"
        name="login"
        placeholder="you@company.com"
        value={loginValue}
        onChange={(value) => {
          setLoginValue(value);
          setFieldError(null);
          setSubmitError(null);
        }}
      />
      {submitError ? <AuthSubmitError>{submitError}</AuthSubmitError> : null}
      <Button type="submit" size="lg" className="mt-2 h-11 w-full gap-2 rounded-xl">
        Send reset link
        <ArrowRight className="size-4" />
      </Button>
      <div className="text-center text-sm text-muted-foreground">
        Back to{" "}
        <Link href="/login" className="font-medium text-foreground underline underline-offset-4">
          Login
        </Link>
      </div>
    </form>
  );
}
