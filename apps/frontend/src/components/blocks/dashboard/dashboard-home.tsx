import { Bug, Building2, Headset, Network, RefreshCw, ShieldCheck } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "src/components/ui/card"
import { Switch } from "src/components/ui/switch"
import { SectionCards } from "./section-cards"
import type { DashboardMode } from "src/components/blocks/sidebar/app-sidebar"
import { cn } from "src/lib/utils"
import { dashboardApps, type DashboardAppId } from "src/components/blocks/dashboard/dashboard-apps"

const dashboardCopy = {
  "super-admin": {
    title: "Super admin control",
    description: "Work from two clean areas: platform/master database modules and tenant-database modules.",
    metrics: [
      { label: "Master Modules", value: "5", trend: "Tenant, domain, industry, updates, admin users", description: "MariaDB-backed platform control data", direction: "up" as const },
      { label: "Tenant Database", value: "Company", trend: "Tenant-owned data lane", description: "Company records resolve into tenant database context", direction: "up" as const },
      { label: "Platform Masters", value: "Live", trend: "Industries and admin users available", description: "MariaDB-backed orchestration data", direction: "up" as const },
      { label: "Security Surface", value: "JWT", trend: "Tenant runtime requires auth", description: "Company APIs use tenant context", direction: "up" as const },
    ],
    cards: [
      { title: "Platform / Master Database", body: "Manage tenants, domains, industries, system updates, and admin users.", Icon: Network },
      { title: "Tenant Database", body: "Keep tenant-owned modules such as Company in the tenant database lane so ownership is obvious.", Icon: ShieldCheck },
      { title: "Provisioning Control", body: "Startup prepares each configured tenant database before the API accepts traffic.", Icon: Building2 },
    ],
  },
  admin: {
    title: "Admin software desk",
    description: "Support users who operate this software, triage bugs, help clients, and monitor release/update activity.",
    metrics: [
      { label: "Helpdesk", value: "Ready", trend: "Support desk separated", description: "Software operators stay outside tenant data", direction: "up" as const },
      { label: "Bugs", value: "Triage", trend: "Issue flow prepared", description: "Bug handling has its own admin lane", direction: "up" as const },
      { label: "Updates", value: "Live", trend: "System update view available", description: "Admin can monitor runtime update flow", direction: "up" as const },
    ],
    cards: [
      { title: "Helpdesk", body: "Track support questions and operational help without entering isolated tenant company records.", Icon: Headset },
      { title: "Bug Triage", body: "Keep software bugs separate from tenant business data so support work stays clean.", Icon: Bug },
      { title: "Release Care", body: "Use system update tools for maintenance, restart checks, and deployment readiness.", Icon: RefreshCw },
    ],
  },
  tenant: {
    title: "Tenant dashboard",
    description: "A client-isolated workspace. Tenant users work only inside their tenant database for companies and roles.",
    metrics: [
      { label: "Tenant Scope", value: "Isolated", trend: "Runtime resolves tenant DB", description: "Requests use JWT and selected tenant", direction: "up" as const },
      { label: "Companies", value: "Tenant DB", trend: "Company records are local", description: "No cross-tenant company access", direction: "up" as const },
      { label: "Roles", value: "Tenant RBAC", trend: "Role policies live tenant-side", description: "rbac_roles and role policies are per tenant", direction: "up" as const },
    ],
    cards: [
      { title: "Companies", body: "Create and maintain company records inside the selected tenant database.", Icon: Building2 },
      { title: "Tenant Roles", body: "Tenant-local roles and policy assignments live in the tenant database.", Icon: ShieldCheck },
      { title: "Clean Boundary", body: "Tenant users do not see platform tenant, industry, admin-user manager, or update orchestration pages.", Icon: Network },
    ],
  },
}

export function DashboardHome({
  activeApp = "application",
  appEnabled,
  mode,
  onChangeApp,
  onToggleApp,
}: {
  activeApp?: DashboardAppId
  appEnabled?: Record<DashboardAppId, boolean>
  mode: DashboardMode
  onChangeApp?: (appId: DashboardAppId) => void
  onToggleApp?: (appId: DashboardAppId, enabled: boolean) => void
}) {
  const content = dashboardCopy[mode]
  const selectedApp = dashboardApps.find((app) => app.id === activeApp) ?? dashboardApps[0]
  const SelectedAppIcon = selectedApp.icon

  return (
    <div className="@container/main flex flex-1 flex-col gap-6 py-4 md:py-6">
      <div className="px-4 lg:px-6">
        <div className="relative overflow-hidden rounded-2xl border bg-card/90 p-5 shadow-sm">
          <div className="absolute right-8 top-6 h-28 w-28 rounded-full bg-primary/10 blur-2xl" />
          <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-primary">{content.title}</p>
              <h1 className="mt-2 text-2xl font-bold tracking-tight md:text-3xl">{selectedApp.name} Desk</h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">{selectedApp.description || content.description}</p>
            </div>
            <div className="flex w-fit items-center gap-3 rounded-full border bg-background px-4 py-2 shadow-sm">
              <SelectedAppIcon className="size-4 text-primary" />
              <span className="font-mono text-xs font-semibold tracking-[0.32em] text-foreground">
                Signed in workspace
              </span>
            </div>
          </div>
        </div>
      </div>
      <SectionCards metrics={content.metrics} />
      {mode === "tenant" ? (
        <div className="px-4 lg:px-6">
          <Card className="rounded-md border-border/70 bg-card/95 shadow-sm">
            <CardHeader>
              <CardTitle>Apps activate</CardTitle>
              <p className="text-sm text-muted-foreground">Enable software apps for this tenant workspace. Active apps appear in the breadcrumb switcher and sidebar menus.</p>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {dashboardApps.map((app) => {
                const enabled = appEnabled?.[app.id] ?? app.status !== "disabled"
                const AppIcon = app.icon
                return (
                  <button
                    key={app.id}
                    className={cn(
                      "group rounded-md border p-4 text-left transition hover:border-primary/40 hover:bg-muted/30",
                      app.id === activeApp ? "border-primary/50 bg-primary/5" : "border-border/70 bg-background",
                    )}
                    onClick={() => enabled && onChangeApp?.(app.id)}
                    type="button"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <span className={cn("flex size-10 items-center justify-center rounded-md", app.accent)}>
                        <AppIcon className="size-5" />
                      </span>
                      <Switch
                        checked={enabled}
                        disabled={app.status === "core"}
                        onCheckedChange={(checked) => onToggleApp?.(app.id, checked)}
                        onClick={(event) => event.stopPropagation()}
                      />
                    </div>
                    <div className="mt-4">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-foreground">{app.name}</h3>
                        <span className={cn("rounded-full px-2 py-0.5 text-[11px]", enabled ? "bg-emerald-50 text-emerald-700" : "bg-muted text-muted-foreground")}>
                          {enabled ? "Active" : "Disabled"}
                        </span>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">{app.description}</p>
                    </div>
                  </button>
                )
              })}
            </CardContent>
          </Card>
        </div>
      ) : null}
      <div className="grid gap-4 px-4 lg:grid-cols-3 lg:px-6">
        {content.cards.map(({ body, Icon, title }) => (
          <Card key={title}>
            <CardHeader>
              <div className="mb-2 flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Icon className="size-5" />
              </div>
              <CardTitle>{title}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm leading-6 text-muted-foreground">{body}</CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
