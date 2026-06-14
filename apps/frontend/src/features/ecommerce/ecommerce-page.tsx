import { useMemo, useState, type ReactNode } from "react"
import { useMutation, useQuery } from "@tanstack/react-query"
import { ArrowLeft, BarChart3, CreditCard, Heart, PackageSearch, Pencil, Plus, RefreshCw, Save, Settings, ShoppingBag, Truck, UserRound, UsersRound, X } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "src/components/ui/badge"
import { Button } from "src/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "src/components/ui/card"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "src/components/ui/dialog"
import { Input } from "src/components/ui/input"
import { Label } from "src/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "src/components/ui/select"
import { Switch } from "src/components/ui/switch"
import { Textarea } from "src/components/ui/textarea"
import {
  MasterListEmptyState,
  MasterListPageFrame,
  MasterListPaginationCard,
  MasterListRowActions,
  MasterListShowCard,
  MasterListShowLayout,
  MasterListTableCard,
  MasterListToolbarCard,
  MasterListUpsertCard,
  MasterListUpsertLayout,
  buildMasterListShowingLabel,
} from "src/components/blocks/lists/master-list"
import type { AuthSession } from "src/features/auth/auth-client"
import type { MasterDataRecord } from "src/features/master-data/domain/master-data"
import { listMasterDataRecords } from "src/features/master-data/infrastructure/master-data-client"
import { cn } from "src/lib/utils"
import {
  emptyCustomerProfile,
  emptyProductPublication,
  getEcommerceWorkspace,
  saveEcommerceSettings,
  upsertEcommerceCustomer,
  upsertEcommerceProduct,
  type EcommerceCustomerProfile,
  type EcommerceProductPublication,
  type EcommerceSettings,
  type EcommerceView,
  type EcommerceWorkspace,
} from "./ecommerce-client"

type ProductPublicationView = { mode: "list" } | { mode: "show"; product: EcommerceProductPublication } | { mode: "upsert"; product: Partial<EcommerceProductPublication> | null }
type CustomerProfileView = { mode: "list" } | { mode: "show"; customer: EcommerceCustomerProfile } | { mode: "upsert"; customer: Partial<EcommerceCustomerProfile> | null }
type ProductPublicationColumnId = "product" | "category" | "status" | "price" | "stock" | "updated"
type CustomerProfileColumnId = "customer" | "portal" | "contact" | "orders" | "spend" | "updated"

const productStatusFilters = [
  { id: "all", label: "All products" },
  { id: "published", label: "published" },
  { id: "draft", label: "draft" },
  { id: "hidden", label: "hidden" },
]
const customerStatusFilters = [
  { id: "all", label: "All customers" },
  { id: "active", label: "active" },
  { id: "invited", label: "invited" },
  { id: "blocked", label: "blocked" },
]
const productColumnCatalog: Array<{ id: ProductPublicationColumnId; label: string }> = [
  { id: "product", label: "Product" },
  { id: "category", label: "Category" },
  { id: "status", label: "Status" },
  { id: "price", label: "Price" },
  { id: "stock", label: "Stock" },
  { id: "updated", label: "Updated" },
]
const customerColumnCatalog: Array<{ id: CustomerProfileColumnId; label: string }> = [
  { id: "customer", label: "Customer" },
  { id: "portal", label: "Portal" },
  { id: "contact", label: "Contact" },
  { id: "orders", label: "Orders" },
  { id: "spend", label: "Spend" },
  { id: "updated", label: "Updated" },
]
const defaultProductColumns: Record<ProductPublicationColumnId, boolean> = {
  category: true,
  price: true,
  product: true,
  status: true,
  stock: true,
  updated: true,
}
const defaultCustomerColumns: Record<CustomerProfileColumnId, boolean> = {
  contact: true,
  customer: true,
  orders: true,
  portal: true,
  spend: true,
  updated: true,
}

export function EcommercePage({ session, view = "dashboard" }: { session: AuthSession; view?: EcommerceView }) {
  const [productView, setProductView] = useState<ProductPublicationView>({ mode: "list" })
  const [customerView, setCustomerView] = useState<CustomerProfileView>({ mode: "list" })
  const [settingsDialog, setSettingsDialog] = useState<Partial<EcommerceSettings> | null>(null)
  const workspaceQuery = useQuery({ queryKey: ["ecommerce-workspace", session.selectedTenant.slug], queryFn: () => getEcommerceWorkspace(session) })
  const productsQuery = useQuery({ queryKey: ["ecommerce-products-source", session.selectedTenant.slug], queryFn: () => listMasterDataRecords(session, "products") })
  const contactsQuery = useQuery({ queryKey: ["ecommerce-contacts-source", session.selectedTenant.slug], queryFn: () => listMasterDataRecords(session, "contacts") })
  const categoriesQuery = useQuery({ queryKey: ["ecommerce-categories-source", session.selectedTenant.slug], queryFn: () => listMasterDataRecords(session, "productCategories") })
  const workspace = workspaceQuery.data ?? emptyWorkspace()

  const settingsMutation = useMutation({ mutationFn: (input: Partial<EcommerceSettings>) => saveEcommerceSettings(session, input) })
  const productMutation = useMutation({ mutationFn: (input: Partial<EcommerceProductPublication>) => upsertEcommerceProduct(session, input) })
  const customerMutation = useMutation({ mutationFn: (input: Partial<EcommerceCustomerProfile>) => upsertEcommerceCustomer(session, input) })
  const isWorking = settingsMutation.isPending || productMutation.isPending || customerMutation.isPending

  async function apply(next: Promise<EcommerceWorkspace>, message: string) {
    const workspace = await next
    toast.success(message)
    await workspaceQuery.refetch()
    return workspace
  }

  const sourceProducts = productsQuery.data ?? []
  const sourceContacts = contactsQuery.data ?? []
  const sourceCategories = categoriesQuery.data ?? []

  async function saveProductPublication(input: Partial<EcommerceProductPublication>) {
    const nextWorkspace = await apply(productMutation.mutateAsync(input), input.uuid ? "Product publication updated" : "Product publication created")
    const saved = findSavedProduct(nextWorkspace.products, input)
    setProductView(saved ? { mode: "show", product: saved } : { mode: "list" })
  }

  async function saveCustomerProfile(input: Partial<EcommerceCustomerProfile>) {
    const nextWorkspace = await apply(customerMutation.mutateAsync(input), input.uuid ? "Customer profile updated" : "Customer profile created")
    const saved = findSavedCustomer(nextWorkspace.customers, input)
    setCustomerView(saved ? { mode: "show", customer: saved } : { mode: "list" })
  }

  if (view === "products" && productView.mode === "upsert") {
    return <ProductPublicationUpsertPage categories={sourceCategories} disabled={isWorking} draft={productView.product ?? emptyProductPublication()} products={sourceProducts} onBack={() => setProductView(productView.product?.uuid ? { mode: "show", product: productView.product as EcommerceProductPublication } : { mode: "list" })} onSave={saveProductPublication} />
  }

  if (view === "products" && productView.mode === "show") {
    const product = workspace.products.find((item) => item.uuid === productView.product.uuid) ?? productView.product
    return <ProductPublicationShowPage product={product} onBack={() => setProductView({ mode: "list" })} onEdit={() => setProductView({ mode: "upsert", product })} />
  }

  if (view === "customers" && customerView.mode === "upsert") {
    return <CustomerProfileUpsertPage contacts={sourceContacts} disabled={isWorking} draft={customerView.customer ?? emptyCustomerProfile()} onBack={() => setCustomerView(customerView.customer?.uuid ? { mode: "show", customer: customerView.customer as EcommerceCustomerProfile } : { mode: "list" })} onSave={saveCustomerProfile} />
  }

  if (view === "customers" && customerView.mode === "show") {
    const customer = workspace.customers.find((item) => item.uuid === customerView.customer.uuid) ?? customerView.customer
    return <CustomerProfileShowPage customer={customer} onBack={() => setCustomerView({ mode: "list" })} onEdit={() => setCustomerView({ mode: "upsert", customer })} />
  }

  const action = (
    <div className="flex flex-wrap gap-2">
      <Button className="rounded-md" variant="outline" type="button" onClick={() => void workspaceQuery.refetch()}><RefreshCw className={cn("size-4", workspaceQuery.isFetching && "animate-spin")} />Refresh</Button>
      {view === "products" ? <Button className="rounded-md" type="button" onClick={() => setProductView({ mode: "upsert", product: null })}><Plus className="size-4" />Publish Product</Button> : null}
      {view === "customers" || view === "customer-portal" ? <Button className="rounded-md" type="button" onClick={() => setCustomerView({ mode: "upsert", customer: null })}><Plus className="size-4" />Connect Customer</Button> : null}
      {view === "settings" ? <Button className="rounded-md" type="button" onClick={() => setSettingsDialog(workspace.settings)}><Settings className="size-4" />Edit Settings</Button> : null}
    </div>
  )

  return (
    <MasterListPageFrame title={viewTitle(view)} description={viewDescription(view)} technicalName={`page.ecommerce.${view}`} action={action}>
      <StatsGrid workspace={workspace} />
      {view === "dashboard" ? <DashboardPanel workspace={workspace} /> : null}
      {view === "products" ? <ProductsTable products={workspace.products} isLoading={workspaceQuery.isFetching} onEdit={(product) => setProductView({ mode: "upsert", product })} onView={(product) => setProductView({ mode: "show", product })} /> : null}
      {view === "customers" ? <CustomersTable customers={workspace.customers} isLoading={workspaceQuery.isFetching} onEdit={(customer) => setCustomerView({ mode: "upsert", customer })} onView={(customer) => setCustomerView({ mode: "show", customer })} /> : null}
      {view === "orders" ? <OrdersTable orders={workspace.orders} isLoading={workspaceQuery.isFetching} /> : null}
      {view === "customer-dashboard" ? <CustomerDashboard customers={workspace.customers} orders={workspace.orders} /> : null}
      {view === "customer-portal" ? <PortalAccounts workspace={workspace} /> : null}
      {view === "settings" ? <SettingsPanel settings={workspace.settings} onEdit={() => setSettingsDialog(workspace.settings)} /> : null}
      {genericViews.includes(view) ? <GenericEcommerceView view={view} workspace={workspace} /> : null}

      {settingsDialog ? (
        <SettingsDialog
          disabled={isWorking}
          draft={settingsDialog}
          onClose={() => setSettingsDialog(null)}
          onSave={(input) => apply(settingsMutation.mutateAsync(input), "Store settings updated").then(() => setSettingsDialog(null))}
        />
      ) : null}
    </MasterListPageFrame>
  )
}

const genericViews: EcommerceView[] = ["carts", "checkout", "categories", "collections", "variants", "wishlists", "reviews", "shipping", "delivery-zones", "returns", "coupons", "campaigns", "seo", "sales-report", "product-report", "customer-report", "payment-gateway", "tax-settings"]

function StatsGrid({ workspace }: { workspace: EcommerceWorkspace }) {
  const stats = [
    { label: "Published", value: workspace.dashboard.publishedProducts, icon: PackageSearch },
    { label: "Customers", value: workspace.customers.length, icon: UsersRound },
    { label: "Open orders", value: workspace.dashboard.openOrders, icon: ShoppingBag },
    { label: "Revenue", value: currency(workspace.dashboard.revenue), icon: BarChart3 },
  ]
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {stats.map((item) => (
        <Card className="rounded-md" key={item.label}>
          <CardContent className="flex items-center gap-3 p-4">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary"><item.icon className="size-5" /></span>
            <div><div className="text-xl font-semibold">{item.value}</div><div className="text-xs text-muted-foreground">{item.label}</div></div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function DashboardPanel({ workspace }: { workspace: EcommerceWorkspace }) {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="rounded-md lg:col-span-2">
        <CardHeader><CardTitle className="text-base">Store readiness</CardTitle></CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-3">
          <Readiness label="Store settings" ready={Boolean(workspace.settings.store_name)} />
          <Readiness label="Product publications" ready={workspace.products.length > 0} />
          <Readiness label="Customer portal" ready={workspace.portalAccounts.length > 0} />
        </CardContent>
      </Card>
      <Card className="rounded-md">
        <CardHeader><CardTitle className="text-base">Master links</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          <Row label="Product masters" value={workspace.source.productCount} />
          <Row label="Contact masters" value={workspace.source.contactCount} />
          <Row label="Categories" value={workspace.source.categoryCount} />
        </CardContent>
      </Card>
    </div>
  )
}

function ProductsTable({ isLoading, onEdit, onView, products }: { isLoading: boolean; onEdit(product: EcommerceProductPublication): void; onView(product: EcommerceProductPublication): void; products: EcommerceProductPublication[] }) {
  const [searchValue, setSearchValue] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [visibleColumns, setVisibleColumns] = useState(defaultProductColumns)
  const [currentPage, setCurrentPage] = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState(100)
  const filteredProducts = useMemo(() => filterProducts(searchProducts(products, searchValue), statusFilter), [products, searchValue, statusFilter])
  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / rowsPerPage))
  const pageProducts = filteredProducts.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage)

  return (
    <>
      <MasterListToolbarCard
        columns={productColumnCatalog.map((column) => ({ id: column.id, label: column.label, checked: visibleColumns[column.id], disabled: column.id === "product", onCheckedChange: (checked) => setVisibleColumns((current) => ({ ...current, [column.id]: checked })) }))}
        filterOptions={productStatusFilters}
        filterValue={statusFilter}
        onFilterValueChange={(value) => { setStatusFilter(value); setCurrentPage(1) }}
        onShowAllColumns={() => setVisibleColumns(defaultProductColumns)}
        searchPlaceholder="Search product, code, slug, category, status, stock"
        searchValue={searchValue}
        onSearchValueChange={(value) => { setSearchValue(value); setCurrentPage(1) }}
      />
      <TableShell empty={isLoading ? "Loading product publications." : "No ecommerce products found."}>
        {pageProducts.length ? (
          <table className="w-full min-w-[920px] border-collapse text-sm">
            <thead className="bg-muted/50"><tr><Header>#</Header>{visibleColumns.product ? <Header>Product</Header> : null}{visibleColumns.category ? <Header>Category</Header> : null}{visibleColumns.status ? <Header>Status</Header> : null}{visibleColumns.price ? <Header>Price</Header> : null}{visibleColumns.stock ? <Header>Stock</Header> : null}{visibleColumns.updated ? <Header>Updated</Header> : null}<Header className="text-right">Action</Header></tr></thead>
            <tbody>{pageProducts.map((product, index) => (
              <tr className="border-b border-border/70 last:border-b-0" key={product.uuid}>
                <Cell className="text-muted-foreground">{(currentPage - 1) * rowsPerPage + index + 1}</Cell>
                {visibleColumns.product ? <Cell><button className="font-medium hover:underline" type="button" onClick={() => onView(product)}>{product.title}</button><div className="text-xs text-muted-foreground">{product.product_code || product.slug}</div></Cell> : null}
                {visibleColumns.category ? <Cell>{product.category_name || "-"}</Cell> : null}
                {visibleColumns.status ? <Cell><StatusBadge value={product.status} /></Cell> : null}
                {visibleColumns.price ? <Cell>{currency(product.sale_price)}</Cell> : null}
                {visibleColumns.stock ? <Cell>{product.stock_status}</Cell> : null}
                {visibleColumns.updated ? <Cell>{formatShortDate(product.updated_at)}</Cell> : null}
                <Cell className="text-right"><MasterListRowActions title={product.title} onEdit={() => onEdit(product)} onView={() => onView(product)} /></Cell>
              </tr>
            ))}</tbody>
          </table>
        ) : null}
      </TableShell>
      <MasterListPaginationCard page={currentPage} rowsPerPage={rowsPerPage} showingLabel={buildMasterListShowingLabel({ page: currentPage, pageSize: rowsPerPage, totalCount: filteredProducts.length })} singularLabel="products" totalCount={filteredProducts.length} totalPages={totalPages} onNextPage={() => setCurrentPage((page) => Math.min(totalPages, page + 1))} onPageChange={setCurrentPage} onPreviousPage={() => setCurrentPage((page) => Math.max(1, page - 1))} onRowsPerPageChange={(value) => { setRowsPerPage(value); setCurrentPage(1) }} />
    </>
  )
}

function CustomersTable({ customers, isLoading, onEdit, onView }: { customers: EcommerceCustomerProfile[]; isLoading: boolean; onEdit(customer: EcommerceCustomerProfile): void; onView(customer: EcommerceCustomerProfile): void }) {
  const [searchValue, setSearchValue] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [visibleColumns, setVisibleColumns] = useState(defaultCustomerColumns)
  const [currentPage, setCurrentPage] = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState(100)
  const filteredCustomers = useMemo(() => filterCustomers(searchCustomers(customers, searchValue), statusFilter), [customers, searchValue, statusFilter])
  const totalPages = Math.max(1, Math.ceil(filteredCustomers.length / rowsPerPage))
  const pageCustomers = filteredCustomers.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage)

  return (
    <>
      <MasterListToolbarCard
        columns={customerColumnCatalog.map((column) => ({ id: column.id, label: column.label, checked: visibleColumns[column.id], disabled: column.id === "customer", onCheckedChange: (checked) => setVisibleColumns((current) => ({ ...current, [column.id]: checked })) }))}
        filterOptions={customerStatusFilters}
        filterValue={statusFilter}
        onFilterValueChange={(value) => { setStatusFilter(value); setCurrentPage(1) }}
        onShowAllColumns={() => setVisibleColumns(defaultCustomerColumns)}
        searchPlaceholder="Search customer, contact, email, phone, portal"
        searchValue={searchValue}
        onSearchValueChange={(value) => { setSearchValue(value); setCurrentPage(1) }}
      />
      <TableShell empty={isLoading ? "Loading ecommerce customers." : "No ecommerce customers found."}>
        {pageCustomers.length ? (
          <table className="w-full min-w-[920px] border-collapse text-sm">
            <thead className="bg-muted/50"><tr><Header>#</Header>{visibleColumns.customer ? <Header>Customer</Header> : null}{visibleColumns.portal ? <Header>Portal</Header> : null}{visibleColumns.contact ? <Header>Contact</Header> : null}{visibleColumns.orders ? <Header>Orders</Header> : null}{visibleColumns.spend ? <Header>Spend</Header> : null}{visibleColumns.updated ? <Header>Updated</Header> : null}<Header className="text-right">Action</Header></tr></thead>
            <tbody>{pageCustomers.map((customer, index) => (
              <tr className="border-b border-border/70 last:border-b-0" key={customer.uuid}>
                <Cell className="text-muted-foreground">{(currentPage - 1) * rowsPerPage + index + 1}</Cell>
                {visibleColumns.customer ? <Cell><button className="font-medium hover:underline" type="button" onClick={() => onView(customer)}>{customer.contact_name || customer.customer_no}</button><div className="text-xs text-muted-foreground">{customer.customer_no}</div></Cell> : null}
                {visibleColumns.portal ? <Cell><StatusBadge value={customer.portal_status} /></Cell> : null}
                {visibleColumns.contact ? <Cell><div>{customer.login_email || "-"}</div><div className="text-xs text-muted-foreground">{customer.login_phone || ""}</div></Cell> : null}
                {visibleColumns.orders ? <Cell>{customer.order_count}</Cell> : null}
                {visibleColumns.spend ? <Cell>{currency(customer.total_spend)}</Cell> : null}
                {visibleColumns.updated ? <Cell>{formatShortDate(customer.updated_at)}</Cell> : null}
                <Cell className="text-right"><MasterListRowActions title={customer.contact_name || customer.customer_no} onEdit={() => onEdit(customer)} onView={() => onView(customer)} /></Cell>
              </tr>
            ))}</tbody>
          </table>
        ) : null}
      </TableShell>
      <MasterListPaginationCard page={currentPage} rowsPerPage={rowsPerPage} showingLabel={buildMasterListShowingLabel({ page: currentPage, pageSize: rowsPerPage, totalCount: filteredCustomers.length })} singularLabel="customers" totalCount={filteredCustomers.length} totalPages={totalPages} onNextPage={() => setCurrentPage((page) => Math.min(totalPages, page + 1))} onPageChange={setCurrentPage} onPreviousPage={() => setCurrentPage((page) => Math.max(1, page - 1))} onRowsPerPageChange={(value) => { setRowsPerPage(value); setCurrentPage(1) }} />
    </>
  )
}

function ProductPublicationShowPage({ onBack, onEdit, product }: { onBack(): void; onEdit(): void; product: EcommerceProductPublication }) {
  return (
    <MasterListPageFrame
      title={product.title}
      description="Ecommerce publication linked to the Product master."
      technicalName="page.ecommerce.products.show"
      action={<div className="flex flex-wrap items-center gap-2"><Button className="h-9 rounded-md" variant="outline" type="button" onClick={onBack}><ArrowLeft className="size-4" />Back</Button><Button className="h-9 rounded-md" type="button" onClick={onEdit}><Pencil className="size-4" />Edit</Button></div>}
    >
      <MasterListShowLayout>
        <MasterListShowCard title="Publication">
          <DetailTable rows={[["UUID", product.uuid], ["Product", product.product_name || product.product_id], ["Code", product.product_code], ["Category", product.category_name], ["Slug", product.slug], ["Status", <StatusBadge key="status" value={product.status} />], ["Visibility", product.visibility], ["Stock", product.stock_status], ["Featured", product.is_featured ? "Yes" : "No"]]} />
        </MasterListShowCard>
        <MasterListShowCard title="Pricing">
          <DetailTable rows={[["Sale price", currency(product.sale_price)], ["Compare at", currency(product.compare_at_price)], ["Published", product.published_at || "-"], ["Updated", product.updated_at || "-"]]} />
        </MasterListShowCard>
        <MasterListShowCard title="Storefront copy">
          <DetailTable rows={[["Title", product.title], ["Short description", product.short_description || "-"]]} />
        </MasterListShowCard>
      </MasterListShowLayout>
    </MasterListPageFrame>
  )
}

function ProductPublicationUpsertPage({ categories, disabled, draft, onBack, onSave, products }: { categories: MasterDataRecord[]; disabled: boolean; draft: Partial<EcommerceProductPublication>; onBack(): void; onSave(input: Partial<EcommerceProductPublication>): void; products: MasterDataRecord[] }) {
  const [form, setForm] = useState(draft)
  const selectedProduct = products.find((product) => product.id === Number(form.product_id))
  return (
    <MasterListPageFrame title={draft.uuid ? "Edit Product Publication" : "Publish Product"} description="Connect a Product master record to the ecommerce storefront without changing the Product master table." technicalName="page.ecommerce.products.upsert" action={<Button className="h-10 rounded-md px-4" variant="outline" type="button" onClick={onBack}><X className="size-4" />Cancel</Button>}>
      <MasterListUpsertLayout>
        <MasterListUpsertCard className="overflow-hidden p-0 [&>div]:p-0">
          <form onSubmit={(event) => { event.preventDefault(); onSave(form) }}>
            <div className="grid gap-x-6 gap-y-5 px-4 py-5 md:grid-cols-2 md:px-6">
              <Field label="Product master"><Select value={String(form.product_id || "")} onValueChange={(value) => setForm({ ...form, product_id: Number(value), title: form.title || recordName(products.find((product) => product.id === Number(value))) })}><SelectTrigger className="h-11 rounded-md"><SelectValue placeholder="Select product" /></SelectTrigger><SelectContent>{products.map((product) => <SelectItem key={product.uuid} value={String(product.id)}>{recordName(product)}</SelectItem>)}</SelectContent></Select></Field>
              <Field label="Category"><Select value={String(form.category_id || "")} onValueChange={(value) => setForm({ ...form, category_id: Number(value) })}><SelectTrigger className="h-11 rounded-md"><SelectValue placeholder="Select category" /></SelectTrigger><SelectContent>{categories.map((category) => <SelectItem key={category.uuid} value={String(category.id)}>{recordName(category)}</SelectItem>)}</SelectContent></Select></Field>
              <Field label="Title"><Input className="h-11 rounded-md" value={form.title ?? ""} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder={recordName(selectedProduct)} /></Field>
              <Field label="Slug"><Input className="h-11 rounded-md" value={form.slug ?? ""} onChange={(event) => setForm({ ...form, slug: event.target.value })} /></Field>
              <Field label="Status"><Select value={form.status ?? "draft"} onValueChange={(value) => setForm({ ...form, status: value })}><SelectTrigger className="h-11 rounded-md"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="draft">Draft</SelectItem><SelectItem value="published">Published</SelectItem><SelectItem value="hidden">Hidden</SelectItem></SelectContent></Select></Field>
              <Field label="Sale price"><Input className="h-11 rounded-md" type="number" value={String(form.sale_price ?? 0)} onChange={(event) => setForm({ ...form, sale_price: Number(event.target.value) })} /></Field>
              <Field className="md:col-span-2" label="Short description"><Textarea className="min-h-28 rounded-md" value={form.short_description ?? ""} onChange={(event) => setForm({ ...form, short_description: event.target.value })} /></Field>
              <label className="flex items-center gap-2 rounded-md border border-border/70 px-4 py-3 text-sm"><Switch checked={Boolean(form.is_featured)} onCheckedChange={(value) => setForm({ ...form, is_featured: value })} /> Featured product</label>
            </div>
            <div className="flex flex-wrap items-center gap-3 border-t border-border/70 bg-muted/20 px-4 py-4 md:px-6"><Button className="h-10 rounded-md px-5" disabled={disabled} type="submit"><Save className={cn("size-4", disabled && "animate-spin")} />Save</Button><Button className="h-10 rounded-md px-5" variant="outline" type="button" onClick={onBack}><X className="size-4" />Cancel</Button></div>
          </form>
        </MasterListUpsertCard>
      </MasterListUpsertLayout>
    </MasterListPageFrame>
  )
}

function CustomerProfileShowPage({ customer, onBack, onEdit }: { customer: EcommerceCustomerProfile; onBack(): void; onEdit(): void }) {
  return (
    <MasterListPageFrame
      title={customer.contact_name || customer.customer_no}
      description="Ecommerce customer profile linked to the Contact master."
      technicalName="page.ecommerce.customers.show"
      action={<div className="flex flex-wrap items-center gap-2"><Button className="h-9 rounded-md" variant="outline" type="button" onClick={onBack}><ArrowLeft className="size-4" />Back</Button><Button className="h-9 rounded-md" type="button" onClick={onEdit}><Pencil className="size-4" />Edit</Button></div>}
    >
      <MasterListShowLayout>
        <MasterListShowCard title="Customer profile">
          <DetailTable rows={[["UUID", customer.uuid], ["Customer no", customer.customer_no], ["Contact", customer.contact_name || customer.contact_id], ["Contact code", customer.contact_code], ["Portal status", <StatusBadge key="status" value={customer.portal_status} />], ["Marketing", customer.marketing_opt_in ? "Opted in" : "Not opted in"]]} />
        </MasterListShowCard>
        <MasterListShowCard title="Portal contact">
          <DetailTable rows={[["Login email", customer.login_email || "-"], ["Login phone", customer.login_phone || "-"], ["Orders", customer.order_count], ["Total spend", currency(customer.total_spend)], ["Updated", customer.updated_at || "-"]]} />
        </MasterListShowCard>
      </MasterListShowLayout>
    </MasterListPageFrame>
  )
}

function CustomerProfileUpsertPage({ contacts, disabled, draft, onBack, onSave }: { contacts: MasterDataRecord[]; disabled: boolean; draft: Partial<EcommerceCustomerProfile>; onBack(): void; onSave(input: Partial<EcommerceCustomerProfile>): void }) {
  const [form, setForm] = useState(draft)
  return (
    <MasterListPageFrame title={draft.uuid ? "Edit Customer Profile" : "Connect Customer"} description="Connect a Contact master record to the ecommerce customer portal without changing the Contact master table." technicalName="page.ecommerce.customers.upsert" action={<Button className="h-10 rounded-md px-4" variant="outline" type="button" onClick={onBack}><X className="size-4" />Cancel</Button>}>
      <MasterListUpsertLayout>
        <MasterListUpsertCard className="overflow-hidden p-0 [&>div]:p-0">
          <form onSubmit={(event) => { event.preventDefault(); onSave(form) }}>
            <div className="grid gap-x-6 gap-y-5 px-4 py-5 md:grid-cols-2 md:px-6">
              <Field className="md:col-span-2" label="Contact master"><Select value={String(form.contact_id || "")} onValueChange={(value) => setForm({ ...form, contact_id: Number(value), customer_no: form.customer_no || recordCode(contacts.find((contact) => contact.id === Number(value))) })}><SelectTrigger className="h-11 rounded-md"><SelectValue placeholder="Select contact" /></SelectTrigger><SelectContent>{contacts.map((contact) => <SelectItem key={contact.uuid} value={String(contact.id)}>{recordName(contact)}</SelectItem>)}</SelectContent></Select></Field>
              <Field label="Customer no"><Input className="h-11 rounded-md" value={form.customer_no ?? ""} onChange={(event) => setForm({ ...form, customer_no: event.target.value })} /></Field>
              <Field label="Portal status"><Select value={form.portal_status ?? "invited"} onValueChange={(value) => setForm({ ...form, portal_status: value })}><SelectTrigger className="h-11 rounded-md"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="invited">Invited</SelectItem><SelectItem value="active">Active</SelectItem><SelectItem value="blocked">Blocked</SelectItem></SelectContent></Select></Field>
              <Field label="Login email"><Input className="h-11 rounded-md" value={form.login_email ?? ""} onChange={(event) => setForm({ ...form, login_email: event.target.value })} /></Field>
              <Field label="Login phone"><Input className="h-11 rounded-md" value={form.login_phone ?? ""} onChange={(event) => setForm({ ...form, login_phone: event.target.value })} /></Field>
              <label className="flex items-center gap-2 rounded-md border border-border/70 px-4 py-3 text-sm"><Switch checked={Boolean(form.marketing_opt_in)} onCheckedChange={(value) => setForm({ ...form, marketing_opt_in: value })} /> Marketing opt-in</label>
            </div>
            <div className="flex flex-wrap items-center gap-3 border-t border-border/70 bg-muted/20 px-4 py-4 md:px-6"><Button className="h-10 rounded-md px-5" disabled={disabled} type="submit"><Save className={cn("size-4", disabled && "animate-spin")} />Save</Button><Button className="h-10 rounded-md px-5" variant="outline" type="button" onClick={onBack}><X className="size-4" />Cancel</Button></div>
          </form>
        </MasterListUpsertCard>
      </MasterListUpsertLayout>
    </MasterListPageFrame>
  )
}

function OrdersTable({ isLoading, orders }: { isLoading: boolean; orders: EcommerceWorkspace["orders"] }) {
  return (
    <TableShell empty={isLoading ? "Loading ecommerce orders." : "No ecommerce orders yet."}>
      {orders.length ? (
        <table className="w-full text-sm">
          <thead className="bg-muted/45"><tr><Header>Order</Header><Header>Customer</Header><Header>Status</Header><Header>Payment</Header><Header>Fulfillment</Header><Header>Total</Header></tr></thead>
          <tbody>{orders.map((order) => (
            <tr className="border-b last:border-b-0" key={order.uuid}>
              <Cell><div className="font-medium">{order.order_no}</div><div className="text-xs text-muted-foreground">{order.uuid}</div></Cell>
              <Cell>{order.contact_name || "-"}</Cell>
              <Cell><StatusBadge value={order.status} /></Cell>
              <Cell>{order.payment_status}</Cell>
              <Cell>{order.fulfillment_status}</Cell>
              <Cell>{currency(order.grand_total)}</Cell>
            </tr>
          ))}</tbody>
        </table>
      ) : null}
    </TableShell>
  )
}

function CustomerDashboard({ customers, orders }: { customers: EcommerceCustomerProfile[]; orders: EcommerceWorkspace["orders"] }) {
  const topCustomers = [...customers].sort((a, b) => b.total_spend - a.total_spend).slice(0, 5)
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="rounded-md"><CardHeader><CardTitle className="text-base">Customer dashboard queue</CardTitle></CardHeader><CardContent className="space-y-3">{topCustomers.map((customer) => <Row key={customer.uuid} label={customer.contact_name || customer.customer_no} value={currency(customer.total_spend)} />)}{!topCustomers.length ? <p className="text-sm text-muted-foreground">Connect customers to activate the portal dashboard.</p> : null}</CardContent></Card>
      <Card className="rounded-md"><CardHeader><CardTitle className="text-base">Visible order states</CardTitle></CardHeader><CardContent className="space-y-3"><Row label="Open orders" value={orders.filter((order) => order.status !== "delivered").length} /><Row label="Paid orders" value={orders.filter((order) => order.payment_status === "paid").length} /><Row label="Linked invoices" value={orders.filter((order) => order.sales_entry_uuid).length} /></CardContent></Card>
    </div>
  )
}

function PortalAccounts({ workspace }: { workspace: EcommerceWorkspace }) {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="rounded-md"><CardContent className="p-4"><UserRound className="mb-3 size-5 text-primary" /><div className="text-2xl font-semibold">{workspace.portalAccounts.length}</div><div className="text-sm text-muted-foreground">Portal accounts</div></CardContent></Card>
      <Card className="rounded-md"><CardContent className="p-4"><CreditCard className="mb-3 size-5 text-primary" /><div className="text-2xl font-semibold">{workspace.dashboard.paidOrders}</div><div className="text-sm text-muted-foreground">Paid customer orders</div></CardContent></Card>
      <Card className="rounded-md"><CardContent className="p-4"><Heart className="mb-3 size-5 text-primary" /><div className="text-2xl font-semibold">{workspace.wishlists.length}</div><div className="text-sm text-muted-foreground">Wishlists</div></CardContent></Card>
    </div>
  )
}

function SettingsPanel({ onEdit, settings }: { onEdit(): void; settings: EcommerceSettings }) {
  return (
    <Card className="rounded-md">
      <CardHeader className="flex flex-row items-center justify-between"><CardTitle className="text-base">Store settings</CardTitle><Button className="rounded-md" type="button" onClick={onEdit}><Settings className="size-4" />Edit</Button></CardHeader>
      <CardContent className="grid gap-3 md:grid-cols-2"><Row label="Store name" value={settings.store_name} /><Row label="Status" value={settings.store_status} /><Row label="Tax mode" value={settings.default_tax_mode} /><Row label="Order prefix" value={settings.order_prefix} /><Row label="Email" value={settings.public_contact_email || "-"} /><Row label="Phone" value={settings.public_contact_phone || "-"} /></CardContent>
    </Card>
  )
}

function GenericEcommerceView({ view, workspace }: { view: EcommerceView; workspace: EcommerceWorkspace }) {
  const mapping: Partial<Record<EcommerceView, { icon: typeof ShoppingBag; count: number; detail: string }>> = {
    carts: { icon: ShoppingBag, count: workspace.carts.length, detail: "Cart records will appear here as storefront visitors add products." },
    checkout: { icon: CreditCard, count: workspace.carts.filter((cart) => String(cart.status) === "converted").length, detail: "Checkout sessions convert carts into ecommerce orders." },
    categories: { icon: PackageSearch, count: workspace.source.categoryCount, detail: "Uses existing Product Category common records and ecommerce visibility settings." },
    collections: { icon: PackageSearch, count: 0, detail: "Collection records are owned by ecommerce and can group published products." },
    variants: { icon: PackageSearch, count: workspace.products.length, detail: "Variant display belongs in ecommerce while Product remains the source master." },
    wishlists: { icon: Heart, count: workspace.wishlists.length, detail: "Customer saved product lists are ecommerce-owned." },
    reviews: { icon: UsersRound, count: workspace.reviews.length, detail: "Reviews are moderated against ecommerce product publications." },
    shipping: { icon: Truck, count: workspace.shipments.length, detail: "Shipment records track carrier, tracking number, and delivery state." },
    returns: { icon: Truck, count: workspace.returns.length, detail: "Return requests are linked to ecommerce orders." },
    coupons: { icon: CreditCard, count: workspace.coupons.length, detail: "Coupon rules and redemptions stay in ecommerce tables." },
    "sales-report": { icon: BarChart3, count: workspace.orders.length, detail: `Current ecommerce revenue is ${currency(workspace.dashboard.revenue)}.` },
  }
  const item = mapping[view] ?? { icon: Settings, count: 0, detail: "This ecommerce surface is connected to the standalone ecommerce app boundary." }
  const Icon = item.icon
  return (
    <Card className="rounded-md">
      <CardContent className="flex items-start gap-4 p-5">
        <span className="flex size-11 items-center justify-center rounded-md bg-primary/10 text-primary"><Icon className="size-5" /></span>
        <div><div className="text-2xl font-semibold">{item.count}</div><p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">{item.detail}</p></div>
      </CardContent>
    </Card>
  )
}

function SettingsDialog({ disabled, draft, onClose, onSave }: { disabled: boolean; draft: Partial<EcommerceSettings>; onClose(): void; onSave(input: Partial<EcommerceSettings>): void }) {
  const [form, setForm] = useState(draft)
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl rounded-md">
        <DialogHeader><DialogTitle>Store settings</DialogTitle></DialogHeader>
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Store name"><Input className="rounded-md" value={form.store_name ?? ""} onChange={(event) => setForm({ ...form, store_name: event.target.value })} /></Field>
          <Field label="Store status"><Select value={form.store_status ?? "draft"} onValueChange={(value) => setForm({ ...form, store_status: value })}><SelectTrigger className="rounded-md"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="draft">Draft</SelectItem><SelectItem value="live">Live</SelectItem><SelectItem value="maintenance">Maintenance</SelectItem></SelectContent></Select></Field>
          <Field label="Order prefix"><Input className="rounded-md" value={form.order_prefix ?? ""} onChange={(event) => setForm({ ...form, order_prefix: event.target.value })} /></Field>
          <Field label="Tax mode"><Select value={form.default_tax_mode ?? "exclusive"} onValueChange={(value) => setForm({ ...form, default_tax_mode: value })}><SelectTrigger className="rounded-md"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="exclusive">Exclusive</SelectItem><SelectItem value="inclusive">Inclusive</SelectItem></SelectContent></Select></Field>
          <Field label="Email"><Input className="rounded-md" value={form.public_contact_email ?? ""} onChange={(event) => setForm({ ...form, public_contact_email: event.target.value })} /></Field>
          <Field label="Phone"><Input className="rounded-md" value={form.public_contact_phone ?? ""} onChange={(event) => setForm({ ...form, public_contact_phone: event.target.value })} /></Field>
        </div>
        <DialogFooter><Button className="rounded-md" variant="outline" type="button" onClick={onClose}>Cancel</Button><Button className="rounded-md" disabled={disabled} type="button" onClick={() => onSave(form)}><Save className="size-4" />Save</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function TableShell({ children, empty }: { children: ReactNode; empty: string }) {
  return <MasterListTableCard><div className="overflow-x-auto">{children}</div>{!children ? <MasterListEmptyState>{empty}</MasterListEmptyState> : null}</MasterListTableCard>
}

function Field({ children, className, label }: { children: ReactNode; className?: string; label: string }) {
  return <div className={cn("grid gap-1.5", className)}><Label>{label}</Label>{children}</div>
}

function Header({ children, className }: { children: ReactNode; className?: string }) {
  return <th className={cn("px-3 py-2 text-left text-xs font-semibold uppercase text-muted-foreground", className)}>{children}</th>
}

function Cell({ children, className }: { children: ReactNode; className?: string }) {
  return <td className={cn("px-3 py-3 align-top", className)}>{children}</td>
}

function Row({ label, value }: { label: string; value: ReactNode }) {
  return <div className="flex items-center justify-between gap-3"><span className="text-muted-foreground">{label}</span><span className="font-medium">{value}</span></div>
}

function DetailTable({ rows }: { rows: Array<[string, ReactNode]> }) {
  return (
    <div className="-mx-5 -mb-5 -mt-5 overflow-hidden rounded-b-md border-t border-border/70">
      <table className="w-full border-collapse text-sm">
        <tbody>
          {rows.map(([label, value]) => (
            <tr key={label} className="border-b border-border/60 last:border-b-0">
              <th className="w-44 border-r border-border/70 bg-muted/35 px-3 py-2.5 text-left align-top text-xs font-semibold uppercase text-muted-foreground">{label}</th>
              <td className="px-3 py-2.5 align-top font-medium text-foreground">{value || "Not set"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Readiness({ label, ready }: { label: string; ready: boolean }) {
  return <div className="rounded-md border border-border/70 p-3"><Badge className="rounded-md" variant={ready ? "default" : "outline"}>{ready ? "Ready" : "Pending"}</Badge><div className="mt-2 text-sm font-medium">{label}</div></div>
}

function StatusBadge({ value }: { value: string }) {
  return <Badge className="rounded-md capitalize" variant={["published", "active", "paid", "live"].includes(value) ? "default" : "outline"}>{value.replace(/_/g, " ")}</Badge>
}

function viewTitle(view: EcommerceView) {
  const labels: Record<EcommerceView, string> = {
    dashboard: "Store Desk", orders: "Orders", carts: "Carts", checkout: "Checkout", products: "Products", categories: "Categories", collections: "Collections", variants: "Variants", customers: "Customers", "customer-dashboard": "Customer Dashboard", "customer-portal": "Customer Portal", wishlists: "Wishlists", reviews: "Reviews", shipping: "Shipping", "delivery-zones": "Delivery Zones", returns: "Returns", coupons: "Coupons", campaigns: "Campaigns", seo: "SEO", "sales-report": "Sales Report", "product-report": "Product Report", "customer-report": "Customer Report", settings: "Store Settings", "payment-gateway": "Payment Gateway", "tax-settings": "Tax Settings",
  }
  return labels[view]
}

function viewDescription(view: EcommerceView) {
  if (view === "products") return "Publish existing Product master records into the ecommerce catalog."
  if (view === "customers" || view === "customer-portal") return "Connect existing Contact master records to ecommerce customer profiles and portal accounts."
  if (view === "settings") return "Configure the tenant store without changing shared master tables."
  return "Standalone ecommerce app data connected to product, contact, storefront, order, and customer portal workflows."
}

function currency(value: number) {
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2, style: "currency", currency: "INR" }).format(Number(value || 0))
}

function formatShortDate(value: unknown) {
  if (!value) return "-"
  const date = new Date(String(value))
  if (Number.isNaN(date.getTime())) return String(value)
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
}

function searchProducts(records: EcommerceProductPublication[], searchValue: string) {
  const needle = searchValue.trim().toLowerCase()
  if (!needle) return records
  return records.filter((record) => [
    record.title,
    record.product_code,
    record.product_name,
    record.category_name,
    record.slug,
    record.status,
    record.stock_status,
    record.short_description,
  ].some((value) => String(value ?? "").toLowerCase().includes(needle)))
}

function filterProducts(records: EcommerceProductPublication[], statusFilter: string) {
  if (statusFilter === "all") return records
  return records.filter((record) => record.status === statusFilter)
}

function searchCustomers(records: EcommerceCustomerProfile[], searchValue: string) {
  const needle = searchValue.trim().toLowerCase()
  if (!needle) return records
  return records.filter((record) => [
    record.customer_no,
    record.contact_code,
    record.contact_name,
    record.login_email,
    record.login_phone,
    record.portal_status,
  ].some((value) => String(value ?? "").toLowerCase().includes(needle)))
}

function filterCustomers(records: EcommerceCustomerProfile[], statusFilter: string) {
  if (statusFilter === "all") return records
  return records.filter((record) => record.portal_status === statusFilter)
}

function recordName(record?: MasterDataRecord) {
  return typeof record?.name === "string" ? record.name : ""
}

function recordCode(record?: MasterDataRecord) {
  return typeof record?.code === "string" ? record.code : ""
}

function findSavedProduct(records: EcommerceProductPublication[], input: Partial<EcommerceProductPublication>) {
  if (input.uuid) return records.find((record) => record.uuid === input.uuid) ?? null
  if (input.product_id) return records.find((record) => record.product_id === Number(input.product_id)) ?? null
  return records[0] ?? null
}

function findSavedCustomer(records: EcommerceCustomerProfile[], input: Partial<EcommerceCustomerProfile>) {
  if (input.uuid) return records.find((record) => record.uuid === input.uuid) ?? null
  if (input.contact_id) return records.find((record) => record.contact_id === Number(input.contact_id)) ?? null
  return records[0] ?? null
}

function emptyWorkspace(): EcommerceWorkspace {
  return { settings: { id: 0, uuid: "", store_name: "", store_status: "draft", default_tax_mode: "exclusive", order_prefix: "EC", public_contact_email: null, public_contact_phone: null, return_policy: null, shipping_policy: null, privacy_policy: null, terms: null, is_active: true }, products: [], customers: [], orders: [], carts: [], shipments: [], returns: [], coupons: [], reviews: [], wishlists: [], portalAccounts: [], dashboard: { publishedProducts: 0, draftProducts: 0, activeCustomers: 0, openOrders: 0, paidOrders: 0, revenue: 0, activeCarts: 0, pendingReturns: 0 }, source: { productCount: 0, contactCount: 0, categoryCount: 0 } }
}
