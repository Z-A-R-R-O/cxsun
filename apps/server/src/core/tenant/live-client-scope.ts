export type LiveClientIndustry =
  | 'auditor_office'
  | 'shared_billing'
  | 'offset_printing'
  | 'garment_manufacturing'
  | 'fabric_trading'
  | 'upvc'
  | 'ecommerce'
  | 'sports_club'
  | 'garment_testing_lab'
  | 'business_connect'
  | 'tirupur_connect'

export interface LiveClientScope {
  code: number
  slug: string
  name: string
  corporateId: string
  industry: LiveClientIndustry
  industryName: string
  database: string
  domains: string[]
  companies: string[]
  apps: string[]
  landingApp: string
  requirements: string[]
  notes: string
  seedDomains?: boolean
}

export const liveClientScopes: LiveClientScope[] = [
  {
    code: 115,
    slug: 'tirupur_connect',
    name: 'Tirupur Connect',
    corporateId: 'TIRUPUR_CONNECT',
    industry: 'tirupur_connect',
    industryName: 'Tirupur Connect Marketplace',
    database: 'tirupur_connect_db',
    domains: ['tirupurconnect.com', 'www.tirupurconnect.com', 'tirupurconnect.local'],
    companies: ['Tirupur Connect'],
    apps: ['application', 'tirupur-connect', 'sites', 'crm', 'mail'],
    landingApp: 'tirupur-connect',
    requirements: ['tirupur-connect-marketplace', 'marketplace-admin', 'supplier-publication-api', 'domain-owned-rfq-leads-messages'],
    notes: 'Central Tirupur Connect marketplace tenant. Client workspaces publish supplier/product profiles here through API only; RFQ, leads, messages, membership, and analytics belong to this tenant.',
    seedDomains: true,
  },
  {
    code: 101,
    slug: 'codexsun',
    name: 'CODEXSUN Shared Billing',
    corporateId: 'CODEXSUN',
    industry: 'shared_billing',
    industryName: 'Shared Billing Platform',
    database: 'codexsun_db',
    domains: ['codexsun.com', 'www.codexsun.com', 'codexsun.local'],
    companies: ['CODEXSUN'],
    apps: ['application', 'accounts', 'billing', 'mail', 'sites'],
    landingApp: 'billing',
    requirements: ['shared-domain-billing', 'subdomain-routing', 'nginx-ready'],
    notes: 'Shared billing tenant used by clients before moving to subdomain or client-owned domains.',
  },
  {
    code: 100,
    slug: 'aaran_associates',
    name: 'Aaran Associates',
    corporateId: 'AARAN_ASSOCIATES',
    industry: 'auditor_office',
    industryName: 'Auditor Office / Software Back Office',
    database: 'aaran_associates_db',
    domains: ['office.aaran.org', 'aaran.org', 'www.aaran.org', 'aaran.codexsun.com', 'office.codexsun.com', 'aaran.local'],
    companies: ['Aaran Associates'],
    apps: ['application', 'accounts', 'billing', 'mail', 'taskmanager', 'crm', 'sites', 'auditor'],
    landingApp: 'auditor',
    requirements: ['auditor-office', 'client-assist', 'gst-follow-up', 'software-back-office'],
    notes: 'Auditor office and back-office team who maintains and assists CXSun clients.',
    seedDomains: true,
  },
  {
    code: 110,
    slug: 'tirupur_direct',
    name: 'Tirupur Direct',
    corporateId: 'TIRUPUR_DIRECT',
    industry: 'ecommerce',
    industryName: 'Ecommerce / Garments Sales',
    database: 'tirupur_direct_db',
    domains: ['tirupurdirect.com', 'www.tirupurdirect.com', 'tirupurdirect.codexsun.com', 'tirupurdirect.local'],
    companies: ['Tirupur Direct'],
    apps: ['application', 'ecommerce', 'billing', 'inventory', 'sites', 'mail'],
    landingApp: 'ecommerce',
    requirements: ['ecommerce-storefront', 'garments-sales', 'billing-inventory'],
    notes: 'Garment ecommerce and direct sales tenant with owned-domain storefront routing.',
    seedDomains: true,
  },
  {
    code: 111,
    slug: 'deal_o_deal',
    name: 'Deal O Deal',
    corporateId: 'DEAL_O_DEAL',
    industry: 'ecommerce',
    industryName: 'Ecommerce / Computer Seconds Store',
    database: 'deal_o_deal_db',
    domains: ['dealodeal.com', 'www.dealodeal.com', 'dealodeal.codexsun.com'],
    companies: ['Deal O Deal'],
    apps: ['application', 'ecommerce', 'billing', 'inventory', 'sites', 'mail'],
    landingApp: 'ecommerce',
    requirements: ['ecommerce-storefront', 'computer-seconds-store', 'billing-inventory'],
    notes: 'Deal O Deal ecommerce tenant with owned-domain storefront routing.',
    seedDomains: true,
  },
  {
    code: 112,
    slug: 'tenkasi_sports',
    name: 'Tenkasi Sports',
    corporateId: 'TENKASI_SPORTS',
    industry: 'sports_club',
    industryName: 'Sports Club',
    database: 'tenkasi_sports_db',
    domains: ['tenkasisports.com', 'www.tenkasisports.com', 'tenkasisports.codexsun.com', 'tenkasisports.local'],
    companies: ['Tenkasi Sports'],
    apps: ['application', 'sports-club', 'billing', 'sites', 'mail'],
    landingApp: 'sports-club',
    requirements: ['sports-club', 'student-management', 'subscriptions-attendance'],
    notes: 'Sports club tenant with public domain routing and club workspace scope.',
    seedDomains: true,
  },
  {
    code: 116,
    slug: 'the_tirupur_textiles',
    name: 'The Tirupur Textiles',
    corporateId: 'THE_TIRUPUR_TEXTILES',
    industry: 'garment_manufacturing',
    industryName: 'Garment Manufacturing',
    database: 'the_tirupur_textiles_db',
    domains: ['thetirupurtextiles.com', 'www.thetirupurtextiles.com'],
    companies: ['The Tirupur Textiles'],
    apps: ['application', 'garment', 'billing', 'inventory', 'sites', 'mail'],
    landingApp: 'garment',
    requirements: ['garment-manufacturing', 'billing-inventory', 'public-catalog'],
    notes: 'Garment manufacturing tenant with owned-domain public catalog routing.',
    seedDomains: true,
  },
]

export const localClientHostnames = Array.from(new Set(liveClientScopes.flatMap((client) => client.domains))).sort()
