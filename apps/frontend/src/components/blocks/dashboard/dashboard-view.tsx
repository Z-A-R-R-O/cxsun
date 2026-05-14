import dashboardData from 'src/app/dashboard/data.json'
import { useState } from 'react'
import { AppSidebar, type DashboardPage } from 'src/components/blocks/sidebar/app-sidebar'
import { SiteHeader } from 'src/components/blocks/layout/site-header'
import { SidebarInset, SidebarProvider } from 'src/components/ui/sidebar'
import { DataTable } from './data-table'
import { SectionCards } from './section-cards'
import { SystemUpdateView } from './system-update-view'
import { LoginForm } from '../auth/login-form'
import { Button } from 'src/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from 'src/components/ui/select'
import {
  clearSession,
  getStoredSession,
  switchTenant,
  type AuthSession,
} from 'src/features/auth/auth-client'
import { TenantListPage } from 'src/features/tenant/interface/pages/tenant-list-page'
import { CompanyPage } from 'src/features/company/company-page'
import { IndustryPage } from 'src/features/industry/industry-page'

export function DashboardView({ onBackHome }: { onBackHome: () => void }) {
  const [activePage, setActivePage] = useState<DashboardPage>("overview")
  const [session, setSession] = useState<AuthSession | null>(() => getStoredSession())

  if (!session) {
    return (
      <div className="grid min-h-screen place-items-center bg-background p-6">
        <div className="w-full max-w-md">
          <LoginForm onAuthenticated={setSession} />
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

  return (
    <SidebarProvider>
      <AppSidebar activePage={activePage} onNavigate={setActivePage} />
      <SidebarInset>
        <SiteHeader onBackHome={onBackHome} />
        <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-card/70 px-4 py-3 md:px-6">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{session.user.name}</p>
            <p className="truncate text-xs text-muted-foreground">{session.user.email}</p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={session.selectedTenant.slug} onValueChange={changeTenant}>
              <SelectTrigger className="h-9 min-w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {session.tenants.map((tenant) => (
                  <SelectItem key={tenant.slug} value={tenant.slug}>
                    {tenant.name} · {tenant.role}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={logout} type="button" variant="outline">
              Logout
            </Button>
          </div>
        </div>
        {activePage === "tenant" ? (
          <TenantListPage />
        ) : activePage === "industry" ? (
          <IndustryPage />
        ) : activePage === "company" ? (
          <CompanyPage session={session} />
        ) : activePage === "system-update" ? (
          <SystemUpdateView />
        ) : (
          <div className="flex flex-1 flex-col">
            <div className="@container/main flex flex-1 flex-col gap-2">
              <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
                <SectionCards />
                <DataTable data={dashboardData} />
              </div>
            </div>
          </div>
        )}
      </SidebarInset>
    </SidebarProvider>
  )
}
