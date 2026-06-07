import { useEffect, useMemo, useState } from "react"
import { useMutation, useQuery } from "@tanstack/react-query"
import { EditorContent, useEditor } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import { ArrowLeft, Bold, CalendarDays, Check, CheckCircle2, ChevronDown, ClipboardCheck, Eye, FileText, History, Italic, Link2, List, ListChecks, ListOrdered, MessageCircle, MoreHorizontal, Paperclip, Pencil, Plus, RefreshCw, RotateCcw, RotateCw, Save, Tags, Trash2, UserRound } from "lucide-react"
import { toast } from "sonner"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "src/components/ui/alert-dialog"
import { AnimatedTabs } from "src/components/ui/animated-tabs"
import { Badge } from "src/components/ui/badge"
import { Button } from "src/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "src/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "src/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "src/components/ui/dropdown-menu"
import { Input } from "src/components/ui/input"
import { Label } from "src/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "src/components/ui/select"
import { Switch } from "src/components/ui/switch"
import { Textarea } from "src/components/ui/textarea"
import {
  MasterListEmptyState,
  MasterListPageFrame,
  MasterListPaginationCard,
  MasterListRowActions,
  MasterListTableCard,
  MasterListToolbarCard,
  buildMasterListShowingLabel,
} from "src/components/blocks/lists/master-list"
import { apiBaseUrl, authHeaders, type AuthSession } from "src/features/auth/auth-client"
import { fileToBase64, linkMediaAsset, uploadMediaAsset } from "src/features/media/media-client"
import type { MasterDataRecord, MasterDataUpsertInput } from "src/features/master-data/domain/master-data"
import { listMasterDataRecords, upsertMasterDataRecord } from "src/features/master-data/infrastructure/master-data-client"
import { listTenantUsers, type TenantUserRecord } from "src/features/user-manager/user-manager-client"
import { cn } from "src/lib/utils"
import { PriorityAutocomplete, PriorityBadge } from "./priority-autocomplete"
import {
  addTaskManagerComment,
  addTaskManagerAttachment,
  changeTaskManagerStatus,
  deleteTaskManagerComment,
  deleteTaskManagerEvent,
  deleteTaskManagerSubtask,
  deleteTaskManagerAttachment,
  deleteTaskManagerTask,
  emptyTaskManagerTask,
  forceDeleteTaskManagerTask,
  getTaskManagerSettings,
  listTaskManagerCategories,
  listTaskManagerTasks,
  listTaskManagerTags,
  updateTaskManagerComment,
  upsertTaskManagerCategory,
  upsertTaskManagerTag,
  type TaskManagerLookupRecord,
  type TaskManagerScope,
  type TaskManagerSettings,
  type TaskManagerAttachment,
  type TaskManagerComment,
  type TaskManagerEvent,
  type TaskManagerSubtask,
  upsertTaskManagerEvent,
  upsertTaskManagerTask,
  upsertTaskManagerSubtask,
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
const moduleOptions = ["sales", "purchase", "receipt", "payment", "stock-ledger", "purchase-receipt", "delivery-note", "contact", "company", "product", "auditor", "general"]
const taskTypeOptions = ["simple_task", "record_checklist", "collection_confirmation", "compliance_reminder", "data_cleanup", "approval_review"]

function taskDefaultsFromSettings(settings: TaskManagerSettings | null): TaskManagerTaskInput {
  return {
    ...emptyTaskManagerTask(),
    assigned_to: settings?.default_assignee ?? "",
    priority: settings?.default_priority ?? "normal",
    requires_confirmation: settings ? Boolean(settings.require_completion_confirmation) : false,
    reviewer: settings?.default_reviewer ?? "",
    task_type: settings?.default_task_type ?? "simple_task",
  }
}

export function TaskManagerPage({ scope = "all", session }: { scope?: TaskManagerScope; session: AuthSession }) {
  const [view, setView] = useState<TaskManagerView>({ mode: "list" })
  const [searchValue, setSearchValue] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [currentPage, setCurrentPage] = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState(100)
  const [isNewDialogOpen, setIsNewDialogOpen] = useState(false)
  const [forceDeleteTask, setForceDeleteTask] = useState<TaskManagerTask | null>(null)
  const query = useQuery({ queryKey: ["task-manager", session.selectedTenant.slug, scope], queryFn: () => listTaskManagerTasks(session, scope) })
  const tenantUsersQuery = useQuery({ queryKey: ["task-manager-users", session.selectedTenant.id, session.selectedTenant.slug], queryFn: () => listTenantUsers(session, session.selectedTenant.id) })
  const prioritiesQuery = useQuery({ queryKey: ["task-manager-priorities", session.selectedTenant.slug], queryFn: () => listMasterDataRecords(session, "priorities") })
  const categoriesQuery = useQuery({ queryKey: ["task-manager-categories", session.selectedTenant.slug], queryFn: () => listTaskManagerCategories(session) })
  const tagsQuery = useQuery({ queryKey: ["task-manager-tags", session.selectedTenant.slug], queryFn: () => listTaskManagerTags(session) })
  const settingsQuery = useQuery({ queryKey: ["task-manager-settings", session.selectedTenant.slug], queryFn: () => getTaskManagerSettings(session) })
  const upsertMutation = useMutation({ mutationFn: (input: TaskManagerTaskInput) => upsertTaskManagerTask(session, input) })
  const priorityMutation = useMutation({ mutationFn: (input: MasterDataUpsertInput) => upsertMasterDataRecord(session, "priorities", input) })
  const categoryMutation = useMutation({ mutationFn: (input: Partial<TaskManagerLookupRecord>) => upsertTaskManagerCategory(session, input) })
  const tagMutation = useMutation({ mutationFn: (input: Partial<TaskManagerLookupRecord>) => upsertTaskManagerTag(session, input) })
  const statusMutation = useMutation({ mutationFn: ({ task, status }: { task: TaskManagerTask; status: TaskManagerStatus }) => changeTaskManagerStatus(session, task, status) })
  const deleteMutation = useMutation({ mutationFn: (task: TaskManagerTask) => deleteTaskManagerTask(session, task) })
  const forceDeleteMutation = useMutation({ mutationFn: (task: TaskManagerTask) => forceDeleteTaskManagerTask(session, task) })
  const commentMutation = useMutation({ mutationFn: ({ body, parentCommentId, task }: { body: string; parentCommentId?: number | null; task: TaskManagerTask }) => addTaskManagerComment(session, task, { body, parent_comment_id: parentCommentId }) })
  const commentUpdateMutation = useMutation({ mutationFn: ({ body, comment, task }: { body: string; comment: TaskManagerComment; task: TaskManagerTask }) => updateTaskManagerComment(session, task, comment, { body }) })
  const commentDeleteMutation = useMutation({ mutationFn: ({ comment, task }: { comment: TaskManagerComment; task: TaskManagerTask }) => deleteTaskManagerComment(session, task, comment) })
  const subtaskMutation = useMutation({ mutationFn: ({ input, task }: { input: Partial<TaskManagerSubtask>; task: TaskManagerTask }) => upsertTaskManagerSubtask(session, task, input) })
  const subtaskDeleteMutation = useMutation({ mutationFn: ({ subtask, task }: { subtask: TaskManagerSubtask; task: TaskManagerTask }) => deleteTaskManagerSubtask(session, task, subtask) })
  const attachmentDeleteMutation = useMutation({ mutationFn: ({ attachment, task }: { attachment: TaskManagerAttachment; task: TaskManagerTask }) => deleteTaskManagerAttachment(session, task, attachment) })
  const eventMutation = useMutation({ mutationFn: ({ event, task }: { event: Partial<TaskManagerEvent>; task: TaskManagerTask }) => upsertTaskManagerEvent(session, task, event) })
  const eventDeleteMutation = useMutation({ mutationFn: ({ event, task }: { event: TaskManagerEvent; task: TaskManagerTask }) => deleteTaskManagerEvent(session, task, event) })
  const attachmentMutation = useMutation({
    mutationFn: async ({ file, task }: { file: File; task: TaskManagerTask }) => {
      const base64 = await fileToBase64(file)
      const asset = await uploadMediaAsset(session, {
        base64,
        fileName: file.name,
        folder: settingsQuery.data?.media_folder || "task/files",
        mimeType: file.type || "application/octet-stream",
        visibility: settingsQuery.data?.media_visibility === "public" ? "public" : "private",
        tags: ["task", task.task_no],
      })
      await linkMediaAsset(session, asset, { linkedModule: "task-manager", linkedRecordId: task.uuid, purpose: "attachment" })
      return addTaskManagerAttachment(session, task, {
        storage_key: asset.uuid,
        file_name: asset.original_name || asset.file_name,
        mime_type: asset.mime_type,
        file_size: asset.size_bytes,
        attachment_type: file.type.startsWith("image/") ? "image" : "file",
      })
    },
  })
  const tasks = query.data ?? []
  const filteredTasks = useMemo(() => {
    const term = searchValue.trim().toLowerCase()
    return tasks.filter((task) => {
      const matchesStatus = statusFilter === "all" || task.status === statusFilter
      const priority = findPriority(prioritiesQuery.data ?? [], task.priority)
      const matchesSearch = !term || [task.task_no, task.title, task.subject, task.description, task.assigned_to, task.assigned_to_name, task.module_key, task.linked_record_label, task.category_name, task.task_type, task.status, task.priority, priority?.name, ...(task.tags ?? []).map((tag) => tag.name)].some((value) => String(value ?? "").toLowerCase().includes(term))
      return matchesStatus && matchesSearch
    })
  }, [prioritiesQuery.data, searchValue, statusFilter, tasks])
  const totalPages = Math.max(1, Math.ceil(filteredTasks.length / rowsPerPage))
  const pageTasks = filteredTasks.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage)

  useEffect(() => {
    setView({ mode: "list" })
    setCurrentPage(1)
  }, [scope])

  async function refresh() {
    await Promise.all([query.refetch(), prioritiesQuery.refetch(), categoriesQuery.refetch(), tagsQuery.refetch(), settingsQuery.refetch()])
  }

  async function createPriority(input: MasterDataUpsertInput) {
    const priority = await priorityMutation.mutateAsync(input)
    toast.success("Priority created", { description: String(priority.name ?? priority.tag ?? "") })
    await prioritiesQuery.refetch()
    return priority
  }

  async function createCategory(name: string) {
    const category = await categoryMutation.mutateAsync({ name, slug: toSlug(name), color: randomLookupColour(), is_active: true })
    toast.success("Category created", { description: category.name })
    await categoriesQuery.refetch()
    return category
  }

  async function createTag(name: string) {
    const tag = await tagMutation.mutateAsync({ name, slug: toSlug(name), color: randomLookupColour(), is_active: true })
    toast.success("Tag created", { description: tag.name })
    await tagsQuery.refetch()
    return tag
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

  async function forceDestroy(task: TaskManagerTask) {
    try {
      await forceDeleteMutation.mutateAsync(task)
      toast.error("Task force deleted", { description: task.task_no })
      setForceDeleteTask(null)
      await refresh()
      setView({ mode: "list" })
    } catch (error) {
      toast.error("Task force delete failed", { description: error instanceof Error ? error.message : "Unable to force delete task." })
    }
  }

  async function addComment(task: TaskManagerTask, body: string, parentCommentId?: number | null) {
    const updated = await commentMutation.mutateAsync({ task, body, parentCommentId })
    toast.success("Comment added")
    await refresh()
    setView({ mode: "show", task: updated })
  }

  async function updateComment(task: TaskManagerTask, comment: TaskManagerComment, body: string) {
    const updated = await commentUpdateMutation.mutateAsync({ task, comment, body })
    toast.success("Comment updated")
    await refresh()
    setView({ mode: "show", task: updated })
  }

  async function deleteComment(task: TaskManagerTask, comment: TaskManagerComment) {
    const updated = await commentDeleteMutation.mutateAsync({ task, comment })
    toast.error("Comment deleted")
    await refresh()
    setView({ mode: "show", task: updated })
  }

  async function saveSubtask(task: TaskManagerTask, input: Partial<TaskManagerSubtask>) {
    const updated = await subtaskMutation.mutateAsync({ task, input })
    toast.success(input.uuid ? "Sub-task updated" : "Sub-task added")
    await refresh()
    setView({ mode: "show", task: updated })
  }

  async function removeSubtask(task: TaskManagerTask, subtask: TaskManagerSubtask) {
    const updated = await subtaskDeleteMutation.mutateAsync({ task, subtask })
    toast.success("Sub-task removed")
    await refresh()
    setView({ mode: "show", task: updated })
  }

  async function attachFile(task: TaskManagerTask, file: File) {
    const updated = await attachmentMutation.mutateAsync({ task, file })
    toast.success("Attachment added", { description: file.name })
    await refresh()
    setView({ mode: "show", task: updated })
  }

  async function removeAttachment(task: TaskManagerTask, attachment: TaskManagerAttachment) {
    const updated = await attachmentDeleteMutation.mutateAsync({ attachment, task })
    toast.error("Attachment removed", { description: attachment.file_name })
    await refresh()
    setView({ mode: "show", task: updated })
  }

  async function saveEvent(task: TaskManagerTask, event: Partial<TaskManagerEvent>) {
    const updated = await eventMutation.mutateAsync({ event, task })
    toast.success(event.uuid ? "Event updated" : "Event scheduled")
    await refresh()
    setView({ mode: "show", task: updated })
  }

  async function removeEvent(task: TaskManagerTask, event: TaskManagerEvent) {
    const updated = await eventDeleteMutation.mutateAsync({ event, task })
    toast.error("Event removed", { description: event.title })
    await refresh()
    setView({ mode: "show", task: updated })
  }

  if (view.mode === "upsert") {
    return <TaskUpsertPage categories={categoriesQuery.data ?? []} isCreatingCategory={categoryMutation.isPending} isCreatingPriority={priorityMutation.isPending} isCreatingTag={tagMutation.isPending} isSaving={upsertMutation.isPending} priorities={prioritiesQuery.data ?? []} settings={settingsQuery.data ?? null} tags={tagsQuery.data ?? []} task={view.task} onBack={() => setView(view.task ? { mode: "show", task: view.task } : { mode: "list" })} onCreateCategory={createCategory} onCreatePriority={createPriority} onCreateTag={createTag} onSubmit={save} />
  }

  if (view.mode === "show") {
    const task = tasks.find((item) => item.uuid === view.task.uuid) ?? view.task
    return (
      <>
        <TaskShowPage isWorking={statusMutation.isPending || deleteMutation.isPending || forceDeleteMutation.isPending || commentMutation.isPending || commentUpdateMutation.isPending || commentDeleteMutation.isPending || subtaskMutation.isPending || subtaskDeleteMutation.isPending || attachmentMutation.isPending || attachmentDeleteMutation.isPending || eventMutation.isPending || eventDeleteMutation.isPending} mediaFolder={settingsQuery.data?.media_folder ?? "task/files"} mediaVisibility={settingsQuery.data?.media_visibility === "public" ? "public" : "private"} priorities={prioritiesQuery.data ?? []} session={session} task={task} onAttachFile={(file) => attachFile(task, file)} onBack={() => setView({ mode: "list" })} onComment={(body, parentCommentId) => addComment(task, body, parentCommentId)} onDelete={() => void destroy(task)} onDeleteComment={(comment) => deleteComment(task, comment)} onEdit={() => setView({ mode: "upsert", task })} onEvent={(event) => saveEvent(task, event)} onForceDelete={() => setForceDeleteTask(task)} onRemoveAttachment={(attachment) => removeAttachment(task, attachment)} onRemoveEvent={(event) => removeEvent(task, event)} onRemoveSubtask={(subtask) => removeSubtask(task, subtask)} onStatus={(status) => void changeStatus(task, status)} onSubtask={(input) => saveSubtask(task, input)} onUpdateComment={(comment, body) => updateComment(task, comment, body)} />
        <ForceDeleteTaskDialog isDeleting={forceDeleteMutation.isPending} task={forceDeleteTask} onClose={() => setForceDeleteTask(null)} onConfirm={(selectedTask) => void forceDestroy(selectedTask)} />
      </>
    )
  }

  return (
    <MasterListPageFrame
      title={taskScopeTitle(scope)}
      description={taskScopeDescription(scope)}
      technicalName="page.task-manager.list"
      action={
        <div className="flex items-center gap-2">
          <Button disabled={query.isFetching} onClick={() => void refresh()} type="button" variant="outline" className="h-9 rounded-md"><RefreshCw className={cn("size-4", query.isFetching && "animate-spin")} />Refresh</Button>
          <Button onClick={() => setIsNewDialogOpen(true)} type="button" className="h-9 rounded-md"><Plus className="size-4" />New task</Button>
        </div>
      }
    >
      <NewTaskDialog
        isCreatingPriority={priorityMutation.isPending}
        isCreatingCategory={categoryMutation.isPending}
        isCreatingTag={tagMutation.isPending}
        isSaving={upsertMutation.isPending}
        open={isNewDialogOpen}
        categories={categoriesQuery.data ?? []}
        priorities={prioritiesQuery.data ?? []}
        settings={settingsQuery.data ?? null}
        tags={tagsQuery.data ?? []}
        tenantUsers={tenantUsersQuery.data ?? []}
        onCreateCategory={createCategory}
        onCreatePriority={createPriority}
        onCreateTag={createTag}
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
              <tr><Header>Task</Header><Header>Module</Header><Header>Category</Header><Header>Assigned</Header><Header>Status</Header><Header>Priority</Header><Header>Due</Header><Header className="text-right">Score</Header><Header className="text-right">Action</Header></tr>
            </thead>
            <tbody>
              {pageTasks.map((task) => (
                <tr key={task.uuid} className="border-t border-border/70">
                  <td className="px-3 py-2">
                    <button type="button" className="font-semibold hover:underline" onClick={() => setView({ mode: "show", task })}>{task.title}</button>
                    <div className="text-xs text-muted-foreground">{[task.task_no, richTextToPlainText(task.subject)].filter(Boolean).join(" - ")}</div>
                  </td>
                  <td className="px-3 py-2 text-muted-foreground"><div>{task.module_key ?? "general"}</div><div className="text-xs">{task.linked_record_label ?? task.linked_record_id ?? "-"}</div></td>
                  <td className="px-3 py-2"><div>{task.category_name ?? "Uncategorized"}</div><div className="mt-1 flex flex-wrap gap-1">{task.tags?.slice(0, 2).map((tag) => <LookupBadge key={tag.uuid} record={tag} />)}</div></td>
                  <td className="px-3 py-2">{task.assigned_to_name || task.assigned_to || "Unassigned"}</td>
                  <td className="px-3 py-2"><TaskStatusBadge status={task.status} /></td>
                  <td className="px-3 py-2"><PriorityBadge priorities={prioritiesQuery.data ?? []} value={task.priority} /></td>
                  <td className="px-3 py-2">{formatDate(task.due_date)}</td>
                  <td className="px-3 py-2 text-right font-semibold">{task.score}</td>
                  <td className="px-3 py-2 text-right"><MasterListRowActions title={task.title} deleteLabel="Suspend" onDelete={() => void destroy(task)} onEdit={() => setView({ mode: "upsert", task })} onView={() => setView({ mode: "show", task })} /></td>
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

function NewTaskDialog({
  categories,
  isCreatingCategory,
  isCreatingPriority,
  isCreatingTag,
  isSaving,
  onCreateCategory,
  onCreatePriority,
  onCreateTag,
  onOpenChange,
  onSubmit,
  open,
  priorities,
  settings,
  tags,
  tenantUsers,
}: {
  categories: TaskManagerLookupRecord[]
  isCreatingCategory: boolean
  isCreatingPriority: boolean
  isCreatingTag: boolean
  isSaving: boolean
  onCreateCategory(name: string): Promise<TaskManagerLookupRecord>
  onCreatePriority(input: MasterDataUpsertInput): Promise<MasterDataRecord>
  onCreateTag(name: string): Promise<TaskManagerLookupRecord>
  onOpenChange(open: boolean): void
  onSubmit(input: TaskManagerTaskInput): void
  open: boolean
  priorities: MasterDataRecord[]
  settings: TaskManagerSettings | null
  tags: TaskManagerLookupRecord[]
  tenantUsers: TenantUserRecord[]
}) {
  const [draft, setDraft] = useState<TaskManagerTaskInput>(() => taskDefaultsFromSettings(settings))

  useEffect(() => {
    if (open) setDraft((current) => ({ ...taskDefaultsFromSettings(settings), ...current }))
  }, [open, settings])

  function resetAndClose(openState: boolean) {
    if (!openState) setDraft(taskDefaultsFromSettings(settings))
    onOpenChange(openState)
  }

  function assignToUser(value: string, user?: TenantUserRecord) {
    const trimmed = value.trim()
    setDraft((current) => ({
      ...current,
      assigned_to: user?.email ?? (trimmed.includes("@") ? trimmed : ""),
      assigned_to_name: user?.name ?? (trimmed.includes("@") ? trimmed.split("@")[0] : trimmed),
    }))
  }

  return (
    <Dialog open={open} onOpenChange={resetAndClose}>
      <DialogContent className="sm:max-w-[680px]">
        <DialogHeader>
          <DialogTitle>New task</DialogTitle>
          <DialogDescription className="sr-only">Create a new task.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <Field label="Title *" value={draft.title ?? ""} onChange={(value) => setDraft((current) => ({ ...current, title: value }))} />
          <TaskRichTextEditor label="Subject" value={draft.subject ?? ""} onChange={(value) => setDraft((current) => ({ ...current, subject: value }))} />
          <div className="grid gap-4 md:grid-cols-2">
            <PriorityAutocomplete isCreating={isCreatingPriority} label="Priority" priorities={priorities} value={draft.priority ?? "normal"} onChange={(value) => setDraft((current) => ({ ...current, priority: value }))} onCreate={onCreatePriority} />
            <AssigneeAutocomplete label="Assign to" users={tenantUsers} value={draft.assigned_to_name || draft.assigned_to || ""} onChange={assignToUser} />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <TaskLookupAutocomplete isCreating={isCreatingCategory} label="Category" records={categories} value={draft.category_id ?? null} onChange={(record) => setDraft((current) => ({ ...current, category_id: record?.id ?? null }))} onCreate={onCreateCategory} />
            <TaskTagPicker isCreating={isCreatingTag} label="Tags" records={tags} value={draft.tag_ids ?? []} onChange={(tagIds) => setDraft((current) => ({ ...current, tag_ids: tagIds }))} onCreate={onCreateTag} />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" className="rounded-md" onClick={() => resetAndClose(false)}>Cancel</Button>
          <Button disabled={isSaving} type="button" className="rounded-md" onClick={() => onSubmit({ ...draft, status: "new" })}><Save className={cn("size-4", isSaving && "animate-spin")} />Create task</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function TaskUpsertPage({
  categories,
  isCreatingCategory,
  isCreatingPriority,
  isCreatingTag,
  isSaving,
  onBack,
  onCreateCategory,
  onCreatePriority,
  onCreateTag,
  onSubmit,
  priorities,
  settings,
  tags,
  task,
}: {
  categories: TaskManagerLookupRecord[]
  isCreatingCategory: boolean
  isCreatingPriority: boolean
  isCreatingTag: boolean
  isSaving: boolean
  onBack(): void
  onCreateCategory(name: string): Promise<TaskManagerLookupRecord>
  onCreatePriority(input: MasterDataUpsertInput): Promise<MasterDataRecord>
  onCreateTag(name: string): Promise<TaskManagerLookupRecord>
  onSubmit(input: TaskManagerTaskInput): void
  priorities: MasterDataRecord[]
  settings: TaskManagerSettings | null
  tags: TaskManagerLookupRecord[]
  task: TaskManagerTask | null
}) {
  const [draft, setDraft] = useState<TaskManagerTaskInput>(() => task ? { ...task, tag_ids: task.tags?.map((tag) => tag.id) ?? [] } : taskDefaultsFromSettings(settings))

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
            <PriorityAutocomplete isCreating={isCreatingPriority} label="Priority" priorities={priorities} value={draft.priority ?? "normal"} onChange={(value) => setField("priority", value)} onCreate={onCreatePriority} />
            <SelectField label="Status" value={draft.status ?? "new"} options={statusOptions} onChange={(value) => setField("status", value as TaskManagerStatus)} />
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <TaskLookupAutocomplete isCreating={isCreatingCategory} label="Category" records={categories} value={draft.category_id ?? null} onChange={(record) => setField("category_id", record?.id ?? null)} onCreate={onCreateCategory} />
            <SelectField label="Task type" value={draft.task_type ?? "simple_task"} options={taskTypeOptions.map((value) => ({ label: value.replace(/_/g, " "), value }))} onChange={(value) => setField("task_type", value)} />
            <TaskTagPicker isCreating={isCreatingTag} label="Tags" records={tags} value={draft.tag_ids ?? []} onChange={(tagIds) => setField("tag_ids", tagIds)} onCreate={onCreateTag} />
          </div>
          <TextField label="Work instructions" value={draft.description ?? ""} onChange={(value) => setField("description", value)} />
          <div className="grid gap-4 md:grid-cols-4">
            <SelectField label="Module" value={draft.module_key ?? "general"} options={moduleOptions.map((value) => ({ label: value, value }))} onChange={(value) => setField("module_key", value)} />
            <Field label="Record id / invoice no" value={draft.linked_record_id ?? ""} onChange={(value) => setField("linked_record_id", value)} />
            <Field label="Record label" value={draft.linked_record_label ?? ""} onChange={(value) => setField("linked_record_label", value)} />
            <Field label="Due date" type="date" value={draft.due_date ?? ""} onChange={(value) => setField("due_date", value)} />
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <Field label="Reminder at" type="datetime-local" value={toDateTimeInputValue(draft.reminder_at)} onChange={(value) => setField("reminder_at", value)} />
            <Field label="Period key" value={draft.period_key ?? ""} onChange={(value) => setField("period_key", value)} />
            <Field label="Reviewer email" value={draft.reviewer ?? ""} onChange={(value) => setField("reviewer", value)} />
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <Field label="Assign to email" value={draft.assigned_to ?? ""} onChange={(value) => setField("assigned_to", value)} />
            <Field label="Staff name" value={draft.assigned_to_name ?? ""} onChange={(value) => setField("assigned_to_name", value)} />
            <Field label="Performance score" type="number" value={String(draft.score ?? 0)} onChange={(value) => setField("score", Number(value || 0))} />
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <SwitchRow checked={Boolean(draft.verification_required)} label="Verification required" onCheckedChange={(checked) => setField("verification_required", checked)} />
            <SwitchRow checked={Boolean(draft.auditor_followup_required)} label="Auditor follow-up required" onCheckedChange={(checked) => setField("auditor_followup_required", checked)} />
            <SwitchRow checked={Boolean(draft.requires_confirmation)} label="Confirmation required" onCheckedChange={(checked) => setField("requires_confirmation", checked)} />
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

function TaskShowPage({
  isWorking,
  mediaFolder,
  mediaVisibility,
  onAttachFile,
  onBack,
  onComment,
  onDelete,
  onDeleteComment,
  onEdit,
  onEvent,
  onForceDelete,
  onRemoveAttachment,
  onRemoveEvent,
  onRemoveSubtask,
  onStatus,
  onSubtask,
  onUpdateComment,
  priorities,
  session,
  task,
}: {
  isWorking: boolean
  mediaFolder: string
  mediaVisibility: "private" | "public"
  onAttachFile(file: File): Promise<void>
  onBack(): void
  onComment(body: string, parentCommentId?: number | null): Promise<void>
  onDelete(): void
  onDeleteComment(comment: TaskManagerComment): Promise<void>
  onEdit(): void
  onEvent(event: Partial<TaskManagerEvent>): Promise<void>
  onForceDelete(): void
  onRemoveAttachment(attachment: TaskManagerAttachment): Promise<void>
  onRemoveEvent(event: TaskManagerEvent): Promise<void>
  onRemoveSubtask(subtask: TaskManagerSubtask): Promise<void>
  onStatus(status: TaskManagerStatus): void
  onSubtask(input: Partial<TaskManagerSubtask>): Promise<void>
  onUpdateComment(comment: TaskManagerComment, body: string): Promise<void>
  priorities: MasterDataRecord[]
  session: AuthSession
  task: TaskManagerTask
}) {
  const [comment, setComment] = useState("")
  const [subtaskTitle, setSubtaskTitle] = useState("")
  const [isSubtaskFormOpen, setIsSubtaskFormOpen] = useState(false)
  const [isCommentFormOpen, setIsCommentFormOpen] = useState(false)
  const [eventDialog, setEventDialog] = useState<TaskManagerEvent | null | "new">(null)
  const [editingSubtaskUuid, setEditingSubtaskUuid] = useState("")
  const [editingSubtaskTitle, setEditingSubtaskTitle] = useState("")
  const detailContent = (
    <div className="grid gap-4">
      <Card className="rounded-md">
        <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-base"><ClipboardCheck className="size-4" />Task content</CardTitle></CardHeader>
        <CardContent className="grid gap-5">
          <ShowContent label="Subject" html={task.subject} empty="No subject added." />
          <ShowContent label="Work instructions" value={task.description} empty="No work instructions added." />
        </CardContent>
      </Card>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="rounded-md">
          <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-base"><UserRound className="size-4" />Assignment</CardTitle></CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <Info label="Assigned to" value={task.assigned_to_name || "Unassigned"} />
            <Info label="Assigned email" value={task.assigned_to || "Not set"} />
            <Info label="Assigned by" value={task.assigned_by || "Not set"} />
            <Info label="Due date" value={formatDate(task.due_date)} />
            <Info label="Performance score" value={String(task.score)} />
            <Info label="Priority" valueNode={<PriorityBadge priorities={priorities} value={task.priority} />} />
            <Info label="Category" value={task.category_name || "Uncategorized"} />
            <Info label="Tags" valueNode={<div className="flex flex-wrap gap-1">{task.tags?.length ? task.tags.map((tag) => <LookupBadge key={tag.uuid} record={tag} />) : "No tags"}</div>} />
          </CardContent>
        </Card>
        <Card className="rounded-md">
          <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-base"><Link2 className="size-4" />Linked record</CardTitle></CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <Info label="Module" value={task.module_key || "General"} />
            <Info label="Record id / invoice no" value={task.linked_record_id || "Not linked"} />
            <Info label="Record label" value={task.linked_record_label || "Not set"} />
            <Info label="Task number" value={task.task_no} />
            <Info label="Task type" value={(task.task_type || "simple_task").replace(/_/g, " ")} />
            <Info label="Period key" value={task.period_key || "Not set"} />
          </CardContent>
        </Card>
      </div>
      <Card className="rounded-md">
        <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-base"><Tags className="size-4" />Status and controls</CardTitle></CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Info label="Current status" valueNode={<TaskStatusBadge status={task.status} />} />
            <Info label="Verification required" value={task.verification_required ? "Yes" : "No"} />
            <Info label="Auditor follow-up required" value={task.auditor_followup_required ? "Yes" : "No"} />
            <Info label="Confirmation required" value={task.requires_confirmation ? "Yes" : "No"} />
            <Info label="Completed by" value={task.completed_by || "Not completed"} />
          </div>
          <div className="flex flex-wrap gap-2 border-t border-border/70 pt-4">
            {statusOptions.map((option) => <Button key={option.value} disabled={isWorking || task.status === option.value} type="button" variant={task.status === option.value ? "default" : "outline"} className="rounded-md" onClick={() => onStatus(option.value)}>{option.label}</Button>)}
          </div>
        </CardContent>
      </Card>
      <Card className="rounded-md">
        <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-base"><History className="size-4" />Record information</CardTitle></CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Info label="Created by" value={task.created_by || "Not set"} />
          <Info label="Created at" value={formatDateTime(task.created_at)} />
          <Info label="Updated by" value={task.updated_by || "Not set"} />
          <Info label="Updated at" value={formatDateTime(task.updated_at)} />
          <Info label="Started at" value={formatDateTime(task.started_at)} />
          <Info label="Completed at" value={formatDateTime(task.completed_at)} />
        </CardContent>
      </Card>
    </div>
  )

  const tasksContent = (
    <Card className="rounded-md">
      <CardContent className="grid gap-5 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Sub Tasks</h2>
          <Button className="rounded-md bg-foreground text-background hover:bg-foreground/90" type="button" onClick={() => setIsSubtaskFormOpen(true)}><Plus className="size-4" />New Sub Task</Button>
        </div>
        {isSubtaskFormOpen ? (
          <div className="flex gap-2">
            <Input value={subtaskTitle} onChange={(event) => setSubtaskTitle(event.target.value)} placeholder="Add sub task" className="h-10 rounded-md" />
            <Button disabled={isWorking || !subtaskTitle.trim()} type="button" className="h-10 rounded-md" onClick={() => void onSubtask({ title: subtaskTitle.trim(), status: "todo", sort_order: task.subtasks.length + 1 }).then(() => { setSubtaskTitle(""); setIsSubtaskFormOpen(false) })}>Add</Button>
            <Button type="button" variant="outline" className="h-10 rounded-md" onClick={() => setIsSubtaskFormOpen(false)}>Cancel</Button>
          </div>
        ) : null}
        <div className="grid gap-1">
          {task.subtasks.map((subtask, index) => (
            <div key={subtask.uuid} className="flex items-center gap-3 border-b border-border/70 px-2 py-3 last:border-b-0">
              <button aria-label={subtask.status === "completed" ? "Mark pending" : "Mark completed"} className={cn("size-4 rounded-full border", subtask.status === "completed" ? "border-emerald-500 bg-emerald-500" : "border-muted-foreground/40")} disabled={isWorking} type="button" onClick={() => void onSubtask({ ...subtask, status: subtask.status === "completed" ? "todo" : "completed" })} />
              <div className="w-8 shrink-0 text-right text-xs font-medium tabular-nums text-muted-foreground">{index + 1}.</div>
              <div className="min-w-0 flex-1">
                {editingSubtaskUuid === subtask.uuid ? (
                  <div className="flex max-w-xl gap-2">
                    <Input className="h-9 rounded-md" value={editingSubtaskTitle} onChange={(event) => setEditingSubtaskTitle(event.target.value)} />
                    <Button className="h-9 rounded-md" disabled={isWorking || !editingSubtaskTitle.trim()} type="button" onClick={() => void onSubtask({ ...subtask, title: editingSubtaskTitle.trim() }).then(() => { setEditingSubtaskUuid(""); setEditingSubtaskTitle("") })}>Save</Button>
                    <Button className="h-9 rounded-md" type="button" variant="outline" onClick={() => { setEditingSubtaskUuid(""); setEditingSubtaskTitle("") }}>Cancel</Button>
                  </div>
                ) : (
                  <>
                    <div className={cn("truncate text-sm font-medium", subtask.status === "completed" && "text-emerald-700 line-through decoration-emerald-600 decoration-2")}>{subtask.title}</div>
                    {[subtask.assigned_to, formatDate(subtask.due_date)].filter((value) => value && value !== "Not set" && value !== "Unassigned").length ? <div className={cn("text-xs text-muted-foreground", subtask.status === "completed" && "text-emerald-700/80 line-through decoration-emerald-600")}>{[subtask.assigned_to, formatDate(subtask.due_date)].filter((value) => value && value !== "Not set" && value !== "Unassigned").join(" - ")}</div> : null}
                  </>
                )}
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button disabled={isWorking} variant="ghost" size="icon" className="size-8 rounded-md text-muted-foreground" type="button"><MoreHorizontal className="size-4" /></Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-36 rounded-md">
                  <DropdownMenuItem className="cursor-pointer" onSelect={() => { setEditingSubtaskUuid(subtask.uuid); setEditingSubtaskTitle(subtask.title) }}>Edit</DropdownMenuItem>
                  <DropdownMenuItem className="cursor-pointer text-destructive focus:text-destructive" onSelect={() => void onRemoveSubtask(subtask)}>Delete</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))}
          {!task.subtasks.length ? <div className="rounded-md border border-dashed border-border p-10 text-center text-sm text-muted-foreground">No sub tasks yet.</div> : null}
        </div>
      </CardContent>
    </Card>
  )

  const commentsContent = (
    <Card className="rounded-md">
      <CardContent className="grid min-h-[520px] grid-rows-[auto_1fr_auto] gap-5 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Comments</h2>
          <Button className="rounded-md bg-foreground text-background hover:bg-foreground/90" type="button" onClick={() => setIsCommentFormOpen(true)}><Plus className="size-4" />New Comment</Button>
        </div>
        <CommentThread comments={task.comments} disabled={isWorking} onDelete={onDeleteComment} onReply={(item, body) => onComment(body, item.id)} onUpdate={onUpdateComment} />
        <div className="border-t border-border/70 pt-3">
          {isCommentFormOpen || !task.comments.length ? (
            <div className="grid gap-2">
              <Textarea value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Type a comment" className="min-h-20 rounded-md border-0 px-0 shadow-none focus-visible:ring-0" />
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" className="rounded-md" onClick={() => setIsCommentFormOpen(false)}>Cancel</Button>
                <Button disabled={isWorking || !comment.trim()} type="button" className="rounded-md" onClick={() => void onComment(comment.trim()).then(() => { setComment(""); setIsCommentFormOpen(false) })}>Comment</Button>
              </div>
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  )

  const eventsContent = (
    <Card className="rounded-md">
      <CardContent className="grid min-h-[520px] content-start gap-5 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Events</h2>
          <Button className="rounded-md bg-foreground text-background hover:bg-foreground/90" disabled={isWorking} type="button" onClick={() => setEventDialog("new")}><CalendarDays className="size-4" />Schedule an event</Button>
        </div>
        <div className="grid gap-1">
          {(task.events ?? []).map((event, index) => (
            <div key={event.uuid} className="flex items-center gap-3 border-b border-border/70 px-2 py-3 last:border-b-0">
              <div className="w-8 shrink-0 text-right text-xs font-medium tabular-nums text-muted-foreground">{index + 1}.</div>
              <CalendarDays className="size-5 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{event.title}</div>
                <div className="truncate text-xs text-muted-foreground">{[formatDateTime(event.starts_at), event.ends_at ? `to ${formatDateTime(event.ends_at)}` : "", event.location].filter(Boolean).join(" - ")}</div>
                {event.description ? <div className="mt-1 line-clamp-2 whitespace-pre-wrap text-xs text-muted-foreground">{event.description}</div> : null}
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <Badge variant="outline" className="h-6 rounded-md px-2 text-[11px]">{event.visibility}</Badge>
                <Button aria-label="Edit event" disabled={isWorking} size="icon" variant="ghost" className="size-8 rounded-md text-muted-foreground" title="Edit event" type="button" onClick={() => setEventDialog(event)}><Pencil className="size-4" /></Button>
                <Button aria-label="Delete event" disabled={isWorking} size="icon" variant="ghost" className="size-8 rounded-md text-muted-foreground hover:text-destructive" title="Delete event" type="button" onClick={() => void onRemoveEvent(event)}><Trash2 className="size-4" /></Button>
              </div>
            </div>
          ))}
          {!task.events?.length ? (
            <div className="grid place-items-center py-24 text-center text-muted-foreground">
              <CalendarDays className="mb-3 size-10" />
              <div className="text-lg">No Events Scheduled</div>
              <Button className="mt-3 rounded-md" size="sm" type="button" variant="secondary" onClick={() => setEventDialog("new")}>Schedule an Event</Button>
            </div>
          ) : null}
        </div>
        <ScheduleEventDialog
          disabled={isWorking}
          event={eventDialog === "new" ? null : eventDialog}
          open={Boolean(eventDialog)}
          onClose={() => setEventDialog(null)}
          onSubmit={(event) => onEvent(event).then(() => setEventDialog(null))}
        />
      </CardContent>
    </Card>
  )

  const attachmentsContent = (
    <Card className="rounded-md">
      <CardContent className="grid gap-5 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Attachments</h2>
            <p className="text-xs text-muted-foreground">Files are stored in {mediaVisibility} media under {mediaFolder}.</p>
          </div>
          <label className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-md bg-foreground px-3 text-sm font-medium text-background hover:bg-foreground/90">
            <Plus className="size-4" />
            Upload Attachment
            <Input
              className="sr-only"
              disabled={isWorking}
              type="file"
              onChange={(event) => {
                const file = event.target.files?.[0]
                event.currentTarget.value = ""
                if (file) void onAttachFile(file)
              }}
            />
          </label>
        </div>
        <div className="grid gap-1">
          {task.attachments.map((attachment, index) => (
            <AttachmentListRow attachment={attachment} disabled={isWorking} key={attachment.uuid} serial={index + 1} session={session} onDelete={() => void onRemoveAttachment(attachment)} />
          ))}
          {!task.attachments.length ? <div className="rounded-md border border-dashed border-border p-10 text-center text-sm text-muted-foreground">No attachments yet.</div> : null}
        </div>
      </CardContent>
    </Card>
  )

  const activityContent = (
    <div className="grid gap-4">
      <Card className="rounded-md">
        <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-base"><ListChecks className="size-4" />Activity history</CardTitle></CardHeader>
        <CardContent className="grid gap-3">
          {task.activities.map((activity, index) => (
            <div key={activity.uuid} className="flex gap-3 rounded-md border border-border/70 p-4 text-sm">
              <div className="w-8 shrink-0 text-right text-xs font-medium tabular-nums text-muted-foreground">{task.activities.length - index}.</div>
              <span className="mt-1 size-2.5 shrink-0 rounded-full bg-primary" />
              <div className="min-w-0">
                <div className="font-medium">{activity.message}</div>
                <div className="mt-1 text-xs text-muted-foreground">{activity.actor_email} - {formatDateTime(activity.created_at)}</div>
              </div>
            </div>
          ))}
          {!task.activities.length ? <div className="py-8 text-center text-sm text-muted-foreground">No activity yet.</div> : null}
        </CardContent>
      </Card>
      <div className="flex justify-end border-t border-border/70 pt-4">
        <Button disabled={isWorking} type="button" variant="destructive" className="rounded-md" onClick={onForceDelete}><Trash2 className="size-4" />Force delete task</Button>
      </div>
    </div>
  )

  return (
    <main className="mx-auto flex w-[calc(100%-2rem)] max-w-[1200px] flex-col gap-5 py-6 sm:w-[calc(100%-3rem)] lg:w-[calc(100%-4rem)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <Button type="button" variant="outline" size="icon" className="mt-1 size-9 rounded-md" onClick={onBack}><ArrowLeft className="size-4" /></Button>
          <div>
            <h1 className="text-2xl font-semibold tracking-normal">{task.title}</h1>
            <p className="text-sm text-muted-foreground">{[task.task_no, richTextToPlainText(task.subject), task.module_key ?? "general", task.linked_record_label ?? task.linked_record_id ?? "No linked record"].filter(Boolean).join(" - ")}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" className="rounded-md" onClick={onEdit}>Edit</Button>
          <Button disabled={isWorking} type="button" variant="outline" className="rounded-md hover:border-destructive/40 hover:bg-destructive/10 hover:text-destructive" onClick={onDelete}><Trash2 className="size-4" />Delete</Button>
        </div>
      </div>
      <AnimatedTabs tabs={[
        { value: "details", label: <span className="flex items-center gap-2"><ClipboardCheck className="size-4" />Details</span>, content: detailContent },
        { value: "tasks", label: <span className="flex items-center gap-2"><CheckCircle2 className="size-4" />Sub Tasks <Badge variant="outline" className="h-5 rounded-md px-1.5 text-[10px]">{task.subtasks.length}</Badge></span>, content: tasksContent },
        { value: "comments", label: <span className="flex items-center gap-2"><MessageCircle className="size-4" />Comments <Badge variant="outline" className="h-5 rounded-md px-1.5 text-[10px]">{task.comments.length}</Badge></span>, content: commentsContent },
        { value: "events", label: <span className="flex items-center gap-2"><CalendarDays className="size-4" />Events <Badge variant="outline" className="h-5 rounded-md px-1.5 text-[10px]">{task.events?.length ?? 0}</Badge></span>, content: eventsContent },
        { value: "attachments", label: <span className="flex items-center gap-2"><Paperclip className="size-4" />Attachments <Badge variant="outline" className="h-5 rounded-md px-1.5 text-[10px]">{task.attachments.length}</Badge></span>, content: attachmentsContent },
        { value: "activity", label: <span className="flex items-center gap-2"><ListChecks className="size-4" />Activity <Badge variant="outline" className="h-5 rounded-md px-1.5 text-[10px]">{task.activities.length}</Badge></span>, content: activityContent },
      ]} />
    </main>
  )
}

function ScheduleEventDialog({ disabled, event, onClose, onSubmit, open }: { disabled: boolean; event: TaskManagerEvent | null; onClose(): void; onSubmit(event: Partial<TaskManagerEvent>): Promise<void>; open: boolean }) {
  const [draft, setDraft] = useState<Partial<TaskManagerEvent>>(() => eventToDraft(event))

  useEffect(() => {
    if (open) setDraft(eventToDraft(event))
  }, [event, open])

  function setField<Key extends keyof TaskManagerEvent>(key: Key, value: TaskManagerEvent[Key]) {
    setDraft((current) => ({ ...current, [key]: value }))
  }

  const canSave = Boolean(draft.title?.trim() && draft.starts_at)

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => { if (!nextOpen) onClose() }}>
      <DialogContent className="max-w-xl rounded-md">
        <DialogHeader>
          <DialogTitle>{event ? "Edit event" : "Create an event"}</DialogTitle>
          <DialogDescription>Schedule work linked to this task.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <Field label="Title" value={draft.title ?? ""} onChange={(value) => setField("title", value)} />
          <SwitchRow checked={Boolean(draft.is_all_day)} label="All day" onCheckedChange={(checked) => setField("is_all_day", checked)} />
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Start date & time" type="datetime-local" value={toDateTimeInputValue(draft.starts_at)} onChange={(value) => setField("starts_at", value)} />
            <Field label="End date & time" type="datetime-local" value={toDateTimeInputValue(draft.ends_at)} onChange={(value) => setField("ends_at", value)} />
          </div>
          <Field label="Attendees" value={attendeesToText(draft.attendees)} onChange={(value) => setField("attendees", value)} />
          <SelectField label="Visibility" value={draft.visibility ?? "private"} options={[{ label: "Private", value: "private" }, { label: "Public", value: "public" }, { label: "Authorized", value: "authorized" }]} onChange={(value) => setField("visibility", value)} />
          <Field label="Location" value={draft.location ?? ""} onChange={(value) => setField("location", value)} />
          <TextField label="Description" value={draft.description ?? ""} onChange={(value) => setField("description", value)} />
        </div>
        <DialogFooter>
          <Button className="rounded-md" disabled={disabled} type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button className="rounded-md" disabled={disabled || !canSave} type="button" onClick={() => void onSubmit(normalizeEventDraft(draft))}>{event ? "Save event" : "Schedule event"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function ForceDeleteTaskDialog({ isDeleting, onClose, onConfirm, task }: { isDeleting: boolean; onClose(): void; onConfirm(task: TaskManagerTask): void; task: TaskManagerTask | null }) {
  return (
    <AlertDialog open={Boolean(task)} onOpenChange={(open) => { if (!open) onClose() }}>
      <AlertDialogContent className="max-w-lg sm:max-w-lg">
        <AlertDialogHeader className="text-left sm:place-items-start">
          <AlertDialogMedia className="bg-destructive/10 text-destructive">
            <Trash2 className="size-5" />
          </AlertDialogMedia>
          <AlertDialogTitle>Force delete task?</AlertDialogTitle>
          <AlertDialogDescription>
            {task ? `Force delete ${task.task_no}? This will permanently delete the task, comments, replies, subtasks, events, attachments, reminders, tag links, and activities.` : ""}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction disabled={isDeleting || !task} variant="destructive" onClick={(event) => { event.preventDefault(); if (task) onConfirm(task) }}>
            Force delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

function AttachmentListRow({ attachment, disabled, onDelete, serial, session }: { attachment: TaskManagerAttachment; disabled: boolean; onDelete(): void; serial: number; session: AuthSession }) {
  const isImage = attachment.mime_type?.startsWith("image/")
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [previewUrl, setPreviewUrl] = useState("")

  useEffect(() => {
    let active = true
    let objectUrl = ""
    if (!isImage || !attachment.storage_key) {
      setPreviewUrl("")
      return
    }
    void fetch(`${apiBaseUrl}/api/v1/media/${encodeURIComponent(attachment.storage_key)}/content`, { cache: "no-store", headers: authHeaders(session) })
      .then((response) => response.ok ? response.blob() : null)
      .then((blob) => {
        if (!blob) return
        objectUrl = URL.createObjectURL(blob)
        if (active) setPreviewUrl(objectUrl)
      })
      .catch(() => {
        if (active) setPreviewUrl("")
      })
    return () => {
      active = false
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [attachment.storage_key, isImage, session])

  return (
    <>
      <div className="flex items-center gap-3 rounded-md px-2 py-2 hover:bg-muted/40">
        <div className="w-8 shrink-0 text-right text-xs font-medium tabular-nums text-muted-foreground">{serial}.</div>
        <button className={cn("relative flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted text-muted-foreground", isImage && "cursor-pointer ring-offset-background hover:ring-2 hover:ring-ring hover:ring-offset-2")} disabled={!isImage || !previewUrl} onClick={() => setIsPreviewOpen(true)} type="button">
          <FileText className="size-6" />
          {isImage ? (
            <img alt={attachment.file_name} className="absolute inset-0 size-full object-cover" src={previewUrl} onError={(event) => { event.currentTarget.style.display = "none" }} />
          ) : null}
        </button>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium">{attachment.file_name}</div>
          <div className="text-xs text-muted-foreground">{formatFileSize(attachment.file_size)}</div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <div className="hidden text-xs text-muted-foreground sm:block">{formatDateTime(attachment.created_at)}</div>
          {isImage && previewUrl ? (
            <Button aria-label={`Preview ${attachment.file_name}`} className="size-8 rounded-md text-muted-foreground" disabled={disabled} onClick={() => setIsPreviewOpen(true)} size="icon" title="Preview image" type="button" variant="ghost">
              <Eye className="size-4" />
            </Button>
          ) : null}
          <Button aria-label={`Delete ${attachment.file_name}`} className="size-8 rounded-md text-muted-foreground hover:text-destructive" disabled={disabled} onClick={onDelete} size="icon" type="button" variant="ghost">
            <Trash2 className="size-4" />
          </Button>
        </div>
      </div>
      {isImage && previewUrl ? (
        <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
          <DialogContent className="max-w-4xl rounded-md">
            <DialogHeader>
              <DialogTitle className="truncate">{attachment.file_name}</DialogTitle>
              <DialogDescription>{formatFileSize(attachment.file_size)} - {formatDateTime(attachment.created_at)}</DialogDescription>
            </DialogHeader>
            <div className="flex max-h-[70vh] items-center justify-center overflow-auto rounded-md border border-border/70 bg-muted/20 p-2">
              <img alt={attachment.file_name} className="max-h-[66vh] max-w-full rounded-md object-contain" src={previewUrl} />
            </div>
          </DialogContent>
        </Dialog>
      ) : null}
    </>
  )
}

function CommentThread({ comments, disabled, onDelete, onReply, onUpdate }: { comments: TaskManagerComment[]; disabled: boolean; onDelete(comment: TaskManagerComment): Promise<void>; onReply(comment: TaskManagerComment, body: string): Promise<void>; onUpdate(comment: TaskManagerComment, body: string): Promise<void> }) {
  const roots = comments.filter((comment) => !comment.parent_comment_id)
  const repliesByParent = comments.reduce<Record<number, TaskManagerComment[]>>((current, comment) => {
    if (comment.parent_comment_id) current[comment.parent_comment_id] = [...(current[comment.parent_comment_id] ?? []), comment]
    return current
  }, {})
  if (!roots.length) {
    return (
      <div className="grid place-items-center py-24 text-center text-muted-foreground">
        <MessageCircle className="mb-3 size-10" />
        <div className="text-lg">No Comments</div>
      </div>
    )
  }
  return (
    <div className="grid content-start gap-3">
      {roots.map((comment, index) => (
        <CommentItem comment={comment} disabled={disabled} key={comment.uuid} onDelete={onDelete} onReply={onReply} onUpdate={onUpdate} replies={repliesByParent[comment.id] ?? []} serial={index + 1} />
      ))}
    </div>
  )
}

function CommentItem({ comment, disabled, onDelete, onReply, onUpdate, replies, serial }: { comment: TaskManagerComment; disabled: boolean; onDelete(comment: TaskManagerComment): Promise<void>; onReply(comment: TaskManagerComment, body: string): Promise<void>; onUpdate(comment: TaskManagerComment, body: string): Promise<void>; replies: TaskManagerComment[]; serial: number }) {
  const [mode, setMode] = useState<"idle" | "edit" | "reply">("idle")
  const [draft, setDraft] = useState(comment.body)
  const [reply, setReply] = useState("")
  return (
    <div className="flex items-start gap-3">
      <div className="w-8 shrink-0 pt-3 text-right text-xs font-medium tabular-nums text-muted-foreground">{serial}.</div>
      <div className="grid min-w-0 flex-1 gap-2">
        <div className="rounded-md border border-border/70 p-3">
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              {mode === "edit" ? (
                <div className="grid gap-2">
                  <Textarea value={draft} onChange={(event) => setDraft(event.target.value)} className="min-h-20 rounded-md" />
                  <div className="flex justify-end gap-2">
                    <Button size="sm" variant="outline" className="rounded-md" type="button" onClick={() => setMode("idle")}>Cancel</Button>
                    <Button size="sm" className="rounded-md" disabled={disabled || !draft.trim()} type="button" onClick={() => void onUpdate(comment, draft.trim()).then(() => setMode("idle"))}>Save</Button>
                  </div>
                </div>
              ) : <div className="whitespace-pre-wrap text-sm leading-6">{comment.body}</div>}
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1 text-right">
              <div className="leading-tight">
                <div className="text-sm font-semibold">{comment.actor_email}</div>
                <div className="text-xs text-muted-foreground">{formatDateTime(comment.created_at)}</div>
              </div>
              <div className="flex gap-1">
                <Button disabled={disabled} size="sm" variant="ghost" className="h-8 rounded-md" type="button" onClick={() => setMode("reply")}>Reply</Button>
                <Button aria-label="Edit comment" disabled={disabled} size="icon" variant="ghost" className="size-8 rounded-md text-muted-foreground" title="Edit comment" type="button" onClick={() => { setDraft(comment.body); setMode("edit") }}><Pencil className="size-4" /></Button>
                <Button aria-label="Delete comment" disabled={disabled} size="icon" variant="ghost" className="size-8 rounded-md text-muted-foreground hover:text-destructive" title="Delete comment" type="button" onClick={() => void onDelete(comment)}><Trash2 className="size-4" /></Button>
              </div>
            </div>
          </div>
          {mode === "reply" ? (
            <div className="mt-3 grid gap-2">
              <Textarea value={reply} onChange={(event) => setReply(event.target.value)} placeholder="Write a reply" className="min-h-20 rounded-md" />
              <div className="flex justify-end gap-2">
                <Button size="sm" variant="outline" className="rounded-md" type="button" onClick={() => setMode("idle")}>Cancel</Button>
                <Button size="sm" className="rounded-md" disabled={disabled || !reply.trim()} type="button" onClick={() => void onReply(comment, reply.trim()).then(() => { setReply(""); setMode("idle") })}>Reply</Button>
              </div>
            </div>
          ) : null}
        </div>
        {replies.length ? (
          <div className="ml-6 grid gap-2 border-l border-border/70 pl-3">
            {replies.map((item, index) => <CommentReply comment={item} disabled={disabled} key={item.uuid} onDelete={onDelete} onUpdate={onUpdate} serial={`${serial}.${index + 1}`} />)}
          </div>
        ) : null}
      </div>
    </div>
  )
}

function CommentReply({ comment, disabled, onDelete, onUpdate, serial }: { comment: TaskManagerComment; disabled: boolean; onDelete(comment: TaskManagerComment): Promise<void>; onUpdate(comment: TaskManagerComment, body: string): Promise<void>; serial: string }) {
  const [isEditing, setIsEditing] = useState(false)
  const [draft, setDraft] = useState(comment.body)
  return (
    <div className="flex items-start gap-3">
      <div className="w-10 shrink-0 pt-3 text-right text-xs font-medium tabular-nums text-muted-foreground">{serial}</div>
      <div className="min-w-0 flex-1 rounded-md border border-border/70 p-3">
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            {isEditing ? (
              <div className="grid gap-2">
                <Textarea value={draft} onChange={(event) => setDraft(event.target.value)} className="min-h-20 rounded-md" />
                <div className="flex justify-end gap-2">
                  <Button size="sm" variant="outline" className="rounded-md" type="button" onClick={() => setIsEditing(false)}>Cancel</Button>
                  <Button size="sm" className="rounded-md" disabled={disabled || !draft.trim()} type="button" onClick={() => void onUpdate(comment, draft.trim()).then(() => setIsEditing(false))}>Save</Button>
                </div>
              </div>
            ) : <div className="whitespace-pre-wrap text-sm leading-6">{comment.body}</div>}
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1 text-right">
            <div className="leading-tight">
              <div className="text-sm font-semibold">{comment.actor_email}</div>
              <div className="text-xs text-muted-foreground">{formatDateTime(comment.created_at)}</div>
            </div>
            <div className="flex gap-1">
              <Button aria-label="Edit comment" disabled={disabled} size="icon" variant="ghost" className="size-8 rounded-md text-muted-foreground" title="Edit comment" type="button" onClick={() => { setDraft(comment.body); setIsEditing(true) }}><Pencil className="size-4" /></Button>
              <Button aria-label="Delete comment" disabled={disabled} size="icon" variant="ghost" className="size-8 rounded-md text-muted-foreground hover:text-destructive" title="Delete comment" type="button" onClick={() => void onDelete(comment)}><Trash2 className="size-4" /></Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function TaskStatusBadge({ status }: { status: TaskManagerStatus }) {
  const done = status === "completed"
  return <Badge variant="outline" className={cn("h-6 gap-1 rounded-md px-2 text-[11px]", done ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-border bg-muted text-muted-foreground")}>{done ? <CheckCircle2 className="size-3" /> : null}{status.replace("_", " ")}</Badge>
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

function TaskRichTextEditor({ label, onChange, value }: { label: string; onChange(value: string): void; value: string }) {
  const editor = useEditor({
    extensions: [StarterKit],
    content: value,
    editorProps: {
      attributes: {
        class: "min-h-24 px-3 py-2 text-sm leading-6 outline-none [&_ol]:ml-5 [&_ol]:list-decimal [&_p]:my-1 [&_ul]:ml-5 [&_ul]:list-disc",
      },
    },
    onUpdate: ({ editor: currentEditor }) => onChange(currentEditor.isEmpty ? "" : currentEditor.getHTML()),
  })

  useEffect(() => {
    if (!editor || editor.getHTML() === value) return
    editor.commands.setContent(value || "", { emitUpdate: false })
  }, [editor, value])

  const tools = [
    { label: "Bold", active: editor?.isActive("bold"), icon: Bold, run: () => editor?.chain().focus().toggleBold().run() },
    { label: "Italic", active: editor?.isActive("italic"), icon: Italic, run: () => editor?.chain().focus().toggleItalic().run() },
    { label: "Bullet list", active: editor?.isActive("bulletList"), icon: List, run: () => editor?.chain().focus().toggleBulletList().run() },
    { label: "Numbered list", active: editor?.isActive("orderedList"), icon: ListOrdered, run: () => editor?.chain().focus().toggleOrderedList().run() },
    { label: "Undo", active: false, icon: RotateCcw, run: () => editor?.chain().focus().undo().run() },
    { label: "Redo", active: false, icon: RotateCw, run: () => editor?.chain().focus().redo().run() },
  ]

  return (
    <div className="grid gap-2">
      <Label>{label}</Label>
      <div className="overflow-hidden rounded-md border border-input bg-background focus-within:border-foreground/40 focus-within:ring-2 focus-within:ring-ring/30">
        <div className="flex flex-wrap gap-1 border-b border-border/70 bg-muted/30 p-1.5">
          {tools.map(({ active, icon: Icon, label: toolLabel, run }) => (
            <Button aria-label={toolLabel} className={cn("size-8 rounded-md p-0", active && "bg-muted text-foreground")} key={toolLabel} onClick={run} title={toolLabel} type="button" variant="ghost">
              <Icon className="size-4" />
            </Button>
          ))}
        </div>
        <EditorContent editor={editor} />
      </div>
    </div>
  )
}

function TaskLookupAutocomplete({
  isCreating,
  label,
  onChange,
  onCreate,
  records,
  value,
}: {
  isCreating: boolean
  label: string
  onChange(record: TaskManagerLookupRecord | null): void
  onCreate(name: string): Promise<TaskManagerLookupRecord>
  records: TaskManagerLookupRecord[]
  value: number | null
}) {
  const selected = records.find((record) => record.id === value) ?? null
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState(selected?.name ?? "")
  const normalizedQuery = query.trim().toLowerCase()
  const filteredRecords = records.filter((record) => `${record.name} ${record.slug}`.toLowerCase().includes(normalizedQuery))
  const exactRecord = records.find((record) => record.name.toLowerCase() === normalizedQuery || record.slug === toSlug(query))
  const canCreate = Boolean(normalizedQuery && !exactRecord && !isCreating)

  useEffect(() => {
    if (!isOpen) setQuery(selected?.name ?? "")
  }, [isOpen, selected?.name])

  async function createAndSelect() {
    if (!canCreate) return
    const created = await onCreate(query.trim())
    onChange(created)
    setQuery(created.name)
    setIsOpen(false)
  }

  function select(record: TaskManagerLookupRecord | null) {
    onChange(record)
    setQuery(record?.name ?? "")
    setIsOpen(false)
  }

  return (
    <div className="relative grid gap-2">
      <Label>{label}</Label>
      <Input
        className="h-11 rounded-md"
        disabled={isCreating}
        placeholder={`Search ${label.toLowerCase()}`}
        value={query}
        onBlur={() => window.setTimeout(() => setIsOpen(false), 120)}
        onChange={(event) => {
          const nextQuery = event.target.value
          setQuery(nextQuery)
          setIsOpen(true)
          const exact = records.find((record) => record.name.toLowerCase() === nextQuery.trim().toLowerCase() || record.slug === toSlug(nextQuery))
          if (exact) onChange(exact)
        }}
        onFocus={() => setIsOpen(true)}
        onKeyDown={(event) => {
          if (event.key !== "Enter") return
          event.preventDefault()
          if (exactRecord) select(exactRecord)
          else if (filteredRecords[0]) select(filteredRecords[0])
          else if (canCreate) void createAndSelect()
        }}
      />
      {isOpen ? (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-56 overflow-auto rounded-md border border-border bg-popover p-1 shadow-md">
          <button className="flex w-full items-center rounded-md px-3 py-2 text-left text-sm hover:bg-muted" onMouseDown={(event) => { event.preventDefault(); select(null) }} type="button">No category</button>
          {filteredRecords.map((record) => (
            <button className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm hover:bg-muted" key={record.uuid} onMouseDown={(event) => { event.preventDefault(); select(record) }} type="button">
              <LookupDot color={record.color} />
              <span className="min-w-0 flex-1 truncate">{record.name}</span>
              {record.id === value ? <Check className="size-4 text-primary" /> : null}
            </button>
          ))}
          {canCreate ? (
            <button className="flex w-full items-center gap-2 rounded-md border-t border-border/70 px-3 py-2 text-left text-sm font-medium text-primary hover:bg-muted" onMouseDown={(event) => { event.preventDefault(); void createAndSelect() }} type="button">
              <Plus className="size-4" />
              Create "{query.trim()}"
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

function TaskTagPicker({
  isCreating,
  label,
  onChange,
  onCreate,
  records,
  value,
}: {
  isCreating: boolean
  label: string
  onChange(value: number[]): void
  onCreate(name: string): Promise<TaskManagerLookupRecord>
  records: TaskManagerLookupRecord[]
  value: number[]
}) {
  const [query, setQuery] = useState("")
  const [isOpen, setIsOpen] = useState(false)
  const selectedRecords = records.filter((record) => value.includes(record.id))
  const normalizedQuery = query.trim().toLowerCase()
  const filteredRecords = records.filter((record) => !value.includes(record.id) && `${record.name} ${record.slug}`.toLowerCase().includes(normalizedQuery))
  const canCreate = Boolean(normalizedQuery && !records.some((record) => record.name.toLowerCase() === normalizedQuery || record.slug === toSlug(query)) && !isCreating)

  async function createAndAdd() {
    if (!canCreate) return
    const created = await onCreate(query.trim())
    onChange([...value, created.id])
    setQuery("")
    setIsOpen(false)
  }

  return (
    <div className="relative grid gap-2">
      <Label>{label}</Label>
      <div className="flex min-h-11 flex-wrap items-center gap-1 rounded-md border border-input px-2 py-1">
        {selectedRecords.map((record) => (
          <button key={record.uuid} className="inline-flex h-7 items-center gap-1 rounded-md border border-border/70 bg-muted px-2 text-xs" type="button" onClick={() => onChange(value.filter((tagId) => tagId !== record.id))}>
            <LookupDot color={record.color} />
            {record.name}
            <span className="text-muted-foreground">x</span>
          </button>
        ))}
        <input
          className="h-8 min-w-24 flex-1 bg-transparent text-sm outline-none"
          disabled={isCreating}
          placeholder={selectedRecords.length ? "Add tag" : "Search or create tag"}
          value={query}
          onBlur={() => window.setTimeout(() => setIsOpen(false), 120)}
          onChange={(event) => {
            setQuery(event.target.value)
            setIsOpen(true)
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={(event) => {
            if (event.key !== "Enter") return
            event.preventDefault()
            if (filteredRecords[0]) {
              onChange([...value, filteredRecords[0].id])
              setQuery("")
            } else if (canCreate) {
              void createAndAdd()
            }
          }}
        />
      </div>
      {isOpen ? (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-56 overflow-auto rounded-md border border-border bg-popover p-1 shadow-md">
          {filteredRecords.map((record) => (
            <button className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm hover:bg-muted" key={record.uuid} onMouseDown={(event) => { event.preventDefault(); onChange([...value, record.id]); setQuery("") }} type="button">
              <LookupDot color={record.color} />
              <span className="min-w-0 flex-1 truncate">{record.name}</span>
            </button>
          ))}
          {canCreate ? (
            <button className="flex w-full items-center gap-2 rounded-md border-t border-border/70 px-3 py-2 text-left text-sm font-medium text-primary hover:bg-muted" onMouseDown={(event) => { event.preventDefault(); void createAndAdd() }} type="button">
              <Plus className="size-4" />
              Create "{query.trim()}"
            </button>
          ) : null}
          {!filteredRecords.length && !canCreate ? <div className="px-3 py-2 text-sm text-muted-foreground">No tags found.</div> : null}
        </div>
      ) : null}
    </div>
  )
}

function AssigneeAutocomplete({ label, onChange, users, value }: { label: string; onChange(value: string, user?: TenantUserRecord): void; users: TenantUserRecord[]; value: string }) {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState(value)
  const normalizedQuery = query.trim().toLowerCase()
  const filteredUsers = users.filter((user) => `${user.name} ${user.email}`.toLowerCase().includes(normalizedQuery))

  useEffect(() => setQuery(value), [value])

  function select(valueToSave: string, user?: TenantUserRecord) {
    onChange(valueToSave, user)
    setQuery(user?.name ?? valueToSave)
    setIsOpen(false)
  }

  return (
    <div className="relative grid gap-2">
      <Label>{label}</Label>
      <div className="relative">
        <Input
          className="h-11 rounded-md pr-10"
          onBlur={() => window.setTimeout(() => setIsOpen(false), 120)}
          onChange={(event) => {
            setQuery(event.target.value)
            setIsOpen(true)
          }}
          onFocus={() => setIsOpen(true)}
          placeholder="Search tenant users"
          value={query}
        />
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      </div>
      {isOpen ? (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-56 overflow-auto rounded-md border border-border bg-popover p-1 shadow-md">
          <button className="flex w-full items-center rounded-md px-3 py-2 text-left text-sm hover:bg-muted" onMouseDown={(event) => { event.preventDefault(); select("") }} type="button">Unassigned</button>
          {filteredUsers.map((user) => (
            <button className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm hover:bg-muted" key={user.user_id} onMouseDown={(event) => { event.preventDefault(); select(user.email, user) }} type="button">
              <span className="min-w-0 flex-1"><span className="block truncate font-medium">{user.name}</span><span className="block truncate text-xs text-muted-foreground">{user.email}</span></span>
              {(value === user.name || value === user.email) ? <Check className="size-4 text-primary" /> : null}
            </button>
          ))}
          {!filteredUsers.length && normalizedQuery ? <div className="px-3 py-2 text-sm text-muted-foreground">No tenant users found.</div> : null}
        </div>
      ) : null}
    </div>
  )
}

function richTextToPlainText(value: string | null | undefined) {
  if (!value) return ""
  if (typeof document === "undefined") return value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
  const container = document.createElement("div")
  container.innerHTML = value
  return container.textContent?.replace(/\s+/g, " ").trim() ?? ""
}

function findPriority(priorities: MasterDataRecord[], tag: string) {
  return priorities.find((priority) => String(priority.tag ?? "").toLowerCase() === tag.toLowerCase())
}

function SwitchRow({ checked, label, onCheckedChange }: { checked: boolean; label: string; onCheckedChange(checked: boolean): void }) {
  return <label className="flex h-11 items-center justify-between rounded-md border border-border/70 px-3 text-sm font-medium"><span>{label}</span><Switch checked={checked} onCheckedChange={onCheckedChange} /></label>
}

function ShowContent({ empty, html, label, value }: { empty: string; html?: string | null; label: string; value?: string | null }) {
  const content = html ? richTextToPlainText(html) : value
  return (
    <div>
      <div className="mb-2 text-xs font-medium text-muted-foreground">{label}</div>
      <div className="whitespace-pre-wrap rounded-md border border-border/70 bg-muted/20 p-4 text-sm leading-6">{content || empty}</div>
    </div>
  )
}

function Info({ label, value, valueNode }: { label: string; value?: string; valueNode?: React.ReactNode }) {
  return <div className="min-w-0 rounded-md border border-border/70 p-3"><div className="text-xs text-muted-foreground">{label}</div><div className="mt-1 break-words font-medium">{valueNode ?? value ?? "-"}</div></div>
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

function LookupBadge({ record }: { record: TaskManagerLookupRecord }) {
  return (
    <span className="inline-flex h-6 items-center gap-1 rounded-md border border-border/70 bg-card px-2 text-[11px] font-medium">
      <LookupDot color={record.color} />
      {record.name}
    </span>
  )
}

function LookupDot({ color }: { color?: string | null }) {
  return <span className="size-2 shrink-0 rounded-full ring-1 ring-black/10" style={{ backgroundColor: color || "#64748b" }} />
}

function taskScopeTitle(scope: TaskManagerScope) {
  if (scope === "my") return "My Tasks"
  if (scope === "assigned-to-me") return "Assigned To Me"
  if (scope === "open") return "Open Tasks"
  return "All Tasks"
}

function taskScopeDescription(scope: TaskManagerScope) {
  if (scope === "my") return "Tasks assigned to me, created by me, or assigned by me for follow-up."
  if (scope === "assigned-to-me") return "Pending work assigned to the current user."
  if (scope === "open") return "Unassigned work visible to authorized users as a shared queue."
  return "Manager view for all tenant tasks, filters, reminders, categories, and tags."
}

function toSlug(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
}

function randomLookupColour() {
  const colours = ["#0891b2", "#2563eb", "#7c3aed", "#db2777", "#ea580c", "#16a34a", "#ca8a04", "#475569"]
  return colours[Math.floor(Math.random() * colours.length)]
}

function toDateTimeInputValue(value: unknown) {
  if (!value) return ""
  const date = new Date(String(value))
  if (!Number.isFinite(date.getTime())) return String(value)
  const offset = date.getTimezoneOffset() * 60000
  return new Date(date.getTime() - offset).toISOString().slice(0, 16)
}

function eventToDraft(event: TaskManagerEvent | null): Partial<TaskManagerEvent> {
  if (event) {
    return {
      ...event,
      starts_at: toDateTimeInputValue(event.starts_at),
      ends_at: toDateTimeInputValue(event.ends_at),
    }
  }
  return {
    title: "",
    starts_at: toDateTimeInputValue(new Date()),
    ends_at: "",
    is_all_day: false,
    attendees: "",
    visibility: "private",
    location: "",
    description: "",
    status: "scheduled",
  }
}

function normalizeEventDraft(draft: Partial<TaskManagerEvent>): Partial<TaskManagerEvent> {
  const attendees = attendeesToArray(draft.attendees)
  return {
    ...draft,
    attendees: attendees.length ? JSON.stringify(attendees) : null,
    ends_at: draft.ends_at || null,
    location: draft.location?.trim() || null,
    description: draft.description?.trim() || null,
    visibility: draft.visibility || "private",
    status: draft.status || "scheduled",
  }
}

function attendeesToText(value: unknown) {
  if (!value) return ""
  if (Array.isArray(value)) return value.join(", ")
  if (typeof value !== "string") return String(value)
  try {
    const parsed = JSON.parse(value) as unknown
    return Array.isArray(parsed) ? parsed.map(String).join(", ") : value
  } catch {
    return value
  }
}

function attendeesToArray(value: unknown) {
  const text = attendeesToText(value)
  return text.split(",").map((item) => item.trim()).filter(Boolean)
}

function formatFileSize(value: number) {
  if (!value) return "0 B"
  if (value < 1024) return `${value} B`
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`
  return `${(value / (1024 * 1024)).toFixed(1)} MB`
}
