import Link from "next/link";
import {
  ArrowUpRight,
  CheckCircle2,
  ClipboardList,
  Filter,
  MoreHorizontal,
  Plus,
  Save,
  Search,
} from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Input,
  Label,
  Separator,
} from "@cxnext/ui";
import { cxsunQueueItems, cxsunRecords } from "../../domain/data";
import {
  getPriorityBadgeClass,
  getPriorityLabel,
  getRecordMetrics,
  getStatusBadgeClass,
  getStatusLabel,
} from "../../application/mappers";

export function CxsunOverviewPage() {
  const metrics = getRecordMetrics(cxsunRecords);
  const pendingItems = cxsunQueueItems.slice(0, 3);

  return (
    <div data-technical-name="page.cxsun.overview" className="space-y-3 p-4 md:p-6">
      <CxsunPageHeader
        eyebrow="Cxsun Base"
        title="Starting app workspace"
        description="Operational starter desk for intake, setup, approvals, and follow-up work."
        primaryHref="/desk/cxsun/records/new"
        primaryLabel="New record"
      />

      <section data-technical-name="section.cxsun.kpis" className="grid gap-3 md:grid-cols-3">
        {metrics.map((metric) => (
          <Card key={metric.id} data-technical-name={`card.cxsun.kpi.${metric.id}`}>
            <CardHeader className="pb-2">
              <CardDescription>{metric.label}</CardDescription>
              <CardTitle className="text-2xl">{metric.value}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">{metric.detail}</CardContent>
          </Card>
        ))}
      </section>

      <section
        data-technical-name="section.cxsun.operations"
        className="grid gap-3 xl:grid-cols-[1fr_22rem]"
      >
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Pending items</CardTitle>
            <CardDescription>Queue entries that need operator attention.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {pendingItems.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{item.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.recordCode} / {item.stage} / {item.assignee}
                  </p>
                </div>
                <Badge
                  variant="outline"
                  className={item.blocked ? getStatusBadgeClass("blocked") : ""}
                >
                  {item.dueAt}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Quick actions</CardTitle>
            <CardDescription>Primary operator tasks stay visible.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2">
            <Button asChild>
              <Link href="/desk/cxsun/records/new">
                <Plus className="h-4 w-4" />
                Create starter record
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/desk/cxsun/records">
                <ClipboardList className="h-4 w-4" />
                Review master list
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/desk/cxsun/queue">
                <CheckCircle2 className="h-4 w-4" />
                Work approval queue
              </Link>
            </Button>
          </CardContent>
        </Card>
      </section>

      <CxsunRecentActivity />
    </div>
  );
}

export function CxsunRecordsPage() {
  return (
    <div data-technical-name="page.cxsun.records" className="space-y-3 p-4 md:p-6">
      <CxsunPageHeader
        eyebrow="Master list"
        title="Starter records"
        description="Filter, compare, and maintain starter workspace records."
        primaryHref="/desk/cxsun/records/new"
        primaryLabel="New record"
      />

      <Card data-technical-name="section.cxsun.filter-toolbar">
        <CardContent className="grid gap-3 p-4 md:grid-cols-[1fr_12rem_12rem_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="Search records, owners, references" />
          </div>
          <Input aria-label="Status picker" placeholder="Status: all" />
          <Input aria-label="Owner autocomplete" placeholder="Owner lookup" />
          <Button variant="outline">
            <Filter className="h-4 w-4" />
            Filter
          </Button>
        </CardContent>
      </Card>

      <Card data-technical-name="section.cxsun.data-grid">
        <CardHeader className="pb-3">
          <CardTitle>Records</CardTitle>
          <CardDescription>Data-grid list with row actions and pagination.</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="py-2 pr-3 font-medium">Code</th>
                <th className="py-2 pr-3 font-medium">Title</th>
                <th className="py-2 pr-3 font-medium">Owner</th>
                <th className="py-2 pr-3 font-medium">Status</th>
                <th className="py-2 pr-3 font-medium">Priority</th>
                <th className="py-2 pr-3 font-medium">Due</th>
                <th className="py-2 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {cxsunRecords.map((record) => (
                <tr key={record.id} className="border-b border-border/70 last:border-0">
                  <td className="py-3 pr-3 font-medium">{record.code}</td>
                  <td className="py-3 pr-3">
                    <Link href={`/desk/cxsun/records/${record.id}`} className="hover:underline">
                      {record.title}
                    </Link>
                    <p className="text-xs text-muted-foreground">{record.reference}</p>
                  </td>
                  <td className="py-3 pr-3">{record.owner}</td>
                  <td className="py-3 pr-3">
                    <Badge variant="outline" className={getStatusBadgeClass(record.status)}>
                      {getStatusLabel(record.status)}
                    </Badge>
                  </td>
                  <td className="py-3 pr-3">
                    <Badge variant="outline" className={getPriorityBadgeClass(record.priority)}>
                      {getPriorityLabel(record.priority)}
                    </Badge>
                  </td>
                  <td className="py-3 pr-3">{record.dueAt}</td>
                  <td className="py-3 text-right">
                    <RecordActionMenu recordId={record.id} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Separator className="my-3" />
          <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
            <span>Showing 1-4 of 4 records</span>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm">
                Previous
              </Button>
              <Badge variant="secondary">1</Badge>
              <Button variant="outline" size="sm">
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function CxsunRecordFormPage() {
  return (
    <div data-technical-name="page.cxsun.record-form" className="space-y-3 p-4 md:p-6">
      <CxsunPageHeader
        eyebrow="Record workflow"
        title="Create starter record"
        description="Compact create/edit form for operational starter records."
        primaryHref="/desk/cxsun/records"
        primaryLabel="Back to list"
      />

      <form className="space-y-3">
        <Card data-technical-name="section.cxsun.form.identity">
          <CardHeader className="pb-3">
            <CardTitle>Identity</CardTitle>
            <CardDescription>Required record fields and searchable references.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <Field label="Record title">
              <Input placeholder="Enter record title" defaultValue="New starter workflow" />
            </Field>
            <Field label="Owner lookup">
              <Input placeholder="Search owner" defaultValue="Operations" />
            </Field>
            <Field label="Reference lookup">
              <Input placeholder="Search reference" defaultValue="Foundation setup" />
            </Field>
            <Field label="Due date">
              <Input type="date" defaultValue="2026-04-30" />
            </Field>
          </CardContent>
        </Card>

        <Card data-technical-name="section.cxsun.form.controls">
          <CardHeader className="pb-3">
            <CardTitle>Workflow controls</CardTitle>
            <CardDescription>Use compact picker-style fields for repeat entry.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            <Field label="Status picker">
              <Input defaultValue="Draft" />
            </Field>
            <Field label="Priority picker">
              <Input defaultValue="Normal" />
            </Field>
            <Field label="Approval owner">
              <Input placeholder="Search approver" />
            </Field>
            <label className="flex items-center gap-3 rounded-md border border-border px-3 py-2 text-sm">
              <input type="checkbox" className="h-4 w-4" />
              Requires supervisor review
            </label>
          </CardContent>
        </Card>

        <Card data-technical-name="section.cxsun.form.notes">
          <CardHeader className="pb-3">
            <CardTitle>Notes</CardTitle>
            <CardDescription>Operational notes for handoff and audit context.</CardDescription>
          </CardHeader>
          <CardContent>
            <textarea
              className="min-h-28 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm outline-none focus-visible:ring-1 focus-visible:ring-ring"
              defaultValue="Prepare the starter record for first operator review."
            />
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
          <Button variant="outline" asChild>
            <Link href="/desk/cxsun/records">Cancel</Link>
          </Button>
          <Button type="button">
            <Save className="h-4 w-4" />
            Save record
          </Button>
        </div>
      </form>
    </div>
  );
}

export function CxsunRecordDetailPage({ recordId }: { readonly recordId: string }) {
  const record = cxsunRecords.find((item) => item.id === recordId) ?? cxsunRecords[0];

  return (
    <div data-technical-name="page.cxsun.record-detail" className="space-y-3 p-4 md:p-6">
      <CxsunPageHeader
        eyebrow={record.code}
        title={record.title}
        description={record.notes}
        primaryHref="/desk/cxsun/records/new"
        primaryLabel="New record"
      />

      <div className="grid gap-3 xl:grid-cols-[1fr_22rem]">
        <Card data-technical-name="section.cxsun.detail.timeline">
          <CardHeader>
            <CardTitle>Operational follow-up</CardTitle>
            <CardDescription>Detail view for review, approval, and handoff work.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {["Intake captured", "Owner assigned", "Awaiting approval"].map((item, index) => (
              <div key={item} className="flex gap-3 rounded-md border border-border px-3 py-2">
                <Badge variant="secondary">{index + 1}</Badge>
                <div>
                  <p className="text-sm font-medium">{item}</p>
                  <p className="text-xs text-muted-foreground">Updated {record.updatedAt}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card data-technical-name="card.cxsun.detail-summary">
          <CardHeader>
            <CardTitle>Record summary</CardTitle>
            <CardDescription>Current state and ownership.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <SummaryRow label="Owner" value={record.owner} />
            <SummaryRow label="Reference" value={record.reference} />
            <SummaryRow label="Due" value={record.dueAt} />
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Status</span>
              <Badge variant="outline" className={getStatusBadgeClass(record.status)}>
                {getStatusLabel(record.status)}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export function CxsunQueuePage() {
  return (
    <div data-technical-name="page.cxsun.queue" className="space-y-3 p-4 md:p-6">
      <CxsunPageHeader
        eyebrow="Queue"
        title="Follow-up work"
        description="Operational queue for approvals, blocked items, and setup handoffs."
        primaryHref="/desk/cxsun/records/new"
        primaryLabel="New record"
      />

      <Card data-technical-name="section.cxsun.queue-list">
        <CardContent className="divide-y divide-border p-0">
          {cxsunQueueItems.map((item) => (
            <div key={item.id} className="grid gap-3 p-4 md:grid-cols-[1fr_auto] md:items-center">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium">{item.title}</p>
                  {item.blocked ? (
                    <Badge variant="outline" className={getStatusBadgeClass("blocked")}>
                      Blocked
                    </Badge>
                  ) : null}
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {item.recordCode} / {item.stage} / {item.assignee} / due {item.dueAt}
                </p>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm">
                  Reassign
                </Button>
                <Button size="sm">Resolve</Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function CxsunPageHeader({
  description,
  eyebrow,
  primaryHref,
  primaryLabel,
  title,
}: {
  readonly description: string;
  readonly eyebrow: string;
  readonly primaryHref: string;
  readonly primaryLabel: string;
  readonly title: string;
}) {
  return (
    <header
      data-technical-name="shell.cxsun.header"
      className="flex flex-col gap-3 border-b border-border pb-4 md:flex-row md:items-center md:justify-between"
    >
      <div className="min-w-0">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <Badge variant="outline">{eyebrow}</Badge>
          <Badge variant="secondary">starting app</Badge>
        </div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">{title}</h1>
        <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">{description}</p>
      </div>
      <Button asChild>
        <Link href={primaryHref}>
          <Plus className="h-4 w-4" />
          {primaryLabel}
        </Link>
      </Button>
    </header>
  );
}

function CxsunRecentActivity() {
  return (
    <Card data-technical-name="section.cxsun.recent-activity">
      <CardHeader className="pb-3">
        <CardTitle>Recent activity</CardTitle>
        <CardDescription>Latest record movements in the starter app.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {cxsunRecords.map((record) => (
          <div
            key={record.id}
            className="flex items-center justify-between gap-3 rounded-md bg-muted/60 px-3 py-2"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{record.title}</p>
              <p className="text-xs text-muted-foreground">
                {record.code} updated by {record.owner} at {record.updatedAt}
              </p>
            </div>
            <Link
              href={`/desk/cxsun/records/${record.id}`}
              className="text-muted-foreground hover:text-foreground"
            >
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function Field({
  children,
  label,
}: {
  readonly children: React.ReactNode;
  readonly label: string;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function RecordActionMenu({ recordId }: { readonly recordId: string }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Record actions">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Record actions</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href={`/desk/cxsun/records/${recordId}`}>Open detail</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/desk/cxsun/records/new">Duplicate into new</Link>
        </DropdownMenuItem>
        <DropdownMenuItem>Mark ready</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function SummaryRow({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
