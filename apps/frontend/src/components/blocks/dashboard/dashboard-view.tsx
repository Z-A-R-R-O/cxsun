import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { AppSidebar, type DashboardMode, type DashboardPage } from 'src/components/blocks/sidebar/app-sidebar'
import { SiteHeader } from 'src/components/blocks/layout/site-header'
import { SidebarInset, SidebarProvider } from 'src/components/ui/sidebar'
import { DashboardHome, type BillingRecentTransaction } from './dashboard-home'
import {
  clearAuthCache,
  getStoredSession,
  refreshSession,
  roleMatchesSurface,
  switchTenant,
  type AuthSurface,
  type AuthSession,
} from 'src/features/auth/auth-client'
import { getDefaultCompanyContext, updateDefaultCompanyContext } from 'src/features/company/company-client'
import { pageModuleKey, pageModuleKind } from 'src/features/master-data/application/master-data-service'
import {
  appModulePages,
  dashboardApps,
  defaultEnabledApps,
  getDashboardApp,
  isDashboardAppId,
  type DashboardAppId,
} from './dashboard-apps'
import { Card, CardContent, CardHeader, CardTitle } from 'src/components/ui/card'
import { RadioGroup, RadioGroupItem } from 'src/components/ui/radio-group'
import { GlobalLoader } from 'src/components/blocks/loading/global-loader'
import { cn } from 'src/lib/utils'
import { isSoftwareSettingEnabled, type SoftwareSettingsState } from 'src/features/settings/software-settings'
import { loadCompanySoftwareSettingsFromServer } from 'src/features/settings/software-settings-service'

const LoginForm = lazy(() =>
  import('../auth/login-form').then((module) => ({ default: module.LoginForm })),
)
const ForgotPasswordForm = lazy(() =>
  import('../auth/forgot-password-form').then((module) => ({ default: module.ForgotPasswordForm })),
)
const SupportPage = lazy(() =>
  import('./support-pages').then((module) => ({ default: module.SupportPage })),
)
const SystemUpdateView = lazy(() =>
  import('./system-update-view').then((module) => ({ default: module.SystemUpdateView })),
)
const QueueManagerPage = lazy(() =>
  import('src/features/system/queue-manager-page').then((module) => ({ default: module.default })),
)
const DatabaseManagerPage = lazy(() =>
  import('src/features/system/database-manager-page').then((module) => ({ default: module.default })),
)
const TenantListPage = lazy(() =>
  import('src/features/tenant/interface/pages/tenant-list-page').then((module) => ({ default: module.TenantListPage })),
)
const AppSetupPage = lazy(() =>
  import('src/features/app-setup/app-setup-page').then((module) => ({ default: module.AppSetupPage })),
)
const CompanyPage = lazy(() =>
  import('src/features/company/company-page').then((module) => ({ default: module.CompanyPage })),
)
const DefaultCompanyPage = lazy(() =>
  import('src/features/company/default-company-page').then((module) => ({ default: module.DefaultCompanyPage })),
)
const IndustryPage = lazy(() =>
  import('src/features/industry/industry-page').then((module) => ({ default: module.IndustryPage })),
)
const CompanyIndustryPage = lazy(() =>
  import('src/features/industry/company-industry-page').then((module) => ({ default: module.CompanyIndustryPage })),
)
const TenantDomainPage = lazy(() =>
  import('src/features/tenant-domain/tenant-domain-page').then((module) => ({ default: module.TenantDomainPage })),
)
const UserManagerPage = lazy(() =>
  import('src/features/user-manager/user-manager-page').then((module) => ({ default: module.UserManagerPage })),
)
const CommonDataPage = lazy(() =>
  import('src/features/master-data/interface/pages/common-module-pages').then((module) => ({ default: module.CommonDataPage })),
)
const MasterDataPage = lazy(() =>
  import('src/features/master-data/interface/pages/master-data-page').then((module) => ({ default: module.MasterDataPage })),
)
const ContactPage = lazy(() =>
  import('src/features/contact/contact-page').then((module) => ({ default: module.ContactPage })),
)
const AuditorContactDetailPage = lazy(() =>
  import('src/features/auditor/contact-detail/auditor-contact-detail-page').then((module) => ({ default: module.AuditorContactDetailPage })),
)
const AuditorGstFilingPage = lazy(() =>
  import('src/features/auditor/gst-filing/auditor-gst-filing-page').then((module) => ({ default: module.AuditorGstFilingPage })),
)
const ProductPage = lazy(() =>
  import('src/features/product/product-page').then((module) => ({ default: module.ProductPage })),
)
const SalesPage = lazy(() =>
  import('src/features/sales/sales-page').then((module) => ({ default: module.SalesPage })),
)
const QuotationPage = lazy(() =>
  import('src/features/quotation/quotation-page').then((module) => ({ default: module.QuotationPage })),
)
const ExportSalesPage = lazy(() =>
  import('src/features/export-sales/export-sales-page').then((module) => ({ default: module.ExportSalesPage })),
)
const CashBookPage = lazy(() =>
  import('src/features/accounts/accounts-book-page').then((module) => ({ default: module.CashBookPage })),
)
const BankBookPage = lazy(() =>
  import('src/features/accounts/accounts-book-page').then((module) => ({ default: module.BankBookPage })),
)
const AccountsPage = lazy(() =>
  import('src/features/accounts/accounts-page').then((module) => ({ default: module.AccountsPage })),
)
const PurchasePage = lazy(() =>
  import('src/features/purchase/purchase-page').then((module) => ({ default: module.PurchasePage })),
)
const PurchaseReceiptPage = lazy(() =>
  import('src/features/stock/inward/purchase-receipt/purchase-receipt-page').then((module) => ({ default: module.PurchaseReceiptPage })),
)
const DeliveryNotePage = lazy(() =>
  import('src/features/stock/outward/delivery-note/delivery-note-page').then((module) => ({ default: module.DeliveryNotePage })),
)
const StockLedgerPage = lazy(() =>
  import('src/features/stock/ledger/stock-ledger-page').then((module) => ({ default: module.StockLedgerPage })),
)
const ReceiptPage = lazy(() =>
  import('src/features/receipt/receipt-page').then((module) => ({ default: module.ReceiptPage })),
)
const PaymentPage = lazy(() =>
  import('src/features/payment/payment-page').then((module) => ({ default: module.PaymentPage })),
)
const CustomerStatementReportPage = lazy(() =>
  import('src/features/report/billing-statement-page').then((module) => ({ default: module.CustomerStatementReportPage })),
)
const SupplierStatementReportPage = lazy(() =>
  import('src/features/report/billing-statement-page').then((module) => ({ default: module.SupplierStatementReportPage })),
)
const GstStatementReportPage = lazy(() =>
  import('src/features/report/billing-statement-page').then((module) => ({ default: module.GstStatementReportPage })),
)
const QuotationReportPage = lazy(() =>
  import('src/features/report/billing-statement-page').then((module) => ({ default: module.QuotationReportPage })),
)
const MediaManagerPage = lazy(() =>
  import('src/features/media/media-page').then((module) => ({ default: module.MediaManagerPage })),
)
const MailDeskPage = lazy(() =>
  import('src/features/mail/mail-page').then((module) => ({ default: module.MailDeskPage })),
)
const TaskManagerPage = lazy(() =>
  import('src/features/task-manager/task-manager-page').then((module) => ({ default: module.TaskManagerPage })),
)
const TaskManagerAutomationPage = lazy(() =>
  import('src/features/task-manager/task-manager-automation-page').then((module) => ({ default: module.TaskManagerAutomationPage })),
)
const TallyPage = lazy(() =>
  import('src/features/tally/tally-page').then((module) => ({ default: module.TallyPage })),
)
const TallySyncPage = lazy(() =>
  import('src/features/tally/tally-sync-page').then((module) => ({ default: module.TallySyncPage })),
)
const FrappePage = lazy(() =>
  import('src/features/frappe/frappe-page').then((module) => ({ default: module.FrappePage })),
)
const AgentOsPage = lazy(() =>
  import('src/features/agent-os/agent-os-page').then((module) => ({ default: module.AgentOsPage })),
)
const ZetroChatWindow = lazy(() =>
  import('src/features/agent-os/zetro-chat-window').then((module) => ({ default: module.ZetroChatWindow })),
)
const CrmPage = lazy(() =>
  import('src/features/crm/crm-page').then((module) => ({ default: module.CrmPage })),
)
const SiteSliderPage = lazy(() =>
  import('src/features/site/slider/site-slider-page').then((module) => ({ default: module.SiteSliderPage })),
)
const SalesSettingsPage = lazy(() =>
  import('src/features/settings/settings-page').then((module) => ({ default: module.SalesSettingsPage })),
)
const DocumentSettingsPage = lazy(() =>
  import('src/features/settings/settings-page').then((module) => ({ default: module.DocumentSettingsPage })),
)
const InventoryDocumentSettingsPage = lazy(() =>
  import('src/features/settings/settings-page').then((module) => ({ default: module.InventoryDocumentSettingsPage })),
)
const GstSandboxPage = lazy(() =>
  import('src/features/gst/gst-sandbox-page').then((module) => ({ default: module.GstSandboxPage })),
)
const GstProviderSettingsPage = lazy(() =>
  import('src/features/gst/gst-provider-settings-page').then((module) => ({ default: module.GstProviderSettingsPage })),
)

function dashboardPath(basePath: string, page: DashboardPage) {
  return page === "overview" ? basePath : `${basePath}/${page}`
}

const agentOsPages: DashboardPage[] = [
  "app-agent-os-base",
  "app-agent-os-providers",
  "app-agent-os-knowledge",
  "app-agent-os-agents",
  "app-agent-os-queries",
  "app-agent-os-updates",
]

function dashboardPageFromPath(basePath: string, pathname = window.location.pathname): DashboardPage {
  const [, root, page] = pathname.split("/")
  const expectedRoot = basePath.replace(/^\//, "")
  if (root !== expectedRoot) return "overview"
  if (agentOsPages.includes(page as DashboardPage)) return page as DashboardPage
  if (appModulePages.includes(page as DashboardPage)) return page as DashboardPage
  if (page === "app-tally-settings") return page as DashboardPage
  if (
    page === "tenant" ||
    page === "setup" ||
    page === "tenant-domain" ||
    page === "industry" ||
    page === "company-industry" ||
    page === "company" ||
    page === "system-update" ||
    page === "gst-api" ||
    page === "gst-api-test" ||
    page === "queue-manager" ||
    page === "database-manager" ||
    page === "user-manager" ||
    page === "helpdesk" ||
    page === "bugs" ||
    page === "tenant-roles"
  ) {
    return page
  }
  return "overview"
}

function dashboardAppFromPage(page: DashboardPage): DashboardAppId | null {
  if (!page.startsWith("app-")) return null
  return dashboardApps.find((app) => page === `app-${app.id}-overview` || page.startsWith(`app-${app.id}-`))?.id ?? null
}

function dashboardOverviewAppFromPage(page: DashboardPage): DashboardAppId | null {
  return page.endsWith("-overview") ? dashboardAppFromPage(page) : null
}

function defaultPageForApp(appId: DashboardAppId): DashboardPage {
  if (appId === "agent-os") return "app-agent-os-base"
  return `app-${appId}-overview`
}

const crossSurfaceAppPages: DashboardPage[] = ["app-agent-os-base"]

const pageAccess: Record<DashboardMode, DashboardPage[]> = {
  "super-admin": ["overview", "setup", "tenant", "tenant-domain", "industry", "company-industry", "company", "system-update", "gst-api", "gst-api-test", "queue-manager", "database-manager", "user-manager", ...agentOsPages],
  admin: ["overview", "company", "helpdesk", "bugs", "system-update", ...crossSurfaceAppPages],
  tenant: ["overview", "company", "tenant-roles", ...appModulePages],
}

const dashboardTitles: Record<DashboardMode, string> = {
  "super-admin": "Super Admin Dashboard",
  admin: "Admin Dashboard",
  tenant: "Workspace Dashboard",
}

const pageLabels: Partial<Record<DashboardPage, string>> = {
  "tenant": "Tenants",
  "setup": "App Setup",
  "tenant-domain": "Tenant Domains",
  "industry": "Industries",
  "company-industry": "Company Industry",
  "company": "Companies",
  "system-update": "System Update",
  "gst-api": "GST API",
  "gst-api-test": "GST API Test",
  "queue-manager": "Queue Manager",
  "database-manager": "Database Manager",
  "user-manager": "Admin User Manager",
  "helpdesk": "Helpdesk",
  "bugs": "Bugs",
  "tenant-roles": "Tenant Roles",
  "app-agent-os-base": "Base",
  "app-agent-os-providers": "Providers",
  "app-agent-os-knowledge": "Knowledge",
  "app-agent-os-agents": "Agents",
  "app-agent-os-queries": "Queries",
  "app-agent-os-updates": "Updates",
}

function pushDashboardPage(basePath: string, page: DashboardPage) {
  const nextPath = dashboardPath(basePath, page)
  if (window.location.pathname !== nextPath) {
    window.history.pushState(null, "", nextPath)
  }
}

function prefetchAppModules(appId: DashboardAppId) {
  const work = () => {
    if (appId === "application") {
      void import('src/features/company/company-page')
      void import('src/features/company/default-company-page')
      void import('src/features/user-manager/user-manager-page')
      return
    }

    if (appId === "billing") {
      void import('src/features/quotation/quotation-page')
      void import('src/features/sales/sales-page')
      void import('src/features/export-sales/export-sales-page')
      void import('src/features/purchase/purchase-page')
      void import('src/features/receipt/receipt-page')
      void import('src/features/payment/payment-page')
      void import('src/features/report/billing-statement-page')
      void import('src/features/accounts/accounts-book-page')
      return
    }

    if (appId === "auditor") {
      void import('src/features/contact/contact-page')
      void import('src/features/auditor/contact-detail/auditor-contact-detail-page')
      void import('src/features/auditor/gst-filing/auditor-gst-filing-page')
      return
    }

    if (appId === "accounts") {
      void import('src/features/accounts/accounts-book-page')
      void import('src/features/accounts/accounts-page')
      return
    }

    if (appId === "inventory") {
      void import('src/features/stock/inward/purchase-receipt/purchase-receipt-page')
      void import('src/features/stock/outward/delivery-note/delivery-note-page')
      void import('src/features/stock/ledger/stock-ledger-page')
      void import('src/features/product/product-page')
      return
    }

    if (appId === "media") {
      void import('src/features/media/media-page')
      return
    }

    if (appId === "mail") {
      void import('src/features/mail/mail-page')
      return
    }

    if (appId === "taskmanager") {
      void import('src/features/task-manager/task-manager-page')
      return
    }

    if (appId === "tally") {
      void import('src/features/tally/tally-page')
      void import('src/features/tally/tally-sync-page')
      return
    }

    if (appId === "frappe") {
      void import('src/features/frappe/frappe-page')
      return
    }

    if (appId === "agent-os") {
      void import('src/features/agent-os/agent-os-page')
      return
    }

    if (appId === "crm") {
      void import('src/features/crm/crm-page')
      return
    }

    if (appId === "sites") {
      void import('src/features/site/slider/site-slider-page')
    }
  }

  window.setTimeout(work, 250)
}

export function DashboardView({
  basePath = "/app",
  loginPath = "/login",
  mode = "tenant",
  onBackHome,
}: {
  basePath?: "/app" | "/admin" | "/sa"
  loginPath?: "/login" | "/admin/login" | "/sa/login" | "/sg/login"
  mode?: DashboardMode
  onBackHome: () => void
}) {
  const queryClient = useQueryClient()
  const authSurface: AuthSurface = mode === "super-admin" ? "super-admin" : mode
  const initialPage = dashboardPageFromPath(basePath)
  const storedSession = getStoredSession(authSurface)
  const initialEnabledApps = mode === "tenant" && storedSession ? enabledAppsForSession(storedSession) : readStoredEnabledApps()
  const initialLandingApp = readStoredLandingApp(initialEnabledApps)
  const [activePage, setActivePage] = useState<DashboardPage>(() => initialPage)
  const [session, setSession] = useState<AuthSession | null>(() => storedSession)
  const [authPage, setAuthPage] = useState<"login" | "forgot-password">("login")
  const [enabledApps, setEnabledApps] = useState<Record<DashboardAppId, boolean>>(() => initialEnabledApps)
  const [landingApp, setLandingApp] = useState<DashboardAppId>(() => initialLandingApp)
  const [activeApp, setActiveApp] = useState<DashboardAppId>(() => dashboardAppFromPage(initialPage) ?? (initialPage === "overview" && mode === "tenant" ? initialLandingApp : readStoredApp()))
  const [focusedBillingEntry, setFocusedBillingEntry] = useState<{ id: string; type: BillingRecentTransaction["type"] } | null>(null)
  const [zetroChatOpen, setZetroChatOpen] = useState(false)

  useEffect(() => {
    if (mode !== "tenant" || !session) return
    const nextEnabledApps = enabledAppsForSession(session)
    const nextLandingApp = readStoredLandingApp(nextEnabledApps)
    setEnabledApps(nextEnabledApps)
    setLandingApp(nextLandingApp)
    if (!isAppAvailableFromAccess(nextEnabledApps, activeApp)) {
      setActiveApp(nextLandingApp)
      pushDashboardPage(basePath, defaultPageForApp(nextLandingApp))
    }
  }, [activeApp, basePath, mode, session])

  useEffect(() => {
    if (mode !== "tenant" || !session || needsLogin) return

    let cancelled = false
    refreshSession(session, "tenant")
      .then((nextSession) => {
        if (cancelled) return
        const nextEnabledApps = enabledAppsForSession(nextSession)
        const nextLandingApp = readStoredLandingApp(nextEnabledApps)
        setSession(nextSession)
        setEnabledApps(nextEnabledApps)
        setLandingApp(nextLandingApp)
        if (!isAppAvailableFromAccess(nextEnabledApps, activeApp)) {
          const nextPage = defaultPageForApp(nextLandingApp)
          setActiveApp(nextLandingApp)
          setActivePage(nextPage)
          window.localStorage.setItem("cxsun.activeApp", nextLandingApp)
          pushDashboardPage(basePath, nextPage)
        }
      })
      .catch(() => {
        if (cancelled) return
        clearAuthCache("tenant")
        setSession(null)
        window.history.replaceState(null, "", loginPath)
      })

    return () => {
      cancelled = true
    }
  // Run once for the stored tenant session; follow-up state changes are handled by the normal session effect.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    function syncDashboardPage() {
      const nextPage = dashboardPageFromPath(basePath)
      setActivePage(nextPage)
      const nextApp = dashboardAppFromPage(nextPage)
      if (nextApp) {
        setActiveApp(nextApp)
        window.localStorage.setItem("cxsun.activeApp", nextApp)
      }
    }

    window.addEventListener("popstate", syncDashboardPage)
    return () => window.removeEventListener("popstate", syncDashboardPage)
  }, [basePath])

  useEffect(() => {
    function handleAuthInvalid() {
      setSession(null)
      window.history.replaceState(null, "", loginPath)
    }

    window.addEventListener("cxsun:auth-invalid", handleAuthInvalid)
    return () => window.removeEventListener("cxsun:auth-invalid", handleAuthInvalid)
  }, [loginPath])

  const needsLogin = !session || !roleMatchesSurface(session.selectedTenant.role, authSurface)
  const defaultCompanyContextQuery = useQuery({
    enabled: Boolean(session && !needsLogin && mode === "tenant"),
    queryKey: ["default-company-context", session?.selectedTenant.slug],
    queryFn: () => getDefaultCompanyContext(session as AuthSession),
  })
  const softwareSettingsQuery = useQuery({
    enabled: Boolean(session && !needsLogin && mode === "tenant" && defaultCompanyContextQuery.data?.companyId),
    queryKey: ["company-software-settings", session?.selectedTenant.slug, defaultCompanyContextQuery.data?.companyId],
    queryFn: () => loadCompanySoftwareSettingsFromServer(session as AuthSession, defaultCompanyContextQuery.data?.companyId),
  })
  const exportSalesEnabled = softwareSettingsQuery.data ? isSoftwareSettingEnabled(softwareSettingsQuery.data, "feature-export-sales") : true
  const quotationEnabled = softwareSettingsQuery.data ? isSoftwareSettingEnabled(softwareSettingsQuery.data, "feature-quotation") : true
  const tConnectEnabled = softwareSettingsQuery.data ? isSoftwareSettingEnabled(softwareSettingsQuery.data, "feature-tconnect") : false
  const tConnectAppEnabled = enabledApps.tconnect || tConnectEnabled
  const featureEnabledApps = useMemo(
    () => ({ ...enabledApps, tconnect: tConnectAppEnabled }),
    [enabledApps, tConnectAppEnabled],
  )

  useEffect(() => {
    function refreshSoftwareSettings(event: Event) {
      const detail = (event as CustomEvent<{ companyId?: number | string | null; settings?: SoftwareSettingsState }>).detail
      if (detail?.settings && detail.companyId === defaultCompanyContextQuery.data?.companyId) {
        queryClient.setQueryData(["company-software-settings", session?.selectedTenant.slug, detail.companyId], detail.settings)
      }
      void queryClient.invalidateQueries({ queryKey: ["company-software-settings", session?.selectedTenant.slug] })
    }
    window.addEventListener("cxsun:software-settings-saved", refreshSoftwareSettings)
    return () => window.removeEventListener("cxsun:software-settings-saved", refreshSoftwareSettings)
  }, [defaultCompanyContextQuery.data?.companyId, queryClient, session?.selectedTenant.slug])

  useEffect(() => {
    if (mode !== "tenant" || !session) return

    const currentSession = session
    let refreshing = false
    async function refreshTenantApps() {
      if (refreshing) return
      refreshing = true
      try {
        const nextSession = await refreshSession(currentSession, "tenant")
        const nextEnabledApps = enabledAppsForSession(nextSession)
        setSession(nextSession)
        setEnabledApps(nextEnabledApps)
      } catch (error) {
        toast.error("Tenant app access not refreshed", {
          description: error instanceof Error ? error.message : "Please reload the workspace.",
        })
      } finally {
        refreshing = false
      }
    }

    function handleTenantAppsPublished(event: Event) {
      const detail = (event as CustomEvent<{ tenantSlug?: string }>).detail
      if (detail?.tenantSlug === currentSession.selectedTenant.slug) {
        void refreshTenantApps()
      }
    }

    function handleTenantAppsStorage(event: StorageEvent) {
      if (event.key !== "cxsun.tenant-apps-published" || !event.newValue) return
      try {
        const detail = JSON.parse(event.newValue) as { tenantSlug?: string }
        if (detail.tenantSlug === currentSession.selectedTenant.slug) {
          void refreshTenantApps()
        }
      } catch {
        // Ignore malformed cross-tab hints.
      }
    }

    window.addEventListener("cxsun:tenant-apps-published", handleTenantAppsPublished)
    window.addEventListener("storage", handleTenantAppsStorage)
    return () => {
      window.removeEventListener("cxsun:tenant-apps-published", handleTenantAppsPublished)
      window.removeEventListener("storage", handleTenantAppsStorage)
    }
  }, [mode, session])
  const landingMutation = useMutation({
    mutationFn: (appId: DashboardAppId) => {
      if (!session || !defaultCompanyContextQuery.data) {
        throw new Error("Default company context is not available.")
      }

      return updateDefaultCompanyContext(session, {
        companyId: defaultCompanyContextQuery.data.companyId,
        accountingYearId: defaultCompanyContextQuery.data.accountingYearId,
        landingApp: appId,
      })
    },
    onSuccess: async (context) => {
      toast.success("Landing desk updated")
      await queryClient.invalidateQueries({ queryKey: ["default-company-context", session?.selectedTenant.slug] })
      if (context.landingApp && isDashboardAppId(context.landingApp) && isAppAvailableForLanding(featureEnabledApps, context.landingApp)) {
        setLandingApp(context.landingApp)
      }
    },
    onError: (error) => {
      toast.error("Landing desk not saved", {
        description: error instanceof Error ? error.message : "Please try again.",
      })
    },
  })

  useEffect(() => {
    const savedLandingApp = defaultCompanyContextQuery.data?.landingApp
    if (mode !== "tenant" || !savedLandingApp || !isDashboardAppId(savedLandingApp) || !isAppAvailableForLanding(featureEnabledApps, savedLandingApp)) {
      return
    }

    setLandingApp(savedLandingApp)
    if (activePage === "overview") {
      const nextPage = defaultPageForApp(savedLandingApp)
      setActiveApp(savedLandingApp)
      window.localStorage.setItem("cxsun.activeApp", savedLandingApp)
      setActivePage(nextPage)
      pushDashboardPage(basePath, nextPage)
    }
  }, [activePage, basePath, defaultCompanyContextQuery.data?.landingApp, featureEnabledApps, mode])

  useEffect(() => {
    if (needsLogin) return
    prefetchAppModules(activeApp)
  }, [activeApp, needsLogin])

  useEffect(() => {
    if (!needsLogin || window.location.pathname === loginPath) {
      return
    }

    window.history.replaceState(null, "", loginPath)
    window.dispatchEvent(new Event("popstate"))
  }, [loginPath, needsLogin])

  function authenticate(nextSession: AuthSession) {
    setSession(nextSession)
    const nextEnabledApps = mode === "tenant" ? enabledAppsForSession(nextSession) : enabledApps
    const nextLandingApp = readStoredLandingApp(nextEnabledApps)
    const nextActiveApp = mode === "tenant" ? nextLandingApp : "application"
    const nextPage = mode === "tenant" ? "overview" : defaultPageForApp(nextActiveApp)

    setEnabledApps(nextEnabledApps)
    setLandingApp(nextLandingApp)
    setActiveApp(nextActiveApp)
    setActivePage(nextPage)
    window.localStorage.setItem("cxsun.activeApp", nextActiveApp)
    window.history.replaceState(null, "", dashboardPath(basePath, nextPage))
    window.dispatchEvent(new Event("popstate"))
  }

  if (needsLogin) {
    return (
      <div className="grid min-h-screen place-items-center bg-background p-6">
        <div className="w-full max-w-[560px]">
          <Suspense fallback={<GlobalLoader fullScreen={false} />}>
            {authPage === "forgot-password" ? (
              <ForgotPasswordForm onBackToLogin={() => setAuthPage("login")} />
            ) : (
              <LoginForm
                surface={authSurface}
                subtitle={dashboardTitles[mode]}
                onAuthenticated={authenticate}
                onForgotPassword={() => setAuthPage("forgot-password")}
              />
            )}
          </Suspense>
        </div>
      </div>
    )
  }

  function logout() {
    clearAuthCache(authSurface)
    queryClient.clear()
    setSession(null)
    window.history.pushState(null, "", loginPath)
  }

  function changeTenant(tenantSlug: string) {
    if (!session) {
      return
    }

    setSession(switchTenant(session, tenantSlug, authSurface))
  }

  const accessiblePage = pageAccess[mode].includes(activePage) ? activePage : "overview"
  const activePageApp = dashboardAppFromPage(accessiblePage)
  const featureHiddenPages = [
    ...(!quotationEnabled ? ["app-billing-quotation" as const] : []),
    ...(!exportSalesEnabled ? ["app-billing-export-sales" as const] : []),
  ]
  const featureVisiblePage = featureHiddenPages.includes(accessiblePage as (typeof featureHiddenPages)[number]) ? "app-billing-overview" : accessiblePage
  const visiblePage = activePageApp && !featureEnabledApps[activePageApp] ? "overview" : featureVisiblePage
  const breadcrumbLabel = getBreadcrumbLabel({ appId: activeApp, mode, page: visiblePage })
  const moduleKey = pageModuleKey(visiblePage)
  const overviewApp = dashboardOverviewAppFromPage(visiblePage)

  function navigate(page: DashboardPage) {
    if (!pageAccess[mode].includes(page)) {
      setActivePage("overview")
      pushDashboardPage(basePath, "overview")
      return
    }

    setActivePage(page)
    const nextApp = dashboardAppFromPage(page)
    if (nextApp) {
      setActiveApp(nextApp)
      window.localStorage.setItem("cxsun.activeApp", nextApp)
    }
    pushDashboardPage(basePath, page)
  }

  function openBillingEntry(entry: BillingRecentTransaction) {
    const pageByType: Record<BillingRecentTransaction["type"], DashboardPage> = {
      payment: "app-billing-payments",
      purchase: "app-billing-purchase",
      receipt: "app-billing-receipts",
      sales: "app-billing-sales",
    }
    setFocusedBillingEntry({ id: entry.id, type: entry.type })
    navigate(pageByType[entry.type])
  }

  function changeApp(appId: DashboardAppId) {
    if (!featureEnabledApps[appId]) {
      return
    }

    prefetchAppModules(appId)
    setActiveApp(appId)
    window.localStorage.setItem("cxsun.activeApp", appId)
    const nextPage = defaultPageForApp(appId)
    setActivePage(nextPage)
    pushDashboardPage(basePath, nextPage)
  }

  function changeLandingApp(appId: DashboardAppId) {
    if (!featureEnabledApps[appId]) {
      return
    }

    setLandingApp(appId)
    landingMutation.mutate(appId)
  }

  return (
    <SidebarProvider>
      <AppSidebar
        dashboardMode={mode}
        basePath={basePath}
        activePage={visiblePage}
        activeApp={activeApp}
        onNavigate={navigate}
        onTenantChange={changeTenant}
        defaultCompanyContext={defaultCompanyContextQuery.data ?? null}
        onLogout={logout}
        selectedTenant={session.selectedTenant.slug}
        tenants={session.tenants}
        user={session.user}
        hiddenPages={featureHiddenPages}
      />
      <SidebarInset>
        <SiteHeader
          activeApp={activeApp}
          appEnabled={featureEnabledApps}
          dashboardTitle={breadcrumbLabel}
          onBackHome={onBackHome}
          onChangeApp={changeApp}
          onOpenZetroChat={() => setZetroChatOpen(true)}
          onLogout={logout}
        />
        <Suspense fallback={<GlobalLoader />}>
          {visiblePage === "setup" ? (
            <AppSetupPage session={session} />
          ) : visiblePage === "tenant" ? (
            <TenantListPage session={session} />
          ) : visiblePage === "tenant-domain" ? (
            <TenantDomainPage session={session} />
          ) : visiblePage === "industry" ? (
            <IndustryPage session={session} />
          ) : visiblePage === "company-industry" ? (
            <CompanyIndustryPage session={session} />
          ) : visiblePage === "company" && mode === "admin" ? (
            <SupportPage type="helpdesk" />
          ) : visiblePage === "company" ? (
            <CompanyPage session={session} />
          ) : visiblePage === "app-accounts-overview" ? (
            <AccountsPage session={session} view="overview" />
          ) : overviewApp ? (
            <DashboardHome
              activeApp={overviewApp}
              appEnabled={featureEnabledApps}
              defaultCompanyContext={defaultCompanyContextQuery.data ?? null}
              exportSalesEnabled={exportSalesEnabled}
              mode={mode}
              onChangeApp={changeApp}
              onOpenBillingEntry={openBillingEntry}
              onNavigate={navigate}
              session={session}
              quotationEnabled={quotationEnabled}
            />
          ) : visiblePage === "app-application-default-company" ? (
            <DefaultCompanyPage session={session} />
          ) : visiblePage === "app-application-users" ? (
            <UserManagerPage session={session} mode="tenant" />
          ) : visiblePage === "app-application-landing-desk" ? (
            <LandingDeskSettingsPage
              activeApp={activeApp}
              enabledApps={featureEnabledApps}
              landingApp={landingApp}
              onChangeApp={changeApp}
              onChangeLandingApp={changeLandingApp}
              isSaving={landingMutation.isPending}
            />
          ) : visiblePage === "system-update" ? (
            <SystemUpdateView session={session} />
          ) : visiblePage === "gst-api" ? (
            <GstProviderSettingsPage session={session} />
          ) : visiblePage === "gst-api-test" ? (
            <GstSandboxPage allowEnvironmentSelect preferredEnvironment="production" session={session} showTenantSelector />
          ) : visiblePage === "queue-manager" ? (
            <QueueManagerPage session={session} />
          ) : visiblePage === "database-manager" ? (
            <DatabaseManagerPage session={session} />
          ) : visiblePage === "user-manager" ? (
            <UserManagerPage session={session} mode="platform" />
          ) : visiblePage === "helpdesk" ? (
            <SupportPage type="helpdesk" />
          ) : visiblePage === "bugs" ? (
            <SupportPage type="bugs" />
          ) : visiblePage === "tenant-roles" ? (
            <SupportPage type="tenant-roles" />
          ) : visiblePage === "app-billing-sales" ? (
            <SalesPage initialEntryUuid={focusedBillingEntry?.type === "sales" ? focusedBillingEntry.id : null} session={session} />
          ) : visiblePage === "app-billing-quotation" ? (
            <QuotationPage session={session} />
          ) : visiblePage === "app-billing-export-sales" && exportSalesEnabled ? (
            <ExportSalesPage session={session} />
          ) : visiblePage === "app-accounts-cash-book" ? (
            <CashBookPage session={session} />
          ) : visiblePage === "app-billing-cash-book" ? (
            <CashBookPage session={session} />
          ) : visiblePage === "app-accounts-bank-book" ? (
            <BankBookPage session={session} />
          ) : visiblePage === "app-billing-bank-book" ? (
            <BankBookPage session={session} />
          ) : visiblePage === "app-accounts-cash-posting" ? (
            <AccountsPage session={session} view="cash-posting" />
          ) : visiblePage === "app-accounts-bank-posting" ? (
            <AccountsPage session={session} view="bank-posting" />
          ) : visiblePage === "app-accounts-chart" ? (
            <AccountsPage session={session} view="chart" />
          ) : visiblePage === "app-accounts-voucher-new" ? (
            <AccountsPage session={session} view="voucher-new" />
          ) : visiblePage === "app-accounts-journal-vouchers" ? (
            <AccountsPage session={session} view="journal-vouchers" />
          ) : visiblePage === "app-accounts-contra-vouchers" ? (
            <AccountsPage session={session} view="contra-vouchers" />
          ) : visiblePage === "app-accounts-opening-vouchers" ? (
            <AccountsPage session={session} view="opening-vouchers" />
          ) : visiblePage === "app-accounts-vouchers" ? (
            <AccountsPage session={session} view="vouchers" />
          ) : visiblePage === "app-accounts-day-book" ? (
            <AccountsPage session={session} view="day-book" />
          ) : visiblePage === "app-accounts-monthly-movement" ? (
            <AccountsPage session={session} view="monthly-movement" />
          ) : visiblePage === "app-accounts-trial-balance" ? (
            <AccountsPage session={session} view="trial-balance" />
          ) : visiblePage === "app-accounts-profit-loss" ? (
            <AccountsPage session={session} view="profit-loss" />
          ) : visiblePage === "app-accounts-balance-sheet" ? (
            <AccountsPage session={session} view="balance-sheet" />
          ) : visiblePage === "app-billing-purchase" ? (
            <PurchasePage initialEntryUuid={focusedBillingEntry?.type === "purchase" ? focusedBillingEntry.id : null} session={session} />
          ) : visiblePage === "app-inventory-purchase" ? (
            <PurchaseReceiptPage session={session} />
          ) : visiblePage === "app-inventory-delivery-note" ? (
            <DeliveryNotePage session={session} />
          ) : visiblePage === "app-inventory-stock-ledger" ? (
            <StockLedgerPage session={session} />
          ) : visiblePage === "app-billing-receipts" ? (
            <ReceiptPage initialEntryUuid={focusedBillingEntry?.type === "receipt" ? focusedBillingEntry.id : null} session={session} />
          ) : visiblePage === "app-billing-payments" ? (
            <PaymentPage initialEntryUuid={focusedBillingEntry?.type === "payment" ? focusedBillingEntry.id : null} session={session} />
          ) : visiblePage === "app-billing-quotation-report" ? (
            <QuotationReportPage session={session} />
          ) : visiblePage === "app-billing-customer-statement" ? (
            <CustomerStatementReportPage session={session} />
          ) : visiblePage === "app-billing-supplier-statement" ? (
            <SupplierStatementReportPage session={session} />
          ) : visiblePage === "app-billing-gst-report" ? (
            <GstStatementReportPage session={session} />
          ) : visiblePage === "app-media-library" || visiblePage === "app-media-links" || visiblePage === "app-media-sharing" ? (
            <MediaManagerPage session={session} />
          ) : visiblePage === "app-mail-inbox" ? (
            <MailDeskPage session={session} view="inbox" />
          ) : visiblePage === "app-mail-drafts" ? (
            <MailDeskPage session={session} view="drafts" />
          ) : visiblePage === "app-mail-scheduled" ? (
            <MailDeskPage session={session} view="scheduled" />
          ) : visiblePage === "app-mail-sent" || visiblePage === "app-mail-outbox" ? (
            <MailDeskPage session={session} view="sent" />
          ) : visiblePage === "app-mail-trash" ? (
            <MailDeskPage session={session} view="trash" />
          ) : visiblePage === "app-mail-contacts" ? (
            <MailDeskPage session={session} view="contacts" />
          ) : visiblePage === "app-mail-compose" ? (
            <MailDeskPage session={session} view="compose" />
          ) : visiblePage === "app-mail-settings" ? (
            <MailDeskPage session={session} view="settings" />
          ) : visiblePage === "app-sites-sliders" ? (
            <SiteSliderPage session={session} />
          ) : visiblePage === "app-crm-tasks" || visiblePage === "app-taskmanager-my-tasks" ? (
            <TaskManagerPage scope="my" session={session} />
          ) : visiblePage === "app-crm-leads" ? (
            <CrmPage session={session} view="leads" />
          ) : visiblePage === "app-crm-deals" ? (
            <CrmPage session={session} view="deals" />
          ) : visiblePage === "app-crm-pipeline" || visiblePage === "app-crm-stages" ? (
            <CrmPage session={session} view="pipeline" />
          ) : visiblePage === "app-taskmanager-assigned-to-me" ? (
            <TaskManagerPage scope="assigned-to-me" session={session} />
          ) : visiblePage === "app-taskmanager-open-tasks" ? (
            <TaskManagerPage scope="open" session={session} />
          ) : visiblePage === "app-taskmanager-all-tasks" || visiblePage === "app-taskmanager-tasks" || visiblePage === "app-taskmanager-gst-verification" || visiblePage === "app-taskmanager-auditor-follow-up" ? (
            <TaskManagerPage scope="all" session={session} />
          ) : visiblePage === "app-taskmanager-templates" ? (
            <TaskManagerAutomationPage session={session} view="templates" />
          ) : visiblePage === "app-taskmanager-campaigns" ? (
            <TaskManagerAutomationPage session={session} view="campaigns" />
          ) : visiblePage === "app-taskmanager-reminders" ? (
            <TaskManagerAutomationPage session={session} view="reminders" />
          ) : visiblePage === "app-taskmanager-performance" ? (
            <TaskManagerAutomationPage session={session} view="performance" />
          ) : visiblePage === "app-taskmanager-categories" ? (
            <TaskManagerAutomationPage session={session} view="categories" />
          ) : visiblePage === "app-taskmanager-task-tags" ? (
            <TaskManagerAutomationPage session={session} view="tags" />
          ) : visiblePage === "app-taskmanager-settings" ? (
            <TaskManagerAutomationPage session={session} view="settings" />
          ) : visiblePage === "app-tally-handshake" || visiblePage === "app-tally-settings" ? (
            <TallyPage session={session} view="handshake" />
          ) : visiblePage === "app-tally-desk" ? (
            <TallyPage session={session} view="desk" />
          ) : visiblePage === "app-tally-contact-sync" ? (
            <TallySyncPage session={session} view="contacts" />
          ) : visiblePage === "app-tally-product-sync" ? (
            <TallySyncPage session={session} view="products" />
          ) : visiblePage === "app-tally-sales-sync" ? (
            <TallySyncPage session={session} view="sales" />
          ) : visiblePage === "app-tally-purchase-sync" ? (
            <TallySyncPage session={session} view="purchase" />
          ) : visiblePage === "app-tally-sync-jobs" ? (
            <TallyPage session={session} view="jobs" />
          ) : visiblePage === "app-frappe-handshake" || visiblePage === "app-frappe-settings" ? (
            <FrappePage session={session} view="handshake" />
          ) : visiblePage === "app-frappe-desk" ? (
            <FrappePage session={session} view="desk" />
          ) : visiblePage === "app-frappe-sync-jobs" ? (
            <FrappePage session={session} view="jobs" />
          ) : agentOsPages.includes(visiblePage) ? (
            <AgentOsPage session={session} view={agentOsViewFromPage(visiblePage)} />
          ) : visiblePage === "app-billing-settings" ? (
            <SalesSettingsPage session={session} />
          ) : visiblePage === "app-billing-document-settings" ? (
            <DocumentSettingsPage exportSalesEnabled={exportSalesEnabled} session={session} />
          ) : visiblePage === "app-billing-gst-production" ? (
            <GstSandboxPage allowEnvironmentSelect preferredEnvironment="production" session={session} />
          ) : visiblePage === "app-inventory-document-settings" ? (
            <InventoryDocumentSettingsPage session={session} />
          ) : visiblePage === "app-auditor-contact-details" ? (
            <AuditorContactDetailPage session={session} />
          ) : visiblePage === "app-auditor-gst-filing" ? (
            <AuditorGstFilingPage session={session} />
          ) : moduleKey === "contacts" ? (
            <ContactPage session={session} />
          ) : moduleKey === "products" ? (
            <ProductPage session={session} />
          ) : moduleKey && pageModuleKind(moduleKey) === "master" ? (
            <MasterDataPage moduleKey={moduleKey} session={session} />
          ) : moduleKey ? (
            <CommonDataPage moduleKey={moduleKey} session={session} />
          ) : appModulePages.includes(visiblePage) ? (
            <AppModuleDesk appId={activeApp} page={visiblePage} />
          ) : (
            <DashboardHome
              activeApp={activeApp}
              appEnabled={featureEnabledApps}
              defaultCompanyContext={defaultCompanyContextQuery.data ?? null}
              exportSalesEnabled={exportSalesEnabled}
              mode={mode}
              onChangeApp={changeApp}
              onOpenBillingEntry={openBillingEntry}
              onNavigate={navigate}
              session={session}
              quotationEnabled={quotationEnabled}
            />
          )}
        </Suspense>
        <Suspense fallback={null}>
          <ZetroChatWindow
            open={zetroChatOpen}
            session={session}
            onOpenBase={() => {
              setZetroChatOpen(false)
              navigate("app-agent-os-base")
            }}
            onOpenChange={setZetroChatOpen}
          />
        </Suspense>
      </SidebarInset>
    </SidebarProvider>
  )
}

function AppModuleDesk({ appId, page }: { appId: DashboardAppId; page: DashboardPage }) {
  const app = getDashboardApp(appId)
  const menuItem = app.menu.find((item) => item.page === page)
  const Icon = menuItem?.icon ?? app.icon
  const activeGroup = app.menuGroups.find((group) => group.items.some((item) => item.page === page))

  return (
    <div className="@container/main flex flex-1 flex-col gap-6 px-4 py-4 md:py-6 lg:px-6">
      <Card className="overflow-hidden rounded-2xl border-border/70 bg-card/95 shadow-sm">
        <CardHeader className="relative">
          <div className="absolute right-8 top-6 h-28 w-28 rounded-full bg-primary/10 blur-2xl" />
          <div className="relative flex items-start gap-4">
            <span className={`flex size-12 items-center justify-center rounded-xl ${app.accent}`}>
              <Icon className="size-6" />
            </span>
            <div>
              <CardTitle className="text-2xl">{menuItem?.title ?? app.name}</CardTitle>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                {app.name} has an isolated dashboard and side menu. These cards are wired as dummy module surfaces until the real screens are implemented.
              </p>
              {activeGroup ? <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-primary">{activeGroup.title}</p> : null}
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
          {app.menuGroups.map((group) => {
            const GroupIcon = group.icon
            return (
              <section key={group.title} className="rounded-xl border border-border/70 bg-background/80 p-4 shadow-sm">
                <div className="mb-3">
                  <div className="flex items-center gap-2">
                    <GroupIcon className="size-4 text-muted-foreground" />
                    <h3 className="text-base font-semibold text-foreground">{group.title}</h3>
                  </div>
                  <p className="mt-1 text-sm leading-5 text-muted-foreground">{appGroupDescription(group.title)}</p>
                </div>
                <div className="space-y-2">
                  {group.items.map((item) => {
                    const ItemIcon = item.icon
                    const active = item.page === page
                    return (
                      <button
                        key={item.title}
                        className={cn(
                          "group flex w-full items-center gap-3 rounded-md border px-3 py-2.5 text-left transition-all duration-200 hover:border-primary/40 hover:bg-primary/5",
                          active ? "border-primary/50 bg-primary/5" : "border-border/70 bg-background",
                        )}
                        onClick={() => {
                          window.history.pushState(null, "", dashboardPath(window.location.pathname.split("/")[1] ? `/${window.location.pathname.split("/")[1]}` : "/app", item.page))
                          window.dispatchEvent(new Event("popstate"))
                        }}
                        type="button"
                      >
                        <span className="flex size-5 shrink-0 items-center justify-center text-muted-foreground transition-colors group-hover:text-primary">
                          <ItemIcon className="size-4" />
                        </span>
                        <span className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground transition-colors group-hover:text-primary">{item.title}</span>
                        <span className="text-muted-foreground transition-colors group-hover:text-primary">↗</span>
                      </button>
                    )
                  })}
                </div>
              </section>
            )
          })}
        </CardContent>
      </Card>
    </div>
  )
}

function LandingDeskSettingsPage({
  activeApp,
  enabledApps,
  landingApp,
  onChangeApp,
  onChangeLandingApp,
  isSaving,
}: {
  activeApp: DashboardAppId
  enabledApps: Record<DashboardAppId, boolean>
  isSaving: boolean
  landingApp: DashboardAppId
  onChangeApp(appId: DashboardAppId): void
  onChangeLandingApp(appId: DashboardAppId): void
}) {
  const enabledAppOptions = dashboardApps.filter((app) => enabledApps[app.id])

  return (
    <div className="@container/main flex flex-1 flex-col gap-6 px-4 py-4 md:py-6 lg:px-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Landing Desk</h1>
        <p className="mt-1 text-sm text-muted-foreground">Choose which enabled app opens first for this workspace.</p>
      </div>

      <Card className="rounded-md border-border/70 bg-card/95 shadow-sm">
        <CardHeader>
          <CardTitle>Default landing app</CardTitle>
          <p className="text-sm text-muted-foreground">{isSaving ? "Saving landing desk..." : "Only enabled apps are available as landing choices."}</p>
        </CardHeader>
        <CardContent>
          <RadioGroup value={landingApp} onValueChange={(value) => isDashboardAppId(value) && onChangeLandingApp(value)} className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {enabledAppOptions.map((app) => {
              const AppIcon = app.icon
              return (
                <label
                  key={app.id}
                  className={cn(
                    "flex cursor-pointer items-start gap-3 rounded-md border p-4 transition hover:border-primary/40 hover:bg-muted/30",
                    landingApp === app.id ? "border-primary/50 bg-primary/5" : "border-border/70 bg-background",
                  )}
                >
                  <RadioGroupItem value={app.id} className="mt-1" />
                  <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-md", app.accent)}>
                    <AppIcon className="size-5" />
                  </span>
                  <span className="min-w-0">
                    <span className="block font-semibold text-foreground">{app.name}</span>
                    <span className="mt-1 block text-sm leading-5 text-muted-foreground">{app.description}</span>
                  </span>
                </label>
              )
            })}
          </RadioGroup>
        </CardContent>
      </Card>

      <Card className="rounded-md border-border/70 bg-card/95 shadow-sm">
        <CardHeader>
          <CardTitle>Enabled apps</CardTitle>
          <p className="text-sm text-muted-foreground">App access is controlled by the super admin. Enabled apps can be selected as the landing desk and opened from the app switcher.</p>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {dashboardApps.map((app) => {
            const enabled = enabledApps[app.id]
            const AppIcon = app.icon
            return (
              <div
                key={app.id}
                className={cn(
                  "rounded-md border p-4",
                  app.id === activeApp ? "border-primary/50 bg-primary/5" : "border-border/70 bg-background",
                )}
              >
                <div className="flex items-start justify-between gap-4">
                  <span className={cn("flex size-10 items-center justify-center rounded-md", app.accent)}>
                    <AppIcon className="size-5" />
                  </span>
                  <span className={cn("rounded-full px-2 py-0.5 text-[11px]", enabled ? "bg-emerald-50 text-emerald-700" : "bg-muted text-muted-foreground")}>
                    {enabled ? "Enabled" : "Disabled"}
                  </span>
                </div>
                <div className="mt-4">
                  <h3 className="font-semibold text-foreground">{app.name}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{app.description}</p>
                  {enabled ? (
                    <button className="mt-3 text-sm font-medium text-primary hover:underline" type="button" onClick={() => onChangeApp(app.id)}>
                      Open app
                    </button>
                  ) : null}
                </div>
              </div>
            )
          })}
        </CardContent>
      </Card>
    </div>
  )
}

function getBreadcrumbLabel({ appId, mode, page }: { appId: DashboardAppId; mode: DashboardMode; page: DashboardPage }) {
  const app = getDashboardApp(appId)
  if (page === "overview") return `${app.name} Desk`
  const appMenuLabel = app.menu.find((item) => item.page === page)?.title
  if (appMenuLabel) return appMenuLabel
  if (mode === "admin" && page === "company") return "Helpdesk"
  return pageLabels[page] ?? dashboardTitles[mode]
}

function agentOsViewFromPage(page: DashboardPage) {
  if (page === "app-agent-os-providers") return "providers"
  if (page === "app-agent-os-knowledge") return "knowledge"
  if (page === "app-agent-os-agents") return "agents"
  if (page === "app-agent-os-queries") return "queries"
  if (page === "app-agent-os-updates") return "updates"
  return "base"
}

function appGroupDescription(title: string) {
  const descriptions: Record<string, string> = {
    "Entries": "Daily vouchers and money movement.",
    "Report": "Statements, summaries, and operational views.",
    "Reports": "Statements, summaries, and operational views.",
    "Master": "Parties, products, and reusable master data.",
    "Common": "Shared setup data used across modules.",
    "Settings": "App setup, layouts, and controls.",
    "Library": "Upload, browse, and organize media.",
    "Management": "Share, link, and govern media assets.",
    "Mail Desk": "Compose, queue, and inspect workspace mail.",
    "Tally Desk": "Handshake, single-operation sync, and job controls.",
    "Frappe Desk": "Handshake, DocType operations, and sync activity.",
    "ZETRO": "Helper knowledge, safe tools, workflows, planning, analytics, and memory.",
    "Master Sync": "Contacts and products pushed as reusable Tally masters.",
    "Entry Sync": "Invoice and purchase checks built on synced masters.",
    "Storefront": "Store operations and checkout flow.",
    "Catalog": "Products, collections, and variants.",
    "Customers": "Customer records and engagement.",
    "Fulfillment": "Shipping, delivery, and returns.",
    "Marketing": "Campaigns, SEO, and promotions.",
    "Content": "Pages, posts, blocks, and templates.",
    "Media": "Assets, banners, and media library.",
    "Site Structure": "Navigation, menus, and redirects.",
    "Lead Capture": "Forms, submissions, and lead sync.",
    "Publishing": "SEO, campaigns, and scheduled content.",
    "Pipeline": "Leads, deals, and sales flow.",
    "People": "Contacts, accounts, and segments.",
    "Activity": "Tasks, calls, and meetings.",
    "Campaign": "Outbound CRM campaigns.",
    "Stock": "Items, stock, and adjustments.",
    "Warehouse": "Warehouses, bins, and transfers.",
    "Purchase": "Purchase, suppliers, and receipts.",
    "Product Common": "Categories, brands, and units.",
    "Sites": "Sites, landing pages, and domains.",
    "Workspace": "Profiles, products, RFQs, leads, and membership activity.",
  }
  return descriptions[title] ?? "Workspace menu shortcuts."
}

function readStoredApp(): DashboardAppId {
  const value = window.localStorage.getItem("cxsun.activeApp") ?? "billing"
  if (value === "site") return "sites"
  return isDashboardAppId(value) ? value : "billing"
}

function readStoredEnabledApps(): Record<DashboardAppId, boolean> {
  try {
    const stored = window.localStorage.getItem("cxsun.enabledApps.v2")
    if (!stored) return defaultEnabledApps
    return { ...defaultEnabledApps, ...JSON.parse(stored), application: true }
  } catch {
    return defaultEnabledApps
  }
}

function enabledAppsForSession(session: AuthSession): Record<DashboardAppId, boolean> {
  const tenantSettings = parseTenantPayloadSettings(session.selectedTenant.payload_settings)
  const enabledIds = Array.isArray(tenantSettings.apps?.enabled)
    ? tenantSettings.apps.enabled.filter((value): value is DashboardAppId => typeof value === "string" && isDashboardAppId(value))
    : null

  if (!enabledIds) {
    return applicationOnlyApps()
  }

  const enabled = Object.fromEntries(dashboardApps.map((app) => [app.id, app.id === "application" || app.id === "agent-os" || enabledIds.includes(app.id)])) as Record<DashboardAppId, boolean>
  return { ...enabled, application: true, "agent-os": true }
}

function parseTenantPayloadSettings(value?: string): { apps?: { enabled?: unknown[] } } {
  try {
    const parsed = value ? JSON.parse(value) : {}
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {}
  } catch {
    return {}
  }
}

function readStoredLandingApp(enabledApps: Record<DashboardAppId, boolean>): DashboardAppId {
  return fallbackLandingApp(enabledApps)
}

function fallbackLandingApp(enabledApps: Record<DashboardAppId, boolean>): DashboardAppId {
  return dashboardApps.find((app) => enabledApps[app.id])?.id ?? "application"
}

function applicationOnlyApps(): Record<DashboardAppId, boolean> {
  return Object.fromEntries(dashboardApps.map((app) => [app.id, app.id === "application" || app.id === "agent-os"])) as Record<DashboardAppId, boolean>
}

function isAppAvailableFromAccess(enabledApps: Record<DashboardAppId, boolean>, appId: DashboardAppId) {
  return enabledApps[appId]
}

function isAppAvailableForLanding(enabledApps: Record<DashboardAppId, boolean>, appId: DashboardAppId) {
  return enabledApps[appId]
}
