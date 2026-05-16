import { useEffect, useMemo, useState, type ReactNode } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { AlertCircle, ArrowLeft, Check, CheckCircle2, ChevronDown, Mail, MapPin, Pencil, Phone, Plus, RefreshCw, RotateCw, Save, Trash2, X } from "lucide-react"
import { AnimatedTabs } from "src/components/ui/animated-tabs"
import { Badge } from "src/components/ui/badge"
import { Button } from "src/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "src/components/ui/card"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "src/components/ui/dropdown-menu"
import { Input } from "src/components/ui/input"
import { Label } from "src/components/ui/label"
import { Switch } from "src/components/ui/switch"
import { Textarea } from "src/components/ui/textarea"
import {
  MasterListEmptyState,
  MasterListPageFrame,
  MasterListPaginationCard,
  MasterListRowActions,
  MasterListTableCard,
  MasterListToolbarCard,
  MasterListUpsertCard,
  MasterListUpsertLayout,
  buildMasterListShowingLabel,
} from "src/components/blocks/lists/master-list"
import { cn } from "src/lib/utils"
import type { AuthSession } from "src/features/auth/auth-client"
import { destroyContact, emptyAddress, emptyContact, listContacts, restoreContact, upsertContact, type ContactAddress, type ContactBankAccount, type ContactEmail, type ContactGstDetail, type ContactInput, type ContactPhone, type ContactRecord, type ContactSocialLink } from "./contact-client"

type ContactView = { mode: "list" } | { mode: "show"; contact: ContactRecord } | { mode: "upsert"; contact: ContactRecord | null }

const contactTypeOptions = [
  { value: "contact-type:customer", label: "Customer", ledgerId: "ledger:sundry-debitors", ledgerName: "Customer" },
  { value: "contact-type:supplier", label: "Supplier", ledgerId: "ledger:sundry-creditors", ledgerName: "Supplier" },
  { value: "contact-type:vendor-customer", label: "Vendor Customer", ledgerId: "ledger:vendor-customer", ledgerName: "Vendor Customer" },
  { value: "contact-type:staff", label: "Staff", ledgerId: "ledger:indirect-expenses", ledgerName: "Indirect Expenses" },
]

const msmeOptions = [{ value: "micro", label: "Micro" }, { value: "small", label: "Small" }, { value: "medium", label: "Medium" }]
const contactStatusFilters = [
  { id: "all", label: "All contacts" },
  { id: "active", label: "active" },
  { id: "suspend", label: "suspend" },
]
type ContactColumnId = "code" | "contact" | "ledger" | "phone" | "email" | "gstin" | "status"
const defaultContactColumnVisibility: Record<ContactColumnId, boolean> = {
  code: true,
  contact: true,
  ledger: true,
  phone: true,
  email: true,
  gstin: true,
  status: true,
}
const contactColumnCatalog: Array<{ id: ContactColumnId; label: string }> = [
  { id: "code", label: "Code" },
  { id: "contact", label: "Contact" },
  { id: "ledger", label: "Ledger" },
  { id: "phone", label: "Phone" },
  { id: "email", label: "Email" },
  { id: "gstin", label: "GSTIN" },
  { id: "status", label: "Status" },
]

export function ContactPage({ session }: { session: AuthSession }) {
  const queryClient = useQueryClient()
  const [view, setView] = useState<ContactView>({ mode: "list" })
  const [searchValue, setSearchValue] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [visibleColumns, setVisibleColumns] = useState(defaultContactColumnVisibility)
  const [currentPage, setCurrentPage] = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const queryKey = ["contacts", session.selectedTenant.slug]
  const contactsQuery = useQuery({ queryKey, queryFn: () => listContacts(session) })
  const upsertMutation = useMutation({ mutationFn: (input: ContactInput) => upsertContact(session, input) })
  const destroyMutation = useMutation({ mutationFn: (contact: ContactRecord) => destroyContact(session, contact) })
  const restoreMutation = useMutation({ mutationFn: (contact: ContactRecord) => restoreContact(session, contact) })
  const contacts = contactsQuery.data ?? []
  const filteredContacts = useMemo(() => filterContacts(searchContacts(contacts, searchValue), statusFilter), [contacts, searchValue, statusFilter])
  const totalPages = Math.max(1, Math.ceil(filteredContacts.length / rowsPerPage))
  const pageContacts = filteredContacts.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage)

  useEffect(() => {
    if (contactsQuery.error) toast.error("Contact load failed", { description: contactsQuery.error instanceof Error ? contactsQuery.error.message : "Unable to load contacts." })
  }, [contactsQuery.error])

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey })
  }

  async function save(input: ContactInput) {
    const contact = await upsertMutation.mutateAsync(input)
    toast.success(input.uuid ? "Contact updated" : "Contact created", { description: contact.name })
    await refresh()
    setView({ mode: "show", contact })
  }

  async function suspend(contact: ContactRecord) {
    await destroyMutation.mutateAsync(contact)
    toast.error("Contact suspended", { description: contact.name })
    await refresh()
  }

  async function restore(contact: ContactRecord) {
    await restoreMutation.mutateAsync(contact)
    toast.success("Contact restored", { description: contact.name })
    await refresh()
  }

  if (view.mode === "upsert") {
    return <ContactUpsertPage contact={view.contact} isSaving={upsertMutation.isPending} onBack={() => setView(view.contact ? { mode: "show", contact: view.contact } : { mode: "list" })} onSubmit={save} />
  }

  if (view.mode === "show") {
    const contact = contacts.find((item) => item.uuid === view.contact.uuid) ?? view.contact
    return <ContactShowPage contact={contact} onBack={() => setView({ mode: "list" })} onEdit={() => setView({ mode: "upsert", contact })} onRestore={() => void restore(contact)} onSuspend={() => void suspend(contact)} />
  }

  return (
    <MasterListPageFrame
      title="Contacts"
      description="Standalone contact master with tax, communication, address, finance, and lookup-ready profile fields."
      technicalName="page.master.contacts"
      action={<div className="flex items-center gap-2"><Button disabled={contactsQuery.isFetching} onClick={() => void contactsQuery.refetch()} type="button" variant="outline" className="h-9 rounded-md"><RefreshCw className={cn("size-4", contactsQuery.isFetching && "animate-spin")} />Refresh</Button><Button onClick={() => setView({ mode: "upsert", contact: null })} type="button" className="h-9 rounded-md"><Plus className="size-4" />New</Button></div>}
    >
      <MasterListToolbarCard
        columns={contactColumnCatalog.map((column) => ({
          id: column.id,
          label: column.label,
          checked: visibleColumns[column.id],
          disabled: column.id === "contact",
          onCheckedChange: (checked) => setVisibleColumns((current) => ({ ...current, [column.id]: checked })),
        }))}
        filterOptions={contactStatusFilters}
        filterValue={statusFilter}
        onShowAllColumns={() => setVisibleColumns(defaultContactColumnVisibility)}
        onFilterValueChange={(value) => {
          setStatusFilter(value)
          setCurrentPage(1)
        }}
        searchPlaceholder="Search code, contact, ledger, phone, email"
        searchValue={searchValue}
        onSearchValueChange={(value) => {
          setSearchValue(value)
          setCurrentPage(1)
        }}
      />
      <MasterListTableCard>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] border-collapse text-sm">
            <thead className="bg-muted/50"><tr>{visibleColumns.code ? <ListHeader>Code</ListHeader> : null}{visibleColumns.contact ? <ListHeader>Contact</ListHeader> : null}{visibleColumns.ledger ? <ListHeader>Ledger</ListHeader> : null}{visibleColumns.phone ? <ListHeader>Phone</ListHeader> : null}{visibleColumns.email ? <ListHeader>Email</ListHeader> : null}{visibleColumns.gstin ? <ListHeader>GSTIN</ListHeader> : null}{visibleColumns.status ? <ListHeader>Status</ListHeader> : null}<ListHeader className="text-right">Action</ListHeader></tr></thead>
            <tbody>
              {pageContacts.map((contact) => (
                <tr key={contact.uuid} className={cn("border-b border-border/70", !contact.isActive && "bg-muted/20 text-muted-foreground")}>
                  {visibleColumns.code ? <td className="px-4 py-2 font-mono text-xs">{contact.code}</td> : null}
                  {visibleColumns.contact ? <td className="px-4 py-2"><button className="font-semibold hover:underline" type="button" onClick={() => setView({ mode: "show", contact })}>{contact.name}</button><div className="text-xs text-muted-foreground">{contact.legalName || contact.gstin || contact.uuid}</div></td> : null}
                  {visibleColumns.ledger ? <td className="px-4 py-2">{contact.ledgerName || contactTypeLabel(contact.contactTypeId)}</td> : null}
                  {visibleColumns.phone ? <td className="px-4 py-2">{contact.primaryPhone || "-"}</td> : null}
                  {visibleColumns.email ? <td className="px-4 py-2">{contact.primaryEmail || "-"}</td> : null}
                  {visibleColumns.gstin ? <td className="px-4 py-2 font-mono text-xs">{contact.gstin || "-"}</td> : null}
                  {visibleColumns.status ? <td className="px-4 py-2"><StatusBadge active={contact.isActive} /></td> : null}
                  <td className="px-4 py-1.5 text-right"><MasterListRowActions title={contact.name} isSuspended={!contact.isActive} onDelete={() => void suspend(contact)} onEdit={() => setView({ mode: "upsert", contact })} onRestore={() => void restore(contact)} onView={() => setView({ mode: "show", contact })} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {pageContacts.length === 0 ? <MasterListEmptyState>{contactsQuery.isFetching ? "Loading contacts." : "No contacts found."}</MasterListEmptyState> : null}
      </MasterListTableCard>
      <MasterListPaginationCard page={currentPage} rowsPerPage={rowsPerPage} showingLabel={buildMasterListShowingLabel({ page: currentPage, pageSize: rowsPerPage, totalCount: filteredContacts.length })} singularLabel="contacts" totalCount={filteredContacts.length} totalPages={totalPages} onNextPage={() => setCurrentPage((page) => Math.min(totalPages, page + 1))} onPageChange={setCurrentPage} onPreviousPage={() => setCurrentPage((page) => Math.max(1, page - 1))} onRowsPerPageChange={(value) => { setRowsPerPage(value); setCurrentPage(1) }} />
    </MasterListPageFrame>
  )
}

function ContactShowPage({ contact, onBack, onEdit, onRestore, onSuspend }: { contact: ContactRecord; onBack(): void; onEdit(): void; onRestore(): void; onSuspend(): void }) {
  return (
    <MasterListPageFrame title={contact.name} description="Contact profile with identity, tax, communication, address, and finance details." technicalName="page.master.contacts.show" action={<div className="flex flex-wrap gap-2"><Button type="button" variant="outline" onClick={onBack} className="rounded-md"><ArrowLeft className="size-4" />Back</Button><Button type="button" onClick={onEdit} className="rounded-md"><Pencil className="size-4" />Edit</Button>{contact.isActive ? <Button type="button" variant="destructive" onClick={onSuspend} className="rounded-md"><Trash2 className="size-4" />Suspend</Button> : <Button type="button" variant="outline" onClick={onRestore} className="rounded-md"><RotateCw className="size-4" />Restore</Button>}</div>}>
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card className="rounded-md border-border/70"><CardContent className="p-6"><div className="flex flex-wrap items-start justify-between gap-4 border-b border-border/70 pb-5"><div><p className="font-mono text-xs text-muted-foreground">{contact.code} / {contact.uuid}</p><h2 className="mt-1 text-2xl font-bold">{contact.name}</h2><p className="text-sm text-muted-foreground">{contact.legalName || contact.ledgerName || contactTypeLabel(contact.contactTypeId)}</p></div><StatusBadge active={contact.isActive} /></div><div className="grid gap-4 py-5 md:grid-cols-2"><Info label="GSTIN" value={contact.gstin} /><Info label="PAN" value={contact.pan} /><Info label="Opening balance" value={formatMoney(contact.openingBalance)} /><Info label="Credit limit" value={formatMoney(contact.creditLimit)} /><Info label="Website" value={contact.website} /><Info label="MSME" value={[contact.msmeType, contact.msmeNo].filter(Boolean).join(" / ")} /></div><SectionTitle>Addresses</SectionTitle><div className="grid gap-3 md:grid-cols-2">{contact.addresses.length ? contact.addresses.map((address) => <AddressCard key={address.id ?? address.addressLine1} address={address} />) : <p className="text-sm text-muted-foreground">No address configured.</p>}</div></CardContent></Card>
        <div className="space-y-4"><MiniPanel title="Communication" icon={<Phone className="size-4" />} rows={[["Phone", contact.primaryPhone], ["Email", contact.primaryEmail]]} /><MiniPanel title="Tax Flags" icon={<CheckCircle2 className="size-4" />} rows={[["TDS", contact.tdsAvailable ? "Yes" : "No"], ["TCS", contact.tcsAvailable ? "Yes" : "No"], ["TAN", contact.tan]]} /><MiniPanel title="Bank Accounts" icon={<Mail className="size-4" />} rows={contact.bankAccounts.map((bank) => [bank.bankName, `${bank.accountNumber} / ${bank.ifsc}`])} /></div>
      </div>
    </MasterListPageFrame>
  )
}

function ContactUpsertPage({ contact, isSaving, onBack, onSubmit }: { contact: ContactRecord | null; isSaving: boolean; onBack(): void; onSubmit(input: ContactInput): Promise<void> }) {
  const [form, setForm] = useState<ContactInput>(() => contact ? contactToInput(contact) : emptyContact())
  const [submitted, setSubmitted] = useState(false)
  const nameError = submitted && !String(form.name ?? "").trim()
  const contactTypeError = submitted && !String(form.contactTypeId ?? "").trim()
  const missingFields = [
    nameError ? "Name" : null,
    contactTypeError ? "Contact Type" : null,
  ].filter(Boolean)

  function submitContact() {
    setSubmitted(true)
    if (!String(form.name ?? "").trim() || !String(form.contactTypeId ?? "").trim()) {
      toast.warning("Fill mandatory fields", { description: "Name and Contact Type are required before saving." })
      return
    }
    void onSubmit(form)
  }

  function setContactType(value: string) {
    const option = contactTypeOptions.find((item) => item.value === value)
    setForm((current) => ({ ...current, contactTypeId: option?.value ?? null, ledgerId: option?.ledgerId ?? null, ledgerName: option?.ledgerName ?? null }))
  }
  return (
    <MasterListPageFrame title={contact ? "Edit contact" : "New contact"} description="Update contact identity, tax, communication, address, and finance details." technicalName="page.master.contacts.upsert" action={<Button type="button" variant="outline" onClick={onBack} className="h-10 rounded-md px-4"><ArrowLeft className="size-4" />Back</Button>}>
      {missingFields.length ? <ValidationBanner missingFields={missingFields} /> : null}
      <MasterListUpsertLayout><MasterListUpsertCard className="overflow-hidden p-0 [&>div]:p-0"><form onSubmit={(event) => { event.preventDefault(); submitContact() }}><AnimatedTabs className="[&>div:first-child]:rounded-none [&>div:first-child]:border-x-0 [&>div:first-child]:border-t-0 [&>div:first-child]:border-b [&>div:first-child]:border-border/70 [&>div:first-child]:bg-card [&>div:first-child]:px-4 [&>div:first-child]:py-0.5 [&>div:first-child]:shadow-none md:[&>div:first-child]:px-6 [&>div:first-child_button]:min-h-8 [&>div:first-child_button]:py-1 [&>div:last-child]:mx-auto [&>div:last-child]:mt-6 [&>div:last-child]:w-full [&>div:last-child]:px-4 [&>div:last-child]:pb-4 md:[&>div:last-child]:px-6" tabs={[
        { value: "details", label: "Details", content: <TabPanel><div className="grid gap-5 md:grid-cols-2"><Field error={nameError} label="Name *" value={form.name ?? ""} onChange={(value) => setForm((current) => ({ ...current, name: value, legalName: shouldAutoFillLegalName(current) ? titleCaseName(value) : current.legalName }))} /><Field label="Code" value={form.code ?? ""} placeholder="C-0001 auto generated" onChange={(value) => setForm((current) => ({ ...current, code: value.toUpperCase() }))} /><Field label="Legal name" value={form.legalName ?? ""} onChange={(value) => setForm((current) => ({ ...current, legalName: value }))} /><SelectField error={contactTypeError} label="Contact Type *" value={form.contactTypeId ?? ""} placeholder="Select contact type" options={contactTypeOptions} onChange={setContactType} /><Field numeric label="Opening balance" value={String(form.openingBalance ?? 0)} onChange={(value) => setForm((current) => ({ ...current, openingBalance: Number(value || 0) }))} /><Field numeric label="Credit limit" value={String(form.creditLimit ?? 0)} onChange={(value) => setForm((current) => ({ ...current, creditLimit: Number(value || 0) }))} /><div className="md:col-span-2"><ToggleCard checked={Boolean(form.isActive)} label="Active" description="Active contacts are available in contact workflows." onChange={(checked) => setForm((current) => ({ ...current, isActive: checked }))} /></div></div></TabPanel> },
        { value: "tax", label: "Tax Details", content: <TabPanel><div className="grid gap-5 md:grid-cols-2"><Field label="GSTIN" value={form.gstin ?? ""} onChange={(value) => setForm((current) => ({ ...current, gstin: value.toUpperCase() }))} /><Field label="PAN" value={form.pan ?? ""} onChange={(value) => setForm((current) => ({ ...current, pan: value.toUpperCase() }))} /><Field label="MSME No" value={form.msmeNo ?? ""} onChange={(value) => setForm((current) => ({ ...current, msmeNo: value }))} /><SelectField label="MSME Category" value={form.msmeType ?? ""} placeholder="Select MSME category" options={msmeOptions} onChange={(value) => setForm((current) => ({ ...current, msmeType: value }))} /><Field label="TAN No" value={form.tan ?? ""} onChange={(value) => setForm((current) => ({ ...current, tan: value.toUpperCase() }))} /><div className="grid gap-4 md:grid-cols-2"><ToggleCard checked={Boolean(form.tdsAvailable)} label="TDS Available" description="Enable TDS applicability." onChange={(checked) => setForm((current) => ({ ...current, tdsAvailable: checked }))} /><ToggleCard checked={Boolean(form.tcsAvailable)} label="TCS Available" description="Enable TCS applicability." onChange={(checked) => setForm((current) => ({ ...current, tcsAvailable: checked }))} /></div><Collection title="GST Details" onAdd={() => setForm((current) => ({ ...current, gstDetails: [...current.gstDetails, { gstin: "", state: "", isDefault: current.gstDetails.length === 0 }] }))}>{form.gstDetails.map((item, index) => <GstRow key={index} item={item} onChange={(patch) => setForm((current) => ({ ...current, gstDetails: updateAt(current.gstDetails, index, patch) }))} onRemove={() => setForm((current) => ({ ...current, gstDetails: current.gstDetails.filter((_, itemIndex) => itemIndex !== index) }))} />)}</Collection></div></TabPanel> },
        { value: "communication", label: "Communication", content: <TabPanel><Collection title="Contact Emails" onAdd={() => setForm((current) => ({ ...current, emails: [...current.emails, { email: "", emailType: "", isPrimary: false }] }))}>{form.emails.map((item, index) => <EmailRow key={index} item={item} onChange={(patch) => setForm((current) => ({ ...current, emails: updateAt(current.emails, index, patch) }))} onRemove={() => setForm((current) => ({ ...current, emails: current.emails.filter((_, itemIndex) => itemIndex !== index) }))} />)}</Collection><Collection title="Contact Phones" onAdd={() => setForm((current) => ({ ...current, phones: [...current.phones, { phoneNumber: "", phoneType: "", isPrimary: false }] }))}>{form.phones.map((item, index) => <PhoneRow key={index} item={item} onChange={(patch) => setForm((current) => ({ ...current, phones: updateAt(current.phones, index, patch) }))} onRemove={() => setForm((current) => ({ ...current, phones: current.phones.filter((_, itemIndex) => itemIndex !== index) }))} />)}</Collection></TabPanel> },
        { value: "addresses", label: "Addresses", content: <TabPanel><Collection title="Addresses" onAdd={() => setForm((current) => ({ ...current, addresses: [...current.addresses, { ...emptyAddress(), isDefault: current.addresses.length === 0 }] }))}>{form.addresses.map((item, index) => <AddressRow key={index} item={item} onChange={(patch) => setForm((current) => ({ ...current, addresses: updateAt(current.addresses, index, patch) }))} onRemove={() => setForm((current) => ({ ...current, addresses: current.addresses.filter((_, itemIndex) => itemIndex !== index) }))} />)}</Collection></TabPanel> },
        { value: "finance", label: "Finance", content: <TabPanel><Collection title="Bank Accounts" onAdd={() => setForm((current) => ({ ...current, bankAccounts: [...current.bankAccounts, { bankName: "", accountNumber: "", accountHolderName: "", ifsc: "", branch: "", isPrimary: current.bankAccounts.length === 0 }] }))}>{form.bankAccounts.map((item, index) => <BankRow key={index} item={item} onChange={(patch) => setForm((current) => ({ ...current, bankAccounts: updateAt(current.bankAccounts, index, patch) }))} onRemove={() => setForm((current) => ({ ...current, bankAccounts: current.bankAccounts.filter((_, itemIndex) => itemIndex !== index) }))} />)}</Collection></TabPanel> },
        { value: "more", label: "More", content: <TabPanel><div className="grid gap-5 md:grid-cols-2"><Field label="Website" value={form.website ?? ""} onChange={(value) => setForm((current) => ({ ...current, website: value }))} /><TextField label="Description" value={form.description ?? ""} onChange={(value) => setForm((current) => ({ ...current, description: value }))} /><Collection title="Social Links" onAdd={() => setForm((current) => ({ ...current, socialLinks: [...current.socialLinks, { platform: "", url: "", isActive: true }] }))}>{form.socialLinks.map((item, index) => <SocialRow key={index} item={item} onChange={(patch) => setForm((current) => ({ ...current, socialLinks: updateAt(current.socialLinks, index, patch) }))} onRemove={() => setForm((current) => ({ ...current, socialLinks: current.socialLinks.filter((_, itemIndex) => itemIndex !== index) }))} />)}</Collection></div></TabPanel> },
      ]} /><div className="flex flex-wrap items-center gap-3 border-t border-border/70 bg-muted/20 px-4 py-4 md:px-6"><Button type="submit" disabled={isSaving} className="h-10 rounded-md px-5"><Save className={cn("size-4", isSaving && "animate-spin")} />Save</Button><Button type="button" variant="outline" onClick={onBack} className="h-10 rounded-md px-5"><X className="size-4" />Cancel</Button></div></form></MasterListUpsertCard></MasterListUpsertLayout>
    </MasterListPageFrame>
  )
}

function ValidationBanner({ missingFields }: { missingFields: Array<string | null> }) {
  return (
    <div className="mb-3 flex items-start gap-3 rounded-md border border-destructive/35 bg-destructive/10 px-4 py-3 text-sm text-destructive">
      <AlertCircle className="mt-0.5 size-4 shrink-0" />
      <div>
        <p className="font-semibold">Please complete the mandatory fields.</p>
        <p className="mt-0.5 text-destructive/85">Missing: {missingFields.filter(Boolean).join(", ")}.</p>
      </div>
    </div>
  )
}

function Field({ error = false, label, numeric = false, onChange, placeholder, value }: { error?: boolean; label: string; numeric?: boolean; onChange(value: string): void; placeholder?: string; value: string }) {
  return <div className="grid gap-2"><Label className={cn("text-sm font-medium text-muted-foreground", error && "text-destructive")}>{label}</Label><Input aria-invalid={error} className={cn("h-11 rounded-xl", numeric && "text-right", error && "border-destructive ring-2 ring-destructive/25 focus-visible:ring-destructive/40")} inputMode={numeric ? "decimal" : undefined} placeholder={placeholder} value={value} onChange={(event) => onChange(event.target.value)} /></div>
}
function TextField({ label, onChange, value }: { label: string; onChange(value: string): void; value: string }) {
  return <div className="grid gap-2 md:col-span-2"><Label className="text-sm font-medium text-muted-foreground">{label}</Label><Textarea className="min-h-28 rounded-xl" value={value} onChange={(event) => onChange(event.target.value)} /></div>
}
function SelectField({ error = false, label, onChange, options, placeholder, value }: { error?: boolean; label: string; onChange(value: string): void; options: Array<{ value: string; label: string }>; placeholder: string; value: string }) {
  const selected = options.find((option) => option.value === value)
  return <div className="grid gap-2"><Label className={cn("text-sm font-medium text-muted-foreground", error && "text-destructive")}>{label}</Label><DropdownMenu><DropdownMenuTrigger asChild><Button type="button" variant="outline" aria-invalid={error} className={cn("h-11 w-full justify-between rounded-xl border-input bg-background px-3 text-left font-normal", error && "border-destructive ring-2 ring-destructive/25")}><span className={selected ? "truncate" : "truncate text-muted-foreground"}>{selected?.label ?? placeholder}</span><ChevronDown className="size-4 text-muted-foreground" /></Button></DropdownMenuTrigger><DropdownMenuContent align="start" className="z-[120] w-[var(--radix-dropdown-menu-trigger-width)] rounded-xl p-1 shadow-xl">{options.map((option) => <DropdownMenuItem key={option.value} className="flex cursor-pointer justify-between rounded-lg" onSelect={() => onChange(option.value)}><span>{option.label}</span>{option.value === value ? <Check className="size-4 text-emerald-600" /> : null}</DropdownMenuItem>)}</DropdownMenuContent></DropdownMenu></div>
}
function ToggleCard({ checked, description, label, onChange }: { checked: boolean; description: string; label: string; onChange(value: boolean): void }) {
  return <label className={cn("flex cursor-pointer items-center justify-between gap-4 rounded-xl border px-4 py-3", checked ? "border-emerald-300 bg-emerald-50/90 text-emerald-950" : "border-border/70 bg-muted/10")}><span><span className="block text-sm font-medium">{label}</span><span className="block text-xs text-muted-foreground">{description}</span></span><Switch checked={checked} onCheckedChange={onChange} /></label>
}
function TabPanel({ children }: { children: ReactNode }) { return <div className="space-y-5">{children}</div> }
function Collection({ children, onAdd, title }: { children: ReactNode; onAdd(): void; title: string }) { return <section className="space-y-4 rounded-2xl border border-border/70 bg-card/80 p-4 shadow-sm md:col-span-2 md:p-5"><div className="flex items-start justify-between gap-4"><h3 className="text-base font-semibold">{title}</h3><Button type="button" variant="outline" className="rounded-xl" onClick={onAdd}><Plus className="size-4" />Add</Button></div><div className="space-y-3">{children}</div></section> }
function Row({ children, onRemove }: { children: ReactNode; onRemove(): void }) { return <div className="rounded-2xl border border-border/70 bg-background/65 p-4"><div className="mb-4 flex justify-end"><Button type="button" variant="ghost" className="h-8 rounded-lg" onClick={onRemove}><Trash2 className="size-4" />Remove</Button></div><div className="grid gap-5 md:grid-cols-3">{children}</div></div> }
function Primary({ checked, label, onChange }: { checked: boolean; label: string; onChange(value: boolean): void }) { return <label className="flex cursor-pointer items-center gap-3 pt-7 text-sm font-medium"><input type="checkbox" className="size-4" checked={checked} onChange={(event) => onChange(event.target.checked)} />{label}</label> }
function EmailRow({ item, onChange, onRemove }: { item: ContactEmail; onChange(patch: Partial<ContactEmail>): void; onRemove(): void }) { return <Row onRemove={onRemove}><Field label="Email" value={item.email} onChange={(email) => onChange({ email })} /><Field label="Email Type" value={item.emailType} onChange={(emailType) => onChange({ emailType })} /><Primary checked={item.isPrimary} label="Primary email" onChange={(isPrimary) => onChange({ isPrimary })} /></Row> }
function PhoneRow({ item, onChange, onRemove }: { item: ContactPhone; onChange(patch: Partial<ContactPhone>): void; onRemove(): void }) { return <Row onRemove={onRemove}><Field label="Phone" value={item.phoneNumber} onChange={(phoneNumber) => onChange({ phoneNumber })} /><Field label="Phone Type" value={item.phoneType} onChange={(phoneType) => onChange({ phoneType })} /><Primary checked={item.isPrimary} label="Primary phone" onChange={(isPrimary) => onChange({ isPrimary })} /></Row> }
function AddressRow({ item, onChange, onRemove }: { item: ContactAddress; onChange(patch: Partial<ContactAddress>): void; onRemove(): void }) { return <Row onRemove={onRemove}><Field label="Address line 1" value={item.addressLine1} onChange={(addressLine1) => onChange({ addressLine1 })} /><Field label="Address line 2" value={item.addressLine2 ?? ""} onChange={(addressLine2) => onChange({ addressLine2 })} /><Field label="City" value={item.cityId ?? ""} onChange={(cityId) => onChange({ cityId })} /><Field label="District" value={item.districtId ?? ""} onChange={(districtId) => onChange({ districtId })} /><Field label="State" value={item.stateId ?? ""} onChange={(stateId) => onChange({ stateId })} /><Field label="Pincode" value={item.pincodeId ?? ""} onChange={(pincodeId) => onChange({ pincodeId })} /><Primary checked={item.isDefault} label="Default address" onChange={(isDefault) => onChange({ isDefault })} /></Row> }
function BankRow({ item, onChange, onRemove }: { item: ContactBankAccount; onChange(patch: Partial<ContactBankAccount>): void; onRemove(): void }) { return <Row onRemove={onRemove}><Field label="Bank name" value={item.bankName} onChange={(bankName) => onChange({ bankName })} /><Field label="Account number" value={item.accountNumber} onChange={(accountNumber) => onChange({ accountNumber })} /><Field label="Holder name" value={item.accountHolderName} onChange={(accountHolderName) => onChange({ accountHolderName })} /><Field label="IFSC" value={item.ifsc} onChange={(ifsc) => onChange({ ifsc })} /><Field label="Branch" value={item.branch ?? ""} onChange={(branch) => onChange({ branch })} /><Primary checked={item.isPrimary} label="Primary bank" onChange={(isPrimary) => onChange({ isPrimary })} /></Row> }
function GstRow({ item, onChange, onRemove }: { item: ContactGstDetail; onChange(patch: Partial<ContactGstDetail>): void; onRemove(): void }) { return <Row onRemove={onRemove}><Field label="GSTIN" value={item.gstin} onChange={(gstin) => onChange({ gstin: gstin.toUpperCase() })} /><Field label="State" value={item.state} onChange={(state) => onChange({ state })} /><Primary checked={item.isDefault} label="Default GST" onChange={(isDefault) => onChange({ isDefault })} /></Row> }
function SocialRow({ item, onChange, onRemove }: { item: ContactSocialLink; onChange(patch: Partial<ContactSocialLink>): void; onRemove(): void }) { return <Row onRemove={onRemove}><Field label="Platform" value={item.platform} onChange={(platform) => onChange({ platform })} /><Field label="URL" value={item.url} onChange={(url) => onChange({ url })} /><ToggleCard checked={item.isActive} label="Active" description="Show this social link." onChange={(isActive) => onChange({ isActive })} /></Row> }
function StatusBadge({ active }: { active: boolean }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "h-6 gap-1 rounded-md px-2 text-[11px]",
        active ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-700",
      )}
    >
      {active ? <CheckCircle2 className="size-3" /> : null}
      {active ? "active" : "suspend"}
    </Badge>
  )
}
function ListHeader({ children, className }: { children: ReactNode; className?: string }) { return <th className={cn("border-b border-border/70 px-4 py-3.5 text-left font-medium text-foreground", className)}>{children}</th> }
function Info({ label, value }: { label: string; value?: string | null }) { return <div><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p><p className="mt-1 text-sm">{value || "-"}</p></div> }
function SectionTitle({ children }: { children: ReactNode }) { return <h3 className="mb-3 border-t border-border/70 pt-5 text-base font-semibold">{children}</h3> }
function AddressCard({ address }: { address: ContactAddress }) { return <div className="rounded-md border border-border/70 p-3 text-sm"><MapPin className="mb-2 size-4 text-muted-foreground" /><p>{address.addressLine1}</p><p className="text-muted-foreground">{[address.addressLine2, address.cityId, address.stateId, address.pincodeId].filter(Boolean).join(", ")}</p></div> }
function MiniPanel({ icon, rows, title }: { icon: ReactNode; rows: Array<[string, string | null | undefined]>; title: string }) { return <Card className="rounded-md border-border/70"><CardHeader><CardTitle className="flex items-center gap-2 text-base">{icon}{title}</CardTitle></CardHeader><CardContent className="space-y-2">{rows.length ? rows.map(([label, value]) => <Info key={label} label={label} value={value} />) : <p className="text-sm text-muted-foreground">No details configured.</p>}</CardContent></Card> }
function updateAt<T>(items: T[], index: number, patch: Partial<T>) { return items.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item) }
function contactToInput(contact: ContactRecord): ContactInput { return { ...contact, addresses: contact.addresses.length ? contact.addresses : emptyContact().addresses, emails: contact.emails.length ? contact.emails : emptyContact().emails, phones: contact.phones.length ? contact.phones : emptyContact().phones, socialLinks: contact.socialLinks, bankAccounts: contact.bankAccounts, gstDetails: contact.gstDetails } }
function contactTypeLabel(value: string | null) { return contactTypeOptions.find((item) => item.value === value)?.label ?? value ?? "-" }
function searchContacts(contacts: ContactRecord[], searchValue: string) { const term = searchValue.trim().toLowerCase(); if (!term) return contacts; return contacts.filter((contact) => [contact.code, contact.name, contact.legalName, contact.ledgerName, contact.primaryEmail, contact.primaryPhone, contact.gstin].some((value) => String(value ?? "").toLowerCase().includes(term))) }
function filterContacts(contacts: ContactRecord[], statusFilter: string) {
  if (statusFilter === "active") return contacts.filter((contact) => contact.isActive)
  if (statusFilter === "suspend") return contacts.filter((contact) => !contact.isActive)
  return contacts
}
function formatMoney(value: number) { return new Intl.NumberFormat(undefined, { currency: "INR", maximumFractionDigits: 2, style: "currency" }).format(Number(value ?? 0)) }
function shouldAutoFillLegalName(contact: ContactInput) { return !String(contact.legalName ?? "").trim() || String(contact.legalName ?? "") === titleCaseName(String(contact.name ?? "")) }
function titleCaseName(value: string) { return value.toLowerCase().replace(/\b[a-z]/g, (letter) => letter.toUpperCase()) }
