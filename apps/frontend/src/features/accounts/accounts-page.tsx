import { useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { Ban, Plus, Printer, RotateCcw, Save, Send } from "lucide-react"
import { Button } from "src/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "src/components/ui/card"
import { Input } from "src/components/ui/input"
import { Label } from "src/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "src/components/ui/select"
import { Textarea } from "src/components/ui/textarea"
import {
  MasterListEmptyState,
  MasterListPageFrame,
  MasterListPaginationCard,
  MasterListTableCard,
  MasterListToolbarCard,
  buildMasterListShowingLabel,
} from "src/components/blocks/lists/master-list"
import type { AuthSession } from "src/features/auth/auth-client"
import { getDefaultCompanyContext } from "src/features/company/company-client"
import { listMasterDataRecords } from "src/features/master-data/infrastructure/master-data-client"
import type { MasterDataRecord } from "src/features/master-data/domain/master-data"
import {
  cancelAccountVoucher,
  listAccountBalanceSheet,
  listAccountDayBook,
  listAccountGroups,
  listAccountPostingBook,
  listAccountProfitLoss,
  listAccountTrialBalance,
  listAccountVouchers,
  listAllAccountLedgers,
  postAccountVoucher,
  recalculateAccountReports,
  upsertAccountVoucher,
  type AccountGroup,
  type AccountLedger,
  type AccountPostingBookRow,
  type AccountSummaryReport,
  type AccountTrialBalanceRow,
  type AccountVoucher,
  type AccountVoucherInput,
  type AccountVoucherLineInput,
  type AccountVoucherType,
} from "./accounts-client"

type AccountsView = "overview" | "chart" | "vouchers" | "voucher-new" | "journal-vouchers" | "contra-vouchers" | "opening-vouchers" | "cash-posting" | "bank-posting" | "day-book" | "monthly-movement" | "trial-balance" | "profit-loss" | "balance-sheet"
type VoucherForm = AccountVoucherInput & { lines: AccountVoucherLineInput[] }
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

export function AccountsPage({ session, view = "overview" }: { session: AuthSession; view?: AccountsView }) {
  if (view === "chart") return <ChartOfAccountsPage session={session} />
  if (view === "vouchers") return <AccountingVoucherPage session={session} />
  if (view === "voucher-new") return <AccountingVoucherPage defaultVoucherType="journal" initialFormOpen session={session} />
  if (view === "journal-vouchers") return <AccountingVoucherPage defaultVoucherType="journal" focusedVoucherType="journal" session={session} />
  if (view === "contra-vouchers") return <AccountingVoucherPage defaultVoucherType="contra" focusedVoucherType="contra" session={session} />
  if (view === "opening-vouchers") return <AccountingVoucherPage defaultVoucherType="opening" focusedVoucherType="opening" session={session} />
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

function AccountingVoucherPage({ defaultVoucherType = "journal", focusedVoucherType = null, initialFormOpen = false, session }: { defaultVoucherType?: AccountVoucherType; focusedVoucherType?: AccountVoucherType | null; initialFormOpen?: boolean; session: AuthSession }) {
  const queryClient = useQueryClient()
  const [searchValue, setSearchValue] = useState("")
  const [formOpen, setFormOpen] = useState(initialFormOpen)
  const ledgersQuery = useQuery({ queryKey: ["account-ledgers-all", session.selectedTenant.slug], queryFn: () => listAllAccountLedgers(session) })
  const vouchersKey = ["account-vouchers", session.selectedTenant.slug]
  const vouchersQuery = useQuery({ queryKey: vouchersKey, queryFn: () => listAccountVouchers(session) })
  const saveMutation = useMutation({ mutationFn: (input: AccountVoucherInput) => upsertAccountVoucher(session, input) })
  const postMutation = useMutation({ mutationFn: (voucher: AccountVoucher) => postAccountVoucher(session, voucher) })
  const cancelMutation = useMutation({ mutationFn: (voucher: AccountVoucher) => cancelAccountVoucher(session, voucher) })
  const vouchers = useMemo(() => {
    const rows = focusedVoucherType ? (vouchersQuery.data ?? []).filter((voucher) => voucher.voucher_type === focusedVoucherType) : vouchersQuery.data ?? []
    return searchVouchers(rows, searchValue)
  }, [focusedVoucherType, searchValue, vouchersQuery.data])
  const pageTitle = focusedVoucherType ? `${voucherTypeLabel(focusedVoucherType)} Vouchers` : "Accounting Vouchers"
  const pageDescription = focusedVoucherType ? `${voucherTypeLabel(focusedVoucherType)} posting vouchers.` : "Manual opening, contra, and journal vouchers."
  const actionLabel = focusedVoucherType ? `New ${voucherTypeLabel(focusedVoucherType)}` : "New Voucher"

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
    setFormOpen(false)
    await refresh()
  }

  async function postVoucher(voucher: AccountVoucher) {
    const posted = await postMutation.mutateAsync(voucher)
    toast.success("Voucher posted", { description: posted.voucher_no })
    await refresh()
  }

  async function cancelVoucher(voucher: AccountVoucher) {
    const cancelled = await cancelMutation.mutateAsync(voucher)
    toast.error("Voucher cancelled", { description: cancelled.voucher_no })
    await refresh()
  }

  return (
    <MasterListPageFrame
      title={pageTitle}
      description={pageDescription}
      technicalName={`page.accounts.${focusedVoucherType ?? "vouchers"}`}
      action={<Button className="h-9 rounded-md" type="button" onClick={() => setFormOpen((value) => !value)}><Plus className="size-4" />{actionLabel}</Button>}
    >
      {formOpen ? <VoucherFormCard defaultVoucherType={defaultVoucherType} focusedVoucherType={focusedVoucherType} ledgers={ledgersQuery.data ?? []} isSaving={saveMutation.isPending} onCancel={() => setFormOpen(false)} onSubmit={saveVoucher} /> : null}
      <MasterListToolbarCard
        columns={[]}
        filterOptions={[]}
        filterValue="all"
        onFilterValueChange={() => undefined}
        onShowAllColumns={() => undefined}
        searchPlaceholder="Search vouchers"
        searchValue={searchValue}
        onSearchValueChange={setSearchValue}
      />
      <VoucherTable
        isLoading={vouchersQuery.isFetching}
        vouchers={vouchers}
        onCancel={(voucher) => void cancelVoucher(voucher)}
        onPost={(voucher) => void postVoucher(voucher)}
        isWorking={postMutation.isPending || cancelMutation.isPending}
      />
    </MasterListPageFrame>
  )
}

function VoucherFormCard({ defaultVoucherType, focusedVoucherType, isSaving, ledgers, onCancel, onSubmit }: { defaultVoucherType: AccountVoucherType; focusedVoucherType: AccountVoucherType | null; isSaving: boolean; ledgers: AccountLedger[]; onCancel: () => void; onSubmit: (input: AccountVoucherInput) => Promise<void> }) {
  const [form, setForm] = useState<VoucherForm>(() => ({
    voucher_type: focusedVoucherType ?? defaultVoucherType,
    voucher_date: new Date().toISOString().slice(0, 10),
    reference_no: "",
    narration: "",
    lines: [
      { ledger_id: undefined, debit_amount: "", credit_amount: "", line_narration: "", sort_order: 1 },
      { ledger_id: undefined, debit_amount: "", credit_amount: "", line_narration: "", sort_order: 2 },
    ],
  }))
  const totals = voucherLineTotals(form.lines)

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

  async function submit() {
    await onSubmit({
      ...form,
      lines: form.lines.map((line, index) => ({ ...line, sort_order: index + 1 })),
    })
  }

  return (
    <Card className="rounded-md">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">New {focusedVoucherType ? voucherTypeLabel(focusedVoucherType) : "Accounting"} Voucher</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-4">
          <Field label="Type">
            <Select disabled={Boolean(focusedVoucherType)} value={form.voucher_type ?? defaultVoucherType} onValueChange={(value) => setForm((current) => ({ ...current, voucher_type: value as AccountVoucherType }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="journal">Journal</SelectItem>
                <SelectItem value="contra">Contra</SelectItem>
                <SelectItem value="opening">Opening</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Date">
            <Input value={form.voucher_date ?? ""} type="date" onChange={(event) => setForm((current) => ({ ...current, voucher_date: event.target.value }))} />
          </Field>
          <Field label="Voucher No">
            <Input value={form.voucher_no ?? ""} placeholder="Auto" onChange={(event) => setForm((current) => ({ ...current, voucher_no: event.target.value }))} />
          </Field>
          <Field label="Reference">
            <Input value={form.reference_no ?? ""} onChange={(event) => setForm((current) => ({ ...current, reference_no: event.target.value }))} />
          </Field>
        </div>
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full min-w-[860px] border-collapse text-sm">
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
                  <td className="px-3 py-2">
                    <Select value={line.ledger_id ? String(line.ledger_id) : ""} onValueChange={(value) => updateLine(index, { ledger_id: Number(value) })}>
                      <SelectTrigger><SelectValue placeholder="Ledger" /></SelectTrigger>
                      <SelectContent>
                        {ledgers.map((ledger) => <SelectItem key={ledger.uuid} value={String(ledger.id)}>{ledger.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-3 py-2"><Input className="text-right" inputMode="decimal" value={String(line.debit_amount ?? "")} onChange={(event) => updateLine(index, { debit_amount: event.target.value, credit_amount: event.target.value ? "" : line.credit_amount })} /></td>
                  <td className="px-3 py-2"><Input className="text-right" inputMode="decimal" value={String(line.credit_amount ?? "")} onChange={(event) => updateLine(index, { credit_amount: event.target.value, debit_amount: event.target.value ? "" : line.debit_amount })} /></td>
                  <td className="px-3 py-2"><Input value={line.line_narration ?? ""} onChange={(event) => updateLine(index, { line_narration: event.target.value })} /></td>
                  <td className="px-3 py-2 text-right">
                    <Button disabled={form.lines.length <= 2} size="icon" type="button" variant="ghost" onClick={() => removeLine(index)}>
                      <Ban className="size-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-muted/30 font-medium">
                <td className="px-3 py-2">Total</td>
                <td className="px-3 py-2 text-right">{formatMoney(totals.debit)}</td>
                <td className="px-3 py-2 text-right">{formatMoney(totals.credit)}</td>
                <td className="px-3 py-2" colSpan={2}>{totals.debit === totals.credit && totals.debit > 0 ? "Balanced" : "Unbalanced"}</td>
              </tr>
            </tfoot>
          </table>
        </div>
        <Field label="Narration">
          <Textarea value={form.narration ?? ""} onChange={(event) => setForm((current) => ({ ...current, narration: event.target.value }))} />
        </Field>
        <div className="flex flex-wrap justify-between gap-2">
          <Button className="rounded-md" type="button" variant="outline" onClick={addLine}><Plus className="size-4" />Add Line</Button>
          <div className="flex gap-2">
            <Button className="rounded-md" type="button" variant="outline" onClick={onCancel}><RotateCcw className="size-4" />Cancel</Button>
            <Button className="rounded-md" disabled={isSaving} type="button" onClick={() => void submit()}><Save className="size-4" />Save</Button>
          </div>
        </div>
      </CardContent>
    </Card>
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

function VoucherTable({ isLoading, isWorking = false, onCancel, onPost, vouchers }: { isLoading: boolean; isWorking?: boolean; vouchers: AccountVoucher[]; onCancel?: (voucher: AccountVoucher) => void; onPost?: (voucher: AccountVoucher) => void }) {
  const [currentPage, setCurrentPage] = useState(1)
  const rowsPerPage = 100
  const totalPages = Math.max(1, Math.ceil(vouchers.length / rowsPerPage))
  const pageRows = vouchers.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage)
  return (
    <>
      <MasterListTableCard className="rounded-md">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] border-collapse text-sm">
            <thead className="bg-muted/55">
              <tr>
                <TableHead>Voucher</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Narration</TableHead>
                <TableHead className="text-right">Debit</TableHead>
                <TableHead className="text-right">Credit</TableHead>
                <TableHead>Status</TableHead>
                {(onPost || onCancel) ? <TableHead className="text-right">Action</TableHead> : null}
              </tr>
            </thead>
            <tbody>
              {pageRows.map((voucher) => {
                const totals = voucherLineTotals(voucher.lines)
                return (
                  <tr key={voucher.uuid} className="border-b border-border/60 last:border-b-0">
                    <td className="px-4 py-2.5 font-medium">{voucher.voucher_no}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{formatDate(voucher.voucher_date)}</td>
                    <td className="px-4 py-2.5 capitalize">{voucher.voucher_type.replace(/_/g, " ")}</td>
                    <td className="max-w-[320px] truncate px-4 py-2.5 text-muted-foreground">{voucher.narration || voucher.reference_no || "-"}</td>
                    <td className="px-4 py-2.5 text-right">{formatMoney(totals.debit)}</td>
                    <td className="px-4 py-2.5 text-right">{formatMoney(totals.credit)}</td>
                    <td className="px-4 py-2.5 capitalize">{voucher.status}</td>
                    {(onPost || onCancel) ? (
                      <td className="px-4 py-2 text-right">
                        <div className="flex justify-end gap-1">
                          {voucher.status === "draft" && onPost ? <Button disabled={isWorking} size="sm" type="button" variant="outline" onClick={() => onPost(voucher)}><Send className="size-4" />Post</Button> : null}
                          {voucher.status !== "cancelled" && onCancel ? <Button disabled={isWorking} size="sm" type="button" variant="ghost" onClick={() => onCancel(voucher)}><Ban className="size-4" />Cancel</Button> : null}
                        </div>
                      </td>
                    ) : null}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {pageRows.length === 0 ? <MasterListEmptyState>{isLoading ? "Loading vouchers." : "No vouchers found."}</MasterListEmptyState> : null}
      </MasterListTableCard>
      <MasterListPaginationCard
        page={currentPage}
        rowsPerPage={rowsPerPage}
        showingLabel={buildMasterListShowingLabel({ page: currentPage, pageSize: rowsPerPage, totalCount: vouchers.length })}
        singularLabel="voucher"
        totalCount={vouchers.length}
        totalPages={totalPages}
        onNextPage={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
        onPageChange={setCurrentPage}
        onPreviousPage={() => setCurrentPage((page) => Math.max(1, page - 1))}
        onRowsPerPageChange={() => undefined}
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
