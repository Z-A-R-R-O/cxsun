import { useEffect, useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { ArrowLeft, Ban, LockKeyhole, Pencil, Plus, Printer, RefreshCw, RotateCcw, Save, Send, Trash2, UnlockKeyhole } from "lucide-react"
import { Button } from "src/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "src/components/ui/card"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "src/components/ui/dialog"
import { Input } from "src/components/ui/input"
import { Label } from "src/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "src/components/ui/select"
import { Textarea } from "src/components/ui/textarea"
import {
  MasterListEmptyState,
  MasterListPageFrame,
  MasterListPaginationCard,
  MasterListRowActions,
  MasterListTableCard,
  MasterListToolbarCard,
  buildMasterListShowingLabel,
} from "src/components/blocks/lists/master-list"
import type { AuthSession } from "src/features/auth/auth-client"
import { getDefaultCompanyContext } from "src/features/company/company-client"
import { listMasterDataRecords } from "src/features/master-data/infrastructure/master-data-client"
import type { MasterDataRecord } from "src/features/master-data/domain/master-data"
import { LedgerAutocompleteLookup } from "./accounts-book-page"
import { nextDocumentNumberSetting } from "src/features/settings/document-settings-client"
import {
  cancelAccountVoucher,
  createAccountingPeriodLock,
  listAccountBalanceSheet,
  listAccountDayBook,
  listAccountGroups,
  listAccountPostingBook,
  listAccountProfitLoss,
  listAccountTrialBalance,
  listAccountVouchers,
  listAccountingPeriodLocks,
  listAllAccountLedgers,
  postAccountVoucher,
  recalculateAccountReports,
  releaseAccountingPeriodLock,
  upsertAccountLedger,
  upsertAccountVoucher,
  type AccountingPeriodLock,
  type AccountingPeriodLockInput,
  type AccountGroup,
  type AccountLedger,
  type AccountLedgerInput,
  type AccountLedgerType,
  type AccountPostingBookRow,
  type AccountSummaryReport,
  type AccountTrialBalanceRow,
  type AccountVoucher,
  type AccountVoucherInput,
  type AccountVoucherLineInput,
  type AccountVoucherType,
} from "./accounts-client"

type AccountsView = "overview" | "chart" | "vouchers" | "journal-vouchers" | "contra-vouchers" | "opening-vouchers" | "period-locks" | "cash-posting" | "bank-posting" | "day-book" | "monthly-movement" | "trial-balance" | "profit-loss" | "balance-sheet"
type VoucherForm = AccountVoucherInput & { lines: AccountVoucherLineInput[] }
type JournalPostingLine = { amount: number | string; ledger_id?: number; line_narration?: string; side: "debit" | "credit" }
type VoucherPageView = { mode: "list" } | { mode: "show"; voucher: AccountVoucher } | { mode: "upsert"; voucher: AccountVoucher | null }
type VoucherListViewMode = "day" | "month"
type VoucherColumnId = "voucher" | "date" | "type" | "reference" | "narration" | "debit" | "credit" | "status" | "updated"
type MonthlyVoucherSummary = { credit: number; debit: number; month: string; voucherCount: number }
type FinancialMonth = { key: string; label: string; year: number; month: number }
type MonthlyAccountReportRow = FinancialMonth & {
  sales: number
  purchase: number
  receipt: number
  payment: number
  cashIn: number
  cashOut: number
  bankIn: number
  bankOut: number
}

const voucherStatusFilters = [
  { id: "all", label: "All vouchers" },
  { id: "draft", label: "draft" },
  { id: "posted", label: "posted" },
  { id: "cancelled", label: "cancelled" },
]

const defaultVoucherColumnVisibility: Record<VoucherColumnId, boolean> = {
  credit: true,
  date: true,
  debit: true,
  narration: true,
  reference: false,
  status: true,
  type: true,
  updated: false,
  voucher: true,
}

const voucherColumnCatalog: Array<{ id: VoucherColumnId; label: string }> = [
  { id: "voucher", label: "Voucher" },
  { id: "date", label: "Date" },
  { id: "type", label: "Type" },
  { id: "reference", label: "Reference" },
  { id: "narration", label: "Narration" },
  { id: "debit", label: "Debit" },
  { id: "credit", label: "Credit" },
  { id: "status", label: "Status" },
  { id: "updated", label: "Updated" },
]

export function AccountsPage({ session, view = "overview" }: { session: AuthSession; view?: AccountsView }) {
  if (view === "chart") return <ChartOfAccountsPage session={session} />
  if (view === "vouchers") return <AccountingVoucherPage session={session} />
  if (view === "journal-vouchers") return <AccountingVoucherPage focusedVoucherType="journal" session={session} />
  if (view === "contra-vouchers") return <AccountingVoucherPage focusedVoucherType="contra" session={session} />
  if (view === "opening-vouchers") return <AccountingVoucherPage focusedVoucherType="opening" session={session} />
  if (view === "period-locks") return <PeriodLocksPage session={session} />
  if (view === "cash-posting") return <PostingBookPage bookType="cash" session={session} />
  if (view === "bank-posting") return <PostingBookPage bookType="bank" session={session} />
  if (view === "day-book") return <DayBookPage session={session} />
  if (view === "monthly-movement") return <MonthlyMovementPage session={session} />
  if (view === "trial-balance") return <TrialBalancePage session={session} />
  if (view === "profit-loss") return <SummaryReportPage reportType="profit-loss" session={session} />
  if (view === "balance-sheet") return <SummaryReportPage reportType="balance-sheet" session={session} />
  return <AccountsOverviewPage session={session} />
}

function PostingBookPage({ bookType, session }: { bookType: "cash" | "bank"; session: AuthSession }) {
  const queryClient = useQueryClient()
  const title = bookType === "cash" ? "Cash Posting" : "Bank Posting"
  const bookQuery = useQuery({ queryKey: ["account-posting-book", session.selectedTenant.slug, bookType], queryFn: () => listAccountPostingBook(session, bookType) })
  const recalculateMutation = useMutation({
    mutationFn: () => recalculateAccountReports(session),
    onSuccess: async () => {
      toast.success(`${title} recalculated`)
      await invalidateReportQueries(queryClient, session)
      await queryClient.invalidateQueries({ queryKey: ["account-posting-book", session.selectedTenant.slug, bookType] })
    },
    onError: (error) => toast.error("Recalculate failed", { description: error instanceof Error ? error.message : "Please try again." }),
  })
  const rows = bookQuery.data ?? []
  const totals = rows.reduce((sum, row) => ({ debit: sum.debit + Number(row.debit_amount || 0), credit: sum.credit + Number(row.credit_amount || 0) }), { debit: 0, credit: 0 })
  return (
    <MasterListPageFrame
      title={title}
      description={`${bookType === "cash" ? "Cash" : "Bank"} ledger movements from posted accounting vouchers.`}
      technicalName={`page.accounts.${bookType}-posting-book`}
      action={<ReportActions isRecalculating={recalculateMutation.isPending} onPrint={() => window.print()} onRecalculate={() => recalculateMutation.mutate()} />}
    >
      <div className="grid gap-3 md:grid-cols-3">
        <MetricCard title="Receipts" value={formatMoney(totals.debit)} />
        <MetricCard title="Payments" value={formatMoney(totals.credit)} />
        <MetricCard title="Balance" value={formatMoney(rows[0]?.balance_after ?? 0)} />
      </div>
      <PostingBookTable isLoading={bookQuery.isFetching} rows={rows} />
    </MasterListPageFrame>
  )
}

function PostingBookTable({ isLoading, rows }: { isLoading: boolean; rows: AccountPostingBookRow[] }) {
  const totals = rows.reduce((sum, row) => ({ debit: sum.debit + Number(row.debit_amount || 0), credit: sum.credit + Number(row.credit_amount || 0) }), { debit: 0, credit: 0 })
  const balance = rows[0]?.balance_after ?? 0
  return (
    <MasterListTableCard className="rounded-md">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[980px] border-collapse text-sm">
          <thead className="bg-muted/55">
            <tr>
              <TableHead>Date</TableHead>
              <TableHead>Voucher</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Ledger</TableHead>
              <TableHead>Narration</TableHead>
              <TableHead className="text-right">In</TableHead>
              <TableHead className="text-right">Out</TableHead>
              <TableHead className="text-right">Balance</TableHead>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.posting_uuid} className="border-b border-border/60 last:border-b-0">
                <td className="px-4 py-2.5 text-muted-foreground">{formatDate(row.posting_date)}</td>
                <td className="px-4 py-2.5 font-medium">{row.voucher_no}</td>
                <td className="px-4 py-2.5 capitalize">{friendlySource(row.source_module)}</td>
                <td className="px-4 py-2.5">{friendlyLedger(row.ledger_name)}</td>
                <td className="max-w-[280px] truncate px-4 py-2.5 text-muted-foreground">{row.narration ?? "-"}</td>
                <td className="px-4 py-2.5 text-right">{row.debit_amount ? formatMoney(row.debit_amount) : "-"}</td>
                <td className="px-4 py-2.5 text-right">{row.credit_amount ? formatMoney(row.credit_amount) : "-"}</td>
                <td className="px-4 py-2.5 text-right">{formatMoney(row.balance_after)}</td>
              </tr>
            ))}
          </tbody>
          {rows.length ? (
            <tfoot>
              <tr className="bg-muted/30 font-medium">
                <td className="px-4 py-2.5" colSpan={5}>Total</td>
                <td className="px-4 py-2.5 text-right">{formatMoney(totals.debit)}</td>
                <td className="px-4 py-2.5 text-right">{formatMoney(totals.credit)}</td>
                <td className="px-4 py-2.5 text-right">{formatMoney(balance)}</td>
              </tr>
            </tfoot>
          ) : null}
        </table>
      </div>
      {rows.length === 0 ? <MasterListEmptyState>{isLoading ? "Loading postings." : "No posted cash or bank movements found."}</MasterListEmptyState> : null}
    </MasterListTableCard>
  )
}

function AccountsOverviewPage({ session }: { session: AuthSession }) {
  const groupsQuery = useQuery({ queryKey: ["account-groups", session.selectedTenant.slug], queryFn: () => listAccountGroups(session) })
  const ledgersQuery = useQuery({ queryKey: ["account-ledgers-all", session.selectedTenant.slug], queryFn: () => listAllAccountLedgers(session) })
  const vouchersQuery = useQuery({ queryKey: ["account-vouchers", session.selectedTenant.slug], queryFn: () => listAccountVouchers(session) })
  const trialQuery = useQuery({ queryKey: ["account-trial-balance", session.selectedTenant.slug], queryFn: () => listAccountTrialBalance(session) })
  const totals = trialTotals(trialQuery.data ?? [])

  return (
    <MasterListPageFrame title="Accounts" description="Chart, vouchers, postings, and financial reports." technicalName="page.accounts.overview">
      <div className="grid gap-3 md:grid-cols-4">
        <MetricCard title="Groups" value={groupsQuery.data?.length ?? 0} />
        <MetricCard title="Ledgers" value={ledgersQuery.data?.length ?? 0} />
        <MetricCard title="Vouchers" value={vouchersQuery.data?.length ?? 0} />
        <MetricCard title="Trial Balance" value={formatMoney(Math.max(totals.debit, totals.credit))} />
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        <ReportTable title="Debit Ledgers" rows={(trialQuery.data ?? []).filter((row) => row.debit_amount > 0).slice(0, 8)} />
        <ReportTable title="Credit Ledgers" rows={(trialQuery.data ?? []).filter((row) => row.credit_amount > 0).slice(0, 8)} />
      </div>
    </MasterListPageFrame>
  )
}

function PeriodLocksPage({ session }: { session: AuthSession }) {
  const queryClient = useQueryClient()
  const defaultContextQuery = useQuery({ queryKey: ["default-company-context", session.selectedTenant.slug], queryFn: () => getDefaultCompanyContext(session) })
  const locksQuery = useQuery({ queryKey: ["account-period-locks", session.selectedTenant.slug], queryFn: () => listAccountingPeriodLocks(session) })
  const defaultContext = defaultContextQuery.data
  const [form, setForm] = useState<AccountingPeriodLockInput>(() => ({
    accounting_year_id: null,
    company_id: null,
    locked_from: new Date().toISOString().slice(0, 10),
    locked_to: new Date().toISOString().slice(0, 10),
    lock_type: "audit",
    source: "manual",
    reason: "",
  }))
  const createMutation = useMutation({
    mutationFn: (input: AccountingPeriodLockInput) => createAccountingPeriodLock(session, input),
    onSuccess: async () => {
      toast.success("Period locked")
      setForm((current) => ({ ...current, reason: "" }))
      await queryClient.invalidateQueries({ queryKey: ["account-period-locks", session.selectedTenant.slug] })
    },
    onError: (error) => toast.error("Period lock failed", { description: error instanceof Error ? error.message : "Please try again." }),
  })
  const releaseMutation = useMutation({
    mutationFn: (lock: AccountingPeriodLock) => releaseAccountingPeriodLock(session, lock),
    onSuccess: async () => {
      toast.success("Period lock released")
      await queryClient.invalidateQueries({ queryKey: ["account-period-locks", session.selectedTenant.slug] })
    },
    onError: (error) => toast.error("Release failed", { description: error instanceof Error ? error.message : "Please try again." }),
  })
  const scopedForm = {
    ...form,
    accounting_year_id: form.accounting_year_id ?? defaultContext?.accountingYearId ?? null,
    company_id: form.company_id ?? defaultContext?.companyId ?? null,
  }
  const rows = locksQuery.data ?? []
  const activeCount = rows.filter((lock) => Boolean(lock.is_active)).length

  return (
    <MasterListPageFrame
      title="Period Locks"
      description="Protect filed or audited accounting periods from direct entry changes."
      technicalName="page.accounts.period-locks"
      action={<Button className="rounded-md" disabled={createMutation.isPending} onClick={() => createMutation.mutate(scopedForm)}><LockKeyhole className="size-4" />Lock Period</Button>}
    >
      <div className="grid gap-3 md:grid-cols-3">
        <MetricCard title="Active locks" value={activeCount} />
        <MetricCard title="Released locks" value={rows.length - activeCount} />
        <MetricCard title="Default scope" value={defaultContext ? defaultContext.accountingYearName : "Loading"} />
      </div>
      <Card className="rounded-md">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">New Period Lock</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          <div className="grid gap-1.5">
            <Label>From</Label>
            <Input type="date" value={form.locked_from ?? ""} onChange={(event) => setForm((current) => ({ ...current, locked_from: event.target.value }))} />
          </div>
          <div className="grid gap-1.5">
            <Label>To</Label>
            <Input type="date" value={form.locked_to ?? ""} onChange={(event) => setForm((current) => ({ ...current, locked_to: event.target.value }))} />
          </div>
          <div className="grid gap-1.5">
            <Label>Lock type</Label>
            <Select value={form.lock_type ?? "audit"} onValueChange={(value) => setForm((current) => ({ ...current, lock_type: value }))}>
              <SelectTrigger className="rounded-md"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="audit">Audit</SelectItem>
                <SelectItem value="monthly_gst">Monthly GST</SelectItem>
                <SelectItem value="filing">Filing</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label>Source</Label>
            <Input value={form.source ?? ""} onChange={(event) => setForm((current) => ({ ...current, source: event.target.value }))} placeholder="manual, gst_filing" />
          </div>
          <div className="grid gap-1.5 lg:col-span-4">
            <Label>Reason</Label>
            <Textarea value={form.reason ?? ""} onChange={(event) => setForm((current) => ({ ...current, reason: event.target.value }))} placeholder="Why this period is locked" />
          </div>
          <div className="text-sm text-muted-foreground lg:col-span-4">
            Scope: {defaultContext ? `${defaultContext.companyName} / ${defaultContext.accountingYearName}` : "selected company and year"}.
            GST filing completion creates this same monthly company-year lock automatically.
          </div>
        </CardContent>
      </Card>
      <MasterListTableCard className="rounded-md">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] border-collapse text-sm">
            <thead className="bg-muted/55">
              <tr>
                <TableHead>Status</TableHead>
                <TableHead>Period</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Scope</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </tr>
            </thead>
            <tbody>
              {rows.map((lock) => (
                <tr key={lock.uuid} className="border-b border-border/60 last:border-b-0">
                  <td className="px-4 py-2.5"><PeriodLockStatus lock={lock} /></td>
                  <td className="px-4 py-2.5 font-medium">{formatDate(lock.locked_from)} to {formatDate(lock.locked_to)}</td>
                  <td className="px-4 py-2.5 capitalize">{lock.lock_type.replace(/_/g, " ")}</td>
                  <td className="px-4 py-2.5">{lock.source ?? "manual"}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{periodLockScope(lock, defaultContext)}</td>
                  <td className="max-w-[260px] truncate px-4 py-2.5 text-muted-foreground" title={lock.reason ?? ""}>{lock.reason ?? "-"}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{formatDate(lock.created_at)}</td>
                  <td className="px-4 py-2.5 text-right">
                    {lock.is_active ? (
                      <Button className="rounded-md" disabled={releaseMutation.isPending} size="sm" variant="outline" onClick={() => releaseMutation.mutate(lock)}>
                        <UnlockKeyhole className="size-4" />Release
                      </Button>
                    ) : <span className="text-muted-foreground">{lock.released_at ? formatDate(lock.released_at) : "Released"}</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {rows.length === 0 ? <MasterListEmptyState>{locksQuery.isFetching ? "Loading period locks." : "No period locks found."}</MasterListEmptyState> : null}
      </MasterListTableCard>
    </MasterListPageFrame>
  )
}

function ChartOfAccountsPage({ session }: { session: AuthSession }) {
  const [searchValue, setSearchValue] = useState("")
  const groupsQuery = useQuery({ queryKey: ["account-groups", session.selectedTenant.slug], queryFn: () => listAccountGroups(session) })
  const ledgersQuery = useQuery({ queryKey: ["account-ledgers-all", session.selectedTenant.slug], queryFn: () => listAllAccountLedgers(session) })
  const groups = groupsQuery.data ?? []
  const ledgers = ledgersQuery.data ?? []
  const rows = useMemo(() => filterChartRows(groups, ledgers, searchValue), [groups, ledgers, searchValue])

  return (
    <MasterListPageFrame title="Chart of Accounts" description="Indian account groups and ledgers." technicalName="page.accounts.chart">
      <MasterListToolbarCard
        columns={[]}
        filterOptions={[]}
        filterValue="all"
        onFilterValueChange={() => undefined}
        onShowAllColumns={() => undefined}
        searchPlaceholder="Search groups and ledgers"
        searchValue={searchValue}
        onSearchValueChange={setSearchValue}
      />
      <MasterListTableCard className="rounded-md">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] border-collapse text-sm">
            <thead className="bg-muted/55">
              <tr>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Nature</TableHead>
                <TableHead>Normal</TableHead>
                <TableHead className="text-right">Opening</TableHead>
                <TableHead className="text-right">Current</TableHead>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.key} className="border-b border-border/60 last:border-b-0">
                  <td className="px-4 py-2.5">
                    <span className={row.kind === "group" ? "font-medium" : "text-muted-foreground"} style={{ paddingLeft: row.depth * 16 }}>
                      {friendlyLedger(row.name)}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 capitalize text-muted-foreground">{row.kind}</td>
                  <td className="px-4 py-2.5 capitalize">{row.nature ?? "-"}</td>
                  <td className="px-4 py-2.5 capitalize">{row.normalBalance ?? "-"}</td>
                  <td className="px-4 py-2.5 text-right">{row.opening == null ? "-" : formatMoney(row.opening)}</td>
                  <td className="px-4 py-2.5 text-right">{row.current == null ? "-" : formatMoney(row.current)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {rows.length === 0 ? <MasterListEmptyState>{groupsQuery.isFetching || ledgersQuery.isFetching ? "Loading chart." : "No account groups found."}</MasterListEmptyState> : null}
      </MasterListTableCard>
    </MasterListPageFrame>
  )
}

function AccountingVoucherPage({ focusedVoucherType = null, session }: { focusedVoucherType?: AccountVoucherType | null; session: AuthSession }) {
  const queryClient = useQueryClient()
  const [searchValue, setSearchValue] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [visibleColumns, setVisibleColumns] = useState(defaultVoucherColumnVisibility)
  const [listViewMode, setListViewMode] = useState<VoucherListViewMode>("day")
  const [currentPage, setCurrentPage] = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState(100)
  const [view, setView] = useState<VoucherPageView>({ mode: "list" })
  const ledgersQuery = useQuery({ queryKey: ["account-ledgers-all", session.selectedTenant.slug], queryFn: () => listAllAccountLedgers(session) })
  const groupsQuery = useQuery({ queryKey: ["account-groups", session.selectedTenant.slug], queryFn: () => listAccountGroups(session) })
  const vouchersKey = ["account-vouchers", session.selectedTenant.slug]
  const vouchersQuery = useQuery({ queryKey: vouchersKey, queryFn: () => listAccountVouchers(session) })
  const saveMutation = useMutation({ mutationFn: (input: AccountVoucherInput) => upsertAccountVoucher(session, input) })
  const postMutation = useMutation({ mutationFn: (voucher: AccountVoucher) => postAccountVoucher(session, voucher) })
  const cancelMutation = useMutation({ mutationFn: (voucher: AccountVoucher) => cancelAccountVoucher(session, voucher) })
  const ledgerMutation = useMutation({ mutationFn: (input: AccountLedgerInput) => upsertAccountLedger(session, input.account_type ?? "cash", input) })
  const vouchers = useMemo(() => {
    const rows = focusedVoucherType ? (vouchersQuery.data ?? []).filter((voucher) => voucher.voucher_type === focusedVoucherType) : vouchersQuery.data ?? []
    return filterVouchers(searchVouchers(rows, searchValue), statusFilter)
  }, [focusedVoucherType, searchValue, statusFilter, vouchersQuery.data])
  const monthlyVouchers = useMemo(() => summarizeVouchersByMonth(vouchers), [vouchers])
  const activeRowCount = listViewMode === "month" ? monthlyVouchers.length : vouchers.length
  const totalPages = Math.max(1, Math.ceil(activeRowCount / rowsPerPage))
  const pageVouchers = vouchers.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage)
  const pageMonthlyVouchers = monthlyVouchers.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage)
  const pageTitle = focusedVoucherType ? voucherTypeLabel(focusedVoucherType) : "Accounting Vouchers"
  const pageDescription = focusedVoucherType ? `Create and review ${voucherTypeLabel(focusedVoucherType).toLowerCase()} vouchers.` : "Review manual opening, contra, and journal vouchers."

  async function refresh() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: vouchersKey }),
      queryClient.invalidateQueries({ queryKey: ["account-trial-balance", session.selectedTenant.slug] }),
      queryClient.invalidateQueries({ queryKey: ["account-day-book", session.selectedTenant.slug] }),
    ])
  }

  async function saveVoucher(input: AccountVoucherInput) {
    const voucher = await saveMutation.mutateAsync(input)
    toast.success("Voucher saved", { description: voucher.voucher_no })
    await refresh()
    setView({ mode: "show", voucher })
  }

  async function createLedger(input: AccountLedgerInput) {
    const ledger = await ledgerMutation.mutateAsync(input)
    toast.success("Ledger created", { description: ledger.name })
    await queryClient.invalidateQueries({ queryKey: ["account-ledgers-all", session.selectedTenant.slug] })
    return ledger
  }

  async function postVoucher(voucher: AccountVoucher) {
    const posted = await postMutation.mutateAsync(voucher)
    toast.success("Voucher posted", { description: posted.voucher_no })
    await refresh()
    setView({ mode: "show", voucher: posted })
  }

  async function cancelVoucher(voucher: AccountVoucher) {
    const cancelled = await cancelMutation.mutateAsync(voucher)
    toast.error("Voucher cancelled", { description: cancelled.voucher_no })
    await refresh()
    setView({ mode: "show", voucher: cancelled })
  }

  if (view.mode === "upsert" && focusedVoucherType) {
    return (
      <VoucherUpsertPage
        isSaving={saveMutation.isPending}
        groups={groupsQuery.data ?? []}
        isCreatingLedger={ledgerMutation.isPending}
        ledgers={ledgersQuery.data ?? []}
        voucher={view.voucher}
        voucherType={focusedVoucherType}
        onBack={() => setView(view.voucher ? { mode: "show", voucher: view.voucher } : { mode: "list" })}
        onCreateLedger={createLedger}
        onSubmit={saveVoucher}
        session={session}
      />
    )
  }

  if (view.mode === "show") {
    return (
      <VoucherShowPage
        isWorking={postMutation.isPending || cancelMutation.isPending}
        voucher={view.voucher}
        onBack={() => setView({ mode: "list" })}
        onCancel={() => void cancelVoucher(view.voucher)}
        onEdit={focusedVoucherType && view.voucher.status === "draft" ? () => setView({ mode: "upsert", voucher: view.voucher }) : undefined}
        onPost={view.voucher.status === "draft" ? () => void postVoucher(view.voucher) : undefined}
      />
    )
  }

  return (
    <MasterListPageFrame
      title={pageTitle}
      description={pageDescription}
      technicalName={`page.accounts.${focusedVoucherType ?? "vouchers"}`}
      action={(
        <div className="flex items-center gap-2">
          <Button disabled={vouchersQuery.isFetching} onClick={() => void vouchersQuery.refetch()} type="button" variant="outline" className="h-9 rounded-md">
            <RefreshCw className={vouchersQuery.isFetching ? "size-4 animate-spin" : "size-4"} />
            Refresh
          </Button>
          {focusedVoucherType ? <Button className="h-9 rounded-md" type="button" onClick={() => setView({ mode: "upsert", voucher: null })}><Plus className="size-4" />New {voucherTypeLabel(focusedVoucherType)}</Button> : null}
        </div>
      )}
    >
      <MasterListToolbarCard
        columns={voucherColumnCatalog.map((column) => ({
          id: column.id,
          label: column.label,
          checked: visibleColumns[column.id],
          disabled: column.id === "voucher",
          onCheckedChange: (checked) => setVisibleColumns((current) => ({ ...current, [column.id]: checked })),
        }))}
        filterOptions={voucherStatusFilters}
        filterValue={statusFilter}
        onFilterValueChange={(value) => {
          setStatusFilter(value)
          setCurrentPage(1)
        }}
        onShowAllColumns={() => setVisibleColumns(defaultVoucherColumnVisibility)}
        searchPlaceholder="Search vouchers"
        searchValue={searchValue}
        onSearchValueChange={(value) => {
          setSearchValue(value)
          setCurrentPage(1)
        }}
        toolbarAction={
          <VoucherViewModeSelect
            value={listViewMode}
            onChange={(value) => {
              setListViewMode(value)
              setCurrentPage(1)
            }}
          />
        }
      />
      <VoucherTable
        isLoading={vouchersQuery.isFetching}
        currentPage={currentPage}
        listViewMode={listViewMode}
        monthlyVouchers={pageMonthlyVouchers}
        rowsPerPage={rowsPerPage}
        totalCount={activeRowCount}
        totalPages={totalPages}
        visibleColumns={visibleColumns}
        vouchers={pageVouchers}
        onCancel={(voucher) => void cancelVoucher(voucher)}
        onEdit={focusedVoucherType ? (voucher) => setView({ mode: "upsert", voucher }) : undefined}
        onNextPage={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
        onPageChange={setCurrentPage}
        onPost={(voucher) => void postVoucher(voucher)}
        onPreviousPage={() => setCurrentPage((page) => Math.max(1, page - 1))}
        onRowsPerPageChange={(value) => {
          setRowsPerPage(value)
          setCurrentPage(1)
        }}
        onView={(voucher) => setView({ mode: "show", voucher })}
        isWorking={postMutation.isPending || cancelMutation.isPending}
      />
    </MasterListPageFrame>
  )
}

function VoucherUpsertPage({ groups, isCreatingLedger, isSaving, ledgers, onBack, onCreateLedger, onSubmit, session, voucher, voucherType }: { groups: AccountGroup[]; isCreatingLedger: boolean; isSaving: boolean; ledgers: AccountLedger[]; onBack(): void; onCreateLedger(input: AccountLedgerInput): Promise<AccountLedger>; onSubmit: (input: AccountVoucherInput) => Promise<void>; session: AuthSession; voucher: AccountVoucher | null; voucherType: AccountVoucherType }) {
  const isAccountingTableVoucher = voucherType === "journal" || voucherType === "contra"
  const documentKind = isAccountingTableVoucher ? voucherType : null
  const existingDebitLines = voucher?.lines.filter((line) => Number(line.debit_amount ?? 0) > 0) ?? []
  const existingCreditLines = voucher?.lines.filter((line) => Number(line.credit_amount ?? 0) > 0) ?? []
  const [form, setForm] = useState<VoucherForm>(() => ({
    id: voucher?.id,
    uuid: voucher?.uuid,
    voucher_type: voucherType,
    voucher_no: voucher?.voucher_no ?? "",
    voucher_date: dateKey(voucher?.voucher_date ?? new Date().toISOString().slice(0, 10)),
    reference_no: voucher?.reference_no ?? "",
    narration: voucher?.narration ?? "",
    lines: voucher?.lines.length ? voucher.lines.map((line) => ({
      ledger_id: line.ledger_id,
      debit_amount: line.debit_amount || "",
      credit_amount: line.credit_amount || "",
      line_narration: line.line_narration ?? "",
      bill_reference: line.bill_reference ?? "",
      sort_order: line.sort_order,
    })) : [
      { ledger_id: undefined, debit_amount: "", credit_amount: "", line_narration: "", sort_order: 1 },
      { ledger_id: undefined, debit_amount: "", credit_amount: "", line_narration: "", sort_order: 2 },
    ],
  }))
  const [journalLines, setJournalLines] = useState<JournalPostingLine[]>(() => [
    ...existingDebitLines.map((line) => ({ amount: line.debit_amount || "", ledger_id: line.ledger_id, line_narration: line.line_narration ?? "", side: "debit" as const })),
    ...existingCreditLines.map((line) => ({ amount: line.credit_amount || "", ledger_id: line.ledger_id, line_narration: line.line_narration ?? "", side: "credit" as const })),
  ])
  const [journalDraft, setJournalDraft] = useState<JournalPostingLine>({ amount: "", ledger_id: undefined, line_narration: "", side: "debit" })
  const [ledgerCreateDraft, setLedgerCreateDraft] = useState<{ group_id: number | null; name: string } | null>(null)
  const nextVoucherNumberQuery = useQuery({ enabled: Boolean(documentKind && !voucher), queryKey: ["document-number-next-preview", session.selectedTenant.slug, documentKind], queryFn: () => nextDocumentNumberSetting(session, documentKind ?? "journal"), refetchOnMount: "always" })
  const totals = voucherLineTotals(form.lines)
  const journalDebitTotal = journalLines.filter((line) => line.side === "debit").reduce((sum, line) => roundMoney(sum + numberValue(line.amount)), 0)
  const journalCreditTotal = journalLines.filter((line) => line.side === "credit").reduce((sum, line) => roundMoney(sum + numberValue(line.amount)), 0)
  const postingLedgerOptions = voucherType === "contra" ? ledgers.filter((ledger) => ledger.account_type === "cash" || ledger.account_type === "bank") : ledgers
  const ledgerName = (ledgerId?: number) => ledgers.find((ledger) => Number(ledger.id) === Number(ledgerId))?.name ?? "-"

  useEffect(() => {
    if (!isAccountingTableVoucher || voucher || form.voucher_no || !nextVoucherNumberQuery.data?.preview) return
    setForm((current) => current.voucher_no ? current : { ...current, voucher_no: nextVoucherNumberQuery.data.preview })
  }, [form.voucher_no, isAccountingTableVoucher, nextVoucherNumberQuery.data?.preview, voucher])

  function updateLine(index: number, patch: AccountVoucherLineInput) {
    setForm((current) => ({
      ...current,
      lines: current.lines.map((line, lineIndex) => lineIndex === index ? { ...line, ...patch } : line),
    }))
  }

  function addLine() {
    setForm((current) => ({
      ...current,
      lines: [...current.lines, { ledger_id: undefined, debit_amount: "", credit_amount: "", line_narration: "", sort_order: current.lines.length + 1 }],
    }))
  }

  function removeLine(index: number) {
    setForm((current) => ({
      ...current,
      lines: current.lines.filter((_, lineIndex) => lineIndex !== index).map((line, lineIndex) => ({ ...line, sort_order: lineIndex + 1 })),
    }))
  }

  function addJournalLine() {
    if (!journalDraft.ledger_id || numberValue(journalDraft.amount) <= 0) {
      toast.error("Select ledger and amount.")
      return
    }
    setJournalLines((current) => [...current, { ...journalDraft, amount: roundMoney(journalDraft.amount) }])
    setJournalDraft({ amount: "", ledger_id: undefined, line_narration: "", side: journalDraft.side })
  }

  async function createJournalLedger() {
    if (!ledgerCreateDraft?.name.trim()) {
      toast.error("Ledger name is required.")
      return
    }
    if (!ledgerCreateDraft.group_id) {
      toast.error("Select ledger group.")
      return
    }
    const group = groups.find((row) => Number(row.id) === Number(ledgerCreateDraft.group_id))
    const ledger = await onCreateLedger({
      account_type: accountLedgerTypeForGroup(group),
      group_id: ledgerCreateDraft.group_id,
      name: ledgerCreateDraft.name.trim(),
    })
    setJournalDraft((current) => ({ ...current, ledger_id: ledger.id }))
    setLedgerCreateDraft(null)
  }

  function editJournalLine(index: number) {
    const line = journalLines[index]
    if (!line) return
    setJournalDraft(line)
    setJournalLines((current) => current.filter((_, lineIndex) => lineIndex !== index))
  }

  function removeJournalLine(index: number) {
    setJournalLines((current) => current.filter((_, lineIndex) => lineIndex !== index))
  }

  async function submit() {
    if (isAccountingTableVoucher) {
      const debitLines = journalLines.filter((line) => line.side === "debit" && (Boolean(line.ledger_id) || numberValue(line.amount) > 0))
      const creditLines = journalLines.filter((line) => line.side === "credit" && (Boolean(line.ledger_id) || numberValue(line.amount) > 0))
      const incompleteDebit = debitLines.some((line) => !line.ledger_id || numberValue(line.amount) <= 0)
      const incompleteCredit = creditLines.some((line) => !line.ledger_id || numberValue(line.amount) <= 0)

      if (debitLines.length === 0 || creditLines.length === 0) {
        toast.error("At least one debit row and one credit row are required.")
        return
      }
      if (incompleteDebit || incompleteCredit) {
        toast.error(`Every ${voucherTypeLabel(voucherType).toLowerCase()} row needs a ledger and amount.`)
        return
      }
      if (journalDebitTotal <= 0 || journalDebitTotal !== journalCreditTotal) {
        toast.error("Debit and credit totals must match.")
        return
      }

      await onSubmit({
        ...form,
        voucher_type: voucherType,
        lines: [
          ...debitLines.map((line, index) => ({ ledger_id: line.ledger_id, debit_amount: roundMoney(line.amount), credit_amount: "", line_narration: line.line_narration || form.narration || "", sort_order: index + 1 })),
          ...creditLines.map((line, index) => ({ ledger_id: line.ledger_id, debit_amount: "", credit_amount: roundMoney(line.amount), line_narration: line.line_narration || form.narration || "", sort_order: debitLines.length + index + 1 })),
        ] satisfies AccountVoucherLineInput[],
      })
      return
    }

    await onSubmit({
      ...form,
      voucher_type: voucherType,
      lines: form.lines.map((line, index) => ({ ...line, sort_order: index + 1 })),
    })
  }

  return (
    <MasterListPageFrame
      title={voucher ? `Edit ${voucherTypeLabel(voucherType)}` : `New ${voucherTypeLabel(voucherType)}`}
      description={isAccountingTableVoucher ? `${voucherTypeLabel(voucherType)} voucher posting.` : "Enter ledger lines as debit and credit. Totals must match before posting."}
      technicalName={`page.accounts.${voucherType}.upsert`}
      action={<Button className="rounded-xl" type="button" variant="outline" onClick={onBack}><ArrowLeft className="size-4" />Cancel</Button>}
      className="w-[calc(100%-2rem)] max-w-[1500px] sm:w-[calc(100%-3rem)] lg:w-[calc(100%-4rem)]"
    >
      <Card className="overflow-hidden rounded-md">
        <CardHeader className="border-b border-border/70 bg-card px-6 py-4">
          <CardTitle className="text-base">Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 px-6 py-5">
          {isAccountingTableVoucher ? (
          <section className="grid gap-5 md:grid-cols-2">
            <Field label="Voucher no">
              <Input className="h-11 rounded-md" value={form.voucher_no ?? ""} placeholder="Auto" onChange={(event) => setForm((current) => ({ ...current, voucher_no: event.target.value }))} />
            </Field>
            <Field label="Date">
              <Input className="h-11 rounded-md" value={form.voucher_date ?? ""} type="date" onChange={(event) => setForm((current) => ({ ...current, voucher_date: event.target.value }))} />
            </Field>
          </section>
          ) : (
          <section className="grid gap-5 lg:grid-cols-2">
            <div className="space-y-5">
              <Field label="Voucher no">
                <Input className="h-11 rounded-md" value={form.voucher_no ?? ""} placeholder="Auto" onChange={(event) => setForm((current) => ({ ...current, voucher_no: event.target.value }))} />
              </Field>
              <Field label="Reference">
                <Input className="h-11 rounded-md" value={form.reference_no ?? ""} placeholder="Optional reference" onChange={(event) => setForm((current) => ({ ...current, reference_no: event.target.value }))} />
              </Field>
            </div>
            <div className="space-y-5">
              <Field label="Date">
                <Input className="h-11 rounded-md" value={form.voucher_date ?? ""} type="date" onChange={(event) => setForm((current) => ({ ...current, voucher_date: event.target.value }))} />
              </Field>
              <div className="grid gap-2">
                <Label className="text-sm font-medium text-muted-foreground">Status</Label>
                <div className="flex h-11 items-center rounded-md border border-input bg-muted/30 px-3 text-sm font-medium capitalize text-muted-foreground">{voucher?.status ?? "draft"}</div>
              </div>
            </div>
          </section>
          )}

          {isAccountingTableVoucher ? (
          <section className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-semibold">{voucherTypeLabel(voucherType)} Posting</h3>
              </div>
            </div>
            <div className="grid items-end gap-2 md:grid-cols-[9rem_minmax(240px,1fr)_12rem_auto]">
              <div className="grid gap-2">
                <Label className="invisible text-sm font-medium text-muted-foreground">Type</Label>
                <Select value={journalDraft.side} onValueChange={(value) => setJournalDraft((current) => ({ ...current, side: value as JournalPostingLine["side"] }))}>
                  <SelectTrigger className="!h-11 min-h-11 w-full rounded-md border border-input bg-background px-3 py-0"><SelectValue /></SelectTrigger>
                  <SelectContent align="start" className="z-[120] w-36 min-w-36 rounded-md" position="popper">
                    <SelectItem className="h-8" value="debit">By / Debit</SelectItem>
                    <SelectItem className="h-8" value="credit">To / Credit</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <LedgerAutocompleteLookup
                className="gap-2"
                createLabel={isCreatingLedger ? "Creating ledger" : "Create ledger"}
                inputClassName="h-11 rounded-md bg-background"
                label="Ledger"
                options={postingLedgerOptions}
                placeholder="Search ledger"
                selectedId={journalDraft.ledger_id ? String(journalDraft.ledger_id) : null}
                selectedLabel={journalDraft.ledger_id ? ledgerName(journalDraft.ledger_id) : ""}
                onCreate={async (query) => setLedgerCreateDraft({ group_id: defaultJournalGroupId(groups, journalDraft.side), name: query })}
                onPick={(ledger) => setJournalDraft((current) => ({ ...current, ledger_id: ledger.id }))}
                onTextChange={() => setJournalDraft((current) => ({ ...current, ledger_id: undefined }))}
              />
              <div className="grid gap-2">
                <Label className="text-sm font-medium text-muted-foreground">Amount</Label>
                <Input className="h-11 rounded-md bg-background text-right" inputMode="decimal" value={String(journalDraft.amount ?? "")} onChange={(event) => setJournalDraft((current) => ({ ...current, amount: event.target.value }))} />
              </div>
              <div>
                <Button className="h-11 rounded-md" type="button" onClick={addJournalLine}><Plus className="size-4" />Add</Button>
              </div>
            </div>
            <div className="overflow-x-auto rounded-md border border-slate-300">
              <table className="w-full min-w-[860px] border-collapse text-sm">
                <thead className="border-b border-slate-300 bg-muted/55">
                  <tr>
                    <TableHead className="w-12 border-r border-slate-300 text-center">#</TableHead>
                    <TableHead className="w-28 border-r border-slate-300">By / To</TableHead>
                    <TableHead className="border-r border-slate-300">Ledger</TableHead>
                    <TableHead className="w-44 border-r border-slate-300 text-right">Debit</TableHead>
                    <TableHead className="w-44 border-r border-slate-300 text-right">Credit</TableHead>
                    <TableHead className="w-24 text-right">Action</TableHead>
                  </tr>
                </thead>
                <tbody>
                  {journalLines.length ? journalLines.map((line, index) => (
                      <tr key={index} className="border-b border-slate-300 last:border-b-0">
                        <td className="border-r border-slate-300 px-3 py-3 text-center text-muted-foreground">{index + 1}</td>
                        <td className="border-r border-slate-300 px-3 py-3 text-xs font-semibold uppercase text-muted-foreground">{line.side === "debit" ? "By / Debit" : "To / Credit"}</td>
                        <td className="border-r border-slate-300 px-3 py-3 font-medium">{ledgerName(line.ledger_id)}</td>
                        <td className="border-r border-slate-300 px-3 py-3 text-right tabular-nums">
                          {line.side === "debit" ? formatMoney(line.amount) : "-"}
                        </td>
                        <td className="border-r border-slate-300 px-3 py-3 text-right tabular-nums">
                          {line.side === "credit" ? formatMoney(line.amount) : "-"}
                        </td>
                        <td className="px-3 py-2 text-right">
                          <div className="flex justify-end gap-1">
                            <Button className="size-8 rounded-md" size="icon" type="button" variant="ghost" onClick={() => editJournalLine(index)}><Pencil className="size-3.5" /></Button>
                            <Button className="size-8 rounded-md" size="icon" type="button" variant="ghost" onClick={() => removeJournalLine(index)}><Trash2 className="size-3.5 text-red-500" /></Button>
                          </div>
                        </td>
                      </tr>
                  )) : (
                    <tr>
                      <td className="px-3 py-8 text-center text-muted-foreground" colSpan={6}>No {voucherTypeLabel(voucherType).toLowerCase()} rows added.</td>
                    </tr>
                  )}
                  <tr className="h-4"><td colSpan={6} /></tr>
                </tbody>
                <tfoot>
                  <tr className="bg-muted/30 font-semibold">
                    <td className="border-r border-slate-300 px-3 py-3" colSpan={3}>Total</td>
                    <td className="border-r border-slate-300 px-3 py-3 text-right">{formatMoney(journalDebitTotal)}</td>
                    <td className="border-r border-slate-300 px-3 py-3 text-right">{formatMoney(journalCreditTotal)}</td>
                    <td className="px-3 py-3 text-right">{journalDebitTotal === journalCreditTotal && journalDebitTotal > 0 ? "Balanced" : "Unbalanced"}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </section>
          ) : (
          <section className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-semibold">Ledger Lines</h3>
                <p className="text-xs text-muted-foreground">Debit and credit totals must be equal.</p>
              </div>
              <Button className="rounded-md" type="button" variant="outline" onClick={addLine}><Plus className="size-4" />Add Line</Button>
            </div>
            <div className="overflow-x-auto rounded-md border border-border/70">
              <table className="w-full min-w-[900px] border-collapse text-sm">
                <thead className="bg-muted/55">
                  <tr>
                    <TableHead>Ledger</TableHead>
                    <TableHead className="text-right">Debit</TableHead>
                    <TableHead className="text-right">Credit</TableHead>
                    <TableHead>Narration</TableHead>
                    <TableHead className="w-16 text-right">Action</TableHead>
                  </tr>
                </thead>
                <tbody>
                  {form.lines.map((line, index) => (
                    <tr key={index} className="border-b border-border/60 last:border-b-0">
                      <td className="px-3 py-3">
                        <Select value={line.ledger_id ? String(line.ledger_id) : ""} onValueChange={(value) => updateLine(index, { ledger_id: Number(value) })}>
                          <SelectTrigger className="h-10 rounded-md"><SelectValue placeholder="Ledger" /></SelectTrigger>
                          <SelectContent>
                            {ledgers.map((ledger) => <SelectItem key={ledger.uuid} value={String(ledger.id)}>{ledger.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-3 py-3"><Input className="h-10 rounded-md text-right" inputMode="decimal" value={String(line.debit_amount ?? "")} onChange={(event) => updateLine(index, { debit_amount: event.target.value, credit_amount: event.target.value ? "" : line.credit_amount })} /></td>
                      <td className="px-3 py-3"><Input className="h-10 rounded-md text-right" inputMode="decimal" value={String(line.credit_amount ?? "")} onChange={(event) => updateLine(index, { credit_amount: event.target.value, debit_amount: event.target.value ? "" : line.debit_amount })} /></td>
                      <td className="px-3 py-3"><Input className="h-10 rounded-md" value={line.line_narration ?? ""} onChange={(event) => updateLine(index, { line_narration: event.target.value })} /></td>
                      <td className="px-3 py-3 text-right">
                        <Button disabled={form.lines.length <= 2} size="icon" type="button" variant="ghost" onClick={() => removeLine(index)}>
                          <Ban className="size-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-muted/30 font-medium">
                    <td className="px-3 py-3">Total</td>
                    <td className="px-3 py-3 text-right">{formatMoney(totals.debit)}</td>
                    <td className="px-3 py-3 text-right">{formatMoney(totals.credit)}</td>
                    <td className="px-3 py-3" colSpan={2}>{totals.debit === totals.credit && totals.debit > 0 ? "Balanced" : "Unbalanced"}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </section>
          )}

          <section className="grid gap-2">
            <Label className="text-sm font-medium text-muted-foreground">Narration</Label>
            <Textarea className="min-h-[6rem] rounded-md" value={form.narration ?? ""} onChange={(event) => setForm((current) => ({ ...current, narration: event.target.value }))} />
          </section>
        </CardContent>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/70 bg-muted/20 px-6 py-4">
          <div className="flex flex-wrap gap-3">
            <Button className="rounded-xl" disabled={isSaving} type="button" onClick={() => void submit()}><Save className="size-4" />Save</Button>
            <Button className="rounded-xl" type="button" variant="outline" onClick={onBack}><ArrowLeft className="size-4" />Cancel</Button>
          </div>
          {isAccountingTableVoucher ? (
            <div className="flex min-h-10 items-center rounded-md border border-border/70 bg-background px-3 text-sm font-medium capitalize text-muted-foreground">
              Status: {voucher?.status ?? "draft"}
            </div>
          ) : null}
        </div>
      </Card>
      {ledgerCreateDraft ? (
        <Dialog open onOpenChange={(open) => { if (!open) setLedgerCreateDraft(null) }}>
          <DialogContent className="max-w-lg rounded-md">
            <DialogHeader>
              <DialogTitle>New Ledger</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4">
              <Field label="Name">
                <Input autoFocus className="h-11 rounded-md" value={ledgerCreateDraft.name} onChange={(event) => setLedgerCreateDraft((current) => current ? { ...current, name: event.target.value } : current)} />
              </Field>
              <Field label="Under group">
                <Select value={ledgerCreateDraft.group_id ? String(ledgerCreateDraft.group_id) : ""} onValueChange={(value) => setLedgerCreateDraft((current) => current ? { ...current, group_id: Number(value) } : current)}>
                  <SelectTrigger className="h-11 rounded-md"><SelectValue placeholder="Select group" /></SelectTrigger>
                  <SelectContent>
                    {groups.map((group) => <SelectItem key={group.uuid} value={String(group.id)}>{group.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
            </div>
            <DialogFooter>
              <Button className="rounded-md" type="button" variant="outline" onClick={() => setLedgerCreateDraft(null)}>Cancel</Button>
              <Button className="rounded-md" disabled={isCreatingLedger} type="button" onClick={() => void createJournalLedger()}><Save className="size-4" />Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ) : null}
    </MasterListPageFrame>
  )
}

function VoucherShowPage({ isWorking, onBack, onCancel, onEdit, onPost, voucher }: { isWorking: boolean; onBack(): void; onCancel(): void; onEdit?: () => void; onPost?: () => void; voucher: AccountVoucher }) {
  const totals = voucherLineTotals(voucher.lines)
  return (
    <MasterListPageFrame
      title={`${voucherTypeLabel(voucher.voucher_type)} ${voucher.voucher_no}`}
      description="Accounting voucher details and ledger movement."
      technicalName="page.accounts.voucher.show"
      action={(
        <div className="flex flex-wrap justify-end gap-2">
          <Button className="h-9 rounded-md" type="button" variant="outline" onClick={onBack}><ArrowLeft className="size-4" />Back</Button>
          {onEdit ? <Button className="h-9 rounded-md" type="button" variant="outline" onClick={onEdit}><Pencil className="size-4" />Edit</Button> : null}
          {onPost ? <Button className="h-9 rounded-md" disabled={isWorking} type="button" onClick={onPost}><Send className="size-4" />Post</Button> : null}
          {voucher.status !== "cancelled" ? <Button className="h-9 rounded-md" disabled={isWorking} type="button" variant="outline" onClick={onCancel}><Ban className="size-4" />Cancel</Button> : null}
        </div>
      )}
    >
      <div className="grid gap-3 md:grid-cols-4">
        <MetricCard title="Voucher Date" value={formatDate(voucher.voucher_date)} />
        <MetricCard title="Status" value={voucher.status} />
        <MetricCard title="Debit" value={formatMoney(totals.debit)} />
        <MetricCard title="Credit" value={formatMoney(totals.credit)} />
      </div>
      <Card className="rounded-md">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Voucher Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 text-sm md:grid-cols-2">
            <InfoRow label="Voucher no" value={voucher.voucher_no} />
            <InfoRow label="Reference" value={voucher.reference_no || "-"} />
            <InfoRow label="Created by" value={voucher.created_by} />
            <InfoRow label="Posted at" value={voucher.posted_at ? formatDate(voucher.posted_at) : "-"} />
            <div className="md:col-span-2"><InfoRow label="Narration" value={voucher.narration || "-"} /></div>
          </div>
        </CardContent>
      </Card>
      <MasterListTableCard className="rounded-md">
        <div className="border-b px-4 py-3">
          <h3 className="text-sm font-semibold">Ledger Lines</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] border-collapse text-sm">
            <thead className="bg-muted/55">
              <tr>
                <TableHead>Ledger</TableHead>
                <TableHead>Narration</TableHead>
                <TableHead className="text-right">Debit</TableHead>
                <TableHead className="text-right">Credit</TableHead>
              </tr>
            </thead>
            <tbody>
              {voucher.lines.map((line) => (
                <tr key={line.uuid} className="border-b border-border/60 last:border-b-0">
                  <td className="px-4 py-2.5 font-medium">{friendlyLedger(line.ledger_name ?? "-")}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{line.line_narration || line.bill_reference || "-"}</td>
                  <td className="px-4 py-2.5 text-right">{moneyOrDash(line.debit_amount)}</td>
                  <td className="px-4 py-2.5 text-right">{moneyOrDash(line.credit_amount)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-muted/30 font-medium">
                <td className="px-4 py-2.5" colSpan={2}>Total</td>
                <td className="px-4 py-2.5 text-right">{formatMoney(totals.debit)}</td>
                <td className="px-4 py-2.5 text-right">{formatMoney(totals.credit)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </MasterListTableCard>
    </MasterListPageFrame>
  )
}

function DayBookPage({ session }: { session: AuthSession }) {
  const queryClient = useQueryClient()
  const [fromDate, setFromDate] = useState("")
  const [toDate, setToDate] = useState("")
  const [voucherType, setVoucherType] = useState("all")
  const [monthKey, setMonthKey] = useState("all")
  const dayBookQuery = useQuery({ queryKey: ["account-day-book", session.selectedTenant.slug], queryFn: () => listAccountDayBook(session) })
  const recalculateMutation = useMutation({
    mutationFn: () => recalculateAccountReports(session),
    onSuccess: async () => {
      toast.success("Day Book recalculated")
      await invalidateReportQueries(queryClient, session)
    },
    onError: (error) => toast.error("Recalculate failed", { description: error instanceof Error ? error.message : "Please try again." }),
  })
  const vouchers = dayBookQuery.data ?? []
  const financialMonths = useMemo(() => financialYearMonths(vouchers), [vouchers])
  const filteredVouchers = useMemo(() => filterDayBookVouchers(vouchers, { fromDate, monthKey, toDate, voucherType }), [fromDate, monthKey, toDate, voucherType, vouchers])
  const dayBookTotals = dayBookSummary(filteredVouchers)
  const voucherTypes = useMemo(() => uniqueVoucherTypes(vouchers), [vouchers])
  return (
    <MasterListPageFrame
      title="Day Book"
      description="Accounting vouchers by date."
      technicalName="page.accounts.day-book"
      action={<ReportActions isRecalculating={recalculateMutation.isPending} onPrint={() => window.print()} onRecalculate={() => recalculateMutation.mutate()} />}
    >
      <div className="grid gap-3 md:grid-cols-4">
        <MetricCard title="Vouchers" value={filteredVouchers.length} />
        <MetricCard title="Sales" value={formatMoney(dayBookTotals.sales)} />
        <MetricCard title="Purchase" value={formatMoney(dayBookTotals.purchase)} />
        <MetricCard title="Net Cash Flow" value={formatMoney(dayBookTotals.receipt - dayBookTotals.payment)} />
      </div>
      <DayBookFilters
        fromDate={fromDate}
        monthKey={monthKey}
        months={financialMonths}
        toDate={toDate}
        voucherType={voucherType}
        voucherTypes={voucherTypes}
        onClear={() => {
          setFromDate("")
          setToDate("")
          setVoucherType("all")
          setMonthKey("all")
        }}
        onFromDateChange={setFromDate}
        onMonthKeyChange={setMonthKey}
        onToDateChange={setToDate}
        onVoucherTypeChange={setVoucherType}
      />
      <DayBookVoucherTable isLoading={dayBookQuery.isFetching} vouchers={filteredVouchers} />
    </MasterListPageFrame>
  )
}

function DayBookFilters({ fromDate, monthKey, months, onClear, onFromDateChange, onMonthKeyChange, onToDateChange, onVoucherTypeChange, toDate, voucherType, voucherTypes }: {
  fromDate: string
  monthKey: string
  months: FinancialMonth[]
  toDate: string
  voucherType: string
  voucherTypes: AccountVoucherType[]
  onClear(): void
  onFromDateChange(value: string): void
  onMonthKeyChange(value: string): void
  onToDateChange(value: string): void
  onVoucherTypeChange(value: string): void
}) {
  return (
    <MasterListTableCard className="rounded-md print:hidden">
      <div className="grid gap-3 p-4 md:grid-cols-[repeat(4,minmax(0,1fr))_auto]">
        <Field label="From date">
          <Input type="date" value={fromDate} onChange={(event) => onFromDateChange(event.target.value)} />
        </Field>
        <Field label="To date">
          <Input type="date" value={toDate} onChange={(event) => onToDateChange(event.target.value)} />
        </Field>
        <Field label="Month">
          <Select value={monthKey} onValueChange={onMonthKeyChange}>
            <SelectTrigger><SelectValue placeholder="Month" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All months</SelectItem>
              {months.map((month) => <SelectItem key={month.key} value={month.key}>{month.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Voucher type">
          <Select value={voucherType} onValueChange={onVoucherTypeChange}>
            <SelectTrigger><SelectValue placeholder="Voucher" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All vouchers</SelectItem>
              {voucherTypes.map((type) => <SelectItem key={type} value={type}>{voucherTypeLabel(type)}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <div className="flex items-end">
          <Button className="h-10 rounded-md" type="button" variant="outline" onClick={onClear}>
            <RotateCcw className="size-4" />
            Clear
          </Button>
        </div>
      </div>
    </MasterListTableCard>
  )
}

function DayBookVoucherTable({ isLoading, vouchers }: { isLoading: boolean; vouchers: AccountVoucher[] }) {
  const totals = dayBookVoucherTotals(vouchers)
  return (
    <MasterListTableCard className="rounded-md">
      <div className="border-b px-4 py-3">
        <h3 className="text-sm font-semibold">Voucher Register</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[980px] border-collapse text-sm">
          <thead className="bg-muted/55">
            <tr>
              <TableHead>Voucher</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Narration</TableHead>
              <TableHead className="text-right">Debit</TableHead>
              <TableHead className="text-right">Credit</TableHead>
              <TableHead>Status</TableHead>
            </tr>
          </thead>
          <tbody>
            {vouchers.map((voucher) => {
              const rowTotals = voucherLineTotals(voucher.lines)
              return (
                <tr key={voucher.uuid} className="border-b border-border/60 last:border-b-0">
                  <td className="px-4 py-2.5 font-medium">{voucher.voucher_no}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{formatDate(voucher.voucher_date)}</td>
                  <td className="px-4 py-2.5">{voucherTypeLabel(voucher.voucher_type)}</td>
                  <td className="px-4 py-2.5">{friendlySource(voucher.source_module)}</td>
                  <td className="max-w-[320px] truncate px-4 py-2.5 text-muted-foreground">{voucher.narration || voucher.reference_no || "-"}</td>
                  <td className="px-4 py-2.5 text-right">{formatMoney(rowTotals.debit)}</td>
                  <td className="px-4 py-2.5 text-right">{formatMoney(rowTotals.credit)}</td>
                  <td className="px-4 py-2.5 capitalize">{voucher.status}</td>
                </tr>
              )
            })}
          </tbody>
          {vouchers.length ? (
            <tfoot>
              <tr className="bg-muted/30 font-medium">
                <td className="px-4 py-2.5" colSpan={5}>Total</td>
                <td className="px-4 py-2.5 text-right">{formatMoney(totals.debit)}</td>
                <td className="px-4 py-2.5 text-right">{formatMoney(totals.credit)}</td>
                <td className="px-4 py-2.5">{vouchers.length} vouchers</td>
              </tr>
            </tfoot>
          ) : null}
        </table>
      </div>
      {vouchers.length === 0 ? <MasterListEmptyState>{isLoading ? "Loading vouchers." : "No vouchers found for this filter."}</MasterListEmptyState> : null}
    </MasterListTableCard>
  )
}

function MonthlyAccountReportTable({ rows }: { rows: MonthlyAccountReportRow[] }) {
  const totals = monthlyReportTotals(rows)
  return (
    <MasterListTableCard className="rounded-md">
      <div className="border-b px-4 py-3">
        <h3 className="text-sm font-semibold">Monthly Movement: Apr to Mar</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1320px] border-collapse text-sm">
          <thead className="bg-muted/55">
            <tr>
              <TableHead>Month</TableHead>
              <TableHead className="text-right">Sales</TableHead>
              <TableHead className="text-right">Purchase</TableHead>
              <TableHead className="text-right">Receipt</TableHead>
              <TableHead className="text-right">Payment</TableHead>
              <TableHead className="text-right">Cash In</TableHead>
              <TableHead className="text-right">Cash Out</TableHead>
              <TableHead className="text-right">Cash Flow</TableHead>
              <TableHead className="text-right">Bank In</TableHead>
              <TableHead className="text-right">Bank Out</TableHead>
              <TableHead className="text-right">Bank Net</TableHead>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key} className="border-b border-border/60 last:border-b-0">
                <td className="px-4 py-2.5 font-medium">{row.label}</td>
                <td className="px-4 py-2.5 text-right">{moneyOrDash(row.sales)}</td>
                <td className="px-4 py-2.5 text-right">{moneyOrDash(row.purchase)}</td>
                <td className="px-4 py-2.5 text-right">{moneyOrDash(row.receipt)}</td>
                <td className="px-4 py-2.5 text-right">{moneyOrDash(row.payment)}</td>
                <td className="px-4 py-2.5 text-right">{moneyOrDash(row.cashIn)}</td>
                <td className="px-4 py-2.5 text-right">{moneyOrDash(row.cashOut)}</td>
                <td className="px-4 py-2.5 text-right">{moneyOrDash(row.cashIn - row.cashOut)}</td>
                <td className="px-4 py-2.5 text-right">{moneyOrDash(row.bankIn)}</td>
                <td className="px-4 py-2.5 text-right">{moneyOrDash(row.bankOut)}</td>
                <td className="px-4 py-2.5 text-right">{moneyOrDash(row.bankIn - row.bankOut)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-muted/30 font-medium">
              <td className="px-4 py-2.5">Total</td>
              <td className="px-4 py-2.5 text-right">{formatMoney(totals.sales)}</td>
              <td className="px-4 py-2.5 text-right">{formatMoney(totals.purchase)}</td>
              <td className="px-4 py-2.5 text-right">{formatMoney(totals.receipt)}</td>
              <td className="px-4 py-2.5 text-right">{formatMoney(totals.payment)}</td>
              <td className="px-4 py-2.5 text-right">{formatMoney(totals.cashIn)}</td>
              <td className="px-4 py-2.5 text-right">{formatMoney(totals.cashOut)}</td>
              <td className="px-4 py-2.5 text-right">{formatMoney(totals.cashIn - totals.cashOut)}</td>
              <td className="px-4 py-2.5 text-right">{formatMoney(totals.bankIn)}</td>
              <td className="px-4 py-2.5 text-right">{formatMoney(totals.bankOut)}</td>
              <td className="px-4 py-2.5 text-right">{formatMoney(totals.bankIn - totals.bankOut)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </MasterListTableCard>
  )
}

function MonthlyMovementPage({ session }: { session: AuthSession }) {
  const queryClient = useQueryClient()
  const defaultContextQuery = useQuery({ queryKey: ["default-company-context", session.selectedTenant.slug], queryFn: () => getDefaultCompanyContext(session) })
  const yearsQuery = useQuery({ queryKey: ["accounting-years", session.selectedTenant.slug], queryFn: () => listMasterDataRecords(session, "accountingYear") })
  const [selectedYearId, setSelectedYearId] = useState<number | null>(null)
  const effectiveYearId = selectedYearId ?? defaultContextQuery.data?.accountingYearId ?? null
  const selectedYear = accountingYearOption(yearsQuery.data ?? [], effectiveYearId) ?? accountingYearFromDefaultContext(defaultContextQuery.data)
  const dayBookQuery = useQuery({ queryKey: ["account-day-book", session.selectedTenant.slug, effectiveYearId], queryFn: () => listAccountDayBook(session, effectiveYearId), enabled: Boolean(effectiveYearId) })
  const cashBookQuery = useQuery({ queryKey: ["account-posting-book", session.selectedTenant.slug, "cash", effectiveYearId], queryFn: () => listAccountPostingBook(session, "cash", effectiveYearId), enabled: Boolean(effectiveYearId) })
  const bankBookQuery = useQuery({ queryKey: ["account-posting-book", session.selectedTenant.slug, "bank", effectiveYearId], queryFn: () => listAccountPostingBook(session, "bank", effectiveYearId), enabled: Boolean(effectiveYearId) })
  const recalculateMutation = useMutation({
    mutationFn: () => recalculateAccountReports(session),
    onSuccess: async () => {
      toast.success("Monthly Movement recalculated")
      await invalidateReportQueries(queryClient, session)
    },
    onError: (error) => toast.error("Recalculate failed", { description: error instanceof Error ? error.message : "Please try again." }),
  })
  const vouchers = dayBookQuery.data ?? []
  const financialMonths = useMemo(() => financialYearMonths(vouchers, selectedYear?.startDate), [selectedYear?.startDate, vouchers])
  const rows = useMemo(() => buildMonthlyAccountReport(vouchers, cashBookQuery.data ?? [], bankBookQuery.data ?? [], financialMonths), [bankBookQuery.data, cashBookQuery.data, financialMonths, vouchers])
  const totals = monthlyReportTotals(rows)
  return (
    <MasterListPageFrame
      title="Monthly Movement"
      description="Apr to Mar movement for sales, purchases, receipts, payments, cash, and bank."
      technicalName="page.accounts.monthly-movement"
      action={<ReportActions isRecalculating={recalculateMutation.isPending} onPrint={() => window.print()} onRecalculate={() => recalculateMutation.mutate()} />}
    >
      <MasterListTableCard className="rounded-md print:hidden">
        <div className="grid gap-3 p-4 md:grid-cols-[minmax(220px,360px)_1fr]">
          <Field label="Accounting Year">
            <Select value={effectiveYearId ? String(effectiveYearId) : ""} onValueChange={(value) => setSelectedYearId(Number(value))}>
              <SelectTrigger><SelectValue placeholder="Accounting year" /></SelectTrigger>
              <SelectContent>
                {(yearsQuery.data ?? []).map((year) => {
                  const option = accountingYearOption([year], Number(year.id))
                  return <SelectItem key={year.uuid} value={String(year.id)}>{option?.label ?? String(year.name ?? year.id)}</SelectItem>
                })}
              </SelectContent>
            </Select>
          </Field>
          <div className="flex items-end text-sm text-muted-foreground">
            {selectedYear ? `${selectedYear.startDate} to ${selectedYear.endDate}` : "Select an accounting year to view Apr-Mar movement."}
          </div>
        </div>
      </MasterListTableCard>
      <div className="grid gap-3 md:grid-cols-4">
        <MetricCard title="Sales" value={formatMoney(totals.sales)} />
        <MetricCard title="Purchase" value={formatMoney(totals.purchase)} />
        <MetricCard title="Cash Flow" value={formatMoney(totals.cashIn - totals.cashOut)} />
        <MetricCard title="Bank Net" value={formatMoney(totals.bankIn - totals.bankOut)} />
      </div>
      <MonthlyAccountReportTable rows={rows} />
      {dayBookQuery.isFetching || cashBookQuery.isFetching || bankBookQuery.isFetching ? <MasterListEmptyState>Loading monthly movement.</MasterListEmptyState> : null}
    </MasterListPageFrame>
  )
}

function TrialBalancePage({ session }: { session: AuthSession }) {
  const queryClient = useQueryClient()
  const trialQuery = useQuery({ queryKey: ["account-trial-balance", session.selectedTenant.slug], queryFn: () => listAccountTrialBalance(session) })
  const recalculateMutation = useMutation({
    mutationFn: () => recalculateAccountReports(session),
    onSuccess: async () => {
      toast.success("Accounts reports recalculated")
      await invalidateReportQueries(queryClient, session)
    },
    onError: (error) => toast.error("Recalculate failed", { description: error instanceof Error ? error.message : "Please try again." }),
  })
  return (
    <MasterListPageFrame
      title="Trial Balance"
      description="Ledger debit and credit balances."
      technicalName="page.accounts.trial-balance"
      action={<ReportActions isRecalculating={recalculateMutation.isPending} onPrint={() => window.print()} onRecalculate={() => recalculateMutation.mutate()} />}
    >
      <ReportTable title="Trial Balance" rows={trialQuery.data ?? []} showTotals />
    </MasterListPageFrame>
  )
}

function SummaryReportPage({ reportType, session }: { reportType: "profit-loss" | "balance-sheet"; session: AuthSession }) {
  const queryClient = useQueryClient()
  const query = useQuery({
    queryKey: [`account-${reportType}`, session.selectedTenant.slug],
    queryFn: () => reportType === "profit-loss" ? listAccountProfitLoss(session) : listAccountBalanceSheet(session),
  })
  const recalculateMutation = useMutation({
    mutationFn: () => recalculateAccountReports(session),
    onSuccess: async () => {
      toast.success("Accounts reports recalculated")
      await invalidateReportQueries(queryClient, session)
    },
    onError: (error) => toast.error("Recalculate failed", { description: error instanceof Error ? error.message : "Please try again." }),
  })
  const data = query.data ?? { rows: [], totals: { debit_amount: 0, credit_amount: 0 } }
  return (
    <MasterListPageFrame
      title={reportType === "profit-loss" ? "Profit & Loss" : "Balance Sheet"}
      description="Accounting report from posted vouchers."
      technicalName={`page.accounts.${reportType}`}
      action={<ReportActions isRecalculating={recalculateMutation.isPending} onPrint={() => window.print()} onRecalculate={() => recalculateMutation.mutate()} />}
    >
      <SummaryReport data={data} />
    </MasterListPageFrame>
  )
}

function ReportActions({ isRecalculating, onPrint, onRecalculate }: { isRecalculating: boolean; onPrint(): void; onRecalculate(): void }) {
  return (
    <div className="flex flex-wrap items-center justify-end gap-2 print:hidden">
      <Button className="h-9 rounded-md" disabled={isRecalculating} type="button" variant="outline" onClick={onRecalculate}>
        <RotateCcw className={isRecalculating ? "size-4 animate-spin" : "size-4"} />
        Recalculate
      </Button>
      <Button className="h-9 rounded-md" type="button" variant="outline" onClick={onPrint}>
        <Printer className="size-4" />
        Print
      </Button>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border/70 px-3 py-2">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 font-medium">{value}</div>
    </div>
  )
}

function VoucherTable({
  currentPage,
  isLoading,
  isWorking = false,
  listViewMode,
  monthlyVouchers,
  onCancel,
  onEdit,
  onNextPage,
  onPageChange,
  onPost,
  onPreviousPage,
  onRowsPerPageChange,
  onView,
  rowsPerPage,
  totalCount,
  totalPages,
  visibleColumns,
  vouchers,
}: {
  currentPage: number
  isLoading: boolean
  isWorking?: boolean
  listViewMode: VoucherListViewMode
  monthlyVouchers: MonthlyVoucherSummary[]
  rowsPerPage: number
  totalCount: number
  totalPages: number
  visibleColumns: Record<VoucherColumnId, boolean>
  vouchers: AccountVoucher[]
  onCancel?: (voucher: AccountVoucher) => void
  onEdit?: (voucher: AccountVoucher) => void
  onNextPage(): void
  onPageChange(page: number): void
  onPost?: (voucher: AccountVoucher) => void
  onPreviousPage(): void
  onRowsPerPageChange(value: number): void
  onView?: (voucher: AccountVoucher) => void
}) {
  const monthlyTotals = monthlyVouchers.reduce((sum, row) => ({ credit: roundMoney(sum.credit + row.credit), debit: roundMoney(sum.debit + row.debit), voucherCount: sum.voucherCount + row.voucherCount }), { credit: 0, debit: 0, voucherCount: 0 })
  return (
    <>
      <MasterListTableCard className="rounded-md">
        <div className="overflow-x-auto">
          {listViewMode === "month" ? (
          <table className="w-full min-w-[760px] border-collapse text-sm">
            <thead className="bg-muted/55">
              <tr>
                <TableHead>Month</TableHead>
                <TableHead className="text-center">Vouchers</TableHead>
                <TableHead className="text-right">Debit</TableHead>
                <TableHead className="text-right">Credit</TableHead>
              </tr>
            </thead>
            <tbody>
              {monthlyVouchers.map((row) => (
                <tr key={row.month} className="border-b border-border/60 last:border-b-0">
                  <td className="px-4 py-2.5 font-semibold">{formatMonthLabel(row.month)}</td>
                  <td className="px-4 py-2.5 text-center">{row.voucherCount}</td>
                  <td className="px-4 py-2.5 text-right">{formatMoney(row.debit)}</td>
                  <td className="px-4 py-2.5 text-right">{formatMoney(row.credit)}</td>
                </tr>
              ))}
            </tbody>
            {monthlyVouchers.length ? (
              <tfoot>
                <tr className="bg-muted/30 font-medium">
                  <td className="px-4 py-2.5">Total</td>
                  <td className="px-4 py-2.5 text-center">{monthlyTotals.voucherCount}</td>
                  <td className="px-4 py-2.5 text-right">{formatMoney(monthlyTotals.debit)}</td>
                  <td className="px-4 py-2.5 text-right">{formatMoney(monthlyTotals.credit)}</td>
                </tr>
              </tfoot>
            ) : null}
          </table>
          ) : (
          <table className="w-full min-w-[980px] border-collapse text-sm">
            <thead className="bg-muted/55">
              <tr>
                {visibleColumns.voucher ? <TableHead>Voucher</TableHead> : null}
                {visibleColumns.date ? <TableHead>Date</TableHead> : null}
                {visibleColumns.type ? <TableHead>Type</TableHead> : null}
                {visibleColumns.reference ? <TableHead>Reference</TableHead> : null}
                {visibleColumns.narration ? <TableHead>Narration</TableHead> : null}
                {visibleColumns.debit ? <TableHead className="text-right">Debit</TableHead> : null}
                {visibleColumns.credit ? <TableHead className="text-right">Credit</TableHead> : null}
                {visibleColumns.status ? <TableHead>Status</TableHead> : null}
                {visibleColumns.updated ? <TableHead>Updated</TableHead> : null}
                {(onView || onEdit || onPost || onCancel) ? <TableHead className="text-right">Action</TableHead> : null}
              </tr>
            </thead>
            <tbody>
              {vouchers.map((voucher) => {
                const totals = voucherLineTotals(voucher.lines)
                return (
                  <tr key={voucher.uuid} className="border-b border-border/60 last:border-b-0">
                    {visibleColumns.voucher ? <td className="px-4 py-2.5 font-medium">
                      {onView ? <button className="font-semibold hover:underline" type="button" onClick={() => onView(voucher)}>{voucher.voucher_no}</button> : voucher.voucher_no}
                    </td> : null}
                    {visibleColumns.date ? <td className="px-4 py-2.5 text-muted-foreground">{formatDate(voucher.voucher_date)}</td> : null}
                    {visibleColumns.type ? <td className="px-4 py-2.5 capitalize">{voucher.voucher_type.replace(/_/g, " ")}</td> : null}
                    {visibleColumns.reference ? <td className="px-4 py-2.5 text-muted-foreground">{voucher.reference_no || "-"}</td> : null}
                    {visibleColumns.narration ? <td className="max-w-[320px] truncate px-4 py-2.5 text-muted-foreground">{voucher.narration || "-"}</td> : null}
                    {visibleColumns.debit ? <td className="px-4 py-2.5 text-right">{formatMoney(totals.debit)}</td> : null}
                    {visibleColumns.credit ? <td className="px-4 py-2.5 text-right">{formatMoney(totals.credit)}</td> : null}
                    {visibleColumns.status ? <td className="px-4 py-2.5 capitalize">{voucher.status}</td> : null}
                    {visibleColumns.updated ? <td className="px-4 py-2.5 text-muted-foreground">{formatDate(voucher.updated_at)}</td> : null}
                    {(onView || onEdit || onPost || onCancel) ? (
                      <td className="px-4 py-2 text-right">
                        <MasterListRowActions
                          title={voucher.voucher_no}
                          deleteLabel="Cancel"
                          onDelete={voucher.status !== "cancelled" && onCancel ? () => onCancel(voucher) : undefined}
                          onEdit={voucher.status === "draft" && onEdit ? () => onEdit(voucher) : undefined}
                          onView={onView ? () => onView(voucher) : undefined}
                        />
                        {voucher.status === "draft" && onPost ? <Button className="ml-2 h-8 rounded-md" disabled={isWorking} size="sm" type="button" variant="outline" onClick={() => onPost(voucher)}><Send className="size-4" />Post</Button> : null}
                      </td>
                    ) : null}
                  </tr>
                )
              })}
            </tbody>
          </table>
          )}
        </div>
        {(listViewMode === "month" ? monthlyVouchers.length : vouchers.length) === 0 ? <MasterListEmptyState>{isLoading ? "Loading vouchers." : "No vouchers found."}</MasterListEmptyState> : null}
      </MasterListTableCard>
      <MasterListPaginationCard
        page={currentPage}
        rowsPerPage={rowsPerPage}
        showingLabel={buildMasterListShowingLabel({ page: currentPage, pageSize: rowsPerPage, totalCount })}
        singularLabel="voucher"
        totalCount={totalCount}
        totalPages={totalPages}
        onNextPage={onNextPage}
        onPageChange={onPageChange}
        onPreviousPage={onPreviousPage}
        onRowsPerPageChange={onRowsPerPageChange}
      />
    </>
  )
}

function SummaryReport({ data }: { data: AccountSummaryReport }) {
  return (
    <div className="space-y-3">
      <div className="grid gap-3 md:grid-cols-3">
        <MetricCard title="Debit" value={formatMoney(data.totals.debit_amount)} />
        <MetricCard title="Credit" value={formatMoney(data.totals.credit_amount)} />
        <MetricCard title="Net" value={formatMoney(Math.abs(data.totals.debit_amount - data.totals.credit_amount))} />
      </div>
      <ReportTable rows={data.rows} title="Report Lines" showTotals />
    </div>
  )
}

function ReportTable({ rows, showTotals = false, title }: { rows: AccountTrialBalanceRow[]; showTotals?: boolean; title: string }) {
  const totals = trialTotals(rows)
  return (
    <MasterListTableCard className="rounded-md">
      <div className="border-b px-4 py-3">
        <h3 className="text-sm font-semibold">{title}</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] border-collapse text-sm">
          <thead className="bg-muted/55">
            <tr>
              <TableHead>Ledger</TableHead>
              <TableHead>Group</TableHead>
              <TableHead>Nature</TableHead>
              <TableHead className="text-right">Debit</TableHead>
              <TableHead className="text-right">Credit</TableHead>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.ledger_uuid} className="border-b border-border/60 last:border-b-0">
                <td className="px-4 py-2.5 font-medium">{friendlyLedger(row.ledger_name)}</td>
                <td className="px-4 py-2.5 text-muted-foreground">{row.group_name ? friendlyLedger(row.group_name) : "-"}</td>
                <td className="px-4 py-2.5 capitalize">{row.nature ?? "-"}</td>
                <td className="px-4 py-2.5 text-right">{row.debit_amount ? formatMoney(row.debit_amount) : "-"}</td>
                <td className="px-4 py-2.5 text-right">{row.credit_amount ? formatMoney(row.credit_amount) : "-"}</td>
              </tr>
            ))}
          </tbody>
          {showTotals ? (
            <tfoot>
              <tr className="bg-muted/30 font-medium">
                <td className="px-4 py-2.5" colSpan={3}>Total</td>
                <td className="px-4 py-2.5 text-right">{formatMoney(totals.debit)}</td>
                <td className="px-4 py-2.5 text-right">{formatMoney(totals.credit)}</td>
              </tr>
            </tfoot>
          ) : null}
        </table>
      </div>
      {rows.length === 0 ? <MasterListEmptyState>No report rows found.</MasterListEmptyState> : null}
    </MasterListTableCard>
  )
}

async function invalidateReportQueries(queryClient: ReturnType<typeof useQueryClient>, session: AuthSession) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ["account-trial-balance", session.selectedTenant.slug] }),
    queryClient.invalidateQueries({ queryKey: ["account-profit-loss", session.selectedTenant.slug] }),
    queryClient.invalidateQueries({ queryKey: ["account-balance-sheet", session.selectedTenant.slug] }),
    queryClient.invalidateQueries({ queryKey: ["account-day-book", session.selectedTenant.slug] }),
    queryClient.invalidateQueries({ queryKey: ["account-vouchers", session.selectedTenant.slug] }),
    queryClient.invalidateQueries({ queryKey: ["account-posting-book", session.selectedTenant.slug] }),
  ])
}

function Field({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  )
}

function MetricCard({ title, value }: { title: string; value: number | string }) {
  return (
    <Card className="rounded-md">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold tabular-nums">{value}</div>
      </CardContent>
    </Card>
  )
}

function TableHead({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <th className={`px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground ${className}`}>{children}</th>
}

function filterChartRows(groups: AccountGroup[], ledgers: AccountLedger[], searchValue: string) {
  const search = searchValue.trim().toLowerCase()
  const ledgersByGroup = new Map<number, AccountLedger[]>()
  for (const ledger of ledgers) {
    const groupId = Number(ledger.group_id ?? 0)
    ledgersByGroup.set(groupId, [...(ledgersByGroup.get(groupId) ?? []), ledger])
  }
  const rows: Array<{ key: string; kind: "group" | "ledger"; name: string; depth: number; nature?: string | null; normalBalance?: string | null; opening?: number | null; current?: number | null }> = []
  for (const group of groups) {
    const depth = Math.max(0, group.path.split("/").length - 1)
    rows.push({ key: `group-${group.uuid}`, kind: "group", name: group.name, depth, nature: group.nature, normalBalance: group.normal_balance })
    for (const ledger of ledgersByGroup.get(group.id) ?? []) {
      rows.push({ key: `ledger-${ledger.uuid}`, kind: "ledger", name: ledger.name, depth: depth + 1, nature: group.nature, normalBalance: ledger.normal_balance ?? group.normal_balance, opening: Number(ledger.opening_balance ?? 0), current: Number(ledger.current_balance ?? 0) })
    }
  }
  if (!search) return rows
  return rows.filter((row) => [row.name, row.kind, row.nature, row.normalBalance].some((value) => String(value ?? "").toLowerCase().includes(search)))
}

function searchVouchers(vouchers: AccountVoucher[], searchValue: string) {
  const search = searchValue.trim().toLowerCase()
  if (!search) return vouchers
  return vouchers.filter((voucher) => [voucher.voucher_no, voucher.voucher_type, voucher.status, voucher.narration, voucher.reference_no].some((value) => String(value ?? "").toLowerCase().includes(search)))
}

function filterDayBookVouchers(vouchers: AccountVoucher[], filters: { fromDate: string; monthKey: string; toDate: string; voucherType: string }) {
  return vouchers.filter((voucher) => {
    const voucherDate = dateKey(voucher.voucher_date)
    if (filters.fromDate && voucherDate < filters.fromDate) return false
    if (filters.toDate && voucherDate > filters.toDate) return false
    if (filters.monthKey !== "all" && voucherDate.slice(0, 7) !== filters.monthKey) return false
    if (filters.voucherType !== "all" && voucher.voucher_type !== filters.voucherType) return false
    return true
  })
}

function uniqueVoucherTypes(vouchers: AccountVoucher[]) {
  return Array.from(new Set(vouchers.map((voucher) => voucher.voucher_type))).sort((left, right) => voucherTypeLabel(left).localeCompare(voucherTypeLabel(right)))
}

function accountLedgerTypeForGroup(group?: AccountGroup): AccountLedgerType {
  const key = String(group?.system_key ?? group?.path ?? group?.name ?? "").toLowerCase()
  if (key.includes("bank")) return "bank"
  if (key.includes("cash")) return "cash"
  if (key.includes("fixed")) return "fixed_asset"
  if (key.includes("debtor")) return "customer"
  if (key.includes("creditor")) return "supplier"
  if (key.includes("sales")) return "sales"
  if (key.includes("purchase")) return "purchase"
  if (key.includes("duties") || key.includes("tax")) return "gst"
  if (key.includes("round")) return "round_off"
  if (key.includes("discount")) return "discount"
  if (group?.nature === "income") return "sales"
  if (group?.nature === "expense") return "purchase"
  return "cash"
}

function defaultJournalGroupId(groups: AccountGroup[], side: JournalPostingLine["side"]) {
  const preferredKeys = side === "debit" ? ["indirect_expenses", "current_assets", "expenses"] : ["current_liabilities", "sundry_creditors", "income"]
  for (const key of preferredKeys) {
    const group = groups.find((row) => row.system_key === key)
    if (group) return Number(group.id)
  }
  return groups[0]?.id ? Number(groups[0].id) : null
}

function dayBookSummary(vouchers: AccountVoucher[]) {
  return vouchers.reduce(
    (sum, voucher) => {
      const amount = voucherLineTotals(voucher.lines).debit
      const source = voucher.source_module || voucher.voucher_type
      if (source === "sales") sum.sales = roundMoney(sum.sales + amount)
      if (source === "purchase") sum.purchase = roundMoney(sum.purchase + amount)
      if (source === "receipt") sum.receipt = roundMoney(sum.receipt + amount)
      if (source === "payment") sum.payment = roundMoney(sum.payment + amount)
      return sum
    },
    { payment: 0, purchase: 0, receipt: 0, sales: 0 },
  )
}

function dayBookVoucherTotals(vouchers: AccountVoucher[]) {
  return vouchers.reduce(
    (sum, voucher) => {
      const totals = voucherLineTotals(voucher.lines)
      return { debit: roundMoney(sum.debit + totals.debit), credit: roundMoney(sum.credit + totals.credit) }
    },
    { debit: 0, credit: 0 },
  )
}

function accountingYearOption(records: MasterDataRecord[], accountingYearId: number | null) {
  const record = records.find((row) => Number(row.id) === Number(accountingYearId))
  if (!record) return null
  const startDate = dateKey(String(record.start_date ?? ""))
  const endDate = dateKey(String(record.end_date ?? ""))
  return {
    id: Number(record.id),
    label: String(record.name ?? record.code ?? record.uuid ?? record.id),
    startDate,
    endDate,
  }
}

function accountingYearFromDefaultContext(context: Awaited<ReturnType<typeof getDefaultCompanyContext>> | undefined | null) {
  if (!context) return null
  return {
    id: context.accountingYearId,
    label: context.accountingYearName,
    startDate: dateKey(context.accountingYearStartDate ?? ""),
    endDate: dateKey(context.accountingYearEndDate ?? ""),
  }
}

function financialYearMonths(vouchers: AccountVoucher[], startDate?: string | null) {
  if (startDate) {
    const start = new Date(`${dateKey(startDate)}T00:00:00`)
    if (!Number.isNaN(start.getTime())) return financialYearMonthsFromStart(start.getFullYear())
  }
  const voucherDates = vouchers
    .map((voucher) => dateKey(voucher.voucher_date))
    .filter(Boolean)
    .sort()
  const latestDate = voucherDates[voucherDates.length - 1]
  const anchor = latestDate ? new Date(`${latestDate}T00:00:00`) : new Date()
  const year = anchor.getFullYear()
  const startYear = anchor.getMonth() >= 3 ? year : year - 1
  return financialYearMonthsFromStart(startYear)
}

function financialYearMonthsFromStart(startYear: number) {
  return Array.from({ length: 12 }, (_, index) => {
    const calendarMonth = (3 + index) % 12
    const calendarYear = calendarMonth >= 3 ? startYear : startYear + 1
    const key = `${calendarYear}-${String(calendarMonth + 1).padStart(2, "0")}`
    return { key, label: `${monthShortName(calendarMonth)} ${calendarYear}`, month: calendarMonth, year: calendarYear }
  })
}

function buildMonthlyAccountReport(vouchers: AccountVoucher[], cashRows: AccountPostingBookRow[], bankRows: AccountPostingBookRow[], months: FinancialMonth[]) {
  const rows = new Map<string, MonthlyAccountReportRow>(months.map((month) => [month.key, { ...month, bankIn: 0, bankOut: 0, cashIn: 0, cashOut: 0, payment: 0, purchase: 0, receipt: 0, sales: 0 }]))
  for (const voucher of vouchers) {
    const row = rows.get(dateKey(voucher.voucher_date).slice(0, 7))
    if (!row) continue
    const amount = voucherLineTotals(voucher.lines).debit
    const source = voucher.source_module || voucher.voucher_type
    if (source === "sales") row.sales = roundMoney(row.sales + amount)
    if (source === "purchase") row.purchase = roundMoney(row.purchase + amount)
    if (source === "receipt") row.receipt = roundMoney(row.receipt + amount)
    if (source === "payment") row.payment = roundMoney(row.payment + amount)
  }
  addPostingRowsToMonthlyReport(rows, cashRows, "cash")
  addPostingRowsToMonthlyReport(rows, bankRows, "bank")
  return months.map((month) => rows.get(month.key)!)
}

function addPostingRowsToMonthlyReport(rows: Map<string, MonthlyAccountReportRow>, postingRows: AccountPostingBookRow[], bookType: "cash" | "bank") {
  for (const posting of postingRows) {
    const row = rows.get(dateKey(posting.posting_date).slice(0, 7))
    if (!row) continue
    if (bookType === "cash") {
      row.cashIn = roundMoney(row.cashIn + numberValue(posting.debit_amount))
      row.cashOut = roundMoney(row.cashOut + numberValue(posting.credit_amount))
      continue
    }
    row.bankIn = roundMoney(row.bankIn + numberValue(posting.debit_amount))
    row.bankOut = roundMoney(row.bankOut + numberValue(posting.credit_amount))
  }
}

function monthlyReportTotals(rows: MonthlyAccountReportRow[]) {
  return rows.reduce(
    (sum, row) => ({
      bankIn: roundMoney(sum.bankIn + row.bankIn),
      bankOut: roundMoney(sum.bankOut + row.bankOut),
      cashIn: roundMoney(sum.cashIn + row.cashIn),
      cashOut: roundMoney(sum.cashOut + row.cashOut),
      payment: roundMoney(sum.payment + row.payment),
      purchase: roundMoney(sum.purchase + row.purchase),
      receipt: roundMoney(sum.receipt + row.receipt),
      sales: roundMoney(sum.sales + row.sales),
    }),
    { bankIn: 0, bankOut: 0, cashIn: 0, cashOut: 0, payment: 0, purchase: 0, receipt: 0, sales: 0 },
  )
}

function voucherTypeLabel(value: AccountVoucherType) {
  if (value === "opening") return "Opening Posting"
  if (value === "contra") return "Contra"
  if (value === "journal") return "Journal"
  return value.replace(/_/g, " ").replace(/\b\w/g, (character) => character.toUpperCase())
}

function friendlySource(value: string | null) {
  if (value === "sales") return "Sales"
  if (value === "purchase") return "Purchase"
  if (value === "receipt") return "Receipt"
  if (value === "payment") return "Payment"
  return value ?? "-"
}

function friendlyLedger(value: string) {
  return value
    .replace(/Sundry Debtors/gi, "Customers")
    .replace(/Sundry Creditors/gi, "Suppliers")
    .replace(/Sales Accounts/gi, "Sales")
    .replace(/Purchase Accounts/gi, "Purchases")
    .replace(/Duties & Taxes/gi, "Taxes")
}

function PeriodLockStatus({ lock }: { lock: AccountingPeriodLock }) {
  const active = Boolean(lock.is_active)
  return (
    <span className={`inline-flex h-6 items-center gap-1 rounded-md border px-2 text-xs font-medium ${active ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-50 text-slate-600"}`}>
      {active ? <LockKeyhole className="size-3" /> : <UnlockKeyhole className="size-3" />}
      {active ? "Active" : "Released"}
    </span>
  )
}

function periodLockScope(lock: AccountingPeriodLock, context: Awaited<ReturnType<typeof getDefaultCompanyContext>> | undefined) {
  const company = lock.company_id ? (context?.companyId === Number(lock.company_id) ? context.companyName : `Company #${lock.company_id}`) : "All companies"
  const year = lock.accounting_year_id ? (context?.accountingYearId === Number(lock.accounting_year_id) ? context.accountingYearName : `Year #${lock.accounting_year_id}`) : "All years"
  return `${company} / ${year}`
}

function VoucherViewModeSelect({ onChange, value }: { onChange(value: VoucherListViewMode): void; value: VoucherListViewMode }) {
  return (
    <Select value={value} onValueChange={(nextValue) => onChange(nextValue === "month" ? "month" : "day")}>
      <SelectTrigger className="h-8 min-w-28 rounded-md border-border/80 bg-background text-sm shadow-none">
        <SelectValue />
      </SelectTrigger>
      <SelectContent align="end" className="rounded-md">
        <SelectItem value="day">Day view</SelectItem>
        <SelectItem value="month">Month view</SelectItem>
      </SelectContent>
    </Select>
  )
}

function filterVouchers(vouchers: AccountVoucher[], statusFilter: string) {
  if (statusFilter === "all") return vouchers
  return vouchers.filter((voucher) => voucher.status === statusFilter)
}

function summarizeVouchersByMonth(vouchers: AccountVoucher[]): MonthlyVoucherSummary[] {
  const grouped = new Map<string, MonthlyVoucherSummary>()
  for (const voucher of vouchers) {
    const key = dateKey(voucher.voucher_date).slice(0, 7)
    const totals = voucherLineTotals(voucher.lines)
    const row = grouped.get(key) ?? { credit: 0, debit: 0, month: key, voucherCount: 0 }
    row.credit = roundMoney(row.credit + totals.credit)
    row.debit = roundMoney(row.debit + totals.debit)
    row.voucherCount += 1
    grouped.set(key, row)
  }
  return Array.from(grouped.values()).sort((left, right) => right.month.localeCompare(left.month))
}

function formatMonthLabel(value: string) {
  const [year, month] = value.split("-").map(Number)
  if (!year || !month) return value
  return new Date(year, month - 1, 1).toLocaleDateString("en-IN", { month: "short", year: "numeric" })
}

function voucherLineTotals(lines: Array<{ debit_amount?: unknown; credit_amount?: unknown }>) {
  return lines.reduce(
    (sum, line) => ({
      debit: roundMoney(sum.debit + numberValue(line.debit_amount)),
      credit: roundMoney(sum.credit + numberValue(line.credit_amount)),
    }),
    { debit: 0, credit: 0 },
  )
}

function trialTotals(rows: AccountTrialBalanceRow[]) {
  return rows.reduce(
    (sum, row) => ({
      debit: roundMoney(sum.debit + numberValue(row.debit_amount)),
      credit: roundMoney(sum.credit + numberValue(row.credit_amount)),
    }),
    { debit: 0, credit: 0 },
  )
}

function numberValue(value: unknown) {
  const number = Number(value ?? 0)
  return Number.isFinite(number) ? number : 0
}

function roundMoney(value: unknown) {
  return Math.round(numberValue(value) * 100) / 100
}

function formatMoney(value: unknown) {
  return numberValue(value).toLocaleString("en-IN", { maximumFractionDigits: 2, minimumFractionDigits: 2 })
}

function moneyOrDash(value: unknown) {
  return roundMoney(value) === 0 ? "-" : formatMoney(value)
}

function formatDate(value: string) {
  if (!value) return "-"
  return new Date(value).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
}

function dateKey(value: string) {
  return String(value ?? "").slice(0, 10)
}

function monthShortName(monthIndex: number) {
  return ["Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar"][(monthIndex + 9) % 12] ?? "Apr"
}
