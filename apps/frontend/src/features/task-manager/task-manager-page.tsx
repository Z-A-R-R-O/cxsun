import { useMemo, useState } from "react"
import { useMutation, useQuery } from "@tanstack/react-query"
import { ArrowLeft, CheckCircle2, ClipboardCheck, ListChecks, Plus, RefreshCw, Save, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "src/components/ui/badge"
import { Button } from "src/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "src/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "src/components/ui/dialog"
import { Input } from "src/components/ui/input"
import { Label } from "src/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "src/components/ui/select"
import { Switch } from "src/components/ui/switch"
import { Textarea } from "src/components/ui/textarea"
import {
  MasterListEmptyState,
  MasterListPageFrame,
  MasterListPaginationCard,
  MasterListTableCard,
  MasterListToolbarCard,
  buildMasterListShowingLabel,
} from "src/components/blocks/lists/master-list"
import type { AuthSession } from "src/features/auth/auth-client"
import { listTenantUsers, type TenantUserRecord } from "src/features/user-manager/user-manager-client"
import { cn } from "src/lib/utils"
import {
  changeTaskManagerStatus,
  deleteTaskManagerTask,
  emptyTaskManagerTask,
  listTaskManagerTasks,
  upsertTaskManagerTask,
  type TaskManagerPriority,
  type TaskManagerStatus,
  type TaskManagerTask,
  type TaskManagerTaskInput,
} from "./task-manager-client"

type TaskManagerView = { mode: "list" } | { mode: "upsert"; task: TaskManagerTask | null } | { mode: "show"; task: TaskManagerTask }

const statusOptions: Array<{ label: string; value: TaskManagerStatus }> = [
  { label: "New", value: "new" },
  { label: "Todo", value: "todo" },
  { label: "In progress", value: "in_progress" },
  { label: "Review", value: "review" },
  { label: "Completed", value: "completed" },
  { label: "Cancelled", value: "cancelled" },
]
const priorityOptions: Array<{ label: string; value: TaskManagerPriority }> = [
  { label: "Low", value: "low" },
  { label: "Normal", value: "normal" },
  { label: "High", value: "high" },
  { label: "Urgent", value: "urgent" },
]
const moduleOptions = ["sales", "purchase", "receipt", "payment", "stock-ledger", "purchase-receipt", "delivery-note", "contact", "company", "product", "auditor", "general"]

export function TaskManagerPage({ session }: { session: AuthSession }) {
  const [view, setView] = useState<TaskManagerView>({ mode: "list" })
  const [searchValue, setSearchValue] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [currentPage, setCurrentPage] = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState(20)
  const [isNewDialogOpen, setIsNewDialogOpen] = useState(false)
  const query = useQuery({ queryKey: ["task-manager", session.selectedTenant.slug], queryFn: () => listTaskManagerTasks(session) })
  const tenantUsersQuery = useQuery({ queryKey: ["task-manager-users", session.selectedTenant.id, session.selectedTenant.slug], queryFn: () => listTenantUsers(session, session.selectedTenant.id) })
  const upsertMutation = useMutation({ mutationFn: (input: TaskManagerTaskInput) => upsertTaskManagerTask(session, input) })
  const statusMutation = useMutation({ mutationFn: ({ task, status }: { task: TaskManagerTask; status: TaskManagerStatus }) => changeTaskManagerStatus(session, task, status) })
  const deleteMutation = useMutation({ mutationFn: (task: TaskManagerTask) => deleteTaskManagerTask(session, task) })
  const tasks = query.data ?? []
  const filteredTasks = useMemo(() => {
    const term = searchValue.trim().toLowerCase()
    return tasks.filter((task) => {
      const matchesStatus = statusFilter === "all" || task.status === statusFilter
      const matchesSearch = !term || [task.task_no, task.title, task.subject, task.description, task.assigned_to, task.assigned_to_name, task.module_key, task.linked_record_label, task.status].some((value) => String(value ?? "").toLowerCase().includes(term))
      return matchesStatus && matchesSearch
    })
  }, [searchValue, statusFilter, tasks])
  const totalPages = Math.max(1, Math.ceil(filteredTasks.length / rowsPerPage))
  const pageTasks = filteredTasks.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage)

  async function refresh() {
    await query.refetch()
  }

  async function save(input: TaskManagerTaskInput) {
    const task = await upsertMutation.mutateAsync(input)
    toast.success(input.uuid ? "Task updated" : "Task created", { description: task.task_no })
    await refresh()
    setView({ mode: "show", task })
  }

  async function changeStatus(task: TaskManagerTask, status: TaskManagerStatus) {
    const updated = await statusMutation.mutateAsync({ task, status })
    toast.success("Task status updated", { description: updated.status })
    await refresh()
    setView({ mode: "show", task: updated })
  }

  async function destroy(task: TaskManagerTask) {
    await deleteMutation.mutateAsync(task)
    toast.error("Task suspended", { description: task.task_no })
    await refresh()
    setView({ mode: "list" })
  }

  if (view.mode === "upsert") {
    return <TaskUpsertPage isSaving={upsertMutation.isPending} task={view.task} onBack={() => setView(view.task ? { mode: "show", task: view.task } : { mode: "list" })} onSubmit={save} />
  }

  if (view.mode === "show") {
    const task = tasks.find((item) => item.uuid === view.task.uuid) ?? view.task
    return <TaskShowPage isWorking={statusMutation.isPending || deleteMutation.isPending} task={task} onBack={() => setView({ mode: "list" })} onDelete={() => void destroy(task)} onEdit={() => setView({ mode: "upsert", task })} onStatus={(status) => void changeStatus(task, status)} />
  }

  return (
    <MasterListPageFrame
      title="Task Manager"
      description="Assign work, verify invoices, follow auditor actions, and track staff performance."
      technicalName="page.task-manager.list"
      action={
        <div className="flex items-center gap-2">
          <Button disabled={query.isFetching} onClick={() => void refresh()} type="button" variant="outline" className="h-9 rounded-md"><RefreshCw className={cn("size-4", query.isFetching && "animate-spin")} />Refresh</Button>
          <Button onClick={() => setIsNewDialogOpen(true)} type="button" className="h-9 rounded-md"><Plus className="size-4" />New task</Button>
        </div>
      }
    >
      <NewTaskDialog
        isSaving={upsertMutation.isPending}
        open={isNewDialogOpen}
        tenantUsers={tenantUsersQuery.data ?? []}
        onOpenChange={setIsNewDialogOpen}
        onSubmit={async (input) => {
          await save(input)
          setIsNewDialogOpen(false)
        }}
      />
      <MasterListToolbarCard
        filterOptions={[{ id: "all", label: "All tasks" }, ...statusOptions.map((option) => ({ id: option.value, label: option.label }))]}
        filterValue={statusFilter}
        onFilterValueChange={(value) => {
          setStatusFilter(value)
          setCurrentPage(1)
        }}
        searchPlaceholder="Search task, staff, module, invoice, or auditor work"
        searchValue={searchValue}
        onSearchValueChange={(value) => {
          setSearchValue(value)
          setCurrentPage(1)
        }}
      />
      <MasterListTableCard>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-sm">
            <thead className="bg-muted/50">
              <tr><Header>Task</Header><Header>Module</Header><Header>Assigned</Header><Header>Status</Header><Header>Priority</Header><Header>Due</Header><Header className="text-right">Score</Header></tr>
            </thead>
            <tbody>
              {pageTasks.map((task) => (
                <tr key={task.uuid} className="border-t border-border/70">
                  <td className="px-3 py-2">
                    <button type="button" className="font-semibold hover:underline" onClick={() => setView({ mode: "show", task })}>{task.title}</button>
                    <div className="text-xs text-muted-foreground">{[task.task_no, task.subject].filter(Boolean).join(" - ")}</div>
                  </td>
                  <td className="px-3 py-2 text-muted-foreground"><div>{task.module_key ?? "general"}</div><div className="text-xs">{task.linked_record_label ?? task.linked_record_id ?? "-"}</div></td>
                  <td className="px-3 py-2">{task.assigned_to_name || task.assigned_to || "Unassigned"}</td>
                  <td className="px-3 py-2"><TaskStatusBadge status={task.status} /></td>
                  <td className="px-3 py-2"><TaskPriorityBadge priority={task.priority} /></td>
                  <td className="px-3 py-2">{formatDate(task.due_date)}</td>
                  <td className="px-3 py-2 text-right font-semibold">{task.score}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {pageTasks.length === 0 ? <MasterListEmptyState>{query.isFetching ? "Loading tasks." : "No tasks found."}</MasterListEmptyState> : null}
      </MasterListTableCard>
      <MasterListPaginationCard
        page={currentPage}
        rowsPerPage={rowsPerPage}
        showingLabel={buildMasterListShowingLabel({ page: currentPage, pageSize: rowsPerPage, totalCount: filteredTasks.length })}
        singularLabel="tasks"
        totalCount={filteredTasks.length}
        totalPages={totalPages}
        onNextPage={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
        onPageChange={setCurrentPage}
        onPreviousPage={() => setCurrentPage((page) => Math.max(1, page - 1))}
        onRowsPerPageChange={(value) => {
          setRowsPerPage(value)
          setCurrentPage(1)
        }}
      />
    </MasterListPageFrame>
  )
}

function NewTaskDialog({ isSaving, onOpenChange, onSubmit, open, tenantUsers }: { isSaving: boolean; onOpenChange(open: boolean): void; onSubmit(input: TaskManagerTaskInput): void; open: boolean; tenantUsers: TenantUserRecord[] }) {
  const [draft, setDraft] = useState<TaskManagerTaskInput>(() => emptyTaskManagerTask())

  function resetAndClose(openState: boolean) {
    if (!openState) setDraft(emptyTaskManagerTask())
    onOpenChange(openState)
  }

  function assignToUser(email: string) {
    const user = tenantUsers.find((item) => item.email === email)
    setDraft((current) => ({ ...current, assigned_to: user?.email ?? "", assigned_to_name: user?.name ?? "" }))
  }

  return (
    <Dialog open={open} onOpenChange={resetAndClose}>
      <DialogContent className="sm:max-w-[620px]">
        <DialogHeader>
          <DialogTitle>New task</DialogTitle>
          <DialogDescription>Create the task quickly. More actions and module details can be added from the show page.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <Field label="Title *" value={draft.title ?? ""} onChange={(value) => setDraft((current) => ({ ...current, title: value }))} />
          <Field label="Subject" value={draft.subject ?? ""} onChange={(value) => setDraft((current) => ({ ...current, subject: value }))} />
          <div className="grid gap-4 md:grid-cols-2">
            <SelectField label="Priority" value={draft.priority ?? "normal"} options={priorityOptions} onChange={(value) => setDraft((current) => ({ ...current, priority: value as TaskManagerPriority }))} />
            <SelectField label="Assign to" value={draft.assigned_to || "unassigned"} options={[{ label: "Unassigned", value: "unassigned" }, ...tenantUsers.map((user) => ({ label: `${user.name} - ${user.email}`, value: user.email }))]} onChange={(value) => assignToUser(value === "unassigned" ? "" : value)} />
          </div>
          <div className="rounded-md border border-border/70 bg-muted/30 px-3 py-2 text-sm text-muted-foreground">Status will be created as <span className="font-medium text-foreground">New</span>.</div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" className="rounded-md" onClick={() => resetAndClose(false)}>Cancel</Button>
          <Button disabled={isSaving} type="button" className="rounded-md" onClick={() => onSubmit({ ...draft, status: "new" })}><Save className={cn("size-4", isSaving && "animate-spin")} />Create task</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function TaskUpsertPage({ isSaving, onBack, onSubmit, task }: { isSaving: boolean; onBack(): void; onSubmit(input: TaskManagerTaskInput): void; task: TaskManagerTask | null }) {
  const [draft, setDraft] = useState<TaskManagerTaskInput>(() => task ? { ...task } : emptyTaskManagerTask())

  function setField<Key extends keyof TaskManagerTaskInput>(key: Key, value: TaskManagerTaskInput[Key]) {
    setDraft((current) => ({ ...current, [key]: value }))
  }

  return (
    <main className="mx-auto flex w-[calc(100%-2rem)] max-w-[1200px] flex-col gap-5 py-6 sm:w-[calc(100%-3rem)] lg:w-[calc(100%-4rem)]">
      <div className="flex items-start gap-3">
        <Button type="button" variant="outline" size="icon" className="mt-1 size-9 rounded-md" onClick={onBack}><ArrowLeft className="size-4" /></Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-normal">{task ? "Edit task" : "New task"}</h1>
          <p className="text-sm text-muted-foreground">Assign office automation work to staff and attach it to any module record.</p>
        </div>
      </div>
      <Card className="rounded-md">
        <CardHeader className="pb-3"><CardTitle className="text-base">Task details</CardTitle></CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-4 md:grid-cols-[2fr_1.5fr_1fr_1fr]">
            <Field label="Title *" value={draft.title ?? ""} onChange={(value) => setField("title", value)} />
            <Field label="Subject" value={draft.subject ?? ""} onChange={(value) => setField("subject", value)} />
            <SelectField label="Priority" value={draft.priority ?? "normal"} options={priorityOptions} onChange={(value) => setField("priority", value as TaskManagerPriority)} />
            <SelectField label="Status" value={draft.status ?? "new"} options={statusOptions} onChange={(value) => setField("status", value as TaskManagerStatus)} />
          </div>
          <TextField label="Work instructions" value={draft.description ?? ""} onChange={(value) => setField("description", value)} />
          <div className="grid gap-4 md:grid-cols-4">
            <SelectField label="Module" value={draft.module_key ?? "general"} options={moduleOptions.map((value) => ({ label: value, value }))} onChange={(value) => setField("module_key", value)} />
            <Field label="Record id / invoice no" value={draft.linked_record_id ?? ""} onChange={(value) => setField("linked_record_id", value)} />
            <Field label="Record label" value={draft.linked_record_label ?? ""} onChange={(value) => setField("linked_record_label", value)} />
            <Field label="Due date" type="date" value={draft.due_date ?? ""} onChange={(value) => setField("due_date", value)} />
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <Field label="Assign to email" value={draft.assigned_to ?? ""} onChange={(value) => setField("assigned_to", value)} />
            <Field label="Staff name" value={draft.assigned_to_name ?? ""} onChange={(value) => setField("assigned_to_name", value)} />
            <Field label="Performance score" type="number" value={String(draft.score ?? 0)} onChange={(value) => setField("score", Number(value || 0))} />
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <SwitchRow checked={Boolean(draft.verification_required)} label="Verification required" onCheckedChange={(checked) => setField("verification_required", checked)} />
            <SwitchRow checked={Boolean(draft.auditor_followup_required)} label="Auditor follow-up required" onCheckedChange={(checked) => setField("auditor_followup_required", checked)} />
          </div>
          <div className="flex justify-end gap-2 border-t border-border/70 pt-4">
            <Button type="button" variant="outline" className="rounded-md" onClick={onBack}>Back</Button>
            <Button disabled={isSaving} type="button" className="rounded-md" onClick={() => onSubmit(draft)}><Save className={cn("size-4", isSaving && "animate-spin")} />Save task</Button>
          </div>
        </CardContent>
      </Card>
    </main>
  )
}

function TaskShowPage({ isWorking, onBack, onDelete, onEdit, onStatus, task }: { isWorking: boolean; onBack(): void; onDelete(): void; onEdit(): void; onStatus(status: TaskManagerStatus): void; task: TaskManagerTask }) {
  return (
    <main className="mx-auto flex w-[calc(100%-2rem)] max-w-[1200px] flex-col gap-5 py-6 sm:w-[calc(100%-3rem)] lg:w-[calc(100%-4rem)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <Button type="button" variant="outline" size="icon" className="mt-1 size-9 rounded-md" onClick={onBack}><ArrowLeft className="size-4" /></Button>
          <div>
            <h1 className="text-2xl font-semibold tracking-normal">{task.title}</h1>
            <p className="text-sm text-muted-foreground">{[task.task_no, task.subject, task.module_key ?? "general", task.linked_record_label ?? task.linked_record_id ?? "No linked record"].filter(Boolean).join(" - ")}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" className="rounded-md" onClick={onEdit}>Edit</Button>
          <Button disabled={isWorking} type="button" variant="outline" className="rounded-md hover:border-destructive/40 hover:bg-destructive/10 hover:text-destructive" onClick={onDelete}><Trash2 className="size-4" />Delete</Button>
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <Card className="rounded-md">
          <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-base"><ClipboardCheck className="size-4" />Work</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <p className="whitespace-pre-wrap text-sm leading-6">{task.description || "No work instructions added."}</p>
            <div className="grid gap-3 sm:grid-cols-3">
              <Info label="Assigned to" value={task.assigned_to_name || task.assigned_to || "Unassigned"} />
              <Info label="Due date" value={formatDate(task.due_date)} />
              <Info label="Score" value={String(task.score)} />
            </div>
            <div className="flex flex-wrap gap-2">
              {statusOptions.map((option) => <Button key={option.value} disabled={isWorking || task.status === option.value} type="button" variant={task.status === option.value ? "default" : "outline"} className="rounded-md" onClick={() => onStatus(option.value)}>{option.label}</Button>)}
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-md">
          <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-base"><ListChecks className="size-4" />Activity</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {task.activities.map((activity) => (
              <div key={activity.uuid} className="rounded-md border border-border/70 p-3 text-sm">
                <div className="font-medium">{activity.message}</div>
                <div className="mt-1 text-xs text-muted-foreground">{activity.actor_email} - {formatDateTime(activity.created_at)}</div>
              </div>
            ))}
            {!task.activities.length ? <div className="text-sm text-muted-foreground">No activity yet.</div> : null}
          </CardContent>
        </Card>
      </div>
    </main>
  )
}

function TaskStatusBadge({ status }: { status: TaskManagerStatus }) {
  const done = status === "completed"
  return <Badge variant="outline" className={cn("h-6 gap-1 rounded-md px-2 text-[11px]", done ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-border bg-muted text-muted-foreground")}>{done ? <CheckCircle2 className="size-3" /> : null}{status.replace("_", " ")}</Badge>
}

function TaskPriorityBadge({ priority }: { priority: TaskManagerPriority }) {
  return <span className={cn("rounded-md px-2 py-1 text-xs font-medium", priority === "urgent" ? "bg-red-50 text-red-700" : priority === "high" ? "bg-amber-50 text-amber-700" : "bg-muted text-muted-foreground")}>{priority}</span>
}

function Field({ label, onChange, type = "text", value }: { label: string; onChange(value: string): void; type?: string; value: string }) {
  return <div className="grid gap-2"><Label>{label}</Label><Input className="h-11 rounded-md" type={type} value={value} onChange={(event) => onChange(event.target.value)} /></div>
}

function TextField({ label, onChange, value }: { label: string; onChange(value: string): void; value: string }) {
  return <div className="grid gap-2"><Label>{label}</Label><Textarea className="min-h-28 rounded-md" value={value} onChange={(event) => onChange(event.target.value)} /></div>
}

function SelectField({ label, onChange, options, value }: { label: string; onChange(value: string): void; options: Array<{ label: string; value: string }>; value: string }) {
  return (
    <div className="grid gap-2">
      <Label>{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-11 min-h-11 rounded-md"><SelectValue /></SelectTrigger>
        <SelectContent>{options.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent>
      </Select>
    </div>
  )
}

function SwitchRow({ checked, label, onCheckedChange }: { checked: boolean; label: string; onCheckedChange(checked: boolean): void }) {
  return <label className="flex h-11 items-center justify-between rounded-md border border-border/70 px-3 text-sm font-medium"><span>{label}</span><Switch checked={checked} onCheckedChange={onCheckedChange} /></label>
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="rounded-md border border-border/70 p-3"><div className="text-xs text-muted-foreground">{label}</div><div className="mt-1 font-medium">{value}</div></div>
}

function Header({ children, className }: { children: React.ReactNode; className?: string }) {
  return <th className={cn("px-3 py-2 text-left text-sm font-medium", className)}>{children}</th>
}

function formatDate(value?: string | null) {
  if (!value) return "Not set"
  return new Intl.DateTimeFormat(undefined, { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value))
}

function formatDateTime(value?: string | null) {
  if (!value) return "Not set"
  return new Intl.DateTimeFormat(undefined, { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value))
}
