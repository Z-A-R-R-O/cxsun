import { lazy, Suspense, useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import './assets/css/app.css'

import { version } from '../package.json'
import { BrandLogo } from 'src/components/blocks/branding/brand-logo'
import { GlobalLoader } from 'src/components/blocks/loading/global-loader'
import { ThemeProvider } from 'src/components/blocks/theme/theme-provider'
import { PublicSitePage } from 'src/features/site/public-site-page'
import type { HealthStatus, SiteContent, TenantStaticSiteContent } from 'src/features/site/domain/site-content'
import { Toaster } from './components/ui/sonner'
import { Button } from './components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from './components/ui/card'
import { TooltipProvider } from './components/ui/tooltip'
import { clearAuthCache, getStoredSession, type AuthSession } from './features/auth/auth-client'
import { APP_NAME } from './lib/branding'
import { apiBaseUrl } from './lib/api-base-url'

type View =
  | 'landing'
  | 'tenant-dashboard'
  | 'admin-dashboard'
  | 'super-admin-dashboard'
  | 'login'
  | 'admin-login'
  | 'super-admin-login'
  | 'forgot-password'

type AppRoute = {
  page: string
  view: View
}

const loadDashboardView = () =>
  import('src/components/blocks/dashboard/dashboard-view').then((module) => ({
    default: module.DashboardView,
  }))
const DashboardView = lazy(loadDashboardView)
const LoginForm = lazy(() =>
  import('src/components/blocks/auth/login-form').then((module) => ({
    default: module.LoginForm,
  })),
)
const ForgotPasswordForm = lazy(() =>
  import('src/components/blocks/auth/forgot-password-form').then((module) => ({
    default: module.ForgotPasswordForm,
  })),
)
const TirupurConnectPublicPage = lazy(() =>
  import('src/features/tirupur-connect/public/tirupur-connect-public-page').then((module) => ({
    default: module.TirupurConnectPublicPage,
  })),
)
const fallbackContent: SiteContent = {
  pages: [
    {
      slug: 'home',
      nav_label: 'Home',
      title: 'One operating layer for commerce, ERP, and tenants.',
      eyebrow: `${APP_NAME} Platform`,
      summary:
        `${APP_NAME} brings sales, inventory, finance, and tenant activity into a single operational surface.`,
      body:
        'The frontend is ready to consume live backend content, with local SQLite storage wired through Kysely.',
    },
    {
      slug: 'about',
      nav_label: 'About',
      title: 'Built for companies that run complex commerce operations.',
      eyebrow: 'About',
      summary:
        `${APP_NAME} keeps the server as the source of truth while clients stay focused and fast.`,
      body:
        'The platform is structured for modular growth across ERP, ecommerce, and tenant workflows.',
    },
    {
      slug: 'services',
      nav_label: 'Services',
      title: 'Modular services for daily operating control.',
      eyebrow: 'Services',
      summary:
        'Coordinate commerce, inventory, finance, tenant administration, and reporting.',
      body:
        'Each service can grow as a bounded module while sharing platform infrastructure.',
    },
    {
      slug: 'contact',
      nav_label: 'Contact',
      title: 'Talk through your operating model.',
      eyebrow: 'Contact',
      summary:
        'Capture implementation needs, integrations, and tenant rollout questions.',
      body:
        'The contact form posts to the backend and stores messages in SQLite.',
    },
    {
      slug: 'blog',
      nav_label: 'Blog',
      title: 'Notes from the product floor.',
      eyebrow: 'Blog',
      summary: 'Follow platform updates and architecture decisions.',
      body:
        'Blog content is served from the same local database-backed API.',
    },
  ],
  services: [
    {
      id: 1,
      title: 'ERP Core',
      description: 'Approvals, stock movement, branches, and operating records.',
    },
    {
      id: 2,
      title: 'Ecommerce Operations',
      description: 'Orders, catalog sync, payment capture, and fulfillment.',
    },
    {
      id: 3,
      title: 'Tenant Control',
      description: 'Workspace context and future tenant isolation rules.',
    },
  ],
  posts: [
    {
      id: 1,
      title: `Why ${APP_NAME} starts with the operating layer`,
      excerpt: 'A practical note on giving companies one place to see daily work.',
      published_at: '2026-05-14',
    },
  ],
}

const staticPageSlugs = [
  'home',
  'about',
  'services',
  'contact',
  'blog',
  'billing',
  'shop',
  'inventory',
  'accounts',
  'auditor',
  'club',
  'garment',
  'offset',
  'testing-lab',
  'business-connect',
  'tirupur-connect',
] as const

function parseRoute(pathname = window.location.pathname): AppRoute {
  const normalizedPath = pathname.replace(/\/+$/, '') || '/'
  const [, firstSegment, secondSegment] = normalizedPath.split('/')

  if (firstSegment === 'app') {
    return { page: 'home', view: 'tenant-dashboard' }
  }

  if (firstSegment === 'admin') {
    return secondSegment === 'login'
      ? { page: 'home', view: 'admin-login' }
      : { page: 'home', view: 'admin-dashboard' }
  }

  if (firstSegment === 'sa') {
    return secondSegment === 'login'
      ? { page: 'home', view: 'super-admin-login' }
      : { page: 'home', view: 'super-admin-dashboard' }
  }

  if (firstSegment === 'sg' && secondSegment === 'login') {
    return { page: 'home', view: 'super-admin-login' }
  }

  if (firstSegment === 'login') {
    return { page: 'home', view: 'login' }
  }

  if (firstSegment === 'forgot-password') {
    return { page: 'home', view: 'forgot-password' }
  }

  if ((staticPageSlugs as readonly string[]).includes(firstSegment) && firstSegment !== 'home') {
    return { page: firstSegment, view: 'landing' }
  }

  return { page: 'home', view: 'landing' }
}

function routePath(route: AppRoute) {
  if (route.view === 'tenant-dashboard') return '/app'
  if (route.view === 'admin-dashboard') return '/admin'
  if (route.view === 'super-admin-dashboard') return '/sa'
  if (route.view === 'login') return '/login'
  if (route.view === 'admin-login') return '/admin/login'
  if (route.view === 'super-admin-login') return '/sg/login'
  if (route.view === 'forgot-password') return '/forgot-password'
  return route.page === 'home' ? '/' : `/${route.page}`
}

function pushRoute(route: AppRoute) {
  const nextPath = routePath(route)
  if (window.location.pathname !== nextPath) {
    window.history.pushState(null, '', nextPath)
  }
}

async function fetchSiteContent() {
  const response = await fetch(`${apiBaseUrl}/api/site`)
  if (!response.ok) {
    throw new Error(`Site content failed with status ${response.status}.`)
  }
  return (await response.json()) as SiteContent
}

async function fetchTenantStaticSite() {
  const domain = window.location.host
  const response = await fetch(`${apiBaseUrl}/api/site/tenant-static?domain=${encodeURIComponent(domain)}`)
  if (!response.ok) {
    throw new Error(`Tenant static site failed with status ${response.status}.`)
  }
  return (await response.json()) as TenantStaticSiteContent
}

async function fetchHealth() {
  const response = await fetch(`${apiBaseUrl}/health`)
  if (!response.ok) {
    throw new Error(`Health check failed with status ${response.status}.`)
  }
  return (await response.json()) as HealthStatus
}

function App() {
  const queryClient = useQueryClient()
  const [route, setRoute] = useState<AppRoute>(() => parseRoute())
  const [menuOpen, setMenuOpen] = useState(false)
  const [tenantSession, setTenantSession] = useState<AuthSession | null>(() => getStoredSession('tenant'))
  const activePage = route.page
  const activeView = route.view
  const isPlatformView = activeView === 'admin-dashboard'
    || activeView === 'admin-login'
    || activeView === 'super-admin-dashboard'
    || activeView === 'super-admin-login'
  const isPublicSiteView = activeView === 'landing'

  const siteQuery = useQuery({
    queryKey: ['site-content'],
    queryFn: fetchSiteContent,
    enabled: false,
    placeholderData: fallbackContent,
  })
  const tenantSiteQuery = useQuery({
    queryKey: ['tenant-static-site', window.location.host],
    queryFn: fetchTenantStaticSite,
    enabled: !isPlatformView,
  })
  const healthQuery = useQuery({
    queryKey: ['health'],
    queryFn: fetchHealth,
    enabled: isPublicSiteView,
    refetchInterval: 60_000,
  })

  useEffect(() => {
    function syncRouteFromLocation() {
      setRoute(parseRoute())
    }

    window.addEventListener('popstate', syncRouteFromLocation)
    return () => window.removeEventListener('popstate', syncRouteFromLocation)
  }, [])

  useEffect(() => {
    function syncTenantSession() {
      setTenantSession(getStoredSession('tenant'))
    }

    window.addEventListener('storage', syncTenantSession)
    window.addEventListener('cxsun:auth-invalid', syncTenantSession)
    return () => {
      window.removeEventListener('storage', syncTenantSession)
      window.removeEventListener('cxsun:auth-invalid', syncTenantSession)
    }
  }, [])

  useEffect(() => {
    if (
      activeView === 'login' ||
      activeView === 'admin-login' ||
      activeView === 'super-admin-login' ||
      activeView === 'tenant-dashboard' ||
      activeView === 'admin-dashboard' ||
      activeView === 'super-admin-dashboard'
    ) {
      const timer = window.setTimeout(() => {
        void loadDashboardView()
      }, 250)
      return () => window.clearTimeout(timer)
    }
  }, [activeView])

  function navigate(nextRoute: AppRoute) {
    setRoute(nextRoute)
    pushRoute(nextRoute)
    setMenuOpen(false)
  }

  function logoutTenant() {
    clearAuthCache('tenant')
    queryClient.clear()
    setTenantSession(null)
    setRoute({ page: 'home', view: 'landing' })
    window.history.replaceState(null, '', '/')
    setMenuOpen(false)
  }

  const tenantSite = tenantSiteQuery.data ?? null
  const content = tenantSite?.resolved ? tenantSite : siteQuery.data ?? fallbackContent
  const health = healthQuery.data ?? null
  const isTenantAuthenticated = Boolean(tenantSession)

  useEffect(() => {
    if (!tenantSite?.resolved || !tenantSite.tenant) {
      return
    }

    if (tenantSession && tenantSession.selectedTenant.slug !== tenantSite.tenant.slug) {
      clearAuthCache('tenant')
      queryClient.clear()
      setTenantSession(null)
      if (activeView === 'tenant-dashboard') {
        setRoute({ page: 'home', view: 'login' })
        window.history.replaceState(null, '', '/login')
      }
    }
  }, [activeView, queryClient, tenantSession, tenantSite])

  if (isPublicSiteView && activePage === 'tirupur-connect') {
    return (
      <TooltipProvider>
        <Suspense fallback={<GlobalLoader />}>
          <TirupurConnectPublicPage />
        </Suspense>
        <Toaster />
      </TooltipProvider>
    )
  }

  if (isPublicSiteView && tenantSite?.resolved && tenantSite.tenant?.industryKey === 'tirupur_connect') {
    return (
      <TooltipProvider>
        <Suspense fallback={<GlobalLoader />}>
          <TirupurConnectPublicPage />
        </Suspense>
        <Toaster />
      </TooltipProvider>
    )
  }

  if (isPublicSiteView && tenantSiteQuery.isPending && tenantSiteQuery.fetchStatus !== 'idle') {
    return (
      <TooltipProvider>
        <GlobalLoader />
        <Toaster />
      </TooltipProvider>
    )
  }

  if (isPublicSiteView && tenantSiteQuery.isError) {
    return (
      <TooltipProvider>
        <div className="grid min-h-screen place-items-center bg-background px-4 py-10 text-foreground">
          <Card className="w-full max-w-[620px]">
            <CardHeader>
              <CardTitle>Tenant domain not available</CardTitle>
              <p className="text-sm text-muted-foreground">
                This installation requires a successful tenant domain lookup before public content is shown.
              </p>
            </CardHeader>
            <CardContent className="grid gap-3">
              <p className="font-mono text-sm">{window.location.host}</p>
              <p className="text-sm text-muted-foreground">
                {tenantSiteQuery.error instanceof Error ? tenantSiteQuery.error.message : 'Tenant lookup failed.'}
              </p>
            </CardContent>
          </Card>
        </div>
        <Toaster />
      </TooltipProvider>
    )
  }

  if (isPublicSiteView && tenantSite && !tenantSite.resolved) {
    return (
      <TooltipProvider>
        <div className="grid min-h-screen place-items-center bg-background px-4 py-10 text-foreground">
          <Card className="flex w-full max-w-[620px] flex-col items-center text-center">
            <CardHeader className="flex w-full flex-col items-center text-center">
              <BrandLogo className="mb-2 size-14" />
              <CardTitle>Welcome to {APP_NAME}</CardTitle>
              <p className="max-w-md text-sm text-muted-foreground">
                Please enter the proper tenant domain name to open your company workspace.
              </p>
            </CardHeader>
            <CardContent className="mx-auto grid w-full max-w-md justify-items-center gap-4 text-center">
              <div className="rounded-md border bg-muted/40 px-3 py-2 font-mono text-sm">
                {window.location.host}
              </div>
              <p className="text-sm text-muted-foreground">
                This domain is not linked to an active tenant. Check the domain name or continue to the main Codexsun site.
              </p>
              <Button asChild className="justify-self-center" type="button">
                <a href="https://codexsun.com">Go to codexsun.com</a>
              </Button>
            </CardContent>
          </Card>
        </div>
        <Toaster />
      </TooltipProvider>
    )
  }

  if (
    activeView === 'tenant-dashboard' ||
    activeView === 'admin-dashboard' ||
    activeView === 'super-admin-dashboard'
  ) {
    const dashboardConfig =
      activeView === 'super-admin-dashboard'
        ? { basePath: '/sa' as const, loginPath: '/sg/login' as const, mode: 'super-admin' as const }
        : activeView === 'admin-dashboard'
          ? { basePath: '/admin' as const, loginPath: '/admin/login' as const, mode: 'admin' as const }
          : { basePath: '/app' as const, loginPath: '/login' as const, mode: 'tenant' as const }

    return (
      <TooltipProvider>
        <Suspense fallback={<GlobalLoader />}>
          <DashboardView
            {...dashboardConfig}
            onBackHome={() => navigate({ page: 'home', view: 'landing' })}
          />
        </Suspense>
        <Toaster />
      </TooltipProvider>
    )
  }

  if (
    activeView === 'login' ||
    activeView === 'admin-login' ||
    activeView === 'super-admin-login' ||
    activeView === 'forgot-password'
  ) {
    return (
      <TooltipProvider>
        <div className="grid min-h-screen place-items-center bg-background px-4 py-10 text-foreground">
          <div className="w-full max-w-[560px]">
            <Suspense fallback={<GlobalLoader />}>
              {activeView === 'forgot-password' ? (
                <ForgotPasswordForm onBackToLogin={() => navigate({ page: 'home', view: 'login' })} />
              ) : (
                <LoginForm
                  surface={
                    activeView === 'super-admin-login'
                      ? 'super-admin'
                      : activeView === 'admin-login'
                        ? 'admin'
                        : 'tenant'
                  }
                  subtitle={
                    activeView === 'super-admin-login'
                      ? ''
                      : activeView === 'admin-login'
                        ? 'Admin helpdesk access'
                        : 'Client login'
                  }
                  onAuthenticated={(session) => {
                    if (activeView === 'login') {
                      setTenantSession(session)
                    }
                    navigate({
                      page: 'home',
                      view:
                        activeView === 'super-admin-login'
                          ? 'super-admin-dashboard'
                          : activeView === 'admin-login'
                            ? 'admin-dashboard'
                            : 'tenant-dashboard',
                    })
                  }}
                  onForgotPassword={() => navigate({ page: 'home', view: 'forgot-password' })}
                />
              )}
            </Suspense>
          </div>
        </div>
        <Toaster />
      </TooltipProvider>
    )
  }

  return (
    <TooltipProvider>
      <PublicSitePage
        activePage={activePage}
        content={content}
        health={health}
        isAuthenticated={isTenantAuthenticated}
        menuOpen={menuOpen}
        tenantSite={tenantSite}
        version={version}
        onNavigate={(nextPage) => navigate({ page: nextPage, view: 'landing' })}
        onOpenDashboard={() => navigate({ page: 'home', view: 'tenant-dashboard' })}
        onOpenLogin={() => navigate({ page: 'home', view: 'login' })}
        onLogout={logoutTenant}
        onToggleMenu={() => setMenuOpen((open) => !open)}
      />
      <Toaster />
    </TooltipProvider>
  )
}

export default function AppRoot() {
  return (
    <ThemeProvider defaultColorTheme="neutral" defaultTheme="system">
      <App />
    </ThemeProvider>
  )
}
