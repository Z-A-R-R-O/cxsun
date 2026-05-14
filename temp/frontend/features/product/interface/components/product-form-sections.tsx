"use client";

import type { ComponentProps, ReactNode } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button, Input, Label, Switch } from "@cxnext/ui";

export function ProductSection({
  action,
  children,
  title,
}: {
  readonly action?: ReactNode;
  readonly children: ReactNode;
  readonly title: string;
}) {
  return (
    <section className="rounded-md border border-border/70 bg-background p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export function ProductField({
  children,
  label,
}: {
  readonly children: ReactNode;
  readonly label: string;
}) {
  return (
    <Label className="grid gap-2 text-sm font-medium text-muted-foreground">
      <span>{label}</span>
      {children}
    </Label>
  );
}

export function ProductTextInput(props: ComponentProps<typeof Input>) {
  return <Input {...props} className={`h-11 rounded-xl ${props.className ?? ""}`} />;
}

export function ProductStatusSwitch({
  checked,
  onCheckedChange,
}: {
  readonly checked: boolean;
  readonly onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div
      className={
        checked
          ? "flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-950"
          : "flex items-center justify-between rounded-xl border border-border/70 bg-muted/10 px-4 py-3"
      }
    >
      <div>
        <p className="text-sm font-medium">Active product</p>
        <p className="text-xs text-muted-foreground">Inactive products stay saved but hidden.</p>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}

export function AddRowButton({ onClick }: { readonly onClick: () => void }) {
  return (
    <Button type="button" size="sm" variant="outline" className="rounded-xl" onClick={onClick}>
      <Plus className="size-4" />
      Add
    </Button>
  );
}

export function RemoveRowButton({ onClick }: { readonly onClick: () => void }) {
  return (
    <Button
      type="button"
      size="icon"
      variant="ghost"
      className="size-8 rounded-full"
      onClick={onClick}
    >
      <Trash2 className="size-4" />
    </Button>
  );
}
