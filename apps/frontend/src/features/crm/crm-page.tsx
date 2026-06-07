import { useMemo, useState } from "react"
import { useMutation, useQuery } from "@tanstack/react-query"
import { BarChart3, Plus, RefreshCw, Save, Tags } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "src/components/ui/badge"
import { Button } from "src/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "src/components/ui/card"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "src/components/ui/dialog"
import { Input } from "src/components/ui/input"
import { Label } from "src/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "src/components/ui/select"
import { Switch } from "src/components/ui/switch"
import { Textarea } from "src/components/ui/textarea"
import { MasterListEmptyState, MasterListPageFrame, MasterListRowActions, MasterListTableCard } from "src/components/blocks/lists/master-list"
import type { AuthSession } from "src/features/auth/auth-client"
import { cn } from "src/lib/utils"
import {
  deleteCrmDeal,
  deleteCrmLead,
  deleteCrmPipeline,
  emptyDeal,
  emptyLead,
  emptyPipeline,
  emptyStage,
  getCrmWorkspace,
  upsertCrmDeal,
  upsertCrmLead,
  upsertCrmPipeline,
  upsertCrmStage,
  type CrmDeal,
  type CrmLead,
  type CrmPipeline,
  type CrmPipelineStage,
  type CrmView,
  type CrmWorkspace,
} from "./crm-client"

export function CrmPage({ session, view = "leads" }: { session: AuthSession; view?: CrmView }) {
  const [leadDialog, setLeadDialog] = useState<Partial<CrmLead> | null>(null)
  const [dealDialog, setDealDialog] = useState<Partial<CrmDeal> | null>(null)
  const [pipelineDialog, setPipelineDialog] = useState<Partial<CrmPipeline> | null>(null)
  const [stageDialog, setStageDialog] = useState<{ pipeline: CrmPipeline; stage: Partial<CrmPipelineStage> } | null>(null)
  const query = useQuery({ queryKey: ["crm-workspace", session.selectedTenant.slug], queryFn: () => getCrmWorkspace(session) })
  const workspace = query.data ?? { pipelines: [], leads: [], deals: [] }
  const defaultPipeline = workspace.pipelines.find((pipeline) => pipeline.is_default) ?? workspace.pipelines[0] ?? null

  const leadMutation = useMutation({ mutationFn: (input: Partial<CrmLead>) => upsertCrmLead(session, input) })
  const leadDeleteMutation = useMutation({ mutationFn: (lead: CrmLead) => deleteCrmLead(session, lead) })
  const dealMutation = useMutation({ mutationFn: (input: Partial<CrmDeal>) => upsertCrmDeal(session, input) })
  const dealDeleteMutation = useMutation({ mutationFn: (deal: CrmDeal) => deleteCrmDeal(session, deal) })
  const pipelineMutation = useMutation({ mutationFn: (input: Partial<CrmPipeline>) => upsertCrmPipeline(session, input) })
  const pipelineDeleteMutation = useMutation({ mutationFn: (pipeline: CrmPipeline) => deleteCrmPipeline(session, pipeline) })
  const stageMutation = useMutation({ mutationFn: ({ pipeline, stage }: { pipeline: CrmPipeline; stage: Partial<CrmPipelineStage> }) => upsertCrmStage(session, pipeline, stage) })
  const isWorking = leadMutation.isPending || leadDeleteMutation.isPending || dealMutation.isPending || dealDeleteMutation.isPending || pipelineMutation.isPending || pipelineDeleteMutation.isPending || stageMutation.isPending

  async function applyWorkspace(next: Promise<CrmWorkspace>, message: string) {
    await next
    toast.success(message)
    await query.refetch()
  }

  const stats = useMemo(() => {
    const openDeals = workspace.deals.filter((deal) => deal.status === "open")
    return [
      { label: "Open leads", value: workspace.leads.filter((lead) => lead.status !== "converted" && lead.status !== "lost").length },
      { label: "Open deals", value: openDeals.length },
      { label: "Pipeline value", value: currency(openDeals.reduce((sum, deal) => sum + Number(deal.amount ?? 0), 0)) },
    ]
  }, [workspace.deals, workspace.leads])

  return (
    <MasterListPageFrame
      title={view === "leads" ? "Leads" : view === "deals" ? "Deals" : "Pipeline"}
      description="Global tenant CRM for lead capture, deal tracking, and sales pipeline movement."
      technicalName={`page.crm.${view}`}
      action={
        <div className="flex flex-wrap gap-2">
          <Button className="rounded-md" variant="outline" type="button" onClick={() => void query.refetch()}><RefreshCw className={cn("size-4", query.isFetching && "animate-spin")} />Refresh</Button>
          {view === "leads" ? <Button className="rounded-md" type="button" onClick={() => setLeadDialog(emptyLead())}><Plus className="size-4" />New Lead</Button> : null}
          {view === "deals" || view === "pipeline" ? <Button className="rounded-md" type="button" onClick={() => setDealDialog(emptyDeal(defaultPipeline))}><Plus className="size-4" />New Deal</Button> : null}
          {view === "pipeline" ? <Button className="rounded-md" variant="outline" type="button" onClick={() => setPipelineDialog(emptyPipeline())}><Plus className="size-4" />New Pipeline</Button> : null}
        </div>
      }
    >
      <div className="grid gap-3 md:grid-cols-3">
        {stats.map((item) => <Card className="rounded-md" key={item.label}><CardContent className="p-4"><div className="text-xs text-muted-foreground">{item.label}</div><div className="mt-1 text-xl font-semibold">{item.value}</div></CardContent></Card>)}
      </div>
      {view === "leads" ? <LeadsTable leads={workspace.leads} isLoading={query.isFetching} onDelete={(lead) => void applyWorkspace(leadDeleteMutation.mutateAsync(lead), "Lead deleted")} onEdit={setLeadDialog} /> : null}
      {view === "deals" ? <DealsTable deals={workspace.deals} pipelines={workspace.pipelines} isLoading={query.isFetching} onDelete={(deal) => void applyWorkspace(dealDeleteMutation.mutateAsync(deal), "Deal deleted")} onEdit={setDealDialog} /> : null}
      {view === "pipeline" ? <PipelineBoard deals={workspace.deals} isLoading={query.isFetching} pipelines={workspace.pipelines} onDeletePipeline={(pipeline) => void applyWorkspace(pipelineDeleteMutation.mutateAsync(pipeline), "Pipeline deleted")} onEditDeal={setDealDialog} onEditPipeline={setPipelineDialog} onEditStage={(pipeline, stage) => setStageDialog({ pipeline, stage })} onNewStage={(pipeline) => setStageDialog({ pipeline, stage: emptyStage(pipeline) })} /> : null}
      {leadDialog ? <LeadDialog draft={leadDialog} disabled={isWorking} onClose={() => setLeadDialog(null)} onSave={(input) => void applyWorkspace(leadMutation.mutateAsync(input), input.uuid ? "Lead updated" : "Lead created").then(() => setLeadDialog(null))} /> : null}
      {dealDialog ? <DealDialog deals={workspace.deals} draft={dealDialog} disabled={isWorking} leads={workspace.leads} pipelines={workspace.pipelines} onClose={() => setDealDialog(null)} onSave={(input) => void applyWorkspace(dealMutation.mutateAsync(input), input.uuid ? "Deal updated" : "Deal created").then(() => setDealDialog(null))} /> : null}
      {pipelineDialog ? <PipelineDialog draft={pipelineDialog} disabled={isWorking} onClose={() => setPipelineDialog(null)} onSave={(input) => void applyWorkspace(pipelineMutation.mutateAsync(input), input.uuid ? "Pipeline updated" : "Pipeline created").then(() => setPipelineDialog(null))} /> : null}
      {stageDialog ? <StageDialog disabled={isWorking} draft={stageDialog.stage} onClose={() => setStageDialog(null)} onSave={(stage) => void applyWorkspace(stageMutation.mutateAsync({ pipeline: stageDialog.pipeline, stage }), stage.uuid ? "Stage updated" : "Stage created").then(() => setStageDialog(null))} /> : null}
    </MasterListPageFrame>
  )
}

function LeadsTable({ isLoading, leads, onDelete, onEdit }: { isLoading: boolean; leads: CrmLead[]; onDelete(lead: CrmLead): void; onEdit(lead: CrmLead): void }) {
  return (
    <MasterListTableCard>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/45"><tr><Header className="w-14">Sl.no</Header><Header>Lead</Header><Header>Contact</Header><Header>Status</Header><Header>Value</Header><Header>Owner</Header><Header className="w-20 text-right">Action</Header></tr></thead>
          <tbody>
            {leads.map((lead, index) => (
              <tr className="border-b last:border-b-0" key={lead.uuid}>
                <td className="px-3 py-3 text-muted-foreground">{index + 1}.</td>
                <td className="px-3 py-3"><div className="font-medium">{lead.name}</div><div className="text-xs text-muted-foreground">{lead.company_name || "No company"}</div></td>
                <td className="px-3 py-3"><div>{lead.email || "-"}</div><div className="text-xs text-muted-foreground">{lead.phone || ""}</div></td>
                <td className="px-3 py-3"><StatusBadge value={lead.status} /></td>
                <td className="px-3 py-3">{currency(lead.estimated_value)}</td>
                <td className="px-3 py-3">{lead.owner_email || "Unassigned"}</td>
                <td className="px-3 py-3 text-right"><MasterListRowActions title={lead.name} deleteLabel="Delete" onDelete={() => onDelete(lead)} onEdit={() => onEdit(lead)} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!leads.length ? <MasterListEmptyState>{isLoading ? "Loading leads." : "No leads found."}</MasterListEmptyState> : null}
    </MasterListTableCard>
  )
}

function DealsTable({ deals, isLoading, onDelete, onEdit, pipelines }: { deals: CrmDeal[]; isLoading: boolean; onDelete(deal: CrmDeal): void; onEdit(deal: CrmDeal): void; pipelines: CrmPipeline[] }) {
  return (
    <MasterListTableCard>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/45"><tr><Header className="w-14">Sl.no</Header><Header>Deal</Header><Header>Pipeline / Stage</Header><Header>Status</Header><Header>Amount</Header><Header>Close date</Header><Header className="w-20 text-right">Action</Header></tr></thead>
          <tbody>
            {deals.map((deal, index) => {
              const pipeline = pipelines.find((item) => item.id === deal.pipeline_id)
              const stage = pipeline?.stages.find((item) => item.id === deal.stage_id)
              return (
                <tr className="border-b last:border-b-0" key={deal.uuid}>
                  <td className="px-3 py-3 text-muted-foreground">{index + 1}.</td>
                  <td className="px-3 py-3"><div className="font-medium">{deal.title}</div><div className="text-xs text-muted-foreground">{deal.account_name || deal.contact_name || "No account"}</div></td>
                  <td className="px-3 py-3"><div>{pipeline?.name ?? "-"}</div><div className="text-xs text-muted-foreground">{stage?.name ?? "No stage"} - {deal.probability}%</div></td>
                  <td className="px-3 py-3"><StatusBadge value={deal.status} /></td>
                  <td className="px-3 py-3">{currency(deal.amount)}</td>
                  <td className="px-3 py-3">{formatDate(deal.expected_close_date)}</td>
                  <td className="px-3 py-3 text-right"><MasterListRowActions title={deal.title} deleteLabel="Delete" onDelete={() => onDelete(deal)} onEdit={() => onEdit(deal)} /></td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {!deals.length ? <MasterListEmptyState>{isLoading ? "Loading deals." : "No deals found."}</MasterListEmptyState> : null}
    </MasterListTableCard>
  )
}

function PipelineBoard({ deals, isLoading, onDeletePipeline, onEditDeal, onEditPipeline, onEditStage, onNewStage, pipelines }: { deals: CrmDeal[]; isLoading: boolean; onDeletePipeline(pipeline: CrmPipeline): void; onEditDeal(deal: CrmDeal): void; onEditPipeline(pipeline: CrmPipeline): void; onEditStage(pipeline: CrmPipeline, stage: CrmPipelineStage): void; onNewStage(pipeline: CrmPipeline): void; pipelines: CrmPipeline[] }) {
  if (!pipelines.length) return <MasterListEmptyState>{isLoading ? "Loading pipeline." : "No pipeline found."}</MasterListEmptyState>
  return (
    <div className="grid gap-4">
      {pipelines.map((pipeline) => (
        <Card className="rounded-md" key={pipeline.uuid}>
          <CardHeader className="border-b border-border/70 pb-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <CardTitle className="flex items-center gap-2 text-base"><BarChart3 className="size-4" />{pipeline.name}{pipeline.is_default ? <Badge variant="outline" className="rounded-md">Default</Badge> : null}</CardTitle>
              <div className="flex gap-2">
                <Button className="h-8 rounded-md" variant="outline" type="button" onClick={() => onNewStage(pipeline)}><Plus className="size-4" />Stage</Button>
                <MasterListRowActions title={pipeline.name} deleteLabel="Delete" onDelete={() => onDeletePipeline(pipeline)} onEdit={() => onEditPipeline(pipeline)} />
              </div>
            </div>
          </CardHeader>
          <CardContent className="overflow-x-auto p-4">
            <div className="grid min-w-[900px] gap-3" style={{ gridTemplateColumns: `repeat(${Math.max(1, pipeline.stages.length)}, minmax(180px, 1fr))` }}>
              {pipeline.stages.map((stage) => {
                const stageDeals = deals.filter((deal) => deal.pipeline_id === pipeline.id && deal.stage_id === stage.id)
                return (
                  <div className="rounded-md border border-border/70 bg-muted/20" key={stage.uuid}>
                    <div className="flex items-start justify-between gap-2 border-b border-border/70 p-3">
                      <div><div className="font-medium">{stage.name}</div><div className="text-xs text-muted-foreground">{stageDeals.length} deals - {currency(stageDeals.reduce((sum, deal) => sum + Number(deal.amount ?? 0), 0))}</div></div>
                      <Button aria-label="Edit stage" className="size-8 rounded-md" size="icon" variant="ghost" type="button" onClick={() => onEditStage(pipeline, stage)}><Tags className="size-4" /></Button>
                    </div>
                    <div className="grid gap-2 p-3">
                      {stageDeals.map((deal, index) => (
                        <button className="rounded-md border border-border/70 bg-card p-3 text-left shadow-sm hover:bg-muted/40" key={deal.uuid} type="button" onClick={() => onEditDeal(deal)}>
                          <div className="text-xs text-muted-foreground">{index + 1}.</div>
                          <div className="mt-1 font-medium">{deal.title}</div>
                          <div className="mt-1 text-xs text-muted-foreground">{currency(deal.amount)} - {deal.probability}%</div>
                        </button>
                      ))}
                      {!stageDeals.length ? <div className="rounded-md border border-dashed border-border p-4 text-center text-xs text-muted-foreground">No deals.</div> : null}
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function LeadDialog({ disabled, draft: initialDraft, onClose, onSave }: { disabled: boolean; draft: Partial<CrmLead>; onClose(): void; onSave(input: Partial<CrmLead>): void }) {
  const [draft, setDraft] = useState(initialDraft)
  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="max-w-2xl rounded-md">
        <DialogHeader><DialogTitle>{draft.uuid ? "Edit lead" : "New lead"}</DialogTitle></DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Name" value={draft.name ?? ""} onChange={(name) => setDraft((current) => ({ ...current, name }))} />
          <Field label="Company" value={draft.company_name ?? ""} onChange={(company_name) => setDraft((current) => ({ ...current, company_name }))} />
          <Field label="Email" value={draft.email ?? ""} onChange={(email) => setDraft((current) => ({ ...current, email }))} />
          <Field label="Phone" value={draft.phone ?? ""} onChange={(phone) => setDraft((current) => ({ ...current, phone }))} />
          <Field label="Source" value={draft.source ?? ""} onChange={(source) => setDraft((current) => ({ ...current, source }))} />
          <SelectField label="Status" value={draft.status ?? "new"} values={["new", "contacted", "qualified", "converted", "lost"]} onChange={(status) => setDraft((current) => ({ ...current, status }))} />
          <Field label="Owner email" value={draft.owner_email ?? ""} onChange={(owner_email) => setDraft((current) => ({ ...current, owner_email }))} />
          <Field label="Estimated value" type="number" value={String(draft.estimated_value ?? 0)} onChange={(estimated_value) => setDraft((current) => ({ ...current, estimated_value: Number(estimated_value || 0) }))} />
          <div className="sm:col-span-2"><TextField label="Notes" value={draft.notes ?? ""} onChange={(notes) => setDraft((current) => ({ ...current, notes }))} /></div>
        </div>
        <DialogFooter><Button className="rounded-md" variant="outline" type="button" onClick={onClose}>Cancel</Button><Button className="rounded-md" disabled={disabled || !draft.name?.trim()} type="button" onClick={() => onSave(draft)}><Save className="size-4" />Save</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function DealDialog({ disabled, draft: initialDraft, leads, onClose, onSave, pipelines }: { deals: CrmDeal[]; disabled: boolean; draft: Partial<CrmDeal>; leads: CrmLead[]; onClose(): void; onSave(input: Partial<CrmDeal>): void; pipelines: CrmPipeline[] }) {
  const [draft, setDraft] = useState(initialDraft)
  const pipeline = pipelines.find((item) => item.id === Number(draft.pipeline_id)) ?? pipelines[0]
  const stages = pipeline?.stages ?? []
  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="max-w-2xl rounded-md">
        <DialogHeader><DialogTitle>{draft.uuid ? "Edit deal" : "New deal"}</DialogTitle></DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Title" value={draft.title ?? ""} onChange={(title) => setDraft((current) => ({ ...current, title }))} />
          <SelectField label="Pipeline" value={String(draft.pipeline_id ?? pipeline?.id ?? "")} values={pipelines.map((item) => String(item.id))} labels={Object.fromEntries(pipelines.map((item) => [String(item.id), item.name]))} onChange={(pipeline_id) => {
            const nextPipeline = pipelines.find((item) => item.id === Number(pipeline_id))
            setDraft((current) => ({ ...current, pipeline_id: Number(pipeline_id), stage_id: nextPipeline?.stages[0]?.id, probability: nextPipeline?.stages[0]?.probability ?? current.probability }))
          }} />
          <SelectField label="Stage" value={String(draft.stage_id ?? stages[0]?.id ?? "")} values={stages.map((stage) => String(stage.id))} labels={Object.fromEntries(stages.map((stage) => [String(stage.id), stage.name]))} onChange={(stage_id) => {
            const nextStage = stages.find((stage) => stage.id === Number(stage_id))
            setDraft((current) => ({ ...current, stage_id: Number(stage_id), probability: nextStage?.probability ?? current.probability, status: nextStage?.is_won ? "won" : nextStage?.is_lost ? "lost" : "open" }))
          }} />
          <SelectField label="Lead" value={String(draft.lead_id ?? "none")} values={["none", ...leads.map((lead) => String(lead.id))]} labels={{ none: "No lead", ...Object.fromEntries(leads.map((lead) => [String(lead.id), lead.name])) }} onChange={(lead_id) => setDraft((current) => ({ ...current, lead_id: lead_id === "none" ? null : Number(lead_id) }))} />
          <Field label="Account" value={draft.account_name ?? ""} onChange={(account_name) => setDraft((current) => ({ ...current, account_name }))} />
          <Field label="Contact" value={draft.contact_name ?? ""} onChange={(contact_name) => setDraft((current) => ({ ...current, contact_name }))} />
          <Field label="Email" value={draft.email ?? ""} onChange={(email) => setDraft((current) => ({ ...current, email }))} />
          <Field label="Phone" value={draft.phone ?? ""} onChange={(phone) => setDraft((current) => ({ ...current, phone }))} />
          <Field label="Amount" type="number" value={String(draft.amount ?? 0)} onChange={(amount) => setDraft((current) => ({ ...current, amount: Number(amount || 0) }))} />
          <Field label="Probability" type="number" value={String(draft.probability ?? 0)} onChange={(probability) => setDraft((current) => ({ ...current, probability: Number(probability || 0) }))} />
          <Field label="Close date" type="date" value={draft.expected_close_date ?? ""} onChange={(expected_close_date) => setDraft((current) => ({ ...current, expected_close_date }))} />
          <Field label="Owner email" value={draft.owner_email ?? ""} onChange={(owner_email) => setDraft((current) => ({ ...current, owner_email }))} />
          <div className="sm:col-span-2"><TextField label="Notes" value={draft.notes ?? ""} onChange={(notes) => setDraft((current) => ({ ...current, notes }))} /></div>
        </div>
        <DialogFooter><Button className="rounded-md" variant="outline" type="button" onClick={onClose}>Cancel</Button><Button className="rounded-md" disabled={disabled || !draft.title?.trim()} type="button" onClick={() => onSave(draft)}><Save className="size-4" />Save</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function PipelineDialog({ disabled, draft: initialDraft, onClose, onSave }: { disabled: boolean; draft: Partial<CrmPipeline>; onClose(): void; onSave(input: Partial<CrmPipeline>): void }) {
  const [draft, setDraft] = useState(initialDraft)
  return <Dialog open onOpenChange={(open) => { if (!open) onClose() }}><DialogContent className="max-w-lg rounded-md"><DialogHeader><DialogTitle>{draft.uuid ? "Edit pipeline" : "New pipeline"}</DialogTitle></DialogHeader><div className="grid gap-3"><Field label="Name" value={draft.name ?? ""} onChange={(name) => setDraft((current) => ({ ...current, name }))} /><TextField label="Description" value={draft.description ?? ""} onChange={(description) => setDraft((current) => ({ ...current, description }))} /><SwitchRow checked={Boolean(draft.is_default)} label="Default pipeline" onChange={(is_default) => setDraft((current) => ({ ...current, is_default }))} /></div><DialogFooter><Button className="rounded-md" variant="outline" type="button" onClick={onClose}>Cancel</Button><Button className="rounded-md" disabled={disabled || !draft.name?.trim()} type="button" onClick={() => onSave(draft)}><Save className="size-4" />Save</Button></DialogFooter></DialogContent></Dialog>
}

function StageDialog({ disabled, draft: initialDraft, onClose, onSave }: { disabled: boolean; draft: Partial<CrmPipelineStage>; onClose(): void; onSave(input: Partial<CrmPipelineStage>): void }) {
  const [draft, setDraft] = useState(initialDraft)
  return <Dialog open onOpenChange={(open) => { if (!open) onClose() }}><DialogContent className="max-w-lg rounded-md"><DialogHeader><DialogTitle>{draft.uuid ? "Edit stage" : "New stage"}</DialogTitle></DialogHeader><div className="grid gap-3"><Field label="Name" value={draft.name ?? ""} onChange={(name) => setDraft((current) => ({ ...current, name }))} /><Field label="Probability" type="number" value={String(draft.probability ?? 0)} onChange={(probability) => setDraft((current) => ({ ...current, probability: Number(probability || 0) }))} /><Field label="Sort order" type="number" value={String(draft.sort_order ?? 0)} onChange={(sort_order) => setDraft((current) => ({ ...current, sort_order: Number(sort_order || 0) }))} /><SwitchRow checked={Boolean(draft.is_won)} label="Won stage" onChange={(is_won) => setDraft((current) => ({ ...current, is_won }))} /><SwitchRow checked={Boolean(draft.is_lost)} label="Lost stage" onChange={(is_lost) => setDraft((current) => ({ ...current, is_lost }))} /></div><DialogFooter><Button className="rounded-md" variant="outline" type="button" onClick={onClose}>Cancel</Button><Button className="rounded-md" disabled={disabled || !draft.name?.trim()} type="button" onClick={() => onSave(draft)}><Save className="size-4" />Save</Button></DialogFooter></DialogContent></Dialog>
}

function Header({ children, className }: { children: React.ReactNode; className?: string }) {
  return <th className={cn("px-3 py-2 text-left text-sm font-medium", className)}>{children}</th>
}

function Field({ label, onChange, type = "text", value }: { label: string; onChange(value: string): void; type?: string; value: string }) {
  return <div className="grid gap-2"><Label>{label}</Label><Input className="h-10 rounded-md" type={type} value={value} onChange={(event) => onChange(event.target.value)} /></div>
}

function TextField({ label, onChange, value }: { label: string; onChange(value: string): void; value: string }) {
  return <div className="grid gap-2"><Label>{label}</Label><Textarea className="min-h-24 rounded-md" value={value} onChange={(event) => onChange(event.target.value)} /></div>
}

function SelectField({ label, labels = {}, onChange, value, values }: { label: string; labels?: Record<string, string>; onChange(value: string): void; value: string; values: string[] }) {
  return <div className="grid gap-2"><Label>{label}</Label><Select value={value} onValueChange={onChange}><SelectTrigger className="h-10 rounded-md"><SelectValue /></SelectTrigger><SelectContent>{values.map((item) => <SelectItem key={item} value={item}>{labels[item] ?? item}</SelectItem>)}</SelectContent></Select></div>
}

function SwitchRow({ checked, label, onChange }: { checked: boolean; label: string; onChange(checked: boolean): void }) {
  return <label className="flex h-10 items-center justify-between rounded-md border border-border/70 px-3 text-sm font-medium"><span>{label}</span><Switch checked={checked} onCheckedChange={onChange} /></label>
}

function StatusBadge({ value }: { value: string }) {
  const done = value === "won" || value === "converted"
  const bad = value === "lost"
  return <Badge variant="outline" className={cn("rounded-md capitalize", done && "border-emerald-200 bg-emerald-50 text-emerald-700", bad && "border-red-200 bg-red-50 text-red-700")}>{value.replace(/_/g, " ")}</Badge>
}

function currency(value: number) {
  return new Intl.NumberFormat(undefined, { currency: "INR", maximumFractionDigits: 0, style: "currency" }).format(Number(value || 0))
}

function formatDate(value?: string | null) {
  if (!value) return "Not set"
  return new Intl.DateTimeFormat(undefined, { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value))
}
