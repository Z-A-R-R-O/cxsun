import { useEffect, useState } from 'react'
import { AppSidebar, type DashboardMode, type DashboardPage } from 'src/components/blocks/sidebar/app-sidebar'
import { SiteHeader } from 'src/components/blocks/layout/site-header'
import { SidebarInset, SidebarProvider } from 'src/components/ui/sidebar'
import { DashboardHome } from './dashboard-home'
import { SupportPage } from './support-pages'
import { SystemUpdateView } from './system-update-view'
import { LoginForm } from '../auth/login-form'
import { ForgotPasswordForm } from '../auth/forgot-password-form'
import {
  clearSession,
  getStoredSession,
  roleMatchesSurface,
  switchTenant,
  type AuthSurface,
  type AuthSession,
} from 'src/features/auth/auth-client'
import { TenantListPage } from 'src/features/tenant/interface/pages/tenant-list-page'
import { CompanyPage } from 'src/features/company/company-page'
import { IndustryPage } from 'src/features/industry/industry-page'
import { ClientPage } from 'src/features/client/client-page'
import { TenantDomainPage } from 'src/features/tenant-domain/tenant-domain-page'
import { UserManagerPage } from 'src/features/user-manager/user-manager-page'
import { CommonDataPage } from 'src/features/master-data/interface/pages/common-module-pages'
import { MasterDataPage } from 'src/features/master-data/interface/pages/master-data-page'
import { pageModuleKey, pageModuleKind } from 'src/features/master-data/application/master-data-service'
import { ContactPage } from 'src/features/contact/contact-page'
import { ProductPage } from 'src/features/product/product-page'
import { SalesPage } from 'src/features/sales/sales-page'
import { DocumentSettingsPage, SalesSettingsPage } from 'src/features/settings/settings-page'
import {
  appModulePages,
  defaultEnabledApps,
  getDashboardApp,
  isDashboardAppId,
  type DashboardAppId,
} from './dashboard-apps'
import { Card, CardContent, CardHeader, CardTitle } from 'src/components/ui/card'
import { cn } from 'src/lib/utils'

function dashboardPath(basePath: string, page: DashboardPage) {
  return page === "overview" ? basePath : `${basePath}/${page}`
}

function dashboardPageFromPath(basePath: string, pathname = window.location.pathname): DashboardPage {
  const [, root, page] = pathname.split("/")
  const expectedRoot = basePath.replace(/^\//, "")
  if (root !== expectedRoot) return "overview"
  if (appModulePages.includes(page as DashboardPage)) return page as DashboardPage
  if (
    page === "tenant" ||
    page === "tenant-domain" ||
    page === "industry" ||
    page === "company" ||
    page === "client" ||
    page === "system-update" ||
    page === "user-manager" ||
    page === "helpdesk" ||
    page === "bugs" ||
    page === "tenant-roles"
  ) {
    return page
  }
  return "overview"
}

const pageAccess: Record<DashboardMode, DashboardPage[]> = {
  "super-admin": ["overview", "tenant", "tenant-domain", "industry", "company", "client", "system-update", "user-manager"],
  admin: ["overview", "company", "helpdesk", "bugs", "client", "system-update"],
  tenant: ["overview", "company", "tenant-roles", ...appModulePages],
}

const dashboardTitles: Record<DashboardMode, string> = {
  "super-admin": "Super Admin Dashboard",
  admin: "Admin Dashboard",
  tenant: "Tenant Dashboard",
}

const pageLabels: Partial<Record<DashboardPage, string>> = {
  "tenant": "Tenants",
  "tenant-domain": "Tenant Domains",
  "industry": "Industries",
  "company": "Companies",
  "client": "Client Manager",
  "system-update": "System Update",
  "user-manager": "User Manager",
  "helpdesk": "Helpdesk",
  "bugs": "Bugs",
  "tenant-roles": "Tenant Roles",
}

function pushDashboardPage(basePath: string, page: DashboardPage) {
  const nextPath = dashboardPath(basePath, page)
  if (window.location.pathname !== nextPath) {
    window.history.pushState(null, "", nextPath)
  }
}

export function DashboardView({
  basePath = "/app",
  loginPath = "/login",
  mode = "tenant",
  onBackHome,
}: {
  basePath?: "/app" | "/admin" | "/sa"
  loginPath?: "/login" | "/admin/login" | "/sa/login" | "/sg/login"
  mode?: DashboardMode
  onBackHome: () => void
}) {
  const authSurface: AuthSurface = mode === "super-admin" ? "super-admin" : mode
  const [activePage, setActivePage] = useState<DashboardPage>(() => dashboardPageFromPath(basePath))
  const [session, setSession] = useState<AuthSession | null>(() => getStoredSession(authSurface))
  const [authPage, setAuthPage] = useState<"login" | "forgot-password">("login")
  const [activeApp, setActiveApp] = useState<DashboardAppId>(() => readStoredApp())
  const [enabledApps, setEnabledApps] = useState<Record<DashboardAppId, boolean>>(() => readStoredEnabledApps())

  useEffect(() => {
    function syncDashboardPage() {
      setActivePage(dashboardPageFromPath(basePath))
    }

    window.addEventListener("popstate", syncDashboardPage)
    return () => window.removeEventListener("popstate", syncDashboardPage)
  }, [basePath])

  const needsLogin = !session || !roleMatchesSurface(session.selectedTenant.role, authSurface)

  useEffect(() => {
    if (!needsLogin || window.location.pathname === loginPath) {
      return
    }

    window.history.replaceState(null, "", loginPath)
    window.dispatchEvent(new Event("popstate"))
  }, [loginPath, needsLogin])

  if (needsLogin) {
    return (
      <div className="grid min-h-screen place-items-center bg-background p-6">
        <div className="w-full max-w-[560px]">
          {authPage === "forgot-password" ? (
            <ForgotPasswordForm onBackToLogin={() => setAuthPage("login")} />
          ) : (
            <LoginForm
              surface={authSurface}
              subtitle={dashboardTitles[mode]}
              onAuthenticated={setSession}
              onForgotPassword={() => setAuthPage("forgot-password")}
            />
          )}
        </div>
      </div>
    )
  }

  function logout() {
    clearSession(authSurface)
    setSession(null)
    window.history.pushState(null, "", loginPath)
  }

  function changeTenant(tenantSlug: string) {
    if (!session) {
      return
    }

    setSession(switchTenant(session, tenantSlug, authSurface))
  }

  const visiblePage = pageAccess[mode].includes(activePage) ? activePage : "overview"
  const breadcrumbLabel = getBreadcrumbLabel({ appId: activeApp, mode, page: visiblePage })
  const moduleKey = pageModuleKey(visiblePage)

  function navigate(page: DashboardPage) {
    if (!pageAccess[mode].includes(page)) {
      setActivePage("overview")
      pushDashboardPage(basePath, "overview")
      return
    }

    setActivePage(page)
    pushDashboardPage(basePath, page)
  }

  function changeApp(appId: DashboardAppId) {
    if (!enabledApps[appId]) {
      return
    }

    setActiveApp(appId)
    window.localStorage.setItem("cxsun.activeApp", appId)
    setActivePage("overview")
    pushDashboardPage(basePath, "overview")
  }

  function toggleApp(appId: DashboardAppId, enabled: boolean) {
    if (appId === "application") {
      return
    }

    const nextEnabledApps = { ...enabledApps, [appId]: enabled }
    setEnabledApps(nextEnabledApps)
    window.localStorage.setItem("cxsun.enabledApps.v2", JSON.stringify(nextEnabledApps))

    if (!enabled && activeApp === appId) {
      changeApp("application")
    }
  }

  return (
    <SidebarProvider>
      <AppSidebar
        dashboardMode={mode}
        basePath={basePath}
        activePage={visiblePage}
        activeApp={activeApp}
        onNavigate={navigate}
        onTenantChange={changeTenant}
        selectedTenant={session.selectedTenant.slug}
        tenants={session.tenants}
        user={session.user}
      />
      <SidebarInset>
        <SiteHeader
          activeApp={activeApp}
          appEnabled={enabledApps}
          dashboardTitle={breadcrumbLabel}
          onBackHome={onBackHome}
          onChangeApp={changeApp}
          onLogout={logout}
        />
        {visiblePage === "tenant" ? (
          <TenantListPage session={session} />
        ) : visiblePage === "tenant-domain" ? (
          <TenantDomainPage session={session} />
        ) : visiblePage === "industry" ? (
          <IndustryPage session={session} />
        ) : visiblePage === "company" && mode === "admin" ? (
          <SupportPage type="helpdesk" />
        ) : visiblePage === "company" ? (
          <CompanyPage session={session} />
        ) : visiblePage === "client" ? (
          <ClientPage session={session} />
        ) : visiblePage === "system-update" ? (
          <SystemUpdateView session={session} />
        ) : visiblePage === "user-manager" ? (
          <UserManagerPage session={session} />
        ) : visiblePage === "helpdesk" ? (
          <SupportPage type="helpdesk" />
        ) : visiblePage === "bugs" ? (
          <SupportPage type="bugs" />
        ) : visiblePage === "tenant-roles" ? (
          <SupportPage type="tenant-roles" />
        ) : visiblePage === "app-billing-sales" ? (
          <SalesPage session={session} />
        ) : visiblePage === "app-billing-settings" ? (
          <SalesSettingsPage session={session} />
        ) : visiblePage === "app-billing-document-settings" ? (
          <DocumentSettingsPage session={session} />
        ) : moduleKey === "contacts" ? (
          <ContactPage session={session} />
        ) : moduleKey === "products" ? (
          <ProductPage session={session} />
        ) : moduleKey && pageModuleKind(moduleKey) === "master" ? (
          <MasterDataPage moduleKey={moduleKey} session={session} />
        ) : moduleKey ? (
          <CommonDataPage moduleKey={moduleKey} session={session} />
        ) : appModulePages.includes(visiblePage) ? (
          <AppModuleDesk appId={activeApp} page={visiblePage} />
        ) : (
          <DashboardHome
            activeApp={activeApp}
            appEnabled={enabledApps}
            mode={mode}
            onChangeApp={changeApp}
            onToggleApp={toggleApp}
          />
        )}
      </SidebarInset>
    </SidebarProvider>
  )
}

function AppModuleDesk({ appId, page }: { appId: DashboardAppId; page: DashboardPage }) {
  const app = getDashboardApp(appId)
  const menuItem = app.menu.find((item) => item.page === page)
  const Icon = menuItem?.icon ?? app.icon
  const activeGroup = app.menuGroups.find((group) => group.items.some((item) => item.page === page))

  return (
    <div className="@container/main flex flex-1 flex-col gap-6 px-4 py-4 md:py-6 lg:px-6">
      <Card className="overflow-hidden rounded-2xl border-border/70 bg-card/95 shadow-sm">
        <CardHeader className="relative">
          <div className="absolute right-8 top-6 h-28 w-28 rounded-full bg-primary/10 blur-2xl" />
          <div className="relative flex items-start gap-4">
            <span className={`flex size-12 items-center justify-center rounded-xl ${app.accent}`}>
              <Icon className="size-6" />
            </span>
            <div>
              <CardTitle className="text-2xl">{menuItem?.title ?? app.name}</CardTitle>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                {app.name} has an isolated dashboard and side menu. These cards are wired as dummy module surfaces until the real screens are implemented.
              </p>
              {activeGroup ? <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-primary">{activeGroup.title}</p> : null}
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
          {app.menuGroups.map((group) => {
            const GroupIcon = group.icon
            return (
              <section key={group.title} className="rounded-xl border border-border/70 bg-background/80 p-4 shadow-sm">
                <div className="mb-3">
                  <div className="flex items-center gap-2">
                    <GroupIcon className="size-4 text-muted-foreground" />
                    <h3 className="text-base font-semibold text-foreground">{group.title}</h3>
                  </div>
                  <p className="mt-1 text-sm leading-5 text-muted-foreground">{appGroupDescription(group.title)}</p>
                </div>
                <div className="space-y-2">
                  {group.items.map((item) => {
                    const ItemIcon = item.icon
                    const active = item.page === page
                    return (
                      <button
                        key={item.title}
                        className={cn(
                          "group flex w-full items-center gap-3 rounded-md border px-3 py-2.5 text-left transition-all duration-200 hover:border-primary/40 hover:bg-primary/5",
                          active ? "border-primary/50 bg-primary/5" : "border-border/70 bg-background",
                        )}
                        onClick={() => {
                          window.history.pushState(null, "", dashboardPath(window.location.pathname.split("/")[1] ? `/${window.location.pathname.split("/")[1]}` : "/app", item.page))
                          window.dispatchEvent(new Event("popstate"))
                        }}
                        type="button"
                      >
                        <span className="flex size-5 shrink-0 items-center justify-center text-muted-foreground transition-colors group-hover:text-primary">
                          <ItemIcon className="size-4" />
                        </span>
                        <span className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground transition-colors group-hover:text-primary">{item.title}</span>
                        <span className="text-muted-foreground transition-colors group-hover:text-primary">↗</span>
                      </button>
                    )
                  })}
                </div>
              </section>
            )
          })}
        </CardContent>
      </Card>
    </div>
  )
}

function getBreadcrumbLabel({ appId, mode, page }: { appId: DashboardAppId; mode: DashboardMode; page: DashboardPage }) {
  const app = getDashboardApp(appId)
  if (page === "overview") return `${app.name} Desk`
  const appMenuLabel = app.menu.find((item) => item.page === page)?.title
  if (appMenuLabel) return appMenuLabel
  if (mode === "admin" && page === "company") return "Helpdesk"
  return pageLabels[page] ?? dashboardTitles[mode]
}

function appGroupDescription(title: string) {
  const descriptions: Record<string, string> = {
    "Entries": "Daily vouchers and money movement.",
    "Report": "Statements, summaries, and operational views.",
    "Reports": "Statements, summaries, and operational views.",
    "Master": "Parties, products, and reusable master data.",
    "Common": "Shared setup data used across modules.",
    "Settings": "App setup, layouts, and controls.",
    "Storefront": "Store operations and checkout flow.",
    "Catalog": "Products, collections, and variants.",
    "Customers": "Customer records and engagement.",
    "Fulfillment": "Shipping, delivery, and returns.",
    "Marketing": "Campaigns, SEO, and promotions.",
    "Content": "Pages, posts, blocks, and templates.",
    "Media": "Assets, banners, and media library.",
    "Site Structure": "Navigation, menus, and redirects.",
    "Lead Capture": "Forms, submissions, and lead sync.",
    "Publishing": "SEO, campaigns, and scheduled content.",
    "Pipeline": "Leads, deals, and sales flow.",
    "People": "Contacts, accounts, and segments.",
    "Activity": "Tasks, calls, and meetings.",
    "Campaign": "Outbound CRM campaigns.",
    "Stock": "Items, stock, and adjustments.",
    "Warehouse": "Warehouses, bins, and transfers.",
    "Purchase": "Purchase, suppliers, and receipts.",
    "Product Common": "Categories, brands, and units.",
    "Sites": "Sites, landing pages, and domains.",
  }
  return descriptions[title] ?? "Workspace menu shortcuts."
}

function readStoredApp(): DashboardAppId {
  const value = window.localStorage.getItem("cxsun.activeApp") ?? "application"
  if (value === "cms") return "sites"
  return isDashboardAppId(value) ? value : "application"
}

function readStoredEnabledApps(): Record<DashboardAppId, boolean> {
  try {
    const stored = window.localStorage.getItem("cxsun.enabledApps.v2")
    if (!stored) return defaultEnabledApps
    return { ...defaultEnabledApps, ...JSON.parse(stored), application: true }
  } catch {
    return defaultEnabledApps
  }
}
