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

function dashboardPath(basePath: string, page: DashboardPage) {
  return page === "overview" ? basePath : `${basePath}/${page}`
}

function dashboardPageFromPath(basePath: string, pathname = window.location.pathname): DashboardPage {
  const [, root, page] = pathname.split("/")
  const expectedRoot = basePath.replace(/^\//, "")
  if (root !== expectedRoot) return "overview"
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
  tenant: ["overview", "company", "tenant-roles"],
}

const dashboardTitles: Record<DashboardMode, string> = {
  "super-admin": "Super Admin Dashboard",
  admin: "Admin Dashboard",
  tenant: "Tenant Dashboard",
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

  function navigate(page: DashboardPage) {
    if (!pageAccess[mode].includes(page)) {
      setActivePage("overview")
      pushDashboardPage(basePath, "overview")
      return
    }

    setActivePage(page)
    pushDashboardPage(basePath, page)
  }

  return (
    <SidebarProvider>
      <AppSidebar
        dashboardMode={mode}
        basePath={basePath}
        activePage={visiblePage}
        onNavigate={navigate}
        onTenantChange={changeTenant}
        selectedTenant={session.selectedTenant.slug}
        tenants={session.tenants}
        user={session.user}
      />
      <SidebarInset>
        <SiteHeader dashboardTitle={dashboardTitles[mode]} onBackHome={onBackHome} onLogout={logout} />
        {visiblePage === "tenant" ? (
          <TenantListPage />
        ) : visiblePage === "tenant-domain" ? (
          <TenantDomainPage />
        ) : visiblePage === "industry" ? (
          <IndustryPage />
        ) : visiblePage === "company" && mode === "admin" ? (
          <SupportPage type="helpdesk" />
        ) : visiblePage === "company" ? (
          <CompanyPage session={session} />
        ) : visiblePage === "client" ? (
          <ClientPage />
        ) : visiblePage === "system-update" ? (
          <SystemUpdateView />
        ) : visiblePage === "user-manager" ? (
          <SupportPage type="user-manager" />
        ) : visiblePage === "helpdesk" ? (
          <SupportPage type="helpdesk" />
        ) : visiblePage === "bugs" ? (
          <SupportPage type="bugs" />
        ) : visiblePage === "tenant-roles" ? (
          <SupportPage type="tenant-roles" />
        ) : (
          <DashboardHome mode={mode} />
        )}
      </SidebarInset>
    </SidebarProvider>
  )
}
