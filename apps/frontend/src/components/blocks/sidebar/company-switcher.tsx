"use client"

import * as React from "react"
import { ChevronsUpDown, Plus } from "lucide-react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "src/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "src/components/ui/sidebar"

export function CompanySwitcher({
  companies,
  label = "Companies",
  value,
  onValueChange,
}: {
  companies: {
    name: string
    logo: React.ElementType
    period: string
    value: string
  }[]
  label?: string
  value?: string
  onValueChange?: (value: string) => void
}) {
  const { isMobile } = useSidebar()
  const activeCompany = companies.find((company) => company.value === value) ?? companies[0]

  if (!activeCompany) {
    return null
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="h-14 rounded-t-lg rounded-b-none bg-background/80 px-2 shadow-none transition-[background,box-shadow] duration-300 hover:bg-sidebar-accent/80 data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground group-data-[collapsible=icon]:!size-12 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:rounded-lg group-data-[collapsible=icon]:!p-0"
            >
              <div className="flex aspect-square size-10 items-center justify-center rounded-xl bg-background p-1.5 group-data-[collapsible=icon]:size-11 group-data-[collapsible=icon]:p-1">
                <activeCompany.logo className="size-6 group-data-[collapsible=icon]:size-7" />
              </div>
              <div className="grid flex-1 text-left leading-tight group-data-[collapsible=icon]:hidden">
                <span className="truncate text-sm font-semibold">
                  {activeCompany.name}
                </span>
                <span className="truncate text-xs text-muted-foreground">
                  {activeCompany.period}
                </span>
              </div>
              <ChevronsUpDown className="ml-auto size-4 text-muted-foreground group-data-[collapsible=icon]:hidden" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            align="start"
            side={isMobile ? "bottom" : "right"}
            sideOffset={4}
          >
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              {label}
            </DropdownMenuLabel>
            {companies.map((company, index) => (
              <DropdownMenuItem
                key={company.name}
                onClick={() => onValueChange?.(company.value)}
                className="gap-2 p-2"
              >
                <div className="flex size-6 items-center justify-center rounded-md border p-1">
                  <company.logo className="size-3.5" />
                </div>
                {company.name}
                <DropdownMenuShortcut>#{index + 1}</DropdownMenuShortcut>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem className="gap-2 p-2">
              <div className="flex size-6 items-center justify-center rounded-md border bg-transparent">
                <Plus className="size-4" />
              </div>
              <div className="font-medium text-muted-foreground">Add company</div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
