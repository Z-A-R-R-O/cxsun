import {
  BarChart3,
  BadgePercent,
  Banknote,
  Barcode,
  BookOpenText,
  Boxes,
  Brush,
  Building2,
  CalendarDays,
  ContactRound,
  CircleDollarSign,
  CreditCard,
  FileCog,
  FileText,
  Globe2,
  Hash,
  Image,
  Landmark,
  Layers3,
  LayoutDashboard,
  Link2,
  Map,
  MapPinned,
  MapPin,
  Megaphone,
  Package,
  PackageSearch,
  Palette,
  ReceiptText,
  Ruler,
  Scale,
  Settings,
  Shapes,
  ShoppingBag,
  Tags,
  Truck,
  UserRoundCog,
  UsersRound,
  Warehouse,
  type LucideIcon,
} from "lucide-react"

import type { DashboardPage } from "src/components/blocks/sidebar/app-sidebar"

export type DashboardAppId = "application" | "billing" | "media" | "ecommerce" | "crm" | "inventory" | "sites"

export interface DashboardAppMenuItem {
  title: string
  page: DashboardPage
  icon: LucideIcon
  items?: DashboardAppMenuItem[]
}

export interface DashboardAppMenuGroup {
  title: string
  icon: LucideIcon
  items: DashboardAppMenuItem[]
}

export interface DashboardAppDefinition {
  id: DashboardAppId
  name: string
  shortName: string
  description: string
  status: "core" | "active" | "disabled"
  accent: string
  icon: LucideIcon
  menuGroups: DashboardAppMenuGroup[]
  menu: DashboardAppMenuItem[]
}

function item(appId: DashboardAppId, slug: string, title: string, icon: LucideIcon): DashboardAppMenuItem {
  return { title, page: `app-${appId}-${slug}`, icon }
}

function withMenu(definition: Omit<DashboardAppDefinition, "menu">): DashboardAppDefinition {
  return {
    ...definition,
    menu: [
      { title: `${definition.name} Desk`, page: "app-dashboard", icon: LayoutDashboard },
      ...definition.menuGroups.flatMap((group) => group.items.flatMap(flattenMenuItem)),
    ],
  }
}

function flattenMenuItem(menuItem: DashboardAppMenuItem): DashboardAppMenuItem[] {
  return [menuItem, ...(menuItem.items?.flatMap(flattenMenuItem) ?? [])]
}

export const dashboardApps: DashboardAppDefinition[] = [
  withMenu({
    id: "application",
    name: "Application",
    shortName: "Application",
    description: "Shared workspace, company setup, tenant roles, and cross-app launch desk.",
    status: "core",
    accent: "bg-slate-950 text-white",
    icon: LayoutDashboard,
    menuGroups: [
      {
        title: "Application",
        icon: LayoutDashboard,
        items: [
          { title: "Dashboard", page: "overview", icon: LayoutDashboard },
          { title: "Company", page: "company", icon: Building2 },
          { ...item("application", "default-company", "Default Company", Building2) },
          { title: "Roles", page: "tenant-roles", icon: Settings },
        ],
      },
    ],
  }),
  withMenu({
    id: "billing",
    name: "Billing",
    shortName: "Billing",
    description: "Sales, purchase, receipt, payment, report, master, common, and billing settings.",
    status: "active",
    accent: "bg-emerald-600 text-white",
    icon: ReceiptText,
    menuGroups: [
      { title: "Entries", icon: FileText, items: [item("billing", "sales", "Sales", FileText), item("billing", "purchase", "Purchase", ReceiptText), item("billing", "receipts", "Receipts", ReceiptText), item("billing", "payments", "Payments", CreditCard)] },
      { title: "Report", icon: BarChart3, items: [item("billing", "customer-statement", "Customer Statement", BarChart3), item("billing", "supplier-statement", "Supplier Statement", BarChart3), item("billing", "gst-report", "GST Report", BarChart3)] },
      { title: "Master", icon: PackageSearch, items: [item("billing", "contact", "Contact", UsersRound), item("billing", "product", "Product", PackageSearch), item("billing", "order", "Order", ShoppingBag)] },
      {
        title: "Common",
        icon: MapPin,
        items: [
          { ...item("billing", "location", "Location", MapPinned), items: [item("billing", "country", "Countries", Globe2), item("billing", "state", "States", Map), item("billing", "district", "Districts", Landmark), item("billing", "city", "Cities", Building2), item("billing", "pincode", "Pincodes", Hash)] },
          { ...item("billing", "contacts-common", "Contacts", UsersRound), items: [item("billing", "contact-group", "Groups", ContactRound), item("billing", "contact-type", "Types", UserRoundCog), item("billing", "address-type", "Address Types", MapPin), item("billing", "bank-name", "Bank Names", Banknote)] },
          { ...item("billing", "product-common", "Product", Package), items: [item("billing", "product-group", "Product Groups", Layers3), item("billing", "category", "Product Categories", Shapes), item("billing", "product-type", "Product Types", PackageSearch), item("billing", "unit", "Units", Scale), item("billing", "hsn-code", "HSN Codes", Barcode), item("billing", "tax", "Taxes", BadgePercent), item("billing", "brand", "Brands", Tags), item("billing", "colour", "Colours", Palette), item("billing", "size", "Sizes", Ruler), item("billing", "style", "Styles", Brush)] },
          { ...item("billing", "orders-common", "Orders", ShoppingBag), items: [item("billing", "order-type", "Order Types", ReceiptText), item("billing", "transport", "Transports", Truck), item("billing", "warehouse", "Warehouses", Warehouse), item("billing", "destination", "Destinations", MapPinned), item("billing", "stock-rejection-type", "Stock Rejection Types", FileText)] },
          { ...item("billing", "others-common", "Others", Settings), items: [item("billing", "currency", "Currencies", CircleDollarSign), item("billing", "payment-term", "Payment Terms", CreditCard), item("billing", "month", "Months", CalendarDays)] },
        ],
      },
      { title: "Settings", icon: Settings, items: [item("billing", "settings", "Sales Settings", Settings), item("billing", "document-settings", "Document Settings", FileCog), item("billing", "accounting-year", "Accounting Year", CalendarDays)] },
    ],
  }),
  withMenu({
    id: "media",
    name: "Media",
    shortName: "Media",
    description: "Central media library for uploads, private/public files, browsing, sharing, and cross-module links.",
    status: "active",
    accent: "bg-sky-600 text-white",
    icon: Image,
    menuGroups: [
      { title: "Library", icon: Image, items: [item("media", "library", "Media Library", Image)] },
      { title: "Management", icon: Settings, items: [item("media", "links", "Links", Link2), item("media", "sharing", "Sharing", Globe2)] },
    ],
  }),
  withMenu({
    id: "ecommerce",
    name: "Ecommerce",
    shortName: "Ecommerce",
    description: "Storefront catalog, orders, customers, fulfillment, marketing, reports, and commerce settings.",
    status: "active",
    accent: "bg-orange-600 text-white",
    icon: ShoppingBag,
    menuGroups: [
      { title: "Storefront", icon: ShoppingBag, items: [item("ecommerce", "dashboard", "Store Desk", LayoutDashboard), item("ecommerce", "orders", "Orders", ShoppingBag), item("ecommerce", "carts", "Carts", ShoppingBag), item("ecommerce", "checkout", "Checkout", CreditCard)] },
      { title: "Catalog", icon: PackageSearch, items: [item("ecommerce", "products", "Products", PackageSearch), item("ecommerce", "categories", "Categories", Tags), item("ecommerce", "collections", "Collections", Boxes), item("ecommerce", "variants", "Variants", Boxes)] },
      { title: "Customers", icon: UsersRound, items: [item("ecommerce", "customers", "Customers", UsersRound), item("ecommerce", "wishlists", "Wishlists", ShoppingBag), item("ecommerce", "reviews", "Reviews", BookOpenText)] },
      { title: "Fulfillment", icon: Truck, items: [item("ecommerce", "shipping", "Shipping", Truck), item("ecommerce", "delivery-zones", "Delivery Zones", MapPin), item("ecommerce", "returns", "Returns", ReceiptText)] },
      { title: "Marketing", icon: Megaphone, items: [item("ecommerce", "coupons", "Coupons", Tags), item("ecommerce", "campaigns", "Campaigns", Megaphone), item("ecommerce", "seo", "SEO", Megaphone)] },
      { title: "Reports", icon: BarChart3, items: [item("ecommerce", "sales-report", "Sales Report", BarChart3), item("ecommerce", "product-report", "Product Report", BarChart3), item("ecommerce", "customer-report", "Customer Report", BarChart3)] },
      { title: "Settings", icon: Settings, items: [item("ecommerce", "settings", "Store Settings", Settings), item("ecommerce", "payment-gateway", "Payment Gateway", CreditCard), item("ecommerce", "tax-settings", "Tax Settings", CircleDollarSign)] },
    ],
  }),
  withMenu({
    id: "crm",
    name: "CRM",
    shortName: "CRM",
    description: "Leads, contacts, deals, activities, pipelines, campaigns, reports, and CRM settings.",
    status: "active",
    accent: "bg-rose-600 text-white",
    icon: UsersRound,
    menuGroups: [
      { title: "Pipeline", icon: UsersRound, items: [item("crm", "leads", "Leads", UsersRound), item("crm", "deals", "Deals", CircleDollarSign), item("crm", "pipeline", "Pipeline", BarChart3)] },
      { title: "People", icon: UsersRound, items: [item("crm", "contacts", "Contacts", UsersRound), item("crm", "accounts", "Accounts", Building2), item("crm", "segments", "Segments", Tags)] },
      { title: "Activity", icon: FileText, items: [item("crm", "tasks", "Tasks", FileText), item("crm", "calls", "Calls", FileText), item("crm", "meetings", "Meetings", FileText)] },
      { title: "Campaign", icon: Megaphone, items: [item("crm", "campaigns", "Campaigns", Megaphone), item("crm", "email", "Email", FileText), item("crm", "automation", "Automation", Settings)] },
      { title: "Reports", icon: BarChart3, items: [item("crm", "sales-report", "Sales Report", BarChart3), item("crm", "lead-report", "Lead Report", BarChart3), item("crm", "activity-report", "Activity Report", BarChart3)] },
      { title: "Settings", icon: Settings, items: [item("crm", "settings", "CRM Settings", Settings), item("crm", "stages", "Stages", Settings), item("crm", "sources", "Sources", Tags)] },
    ],
  }),
  withMenu({
    id: "inventory",
    name: "Inventory",
    shortName: "Inventory",
    description: "Items, stock, warehouses, transfers, purchase, suppliers, reports, and inventory settings.",
    status: "active",
    accent: "bg-indigo-600 text-white",
    icon: Boxes,
    menuGroups: [
      { title: "Stock", icon: Boxes, items: [item("inventory", "items", "Items", PackageSearch), item("inventory", "stock", "Stock", Boxes), item("inventory", "adjustments", "Adjustments", FileCog)] },
      { title: "Warehouse", icon: Warehouse, items: [item("inventory", "warehouses", "Warehouses", Warehouse), item("inventory", "bins", "Bins", Boxes), item("inventory", "transfers", "Transfers", Truck)] },
      { title: "Purchase", icon: ReceiptText, items: [item("inventory", "purchase", "Purchase", ReceiptText), item("inventory", "suppliers", "Suppliers", UsersRound), item("inventory", "receipts", "Receipts", ReceiptText)] },
      { title: "Product Common", icon: PackageSearch, items: [item("inventory", "category", "Category", Tags), item("inventory", "brand", "Brand", Tags), item("inventory", "unit", "Unit", Boxes)] },
      { title: "Reports", icon: BarChart3, items: [item("inventory", "stock-report", "Stock Report", BarChart3), item("inventory", "movement-report", "Movement Report", BarChart3), item("inventory", "valuation-report", "Valuation Report", BarChart3)] },
      { title: "Settings", icon: Settings, items: [item("inventory", "settings", "Inventory Settings", Settings), item("inventory", "reorder-rules", "Reorder Rules", Settings), item("inventory", "barcode", "Barcode", FileCog)] },
    ],
  }),
  withMenu({
    id: "sites",
    name: "Sites",
    shortName: "Sites",
    description: "Public sites, CMS content, media, menus, forms, domains, campaigns, analytics, and site settings.",
    status: "active",
    accent: "bg-violet-600 text-white",
    icon: Globe2,
    menuGroups: [
      { title: "Sites", icon: Globe2, items: [item("sites", "sites", "Sites", Globe2), item("sites", "landing-pages", "Landing Pages", FileText), item("sites", "domains", "Domains", Globe2)] },
      { title: "Content", icon: BookOpenText, items: [item("sites", "pages", "Pages", FileText), item("sites", "posts", "Posts", BookOpenText), item("sites", "blocks", "Blocks", Boxes), item("sites", "templates", "Templates", FileText), item("sites", "sections", "Sections", Boxes)] },
      { title: "Media", icon: Image, items: [item("sites", "media-library", "Media Library", Image), item("sites", "folders", "Folders", Boxes), item("sites", "banners", "Banners", Image), item("sites", "assets", "Assets", Image)] },
      { title: "Site Structure", icon: Globe2, items: [item("sites", "menus", "Menus", Globe2), item("sites", "navigation", "Navigation", Globe2), item("sites", "redirects", "Redirects", Globe2)] },
      { title: "Lead Capture", icon: UsersRound, items: [item("sites", "forms", "Forms", FileText), item("sites", "submissions", "Submissions", UsersRound), item("sites", "crm-sync", "CRM Sync", UsersRound)] },
      { title: "Publishing", icon: Megaphone, items: [item("sites", "campaigns", "Campaigns", Megaphone), item("sites", "seo", "SEO", Megaphone), item("sites", "schedule", "Schedule", FileCog), item("sites", "analytics", "Analytics", BarChart3)] },
      { title: "Settings", icon: Settings, items: [item("sites", "settings", "Site Settings", Settings), item("sites", "theme", "Theme", Image), item("sites", "integrations", "Integrations", Settings)] },
    ],
  }),
]

export const appModulePages: DashboardPage[] = dashboardApps.flatMap((app) => app.menu.map((menuItem) => menuItem.page))

export const defaultEnabledApps: Record<DashboardAppId, boolean> = dashboardApps.reduce(
  (current, app) => ({ ...current, [app.id]: app.status !== "disabled" }),
  {} as Record<DashboardAppId, boolean>,
)

export function getDashboardApp(appId: DashboardAppId) {
  return dashboardApps.find((app) => app.id === appId) ?? dashboardApps[0]
}

export function isDashboardAppId(value: string): value is DashboardAppId {
  return dashboardApps.some((app) => app.id === value)
}
