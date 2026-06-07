import {
  ArrowRight,
  BookOpen,
  Boxes,
  BriefcaseBusiness,
  Building2,
  FileText,
  GraduationCap,
  Handshake,
  Home,
  LayoutDashboard,
  LifeBuoy,
  LogIn,
  LogOut,
  Mail,
  MapPin,
  Menu,
  Newspaper,
  Phone,
  ReceiptText,
  Rocket,
  ShieldCheck,
  Store,
  Users,
  X,
} from 'lucide-react'
import { useState, type ComponentType } from 'react'
import { toast } from 'sonner'
import { apiBaseUrl } from 'src/lib/api-base-url'

import { BrandLogo } from 'src/components/blocks/branding/brand-logo'
import { ThemeToggle } from 'src/components/blocks/theme/theme-toggle'
import { Button } from 'src/components/ui/button'
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from 'src/components/ui/navigation-menu'
import { cn } from 'src/lib/utils'
import { APP_NAME } from 'src/lib/branding'
import { isSiteDeveloperMode } from './developer/developer-mode'
import { SiteSection } from './developer/site-section'
import { HomePage } from './home/home'
import { PublicAboutPage } from './about/about-page'
import { PublicContactPage } from './contact/public-contact-page'
import { PublicBlogPage } from './blog/public-blog-page'
import type { HealthStatus, SiteContent, TenantStaticSiteContent } from './domain/site-content'

interface PublicSitePageProps {
  activePage: string
  content: SiteContent
  health: HealthStatus | null
  menuOpen: boolean
  isAuthenticated: boolean
  tenantSite: TenantStaticSiteContent | null
  version: string
  onNavigate(page: string): void
  onOpenDashboard(): void
  onOpenLogin(): void
  onLogout(): void
  onToggleMenu(): void
}

export function PublicSitePage({
  activePage,
  content,
  isAuthenticated,
  menuOpen,
  tenantSite,
  version,
  onNavigate,
  onOpenDashboard,
  onOpenLogin,
  onLogout,
  onToggleMenu,
}: PublicSitePageProps) {
  const developerMode = isSiteDeveloperMode()
  const orderedPages = orderHeaderPages(content.pages)
  const visiblePageSlugs = new Set(orderedPages.map((page) => page.slug))
  const canNavigate = (page: string) => visiblePageSlugs.has(page)
  const navigateIfAvailable = (page: string) => {
    onNavigate(resolveAvailablePage(page, canNavigate))
  }

  return (
    <div className="cx-public-site min-h-screen overflow-x-clip bg-background text-foreground">
      <SiteSection
        as="header"
        className="sticky top-0 z-20 border-b bg-card/92 backdrop-blur"
        developerMode={developerMode}
        name="header"
      >
        <div className="flex h-16 w-full items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <button className="flex items-center gap-3 text-left" onClick={() => onNavigate('home')} type="button">
            <BrandLogo className="size-9" />
            <span>
              <strong className="block leading-tight">{tenantSite?.tenant?.name ?? APP_NAME}</strong>
              <small className="text-muted-foreground">Business software suite</small>
            </span>
          </button>

          <NavigationMenu className="hidden flex-1 justify-center lg:flex" viewport={false}>
            <NavigationMenuList className="gap-1">
              <NavigationMenuItem>
                <NavigationMenuLink asChild>
                  <button
                    className={cn(
                      topMenuLinkClass,
                      activePage === 'home' && 'bg-muted text-foreground',
                    )}
                    onClick={() => onNavigate('home')}
                    type="button"
                  >
                    <Home className="size-4" />
                    Home
                  </button>
                </NavigationMenuLink>
              </NavigationMenuItem>

              <NavigationMenuItem>
                <NavigationMenuTrigger className={topMenuTriggerClass}>Products</NavigationMenuTrigger>
                <NavigationMenuContent className={expandedMenuPanelClass}>
                  <div className="grid gap-0 bg-white lg:grid-cols-[280px_1fr]">
                    <div className="border-b bg-slate-50/80 p-6 lg:border-b-0 lg:border-r lg:p-7">
                      <p className="text-xs font-black uppercase tracking-[0.16em] text-sky-700">Product suite</p>
                      <p className="mt-4 text-sm leading-7 text-slate-600">
                        Connected tools for the public website, billing desk, storefront, and daily control.
                      </p>
                      <button
                        className="mt-7 inline-flex items-center gap-2 rounded-md bg-slate-950 px-4 py-3 text-sm font-black uppercase tracking-wide text-white transition hover:bg-slate-800"
                        onClick={() => navigateIfAvailable('services')}
                        type="button"
                      >
                        Explore all products
                        <ArrowRight className="size-4" />
                      </button>
                    </div>
                    <div className="grid gap-4 p-6 sm:grid-cols-2 xl:grid-cols-3">
                      <MegaMenuCard
                        description="Launch branded pages, sections, and lead capture without scattered handoff."
                        icon={Building2}
                        onClick={() => navigateIfAvailable('services')}
                        title="Website builder"
                      />
                      <MegaMenuCard
                        description="Keep receipts, GST data, invoices, and accountant review in one place."
                        icon={ReceiptText}
                        onClick={() => navigateIfAvailable('billing')}
                        title="Billing workspace"
                      />
                      <MegaMenuCard
                        description="Showcase products, collect interest, and prepare your online selling flow."
                        icon={Store}
                        onClick={() => navigateIfAvailable('shop')}
                        title="Storefront tools"
                      />
                      <MegaMenuCard
                        description="Track clients, apps, solved work, and operating status from one cockpit."
                        icon={Boxes}
                        onClick={() => navigateIfAvailable('services')}
                        title="Operations cockpit"
                      />
                      <MegaMenuCard
                        description="Turn visitor questions into routed enquiries and support follow-up."
                        icon={LifeBuoy}
                        onClick={() => navigateIfAvailable('contact')}
                        title="Support desk"
                      />
                      <MegaMenuCard
                        description="Prepare data for daily checks, reviews, and business-ready reporting."
                        icon={ShieldCheck}
                        onClick={() => navigateIfAvailable('billing')}
                        title="Review controls"
                      />
                    </div>
                  </div>
                </NavigationMenuContent>
              </NavigationMenuItem>

              <NavigationMenuItem>
                <NavigationMenuLink asChild>
                  <button className={topMenuLinkClass} onClick={() => navigateIfAvailable('services')} type="button">
                    Enterprise
                  </button>
                </NavigationMenuLink>
              </NavigationMenuItem>

              <NavigationMenuItem>
                <NavigationMenuTrigger className={topMenuTriggerClass}>Customers</NavigationMenuTrigger>
                <NavigationMenuContent className={expandedMenuPanelClass}>
                  <div className="grid gap-6 bg-white p-6 lg:grid-cols-[260px_1fr] lg:p-7">
                    <MenuPanelIntro
                      eyebrow="Customers"
                      summary="Stories, setup paths, and rollout help for teams using Codexsun every day."
                      title="Practical adoption for growing teams"
                    />
                    <div className="grid gap-3 sm:grid-cols-2">
                      <SimpleMenuButton icon={Users} label="Customer stories" onClick={() => navigateIfAvailable('about')} />
                      <SimpleMenuButton icon={BriefcaseBusiness} label="Business templates" onClick={() => navigateIfAvailable('billing')} />
                      <SimpleMenuButton icon={GraduationCap} label="Training and rollout" onClick={() => navigateIfAvailable('services')} />
                      <SimpleMenuButton icon={ShieldCheck} label="Support and success" onClick={() => navigateIfAvailable('contact')} />
                    </div>
                  </div>
                </NavigationMenuContent>
              </NavigationMenuItem>

              <NavigationMenuItem>
                <NavigationMenuTrigger className={topMenuTriggerClass}>Partners</NavigationMenuTrigger>
                <NavigationMenuContent className={expandedMenuPanelClass}>
                  <div className="grid gap-8 bg-white p-7 lg:grid-cols-2">
                    <PartnerMenuCard
                      description="Work with Codexsun to shape a practical website and business software setup."
                      icon={Handshake}
                      onClick={() => navigateIfAvailable('contact')}
                      title="Find implementation help"
                      action="Work with a partner"
                    />
                    <PartnerMenuCard
                      className="border-t pt-7 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0"
                      description="Bring Codexsun into client projects that need billing, storefront, or workflow systems."
                      icon={Rocket}
                      onClick={() => navigateIfAvailable('contact')}
                      title="Grow with our platform"
                      action="Become a partner"
                    />
                  </div>
                </NavigationMenuContent>
              </NavigationMenuItem>

              <NavigationMenuItem>
                <NavigationMenuTrigger className={topMenuTriggerClass}>Resources</NavigationMenuTrigger>
                <NavigationMenuContent className={expandedMenuPanelClass}>
                  <div className="grid gap-6 bg-white p-6 lg:grid-cols-[260px_1fr] lg:p-7">
                    <MenuPanelIntro
                      eyebrow="Resources"
                      summary="Guides, articles, and support paths for making each business workflow clearer."
                      title="Learn, plan, and keep moving"
                    />
                    <div className="grid gap-3 sm:grid-cols-2">
                      <SimpleMenuButton icon={Newspaper} label="Blog and insights" onClick={() => navigateIfAvailable('blog')} />
                      <SimpleMenuButton icon={BookOpen} label="Product guides" onClick={() => navigateIfAvailable('services')} />
                      <SimpleMenuButton icon={FileText} label="Templates and checklists" onClick={() => navigateIfAvailable('billing')} />
                      <SimpleMenuButton icon={LifeBuoy} label="Contact support" onClick={() => navigateIfAvailable('contact')} />
                    </div>
                  </div>
                </NavigationMenuContent>
              </NavigationMenuItem>
            </NavigationMenuList>
          </NavigationMenu>

          <div className="flex items-center gap-2">
            {isAuthenticated ? (
              <>
                <button
                  className="hidden items-center gap-2 rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-800 transition hover:border-sky-200 hover:text-sky-700 lg:inline-flex"
                  onClick={onOpenDashboard}
                  type="button"
                >
                  <LayoutDashboard className="size-4" />
                  Dashboard
                </button>
                <button
                  className="hidden items-center gap-2 rounded-md bg-slate-950 px-4 py-2 text-sm font-black text-white transition hover:bg-slate-800 lg:inline-flex"
                  onClick={onLogout}
                  type="button"
                >
                  <LogOut className="size-4" />
                  Logout
                </button>
              </>
            ) : (
              <button
                className="hidden items-center gap-2 rounded-md bg-slate-950 px-4 py-2 text-sm font-black text-white transition hover:bg-slate-800 lg:inline-flex"
                onClick={onOpenLogin}
                type="button"
              >
                <LogIn className="size-4" />
                Login
              </button>
            )}
            <ThemeToggle />
            <Button
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              className="lg:hidden"
              onClick={onToggleMenu}
              size="icon"
              type="button"
              variant="outline"
            >
              {menuOpen ? <X size={18} /> : <Menu size={18} />}
            </Button>
          </div>
        </div>

        {menuOpen ? (
          <nav className="grid w-full gap-2 border-t bg-background/98 px-4 py-4 shadow-xl shadow-slate-950/8 sm:px-6 lg:hidden">
            <MobileMenuGroup
              items={[
                ['Home', 'home'],
                ['Enterprise', 'services'],
              ]}
              onNavigate={navigateIfAvailable}
            />
            <MobileMenuGroup
              title="Products"
              items={[
                ['Website builder', 'services'],
                ['Billing workspace', 'billing'],
                ['Storefront tools', 'shop'],
                ['Operations cockpit', 'services'],
              ]}
              onNavigate={navigateIfAvailable}
            />
            <MobileMenuGroup
              title="Customers"
              items={[
                ['Customer stories', 'about'],
                ['Business templates', 'billing'],
                ['Training and rollout', 'services'],
              ]}
              onNavigate={navigateIfAvailable}
            />
            <MobileMenuGroup
              title="Partners"
              items={[
                ['Work with a partner', 'contact'],
                ['Become a partner', 'contact'],
              ]}
              onNavigate={navigateIfAvailable}
            />
            <MobileMenuGroup
              title="Resources"
              items={[
                ['Blog and insights', 'blog'],
                ['Product guides', 'services'],
                ['Contact support', 'contact'],
              ]}
              onNavigate={navigateIfAvailable}
            />
            <div className="mt-2 grid gap-2 border-t pt-4">
              {isAuthenticated ? (
                <>
                  <button
                    className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-semibold text-muted-foreground transition hover:bg-muted hover:text-foreground"
                    onClick={onOpenDashboard}
                    type="button"
                  >
                    <LayoutDashboard className="size-4" />
                    Dashboard
                  </button>
                  <button
                    className="inline-flex items-center gap-2 rounded-md bg-slate-950 px-3 py-3 text-left text-sm font-black text-white transition hover:bg-slate-800"
                    onClick={onLogout}
                    type="button"
                  >
                    <LogOut className="size-4" />
                    Logout
                  </button>
                </>
              ) : (
                <button
                  className="inline-flex items-center gap-2 rounded-md bg-slate-950 px-3 py-3 text-left text-sm font-black text-white transition hover:bg-slate-800"
                  onClick={onOpenLogin}
                  type="button"
                >
                  <LogIn className="size-4" />
                  Login
                </button>
              )}
            </div>
          </nav>
        ) : null}
      </SiteSection>

      {activePage === 'home' && (
        <HomePage developerMode={developerMode} tenantSite={tenantSite} />
      )}
      {activePage === 'about' && (
        <PublicAboutPage content={content} tenantSite={tenantSite} />
      )}
      {activePage === 'contact' && (
        <PublicContactPage content={content} tenantSite={tenantSite} />
      )}
      {activePage === 'blog' && (
        <PublicBlogPage content={content} tenantSite={tenantSite} />
      )}
      {activePage !== 'home' && activePage !== 'about' && activePage !== 'contact' && activePage !== 'blog' && (
        <PublicSubPage activePage={activePage} content={content} tenantSite={tenantSite} />
      )}

      <SiteSection as="footer" className="border-t border-slate-800 bg-slate-950 px-4 py-0 text-white" developerMode={developerMode} name="footer">
        <div className="cx-container">
          <div className="grid gap-10 py-12 md:py-16 lg:grid-cols-[1.1fr_1.4fr]">
            <div>
              <button className="flex items-center gap-3 text-left" onClick={() => onNavigate('home')} type="button">
                <BrandLogo className="size-11" variant="dark" />
                <span>
                  <strong className="block text-xl leading-tight">{APP_NAME}</strong>
                  <small className="text-slate-300">Business software made simpler</small>
                </span>
              </button>
              <p className="mt-5 max-w-md text-sm leading-7 text-slate-300">
                Codexsun helps businesses publish a polished website, organize daily work, manage billing, and prepare a connected software foundation for growth.
              </p>
              <button className="mt-7 inline-flex items-center gap-2 rounded-md bg-sky-600 px-5 py-3 text-sm font-black uppercase tracking-wide text-white shadow-lg shadow-sky-600/15 transition hover:bg-sky-700" onClick={onOpenLogin} type="button">
                Start now
                <ArrowRight className="size-4" />
              </button>
            </div>

            <div className="grid gap-8 sm:grid-cols-3">
              <FooterColumn
                items={['Website pages', 'Billing workspace', 'Business dashboard', 'Storefront tools']}
                title="Products"
              />
              <FooterColumn
                items={['About Codexsun', 'Customer stories', 'Product roadmap', 'Careers']}
                title="Company"
              />
              <div>
                <p className="text-sm font-black uppercase tracking-[0.16em] text-slate-400">Contact</p>
                <div className="mt-4 space-y-3 text-sm leading-6 text-slate-300">
                  <p className="flex gap-3">
                    <Mail className="mt-0.5 size-4 shrink-0 text-sky-300" />
                    hello@codexsun.com
                  </p>
                  <p className="flex gap-3">
                    <Phone className="mt-0.5 size-4 shrink-0 text-sky-300" />
                    Support for growing teams
                  </p>
                  <p className="flex gap-3">
                    <MapPin className="mt-0.5 size-4 shrink-0 text-sky-300" />
                    Built for modern businesses
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col justify-between gap-4 border-t border-slate-800 py-5 text-xs text-slate-400 md:flex-row md:items-center">
            <p>(c) 2026 {APP_NAME}. All rights reserved.</p>
            <nav className="flex flex-wrap gap-4">
              {content.pages
                .filter((item) => item.slug !== 'home')
                .map((item) => (
                  <button
                    className="font-bold transition hover:text-white"
                    key={item.slug}
                    onClick={() => onNavigate(item.slug)}
                    type="button"
                  >
                    {item.nav_label}
                  </button>
              ))}
              <span>v{version}</span>
            </nav>
          </div>
        </div>
      </SiteSection>
    </div>
  )
}

function orderHeaderPages(pages: SiteContent['pages']) {
  const order = ['home', 'services', 'billing', 'shop', 'about', 'blog', 'contact']
  return pages.filter((page) => order.includes(page.slug)).sort((a, b) => {
    const left = order.includes(a.slug) ? order.indexOf(a.slug) : order.length
    const right = order.includes(b.slug) ? order.indexOf(b.slug) : order.length
    return left - right || a.nav_label.localeCompare(b.nav_label)
  })
}

function resolveAvailablePage(page: string, canNavigate: (page: string) => boolean) {
  if (canNavigate(page)) return page

  const fallbacks: Record<string, string[]> = {
    blog: ['about', 'contact', 'home'],
    services: ['billing', 'about', 'contact', 'home'],
    shop: ['billing', 'contact', 'home'],
  }

  return fallbacks[page]?.find(canNavigate) ?? 'home'
}

const topMenuTriggerClass =
  'rounded-md px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 hover:text-slate-950 data-open:bg-slate-100 data-open:text-sky-700'

const topMenuLinkClass =
  'inline-flex h-9 items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 hover:text-slate-950'

const expandedMenuPanelClass =
  'p-0 md:!fixed md:!left-1/2 md:!top-16 md:!w-[calc(100vw-2rem)] md:!max-w-6xl md:!-translate-x-1/2'

type MenuIcon = ComponentType<{ className?: string }>

function MenuPanelIntro({
  eyebrow,
  summary,
  title,
}: {
  eyebrow: string
  summary: string
  title: string
}) {
  return (
    <div className="rounded-md bg-slate-50 p-5">
      <p className="text-xs font-black uppercase tracking-[0.16em] text-sky-700">{eyebrow}</p>
      <strong className="mt-3 block text-xl font-black leading-snug text-slate-950">{title}</strong>
      <p className="mt-3 text-sm leading-7 text-slate-600">{summary}</p>
    </div>
  )
}

function MegaMenuCard({
  description,
  icon: Icon,
  onClick,
  title,
}: {
  description: string
  icon: MenuIcon
  onClick(): void
  title: string
}) {
  return (
    <NavigationMenuLink asChild>
      <button
        className="group grid min-h-40 gap-4 rounded-md border border-slate-200 bg-slate-50/80 p-5 text-left transition hover:border-sky-200 hover:bg-white hover:shadow-sm"
        onClick={onClick}
        type="button"
      >
        <span className="grid size-10 place-items-center rounded-md bg-white text-sky-700 shadow-sm ring-1 ring-slate-200 transition group-hover:bg-sky-50">
          <Icon className="size-5" />
        </span>
        <span>
          <strong className="block text-base font-black text-slate-950">{title}</strong>
          <span className="mt-1 block text-sm leading-6 text-slate-600">{description}</span>
        </span>
      </button>
    </NavigationMenuLink>
  )
}

function SimpleMenuButton({
  icon: Icon,
  label,
  onClick,
}: {
  icon: MenuIcon
  label: string
  onClick(): void
}) {
  return (
    <NavigationMenuLink asChild>
      <button
        className="flex min-h-20 w-full items-center gap-4 rounded-md border border-slate-200 bg-slate-50/80 px-4 py-4 text-left text-sm font-semibold text-slate-700 transition hover:border-sky-200 hover:bg-white hover:text-slate-950"
        onClick={onClick}
        type="button"
      >
        <span className="grid size-10 shrink-0 place-items-center rounded-md bg-white text-sky-700 shadow-sm ring-1 ring-slate-200">
          <Icon className="size-5" />
        </span>
        {label}
      </button>
    </NavigationMenuLink>
  )
}

function PartnerMenuCard({
  action,
  className,
  description,
  icon: Icon,
  onClick,
  title,
}: {
  action: string
  className?: string
  description: string
  icon: MenuIcon
  onClick(): void
  title: string
}) {
  return (
    <NavigationMenuLink asChild>
      <button className={cn('text-left', className)} onClick={onClick} type="button">
        <span className="grid size-12 place-items-center rounded-md bg-emerald-50 text-emerald-700">
          <Icon className="size-6" />
        </span>
        <strong className="mt-4 block text-base font-black text-slate-950">{title}</strong>
        <span className="mt-2 block max-w-[230px] text-sm leading-6 text-slate-600">{description}</span>
        <span className="mt-5 inline-flex items-center gap-2 text-sm font-black uppercase tracking-wide text-sky-700">
          {action}
          <ArrowRight className="size-4" />
        </span>
      </button>
    </NavigationMenuLink>
  )
}

function MobileMenuGroup({
  items,
  onNavigate,
  title,
}: {
  items: Array<[string, string]>
  onNavigate(page: string): void
  title?: string
}) {
  return (
    <div className={cn('grid gap-1', title && 'border-t pt-3')}>
      {title ? <p className="px-3 text-xs font-black uppercase tracking-[0.14em] text-slate-400">{title}</p> : null}
      {items.map(([label, page]) => (
        <button
          className="rounded-md px-3 py-2 text-left text-sm font-semibold text-muted-foreground transition hover:bg-muted hover:text-foreground"
          key={`${title ?? 'main'}-${label}`}
          onClick={() => onNavigate(page)}
          type="button"
        >
          {label}
        </button>
      ))}
    </div>
  )
}

function FooterColumn({ items, title }: { items: string[]; title: string }) {
  return (
    <div>
      <p className="text-sm font-black uppercase tracking-[0.16em] text-slate-400">{title}</p>
      <div className="mt-4 grid gap-3 text-sm font-semibold text-slate-200">
        {items.map((item) => (
          <span key={item}>{item}</span>
        ))}
      </div>
    </div>
  )
}

function PublicSubPage({
  activePage,
  content,
  tenantSite,
}: {
  activePage: string
  content: SiteContent
  tenantSite: TenantStaticSiteContent | null
}) {
  const page = content.pages.find((p) => p.slug === activePage)

  if (!page) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center px-4 py-20 text-center">
        <h1 className="text-4xl font-black text-slate-900">404 - Page Not Found</h1>
        <p className="mt-4 text-slate-600">The page you are looking for does not exist.</p>
      </div>
    )
  }

  return (
    <main className="min-h-[70vh]">
      {/* Hero Header */}
      <section className="relative overflow-hidden bg-[radial-gradient(circle_at_20%_20%,rgba(37,99,235,0.14),transparent_32%),linear-gradient(135deg,#0f172a,#111827_48%,#172554)] py-20 text-white md:py-28">
        <div className="cx-container relative z-10 max-w-4xl text-center">
          {page.eyebrow ? (
            <p className="text-sm font-black uppercase tracking-[0.18em] text-blue-200">
              {page.eyebrow}
            </p>
          ) : null}
          <h1 className="mt-4 text-4xl font-black leading-tight tracking-normal sm:text-5xl md:text-6xl">
            {page.title}
          </h1>
          {page.summary ? (
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-slate-200 md:text-xl">
              {page.summary}
            </p>
          ) : null}
        </div>
      </section>

      {/* Main Body Content */}
      <section className="bg-slate-50 py-16 text-slate-950 md:py-24">
        <div className="cx-container max-w-4xl">
          <div className="rounded-md border border-slate-200 bg-white p-8 shadow-sm md:p-12">
            <p className="text-lg leading-8 text-slate-700 whitespace-pre-line">
              {page.body}
            </p>

            {/* Custom Content based on slug */}
            {activePage === 'services' && content.services && content.services.length > 0 ? (
              <div className="mt-12 border-t border-slate-200 pt-12">
                <h2 className="text-2xl font-black text-slate-950">Included Modules & Solutions</h2>
                <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {content.services.map((service) => (
                    <article className="rounded-md border border-slate-200 bg-slate-50 p-5 shadow-sm" key={service.id}>
                      <h3 className="text-lg font-black text-slate-950">{service.title}</h3>
                      <p className="mt-2 text-sm leading-6 text-slate-600">{service.description}</p>
                    </article>
                  ))}
                </div>
              </div>
            ) : null}

            {activePage === 'blog' && content.posts && content.posts.length > 0 ? (
              <div className="mt-12 border-t border-slate-200 pt-12">
                <h2 className="text-2xl font-black text-slate-950">Latest Updates</h2>
                <div className="mt-6 grid gap-6 md:grid-cols-2">
                  {content.posts.map((post) => (
                    <article className="rounded-md border border-slate-200 bg-slate-50 p-6 shadow-sm" key={post.id}>
                      <span className="text-xs font-bold text-sky-700">{post.published_at}</span>
                      <h3 className="mt-2 text-xl font-black text-slate-950">{post.title}</h3>
                      <p className="mt-3 text-sm leading-6 text-slate-600">{post.excerpt}</p>
                      <button className="mt-4 inline-flex items-center gap-1 text-sm font-black text-sky-700 hover:text-sky-800" type="button">
                        Read more <ArrowRight className="size-4" />
                      </button>
                    </article>
                  ))}
                </div>
              </div>
            ) : null}

            {activePage === 'contact' ? (
              <div className="mt-12 border-t border-slate-200 pt-12">
                <h2 className="text-2xl font-black text-slate-950">Send us a message</h2>
                <p className="mt-2 text-sm text-slate-600">
                  Fill out the form below and our team will get back to you shortly.
                </p>
                <ContactForm domain={tenantSite?.tenant?.slug || ''} />
              </div>
            ) : null}
          </div>
        </div>
      </section>
    </main>
  )
}

function ContactForm({ domain }: { domain: string }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const trimName = name.trim()
    const trimEmail = email.trim()
    const trimMessage = message.trim()

    if (!trimName || !trimEmail || !trimMessage) {
      toast.error('All fields are required.')
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`${apiBaseUrl}/api/site/contact`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: trimName,
          email: trimEmail,
          message: trimMessage,
          domain,
        }),
      })

      const data = await response.json()
      if (response.ok && data.ok) {
        toast.success('Your message has been sent successfully!')
        setName('')
        setEmail('')
        setMessage('')
      } else {
        toast.error(data.error || 'Failed to send message.')
      }
    } catch (err) {
      toast.error('An error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form className="mt-6 grid gap-4" onSubmit={handleSubmit}>
      <div className="grid gap-2">
        <label className="text-sm font-bold text-slate-700" htmlFor="contact-name">Name</label>
        <input
          className="w-full rounded-md border border-slate-200 bg-slate-50 p-3 text-sm focus:border-sky-500 focus:bg-white focus:outline-none"
          id="contact-name"
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter your name"
          required
          type="text"
          value={name}
        />
      </div>
      <div className="grid gap-2">
        <label className="text-sm font-bold text-slate-700" htmlFor="contact-email">Email</label>
        <input
          className="w-full rounded-md border border-slate-200 bg-slate-50 p-3 text-sm focus:border-sky-500 focus:bg-white focus:outline-none"
          id="contact-email"
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter your email"
          required
          type="email"
          value={email}
        />
      </div>
      <div className="grid gap-2">
        <label className="text-sm font-bold text-slate-700" htmlFor="contact-message">Message</label>
        <textarea
          className="w-full rounded-md border border-slate-200 bg-slate-50 p-3 text-sm focus:border-sky-500 focus:bg-white focus:outline-none"
          id="contact-message"
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Enter your message"
          required
          rows={5}
          value={message}
        />
      </div>
      <button
        className="inline-flex h-12 w-fit items-center justify-center rounded-md bg-slate-950 px-6 font-black text-white hover:bg-slate-800 disabled:opacity-50"
        disabled={loading}
        type="submit"
      >
        {loading ? 'Sending...' : 'Send Message'}
      </button>
    </form>
  )
}
