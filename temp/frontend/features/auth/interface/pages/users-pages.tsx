"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { ArrowLeft, ArrowRight, Save, UserPlus } from "lucide-react";
import {
  Badge,
  Button,
  Input,
  Label,
  MasterListEmptyState,
  MasterListPageFrame,
  MasterListPaginationCard,
  MasterListTableCard,
  MasterListToolbarCard,
  MasterListUpsertCard,
  MasterListUpsertLayout,
  Switch,
  buildMasterListShowingLabel,
} from "@cxnext/ui";
import type { AuthSession, AuthUser, AuthUserInput } from "../../domain/auth";
import {
  getAuthUser,
  listAuthRoles,
  listAuthUsers,
  listTenants,
  upsertAuthUser,
} from "../../infrastructure/auth-api";
import { readStoredAuthSession } from "../../infrastructure/session-storage";

interface TenantOption {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
}

const emptyInput: AuthUserInput = {
  tenantId: "",
  username: "",
  email: "",
  displayName: "",
  password: "",
  isActive: true,
  roleKeys: [],
};

export function UsersListPage() {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [users, setUsers] = useState<readonly AuthUser[]>([]);
  const [searchValue, setSearchValue] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(20);

  useEffect(() => {
    const activeSession = readStoredAuthSession();
    if (!activeSession) {
      window.location.href = "/login?next=/desk/admin/users";
      return;
    }

    setSession(activeSession);

    void listAuthUsers()
      .then((records) => {
        setUsers(records);
        setLoadError(null);
      })
      .catch((error) =>
        setLoadError(error instanceof Error ? error.message : "Could not load users."),
      )
      .finally(() => setIsLoading(false));
  }, []);

  const filteredUsers = useMemo(() => {
    const query = searchValue.trim().toLowerCase();

    return users.filter((user) => {
      if (statusFilter === "active" && !user.isActive) return false;
      if (statusFilter === "inactive" && user.isActive) return false;

      if (!query) return true;

      return [
        user.displayName,
        user.username,
        user.email,
        user.tenant.name,
        user.roles.map((role) => role.name).join(" "),
      ]
        .join(" ")
        .toLowerCase()
        .includes(query);
    });
  }, [searchValue, statusFilter, users]);

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / rowsPerPage));
  const pageUsers = filteredUsers.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage,
  );

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  return (
    <MasterListPageFrame
      action={
        <Button asChild className="h-11 rounded-xl px-4">
          <Link href="/desk/admin/users/new">
            <UserPlus className="size-4" />
            New User
          </Link>
        </Button>
      }
      description="Manage login identities, tenant assignment, and role-based access across the desk."
      technicalName="page.auth.users"
      title="Users"
    >
      <MasterListToolbarCard
        filterOptions={[
          { id: "all", label: "All records" },
          { id: "active", label: "Active only" },
          { id: "inactive", label: "Inactive only" },
        ]}
        filterValue={statusFilter}
        onFilterValueChange={(nextValue) => {
          setStatusFilter(nextValue as "all" | "active" | "inactive");
          setCurrentPage(1);
        }}
        onSearchValueChange={(nextValue) => {
          setSearchValue(nextValue);
          setCurrentPage(1);
        }}
        searchPlaceholder="Search user, tenant, role, or email"
        searchValue={searchValue}
      />

      {loadError ? (
        <MasterListEmptyState className="rounded-2xl border border-destructive/20 bg-destructive/5 text-destructive">
          {loadError}
        </MasterListEmptyState>
      ) : null}

      <MasterListTableCard className="rounded-md">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-sm">
            <thead className="bg-muted/55">
              <tr>
                <th className="w-16 border-b border-border/70 px-4 py-2.5 text-left font-medium text-foreground">
                  #
                </th>
                <th className="border-b border-border/70 px-4 py-2.5 text-left font-medium text-foreground">
                  User Name
                </th>
                <th className="border-b border-border/70 px-4 py-2.5 text-left font-medium text-foreground">
                  Email
                </th>
                <th className="border-b border-border/70 px-4 py-2.5 text-left font-medium text-foreground">
                  Tenant
                </th>
                <th className="border-b border-border/70 px-4 py-2.5 text-left font-medium text-foreground">
                  Roles
                </th>
                <th className="border-b border-border/70 px-4 py-2.5 text-left font-medium text-foreground">
                  Status
                </th>
                <th className="w-24 border-b border-border/70 px-4 py-2.5 text-right font-medium text-foreground">
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {pageUsers.map((user, index) => (
                <tr
                  key={user.id}
                  className="border-b border-border/60 last:border-b-0 hover:bg-muted/20"
                >
                  <td className="px-4 py-3 text-muted-foreground">
                    {(currentPage - 1) * rowsPerPage + index + 1}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/desk/admin/users/${user.id}`}
                      className="font-medium text-foreground transition hover:underline"
                    >
                      {user.displayName}
                    </Link>
                    <div className="mt-1 text-xs text-muted-foreground">{user.username}</div>
                  </td>
                  <td className="px-4 py-3 text-foreground">{user.email}</td>
                  <td className="px-4 py-3 text-foreground">
                    <div>{user.tenant.name}</div>
                    <div className="mt-1 text-xs text-muted-foreground">{user.tenant.slug}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1.5">
                      {user.roles.map((role) => (
                        <Badge key={role.key} variant="secondary">
                          {role.name}
                        </Badge>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge isActive={user.isActive} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button asChild variant="outline" size="sm" className="rounded-xl">
                      <Link href={`/desk/admin/users/${user.id}`}>
                        View
                        <ArrowRight className="size-4" />
                      </Link>
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!isLoading && pageUsers.length === 0 ? (
          <MasterListEmptyState>No users found.</MasterListEmptyState>
        ) : null}
        {isLoading ? <MasterListEmptyState>Loading users...</MasterListEmptyState> : null}
      </MasterListTableCard>

      <MasterListPaginationCard
        page={currentPage}
        rowsPerPage={rowsPerPage}
        showingLabel={buildMasterListShowingLabel({
          page: currentPage,
          pageSize: rowsPerPage,
          totalCount: filteredUsers.length,
        })}
        singularLabel="users"
        totalCount={filteredUsers.length}
        totalPages={totalPages}
        onPageChange={(nextPage) => setCurrentPage(nextPage)}
        onNextPage={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
        onPreviousPage={() => setCurrentPage((page) => Math.max(1, page - 1))}
        onRowsPerPageChange={(nextValue) => {
          setRowsPerPage(nextValue);
          setCurrentPage(1);
        }}
      />

      {session ? (
        <div className="rounded-2xl border border-border/70 bg-card/90 px-4 py-3 text-sm text-muted-foreground shadow-sm">
          Signed in as <span className="font-medium text-foreground">{session.user.displayName}</span>{" "}
          for tenant <span className="font-medium text-foreground">{session.tenant.name}</span>.
        </div>
      ) : null}
    </MasterListPageFrame>
  );
}

export function UserUpsertPage({ userId }: { readonly userId?: string }) {
  const router = useRouter();
  const [session, setSession] = useState<AuthSession | null>(null);
  const [form, setForm] = useState<AuthUserInput>(emptyInput);
  const [tenants, setTenants] = useState<readonly TenantOption[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const isEdit = Boolean(userId);

  useEffect(() => {
    const activeSession = readStoredAuthSession();
    if (!activeSession) {
      window.location.href = `/login?next=${encodeURIComponent(
        userId ? `/desk/admin/users/${userId}/edit` : "/desk/admin/users/new",
      )}`;
      return;
    }

    setSession(activeSession);
    const sessionForLoad = activeSession;

    async function load() {
      const [roleRows, tenantRows] = await Promise.all([listAuthRoles(), listTenants()]);
      setTenants(tenantRows);

      if (userId) {
        const user = await getAuthUser(userId);
        setForm({
          tenantId: user.tenant.id,
          username: user.username,
          email: user.email,
          displayName: user.displayName,
          password: "",
          isActive: user.isActive,
          roleKeys: user.roles.map((role) => role.key),
        });
      } else {
        setForm({
          ...emptyInput,
          tenantId: sessionForLoad.tenant.id,
          isActive: true,
          roleKeys: roleRows.find((role) => role.key === "operator") ? ["operator"] : [],
        });
      }
    }

    void load()
      .catch((loadError) =>
        setError(loadError instanceof Error ? loadError.message : "Could not prepare user form."),
      )
      .finally(() => setIsLoading(false));
  }, [userId]);

  async function handleSubmit() {
    setError(null);
    setIsSaving(true);

    try {
      await upsertAuthUser({ ...form, password: form.password || null }, userId);
      router.push("/desk/admin/users");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not save user.");
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <MasterListPageFrame
        description=""
        technicalName="page.auth.user.loading"
        title={isEdit ? "Update User" : "New User"}
      >
        <MasterListUpsertCard title="User workspace">
          <div className="space-y-3">
            <div className="h-5 w-40 animate-pulse rounded bg-muted" />
            <div className="grid gap-4">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="space-y-2">
                  <div className="h-4 w-24 animate-pulse rounded bg-muted" />
                  <div className="h-11 rounded-xl bg-muted/80" />
                </div>
              ))}
            </div>
          </div>
        </MasterListUpsertCard>
      </MasterListPageFrame>
    );
  }

  return (
    <MasterListPageFrame
      action={
        <Button asChild variant="outline" className="rounded-xl">
          <Link href="/desk/admin/users">
            <ArrowLeft className="size-4" />
            Back
          </Link>
        </Button>
      }
      description="Create and maintain authenticated users from the shared application shell."
      technicalName="page.auth.user.upsert"
      title={isEdit ? "Update User" : "New User"}
    >
      <MasterListUpsertLayout>
        {error ? (
          <div className="rounded-2xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        <SectionCard
          description="Keep identity and login coordinates aligned with the assigned tenant."
          title="User Details"
        >
          <div className="grid gap-4">
            <Field label="Display name">
              <Input
                value={form.displayName}
                className="h-11 rounded-xl"
                onChange={(event) => setFormValue("displayName", event.target.value, setForm)}
              />
            </Field>
            <Field label="Username">
              <Input
                value={form.username}
                className="h-11 rounded-xl"
                onChange={(event) => setFormValue("username", event.target.value, setForm)}
              />
            </Field>
            <Field label="Email">
              <Input
                type="email"
                value={form.email}
                className="h-11 rounded-xl"
                onChange={(event) => setFormValue("email", event.target.value, setForm)}
              />
            </Field>
            <Field label={isEdit ? "New password" : "Password"}>
              <Input
                type="password"
                value={form.password ?? ""}
                className="h-11 rounded-xl"
                placeholder={isEdit ? "Leave blank to keep the current password" : "Enter password"}
                onChange={(event) => setFormValue("password", event.target.value, setForm)}
              />
            </Field>
            <Field label="Tenant">
              <select
                className="h-11 rounded-xl border border-input bg-background px-3 text-sm"
                value={form.tenantId}
                onChange={(event) => setFormValue("tenantId", event.target.value, setForm)}
              >
                <option value="">Select tenant</option>
                {tenants.map((tenant) => (
                  <option key={tenant.id} value={tenant.id}>
                    {tenant.name}
                  </option>
                ))}
              </select>
            </Field>
            <label
              className={
                form.isActive
                  ? "flex items-center justify-between gap-4 rounded-2xl border border-emerald-300 bg-emerald-50/80 px-4 py-3 text-emerald-950 shadow-sm shadow-emerald-100/70 ring-1 ring-emerald-100"
                  : "flex items-center justify-between gap-4 rounded-2xl border border-border/70 bg-muted/20 px-4 py-3"
              }
            >
              <span className="space-y-1">
                <span className="block text-sm font-medium text-foreground">Active</span>
                <span className="block text-xs text-muted-foreground">
                  Active users can sign in and access assigned roles.
                </span>
              </span>
              <Switch
                checked={form.isActive}
                aria-label="Active"
                onCheckedChange={(checked) => setFormValue("isActive", checked, setForm)}
              />
            </label>
            <div className="rounded-2xl border border-border/70 bg-muted/20 px-4 py-3">
              <div className="text-sm font-medium text-foreground">Tenant session</div>
              <div className="mt-1 text-sm text-muted-foreground">
                {session ? `${session.tenant.name} (${session.tenant.slug})` : "No session"}
              </div>
            </div>
          </div>
        </SectionCard>

        <div className="flex justify-end">
          <Button type="button" className="rounded-xl" onClick={() => void handleSubmit()} disabled={isSaving}>
            <Save className="size-4" />
            {isSaving ? "Saving..." : isEdit ? "Update User" : "Save User"}
          </Button>
        </div>
      </MasterListUpsertLayout>
    </MasterListPageFrame>
  );
}

function StatusBadge({ isActive }: { readonly isActive: boolean }) {
  return (
    <Badge
      variant="outline"
      className={
        isActive
          ? "rounded-full border-emerald-200 bg-emerald-50 text-emerald-700"
          : "rounded-full border-border/80 bg-background text-muted-foreground"
      }
    >
      {isActive ? "active" : "inactive"}
    </Badge>
  );
}

function SectionCard({
  children,
  description,
  title,
}: {
  readonly children: ReactNode;
  readonly description: string;
  readonly title: string;
}) {
  return (
    <MasterListUpsertCard
      className="border-border/70 bg-background/95 shadow-sm"
      description={description}
      title={title}
    >
      <div className="space-y-5">{children}</div>
    </MasterListUpsertCard>
  );
}

function Field({ label, children }: { readonly label: string; readonly children: ReactNode }) {
  return (
    <div className="grid gap-2">
      <Label className="text-sm font-medium">{label}</Label>
      {children}
    </div>
  );
}

function setFormValue<Key extends keyof AuthUserInput>(
  key: Key,
  value: AuthUserInput[Key],
  setForm: React.Dispatch<React.SetStateAction<AuthUserInput>>,
) {
  setForm((current) => ({ ...current, [key]: value }));
}
