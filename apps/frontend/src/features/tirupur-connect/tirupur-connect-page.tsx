import { useState, type ReactNode } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { BarChart3, Building2, ClipboardList, MessageSquare, PackageSearch, RefreshCw, Save, ShieldCheck, UsersRound } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "src/components/ui/badge"
import { Button } from "src/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "src/components/ui/card"
import { Input } from "src/components/ui/input"
import { Label } from "src/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "src/components/ui/select"
import { Textarea } from "src/components/ui/textarea"
import { MasterListEmptyState, MasterListPageFrame, MasterListTableCard } from "src/components/blocks/lists/master-list"
import type { AuthSession } from "src/features/auth/auth-client"
import { cn } from "src/lib/utils"
import {
  createTirupurConnectBuyer,
  createTirupurConnectProduct,
  createTirupurConnectRfq,
  createTirupurConnectSupplier,
  getTirupurConnectOverview,
  listTirupurConnectBuyers,
  listTirupurConnectProductPublications,
  listTirupurConnectProducts,
  listTirupurConnectRfqs,
  listTirupurConnectSupplierPublications,
  listTirupurConnectSuppliers,
  publishTirupurConnectProduct,
  publishTirupurConnectSupplier,
  reviewTirupurConnectProductPublication,
  reviewTirupurConnectSupplierPublication,
  saveTirupurConnectSettings,
  type TirupurConnectBuyerCompany,
  type TirupurConnectOverview,
  type TirupurConnectProduct,
  type TirupurConnectProductPublication,
  type TirupurConnectRfq,
  type TirupurConnectSettings,
  type TirupurConnectSupplierPublication,
  type TirupurConnectSupplierProfile,
} from "./tirupur-connect-client"

type TirupurConnectView = "overview" | "dashboard" | "profile" | "products" | "rfqs" | "leads" | "messages" | "membership" | "analytics" | "settings"

export function TirupurConnectPage({ page, session }: { page: string; session: AuthSession }) {
  const view = page.replace("app-tirupur-connect-", "") as TirupurConnectView
  const query = useQuery({ queryKey: ["tirupur-connect-overview", session.selectedTenant.slug], queryFn: () => getTirupurConnectOverview(session) })
  const overview = query.data ?? fallbackOverview

  if (view === "settings") return <TirupurConnectSettingsPanel overview={overview} refetch={() => void query.refetch()} session={session} />
  if (view === "profile") return <SupplierProfilesPage mode={overview.mode} session={session} />
  if (view === "products") return <ProductsPage mode={overview.mode} session={session} />
  if (view === "rfqs") return overview.mode === "marketplace" ? <RfqsPage session={session} /> : <CentralOnlyPage overview={overview} view={view} />
  if (view === "leads") return overview.mode === "marketplace" ? <BuyerCompaniesPage session={session} /> : <CentralOnlyPage overview={overview} view={view} />
  if (view === "messages" || view === "membership" || view === "analytics") return <CentralOnlyPage overview={overview} view={view} />

  return <TirupurConnectDashboard overview={overview} queryFetching={query.isFetching} onRefresh={() => void query.refetch()} />
}

function TirupurConnectDashboard({ onRefresh, overview, queryFetching }: { onRefresh(): void; overview: TirupurConnectOverview; queryFetching: boolean }) {
  return (
    <div className="@container/main flex flex-1 flex-col gap-5 px-4 py-4 md:py-6 lg:px-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{overview.settings.platformName}</h1>
            <Badge variant={overview.settings.status === "active" ? "default" : "secondary"}>{overview.settings.status}</Badge>
          </div>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">{overview.settings.positioning}</p>
        </div>
        <Button className="rounded-md" variant="outline" type="button" onClick={onRefresh}>
          <RefreshCw className={cn("size-4", queryFetching && "animate-spin")} />Refresh
        </Button>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Metric icon={Building2} label="Suppliers" value={overview.counts.suppliers} />
        <Metric icon={UsersRound} label="Buyers" value={overview.counts.buyers} />
        <Metric icon={PackageSearch} label="Products" value={overview.counts.products} />
        <Metric icon={ClipboardList} label="RFQs" value={overview.counts.rfqs} />
      </div>

      <Card className="rounded-md">
        <CardHeader>
          <CardTitle>Trade Desk Workflow</CardTitle>
          <p className="text-sm text-muted-foreground">{overview.settings.tagline}</p>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {workspaceItems.map((item) => {
            const Icon = item.icon
            return (
              <div className="rounded-md border border-border/70 bg-background p-4" key={item.title}>
                <div className="flex items-center gap-2">
                  <Icon className="size-4 text-muted-foreground" />
                  <h3 className="font-semibold">{item.title}</h3>
                </div>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.description}</p>
              </div>
            )
          })}
        </CardContent>
      </Card>
    </div>
  )
}

function SupplierProfilesPage({ mode, session }: { mode: TirupurConnectOverview["mode"]; session: AuthSession }) {
  if (mode === "marketplace") return <SupplierPublicationReviewPage session={session} />

  const queryClient = useQueryClient()
  const query = useQuery({ queryKey: ["tirupur-connect", session.selectedTenant.slug, "suppliers"], queryFn: () => listTirupurConnectSuppliers(session) })
  const mutation = useMutation({
    mutationFn: (input: Record<string, unknown>) => createTirupurConnectSupplier(session, input),
    onSuccess: async () => {
      toast.success("Supplier profile saved")
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["tirupur-connect", session.selectedTenant.slug, "suppliers"] }),
        queryClient.invalidateQueries({ queryKey: ["tirupur-connect-overview", session.selectedTenant.slug] }),
      ])
    },
    onError: showSaveError,
  })
  const publishMutation = useMutation({
    mutationFn: (uuid: string) => publishTirupurConnectSupplier(session, uuid),
    onSuccess: async () => {
      toast.success("Supplier sent to Tirupur Connect")
      await queryClient.invalidateQueries({ queryKey: ["tirupur-connect", session.selectedTenant.slug, "suppliers"] })
    },
    onError: showSaveError,
  })

  return (
    <MasterListPageFrame title="Supplier Profiles" description="Create trade-facing supplier profiles linked to existing contact master records." technicalName="page.tirupur-connect.suppliers">
      <SupplierForm isSaving={mutation.isPending} onSave={(input) => mutation.mutate(input)} />
      <SupplierTable
        isLoading={query.isFetching}
        mode={mode}
        onPublish={(uuid) => publishMutation.mutate(uuid)}
        publishPending={publishMutation.isPending}
        records={query.data ?? []}
      />
    </MasterListPageFrame>
  )
}

function SupplierPublicationReviewPage({ session }: { session: AuthSession }) {
  const queryClient = useQueryClient()
  const query = useQuery({ queryKey: ["tirupur-connect", session.selectedTenant.slug, "supplier-publications"], queryFn: () => listTirupurConnectSupplierPublications(session) })
  const mutation = useMutation({
    mutationFn: (input: { uuid: string; status: string }) => reviewTirupurConnectSupplierPublication(session, input),
    onSuccess: async () => {
      toast.success("Supplier review updated")
      await queryClient.invalidateQueries({ queryKey: ["tirupur-connect", session.selectedTenant.slug, "supplier-publications"] })
    },
    onError: showSaveError,
  })

  return (
    <MasterListPageFrame title="Supplier Review Queue" description="Approve or reject supplier profiles published by client workspaces." technicalName="page.tirupur-connect.supplier-publications">
      <SupplierPublicationTable
        isLoading={query.isFetching}
        isSaving={mutation.isPending}
        onReview={(uuid, status) => mutation.mutate({ uuid, status })}
        records={query.data ?? []}
      />
    </MasterListPageFrame>
  )
}

function BuyerCompaniesPage({ session }: { session: AuthSession }) {
  const queryClient = useQueryClient()
  const query = useQuery({ queryKey: ["tirupur-connect", session.selectedTenant.slug, "buyers"], queryFn: () => listTirupurConnectBuyers(session) })
  const mutation = useMutation({
    mutationFn: (input: Record<string, unknown>) => createTirupurConnectBuyer(session, input),
    onSuccess: async () => {
      toast.success("Buyer company saved")
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["tirupur-connect", session.selectedTenant.slug, "buyers"] }),
        queryClient.invalidateQueries({ queryKey: ["tirupur-connect-overview", session.selectedTenant.slug] }),
      ])
    },
    onError: showSaveError,
  })

  return (
    <MasterListPageFrame title="Buyer Companies" description="Maintain buyer-side companies for RFQs, trade leads, and messages." technicalName="page.tirupur-connect.buyers">
      <BuyerForm isSaving={mutation.isPending} onSave={(input) => mutation.mutate(input)} />
      <BuyerTable isLoading={query.isFetching} records={query.data ?? []} />
    </MasterListPageFrame>
  )
}

function ProductsPage({ mode, session }: { mode: TirupurConnectOverview["mode"]; session: AuthSession }) {
  if (mode === "marketplace") return <ProductPublicationReviewPage session={session} />

  const queryClient = useQueryClient()
  const query = useQuery({ queryKey: ["tirupur-connect", session.selectedTenant.slug, "products"], queryFn: () => listTirupurConnectProducts(session) })
  const mutation = useMutation({
    mutationFn: (input: Record<string, unknown>) => createTirupurConnectProduct(session, input),
    onSuccess: async () => {
      toast.success("Trade product saved")
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["tirupur-connect", session.selectedTenant.slug, "products"] }),
        queryClient.invalidateQueries({ queryKey: ["tirupur-connect-overview", session.selectedTenant.slug] }),
      ])
    },
    onError: showSaveError,
  })
  const publishMutation = useMutation({
    mutationFn: (uuid: string) => publishTirupurConnectProduct(session, uuid),
    onSuccess: async () => {
      toast.success("Product sent to Tirupur Connect")
      await queryClient.invalidateQueries({ queryKey: ["tirupur-connect", session.selectedTenant.slug, "products"] })
    },
    onError: showSaveError,
  })

  return (
    <MasterListPageFrame title="Products" description="Publish master products as buyer-ready Tirupur Connect catalog listings." technicalName="page.tirupur-connect.products">
      <ProductForm isSaving={mutation.isPending} onSave={(input) => mutation.mutate(input)} />
      <ProductTable
        isLoading={query.isFetching}
        mode={mode}
        onPublish={(uuid) => publishMutation.mutate(uuid)}
        publishPending={publishMutation.isPending}
        records={query.data ?? []}
      />
    </MasterListPageFrame>
  )
}

function ProductPublicationReviewPage({ session }: { session: AuthSession }) {
  const queryClient = useQueryClient()
  const query = useQuery({ queryKey: ["tirupur-connect", session.selectedTenant.slug, "product-publications"], queryFn: () => listTirupurConnectProductPublications(session) })
  const mutation = useMutation({
    mutationFn: (input: { uuid: string; status: string }) => reviewTirupurConnectProductPublication(session, input),
    onSuccess: async () => {
      toast.success("Product review updated")
      await queryClient.invalidateQueries({ queryKey: ["tirupur-connect", session.selectedTenant.slug, "product-publications"] })
    },
    onError: showSaveError,
  })

  return (
    <MasterListPageFrame title="Product Review Queue" description="Approve or reject product listings published by client workspaces." technicalName="page.tirupur-connect.product-publications">
      <ProductPublicationTable
        isLoading={query.isFetching}
        isSaving={mutation.isPending}
        onReview={(uuid, status) => mutation.mutate({ uuid, status })}
        records={query.data ?? []}
      />
    </MasterListPageFrame>
  )
}

function RfqsPage({ session }: { session: AuthSession }) {
  const queryClient = useQueryClient()
  const query = useQuery({ queryKey: ["tirupur-connect", session.selectedTenant.slug, "rfqs"], queryFn: () => listTirupurConnectRfqs(session) })
  const mutation = useMutation({
    mutationFn: (input: Record<string, unknown>) => createTirupurConnectRfq(session, input),
    onSuccess: async () => {
      toast.success("RFQ saved")
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["tirupur-connect", session.selectedTenant.slug, "rfqs"] }),
        queryClient.invalidateQueries({ queryKey: ["tirupur-connect-overview", session.selectedTenant.slug] }),
      ])
    },
    onError: showSaveError,
  })

  return (
    <MasterListPageFrame title="RFQs" description="Capture buyer requirements with quantities, budgets, and delivery deadlines." technicalName="page.tirupur-connect.rfqs">
      <RfqForm isSaving={mutation.isPending} onSave={(input) => mutation.mutate(input)} />
      <RfqTable isLoading={query.isFetching} records={query.data ?? []} />
    </MasterListPageFrame>
  )
}

function SupplierForm({ isSaving, onSave }: { isSaving: boolean; onSave(input: Record<string, unknown>): void }) {
  const [draft, setDraft] = useState({ contactId: "", brandName: "", businessType: "", monthlyCapacity: "", minOrderQty: "", about: "", factoryAddress: "", status: "draft" })
  return (
    <FormCard title="New Supplier Profile" onSubmit={() => onSave(draft)} isSaving={isSaving}>
      <Field label="Contact ID *" type="number" value={draft.contactId} onChange={(contactId) => setDraft({ ...draft, contactId })} />
      <Field label="Brand name" value={draft.brandName} onChange={(brandName) => setDraft({ ...draft, brandName })} />
      <Field label="Business type" value={draft.businessType} onChange={(businessType) => setDraft({ ...draft, businessType })} />
      <Field label="Monthly capacity" value={draft.monthlyCapacity} onChange={(monthlyCapacity) => setDraft({ ...draft, monthlyCapacity })} />
      <Field label="Minimum order qty" type="number" value={draft.minOrderQty} onChange={(minOrderQty) => setDraft({ ...draft, minOrderQty })} />
      <StatusSelect value={draft.status} onChange={(status) => setDraft({ ...draft, status })} options={["draft", "active", "paused"]} />
      <TextField className="md:col-span-2" label="About" value={draft.about} onChange={(about) => setDraft({ ...draft, about })} />
      <TextField className="md:col-span-2" label="Factory address" value={draft.factoryAddress} onChange={(factoryAddress) => setDraft({ ...draft, factoryAddress })} />
    </FormCard>
  )
}

function BuyerForm({ isSaving, onSave }: { isSaving: boolean; onSave(input: Record<string, unknown>): void }) {
  const [draft, setDraft] = useState({ contactId: "", buyerType: "", annualVolume: "", description: "", status: "draft" })
  return (
    <FormCard title="New Buyer Company" onSubmit={() => onSave(draft)} isSaving={isSaving}>
      <Field label="Contact ID *" type="number" value={draft.contactId} onChange={(contactId) => setDraft({ ...draft, contactId })} />
      <Field label="Buyer type" value={draft.buyerType} onChange={(buyerType) => setDraft({ ...draft, buyerType })} />
      <Field label="Annual volume" value={draft.annualVolume} onChange={(annualVolume) => setDraft({ ...draft, annualVolume })} />
      <StatusSelect value={draft.status} onChange={(status) => setDraft({ ...draft, status })} options={["draft", "active", "paused"]} />
      <TextField className="md:col-span-2" label="Description" value={draft.description} onChange={(description) => setDraft({ ...draft, description })} />
    </FormCard>
  )
}

function ProductForm({ isSaving, onSave }: { isSaving: boolean; onSave(input: Record<string, unknown>): void }) {
  const [draft, setDraft] = useState({ productId: "", supplierProfileId: "", slug: "", moq: "", leadTime: "", description: "", fabricDetails: "", certificationDetails: "", status: "draft" })
  return (
    <FormCard title="New Trade Product" onSubmit={() => onSave(draft)} isSaving={isSaving}>
      <Field label="Product ID *" type="number" value={draft.productId} onChange={(productId) => setDraft({ ...draft, productId })} />
      <Field label="Supplier Profile ID *" type="number" value={draft.supplierProfileId} onChange={(supplierProfileId) => setDraft({ ...draft, supplierProfileId })} />
      <Field label="Slug *" value={draft.slug} onChange={(slug) => setDraft({ ...draft, slug: slug.toLowerCase().replace(/\s+/g, "-") })} />
      <Field label="MOQ" type="number" value={draft.moq} onChange={(moq) => setDraft({ ...draft, moq })} />
      <Field label="Lead time" value={draft.leadTime} onChange={(leadTime) => setDraft({ ...draft, leadTime })} />
      <StatusSelect value={draft.status} onChange={(status) => setDraft({ ...draft, status })} options={["draft", "active", "paused"]} />
      <TextField className="md:col-span-2" label="Description" value={draft.description} onChange={(description) => setDraft({ ...draft, description })} />
      <TextField label="Fabric details" value={draft.fabricDetails} onChange={(fabricDetails) => setDraft({ ...draft, fabricDetails })} />
      <TextField label="Certification details" value={draft.certificationDetails} onChange={(certificationDetails) => setDraft({ ...draft, certificationDetails })} />
    </FormCard>
  )
}

function RfqForm({ isSaving, onSave }: { isSaving: boolean; onSave(input: Record<string, unknown>): void }) {
  const [draft, setDraft] = useState({ buyerCompanyId: "", title: "", quantity: "", deliveryDeadline: "", budgetMin: "", budgetMax: "", description: "", status: "open" })
  return (
    <FormCard title="New RFQ" onSubmit={() => onSave(draft)} isSaving={isSaving}>
      <Field label="Buyer Company ID *" type="number" value={draft.buyerCompanyId} onChange={(buyerCompanyId) => setDraft({ ...draft, buyerCompanyId })} />
      <Field label="Title *" value={draft.title} onChange={(title) => setDraft({ ...draft, title })} />
      <Field label="Quantity" type="number" value={draft.quantity} onChange={(quantity) => setDraft({ ...draft, quantity })} />
      <Field label="Delivery deadline" type="date" value={draft.deliveryDeadline} onChange={(deliveryDeadline) => setDraft({ ...draft, deliveryDeadline })} />
      <Field label="Budget min" type="number" value={draft.budgetMin} onChange={(budgetMin) => setDraft({ ...draft, budgetMin })} />
      <Field label="Budget max" type="number" value={draft.budgetMax} onChange={(budgetMax) => setDraft({ ...draft, budgetMax })} />
      <StatusSelect value={draft.status} onChange={(status) => setDraft({ ...draft, status })} options={["open", "quoted", "closed"]} />
      <TextField className="md:col-span-2" label="Description" value={draft.description} onChange={(description) => setDraft({ ...draft, description })} />
    </FormCard>
  )
}

function SupplierTable({
  isLoading,
  mode,
  onPublish,
  publishPending,
  records,
}: {
  isLoading: boolean
  mode: TirupurConnectOverview["mode"]
  onPublish(uuid: string): void
  publishPending: boolean
  records: TirupurConnectSupplierProfile[]
}) {
  const headers = mode === "client"
    ? ["ID", "Brand", "Contact", "Type", "Capacity", "Publish", "Action"]
    : ["ID", "Brand", "Contact", "Type", "Capacity", "Status"]
  return <RecordsTable empty={isLoading ? "Loading supplier profiles." : "No supplier profiles yet."} headers={headers} rows={records.map((record) => mode === "client"
    ? [record.id, record.brandName || "-", record.contactId, record.businessType || "-", record.monthlyCapacity || "-", <StatusBadge key="publish" status={record.publicationStatus} />, <Button className="h-8 rounded-md" disabled={publishPending} key="action" size="sm" type="button" onClick={() => onPublish(record.uuid)}>Publish</Button>]
    : [record.id, record.brandName || "-", record.contactId, record.businessType || "-", record.monthlyCapacity || "-", <StatusBadge key="status" status={record.status} />])} />
}

function SupplierPublicationTable({
  isLoading,
  isSaving,
  onReview,
  records,
}: {
  isLoading: boolean
  isSaving: boolean
  onReview(uuid: string, status: string): void
  records: TirupurConnectSupplierPublication[]
}) {
  return (
    <RecordsTable
      empty={isLoading ? "Loading supplier publications." : "No supplier publications waiting for review."}
      headers={["ID", "Source", "Brand", "Type", "Capacity", "Status", "Action"]}
      rows={records.map((record) => [
        record.id,
        record.sourceTenantSlug,
        record.brandName || "-",
        record.businessType || "-",
        record.monthlyCapacity || "-",
        <StatusBadge key="status" status={record.publicationStatus} />,
        <ReviewActions disabled={isSaving} key="action" onReview={(status) => onReview(record.uuid, status)} />,
      ])}
    />
  )
}

function BuyerTable({ isLoading, records }: { isLoading: boolean; records: TirupurConnectBuyerCompany[] }) {
  return <RecordsTable empty={isLoading ? "Loading buyer companies." : "No buyer companies yet."} headers={["ID", "Contact", "Type", "Volume", "Status"]} rows={records.map((record) => [record.id, record.contactId, record.buyerType || "-", record.annualVolume || "-", <StatusBadge key="status" status={record.status} />])} />
}

function ProductTable({
  isLoading,
  mode,
  onPublish,
  publishPending,
  records,
}: {
  isLoading: boolean
  mode: TirupurConnectOverview["mode"]
  onPublish(uuid: string): void
  publishPending: boolean
  records: TirupurConnectProduct[]
}) {
  const headers = mode === "client"
    ? ["ID", "Slug", "Product", "Supplier", "Publish", "Action"]
    : ["ID", "Slug", "Product", "Supplier", "MOQ", "Lead time", "Status"]
  return <RecordsTable empty={isLoading ? "Loading products." : "No trade products yet."} headers={headers} rows={records.map((record) => mode === "client"
    ? [record.id, record.slug, record.productId, record.supplierProfileId, <StatusBadge key="publish" status={record.publicationStatus} />, <Button className="h-8 rounded-md" disabled={publishPending} key="action" size="sm" type="button" onClick={() => onPublish(record.uuid)}>Publish</Button>]
    : [record.id, record.slug, record.productId, record.supplierProfileId, record.moq ?? "-", record.leadTime || "-", <StatusBadge key="status" status={record.status} />])} />
}

function ProductPublicationTable({
  isLoading,
  isSaving,
  onReview,
  records,
}: {
  isLoading: boolean
  isSaving: boolean
  onReview(uuid: string, status: string): void
  records: TirupurConnectProductPublication[]
}) {
  return (
    <RecordsTable
      empty={isLoading ? "Loading product publications." : "No product publications waiting for review."}
      headers={["ID", "Source", "Slug", "Supplier", "MOQ", "Status", "Action"]}
      rows={records.map((record) => [
        record.id,
        record.sourceTenantSlug,
        record.slug,
        record.sourceSupplierUuid || "-",
        record.moq ?? "-",
        <StatusBadge key="status" status={record.publicationStatus} />,
        <ReviewActions disabled={isSaving} key="action" onReview={(status) => onReview(record.uuid, status)} />,
      ])}
    />
  )
}

function RfqTable({ isLoading, records }: { isLoading: boolean; records: TirupurConnectRfq[] }) {
  return <RecordsTable empty={isLoading ? "Loading RFQs." : "No RFQs yet."} headers={["ID", "Title", "Buyer", "Qty", "Deadline", "Budget", "Status"]} rows={records.map((record) => [record.id, record.title, record.buyerCompanyId, record.quantity, record.deliveryDeadline || "-", [record.budgetMin, record.budgetMax].filter((value) => value !== null).join(" - ") || "-", <StatusBadge key="status" status={record.status} />])} />
}

function ReviewActions({ disabled, onReview }: { disabled: boolean; onReview(status: string): void }) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button className="h-8 rounded-md" disabled={disabled} size="sm" type="button" onClick={() => onReview("approved")}>Approve</Button>
      <Button className="h-8 rounded-md" disabled={disabled} size="sm" type="button" variant="outline" onClick={() => onReview("rejected")}>Reject</Button>
    </div>
  )
}

function RecordsTable({ empty, headers, rows }: { empty: string; headers: string[]; rows: Array<Array<ReactNode>> }) {
  return (
    <MasterListTableCard>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] border-collapse text-sm">
          <thead className="bg-muted/50">
            <tr>{headers.map((header) => <th className="px-4 py-2 text-left font-semibold" key={header}>{header}</th>)}</tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr className="border-b border-border/70" key={index}>
                {row.map((cell, cellIndex) => <td className="px-4 py-2" key={cellIndex}>{cell}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!rows.length ? <MasterListEmptyState>{empty}</MasterListEmptyState> : null}
    </MasterListTableCard>
  )
}

function FormCard({ children, isSaving, onSubmit, title }: { children: ReactNode; isSaving: boolean; onSubmit(): void; title: string }) {
  return (
    <Card className="rounded-md border-border/70">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="grid gap-3 md:grid-cols-2 xl:grid-cols-3" onSubmit={(event) => { event.preventDefault(); onSubmit() }}>
          {children}
          <div className="flex items-end">
            <Button className="h-10 rounded-md" disabled={isSaving} type="submit">
              <Save className={cn("size-4", isSaving && "animate-spin")} />Save
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

function Field({ label, onChange, type = "text", value }: { label: string; onChange(value: string): void; type?: "date" | "number" | "text"; value: string }) {
  return <label className="grid gap-2"><span className="text-sm font-medium">{label}</span><Input type={type} value={value} onChange={(event) => onChange(event.target.value)} /></label>
}

function TextField({ className, label, onChange, value }: { className?: string; label: string; onChange(value: string): void; value: string }) {
  return <label className={cn("grid gap-2", className)}><span className="text-sm font-medium">{label}</span><Textarea value={value} onChange={(event) => onChange(event.target.value)} /></label>
}

function StatusSelect({ onChange, options, value }: { onChange(value: string): void; options: string[]; value: string }) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-medium">Status</span>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger><SelectValue /></SelectTrigger>
        <SelectContent>{options.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent>
      </Select>
    </label>
  )
}

function TirupurConnectSettingsPanel({ overview, refetch, session }: { overview: TirupurConnectOverview; refetch(): void; session: AuthSession }) {
  const [draft, setDraft] = useState<TirupurConnectSettings>(overview.settings)
  const mutation = useMutation({ mutationFn: (input: Partial<TirupurConnectSettings>) => saveTirupurConnectSettings(session, input) })

  async function save() {
    await mutation.mutateAsync(draft)
    toast.success("Tirupur Connect settings saved")
    refetch()
  }

  return (
    <div className="@container/main flex flex-1 flex-col gap-5 px-4 py-4 md:py-6 lg:px-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Tirupur Connect Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">Control the tenant-facing trade platform name, position, and operating status.</p>
      </div>
      <Card className="rounded-md">
        <CardHeader><CardTitle>Platform Identity</CardTitle></CardHeader>
        <CardContent className="grid gap-4">
          <SettingField label="Platform name"><Input value={draft.platformName} onChange={(event) => setDraft({ ...draft, platformName: event.target.value })} /></SettingField>
          <SettingField label="Tagline"><Input value={draft.tagline} onChange={(event) => setDraft({ ...draft, tagline: event.target.value })} /></SettingField>
          <SettingField label="Positioning"><Textarea value={draft.positioning} onChange={(event) => setDraft({ ...draft, positioning: event.target.value })} /></SettingField>
          <SettingField label="Status">
            <Select value={draft.status} onValueChange={(status: TirupurConnectSettings["status"]) => setDraft({ ...draft, status })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="paused">Paused</SelectItem>
              </SelectContent>
            </Select>
          </SettingField>
          <Button className="w-fit rounded-md" disabled={mutation.isPending} type="button" onClick={() => void save()}>
            <Save className="size-4" />Save
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

function SettingField({ children, label }: { children: ReactNode; label: string }) {
  return <div className="grid gap-2"><Label>{label}</Label>{children}</div>
}

function CentralOnlyPage({ overview, view }: { overview: TirupurConnectOverview; view: TirupurConnectView }) {
  return (
    <div className="@container/main flex flex-1 flex-col gap-5 px-4 py-4 md:py-6 lg:px-6">
      <Card className="rounded-md border-border/70">
        <CardHeader>
          <CardTitle>{viewTitle(view)}</CardTitle>
          <p className="text-sm text-muted-foreground">
            This desk is owned by the central Tirupur Connect marketplace tenant. Client workspaces publish supplier and product profiles by API; RFQs, leads, messages, membership, and analytics are reviewed and managed by the Tirupur Connect team.
          </p>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          <Metric icon={MessageSquare} label="Messages" value={overview.counts.messages} />
          <Metric icon={ShieldCheck} label="Suppliers" value={overview.counts.suppliers} />
          <Metric icon={BarChart3} label="Products" value={overview.counts.products} />
        </CardContent>
      </Card>
    </div>
  )
}

function Metric({ icon: Icon, label, value }: { icon: typeof Building2; label: string; value: number }) {
  return <Card className="rounded-md"><CardContent className="flex items-center gap-3 p-4"><Icon className="size-5 text-muted-foreground" /><div><div className="text-xs text-muted-foreground">{label}</div><div className="text-xl font-semibold">{value}</div></div></CardContent></Card>
}

function StatusBadge({ status }: { status: string }) {
  return <Badge variant={status === "active" || status === "open" ? "default" : "secondary"}>{status}</Badge>
}

function viewTitle(view: TirupurConnectView) {
  if (view === "overview" || view === "dashboard") return "Trade Dashboard"
  return view.split("-").map((part) => part[0]?.toUpperCase() + part.slice(1)).join(" ")
}

function showSaveError(error: unknown) {
  toast.error("Tirupur Connect save failed", { description: error instanceof Error ? error.message : "Please check the required fields." })
}

const workspaceItems = [
  { title: "Supplier Profile", description: "Extend contact masters with capacity, factory, verification, and listing details.", icon: Building2 },
  { title: "Buyer Companies", description: "Maintain buyer contacts for RFQs, trade leads, and supplier conversations.", icon: UsersRound },
  { title: "Product Directory", description: "Expose product masters as trade catalog listings with MOQ and fabric details.", icon: PackageSearch },
  { title: "RFQ Desk", description: "Collect buyer requirements, quantities, budgets, and supplier response opportunities.", icon: ClipboardList },
  { title: "Membership", description: "Track plans, priority listing, verification status, and paid supplier visibility.", icon: ShieldCheck },
  { title: "Messaging", description: "Keep buyer-supplier conversations and unread activity inside the workspace.", icon: MessageSquare },
] as const

const fallbackOverview: TirupurConnectOverview = {
  settings: {
    platformName: "Tirupur Connect",
    tagline: "Connecting Global Buyers with Trusted Tirupur Manufacturers",
    positioning: "The Official Digital Trade Platform of Tirupur Garment Industry",
    status: "active",
  },
  mode: "client",
  counts: { suppliers: 0, buyers: 0, products: 0, rfqs: 0, events: 0, news: 0, messages: 0 },
}
