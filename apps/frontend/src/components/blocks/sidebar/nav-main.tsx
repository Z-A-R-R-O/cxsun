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
import { cn } from "src/lib/utils"

interface NavItem {
  title: string
  url: string
  icon?: LucideIcon
  isActive?: boolean
  defaultOpen?: boolean
  onSelect?: () => void
  items?: NavItem[]
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
                  className="h-10 rounded-xl px-3 font-semibold transition-[background,color,box-shadow,transform] duration-300 ease-out hover:bg-sidebar-foreground/90 hover:text-sidebar hover:shadow-md data-active:bg-sidebar-foreground data-active:text-sidebar data-active:shadow-md [&_svg]:size-4 [&_svg]:text-current [&_svg]:transition-colors [&_svg]:duration-300"
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
                    className="h-10 rounded-xl px-3 font-semibold transition-[background,color,box-shadow,transform] duration-300 ease-out hover:bg-sidebar-foreground/90 hover:text-sidebar hover:shadow-md data-[state=open]:bg-sidebar-foreground/10 data-[state=open]:text-sidebar-foreground [&_svg]:size-4 [&_svg]:text-current [&_svg]:transition-colors [&_svg]:duration-300"
                  >
                    {item.icon ? <item.icon /> : null}
                    <span>{item.title}</span>
                    <ChevronRight className="ml-auto size-4 text-current opacity-70 transition-[transform,color,opacity] duration-300 group-data-[state=open]/collapsible:rotate-90 group-hover/collapsible:opacity-100" />
                  </SidebarMenuButton>
                </CollapsibleTrigger>
                <CollapsibleContent className="overflow-hidden transition-all duration-300 ease-out data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
                  <SidebarMenuSub className="mx-0 mt-1 gap-1 border-l-0 px-3 py-0 group-data-[collapsible=icon]:hidden">
                    {item.items.map((subItem) => <NestedSubItem key={subItem.title} item={subItem} />)}
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

function NestedSubItem({ item }: { item: NavItem }) {
  const isParentActive = item.isActive || Boolean(item.items?.some(hasActiveItem))
  const isPrimaryAction = item.title === "New message"

  if (item.items?.length) {
    return (
      <Collapsible asChild defaultOpen={isParentActive} className="group/nested-collapsible">
        <SidebarMenuSubItem>
          <CollapsibleTrigger asChild>
            <button
              className="flex min-h-9 w-full items-center gap-1.5 rounded-xl px-2 py-2 text-left text-xs font-medium leading-tight text-muted-foreground transition-[background,color,box-shadow,transform] duration-300 ease-out hover:translate-x-0.5 hover:bg-sidebar-foreground/90 hover:text-sidebar hover:shadow-sm data-[state=open]:bg-sidebar-foreground/10 data-[state=open]:text-sidebar-foreground [&_svg]:size-4 [&_svg]:text-current [&_svg]:transition-colors [&_svg]:duration-300"
              type="button"
            >
              {item.icon ? <item.icon /> : null}
              <span className="min-w-0 flex-1 whitespace-normal break-words">{item.title}</span>
              <ChevronRight className="size-4 text-current opacity-70 transition-[transform,color,opacity] duration-300 group-data-[state=open]/nested-collapsible:rotate-90 group-hover/nested-collapsible:opacity-100" />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent className="overflow-hidden transition-all duration-300 ease-out data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
            <SidebarMenuSub className="ml-2 mt-1 gap-1 border-l px-2 py-1">
              {item.items.map((child) => <NestedSubItem key={child.title} item={child} />)}
            </SidebarMenuSub>
          </CollapsibleContent>
        </SidebarMenuSubItem>
      </Collapsible>
    )
  }

  return (
    <SidebarMenuSubItem>
      <SidebarMenuSubButton
        asChild
        isActive={item.isActive}
        className={cn(
          "min-h-9 rounded-xl px-2 py-2 leading-tight transition-[background,color,box-shadow,transform] duration-300 ease-out [&_svg]:size-4 [&_svg]:text-current [&_svg]:transition-colors [&_svg]:duration-300 [&>a]:items-start [&>a]:gap-1.5",
          isPrimaryAction
            ? "mb-3 min-h-10 bg-primary text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 hover:text-primary-foreground data-active:bg-primary data-active:text-primary-foreground"
            : "text-xs font-medium text-muted-foreground hover:translate-x-0.5 hover:bg-sidebar-foreground/90 hover:text-sidebar hover:shadow-sm data-active:bg-sidebar-foreground data-active:text-sidebar data-active:shadow-md hover:[&_svg]:text-sidebar data-active:[&>a_svg]:!text-sidebar data-[active=true]:[&>a_svg]:!text-sidebar",
        )}
      >
        <a href={item.url} onClick={handleSelect(item.onSelect)}>
          {item.icon ? <item.icon /> : null}
          <span className="whitespace-normal break-words">{item.title}</span>
        </a>
      </SidebarMenuSubButton>
    </SidebarMenuSubItem>
  )
}

function hasActiveItem(item: NavItem): boolean {
  return Boolean(item.isActive || item.items?.some(hasActiveItem))
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
