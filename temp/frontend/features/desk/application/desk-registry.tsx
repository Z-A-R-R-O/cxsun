import type { ReactNode } from "react";
import {
  Building2,
  CalendarDays,
  ClipboardList,
  Crown,
  Factory,
  Inbox,
  LayoutDashboard,
  ReceiptText,
  Settings,
  ShieldCheck,
  Store,
  Truck,
  Users,
  Workflow,
} from "lucide-react";

export type DeskPortalId =
  | "cxsun"
  | "customer"
  | "vendor"
  | "admin"
  | "super-admin"
  | "tenant"
  | "industry"
  | "company"
  | "default-company"
  | "contact"
  | "billing";

export interface DeskMenuItem {
  readonly id: string;
  readonly label: string;
  readonly href: string;
  readonly icon: ReactNode;
}

export interface DeskPortalDefinition {
  readonly id: DeskPortalId;
  readonly label: string;
  readonly href: string;
  readonly badge: string;
  readonly summary: string;
  readonly menuItems: readonly DeskMenuItem[];
}

function portalHref(portalId: DeskPortalId, section?: string) {
  return section ? `/desk/${portalId}/${section}` : `/desk/${portalId}`;
}

export const deskPortals: readonly DeskPortalDefinition[] = [
  {
    id: "cxsun",
    label: "Cxsun Base",
    href: "/desk/cxsun",
    badge: "Starter app",
    summary: "Starting workspace for intake, setup, approval, and operational follow-up work.",
    menuItems: [
      {
        id: "cxsun-overview",
        label: "Overview",
        href: portalHref("cxsun"),
        icon: <LayoutDashboard className="h-4 w-4" />,
      },
      {
        id: "cxsun-records",
        label: "Records",
        href: portalHref("cxsun", "records"),
        icon: <ClipboardList className="h-4 w-4" />,
      },
      {
        id: "cxsun-new-record",
        label: "New record",
        href: portalHref("cxsun", "records/new"),
        icon: <Workflow className="h-4 w-4" />,
      },
      {
        id: "cxsun-queue",
        label: "Queue",
        href: portalHref("cxsun", "queue"),
        icon: <Inbox className="h-4 w-4" />,
      },
    ],
  },
  {
    id: "customer",
    label: "Customer Portal",
    href: "/desk/customer",
    badge: "Customer",
    summary: "Customer-facing workspace shell for future account, support, and activity surfaces.",
    menuItems: [
      {
        id: "customer-overview",
        label: "Overview",
        href: portalHref("customer"),
        icon: <LayoutDashboard className="h-4 w-4" />,
      },
      {
        id: "customer-profile",
        label: "Profile",
        href: portalHref("customer", "profile"),
        icon: <Users className="h-4 w-4" />,
      },
      {
        id: "customer-requests",
        label: "Requests",
        href: portalHref("customer", "requests"),
        icon: <ShieldCheck className="h-4 w-4" />,
      },
    ],
  },
  {
    id: "vendor",
    label: "Vendor Portal",
    href: "/desk/vendor",
    badge: "Vendor",
    summary: "Vendor workspace shell for future onboarding, catalog, and operations surfaces.",
    menuItems: [
      {
        id: "vendor-overview",
        label: "Overview",
        href: portalHref("vendor"),
        icon: <LayoutDashboard className="h-4 w-4" />,
      },
      {
        id: "vendor-company",
        label: "Company",
        href: portalHref("vendor", "company"),
        icon: <Building2 className="h-4 w-4" />,
      },
      {
        id: "vendor-operations",
        label: "Operations",
        href: portalHref("vendor", "operations"),
        icon: <Truck className="h-4 w-4" />,
      },
    ],
  },
  {
    id: "admin",
    label: "Admin Portal",
    href: "/desk/admin",
    badge: "Admin",
    summary:
      "Tenant administration workspace shell for future users, settings, and module controls.",
    menuItems: [
      {
        id: "admin-overview",
        label: "Overview",
        href: portalHref("admin"),
        icon: <LayoutDashboard className="h-4 w-4" />,
      },
      {
        id: "admin-users",
        label: "Users",
        href: portalHref("admin", "users"),
        icon: <Users className="h-4 w-4" />,
      },
      {
        id: "admin-settings",
        label: "Settings",
        href: portalHref("admin", "settings"),
        icon: <Settings className="h-4 w-4" />,
      },
    ],
  },
  {
    id: "tenant",
    label: "Tenant",
    href: "/desk/tenant",
    badge: "Organisation",
    summary:
      "Organisation tenant master workspace for tenant identity, status, and lifecycle records.",
    menuItems: [
      {
        id: "tenant-list",
        label: "Tenants",
        href: "/desk/tenant",
        icon: <Store className="h-4 w-4" />,
      },
      {
        id: "tenant-new",
        label: "New tenant",
        href: "/desk/tenant/new",
        icon: <Settings className="h-4 w-4" />,
      },
    ],
  },
  {
    id: "industry",
    label: "Industry",
    href: "/desk/industry",
    badge: "Organisation",
    summary: "Organisation industry master workspace for business classification records.",
    menuItems: [
      {
        id: "industry-list",
        label: "Industries",
        href: "/desk/industry",
        icon: <Factory className="h-4 w-4" />,
      },
    ],
  },
  {
    id: "company",
    label: "Company",
    href: "/desk/company",
    badge: "Organisation",
    summary: "Organisation company master workspace for legal entity and profile records.",
    menuItems: [
      {
        id: "company-list",
        label: "Companies",
        href: "/desk/company",
        icon: <Building2 className="h-4 w-4" />,
      },
    ],
  },
  {
    id: "default-company",
    label: "Default Company",
    href: "/desk/default-company",
    badge: "Organisation",
    summary: "Organisation default company workspace for the active application context.",
    menuItems: [
      {
        id: "default-company-list",
        label: "Default Company",
        href: "/desk/default-company",
        icon: <Building2 className="h-4 w-4" />,
      },
    ],
  },
  {
    id: "contact",
    label: "Contact",
    href: "/desk/contact",
    badge: "Contacts",
    summary: "Contact master workspace for parties, communication, tax, and banking records.",
    menuItems: [
      {
        id: "contact-list",
        label: "Contacts",
        href: "/desk/contact",
        icon: <Users className="h-4 w-4" />,
      },
    ],
  },
  {
    id: "billing",
    label: "Billing",
    href: "/desk/billing",
    badge: "Billing",
    summary: "Billing workspace for entries, reports, masters, and common billing setup.",
    menuItems: [
      {
        id: "billing-overview",
        label: "Overview",
        href: "/desk/billing",
        icon: <LayoutDashboard className="h-4 w-4" />,
      },
      {
        id: "billing-entries",
        label: "Entries",
        href: "/desk/sales",
        icon: <ReceiptText className="h-4 w-4" />,
      },
    ],
  },
  {
    id: "super-admin",
    label: "Super-admin Portal",
    href: "/desk/super-admin",
    badge: "Super-admin",
    summary:
      "Platform operator workspace shell for future tenants, governance, and release controls.",
    menuItems: [
      {
        id: "super-admin-overview",
        label: "Overview",
        href: portalHref("super-admin"),
        icon: <LayoutDashboard className="h-4 w-4" />,
      },
      {
        id: "super-admin-tenants",
        label: "Tenants",
        href: portalHref("super-admin", "tenants"),
        icon: <Store className="h-4 w-4" />,
      },
      {
        id: "super-admin-governance",
        label: "Governance",
        href: portalHref("super-admin", "governance"),
        icon: <Crown className="h-4 w-4" />,
      },
    ],
  },
] as const;

export function getDeskPortal(portalId: string | undefined): DeskPortalDefinition {
  return deskPortals.find((portal) => portal.id === portalId) ?? deskPortals[0];
}
