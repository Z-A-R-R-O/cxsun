"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowUpRight,
  Bell,
  Boxes,
  FlaskConical,
  Globe,
  PackageCheck,
  Plus,
  ReceiptText,
  Search,
  SunMedium,
  UserRoundSearch,
  Warehouse,
} from "lucide-react";
import { Badge, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@cxnext/ui";
import { readStoredApplicationContext } from "../../features/auth/infrastructure/session-storage";
import { loadCompanySoftwareSettings, loadCompanySoftwareSettingsFromServer } from "../../features/settings/application/software-settings-service";

const applicationCards = [
  {
    id: "ecommerce",
    name: "Ecommerce",
    summary:
      "Standalone storefront app that consumes shared masters from core and owns customer commerce flows end to end.",
    badge: "Business app",
    modules: 43,
    href: "/desk/cxsun",
    icon: Boxes,
    accent: "from-orange-200/70 via-orange-100/50 to-transparent",
  },
  {
    id: "billing",
    name: "Billing",
    summary:
      "Accounting, vouchers, inventory, ledgers, billing documents, and reporting foundations.",
    badge: "Business app",
    modules: 5,
    href: "/desk/billing",
    icon: ReceiptText,
    accent: "from-emerald-200/70 via-emerald-100/50 to-transparent",
  },
  {
    id: "stock",
    name: "Stock",
    summary:
      "Operational stock workspace for inward, stock identity, movement, transfers, reservations, reconciliation, and warehouse execution.",
    badge: "Business app",
    modules: 15,
    href: "/desk/cxsun/queue",
    icon: Warehouse,
    accent: "from-cyan-200/70 via-cyan-100/50 to-transparent",
  },
  {
    id: "frappe",
    name: "Frappe",
    summary:
      "Connector workspace for external ERP records, synchronization checks, and integration operations.",
    badge: "Connector",
    modules: 5,
    href: "/desk/cxsun",
    icon: PackageCheck,
    accent: "from-sky-200/70 via-sky-100/50 to-transparent",
  },
  {
    id: "site",
    name: "Site",
    summary:
      "Public site workspace for content, pages, layout, and controlled customer-facing surfaces.",
    badge: "Platform",
    modules: 4,
    href: "/desk/cxsun",
    icon: Globe,
    accent: "from-violet-200/70 via-violet-100/50 to-transparent",
  },
  {
    id: "demo",
    name: "Demo",
    summary:
      "Safe demo workspace for validating shell behavior, list patterns, records, and workflows.",
    badge: "Scaffold",
    modules: 9,
    href: "/desk/cxsun",
    icon: FlaskConical,
    accent: "from-rose-200/70 via-rose-100/50 to-transparent",
  },
] as const;

const quickActions = [
  {
    id: "create",
    label: "Create",
    href: "/desk/cxsun/records/new",
    icon: Plus,
  },
  { id: "search", label: "Search", href: "/desk/cxsun/records", icon: Search },
  {
    id: "notifications",
    label: "Notifications",
    href: "/desk/cxsun/queue",
    icon: Bell,
  },
  { id: "users", label: "Users", href: "/desk/cxsun", icon: UserRoundSearch },
  {
    id: "appearance",
    label: "Appearance",
    href: "/desk/cxsun",
    icon: SunMedium,
  },
] as const;

export function ApplicationDesk() {
  const [favoriteAppId, setFavoriteAppId] = useState("application");

  useEffect(() => {
    const context = readStoredApplicationContext();
    const companyId = context?.company.id ?? null;
    const localSettings = loadCompanySoftwareSettings(companyId);
    setFavoriteAppId(localSettings.favoriteDashboardApp);

    if (!companyId) {
      return;
    }

    const controller = new AbortController();
    void loadCompanySoftwareSettingsFromServer(companyId, { signal: controller.signal })
      .then((settings) => {
        if (!controller.signal.aborted) {
          setFavoriteAppId(settings.favoriteDashboardApp);
        }
      })
      .catch(() => undefined);

    return () => controller.abort();
  }, []);

  const orderedApplicationCards = useMemo(() => {
    const cards = [...applicationCards];
    cards.sort((left, right) => {
      if (favoriteAppId === "application") {
        return 0;
      }
      if (left.id === favoriteAppId) return -1;
      if (right.id === favoriteAppId) return 1;
      return 0;
    });
    return cards;
  }, [favoriteAppId]);

  return (
    <div
      data-technical-name="page.application-desk"
      className="mx-auto w-[94%] space-y-3 py-3 sm:w-[92%] sm:py-4 lg:w-[90%] lg:py-6"
    >
      <Card className="mesh-panel overflow-hidden rounded-[14px] py-0">
        <CardHeader className="min-h-[132px] border-b border-border/60 px-4 py-4 sm:min-h-[144px] sm:px-5 sm:py-5 lg:min-h-[154px] lg:px-6 lg:py-6">
          <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-start sm:justify-between">
            <Badge className="rounded-full bg-foreground px-3 py-1.5 text-background sm:px-4 sm:py-2">
              Admin
            </Badge>
            <Badge
              variant="outline"
              className="max-w-full rounded-full border-border/80 bg-background/90 px-3 py-1.5 text-left text-xs font-semibold tracking-[0.16em] text-foreground shadow-sm sm:px-4 sm:py-2 sm:text-sm sm:tracking-[0.22em]"
            >
              Signed in as Sundar (admin)
            </Badge>
          </div>
          <div className="mt-4 max-w-3xl space-y-2">
            <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
              Business software, made to work together.
            </h1>
            <p className="text-sm leading-6 text-muted-foreground">
              Connected business software for billing, commerce, and operations.
            </p>
          </div>
        </CardHeader>
      </Card>

      <Card className="rounded-[14px]">
        <CardHeader className="px-4 py-5 sm:px-5 sm:py-6 lg:px-6 lg:py-8">
          <CardTitle>Admin quick actions</CardTitle>
          <CardDescription>
            Framework control pages and cross-app oversight for administrators.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-4 pb-6 pt-0 sm:px-5 sm:pb-8 lg:px-6 lg:pb-10">
          <div className="inline-flex max-w-full flex-wrap items-center gap-2 rounded-[18px] bg-background/90 p-3 shadow-sm sm:rounded-[22px] sm:p-4">
            {quickActions.map((action) => {
              const ActionIcon = action.icon;

              return (
                <Link
                  key={action.id}
                  href={action.href}
                  aria-label={action.label}
                  className="inline-flex size-9 items-center justify-center rounded-xl bg-card/80 text-muted-foreground transition hover:-translate-y-0.5 hover:bg-card hover:text-foreground sm:size-10"
                >
                  <ActionIcon className="size-5" />
                </Link>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-[14px]">
        <CardHeader className="px-4 py-5 sm:px-5 sm:py-6 lg:px-6 lg:py-8">
          <CardTitle>Applications</CardTitle>
          <CardDescription>Click any app icon to open its workspace.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 px-4 pb-4 pt-0 sm:px-5 sm:pb-5 md:grid-cols-2 lg:px-6 lg:pb-6 2xl:grid-cols-3">
          {orderedApplicationCards.map((app) => {
            const AppIcon = app.icon;
            const isFavorite = favoriteAppId !== "application" && app.id === favoriteAppId;

            return (
              <Link
                key={app.id}
                href={app.href}
                className="group relative min-h-[210px] overflow-hidden rounded-[14px] border border-border/70 bg-card/75 p-4 transition hover:-translate-y-0.5 hover:border-accent/40 hover:bg-card sm:min-h-[224px] lg:min-h-[234px]"
              >
                <div
                  className={`pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-br ${app.accent}`}
                />
                <div className="relative flex items-start justify-between gap-3">
                  <div className="min-w-0 space-y-4">
                    <div className="flex size-11 items-center justify-center rounded-xl border border-border/60 bg-background/90 shadow-sm sm:size-12">
                      <AppIcon className="size-5 text-foreground sm:size-6" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="min-w-0 text-lg font-semibold text-foreground">{app.name}</p>
                        {isFavorite ? <Badge>favorite</Badge> : <Badge variant="secondary">scaffold</Badge>}
                      </div>
                      <p className="mt-3 text-sm leading-6 text-muted-foreground">{app.summary}</p>
                    </div>
                  </div>
                  <ArrowUpRight className="mt-1 size-5 shrink-0 text-muted-foreground transition group-hover:text-foreground" />
                </div>
                <div className="relative mt-4 flex flex-wrap gap-2">
                  <Badge variant="outline" className="truncate">
                    {app.badge}
                  </Badge>
                  <Badge variant="outline">{app.modules} modules</Badge>
                </div>
              </Link>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
