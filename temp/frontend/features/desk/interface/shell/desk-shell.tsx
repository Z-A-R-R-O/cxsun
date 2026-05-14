"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { DashboardShell, useGlobalLoader } from "@cxnext/ui";
import {
  Building2,
  CalendarDays,
  Contact,
  CreditCard,
  Factory,
  FileKey2,
  Flag,
  Grid3X3,
  HandCoins,
  KeyRound,
  Landmark,
  LibraryBig,
  LineChart,
  LayoutDashboard,
  Inbox,
  Mail,
  Package,
  ReceiptText,
  RefreshCcw,
  ScrollText,
  Settings,
  Shield,
  ShieldCheck,
  ShoppingBag,
  Users,
  WalletCards,
  Warehouse,
} from "lucide-react";
import rootPackage from "../../../../../../package.json";
import {
  ApplicationContextRequestError,
  getDefaultApplicationContext,
  updateDefaultCompany,
} from "../../../application-context/infrastructure/application-context-api";
import type { AuthSession } from "../../../auth/domain/auth";
import { logout } from "../../../auth/infrastructure/auth-api";
import {
  authSessionChangedEvent,
  persistStoredApplicationContext,
  readStoredAuthSession,
} from "../../../auth/infrastructure/session-storage";
import { commonMenuGroups, commonMenuLabels } from "../../../common/application/common-service";
import { listCompanies } from "../../../company/application/company-service";
import type { CompanyRecord } from "../../../company/domain/company";
import { getDeskPortal } from "../../application/desk-registry";

const organisationNavItems = [
  {
    id: "tenant",
    label: "Tenant",
    href: "/desk/tenant",
    icon: <Users className="h-4 w-4" />,
  },
  {
    id: "industry",
    label: "Industry",
    href: "/desk/industry",
    icon: <Factory className="h-4 w-4" />,
  },
  {
    id: "company",
    label: "Company",
    href: "/desk/company",
    icon: <Building2 className="h-4 w-4" />,
  },
  {
    id: "default-company",
    label: "Default Company",
    href: "/desk/default-company",
    icon: <Building2 className="h-4 w-4" />,
  },
] as const;

const adminNavItems = [
  {
    id: "admin-mail",
    label: "Mail",
    href: "/desk/admin/mail",
    icon: <Mail className="h-4 w-4" />,
  },
  {
    id: "admin-users",
    label: "Users",
    href: "/desk/admin/users",
    icon: <Users className="h-4 w-4" />,
  },
  {
    id: "admin-roles",
    label: "Roles",
    href: "/desk/admin/roles",
    icon: <ShieldCheck className="h-4 w-4" />,
  },
  {
    id: "admin-permissions",
    label: "Permissions",
    href: "/desk/admin/permissions",
    icon: <KeyRound className="h-4 w-4" />,
  },
  {
    id: "admin-policy",
    label: "Policy",
    href: "/desk/admin/policy",
    icon: <ScrollText className="h-4 w-4" />,
  },
  {
    id: "admin-gate",
    label: "Gate",
    href: "/desk/admin/gate",
    icon: <Shield className="h-4 w-4" />,
  },
] as const;

const adminMenuLabels: Record<string, string> = {
  admin: "Admin",
  gate: "Gate",
  mail: "Mail",
  permissions: "Permissions",
  policy: "Policy",
  roles: "Roles",
  users: "Users",
};

const masterNavItems = [
  {
    id: "contact",
    label: "Contact",
    href: "/desk/contact",
    icon: <Contact className="h-4 w-4" />,
  },
  {
    id: "product",
    label: "Product",
    href: "/desk/product",
    icon: <Package className="h-4 w-4" />,
  },
  {
    id: "stock",
    label: "Stock",
    href: "/desk/stock",
    icon: <Warehouse className="h-4 w-4" />,
  },
] as const;

const entriesNavItems = [
  {
    id: "sales",
    label: "Sales",
    href: "/desk/sales",
    icon: <ReceiptText className="h-4 w-4" />,
  },
  {
    id: "purchase",
    label: "Purchase",
    href: "/desk/purchase",
    icon: <ShoppingBag className="h-4 w-4" />,
  },
  {
    id: "receipt",
    label: "Receipt",
    href: "/desk/receipt",
    icon: <HandCoins className="h-4 w-4" />,
  },
  {
    id: "payment",
    label: "Payment",
    href: "/desk/payment",
    icon: <CreditCard className="h-4 w-4" />,
  },
] as const;

const entriesMenuLabels: Record<string, string> = Object.fromEntries(
  entriesNavItems.map((item) => [item.id, item.label]),
);

const reportNavItems = [
  {
    id: "report-customer-statement",
    label: "Customer Statement",
    href: "/desk/reports/customer-statement",
    icon: <LineChart className="h-4 w-4" />,
  },
  {
    id: "report-supplier-statement",
    label: "Supplier Statement",
    href: "/desk/reports/supplier-statement",
    icon: <LineChart className="h-4 w-4" />,
  },
  {
    id: "report-gst-statement",
    label: "GST Statement",
    href: "/desk/reports/gst-statement",
    icon: <LineChart className="h-4 w-4" />,
  },
] as const;

const reportMenuLabels: Record<string, string> = {
  "customer-statement": "Customer Statement",
  "gst-statement": "GST Statement",
  reports: "Reports",
  "supplier-statement": "Supplier Statement",
};

const settingsNavItems = [
  {
    id: "settings-apps",
    label: "Apps",
    href: "/desk/settings/apps",
    icon: <Grid3X3 className="h-4 w-4" />,
  },
  {
    id: "settings-dashboard",
    label: "Dashboard",
    href: "/desk/settings/dashboard",
    icon: <LayoutDashboard className="h-4 w-4" />,
  },
  {
    id: "settings-mail",
    label: "Mail",
    href: "/desk/settings/mail",
    icon: <Mail className="h-4 w-4" />,
  },
  {
    id: "settings-media",
    label: "Media Manager",
    href: "/desk/settings/media",
    icon: <LibraryBig className="h-4 w-4" />,
  },
  {
    id: "settings-queue",
    label: "Queue Manager",
    href: "/desk/settings/queue",
    icon: <Inbox className="h-4 w-4" />,
  },
  {
    id: "settings-core",
    label: "Core Settings",
    href: "/desk/settings/core",
    icon: <FileKey2 className="h-4 w-4" />,
  },
  {
    id: "settings-billing-layout",
    label: "Sales Settings",
    href: "/desk/settings/billing-layout",
    icon: <ReceiptText className="h-4 w-4" />,
  },
  {
    id: "settings-document-settings",
    label: "Document Settings",
    href: "/desk/settings/document-settings",
    icon: <ScrollText className="h-4 w-4" />,
  },
  {
    id: "settings-duties-taxes",
    label: "Duties & Taxes",
    href: "/desk/settings/duties-taxes",
    icon: <Landmark className="h-4 w-4" />,
  },
  {
    id: "settings-system-update",
    label: "System Update",
    href: "/desk/settings/system-update",
    icon: <RefreshCcw className="h-4 w-4" />,
  },
] as const;

const settingsMenuLabels: Record<string, string> = {
  apps: "Apps",
  dashboard: "Dashboard",
  mail: "Mail",
  media: "Media Manager",
  queue: "Queue Manager",
  core: "Core Settings",
  "billing-layout": "Sales Settings",
  "document-settings": "Document Settings",
  "duties-taxes": "Duties & Taxes",
  "system-update": "System Update",
  settings: "Settings",
};

const commonGroupIcons: Record<string, ReactNode> = {
  Location: <Flag className="h-4 w-4" />,
  Contacts: <Contact className="h-4 w-4" />,
  Product: <Package className="h-4 w-4" />,
  Orders: <ShoppingBag className="h-4 w-4" />,
  Others: <WalletCards className="h-4 w-4" />,
  Accounts: <CalendarDays className="h-4 w-4" />,
};

const commonSubGroups = commonMenuGroups.map((group) => ({
  id: `common-${group.label.toLowerCase()}`,
  label: group.label,
  icon: commonGroupIcons[group.label] ?? <Flag className="h-4 w-4" />,
  items: group.items.map((key) => ({
    id: `common-${key}`,
    label: commonMenuLabels[key] ?? key,
    href: `/desk/common/${key}`,
    active: false,
  })),
}));

function getPortalIdFromPath(pathname: string) {
  const [, root, portalId] = pathname.split("/");
  return root === "desk" ? portalId : undefined;
}

function isBillingWorkspacePath(pathname: string) {
  return (
    pathname === "/desk/billing" ||
    pathname.startsWith("/desk/billing/") ||
    pathname === "/desk/sales" ||
    pathname.startsWith("/desk/sales/") ||
    pathname === "/desk/purchase" ||
    pathname.startsWith("/desk/purchase/") ||
    pathname === "/desk/receipt" ||
    pathname.startsWith("/desk/receipt/") ||
    pathname === "/desk/payment" ||
    pathname.startsWith("/desk/payment/") ||
    pathname === "/desk/reports" ||
    pathname.startsWith("/desk/reports/") ||
    pathname === "/desk/contact" ||
    pathname.startsWith("/desk/contact/") ||
    pathname === "/desk/product" ||
    pathname.startsWith("/desk/product/") ||
    pathname === "/desk/stock" ||
    pathname.startsWith("/desk/stock/") ||
    pathname === "/desk/common" ||
    pathname.startsWith("/desk/common/")
  );
}

function getWorkspaceLabel(pathname: string, isDeskRoot: boolean, fallbackLabel: string) {
  if (isDeskRoot) {
    return "Application Desk";
  }

  const [, root, portalId, moduleKey] = pathname.split("/");
  if (root === "desk" && portalId && entriesMenuLabels[portalId]) {
    return entriesMenuLabels[portalId];
  }

  if (root === "desk" && portalId === "reports") {
    return reportMenuLabels[moduleKey ?? portalId] ?? "Reports";
  }

  if (root === "desk" && portalId === "settings") {
    return settingsMenuLabels[moduleKey ?? portalId] ?? "Settings";
  }

  if (root === "desk" && portalId === "admin") {
    return adminMenuLabels[moduleKey ?? portalId] ?? "Admin";
  }

  if (root === "desk" && portalId === "account") {
    return "Account";
  }

  if (root === "desk" && portalId === "billing") {
    return "Billing";
  }

  if (root === "desk" && portalId === "stock") {
    return "Stock";
  }

  if (root === "desk" && portalId === "notifications") {
    return "Notifications";
  }

  if (root === "desk" && portalId === "upgrade") {
    return "Upgrade to Pro";
  }

  if (root === "desk" && portalId === "common" && moduleKey) {
    return commonMenuLabels[moduleKey] ?? "Common";
  }

  return fallbackLabel;
}

export function DeskShell({ children }: { readonly children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { show: showGlobalLoader } = useGlobalLoader();
  const [session, setSession] = useState<AuthSession | null>(null);
  const [companies, setCompanies] = useState<readonly CompanyRecord[]>([]);
  const [isContextLoading, setIsContextLoading] = useState(true);
  const isDeskRoot = pathname === "/desk";
  const isBillingWorkspace = isBillingWorkspacePath(pathname);
  const activePortal = isBillingWorkspace
    ? getDeskPortal("billing")
    : getDeskPortal(getPortalIdFromPath(pathname));
  const workspaceLabel = getWorkspaceLabel(pathname, isDeskRoot, activePortal.badge);
  const canSeeSystemMenus = session?.user.roles.some((role) => role.key === "super_admin") ?? false;
  const canSeeAdminMenus =
    session?.user.roles.some((role) => role.key === "admin" || role.key === "super_admin") ?? false;
  const navItems = organisationNavItems.map((item) => ({
    ...item,
    active: pathname === item.href || pathname.startsWith(`${item.href}/`),
  }));
  const masterItems = masterNavItems.map((item) => ({
    ...item,
    active: pathname === item.href || pathname.startsWith(`${item.href}/`),
  }));
  const entriesItems = entriesNavItems.map((item) => ({
    ...item,
    active: pathname === item.href || pathname.startsWith(`${item.href}/`),
  }));
  const adminItems = adminNavItems.map((item) => ({
    ...item,
    active: pathname === item.href || pathname.startsWith(`${item.href}/`),
  }));
  const settingsItems = settingsNavItems.map((item) => ({
    ...item,
    active: pathname === item.href || pathname.startsWith(`${item.href}/`),
  }));
  const reportItems = reportNavItems.map((item) => ({
    ...item,
    active: pathname === item.href || pathname.startsWith(`${item.href}/`),
  }));
  const commonGroups = commonSubGroups.map((group) => ({
    ...group,
    items: group.items.map((item) => ({
      ...item,
      active: pathname === item.href || pathname.startsWith(`${item.href}/`),
    })),
  }));
  const applicationNavItems = [
    ...(canSeeSystemMenus ? navItems : []),
    ...masterItems,
    ...(canSeeSystemMenus ? settingsItems : []),
    ...(canSeeAdminMenus ? adminItems : []),
  ];
  const applicationNavGroups = [
    ...(canSeeSystemMenus
      ? [
          {
            id: "organisation",
            label: "Organisation",
            icon: <Building2 className="size-4" />,
            items: navItems,
          },
        ]
      : []),
    {
      id: "master",
      label: "Master",
      icon: <Contact className="size-4" />,
      items: masterItems,
    },
    ...(canSeeSystemMenus
      ? [
          {
            id: "settings",
            label: "Settings",
            icon: <Settings className="size-4" />,
            items: settingsItems,
          },
        ]
      : []),
    ...(canSeeAdminMenus
      ? [
          {
            id: "admin",
            label: "Admin",
            icon: <Users className="size-4" />,
            items: adminItems,
          },
        ]
      : []),
  ];
  const billingNavItems = [...entriesItems, ...reportItems, ...masterItems];
  const billingNavGroups = [
    {
      id: "entries",
      label: "Entries",
      icon: <ReceiptText className="size-4" />,
      items: entriesItems,
    },
    {
      id: "reports",
      label: "Reports",
      icon: <LineChart className="size-4" />,
      items: reportItems,
    },
    {
      id: "master",
      label: "Master",
      icon: <Contact className="size-4" />,
      items: masterItems,
    },
    {
      id: "common",
      label: "Common",
      icon: <Flag className="size-4" />,
      subGroups: commonGroups,
    },
  ];
  const visibleNavItems = isBillingWorkspace ? billingNavItems : applicationNavItems;
  const visibleNavGroups = isBillingWorkspace ? billingNavGroups : applicationNavGroups;

  useEffect(() => {
    if (!isContextLoading) {
      return;
    }

    const hideLoader = showGlobalLoader();
    return hideLoader;
  }, [isContextLoading, showGlobalLoader]);

  useEffect(() => {
    const storedSession = readStoredAuthSession();
    setSession(storedSession);

    if (!storedSession || storedSession.context) {
      setIsContextLoading(false);
      return;
    }

    const controller = new AbortController();
    setIsContextLoading(true);
    getDefaultApplicationContext({ signal: controller.signal })
      .then((context) => {
        const nextSession = persistStoredApplicationContext(context);
        if (nextSession) {
          setSession(nextSession);
        }
        setIsContextLoading(false);
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) {
          return;
        }

        if (error instanceof ApplicationContextRequestError && error.status === 401) {
          setSession(null);
          router.replace(`/login?next=${encodeURIComponent(pathname)}`);
          return;
        }

        console.error(error);
        setIsContextLoading(false);
      });

    return () => {
      controller.abort();
    };
  }, [pathname, router]);

  useEffect(() => {
    const storedSession = readStoredAuthSession();
    if (!storedSession?.context) {
      setCompanies([]);
      return;
    }

    const controller = new AbortController();
    listCompanies({ signal: controller.signal })
      .then((nextCompanies) => {
        setCompanies(nextCompanies);
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        console.error(error);
      });

    return () => {
      controller.abort();
    };
  }, [session?.context?.company.id]);

  useEffect(() => {
    function syncSession() {
      setSession(readStoredAuthSession());
    }

    window.addEventListener(authSessionChangedEvent, syncSession);
    window.addEventListener("storage", syncSession);
    return () => {
      window.removeEventListener(authSessionChangedEvent, syncSession);
      window.removeEventListener("storage", syncSession);
    };
  }, []);

  async function handleLogout() {
    await logout();
    router.push("/login");
    router.refresh();
  }

  async function handleCompanySelect(companyId: string) {
    if (!session?.context || session.context.company.id === companyId) {
      return;
    }

    const company = companies.find((item) => String(item.id) === companyId);
    if (!company) {
      return;
    }

    try {
      setIsContextLoading(true);
      const nextContext = await updateDefaultCompany({
        tenantId: String(company.tenantId),
        industryId: String(company.industryId),
        companyId,
        accountingYearId: session.context.accountingYear.id,
      });
      const nextSession = persistStoredApplicationContext(nextContext);
      if (nextSession) {
        setSession(nextSession);
      }
      router.refresh();
    } catch (error) {
      console.error(error);
    } finally {
      setIsContextLoading(false);
    }
  }

  return (
    <DashboardShell
      brand={session?.context?.company.name ?? "CODEXSUN COMME..."}
      brandLogoSrc="/storage/logo/logo.svg"
      brandLogoDarkSrc="/storage/logo/logo-dark.svg"
      brandSubtitle={session?.context?.accountingYear.name ?? "Default company"}
      companySwitcher={{
        activeCompanyId: session?.context?.company.id ?? null,
        companies: companies.map((company) => ({
          id: String(company.id),
          name: company.name,
          code: company.code,
          subtitle: session?.context?.accountingYear.name ?? null,
          isActive: company.isActive,
        })),
        label: "Companies",
        onSelectCompany: (companyId) => {
          void handleCompanySelect(companyId);
        },
      }}
      currentUser={
        session
          ? {
              name: session.user.displayName,
              email: session.user.email,
            }
          : undefined
      }
      workspace={workspaceLabel}
      navItems={visibleNavItems}
      navGroups={visibleNavGroups}
      activeAppLabel={isBillingWorkspace ? "Billing" : "Application"}
      sidebarOverview={{
        href: isBillingWorkspace ? "/desk/billing" : "/desk",
        active: isBillingWorkspace ? pathname === "/desk/billing" : isDeskRoot,
        label: "Overview",
      }}
      shellTechnicalName={
        isDeskRoot
          ? "shell.application-desk"
          : `shell.${getPortalIdFromPath(pathname) ?? activePortal.id}`
      }
      version={rootPackage.version}
      onLogout={() => {
        void handleLogout();
      }}
    >
      {isContextLoading ? null : children}
    </DashboardShell>
  );
}
