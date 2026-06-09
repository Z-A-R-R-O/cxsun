import type { FormEvent, ReactNode } from "react"
import { useMutation, useQuery } from "@tanstack/react-query"
import { ArrowLeft, ArrowRight, Building2, Factory, PackageSearch, ShieldCheck, UsersRound } from "lucide-react"
import { Badge } from "src/components/ui/badge"
import { Button } from "src/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "src/components/ui/card"
import { Input } from "src/components/ui/input"
import { Textarea } from "src/components/ui/textarea"
import { apiBaseUrl } from "src/lib/api-base-url"

interface PublicSupplier {
  uuid: string
  sourceTenantSlug: string
  brandName: string | null
  businessType: string | null
  monthlyCapacity: string | null
  minOrderQty: number | null
  about?: string | null
  factoryAddress?: string | null
  verificationLevel?: string
}

interface PublicProduct {
  uuid: string
  sourceSupplierUuid: string | null
  sourceTenantSlug: string
  slug: string
  description: string | null
  moq: number | null
  leadTime: string | null
  fabricDetails?: string | null
  certificationDetails?: string | null
}

interface PublicRfq {
  uuid: string
  title: string
  description: string | null
  quantity: number
  deliveryDeadline: string | null
  budgetMin: number | null
  budgetMax: number | null
  status: string
  createdAt: string
}

export function TirupurConnectPublicPage() {
  const detailRoute = parseDetailRoute()
  const suppliersQuery = useQuery({ queryKey: ["public-tirupur-connect", "suppliers"], queryFn: () => listPublicRecords<PublicSupplier>("suppliers") })
  const productsQuery = useQuery({ queryKey: ["public-tirupur-connect", "products"], queryFn: () => listPublicRecords<PublicProduct>("products") })
  const rfqsQuery = useQuery({ queryKey: ["public-tirupur-connect", "rfqs"], queryFn: () => listPublicRecords<PublicRfq>("rfqs") })
  const supplierDetailQuery = useQuery({
    enabled: detailRoute?.kind === "suppliers",
    queryKey: ["public-tirupur-connect", "supplier", detailRoute?.id],
    queryFn: () => getPublicRecord<PublicSupplier>(`suppliers/${detailRoute?.id}`),
  })
  const productDetailQuery = useQuery({
    enabled: detailRoute?.kind === "products",
    queryKey: ["public-tirupur-connect", "product", detailRoute?.id],
    queryFn: () => getPublicRecord<PublicProduct>(`products/${detailRoute?.id}`),
  })
  const rfqDetailQuery = useQuery({
    enabled: detailRoute?.kind === "rfqs",
    queryKey: ["public-tirupur-connect", "rfq", detailRoute?.id],
    queryFn: () => getPublicRecord<PublicRfq>(`rfqs/${detailRoute?.id}`),
  })
  const suppliers = suppliersQuery.data ?? []
  const products = productsQuery.data ?? []
  const rfqs = rfqsQuery.data ?? []

  if (detailRoute?.kind === "suppliers") {
    return (
      <PublicShell>
        <MarketplaceDetail
          badge={supplierDetailQuery.data?.sourceTenantSlug ?? "Supplier"}
          detail={
            supplierDetailQuery.data ? (
              <SupplierDetail supplier={supplierDetailQuery.data} />
            ) : (
              <EmptyDetail loading={supplierDetailQuery.isFetching} title="Supplier profile not available" />
            )
          }
          title={supplierDetailQuery.data?.brandName || "Supplier Profile"}
        />
      </PublicShell>
    )
  }

  if (detailRoute?.kind === "products") {
    return (
      <PublicShell>
        <MarketplaceDetail
          badge={productDetailQuery.data?.sourceTenantSlug ?? "Product"}
          detail={
            productDetailQuery.data ? (
              <ProductDetail product={productDetailQuery.data} />
            ) : (
              <EmptyDetail loading={productDetailQuery.isFetching} title="Product listing not available" />
            )
          }
          title={productDetailQuery.data ? titleizeSlug(productDetailQuery.data.slug) : "Product Listing"}
        />
      </PublicShell>
    )
  }

  if (detailRoute?.kind === "rfqs") {
    return (
      <PublicShell>
        <MarketplaceDetail
          badge={rfqDetailQuery.data?.status ?? "RFQ"}
          detail={
            rfqDetailQuery.data ? (
              <RfqDetail rfq={rfqDetailQuery.data} />
            ) : (
              <EmptyDetail loading={rfqDetailQuery.isFetching} title="RFQ not available" />
            )
          }
          title={rfqDetailQuery.data?.title ?? "RFQ"}
        />
      </PublicShell>
    )
  }

  return (
    <PublicShell>
      <section
        className="relative min-h-[82vh] overflow-hidden bg-cover bg-center"
        style={{ backgroundImage: "linear-gradient(90deg, rgba(2,6,23,.86), rgba(2,6,23,.55)), url('https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&w=1800&q=80')" }}
      >
        <div className="mx-auto flex min-h-[82vh] max-w-7xl flex-col justify-center px-6 py-16 text-white lg:px-8">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-wide text-emerald-200">Tirupur Connect</p>
            <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight md:text-6xl">The Official Digital Trade Platform for Tirupur Manufacturers and Global Buyers</h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-white/80">Discover approved manufacturers, exporters, suppliers and sourcing partners from Tirupur. Public listings appear only after marketplace review.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild className="rounded-md bg-emerald-500 text-white hover:bg-emerald-400" type="button">
                <a href="#suppliers">Find Manufacturers<ArrowRight className="size-4" /></a>
              </Button>
              <Button asChild className="rounded-md border-white/40 bg-white/10 text-white hover:bg-white/20" variant="outline" type="button">
                <a href="#rfqs">Open RFQs</a>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-4 px-6 py-8 md:grid-cols-4 lg:px-8">
        <PublicMetric icon={Building2} label="Manufacturers" value={`${suppliers.length} approved suppliers`} />
        <PublicMetric icon={PackageSearch} label="Catalog" value={`${products.length} approved products`} />
        <PublicMetric icon={UsersRound} label="RFQs" value={`${rfqs.length} open sourcing requests`} />
        <PublicMetric icon={ShieldCheck} label="Trust" value="Central marketplace review" />
      </section>

      <section className="mx-auto grid max-w-7xl gap-8 px-6 pb-12 lg:px-8 xl:grid-cols-3">
        <MarketplaceSection
          empty={suppliersQuery.isFetching ? "Loading approved suppliers." : "No approved suppliers are public yet."}
          id="suppliers"
          title="Approved Suppliers"
        >
          {suppliers.map((supplier) => (
            <Card className="rounded-md border-border/70" key={supplier.uuid}>
              <CardHeader className="pb-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <CardTitle className="text-base">{supplier.brandName || "Supplier Profile"}</CardTitle>
                  <Badge variant="secondary">{supplier.sourceTenantSlug}</Badge>
                </div>
              </CardHeader>
              <CardContent className="grid gap-2 text-sm text-muted-foreground">
                <Detail label="Type" value={supplier.businessType} />
                <Detail label="Capacity" value={supplier.monthlyCapacity} />
                <Detail label="MOQ" value={supplier.minOrderQty === null ? null : String(supplier.minOrderQty)} />
                <Button asChild className="mt-2 justify-self-start rounded-md" size="sm" type="button" variant="outline">
                  <a href={`/tirupur-connect/suppliers/${supplier.uuid}`}>View Supplier</a>
                </Button>
              </CardContent>
            </Card>
          ))}
        </MarketplaceSection>

        <MarketplaceSection
          empty={productsQuery.isFetching ? "Loading approved products." : "No approved products are public yet."}
          id="products"
          title="Approved Products"
        >
          {products.map((product) => (
            <Card className="rounded-md border-border/70" key={product.uuid}>
              <CardHeader className="pb-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <CardTitle className="text-base">{titleizeSlug(product.slug)}</CardTitle>
                  <Badge variant="secondary">{product.sourceTenantSlug}</Badge>
                </div>
              </CardHeader>
              <CardContent className="grid gap-2 text-sm text-muted-foreground">
                <p className="line-clamp-3 leading-6">{product.description || "Approved marketplace product listing."}</p>
                <Detail label="MOQ" value={product.moq === null ? null : String(product.moq)} />
                <Detail label="Lead time" value={product.leadTime} />
                <Button asChild className="mt-2 justify-self-start rounded-md" size="sm" type="button" variant="outline">
                  <a href={`/tirupur-connect/products/${product.uuid}`}>View Product</a>
                </Button>
              </CardContent>
            </Card>
          ))}
        </MarketplaceSection>

        <MarketplaceSection
          empty={rfqsQuery.isFetching ? "Loading open RFQs." : "No public RFQs are open yet."}
          id="rfqs"
          title="Open RFQs"
        >
          {rfqs.map((rfq) => (
            <Card className="rounded-md border-border/70" key={rfq.uuid}>
              <CardHeader className="pb-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <CardTitle className="text-base">{rfq.title}</CardTitle>
                  <Badge variant="secondary">{rfq.status}</Badge>
                </div>
              </CardHeader>
              <CardContent className="grid gap-2 text-sm text-muted-foreground">
                <p className="line-clamp-3 leading-6">{rfq.description || "Open sourcing request from the Tirupur Connect marketplace."}</p>
                <Detail label="Quantity" value={String(rfq.quantity)} />
                <Detail label="Deadline" value={rfq.deliveryDeadline} />
                <Button asChild className="mt-2 justify-self-start rounded-md" size="sm" type="button" variant="outline">
                  <a href={`/tirupur-connect/rfqs/${rfq.uuid}`}>View RFQ</a>
                </Button>
              </CardContent>
            </Card>
          ))}
        </MarketplaceSection>
      </section>
    </PublicShell>
  )
}

function PublicShell({ children }: { children: ReactNode }) {
  return <main className="min-h-screen bg-background text-foreground">{children}</main>
}

function PublicMetric({ icon: Icon, label, value }: { icon: typeof Building2; label: string; value: string }) {
  return (
    <div className="rounded-md border border-border/70 bg-card p-4">
      <Icon className="size-5 text-emerald-700" />
      <h2 className="mt-3 font-semibold">{label}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{value}</p>
    </div>
  )
}

function MarketplaceSection({ children, empty, id, title }: { children: ReactNode; empty: string; id: string; title: string }) {
  const hasChildren = Array.isArray(children) ? children.length > 0 : Boolean(children)
  return (
    <div className="grid gap-4" id={id}>
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">Only approved marketplace records are shown here.</p>
      </div>
      <div className="grid gap-3">
        {hasChildren ? children : <div className="rounded-md border border-dashed border-border/80 p-6 text-sm text-muted-foreground">{empty}</div>}
      </div>
    </div>
  )
}

function MarketplaceDetail({ badge, detail, title }: { badge: string; detail: ReactNode; title: string }) {
  return (
    <section className="mx-auto grid max-w-5xl gap-6 px-6 py-8 lg:px-8">
      <Button asChild className="w-fit rounded-md" size="sm" type="button" variant="outline">
        <a href="/tirupur-connect"><ArrowLeft className="size-4" />Back</a>
      </Button>
      <div className="grid gap-3">
        <Badge className="w-fit" variant="secondary">{badge}</Badge>
        <h1 className="text-3xl font-semibold tracking-tight md:text-5xl">{title}</h1>
      </div>
      {detail}
    </section>
  )
}

function SupplierDetail({ supplier }: { supplier: PublicSupplier }) {
  return (
    <div className="grid gap-4 md:grid-cols-[1.2fr_.8fr]">
      <Card className="rounded-md">
        <CardHeader>
          <CardTitle>Manufacturer Profile</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 text-sm leading-6 text-muted-foreground">
          <p>{supplier.about || "Approved Tirupur Connect supplier profile."}</p>
          <Detail label="Business type" value={supplier.businessType} />
          <Detail label="Monthly capacity" value={supplier.monthlyCapacity} />
          <Detail label="Minimum order" value={supplier.minOrderQty === null ? null : String(supplier.minOrderQty)} />
        </CardContent>
      </Card>
      <Card className="rounded-md">
        <CardHeader>
          <Factory className="size-5 text-emerald-700" />
          <CardTitle className="text-lg">Factory</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm text-muted-foreground">
          <Detail label="Verification" value={supplier.verificationLevel ?? "none"} />
          <p className="leading-6">{supplier.factoryAddress || "Factory address will appear after publication review."}</p>
        </CardContent>
      </Card>
      <InquiryForm entityType="supplier" entityUuid={supplier.uuid} sourceTenantSlug={supplier.sourceTenantSlug} />
    </div>
  )
}

function ProductDetail({ product }: { product: PublicProduct }) {
  return (
    <div className="grid gap-4 md:grid-cols-[1.2fr_.8fr]">
      <Card className="rounded-md">
        <CardHeader>
          <CardTitle>Product Details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 text-sm leading-6 text-muted-foreground">
          <p>{product.description || "Approved Tirupur Connect product listing."}</p>
          <Detail label="MOQ" value={product.moq === null ? null : String(product.moq)} />
          <Detail label="Lead time" value={product.leadTime} />
        </CardContent>
      </Card>
      <Card className="rounded-md">
        <CardHeader>
          <PackageSearch className="size-5 text-emerald-700" />
          <CardTitle className="text-lg">Trade Specs</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm text-muted-foreground">
          <Detail label="Supplier ref" value={product.sourceSupplierUuid} />
          <Detail label="Fabric" value={product.fabricDetails ?? null} />
          <Detail label="Certifications" value={product.certificationDetails ?? null} />
        </CardContent>
      </Card>
      <InquiryForm entityType="product" entityUuid={product.uuid} sourceTenantSlug={product.sourceTenantSlug} />
    </div>
  )
}

function RfqDetail({ rfq }: { rfq: PublicRfq }) {
  return (
    <div className="grid gap-4 md:grid-cols-[1.2fr_.8fr]">
      <Card className="rounded-md">
        <CardHeader>
          <CardTitle>Requirement</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 text-sm leading-6 text-muted-foreground">
          <p>{rfq.description || "Open sourcing request from the Tirupur Connect marketplace."}</p>
          <Detail label="Quantity" value={String(rfq.quantity)} />
          <Detail label="Delivery deadline" value={rfq.deliveryDeadline} />
        </CardContent>
      </Card>
      <Card className="rounded-md">
        <CardHeader>
          <UsersRound className="size-5 text-emerald-700" />
          <CardTitle className="text-lg">Buyer Budget</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm text-muted-foreground">
          <Detail label="Minimum" value={rfq.budgetMin === null ? null : String(rfq.budgetMin)} />
          <Detail label="Maximum" value={rfq.budgetMax === null ? null : String(rfq.budgetMax)} />
          <Detail label="Status" value={rfq.status} />
        </CardContent>
      </Card>
      <InquiryForm entityType="rfq" entityUuid={rfq.uuid} />
    </div>
  )
}

function InquiryForm({ entityType, entityUuid, sourceTenantSlug }: { entityType: "product" | "rfq" | "supplier"; entityUuid: string; sourceTenantSlug?: string }) {
  const mutation = useMutation({
    mutationFn: (input: Record<string, string>) => createPublicInquiry({ ...input, entityType, entityUuid, sourceTenantSlug: sourceTenantSlug ?? "" }),
  })

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const data = new FormData(form)
    mutation.mutate({
      buyerName: String(data.get("buyerName") ?? ""),
      companyName: String(data.get("companyName") ?? ""),
      email: String(data.get("email") ?? ""),
      phone: String(data.get("phone") ?? ""),
      message: String(data.get("message") ?? ""),
    }, {
      onSuccess: () => form.reset(),
    })
  }

  return (
    <Card className="rounded-md md:col-span-2">
      <CardHeader>
        <CardTitle className="text-lg">Inquiry</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="grid gap-3 md:grid-cols-2" onSubmit={submit}>
          <Input name="buyerName" placeholder="Buyer name" required />
          <Input name="companyName" placeholder="Company" />
          <Input name="email" placeholder="Email" type="email" />
          <Input name="phone" placeholder="Phone" />
          <Textarea className="md:col-span-2" name="message" placeholder="Message" required rows={4} />
          <div className="flex flex-wrap items-center gap-3 md:col-span-2">
            <Button className="rounded-md" disabled={mutation.isPending} type="submit">
              {mutation.isPending ? "Sending" : "Send Inquiry"}
            </Button>
            {mutation.isSuccess ? <span className="text-sm text-emerald-700">Inquiry received.</span> : null}
            {mutation.isError ? <span className="text-sm text-destructive">Inquiry failed.</span> : null}
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

function EmptyDetail({ loading, title }: { loading: boolean; title: string }) {
  return (
    <div className="rounded-md border border-dashed border-border/80 p-6 text-sm text-muted-foreground">
      {loading ? "Loading marketplace detail." : title}
    </div>
  )
}

function Detail({ label, value }: { label: string; value: string | null }) {
  return <div className="flex items-center justify-between gap-3"><span>{label}</span><span className="font-medium text-foreground">{value || "-"}</span></div>
}

async function listPublicRecords<T>(path: string) {
  const response = await fetch(`${apiBaseUrl}/api/v1/tirupur-connect/public/${path}`, { cache: "no-store" })
  if (!response.ok) throw new Error(`Tirupur Connect public ${path} failed with status ${response.status}.`)
  const result = (await response.json()) as { ok: boolean; records?: T[]; error?: string }
  if (!result.ok || !result.records) throw new Error(result.error ?? `Tirupur Connect public ${path} failed.`)
  return result.records
}

async function getPublicRecord<T>(path: string) {
  const response = await fetch(`${apiBaseUrl}/api/v1/tirupur-connect/public/${path}`, { cache: "no-store" })
  if (!response.ok) throw new Error(`Tirupur Connect public ${path} failed with status ${response.status}.`)
  const result = (await response.json()) as { ok: boolean; record?: T; error?: string }
  if (!result.ok || !result.record) throw new Error(result.error ?? `Tirupur Connect public ${path} failed.`)
  return result.record
}

async function createPublicInquiry(input: Record<string, string>) {
  const response = await fetch(`${apiBaseUrl}/api/v1/tirupur-connect/public/inquiries`, {
    body: JSON.stringify(input),
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    method: "POST",
  })
  if (!response.ok) throw new Error(`Tirupur Connect inquiry failed with status ${response.status}.`)
  const result = (await response.json()) as { ok: boolean; error?: string }
  if (!result.ok) throw new Error(result.error ?? "Tirupur Connect inquiry failed.")
}

function parseDetailRoute() {
  const [, first, kind, id] = window.location.pathname.split("/")
  if (first !== "tirupur-connect") return null
  if ((kind === "suppliers" || kind === "products" || kind === "rfqs") && id) return { kind, id }
  return null
}

function titleizeSlug(value: string) {
  return value.split("-").filter(Boolean).map((part) => part[0]?.toUpperCase() + part.slice(1)).join(" ")
}
