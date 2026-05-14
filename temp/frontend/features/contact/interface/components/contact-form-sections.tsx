"use client";

import type { ReactNode } from "react";
import { Button, Input, Label, MasterListUpsertCard, Switch } from "@cxnext/ui";
import { Plus, Trash2 } from "lucide-react";

export function ContactField({
  children,
  label,
}: {
  readonly children: ReactNode;
  readonly label: string;
}) {
  return (
    <div className="grid gap-2">
      <Label className="text-sm font-medium">{label}</Label>
      {children}
    </div>
  );
}

export function ContactTextInput(props: React.ComponentProps<typeof Input>) {
  return <Input {...props} className="h-11 rounded-xl" />;
}

export function ContactStatusSwitch({
  checked,
  onCheckedChange,
}: {
  readonly checked: boolean;
  readonly onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <label
      className={
        checked
          ? "flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-emerald-300 bg-emerald-50/90 px-4 py-3 text-emerald-950 shadow-sm shadow-emerald-100/80 ring-1 ring-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-100 dark:shadow-none dark:ring-emerald-900/40"
          : "flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-border/70 bg-muted/10 px-4 py-3"
      }
    >
      <span>
        <span className="block text-sm font-medium">Active</span>
        <span className="block text-xs text-muted-foreground">
          Active contacts are available in contact workflows.
        </span>
      </span>
      <Switch checked={checked} aria-label="Active" onCheckedChange={onCheckedChange} />
    </label>
  );
}

export function ContactSection({
  action,
  children,
  title,
}: {
  readonly action?: ReactNode;
  readonly children: ReactNode;
  readonly title: string;
}) {
  return (
    <MasterListUpsertCard title={title}>
      <div className="space-y-5">
        {action ? <div className="flex justify-end">{action}</div> : null}
        {children}
      </div>
    </MasterListUpsertCard>
  );
}

export function AddRowButton({ onClick }: { readonly onClick: () => void }) {
  return (
    <Button type="button" variant="outline" className="rounded-xl" onClick={onClick}>
      <Plus className="size-4" />
      Add
    </Button>
  );
}

export function RemoveRowButton({ onClick }: { readonly onClick: () => void }) {
  return (
    <Button type="button" variant="ghost" size="sm" className="rounded-xl" onClick={onClick}>
      <Trash2 className="size-4" />
      Remove
    </Button>
  );
}
