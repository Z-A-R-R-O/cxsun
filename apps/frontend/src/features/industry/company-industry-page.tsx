import { useEffect, useMemo, useState, type ReactNode } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Building2, Check, Factory, Pencil, RefreshCw, Save, Users } from "lucide-react"
import { toast } from "sonner"

import { MasterListPageFrame } from "src/components/blocks/lists/master-list"
import { Button } from "src/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "src/components/ui/card"
import { Input } from "src/components/ui/input"
import { Label } from "src/components/ui/label"
import type { AuthSession, AuthTenant } from "src/features/auth/auth-client"
import { listCompanies, toCompanyInput, upsertCompany, type CompanyRecord } from "src/features/company/company-client"
import { listTenants } from "src/features/tenant/infrastructure/tenant-api"
import { cn } from "src/lib/utils"
import { listIndustries } from "./industry-client"

export function CompanyIndustryPage({ session }: { session: AuthSession }) {
  const queryClient = useQueryClient()
  const tenantsQuery = useQuery({ queryKey: ["company-industry-tenants"], queryFn: () => listTenants(session) })
  const activeTenants = useMemo(() => (tenantsQuery.data ?? []).filter((tenant) => tenant.status === "active"), [tenantsQuery.data])
  const [tenantSlug, setTenantSlug] = useState("")
  const [companyId, setCompanyId] = useState("")
  const [industryId, setIndustryId] = useState("")
  const selectedTenantRecord = activeTenants.find((tenant) => tenant.slug === tenantSlug) ?? null
  const selectedTenant = useMemo(() => selectedTenantRecord ? toAuthTenant(selectedTenantRecord) : null, [selectedTenantRecord])
  const tenantSession = useMemo(() => selectedTenant ? { ...session, selectedTenant } : session, [selectedTenant, session])
  const companiesQuery = useQuery({
    enabled: Boolean(selectedTenant),
    queryKey: ["company-industry-companies", selectedTenant?.slug],
    queryFn: () => listCompanies(tenantSession),
  })
  const industriesQuery = useQuery({
    queryKey: ["company-industry-industries", session.selectedTenant.slug],
    queryFn: () => listIndustries(session),
  })
  const updateMutation = useMutation({
    mutationFn: ({ company, nextIndustryId }: { company: CompanyRecord; nextIndustryId: number }) => upsertCompany(tenantSession, { ...toCompanyInput(company), industryId: nextIndustryId }),
  })
  const companies = companiesQuery.data ?? []
  const industries = (industriesQuery.data ?? []).filter((industry) => industry.status === "active")
  const selectedCompany = companies.find((company) => String(company.id) === companyId) ?? null
  const selectedIndustry = industries.find((industry) => String(industry.id) === industryId) ?? null

  useEffect(() => {
    setCompanyId("")
    setIndustryId("")
  }, [tenantSlug])

  useEffect(() => {
    if (!selectedCompany) return
    setIndustryId(selectedCompany.industryId ? String(selectedCompany.industryId) : "")
  }, [selectedCompany])

  async function refresh() {
    await Promise.all([tenantsQuery.refetch(), companiesQuery.refetch(), industriesQuery.refetch()])
  }

  async function updateIndustry() {
    if (!selectedCompany || !selectedIndustry) {
      toast.error("Select tenant, company, and industry")
      return
    }

    try {
      const updated = await updateMutation.mutateAsync({ company: selectedCompany, nextIndustryId: selectedIndustry.id })
      toast.success("Company industry updated", { description: `${updated.name} now uses ${selectedIndustry.name}.` })
      await Promise.all([
        companiesQuery.refetch(),
        queryClient.invalidateQueries({ queryKey: ["companies", selectedTenant?.slug] }),
        queryClient.invalidateQueries({ queryKey: ["default-company-context", selectedTenant?.slug] }),
        queryClient.invalidateQueries({ queryKey: ["company-software-settings", selectedTenant?.slug] }),
      ])
    } catch (error) {
      toast.error("Company industry update failed", { description: error instanceof Error ? error.message : "Unable to update company industry." })
    }
  }

  return (
    <MasterListPageFrame
      title="Company Industry"
      description="Assign an industry profile to a company inside a tenant workspace."
      technicalName="page.company-industry"
      action={<Button disabled={tenantsQuery.isFetching || companiesQuery.isFetching || industriesQuery.isFetching} type="button" variant="outline" className="h-9 rounded-md" onClick={() => void refresh()}><RefreshCw className={cn("size-4", (tenantsQuery.isFetching || companiesQuery.isFetching || industriesQuery.isFetching) && "animate-spin")} />Refresh</Button>}
    >
      <Card className="rounded-md">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Industry assignment</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5">
          <div className="grid gap-4 lg:grid-cols-3">
            <AssignmentAutocomplete icon={Users} label="Tenant" placeholder={tenantsQuery.isFetching ? "Loading tenants" : "Type tenant name"} value={tenantSlug} onChange={setTenantSlug} options={activeTenants.map((tenant) => ({ label: tenant.name, meta: tenant.slug, value: tenant.slug }))} />
            <AssignmentAutocomplete disabled={!selectedTenant} icon={Building2} label="Company" placeholder={companiesQuery.isFetching ? "Loading companies" : "Type company name"} value={companyId} onChange={setCompanyId} options={companies.map((company) => ({ label: company.name, meta: company.code, value: String(company.id) }))} />
            <AssignmentAutocomplete icon={Factory} label="Industry" placeholder={industriesQuery.isFetching ? "Loading industries" : "Type industry name"} value={industryId} onChange={setIndustryId} options={industries.map((industry) => ({ label: industry.name, meta: industry.code, value: String(industry.id) }))} />
          </div>
          <div className="grid gap-3 rounded-md border border-border/70 bg-muted/20 p-4 sm:grid-cols-3">
            <Summary label="Tenant" value={selectedTenant?.name ?? "Not selected"} />
            <Summary label="Company" value={selectedCompany?.name ?? "Not selected"} />
            <Summary label="Industry" value={selectedIndustry?.name ?? selectedCompany?.industryName ?? "Not selected"} />
          </div>
          <div className="flex justify-end border-t border-border/70 pt-4">
            <Button type="button" className="rounded-md" disabled={!selectedCompany || !selectedIndustry || updateMutation.isPending || selectedCompany.industryId === selectedIndustry.id} onClick={() => void updateIndustry()}>
              <Save className={cn("size-4", updateMutation.isPending && "animate-spin")} />
              Update industry
            </Button>
          </div>
        </CardContent>
      </Card>
      <Card className="overflow-hidden rounded-md">
        <CardHeader className="pb-3"><CardTitle className="text-base">Tenant companies</CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="bg-muted/50"><tr><TableHeader>Company</TableHeader><TableHeader>Code</TableHeader><TableHeader>Current industry</TableHeader><TableHeader className="text-right">Action</TableHeader></tr></thead>
              <tbody>
                {companies.map((company) => (
                  <tr className="border-t border-border/70" key={company.id}>
                    <td className="px-4 py-3 font-medium">{company.name}</td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{company.code}</td>
                    <td className="px-4 py-3 text-muted-foreground">{company.industryName}</td>
                    <td className="px-4 py-3 text-right">
                      <Button type="button" size="sm" variant="outline" className="rounded-md" onClick={() => setCompanyId(String(company.id))}><Pencil className="size-4" />Edit</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!companies.length ? <div className="border-t border-border/70 px-4 py-10 text-center text-sm text-muted-foreground">{companiesQuery.isFetching ? "Loading companies." : "No companies found for this tenant."}</div> : null}
        </CardContent>
      </Card>
    </MasterListPageFrame>
  )
}

function AssignmentAutocomplete({ disabled = false, icon: Icon, label, onChange, options, placeholder, value }: { disabled?: boolean; icon: typeof Users; label: string; onChange(value: string): void; options: Array<{ label: string; meta?: string; value: string }>; placeholder: string; value: string }) {
  const selected = options.find((option) => option.value === value) ?? null
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState(selected?.label ?? "")
  const normalizedQuery = query.trim().toLowerCase()
  const filteredOptions = options.filter((option) => `${option.label} ${option.meta ?? ""}`.toLowerCase().includes(normalizedQuery))

  useEffect(() => {
    if (!open) setQuery(selected?.label ?? "")
  }, [open, selected])

  function select(option: { label: string; value: string }) {
    onChange(option.value)
    setQuery(option.label)
    setOpen(false)
  }

  return (
    <div className="relative grid gap-2">
      <Label className="flex items-center gap-2"><Icon className="size-4 text-muted-foreground" />{label}</Label>
      <Input
        aria-autocomplete="list"
        aria-expanded={open}
        className="h-11 rounded-md"
        disabled={disabled}
        placeholder={placeholder}
        role="combobox"
        value={query}
        onBlur={() => window.setTimeout(() => { setOpen(false); setQuery(selected?.label ?? "") }, 120)}
        onChange={(event) => { setQuery(event.target.value); setOpen(true); if (!event.target.value) onChange("") }}
        onFocus={() => setOpen(true)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && filteredOptions[0]) {
            event.preventDefault()
            select(filteredOptions[0])
          }
        }}
      />
      {open && !disabled ? (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-56 overflow-auto rounded-md border border-border bg-popover p-1 shadow-md">
          {filteredOptions.map((option) => (
            <button className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm hover:bg-muted" key={option.value} onMouseDown={(event) => { event.preventDefault(); select(option) }} type="button">
              <span className="min-w-0 flex-1"><span className="block truncate font-medium">{option.label}</span>{option.meta ? <span className="block truncate text-xs text-muted-foreground">{option.meta}</span> : null}</span>
              {option.value === value ? <Check className="size-4 text-primary" /> : null}
            </button>
          ))}
          {!filteredOptions.length ? <div className="px-3 py-2 text-sm text-muted-foreground">No {label.toLowerCase()} found.</div> : null}
        </div>
      ) : null}
    </div>
  )
}

function Summary({ label, value }: { label: string; value: string }) {
  return <div><div className="text-xs text-muted-foreground">{label}</div><div className="mt-1 font-medium">{value}</div></div>
}

function TableHeader({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <th className={`px-4 py-3 text-left font-medium ${className}`}>{children}</th>
}

function toAuthTenant(tenant: Awaited<ReturnType<typeof listTenants>>[number]): AuthTenant {
  return {
    id: tenant.id,
    code: tenant.code,
    corporate_id: tenant.corporateId || null,
    mobile: tenant.mobile,
    slug: tenant.slug,
    name: tenant.name,
    status: tenant.status,
    role: "super-admin",
    payload_settings: tenant.payloadSettings,
  }
}
