import { Bug, Building2, ChevronRight, Headset, Network, RefreshCw, ShieldCheck } from "lucide-react"
import { useMemo } from "react"
import { Bar, BarChart, CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts"
import { useQuery } from "@tanstack/react-query"
import { Card, CardContent, CardHeader, CardTitle } from "src/components/ui/card"
import { SectionCards } from "./section-cards"
import type { DashboardMode, DashboardPage } from "src/components/blocks/sidebar/app-sidebar"
import { cn } from "src/lib/utils"
import { dashboardApps, type DashboardAppId, type DashboardAppMenuItem } from "src/components/blocks/dashboard/dashboard-apps"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "src/components/ui/chart"
import type { AuthSession } from "src/features/auth/auth-client"
import { listPaymentEntries, type PaymentEntry } from "src/features/payment/payment-client"
import { listPurchaseEntries, type PurchaseEntry } from "src/features/purchase/purchase-client"
import { listReceiptEntries, type ReceiptEntry } from "src/features/receipt/receipt-client"
import { listSalesEntries, type SalesEntry } from "src/features/sales/sales-client"

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
  onNavigate,
  session,
}: {
  activeApp?: DashboardAppId
  appEnabled?: Record<DashboardAppId, boolean>
  mode: DashboardMode
  onChangeApp?: (appId: DashboardAppId) => void
  onNavigate?: (page: DashboardPage) => void
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
        <div className="relative overflow-hidden rounded-2xl border bg-card/90 p-5 shadow-sm">
          <div className="absolute right-8 top-6 h-28 w-28 rounded-full bg-primary/10 blur-2xl" />
          <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
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
            <div className="flex w-fit items-center gap-3 rounded-full border bg-background px-4 py-2 shadow-sm">
              <SelectedAppIcon className="size-4 text-primary" />
              <span className="font-mono text-xs font-semibold tracking-[0.32em] text-foreground">
                Signed in workspace
              </span>
            </div>
          </div>
        </div>
      </div>
      {metrics.length ? <SectionCards metrics={metrics} /> : null}
      {mode === "tenant" && activeApp === "billing" && session ? <BillingTransactionDashboard session={session} /> : null}
      {mode === "tenant" ? <DeskShortcutCards appId={selectedApp.id} onNavigate={onNavigate} onChangeApp={onChangeApp} /> : null}
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

function BillingTransactionDashboard({ session }: { session: AuthSession }) {
  const salesQuery = useQuery({ queryKey: ["billing-overview-sales", session.selectedTenant.slug], queryFn: () => listSalesEntries(session) })
  const purchaseQuery = useQuery({ queryKey: ["billing-overview-purchase", session.selectedTenant.slug], queryFn: () => listPurchaseEntries(session) })
  const receiptQuery = useQuery({ queryKey: ["billing-overview-receipt", session.selectedTenant.slug], queryFn: () => listReceiptEntries(session) })
  const paymentQuery = useQuery({ queryKey: ["billing-overview-payment", session.selectedTenant.slug], queryFn: () => listPaymentEntries(session) })
  const isLoading = salesQuery.isLoading || purchaseQuery.isLoading || receiptQuery.isLoading || paymentQuery.isLoading

  const summary = useMemo(
    () => buildBillingSummary({
      payments: paymentQuery.data ?? [],
      purchases: purchaseQuery.data ?? [],
      receipts: receiptQuery.data ?? [],
      sales: salesQuery.data ?? [],
    }),
    [paymentQuery.data, purchaseQuery.data, receiptQuery.data, salesQuery.data],
  )

  return (
    <div className="space-y-4 px-4 lg:px-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {summary.cards.map((card) => (
          <Card key={card.label} className="rounded-md border-border/70 bg-card/95 shadow-sm">
            <CardHeader className="pb-2">
              <p className="text-sm text-muted-foreground">{card.label}</p>
              <CardTitle className="text-2xl tabular-nums">{isLoading ? "..." : formatCurrency(card.yearAmount)}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">This year</span>
                <span className="font-medium">{card.yearCount} entries</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">This month</span>
                <span className="font-medium">{formatCurrency(card.monthAmount)} · {card.monthCount}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
        <Card className="rounded-md border-border/70 bg-card/95 shadow-sm">
          <CardHeader>
            <CardTitle>Transaction Movement</CardTitle>
            <p className="text-sm text-muted-foreground">Monthly sales, purchase, receipts, and payments for the current accounting year list.</p>
          </CardHeader>
          <CardContent>
            <ChartContainer className="h-[280px] w-full" config={transactionChartConfig}>
              <LineChart accessibilityLayer data={summary.monthly}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
                <YAxis tickLine={false} axisLine={false} tickMargin={8} tickFormatter={(value) => compactCurrency(Number(value))} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line dataKey="sales" stroke="var(--color-sales)" strokeWidth={2} type="monotone" dot={false} />
                <Line dataKey="purchase" stroke="var(--color-purchase)" strokeWidth={2} type="monotone" dot={false} />
                <Line dataKey="receipts" stroke="var(--color-receipts)" strokeWidth={2} type="monotone" dot={false} />
                <Line dataKey="payments" stroke="var(--color-payments)" strokeWidth={2} type="monotone" dot={false} />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="rounded-md border-border/70 bg-card/95 shadow-sm">
          <CardHeader>
            <CardTitle>GST Totals</CardTitle>
            <p className="text-sm text-muted-foreground">Output, input, and net GST values from billing entries.</p>
          </CardHeader>
          <CardContent>
            <ChartContainer className="h-[280px] w-full" config={gstChartConfig}>
              <BarChart accessibilityLayer data={summary.gstChart}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
                <YAxis tickLine={false} axisLine={false} tickMargin={8} tickFormatter={(value) => compactCurrency(Number(value))} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="amount" radius={[6, 6, 0, 0]} fill="var(--color-amount)" />
              </BarChart>
            </ChartContainer>
            <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
              {summary.gstChart.map((item) => (
                <div key={item.label} className="rounded-md border border-border/70 p-2">
                  <div className="text-muted-foreground">{item.label}</div>
                  <div className="font-semibold">{formatCurrency(item.amount)}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function DeskShortcutCards({ appId, onChangeApp, onNavigate }: { appId: DashboardAppId; onChangeApp?: (appId: DashboardAppId) => void; onNavigate?: (page: DashboardPage) => void }) {
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
              {group.items.map((item) => (
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

const transactionChartConfig = {
  sales: { label: "Sales", color: "hsl(160 84% 39%)" },
  purchase: { label: "Purchase", color: "hsl(217 91% 60%)" },
  receipts: { label: "Receipts", color: "hsl(38 92% 50%)" },
  payments: { label: "Payments", color: "hsl(346 77% 50%)" },
} satisfies ChartConfig

const gstChartConfig = {
  amount: { label: "GST", color: "hsl(160 84% 39%)" },
} satisfies ChartConfig

const monthLabels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

interface BillingSummaryInput {
  payments: PaymentEntry[]
  purchases: PurchaseEntry[]
  receipts: ReceiptEntry[]
  sales: SalesEntry[]
}

function buildBillingSummary(input: BillingSummaryInput) {
  const now = new Date()
  const currentMonth = now.getMonth()
  const monthly = monthLabels.map((month) => ({ month, sales: 0, purchase: 0, receipts: 0, payments: 0 }))
  const sales = summarizeTransactions(input.sales, (entry) => entry.invoice_date, (entry) => entry.grand_total, currentMonth, (entry) => {
    addMonthly(monthly, entry.invoice_date, "sales", entry.grand_total)
  })
  const purchase = summarizeTransactions(input.purchases, (entry) => entry.entry_date, (entry) => entry.grand_total, currentMonth, (entry) => {
    addMonthly(monthly, entry.entry_date, "purchase", entry.grand_total)
  })
  const receipts = summarizeTransactions(input.receipts, (entry) => entry.receipt_date, (entry) => entry.net_amount, currentMonth, (entry) => {
    addMonthly(monthly, entry.receipt_date, "receipts", entry.net_amount)
  })
  const payments = summarizeTransactions(input.payments, (entry) => entry.payment_date, (entry) => entry.net_amount, currentMonth, (entry) => {
    addMonthly(monthly, entry.payment_date, "payments", entry.net_amount)
  })
  const outputGst = input.sales.reduce((total, entry) => total + numeric(entry.tax_total), 0)
  const inputGst = input.purchases.reduce((total, entry) => total + numeric(entry.tax_total), 0)

  return {
    cards: [
      { label: "Total Sales", ...sales },
      { label: "Total Purchase", ...purchase },
      { label: "Receipts", ...receipts },
      { label: "Payments", ...payments },
    ],
    gstChart: [
      { label: "Output", amount: outputGst },
      { label: "Input", amount: inputGst },
      { label: "Net", amount: outputGst - inputGst },
    ],
    monthly,
  }
}

function summarizeTransactions<T>(
  entries: T[],
  dateOf: (entry: T) => string | null | undefined,
  amountOf: (entry: T) => number | null | undefined,
  currentMonth: number,
  onEntry: (entry: T) => void,
) {
  return entries.reduce(
    (summary, entry) => {
      const amount = numeric(amountOf(entry))
      const date = parseEntryDate(dateOf(entry))
      onEntry(entry)
      summary.yearAmount += amount
      summary.yearCount += 1
      if (date?.getMonth() === currentMonth && date.getFullYear() === new Date().getFullYear()) {
        summary.monthAmount += amount
        summary.monthCount += 1
      }
      return summary
    },
    { monthAmount: 0, monthCount: 0, yearAmount: 0, yearCount: 0 },
  )
}

function addMonthly(
  rows: Array<{ month: string; payments: number; purchase: number; receipts: number; sales: number }>,
  dateValue: string | null | undefined,
  key: "payments" | "purchase" | "receipts" | "sales",
  value: number | null | undefined,
) {
  const date = parseEntryDate(dateValue)
  if (!date) return
  rows[date.getMonth()][key] += numeric(value)
}

function parseEntryDate(value: string | null | undefined) {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
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

function compactCurrency(value: number) {
  const absolute = Math.abs(value)
  if (absolute >= 10000000) return `${(value / 10000000).toFixed(1)} Cr`
  if (absolute >= 100000) return `${(value / 100000).toFixed(1)} L`
  if (absolute >= 1000) return `${(value / 1000).toFixed(1)} K`
  return `${Math.round(value)}`
}
