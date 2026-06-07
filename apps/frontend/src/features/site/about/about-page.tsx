import { Briefcase, Heart, Sparkles, Trophy, Users } from 'lucide-react'
import { ScrollReveal } from 'src/features/site/motion/scroll-reveal'
import type { SiteContent, TenantStaticSiteContent } from 'src/features/site/domain/site-content'
import { APP_NAME } from 'src/lib/branding'

interface PublicAboutPageProps {
  content: SiteContent
  tenantSite: TenantStaticSiteContent | null
}

export function PublicAboutPage({ content, tenantSite }: PublicAboutPageProps) {
  const page = content.pages.find((p) => p.slug === 'about')
  const tenantName = tenantSite?.tenant?.name ?? APP_NAME

  if (!page) return null

  const stats = [
    { label: 'Time saved weekly', value: '10+ hrs', icon: Sparkles },
    { label: 'Satisfied teams', value: '500+', icon: Users },
    { label: 'GST compliance rate', value: '100%', icon: Trophy },
    { label: 'Workflows unified', value: '9 modules', icon: Briefcase },
  ]

  const milestones = [
    {
      year: '2024',
      title: 'Duct-Taped Tools Pain',
      description: 'Founders realized small teams spend hours daily copying data between separate invoicing, Excel sheets, and Tally apps.',
    },
    {
      year: '2025',
      title: 'Core Workspace Launch',
      description: 'Codexsun launched its core website, billing, and accounting suite to bring sales and customer logs into one database.',
    },
    {
      year: '2026',
      title: 'Connected Business Growth',
      description: 'Expanded modular feature sets to include dispatch, e-way bills, automation triggers, and isolated tenant databases.',
    },
  ]

  return (
    <main className="overflow-x-clip bg-slate-50 text-slate-950">
      {/* Premium Hero */}
      <section className="relative overflow-hidden bg-[radial-gradient(circle_at_30%_20%,rgba(14,165,233,0.15),transparent_32%),linear-gradient(135deg,#0f172a,#111827_50%,#1e1b4b)] py-20 text-white md:py-28">
        <div className="cx-container relative z-10 max-w-4xl text-center">
          <ScrollReveal direction="bottom" distance={24}>
            <p className="text-sm font-black uppercase tracking-[0.18em] text-cyan-300">Our Mission</p>
            <h1 className="mt-4 text-4xl font-black leading-tight tracking-normal sm:text-5xl md:text-6xl bg-gradient-to-r from-white via-cyan-100 to-sky-300 bg-clip-text text-transparent">
              {page.title}
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-slate-300 md:text-xl">
              {page.summary}
            </p>
          </ScrollReveal>
        </div>
      </section>

      {/* Stats Section */}
      <section className="relative -mt-10 z-10 px-4">
        <div className="cx-container max-w-5xl">
          <div className="grid gap-5 rounded-xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-900/5 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map((stat, index) => {
              const Icon = stat.icon
              return (
                <ScrollReveal delay={index * 0.05} direction="bottom" distance={16} key={stat.label}>
                  <div className="flex items-center gap-4 p-2">
                    <span className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-sky-50 text-sky-700">
                      <Icon className="size-6" />
                    </span>
                    <div>
                      <strong className="block text-2xl font-black text-slate-900">{stat.value}</strong>
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-500">{stat.label}</span>
                    </div>
                  </div>
                </ScrollReveal>
              )
            })}
          </div>
        </div>
      </section>

      {/* Story & Body Section */}
      <section className="py-16 md:py-24">
        <div className="cx-container max-w-4xl">
          <ScrollReveal direction="bottom" distance={28}>
            <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm md:p-12">
              <div className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-md bg-rose-50 text-rose-600">
                  <Heart className="size-5 fill-rose-600" />
                </span>
                <h2 className="text-2xl font-black text-slate-950">Why we built {tenantName}</h2>
              </div>
              <p className="mt-6 text-lg leading-8 text-slate-700 whitespace-pre-line">
                {page.body}
              </p>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Timeline Section */}
      <section className="bg-white py-16 md:py-24">
        <div className="cx-container max-w-4xl">
          <ScrollReveal direction="bottom" distance={28}>
            <div className="text-center">
              <p className="text-sm font-black uppercase tracking-[0.16em] text-sky-700">Timeline</p>
              <h2 className="mt-2 text-3xl font-black md:text-4xl text-slate-950">Our Journey</h2>
            </div>
          </ScrollReveal>

          <div className="relative mt-12 pl-6 before:absolute before:inset-y-0 before:left-[11px] before:w-0.5 before:bg-slate-200">
            {milestones.map((milestone, index) => (
              <ScrollReveal delay={index * 0.08} direction="left" distance={20} key={milestone.year}>
                <div className="relative mb-10 pl-8 last:mb-0">
                  <span className="absolute -left-[30px] top-1.5 flex size-6 items-center justify-center rounded-full border-4 border-white bg-sky-600 shadow-sm ring-1 ring-slate-200" />
                  <div>
                    <span className="inline-block rounded bg-sky-50 px-2.5 py-0.5 text-xs font-black text-sky-700">
                      {milestone.year}
                    </span>
                    <h3 className="mt-2 text-xl font-black text-slate-950">{milestone.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{milestone.description}</p>
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>
    </main>
  )
}
