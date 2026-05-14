"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CommonListPageFrame,
  useGlobalLoader,
} from "@cxnext/ui";
import { LoaderCircle, RefreshCcw, RotateCcw, Square } from "lucide-react";
import { readStoredApplicationContext } from "../../../auth/infrastructure/session-storage";
import type { MailCategory, MailLogRecord, MailStatus } from "../../domain/mail";
import { cancelMailLog, listMailLogs, retryMailLog } from "../../infrastructure/mail-api";

const statusOptions: readonly { value: MailStatus | "all"; label: string }[] = [
  { value: "all", label: "All status" },
  { value: "queued", label: "Queued" },
  { value: "processing", label: "Processing" },
  { value: "sent", label: "Sent" },
  { value: "failed", label: "Failed" },
  { value: "cancelled", label: "Cancelled" },
] as const;

const categoryOptions: readonly { value: MailCategory | "all"; label: string }[] = [
  { value: "all", label: "All categories" },
  { value: "test", label: "Test" },
  { value: "generic-transactional", label: "Generic" },
  { value: "otp", label: "OTP" },
  { value: "auth-recovery", label: "Recovery" },
  { value: "invoice", label: "Invoice" },
  { value: "report", label: "Report" },
  { value: "sync-alert", label: "Sync alert" },
  { value: "queue-failure-alert", label: "Queue alert" },
  { value: "worker-notification", label: "Worker" },
] as const;

export function MailAdminPage() {
  const { show } = useGlobalLoader();
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState("Active company");
  const [items, setItems] = useState<readonly MailLogRecord[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [searchDraft, setSearchDraft] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<MailStatus | "all">("all");
  const [categoryFilter, setCategoryFilter] = useState<MailCategory | "all">("all");
  const [busyMailId, setBusyMailId] = useState<string | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  useEffect(() => {
    const context = readStoredApplicationContext();
    setCompanyId(context?.company.id ?? null);
    setCompanyName(context?.company.name ?? "Active company");
  }, []);

  useEffect(() => {
    void refreshLogs();
  }, [categoryFilter, companyId, search, show, statusFilter]);

  async function refreshLogs() {
    const hide = show();
    try {
      const page = await listMailLogs({
        companyId,
        limit: 12,
        category: categoryFilter === "all" ? null : categoryFilter,
        status: statusFilter === "all" ? null : statusFilter,
        search: search || null,
      });
      setItems(page.items);
      setNextCursor(page.nextCursor);
    } catch (error) {
      toast.error("Could not load mail logs", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      hide();
    }
  }

  async function loadMore() {
    if (!nextCursor) {
      return;
    }

    setIsLoadingMore(true);
    try {
      const page = await listMailLogs({
        companyId,
        cursor: nextCursor,
        limit: 12,
        category: categoryFilter === "all" ? null : categoryFilter,
        status: statusFilter === "all" ? null : statusFilter,
        search: search || null,
      });
      setItems((current) => [...current, ...page.items]);
      setNextCursor(page.nextCursor);
    } catch (error) {
      toast.error("Could not load more mail logs", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setIsLoadingMore(false);
    }
  }

  async function mutateMail(mailId: string, action: "retry" | "cancel") {
    setBusyMailId(mailId);
    try {
      if (action === "retry") {
        await retryMailLog(mailId);
      } else {
        await cancelMailLog(mailId);
      }
      await refreshLogs();
    } catch (error) {
      toast.error(`Could not ${action} mail`, {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setBusyMailId(null);
    }
  }

  return (
    <CommonListPageFrame
      action={
        <Button className="rounded-xl" onClick={() => void refreshLogs()}>
          <RefreshCcw className="size-4" />
          Refresh
        </Button>
      }
      description={`Inspect delivery logs, queue correlation, and retry state for ${companyName}.`}
      technicalName="page.admin.mail"
      title="Mail Logs"
    >
      <Card className="rounded-md border-border/70">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Outbound mail history</CardTitle>
          <CardDescription>
            Logs are paged and lazy-loaded so we do not pull the entire history up front.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-3 lg:grid-cols-[1.2fr_0.8fr_0.8fr_auto]">
            <label className="grid gap-2">
              <span className="text-sm font-medium text-foreground">Search</span>
              <input
                className="h-11 rounded-md border border-input bg-background px-3 text-sm outline-none transition-colors focus:border-foreground/40"
                placeholder="Subject, sender, or recipient"
                value={searchDraft}
                onChange={(event) => setSearchDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    setSearch(searchDraft.trim());
                  }
                }}
              />
            </label>
            <label className="grid gap-2">
              <span className="text-sm font-medium text-foreground">Status</span>
              <select
                className="h-11 rounded-md border border-input bg-background px-3 text-sm outline-none transition-colors focus:border-foreground/40"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as MailStatus | "all")}
              >
                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-2">
              <span className="text-sm font-medium text-foreground">Category</span>
              <select
                className="h-11 rounded-md border border-input bg-background px-3 text-sm outline-none transition-colors focus:border-foreground/40"
                value={categoryFilter}
                onChange={(event) => setCategoryFilter(event.target.value as MailCategory | "all")}
              >
                {categoryOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex items-end">
              <Button
                variant="outline"
                className="rounded-xl"
                onClick={() => setSearch(searchDraft.trim())}
              >
                Apply
              </Button>
            </div>
          </div>

          <div className="grid gap-3">
            {items.length === 0 ? (
              <div className="rounded-md border border-dashed border-border/70 bg-muted/15 px-4 py-8 text-sm text-muted-foreground">
                No outbound mail matches the current filters yet.
              </div>
            ) : (
              items.map((item) => (
                <div
                  key={item.id}
                  className="rounded-md border border-border/70 bg-card px-4 py-4 shadow-sm"
                >
                  <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                    <div className="min-w-0 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium text-foreground">{item.subject}</p>
                        <Badge variant="outline" className={statusBadgeClass(item.status)}>
                          {item.status}
                        </Badge>
                        <Badge variant="secondary">{item.category}</Badge>
                      </div>
                      <div className="grid gap-1 text-sm text-muted-foreground">
                        <p>
                          To {item.to.map((recipient) => recipient.email).join(", ") || "No recipients"}
                        </p>
                        <p>
                          From {item.fromName ? `${item.fromName} <${item.fromEmail}>` : item.fromEmail}
                          {item.queueJobId ? ` · queue #${item.queueJobId}` : ""}
                        </p>
                        <p>
                          Created {formatDateTime(item.createdAt)}
                          {item.sentAt ? ` · sent ${formatDateTime(item.sentAt)}` : ""}
                        </p>
                        {item.lastError ? <p className="text-destructive">{item.lastError}</p> : null}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {item.status === "failed" || item.status === "cancelled" ? (
                        <Button
                          variant="outline"
                          className="rounded-xl"
                          disabled={busyMailId === item.id}
                          onClick={() => void mutateMail(item.id, "retry")}
                        >
                          {busyMailId === item.id ? (
                            <LoaderCircle className="size-4 animate-spin" />
                          ) : (
                            <RotateCcw className="size-4" />
                          )}
                          Retry
                        </Button>
                      ) : null}
                      {item.status === "queued" || item.status === "processing" ? (
                        <Button
                          variant="outline"
                          className="rounded-xl"
                          disabled={busyMailId === item.id}
                          onClick={() => void mutateMail(item.id, "cancel")}
                        >
                          <Square className="size-4" />
                          Cancel
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {nextCursor ? (
            <div className="flex justify-center">
              <Button
                variant="outline"
                className="rounded-xl"
                disabled={isLoadingMore}
                onClick={() => void loadMore()}
              >
                {isLoadingMore ? <LoaderCircle className="size-4 animate-spin" /> : null}
                Load more
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </CommonListPageFrame>
  );
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function statusBadgeClass(status: MailStatus) {
  if (status === "sent") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  if (status === "failed") {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }
  if (status === "processing") {
    return "border-sky-200 bg-sky-50 text-sky-700";
  }
  if (status === "cancelled") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }
  return "border-slate-200 bg-slate-50 text-slate-700";
}
