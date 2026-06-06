"use client"

import * as React from "react"
import {
  Bug,
  BriefcaseBusiness,
  Building2,
  Database,
  Factory,
  Globe2,
  Headset,
  ListRestart,
  RefreshCw,
  Send,
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
import { companyLogoSet } from "src/features/company/company-logo"

interface SidebarNavItem {
  title: string
  url: string
  icon?: LucideIcon
  page?: DashboardPage
  defaultOpen?: boolean
  isActive?: boolean
  onSelect?: () => void
  items?: readonly SidebarNavItem[]
}

export type DashboardMode = "super-admin" | "admin" | "tenant"
export type DashboardPage =
  | "overview"
  | "setup"
  | "app-dashboard"
  | "tenant"
  | "tenant-domain"
  | "industry"
  | "company-industry"
  | "company"
  | "system-update"
  | "gst-api"
  | "gst-api-test"
  | "queue-manager"
  | "database-manager"
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
      { title: "Company Industry", url: "#", icon: Building2 },
      { title: "Admin User Manager", url: "#", icon: UserRoundCog },
    ],
  },
  {
    title: "Compliance",
    url: "#",
    icon: Send,
    items: [
      { title: "GST API", url: "#", icon: Send },
    ],
  },
  {
    title: "Setting",
    url: "#",
    icon: RefreshCw,
    items: [
      { title: "System Update", url: "#", icon: RefreshCw },
      { title: "Queue Manager", url: "#", icon: ListRestart },
      { title: "Database Manager", url: "#", icon: Database },
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
    "Company Industry": "company-industry",
    Overview: "overview",
    Roles: "tenant-roles",
    Setup: "setup",
    "GST API": "gst-api",
    "System Update": "system-update",
    "GST API Test": "gst-api-test",
    "Queue Manager": "queue-manager",
    "Database Manager": "database-manager",
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
  onLogout,
  onTenantChange,
  hiddenPages = [],
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
  onLogout?: () => void
  onTenantChange?: (tenantSlug: string) => void
  hiddenPages?: DashboardPage[]
}) {
  const selectedApp = getDashboardApp(activeApp)
  const defaultCompanyLogo = companyLogoSet(defaultCompanyContext, { fallback: false })
  const TenantLogo = React.useCallback(
    ({ className }: { className?: string }) => (
      <BrandLogo
        className={className}
        fallback={false}
        logoDarkUrl={defaultCompanyLogo.logoDarkUrl}
        logoUrl={defaultCompanyLogo.logoUrl}
        name={defaultCompanyContext?.companyName}
      />
    ),
    [defaultCompanyContext?.companyName, defaultCompanyLogo.logoDarkUrl, defaultCompanyLogo.logoUrl],
  )
  const hiddenPageSet = new Set(hiddenPages)
  const tenantTopNav = selectedApp.topMenuItems?.filter((item) => !hiddenPageSet.has(item.page)).map((item) => mapAppMenuItem(item)) ?? []
  const tenantGroupNav = selectedApp.menuGroups.map((group, index) => ({
    title: group.title,
    url: "#",
    icon: group.icon,
    defaultOpen: index === 0 || group.items.some((item) => appMenuItemHasPage(item, activePage)),
    items: group.items.filter((item) => !hiddenPageSet.has(item.page)).map((item) => mapAppMenuItem(item)),
  })).filter((group) => group.items.length > 0)
  const tenantAppNav = [...tenantTopNav, ...tenantGroupNav]
  const sourceNav =
    dashboardMode === "super-admin"
      ? superAdminNav
      : dashboardMode === "admin"
        ? adminNav
        : tenantAppNav

  const navMain = sourceNav.map((item) => ({
      ...item,
      defaultOpen: "defaultOpen" in item ? item.defaultOpen : true,
      items: item.items?.map((subItem) => mapNavItem(subItem, { activePage, basePath, onNavigate })),
      ...(!item.items?.length ? mapNavItem(item, { activePage, basePath, onNavigate }) : {}),
    }))

  return (
    <Sidebar collapsible="icon" variant="inset" {...props}>
      <SidebarHeader className="p-0">
        <CompanySwitcher
          companies={tenants.map((tenant) => ({
            name: tenant.name,
            logo: dashboardMode === "tenant" ? TenantLogo : BrandLogo,
            period: dashboardMode === "tenant" ? "Workspace DB" : tenant.role,
            value: tenant.slug,
          }))}
          label={dashboardMode === "tenant" ? "Workspace" : "Companies"}
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
          <NavUser user={user} onLogout={onLogout} />
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
