"use client"

import * as React from "react"
import {
  Bug,
  BriefcaseBusiness,
  Factory,
  Globe2,
  Headset,
  RefreshCw,
  UserRoundCog,
  Users,
  type LucideIcon,
} from "lucide-react"

import { BrandLogo } from "src/components/blocks/branding/brand-logo"
import { CompanySwitcher } from "src/components/blocks/sidebar/company-switcher"
import { NavMain } from "src/components/blocks/sidebar/nav-main"
import { NavUser } from "src/components/blocks/sidebar/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
  SidebarSeparator,
} from "src/components/ui/sidebar"
import { version } from "../../../../package.json"
import { getDashboardApp, type DashboardAppId, type DashboardAppMenuItem } from "src/components/blocks/dashboard/dashboard-apps"
import type { DefaultCompanyContext } from "src/features/company/company-client"

interface SidebarNavItem {
  title: string
  url: string
  icon?: LucideIcon
  page?: DashboardPage
  defaultOpen?: boolean
  isActive?: boolean
  onSelect?: () => void
  items?: SidebarNavItem[]
}

export type DashboardMode = "super-admin" | "admin" | "tenant"
export type DashboardPage =
  | "overview"
  | "setup"
  | "app-dashboard"
  | "tenant"
  | "tenant-domain"
  | "industry"
  | "company"
  | "system-update"
  | "user-manager"
  | "helpdesk"
  | "bugs"
  | "tenant-roles"
  | `app-${string}`

const superAdminNav = [
  {
    title: "Admin",
    url: "#",
    icon: BriefcaseBusiness,
    defaultOpen: true,
    items: [
      { title: "Tenant", url: "#", icon: Users },
      { title: "Domain", url: "#", icon: Globe2 },
      { title: "Industry", url: "#", icon: Factory },
      { title: "Admin User Manager", url: "#", icon: UserRoundCog },
    ],
  },
  {
    title: "Setting",
    url: "#",
    icon: RefreshCw,
    items: [
      { title: "System Update", url: "#", icon: RefreshCw },
    ],
  },
] as const

const adminNav = [
  {
    title: "Software Desk",
    url: "#",
    icon: Headset,
    defaultOpen: true,
    items: [
      { title: "Helpdesk", url: "#", icon: Headset },
      { title: "Bugs", url: "#", icon: Bug },
      { title: "System Update", url: "#", icon: RefreshCw },
    ],
  },
] as const

function dashboardPageUrl(basePath: string, page: DashboardPage) {
  return page === "overview" ? basePath : `${basePath}/${page}`
}

function pageFromTitle(title: string): DashboardPage | undefined {
  const pages: Record<string, DashboardPage> = {
    Bugs: "bugs",
    "Default Company": "app-application-default-company",
    Domain: "tenant-domain",
    Helpdesk: "helpdesk",
    Industry: "industry",
    Overview: "overview",
    Roles: "tenant-roles",
    Setup: "setup",
    "System Update": "system-update",
    Tenant: "tenant",
    "Admin User Manager": "user-manager",
  }

  return pages[title]
}

export function AppSidebar({
  activePage = "overview",
  onNavigate,
  selectedTenant,
  tenants = [],
  user,
  basePath = "/app",
  dashboardMode = "tenant",
  activeApp = "application",
  defaultCompanyContext,
  onTenantChange,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  activePage?: DashboardPage
  onNavigate?: (page: DashboardPage) => void
  selectedTenant?: string
  tenants?: { slug: string; name: string; role: string }[]
  user?: { name: string; email: string }
  basePath?: "/app" | "/admin" | "/sa"
  dashboardMode?: DashboardMode
  activeApp?: DashboardAppId
  defaultCompanyContext?: DefaultCompanyContext | null
  onTenantChange?: (tenantSlug: string) => void
}) {
  const selectedApp = getDashboardApp(activeApp)
  const tenantAppNav = selectedApp.menuGroups.map((group, index) => ({
    title: group.title,
    url: "#",
    icon: group.icon,
    defaultOpen: index === 0 || group.items.some((item) => appMenuItemHasPage(item, activePage)),
    items: group.items.map((item) => mapAppMenuItem(item)),
  }))
  const sourceNav =
    dashboardMode === "super-admin"
      ? superAdminNav
      : dashboardMode === "admin"
        ? adminNav
        : tenantAppNav

  const navMain = sourceNav.map((item) => ({
      ...item,
      defaultOpen: "defaultOpen" in item ? item.defaultOpen : true,
      items: item.items.map((subItem) => mapNavItem(subItem, { activePage, basePath, onNavigate })),
    }))

  return (
    <Sidebar collapsible="icon" variant="inset" {...props}>
      <SidebarHeader className="p-0">
        <CompanySwitcher
          companies={tenants.map((tenant) => ({
            name: tenant.name,
            logo: BrandLogo,
            period: dashboardMode === "tenant" ? "Tenant DB" : tenant.role,
            value: tenant.slug,
          }))}
          label={dashboardMode === "tenant" ? "Tenant workspace" : "Companies"}
          displayName={dashboardMode === "tenant" ? defaultCompanyContext?.companyName : undefined}
          displayPeriod={dashboardMode === "tenant" ? defaultCompanyContext?.accountingYearName : undefined}
          value={selectedTenant}
          onValueChange={onTenantChange}
        />
      </SidebarHeader>
      <SidebarSeparator className="mx-0 mt-1" />
      <SidebarContent className="gap-3 px-3 py-6">
        <NavMain items={navMain} />
      </SidebarContent>
      {user ? (
        <SidebarFooter className="border-t px-1.5 pb-1.5 pt-1.5">
          <div className="px-1 pb-1 text-[11px] leading-none text-muted-foreground group-data-[collapsible=icon]:hidden">
            v {version}
          </div>
          <NavUser user={user} />
        </SidebarFooter>
      ) : null}
      <SidebarRail />
    </Sidebar>
  )
}

function mapAppMenuItem(item: DashboardAppMenuItem): SidebarNavItem {
  return {
    ...item,
    url: "#",
    items: item.items?.map((child) => mapAppMenuItem(child)),
  }
}

function mapNavItem(
  item: SidebarNavItem,
  context: { activePage: DashboardPage; basePath: string; onNavigate?: (page: DashboardPage) => void },
): SidebarNavItem {
  const subPage = item.page ?? pageFromTitle(item.title) ?? "overview"
  const children: SidebarNavItem[] | undefined = item.items?.map((child) => mapNavItem(child, context))

  return {
    ...item,
    items: children,
    url: dashboardPageUrl(context.basePath, subPage),
    isActive: context.activePage === subPage || Boolean(children?.some((child) => child.isActive)),
    onSelect: children?.length ? undefined : () => context.onNavigate?.(subPage),
  }
}

function appMenuItemHasPage(item: DashboardAppMenuItem, page: DashboardPage): boolean {
  return item.page === page || Boolean(item.items?.some((child) => appMenuItemHasPage(child, page)))
}
