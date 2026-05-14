"use client";

import { BadgeCheck, Bell, CreditCard, Sparkles } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CommonListPageFrame,
  Input,
  Label,
} from "@cxnext/ui";
import type { AuthSession } from "../../../auth/domain/auth";
import { changeOwnPassword } from "../../../auth/infrastructure/auth-api";
import { readStoredAuthSession } from "../../../auth/infrastructure/session-storage";

export function AccountPage() {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    nextPassword: "",
    confirmPassword: "",
  });
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  useEffect(() => {
    setSession(readStoredAuthSession());
  }, []);

  async function submitPasswordChange() {
    if (passwordForm.nextPassword.length < 8) {
      toast.error("Use at least 8 characters.");
      return;
    }

    if (passwordForm.nextPassword !== passwordForm.confirmPassword) {
      toast.error("New password and confirmation do not match.");
      return;
    }

    setIsChangingPassword(true);
    try {
      await changeOwnPassword({
        currentPassword: passwordForm.currentPassword,
        nextPassword: passwordForm.nextPassword,
      });
      setPasswordForm({ currentPassword: "", nextPassword: "", confirmPassword: "" });
      toast.success("Password changed");
    } catch (error) {
      toast.error("Could not change password", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setIsChangingPassword(false);
    }
  }

  return (
    <CommonListPageFrame
      description="Review your profile and manage account security."
      technicalName="page.account.index"
      title="Account"
    >
      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <Card className="rounded-md border-border/70">
          <CardHeader className="pb-3">
            <div className="flex size-10 items-center justify-center rounded-md bg-muted text-foreground">
              <BadgeCheck className="size-5" />
            </div>
            <CardTitle className="text-base">Profile</CardTitle>
            <CardDescription>Current signed-in user details.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            <ProfileRow label="Name" value={session?.user.displayName ?? "-"} />
            <ProfileRow label="Email" value={session?.user.email ?? "-"} />
            <ProfileRow label="Username" value={session?.user.username ?? "-"} />
            <ProfileRow label="Tenant" value={session?.tenant.name ?? "-"} />
            <ProfileRow
              label="Roles"
              value={session?.user.roles.map((role) => role.name).join(", ") || "-"}
            />
          </CardContent>
        </Card>

        <Card className="rounded-md border-border/70">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Change Password</CardTitle>
            <CardDescription>Update the password used for your login.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <PasswordField
              label="Current password"
              value={passwordForm.currentPassword}
              onChange={(value) =>
                setPasswordForm((current) => ({ ...current, currentPassword: value }))
              }
            />
            <PasswordField
              label="New password"
              value={passwordForm.nextPassword}
              onChange={(value) =>
                setPasswordForm((current) => ({ ...current, nextPassword: value }))
              }
            />
            <PasswordField
              label="Confirm new password"
              value={passwordForm.confirmPassword}
              onChange={(value) =>
                setPasswordForm((current) => ({ ...current, confirmPassword: value }))
              }
            />
            <Button
              className="w-fit rounded-xl"
              disabled={isChangingPassword}
              onClick={() => void submitPasswordChange()}
            >
              Change password
            </Button>
          </CardContent>
        </Card>
      </div>
    </CommonListPageFrame>
  );
}

function PasswordField({
  label,
  onChange,
  value,
}: {
  readonly label: string;
  readonly onChange: (value: string) => void;
  readonly value: string;
}) {
  return (
    <div className="grid gap-2">
      <Label className="text-sm font-medium text-foreground">{label}</Label>
      <Input
        type="password"
        value={value}
        className="h-10 rounded-md"
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

export function BillingPage() {
  return (
    <ScaffoldPage
      description="Subscription, invoices, and payment methods will appear here."
      icon={<CreditCard className="size-5" />}
      technicalName="page.account.billing"
      title="Billing"
    />
  );
}

export function NotificationsPage() {
  return (
    <ScaffoldPage
      description="Notification preferences and alerts will appear here."
      icon={<Bell className="size-5" />}
      technicalName="page.account.notifications"
      title="Notifications"
    />
  );
}

export function UpgradePage() {
  return (
    <ScaffoldPage
      description="Software editions, feature tiers, and version upgrade options will appear here."
      icon={<Sparkles className="size-5" />}
      technicalName="page.account.upgrade"
      title="Upgrade to Pro"
    />
  );
}

function ScaffoldPage({
  description,
  icon,
  technicalName,
  title,
}: {
  readonly description: string;
  readonly icon: ReactNode;
  readonly technicalName: string;
  readonly title: string;
}) {
  return (
    <CommonListPageFrame description={description} technicalName={technicalName} title={title}>
      <Card className="rounded-md border-border/70">
        <CardHeader className="pb-3">
          <div className="flex size-10 items-center justify-center rounded-md bg-muted text-foreground">
            {icon}
          </div>
          <CardTitle className="text-base">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-dashed border-border/80 bg-muted/20 px-4 py-8 text-sm text-muted-foreground">
            No data configured.
          </div>
        </CardContent>
      </Card>
    </CommonListPageFrame>
  );
}

function ProfileRow({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div className="grid gap-1 rounded-md border border-border/70 bg-background px-3 py-2">
      <span className="text-xs font-medium uppercase text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-foreground">{value}</span>
    </div>
  );
}
