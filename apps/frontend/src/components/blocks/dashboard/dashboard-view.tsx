import dashboardData from 'src/app/dashboard/data.json'
import { useState } from 'react'
import { AppSidebar, type DashboardPage } from 'src/components/blocks/sidebar/app-sidebar'
import { SiteHeader } from 'src/components/blocks/layout/site-header'
import { SidebarInset, SidebarProvider } from 'src/components/ui/sidebar'
import { DataTable } from './data-table'
import { SectionCards } from './section-cards'
import { SystemUpdateView } from './system-update-view'

export function DashboardView({ onBackHome }: { onBackHome: () => void }) {
  const [activePage, setActivePage] = useState<DashboardPage>("overview")

  return (
    <SidebarProvider>
      <AppSidebar activePage={activePage} onNavigate={setActivePage} />
      <SidebarInset>
        <SiteHeader onBackHome={onBackHome} />
        {activePage === "system-update" ? (
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
