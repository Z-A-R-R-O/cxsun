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
ok fine now read assist readme and create log on changelog to next version bump
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

## Current Prompt

```
add side menu in setting group and refactor accounting year  fields name , start date , end date
```

## Current Prompt

```
add script to db:refresh to tenant=aaran
```

## Current Prompt

```
make accounting year seeder proper from 1-4-20.. to 31-3-20.. respective for all
```

## Current Prompt

```
make start date as 1-apr and ending as 31-march and upsert is not picking date
```

## Current Prompt

```
add accounting year  starts from  2017 and add new tag for current year field
```

## Current Prompt

```
add default company table and wire company id and accounting year id  as first row for loading at startup and change side menu top company switch with accounting year on default 
```

## Current Prompt

```
add side menu in application for default company
```

## Current Prompt

```
add edit option to switch default company make this with shad cn select
```

## Current Prompt

```
still accounting year is making mistake 

Accounting Year
FY 2026-27

31 Mar 2026 to 30 Mar 2027

accounting year starts 1 apr to 31 march fix all seeder and any related
```

## Current Prompt

```
no hard coded for accounting year and company only get from database
```

## Current Prompt

```
when default company switch change or update primary also
```

## Current Prompt

```
in company upsert make industry to same width of before and shad cn theme
```

## Current Prompt

```
in sales make invoice no as auto next number and can also manual over ride and can use prefix and no prefix or suffix also make doucment settings to handle this and make each prefix and separator switches to on /off
```

## Current Prompt

```
make all card to tighten and responsive to on row
```

## Current Prompt

```
in sales get order no from master order
```

## Current Prompt

```
in sales make customer name as auto complete lookup with create option with pop up and create contact with nessary fields for invoice make pop up with animation tab with details | address | tax details and also check duplicate gstin is entering
```

## Current Prompt

```
fix popup ux merge
```

## Current Prompt

```
in popup make in details make customer name as first and code as second and in address add country , state, district, city , pincode and move gst to details page and remove tax details 
```

## Current Prompt

```
remove pan  from details and make country , states , districts , city , pincode connect with existing auto complete lookup and can create inline
```

## Current Prompt

```
in popup autocomplete is hiding on back of popup make it come to front
```

## Current Prompt

```
in sales customer name show only customer name in input after select
```

## Current Prompt

```
alos in auto complete drop down also
```

## Current Prompt

```
same for order no and product , remove hsn code and unit add colour and size , po and dc and description as text and colour and size as autocomplete with simple inline create funtions
```

## Current Prompt

```
read assist readme and create changelog
```

## Current Prompt

```
pump to new version
```

## Current Prompt

```
in sales make sales type label to sales tax type and make select to full width and make same height of other controls
```

## Current Prompt

```
change this to auto complete lookup box it feels same tone on customer name
```

## Current Prompt

```
make all inputs in single row it will swap against industry basic from sales settings

offset have po , dc , product , description , qty ,rate , amount
garment have product , description , colour , size , qty , rate , amount

so prepare this as per layout selected and make it responsive

after add item row move focus on first input
```

## Current Prompt

```
reduce gap between inputs and make product name more space 
```

## Current Prompt

```
make top label to center of input
```

## Current Prompt

```
still gap between inputs reduce or tighten this spaces
```

## Current Prompt

```
in this description don't get from product keep as simple text box for additional description and get gst percent from product and calculate gst as per sales type , make sales type default when invoice new created and add 
gst percent + cgst amount + sgst amount and switch Igst amount as per sales type and calculate total per row and display
```

## Current Prompt

```
remove amount input and reduce gap
```

## Current Prompt

```
make all label to center of input except product
```

## Current Prompt

```
in show table merge product - Description to particulars and if description has data add hypen else remove hypen separator add taxable amount after rate and reformat

make po , dc , qty , gst %  to text align center of cell
make rate, cgst , sgst , igst , total and taxable to text right align
```

## Current Prompt

```
add hsn code and units  get from product and add to show table
```

## Current Prompt

```
move units after rate
```

## Current Prompt

```
and make table to fit into page responsive 
```

## Current Prompt

```
make row in vertical center and tighten serial # , tighten hsn code , gst % tighten  and fix action space and make equal space on cell and between icons
```

## Current Prompt

```
in this address get address from contact with auto complete lookup and get billing and shipping address by default if no shipping get billing address to shipping if address not found as to create or when typed as create with small pop up with all 

address type , address 1 , address 2 , country default india , state , district , city and pincode with same quick create inline options and finalise and more concious 
```

## Current Prompt

```
in contact when edit contact type is not loading in edit and  check this error

react-dom_client.js?v=01145ea3:14337 Download the React DevTools for a better development experience: https://react.dev/link/react-devtools 
chext_driver.js:539 Initialized driver at: Fri May 22 2026 20:54:43 GMT+0530 (India Standard Time)
 Initialized chextloader at: 1779463483980
:6001/api/v1/contacts/upsert:1  Failed to load resource: the server responded with a status of 400 (Bad Request)
contact-client.ts:138 Uncaught (in promise) Error: Contact save failed with status 400.
    at upsertContact (contact-client.ts:138:27)
:6001/api/v1/contacts/upsert:1  Failed to load resource: the server responded with a status of 400 (Bad Request)
contact-client.ts:138 Uncaught (in promise) Error: Contact save failed with status 400.
    at upsertContact (contact-client.ts:138:27)
:6001/api/v1/contacts/upsert:1  Failed to load resource: the server responded with a status of 400 (Bad Request)
contact-client.ts:138 Uncaught (in promise) Error: Contact save failed with status 400.
    at upsertContact (contact-client.ts:138:27)
:6001/api/v1/contacts/upsert:1  Failed to load resource: the server responded with a status of 400 (Bad Request)
contact-client.ts:138 Uncaught (in promise) Error: Contact save failed with status 400.
    at upsertContact (contact-client.ts:138:27)
:6001/api/v1/contacts/upsert:1  Failed to load resource: the server responded with a status of 400 (Bad Request)
contact-client.ts:138 Uncaught (in promise) Error: Contact save failed with status 400.
    at upsertContact (contact-client.ts:138:27)
:6001/api/v1/contacts/upsert:1  Failed to load resource: the server responded with a status of 400 (Bad Request)
contact-client.ts:138 Uncaught (in promise) Error: Contact save failed with status 400.
    at upsertContact (contact-client.ts:138:27)
```

## Current Prompt

```
address is not saving check all files from frontend to backend is persists properly
```

## Current Prompt

```
if address type is not select make first record as default make the same for all foriegn ids
```

## Current Prompt

```
in contact communication tab is not persists mail id and phone is not showing on show page and edit
```

## Current Prompt

```
check all company , contact , product and all related tables frontend and backend are persist with proper chanel and tenant database check e2e and finalise with report
```

## Current Prompt

```
fix all  persistence issues and make smooth to next
```

## Current Prompt

```
check for any hard coded persitence is present for tenant datas leave user as its and remaining should come from database
```

## Current Prompt

```
in contact communication change email type and phone type to enum and select options from frontend , make it with shadcn theme component and change primary check to switch
```

## Current Prompt

```
in contact remove tax details tab extra GST Details card
```

in contact remove tax details tab extra GST Details card

tighten switch button card height for all in contact

in communication select is not wiring properly under input make this align proper and same height and corner to md as same as input box fix this

make switch to same height of input

fix swicth card in communication Primary email and Primary phone in same vertical center row

align verticall middle for tds and tcs avilable

in communication email type fix height of select input to standard and leave small padding inside drop down

in Social Links
align vertical center and make platform as enum as before

make round corner radius of select match to input for all

in show page arrange address , emails , phone ,bank .socials to table format as before with lable and data

add timestamp at bottom like product for contact

in sales billing address and shipping address auto complete is showing ids for common fix this

in sales changes e-invoice add status banner and add generate button to post and generate e invoice we do later just show message pop up sending and hide with success message at present and add Ack no, Signed QR separately

do the same for eway

in eway get transport id , name , part b or a , vechile no as input  and show the same in envoice generate

refactor common transports to align with this and connect with sales eway remove transport id and keep only transport with auto complete lookup with create option 

change common transports fields add transport gst , address ,

once again fields

name
gst
vechile no
address
contact no
contact person

in sales if no transport or heypen then get vechile no only as part b if transport details is present make as part a

make this e way compatiable to our gst compliances

remove eway details in einvoice tab

make status in terms tab to match with contact email type select tone

remove paid from invoice and add round off with automatic round off with manual override option

align right the same for round off

wire sales settings po , dc , colour , size toggle to sales 

fix sales items input area to fit the screen responsive when add or remove po, dc , colour , size

industry specfic

po and dc comes for offset
colour and size for garment

fit this

change round off to normal input text and parse input

change show page as per this 

logo , irn details , billing and ship to address
same size and font match

item tables switch according to industry and double border on header like same tone 

refer temp / billing / sales / show page 

make these below irn

Ack No.:
-
Ack Date:
-
E-Way Bill No.:
-
Date:
-

eway and einvoice data is not persisting when manually typing

make Ack No.:
152625564080914
Ack Date:
16 May 2026

in same row and 

E-Way Bill No.:
152625564080914
Date:
16 May 2026

in same row

buyer block

Buyer (Bill to)
M/s. VAANARAYA INTERNATIONAL
83 R4/118 CHEYUR ROAD ST-1-VALLUVAR STREET
AVINASHI - 641602,  
GSTIN/UIN : 
State Name :                                  State Code :


in 
first line contact name with m/s
second address line 1 + 2
city , district , pincode
gst
state name and state code as same as mentioned

add move space for Ack No.: and E-Way Bill No.:

## Current Prompt

```
read assist/readme and check for work and wait
```

## Current Prompt

```
ok we work on sales 

create changelog with next number for uncommit and then we start
```

## Current Prompt

```
get gstin and state code from contact , state
```

## Current Prompt

```
fix company address and mail id + phone no and gstin no on company header
```

## Current Prompt

```
check company is not persisting address and others in same tone of contact 

communication tab email and phone type to enum
address  and active and check box switches all match to contact
```

## Current Prompt

```
remove active on email and phone
```

## Current Prompt

```
change industry same tone on select from contact and make tenant and industry in same row
```

## Current Prompt

```
swap first company name second legal name third company code and space 
and then tenant and industry 
tagline
```

## Current Prompt

```
in communicatin slim 
Company Emails
Operational and communication email addresses.

helper text remove unwanted and compact 
```

## Current Prompt

```
make all in this card in single row for contact and company make remove only icon remove tailing email , phone in primary switch
```

## Current Prompt

```
make row vertical center
```

## Current Prompt

```
trash icon to center of inputs
```

## Current Prompt

```
fix id to name for address in sales show page company header 

make it as 
company name
address 1 + address 2 in second line
city , district , state , country - pincode  at 3rd
email + phone on 4th
gstin + msme on 5th little bigger
```

## Current Prompt

```
fix buyer and ship to mismatch 

state name is getting address and gstin and state code is missing

1. contact name 
2. address 1 + address 2
3. city ,district , pincode
4. gstin 
5. state name , state code

all from contact and relavant commons
```

## Current Prompt

```
mention district with tailing as -Dist on company header and contacts
```

## Current Prompt

```
add little height for item header and change product/description to Particulars add gst percentage as % and hsn 

sl no , particulars , hsn , colour , size , qty, taxable , cgst , sgst  remove total column
```

## Current Prompt

```
read assist/ readme and create log
```

## Current Prompt

```
before code make assist/execution write planning.md and task.md with proper and do one by one
```

## Current Prompt

```
read assist/readme and fix this 

fix this

3.2 Resolved: dashboard route chunks are lazy-loaded

`dashboard-view` previously bundled the heavy billing pages and built at about `884 kB`. Route-level lazy imports now split feature pages into separate chunks, and the dashboard route chunk builds at about `94 kB`.

Completed:

- Lazy-loaded feature pages by dashboard route.
- Code-split sales, purchase, reports, media, settings, company, contact, product, and supporting admin pages.
- Added a dashboard route loading fallback.
```

## Current Prompt

```
ok now create new stock folder inside modules as base folder for stock and wire it

and create  stock/inward/Purchase receipt modules that duplicate Purchase invoices with list + show + upsert

copy the same exact to purchase receipt afterwards we can refactor copy complete and wire it with frontend and backend exact with modular + ddd+ event inside sub folder of stock
```

## Current Prompt

```
read assist/ readme and create log
```

## Current Prompt

```
read assist/readme and find what we worked last and fix in stock ledger when hit print is open double pop ups 
when print is canceled this pop ups shows continues
```

## Current Prompt

```
make barcode print designer as standalone to generate barcodes to print and wire it to print
```

## Current Prompt

```
rework on verify tab with common input at top to accept barcode scan and verify random and remove print select and multi select add the same back and next button at bottom
```

## Current Prompt

```
in generate tab add multi select drop option also and check before drop it should not verified
```

## Current Prompt

```
make this whole process as upsert page and create list of stock ledger with default entry no , date and created details for future verification like sales model 
```

## Current Prompt

```
create  taskmanager app inside as modular with full set standalone for office automation


subject to get performance of staff , work , and activites and can assign at any modules to task

1. ask staff to verify all invoice with gst portal
2. verify all entries and send to auditor and follow
```

## Current Prompt

```
make this task as list + show + upsert form

in this task has multiple actions and upsert forms so plan as to this

in list when hit new task show pop up and create task with 

title , subject , priority and status to auto as new and assign to to user  with their tenant user first prepare this 
```

## Current Prompt

```
ok fine we move master database from sqlite to mariadb right from now so set for this add .env variables for master database and work with it and switch all database query to master in mariadb
```

## Current Prompt

```
remove un used db variable from .env and recheck
```

## Current Prompt

```
can we use these variable instead of master 

DB_HOST, DB_PORT, DB_NAME, DB_USER, and DB_PASSWORD
```

## Current Prompt

```
remove these variables and fix 

TENANT_DB_POOL_MIN=2
TENANT_DB_POOL_MAX=10
MARIADB_HOST=localhost
MARIADB_PORT=3306
MARIADB_USER=root
MARIADB_ROOT_PASSWORD=Computer.1

make pool inside code and keep it to max safe side
```

## Current Prompt

```
i have removed all unwanted check any variable assiociated is missing
```

## Current Prompt

```
instead of using .env every where create a dedicated holder file to read .env and collect data and sanitize and server across app as global variable make this inside framework/config/setting and dbconfig like folder and files
```

## Current Prompt

```
ok fine set preflight cli to check database connection and table if no table ask permission to create database with  custom name option and setup base migrations first with first client as Demo-app with demo_db and domain at present as localhost
```

## Current Prompt

```
update version and create log in changelog
```

## Current Prompt

```
remove demo db setup and  create new app setup in  /sa/setup with step by step app setting with configration  and wire it to super admin dashboard
```

## Current Prompt

```
read assist readme and find for setup is super admin

and fix enable to type database name to enter with underscore as abc_db
```

## Current Prompt

```
and also add input for password for admin user
```

## Current Prompt

```
> concurrently -k -n server,web "npm -w apps/server run dev" "npm -w apps/frontend run dev"

[server] 
[server] > @cxsun/server@1.0.27 dev
[server] > node ../../apps/cli/preflight.mjs server
[server] 
[web] 
[web] > @cxsun/frontend@1.0.27 dev
[web] > node ../../apps/cli/preflight.mjs frontend
[web] 
[server]   ok Master database ready: cxsun_master (13 tables)
[web] 
[web]   VITE v8.0.12  ready in 497 ms
[web] 
[web]   ->  Local:   http://localhost:6010/
[web]   ->  Network: http://192.168.1.6:6010/
[web]   ->  Network: http://172.29.112.1:6010/
[server] 
[server] E:\Workspace\cxsun\node_modules\fastify\lib\route.js:370
[server]             throw new FST_ERR_DUPLICATED_ROUTE(opts.method, opts.url)
[server]                   ^
[server] FastifyError: Method 'GET' already declared for route '/api/v1/tenants'

move app setup in to framework as module structure
```

## Current Prompt

```
move this setup modules into framwork and finalise that it is in modular standalone setup no dependency of other modules
```

## Current Prompt

```
change app name and app slug to tenant name and tenant slug and add tenant code there
```

## Current Prompt

```
in database ask for complete database setup may in later database can out of box
```

## Current Prompt

```
add another  input for same server or other server as option if same server dont ask for crediantial if other server ask for credential , by default same server make copy of default setting from .env via settings
```

## Current Prompt

```
make database server as switch
```

## Current Prompt

```
move Database server lable out side of switch and keep switch with same alignment and size
```

## Current Prompt

```
react-dom_client.js?v=91f2f55e:14337 Download the React DevTools for a better development experience: https://react.dev/link/react-devtools
app-setup-page.tsx?t=1779641141037:262 Uncaught ReferenceError: ServerModeField is not defined
:6001/api/v1/setup/apps:1  Failed to load resource: the server responded with a status of 500 (Internal Server Error)
```

## Current Prompt

```
check for previous Domain localhost if found skip to create domain and do next step
```

## 2026-05-25 10:40 pm

User prompt:

read assist/readme and create log in change log with version update and then find 

in this any update in assist rules means do now , make not over thinking , make it clear vision

and create proper service and engine for domain resolution and find tenant specfied app and then switch to proper tenant for frontend static pages

now build multi tenant  static pages with single code base with all required infra, make all scafold pages 

## 2026-05-25 11:00 pm

User prompt:

create original live client scope tenant with industry specfic

AARAN ASSOCIATES => auditor office cum back office for this software who maintain and assist to clients
CODEXSUN => Shared domain Billing app at present , all clients use this domain for billing at present and also planed for sub domain based to client with nginx

like 
sriganapatthi.codexsun.com
sukraa.codexsun.com
cotton.codexsun.com

in this  each are different client

here is full list of my client base with company and industry

1. SUNDAR = > AARAN ASSOCIATE => auditor office
2. GANAPATHI PRINTING  = > SRI GANAPATHI PRINTING PRESS => offset Printing => needs simple billing software with accounts
3. COTTON KNITS  = >COTTON KNITS FASHION => offset Printing => needs simple billing software with accounts + einvoice + eway

4. SATHASIVAM has 2 companues

4a . SUKRAA GARMENTS => GARMENTS MANUFACTURER => needs Billing with Accounts + einvoice + eway
4b . Mathan Knitters=> GARMENTS MANUFACTURER => needs Billing with Accounts + einvoice + eway

5. Poly made india =>  fabric trader => needs Billing with Accounts + einvoice + eway

6. Amal Tex=>  GARMENTS MANUFACTURER => needs Billing with Accounts + einvoice + eway



7. KGS PRINTING= > offset Printing => needs simple billing software with accounts
8. THIRUMURUGAN PRINTERS= > offset Printing => needs simple billing software with accounts
9. SMS UPVC= > UPVC=> needs simple billing software with accounts + eway

10. TIRUPUR DIRECT => ecommerce -> garments sales tirupur based
11. Deal o Deal => ecommerce -> computer seconds store
12. TENKASI SPORTS => sports club -> want to manage students and masters
13. ALTEXLABS => garment testing labs => wanted testing reports 
14. AARAN BUSSINESS CONNECT => connecting business peoples like india mart

this still expands at first we finish these and work on next

so plan for these and work 

for local dev add host file with localhost domain setup and also create helper to do this in windows 
for production we can move with sub domain or client owned domains

## 2026-06-03

User prompt:

```
ok fine now we work with application, find any mail module assembled or if not prepare clean mail service manager to organise and send mail with attachment with queue management create a mail with common of super-admin features and tenant aware mail support with tenant mail dynamic  and mailing pages inside new mail app like module and wire it on breadcrumb top menu with also prepare mail setting for each tenant in side menu at mail desk
```

User prompt:

```
read assist/readme and create log
```

## 2026-06-04

User prompt:

```
ok we first work on gst compliances connect with eway and einvoice with gsp provider like mastergst so set tables and required backend for this with Enabled e-Invoice API Methods and You can test here
Use Base URL as: https://api.mastergst.com

https://app.mastergst.com/
```

## 2026-06-04

User prompt:

```
read assist/readme and find cash book and fix this in show + print

in this change title cash book to cash voucher and bank voucher and reduce top gap between company name and border and expand voucher no : in one row and move ledger , particulars to Narration in order

Ledger : 
<particulars>
and <Narration>
```

User prompt:

```
make this in separate module for future scale if this gsp provider is not ok we can switch to another with small changes not to refactor our whole app so create as module 

as ../gst/gsp/mastergst for their related and core of gst in seperate /gst/gst-compliance/** like so and connect all of this with sales already have options for eway and einvoice
```

User prompt:

```
mastergst has changed to whitebooks so change it as per and resources to connect with whitebooks

Client ID, Client Secret ID, User Name, Password for sandbox and production; GSTIN provided in prompt.
```

User prompt:

```
move all credential to .env and connect from there write in .env and .env.sample
```

User prompt:

```
in env split sandbox and production separately
```

User prompt:

```
ok fine create frontend to check with sandbox for all api
```

User prompt:

```
add to sidemenu
```

User prompt:

```
check from first when send request in this format

curl -X GET "https://apisandbox.whitebooks.in/einvoice/authenticate?email=aaranoffice%40gmail.com" ...

get AuthToken and TokenExpiry and save for session and then ...
```

User prompt:

```
in sales print rate column is missing in print make this in print
```
change WHITEBOOKS_SANDBOX_ to GSP_SANDBOX_ and WHITEBOOKS_PRODUCTION_ to GSP_ and refactor all and test remove variables from .env it in not in use and make GSP_SANBOX AND GSP SETTING get from database through super-admin and get user name and password from tenant side GST_API

and in tenant make switch for production and sandbox on settings and switch accordingly
in this super admin desk make tab for all as 

sandbox and production

in sandbox two sections

one for einvoice and another for eway as two card same for production in this it is only collecting credential and serve credential to tenant eway and einvoice in tenant there is separate gst user and pass for api

when tenant send for einvoice it collect credential from master and merge user and pass from loged in tenant and send 

in tenant only have switch to generate sandbox and production

this is i asked
## 2026-06-06 - Assist documentation sync

read assist/readme and update assists rules and files according to this application updates , scan through application and update properly not overthinking

write log on change log

## 2026-06-06 - Sales print logo positioning

in sales setting add positioning for logo left and top as input

## 2026-06-06 - Changelog and version update

create log in changelog with version update

## 2026-06-06 - Sales print particulars attributes

add colour and size to particulars in print and save space if colour and size present add this as 

ITEM NAME + DESCRIPTION +
- Colour : Red - Size : XL

in single particulars

## 2026-06-06 - Expand Sales print particulars

in second line colour is hiding inside ... expand and complete this to end of cell

## 2026-06-06 - Sales print description clamp

make  two-line clamp  for description not to exceed width , keep item name full , description line clamp and other full

## 2026-06-06 - Continuous Sales print particulars

make this in continue text item name + desc + colour + size continue growing

## 2026-06-06 - Hide placeholder Sales print attributes

if record has id 1 or hypen - in colour and size leave empty do not add Colour : - or Size : -

## 2026-06-06 - Hide empty Sales print compliance block

in irn is auto creating or showing UUID of sales remove this and make this hide when there is no irn , ack or eway

## 2026-06-06 - Changelog update

create log in changelog

## 2026-06-06 - Auditor app and client module

create new app module for auditor and wire it in breadcrumb and make new side menu desk for Auditor

it is for auditor office to manage their clients details so prepare workspace and wire it and create first module in this as client

client have details of

id
name
group
is active

make this as full backend and frontend as like before with list + show +upsert pages like contact

## 2026-06-06 - Auditor client additional details

add sub items for additional details as client details as look in image

top client details with master auto complete lookup to quick select , and left is contact details and right is address area

and new card with crediential for all gst, e-invoice, e-way, API, and e-mail account user/password details

## 2026-06-06 - Auditor client animated tab groups

in client make each in animated tab groups

## 2026-06-06 - Auditor client location master lookups

make city state pincode as same as in contact master auto complete lookup

## 2026-06-06 - Inline credential editing and version update

make show page with inline edit option for credentials for each items separately edit on spot and save and create log in chagelog with version update

## 2026-06-06 - Show credential passwords

don't hide passwords show it

## 2026-06-06 - Credential clipboard copy fix

read previous and fix copy is now working for clipboard in credentials

## 2026-06-06 - Auditor GST Filing module

extend with new modules for gst filing in auditor app with similar in image

upsert as pop up dialog and list with top selecting on month and year as master autocomplete and list with status

## 2026-06-06 - Auditor contact-based credentials and GST filing

in this major update remove client and connect contact with this , add previous we build contact to side menu with contact page untouched and add extra credential to it as additional exact same and add gst filing details for individual contact for each month as like report and upsert as for individual

and and in GST Filing it is for all contact in one place can edit and update this make this possible as two way entering one from contact gst filing another is on single page for all client for a particular month

keep in mind do not disturb old contact only creating new table and extending for Credential and attach it separately
