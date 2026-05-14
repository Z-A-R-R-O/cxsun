export type CxsunRecordStatus = "draft" | "ready" | "blocked" | "approved";
export type CxsunRecordPriority = "low" | "normal" | "high";

export interface CxsunRecord {
  readonly id: string;
  readonly code: string;
  readonly title: string;
  readonly owner: string;
  readonly reference: string;
  readonly status: CxsunRecordStatus;
  readonly priority: CxsunRecordPriority;
  readonly updatedAt: string;
  readonly dueAt: string;
  readonly notes: string;
}

export interface CxsunQueueItem {
  readonly id: string;
  readonly title: string;
  readonly recordCode: string;
  readonly assignee: string;
  readonly stage: string;
  readonly dueAt: string;
  readonly blocked: boolean;
}

export const cxsunRecords: readonly CxsunRecord[] = [
  {
    id: "base-001",
    code: "CX-001",
    title: "Workspace readiness checklist",
    owner: "Operations",
    reference: "Foundation setup",
    status: "ready",
    priority: "high",
    updatedAt: "2026-04-28 10:30",
    dueAt: "2026-04-29",
    notes: "Confirm first operator workflow, desk navigation, and approval routing.",
  },
  {
    id: "base-002",
    code: "CX-002",
    title: "Default master data review",
    owner: "Admin",
    reference: "Starter records",
    status: "draft",
    priority: "normal",
    updatedAt: "2026-04-28 09:15",
    dueAt: "2026-04-30",
    notes: "Prepare safe placeholders for future tenant-specific module setup.",
  },
  {
    id: "base-003",
    code: "CX-003",
    title: "Approval queue handoff",
    owner: "Supervisor",
    reference: "Queue control",
    status: "blocked",
    priority: "high",
    updatedAt: "2026-04-27 18:20",
    dueAt: "2026-04-28",
    notes: "Needs confirmation of operator roles before the queue can be enabled.",
  },
  {
    id: "base-004",
    code: "CX-004",
    title: "Record audit trail sample",
    owner: "Platform",
    reference: "Audit surface",
    status: "approved",
    priority: "low",
    updatedAt: "2026-04-27 14:05",
    dueAt: "2026-05-02",
    notes: "Used to shape detail screen density and row action behavior.",
  },
];

export const cxsunQueueItems: readonly CxsunQueueItem[] = [
  {
    id: "queue-001",
    title: "Review blocked approval queue",
    recordCode: "CX-003",
    assignee: "Supervisor",
    stage: "Approval",
    dueAt: "Today",
    blocked: true,
  },
  {
    id: "queue-002",
    title: "Confirm starter workflow labels",
    recordCode: "CX-001",
    assignee: "Operations",
    stage: "Readiness",
    dueAt: "Tomorrow",
    blocked: false,
  },
  {
    id: "queue-003",
    title: "Prepare first master list import",
    recordCode: "CX-002",
    assignee: "Admin",
    stage: "Data setup",
    dueAt: "Apr 30",
    blocked: false,
  },
];
