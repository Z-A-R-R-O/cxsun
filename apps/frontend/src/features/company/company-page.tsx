import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Plus, RefreshCw, RotateCcw, Trash2 } from "lucide-react"
import { Badge } from "src/components/ui/badge"
import { Button } from "src/components/ui/button"
import { Input } from "src/components/ui/input"
import { cn } from "src/lib/utils"
import type { AuthSession } from "src/features/auth/auth-client"
import {
  destroyCompany,
  listCompanies,
  restoreCompany,
  upsertCompany,
  type CompanyRecord,
} from "./company-client"

export function CompanyPage({ session }: { session: AuthSession }) {
  const [companies, setCompanies] = useState<CompanyRecord[]>([])
  const [name, setName] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    void load()
  }, [session.selectedTenant.slug])

  async function load() {
    setIsLoading(true)
    try {
      setCompanies(await listCompanies(session))
    } catch (error) {
      toast.error("Company load failed", {
        description: error instanceof Error ? error.message : "Unable to load companies.",
      })
    } finally {
      setIsLoading(false)
    }
  }

  async function createCompany() {
    if (!name.trim()) {
      return
    }

    try {
      const company = await upsertCompany(session, { name })
      setName("")
      toast.success("Company created", {
        description: `${company.name} was created in ${session.selectedTenant.name}.`,
      })
      await load()
    } catch (error) {
      toast.error("Company save failed", {
        description: error instanceof Error ? error.message : "Unable to save company.",
      })
    }
  }

  async function destroy(id: number) {
    try {
      await destroyCompany(session, id)
      toast.error("Company suspended", {
        description: "The company is suspended in this tenant database.",
      })
      await load()
    } catch (error) {
      toast.error("Company destroy failed", {
        description: error instanceof Error ? error.message : "Unable to suspend company.",
      })
    }
  }

  async function restore(id: number) {
    try {
      await restoreCompany(session, id)
      toast.success("Company restored", {
        description: "The company is active again in this tenant database.",
      })
      await load()
    } catch (error) {
      toast.error("Company restore failed", {
        description: error instanceof Error ? error.message : "Unable to restore company.",
      })
    }
  }

  return (
    <section className="flex flex-1 flex-col gap-4 p-4 md:p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Companies</h1>
          <p className="text-sm text-muted-foreground">
            Tenant isolated records for {session.selectedTenant.name}.
          </p>
        </div>
        <Button disabled={isLoading} onClick={() => void load()} type="button" variant="outline">
          <RefreshCw className={cn("size-4", isLoading && "animate-spin")} />
          Refresh
        </Button>
      </div>

      <div className="flex flex-col gap-2 rounded-lg border bg-card p-3 sm:flex-row">
        <Input
          aria-label="Company name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Company name"
        />
        <Button className="sm:w-auto" onClick={() => void createCompany()} type="button">
          <Plus className="size-4" />
          Create company
        </Button>
      </div>

      <div className="overflow-x-auto rounded-lg border bg-card">
        <table className="w-full min-w-[680px] text-sm">
          <thead className="bg-muted/60 text-left">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Features</th>
              <th className="px-4 py-3 text-right font-medium">Action</th>
            </tr>
          </thead>
          <tbody>
            {companies.map((company) => (
              <tr className="border-t" key={company.id}>
                <td className="px-4 py-3 font-medium">{company.name}</td>
                <td className="px-4 py-3">
                  <Badge
                    variant="outline"
                    className={cn(
                      "rounded-full",
                      company.status === "active"
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : "border-amber-200 bg-amber-50 text-amber-700",
                    )}
                  >
                    {company.status}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {company.features.join(", ") || "none"}
                </td>
                <td className="px-4 py-3 text-right">
                  {company.status === "suspend" ? (
                    <Button onClick={() => void restore(company.id)} size="sm" type="button" variant="outline">
                      <RotateCcw className="size-4" />
                      Restore
                    </Button>
                  ) : (
                    <Button onClick={() => void destroy(company.id)} size="sm" type="button" variant="destructive">
                      <Trash2 className="size-4" />
                      Suspend
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {companies.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            {isLoading ? "Loading companies." : "No companies in this tenant yet."}
          </div>
        ) : null}
      </div>
    </section>
  )
}
