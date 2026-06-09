import type { ReactNode } from "react"
import { useQuery } from "@tanstack/react-query"
import { ArrowRight, Building2, PackageSearch, ShieldCheck, UsersRound } from "lucide-react"
import { Badge } from "src/components/ui/badge"
import { Button } from "src/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "src/components/ui/card"
import { apiBaseUrl } from "src/lib/api-base-url"

interface PublicSupplier {
  uuid: string
  sourceTenantSlug: string
  brandName: string | null
  businessType: string | null
  monthlyCapacity: string | null
  minOrderQty: number | null
}

interface PublicProduct {
  uuid: string
  sourceTenantSlug: string
  slug: string
  description: string | null
  moq: number | null
  leadTime: string | null
}

export function TirupurConnectPublicPage() {
  const suppliersQuery = useQuery({ queryKey: ["public-tirupur-connect", "suppliers"], queryFn: () => listPublicRecords<PublicSupplier>("suppliers") })
  const productsQuery = useQuery({ queryKey: ["public-tirupur-connect", "products"], queryFn: () => listPublicRecords<PublicProduct>("products") })
  const suppliers = suppliersQuery.data ?? []
  const products = productsQuery.data ?? []

  return (
    <main className="min-h-screen bg-background text-foreground">
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
              <Button className="rounded-md bg-emerald-500 text-white hover:bg-emerald-400" type="button">Find Manufacturers<ArrowRight className="size-4" /></Button>
              <Button className="rounded-md border-white/40 bg-white/10 text-white hover:bg-white/20" variant="outline" type="button">Post RFQ</Button>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-4 px-6 py-8 md:grid-cols-4 lg:px-8">
        <PublicMetric icon={Building2} label="Manufacturers" value={`${suppliers.length} approved suppliers`} />
        <PublicMetric icon={PackageSearch} label="Catalog" value={`${products.length} approved products`} />
        <PublicMetric icon={UsersRound} label="Buyers" value="RFQs and sourcing leads" />
        <PublicMetric icon={ShieldCheck} label="Trust" value="Central marketplace review" />
      </section>

      <section className="mx-auto grid max-w-7xl gap-8 px-6 pb-12 lg:px-8 xl:grid-cols-[1fr_1fr]">
        <MarketplaceSection
          empty={suppliersQuery.isFetching ? "Loading approved suppliers." : "No approved suppliers are public yet."}
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
              </CardContent>
            </Card>
          ))}
        </MarketplaceSection>

        <MarketplaceSection
          empty={productsQuery.isFetching ? "Loading approved products." : "No approved products are public yet."}
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
              </CardContent>
            </Card>
          ))}
        </MarketplaceSection>
      </section>
    </main>
  )
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

function MarketplaceSection({ children, empty, title }: { children: ReactNode; empty: string; title: string }) {
  const hasChildren = Array.isArray(children) ? children.length > 0 : Boolean(children)
  return (
    <div className="grid gap-4">
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

function titleizeSlug(value: string) {
  return value.split("-").filter(Boolean).map((part) => part[0]?.toUpperCase() + part.slice(1)).join(" ")
}
