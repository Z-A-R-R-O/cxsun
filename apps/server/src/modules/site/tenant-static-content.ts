export interface TenantStaticContentInput {
  tenantName: string
  industryKey?: string | null
  industryName?: string | null
  enabledApps: string[]
  landingApp: string
  companies?: string[]
  domain?: string | null
  requirements?: string[]
  tenantSlug?: string | null
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
  const homeProfile = tenantHomeProfile(input, profile, companyLine)

  return [
    {
      slug: 'home',
      nav_label: 'Home',
      title: homeProfile.title,
      eyebrow: homeProfile.eyebrow,
      summary: homeProfile.summary,
      body: [
        homeProfile.body,
        input.domain ? `Public domain: ${input.domain}.` : '',
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

interface TenantHomeProfile {
  eyebrow: string
  title: string
  summary: string
  body: string
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

const tenantHomeProfiles: Record<string, TenantHomeProfile> = {
  codexsun: {
    eyebrow: 'CODEXSUN Shared Billing',
    title: 'CODEXSUN Shared Billing and business workspace',
    summary: 'A shared billing tenant for Codexsun operations, customer accounts, invoices, receipts, mail, and public support entry points.',
    body: 'This domain is the Codexsun operating tenant. It keeps shared billing, mail, account follow-up, and future client migration support under one strict tenant boundary.',
  },
  aaran_associates: {
    eyebrow: 'Aaran Associates',
    title: 'Aaran Associates auditor office and software service desk',
    summary: 'A client service workspace for statutory follow-up, GST filing support, credentials, CRM tasks, billing, and mail operations.',
    body: 'This domain belongs to Aaran Associates. It is shaped for auditor-office work: client details, compliance reminders, document requests, staff tasks, GST filing records, and client assistance from one protected tenant workspace.',
  },
  tirupur_direct: {
    eyebrow: 'Tirupur Direct',
    title: 'Tirupur Direct garment ecommerce and billing desk',
    summary: 'A garment sales tenant for storefront content, product discovery, inventory movement, billing, order follow-up, and customer support.',
    body: 'This domain is prepared for Tirupur Direct as a garment ecommerce tenant. The public home page introduces the storefront, while the tenant workspace keeps product catalog, billing, stock, delivery, and mail workflows together.',
  },
  deal_o_deal: {
    eyebrow: 'Deal O Deal',
    title: 'Deal O Deal ecommerce workspace for computer seconds and offers',
    summary: 'A deal-focused ecommerce tenant for product offers, stock visibility, customer enquiries, billing, inventory, and mail follow-up.',
    body: 'This domain is prepared for Deal O Deal. The static home page points customers toward current product offers and enquiries, while the private workspace manages ecommerce, billing, inventory, and order communication.',
  },
  tenkasi_sports: {
    eyebrow: 'Tenkasi Sports',
    title: 'Tenkasi Sports club management and member portal',
    summary: 'A sports club tenant for memberships, students, batches, subscriptions, attendance, billing, and member-facing communication.',
    body: 'This domain is prepared for Tenkasi Sports. The public home page introduces the club, coaching, subscription, and membership path, while the tenant workspace can grow into students, masters, attendance, fees, and communication.',
  },
  the_tirupur_textiles: {
    eyebrow: 'The Tirupur Textiles',
    title: 'The Tirupur Textiles garment manufacturing and catalog desk',
    summary: 'A garment manufacturing tenant for product catalog presentation, billing, inventory, statutory documents, and production workflow expansion.',
    body: 'This domain is prepared for The Tirupur Textiles. The public page introduces garment manufacturing and catalog readiness, while the workspace keeps billing, inventory, styles, sizes, colours, stock, and future production movement under one tenant.',
  },
  tirupur_connect: {
    eyebrow: 'Tirupur Connect',
    title: 'Tirupur Connect marketplace for verified suppliers and global buyers',
    summary: 'The central Tirupur marketplace tenant for approved suppliers, product publications, open RFQs, inquiry capture, membership, messaging, and review workflows.',
    body: 'This domain owns the Tirupur Connect marketplace boundary. Client tenants publish supplier and product profiles here through review APIs; RFQs, leads, messages, membership, and analytics remain central marketplace data.',
  },
}

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
  tirupur_connect: {
    eyebrow: 'Tirupur Connect',
    homeTitle: 'marketplace',
    summary: () => 'Tirupur Connect is ready for verified supplier discovery, product publication, RFQs, leads, membership, messaging, and marketplace analytics.',
    body: 'This tenant is the central Tirupur Connect marketplace. Client workspaces publish supplier and product profiles into this domain through API review flow; marketplace-side RFQs, leads, messages, membership, and analytics stay isolated here.',
    about: 'The marketplace profile is prepared for Tirupur garment suppliers, global buyers, public directory pages, RFQ operations, membership plans, and review workflows.',
    contact: 'Send supplier onboarding, buyer sourcing, RFQ, membership, or marketplace partnership enquiries.',
    post: 'Tirupur Connect marketplace pages are active with strict domain-owned marketplace data.',
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

function tenantHomeProfile(input: TenantStaticContentInput, profile: IndustryProfile, companyLine: string): TenantHomeProfile {
  const key = input.tenantSlug ?? domainProfileKey(input.domain)
  const exact = key ? tenantHomeProfiles[key] : undefined
  if (exact) {
    return exact
  }

  return {
    eyebrow: input.industryName ?? profile.eyebrow,
    title: `${input.tenantName} ${profile.homeTitle}`,
    summary: profile.summary(companyLine),
    body: profile.body,
  }
}

function domainProfileKey(domain: string | null | undefined) {
  const normalized = domain?.toLowerCase().replace(/^www\./, '').trim()
  if (!normalized) return ''

  if (normalized.endsWith('aaran.org') || normalized.includes('aaran.')) return 'aaran_associates'
  if (normalized.includes('tirupurdirect')) return 'tirupur_direct'
  if (normalized.includes('dealodeal')) return 'deal_o_deal'
  if (normalized.includes('tenkasisports')) return 'tenkasi_sports'
  if (normalized.includes('thetirupurtextiles')) return 'the_tirupur_textiles'
  if (normalized.includes('tirupurconnect')) return 'tirupur_connect'
  if (normalized.includes('codexsun')) return 'codexsun'
  return ''
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
    {
      app: 'tirupur-connect',
      slug: 'tirupur-connect',
      navLabel: 'Tirupur Connect',
      title: 'marketplace',
      eyebrow: 'Tirupur Connect',
      summary: 'Verified Tirupur supplier profiles, trade products, RFQs, leads, membership, messages, and analytics.',
      body: 'This page belongs to the central Tirupur Connect marketplace tenant. Client tenants publish supplier and product profiles here by API only.',
    },
  ]
}
