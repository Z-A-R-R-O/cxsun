import Link from "next/link";
import {
  ArrowUpRight,
  Contact,
  FileBarChart2,
  HandCoins,
  Package,
  ReceiptText,
  ShoppingBag,
  WalletCards,
  Warehouse,
} from "lucide-react";
import { Badge, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@cxnext/ui";

const shortcutGroups = [
  {
    id: "entries",
    title: "Entries",
    description: "Daily billing vouchers and money movement.",
    links: [
      { label: "Sales", href: "/desk/sales", icon: ReceiptText },
      { label: "Purchase", href: "/desk/purchase", icon: ShoppingBag },
      { label: "Receipt", href: "/desk/receipt", icon: HandCoins },
      { label: "Payment", href: "/desk/payment", icon: WalletCards },
    ],
  },
  {
    id: "reports",
    title: "Reports",
    description: "Statements and GST views for the active company/year.",
    links: [
      {
        label: "Customer Statement",
        href: "/desk/reports/customer-statement",
        icon: FileBarChart2,
      },
      {
        label: "Supplier Statement",
        href: "/desk/reports/supplier-statement",
        icon: FileBarChart2,
      },
      { label: "GST Statement", href: "/desk/reports/gst-statement", icon: FileBarChart2 },
    ],
  },
  {
    id: "master",
    title: "Master",
    description: "Billing parties and products.",
    links: [
      { label: "Contacts", href: "/desk/contact", icon: Contact },
      { label: "Products", href: "/desk/product", icon: Package },
      { label: "Stock", href: "/desk/stock", icon: Warehouse },
    ],
  },
] as const;

const infoCards = [
  { label: "Workspace", value: "Billing", detail: "Sales, purchases, receipts, and payments" },
  {
    label: "Context",
    value: "Company/year",
    detail: "Uses the active company and accounting year",
  },
  { label: "Output", value: "Reports", detail: "Customer, supplier, and GST statements" },
] as const;

export function BillingWorkspacePage() {
  return (
    <section
      data-technical-name="page.billing.workspace"
      className="mx-auto w-[94%] space-y-4 py-4 sm:w-[92%] lg:w-[90%] lg:py-6"
    >
      <Card className="mesh-panel overflow-hidden rounded-[14px] py-0">
        <CardHeader className="border-b border-border/60 px-4 py-5 sm:px-5 lg:px-6">
          <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-start sm:justify-between">
            <Badge className="rounded-full bg-foreground px-3 py-1.5 text-background">
              Billing
            </Badge>
            <Badge variant="outline" className="rounded-full border-border/80 bg-background/90">
              Active workspace
            </Badge>
          </div>
          <div className="mt-4 max-w-3xl space-y-2">
            <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
              Billing desk
            </h1>
            <p className="text-sm leading-6 text-muted-foreground">
              Fast entry, clean masters, and practical reports for the selected company and
              accounting year.
            </p>
          </div>
        </CardHeader>
      </Card>

      <div className="grid gap-3 md:grid-cols-3">
        {infoCards.map((card) => (
          <Card key={card.label} className="rounded-[14px]">
            <CardHeader className="pb-3">
              <CardDescription>{card.label}</CardDescription>
              <CardTitle className="text-xl">{card.value}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm leading-6 text-muted-foreground">
              {card.detail}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        {shortcutGroups.map((group) => (
          <Card key={group.id} className="rounded-[14px]">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{group.title}</CardTitle>
              <CardDescription>{group.description}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-2">
              {group.links.map((link) => {
                const Icon = link.icon;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="group flex items-center justify-between gap-3 rounded-md border border-border/70 bg-background px-3 py-3 text-sm transition hover:border-foreground/25 hover:bg-muted/40"
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      <Icon className="size-4 shrink-0 text-muted-foreground" />
                      <span className="truncate font-medium text-foreground">{link.label}</span>
                    </span>
                    <ArrowUpRight className="size-4 shrink-0 text-muted-foreground transition group-hover:text-foreground" />
                  </Link>
                );
              })}
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
