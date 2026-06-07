import type React from "react"
import { useEffect, useMemo, useState } from "react"
import { useMutation, useQuery } from "@tanstack/react-query"
import { ArrowLeft, Check, Plus, RefreshCw, RotateCcw, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "src/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "src/components/ui/card"
import { Input } from "src/components/ui/input"
import { Label } from "src/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "src/components/ui/select"
import type { AuthSession } from "src/features/auth/auth-client"
import { cn } from "src/lib/utils"
import {
  completeTaskManagerReminder,
  createContactCleanupCampaign,
  createSalesVerificationCampaign,
  createTaskFromCampaignItem,
  deleteTaskManagerCampaign,
  getTaskManagerSettings,
  listTaskManagerCampaigns,
  listTaskManagerCategories,
  listTaskManagerReminders,
  listTaskManagerTags,
  listTaskManagerTemplates,
  setTaskManagerCampaignStatus,
  type TaskManagerCampaign,
  type TaskManagerCampaignItem,
  type TaskManagerCampaignItemInput,
  type TaskManagerReminder,
  type TaskManagerSettings,
  upsertTaskManagerCampaign,
  upsertTaskManagerCampaignItem,
  upsertTaskManagerCategory,
  upsertTaskManagerReminder,
  upsertTaskManagerSettings,
  upsertTaskManagerTag,
  upsertTaskManagerTemplate,
} from "./task-manager-client"

export type TaskManagerAutomationView = "templates" | "campaigns" | "reminders" | "categories" | "tags" | "performance" | "settings"

export function TaskManagerAutomationPage({ session, view }: { session: AuthSession; view: TaskManagerAutomationView }) {
  const templatesQuery = useQuery({ queryKey: ["task-manager-templates", session.selectedTenant.slug], queryFn: () => listTaskManagerTemplates(session) })
  const campaignsQuery = useQuery({ queryKey: ["task-manager-campaigns", session.selectedTenant.slug], queryFn: () => listTaskManagerCampaigns(session) })
  const remindersQuery = useQuery({ queryKey: ["task-manager-reminders", session.selectedTenant.slug], queryFn: () => listTaskManagerReminders(session) })
  const categoriesQuery = useQuery({ queryKey: ["task-manager-categories", session.selectedTenant.slug], queryFn: () => listTaskManagerCategories(session) })
  const tagsQuery = useQuery({ queryKey: ["task-manager-tags", session.selectedTenant.slug], queryFn: () => listTaskManagerTags(session) })
  const settingsQuery = useQuery({ queryKey: ["task-manager-settings", session.selectedTenant.slug], queryFn: () => getTaskManagerSettings(session) })

  async function refresh() {
    await Promise.all([templatesQuery.refetch(), campaignsQuery.refetch(), remindersQuery.refetch(), categoriesQuery.refetch(), tagsQuery.refetch(), settingsQuery.refetch()])
  }

  return (
    <main className="mx-auto flex w-[calc(100%-2rem)] max-w-[1200px] flex-col gap-5 py-6 sm:w-[calc(100%-3rem)] lg:w-[calc(100%-4rem)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal">{titleFor(view)}</h1>
          <p className="text-sm text-muted-foreground">{descriptionFor(view)}</p>
        </div>
        <Button type="button" variant="outline" className="h-9 rounded-md" onClick={() => void refresh()}><RefreshCw className={cn("size-4", templatesQuery.isFetching || campaignsQuery.isFetching || remindersQuery.isFetching || settingsQuery.isFetching ? "animate-spin" : "")} />Refresh</Button>
      </div>
      {view === "templates" ? <TemplatesPanel isSaving={templatesQuery.isFetching} onSaved={refresh} session={session} templates={templatesQuery.data ?? []} /> : null}
      {view === "campaigns" ? <CampaignsPanel campaigns={campaignsQuery.data ?? []} onSaved={refresh} session={session} /> : null}
      {view === "reminders" ? <RemindersPanel onSaved={refresh} reminders={remindersQuery.data ?? []} session={session} /> : null}
      {view === "categories" ? <LookupPanel kind="category" records={categoriesQuery.data ?? []} onSaved={refresh} session={session} /> : null}
      {view === "tags" ? <LookupPanel kind="tag" records={tagsQuery.data ?? []} onSaved={refresh} session={session} /> : null}
      {view === "performance" ? <PerformancePanel campaigns={campaignsQuery.data ?? []} reminders={remindersQuery.data ?? []} /> : null}
      {view === "settings" ? <SettingsPanel onSaved={refresh} session={session} settings={settingsQuery.data ?? null} /> : null}
    </main>
  )
}

function TemplatesPanel({ onSaved, session, templates }: { isSaving: boolean; onSaved(): Promise<void>; session: AuthSession; templates: Awaited<ReturnType<typeof listTaskManagerTemplates>> }) {
  const [name, setName] = useState("")
  const [templateType, setTemplateType] = useState("simple_task")
  const mutation = useMutation({ mutationFn: () => upsertTaskManagerTemplate(session, { name, template_type: templateType, default_priority: "normal", requires_confirmation: templateType === "collection_confirmation" }) })
  async function save() {
    await mutation.mutateAsync()
    toast.success("Template saved")
    setName("")
    await onSaved()
  }
  return (
    <Card className="rounded-md">
      <CardHeader><CardTitle>Task templates</CardTitle></CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-3 md:grid-cols-[1fr_240px_auto]">
          <Field label="Template name" value={name} onChange={setName} />
          <SelectBox label="Type" value={templateType} values={["simple_task", "record_checklist", "collection_confirmation", "compliance_reminder", "data_cleanup", "approval_review"]} onChange={setTemplateType} />
          <div className="flex items-end"><Button disabled={!name.trim() || mutation.isPending} className="h-10 rounded-md" onClick={() => void save()} type="button"><Plus className="size-4" />Add</Button></div>
        </div>
        <Rows rows={templates.map((item) => ({ id: item.uuid, title: item.name, meta: `${item.template_type} - ${item.default_priority}` }))} />
      </CardContent>
    </Card>
  )
}

function CampaignsPanel({ campaigns, onSaved, session }: { campaigns: TaskManagerCampaign[]; onSaved(): Promise<void>; session: AuthSession }) {
  const [view, setView] = useState<{ mode: "list" } | { mode: "show"; uuid: string } | { mode: "upsert" }>({ mode: "list" })
  const [name, setName] = useState("")
  const [campaignType, setCampaignType] = useState("sales_invoice_verification")
  const [itemLabel, setItemLabel] = useState("")
  const [salesFromDate, setSalesFromDate] = useState("")
  const [salesToDate, setSalesToDate] = useState("")
  const [salesAssignee, setSalesAssignee] = useState("")
  const [salesReminderAt, setSalesReminderAt] = useState("")
  const [contactAssignee, setContactAssignee] = useState("")
  const [contactReminderAt, setContactReminderAt] = useState("")
  const [contactOnlyMissing, setContactOnlyMissing] = useState(true)
  const createMutation = useMutation({ mutationFn: () => upsertTaskManagerCampaign(session, { name, campaign_type: "record_checklist", status: "open" }) })
  const salesVerificationMutation = useMutation({ mutationFn: () => createSalesVerificationCampaign(session, { assigned_to: salesAssignee, from_date: salesFromDate, name: salesCampaignName(salesFromDate, salesToDate), reminder_at: salesReminderAt, to_date: salesToDate }) })
  const contactCleanupMutation = useMutation({ mutationFn: () => createContactCleanupCampaign(session, { assigned_to: contactAssignee, include_only_missing: contactOnlyMissing, name: "Contact Phone/Email Confirmation", reminder_at: contactReminderAt }) })
  const itemMutation = useMutation({ mutationFn: ({ campaign, input }: { campaign: TaskManagerCampaign; input: TaskManagerCampaignItemInput }) => upsertTaskManagerCampaignItem(session, campaign, input) })
  const itemTaskMutation = useMutation({ mutationFn: ({ campaign, item }: { campaign: TaskManagerCampaign; item: TaskManagerCampaignItem }) => createTaskFromCampaignItem(session, campaign, item) })
  const statusMutation = useMutation({ mutationFn: ({ campaign, status }: { campaign: TaskManagerCampaign; status: "open" | "closed" | "reset" | "archived" }) => setTaskManagerCampaignStatus(session, campaign, status) })
  const deleteMutation = useMutation({ mutationFn: (campaign: TaskManagerCampaign) => deleteTaskManagerCampaign(session, campaign) })
  const selected = view.mode === "show" ? campaigns.find((campaign) => campaign.uuid === view.uuid) ?? null : null
  async function create() {
    await createMutation.mutateAsync()
    toast.success("Campaign saved")
    setName("")
    setView({ mode: "list" })
    await onSaved()
  }
  async function createSalesCampaign() {
    await salesVerificationMutation.mutateAsync()
    toast.success("Sales verification campaign created")
    setSalesFromDate("")
    setSalesToDate("")
    setSalesAssignee("")
    setSalesReminderAt("")
    setView({ mode: "list" })
    await onSaved()
  }
  async function createContactCampaign() {
    await contactCleanupMutation.mutateAsync()
    toast.success("Contact cleanup campaign created")
    setContactAssignee("")
    setContactReminderAt("")
    setView({ mode: "list" })
    await onSaved()
  }
  async function addItem(campaign: TaskManagerCampaign) {
    await itemMutation.mutateAsync({ campaign, input: { source_record_label: itemLabel, status: "todo" } })
    toast.success("Campaign item added")
    setItemLabel("")
    await onSaved()
  }
  async function saveItem(campaign: TaskManagerCampaign, input: TaskManagerCampaignItemInput) {
    await itemMutation.mutateAsync({ campaign, input })
    toast.success("Campaign item updated")
    await onSaved()
  }
  async function createItemTask(campaign: TaskManagerCampaign, item: TaskManagerCampaignItem) {
    const result = await itemTaskMutation.mutateAsync({ campaign, item })
    toast.success("Task created from campaign item", { description: result.task?.task_no })
    await onSaved()
  }
  async function status(campaign: TaskManagerCampaign, nextStatus: "open" | "closed" | "reset" | "archived") {
    await statusMutation.mutateAsync({ campaign, status: nextStatus })
    toast.success(nextStatus === "reset" ? "Campaign reset" : "Campaign updated")
    await onSaved()
  }
  async function remove(campaign: TaskManagerCampaign) {
    if (!window.confirm(`Delete campaign "${campaign.name}" and its campaign items? Linked tasks will remain.`)) return
    await deleteMutation.mutateAsync(campaign)
    toast.error("Campaign deleted", { description: campaign.name })
    setView({ mode: "list" })
    await onSaved()
  }

  if (view.mode === "upsert") {
    return (
      <Card className="rounded-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Button size="icon" variant="outline" className="size-8 rounded-md" type="button" onClick={() => setView({ mode: "list" })}><ArrowLeft className="size-4" /></Button>New campaign</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-[320px_1fr]">
          <div className="grid gap-2">
            {campaignTypeOptions.map((option) => (
              <button key={option.value} className={cn("rounded-md border border-border/70 p-3 text-left text-sm hover:bg-muted/40", campaignType === option.value && "border-primary bg-primary/5")} type="button" onClick={() => setCampaignType(option.value)}>
                <span className="block font-semibold">{option.label}</span>
                <span className="text-xs text-muted-foreground">{option.description}</span>
              </button>
            ))}
          </div>
          {campaignType === "sales_invoice_verification" ? (
            <div className="grid gap-3">
              <div>
                <div className="text-base font-semibold">Sales invoice GST/Tally verification</div>
                <div className="text-sm text-muted-foreground">Generate one campaign item per sales invoice.</div>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <Field label="From date" type="date" value={salesFromDate} onChange={setSalesFromDate} />
                <Field label="To date" type="date" value={salesToDate} onChange={setSalesToDate} />
              </div>
              <Field label="Assign to email" value={salesAssignee} onChange={setSalesAssignee} />
              <Field label="Reminder at" type="datetime-local" value={salesReminderAt} onChange={setSalesReminderAt} />
              <Button disabled={salesVerificationMutation.isPending} className="rounded-md" type="button" onClick={() => void createSalesCampaign()}>
                <Plus className="size-4" />Generate from Sales invoices
              </Button>
            </div>
          ) : null}
          {campaignType === "contact_data_cleanup" ? (
            <div className="grid gap-3">
              <div>
                <div className="text-base font-semibold">Contact phone/email confirmation</div>
                <div className="text-sm text-muted-foreground">Generate one campaign item per contact.</div>
              </div>
              <Field label="Assign to email" value={contactAssignee} onChange={setContactAssignee} />
              <Field label="Reminder at" type="datetime-local" value={contactReminderAt} onChange={setContactReminderAt} />
              <label className="flex items-center justify-between rounded-md border border-border/70 px-3 py-2 text-sm">
                <span>Only contacts missing phone/email</span>
                <input checked={contactOnlyMissing} type="checkbox" onChange={(event) => setContactOnlyMissing(event.target.checked)} />
              </label>
              <Button disabled={contactCleanupMutation.isPending} className="rounded-md" type="button" onClick={() => void createContactCampaign()}>
                <Plus className="size-4" />Generate from Contacts
              </Button>
            </div>
          ) : null}
          {campaignType === "record_checklist" ? (
            <div className="grid gap-3">
              <div>
                <div className="text-base font-semibold">Manual campaign</div>
                <div className="text-sm text-muted-foreground">Create an empty campaign and add items manually.</div>
              </div>
              <Field label="Campaign name" value={name} onChange={setName} />
              <Button disabled={!name.trim() || createMutation.isPending} className="rounded-md" type="button" onClick={() => void create()}><Plus className="size-4" />Create campaign</Button>
            </div>
          ) : null}
        </CardContent>
      </Card>
    )
  }

  if (view.mode === "show") {
    if (!selected) return <Empty>Campaign was not found.</Empty>
    return (
      <Card className="rounded-md">
        <CardHeader><CardTitle className="flex items-center gap-2"><Button size="icon" variant="outline" className="size-8 rounded-md" type="button" onClick={() => setView({ mode: "list" })}><ArrowLeft className="size-4" /></Button>{selected.name}</CardTitle></CardHeader>
        <CardContent className="grid gap-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-sm text-muted-foreground">{campaignTypeLabel(selected.campaign_type)} - {selected.status} - {selected.items.length} items</div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" className="rounded-md" onClick={() => void status(selected, "closed")} type="button"><Check className="size-4" />Close</Button>
              <Button variant="outline" className="rounded-md" onClick={() => void status(selected, "reset")} type="button"><RotateCcw className="size-4" />Reset</Button>
              <Button variant="destructive" className="rounded-md" onClick={() => void remove(selected)} type="button"><Trash2 className="size-4" />Delete</Button>
            </div>
          </div>
          <div className="grid gap-2 md:grid-cols-[1fr_auto]">
            <Field label="Manual item label" value={itemLabel} onChange={setItemLabel} />
            <div className="flex items-end"><Button disabled={!itemLabel.trim()} className="h-10 rounded-md" onClick={() => void addItem(selected)} type="button"><Plus className="size-4" />Add item</Button></div>
          </div>
          <CampaignItemWorkTable campaign={selected} isSaving={itemMutation.isPending || itemTaskMutation.isPending} onCreateTask={(item) => createItemTask(selected, item)} onSave={(input) => saveItem(selected, input)} />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="rounded-md">
      <CardHeader><CardTitle className="flex items-center justify-between gap-3"><span>Campaigns</span><Button className="rounded-md" type="button" onClick={() => setView({ mode: "upsert" })}><Plus className="size-4" />New campaign</Button></CardTitle></CardHeader>
      <CardContent>
        {campaigns.length ? (
          <div className="overflow-x-auto rounded-md border border-border/70">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="bg-muted/50"><tr><th className="px-3 py-2 text-left font-medium">Campaign</th><th className="px-3 py-2 text-left font-medium">Type</th><th className="px-3 py-2 text-left font-medium">Status</th><th className="px-3 py-2 text-right font-medium">Items</th><th className="px-3 py-2 text-right font-medium">Action</th></tr></thead>
              <tbody>
                {campaigns.map((campaign) => (
                  <tr key={campaign.uuid} className="border-t border-border/70">
                    <td className="px-3 py-2"><button className="font-semibold hover:underline" type="button" onClick={() => setView({ mode: "show", uuid: campaign.uuid })}>{campaign.name}</button><div className="text-xs text-muted-foreground">{formatDateTime(campaign.generated_at)}</div></td>
                    <td className="px-3 py-2 text-muted-foreground">{campaignTypeLabel(campaign.campaign_type)}</td>
                    <td className="px-3 py-2">{campaign.status}</td>
                    <td className="px-3 py-2 text-right">{campaign.items.length}</td>
                    <td className="px-3 py-2 text-right"><div className="flex justify-end gap-2"><Button size="sm" variant="outline" className="rounded-md" type="button" onClick={() => setView({ mode: "show", uuid: campaign.uuid })}>Show</Button><Button size="sm" variant="destructive" className="rounded-md" type="button" onClick={() => void remove(campaign)}><Trash2 className="size-4" />Delete</Button></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <Empty>No campaigns yet.</Empty>}
      </CardContent>
    </Card>
  )
}

const campaignTypeOptions = [
  { value: "sales_invoice_verification", label: "Sales invoice GST/Tally verification", description: "Build invoice verification rows from Sales." },
  { value: "contact_data_cleanup", label: "Contact phone/email confirmation", description: "Build contact cleanup rows from Contacts." },
  { value: "record_checklist", label: "Manual campaign", description: "Create an empty campaign and add rows manually." },
]

function campaignTypeLabel(value: string) {
  return campaignTypeOptions.find((option) => option.value === value)?.label ?? value.replace(/_/g, " ")
}

function RemindersPanel({ onSaved, reminders, session }: { onSaved(): Promise<void>; reminders: TaskManagerReminder[]; session: AuthSession }) {
  const [title, setTitle] = useState("")
  const [remindAt, setRemindAt] = useState("")
  const mutation = useMutation({ mutationFn: () => upsertTaskManagerReminder(session, { title, remind_at: remindAt, channel: "dashboard", status: "pending" }) })
  const completeMutation = useMutation({ mutationFn: (reminder: TaskManagerReminder) => completeTaskManagerReminder(session, reminder) })
  async function save() {
    await mutation.mutateAsync()
    toast.success("Reminder saved")
    setTitle("")
    setRemindAt("")
    await onSaved()
  }
  async function complete(reminder: TaskManagerReminder) {
    await completeMutation.mutateAsync(reminder)
    toast.success("Reminder completed")
    await onSaved()
  }
  return (
    <Card className="rounded-md">
      <CardHeader><CardTitle>Reminders</CardTitle></CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-3 md:grid-cols-[1fr_260px_auto]">
          <Field label="Title" value={title} onChange={setTitle} />
          <Field label="Remind at" type="datetime-local" value={remindAt} onChange={setRemindAt} />
          <div className="flex items-end"><Button disabled={!title.trim() || !remindAt} className="h-10 rounded-md" onClick={() => void save()} type="button"><Plus className="size-4" />Add</Button></div>
        </div>
        <Rows rows={reminders.map((reminder) => ({ id: reminder.uuid, title: reminder.title, meta: `${reminder.status} - ${formatDateTime(reminder.remind_at)}`, action: reminder.status !== "completed" ? <Button size="sm" variant="outline" className="rounded-md" onClick={() => void complete(reminder)} type="button">Complete</Button> : null }))} />
      </CardContent>
    </Card>
  )
}

function CampaignItemWorkTable({ campaign, isSaving, onCreateTask, onSave }: { campaign: TaskManagerCampaign; isSaving: boolean; onCreateTask(item: TaskManagerCampaignItem): Promise<void>; onSave(input: TaskManagerCampaignItemInput): Promise<void> }) {
  const [drafts, setDrafts] = useState<Record<string, CampaignItemDraft>>({})
  const items = campaign.items

  function draftFor(item: TaskManagerCampaignItem) {
    return drafts[item.uuid] ?? itemToDraft(item)
  }

  function setDraft(item: TaskManagerCampaignItem, patch: Partial<CampaignItemDraft>) {
    setDrafts((current) => ({ ...current, [item.uuid]: { ...draftFor(item), ...patch } }))
  }

  async function save(item: TaskManagerCampaignItem, patch: Partial<CampaignItemDraft> = {}) {
    const draft = { ...draftFor(item), ...patch }
    await onSave({
      uuid: item.uuid,
      assigned_to: draft.assigned_to,
      is_checked: draft.is_checked,
      remarks: draft.remarks,
      result_payload: payloadFor(campaign, draft),
      status: draft.is_checked ? "completed" : draft.status,
    })
    setDrafts((current) => {
      const next = { ...current }
      delete next[item.uuid]
      return next
    })
  }

  if (!items.length) return <Empty>No campaign items yet.</Empty>

  return (
    <div className="overflow-x-auto rounded-md border border-border/70">
      <table className="w-full min-w-[1080px] text-sm">
        <thead className="bg-muted/50">
          <tr>
            <th className="px-3 py-2 text-left font-medium">Done</th>
            <th className="px-3 py-2 text-left font-medium">Record</th>
            <th className="px-3 py-2 text-left font-medium">Assigned</th>
            {campaign.campaign_type === "sales_invoice_verification" ? <><th className="px-3 py-2 text-left font-medium">GST Portal</th><th className="px-3 py-2 text-left font-medium">Tally</th></> : null}
            {campaign.campaign_type === "contact_data_cleanup" ? <><th className="px-3 py-2 text-left font-medium">Phone</th><th className="px-3 py-2 text-left font-medium">Email</th></> : null}
            <th className="px-3 py-2 text-left font-medium">Remarks</th>
            <th className="px-3 py-2 text-right font-medium">Action</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const draft = draftFor(item)
            return (
              <tr key={item.uuid} className="border-t border-border/70 align-top">
                <td className="px-3 py-2">
                  <input checked={draft.is_checked} disabled={isSaving} type="checkbox" onChange={(event) => { const checked = event.target.checked; setDraft(item, { is_checked: checked, status: checked ? "completed" : "todo" }); void save(item, { is_checked: checked, status: checked ? "completed" : "todo" }) }} />
                </td>
                <td className="px-3 py-2">
                  <div className="font-medium">{item.source_record_label ?? "Campaign item"}</div>
                  <div className="text-xs text-muted-foreground">{[item.source_module, item.source_record_type, item.completed_by ? `Completed by ${item.completed_by}` : ""].filter(Boolean).join(" - ")}</div>
                </td>
                <td className="px-3 py-2"><Input className="h-9 rounded-md" value={draft.assigned_to} onChange={(event) => setDraft(item, { assigned_to: event.target.value })} /></td>
                {campaign.campaign_type === "sales_invoice_verification" ? (
                  <>
                    <td className="px-3 py-2"><CheckBoxLabel checked={draft.gst_portal_verified} label="Verified" onChange={(checked) => setDraft(item, { gst_portal_verified: checked })} /></td>
                    <td className="px-3 py-2"><CheckBoxLabel checked={draft.tally_verified} label="Matched" onChange={(checked) => setDraft(item, { tally_verified: checked })} /></td>
                  </>
                ) : null}
                {campaign.campaign_type === "contact_data_cleanup" ? (
                  <>
                    <td className="px-3 py-2"><div className="grid gap-1"><CheckBoxLabel checked={draft.phone_confirmed} label="Confirmed" onChange={(checked) => setDraft(item, { phone_confirmed: checked })} /><Input className="h-8 rounded-md" placeholder="Corrected phone" value={draft.corrected_phone} onChange={(event) => setDraft(item, { corrected_phone: event.target.value })} /></div></td>
                    <td className="px-3 py-2"><div className="grid gap-1"><CheckBoxLabel checked={draft.email_confirmed} label="Confirmed" onChange={(checked) => setDraft(item, { email_confirmed: checked })} /><Input className="h-8 rounded-md" placeholder="Corrected email" value={draft.corrected_email} onChange={(event) => setDraft(item, { corrected_email: event.target.value })} /></div></td>
                  </>
                ) : null}
                <td className="px-3 py-2"><Input className="h-9 rounded-md" value={draft.remarks} onChange={(event) => setDraft(item, { remarks: event.target.value })} /></td>
                <td className="px-3 py-2 text-right">
                  <div className="flex justify-end gap-2">
                    <Button disabled={isSaving || Boolean(item.task_id)} size="sm" variant="outline" className="rounded-md" type="button" onClick={() => void onCreateTask(item)}>
                      {item.task_id ? "Task linked" : "Create task"}
                    </Button>
                    <Button disabled={isSaving} size="sm" className="rounded-md" type="button" onClick={() => void save(item)}>Save</Button>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

interface CampaignItemDraft {
  assigned_to: string
  corrected_email: string
  corrected_phone: string
  email_confirmed: boolean
  gst_portal_verified: boolean
  is_checked: boolean
  phone_confirmed: boolean
  remarks: string
  status: string
  tally_verified: boolean
}

function itemToDraft(item: TaskManagerCampaignItem): CampaignItemDraft {
  const payload = parsePayload(item.result_payload)
  return {
    assigned_to: item.assigned_to ?? "",
    corrected_email: stringValue(payload.corrected_email),
    corrected_phone: stringValue(payload.corrected_phone),
    email_confirmed: Boolean(payload.email_confirmed),
    gst_portal_verified: Boolean(payload.gst_portal_verified),
    is_checked: Boolean(item.is_checked) || item.status === "completed",
    phone_confirmed: Boolean(payload.phone_confirmed),
    remarks: item.remarks ?? stringValue(payload.remarks),
    status: item.status || "todo",
    tally_verified: Boolean(payload.tally_verified),
  }
}

function payloadFor(campaign: TaskManagerCampaign, draft: CampaignItemDraft) {
  if (campaign.campaign_type === "sales_invoice_verification") {
    return { gst_portal_verified: draft.gst_portal_verified, tally_verified: draft.tally_verified, remarks: draft.remarks }
  }
  if (campaign.campaign_type === "contact_data_cleanup") {
    return { phone_confirmed: draft.phone_confirmed, email_confirmed: draft.email_confirmed, corrected_phone: draft.corrected_phone, corrected_email: draft.corrected_email, remarks: draft.remarks }
  }
  return { remarks: draft.remarks }
}

function CheckBoxLabel({ checked, label, onChange }: { checked: boolean; label: string; onChange(checked: boolean): void }) {
  return <label className="flex items-center gap-2 text-xs"><input checked={checked} type="checkbox" onChange={(event) => onChange(event.target.checked)} />{label}</label>
}

function SettingsPanel({ onSaved, session, settings }: { onSaved(): Promise<void>; session: AuthSession; settings: TaskManagerSettings | null }) {
  const [draft, setDraft] = useState<TaskManagerSettingsDraft>(() => settingsToDraft(settings))
  const mutation = useMutation({ mutationFn: () => upsertTaskManagerSettings(session, { ...draft, default_reminder_lead_days: Number(draft.default_reminder_lead_days || 0) }) })

  useEffect(() => setDraft(settingsToDraft(settings)), [settings])

  async function save() {
    await mutation.mutateAsync()
    toast.success("Task settings saved")
    await onSaved()
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
      <Card className="rounded-md">
        <CardHeader><CardTitle>Task settings</CardTitle></CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Default assignee email" value={draft.default_assignee} onChange={(value) => setDraftField(setDraft, "default_assignee", value)} />
            <Field label="Default reviewer email" value={draft.default_reviewer} onChange={(value) => setDraftField(setDraft, "default_reviewer", value)} />
            <SelectBox label="Default priority" value={draft.default_priority} values={["low", "normal", "high", "urgent"]} onChange={(value) => setDraftField(setDraft, "default_priority", value)} />
            <SelectBox label="Default task type" value={draft.default_task_type} values={["simple_task", "record_checklist", "collection_confirmation", "compliance_reminder", "data_cleanup", "approval_review"]} onChange={(value) => setDraftField(setDraft, "default_task_type", value)} />
            <Field label="Reminder lead days" type="number" value={draft.default_reminder_lead_days} onChange={(value) => setDraftField(setDraft, "default_reminder_lead_days", value)} />
            <Field label="Reminder hour" type="time" value={draft.campaign_reminder_hour} onChange={(value) => setDraftField(setDraft, "campaign_reminder_hour", value)} />
            <SelectBox label="Media visibility" value={draft.media_visibility} values={["private", "public"]} onChange={(value) => setDraftField(setDraft, "media_visibility", value)} />
            <Field label="Media folder" value={draft.media_folder} onChange={(value) => setDraftField(setDraft, "media_folder", value)} />
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            <ToggleRow checked={draft.open_task_claiming} label="Allow open task claiming" onChange={(value) => setDraftField(setDraft, "open_task_claiming", value)} />
            <ToggleRow checked={draft.require_completion_confirmation} label="Require completion confirmation" onChange={(value) => setDraftField(setDraft, "require_completion_confirmation", value)} />
            <ToggleRow checked={draft.allow_authorized_comments} label="Allow authorized comments" onChange={(value) => setDraftField(setDraft, "allow_authorized_comments", value)} />
            <ToggleRow checked={draft.auto_create_campaign_reminders} label="Create campaign reminders" onChange={(value) => setDraftField(setDraft, "auto_create_campaign_reminders", value)} />
          </div>
          <div className="flex justify-end">
            <Button disabled={mutation.isPending || !settings} className="rounded-md" type="button" onClick={() => void save()}>Save settings</Button>
          </div>
        </CardContent>
      </Card>
      <Card className="rounded-md">
        <CardHeader><CardTitle>Current behavior</CardTitle></CardHeader>
        <CardContent className="grid gap-2 text-sm text-muted-foreground">
          <div>New tasks use these defaults when assignee, reviewer, priority, type, or reminder are not filled.</div>
          <div>Task file uploads use the configured media folder and visibility.</div>
          <div>Campaign reminders and completion confirmation use these tenant defaults for future automation.</div>
          {settings?.updated_by ? <div className="pt-2 text-xs">Last updated by {settings.updated_by}</div> : null}
        </CardContent>
      </Card>
    </div>
  )
}

function LookupPanel({ kind, onSaved, records, session }: { kind: "category" | "tag"; onSaved(): Promise<void>; records: Array<{ uuid: string; name: string; slug: string; color: string | null }>; session: AuthSession }) {
  const [name, setName] = useState("")
  const mutation = useMutation({ mutationFn: () => kind === "category" ? upsertTaskManagerCategory(session, { name, slug: toSlug(name), is_active: true }) : upsertTaskManagerTag(session, { name, slug: toSlug(name), is_active: true }) })
  async function save() {
    await mutation.mutateAsync()
    toast.success(`${kind === "category" ? "Category" : "Tag"} saved`)
    setName("")
    await onSaved()
  }
  return (
    <Card className="rounded-md">
      <CardHeader><CardTitle>{kind === "category" ? "Task categories" : "Task tags"}</CardTitle></CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-3 md:grid-cols-[1fr_auto]">
          <Field label="Name" value={name} onChange={setName} />
          <div className="flex items-end"><Button disabled={!name.trim()} className="h-10 rounded-md" onClick={() => void save()} type="button"><Plus className="size-4" />Add</Button></div>
        </div>
        <Rows rows={records.map((record) => ({ id: record.uuid, title: record.name, meta: record.slug }))} />
      </CardContent>
    </Card>
  )
}

function PerformancePanel({ campaigns, reminders }: { campaigns: TaskManagerCampaign[]; reminders: TaskManagerReminder[] }) {
  const stats = useMemo(() => {
    const campaignItems = campaigns.flatMap((campaign) => campaign.items)
    return [
      { label: "Campaigns", value: campaigns.length },
      { label: "Campaign items", value: campaignItems.length },
      { label: "Checked items", value: campaignItems.filter((item) => item.is_checked || item.status === "completed").length },
      { label: "Pending reminders", value: reminders.filter((item) => item.status !== "completed").length },
    ]
  }, [campaigns, reminders])
  return <div className="grid gap-3 md:grid-cols-4">{stats.map((stat) => <Card className="rounded-md" key={stat.label}><CardContent className="p-4"><div className="text-sm text-muted-foreground">{stat.label}</div><div className="mt-2 text-2xl font-semibold">{stat.value}</div></CardContent></Card>)}</div>
}

function Rows({ empty = "No records yet.", rows }: { empty?: string; rows: Array<{ id: string; title: string; meta?: string; action?: React.ReactNode; onClick?: () => void }> }) {
  if (!rows.length) return <Empty>{empty}</Empty>
  return <div className="grid gap-2">{rows.map((row) => <button key={row.id} className="flex items-center justify-between gap-3 rounded-md border border-border/70 p-3 text-left hover:bg-muted/40" onClick={row.onClick} type="button"><span className="min-w-0"><span className="block truncate text-sm font-medium">{row.title}</span>{row.meta ? <span className="block truncate text-xs text-muted-foreground">{row.meta}</span> : null}</span>{row.action}</button>)}</div>
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">{children}</div>
}

function ToggleRow({ checked, label, onChange }: { checked: boolean; label: string; onChange(value: boolean): void }) {
  return (
    <label className="flex items-center justify-between gap-3 rounded-md border border-border/70 px-3 py-2 text-sm">
      <span>{label}</span>
      <input checked={checked} type="checkbox" onChange={(event) => onChange(event.target.checked)} />
    </label>
  )
}

function Field({ label, onChange, type = "text", value }: { label: string; onChange(value: string): void; type?: string; value: string }) {
  return <div className="grid gap-2"><Label>{label}</Label><Input className="h-10 rounded-md" type={type} value={value} onChange={(event) => onChange(event.target.value)} /></div>
}

function SelectBox({ label, onChange, value, values }: { label: string; onChange(value: string): void; value: string; values: string[] }) {
  return <div className="grid gap-2"><Label>{label}</Label><Select value={value} onValueChange={onChange}><SelectTrigger className="h-10 rounded-md"><SelectValue /></SelectTrigger><SelectContent>{values.map((item) => <SelectItem key={item} value={item}>{item.replace(/_/g, " ")}</SelectItem>)}</SelectContent></Select></div>
}

function titleFor(view: TaskManagerAutomationView) {
  return view === "templates" ? "Task Templates" : view === "campaigns" ? "Task Campaigns" : view === "reminders" ? "Task Reminders" : view === "categories" ? "Task Categories" : view === "tags" ? "Task Tags" : view === "settings" ? "Task Settings" : "Task Performance"
}

function descriptionFor(view: TaskManagerAutomationView) {
  return view === "campaigns" ? "Create repeatable work batches and track their checklist items." : view === "reminders" ? "Schedule compliance, collection, and follow-up reminders." : view === "performance" ? "Measure campaign progress and reminder workload." : view === "settings" ? "Configure tenant defaults used by Task Manager work flows." : "Configure reusable Task Manager setup data."
}

interface TaskManagerSettingsDraft {
  allow_authorized_comments: boolean
  auto_create_campaign_reminders: boolean
  campaign_reminder_hour: string
  default_assignee: string
  default_priority: string
  default_reminder_lead_days: string
  default_reviewer: string
  default_task_type: string
  media_folder: string
  media_visibility: string
  open_task_claiming: boolean
  require_completion_confirmation: boolean
}

function settingsToDraft(settings: TaskManagerSettings | null): TaskManagerSettingsDraft {
  return {
    allow_authorized_comments: settings ? Boolean(settings.allow_authorized_comments) : true,
    auto_create_campaign_reminders: settings ? Boolean(settings.auto_create_campaign_reminders) : true,
    campaign_reminder_hour: settings?.campaign_reminder_hour ?? "09:00",
    default_assignee: settings?.default_assignee ?? "",
    default_priority: settings?.default_priority ?? "normal",
    default_reminder_lead_days: String(settings?.default_reminder_lead_days ?? 0),
    default_reviewer: settings?.default_reviewer ?? "",
    default_task_type: settings?.default_task_type ?? "simple_task",
    media_folder: settings?.media_folder ?? "task/files",
    media_visibility: settings?.media_visibility ?? "private",
    open_task_claiming: settings ? Boolean(settings.open_task_claiming) : true,
    require_completion_confirmation: settings ? Boolean(settings.require_completion_confirmation) : false,
  }
}

function setDraftField<K extends keyof TaskManagerSettingsDraft>(setDraft: React.Dispatch<React.SetStateAction<TaskManagerSettingsDraft>>, key: K, value: TaskManagerSettingsDraft[K]) {
  setDraft((current) => ({ ...current, [key]: value }))
}

function toSlug(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
}

function formatDateTime(value?: string | null) {
  if (!value) return "Not set"
  return new Intl.DateTimeFormat(undefined, { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value))
}

function parsePayload(value?: string | null) {
  if (!value) return {} as Record<string, unknown>
  try {
    const parsed = JSON.parse(value) as unknown
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {}
  } catch {
    return {}
  }
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value : value === null || value === undefined ? "" : String(value)
}

function salesCampaignName(fromDate: string, toDate: string) {
  const range = [fromDate, toDate].filter(Boolean).join(" to ")
  return `Sales Invoice GST/Tally Verification${range ? ` - ${range}` : ""}`
}
