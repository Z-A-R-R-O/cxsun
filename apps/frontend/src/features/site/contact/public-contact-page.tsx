import { useState } from 'react'
import { Clock, Mail, MapPin, Phone, Send } from 'lucide-react'
import { toast } from 'sonner'
import { ScrollReveal } from 'src/features/site/motion/scroll-reveal'
import type { SiteContent, TenantStaticSiteContent } from 'src/features/site/domain/site-content'
import { apiBaseUrl } from 'src/lib/api-base-url'

interface PublicContactPageProps {
  content: SiteContent
  tenantSite: TenantStaticSiteContent | null
}

export function PublicContactPage({ content, tenantSite }: PublicContactPageProps) {
  const page = content.pages.find((p) => p.slug === 'contact')
  const tenantEmail = tenantSite?.tenant ? `hello@${tenantSite.tenant.slug}.com` : 'hello@codexsun.com'

  if (!page) return null

  return (
    <main className="overflow-x-clip bg-slate-50 text-slate-950">
      {/* Premium Hero */}
      <section className="relative overflow-hidden bg-[radial-gradient(circle_at_20%_20%,rgba(14,165,233,0.15),transparent_32%),linear-gradient(135deg,#0f172a,#111827_50%,#1e1b4b)] py-20 text-white md:py-28">
        <div className="cx-container relative z-10 max-w-4xl text-center">
          <ScrollReveal direction="bottom" distance={24}>
            <p className="text-sm font-black uppercase tracking-[0.18em] text-cyan-300">Get in touch</p>
            <h1 className="mt-4 text-4xl font-black leading-tight tracking-normal sm:text-5xl md:text-6xl bg-gradient-to-r from-white via-cyan-100 to-sky-300 bg-clip-text text-transparent">
              {page.title}
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-slate-300 md:text-xl">
              {page.summary}
            </p>
          </ScrollReveal>
        </div>
      </section>

      {/* Main Form & details section */}
      <section className="py-16 md:py-24">
        <div className="cx-container">
          <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-start max-w-6xl mx-auto">
            {/* Details */}
            <ScrollReveal direction="left" distance={30}>
              <div className="grid gap-6">
                <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h2 className="text-2xl font-black text-slate-950">Contact Information</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {page.body}
                  </p>

                  <div className="mt-8 space-y-5">
                    <div className="flex gap-4">
                      <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-sky-50 text-sky-700">
                        <Mail className="size-5" />
                      </span>
                      <div>
                        <strong className="block text-sm font-black text-slate-900">Email us</strong>
                        <span className="mt-1 block text-sm text-slate-600">{tenantEmail}</span>
                      </div>
                    </div>

                    <div className="flex gap-4">
                      <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
                        <Phone className="size-5" />
                      </span>
                      <div>
                        <strong className="block text-sm font-black text-slate-900">Call support</strong>
                        <span className="mt-1 block text-sm text-slate-600">+91 98765 43210</span>
                      </div>
                    </div>

                    <div className="flex gap-4">
                      <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-700">
                        <Clock className="size-5" />
                      </span>
                      <div>
                        <strong className="block text-sm font-black text-slate-900">Business hours</strong>
                        <span className="mt-1 block text-sm text-slate-600">Monday - Friday: 9 AM - 6 PM</span>
                      </div>
                    </div>

                    <div className="flex gap-4">
                      <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-rose-50 text-rose-700">
                        <MapPin className="size-5" />
                      </span>
                      <div>
                        <strong className="block text-sm font-black text-slate-900">Headquarters</strong>
                        <span className="mt-1 block text-sm text-slate-600">Mumbai, Maharashtra, India</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-sky-50/50 p-6">
                  <h3 className="text-lg font-black text-sky-950">Onboarding assistance</h3>
                  <p className="mt-2 text-sm leading-6 text-sky-800">
                    Need help configuring your custom billing layouts or migrating from spreadsheet lists? Contact us to schedule a 1-on-1 walkthrough.
                  </p>
                </div>
              </div>
            </ScrollReveal>

            {/* Glassmorphic Form Card */}
            <ScrollReveal direction="right" distance={30}>
              <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-lg md:p-10">
                <h3 className="text-2xl font-black text-slate-950">Send us a message</h3>
                <p className="mt-2 text-sm text-slate-600">
                  Fill out the form below and our operations desk will route your request.
                </p>
                <ContactForm domain={tenantSite?.tenant?.slug || ''} />
              </div>
            </ScrollReveal>
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
    <form className="mt-8 grid gap-5" onSubmit={handleSubmit}>
      <div className="grid gap-2">
        <label className="text-sm font-bold text-slate-700" htmlFor="contact-name">Name</label>
        <input
          className="w-full rounded-md border border-slate-200 bg-slate-50 p-3.5 text-sm transition focus:border-sky-500 focus:bg-white focus:outline-none"
          id="contact-name"
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter your full name"
          required
          type="text"
          value={name}
        />
      </div>
      <div className="grid gap-2">
        <label className="text-sm font-bold text-slate-700" htmlFor="contact-email">Email</label>
        <input
          className="w-full rounded-md border border-slate-200 bg-slate-50 p-3.5 text-sm transition focus:border-sky-500 focus:bg-white focus:outline-none"
          id="contact-email"
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter your business email"
          required
          type="email"
          value={email}
        />
      </div>
      <div className="grid gap-2">
        <label className="text-sm font-bold text-slate-700" htmlFor="contact-message">Message</label>
        <textarea
          className="w-full rounded-md border border-slate-200 bg-slate-50 p-3.5 text-sm transition focus:border-sky-500 focus:bg-white focus:outline-none"
          id="contact-message"
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Tell us what your business needs..."
          required
          rows={5}
          value={message}
        />
      </div>
      <button
        className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-md bg-slate-950 px-6 font-black uppercase tracking-wide text-white transition hover:bg-slate-800 disabled:opacity-50"
        disabled={loading}
        type="submit"
      >
        {loading ? 'Sending...' : 'Send message'}
        {!loading && <Send className="size-4" />}
      </button>
    </form>
  )
}
