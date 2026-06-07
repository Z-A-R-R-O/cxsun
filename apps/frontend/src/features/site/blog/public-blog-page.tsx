import { useState } from 'react'
import { ArrowRight, CalendarDays, UserRound } from 'lucide-react'
import { ScrollReveal } from 'src/features/site/motion/scroll-reveal'
import type { SiteContent, TenantStaticSiteContent } from 'src/features/site/domain/site-content'

interface PublicBlogPageProps {
  content: SiteContent
  tenantSite: TenantStaticSiteContent | null
}

const defaultBlogPosts = [
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

export function PublicBlogPage({ content }: PublicBlogPageProps) {
  const page = content.pages.find((p) => p.slug === 'blog')
  const [selectedCategory, setSelectedCategory] = useState('All')

  if (!page) return null

  // Map API posts to match fallback layout structure
  const apiPosts = (content.posts || []).map((post, index) => {
    const defaultMeta = defaultBlogPosts[index % defaultBlogPosts.length]
    return {
      author: 'Codexsun Team',
      category: index % 2 === 0 ? 'Business Growth' : 'Operational Efficiency',
      date: post.published_at,
      description: post.excerpt,
      image: defaultMeta.image,
      title: post.title,
    }
  })

  const posts = apiPosts.length > 0 ? apiPosts : defaultBlogPosts

  const categories = ['All', 'Business Growth', 'Customer Experience', 'Operational Efficiency']

  const filteredPosts = selectedCategory === 'All'
    ? posts
    : posts.filter((post) => post.category === selectedCategory)

  return (
    <main className="overflow-x-clip bg-slate-50 text-slate-950">
      {/* Premium Hero */}
      <section className="relative overflow-hidden bg-[radial-gradient(circle_at_20%_20%,rgba(14,165,233,0.15),transparent_32%),linear-gradient(135deg,#0f172a,#111827_50%,#1e1b4b)] py-20 text-white md:py-28">
        <div className="cx-container relative z-10 max-w-4xl text-center">
          <ScrollReveal direction="bottom" distance={24}>
            <p className="text-sm font-black uppercase tracking-[0.18em] text-cyan-300">Blog & Insights</p>
            <h1 className="mt-4 text-4xl font-black leading-tight tracking-normal sm:text-5xl md:text-6xl bg-gradient-to-r from-white via-cyan-100 to-sky-300 bg-clip-text text-transparent">
              {page.title}
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-slate-300 md:text-xl">
              {page.summary}
            </p>
          </ScrollReveal>
        </div>
      </section>

      {/* Category filters */}
      <section className="py-8 bg-white border-b border-slate-200">
        <div className="cx-container max-w-6xl mx-auto flex flex-wrap gap-2 justify-center">
          {categories.map((category) => (
            <button
              className={`rounded-full px-5 py-2 text-xs font-black uppercase tracking-wider transition ${selectedCategory === category ? 'bg-slate-950 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              key={category}
              onClick={() => setSelectedCategory(category)}
              type="button"
            >
              {category}
            </button>
          ))}
        </div>
      </section>

      {/* Posts Grid */}
      <section className="py-16 md:py-24">
        <div className="cx-container max-w-6xl mx-auto">
          {filteredPosts.length > 0 ? (
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              {filteredPosts.map((post, index) => (
                <ScrollReveal delay={index * 0.06} direction="bottom" distance={26} key={post.title}>
                  <article className="group flex flex-col h-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition duration-300 hover:-translate-y-2 hover:shadow-xl hover:shadow-sky-950/5">
                    <div className="relative overflow-hidden h-52">
                      <img
                        alt={post.title}
                        className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                        src={post.image}
                      />
                      <span className="absolute bottom-4 right-4 rounded-full bg-sky-600 px-4 py-1.5 text-[10px] font-black uppercase tracking-wider text-white">
                        {post.category}
                      </span>
                    </div>

                    <div className="flex flex-col flex-1 p-6">
                      <div className="mb-4 flex flex-wrap gap-4 text-xs font-bold text-slate-500">
                        <span className="inline-flex items-center gap-1.5">
                          <CalendarDays className="size-4 text-sky-600" />
                          {post.date}
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <UserRound className="size-4 text-sky-600" />
                          {post.author}
                        </span>
                      </div>

                      <h3 className="text-xl font-black leading-snug text-slate-950 transition group-hover:text-sky-600">
                        {post.title}
                      </h3>
                      <p className="mt-3 text-sm leading-6 text-slate-600 flex-1">{post.description}</p>
                      
                      <button className="mt-5 inline-flex items-center gap-1.5 text-sm font-black text-slate-950 transition hover:text-sky-600" type="button">
                        Learn more
                        <ArrowRight className="size-4 transition group-hover:translate-x-1" />
                      </button>
                    </div>
                  </article>
                </ScrollReveal>
              ))}
            </div>
          ) : (
            <div className="text-center py-20">
              <p className="text-lg text-slate-600 font-semibold">No posts found in this category.</p>
            </div>
          )}
        </div>
      </section>
    </main>
  )
}
