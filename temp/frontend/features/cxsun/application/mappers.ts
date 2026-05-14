import type { CxsunRecord, CxsunRecordPriority, CxsunRecordStatus } from "../domain/data";

export function getStatusLabel(status: CxsunRecordStatus) {
  return {
    approved: "Approved",
    blocked: "Blocked",
    draft: "Draft",
    ready: "Ready",
  }[status];
}

export function getPriorityLabel(priority: CxsunRecordPriority) {
  return {
    high: "High",
    low: "Low",
    normal: "Normal",
  }[priority];
}

export function getStatusBadgeClass(status: CxsunRecordStatus) {
  return {
    approved: "border-emerald-200 bg-emerald-50 text-emerald-700",
    blocked: "border-red-200 bg-red-50 text-red-700",
    draft: "border-zinc-200 bg-zinc-50 text-zinc-700",
    ready: "border-blue-200 bg-blue-50 text-blue-700",
  }[status];
}

export function getPriorityBadgeClass(priority: CxsunRecordPriority) {
  return {
    high: "border-amber-200 bg-amber-50 text-amber-700",
    low: "border-slate-200 bg-slate-50 text-slate-700",
    normal: "border-cyan-200 bg-cyan-50 text-cyan-700",
  }[priority];
}

export function getRecordMetrics(records: readonly CxsunRecord[]) {
  return [
    {
      id: "total",
      label: "Open records",
      value: String(records.length),
      detail: "Starter workspace items",
    },
    {
      id: "ready",
      label: "Ready",
      value: String(records.filter((record) => record.status === "ready").length),
      detail: "Prepared for operator action",
    },
    {
      id: "blocked",
      label: "Blocked",
      value: String(records.filter((record) => record.status === "blocked").length),
      detail: "Needs follow-up",
    },
  ] as const;
}
