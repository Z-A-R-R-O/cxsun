import { Bug, Building2, ChevronRight, HandCoins, Headset, Network, RefreshCw, ReceiptIndianRupee, ReceiptText, Send, ShieldCheck, ShoppingBag, UserRoundCheck } from "lucide-react"
import { useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { Card, CardContent, CardHeader, CardTitle } from "src/components/ui/card"
import { SectionCards } from "./section-cards"
import type { DashboardMode, DashboardPage } from "src/components/blocks/sidebar/app-sidebar"
import { cn } from "src/lib/utils"
import { dashboardApps, type DashboardAppId, type DashboardAppMenuItem } from "src/components/blocks/dashboard/dashboard-apps"
import type { AuthSession } from "src/features/auth/auth-client"
import type { DefaultCompanyContext } from "src/features/company/company-client"
import { listPaymentEntries, type PaymentEntry } from "src/features/payment/payment-client"
import { listPurchaseEntries, type PurchaseEntry } from "src/features/purchase/purchase-client"
import { listReceiptEntries, type ReceiptEntry } from "src/features/receipt/receipt-client"
import { listSalesEntries, type SalesEntry } from "src/features/sales/sales-client"
import { listExportSalesEntries, type ExportSalesEntry } from "src/features/export-sales/export-sales-client"

const dashboardCopy = {
  "super-admin": {
    title: "Super admin control",
    description: "Work from two clean areas: platform/master database modules and tenant-database modules.",
    metrics: [
      { label: "Master Modules", value: "5", trend: "Tenant, domain, industry, updates, admin users", description: "MariaDB-backed platform control data", direction: "up" as const },
      { label: "Tenant Database", value: "Company", trend: "Tenant-owned data lane", description: "Company records resolve into tenant database context", direction: "up" as const },
      { label: "Platform Masters", value: "Live", trend: "Industries and admin users available", description: "MariaDB-backed orchestration data", direction: "up" as const },
      { label: "Security Surface", value: "JWT", trend: "Tenant runtime requires auth", description: "Company APIs use tenant context", direction: "up" as const },
    ],
    cards: [
      { title: "Platform / Master Database", body: "Manage tenants, domains, industries, system updates, and admin users.", Icon: Network },
      { title: "Tenant Database", body: "Keep tenant-owned modules such as Company in the tenant database lane so ownership is obvious.", Icon: ShieldCheck },
      { title: "Provisioning Control", body: "Startup prepares each configured tenant database before the API accepts traffic.", Icon: Building2 },
    ],
  },
  admin: {
    title: "Admin software desk",
    description: "Support users who operate this software, triage bugs, help clients, and monitor release/update activity.",
    metrics: [
      { label: "Helpdesk", value: "Ready", trend: "Support desk separated", description: "Software operators stay outside tenant data", direction: "up" as const },
      { label: "Bugs", value: "Triage", trend: "Issue flow prepared", description: "Bug handling has its own admin lane", direction: "up" as const },
      { label: "Updates", value: "Live", trend: "System update view available", description: "Admin can monitor runtime update flow", direction: "up" as const },
    ],
    cards: [
      { title: "Helpdesk", body: "Track support questions and operational help without entering isolated tenant company records.", Icon: Headset },
      { title: "Bug Triage", body: "Keep software bugs separate from tenant business data so support work stays clean.", Icon: Bug },
      { title: "Release Care", body: "Use system update tools for maintenance, restart checks, and deployment readiness.", Icon: RefreshCw },
    ],
  },
  tenant: {
    title: "Workspace dashboard",
    description: "A client-isolated workspace for company setup, roles, and enabled app shortcuts.",
    metrics: [
      { label: "Workspace Scope", value: "Isolated", trend: "Runtime resolves workspace DB", description: "Requests use JWT and selected workspace", direction: "up" as const },
      { label: "Companies", value: "Workspace DB", trend: "Company records are local", description: "No cross-workspace company access", direction: "up" as const },
      { label: "Roles", value: "Workspace RBAC", trend: "Role policies live workspace-side", description: "rbac_roles and role policies are per workspace", direction: "up" as const },
    ],
    cards: [
      { title: "Companies", body: "Create and maintain company records inside the selected workspace database.", Icon: Building2 },
      { title: "Roles", body: "Workspace-local roles and policy assignments live in the workspace database.", Icon: ShieldCheck },
      { title: "Clean Boundary", body: "Workspace users do not see platform setup, industry, admin-user manager, or update orchestration pages.", Icon: Network },
    ],
  },
}

export function DashboardHome({
  activeApp = "application",
  mode,
  onChangeApp,
  onOpenBillingEntry,
  onNavigate,
  defaultCompanyContext,
  exportSalesEnabled = true,
  quotationEnabled = true,
  session,
}: {
  activeApp?: DashboardAppId
  appEnabled?: Record<DashboardAppId, boolean>
  defaultCompanyContext?: DefaultCompanyContext | null
  exportSalesEnabled?: boolean
  mode: DashboardMode
  onChangeApp?: (appId: DashboardAppId) => void
  onOpenBillingEntry?: (entry: BillingRecentTransaction) => void
  onNavigate?: (page: DashboardPage) => void
  quotationEnabled?: boolean
  session?: AuthSession
}) {
  const content = dashboardCopy[mode]
  const selectedApp = dashboardApps.find((app) => app.id === activeApp) ?? dashboardApps[0]
  const SelectedAppIcon = selectedApp.icon
  const metrics = mode === "tenant" ? [] : content.metrics
  const cards = mode === "tenant" ? [] : content.cards
  const eyebrow = mode === "tenant" ? selectedApp.name : content.title

  return (
    <div className="@container/main flex flex-1 flex-col gap-6 py-4 md:py-6">
      <div className="px-4 lg:px-6">
        <div
          className="overflow-hidden rounded-2xl border bg-card/90 p-5 shadow-sm"
          style={{ backgroundImage: deskHeaderBackground(selectedApp.id) }}
        >
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-4">
              <span className={cn("flex size-14 shrink-0 items-center justify-center rounded-xl", selectedApp.accent)}>
                <SelectedAppIcon className="size-7" />
              </span>
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-primary">{eyebrow}</p>
                <h1 className="mt-2 text-2xl font-bold tracking-tight md:text-3xl">{selectedApp.name} Desk</h1>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">{selectedApp.description || content.description}</p>
              </div>
            </div>
            <div className="flex w-fit items-center gap-2.5 rounded-full border bg-background/90 px-4 py-2 shadow-sm backdrop-blur-sm">
              <UserRoundCheck className="size-4 text-primary" />
              <span className="text-xs font-semibold text-foreground">
                Signed in as {session?.user.name ?? "Workspace user"}
              </span>
            </div>
          </div>
        </div>
      </div>
      {metrics.length ? <SectionCards metrics={metrics} /> : null}
      {mode === "tenant" && activeApp === "billing" && session ? (
        <BillingTransactionDashboard defaultCompanyContext={defaultCompanyContext ?? null} exportSalesEnabled={exportSalesEnabled} onNavigate={onNavigate} onOpenBillingEntry={onOpenBillingEntry} session={session} />
      ) : null}
      {mode === "tenant" ? <DeskShortcutCards appId={selectedApp.id} exportSalesEnabled={exportSalesEnabled} quotationEnabled={quotationEnabled} onNavigate={onNavigate} onChangeApp={onChangeApp} /> : null}
      {cards.length ? (
        <div className="grid gap-4 px-4 lg:grid-cols-3 lg:px-6">
          {cards.map(({ body, Icon, title }) => (
            <Card key={title}>
              <CardHeader>
                <div className="mb-2 flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="size-5" />
                </div>
                <CardTitle>{title}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm leading-6 text-muted-foreground">{body}</CardContent>
            </Card>
          ))}
        </div>
      ) : null}
    </div>
  )
}

function deskHeaderBackground(appId: DashboardAppId) {
  const accentByApp: Record<DashboardAppId, string> = {
    accounts: "rgba(77, 124, 15, 0.20)",
    "agent-os": "rgba(24, 24, 27, 0.16)",
    application: "rgba(15, 23, 42, 0.16)",
    auditor: "rgba(162, 28, 175, 0.18)",
    billing: "rgba(5, 150, 105, 0.20)",
    crm: "rgba(37, 99, 235, 0.18)",
    ecommerce: "rgba(219, 39, 119, 0.18)",
    frappe: "rgba(3, 105, 161, 0.18)",
    inventory: "rgba(234, 88, 12, 0.18)",
    mail: "rgba(13, 148, 136, 0.18)",
    media: "rgba(2, 132, 199, 0.18)",
    sites: "rgba(124, 58, 237, 0.18)",
    tally: "rgba(29, 78, 216, 0.18)",
    taskmanager: "rgba(8, 145, 178, 0.18)",
    tconnect: "rgba(14, 116, 144, 0.20)",
  }

  return `radial-gradient(circle at 82% 18%, ${accentByApp[appId]}, transparent 44%)`
}

function BillingTransactionDashboard({
  defaultCompanyContext,
  exportSalesEnabled,
  onNavigate,
  onOpenBillingEntry,
  session,
}: {
  defaultCompanyContext: DefaultCompanyContext | null
  exportSalesEnabled: boolean
  onNavigate?: (page: DashboardPage) => void
  onOpenBillingEntry?: (entry: BillingRecentTransaction) => void
  session: AuthSession
}) {
  const contextKey = [
    defaultCompanyContext?.companyId ?? "company",
    defaultCompanyContext?.accountingYearId ?? "year",
    defaultCompanyContext?.accountingYearStartDate ?? "start",
    defaultCompanyContext?.accountingYearEndDate ?? "end",
  ]
  const salesQuery = useQuery({ queryKey: ["billing-overview-sales", session.selectedTenant.slug, ...contextKey], queryFn: () => listSalesEntries(session) })
  const exportSalesQuery = useQuery({ enabled: exportSalesEnabled, queryKey: ["billing-overview-export-sales", session.selectedTenant.slug, ...contextKey], queryFn: () => listExportSalesEntries(session) })
  const purchaseQuery = useQuery({ queryKey: ["billing-overview-purchase", session.selectedTenant.slug, ...contextKey], queryFn: () => listPurchaseEntries(session) })
  const receiptQuery = useQuery({ queryKey: ["billing-overview-receipt", session.selectedTenant.slug, ...contextKey], queryFn: () => listReceiptEntries(session) })
  const paymentQuery = useQuery({ queryKey: ["billing-overview-payment", session.selectedTenant.slug, ...contextKey], queryFn: () => listPaymentEntries(session) })
  const isLoading = salesQuery.isLoading || exportSalesQuery.isLoading || purchaseQuery.isLoading || receiptQuery.isLoading || paymentQuery.isLoading

  const summary = useMemo(
    () => buildBillingSummary({
      context: defaultCompanyContext,
      exportSales: exportSalesEnabled ? exportSalesQuery.data ?? [] : [],
      exportSalesEnabled,
      payments: paymentQuery.data ?? [],
      purchases: purchaseQuery.data ?? [],
      receipts: receiptQuery.data ?? [],
      sales: salesQuery.data ?? [],
    }),
    [defaultCompanyContext, exportSalesEnabled, exportSalesQuery.data, paymentQuery.data, purchaseQuery.data, receiptQuery.data, salesQuery.data],
  )

  return (
    <div className="space-y-5 px-4 lg:px-6">
      <div className={cn("grid gap-5 md:grid-cols-2", exportSalesEnabled ? "xl:grid-cols-5" : "xl:grid-cols-4")}>
        {summary.cards.map((card) => {
          const visual = billingCardVisual(card.label)
          const Icon = visual.icon
          return (
            <button
              key={card.label}
              className="group/card flex flex-col gap-4 overflow-hidden rounded-md border border-border/70 bg-card/95 py-4 text-left text-sm text-card-foreground shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-md"
              onClick={() => onNavigate?.(billingCardPage(card.label))}
              type="button"
            >
              <CardHeader className="px-5 pb-3 pt-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">{card.label}</p>
                    <CardTitle className="mt-1 text-2xl tabular-nums">{isLoading ? "..." : formatCurrency(card.yearAmount)}</CardTitle>
                  </div>
                  <span className={cn("flex size-11 shrink-0 items-center justify-center rounded-md text-white", visual.accent)}>
                    <Icon className="size-5" />
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 px-5 pb-5 text-sm">
                <div className="flex justify-between gap-3">
                  <span className="text-muted-foreground">This year</span>
                  <span className="font-medium">{formatCurrency(card.yearAmount)}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-muted-foreground">This month</span>
                  <span className="font-medium">{formatCurrency(card.monthAmount)}</span>
                </div>
              </CardContent>
            </button>
          )
        })}
      </div>

      <div className="grid items-stretch gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
        <Card className="h-full rounded-md border-border/70 bg-card/95 shadow-sm">
          <CardHeader className="px-5 pb-4 pt-5">
            <CardTitle>Transaction Movement</CardTitle>
            <p className="text-sm text-muted-foreground">Monthly sales, purchase, receipts, and payments for {summary.periodLabel}.</p>
          </CardHeader>
          <CardContent className="space-y-5 px-5 pb-5">
            <TransactionBars rows={summary.monthly} />
            <PeriodSummaryTable exportSalesEnabled={exportSalesEnabled} rows={summary.monthly} />
          </CardContent>
        </Card>

        <Card className="flex h-full min-h-0 flex-col overflow-hidden rounded-md border-border/70 bg-card/95 shadow-sm">
          <CardHeader className="px-5 pb-4 pt-5">
            <CardTitle>Recent Transactions</CardTitle>
            <p className="text-sm text-muted-foreground">Latest sales, purchase, receipt, and payment activity.</p>
          </CardHeader>
          <CardContent className="min-h-0 flex-1 overflow-hidden px-5 pb-5">
            <RecentTransactions onOpen={onOpenBillingEntry} rows={summary.recent} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function DeskShortcutCards({ appId, exportSalesEnabled, onChangeApp, onNavigate, quotationEnabled }: { appId: DashboardAppId; exportSalesEnabled: boolean; onChangeApp?: (appId: DashboardAppId) => void; onNavigate?: (page: DashboardPage) => void; quotationEnabled: boolean }) {
  const app = dashboardApps.find((entry) => entry.id === appId) ?? dashboardApps[0]

  return (
    <div className="grid gap-4 px-4 lg:grid-cols-2 2xl:grid-cols-3 lg:px-6">
      {app.menuGroups.map((group) => {
        const GroupIcon = group.icon
        return (
          <Card key={group.title} className="rounded-md border-border/70 bg-card/95 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <GroupIcon className="size-4 text-muted-foreground" />
                <CardTitle className="text-base">{group.title}</CardTitle>
              </div>
              <p className="text-sm leading-5 text-muted-foreground">{appGroupDescription(group.title)}</p>
            </CardHeader>
            <CardContent className="space-y-2">
              {group.items.filter((item) => isShortcutFeatureVisible(item, { exportSalesEnabled, quotationEnabled })).map((item) => (
                <ShortcutButton key={item.title} item={item} onSelect={(page) => {
                  const nextApp = dashboardAppIdFromPage(page)
                  if (nextApp) {
                    onChangeApp?.(nextApp)
                  }
                  onNavigate?.(page)
                }} />
              ))}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

function isShortcutFeatureVisible(item: DashboardAppMenuItem, features: { exportSalesEnabled: boolean; quotationEnabled: boolean }) {
  if (!features.quotationEnabled && item.page === "app-billing-quotation") return false
  if (!features.exportSalesEnabled && item.page === "app-billing-export-sales") return false
  return true
}

function TransactionBars({ rows }: { rows: Array<{ month: string; payments: number; purchase: number; receipts: number; sales: number }> }) {
  const maxValue = Math.max(1, ...rows.flatMap((row) => [row.sales, row.purchase, row.receipts, row.payments]))
  const series = [
    { key: "sales", label: "Sales", color: "#059669" },
    { key: "purchase", label: "Purchase", color: "#0ea5e9" },
    { key: "receipts", label: "Receipts", color: "#f59e0b" },
    { key: "payments", label: "Payments", color: "#e11d48" },
  ] as const
  const width = 720
  const height = 280
  const padding = { bottom: 34, left: 32, right: 16, top: 14 }
  const chartHeight = height - padding.top - padding.bottom
  const chartWidth = width - padding.left - padding.right
  const groupWidth = chartWidth / rows.length
  const barWidth = Math.min(9, Math.max(4, groupWidth / 7))
  const chartBottom = height - padding.bottom

  function yFor(value: number) {
    return chartBottom - (value / maxValue) * chartHeight
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground">
        {series.map((item) => (
          <span key={item.key} className="inline-flex items-center gap-1.5">
            <span className="size-2 rounded-sm" style={{ backgroundColor: item.color }} />
            {item.label}
          </span>
        ))}
      </div>
      <div className="overflow-hidden rounded-md border border-border/70 bg-background/70 px-4 py-5">
        <svg aria-label="Monthly billing transaction movement" className="h-[300px] w-full" preserveAspectRatio="none" role="img" viewBox={`0 0 ${width} ${height}`}>
          {[0.25, 0.5, 0.75, 1].map((ratio) => {
            const y = chartBottom - chartHeight * ratio
            return <line key={ratio} stroke="hsl(var(--border))" strokeOpacity="0.7" strokeWidth="1" x1={padding.left} x2={width - padding.right} y1={y} y2={y} />
          })}
          {rows.map((row, monthIndex) => {
            const groupStart = padding.left + monthIndex * groupWidth
            const groupCenter = groupStart + groupWidth / 2
            return (
              <g key={row.month}>
                {series.map((item, seriesIndex) => {
                  const value = row[item.key]
                  const barHeight = (value / maxValue) * chartHeight
                  const x = groupCenter - (series.length * barWidth + (series.length - 1) * 3) / 2 + seriesIndex * (barWidth + 3)
                  const y = yFor(value)
                  const begin = `${monthIndex * 35 + seriesIndex * 25}ms`
                  return (
                    <rect fill={item.color} key={item.key} rx="3" width={barWidth} x={x} y={chartBottom} height="0">
                      <title>{`${item.label} ${row.month}: ${formatCurrency(value)}`}</title>
                      <animate attributeName="height" begin={begin} dur="650ms" fill="freeze" from="0" to={String(Math.max(0, barHeight))} />
                      <animate attributeName="y" begin={begin} dur="650ms" fill="freeze" from={String(chartBottom)} to={String(y)} />
                    </rect>
                  )
                })}
                <text fill="hsl(var(--muted-foreground))" fontSize="11" textAnchor="middle" x={groupCenter} y={height - 8}>{row.month}</text>
              </g>
            )
          })}
        </svg>
      </div>
    </div>
  )
}

function billingCardVisual(label: string) {
  if (label === "Total Sales") return { accent: "bg-emerald-600", icon: ReceiptText }
  if (label === "Export Sales") return { accent: "bg-violet-600", icon: Send }
  if (label === "Total Purchase") return { accent: "bg-sky-600", icon: ShoppingBag }
  if (label === "Receipts") return { accent: "bg-amber-500", icon: ReceiptIndianRupee }
  return { accent: "bg-rose-600", icon: HandCoins }
}

function billingCardPage(label: string): DashboardPage {
  if (label === "Total Sales") return "app-billing-sales"
  if (label === "Export Sales") return "app-billing-export-sales"
  if (label === "Total Purchase") return "app-billing-purchase"
  if (label === "Receipts") return "app-billing-receipts"
  return "app-billing-payments"
}

function RecentTransactions({ onOpen, rows }: { onOpen?: (entry: BillingRecentTransaction) => void; rows: BillingRecentTransaction[] }) {
  if (!rows.length) {
    return <div className="rounded-md border border-dashed border-border/70 p-4 text-sm text-muted-foreground">No recent transactions found for the current accounting year.</div>
  }

  return (
    <div className="max-h-[395px] space-y-3 overflow-hidden">
      {rows.map((row) => (
        <button
          key={`${row.type}-${row.id}`}
          className="flex w-full items-start justify-between gap-4 rounded-md border border-border/70 bg-background/70 px-4 py-3.5 text-left transition hover:border-primary/40 hover:bg-primary/5"
          onClick={() => onOpen?.(row)}
          title={`Open ${row.documentNo}`}
          type="button"
        >
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className={cn("size-2 rounded-full", transactionTone(row.type))} />
              <span className="truncate text-sm font-semibold">{row.documentNo}</span>
            </div>
            <div className="mt-1 truncate text-xs text-muted-foreground">{row.partyName || row.type}</div>
            <div className="mt-1 text-xs text-muted-foreground">{formatDisplayDate(row.date)}</div>
          </div>
          <div className="shrink-0 text-right">
            <div className="text-sm font-semibold tabular-nums">{formatCurrency(row.amount)}</div>
            <div className="mt-1 text-xs capitalize text-muted-foreground">{row.type}</div>
          </div>
        </button>
      ))}
    </div>
  )
}

function PeriodSummaryTable({ exportSalesEnabled, rows }: { exportSalesEnabled: boolean; rows: BillingMonthlySummary[] }) {
  const gridClassName = exportSalesEnabled ? "grid-cols-[1fr_repeat(5,minmax(0,1.1fr))]" : "grid-cols-[1fr_repeat(4,minmax(0,1.1fr))]"
  return (
    <div className="overflow-hidden rounded-md border border-border/70">
      <div className={cn("grid bg-muted/40 px-3 py-2 text-xs font-semibold text-muted-foreground", gridClassName)}>
        <span>Month</span>
        <span className="text-right">Sales</span>
        {exportSalesEnabled ? <span className="text-right">Export Sales</span> : null}
        <span className="text-right">Purchase</span>
        <span className="text-right">Receipts</span>
        <span className="text-right">Payments</span>
      </div>
      <div className="max-h-48 overflow-auto">
        {rows.map((row) => (
          <div key={row.month} className={cn("grid border-t border-border/70 px-3 py-2 text-xs", gridClassName)}>
            <span className="font-medium">{row.month}</span>
            <span className="text-right tabular-nums">{formatCompactCurrency(row.sales)}</span>
            {exportSalesEnabled ? <span className="text-right tabular-nums">{formatCompactCurrency(row.exportSales)}</span> : null}
            <span className="text-right tabular-nums">{formatCompactCurrency(row.purchase)}</span>
            <span className="text-right tabular-nums">{formatCompactCurrency(row.receipts)}</span>
            <span className="text-right tabular-nums">{formatCompactCurrency(row.payments)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function transactionTone(type: BillingRecentTransaction["type"]) {
  if (type === "sales") return "bg-emerald-600"
  if (type === "purchase") return "bg-sky-500"
  if (type === "receipt") return "bg-amber-500"
  return "bg-rose-500"
}

function ShortcutButton({ item, onSelect }: { item: DashboardAppMenuItem; onSelect(page: DashboardPage): void }) {
  const ItemIcon = item.icon
  const primaryPage = item.items?.[0]?.page ?? item.page

  return (
    <button
      className="group flex w-full items-center gap-3 rounded-md border border-border/70 bg-background px-3 py-2.5 text-left transition hover:border-primary/40 hover:bg-primary/5"
      onClick={() => onSelect(primaryPage)}
      type="button"
    >
      <span className="flex size-5 shrink-0 items-center justify-center text-muted-foreground transition-colors group-hover:text-primary">
        <ItemIcon className="size-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-foreground transition-colors group-hover:text-primary">{item.title}</span>
        {item.items?.length ? <span className="block truncate text-xs text-muted-foreground">{item.items.map((child) => child.title).join(", ")}</span> : null}
      </span>
      <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" />
    </button>
  )
}

function dashboardAppIdFromPage(page: DashboardPage): DashboardAppId | null {
  if (!page.startsWith("app-")) return null
  const appId = page.split("-")[1]
  return appId && dashboardApps.some((app) => app.id === appId) ? appId as DashboardAppId : null
}

function appGroupDescription(title: string) {
  const descriptions: Record<string, string> = {
    "Accounts": "Cash book, bank book, and ledger movement.",
    "Application": "Company setup, roles, users, and workspace defaults.",
    "Entries": "Daily vouchers and money movement.",
    "Master": "Parties, products, and reusable master data.",
    "Common": "Shared setup data used across modules.",
    "Report": "Statements, summaries, and operational views.",
    "Compliance": "GST API and statutory workflow shortcuts.",
    "Settings": "App setup, layouts, and controls.",
  }
  return descriptions[title] ?? "Workspace menu shortcuts."
}

interface BillingSummaryInput {
  context: DefaultCompanyContext | null
  exportSales: ExportSalesEntry[]
  exportSalesEnabled: boolean
  payments: PaymentEntry[]
  purchases: PurchaseEntry[]
  receipts: ReceiptEntry[]
  sales: SalesEntry[]
}

export interface BillingRecentTransaction {
  amount: number
  date: string | null
  documentNo: string
  id: string
  partyName: string
  type: "payment" | "purchase" | "receipt" | "sales"
}

interface BillingMonthlySummary {
  exportSales: number
  month: string
  payments: number
  purchase: number
  receipts: number
  sales: number
}

function buildBillingSummary(input: BillingSummaryInput) {
  const financialYear = financialYearRange(input.context)
  const scopedSales = filterByContext(input.sales, input.context)
  const scopedExportSales = filterByContext(input.exportSales, input.context)
  const scopedPurchases = filterByContext(input.purchases, input.context)
  const scopedReceipts = filterByContext(input.receipts, input.context)
  const scopedPayments = filterByContext(input.payments, input.context)
  const monthly: BillingMonthlySummary[] = financialYear.months.map((month) => ({ month: month.label, sales: 0, exportSales: 0, purchase: 0, receipts: 0, payments: 0 }))
  const sales = summarizeTransactions(scopedSales, (entry) => entry.invoice_date, (entry) => entry.grand_total, financialYear, (entry) => {
    addMonthly(monthly, entry.invoice_date, "sales", entry.grand_total, financialYear)
  })
  const exportSales = summarizeTransactions(scopedExportSales, (entry) => entry.invoice_date, (entry) => entry.grand_total, financialYear, (entry) => {
    addMonthly(monthly, entry.invoice_date, "exportSales", entry.grand_total, financialYear)
  })
  const purchase = summarizeTransactions(scopedPurchases, (entry) => entry.entry_date, (entry) => entry.grand_total, financialYear, (entry) => {
    addMonthly(monthly, entry.entry_date, "purchase", entry.grand_total, financialYear)
  })
  const receipts = summarizeTransactions(scopedReceipts, (entry) => entry.receipt_date, (entry) => entry.net_amount, financialYear, (entry) => {
    addMonthly(monthly, entry.receipt_date, "receipts", entry.net_amount, financialYear)
  })
  const payments = summarizeTransactions(scopedPayments, (entry) => entry.payment_date, (entry) => entry.net_amount, financialYear, (entry) => {
    addMonthly(monthly, entry.payment_date, "payments", entry.net_amount, financialYear)
  })

  return {
    cards: [
      { label: "Total Sales", ...sales },
      ...(input.exportSalesEnabled ? [{ label: "Export Sales", ...exportSales }] : []),
      { label: "Total Purchase", ...purchase },
      { label: "Receipts", ...receipts },
      { label: "Payments", ...payments },
    ],
    monthly,
    periodLabel: input.context?.accountingYearName || `${formatDisplayDate(financialYear.start.toISOString())} - ${formatDisplayDate(addDays(financialYear.end, -1).toISOString())}`,
    recent: recentBillingTransactions({ context: input.context, exportSales: scopedExportSales, exportSalesEnabled: input.exportSalesEnabled, payments: scopedPayments, purchases: scopedPurchases, receipts: scopedReceipts, sales: scopedSales }, financialYear),
  }
}

function recentBillingTransactions(input: BillingSummaryInput, financialYear: FinancialYearRange): BillingRecentTransaction[] {
  return [
    ...input.sales.map((entry) => ({
      amount: numeric(entry.grand_total),
      date: entry.invoice_date,
      documentNo: entry.invoice_no,
      id: String(entry.uuid ?? entry.id),
      partyName: entry.customer_name,
      type: "sales" as const,
    })),
    ...input.purchases.map((entry) => ({
      amount: numeric(entry.grand_total),
      date: entry.entry_date,
      documentNo: entry.entry_no,
      id: String(entry.uuid ?? entry.id),
      partyName: entry.supplier_name,
      type: "purchase" as const,
    })),
    ...input.receipts.map((entry) => ({
      amount: numeric(entry.net_amount),
      date: entry.receipt_date,
      documentNo: entry.receipt_no,
      id: String(entry.uuid ?? entry.id),
      partyName: entry.party_name,
      type: "receipt" as const,
    })),
    ...input.payments.map((entry) => ({
      amount: numeric(entry.net_amount),
      date: entry.payment_date,
      documentNo: entry.payment_no,
      id: String(entry.uuid ?? entry.id),
      partyName: entry.party_name,
      type: "payment" as const,
    })),
  ].filter((entry) => isInFinancialYear(parseEntryDate(entry.date), financialYear))
    .sort((left, right) => (parseEntryDate(right.date)?.getTime() ?? 0) - (parseEntryDate(left.date)?.getTime() ?? 0))
    .slice(0, 8)
}

function summarizeTransactions<T>(
  entries: T[],
  dateOf: (entry: T) => string | null | undefined,
  amountOf: (entry: T) => number | null | undefined,
  financialYear: FinancialYearRange,
  onEntry: (entry: T) => void,
) {
  return entries.reduce(
    (summary, entry) => {
      const amount = numeric(amountOf(entry))
      const date = parseEntryDate(dateOf(entry))
      if (!isInFinancialYear(date, financialYear)) return summary
      onEntry(entry)
      summary.yearAmount += amount
      summary.yearCount += 1
      if (date?.getMonth() === financialYear.now.getMonth() && date.getFullYear() === financialYear.now.getFullYear()) {
        summary.monthAmount += amount
        summary.monthCount += 1
      }
      return summary
    },
    { monthAmount: 0, monthCount: 0, yearAmount: 0, yearCount: 0 },
  )
}

function addMonthly(
  rows: BillingMonthlySummary[],
  dateValue: string | null | undefined,
  key: "exportSales" | "payments" | "purchase" | "receipts" | "sales",
  value: number | null | undefined,
  financialYear: FinancialYearRange,
) {
  const date = parseEntryDate(dateValue)
  if (!isInFinancialYear(date, financialYear)) return
  const index = financialYearMonthIndex(date, financialYear)
  if (index >= 0) rows[index][key] += numeric(value)
}

interface FinancialYearRange {
  end: Date
  months: Array<{ label: string; month: number; year: number }>
  now: Date
  start: Date
}

function financialYearRange(context: DefaultCompanyContext | null): FinancialYearRange {
  const configuredStart = parseEntryDate(context?.accountingYearStartDate)
  const configuredEnd = parseEntryDate(context?.accountingYearEndDate)
  if (configuredStart && configuredEnd && configuredEnd >= configuredStart) {
    const start = startOfDay(configuredStart)
    const end = addDays(startOfDay(configuredEnd), 1)
    return { end, months: buildMonthSlots(start, end), now: new Date(), start }
  }

  const now = new Date()
  const startYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1
  const start = new Date(startYear, 3, 1)
  const end = new Date(startYear + 1, 3, 1)
  return {
    end,
    months: buildMonthSlots(start, end),
    now,
    start,
  }
}

function buildMonthSlots(start: Date, end: Date) {
  const slots: Array<{ label: string; month: number; year: number }> = []
  const cursor = new Date(start.getFullYear(), start.getMonth(), 1)
  const stop = new Date(end.getFullYear(), end.getMonth(), 1)
  while (cursor < stop && slots.length < 24) {
    slots.push({ label: cursor.toLocaleString("en-IN", { month: "short" }), month: cursor.getMonth(), year: cursor.getFullYear() })
    cursor.setMonth(cursor.getMonth() + 1)
  }
  return slots.length ? slots : [{ label: "Apr", month: 3, year: start.getFullYear() }]
}

function financialYearMonthIndex(date: Date, financialYear: FinancialYearRange) {
  return financialYear.months.findIndex((month) => month.month === date.getMonth() && month.year === date.getFullYear())
}

function isInFinancialYear(date: Date | null, financialYear: FinancialYearRange): date is Date {
  return date !== null && date >= financialYear.start && date < financialYear.end
}

function parseEntryDate(value: string | null | undefined) {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function startOfDay(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate())
}

function addDays(value: Date, days: number) {
  const date = new Date(value)
  date.setDate(date.getDate() + days)
  return date
}

function filterByContext<T extends { accounting_year_id: number; company_id: number }>(entries: T[], context: DefaultCompanyContext | null) {
  if (!context) return entries
  return entries.filter((entry) => entry.company_id === context.companyId && entry.accounting_year_id === context.accountingYearId)
}

function numeric(value: number | null | undefined) {
  const numberValue = Number(value ?? 0)
  return Number.isFinite(numberValue) ? numberValue : 0
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    currency: "INR",
    maximumFractionDigits: 2,
    style: "currency",
  }).format(value)
}

function formatCompactCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    currency: "INR",
    maximumFractionDigits: 0,
    notation: Math.abs(value) >= 100000 ? "compact" : "standard",
    style: "currency",
  }).format(value)
}

function formatDisplayDate(value: string | null) {
  const date = parseEntryDate(value)
  if (!date) return "-"
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date)
}
