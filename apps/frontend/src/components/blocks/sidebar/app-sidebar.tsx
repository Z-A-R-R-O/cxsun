"use client"

import * as React from "react"
import {
  Building2,
  BriefcaseBusiness,
  Factory,
  Home,
  Landmark,
  RefreshCw,
  Settings,
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

const data = {
  navMain: [
    {
      title: "Overview",
      url: "#",
      icon: Home,
      isActive: true,
    },
    {
      title: "Organisation",
      url: "#",
      icon: Building2,
      defaultOpen: true,
      items: [
        {
          title: "Tenant",
          url: "#",
          icon: Users,
          isActive: true,
        },
        {
          title: "Industry",
          url: "#",
          icon: Factory,
        },
        {
          title: "Company",
          url: "#",
          icon: Building2,
        },
        {
          title: "Default Company",
          url: "#",
          icon: Landmark,
        },
      ],
    },
    {
      title: "Master",
      url: "#",
      icon: BriefcaseBusiness,
      items: [
        {
          title: "Catalog",
          url: "#",
        },
        {
          title: "Workflows",
          url: "#",
        },
      ],
    },
    {
      title: "Settings",
      url: "#",
      icon: Settings,
      items: [
        {
          title: "General",
          url: "#",
        },
        {
          title: "Company Profile",
          url: "#",
        },
      ],
    },
    {
      title: "Admin",
      url: "#",
      icon: UserRoundCog,
      items: [
        {
          title: "Users",
          url: "#",
        },
        {
          title: "Roles",
          url: "#",
          icon: ShieldCheck,
        },
      ],
    },
  ],
}

export type DashboardPage = "overview" | "tenant" | "industry" | "company" | "system-update"

function dashboardPageUrl(page: DashboardPage) {
  return page === "overview" ? "/app" : `/app/${page}`
}

export function AppSidebar({
  activePage = "overview",
  onNavigate,
  selectedTenant,
  tenants = [],
  user,
  canManagePlatform = false,
  onTenantChange,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  activePage?: DashboardPage
  onNavigate?: (page: DashboardPage) => void
  selectedTenant?: string
  tenants?: { slug: string; name: string; role: string }[]
  user?: { name: string; email: string }
  canManagePlatform?: boolean
  onTenantChange?: (tenantSlug: string) => void
}) {
  const navMain = data.navMain.map((item) => {
    if (item.title === "Overview") {
      return {
        ...item,
        url: dashboardPageUrl("overview"),
        isActive: activePage === "overview",
        onSelect: () => onNavigate?.("overview"),
      }
    }

    if (item.title === "Organisation") {
      return {
        ...item,
        defaultOpen: true,
        items: item.items
          ?.filter((subItem) =>
            canManagePlatform || (subItem.title !== "Tenant" && subItem.title !== "Industry"),
          )
          .map((subItem) => {
          const page = (
            subItem.title === "Default Company"
              ? "company"
              : subItem.title.toLowerCase().replace(" ", "-")
          ) as DashboardPage
          return {
            ...subItem,
            url: dashboardPageUrl(page),
            isActive: activePage === page,
            onSelect: () => onNavigate?.(page),
          }
        }),
      }
    }

    if (item.title === "Admin") {
      return {
        ...item,
        defaultOpen: true,
        items: [
          ...(item.items ?? []),
          {
            title: "System Update",
            url: dashboardPageUrl("system-update"),
            icon: RefreshCw,
            isActive: activePage === "system-update",
            onSelect: () => onNavigate?.("system-update"),
          },
        ],
      }
    }

    return item
  })

  return (
    <Sidebar collapsible="icon" variant="inset" {...props}>
      <SidebarHeader className="p-0">
        <CompanySwitcher
          companies={tenants.map((tenant) => ({
            name: tenant.name,
            logo: BrandLogo,
            period: "FY 2026-27",
            value: tenant.slug,
          }))}
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
