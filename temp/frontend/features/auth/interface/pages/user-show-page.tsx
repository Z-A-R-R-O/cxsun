"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { ArrowLeft, Pencil } from "lucide-react";
import {
  AnimatedTabs,
  Badge,
  Button,
  MasterListEmptyState,
  MasterListPageFrame,
  MasterListTableCard,
} from "@cxnext/ui";
import type { AuthPolicy, AuthUser } from "../../domain/auth";
import { getAuthUser, listAuthPolicies } from "../../infrastructure/auth-api";
import { readStoredAuthSession } from "../../infrastructure/session-storage";

export function UserShowPage({ userId }: { readonly userId: string }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [policies, setPolicies] = useState<readonly AuthPolicy[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const nextPath = `/desk/admin/users/${userId}`;
    if (!readStoredAuthSession()) {
      window.location.href = `/login?next=${encodeURIComponent(nextPath)}`;
      return;
    }

    async function load() {
      const [userRecord, policyRows] = await Promise.all([getAuthUser(userId), listAuthPolicies()]);
      setUser(userRecord);
      setPolicies(policyRows);
    }

    void load()
      .catch((loadError) =>
        setError(loadError instanceof Error ? loadError.message : "Could not load user access."),
      )
      .finally(() => setIsLoading(false));
  }, [userId]);

  const permissionKeys = useMemo(
    () => new Set(user?.permissions.map((permission) => permission.key) ?? []),
    [user],
  );

  if (isLoading) {
    return (
      <MasterListPageFrame description="" technicalName="page.auth.user.show.loading" title="User">
        <MasterListEmptyState>Loading user...</MasterListEmptyState>
      </MasterListPageFrame>
    );
  }

  if (error || !user) {
    return (
      <MasterListPageFrame description="" technicalName="page.auth.user.show.error" title="User">
        <MasterListEmptyState className="rounded-2xl border border-destructive/20 bg-destructive/5 text-destructive">
          {error ?? "User was not found."}
        </MasterListEmptyState>
      </MasterListPageFrame>
    );
  }

  const tabs = [
    {
      value: "roles",
      label: "Role",
      content: (
        <MasterListTableCard className="rounded-md">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] border-collapse text-sm">
              <thead className="bg-muted/55">
                <tr>
                  <HeaderCell>Role</HeaderCell>
                  <HeaderCell>Key</HeaderCell>
                  <HeaderCell>Status</HeaderCell>
                  <HeaderCell>Description</HeaderCell>
                </tr>
              </thead>
              <tbody>
                {user.roles.map((role) => (
                  <tr key={role.id} className="border-b border-border/60 last:border-b-0">
                    <td className="px-4 py-3 font-medium text-foreground">{role.name}</td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{role.key}</td>
                    <td className="px-4 py-3">
                      <StatusBadges isActive={role.isActive} isSystem={role.isSystem} />
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{role.description ?? ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {user.roles.length === 0 ? <MasterListEmptyState>No roles assigned.</MasterListEmptyState> : null}
        </MasterListTableCard>
      ),
    },
    {
      value: "permissions",
      label: "Permission",
      content: (
        <MasterListTableCard className="rounded-md">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {groupPermissions(user.permissions).map(([moduleKey, permissions]) => (
              <div key={moduleKey} className="rounded-md border border-border/70 bg-background">
                <div className="border-b border-border/70 bg-muted/45 px-4 py-3">
                  <div className="text-sm font-semibold capitalize text-foreground">{moduleKey}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{permissions.length} granted</div>
                </div>
                <div className="divide-y divide-border/60">
                  {permissions.map((permission) => (
                    <div key={permission.key} className="px-4 py-3">
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-medium text-foreground">{permission.name}</span>
                        <Badge variant="outline">{permission.action}</Badge>
                      </div>
                      <div className="mt-1 font-mono text-xs text-muted-foreground">{permission.key}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          {user.permissions.length === 0 ? (
            <MasterListEmptyState>No effective permissions.</MasterListEmptyState>
          ) : null}
        </MasterListTableCard>
      ),
    },
    {
      value: "policy",
      label: "Policy",
      content: (
        <MasterListTableCard className="rounded-md">
          <div className="grid gap-4 md:grid-cols-2">
            {policies.map((policy) => {
              const grantedKeys = user.permissions
                .filter((permission) => permission.action === policy.key)
                .map((permission) => permission.key);

              return (
                <div key={policy.key} className="rounded-md border border-border/70 bg-background p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-foreground">{policy.name}</div>
                      <div className="mt-1 font-mono text-xs text-muted-foreground">{policy.key}</div>
                    </div>
                    <Badge variant={grantedKeys.length > 0 ? "secondary" : "outline"}>
                      {grantedKeys.length}
                    </Badge>
                  </div>
                  <p className="mt-3 text-sm text-muted-foreground">{policy.description}</p>
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {grantedKeys.map((permissionKey) => (
                      <Badge
                        key={permissionKey}
                        variant={permissionKeys.has(permissionKey) ? "secondary" : "outline"}
                      >
                        {permissionKey}
                      </Badge>
                    ))}
                    {grantedKeys.length === 0 ? (
                      <span className="text-sm text-muted-foreground">No granted modules.</span>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </MasterListTableCard>
      ),
    },
  ] as const;

  return (
    <MasterListPageFrame
      action={
        <div className="flex gap-2">
          <Button asChild variant="outline" className="rounded-xl">
            <Link href="/desk/admin/users">
              <ArrowLeft className="size-4" />
              Back
            </Link>
          </Button>
          <Button asChild className="rounded-xl">
            <Link href={`/desk/admin/users/${user.id}/edit`}>
              <Pencil className="size-4" />
              Edit
            </Link>
          </Button>
        </div>
      }
      description={`${user.email} | ${user.tenant.name}`}
      technicalName="page.auth.user.show"
      title={user.displayName}
    >
      <div className="grid gap-4 md:grid-cols-4">
        <Summary label="Username" value={user.username} />
        <Summary label="Tenant" value={user.tenant.name} />
        <Summary label="Roles" value={String(user.roles.length)} />
        <Summary label="Status" value={user.isActive ? "Active" : "Inactive"} />
      </div>
      <AnimatedTabs defaultValue="roles" tabs={tabs} />
    </MasterListPageFrame>
  );
}

function HeaderCell({ children }: { readonly children: ReactNode }) {
  return (
    <th className="border-b border-border/70 px-4 py-2.5 text-left font-medium text-foreground">
      {children}
    </th>
  );
}

function Summary({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div className="rounded-md border border-border/70 bg-card px-4 py-3 shadow-sm">
      <div className="text-xs uppercase text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm font-semibold text-foreground">{value}</div>
    </div>
  );
}

function StatusBadges({
  isActive,
  isSystem,
}: {
  readonly isActive: boolean;
  readonly isSystem?: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      <Badge variant="outline" className={isActive ? "border-emerald-200 bg-emerald-50 text-emerald-700" : ""}>
        {isActive ? "active" : "inactive"}
      </Badge>
      {isSystem ? <Badge variant="secondary">system</Badge> : null}
    </div>
  );
}

function groupPermissions(permissions: AuthUser["permissions"]) {
  const groups = new Map<string, AuthUser["permissions"][number][]>();
  for (const permission of permissions) {
    groups.set(permission.moduleKey, [...(groups.get(permission.moduleKey) ?? []), permission]);
  }

  return [...groups.entries()].sort(([left], [right]) => left.localeCompare(right));
}
