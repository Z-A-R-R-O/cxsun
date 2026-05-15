import { useEffect, useState } from 'react'
import { AppSidebar, type DashboardPage } from 'src/components/blocks/sidebar/app-sidebar'
import { SiteHeader } from 'src/components/blocks/layout/site-header'
import { SidebarInset, SidebarProvider } from 'src/components/ui/sidebar'
import { SectionCards } from './section-cards'
import { SystemUpdateView } from './system-update-view'
import { LoginForm } from '../auth/login-form'
import { ForgotPasswordForm } from '../auth/forgot-password-form'
import {
  clearSession,
  getStoredSession,
  switchTenant,
  type AuthSession,
} from 'src/features/auth/auth-client'
import { TenantListPage } from 'src/features/tenant/interface/pages/tenant-list-page'
import { CompanyPage } from 'src/features/company/company-page'
import { IndustryPage } from 'src/features/industry/industry-page'

function dashboardPath(page: DashboardPage) {
  return page === "overview" ? "/app" : `/app/${page}`
}

function dashboardPageFromPath(pathname = window.location.pathname): DashboardPage {
  const [, root, page] = pathname.split("/")
  if (root !== "app") return "overview"
  if (page === "tenant" || page === "industry" || page === "company" || page === "system-update") {
    return page
  }
  return "overview"
}

function pushDashboardPage(page: DashboardPage) {
  const nextPath = dashboardPath(page)
  if (window.location.pathname !== nextPath) {
    window.history.pushState(null, "", nextPath)
  }
}

export function DashboardView({ onBackHome }: { onBackHome: () => void }) {
  const [activePage, setActivePage] = useState<DashboardPage>(() => dashboardPageFromPath())
  const [session, setSession] = useState<AuthSession | null>(() => getStoredSession())
  const [authPage, setAuthPage] = useState<"login" | "forgot-password">("login")

  useEffect(() => {
    function syncDashboardPage() {
      setActivePage(dashboardPageFromPath())
    }

    window.addEventListener("popstate", syncDashboardPage)
    return () => window.removeEventListener("popstate", syncDashboardPage)
  }, [])

  if (!session) {
    return (
      <div className="grid min-h-screen place-items-center bg-background p-6">
        <div className="w-full max-w-[560px]">
          {authPage === "forgot-password" ? (
            <ForgotPasswordForm onBackToLogin={() => setAuthPage("login")} />
          ) : (
            <LoginForm
              onAuthenticated={setSession}
              onForgotPassword={() => setAuthPage("forgot-password")}
            />
          )}
        </div>
      </div>
    )
  }

  function logout() {
    clearSession()
    setSession(null)
  }

  function changeTenant(tenantSlug: string) {
    if (!session) {
      return
    }

    setSession(switchTenant(session, tenantSlug))
  }

  const canManagePlatform = session.selectedTenant.role === "super-admin"
  const visiblePage =
    canManagePlatform || (activePage !== "tenant" && activePage !== "industry")
      ? activePage
      : "overview"

  function navigate(page: DashboardPage) {
    if (!canManagePlatform && (page === "tenant" || page === "industry")) {
      setActivePage("overview")
      pushDashboardPage("overview")
      return
    }

    setActivePage(page)
    pushDashboardPage(page)
  }

  return (
    <SidebarProvider>
      <AppSidebar
        activePage={visiblePage}
        canManagePlatform={canManagePlatform}
        onNavigate={navigate}
        onTenantChange={changeTenant}
        selectedTenant={session.selectedTenant.slug}
        tenants={session.tenants}
        user={session.user}
      />
      <SidebarInset>
        <SiteHeader onBackHome={onBackHome} onLogout={logout} />
        {visiblePage === "tenant" ? (
          <TenantListPage />
        ) : visiblePage === "industry" ? (
          <IndustryPage />
        ) : visiblePage === "company" ? (
          <CompanyPage session={session} />
        ) : visiblePage === "system-update" ? (
          <SystemUpdateView />
        ) : (
          <div className="flex flex-1 flex-col">
            <div className="@container/main flex flex-1 flex-col gap-2">
              <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
                <SectionCards />
              </div>
            </div>
          </div>
        )}
      </SidebarInset>
    </SidebarProvider>
  )
}
