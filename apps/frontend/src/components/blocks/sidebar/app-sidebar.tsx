"use client"

import * as React from "react"
import {
  Bug,
  Building2,
  BriefcaseBusiness,
  Factory,
  Globe2,
  Headset,
  Landmark,
  NotebookPen,
  RefreshCw,
  ShieldCheck,
  UserRoundCog,
  Users,
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

export type DashboardMode = "super-admin" | "admin" | "tenant"
export type DashboardPage =
  | "overview"
  | "tenant"
  | "tenant-domain"
  | "industry"
  | "company"
  | "client"
  | "system-update"
  | "user-manager"
  | "helpdesk"
  | "bugs"
  | "tenant-roles"

const superAdminNav = [
  {
    title: "Admin",
    url: "#",
    icon: Building2,
    defaultOpen: true,
    items: [
      { title: "Tenant", url: "#", icon: Users },
      { title: "Domain", url: "#", icon: Globe2 },
      { title: "Industry", url: "#", icon: Factory },
      { title: "Client Manager", url: "#", icon: NotebookPen },
      { title: "System Update", url: "#", icon: RefreshCw },
      { title: "User Manager", url: "#", icon: UserRoundCog },
    ],
  },
  {
    title: "Tenant",
    url: "#",
    icon: BriefcaseBusiness,
    items: [
      { title: "Company", url: "#", icon: Building2 },
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
      { title: "Company", url: "#", icon: Building2 },
      { title: "Bugs", url: "#", icon: Bug },
      { title: "Client Manager", url: "#", icon: NotebookPen },
      { title: "System Update", url: "#", icon: RefreshCw },
    ],
  },
] as const

const tenantNav = [
  {
    title: "Tenant Workspace",
    url: "#",
    icon: Building2,
    defaultOpen: true,
    items: [
      { title: "Company", url: "#", icon: Building2 },
      { title: "Roles", url: "#", icon: ShieldCheck },
      { title: "Default Company", url: "#", icon: Landmark },
    ],
  },
] as const

function dashboardPageUrl(basePath: string, page: DashboardPage) {
  return page === "overview" ? basePath : `${basePath}/${page}`
}

function pageFromTitle(title: string): DashboardPage | undefined {
  const pages: Record<string, DashboardPage> = {
    Bugs: "bugs",
    Company: "company",
    "Client Manager": "client",
    "Default Company": "company",
    Domain: "tenant-domain",
    Helpdesk: "helpdesk",
    Industry: "industry",
    Overview: "overview",
    Roles: "tenant-roles",
    "System Update": "system-update",
    Tenant: "tenant",
    "User Manager": "user-manager",
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
  onTenantChange?: (tenantSlug: string) => void
}) {
  const sourceNav =
    dashboardMode === "super-admin"
      ? superAdminNav
      : dashboardMode === "admin"
        ? adminNav
        : tenantNav

  const navMain = sourceNav.map((item) => ({
      ...item,
      defaultOpen: "defaultOpen" in item ? item.defaultOpen : true,
      items: item.items.map((subItem) => {
        const subPage = pageFromTitle(subItem.title) ?? "overview"
        return {
          ...subItem,
          url: dashboardPageUrl(basePath, subPage),
          isActive: activePage === subPage,
          onSelect: () => onNavigate?.(subPage),
        }
      }),
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
