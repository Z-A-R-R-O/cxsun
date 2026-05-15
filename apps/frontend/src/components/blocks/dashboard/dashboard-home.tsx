import { Bug, Building2, Headset, Network, RefreshCw, ShieldCheck } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "src/components/ui/card"
import { SectionCards } from "./section-cards"
import type { DashboardMode } from "src/components/blocks/sidebar/app-sidebar"

const dashboardCopy = {
  "super-admin": {
    title: "Super admin control",
    description: "Work from two clean areas: platform/master database modules and tenant-database modules.",
    metrics: [
      { label: "Master Modules", value: "5", trend: "Tenant, domain, industry, updates, users", description: "SQLite-backed platform control data", direction: "up" as const },
      { label: "Tenant Database", value: "Company", trend: "Tenant-owned data lane", description: "Company records resolve into tenant database context", direction: "up" as const },
      { label: "Platform Masters", value: "Live", trend: "Client notes and industries available", description: "SQLite-backed orchestration data", direction: "up" as const },
      { label: "Security Surface", value: "JWT", trend: "Tenant runtime requires auth", description: "Company APIs use tenant context", direction: "up" as const },
    ],
    cards: [
      { title: "Platform / Master Database", body: "Manage tenants, domains, industries, system updates, user manager, and platform-side support notes.", Icon: Network },
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
      { label: "Client Notes", value: "Open", trend: "Scratch client manager available", description: "Independent support notes stay platform-side", direction: "up" as const },
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
      { label: "Default Company", value: "Ready", trend: "Workspace default belongs here", description: "Default company remains tenant-local", direction: "up" as const },
    ],
    cards: [
      { title: "Companies", body: "Create and maintain company records inside the selected tenant database.", Icon: Building2 },
      { title: "Tenant Roles", body: "Tenant-local roles and policy assignments live in the tenant database.", Icon: ShieldCheck },
      { title: "Clean Boundary", body: "Tenant users do not see platform tenant, industry, client manager, or update orchestration pages.", Icon: Network },
    ],
  },
}

export function DashboardHome({ mode }: { mode: DashboardMode }) {
  const content = dashboardCopy[mode]

  return (
    <div className="@container/main flex flex-1 flex-col gap-6 py-4 md:py-6">
      <div className="px-4 lg:px-6">
        <div className="rounded-2xl border bg-card/90 p-5 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-wide text-primary">{content.title}</p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight md:text-3xl">{content.description}</h1>
        </div>
      </div>
      <SectionCards metrics={content.metrics} />
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
