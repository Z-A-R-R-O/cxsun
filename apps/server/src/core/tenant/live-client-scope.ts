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
    domains: ['aaran.codexsun.com', 'office.codexsun.com', 'aaran.local'],
    companies: ['Aaran Associates'],
    apps: ['application', 'accounts', 'billing', 'mail', 'taskmanager', 'crm', 'sites', 'auditor'],
    landingApp: 'auditor',
    requirements: ['auditor-office', 'client-assist', 'gst-follow-up', 'software-back-office'],
    notes: 'Auditor office and back-office team who maintains and assists CXSun clients.',
  },
]

export const localClientHostnames = Array.from(new Set(liveClientScopes.flatMap((client) => client.domains))).sort()
