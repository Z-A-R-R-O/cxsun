import { useEffect, useState } from 'react'
import { ArrowRight, BarChart3, BriefcaseBusiness, CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, Clock3, FileText, Globe2, Layers3, LifeBuoy, PackageCheck, Plus, ReceiptText, Settings2, ShieldCheck, Sparkles, Store, UserRound, UsersRound, X, Zap } from 'lucide-react'

import { BrandLogo } from 'src/components/blocks/branding/brand-logo'
import { FullScreenSlider } from 'src/components/blocks/slider/FullScreenSlider'
import { APP_NAME } from 'src/lib/branding'
import { SiteSection } from '../developer/site-section'
import type { TenantStaticSiteContent } from '../domain/site-content'
import { ScrollReveal } from '../motion/scroll-reveal'

interface HomePageProps {
  developerMode: boolean
  tenantSite: TenantStaticSiteContent | null
}

export function HomePage({ developerMode, tenantSite }: HomePageProps) {
  const slider =
    tenantSite?.sliders?.find((item) => item.placement === 'home-slider' && item.is_primary) ??
    tenantSite?.sliders?.find((item) => item.placement === 'home-slider') ??
    tenantSite?.sliders?.[0]

  return (
    <main className="overflow-x-clip">
      <SiteSection className="relative" developerMode={developerMode} name={slider ? 'home-slider' : 'home-hero'}>
        {slider ? (
          <FullScreenSlider
            className="h-[calc(100svh-10rem)] max-h-[560px] min-h-[420px]"
            slides={slider.slides}
            options={slider.options}
          />
        ) : (
          <StaticHomeHero tenantName={tenantSite?.tenant?.name ?? APP_NAME} />
        )}
      </SiteSection>
      <SiteSection developerMode={developerMode} name="home-brand-intro">
        <ScrollReveal direction="bottom" distance={34}>
          <HomeBrandIntro />
        </ScrollReveal>
      </SiteSection>
      <SiteSection developerMode={developerMode} name="home-stats">
        <HomeStatsSection />
      </SiteSection>
      <SiteSection developerMode={developerMode} name="home-product-showcase">
        <HomeProductShowcase />
      </SiteSection>
      <SiteSection developerMode={developerMode} name="home-brand-marquee">
        <HomeBrandMarquee />
      </SiteSection>
      <SiteSection developerMode={developerMode} name="home-business-templates">
        <HomeBusinessTemplates />
      </SiteSection>
      <SiteSection developerMode={developerMode} name="home-why">
        <HomeWhySection />
      </SiteSection>
      <SiteSection developerMode={developerMode} name="home-pricing">
        <HomePricingSection />
      </SiteSection>
      <SiteSection developerMode={developerMode} name="home-story">
        <HomeStorySection />
      </SiteSection>
      <SiteSection developerMode={developerMode} name="home-values">
        <HomeValuesSection />
      </SiteSection>
      <SiteSection developerMode={developerMode} name="home-blogs">
        <HomeBlogsSection />
      </SiteSection>
      <SiteSection developerMode={developerMode} name="home-final-cta">
        <HomeFinalCta />
      </SiteSection>
      <SiteSection developerMode={developerMode} name="home-faq">
        <HomeFaqSection />
      </SiteSection>
    </main>
  )
}

function HomeBrandIntro() {
  return (
    <section className="overflow-hidden bg-[linear-gradient(120deg,rgba(14,165,233,0.08)_0_1px,transparent_1px_42px),linear-gradient(60deg,rgba(245,158,11,0.10)_0_1px,transparent_1px_46px),radial-gradient(circle_at_50%_0%,rgba(251,191,36,0.24),transparent_34%),linear-gradient(180deg,#ffffff_0%,#f0f9ff_100%)] px-4 py-16 text-slate-950 md:py-20">
      <div className="cx-container text-center">
        <div className="mx-auto mb-6 flex size-16 items-center justify-center rounded-2xl border border-sky-200 bg-white shadow-xl shadow-sky-950/10">
          <BrandLogo className="size-10" />
        </div>
        <p className="text-sm font-black uppercase tracking-[0.18em] text-sky-700">Website · Billing · Operations — all in one place</p>
        <h1 className="mx-auto mt-4 max-w-5xl text-4xl font-black leading-tight tracking-normal md:text-6xl">
          Run your business from one screen, not ten tabs.
        </h1>
        <div className="mx-auto mt-6 flex w-fit gap-2">
          <span className="h-1 w-8 rounded-full bg-sky-500" />
          <span className="h-1 w-8 rounded-full bg-amber-400" />
          <span className="h-1 w-8 rounded-full bg-emerald-500" />
        </div>
        <p className="mx-auto mt-7 max-w-3xl text-lg leading-8 text-slate-600">
          Most growing businesses juggle separate tools for their website, invoices, customers, and team work. Codexsun replaces that chaos with one connected workspace — so you spend less time managing software and more time serving customers.
        </p>
        <div className="mt-9 flex flex-wrap justify-center gap-3">
          <button className="inline-flex items-center gap-2 rounded-md bg-sky-600 px-6 py-3 text-sm font-black uppercase tracking-wide text-white shadow-lg shadow-sky-600/20 transition hover:bg-sky-700" type="button">
            Start free today
            <ArrowRight className="size-4" />
          </button>
          <button className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-6 py-3 text-sm font-black uppercase tracking-wide text-slate-800 transition hover:border-slate-500" type="button">
            See how it works
            <ArrowRight className="size-4" />
          </button>
        </div>
      </div>
    </section>
  )
}

const homeStats = [
  {
    accent: 'text-sky-600',
    description: 'From retail shops to service firms — real businesses run their daily operations on Codexsun every day.',
    icon: UsersRound,
    label: 'Businesses trust us',
    suffix: '+',
    value: 120,
  },
  {
    accent: 'text-emerald-600',
    description: 'Website, invoicing, CRM, inventory, tasks, and reports — tools you used to pay for separately, now built in.',
    icon: Layers3,
    label: 'Tools replaced',
    suffix: '+',
    value: 12,
  },
  {
    accent: 'text-amber-600',
    description: 'Invoices sent, payments tracked, follow-ups completed — work that used to take hours now happens in minutes.',
    icon: CheckCircle2,
    label: 'Actions completed',
    suffix: '+',
    value: 10000,
  },
  {
    accent: 'text-blue-600',
    description: 'Your data, your workspace, your rules. Role-based access keeps every team member in the right lane.',
    icon: ShieldCheck,
    label: 'Your control',
    suffix: '%',
    value: 100,
  },
]

function HomeStatsSection() {
  return (
    <section className="bg-[linear-gradient(180deg,#f0f9ff_0%,#ffffff_100%)] px-4 pb-14 text-slate-950 md:pb-16">
      <div className="cx-container">
        <ScrollReveal direction="bottom" distance={26}>
          <div className="grid overflow-hidden rounded-md border border-slate-200 bg-white shadow-xl shadow-slate-950/5 md:grid-cols-4">
            {homeStats.map((stat, index) => (
              <StatCard index={index} key={stat.label} stat={stat} />
            ))}
          </div>
        </ScrollReveal>
      </div>
    </section>
  )
}

function StatCard({ index, stat }: { index: number; stat: typeof homeStats[number] }) {
  const Icon = stat.icon

  return (
    <article className="border-slate-200 p-6 md:border-r md:last:border-r-0">
      <div className={`mb-5 flex size-11 items-center justify-center rounded-md border border-slate-200 bg-slate-50 ${stat.accent}`}>
        <Icon className="size-6" />
      </div>
      <p className="flex items-end gap-1 text-4xl font-black leading-none tracking-normal text-slate-950 md:text-5xl">
        <AnimatedCount delay={index * 120} value={stat.value} />
        {stat.suffix ? <span className={`text-2xl font-black ${stat.accent}`}>{stat.suffix}</span> : null}
      </p>
      <h3 className="mt-4 text-sm font-black uppercase tracking-[0.16em] text-slate-700">{stat.label}</h3>
      <p className="mt-3 text-sm leading-6 text-slate-600">{stat.description}</p>
    </article>
  )
}

function AnimatedCount({ delay = 0, duration = 1100, value }: { delay?: number; duration?: number; value: number }) {
  const [displayValue, setDisplayValue] = useState(0)

  useEffect(() => {
    let startTime: number | null = null
    let interval = 0
    const timeout = window.setTimeout(() => {
      interval = window.setInterval(() => {
        const timestamp = window.performance.now()
        startTime ??= timestamp
        const progress = Math.min((timestamp - startTime) / duration, 1)
        const eased = 1 - (1 - progress) ** 3

        setDisplayValue(Math.round(value * eased))

        if (progress >= 1) {
          window.clearInterval(interval)
        }
      }, 16)
    }, delay)

    return () => {
      window.clearTimeout(timeout)
      window.clearInterval(interval)
    }
  }, [delay, duration, value])

  return <span>{displayValue.toLocaleString('en-IN')}</span>
}

function HomeProductShowcase() {
  return (
    <section className="bg-white px-4 py-16 text-slate-950 md:py-20">
      <div className="cx-container">
        <ScrollReveal direction="bottom" distance={28}>
          <div className="relative overflow-hidden rounded-md border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] px-4 pb-8 pt-16 shadow-xl shadow-slate-950/5 md:px-8 md:pb-10 md:pt-20">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-[linear-gradient(90deg,rgba(14,165,233,0.08)_1px,transparent_1px),linear-gradient(180deg,rgba(14,165,233,0.08)_1px,transparent_1px)] bg-[size:64px_64px]" />
            <FloatingMetricCard className="left-[7%] top-10 hidden rotate-[-8deg] lg:block" label="Avg. invoice time" value="3.2 min" />
            <FloatingMetricCard className="left-[38%] top-5 hidden lg:block" label="Monthly collection rate" progress="64%" value="Rs. 8.4L" />
            <FloatingMetricCard className="right-[8%] top-8 hidden rotate-[-7deg] lg:block" label="Tasks done today" value="48 of 52" />

            <div className="relative mx-auto max-w-6xl overflow-hidden rounded-md border border-slate-200 bg-white shadow-2xl shadow-slate-950/10">
              <div className="grid min-h-[480px] bg-slate-50 md:grid-cols-[72px_1fr]">
                <aside className="hidden border-r border-slate-200 bg-white px-4 py-6 md:block">
                  <BrandLogo className="mb-9 size-10" />
                  <div className="grid justify-items-center gap-6 text-slate-500">
                    {[Globe2, BarChart3, Layers3, ReceiptText, Clock3, UsersRound, Settings2].map((Icon) => (
                      <Icon className="size-5" key={Icon.displayName ?? Icon.name} />
                    ))}
                  </div>
                </aside>

                <div className="p-5 md:p-8">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-black uppercase tracking-[0.16em] text-emerald-700">Your daily command centre</p>
                      <h2 className="mt-2 text-3xl font-black leading-tight tracking-normal md:text-4xl">Your daily business at a glance</h2>
                      <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">
                        Open your workspace and instantly see what needs attention — pending invoices, customer follow-ups, team tasks, and revenue trends. No digging required.
                      </p>
                    </div>
                    <div className="flex gap-2 text-sm font-bold text-slate-600">
                      {['Today', 'Week', 'Month'].map((item, index) => (
                        <span className={`rounded-full px-4 py-2 ${index === 0 ? 'bg-slate-950 text-white' : 'bg-white'}`} key={item}>{item}</span>
                      ))}
                    </div>
                  </div>

                  <div className="mt-8 grid gap-4 md:grid-cols-3">
                    {[
                      ['5.43K', 'Invoices processed this month'],
                      ['2.1 min', 'Avg. time per invoice'],
                      ['432', 'Follow-ups completed'],
                    ].map(([value, label]) => (
                      <div className="rounded-md bg-white p-5 shadow-sm shadow-slate-950/5" key={label}>
                        <p className="text-3xl font-black tracking-normal">{value}</p>
                        <p className="mt-2 text-sm text-slate-500">{label}</p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-8 grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
                    <div className="rounded-md bg-white p-5 shadow-sm shadow-slate-950/5">
                      <div className="mb-5 flex items-center justify-between">
                        <div>
                          <h3 className="text-lg font-black">Revenue trend</h3>
                          <p className="mt-1 text-sm text-slate-500">This week vs. last week</p>
                        </div>
                        <span className="rounded-full bg-slate-950 px-3 py-1 text-xs font-black text-white">4 New</span>
                      </div>
                      <div className="grid grid-cols-[1fr_170px] gap-6">
                        <div className="flex h-44 items-end gap-3 border-b border-dashed border-slate-200">
                          {[58, 44, 82, 64, 94, 72].map((height) => (
                            <div className="flex flex-1 flex-col justify-end" key={height}>
                              <span className="rounded-t-md bg-emerald-500" style={{ height: `${height}%` }} />
                              <span className="h-12 bg-slate-100" />
                            </div>
                          ))}
                        </div>
                        <div className="grid content-center gap-6">
                          <div>
                            <p className="text-3xl font-black">Rs. 5.4L</p>
                            <p className="mt-1 text-sm leading-5 text-slate-500">Collected this week</p>
                          </div>
                          <div>
                            <p className="text-3xl font-black">Rs. 1.2L</p>
                            <p className="mt-1 text-sm leading-5 text-slate-500">Pending payments</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-md bg-white p-5 shadow-sm shadow-slate-950/5">
                      <div className="mb-5 flex items-center justify-between">
                        <div>
                          <h3 className="text-lg font-black">Team progress</h3>
                          <p className="mt-1 text-sm text-slate-500">What your team finished today</p>
                        </div>
                        <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-600 shadow-sm">24 Hours</span>
                      </div>
                      <div className="grid gap-4">
                        {[
                          ['Billing', 58],
                          ['Customer', 82],
                          ['Dispatch', 46],
                          ['Follow-up', 70],
                        ].map(([label, width]) => (
                          <div className="grid grid-cols-[86px_1fr] items-center gap-4" key={label}>
                            <span className="text-sm text-slate-500">{label}</span>
                            <span className="h-9 rounded-md bg-slate-100">
                              <span className="block h-full rounded-md bg-lime-300" style={{ width: `${width}%` }} />
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="relative mt-10 text-center">
              <p className="text-base font-semibold text-slate-600 md:text-lg">Trusted by 120+ businesses across retail, services, and commerce</p>
              <div className="mt-7 grid gap-4 text-slate-400 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
                {implementedBrands.slice(0, 6).map((brand) => (
                  <div className="flex items-center justify-center gap-2 text-lg font-black" key={brand}>
                    <Layers3 className="size-5" />
                    {brand.split(' ')[0]}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  )
}

function FloatingMetricCard({ className, label, progress, value }: { className?: string; label: string; progress?: string; value: string }) {
  return (
    <div className={`absolute z-10 min-w-[230px] rounded-md border border-slate-100 bg-white/90 p-4 shadow-xl shadow-slate-950/10 backdrop-blur ${className ?? ''}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-bold text-slate-700">{label}</p>
          <p className="mt-1 text-xl font-black text-slate-950">{value}</p>
        </div>
        <span className="text-slate-300">•••</span>
      </div>
      {progress ? (
        <div className="mt-3">
          <div className="h-2 rounded-full bg-slate-100">
            <div className="h-2 rounded-full bg-emerald-500" style={{ width: progress }} />
          </div>
          <p className="mt-1 text-right text-xs font-black text-slate-500">{progress}</p>
        </div>
      ) : null}
    </div>
  )
}

const implementedBrands = [
  'Codexsun Retail',
  'Sunmart Billing',
  'BluePeak Stores',
  'GreenLedger',
  'PrimeDesk',
  'Nova Commerce',
  'Urban Works',
  'ClearBooks',
  'BrightOps',
  'Northline CRM',
]

function HomeBrandMarquee() {
  const marqueeItems = [...implementedBrands, ...implementedBrands]

  return (
    <section className="bg-white px-4 pb-14 text-slate-950 md:pb-16">
      <div className="cx-container">
        <ScrollReveal direction="bottom" distance={22}>
          <div className="overflow-hidden bg-[linear-gradient(135deg,#ffffff_0%,#f0f9ff_100%)] py-7">
            <div className="mb-6 flex flex-col justify-between gap-3 px-6 md:flex-row md:items-end">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.16em] text-sky-700">Already on board</p>
                <h2 className="mt-2 text-2xl font-black leading-tight tracking-normal md:text-3xl">
                  You're not the first to make the switch.
                </h2>
              </div>
              <p className="max-w-md text-sm leading-6 text-slate-600">
                These businesses stopped juggling separate tools and moved their website, billing, and daily operations into Codexsun.
              </p>
            </div>

            <div className="relative overflow-hidden bg-white/75 py-4">
              <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-20 bg-gradient-to-r from-white to-transparent" />
              <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-20 bg-gradient-to-l from-white to-transparent" />
              <div className="cx-brand-marquee flex w-max gap-4">
                {marqueeItems.map((brand, index) => (
                  <BrandMarqueeItem brand={brand} index={index} key={`${brand}-${index}`} />
                ))}
              </div>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  )
}

function BrandMarqueeItem({ brand, index }: { brand: string; index: number }) {
  const tones = [
    'border-sky-200 bg-sky-50 text-sky-700',
    'border-emerald-200 bg-emerald-50 text-emerald-700',
    'border-amber-200 bg-amber-50 text-amber-700',
    'border-blue-200 bg-blue-50 text-blue-700',
  ]
  const initials = brand
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)

  return (
    <div className="flex min-w-[220px] items-center gap-3 rounded-md border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <span className={`grid size-11 place-items-center rounded-md border text-sm font-black ${tones[index % tones.length]}`}>
        {initials}
      </span>
      <span className="text-base font-black tracking-normal text-slate-900">{brand}</span>
    </div>
  )
}

const businessTemplates = [
  {
    accent: 'border-sky-200 bg-sky-50 text-sky-700',
    icon: ReceiptText,
    visual: 'invoice',
    title: 'GST billing',
    description: 'Stop calculating tax manually. Create GST-compliant invoices in under 3 minutes with auto-filled GSTIN, HSN codes, and tax breakdowns.',
  },
  {
    accent: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    icon: PackageCheck,
    visual: 'dispatch',
    title: 'E-way bill flow',
    description: 'Goods stuck at checkpoints? Generate e-way bill details directly from your invoice — no re-entering transporter or destination data.',
  },
  {
    accent: 'border-blue-200 bg-blue-50 text-blue-700',
    icon: FileText,
    visual: 'einvoice',
    title: 'E-invoice ready',
    description: 'Don\'t scramble when e-invoicing becomes mandatory for your turnover. Your invoices are already structured for IRN generation from day one.',
  },
  {
    accent: 'border-amber-200 bg-amber-50 text-amber-700',
    icon: Layers3,
    visual: 'ledger',
    title: 'Tally export',
    description: 'Your accountant still uses Tally? No problem. Export clean, ledger-ready data they can import without calling you for missing entries.',
  },
  {
    accent: 'border-violet-200 bg-violet-50 text-violet-700',
    icon: UsersRound,
    visual: 'accountant',
    title: 'Accountant access',
    description: 'Give your CA or accountant their own login. They see billing, receipts, and reports — nothing more, nothing less. No WhatsApp file sharing needed.',
  },
  {
    accent: 'border-cyan-200 bg-cyan-50 text-cyan-700',
    icon: ShieldCheck,
    visual: 'checks',
    title: 'Error prevention',
    description: 'Tired of catching mistakes after sending invoices? Built-in validation flags missing GSTINs, mismatched amounts, and incomplete entries before you save.',
  },
  {
    accent: 'border-rose-200 bg-rose-50 text-rose-700',
    icon: CheckCircle2,
    visual: 'tasks',
    title: 'Task manager',
    description: 'Follow-ups slipping through? Assign tasks to team members with deadlines and status tracking — so nothing stays "I\'ll do it later" forever.',
  },
  {
    accent: 'border-teal-200 bg-teal-50 text-teal-700',
    icon: Zap,
    visual: 'automation',
    title: 'Workflow automation',
    description: 'Sending the same reminder emails? Updating the same fields? Let Codexsun handle the repetitive steps while you focus on decisions that matter.',
  },
  {
    accent: 'border-orange-200 bg-orange-50 text-orange-700',
    icon: Clock3,
    visual: 'reminders',
    title: 'Smart reminders',
    description: 'Never miss a payment due date or renewal again. Get notified before deadlines hit — not after the customer complains.',
  },
]

function HomeBusinessTemplates() {
  return (
    <section className="bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] px-4 pb-14 text-slate-950 md:pb-16">
      <div className="cx-container">
        <ScrollReveal direction="bottom" distance={26}>
          <div className="mb-10 grid gap-5 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.16em] text-sky-700">Everything your business needs</p>
              <h2 className="mt-3 text-3xl font-black leading-tight tracking-normal md:text-4xl">
                Built for the problems you deal with every day.
              </h2>
            </div>
            <p className="max-w-2xl text-base leading-7 text-slate-600 lg:justify-self-end">
              GST invoices, payment follow-ups, accountant coordination, team tasks — each module solves a real headache so your team stops firefighting and starts finishing.
            </p>
          </div>
        </ScrollReveal>

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {businessTemplates.map((template, index) => (
            <ScrollReveal delay={index * 0.04} direction="bottom" distance={24} key={template.title}>
              <BusinessTemplateCard template={template} />
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  )
}

function BusinessTemplateCard({ template }: { template: typeof businessTemplates[number] }) {
  const Icon = template.icon

  return (
    <article className="h-full min-h-[330px] overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm shadow-slate-950/5 transition hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-950/10">
      <BusinessTemplateVisual type={template.visual} />
      <div className="p-5">
        <div className="mb-4 flex items-center gap-3">
          <div className={`flex size-11 shrink-0 items-center justify-center rounded-md border ${template.accent}`}>
            <Icon className="size-5" />
          </div>
          <h3 className="text-xl font-black tracking-normal text-slate-950">{template.title}</h3>
        </div>
        <p className="text-sm leading-6 text-slate-600">{template.description}</p>
      </div>
    </article>
  )
}

function BusinessTemplateVisual({ type }: { type: string }) {
  if (type === 'invoice') {
    return (
      <div className="h-36 bg-gradient-to-b from-sky-50 to-white p-4 shadow-sm">
        <div className="h-full rounded-md border border-sky-200 bg-white p-3">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-black uppercase tracking-wider text-sky-600">Tax Invoice</span>
            <span className="rounded bg-sky-100 px-2 py-0.5 text-[8px] font-bold text-sky-700">INV-2026-0847</span>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1">
            <div className="flex items-center gap-1">
              <span className="size-1 rounded-full bg-sky-400" />
              <span className="text-[8px] text-slate-500">GSTIN: 27AAB...</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="size-1 rounded-full bg-sky-400" />
              <span className="text-[8px] text-slate-500">HSN: 8471</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="size-1 rounded-full bg-emerald-400" />
              <span className="text-[8px] text-slate-500">CGST 9%: ₹1,260</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="size-1 rounded-full bg-emerald-400" />
              <span className="text-[8px] text-slate-500">SGST 9%: ₹1,260</span>
            </div>
          </div>
          <div className="mt-2 flex items-center justify-between border-t border-dashed border-slate-200 pt-1.5">
            <span className="text-[9px] font-bold text-slate-700">Total</span>
            <span className="text-sm font-black text-slate-900">₹15,520</span>
          </div>
        </div>
      </div>
    )
  }

  if (type === 'einvoice') {
    return (
      <div className="h-36 bg-gradient-to-b from-blue-50 to-white p-4 shadow-sm">
        <div className="h-full rounded-md border border-blue-200 bg-white p-3">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-black uppercase tracking-wider text-blue-600">E-Invoice</span>
            <span className="flex items-center gap-1 rounded bg-emerald-100 px-2 py-0.5 text-[8px] font-bold text-emerald-700">
              <CheckCircle2 className="size-2.5" /> IRN Generated
            </span>
          </div>
          <div className="mt-2.5 grid gap-1.5">
            <div className="flex items-center justify-between rounded bg-slate-50 px-2 py-1">
              <span className="text-[8px] text-slate-500">IRN Number</span>
              <span className="text-[8px] font-bold text-slate-700">a1b2c3d4...f8g9</span>
            </div>
            <div className="flex items-center justify-between rounded bg-slate-50 px-2 py-1">
              <span className="text-[8px] text-slate-500">Ack. No.</span>
              <span className="text-[8px] font-bold text-slate-700">1320260847291</span>
            </div>
            <div className="flex items-center justify-between rounded bg-blue-50 px-2 py-1">
              <span className="text-[8px] text-blue-600">QR Code</span>
              <div className="grid size-5 grid-cols-3 gap-px">
                {[1,0,1,0,1,0,1,0,1].map((v, i) => (
                  <span className={`${v ? 'bg-slate-800' : 'bg-white'}`} key={i} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (type === 'dispatch') {
    return (
      <div className="h-36 bg-gradient-to-b from-emerald-50 to-white p-4 shadow-sm">
        <div className="h-full rounded-md border border-emerald-200 bg-white p-3">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-black uppercase tracking-wider text-emerald-600">E-Way Bill</span>
            <span className="rounded bg-amber-100 px-2 py-0.5 text-[8px] font-bold text-amber-700">In Transit</span>
          </div>
          <div className="mt-2.5 grid gap-1.5">
            <div className="flex items-center gap-2">
              <PackageCheck className="size-3 text-emerald-500" />
              <span className="text-[8px] text-slate-600">EWB: 3614 2587 9201</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="size-3 text-center text-[7px] font-black text-slate-400">🚚</span>
              <span className="text-[8px] text-slate-600">Vehicle: MH-12-AB-1234</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded bg-emerald-50 px-2 py-1">
                <span className="text-[7px] text-slate-400">From</span>
                <p className="text-[8px] font-bold text-slate-700">Mumbai, MH</p>
              </div>
              <div className="rounded bg-emerald-50 px-2 py-1">
                <span className="text-[7px] text-slate-400">To</span>
                <p className="text-[8px] font-bold text-slate-700">Pune, MH</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (type === 'ledger') {
    return (
      <div className="h-36 bg-gradient-to-b from-amber-50 to-white p-4 shadow-sm">
        <div className="h-full rounded-md border border-amber-200 bg-white p-3">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-black uppercase tracking-wider text-amber-600">Tally Export</span>
            <span className="rounded bg-emerald-100 px-2 py-0.5 text-[8px] font-bold text-emerald-700">Ready</span>
          </div>
          <div className="mt-2">
            <div className="grid grid-cols-[1fr_50px_50px] gap-1 border-b border-slate-200 pb-1 text-[7px] font-bold uppercase text-slate-400">
              <span>Ledger</span><span className="text-right">Debit</span><span className="text-right">Credit</span>
            </div>
            {[
              ['Sales A/c', '', '₹14,000'],
              ['CGST Output', '', '₹1,260'],
              ['Sundry Debtor', '₹15,520', ''],
            ].map(([name, dr, cr]) => (
              <div className="grid grid-cols-[1fr_50px_50px] gap-1 border-b border-dashed border-slate-100 py-1 text-[8px]" key={name}>
                <span className="text-slate-700">{name}</span>
                <span className="text-right font-bold text-rose-600">{dr}</span>
                <span className="text-right font-bold text-emerald-600">{cr}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (type === 'accountant') {
    return (
      <div className="h-36 bg-gradient-to-b from-violet-50 to-white p-4 shadow-sm">
        <div className="h-full rounded-md border border-violet-200 bg-white p-3">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-black uppercase tracking-wider text-violet-600">Team Access</span>
            <span className="rounded bg-violet-100 px-2 py-0.5 text-[8px] font-bold text-violet-700">2 Active</span>
          </div>
          <div className="mt-2 grid gap-1.5">
            {[
              { name: 'Rajesh (CA)', role: 'Accountant', access: 'Billing, Reports', color: 'bg-violet-500' },
              { name: 'Priya S.', role: 'Staff', access: 'Invoices only', color: 'bg-sky-500' },
            ].map((user) => (
              <div className="flex items-center gap-2 rounded bg-slate-50 px-2 py-1.5" key={user.name}>
                <div className={`grid size-6 place-items-center rounded-full text-[7px] font-black text-white ${user.color}`}>
                  {user.name[0]}
                </div>
                <div className="flex-1">
                  <p className="text-[8px] font-bold text-slate-800">{user.name} <span className="font-normal text-slate-400">· {user.role}</span></p>
                  <p className="text-[7px] text-slate-500">Access: {user.access}</p>
                </div>
                <ShieldCheck className="size-3 text-emerald-500" />
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (type === 'checks') {
    return (
      <div className="h-36 bg-gradient-to-b from-cyan-50 to-white p-4 shadow-sm">
        <div className="h-full rounded-md border border-cyan-200 bg-white p-3">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-black uppercase tracking-wider text-cyan-600">Pre-Save Check</span>
            <span className="text-[8px] font-bold text-emerald-600">3/3 Passed</span>
          </div>
          <div className="mt-2 grid gap-1.5">
            {[
              { label: 'GSTIN format valid', status: 'pass' },
              { label: 'Tax amount matches line items', status: 'pass' },
              { label: 'Customer address complete', status: 'pass' },
            ].map((check) => (
              <div className="flex items-center gap-2 rounded bg-emerald-50/80 px-2 py-1.5" key={check.label}>
                <CheckCircle2 className="size-3 shrink-0 text-emerald-500" />
                <span className="flex-1 text-[8px] text-slate-700">{check.label}</span>
                <span className="text-[7px] font-bold uppercase text-emerald-600">OK</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (type === 'tasks') {
    return (
      <div className="h-36 bg-gradient-to-b from-rose-50 to-white p-4 shadow-sm">
        <div className="h-full rounded-md border border-rose-200 bg-white p-3">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-black uppercase tracking-wider text-rose-600">Today's Tasks</span>
            <span className="text-[8px] font-bold text-slate-500">2 of 3 done</span>
          </div>
          <div className="mt-2 grid gap-1.5">
            {[
              { task: 'Call Sharma Electronics re: payment', done: true, assignee: 'RS' },
              { task: 'Send revised quote to BluePeak', done: true, assignee: 'AP' },
              { task: 'Follow up on pending PO #412', done: false, assignee: 'RS' },
            ].map((item) => (
              <div className="flex items-center gap-2 rounded bg-slate-50 px-2 py-1.5" key={item.task}>
                <span className={`grid size-3.5 shrink-0 place-items-center rounded border text-[7px] ${item.done ? 'border-emerald-400 bg-emerald-100 text-emerald-600' : 'border-slate-300 bg-white'}`}>
                  {item.done ? '✓' : ''}
                </span>
                <span className={`flex-1 text-[8px] ${item.done ? 'text-slate-400 line-through' : 'text-slate-700'}`}>{item.task}</span>
                <span className="grid size-4 place-items-center rounded-full bg-rose-100 text-[6px] font-black text-rose-600">{item.assignee}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (type === 'automation') {
    return (
      <div className="h-36 bg-gradient-to-b from-teal-50 to-white p-4 shadow-sm">
        <div className="h-full rounded-md border border-teal-200 bg-white p-3">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-black uppercase tracking-wider text-teal-600">Active Rule</span>
            <span className="flex items-center gap-1 rounded bg-emerald-100 px-2 py-0.5 text-[8px] font-bold text-emerald-700">
              <Zap className="size-2.5" /> Running
            </span>
          </div>
          <div className="mt-2.5 flex items-center gap-2">
            <div className="rounded border border-teal-200 bg-teal-50 px-2 py-1.5 text-center">
              <span className="text-[7px] text-teal-500">WHEN</span>
              <p className="text-[8px] font-bold text-teal-800">Invoice overdue 7d</p>
            </div>
            <ArrowRight className="size-3 shrink-0 text-teal-400" />
            <div className="rounded border border-amber-200 bg-amber-50 px-2 py-1.5 text-center">
              <span className="text-[7px] text-amber-500">THEN</span>
              <p className="text-[8px] font-bold text-amber-800">Send reminder email</p>
            </div>
            <ArrowRight className="size-3 shrink-0 text-teal-400" />
            <div className="rounded border border-blue-200 bg-blue-50 px-2 py-1.5 text-center">
              <span className="text-[7px] text-blue-500">AND</span>
              <p className="text-[8px] font-bold text-blue-800">Create task</p>
            </div>
          </div>
          <p className="mt-2 text-[7px] text-slate-400">Last triggered: 2 hours ago · 14 emails sent this month</p>
        </div>
      </div>
    )
  }

  if (type === 'reminders') {
    return (
      <div className="h-36 bg-gradient-to-b from-orange-50 to-white p-4 shadow-sm">
        <div className="h-full rounded-md border border-orange-200 bg-white p-3">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-black uppercase tracking-wider text-orange-600">Upcoming</span>
            <span className="rounded bg-orange-100 px-2 py-0.5 text-[8px] font-bold text-orange-700">3 this week</span>
          </div>
          <div className="mt-2 grid gap-1.5">
            {[
              { text: 'Payment due: Sharma Electronics', date: 'Tomorrow', urgent: true },
              { text: 'GST filing deadline', date: 'Jun 20', urgent: false },
              { text: 'Domain renewal: mysite.in', date: 'Jun 28', urgent: false },
            ].map((item) => (
              <div className="flex items-center gap-2 rounded bg-slate-50 px-2 py-1.5" key={item.text}>
                <Clock3 className={`size-3 shrink-0 ${item.urgent ? 'text-orange-500' : 'text-slate-400'}`} />
                <span className="flex-1 text-[8px] text-slate-700">{item.text}</span>
                <span className={`text-[7px] font-bold ${item.urgent ? 'text-orange-600' : 'text-slate-400'}`}>{item.date}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="grid h-36 grid-cols-3 gap-2 bg-slate-50 p-4 shadow-sm">
      {[36, 68, 52].map((height, index) => (
        <div className="flex items-end rounded-md bg-white p-2" key={height}>
          <span className={`w-full rounded-t-md ${index === 0 ? 'bg-amber-300' : index === 1 ? 'bg-teal-400' : 'bg-sky-400'}`} style={{ height: `${height}%` }} />
        </div>
      ))}
    </div>
  )
}

const whyItems = [
  {
    icon: Sparkles,
    title: 'Set up in minutes, not weeks',
    description: 'No training manuals, no onboarding calls. Your team opens Codexsun and starts working — because the screens explain themselves.',
    stat: '01',
  },
  {
    icon: Clock3,
    title: 'One tab instead of four',
    description: 'Stop copying invoice numbers from one app, pasting into another, then checking a third for payment status. Everything lives in one place.',
    stat: '02',
  },
  {
    icon: UsersRound,
    title: 'Grow without the growing pains',
    description: 'Hired your first employee? Third? Tenth? Codexsun scales with you — add users, set roles, and keep control without rebuilding anything.',
    stat: '03',
  },
]

function HomeWhySection() {
  return (
    <section className="border-t border-sky-300/20 bg-[linear-gradient(120deg,rgba(255,255,255,0.08)_0_1px,transparent_1px_34px),radial-gradient(circle_at_10%_20%,rgba(251,191,36,0.22),transparent_28%),radial-gradient(circle_at_88%_12%,rgba(34,197,94,0.18),transparent_30%),linear-gradient(135deg,#082f49_0%,#115e59_48%,#111827_100%)] py-14 text-white md:py-16">
      <div className="cx-container">
        <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <ScrollReveal direction="left" distance={32}>
            <div className="max-w-2xl">
              <p className="mb-3 text-sm font-black uppercase tracking-[0.16em] text-cyan-200">Why businesses choose Codexsun</p>
              <h2 className="text-3xl font-black leading-tight tracking-normal md:text-4xl">
                Because your business deserves better than duct-taped tools.
              </h2>
              <p className="mt-4 text-base leading-7 text-cyan-50/80">
                You've tried free invoicing apps, separate CRMs, a WordPress site, and a WhatsApp group for task tracking. It worked — until it didn't. Codexsun puts it all under one roof.
              </p>
            </div>
          </ScrollReveal>

          <div className="grid gap-3">
            {whyItems.map((item, index) => (
              <ScrollReveal delay={index * 0.08} direction="right" distance={28} key={item.title}>
                <WhyRow item={item} />
              </ScrollReveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

function WhyRow({ item }: { item: typeof whyItems[number] }) {
  const Icon = item.icon

  return (
    <article className="grid gap-4 rounded-md border border-white/15 bg-white/10 p-5 shadow-sm shadow-cyan-950/30 backdrop-blur md:grid-cols-[56px_1fr_44px] md:items-center">
      <div className="flex size-12 items-center justify-center rounded-md border border-teal-200/30 bg-teal-200/15 text-teal-100">
        <Icon className="size-6" />
      </div>
      <div>
        <h3 className="text-lg font-black">{item.title}</h3>
        <p className="mt-1 text-sm leading-6 text-cyan-50/75">{item.description}</p>
      </div>
      <span className="text-right text-2xl font-black text-fuchsia-200/50">{item.stat}</span>
    </article>
  )
}

const pricingPlans = [
  {
    button: 'Start for free',
    description: 'Establish your online presence. Get a professional website to show customers you mean business.',
    features: ['Professional public website', 'Custom company profile page', 'Basic analytics dashboard'],
    featuresHeader: 'Included features:',
    name: 'Personal',
    priceMonthly: 'Free',
    priceAnnual: 'Free',
  },
  {
    button: 'Start 14-day free trial',
    description: 'Move away from manual spreadsheets. Invoice customers, track payments, and manage client files in one place.',
    features: ['GST-compliant billing & invoices', 'Customer database & history', 'Up to 3 team member accounts'],
    featuresHeader: 'Everything in Personal, plus:',
    name: 'Startup',
    priceMonthly: 'Rs. 999',
    priceAnnual: 'Rs. 9,588',
    suffixMonthly: '/month',
    suffixAnnual: '/year',
    billedAnnually: 'Billed Rs. 799/month',
    savedAnnually: 'Save Rs. 200/month',
  },
  {
    button: 'Start 14-day free trial',
    description: 'For businesses running complex operations. Automate your follow-ups, sync dispatch & billing, and let the system run your backend.',
    features: ['Automated payment reminders', 'E-way bill & dispatch tracking', 'Priority 1-on-1 setup support'],
    featuresHeader: 'Everything in Startup, plus:',
    highlighted: true,
    name: 'Company',
    priceMonthly: 'Rs. 2,999',
    priceAnnual: 'Rs. 28,788',
    suffixMonthly: '/month',
    suffixAnnual: '/year',
    billedAnnually: 'Billed Rs. 2,399/month',
    savedAnnually: 'Save Rs. 600/month',
  },
  {
    button: 'Book a consultation',
    description: 'For custom operations. If you need bespoke workflows, legacy data migration, or specialized business modules.',
    features: ['Custom module development', 'Dedicated implementation manager', 'Unlimited team seats & custom roles'],
    featuresHeader: 'Custom requirements:',
    name: 'Enterprise',
    priceMonthly: 'Custom',
    priceAnnual: 'Custom',
  },
]

function HomePricingSection() {
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'annual'>('monthly')

  return (
    <section className="bg-[linear-gradient(180deg,#f8fafc_0%,#ffffff_100%)] px-4 py-16 text-slate-950 md:py-20">
      <div className="cx-container">
        <ScrollReveal direction="bottom" distance={28}>
          <div className="mb-10 grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.16em] text-emerald-700">Transparent pricing</p>
              <h2 className="mt-3 max-w-2xl text-4xl font-black leading-tight tracking-normal md:text-6xl">
                Fair pricing that scales with your growth.
              </h2>
            </div>
            <div className="grid gap-5 lg:justify-items-end">
              <div className="relative inline-flex w-fit items-center gap-1 rounded-full bg-white p-1 shadow-xl shadow-slate-950/8">
                <button
                  onClick={() => setBillingPeriod('monthly')}
                  className={`rounded-full px-5 py-3 text-sm font-bold transition-all ${billingPeriod === 'monthly' ? 'bg-slate-100 text-slate-950 shadow-sm' : 'text-slate-600 hover:text-slate-950'}`}
                  type="button"
                >
                  Monthly
                </button>
                <button
                  onClick={() => setBillingPeriod('annual')}
                  className={`rounded-full px-5 py-3 text-sm font-bold transition-all ${billingPeriod === 'annual' ? 'bg-slate-100 text-slate-950 shadow-sm' : 'text-slate-600 hover:text-slate-950'}`}
                  type="button"
                >
                  Annual
                </button>
                <span className="rounded-full bg-slate-950 px-4 py-3 text-xs font-black text-white">Save 20%</span>
                <span className="absolute -right-4 -top-6 rotate-[-10deg] rounded-full bg-orange-600 px-3 py-1 text-[10px] font-black uppercase text-white">
                  Big deal
                </span>
              </div>
              <p className="max-w-lg text-base leading-7 text-slate-600">
                No hidden fees. Start with what you need today, and upgrade as your team grows. All paid plans include a 14-day free trial.
              </p>
            </div>
          </div>
        </ScrollReveal>

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {pricingPlans.map((plan, index) => (
            <ScrollReveal delay={index * 0.05} direction="bottom" distance={24} key={plan.name}>
              <PricingCard billingPeriod={billingPeriod} plan={plan} />
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  )
}

function PricingCard({ plan, billingPeriod }: { plan: typeof pricingPlans[number]; billingPeriod: 'monthly' | 'annual' }) {
  const highlighted = plan.highlighted
  const isPaid = plan.name !== 'Personal' && plan.name !== 'Enterprise'
  const price = billingPeriod === 'monthly' ? plan.priceMonthly : plan.priceAnnual
  const suffix = billingPeriod === 'monthly' ? plan.suffixMonthly : plan.suffixAnnual

  return (
    <article className={`flex min-h-[490px] flex-col rounded-md border p-6 shadow-sm ${highlighted ? 'border-emerald-900 bg-[linear-gradient(160deg,#065f46_0%,#047857_100%)] text-white shadow-emerald-950/20' : 'border-slate-200 bg-white text-slate-950 shadow-slate-950/5'}`}>
      <div className="min-h-[128px]">
        <div className="flex items-center gap-2">
          <h3 className="text-2xl font-black tracking-normal">{plan.name}</h3>
          {highlighted ? <span className="rounded-full bg-amber-300 px-3 py-1 text-xs font-black text-slate-950">Recommended</span> : null}
        </div>
        <p className={`mt-5 text-sm leading-6 ${highlighted ? 'text-emerald-50/80' : 'text-slate-600'}`}>{plan.description}</p>
      </div>

      <div className={`mt-7 border-y py-7 ${highlighted ? 'border-white/12' : 'border-slate-200'}`}>
        <p className="flex items-end gap-1 text-4xl font-black leading-none tracking-normal">
          {price}
          {suffix && price !== 'Free' && price !== 'Custom' ? <span className={`pb-1 text-base font-bold ${highlighted ? 'text-emerald-50' : 'text-slate-600'}`}>{suffix}</span> : null}
        </p>
        {billingPeriod === 'annual' && isPaid ? (
          <div className="mt-2 flex flex-col gap-0.5">
            <p className={`text-xs font-bold ${highlighted ? 'text-emerald-200/95' : 'text-slate-500'}`}>
              {plan.billedAnnually}
            </p>
            <p className={`text-sm font-black ${highlighted ? 'text-lime-300' : 'text-emerald-700'}`}>
              {plan.savedAnnually}
            </p>
          </div>
        ) : (
          <div className="mt-2 h-10" />
        )}
      </div>

      <button className={`mt-7 inline-flex h-14 items-center justify-center rounded-md border px-5 text-base font-black transition ${highlighted ? 'border-white bg-white text-slate-950 hover:bg-emerald-50' : 'border-slate-950 bg-white text-slate-950 hover:bg-slate-950 hover:text-white'}`} type="button">
        {plan.button}
      </button>

      <div className="mt-7">
        <p className={`text-sm font-black ${highlighted ? 'text-white' : 'text-slate-950'}`}>{plan.featuresHeader}</p>
        <ul className="mt-4 grid gap-3">
          {plan.features.map((feature) => (
            <li className={`flex gap-3 text-sm leading-6 ${highlighted ? 'text-emerald-50' : 'text-slate-700'}`} key={feature}>
              <CheckCircle2 className={`mt-0.5 size-4 shrink-0 ${highlighted ? 'text-lime-200' : 'text-emerald-600'}`} />
              {feature}
            </li>
          ))}
        </ul>
      </div>
    </article>
  )
}

const faqItems = [
  {
    answer: 'Absolutely. You don\'t have to start from scratch. Our team will help you import your existing customer lists, pending invoices, and active product files from CSV spreadsheets or your current software so you can transition without any downtime.',
    question: 'Can I migrate my existing client and invoice data into Codexsun?',
  },
  {
    answer: 'No. Codexsun is designed with clean, straightforward screens. There are no complicated accounting codes or confusing jargon. Your sales team can create invoices and your accountant can export clean, ledger-ready data for Tally instantly from day one.',
    question: 'Does my team or accountant need prior training to use Codexsun?',
  },
  {
    answer: 'Yes. You can start simple with just a public website or basic invoicing. As your operations scale, you can easily turn on other modules like dispatch tracking, e-way bills, client lead management, and automated payment reminders.',
    question: 'Can we start with just one feature and expand later?',
  },
  {
    answer: 'When an invoice is overdue, Codexsun automatically sends a gentle, professional email reminder to the client on your behalf. You can customize the frequency (e.g., 3 days before due date, 7 days after) and check the status right on your dashboard without having to write manual emails.',
    question: 'How do automatic payment reminders work?',
  },
  {
    answer: 'For established businesses and Company/Enterprise plans, we offer custom module development. If you have unique dispatch processes, specialized reporting needs, or legacy integrations, our development team will build and deploy those features directly into your tenant workspace.',
    question: 'What if I need a custom feature specific to my business?',
  },
  {
    answer: 'None. Even on our free Personal plan, you get a fully hosted public website. On our paid Startup and Company plans, you can generate unlimited invoices, manage unlimited customer records, and track unlimited transactions without worrying about hidden caps.',
    question: 'Is there a limit on how many invoices or websites we can build?',
  },
]

function HomeFaqSection() {
  const [openIndex, setOpenIndex] = useState(0)

  return (
    <section className="overflow-hidden bg-[radial-gradient(circle_at_25%_0%,rgba(254,240,138,0.28),transparent_32%),radial-gradient(circle_at_50%_5%,rgba(187,247,208,0.32),transparent_30%),linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] px-4 py-16 text-slate-950 md:py-20">
      <div className="cx-container">
        <ScrollReveal direction="bottom" distance={28}>
          <div className="mx-auto max-w-4xl text-center">
            <h2 className="text-4xl font-normal leading-tight tracking-normal md:text-6xl">
              Have a question?
              <span className="block">We are here to answer.</span>
            </h2>
          </div>
        </ScrollReveal>

        <ScrollReveal direction="bottom" distance={28}>
          <div className="mx-auto mt-12 max-w-4xl overflow-hidden rounded-md border border-slate-200 bg-white/90 shadow-xl shadow-slate-950/5 backdrop-blur">
            {faqItems.map((item, index) => {
              const isOpen = openIndex === index

              return (
                <div className="border-b border-slate-200 last:border-b-0" key={item.question}>
                  <button
                    aria-expanded={isOpen}
                    className="flex w-full items-center justify-between gap-5 px-5 py-5 text-left md:px-6"
                    onClick={() => setOpenIndex(isOpen ? -1 : index)}
                    type="button"
                  >
                    <span className="text-lg font-black leading-7 text-slate-950">{item.question}</span>
                    <span className="grid size-9 shrink-0 place-items-center rounded-full text-slate-500">
                      {isOpen ? <X className="size-5" /> : <Plus className="size-5" />}
                    </span>
                  </button>
                  {isOpen ? (
                    <div className="px-5 pb-7 md:px-6">
                      <p className="max-w-2xl text-base leading-7 text-slate-600">{item.answer}</p>
                    </div>
                  ) : null}
                </div>
              )
            })}
          </div>
        </ScrollReveal>

        <ScrollReveal direction="bottom" distance={24}>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 text-center sm:flex-row">
            <p className="text-base text-slate-700">Have a custom workflow requirement or more questions?</p>
            <button className="inline-flex items-center justify-center rounded-md bg-slate-950 px-6 py-4 text-sm font-black text-white transition hover:bg-slate-800" type="button">
              Get in touch with us
            </button>
          </div>
        </ScrollReveal>
      </div>
    </section>
  )
}

function HomeStorySection() {
  const [activeTestimonial, setActiveTestimonial] = useState(0)

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveTestimonial((current) => (current + 1) % testimonials.length)
    }, 5200)

    return () => window.clearInterval(timer)
  }, [])

  const goToPrevious = () => {
    setActiveTestimonial((current) => (current === 0 ? testimonials.length - 1 : current - 1))
  }

  const goToNext = () => {
    setActiveTestimonial((current) => (current + 1) % testimonials.length)
  }

  return (
    <section className="bg-white px-4 py-16 text-slate-950 md:py-20">
      <div className="cx-container">
        <ScrollReveal direction="bottom" distance={28}>
          <div className="grid gap-12 lg:grid-cols-[0.78fr_auto_1.22fr] lg:items-center lg:gap-14">
            <div className="flex gap-5">
              <div className="flex size-14 shrink-0 items-center justify-center rounded-md border border-blue-200 bg-white text-blue-700 shadow-sm">
                <BriefcaseBusiness className="size-8" />
              </div>
              <div>
                <p className="text-sm font-black uppercase tracking-[0.16em] text-blue-700">Real stories</p>
                <h2 className="mt-3 text-4xl font-normal leading-tight tracking-normal">Real outcomes.</h2>
                <p className="mt-4 max-w-lg text-lg leading-8 text-slate-600">
                  From independent retail chains to regional logistics companies, business owners switched to Codexsun to reclaim hours wasted on manual tracking.
                </p>
              </div>
            </div>

            <div className="hidden h-72 w-px bg-gradient-to-b from-transparent via-slate-300 to-transparent lg:block" />

            <TestimonialSlider
              activeIndex={activeTestimonial}
              onNext={goToNext}
              onPrevious={goToPrevious}
              onSelect={setActiveTestimonial}
            />
          </div>
        </ScrollReveal>
      </div>
    </section>
  )
}

const testimonials = [
  {
    initials: 'AS',
    name: 'Aditya Sharma',
    quote: 'We used to copy billing data into three different spreadsheets. With Codexsun, we generate GST invoices, automate payment follow-ups, and track our service dispatch all under one roof.',
    role: 'Founder, Sharma Logistics & Supply',
    tone: 'bg-blue-100 text-blue-900',
  },
  {
    initials: 'VK',
    name: 'Vikas Khanna',
    quote: 'Our accounts department and dispatch desk are finally on the same page. The moment dispatch marks an item ready, the system drafts the invoice. No missed bills, no delayed dispatches.',
    role: 'Operations Director, Khanna Retail Group',
    tone: 'bg-emerald-100 text-emerald-900',
  },
  {
    initials: 'PT',
    name: 'Priya Thakur',
    quote: 'Clients love the professional client portal and public website, and our team loves not having to jump between Trello, WhatsApp, and Excel just to see who paid us.',
    role: 'Managing Partner, Peak Consulting Group',
    tone: 'bg-amber-100 text-amber-900',
  },
]

function TestimonialSlider({
  activeIndex,
  onNext,
  onPrevious,
  onSelect,
}: {
  activeIndex: number
  onNext(): void
  onPrevious(): void
  onSelect(index: number): void
}) {
  return (
    <div>
      <div className="overflow-hidden">
        <div
          className="flex transition-transform duration-700 ease-out will-change-transform"
          style={{ transform: `translateX(-${activeIndex * 100}%)` }}
        >
          {testimonials.map((testimonial) => (
            <figure className="min-h-[320px] w-full shrink-0 pr-1" key={testimonial.name}>
              <blockquote className="font-serif text-3xl leading-[1.45] text-slate-950 md:text-4xl">
                "{testimonial.quote}"
              </blockquote>
              <figcaption className="mt-8 flex items-center gap-4">
                <div className={`grid size-16 shrink-0 place-items-center rounded-full text-lg font-black ${testimonial.tone}`}>
                  {testimonial.initials}
                </div>
                <div>
                  <p className="font-black text-slate-950">{testimonial.name}</p>
                  <p className="mt-1 text-sm leading-5 text-slate-600">{testimonial.role}</p>
                </div>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>

      <div className="mt-8 flex items-center justify-between gap-4">
        <div className="flex gap-2">
          {testimonials.map((item, index) => (
            <button
              aria-label={`Show testimonial from ${item.name}`}
              className={`h-2 rounded-full transition-all ${activeIndex === index ? 'w-8 bg-sky-600' : 'w-2 bg-slate-300 hover:bg-slate-400'}`}
              key={item.name}
              onClick={() => onSelect(index)}
              type="button"
            />
          ))}
        </div>
        <div className="flex gap-2">
          <button
            aria-label="Previous testimonial"
            className="flex size-11 items-center justify-center rounded-full bg-slate-100 text-slate-700 transition hover:bg-sky-600 hover:text-white"
            onClick={onPrevious}
            type="button"
          >
            <ChevronLeft className="size-5" />
          </button>
          <button
            aria-label="Next testimonial"
            className="flex size-11 items-center justify-center rounded-full bg-slate-950 text-white transition hover:bg-sky-600"
            onClick={onNext}
            type="button"
          >
            <ChevronRight className="size-5" />
          </button>
        </div>
      </div>
    </div>
  )
}

const valueItems = [
  {
    icon: Clock3,
    title: 'Software that actually fits',
    description: 'No bloat, no clutter. We keep screens focused and language simple, so your team can use Codexsun daily without getting lost in tabs.',
  },
  {
    icon: LifeBuoy,
    title: 'Built around actual work',
    description: 'Every feature matches a task you already do: launch a website, send a GST invoice, notify a customer, or export to Tally.',
  },
  {
    icon: ShieldCheck,
    title: 'Your data, your control',
    description: 'No shared keys or security loopholes. Codexsun is structured with tenant-isolated workspaces, so your customer records remain completely secure.',
  },
  {
    icon: Zap,
    title: 'Automation with guardrails',
    description: 'We automate repetitive tasks (like sending payment reminders) without locking you out. You always see what went out and can step in anytime.',
  },
]

function HomeValuesSection() {
  return (
    <section className="bg-[linear-gradient(135deg,rgba(14,165,233,0.08)_0_1px,transparent_1px_38px),radial-gradient(circle_at_88%_8%,rgba(251,191,36,0.18),transparent_26%),linear-gradient(180deg,#ecfeff_0%,#f8fafc_100%)] px-4 py-16 text-slate-950 md:py-20">
      <div className="cx-container">
        <ScrollReveal direction="bottom" distance={28}>
          <div>
            <div className="mx-auto max-w-3xl text-center">
              <h2 className="text-4xl font-normal leading-tight tracking-normal md:text-5xl">
                The principles behind our software
              </h2>
              <div className="mx-auto mt-6 flex w-fit gap-2">
                <span className="h-1 w-8 rounded-full bg-sky-500" />
                <span className="h-1 w-8 rounded-full bg-amber-400" />
                <span className="h-1 w-8 rounded-full bg-emerald-500" />
              </div>
            </div>
            <div className="mt-12 grid gap-x-14 gap-y-12 border-t border-slate-200 pt-12 md:grid-cols-2">
              {valueItems.map((item, index) => (
                <ScrollReveal delay={index * 0.07} direction={index % 2 === 0 ? 'left' : 'right'} distance={26} key={item.title}>
                  <ValueItem item={item} />
                </ScrollReveal>
              ))}
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  )
}

function ValueItem({ item }: { item: typeof valueItems[number] }) {
  const Icon = item.icon

  return (
    <article className="grid gap-5 sm:grid-cols-[56px_1fr]">
      <div className="flex size-14 items-center justify-center rounded-full border border-sky-200 bg-white text-sky-700 shadow-sm shadow-sky-950/5">
        <Icon className="size-7" />
      </div>
      <div>
        <h3 className="text-3xl font-normal leading-tight tracking-normal">{item.title}</h3>
        <p className="mt-4 max-w-xl text-base leading-8 text-slate-600">{item.description}</p>
      </div>
    </article>
  )
}

const blogPosts = [
  {
    author: 'Codexsun Team',
    category: 'Business Growth',
    date: '16 Nov 2026',
    description: 'A detailed look at how copying data between billing, dispatch, and Excel drains hours from your team and leads to costly manual errors.',
    image: 'https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=900&q=80',
    title: 'The true cost of duplicate data entry in growing businesses',
  },
  {
    author: 'Codexsun Team',
    category: 'Customer Experience',
    date: '20 Dec 2026',
    description: 'Stop using your website as just a digital brochure. Learn how letting clients view active quotes and download invoices on your site saves hours of support calls.',
    image: 'https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=900&q=80',
    title: 'Turning your public website into a customer-first portal',
  },
  {
    author: 'Codexsun Team',
    category: 'Operational Efficiency',
    date: '22 Dec 2026',
    description: 'Forget complex accounting reports. Here are the 5 critical numbers—from pending payments to dispatch bottlenecks—you need to monitor daily.',
    image: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=900&q=80',
    title: '5 metrics every business owner should see first thing in the morning',
  },
]

function HomeBlogsSection() {
  return (
    <section className="bg-white px-4 py-16 text-slate-950 md:py-20">
      <div className="cx-container">
        <ScrollReveal direction="bottom" distance={28}>
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-black uppercase tracking-[0.16em] text-blue-700">Blogs</p>
            <h2 className="mt-3 text-3xl font-black leading-tight tracking-normal md:text-5xl">
              Read our latest tips and tricks
            </h2>
            <div className="mx-auto mt-6 flex w-fit gap-2">
              <span className="h-1 w-8 rounded-full bg-sky-500" />
              <span className="h-1 w-8 rounded-full bg-amber-400" />
              <span className="h-1 w-8 rounded-full bg-emerald-500" />
            </div>
          </div>
        </ScrollReveal>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {blogPosts.map((post, index) => (
            <ScrollReveal delay={index * 0.06} direction="bottom" distance={26} key={post.title}>
              <BlogCard post={post} />
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  )
}

function BlogCard({ post }: { post: typeof blogPosts[number] }) {
  return (
    <article className="group h-full overflow-hidden rounded-md border border-slate-100 bg-white shadow-lg shadow-slate-950/5 transition duration-300 hover:-translate-y-2 hover:shadow-2xl hover:shadow-blue-950/12">
      <div className="relative overflow-hidden">
        <img
          alt={post.title}
          className="h-72 w-full object-cover transition duration-500 group-hover:scale-105"
          src={post.image}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/18 to-transparent opacity-0 transition group-hover:opacity-100" />
        <span className="absolute bottom-5 right-5 rounded-full bg-blue-700 px-5 py-2 text-xs font-black text-white shadow-lg shadow-blue-950/20">
          {post.category}
        </span>
      </div>

      <div className="p-6">
        <div className="mb-4 flex flex-wrap gap-x-5 gap-y-2 text-xs font-medium text-slate-600">
          <span className="inline-flex items-center gap-2">
            <CalendarDays className="size-4 text-blue-700" />
            {post.date}
          </span>
          <span className="inline-flex items-center gap-2">
            <UserRound className="size-4 text-blue-700" />
            {post.author}
          </span>
        </div>

        <h3 className="text-xl font-black leading-7 tracking-normal text-slate-950 transition group-hover:text-blue-700">
          {post.title}
        </h3>
        <p className="mt-4 text-sm leading-7 text-slate-600">{post.description}</p>
        <button className="mt-5 inline-flex items-center gap-2 text-sm font-black text-slate-950 transition hover:text-blue-700" type="button">
          Learn more
          <ArrowRight className="size-4 transition group-hover:translate-x-1" />
        </button>
      </div>
    </article>
  )
}

function HomeFinalCta() {
  return (
    <section className="bg-white px-4 py-16 text-slate-950 md:py-20">
      <div className="cx-container">
        <ScrollReveal direction="bottom" distance={30}>
          <div className="grid overflow-hidden rounded-md border border-slate-200 bg-[linear-gradient(135deg,rgba(245,158,11,0.12)_0_1px,transparent_1px_34px),linear-gradient(120deg,#ecfeff_0%,#ffffff_48%,#fefce8_100%)] shadow-xl shadow-slate-950/5 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="p-8 md:p-12">
              <p className="text-sm font-black uppercase tracking-[0.16em] text-sky-700">Simplify your operations</p>
              <h2 className="mt-4 text-4xl font-black leading-tight tracking-normal md:text-5xl">
                Stop juggling tools. Start growing your business.
              </h2>
              <p className="mt-5 max-w-xl text-lg leading-8 text-slate-600">
                Reclaim your time. Move your website, billing, client files, and daily team workflows into one fast, integrated workspace. All paid plans include a 14-day free trial.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <button className="inline-flex items-center gap-2 rounded-md bg-sky-600 px-6 py-3 text-sm font-black uppercase tracking-wide text-white transition hover:bg-sky-700" type="button">
                  Start your free trial
                  <ArrowRight className="size-4" />
                </button>
                <button className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-6 py-3 text-sm font-black uppercase tracking-wide text-slate-800 transition hover:border-slate-500" type="button">
                  Schedule a demo
                  <ArrowRight className="size-4" />
                </button>
              </div>
            </div>
            <div className="grid gap-4 p-6 md:grid-cols-2 md:p-8">
              {ctaConcepts.map((concept) => (
                <CtaConceptCard concept={concept} key={concept.title} />
              ))}
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  )
}

const ctaConcepts = [
  {
    accent: 'border-sky-200 bg-sky-50 text-sky-700',
    description: 'Publish professional web pages, sliders, and lead forms so new customers find you and see you are established.',
    icon: Globe2,
    title: 'Public brand website',
    visual: 'website',
  },
  {
    accent: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    description: 'Showcase your products, active catalog offers, and enquiry sheets from a single, clean online store.',
    icon: Store,
    title: 'Digital storefront',
    visual: 'store',
  },
  {
    accent: 'border-rose-200 bg-rose-50 text-rose-700',
    description: 'Generate GST invoices and record customer receipts while automated workflows remind clients when bills are due.',
    icon: ReceiptText,
    title: 'Invoices & payment tracking',
    visual: 'billing',
  },
  {
    accent: 'border-amber-200 bg-amber-50 text-amber-700',
    description: 'Track daily task lists, pending payment follow-ups, and customer feedback without hopping between apps.',
    icon: BarChart3,
    title: 'Team operations desk',
    visual: 'dashboard',
  },
]

function CtaConceptCard({ concept }: { concept: typeof ctaConcepts[number] }) {
  const Icon = concept.icon

  return (
    <article className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-950/10">
      <CtaConceptVisual type={concept.visual} />
      <div className="p-5">
        <div className={`mb-4 flex size-11 items-center justify-center rounded-md border ${concept.accent}`}>
          <Icon className="size-6" />
        </div>
        <h3 className="text-xl font-black tracking-normal text-slate-950">{concept.title}</h3>
        <p className="mt-2 text-sm leading-6 text-slate-600">{concept.description}</p>
      </div>
    </article>
  )
}

function CtaConceptVisual({ type }: { type: string }) {
  if (type === 'website') {
    return (
      <div className="h-32 bg-[linear-gradient(135deg,#e0f2fe,#ffffff)] p-4">
        <div className="h-full rounded-md border border-sky-200 bg-white p-3 shadow-sm">
          <div className="h-3 w-24 rounded-full bg-sky-500" />
          <div className="mt-3 h-5 w-36 rounded-md bg-slate-900" />
          <div className="mt-2 h-2 w-44 rounded-full bg-slate-200" />
          <div className="mt-4 grid grid-cols-3 gap-2">
            <span className="h-8 rounded-md bg-sky-100" />
            <span className="h-8 rounded-md bg-emerald-100" />
            <span className="h-8 rounded-md bg-amber-100" />
          </div>
        </div>
      </div>
    )
  }

  if (type === 'store') {
    return (
      <div className="h-32 bg-[linear-gradient(135deg,#dcfce7,#ffffff)] p-4">
        <div className="grid h-full grid-cols-3 gap-2">
          {['bg-emerald-200', 'bg-sky-200', 'bg-amber-200'].map((tone, index) => (
            <div className="rounded-md border border-white/80 bg-white p-2 shadow-sm" key={tone}>
              <div className={`h-12 rounded-md ${tone}`} />
              <div className="mt-2 h-2 rounded-full bg-slate-200" />
              <div className={`mt-2 h-3 w-12 rounded-full ${index === 1 ? 'bg-emerald-500' : 'bg-slate-300'}`} />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (type === 'billing') {
    return (
      <div className="h-32 bg-[linear-gradient(135deg,#ffe4e6,#ffffff)] p-4">
        <div className="relative h-full">
          <div className="absolute left-8 top-1 h-24 w-36 rotate-[-5deg] rounded-md border border-rose-100 bg-white shadow-sm" />
          <div className="absolute left-14 top-3 h-24 w-36 rounded-md border border-rose-200 bg-white p-3 shadow-md">
            <div className="h-3 w-16 rounded-full bg-rose-500" />
            <div className="mt-3 h-2 w-24 rounded-full bg-slate-200" />
            <div className="mt-2 h-2 w-28 rounded-full bg-slate-200" />
            <div className="mt-5 h-5 w-20 rounded-md bg-slate-900" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-32 bg-[linear-gradient(135deg,#fef3c7,#ffffff)] p-4">
      <div className="grid h-full grid-cols-[1.2fr_0.8fr] gap-3">
        <div className="rounded-md border border-amber-200 bg-white p-3 shadow-sm">
          <div className="flex h-full items-end gap-2">
            {[42, 68, 54, 86, 72].map((height) => (
              <span className="flex-1 rounded-t-md bg-amber-400" key={height} style={{ height: `${height}%` }} />
            ))}
          </div>
        </div>
        <div className="grid gap-2">
          <span className="rounded-md bg-white shadow-sm" />
          <span className="rounded-md bg-white shadow-sm" />
          <span className="rounded-md bg-white shadow-sm" />
        </div>
      </div>
    </div>
  )
}

function StaticHomeHero({ tenantName }: { tenantName: string }) {
  return (
    <div className="flex h-[calc(100svh-10rem)] min-h-[420px] items-center bg-[radial-gradient(circle_at_20%_20%,rgba(37,99,235,0.14),transparent_32%),linear-gradient(135deg,#0f172a,#111827_48%,#172554)] text-white">
      <div className="cx-container max-w-5xl">
        <p className="mb-4 text-sm font-bold uppercase tracking-[0.18em] text-blue-200">Stop juggling. Start building.</p>
        <h1 className="max-w-4xl text-4xl font-black leading-tight md:text-6xl">
          {tenantName} — one workspace for your entire business.
        </h1>
        <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-200 md:text-xl">
          No more switching between five different tools. Your website, billing, customers, and daily operations live together — so nothing falls through the cracks.
        </p>
      </div>
    </div>
  )
}
