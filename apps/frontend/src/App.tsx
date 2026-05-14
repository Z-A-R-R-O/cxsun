import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import {
  ArrowRight,
  Database,
  LayoutDashboard,
  Mail,
  Menu,
  Server,
  ShieldCheck,
  X,
} from 'lucide-react'
import './assets/css/app.css'

import { version } from '../package.json'
import { BrandLogo } from 'src/components/blocks/branding/brand-logo'
import { ThemeProvider } from 'src/components/blocks/theme/theme-provider'
import { ThemeToggle } from 'src/components/blocks/theme/theme-toggle'
import { Toaster } from './components/ui/sonner'
import { Button } from './components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from './components/ui/card'
import { TooltipProvider } from './components/ui/tooltip'
import { APP_NAME } from './lib/branding'
import { cn } from './lib/utils'

type View = 'landing' | 'dashboard' | 'login'

interface SitePage {
  slug: 'home' | 'about' | 'services' | 'contact' | 'blog'
  nav_label: string
  title: string
  eyebrow: string
  summary: string
  body: string
}

interface SiteService {
  id: number
  title: string
  description: string
}

interface SitePost {
  id: number
  title: string
  excerpt: string
  published_at: string
}

interface SiteContent {
  pages: SitePage[]
  services: SiteService[]
  posts: SitePost[]
}

interface HealthStatus {
  status: 'ok'
  version: string
}

interface PlatformFeature {
  label: string
  detail: string
  Icon: typeof LayoutDashboard
}

const configuredApiBaseUrl =
  import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:6001'
const apiBaseUrl = configuredApiBaseUrl.replace(/\/api\/?$/, '').replace(/\/$/, '')
const DashboardView = lazy(() =>
  import('src/components/blocks/dashboard/dashboard-view').then((module) => ({
    default: module.DashboardView,
  })),
)
const LoginForm = lazy(() =>
  import('src/components/blocks/auth/login-form').then((module) => ({
    default: module.LoginForm,
  })),
)
const platformFeatures: PlatformFeature[] = [
  {
    label: 'Frontend',
    detail: 'React + Tailwind + shadcn-style components',
    Icon: LayoutDashboard,
  },
  {
    label: 'Backend',
    detail: 'Fastify module API served from apps/server',
    Icon: Server,
  },
  {
    label: 'Storage',
    detail: 'Kysely connected to local SQLite storage',
    Icon: Database,
  },
  {
    label: 'Tenant-ready',
    detail: 'Boundaries prepared for modular platform growth',
    Icon: ShieldCheck,
  },
]

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

function App() {
  const [activePage, setActivePage] = useState<SitePage['slug']>('home')
  const [activeView, setActiveView] = useState<View>('landing')
  const [content, setContent] = useState<SiteContent>(fallbackContent)
  const [health, setHealth] = useState<HealthStatus | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [contactStatus, setContactStatus] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const [siteResponse, healthResponse] = await Promise.all([
          fetch(`${apiBaseUrl}/api/site`),
          fetch(`${apiBaseUrl}/health`),
        ])

        if (siteResponse.ok && !cancelled) {
          setContent((await siteResponse.json()) as SiteContent)
        }

        if (healthResponse.ok && !cancelled) {
          setHealth((await healthResponse.json()) as HealthStatus)
        }
      } catch {
        if (!cancelled) {
          setHealth(null)
        }
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [])

  const pagesBySlug = useMemo(
    () => Object.fromEntries(content.pages.map((page) => [page.slug, page])),
    [content.pages],
  ) as Record<SitePage['slug'], SitePage>

  const page = pagesBySlug[activePage] ?? fallbackContent.pages[0]

  async function submitContact(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const formData = new FormData(form)

    const payload = {
      name: String(formData.get('name') ?? ''),
      email: String(formData.get('email') ?? ''),
      message: String(formData.get('message') ?? ''),
    }

    const response = await fetch(`${apiBaseUrl}/api/site/contact`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    const result = (await response.json()) as { ok: boolean; error?: string }

    if (result.ok) {
      form.reset()
      setContactStatus(`Message saved to the local ${APP_NAME} database.`)
      return
    }

    setContactStatus(result.error ?? 'Unable to save the message.')
  }

  const nav = content.pages.map((item) => (
    <button
      className={cn(
        'rounded-lg px-3 py-2 text-sm font-semibold text-muted-foreground transition hover:bg-muted hover:text-foreground',
        activePage === item.slug && 'bg-muted text-foreground',
      )}
      key={item.slug}
      onClick={() => {
        setActivePage(item.slug)
        setActiveView('landing')
        setMenuOpen(false)
      }}
      type="button"
    >
      {item.nav_label}
    </button>
  ))

  if (activeView === 'dashboard') {
    return (
      <TooltipProvider>
        <Suspense fallback={<AppFallback label="Loading dashboard" />}>
          <DashboardView onBackHome={() => setActiveView('landing')} />
        </Suspense>
        <Toaster />
      </TooltipProvider>
    )
  }

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-20 border-b bg-card/92 backdrop-blur">
        <div className="cx-container flex h-16 items-center justify-between gap-4">
          <button
            className="flex items-center gap-3 text-left"
            onClick={() => setActivePage('home')}
            type="button"
          >
            <BrandLogo className="size-9" />
            <span>
              <strong className="block leading-tight">{APP_NAME}</strong>
              <small className="text-muted-foreground">v{version}</small>
            </span>
          </button>

          <nav className="hidden items-center gap-1 md:flex" aria-label="Top menu">
            {nav}
            <button
              className="rounded-lg px-3 py-2 text-sm font-semibold text-muted-foreground transition hover:bg-muted hover:text-foreground"
              onClick={() => setActiveView('dashboard')}
              type="button"
            >
              Dashboard
            </button>
            <button
              className={cn(
                'rounded-lg px-3 py-2 text-sm font-semibold text-muted-foreground transition hover:bg-muted hover:text-foreground',
                activeView === 'login' && 'bg-muted text-foreground',
              )}
              onClick={() => setActiveView('login')}
              type="button"
            >
              Login
            </button>
          </nav>

          <div className="flex items-center gap-2">
            <div className="hidden items-center gap-2 rounded-lg border bg-background px-3 py-2 text-xs font-semibold text-muted-foreground sm:flex">
              <span
                className={cn(
                  'h-2 w-2 rounded-full bg-destructive',
                  health?.status === 'ok' && 'bg-secondary',
                )}
              />
              API {health?.status ?? 'offline'}
            </div>
            <ThemeToggle />
            <Button
              className="md:hidden"
              onClick={() => setMenuOpen((open) => !open)}
              size="icon"
              type="button"
              variant="outline"
            >
              {menuOpen ? <X size={18} /> : <Menu size={18} />}
            </Button>
          </div>
        </div>

        {menuOpen ? (
          <nav className="cx-container grid gap-2 border-t py-3 md:hidden">
            {nav}
            <button
              className="rounded-lg px-3 py-2 text-sm font-semibold text-muted-foreground transition hover:bg-muted hover:text-foreground"
              onClick={() => {
                setActiveView('dashboard')
                setMenuOpen(false)
              }}
              type="button"
            >
              Dashboard
            </button>
            <button
              className="rounded-lg px-3 py-2 text-sm font-semibold text-muted-foreground transition hover:bg-muted hover:text-foreground"
              onClick={() => {
                setActiveView('login')
                setMenuOpen(false)
              }}
              type="button"
            >
              Login
            </button>
          </nav>
        ) : null}
      </header>

      <main>
        {activeView === 'login' ? (
          <section className="cx-container grid min-h-[calc(100svh-210px)] place-items-center py-16">
            <div className="w-full max-w-md">
              <Suspense fallback={<AppFallback label="Loading login" />}>
                <LoginForm />
              </Suspense>
            </div>
          </section>
        ) : (
          <>
        <section className="cx-container grid gap-8 py-16 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:py-20">
          <div>
            <span className="text-sm font-bold uppercase tracking-wide text-primary">
              {page.eyebrow}
            </span>
            <h1 className="mt-4 max-w-3xl text-4xl font-black leading-tight tracking-tight sm:text-5xl lg:text-6xl">
              {page.title}
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-muted-foreground">
              {page.summary}
            </p>
            <p className="mt-4 max-w-2xl leading-7">{page.body}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button onClick={() => setActivePage('services')} type="button">
                Explore services
                <ArrowRight size={17} />
              </Button>
              <Button
                onClick={() => setActivePage('contact')}
                type="button"
                variant="outline"
              >
                Contact us
              </Button>
            </div>
          </div>

          <Card className="overflow-hidden">
            <CardHeader className="border-b">
              <CardTitle>Live platform wire</CardTitle>
              <p className="text-sm text-muted-foreground">
                Frontend, backend, and SQLite are connected through the site API.
              </p>
            </CardHeader>
            <CardContent className="grid gap-4 pt-5">
              {platformFeatures.map(({ label, detail, Icon }) => (
                <div className="flex gap-3 rounded-lg border bg-background p-4" key={label}>
                  <Icon className="mt-1 text-primary" size={20} />
                  <div>
                    <strong>{label}</strong>
                    <p className="text-sm text-muted-foreground">{detail}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </section>

        <section className="border-y bg-card py-14">
          <div className="cx-container grid gap-4 md:grid-cols-3">
            {content.services.map((service) => (
              <Card key={service.id}>
                <CardHeader>
                  <CardTitle>{service.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{service.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="cx-container grid gap-6 py-14 lg:grid-cols-[0.9fr_1.1fr]">
          <Card>
            <CardHeader>
              <CardTitle>Contact</CardTitle>
              <p className="text-sm text-muted-foreground">
                Send a simple message into the local SQLite database.
              </p>
            </CardHeader>
            <CardContent>
              <form className="grid gap-3" onSubmit={submitContact}>
                <input
                  className="h-11 rounded-lg border bg-background px-3"
                  name="name"
                  placeholder="Name"
                  required
                />
                <input
                  className="h-11 rounded-lg border bg-background px-3"
                  name="email"
                  placeholder="Email"
                  required
                  type="email"
                />
                <textarea
                  className="min-h-28 rounded-lg border bg-background p-3"
                  name="message"
                  placeholder="Message"
                  required
                />
                <Button type="submit">
                  <Mail size={17} />
                  Send message
                </Button>
                {contactStatus ? (
                  <p className="text-sm text-muted-foreground">{contactStatus}</p>
                ) : null}
              </form>
            </CardContent>
          </Card>

          <div className="grid gap-4">
            <h2 className="text-2xl font-bold">Blog</h2>
            {content.posts.map((post) => (
              <Card key={post.id}>
                <CardHeader>
                  <span className="text-xs font-bold uppercase text-primary">
                    {post.published_at}
                  </span>
                  <CardTitle>{post.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{post.excerpt}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
          </>
        )}
      </main>

      <footer className="border-t bg-card py-8">
        <div className="cx-container flex flex-col justify-between gap-4 text-sm text-muted-foreground md:flex-row md:items-center">
          <p>© 2026 {APP_NAME}. ERP + ecommerce platform foundation.</p>
          <nav className="flex flex-wrap gap-3">
            {content.pages
              .filter((item) => item.slug !== 'home')
              .map((item) => (
                <button
                  className="font-semibold hover:text-foreground"
                  key={item.slug}
                  onClick={() => setActivePage(item.slug)}
                  type="button"
                >
                  {item.nav_label}
                </button>
              ))}
          </nav>
        </div>
      </footer>
    </div>
      <Toaster />
    </TooltipProvider>
  )
}

function AppFallback({ label }: { label: string }) {
  return (
    <div className="grid min-h-[240px] place-items-center bg-background p-6 text-sm font-medium text-muted-foreground">
      {label}
    </div>
  )
}

export default function AppRoot() {
  return (
    <ThemeProvider defaultColorTheme="neutral" defaultTheme="system">
      <App />
    </ThemeProvider>
  )
}
