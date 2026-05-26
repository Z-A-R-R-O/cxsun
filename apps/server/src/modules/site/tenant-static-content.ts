export interface TenantStaticContentInput {
  tenantName: string
  industryKey?: string | null
  industryName?: string | null
  enabledApps: string[]
  landingApp: string
  companies?: string[]
  requirements?: string[]
}

export interface TenantStaticPage {
  slug: string
  nav_label: string
  title: string
  eyebrow: string
  summary: string
  body: string
  sort_order: number
}

export interface TenantStaticService {
  id: number
  title: string
  description: string
  sort_order: number
}

export interface TenantStaticPost {
  id: number
  title: string
  excerpt: string
  published_at: string
  sort_order: number
}

export function buildTenantStaticContent(input: TenantStaticContentInput) {
  const profile = industryProfiles[input.industryKey ?? ''] ?? industryProfiles.default
  const apps = appPageDefinitions().filter((page) => input.enabledApps.includes(page.app))
  const appPages = apps.map((page, index) => ({
    slug: page.slug,
    nav_label: page.navLabel,
    title: `${input.tenantName} ${page.title}`,
    eyebrow: page.eyebrow,
    summary: page.summary,
    body: page.body,
    sort_order: 10 + index,
  }))

  return {
    pages: [
      ...tenantBasePages(input, profile),
      ...appPages,
    ],
    services: apps.map((page, index) => ({
      id: index + 1,
      title: page.navLabel,
      description: page.summary,
      sort_order: index + 1,
    })),
    posts: tenantPosts(input, profile),
  }
}

export function appLandingPage(app: string) {
  return appPageDefinitions().find((page) => page.app === app)?.slug ?? 'services'
}

export function publicAppPageSlug(app: string) {
  return appPageDefinitions().find((page) => page.app === app)?.slug
}

export function publicAppKeys() {
  return appPageDefinitions().map((page) => page.app)
}

function tenantBasePages(input: TenantStaticContentInput, profile: IndustryProfile): TenantStaticPage[] {
  const companyLine = companySummary(input.companies)
  const primaryApp = appPageDefinitions().find((page) => page.app === input.landingApp)
  const capabilityLine = readableList(input.requirements?.map(readableToken) ?? [])

  return [
    {
      slug: 'home',
      nav_label: 'Home',
      title: `${input.tenantName} ${profile.homeTitle}`,
      eyebrow: input.industryName ?? profile.eyebrow,
      summary: profile.summary(companyLine),
      body: [
        profile.body,
        primaryApp ? `Primary app: ${primaryApp.navLabel}.` : '',
        capabilityLine ? `Configured scope: ${capabilityLine}.` : '',
      ].filter(Boolean).join(' '),
      sort_order: 1,
    },
    {
      slug: 'about',
      nav_label: 'About',
      title: `About ${input.tenantName}`,
      eyebrow: 'About',
      summary: companyLine
        ? `${input.tenantName} currently operates ${companyLine}.`
        : `${input.tenantName} is configured as a strict domain-bound tenant.`,
      body: profile.about,
      sort_order: 2,
    },
    {
      slug: 'contact',
      nav_label: 'Contact',
      title: `Contact ${input.tenantName}`,
      eyebrow: 'Contact',
      summary: profile.contact,
      body: 'Enquiries from this public page stay under the resolved tenant domain, ready for tenant-local routing and follow-up.',
      sort_order: 90,
    },
  ]
}

function tenantPosts(input: TenantStaticContentInput, profile: IndustryProfile): TenantStaticPost[] {
  return [
    {
      id: 1,
      title: `${input.tenantName} tenant site is active`,
      excerpt: profile.post,
      published_at: stablePublishedDate,
      sort_order: 1,
    },
  ]
}

function companySummary(companies: string[] | undefined) {
  if (!companies || companies.length === 0) return ''
  if (companies.length === 1) return companies[0]
  return readableList(companies)
}

function readableList(values: string[]) {
  if (values.length === 0) return ''
  if (values.length === 1) return values[0]
  return `${values.slice(0, -1).join(', ')} and ${values.at(-1)}`
}

function readableToken(value: string) {
  return value.split('-').filter(Boolean).join(' ')
}

interface IndustryProfile {
  eyebrow: string
  homeTitle: string
  body: string
  about: string
  contact: string
  post: string
  summary(companyLine: string): string
}

const stablePublishedDate = '2026-05-26'

const industryProfiles: Record<string, IndustryProfile> = {
  auditor_office: {
    eyebrow: 'Auditor Office',
    homeTitle: 'client service desk',
    summary: (companyLine) => `${companyLine || 'The office'} is ready for client assistance, compliance follow-up, and software back-office work.`,
    body: 'This tenant is shaped for auditor-office operations: client files, statutory reminders, document requests, staff tasks, and service tracking.',
    about: 'The office profile is prepared for client onboarding, GST and filing work, internal assignments, and recurring service support.',
    contact: 'Send client service requests, document handover notes, or support enquiries to the office team.',
    post: 'Auditor-office public pages are connected to the tenant boundary and ready for client service workflows.',
  },
  shared_billing: {
    eyebrow: 'Billing Platform',
    homeTitle: 'billing workspace',
    summary: () => 'Billing, receipts, statements, and customer account entry points are available from this tenant domain.',
    body: 'This tenant is the CODEXSUN billing workspace for shared billing operations and future subdomain migration.',
    about: 'The billing workspace keeps invoicing, receipts, payments, and customer balances in a domain-bound tenant.',
    contact: 'Use this page for billing support, invoice questions, and account follow-up.',
    post: 'Shared billing pages are connected with strict tenant resolution.',
  },
  offset_printing: {
    eyebrow: 'Offset Printing',
    homeTitle: 'printing job desk',
    summary: (companyLine) => `${companyLine || 'This printer'} is ready for estimates, billing, accounts, and print job tracking.`,
    body: 'This tenant is shaped for offset printing work: estimates, proof approval, job cards, production status, delivery, billing, and account follow-up.',
    about: 'The printing profile is ready for paper, plate, colour, finishing, and customer job history details.',
    contact: 'Send print enquiries, estimate requests, proof notes, and billing questions.',
    post: 'Offset printing pages are active with billing and accounts app binding.',
  },
  garment_manufacturing: {
    eyebrow: 'Garment Manufacturing',
    homeTitle: 'manufacturing desk',
    summary: (companyLine) => `${companyLine || 'This garment unit'} is ready for billing, accounts, e-invoice, e-way, inventory, and garment workflow expansion.`,
    body: 'This tenant is shaped for garment manufacturing: styles, sizes, colours, job work, production movement, stock, billing, and statutory documents.',
    about: 'The garment profile can expand into BOM, cutting, stitching, finishing, packing, dispatch, and WIP reporting without splitting the codebase.',
    contact: 'Send order, billing, dispatch, job-work, or account enquiries to this garment tenant.',
    post: 'Garment manufacturing pages are connected to tenant-specific app options.',
  },
  fabric_trading: {
    eyebrow: 'Fabric Trading',
    homeTitle: 'fabric trading desk',
    summary: (companyLine) => `${companyLine || 'This trader'} is ready for fabric billing, accounts, inventory, e-invoice, and e-way workflows.`,
    body: 'This tenant is shaped for fabric trading: stock, lots, customer billing, supplier follow-up, payments, and dispatch documents.',
    about: 'The fabric profile is prepared for inventory movement, customer balances, purchase/sales flow, and statutory billing.',
    contact: 'Send fabric purchase, sales, stock, billing, or account enquiries.',
    post: 'Fabric trading pages are active with billing and inventory app binding.',
  },
  upvc: {
    eyebrow: 'UPVC',
    homeTitle: 'billing and order desk',
    summary: (companyLine) => `${companyLine || 'This UPVC business'} is ready for billing, accounts, inventory, and e-way workflow.`,
    body: 'This tenant is shaped for UPVC work: customer orders, product movement, delivery documents, billing, and account follow-up.',
    about: 'The UPVC profile can grow into measurements, item configuration, stock, delivery, and service tracking.',
    contact: 'Send UPVC order, quote, delivery, billing, or account enquiries.',
    post: 'UPVC pages are connected under the corrected local tenant domain.',
  },
  ecommerce: {
    eyebrow: 'Ecommerce',
    homeTitle: 'storefront',
    summary: (companyLine) => `${companyLine || 'This store'} is ready for catalog, checkout, orders, billing, and stock workflows.`,
    body: 'This tenant is shaped for ecommerce operations: product catalog, customer orders, stock, checkout, billing, and order tracking.',
    about: 'The ecommerce profile is prepared for tenant-owned storefront content and authenticated operations from the same codebase.',
    contact: 'Send order, product, payment, delivery, or support enquiries.',
    post: 'Ecommerce pages are active with storefront app binding.',
  },
  sports_club: {
    eyebrow: 'Sports Club',
    homeTitle: 'club management desk',
    summary: (companyLine) => `${companyLine || 'This club'} is ready for students, masters, subscriptions, attendance, and club communication.`,
    body: 'This tenant is shaped for sports club operations: members, students, masters, batches, attendance, subscriptions, and communication.',
    about: 'The sports profile is ready for member management, trainer coordination, schedules, fees, and progress tracking.',
    contact: 'Send membership, batch, fee, attendance, or coaching enquiries.',
    post: 'Sports club pages are active with club app binding.',
  },
  garment_testing_lab: {
    eyebrow: 'Testing Lab',
    homeTitle: 'report desk',
    summary: (companyLine) => `${companyLine || 'This lab'} is ready for samples, testing reports, customer files, and lab workflow.`,
    body: 'This tenant is shaped for garment testing lab work: sample intake, report generation, customer files, review flow, and report delivery.',
    about: 'The lab profile is prepared for test parameters, report templates, sample status, media, and customer access.',
    contact: 'Send testing, sample, report, or customer file enquiries.',
    post: 'Testing lab pages are active with report workflow binding.',
  },
  business_connect: {
    eyebrow: 'Business Connect',
    homeTitle: 'business network',
    summary: (companyLine) => `${companyLine || 'This network'} is ready for business profiles, enquiries, lead connection, and member discovery.`,
    body: 'This tenant is shaped for business connection work: profiles, enquiries, lead routing, member discovery, and CRM follow-up.',
    about: 'The business-connect profile is ready to grow into an IndiaMART-style local business directory and enquiry platform.',
    contact: 'Send business listing, lead, partnership, or member enquiries.',
    post: 'Business connect pages are active with CRM and site app binding.',
  },
  default: {
    eyebrow: 'Tenant Workspace',
    homeTitle: 'workspace',
    summary: (companyLine) => `${companyLine || 'This tenant'} is ready for domain-bound apps and content.`,
    body: 'This tenant uses strict domain resolution and app options to select the correct public surface.',
    about: 'The tenant profile is prepared for custom industry content and tenant-owned app modules.',
    contact: 'Send tenant enquiries through this domain-bound contact page.',
    post: 'Tenant pages are active through strict domain resolution.',
  },
}

function appPageDefinitions() {
  return [
    {
      app: 'billing',
      slug: 'billing',
      navLabel: 'Billing',
      title: 'billing portal',
      eyebrow: 'Billing',
      summary: 'Invoices, receipts, payments, customer balances, and statement entry points.',
      body: 'Use this page for billing help, payment instructions, customer login links, invoice status, and account follow-up.',
    },
    {
      app: 'ecommerce',
      slug: 'shop',
      navLabel: 'Shop',
      title: 'storefront',
      eyebrow: 'Ecommerce',
      summary: 'Catalog, product discovery, cart, checkout, and order tracking surfaces.',
      body: 'The storefront route is ready to connect catalog, stock, customer, and order APIs under the resolved tenant.',
    },
    {
      app: 'inventory',
      slug: 'inventory',
      navLabel: 'Inventory',
      title: 'inventory desk',
      eyebrow: 'Inventory',
      summary: 'Stock availability, inward/outward movement, delivery, and item tracking.',
      body: 'Use this page for stock availability, delivery note tracking, inward/outward flow, and item movement.',
    },
    {
      app: 'accounts',
      slug: 'accounts',
      navLabel: 'Accounts',
      title: 'accounts desk',
      eyebrow: 'Accounts',
      summary: 'Ledger, vouchers, outstanding balances, and financial report entry points.',
      body: 'The accounts page is ready for ledger, voucher, outstanding, customer balance, and report workflows.',
    },
    {
      app: 'auditor',
      slug: 'auditor',
      navLabel: 'Auditor',
      title: 'auditor office',
      eyebrow: 'Auditor Office',
      summary: 'Client files, compliance tasks, document requests, and staff review flow.',
      body: 'This page becomes the public and client-facing portal for auditor office tenants.',
    },
    {
      app: 'sports-club',
      slug: 'club',
      navLabel: 'Club',
      title: 'sports club portal',
      eyebrow: 'Sports Club',
      summary: 'Membership, subscription, attendance, booking, and member communication pages.',
      body: 'The sports club page is ready for student, master, batch, attendance, fee, and member-facing workflows.',
    },
    {
      app: 'garment',
      slug: 'garment',
      navLabel: 'Garment',
      title: 'garment manufacturing desk',
      eyebrow: 'Garment',
      summary: 'Style, colour, size, BOM, production, job work, and WIP movement entry points.',
      body: 'This page keeps garment manufacturing as a tenant feature pack, ready for production and statutory billing flows.',
    },
    {
      app: 'offset',
      slug: 'offset',
      navLabel: 'Offset',
      title: 'offset billing desk',
      eyebrow: 'Offset Printing',
      summary: 'Estimates, job cards, production stages, proof approval, and job profitability.',
      body: 'Offset printing pages are prepared for industry-specific document, costing, proof, production, and delivery flows.',
    },
    {
      app: 'testing-lab',
      slug: 'testing-lab',
      navLabel: 'Testing Lab',
      title: 'testing lab desk',
      eyebrow: 'Testing Lab',
      summary: 'Testing reports, customer files, sample tracking, and lab workflow entry points.',
      body: 'The testing lab page is ready for sample tracking, report generation, review, and customer report delivery.',
    },
    {
      app: 'business-connect',
      slug: 'business-connect',
      navLabel: 'Business Connect',
      title: 'business connect portal',
      eyebrow: 'Business Connect',
      summary: 'Business directory, lead connection, enquiry flow, and member profiles.',
      body: 'This page prepares business directory, enquiry capture, lead routing, and member profile workflows.',
    },
  ]
}
