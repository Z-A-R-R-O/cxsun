import { House } from "lucide-react"

import { Button } from "src/components/ui/button"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "src/components/ui/breadcrumb"
import { Separator } from "src/components/ui/separator"
import { SidebarTrigger } from "src/components/ui/sidebar"
import { ThemeToggle } from "src/components/blocks/theme/theme-toggle"

interface SiteHeaderProps {
  dashboardTitle?: string
  onBackHome?: () => void
  onLogout?: () => void
}

export function SiteHeader({ dashboardTitle = "Dashboard", onBackHome, onLogout }: SiteHeaderProps) {
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
              <BreadcrumbLink
                aria-label="Home"
                className="inline-flex items-center"
                href="#"
                onClick={(event) => event.preventDefault()}
              >
                <House className="size-4" />
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator className="hidden md:block" />
            <BreadcrumbItem>
              <BreadcrumbPage>{dashboardTitle}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <div className="ml-auto flex items-center gap-2">
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
            Logout
          </Button>
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}
