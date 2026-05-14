import Link from "next/link";
import {
  Activity,
  ArrowUpRight,
  Bell,
  CheckCircle2,
  Plus,
  Search,
  SunMedium,
  UserRoundSearch,
} from "lucide-react";
import { Badge, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@cxnext/ui";
import { deskPortals, type DeskPortalDefinition } from "../../features/desk/application/desk-registry";

const cards = [
  { title: "Module Readiness", value: "Foundation", detail: "No business domains installed" },
  { title: "Event Bus", value: "In-process", detail: "Async-ready internal dispatch" },
  { title: "Workspace", value: "desk", detail: "Application dashboard route" },
] as const;

export function DeskDashboard({ portal }: { readonly portal: DeskPortalDefinition }) {
  const quickActions = [
    { id: "create", label: "Create", icon: Plus, href: portal.href },
    { id: "search", label: "Search", icon: Search, href: portal.href },
    { id: "notifications", label: "Notifications", icon: Bell, href: portal.href },
    { id: "users", label: "Users", icon: UserRoundSearch, href: portal.href },
    { id: "appearance", label: "Appearance", icon: SunMedium, href: portal.href },
  ] as const;

  return (
    <section className="space-y-3 p-4 md:p-6">
      <Card className="mesh-panel gap-0 overflow-hidden py-0">
        <CardHeader className="border-b border-border/60 px-5 py-5 md:px-6 md:py-6">
          <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-start sm:justify-between">
            <Badge className="px-4 py-1.5">{portal.badge}</Badge>
            <Badge
              variant="outline"
              className="max-w-full border-border/80 bg-background/90 px-3 py-1.5 text-left text-xs font-semibold tracking-[0.1em] text-foreground shadow-sm sm:shrink-0 sm:px-4 sm:text-sm sm:tracking-[0.16em]"
            >
              cxnext foundation
            </Badge>
          </div>
          <div className="mt-3 max-w-3xl space-y-2">
            <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
              Business software, ready to grow together.
            </h1>
            <p className="mt-1.5 max-w-2xl text-sm leading-6 text-muted-foreground">
              {portal.summary} This desk keeps customer, vendor, admin, and super-admin surfaces
              collected in one shared shell while the foundation stays free of unrequested business
              modules.
            </p>
          </div>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader className="px-5 py-4 md:px-6">
          <CardTitle>Quick actions</CardTitle>
          <CardDescription>
            Common desk actions are prepared as shell controls for future modules.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-5 pb-5 pt-0 md:px-6 md:pb-6">
          <div className="inline-flex max-w-full flex-wrap items-center gap-2 rounded-[1.4rem] bg-background/90 p-2 shadow-sm">
            {quickActions.map((action) => {
              const ActionIcon = action.icon;

              return (
                <Link
                  key={action.id}
                  href={action.href}
                  aria-label={action.label}
                  className="inline-flex size-11 items-center justify-center rounded-xl bg-card/80 text-muted-foreground transition hover:-translate-y-0.5 hover:bg-card hover:text-foreground"
                >
                  <ActionIcon className="size-5" />
                </Link>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="px-5 py-4 md:px-6">
          <CardTitle>Applications</CardTitle>
          <CardDescription>Open any desk surface from the shared collection.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 px-5 pb-5 pt-0 md:grid-cols-2 md:px-6 md:pb-6 xl:grid-cols-4">
          {deskPortals.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              className="group relative overflow-hidden rounded-[1.15rem] border border-border/70 bg-card/75 p-4 transition hover:-translate-y-0.5 hover:border-accent/40 hover:bg-card"
            >
              <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-br from-zinc-500/18 via-slate-500/10 to-transparent" />
              <div className="relative flex items-start justify-between gap-3">
                <div className="min-w-0 space-y-2.5">
                  <div className="flex size-12 items-center justify-center rounded-xl border border-border/60 bg-background/90 shadow-sm">
                    {item.menuItems[0]?.icon}
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="min-w-0 text-lg font-semibold text-foreground">{item.label}</p>
                      <Badge variant="secondary">foundation</Badge>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.summary}</p>
                  </div>
                </div>
                <ArrowUpRight className="mt-0.5 size-5 shrink-0 text-muted-foreground transition group-hover:text-foreground" />
              </div>
              <div className="relative mt-3 flex flex-wrap gap-2">
                <Badge variant="outline" className="truncate">
                  {item.badge}
                </Badge>
                <Badge variant="outline">{item.menuItems.length} modules</Badge>
              </div>
            </Link>
          ))}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        {cards.map((card) => (
          <Card key={card.title}>
            <CardHeader>
              <CardDescription>{card.title}</CardDescription>
              <CardTitle className="text-xl">{card.value}</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              {card.detail}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Framework services</CardTitle>
          <CardDescription>
            Shared runtime blocks that every future workspace can rely on.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm text-muted-foreground md:grid-cols-3">
          <p className="rounded-[1rem] bg-muted/60 px-4 py-3">
            Bounded contexts mount through module contracts.
          </p>
          <p className="rounded-[1rem] bg-muted/60 px-4 py-3">
            Application actions publish domain events.
          </p>
          <p className="rounded-[1rem] bg-muted/60 px-4 py-3">
            {portal.label} menu items are isolated through the desk registry.
          </p>
        </CardContent>
      </Card>

      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Activity className="h-4 w-4" />
        Ready for the next domain module.
      </div>
    </section>
  );
}
