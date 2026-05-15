import { Bug, CheckCircle2, Headset, ShieldCheck } from "lucide-react"
import { Badge } from "src/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "src/components/ui/card"

const supportCards = {
  helpdesk: {
    eyebrow: "Admin software desk",
    title: "Helpdesk",
    description: "Support operators handle product help, setup questions, and client-facing guidance here.",
    Icon: Headset,
    items: ["Customer questions", "Setup support", "How-to guidance", "Escalation notes"],
  },
  bugs: {
    eyebrow: "Admin software desk",
    title: "Bug triage",
    description: "Bug reports and software quality work stay in the admin dashboard, away from tenant business data.",
    Icon: Bug,
    items: ["Bug intake", "Severity review", "Reproduction notes", "Release follow-up"],
  },
  "tenant-roles": {
    eyebrow: "Tenant database",
    title: "Tenant roles",
    description: "Tenant-local roles and policy assignments belong inside the selected tenant database.",
    Icon: ShieldCheck,
    items: ["rbac_roles", "rbac_policies", "rbac_role_policies", "company.manage"],
  },
  "user-manager": {
    eyebrow: "Platform / master database",
    title: "User manager",
    description: "Platform users, access assignments, and super-admin identity controls belong with master database modules.",
    Icon: ShieldCheck,
    items: ["platform_users", "user_tenants", "surface access", "role boundaries"],
  },
}

export function SupportPage({ type }: { type: keyof typeof supportCards }) {
  const content = supportCards[type]
  const Icon = content.Icon

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 lg:p-6">
      <Card className="overflow-hidden">
        <CardHeader className="border-b bg-muted/30">
          <div className="flex items-start gap-4">
            <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Icon className="size-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-primary">{content.eyebrow}</p>
              <CardTitle className="mt-1 text-2xl">{content.title}</CardTitle>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{content.description}</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-3 pt-5 md:grid-cols-2 xl:grid-cols-4">
          {content.items.map((item) => (
            <div className="rounded-xl border bg-background p-4" key={item}>
              <Badge variant="outline" className="mb-3 rounded-md">
                <CheckCircle2 className="size-3" />
                Boundary
              </Badge>
              <p className="font-semibold">{item}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
