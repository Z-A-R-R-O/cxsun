import { useEffect, useMemo, useState, type Dispatch, type ReactNode, type SetStateAction } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { ArrowLeft, CheckCircle2, ImagePlus, Pencil, Plus, RefreshCw, RotateCcw, Save, Trash2, X } from "lucide-react"
import { Badge } from "src/components/ui/badge"
import { Button } from "src/components/ui/button"
import { AnimatedTabs } from "src/components/ui/animated-tabs"
import { Input } from "src/components/ui/input"
import { Label } from "src/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "src/components/ui/select"
import { Switch } from "src/components/ui/switch"
import {
  MasterListEmptyState,
  MasterListPageFrame,
  MasterListPaginationCard,
  MasterListRowActions,
  MasterListShowCard,
  MasterListTableCard,
  MasterListToolbarCard,
  MasterListUpsertCard,
  MasterListUpsertLayout,
  buildMasterListShowingLabel,
} from "src/components/blocks/lists/master-list"
import { cn } from "src/lib/utils"
import type { AuthSession } from "src/features/auth/auth-client"
import { MediaPickerDialog } from "src/features/media/media-picker-dialog"
import type { MediaAsset } from "src/features/media/media-client"
import { listIndustries, type IndustryRecord } from "src/features/industry/industry-client"
import { CityAutocompleteLookup } from "src/features/master-data/interface/components/city-autocomplete-lookup"
import { CommonRecordAutocompleteLookup, getCommonRecordName } from "src/features/master-data/interface/components/common-record-autocomplete-lookup"
import { CountryAutocompleteLookup } from "src/features/master-data/interface/components/country-autocomplete-lookup"
import { DistrictAutocompleteLookup } from "src/features/master-data/interface/components/district-autocomplete-lookup"
import { StateAutocompleteLookup } from "src/features/master-data/interface/components/state-autocomplete-lookup"
import type { MasterDataRecord } from "src/features/master-data/domain/master-data"
import { listMasterDataRecords } from "src/features/master-data/infrastructure/master-data-client"
import {
  destroyCompany,
  emptyCompany,
  listCompanies,
  restoreCompany,
  toCompanyInput,
  upsertCompany,
  type CompanyAddress,
  type CompanyBankAccount,
  type CompanyEmail,
  type CompanyPhone,
  type CompanyRecord,
  type CompanyUpsertInput,
} from "./company-client"

type CompanyStatusFilter = "all" | "active" | "suspend"
type CompanyColumnId = "code" | "name" | "tenant" | "industry" | "status" | "updated"
type FormTab = "identity" | "registration" | "logos" | "tax" | "accounts" | "addressing" | "notes"
type CompanyUpsertReturnTo = "list" | "show"
type CompanyUpsertState = {
  company: CompanyRecord | null
  returnTo: CompanyUpsertReturnTo
}
const companyEmailTypes = ["primary", "work", "billing", "personal", "support", "other"] as const
const companyPhoneTypes = ["mobile", "work", "billing", "whatsapp", "landline", "other"] as const
type CompanyEmailType = (typeof companyEmailTypes)[number]
type CompanyPhoneType = (typeof companyPhoneTypes)[number]

const statusFilters = [
  { id: "all", label: "All companies" },
  { id: "active", label: "Active" },
  { id: "suspend", label: "Suspended" },
]

const companyLogoVariants = [
  { type: "logo", label: "Logo" },
  { type: "logo-dark", label: "Logo Dark" },
  { type: "favicon", label: "Favicon" },
] as const

const companyLogoBasePath = "storage/<tenant>/public/logo"
const defaultCompanyLogoFileNames: Record<(typeof companyLogoVariants)[number]["type"], string> = {
  logo: "logo.svg",
  "logo-dark": "logo-dark.svg",
  favicon: "favicon.svg",
}

export function CompanyPage({ session }: { session: AuthSession }) {
  const queryClient = useQueryClient()
  const [selectedCompany, setSelectedCompany] = useState<CompanyRecord | null>(null)
  const [upsertState, setUpsertState] = useState<CompanyUpsertState | null>(null)
  const [searchValue, setSearchValue] = useState("")
  const [statusFilter, setStatusFilter] = useState<CompanyStatusFilter>("all")
  const [currentPage, setCurrentPage] = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState(100)
  const canManagePlatform = session.selectedTenant.role === "super-admin"
  const [visibleColumns, setVisibleColumns] = useState<Record<CompanyColumnId, boolean>>({
    code: true,
    name: true,
    tenant: canManagePlatform,
    industry: canManagePlatform,
    status: true,
    updated: true,
  })
  const companyQueryKey = ["companies", session.selectedTenant.slug]
  const companiesQuery = useQuery({
    queryKey: companyQueryKey,
    queryFn: () => listCompanies(session),
  })
  const industriesQuery = useQuery({
    enabled: canManagePlatform,
    queryKey: ["industries", "company-options", session.selectedTenant.slug],
    queryFn: () => listIndustries(session),
  })
  const upsertMutation = useMutation({
    mutationFn: (input: CompanyUpsertInput) => upsertCompany(session, input),
  })
  const destroyMutation = useMutation({
    mutationFn: (company: CompanyRecord) => destroyCompany(session, company.id),
  })
  const restoreMutation = useMutation({
    mutationFn: (company: CompanyRecord) => restoreCompany(session, company.id),
  })
  const companies = companiesQuery.data ?? []
  const isLoading = companiesQuery.isFetching

  useEffect(() => {
    if (companiesQuery.error) {
      toast.error("Company load failed", {
        description: companiesQuery.error instanceof Error ? companiesQuery.error.message : "Unable to load companies.",
      })
    }
  }, [companiesQuery.error])

  useEffect(() => {
    setSelectedCompany((current) => companies.find((company) => company.id === current?.id) ?? null)
  }, [companies])

  const filteredCompanies = useMemo(() => {
    const query = searchValue.trim().toLowerCase()
    return companies.filter((company) => {
      const matchesStatus = statusFilter === "all" || company.status === statusFilter
      const searchTarget = [
        company.code,
        company.name,
        company.legalName,
        company.tenantName,
        company.industryName,
        company.primaryEmail,
        company.primaryPhone,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()

      return matchesStatus && (!query || searchTarget.includes(query))
    })
  }, [companies, searchValue, statusFilter])

  const totalPages = Math.max(1, Math.ceil(filteredCompanies.length / rowsPerPage))
  const pageCompanies = filteredCompanies.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage)

  function openCreatePage() {
    setSelectedCompany(null)
    setUpsertState({ company: null, returnTo: "list" })
  }

  function openEditPage(company: CompanyRecord, returnTo: CompanyUpsertReturnTo = "list") {
    setUpsertState({ company, returnTo })
  }

  async function saveCompany(input: CompanyUpsertInput) {
    const returnTo = upsertState?.returnTo ?? "list"
    const company = await upsertMutation.mutateAsync(input)
    toast.success(input.id ? "Company updated" : "Company created", {
      description: `${company.name} is ready in ${session.selectedTenant.name}.`,
    })
    await queryClient.invalidateQueries({ queryKey: companyQueryKey })
    setUpsertState(null)
    setSelectedCompany(returnTo === "show" ? company : null)
  }

  async function destroy(company: CompanyRecord) {
    try {
      await destroyMutation.mutateAsync(company)
      toast.error("Company suspended", {
        description: `${company.name} is now suspended.`,
      })
      await queryClient.invalidateQueries({ queryKey: companyQueryKey })
    } catch (error) {
      toast.error("Company suspend failed", {
        description: error instanceof Error ? error.message : "Unable to suspend company.",
      })
    }
  }

  async function restore(company: CompanyRecord) {
    try {
      await restoreMutation.mutateAsync(company)
      toast.success("Company restored", {
        description: `${company.name} is active again and available for tenant workflows.`,
      })
      await queryClient.invalidateQueries({ queryKey: companyQueryKey })
    } catch (error) {
      toast.error("Company restore failed", {
        description: error instanceof Error ? error.message : "Unable to restore company.",
      })
    }
  }

  if (upsertState) {
    return (
      <CompanyUpsertPage
        company={upsertState.company}
        industries={industriesQuery.data ?? []}
        session={session}
        onBack={() => setUpsertState(null)}
        onSubmit={saveCompany}
      />
    )
  }

  if (selectedCompany) {
    return (
      <CompanyShowPage
        company={selectedCompany}
        canManagePlatform={canManagePlatform}
        session={session}
        onBack={() => setSelectedCompany(null)}
        onDestroy={() => void destroy(selectedCompany)}
        onEdit={() => openEditPage(selectedCompany, "show")}
        onRestore={() => void restore(selectedCompany)}
      />
    )
  }

  return (
    <MasterListPageFrame
      title="Companies"
      description={`Tenant isolated companies for ${session.selectedTenant.name}.`}
      technicalName="page.organisation.companies"
      action={
        <div className="flex items-center gap-2">
          <Button disabled={isLoading} onClick={() => void companiesQuery.refetch()} type="button" variant="outline" className="h-9 rounded-md">
            <RefreshCw className={cn("size-4", isLoading && "animate-spin")} />
            Refresh
          </Button>
          <Button onClick={openCreatePage} type="button" className="h-9 rounded-md">
            <Plus className="size-4" />
            New company
          </Button>
        </div>
      }
    >
      <MasterListToolbarCard
        columns={(Object.keys(visibleColumns) as CompanyColumnId[])
          .filter((column) => canManagePlatform || (column !== "tenant" && column !== "industry"))
          .map((column) => ({
            id: column,
            label: columnLabel(column),
            checked: visibleColumns[column],
            onCheckedChange: (checked) => setVisibleColumns((current) => ({ ...current, [column]: checked })),
          }))}
        filterOptions={statusFilters}
        filterValue={statusFilter}
        onFilterValueChange={(nextValue) => {
          setStatusFilter(nextValue as CompanyStatusFilter)
          setCurrentPage(1)
        }}
        onSearchValueChange={(nextValue) => {
          setSearchValue(nextValue)
          setCurrentPage(1)
        }}
        searchPlaceholder="Search company, code, email, phone, tenant, industry"
        searchValue={searchValue}
      />
      <MasterListTableCard>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[880px] border-collapse text-sm">
            <thead className="bg-muted/55">
              <tr>
                <ListHeader className="w-16">#</ListHeader>
                {visibleColumns.code ? <ListHeader>Code</ListHeader> : null}
                {visibleColumns.name ? <ListHeader>Company</ListHeader> : null}
                {canManagePlatform && visibleColumns.tenant ? <ListHeader>Tenant</ListHeader> : null}
                {canManagePlatform && visibleColumns.industry ? <ListHeader>Industry</ListHeader> : null}
                {visibleColumns.status ? <ListHeader>Status</ListHeader> : null}
                {visibleColumns.updated ? <ListHeader>Updated</ListHeader> : null}
                <ListHeader className="w-24 text-right">Action</ListHeader>
              </tr>
            </thead>
            <tbody>
              {pageCompanies.map((company, index) => (
                <tr key={company.id} className="border-b border-border/60 last:border-b-0 hover:bg-muted/20">
                  <td className="px-4 py-2 text-muted-foreground">{(currentPage - 1) * rowsPerPage + index + 1}</td>
                  {visibleColumns.code ? <td className="px-4 py-2 font-mono text-xs text-muted-foreground">{company.code}</td> : null}
                  {visibleColumns.name ? (
                    <td className="px-4 py-2">
                      <button className="cursor-pointer text-left font-medium text-foreground hover:underline" onClick={() => setSelectedCompany(company)} type="button">
                        {company.name}
                      </button>
                      <div className="text-xs text-muted-foreground">{company.primaryEmail || company.primaryPhone || company.legalName}</div>
                    </td>
                  ) : null}
                  {canManagePlatform && visibleColumns.tenant ? <td className="px-4 py-2 text-muted-foreground">{company.tenantName}</td> : null}
                  {canManagePlatform && visibleColumns.industry ? <td className="px-4 py-2 text-muted-foreground">{company.industryName}</td> : null}
                  {visibleColumns.status ? (
                    <td className="px-4 py-2">
                      <CompanyStatusToggle
                        company={company}
                        onDestroy={destroy}
                        onRestore={restore}
                      />
                    </td>
                  ) : null}
                  {visibleColumns.updated ? <td className="px-4 py-2 text-muted-foreground">{formatDate(company.updatedAt)}</td> : null}
                  <td className="px-4 py-1.5 text-right">
                    <CompanyActions company={company} onDestroy={destroy} onEdit={(record) => openEditPage(record, "list")} onRestore={restore} onView={setSelectedCompany} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {pageCompanies.length === 0 ? <MasterListEmptyState>{isLoading ? "Loading companies." : "No companies found."}</MasterListEmptyState> : null}
      </MasterListTableCard>
      <MasterListPaginationCard
        page={currentPage}
        rowsPerPage={rowsPerPage}
        showingLabel={buildMasterListShowingLabel({ page: currentPage, pageSize: rowsPerPage, totalCount: filteredCompanies.length })}
        singularLabel="companies"
        totalCount={filteredCompanies.length}
        totalPages={totalPages}
        onNextPage={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
        onPageChange={setCurrentPage}
        onPreviousPage={() => setCurrentPage((page) => Math.max(1, page - 1))}
        onRowsPerPageChange={(nextValue) => {
          setRowsPerPage(nextValue)
          setCurrentPage(1)
        }}
      />
    </MasterListPageFrame>
  )
}

function CompanyShowPage({
  canManagePlatform,
  company,
  onBack,
  onDestroy,
  onEdit,
  onRestore,
  session,
}: {
  canManagePlatform: boolean
  company: CompanyRecord
  onBack(): void
  onDestroy(): void
  onEdit(): void
  onRestore(): void
  session: AuthSession
}) {
  const labels = useCommonRecordLabels(session)
  return (
    <MasterListPageFrame
      title={`${company.code} - ${company.name}`}
      description={company.shortAbout || company.legalName || "Company profile and connected tables."}
      action={
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={onBack} type="button" variant="outline" className="h-9 rounded-md">
            <ArrowLeft className="size-4" />
            Back
          </Button>
          <Button onClick={onEdit} type="button" className="h-9 rounded-md">
            <Pencil className="size-4" />
            Edit
          </Button>
          {company.status === "suspend" ? (
            <Button onClick={onRestore} type="button" variant="outline" className="h-9 rounded-md">
              <RotateCcw className="size-4" />
              Restore
            </Button>
          ) : (
            <Button onClick={onDestroy} type="button" variant="destructive" className="h-9 rounded-md">
              <Trash2 className="size-4" />
              Suspend
            </Button>
          )}
        </div>
      }
    >
      <div className="grid gap-4">
        <CompanyShowCard title="Company profile">
          <DetailTable
            rows={[
              ["Name", company.name],
              ["Code", company.code],
              ["Legal name", company.legalName],
              ["Tagline", company.tagline],
              ["Website", company.website],
              ["Email", company.primaryEmail],
              ["Phone", company.primaryPhone],
              ["Incorporated", formatDate(company.dateOfIncorporation)],
              ["Description", company.description],
              ["Status", <StatusBadge key="status" company={company} />],
            ]}
          />
        </CompanyShowCard>
        {canManagePlatform ? (
          <CompanyShowCard title="Tenant and industry">
            <DetailTable rows={[["Tenant", company.tenantName], ["Tenant id", company.tenantId], ["Industry", company.industryName], ["Industry id", company.industryId]]} />
          </CompanyShowCard>
        ) : null}
        <CompanyShowCard title="Compliance">
          <DetailTable
            rows={[
              ["GSTIN/UIN", company.gstinUin],
              ["PAN", company.pan],
              ["TAN", company.tan],
              ["MSME", [company.msmeNo, company.msmeCategory].filter(Boolean).join(" / ")],
              ["TDS", company.tdsAvailable ? [company.tdsSection, company.tdsRatePercent && `${company.tdsRatePercent}%`].filter(Boolean).join(" / ") : "No"],
              ["TCS", company.tcsAvailable ? [company.tcsSection, company.tcsRatePercent && `${company.tcsRatePercent}%`].filter(Boolean).join(" / ") : "No"],
            ]}
          />
        </CompanyShowCard>
        <SubTable title="Addresses" rows={company.addresses.map((address) => [address.addressLine1, [labels.addressTypes(address.addressTypeId), labels.cities(address.cityId), labels.districts(address.districtId), labels.states(address.stateId), labels.countries(address.countryId), labels.pincodes(address.pincodeId)].filter(Boolean).join(", "), address.isDefault ? "Default" : ""])} />
        <SubTable title="Bank accounts" rows={company.bankAccounts.map((bank) => [labels.bankNames(bank.bankName), bank.accountNumber, bank.ifsc])} />
        <SubTable title="Emails" rows={company.emails.map((email) => [email.email, email.emailType, email.isActive ? "Active" : "Disabled"])} />
        <SubTable title="Phones" rows={company.phones.map((phone) => [phone.phoneNumber, phone.phoneType, phone.isPrimary ? "Primary" : ""])} />
        <SubTable title="Social links" rows={company.socialLinks.map((link) => [link.platform, link.url, link.isActive ? "Active" : "Disabled"])} />
      </div>
    </MasterListPageFrame>
  )
}

function CompanyUpsertPage({
  company,
  industries,
  onBack,
  onSubmit,
  session,
}: {
  company: CompanyRecord | null
  industries: IndustryRecord[]
  onBack(): void
  onSubmit(input: CompanyUpsertInput): Promise<void>
  session: AuthSession
}) {
  const [form, setForm] = useState<CompanyUpsertInput>(emptyCompany())
  const [tab, setTab] = useState<FormTab>("identity")
  const [isSaving, setIsSaving] = useState(false)
  const [logoPickerType, setLogoPickerType] = useState<string | null>(null)
  const isEdit = Boolean(company)

  useEffect(() => {
    setForm(company ? toCompanyInput(company) : emptyCompany())
    setTab("identity")
  }, [company])

  async function submit() {
    if (!form.name.trim()) {
      toast.error("Company name is required")
      return
    }

    setIsSaving(true)
    try {
      await onSubmit(withDerivedCompanyContactFields({
        ...form,
        logos: stableCompanyLogoSet(session.selectedTenant.slug),
        status: form.isActive ? "active" : "suspend",
      }))
    } catch (error) {
      toast.error("Company save failed", {
        description: error instanceof Error ? error.message : "Unable to save company.",
      })
    } finally {
      setIsSaving(false)
    }
  }

  function selectLogoFromMedia(_asset: MediaAsset) {
    if (!logoPickerType) return
    setFormField(setForm, "logos", updateLogoVariantUrl(form.logos, logoPickerType, buildLogoStoragePath(defaultLogoFileName(logoPickerType), session.selectedTenant.slug)))
    setLogoPickerType(null)
  }

  return (
    <MasterListPageFrame
      title={isEdit ? "Edit company" : "New company"}
      description={isEdit ? "Update company code, identity, tenant, industry, and active status." : "Create a tenant and industry specific company record."}
      technicalName="page.company.upsert"
      action={
        <Button type="button" variant="outline" onClick={onBack} className="h-10 rounded-md px-4">
          <X className="size-4" />
          Cancel
        </Button>
      }
    >
      <MasterListUpsertLayout>
        <MasterListUpsertCard className="overflow-hidden p-0 [&>div]:p-0">
          <form
            onSubmit={(event) => {
              event.preventDefault()
              event.stopPropagation()
              void submit()
            }}
          >
            <AnimatedTabs
              className="[&>div:first-child]:rounded-none [&>div:first-child]:border-x-0 [&>div:first-child]:border-t-0 [&>div:first-child]:border-b [&>div:first-child]:border-border/70 [&>div:first-child]:bg-card [&>div:first-child]:px-4 [&>div:first-child]:py-0.5 [&>div:first-child]:shadow-none md:[&>div:first-child]:px-6 [&>div:first-child_button]:min-h-8 [&>div:first-child_button]:py-1 [&>div:last-child]:mx-auto [&>div:last-child]:mt-6 [&>div:last-child]:w-full [&>div:last-child]:px-4 [&>div:last-child]:pb-4 md:[&>div:last-child]:px-6"
              value={tab}
              onValueChange={(value) => setTab(value as FormTab)}
              tabs={buildCompanyUpsertTabs({ company, form, industries, onLogoPick: setLogoPickerType, session, setForm })}
            />
            <div className="flex flex-wrap items-center gap-3 border-t border-border/70 bg-muted/20 px-4 py-4 md:px-6">
              <Button type="submit" disabled={isSaving} className="h-10 rounded-md px-5">
                <Save className={cn("size-4", isSaving && "animate-spin")} />
                {isEdit ? "Update company" : "Create company"}
              </Button>
              <Button type="button" variant="outline" onClick={onBack} className="h-10 rounded-md px-5">
                <X className="size-4" />
                Cancel
              </Button>
            </div>
          </form>
        </MasterListUpsertCard>
      </MasterListUpsertLayout>
      <MediaPickerDialog
        accept="image/svg+xml,.svg"
        fixedFolder
        folder="logo"
        onOpenChange={(open) => setLogoPickerType(open ? logoPickerType : null)}
        onSelect={selectLogoFromMedia}
        open={Boolean(logoPickerType)}
        session={session}
        title="Choose company logo"
        uploadFileName={logoPickerType ? defaultLogoFileName(logoPickerType) : undefined}
        uploadVisibility="public"
      />
    </MasterListPageFrame>
  )
}

function buildCompanyUpsertTabs({
  company,
  form,
  industries,
  onLogoPick,
  session,
  setForm,
}: {
  company: CompanyRecord | null
  form: CompanyUpsertInput
  industries: IndustryRecord[]
  onLogoPick(logoType: string): void
  session: AuthSession
  setForm: Dispatch<SetStateAction<CompanyUpsertInput>>
}) {
  return [
    {
      value: "identity",
      label: "Details",
      content: (
        <div className="space-y-5">
          <div className="grid gap-x-6 gap-y-5 md:grid-cols-2">
            <TextField label="Company name" value={form.name} onChange={(value) => setFormField(setForm, "name", value)} />
            <TextField label="Legal name" value={form.legalName} onChange={(value) => setFormField(setForm, "legalName", value)} />
            <TextField label="Company code" value={form.code} inputClassName="font-mono uppercase" onChange={(value) => setFormField(setForm, "code", normalizeCode(value))} />
            <div className="hidden md:block" />
            <div className="md:col-span-2 h-1" />
            <ReadOnlyField label="Tenant" value={company?.tenantName ?? "Current tenant"} />
            <IndustrySelectField industries={industries} value={form.industryId} onChange={(industryId) => setFormField(setForm, "industryId", industryId)} />
            <TextField label="Tagline" value={form.tagline} onChange={(value) => setFormField(setForm, "tagline", value)} className="md:col-span-2" />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <SwitchRow checked={form.isPrimary} label="Primary" description="Primary company is used for shared suite context." onChange={(checked) => setFormField(setForm, "isPrimary", checked)} />
            <SwitchRow checked={form.isActive} label="Active" onChange={(checked) => setForm((current) => ({ ...current, isActive: checked, status: checked ? "active" : "suspend" }))} />
          </div>
        </div>
      ),
    },
    {
      value: "registration",
      label: "Communication",
      content: (
        <div className="space-y-5">
          <CollectionCard title="Company Emails" actionLabel="Add" onAdd={() => setFormField(setForm, "emails", [...form.emails, { email: "", emailType: "primary", isPrimary: form.emails.length === 0, isActive: true }])}>
            <EditableCollection rows={form.emails} onRemove={(index) => setFormField(setForm, "emails", form.emails.filter((_, itemIndex) => itemIndex !== index))} render={(email, index) => (
              <CompanyEmailRow email={email} index={index} setForm={setForm} form={form} />
            )} />
          </CollectionCard>
          <CollectionCard title="Company Phones" actionLabel="Add" onAdd={() => setFormField(setForm, "phones", [...form.phones, { phoneNumber: "", phoneType: "mobile", isPrimary: form.phones.length === 0, isActive: true }])}>
            <EditableCollection rows={form.phones} onRemove={(index) => setFormField(setForm, "phones", form.phones.filter((_, itemIndex) => itemIndex !== index))} render={(phone, index) => (
              <CompanyPhoneRow form={form} index={index} phone={phone} setForm={setForm} />
            )} />
          </CollectionCard>
          <CollectionCard title="Social Links" description="Public brand links used in profile and storefront surfaces." actionLabel="Add" onAdd={() => setFormField(setForm, "socialLinks", [...form.socialLinks, { platform: "", url: "", isActive: true }])}>
            <EditableCollection rows={form.socialLinks} onRemove={(index) => setFormField(setForm, "socialLinks", form.socialLinks.filter((_, itemIndex) => itemIndex !== index))} render={(link, index) => (
              <>
                <TextField label="Platform" value={link.platform} onChange={(value) => setFormField(setForm, "socialLinks", form.socialLinks.map((item, itemIndex) => (itemIndex === index ? { ...item, platform: value } : item)))} />
                <TextField label="URL" value={link.url} onChange={(value) => setFormField(setForm, "socialLinks", form.socialLinks.map((item, itemIndex) => (itemIndex === index ? { ...item, url: value } : item)))} />
              </>
            )} />
          </CollectionCard>
          <div className="grid gap-5 md:grid-cols-2">
            <TextField label="Website" value={form.website} onChange={(value) => setFormField(setForm, "website", value)} />
          </div>
        </div>
      ),
    },
    {
      value: "logos",
      label: "Logos",
      content: (
        <div className="space-y-5">
          <div className="grid gap-x-6 gap-y-5 md:grid-cols-2">
            {companyLogoVariants.map((variant) => (
              <FieldShell key={variant.type} label={variant.label}>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Input className="h-11 rounded-xl font-mono text-xs" readOnly value={buildLogoStoragePath(defaultCompanyLogoFileNames[variant.type], session.selectedTenant.slug)} />
                    <Button type="button" variant="outline" className="h-11 rounded-xl px-3" onClick={() => onLogoPick(variant.type)}>
                      <ImagePlus className="size-4" />
                      Upload
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">Stored in `{companyLogoBasePath}` as {defaultCompanyLogoFileNames[variant.type]}.</p>
                </div>
              </FieldShell>
            ))}
          </div>
        </div>
      ),
    },
    {
      value: "tax",
      label: "Tax Details",
      content: (
        <div className="space-y-5">
          <div className="grid gap-x-6 gap-y-5 md:grid-cols-2">
            <TextField label="GSTIN / UIN" value={form.gstinUin} onChange={(value) => setFormField(setForm, "gstinUin", value)} />
            <TextField label="PAN" value={form.pan} onChange={(value) => setFormField(setForm, "pan", value)} />
            <TextField label="MSME No" value={form.msmeNo} onChange={(value) => setFormField(setForm, "msmeNo", value)} />
            <TextField label="MSME Category" value={form.msmeCategory} onChange={(value) => setFormField(setForm, "msmeCategory", value)} />
            <TextField label="Date of incorporation" type="date" value={dateInputValue(form.dateOfIncorporation)} onChange={(value) => setFormField(setForm, "dateOfIncorporation", value)} />
          </div>
          <SwitchRow checked={form.tdsAvailable} label="TDS Available" description="Enable when this company has TDS applicability details." onChange={(checked) => setFormField(setForm, "tdsAvailable", checked)} />
          <TextField label="TAN No" value={form.tan} onChange={(value) => setFormField(setForm, "tan", value)} />
          <div className="grid gap-x-6 gap-y-5 md:grid-cols-2">
            <TextField label="TDS Section" value={form.tdsSection} onChange={(value) => setFormField(setForm, "tdsSection", value)} />
            <TextField label="TDS Rate %" type="number" value={form.tdsRatePercent ?? ""} onChange={(value) => setFormField(setForm, "tdsRatePercent", numberValue(value))} />
          </div>
          <SwitchRow checked={form.tcsAvailable} label="TCS Available" description="Enable when this company has TCS collection applicability." onChange={(checked) => setFormField(setForm, "tcsAvailable", checked)} />
          <div className="grid gap-x-6 gap-y-5 md:grid-cols-2">
            <TextField label="TCS Section" value={form.tcsSection} onChange={(value) => setFormField(setForm, "tcsSection", value)} />
            <TextField label="TCS Rate %" type="number" value={form.tcsRatePercent ?? ""} onChange={(value) => setFormField(setForm, "tcsRatePercent", numberValue(value))} />
          </div>
        </div>
      ),
    },
    {
      value: "accounts",
      label: "Accounts",
      content: (
        <CollectionCard title="Company Bank Accounts" description="Bank accounts used for receipts and payments." actionLabel="Add" onAdd={() => setFormField(setForm, "bankAccounts", [...form.bankAccounts, { ...emptyBank(), accountHolderName: form.legalName || form.name, isPrimary: form.bankAccounts.length === 0 }])}>
          <EditableCollection rows={form.bankAccounts} gridClassName="md:grid-cols-2" onRemove={(index) => setFormField(setForm, "bankAccounts", form.bankAccounts.filter((_, itemIndex) => itemIndex !== index))} render={(bankAccount, index) => (
            <>
              <CommonRecordAutocompleteLookup label="Bank name" moduleKey="bankNames" session={session} value={bankAccount.bankName} onChange={(_, record) => setFormField(setForm, "bankAccounts", form.bankAccounts.map((item, itemIndex) => (itemIndex === index ? { ...item, bankName: record ? getCommonRecordName(record) : "" } : item)))} />
              <TextField label="Account number" value={bankAccount.accountNumber} onChange={(value) => setFormField(setForm, "bankAccounts", form.bankAccounts.map((item, itemIndex) => (itemIndex === index ? { ...item, accountNumber: value } : item)))} />
              <TextField label="Account holder name" value={bankAccount.accountHolderName} onChange={(value) => setFormField(setForm, "bankAccounts", form.bankAccounts.map((item, itemIndex) => (itemIndex === index ? { ...item, accountHolderName: value } : item)))} />
              <TextField label="IFSC" value={bankAccount.ifsc} inputClassName="uppercase" onChange={(value) => setFormField(setForm, "bankAccounts", form.bankAccounts.map((item, itemIndex) => (itemIndex === index ? { ...item, ifsc: value.toUpperCase() } : item)))} />
              <TextField label="Branch" value={bankAccount.branch} onChange={(value) => setFormField(setForm, "bankAccounts", form.bankAccounts.map((item, itemIndex) => (itemIndex === index ? { ...item, branch: value || null } : item)))} />
              <TextField label="QR image" value={bankAccount.qrImageUrl} onChange={(value) => setFormField(setForm, "bankAccounts", form.bankAccounts.map((item, itemIndex) => (itemIndex === index ? { ...item, qrImageUrl: value || null } : item)))} />
              <SwitchRow checked={bankAccount.isPrimary} label="Primary bank" description="First choice in receipts and payments." onChange={(checked) => setFormField(setForm, "bankAccounts", form.bankAccounts.map((item, itemIndex) => ({ ...item, isPrimary: itemIndex === index ? checked : false })))} />
            </>
          )} />
        </CollectionCard>
      ),
    },
    {
      value: "addressing",
      label: "Addressing",
      content: (
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-4">
            <h3 className="text-base font-semibold text-foreground">Address Book</h3>
            <Button type="button" variant="outline" className="h-8 rounded-lg px-3" onClick={() => setFormField(setForm, "addresses", [...form.addresses, { ...emptyAddress(), isDefault: form.addresses.length === 0 }])}>
              <Plus className="size-4" />
              Add
            </Button>
          </div>
          <EditableCollection rows={form.addresses} gridClassName="md:grid-cols-2" onRemove={(index) => setFormField(setForm, "addresses", form.addresses.filter((_, itemIndex) => itemIndex !== index))} render={(address, index) => (
            <>
              <CommonRecordAutocompleteLookup className="md:col-span-2" label="Address Type" moduleKey="addressTypes" session={session} value={address.addressTypeId} onChange={(value) => setFormField(setForm, "addresses", form.addresses.map((item, itemIndex) => (itemIndex === index ? { ...item, addressTypeId: value === null ? null : String(value) } : item)))} />
              <TextField label="Address" value={address.addressLine1} onChange={(value) => setFormField(setForm, "addresses", form.addresses.map((item, itemIndex) => (itemIndex === index ? { ...item, addressLine1: value } : item)))} />
              <TextField label="Area / Location" value={address.addressLine2} onChange={(value) => setFormField(setForm, "addresses", form.addresses.map((item, itemIndex) => (itemIndex === index ? { ...item, addressLine2: value || null } : item)))} />
              <CountryAutocompleteLookup session={session} value={address.countryId} onChange={(value) => setFormField(setForm, "addresses", form.addresses.map((item, itemIndex) => (itemIndex === index ? { ...item, countryId: value === null ? null : String(value), stateId: null, districtId: null, cityId: null, pincodeId: null } : item)))} />
              <StateAutocompleteLookup countryId={address.countryId} session={session} value={address.stateId} onChange={(value) => setFormField(setForm, "addresses", form.addresses.map((item, itemIndex) => (itemIndex === index ? { ...item, stateId: value === null ? null : String(value), districtId: null, cityId: null, pincodeId: null } : item)))} />
              <DistrictAutocompleteLookup session={session} stateId={address.stateId} value={address.districtId} onChange={(value) => setFormField(setForm, "addresses", form.addresses.map((item, itemIndex) => (itemIndex === index ? { ...item, districtId: value === null ? null : String(value), cityId: null, pincodeId: null } : item)))} />
              <CityAutocompleteLookup districtId={address.districtId} session={session} value={address.cityId} onChange={(value) => setFormField(setForm, "addresses", form.addresses.map((item, itemIndex) => (itemIndex === index ? { ...item, cityId: value === null ? null : String(value), pincodeId: null } : item)))} />
              <CommonRecordAutocompleteLookup label="Pincode" moduleKey="pincodes" optionFilter={(record) => matchesReference(record.city_id, address.cityId)} placeholder="Search pincode" session={session} value={address.pincodeId} onChange={(value) => setFormField(setForm, "addresses", form.addresses.map((item, itemIndex) => (itemIndex === index ? { ...item, pincodeId: value === null ? null : String(value) } : item)))} />
              <SwitchField checked={address.isDefault} label="Default address" onChange={(isDefault) => setFormField(setForm, "addresses", form.addresses.map((item, itemIndex) => ({ ...item, isDefault: itemIndex === index ? isDefault : false })))} />
              <SwitchField checked={address.isActive} label="Active" onChange={(isActive) => setFormField(setForm, "addresses", form.addresses.map((item, itemIndex) => (itemIndex === index ? { ...item, isActive } : item)))} />
            </>
          )} />
        </div>
      ),
    },
    {
      value: "notes",
      label: "Notes",
      content: (
        <div className="space-y-5">
          <TextField label="Short about" value={form.shortAbout} onChange={(value) => setFormField(setForm, "shortAbout", value)} />
          <TextField label="Description" value={form.description} onChange={(value) => setFormField(setForm, "description", value)} />
        </div>
      ),
    },
  ] as const
}

function CompanyActions({
  company,
  onDestroy,
  onEdit,
  onRestore,
  onView,
}: {
  company: CompanyRecord
  onDestroy(company: CompanyRecord): void
  onEdit(company: CompanyRecord): void
  onRestore(company: CompanyRecord): void
  onView(company: CompanyRecord): void
}) {
  return (
    <MasterListRowActions
      title={company.name}
      isSuspended={company.status === "suspend"}
      onDelete={() => onDestroy(company)}
      onEdit={() => onEdit(company)}
      onRestore={() => onRestore(company)}
      onView={() => onView(company)}
    />
  )
}

function FieldShell({ children, className, label }: { children: ReactNode; className?: string; label: string }) {
  return (
    <div className={cn("grid gap-2", className)}>
      <Label className="text-sm font-medium">{label}</Label>
      {children}
    </div>
  )
}

function CollectionCard({
  actionLabel,
  children,
  description,
  onAdd,
  title,
}: {
  actionLabel: string
  children: ReactNode
  description?: string
  onAdd(): void
  title: string
}) {
  return (
    <section className="rounded-xl border border-border/70 bg-card/80 p-3 shadow-sm md:p-4">
      <div className="mb-3 flex items-start justify-between gap-4">
        <div>
          <h3 className="text-base font-semibold text-foreground">{title}</h3>
          {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
        </div>
        <Button type="button" variant="outline" className="h-8 rounded-lg px-3" onClick={onAdd}>
          <Plus className="size-4" />
          {actionLabel}
        </Button>
      </div>
      {children}
    </section>
  )
}

function EditableCollection<T>({
  gridClassName = "md:grid-cols-[1fr_1fr_auto]",
  onRemove,
  render,
  rows,
}: {
  gridClassName?: string
  onRemove(index: number): void
  render(row: T, index: number): ReactNode
  rows: T[]
}) {
  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">No rows added.</p>
  }

  return (
    <div className="space-y-4">
      {rows.map((row, index) => (
        <div key={index} className="relative rounded-2xl border border-border/70 bg-background/65 p-4 pr-14">
          <Button type="button" size="icon" variant="outline" className="absolute right-4 top-[54px] size-8 rounded-lg" onClick={() => onRemove(index)} aria-label="Remove row">
              <Trash2 className="size-4" />
          </Button>
          <div className={cn("grid items-end gap-x-6 gap-y-5", gridClassName)}>{render(row, index)}</div>
        </div>
      ))}
    </div>
  )
}

function TextField({
  className,
  inputClassName,
  label,
  onChange,
  type = "text",
  value,
}: {
  className?: string
  inputClassName?: string
  label: string
  type?: string
  value: string | number | null
  onChange(value: string): void
}) {
  return (
    <FieldShell label={label} className={className}>
      <Input className={cn("h-11 rounded-xl", inputClassName)} type={type} value={value ?? ""} onChange={(event) => onChange(event.target.value)} />
    </FieldShell>
  )
}

function EnumSelectField<TValue extends string>({
  label,
  onChange,
  options,
  value,
}: {
  label: string
  onChange(value: TValue): void
  options: readonly TValue[]
  value: TValue
}) {
  return (
    <FieldShell label={label}>
      <Select value={value} onValueChange={(nextValue) => onChange(nextValue as TValue)}>
        <SelectTrigger className="h-11 min-h-11 w-full rounded-xl border-input bg-background px-3 text-left font-normal leading-none">
          <SelectValue />
        </SelectTrigger>
        <SelectContent align="start" position="popper" sideOffset={4} className="z-[130] w-[var(--radix-select-trigger-width)] rounded-xl p-1">
          {options.map((option) => <SelectItem key={option} value={option} className="h-8 rounded-lg px-2 pr-8">{labelizeEnum(option)}</SelectItem>)}
        </SelectContent>
      </Select>
    </FieldShell>
  )
}

function IndustrySelectField({
  industries,
  onChange,
  value,
}: {
  industries: IndustryRecord[]
  onChange(value: number | null): void
  value: number | null | undefined
}) {
  return (
    <FieldShell label="Industry">
      <Select value={value ? String(value) : "none"} onValueChange={(nextValue) => onChange(nextValue === "none" ? null : Number(nextValue))}>
        <SelectTrigger className="h-11 min-h-11 w-full rounded-xl border-input bg-background px-3 text-left font-normal leading-none">
          <SelectValue placeholder="Select industry" />
        </SelectTrigger>
        <SelectContent align="start" position="popper" sideOffset={4} className="z-[130] w-[var(--radix-select-trigger-width)] rounded-xl p-1">
          <SelectItem value="none" className="h-8 rounded-lg px-2 pr-8">Not classified</SelectItem>
          {industries.map((industry) => (
            <SelectItem key={industry.id} value={String(industry.id)} className="h-8 rounded-lg px-2 pr-8">
              {industry.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </FieldShell>
  )
}

function CompanyEmailRow({ email, form, index, setForm }: { email: CompanyEmail; form: CompanyUpsertInput; index: number; setForm: Dispatch<SetStateAction<CompanyUpsertInput>> }) {
  return (
    <>
      <TextField label="Email" value={email.email} onChange={(value) => setFormField(setForm, "emails", updateCompanyEmail(form.emails, index, { email: value }))} />
      <EnumSelectField<CompanyEmailType> label="Email type" options={companyEmailTypes} value={companyEmailType(email.emailType)} onChange={(emailType) => setFormField(setForm, "emails", updateCompanyEmail(form.emails, index, { emailType }))} />
      <SwitchField checked={Boolean(email.isPrimary) || email.emailType === "primary"} label="Primary" onChange={(isPrimary) => setFormField(setForm, "emails", form.emails.map((item, itemIndex) => ({ ...item, isPrimary: itemIndex === index ? isPrimary : false, emailType: itemIndex === index && isPrimary ? "primary" : item.emailType === "primary" ? "work" : item.emailType })))} />
    </>
  )
}

function CompanyPhoneRow({ form, index, phone, setForm }: { form: CompanyUpsertInput; index: number; phone: CompanyPhone; setForm: Dispatch<SetStateAction<CompanyUpsertInput>> }) {
  return (
    <>
      <TextField label="Phone" value={phone.phoneNumber} onChange={(value) => setFormField(setForm, "phones", updateCompanyPhone(form.phones, index, { phoneNumber: value }))} />
      <EnumSelectField<CompanyPhoneType> label="Phone type" options={companyPhoneTypes} value={companyPhoneType(phone.phoneType)} onChange={(phoneType) => setFormField(setForm, "phones", updateCompanyPhone(form.phones, index, { phoneType }))} />
      <SwitchField checked={phone.isPrimary} label="Primary" onChange={(isPrimary) => setFormField(setForm, "phones", form.phones.map((item, itemIndex) => ({ ...item, isPrimary: itemIndex === index ? isPrimary : false })))} />
    </>
  )
}

function SwitchField({ checked, label, onChange }: { checked: boolean; label: string; onChange(value: boolean): void }) {
  return <div className="grid gap-2"><span aria-hidden className="h-5" /><SwitchRow checked={checked} label={label} onChange={onChange} /></div>
}

function ReadOnlyField({ label, value }: { label: string; value: ReactNode }) {
  return (
    <FieldShell label={label}>
      <div className="flex h-11 items-center rounded-xl border border-border/70 bg-muted/30 px-3 text-sm text-muted-foreground">
        {value}
      </div>
    </FieldShell>
  )
}

function SwitchRow({
  checked,
  description,
  label,
  onChange,
}: {
  checked: boolean
  description?: string
  label: string
  onChange(checked: boolean): void
}) {
  return (
    <label className={cn("flex cursor-pointer items-center justify-between gap-4 rounded-xl border px-4 py-3", checked ? "border-emerald-200 bg-emerald-50 text-emerald-950" : "border-border/70 bg-muted/10")}>
        <span>
        <span className="flex items-center gap-1.5 text-sm font-medium">
          {checked ? <CheckCircle2 className="size-3.5 text-emerald-600" /> : null}
          {label}
        </span>
        {description ? <span className={cn("block text-xs", checked ? "text-emerald-700" : "text-muted-foreground")}>{description}</span> : null}
      </span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </label>
  )
}

function StatusBadge({ company }: { company: CompanyRecord }) {
  const active = company.status !== "suspend" && company.isActive
  return (
    <Badge variant="outline" className={cn("h-6 gap-1 rounded-md px-2 text-[11px]", active ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-50 text-slate-500")}>
      {active ? <CheckCircle2 className="size-3" /> : null}
      {active ? "Active" : "Suspended"}
    </Badge>
  )
}

function CompanyStatusToggle({
  company,
  onDestroy,
  onRestore,
}: {
  company: CompanyRecord
  onDestroy(company: CompanyRecord): void
  onRestore(company: CompanyRecord): void
}) {
  const active = company.status !== "suspend" && company.isActive

  return (
    <Button
      aria-label={active ? `Suspend ${company.name}` : `Restore ${company.name}`}
      className={cn(
        "h-6 rounded-md border px-2 text-[11px] font-medium shadow-none",
        active
          ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
          : "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100",
      )}
      onClick={() => active ? onDestroy(company) : onRestore(company)}
      title={active ? "Active. Click to suspend this company." : "Suspended. Click to restore this company."}
      type="button"
      variant="outline"
    >
      {active ? <CheckCircle2 className="size-3" /> : <RotateCcw className="size-3" />}
      {active ? "Active" : "Restore"}
    </Button>
  )
}

function ListHeader({ children, className }: { children: ReactNode; className?: string }) {
  return <th className={cn("border-b border-border/70 px-4 py-2.5 text-left font-medium text-foreground", className)}>{children}</th>
}

function DetailTable({ rows }: { rows: Array<[string, ReactNode]> }) {
  return (
    <div className="-mx-5 -mb-5 -mt-5 overflow-hidden rounded-b-md border-t border-border/70">
      <table className="w-full border-collapse text-sm">
        <tbody>
          {rows.map(([label, value]) => (
            <tr key={label} className="border-b border-border/60 last:border-b-0">
              <th className="w-44 border-r border-border/70 bg-muted/35 px-3 py-2.5 text-left align-top text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</th>
              <td className="px-3 py-2.5 align-top font-medium text-foreground">{value || "Not set"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function SubTable({ rows, title }: { title: string; rows: Array<Array<ReactNode>> }) {
  return (
    <CompanyShowCard title={title}>
      {rows.length ? (
        <div className="-mx-5 -mb-5 -mt-5 overflow-hidden rounded-b-md border-t border-border/70">
          <table className="w-full border-collapse text-sm">
            <tbody>
              {rows.map((row, index) => (
                <tr key={index} className="border-b border-border/60 last:border-b-0">
                  {row.map((cell, cellIndex) => (
                    <td key={cellIndex} className={cn("px-3 py-2.5 align-top text-muted-foreground", cellIndex === 0 && "border-r border-border/70 bg-muted/35 font-medium text-foreground")}>{cell || "Not set"}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="-mx-5 -mb-5 -mt-5 border-t border-border/70 px-3 py-8 text-center text-sm text-muted-foreground">No rows added.</div>
      )}
    </CompanyShowCard>
  )
}

function CompanyShowCard({ children, title }: { children: ReactNode; title: string }) {
  return <MasterListShowCard title={title} className="gap-0 py-0 [&>div:first-child]:px-4 [&>div:first-child]:py-3">{children}</MasterListShowCard>
}

function setFormField<K extends keyof CompanyUpsertInput>(
  setForm: Dispatch<SetStateAction<CompanyUpsertInput>>,
  key: K,
  value: CompanyUpsertInput[K],
) {
  setForm((current) => ({ ...current, [key]: value }))
}

function withDerivedCompanyContactFields(input: CompanyUpsertInput): CompanyUpsertInput {
  const primaryEmail = input.emails.find((email) => email.isActive && (email.isPrimary || email.emailType === "primary")) ?? input.emails.find((email) => email.isActive) ?? input.emails[0]
  const primaryPhone = input.phones.find((phone) => phone.isActive && phone.isPrimary) ?? input.phones.find((phone) => phone.isActive) ?? input.phones[0]
  return {
    ...input,
    emails: input.emails.map((email) => ({ ...email, emailType: companyEmailType(email.emailType), isActive: email.isActive ?? true })),
    phones: input.phones.map((phone) => ({ ...phone, phoneType: companyPhoneType(phone.phoneType), isActive: phone.isActive ?? true })),
    primaryEmail: primaryEmail?.email?.trim() || input.primaryEmail,
    primaryPhone: primaryPhone?.phoneNumber?.trim() || input.primaryPhone,
  }
}

function updateCompanyEmail(emails: CompanyEmail[], index: number, patch: Partial<CompanyEmail>) {
  return emails.map((email, itemIndex) => (itemIndex === index ? { ...email, ...patch } : email))
}

function updateCompanyPhone(phones: CompanyPhone[], index: number, patch: Partial<CompanyPhone>) {
  return phones.map((phone, itemIndex) => (itemIndex === index ? { ...phone, ...patch } : phone))
}

function companyEmailType(value: string): CompanyEmailType {
  const normalized = value.trim().toLowerCase()
  return companyEmailTypes.includes(normalized as CompanyEmailType) ? normalized as CompanyEmailType : "primary"
}

function companyPhoneType(value: string): CompanyPhoneType {
  const normalized = value.trim().toLowerCase()
  return companyPhoneTypes.includes(normalized as CompanyPhoneType) ? normalized as CompanyPhoneType : "mobile"
}

function labelizeEnum(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function updateLogoVariantUrl(
  logos: readonly CompanyUpsertInput["logos"][number][],
  logoType: string,
  logoUrl: string,
) {
  const normalizedType = normalizeLogoType(logoType)
  const nextLogo = { logoType, logoUrl, isActive: true }
  const hasExistingLogo = logos.some((logo) => normalizeLogoType(logo.logoType) === normalizedType)

  if (!hasExistingLogo) return [...logos, nextLogo]

  return logos.map((logo) => (normalizeLogoType(logo.logoType) === normalizedType ? nextLogo : logo))
}

function stableCompanyLogoSet(tenantSlug: string) {
  return companyLogoVariants.map((variant) => ({
    logoType: variant.type,
    logoUrl: buildLogoStoragePath(defaultCompanyLogoFileNames[variant.type], tenantSlug),
    isActive: true,
  }))
}

function buildLogoStoragePath(fileName: string, tenantSlug: string) {
  return `/storage/${tenantSlug}/public/logo/${trimLogoStoragePath(fileName)}`
}

function trimLogoStoragePath(value: string | null | undefined) {
  const trimmedValue = value?.trim() ?? ""
  if (!trimmedValue) return ""
  return trimmedValue
    .replace(/^https?:\/\/[^/]+/i, "")
    .replace(/^\/?storage\/[^/]+\/public\/logo\//i, "")
    .replace(/^\/?storage\/logo\//i, "")
    .replace(/^\/?storage\//i, "")
    .replace(/^\/?logo\//i, "")
    .replace(/^\/+/, "")
}

function defaultLogoFileName(logoType: string) {
  const normalizedType = normalizeLogoType(logoType) as keyof typeof defaultCompanyLogoFileNames
  return defaultCompanyLogoFileNames[normalizedType] ?? "logo.svg"
}

function normalizeLogoType(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, "-")
}

function emptyAddress(): CompanyAddress {
  return {
    addressTypeId: "billing",
    addressLine1: "",
    addressLine2: null,
    cityId: null,
    districtId: null,
    stateId: null,
    countryId: null,
    pincodeId: null,
    latitude: null,
    longitude: null,
    isDefault: false,
    isActive: true,
  }
}

function emptyBank(): CompanyBankAccount {
  return {
    bankName: "",
    accountNumber: "",
    accountHolderName: "",
    ifsc: "",
    branch: null,
    qrImageUrl: null,
    isPrimary: false,
    isActive: true,
  }
}

function columnLabel(column: CompanyColumnId) {
  return ({ code: "Code", name: "Company", tenant: "Tenant", industry: "Industry", status: "Status", updated: "Updated" })[column]
}

function normalizeCode(value: string) {
  return value.toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/^_+/, "")
}

function numberValue(value: string) {
  const parsed = Number(value)
  return Number.isFinite(parsed) && value !== "" ? parsed : null
}

function dateInputValue(value: string | null) {
  return value ? value.slice(0, 10) : ""
}

function formatDate(value: string | null) {
  if (!value) return "Not set"
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value))
}

function matchesReference(recordValue: unknown, selectedValue: unknown) {
  return selectedValue === null || selectedValue === undefined || selectedValue === "" || String(recordValue) === String(selectedValue)
}

function useCommonRecordLabels(session: AuthSession) {
  const modules = ["addressTypes", "bankNames", "countries", "states", "districts", "cities", "pincodes"] as const
  const queries = modules.map((moduleKey) => useQuery({ queryKey: ["common-labels", session.selectedTenant.slug, moduleKey], queryFn: () => listMasterDataRecords(session, moduleKey) }))
  const maps = Object.fromEntries(modules.map((moduleKey, index) => [moduleKey, buildLabelMap(queries[index].data ?? [])])) as Record<(typeof modules)[number], Map<string, string>>

  return {
    addressTypes: (value: unknown) => labelFrom(maps.addressTypes, value),
    bankNames: (value: unknown) => labelFrom(maps.bankNames, value),
    cities: (value: unknown) => labelFrom(maps.cities, value),
    countries: (value: unknown) => labelFrom(maps.countries, value),
    districts: (value: unknown) => labelFrom(maps.districts, value),
    pincodes: (value: unknown) => labelFrom(maps.pincodes, value),
    states: (value: unknown) => labelFrom(maps.states, value),
  }
}

function buildLabelMap(records: MasterDataRecord[]) {
  const map = new Map<string, string>()
  for (const record of records) {
    const label = getCommonRecordName(record)
    for (const key of [record.id, record.uuid, record.name, record.code]) {
      if (key !== null && key !== undefined && key !== "") map.set(String(key), label)
    }
  }
  return map
}

function labelFrom(map: ReadonlyMap<string, string>, value: unknown) {
  if (value === null || value === undefined || value === "") return ""
  return map.get(String(value)) ?? String(value)
}
