# Session Review

**Date:** 2026-05-14
**Project:** cxsun v1.0.08

## Session Summary

User prompted: "read assist/readme and prepare for work"

## Project State (as of session start)

- **Version:** 1.0.08
- **Branch:** not verified in this prep step
- **Uncommitted changes:** existing workspace changes were present before this prep step.

## Active Prompt

```
read assist/readme and prepare for work
```

## Current Prompt

```
read full structure of application and find any gap from assist to real project
```

## Current Prompt

```
fix all ai assist to latest structure and working pattern and finalise
```

## Current Prompt

```
ok implement
```

## Current Prompt

```
ok
```

## Current Prompt

```
move all css to proper assets/css folder inside frontend and wire it and add tailwind and shad cn with theme switch and create landing page with top menu and bottom footer with about, services , contact, blog pages with simple and connect with frontend and backend comunication and add kysely with sqlite at present and make storage/database/cxsun.sqlite and connect this as wire with frontend
```

## Current Prompt

```
add shad cn package and connect with npx shadcn@latest add dashboard-07 and npx shadcn@latest add login-01 and wire it
```

## Current Prompt

```
This site can’t be reached
The web page at http://localhost:6000/ might be temporarily down or it may have

"C:\Program Files\nodejs\npm.cmd" run dev

> cxsun@1.0.08 dev
> concurrently -k -n server,web "npm -w apps/server run dev" "npm -w apps/frontend run dev"

[server] ...
[web]   VITE v8.0.12  ready in 609 ms
[web]   ➜  Local:   http://localhost:6000/
[server]   ✓ Server running at http://localhost:6001
[server]   ✓ Health check: {"status":"ok","uptime":82,"timestamp":"2026-05-14T06:25:38.978Z","version":"1.0.08"}
```

## Current Prompt

```
now test e2e that live server is working fine
```

## Current Prompt

```
make as it is do not add or change any thing keep as it is and only wire it to dashboard
```

## Current Prompt

```
add this and refactor to this present

npx shadcn@latest init --preset b0 --template vite --monorepo --pointer
```

## Current Prompt

```
read assist/readme and 
make build or dist to root build folder make all apps to build at there with same for dist on server

add .container and add docker and docker-compose file and make this to deploy

make only docker with minimal and required sudo , nano and run time lib for node , and working folder with no restriction for read and write or any 

make only env container that can handle to run this app and at entrypoint make clone from github and build and then run server and frontend 
make this as simple setup and we can again pull updates from git manually and build and restart our server if wanted
```

## Current Prompt

~~~

## Current Prompt

```
fix logo , logo-dark , favicon from public and assets/logo if any problem don't change structure
```

## Current Prompt

```
at frontend make all lable to branding CXSun to Codexsun make APP_NAME=Codexsun
```

## Current Prompt

```
make app side bar to inset and breadcrumb  and make breadcrumb area little height

import { AppSidebar } from "@/components/app-sidebar"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"

export default function Page() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator
              orientation="vertical"
              className="mr-2 data-[orientation=vertical]:h-4"
            />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="#">
                    Build Your Application
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>Data Fetching</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          <div className="grid auto-rows-min gap-4 md:grid-cols-3">
            <div className="aspect-video rounded-xl bg-muted/50" />
            <div className="aspect-video rounded-xl bg-muted/50" />
            <div className="aspect-video rounded-xl bg-muted/50" />
          </div>
          <div className="min-h-[100vh] flex-1 rounded-xl bg-muted/50 md:min-h-min" />
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
```

## Current Prompt

```
move theme switch to right corner and change landing to home with icon as button , small round corner
```

## Current Prompt

```
also add label as Home with icon
```

## Current Prompt

```
remove workarea chart and make side bar expand and collapse to smooth move
```

## Current Prompt

```
add Separator below logo area in side bar
use
npx shadcn@latest add separator
and add all needed ui components and check any import errors

if already added overwrite it


Accordion
Alert
Alert Dialog
Aspect Ratio
Avatar
Badge
Breadcrumb
Button
Button Group
Calendar
Card
Carousel
Chart
Checkbox
Collapsible
Combobox
Command
Context Menu
Data Table
Date Picker
Dialog
Direction
Drawer
Dropdown Menu
Empty
Field
Hover Card
Input
Input Group
Input OTP
Item
Kbd
Label
Menubar
Native Select
Navigation Menu
Pagination
Popover
Progress
Radio Group
Resizable
Scroll Area
Select
Separator
Sheet
Sidebar
Skeleton
Slider
Sonner
Spinner
Switch
Table
Tabs
Textarea
Toast
Toggle
Toggle Group
Tooltip
Typography
```

## Current Prompt

```
in component move all scattered files to proper folder

move side bar related to blocks/menu/sidebar like so move all to blocks and subfolders
```

## Current Prompt

```
check this is properly wired or coded
 "github:now": "node apps/cli/github-helper.mjs"

for github sync
```

## Current Prompt

```
make side bar design to feel like this with smooth movement

group header , space , icon size and hover effect align with theme add overview at top 

change team switch to company switch and rename team to company on all labels and where ever wanted and make to look elegant
<image>
```

## Current Prompt

```
ok commit all and push all, if want to omit any thing omit it like storage and test github:now
```

## Current Prompt

~~~
add neutral theme as first and default 

:root {
  --background: oklch(1 0 0);
  --foreground: oklch(0.145 0 0);
  --card: oklch(1 0 0);
  --card-foreground: oklch(0.145 0 0);
  --popover: oklch(1 0 0);
  --popover-foreground: oklch(0.145 0 0);
  --primary: oklch(0.205 0 0);
  --primary-foreground: oklch(0.985 0 0);
  --secondary: oklch(0.97 0 0);
  --secondary-foreground: oklch(0.205 0 0);
  --muted: oklch(0.97 0 0);
  --muted-foreground: oklch(0.556 0 0);
  --accent: oklch(0.97 0 0);
  --accent-foreground: oklch(0.205 0 0);
  --destructive: oklch(0.577 0.245 27.325);
  --border: oklch(0.922 0 0);
  --input: oklch(0.922 0 0);
  --ring: oklch(0.708 0 0);
  --chart-1: oklch(0.87 0 0);
  --chart-2: oklch(0.556 0 0);
  --chart-3: oklch(0.439 0 0);
  --chart-4: oklch(0.371 0 0);
  --chart-5: oklch(0.269 0 0);
  --radius: 0.625rem;
  --sidebar: oklch(0.985 0 0);
  --sidebar-foreground: oklch(0.145 0 0);
  --sidebar-primary: oklch(0.205 0 0);
  --sidebar-primary-foreground: oklch(0.985 0 0);
  --sidebar-accent: oklch(0.97 0 0);
  --sidebar-accent-foreground: oklch(0.205 0 0);
  --sidebar-border: oklch(0.922 0 0);
  --sidebar-ring: oklch(0.708 0 0);
}

.dark {
  --background: oklch(0.145 0 0);
  --foreground: oklch(0.985 0 0);
  --card: oklch(0.205 0 0);
  --card-foreground: oklch(0.985 0 0);
  --popover: oklch(0.205 0 0);
  --popover-foreground: oklch(0.985 0 0);
  --primary: oklch(0.922 0 0);
  --primary-foreground: oklch(0.205 0 0);
  --secondary: oklch(0.269 0 0);
  --secondary-foreground: oklch(0.985 0 0);
  --muted: oklch(0.269 0 0);
  --muted-foreground: oklch(0.708 0 0);
  --accent: oklch(0.269 0 0);
  --accent-foreground: oklch(0.985 0 0);
  --destructive: oklch(0.704 0.191 22.216);
  --border: oklch(1 0 0 / 10%);
  --input: oklch(1 0 0 / 15%);
  --ring: oklch(0.556 0 0);
  --chart-1: oklch(0.87 0 0);
  --chart-2: oklch(0.556 0 0);
  --chart-3: oklch(0.439 0 0);
  --chart-4: oklch(0.371 0 0);
  --chart-5: oklch(0.269 0 0);
  --sidebar: oklch(0.205 0 0);
  --sidebar-foreground: oklch(0.985 0 0);
  --sidebar-primary: oklch(0.488 0.243 264.376);
  --sidebar-primary-foreground: oklch(0.985 0 0);
  --sidebar-accent: oklch(0.269 0 0);
  --sidebar-accent-foreground: oklch(0.985 0 0);
  --sidebar-border: oklch(1 0 0 / 10%);
  --sidebar-ring: oklch(0.556 0 0);
}
~~~
read assist readme and start to work

add this as  blue theme , emerald theme , 

blue : npx shadcn@latest apply --preset b1Ymqvgky --only theme
emerald : npx shadcn@latest apply --preset b1Ymqvgky --only theme 
orange : npx shadcn@latest apply --preset b3kI323N2 --only theme
indigo : npx shadcn@latest apply --preset b3kI323N2 --only theme

---
title: Vite
description: Adding dark mode to your Vite app.
---

## Create a theme provider

```tsx title="components/theme-provider.tsx" showLineNumbers
import { createContext, useContext, useEffect, useState } from "react"

type Theme = "dark" | "light" | "system"

type ThemeProviderProps = {
  children: React.ReactNode
  defaultTheme?: Theme
  storageKey?: string
}

type ThemeProviderState = {
  theme: Theme
  setTheme: (theme: Theme) => void
}

const initialState: ThemeProviderState = {
  theme: "system",
  setTheme: () => null,
}

const ThemeProviderContext = createContext<ThemeProviderState>(initialState)

export function ThemeProvider({
  children,
  defaultTheme = "system",
  storageKey = "vite-ui-theme",
  ...props
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(
    () => (localStorage.getItem(storageKey) as Theme) || defaultTheme
  )

  useEffect(() => {
    const root = window.document.documentElement

    root.classList.remove("light", "dark")

    if (theme === "system") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)")
        .matches
        ? "dark"
        : "light"

      root.classList.add(systemTheme)
      return
    }

    root.classList.add(theme)
  }, [theme])

  const value = {
    theme,
    setTheme: (theme: Theme) => {
      localStorage.setItem(storageKey, theme)
      setTheme(theme)
    },
  }

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  )
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext)

  if (context === undefined)
    throw new Error("useTheme must be used within a ThemeProvider")

  return context
}
```

## Wrap your root layout

Add the `ThemeProvider` to your root layout.

```tsx {1,5-7} title="App.tsx" showLineNumbers
import { ThemeProvider } from "@/components/theme-provider"

function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      {children}
    </ThemeProvider>
  )
}

export default App
```

## Add a mode toggle

Place a mode toggle on your site to toggle between light and dark mode.

```tsx title="components/mode-toggle.tsx" showLineNumbers
import { Moon, Sun } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useTheme } from "@/components/theme-provider"

export function ModeToggle() {
  const { setTheme } = useTheme()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon">
          <Sun className="h-[1.2rem] w-[1.2rem] scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" />
          <Moon className="absolute h-[1.2rem] w-[1.2rem] scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setTheme("light")}>
          Light
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("dark")}>
          Dark
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("system")}>
          System
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
```
~~~

## Current Prompt

```
fix  Vite chunk-size warning in vite and check for any blocker on startup and check first paint timing
```

## Current Prompt

```
read assist/readme and read our codebase short and continue our work
```

## Current Prompt

```
ok fine read app structure 

url -> domain -> tenant -> load teant database 

it is our last work 

scan tenant , domain , industry ,company and auth surface and find any gap or blocker

update readme about this structure and other files about architech
```

## Current Prompt

```
ok fine now split  super-admin, admin , client dashboard separately 

super admin dashboard handles every thing as orchestration

admin dashboard -> user who handle this software , bugs and helpdesk

tenant dashboard -> only isolated client

in side tenant db roles and companies 
```

## Current Prompt

```
also update api also 

http://localhost:6010/app/company for client or tenant

http://localhost:6010/admin/company for admin . helpdesk

http://localhost:6010/sa/company for super admin surface

every url has it own auth gate and own login not to confuse 

http://localhost:6010/login is for normal clients and any others

http://localhost:6010/admin/login for admin helpdesk

http://localhost:6010/sg/login for super admin login

so plan and split code by module for each role

super admin  as sa |  admin | tenant as normal

also create desk that is dashboard according to this bhevaiour
```

## Current Prompt

```
once again create clear pic in assist about this software 

this software is like to be shoppify + zoho concecpt don't mention it just write what we are going to implement
```

## Current Prompt

```
now add domain list + upsert pop up form with common -list and wire it to super-admin side menu
```

## Current Prompt

```
make this Tenant Domains with show page and upsert page instead of pop up
with master list
```


## Current Prompt

```
make all table 3dot button border to rounded and keep drop down same tone of tenant with view | edit | delete or suspend in 

domain , industry , company , client manager 

make all forms to match
```


## Current Prompt

```
make clean refactor on super admin split in to two area

one is modules with tenant or master database
another one is for tenant base

tenant , domain , industry , system update , user manager comes under tenant
company goes to tenant base 

so it can be easy
```

## Current Prompt

```
read readme and log and version pump and commit all and push all
```

## Current Prompt

```
create log and update change log and bump version
```

## Current Prompt

```
read  assist readme and update changelog and pump version
```

## Current Prompt

```
read assist readme and rules and follow strict 


read temp and find for all common modules , master modules and write it in our application with our structure from e2e frontend to backend + test + api

make all common modules in comman list with pop up upsert + list 
make all master modules in master list with show + upsert same as tenant 
```

## Current Prompt

```
make all modules in modular + DDD + event driven  + queue shape , make each common individual it will ease to reuse or drop or enhace in future instead of making single common module and make master also individual

in migration make common primary as integer with auto increment , same for master with uuid additional as unique to go public make uuid to  8 digit length
```

## Current Prompt

```
next
```

## Current Prompt

```
i asked to create all modules individually you have created as single so split one by one 

first split contact , product , order as standalone module 
```

## Current Prompt

```
move these contact , product , order to Master folder and wire it up 
```

## Current Prompt

```
ok fine make the same for all common inside common/<group>/<module> pattern
```

## Current Prompt

```
ok i have already told this make all modules standonly and also structure core and foundation modules in structure
```

## Current Prompt

```
ok implement it
```

## Current Prompt

```
ok fine next make entries/sales module as same as in temp/sales structure , Modular + DDD + event + queue and ui and ux same effect

List + show page as print preview + upsert
show page has comments , tools and activities and alos make this pure teant isolated
```

## Current Prompt

```
copy ui and ux effect same from temp dont change this ux

upsert form with animated tabs and each tabs have proper alignment of inputs so prepare as the same read carefully on temp frontend and do the same
```

## Current Prompt

```
still not completed get master auto complete lookup and wire it to our sales and sale item input and sale items preview in table  to complete and ux has not same tone fix this alos

read twice frontend sales and prepare exactly for contact and sales
```

## Current Prompt

```
refer  temp get contact table and contact structure from temp with all fields and wire it in our app make contact as standalone not to share with master data keep it individual codebase with all animated tabs , fields , and ux and ui
```

## Current Prompt

```
write changelog and write this structure update in assist to new upgraded structures
```

## Current Prompt

```
read assist/readme.md and check all common modules are properly wired
```

## Current Prompt

```
find all user seeder data and refactor for default

user | pass

sundar@sundar.com  | Kalarani1@@ as super admin and only one super-admin in whole application

admin@sundar.com  | Admin@123 as admin 

rewrite tenant seeder

tenants

Aaran
Sathasivam
Sampath
Sathish

as tenant seeder

user for Aaran

aaranoffice@gmail.com as admin for Aaran
user.aaran@aaran.com for user in aaran

add company for aaran 
as 

Aaran Associates
Aaran Info Tech
Tirupur Direct
Tenkasi Sports

role 

super admin - > hide this role on other uers 

admin
manager
staff -> all staff who editer data
user - > all empolyees
```

## Current Prompt

```
read assist readme.md and fix this error and test e2e

login + tenant + company transaction + common transaction on all tables and finalise all are green

rver\\src\\infrastructure\\auth\\jwt.ts:29:25)\n    at AuthService.login (E:\\Workspace\\cxsun\\apps\\server\\src\\modules\\auth\\application\\auth.service.ts:38:19)\n    at process.processTicksAndRejections (node:internal/process/task_queues:104:5)"},"msg":"JWT_SECRET environment variable is required"}
[server] {"level":50,"time":1778909657260,"pid":22056,"hostname":"SUNDAR","reqId":"req-f","req":{"method":"POST","url":"/api/v1/auth/login","host":"localhost:6001","remoteAddress":"127.0.0.1","remotePort":50181},"res":{"statusCode":500},"err":{"type":"Error","message":"JWT_SECRET environment variable is required","stack":"Error: JWT_SECRET environment variable is required\n    at getJwtSecret (E:\\Workspace\\cxsun\\apps\\server\\src\\infrastructure\\auth\\jwt.ts:16:11)\n    at signature (E:\\Workspace\\cxsun\\apps\\server\\src\\infrastructure\\auth\\jwt.ts:68:31)\n    at signJwt (E:\\Workspace\\cxsun\\apps\\server\\src\\infrastructure\\auth\\jwt.ts:29:25)\n    at AuthService.login (E:\\Workspace\\cxsun\\apps\\server\\src\\modules\\auth\\application\\auth.service.ts:38:19)\n    at process.processTicksAndRejections (node:internal/process/task_queues:104:5)"},"msg":"JWT_SECRET environment variable is required"}
[server] {"level":30,"time":1778909657260,"pid":22056,"hostname":"SUNDAR","reqId":"req-f","res":{"statusCode":500},"responseTime":49.50859999936074,"msg":"request completed"}
```

## Current Prompt

```
make it for all modules
```

## Current Prompt

```
on tenant 

react-dom-client.development.js:28004 Download the React DevTools for a better development experience: https://react.dev/link/react-devtools
chext_driver.js:539 Initialized driver at: Sat May 16 2026 15:20:57 GMT+0530 (India Standard Time)
chext_loader.js:73 Initialized chextloader at: 1778925057928
:6001/api/v1/companies:1  Failed to load resource: the server responded with a status of 403 (Forbidden)
:6001/api/v1/companies:1  Failed to load resource: the server responded with a status of 403 (Forbidden)
:6001/api/v1/companies:1  Failed to load resource: the server responded with a status of 403 (Forbidden)
:6001/api/v1/companies:1  Failed to load resource: the server responded with a status of 403 (Forbidden)
```

## Current Prompt

```
fix all api for super admin , admin , user not to fail
```

## Current Prompt

```
make all common modules single input full width not side by side input all in one column and space even and space between label and input and organise neat and remove
`Public uuid is generated as an 8 digit unique value.` keep only concious text as live original software to client, dont write anoymous helper text make it relavent to all commons
[image attached]
```

## Current Prompt

```
13187598 make uuid alphanumeric generic to all make helper and wire it to dispatch uuid when called as global function or at helper folder
```

## Current Prompt

```
hide uuid and id on list and make frontend serial to all common not with backend serial and uuid
```

## Current Prompt

```
it will confuses some where so remove code field in all common modules and keep only name

except 

country , state
```

## Current Prompt

```
i am not under stand nameOnly why

import type { MasterDataColumnDefinition, MasterDataModuleDefinition } from '../../../../../foundation/master-record/domain/value-objects/master-data-definition.js'

const nameOnly: MasterDataColumnDefinition[] = [
  { key: 'name', label: 'Name', type: 'string', required: true, nullable: false },
]

export const addressTypesCommonDefinition: MasterDataModuleDefinition = {
  key: 'addressTypes',
  label: 'Address Types',
  kind: 'common',
  tableName: 'common_address_types',
  idPrefix: 'address-type',
  group: 'contacts',
  defaultSortKey: 'name',
  columns: nameOnly,
}

which is best aproach

refactor it I recommend changing all nameOnly definitions to direct columns: [...] and

solve not to complex code structure organise it to simple and fast to understand and not rounding around functions and files for small transactions so make stright approach on all module that is accepted in global standard

and also make dedicated modular codebase to identify and rework easier not to mix with shared and common if we want to fix one model all modules wil affect this should not happened in our code base
```

## Current Prompt

```
and also consolidate folder inside modules not too much blob and filename with native nature naming within modules and also make this for long term development and easy to add field or remove fields where ever in situatuions
```

## Current Prompt

```
read assist readme.md and check for common modules at present we have modified 
```

## Current Prompt

```
in common / states at pop up upsert make country as autocomplete lookupbox with country name for reference look at temp/ master autocomplete lookup
```

## Current Prompt

```
make dropdown to top and fixed height not to hide inside and make one more thing make each modules separately as modular monolithic to rework or scale later not in single common data
```

## Current Prompt

```
make this control country auto complete as individual component with create new record feature and can re use across on all application
```

## Current Prompt

```
make districts connect with states and cities connect with districts  and pincode connect with cities 

make all with same pattern auto complete lookup
```

## Current Prompt

```
you have build only country make all component individual  for reusability for all, make each in new files

district , states, cities
```

## Current Prompt

```
make seeder for all common with relavent data and refresh database so we  can check
```

## Current Prompt

```
read assist -> readme and continue to work
```

## Current Prompt

```
reset tenant databases and refresh with seeder
```

## Current Prompt

```
make hsncodes with code and describtions  separately in table and backend and frontend  add 8 digit codes for seeder mainly knitted dyed fabrics , hosier fabrics , cotton tshirts , trousers , womens, and garment aided
```

## Current Prompt

```
same for taxes number as name and descriptions field so we can get tax calculation field easy make this as float or decimal
```

## Current Prompt

```
now fix contact , company ,product masters with common with autocomplete where ever it needed 
```

## Current Prompt

```
in contact
react-dom_client.js?v=fed149fd:14337 Download the React DevTools for a better development experience: https://react.dev/link/react-devtools
chext_driver.js:539 Initialized driver at: Thu May 21 2026 21:47:22 GMT+0530 (India Standard Time)
chext_loader.js:73 Initialized chextloader at: 1779380243044
contact-page.tsx:183 Uncaught TypeError: Cannot read properties of undefined (reading 'length')
    at ContactShowPage (contact-page.tsx:183:1044)
...
```

## Current Prompt

```
search pincode make only number 141001 Ludhiana as 141001
```

## Current Prompt

```
now fix company addresses with selected address and when india selected only show states in india and when tamilnadu selected show districts in tamilnadu and when district selected show cities belong to district and same for pincode 

make this line up for all location refered like contact and companies at present and also make show in show page not id
```

## Current Prompt

```
make contact form in same tone of company list + show + upsert with same ux
```

## Current Prompt

```
make address and finance bank accounts to two coloumns
```

## Current Prompt

```
make company upsert form same tone for animated tab like in contact upsert 

on top slim as same in contact form and also make product in this same tone
```

## Current Prompt

```
remove inner card from company make it as same as contact upsert
```

## Current Prompt

```
remove extra  inner card wrappers from address on company
```

## Current Prompt

```
now copy same from temp for sales + show + upsert + print files and wire it exact
```

## Current Prompt

```
read assist/readme and rules and copy all the settings and sales setting from temp to our application and wire it
```

## Current Prompt

```
make rule all module page is to routed as its own feature and standalone page
```
