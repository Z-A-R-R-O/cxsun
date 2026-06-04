import { useEffect, useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { Paperclip, Plus, RefreshCw, Save, Send, Settings } from "lucide-react"

import {
  MasterListEmptyState,
  MasterListPageFrame,
  MasterListPaginationCard,
  MasterListRowActions,
  MasterListTableCard,
  MasterListToolbarCard,
  buildMasterListShowingLabel,
} from "src/components/blocks/lists/master-list"
import { Badge } from "src/components/ui/badge"
import { Button } from "src/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "src/components/ui/card"
import { Checkbox } from "src/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "src/components/ui/dialog"
import { Input } from "src/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "src/components/ui/select"
import { Switch } from "src/components/ui/switch"
import { Textarea } from "src/components/ui/textarea"
import type { AuthSession } from "src/features/auth/auth-client"
import { cn } from "src/lib/utils"
import {
  fileToMailAttachment,
  getMailSettings,
  listMailMessages,
  saveMailSettings,
  sendMailMessage,
  type MailAttachmentInput,
  type MailMessage,
  type MailSettings,
} from "./mail-client"

type MailView = "inbox" | "drafts" | "scheduled" | "sent" | "trash" | "contacts" | "compose" | "settings"
type MailColumnId = "attachments" | "date" | "from" | "mail" | "status" | "to"

const mailStatusFilters = [
  { id: "all", label: "All mail" },
  { id: "queued", label: "Queued" },
  { id: "sent", label: "Sent" },
  { id: "draft", label: "Draft" },
  { id: "failed", label: "Failed" },
] as const

const defaultMailColumnVisibility: Record<MailColumnId, boolean> = {
  attachments: true,
  date: true,
  from: true,
  mail: true,
  status: true,
  to: true,
}

const mailColumnCatalog: Array<{ id: MailColumnId; label: string }> = [
  { id: "mail", label: "Mail" },
  { id: "date", label: "Date" },
  { id: "from", label: "From" },
  { id: "to", label: "To" },
  { id: "status", label: "Status" },
  { id: "attachments", label: "Attachments" },
]

export function MailDeskPage({ session, view = "inbox" }: { session: AuthSession; view?: MailView }) {
  if (view === "settings") return <MailSettingsPage session={session} />
  if (view === "compose") return <MailComposePage session={session} />
  if (view === "contacts") return <MailContactsPage session={session} />
  return <MailMessagesPage session={session} view={view} />
}

function MailMessagesPage({ session, view }: { session: AuthSession; view: MailView }) {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [visibleColumns, setVisibleColumns] = useState(defaultMailColumnVisibility)
  const [currentPage, setCurrentPage] = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState(100)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [viewingMessage, setViewingMessage] = useState<MailMessage | null>(null)
  const status = view === "drafts" ? "draft" : view === "sent" ? "sent" : "all"
  const queryKey = ["mail-messages", session.selectedTenant.slug, status, search]
  const messagesQuery = useQuery({ queryKey, queryFn: () => listMailMessages(session, { status, search }) })
  const messages = useMemo(() => {
    const rows = messagesQuery.data ?? []
    if (view === "drafts") return rows.filter((message) => message.status === "draft")
    if (view === "sent") return rows.filter((message) => message.status === "sent")
    if (view === "scheduled" || view === "trash") return []
    return rows.filter((message) => message.status !== "draft")
  }, [messagesQuery.data, view])
  const filteredMessages = useMemo(() => filterMailMessages(messages, statusFilter, search), [messages, search, statusFilter])
  const totalPages = Math.max(1, Math.ceil(filteredMessages.length / rowsPerPage))
  const pageMessages = filteredMessages.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage)
  const allSelected = pageMessages.length > 0 && pageMessages.every((message) => selectedIds.includes(message.uuid))

  useEffect(() => {
    setSelectedIds([])
    setCurrentPage(1)
  }, [search, statusFilter, view])

  function toggleSelected(uuid: string, checked: boolean | "indeterminate") {
    setSelectedIds((current) => checked === true ? Array.from(new Set([...current, uuid])) : current.filter((id) => id !== uuid))
  }

  function toggleAll(checked: boolean | "indeterminate") {
    const pageIds = pageMessages.map((message) => message.uuid)
    setSelectedIds((current) => checked === true ? Array.from(new Set([...current, ...pageIds])) : current.filter((id) => !pageIds.includes(id)))
  }

  function moveSelectedToTrash() {
    toast.success(`${selectedIds.length} mail item${selectedIds.length === 1 ? "" : "s"} selected for trash`)
    setSelectedIds([])
  }

  return (
    <MasterListPageFrame
      action={
        <div className="flex items-center gap-2">
          <Button className="h-9 rounded-md" variant="outline" onClick={() => void queryClient.invalidateQueries({ queryKey: ["mail-messages", session.selectedTenant.slug] })}><RefreshCw className="size-4" />Refresh</Button>
          <Button className="h-9 rounded-md" onClick={() => navigateMail("compose")} type="button"><Plus className="size-4" />New</Button>
        </div>
      }
      description="Review tenant mail, select messages, and manage delivery history."
      technicalName={`page.mail.${view}`}
      title={mailViewTitle(view)}
    >
      <MasterListToolbarCard
        columns={mailColumnCatalog.map((column) => ({ id: column.id, label: column.label, checked: visibleColumns[column.id], disabled: column.id === "mail", onCheckedChange: (checked) => setVisibleColumns((current) => ({ ...current, [column.id]: checked })) }))}
        filterOptions={mailStatusFilters}
        filterValue={statusFilter}
        onFilterValueChange={setStatusFilter}
        onShowAllColumns={() => setVisibleColumns(defaultMailColumnVisibility)}
        searchPlaceholder="Search mail, sender, recipient, date, subject, or status"
        searchValue={search}
        onSearchValueChange={setSearch}
      />
      {selectedIds.length ? (
        <div className="flex h-10 items-center gap-2 rounded-md border border-border/70 bg-card/95 px-4 text-sm shadow-sm">
          <span className="text-muted-foreground">{selectedIds.length} selected</span>
          <Button className="h-8 rounded-md" size="sm" variant="outline" onClick={moveSelectedToTrash}>Trash selected</Button>
        </div>
      ) : null}
      <MasterListTableCard className="rounded-md">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] table-fixed border-collapse text-sm">
            <thead className="bg-muted/55">
              <tr>
                <ListHeader className="w-12"><Checkbox checked={allSelected} onCheckedChange={toggleAll} /></ListHeader>
                {visibleColumns.mail ? <ListHeader>Mail</ListHeader> : null}
                {visibleColumns.date ? <ListHeader className="w-36">Date</ListHeader> : null}
                {visibleColumns.from ? <ListHeader className="w-36">From</ListHeader> : null}
                {visibleColumns.to ? <ListHeader className="w-44">To</ListHeader> : null}
                {visibleColumns.status ? <ListHeader className="w-28">Status</ListHeader> : null}
                {visibleColumns.attachments ? <ListHeader className="w-24 text-right">Files</ListHeader> : null}
                <ListHeader className="w-20 text-right">Action</ListHeader>
              </tr>
            </thead>
            <tbody>
              {pageMessages.map((message) => {
                const isChecked = selectedIds.includes(message.uuid)
                return (
                  <tr key={message.uuid} className="border-b border-border/60 last:border-b-0 hover:bg-muted/30">
                    <td className="px-4 py-2.5">
                      <Checkbox checked={isChecked} onCheckedChange={(checked) => toggleSelected(message.uuid, checked)} />
                    </td>
                    {visibleColumns.mail ? (
                      <td className="min-w-0 px-4 py-2.5">
                        <button className="block w-full truncate text-left font-semibold text-foreground hover:underline" onClick={() => setViewingMessage(message)} type="button">{message.subject || "(no subject)"}</button>
                        <div className="font-mono text-xs text-muted-foreground">{message.message_no}</div>
                      </td>
                    ) : null}
                    {visibleColumns.date ? <td className="whitespace-nowrap px-4 py-2.5 text-muted-foreground">{formatTableDate(message.sent_at ?? message.queued_at ?? message.created_at)}</td> : null}
                    {visibleColumns.from ? <td className="truncate px-4 py-2.5">{message.from_name || message.from_email || message.created_by}</td> : null}
                    {visibleColumns.to ? <td className="truncate px-4 py-2.5 text-muted-foreground">{message.to_json.join(", ") || "-"}</td> : null}
                    {visibleColumns.status ? <td className="px-4 py-2.5"><StatusBadge status={message.status} /></td> : null}
                    {visibleColumns.attachments ? <td className="px-4 py-2.5 text-right text-muted-foreground">{message.attachments?.length ?? 0}</td> : null}
                    <td className="px-4 py-2 text-right">
                      <MasterListRowActions
                        deleteLabel="Trash"
                        title={message.subject || message.message_no}
                        onDelete={() => {
                          toast.success("Mail item selected for trash", { description: message.message_no })
                          setSelectedIds((current) => current.filter((id) => id !== message.uuid))
                        }}
                        onView={() => setViewingMessage(message)}
                      />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {pageMessages.length === 0 ? <MasterListEmptyState>{messagesQuery.isFetching ? "Loading mail." : emptyMailText(view)}</MasterListEmptyState> : null}
      </MasterListTableCard>
      <MasterListPaginationCard
        page={currentPage}
        rowsPerPage={rowsPerPage}
        showingLabel={buildMasterListShowingLabel({ page: currentPage, pageSize: rowsPerPage, totalCount: filteredMessages.length })}
        singularLabel="mail"
        totalCount={filteredMessages.length}
        totalPages={totalPages}
        onNextPage={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
        onPageChange={setCurrentPage}
        onPreviousPage={() => setCurrentPage((page) => Math.max(1, page - 1))}
        onRowsPerPageChange={(value) => {
          setRowsPerPage(value)
          setCurrentPage(1)
        }}
      />
      <MailViewDialog message={viewingMessage} onOpenChange={(open) => !open && setViewingMessage(null)} />
    </MasterListPageFrame>
  )
}

function MailContactsPage({ session }: { session: AuthSession }) {
  const messagesQuery = useQuery({ queryKey: ["mail-messages", session.selectedTenant.slug, "contacts"], queryFn: () => listMailMessages(session, { status: "all" }) })
  const contacts = useMemo(() => {
    const values = new Set<string>()
    for (const message of messagesQuery.data ?? []) {
      for (const email of [...message.to_json, ...message.cc_json, ...message.bcc_json, message.from_email]) {
        if (email) values.add(email)
      }
    }
    return Array.from(values).sort()
  }, [messagesQuery.data])

  return (
    <MasterListPageFrame
      description="Mail contacts gathered from tenant mail senders and recipients."
      technicalName="page.mail.contacts"
      title="Contacts"
    >
      <Card className="rounded-md border-border/70 py-0 shadow-sm">
        <CardContent className="p-0">
          {contacts.map((email) => (
            <div key={email} className="flex h-12 items-center gap-3 border-b px-4 last:border-b-0">
              <span className="grid size-8 place-items-center rounded-md bg-primary/10 text-xs font-semibold text-primary">{email.slice(0, 1).toUpperCase()}</span>
              <span className="text-sm font-medium">{email}</span>
            </div>
          ))}
          {!contacts.length ? <div className="grid min-h-48 place-items-center text-sm text-muted-foreground">No mail contacts yet.</div> : null}
        </CardContent>
      </Card>
    </MasterListPageFrame>
  )
}

function MailViewDialog({ message, onOpenChange }: { message: MailMessage | null; onOpenChange(open: boolean): void }) {
  return (
    <Dialog open={Boolean(message)} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] w-[min(760px,calc(100vw-2rem))] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{message?.subject || "Mail details"}</DialogTitle>
          <DialogDescription>{message ? `${message.message_no} · ${message.status}` : "Review tenant mail delivery details."}</DialogDescription>
        </DialogHeader>
        {message ? (
          <div className="space-y-4">
            <div className="grid gap-2 sm:grid-cols-2">
              <Detail label="From" value={message.from_email || "-"} />
              <Detail label="To" value={message.to_json.join(", ") || "-"} />
              <Detail label="Created" value={formatDate(message.created_at)} />
              <Detail label="Sent" value={message.sent_at ? formatDate(message.sent_at) : "-"} />
            </div>
            {message.error ? <p className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">{message.error}</p> : null}
            <div className="rounded-md border border-border/70 bg-background p-3 leading-6 text-muted-foreground whitespace-pre-wrap">{message.body_text || "-"}</div>
            {message.attachments?.length ? (
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Attachments</h3>
                {message.attachments.map((attachment) => <div key={attachment.uuid} className="rounded-md bg-muted/50 px-2 py-1 text-xs">{attachment.file_name} - {formatBytes(attachment.size_bytes)}</div>)}
              </div>
            ) : null}
            {message.events?.length ? (
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Events</h3>
                {message.events.map((event) => <div key={event.uuid} className="rounded-md bg-muted/50 px-2 py-1 text-xs">{event.message} - {formatDate(event.created_at)}</div>)}
              </div>
            ) : null}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

function ListHeader({ children, className }: { children: React.ReactNode; className?: string }) {
  return <th className={cn("px-4 py-3 text-left text-sm font-semibold text-foreground", className)}>{children}</th>
}

function navigateMail(view: MailView) {
  const path = `/app/app-mail-${view}`
  window.history.pushState(null, "", path)
  window.dispatchEvent(new Event("popstate"))
}

function mailViewTitle(view: MailView) {
  const labels: Record<MailView, string> = {
    compose: "Compose Mail",
    contacts: "Contacts",
    drafts: "Drafts",
    inbox: "Inbox",
    scheduled: "Scheduled",
    sent: "Sent",
    settings: "Mail Settings",
    trash: "Trash",
  }
  return labels[view]
}

function emptyMailText(view: MailView) {
  if (view === "scheduled") return "No scheduled mail yet."
  if (view === "trash") return "Trash is empty."
  if (view === "drafts") return "No drafts found."
  if (view === "sent") return "No sent mail found."
  return "No mail found."
}

function filterMailMessages(messages: MailMessage[], statusFilter: string, search: string) {
  const needle = search.trim().toLowerCase()
  return messages
    .filter((message) => statusFilter === "all" || message.status === statusFilter)
    .filter((message) => {
      if (!needle) return true
      return [
        message.message_no,
        message.subject,
        message.from_email,
        message.from_name,
        message.created_by,
        message.status,
        message.to_json.join(" "),
        message.cc_json.join(" "),
        message.bcc_json.join(" "),
        formatDate(message.sent_at ?? message.queued_at ?? message.created_at),
      ].some((value) => value?.toLowerCase().includes(needle))
    })
}

function MailComposePage({ session }: { session: AuthSession }) {
  const queryClient = useQueryClient()
  const [to, setTo] = useState("")
  const [cc, setCc] = useState("")
  const [bcc, setBcc] = useState("")
  const [subject, setSubject] = useState("")
  const [bodyText, setBodyText] = useState("")
  const [attachments, setAttachments] = useState<MailAttachmentInput[]>([])
  const settingsQuery = useQuery({ queryKey: ["mail-settings", session.selectedTenant.slug], queryFn: () => getMailSettings(session) })
  const sendMutation = useMutation({
    mutationFn: (saveAsDraft: boolean) => sendMailMessage(session, {
      attachments,
      bcc: splitEmails(bcc),
      bodyText,
      cc: splitEmails(cc),
      saveAsDraft,
      subject,
      to: splitEmails(to),
    }),
    onSuccess: (message) => {
      toast.success(message.status === "draft" ? "Mail saved as draft" : "Mail queued", { description: message.message_no })
      setTo("")
      setCc("")
      setBcc("")
      setSubject("")
      setBodyText("")
      setAttachments([])
      void queryClient.invalidateQueries({ queryKey: ["mail-messages", session.selectedTenant.slug] })
    },
    onError: (error) => toast.error("Mail could not be queued", { description: error instanceof Error ? error.message : "Please check mail settings." }),
  })

  async function addFiles(files: FileList | null) {
    const next = await Promise.all(Array.from(files ?? []).map(fileToMailAttachment))
    setAttachments((current) => [...current, ...next])
  }

  return (
    <MasterListPageFrame
      action={
        <div className="flex gap-2">
          <Button className="h-9 rounded-md" variant="outline" disabled={sendMutation.isPending} onClick={() => sendMutation.mutate(true)}><Save className="size-4" />Draft</Button>
          <Button className="h-9 rounded-md" disabled={sendMutation.isPending || !settingsQuery.data?.enabled} onClick={() => sendMutation.mutate(false)}><Send className="size-4" />Queue send</Button>
        </div>
      }
      description="Compose tenant mail and enqueue it through the mail queue with optional attachments."
      technicalName="page.mail.compose"
      title="Compose Mail"
    >
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <Card className="rounded-md border-border/70 py-0 shadow-sm">
          <CardContent className="grid gap-3 p-4">
            <MailField label="To" value={to} onChange={setTo} placeholder="customer@example.com, accounts@example.com" />
            <div className="grid gap-3 md:grid-cols-2">
              <MailField label="Cc" value={cc} onChange={setCc} />
              <MailField label="Bcc" value={bcc} onChange={setBcc} />
            </div>
            <MailField label="Subject" value={subject} onChange={setSubject} />
            <label className="grid gap-2 text-sm">
              <span className="font-medium text-foreground">Message</span>
              <Textarea className="min-h-64 rounded-md bg-background" value={bodyText} onChange={(event) => setBodyText(event.target.value)} />
            </label>
            <div className="flex flex-wrap items-center gap-2">
              <label className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-md border border-input bg-background px-3 text-sm font-medium">
                <Paperclip className="size-4" />
                Attach
                <input className="sr-only" multiple type="file" onChange={(event) => void addFiles(event.target.files)} />
              </label>
              {attachments.map((attachment, index) => (
                <button key={`${attachment.fileName}-${index}`} className="rounded-md border px-2 py-1 text-xs text-muted-foreground hover:bg-muted" onClick={() => setAttachments((current) => current.filter((_, itemIndex) => itemIndex !== index))} type="button">
                  {attachment.fileName}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-md border-border/70 py-0 shadow-sm">
          <CardHeader className="border-b px-4 py-3"><CardTitle className="flex items-center gap-2 text-base"><Settings className="size-4" />Sender</CardTitle></CardHeader>
          <CardContent className="space-y-3 p-4 text-sm">
            <Detail label="Enabled" value={settingsQuery.data?.enabled ? "Yes" : "No"} />
            <Detail label="From" value={settingsQuery.data?.from_email || "-"} />
            <Detail label="SMTP" value={settingsQuery.data?.host ? `${settingsQuery.data.host}:${settingsQuery.data.port}` : "-"} />
            {!settingsQuery.data?.enabled ? <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">Enable mail settings before queue send.</p> : null}
          </CardContent>
        </Card>
      </div>
    </MasterListPageFrame>
  )
}

function MailSettingsPage({ session }: { session: AuthSession }) {
  const queryClient = useQueryClient()
  const settingsQuery = useQuery({ queryKey: ["mail-settings", session.selectedTenant.slug], queryFn: () => getMailSettings(session) })
  const [draft, setDraft] = useState<MailSettings | null>(null)
  useEffect(() => {
    if (settingsQuery.data) setDraft(settingsQuery.data)
  }, [settingsQuery.data])
  const saveMutation = useMutation({
    mutationFn: () => saveMailSettings(session, draft ?? {}),
    onSuccess: (settings) => {
      setDraft(settings)
      toast.success("Mail settings saved")
      void queryClient.invalidateQueries({ queryKey: ["mail-settings", session.selectedTenant.slug] })
    },
    onError: (error) => toast.error("Mail settings could not be saved", { description: error instanceof Error ? error.message : "Please try again." }),
  })

  return (
    <MasterListPageFrame
      action={<Button className="h-9 rounded-md" disabled={!draft || saveMutation.isPending} onClick={() => saveMutation.mutate()}><Save className="size-4" />Save</Button>}
      description="Configure this tenant company's dynamic SMTP sender used by queued mail delivery."
      technicalName="page.mail.settings"
      title="Mail Settings"
    >
      {draft ? (
        <Card className="rounded-md border-border/70 py-0 shadow-sm">
          <CardContent className="grid gap-5 p-4 lg:grid-cols-2">
            <div className="grid min-w-0 gap-3">
              <MailField label="SMTP host" value={draft.host} onChange={(host) => setDraft({ ...draft, host })} />
              <div className="grid gap-3 sm:grid-cols-2">
                <MailField label="Port" type="number" value={String(draft.port)} onChange={(port) => setDraft({ ...draft, port: Number(port || 587) })} />
                <MailSelectField
                  label="Security"
                  value={draft.secure ? "secure" : "starttls"}
                  onChange={(value) => setDraft({ ...draft, secure: value === "secure" })}
                />
              </div>
              <MailField label="Username" value={draft.username} onChange={(username) => setDraft({ ...draft, username })} />
              <MailField label="Password" type="password" value={draft.password} onChange={(password) => setDraft({ ...draft, password })} />
            </div>
            <div className="grid min-w-0 gap-3 lg:border-l lg:pl-5">
              <MailField label="From email" value={draft.from_email} onChange={(from_email) => setDraft({ ...draft, from_email })} />
              <MailField label="From name" value={draft.from_name ?? ""} onChange={(from_name) => setDraft({ ...draft, from_name })} />
              <MailField label="Reply to" value={draft.reply_to ?? ""} onChange={(reply_to) => setDraft({ ...draft, reply_to })} />
              <MailSwitchField checked={draft.enabled} onChange={(enabled) => setDraft({ ...draft, enabled })} />
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid min-h-52 place-items-center text-sm text-muted-foreground">Loading mail settings...</div>
      )}
    </MasterListPageFrame>
  )
}

function MailField({ label, onChange, placeholder, type = "text", value }: { label: string; onChange(value: string): void; placeholder?: string; type?: string; value: string }) {
  return (
    <label className="grid min-w-0 gap-2 text-sm">
      <span className="font-medium text-foreground">{label}</span>
      <Input className="h-9 w-full rounded-md bg-background" placeholder={placeholder} type={type} value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  )
}

function MailSelectField({ label, onChange, value }: { label: string; onChange(value: string): void; value: string }) {
  return (
    <label className="grid min-w-0 gap-2 text-sm">
      <span className="font-medium text-foreground">{label}</span>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-9 w-full rounded-md border-input bg-background px-3 text-left font-normal leading-none shadow-none">
          <SelectValue />
        </SelectTrigger>
        <SelectContent align="start" position="popper" sideOffset={4} className="z-[130] w-[var(--radix-select-trigger-width)] rounded-md p-1 shadow-lg">
          <SelectItem value="starttls" className="h-8 rounded-sm px-2 pr-8">STARTTLS / port 587</SelectItem>
          <SelectItem value="secure" className="h-8 rounded-sm px-2 pr-8">SSL / port 465</SelectItem>
        </SelectContent>
      </Select>
    </label>
  )
}

function MailSwitchField({ checked, onChange }: { checked: boolean; onChange(value: boolean): void }) {
  return (
    <label className="grid min-w-0 gap-2 text-sm">
      <span className="font-medium text-foreground">Enable tenant mail</span>
      <span
        className={cn(
          "flex h-9 w-full items-center justify-between gap-3 rounded-md border px-3 transition-colors",
          checked
            ? "border-emerald-200 bg-emerald-50 text-emerald-950"
            : "border-input bg-background text-foreground",
        )}
      >
        <span className={cn("truncate text-sm", checked ? "text-emerald-700" : "text-muted-foreground")}>Queued messages can be sent.</span>
        <Switch
          checked={checked}
          className="data-checked:bg-emerald-600 data-unchecked:bg-input"
          onCheckedChange={onChange}
        />
      </span>
    </label>
  )
}

function StatusBadge({ status }: { status: MailMessage["status"] }) {
  return <Badge className="rounded-md capitalize" variant={status === "sent" ? "default" : status === "failed" ? "destructive" : "outline"}>{status}</Badge>
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div className="rounded-md bg-muted/40 p-2"><div className="text-xs text-muted-foreground">{label}</div><div className="truncate font-medium">{value}</div></div>
}

function splitEmails(value: string) {
  return value.split(/[,\n;]/).map((item) => item.trim()).filter(Boolean)
}

function formatDate(value?: string | null) {
  if (!value) return "-"
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value))
}

function formatTableDate(value?: string | null) {
  if (!value) return "-"
  return new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(value))
}

function formatBytes(value: number) {
  if (value < 1024) return `${value} B`
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`
  return `${(value / (1024 * 1024)).toFixed(1)} MB`
}
