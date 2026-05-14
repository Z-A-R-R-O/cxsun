import type React from "react"
import { Check, Save, X } from "lucide-react"

import { Badge } from "src/components/ui/badge"
import { Button } from "src/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "src/components/ui/dialog"
import { Input } from "src/components/ui/input"
import { Label } from "src/components/ui/label"
import { Separator } from "src/components/ui/separator"
import { Switch } from "src/components/ui/switch"
import type { TenantFormState } from "../../domain/tenant"

export function TenantUpsertDialog({
  form,
  message,
  onFormChange,
  onOpenChange,
  onSave,
  open,
  saving,
}: {
  form: TenantFormState
  message: string | null
  onFormChange: <K extends keyof TenantFormState>(key: K, value: TenantFormState[K]) => void
  onOpenChange: (open: boolean) => void
  onSave: () => void
  open: boolean
  saving: boolean
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{form.id ? "Edit tenant" : "New tenant"}</DialogTitle>
          <DialogDescription>
            Update tenant identity and lifecycle status.
          </DialogDescription>
        </DialogHeader>

        <Separator />

        <div className="grid max-h-[70vh] gap-4 overflow-y-auto p-1">
          <Field label="Tenant name">
            <Input
              className="h-11 rounded-md"
              placeholder="Codexsun"
              value={form.name}
              onChange={(event) => onFormChange("name", event.target.value)}
            />
          </Field>
          <Field label="Code">
            <Input
              className="h-11 rounded-md font-mono text-sm"
              min={100}
              placeholder="Auto starts from 100"
              type="number"
              value={form.code}
              onChange={(event) => onFormChange("code", event.target.value)}
            />
          </Field>
          <ActiveStatusField
            checked={form.status === "active"}
            onCheckedChange={(checked) => onFormChange("status", checked ? "active" : "not_active")}
          />
        </div>

        {message ? <p className="text-sm font-medium text-destructive">{message}</p> : null}

        <DialogFooter className="gap-2">
          <Button className="rounded-md" onClick={() => onOpenChange(false)} type="button" variant="outline">
            <X className="size-4" />
            Cancel
          </Button>
          <Button className="rounded-md" disabled={saving} onClick={onSave} type="button">
            <Save className="size-4" />
            {saving ? "Saving" : form.id ? "Update tenant" : "Create tenant"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function ActiveStatusField({
  checked,
  onCheckedChange,
}: {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
}) {
  return (
    <div
      className={
        checked
          ? "flex min-h-16 w-full items-center justify-between gap-4 rounded-md border border-emerald-300 bg-emerald-50 px-4 py-3 dark:border-emerald-500/40 dark:bg-emerald-950/30"
          : "flex min-h-16 w-full items-center justify-between gap-4 rounded-md border border-border bg-muted/30 px-4 py-3"
      }
    >
      <div className="min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-3">
          <Label htmlFor="tenant-active" className="text-sm font-semibold text-foreground">
            Active
          </Label>
          {checked ? (
            <Badge
              className="size-5 rounded-full bg-emerald-600 p-0 text-white hover:bg-emerald-600"
              aria-label="Enabled"
            >
              <Check className="size-3.5" aria-hidden="true" />
            </Badge>
          ) : (
            <span className="pl-1 text-[10px] text-muted-foreground">Disabled</span>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Active tenants can be selected in organisation workflows.
        </p>
      </div>
      <Switch
        id="tenant-active"
        checked={checked}
        aria-label="Toggle tenant active status"
        onCheckedChange={onCheckedChange}
      />
    </div>
  )
}

function Field({
  children,
  className,
  label,
}: {
  children: React.ReactNode
  className?: string
  label: string
}) {
  return (
    <div className={className ? `grid gap-2 ${className}` : "grid gap-2"}>
      <Label className="text-sm font-medium">{label}</Label>
      {children}
    </div>
  )
}
