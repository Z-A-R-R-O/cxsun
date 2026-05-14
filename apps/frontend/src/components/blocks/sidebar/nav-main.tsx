import type React from "react"
import { ChevronRight, type LucideIcon } from "lucide-react"

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "src/components/ui/collapsible"
import {
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "src/components/ui/sidebar"

interface NavItem {
  title: string
  url: string
  icon?: LucideIcon
  isActive?: boolean
  defaultOpen?: boolean
  onSelect?: () => void
  items?: {
    title: string
    url: string
    icon?: LucideIcon
    isActive?: boolean
    onSelect?: () => void
  }[]
}

export function NavMain({ items }: { items: NavItem[] }) {
  return (
    <SidebarGroup className="p-0">
      <SidebarMenu className="gap-3">
        {items.map((item) => {
          if (!item.items?.length) {
            return (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton
                  asChild
                  isActive={item.isActive}
                  tooltip={item.title}
                  className="h-10 rounded-xl px-3 font-semibold transition-[background,color,box-shadow,transform] duration-300 hover:bg-sidebar-accent/80 hover:shadow-sm data-active:bg-sidebar-accent data-active:text-sidebar-accent-foreground data-active:shadow-sm [&_svg]:size-4"
                >
                  <a href={item.url} onClick={handleSelect(item.onSelect)}>
                    {item.icon ? <item.icon /> : null}
                    <span>{item.title}</span>
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )
          }

          return (
            <Collapsible
              key={item.title}
              asChild
              defaultOpen={item.defaultOpen || item.isActive}
              className="group/collapsible"
            >
              <SidebarMenuItem>
                <CollapsibleTrigger asChild>
                  <SidebarMenuButton
                    tooltip={item.title}
                    className="h-10 rounded-xl px-3 font-semibold transition-[background,color,box-shadow] duration-300 hover:bg-sidebar-accent/80 hover:shadow-sm data-[state=open]:bg-transparent [&_svg]:size-4"
                  >
                    {item.icon ? <item.icon /> : null}
                    <span>{item.title}</span>
                    <ChevronRight className="ml-auto size-4 text-muted-foreground transition-transform duration-300 group-data-[state=open]/collapsible:rotate-90" />
                  </SidebarMenuButton>
                </CollapsibleTrigger>
                <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
                  <SidebarMenuSub className="mx-0 mt-1 gap-1 border-l-0 px-6 py-0 group-data-[collapsible=icon]:hidden">
                    {item.items.map((subItem) => (
                      <SidebarMenuSubItem key={subItem.title}>
                        <SidebarMenuSubButton
                          asChild
                          isActive={subItem.isActive}
                          className="h-9 rounded-xl px-3 font-medium text-muted-foreground transition-[background,color,box-shadow] duration-300 hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground data-active:bg-sidebar-accent data-active:text-sidebar-accent-foreground data-active:shadow-sm [&_svg]:size-4"
                        >
                          <a href={subItem.url} onClick={handleSelect(subItem.onSelect)}>
                            {subItem.icon ? <subItem.icon /> : null}
                            <span>{subItem.title}</span>
                          </a>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    ))}
                  </SidebarMenuSub>
                </CollapsibleContent>
              </SidebarMenuItem>
            </Collapsible>
          )
        })}
      </SidebarMenu>
    </SidebarGroup>
  )
}

function handleSelect(onSelect?: () => void) {
  return (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (!onSelect) {
      return
    }

    event.preventDefault()
    onSelect()
  }
}
