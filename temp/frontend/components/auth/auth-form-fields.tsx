"use client";

import type { ReactNode } from "react";
import { Input, Label } from "@cxnext/ui";

export function AuthField({
  autoComplete,
  error,
  label,
  name,
  onChange,
  placeholder,
  type = "text",
  value,
}: {
  readonly autoComplete: string;
  readonly error?: string;
  readonly label: string;
  readonly name: string;
  readonly onChange: (value: string) => void;
  readonly placeholder: string;
  readonly type?: string;
  readonly value: string;
}) {
  return (
    <div className="space-y-2.5">
      <Label htmlFor={name} className="text-sm font-medium text-foreground">
        {label}
      </Label>
      <Input
        id={name}
        name={name}
        type={type}
        value={value}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className="h-11 rounded-xl border-border/80 bg-background/95 shadow-none"
        onChange={(event) => onChange(event.target.value)}
      />
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}

export function AuthSubmitError({ children }: { readonly children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
      {children}
    </div>
  );
}
