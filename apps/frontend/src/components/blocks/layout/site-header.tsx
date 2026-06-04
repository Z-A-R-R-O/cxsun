import { Bell, Check, ChevronDown, House, LogOut } from "lucide-react"

import { Button } from "src/components/ui/button"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "src/components/ui/breadcrumb"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "src/components/ui/dropdown-menu"
import { Separator } from "src/components/ui/separator"
import { SidebarTrigger } from "src/components/ui/sidebar"
import { ThemeToggle } from "src/components/blocks/theme/theme-toggle"
import { cn } from "src/lib/utils"
import { dashboardApps, type DashboardAppId } from "src/components/blocks/dashboard/dashboard-apps"

interface SiteHeaderProps {
  activeApp?: DashboardAppId
  appEnabled?: Record<DashboardAppId, boolean>
  dashboardTitle?: string
  onBackHome?: () => void
  onChangeApp?: (appId: DashboardAppId) => void
  onLogout?: () => void
}

export function SiteHeader({
  activeApp = "application",
  appEnabled,
  dashboardTitle = "Dashboard",
  onBackHome,
  onChangeApp,
  onLogout,
}: SiteHeaderProps) {
  const selectedApp = dashboardApps.find((app) => app.id === activeApp) ?? dashboardApps[0]
  const visibleApps = dashboardApps.filter((app) => appEnabled?.[app.id] ?? app.status !== "disabled")
  const SelectedAppIcon = selectedApp.icon
  const notifications = [
    { title: "Billing app is ready", body: "Invoices and payments can be connected next." },
    { title: "Site app is ready", body: "Activate site tools from the application desk when needed." },
    { title: "Workspace boundary active", body: "Menus are scoped to the selected app and workspace." },
  ]

  return (
    <header className="flex h-12 shrink-0 items-center border-b transition-[width,height] ease-linear">
      <div className="flex h-full w-full items-center gap-3 px-4 lg:px-5">
        <SidebarTrigger className="-ml-1 size-9 rounded-sm [&_svg]:size-5" />
        <Separator
          orientation="vertical"
          className="mx-1 self-stretch data-[orientation=vertical]:h-auto"
        />
        <Breadcrumb className="flex h-full items-center">
          <BreadcrumbList className="items-center">
            <BreadcrumbItem className="hidden md:block">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="group inline-flex h-8 items-center gap-2 rounded-md border-0 bg-transparent pr-1.5 text-sm font-medium text-foreground outline-none ring-0 transition-colors hover:bg-muted/60 focus:border-0 focus:bg-transparent focus:outline-none focus:ring-0 focus-visible:border-0 focus-visible:bg-transparent focus-visible:outline-none focus-visible:ring-0 data-[state=open]:border-0 data-[state=open]:bg-transparent data-[state=open]:outline-none data-[state=open]:ring-0" type="button">
                    <span className="flex size-8 items-center justify-center rounded-md border-0 bg-transparent text-muted-foreground outline-none ring-0 transition-colors group-hover:bg-primary/10 group-hover:text-primary group-focus:bg-transparent group-focus:text-muted-foreground group-focus-visible:bg-transparent group-focus-visible:text-muted-foreground group-data-[state=open]:bg-transparent group-data-[state=open]:text-muted-foreground">
                      <SelectedAppIcon className="size-4" />
                    </span>
                    <span className="leading-none">{selectedApp.shortName}</span>
                    <ChevronDown className="size-3.5 text-muted-foreground" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-64 rounded-md p-1 shadow-lg">
                  <DropdownMenuLabel className="text-xs text-muted-foreground">Switch app</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {visibleApps.map((app) => {
                    const AppIcon = app.icon
                    return (
                      <DropdownMenuItem
                        key={app.id}
                        className="cursor-pointer gap-3 rounded-sm py-2"
                        onSelect={() => onChangeApp?.(app.id)}
                      >
                        <span className={cn("flex size-8 items-center justify-center rounded-md border transition-colors", app.id === selectedApp.id ? "border-primary/30 bg-primary/10 text-primary" : "border-border/70 bg-background text-muted-foreground")}>
                          <AppIcon className="size-4" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block font-medium">{app.name}</span>
                          <span className="block truncate text-xs text-muted-foreground">{app.description}</span>
                        </span>
                        {app.id === selectedApp.id ? <Check className="size-4" /> : null}
                      </DropdownMenuItem>
                    )
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            </BreadcrumbItem>
            <BreadcrumbSeparator className="hidden px-0.5 text-muted-foreground/50 md:flex">
              <span className="text-sm leading-none">/</span>
            </BreadcrumbSeparator>
            <BreadcrumbItem>
              <BreadcrumbPage>{dashboardTitle}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <div className="ml-auto flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button aria-label="Notifications" className="relative h-8 rounded-md px-2.5" size="sm" type="button" variant="outline">
                <Bell className="size-4" />
                <span className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-foreground text-[10px] font-semibold text-background">
                  {notifications.length}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80 rounded-md p-0 shadow-lg">
              <DropdownMenuLabel className="px-4 py-3">Notifications</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <div className="p-1">
                {notifications.map((notification) => (
                  <DropdownMenuItem key={notification.title} className="cursor-pointer items-start gap-3 rounded-sm px-3 py-2">
                    <span className="mt-1 size-2 rounded-full bg-primary" />
                    <span>
                      <span className="block text-sm font-medium">{notification.title}</span>
                      <span className="block text-xs leading-5 text-muted-foreground">{notification.body}</span>
                    </span>
                  </DropdownMenuItem>
                ))}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            className="h-8 rounded-md px-2.5"
            onClick={onBackHome}
            size="sm"
            type="button"
            variant="ghost"
          >
            <House className="size-4" />
            <span>Home</span>
          </Button>
          <Button
            className="h-8 rounded-md px-2.5"
            onClick={onLogout}
            size="sm"
            type="button"
            variant="outline"
          >
            <LogOut className="size-4" />
            Logout
          </Button>
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}
