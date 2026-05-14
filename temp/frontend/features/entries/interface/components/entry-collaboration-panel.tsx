"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  ChevronDown,
  ChevronUp,
  Mail,
  MessageCircle,
  Paperclip,
  Plus,
  Send,
  Tag,
  UserRound,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button, Input } from "@cxnext/ui";

export interface EntryCollaborationPanelProps {
  readonly entryId?: number | null;
  readonly entryKind: "payment" | "purchase" | "receipt" | "sales";
  readonly entryLabel: string;
}

interface EntryCollaborationState {
  readonly assignees: readonly string[];
  readonly attachments: readonly string[];
  readonly comments: readonly EntryComment[];
  readonly shares: readonly string[];
  readonly tags: readonly string[];
}

interface EntryComment {
  readonly id: string;
  readonly author: string;
  readonly body: string;
  readonly createdAt: string;
}

interface EntryActivity {
  readonly id: string;
  readonly icon?: ReactNode;
  readonly text: string;
  readonly time: string;
}

const emptyState: EntryCollaborationState = {
  assignees: [],
  attachments: [],
  comments: [],
  shares: [],
  tags: [],
};

export function EntryCollaborationPanel({
  entryId,
  entryKind,
  entryLabel,
}: EntryCollaborationPanelProps) {
  const storageKey = useMemo(
    () => `cxnext-entry-collaboration:${entryKind}:${entryId ?? "draft"}`,
    [entryId, entryKind],
  );
  const [state, setState] = useState<EntryCollaborationState>(emptyState);
  const [commentDraft, setCommentDraft] = useState("");
  const [drawerCollapsed, setDrawerCollapsed] = useState(false);

  useEffect(() => {
    setState(loadEntryCollaboration(storageKey));
  }, [storageKey]);

  function updateState(nextState: EntryCollaborationState) {
    setState(nextState);
    saveEntryCollaboration(storageKey, nextState);
  }

  function addComment() {
    const body = commentDraft.trim();
    if (!body) return;
    const comment: EntryComment = {
      id: `comment:${Date.now()}`,
      author: "A",
      body,
      createdAt: new Date().toISOString(),
    };
    updateState({ ...state, comments: [comment, ...state.comments] });
    setCommentDraft("");
  }

  const activities = buildActivities(state, entryLabel);

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_280px]">
      <section className="rounded-md border border-border/70 bg-card p-4">
        <h2 className="text-lg font-semibold text-foreground">Comments</h2>
        <div className="mt-4 flex items-start gap-3">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-semibold text-emerald-700">
            A
          </div>
          <Input
            className="h-10 rounded-md bg-muted/45"
            value={commentDraft}
            placeholder="Type a reply / comment"
            onChange={(event) => setCommentDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                addComment();
              }
            }}
          />
          <Button type="button" className="h-10 rounded-md" onClick={addComment}>
            Add
          </Button>
        </div>
        {state.comments.length ? (
          <div className="mt-4 grid gap-3">
            {state.comments.map((comment) => (
              <div key={comment.id} className="rounded-md bg-muted/25 px-3 py-2 text-sm">
                <div className="font-medium text-foreground">{comment.body}</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {comment.author} commented {relativeTime(comment.createdAt)}
                </div>
              </div>
            ))}
          </div>
        ) : null}
        <h2 className="mt-8 text-lg font-semibold text-foreground">Activity</h2>
        <div className="mt-5 space-y-5 border-l border-border/70 pl-5">
          {activities.map((activity) => (
            <div key={activity.id} className="relative text-sm text-foreground">
              <span className="absolute -left-[1.7rem] top-1/2 flex size-3 -translate-y-1/2 items-center justify-center rounded-full bg-primary/15">
                <span className="size-1.5 rounded-full bg-primary/70" />
              </span>
              {activity.icon ? (
                <span className="absolute -left-[2.25rem] top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-full border border-primary/20 bg-primary/10 text-primary">
                  {activity.icon}
                </span>
              ) : null}
              <span>{activity.text}</span>
              <span className="text-muted-foreground"> · {activity.time}</span>
            </div>
          ))}
        </div>
      </section>
      <aside className="rounded-md border border-border/70 bg-card">
        <button
          type="button"
          className="flex w-full items-center justify-between border-b border-border/70 px-3 py-2 text-left text-sm font-semibold"
          onClick={() => setDrawerCollapsed((current) => !current)}
        >
          Entry tools
          {drawerCollapsed ? <ChevronDown className="size-4" /> : <ChevronUp className="size-4" />}
        </button>
        {drawerCollapsed ? null : (
          <div className="divide-y divide-border/70">
            <DrawerActionSection
              icon={<Mail className="size-4" />}
              entryLabel={entryLabel}
              label="Send to Email"
            />
            <DrawerListSection
              icon={<UserRound className="size-4" />}
              label="Assign"
              values={state.assignees}
              placeholder="Assign to"
              onChange={(values) => updateState({ ...state, assignees: values })}
            />
            <DrawerListSection
              icon={<Paperclip className="size-4" />}
              label="Attachments"
              values={state.attachments}
              placeholder="Attachment name"
              onChange={(values) => updateState({ ...state, attachments: values })}
            />
            <DrawerListSection
              icon={<Tag className="size-4" />}
              label="Tags"
              values={state.tags}
              placeholder="Tag"
              onChange={(values) => updateState({ ...state, tags: values })}
            />
            <DrawerListSection
              icon={<MessageCircle className="size-4" />}
              label="Send to WhatsApp"
              values={state.shares}
              placeholder="WhatsApp number"
              onChange={(values) => updateState({ ...state, shares: values })}
            />
          </div>
        )}
      </aside>
    </div>
  );
}

function DrawerActionSection({
  entryLabel,
  icon,
  label,
}: {
  readonly entryLabel: string;
  readonly icon: ReactNode;
  readonly label: string;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [emailDraft, setEmailDraft] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  function sendEmail() {
    const email = emailDraft.trim();
    if (!email) return;
    toast.info("Email send is ready for mail provider integration.", {
      description: `${entryLabel} can be sent to ${email} once SMTP/API credentials are configured.`,
    });
    setEmailDraft("");
    setIsAdding(false);
  }

  return (
    <section className="px-3 py-3">
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        {icon}
        <button
          type="button"
          className="min-w-0 flex-1 text-left font-medium"
          onClick={() => setCollapsed((current) => !current)}
        >
          {label}
        </button>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="size-7 rounded-md"
          onClick={() => {
            setCollapsed(false);
            setIsAdding((current) => !current);
          }}
        >
          <Plus className="size-4" />
        </Button>
      </div>
      {collapsed || !isAdding ? null : (
        <div className="mt-3 flex gap-1.5">
          <Input
            autoFocus
            className="h-8 min-w-0 rounded-md text-sm"
            value={emailDraft}
            placeholder="Email address"
            type="email"
            onBlur={() => {
              if (!emailDraft.trim()) setIsAdding(false);
            }}
            onChange={(event) => setEmailDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                sendEmail();
              }
              if (event.key === "Escape") {
                event.preventDefault();
                setEmailDraft("");
                setIsAdding(false);
              }
            }}
          />
          <Button
            type="button"
            size="icon"
            className="size-8 rounded-md"
            onMouseDown={(event) => event.preventDefault()}
            onClick={sendEmail}
            aria-label="Send email"
          >
            <Send className="size-3.5" />
          </Button>
        </div>
      )}
    </section>
  );
}

function DrawerListSection({
  icon,
  label,
  onChange,
  placeholder,
  values,
}: {
  readonly icon: ReactNode;
  readonly label: string;
  readonly onChange: (values: readonly string[]) => void;
  readonly placeholder: string;
  readonly values: readonly string[];
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [draft, setDraft] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  function addValue() {
    const value = draft.trim();
    if (!value) return;
    if (!values.some((item) => item.trim().toLowerCase() === value.toLowerCase())) {
      onChange([...values, value]);
    }
    setDraft("");
    setIsAdding(false);
  }

  return (
    <section className="px-3 py-3">
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        {icon}
        <button
          type="button"
          className="min-w-0 flex-1 text-left font-medium"
          onClick={() => setCollapsed((current) => !current)}
        >
          {label}
        </button>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="size-7 rounded-md"
          onClick={() => {
            setCollapsed(false);
            setIsAdding((current) => !current);
          }}
        >
          <Plus className="size-4" />
        </Button>
      </div>
      {collapsed ? null : (
        <div className="mt-3 grid gap-2">
          {isAdding ? (
            <Input
              autoFocus
              className="h-9 rounded-md"
              value={draft}
              placeholder={placeholder}
              onBlur={() => {
                if (!draft.trim()) setIsAdding(false);
              }}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  addValue();
                }
                if (event.key === "Escape") {
                  event.preventDefault();
                  setDraft("");
                  setIsAdding(false);
                }
              }}
            />
          ) : null}
          {values.length ? (
            <div className="flex flex-wrap gap-2">
              {values.map((value, index) => (
                <span
                  key={`${value}-${index}`}
                  className="inline-flex max-w-full items-center gap-1 rounded-md bg-muted px-2 py-1 text-xs font-medium text-foreground"
                >
                  <span className="min-w-0 truncate">{value}</span>
                  <button
                    type="button"
                    className="text-primary hover:text-destructive"
                    onClick={() => onChange(values.filter((_, itemIndex) => itemIndex !== index))}
                    aria-label={`Remove ${value}`}
                  >
                    <X className="size-3.5" />
                  </button>
                </span>
              ))}
            </div>
          ) : null}
        </div>
      )}
    </section>
  );
}

function buildActivities(state: EntryCollaborationState, entryLabel: string): readonly EntryActivity[] {
  return [
    { id: "edited", text: `You last edited ${entryLabel}`, time: "just now" },
    ...state.attachments.map((attachment) => ({
      id: `attachment:${attachment}`,
      icon: <Paperclip className="size-4" />,
      text: `You attached ${attachment}`,
      time: "just now",
    })),
    ...state.comments.map((comment) => ({
      id: `comment-activity:${comment.id}`,
      text: `You commented "${comment.body}"`,
      time: relativeTime(comment.createdAt),
    })),
    { id: "created", text: `You created ${entryLabel}`, time: "earlier" },
  ];
}

function loadEntryCollaboration(storageKey: string): EntryCollaborationState {
  if (typeof window === "undefined") return emptyState;
  try {
    return { ...emptyState, ...JSON.parse(window.localStorage.getItem(storageKey) ?? "{}") };
  } catch {
    return emptyState;
  }
}

function saveEntryCollaboration(storageKey: string, state: EntryCollaborationState) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(storageKey, JSON.stringify(state));
}

function relativeTime(value: string) {
  const elapsed = Date.now() - new Date(value).getTime();
  if (elapsed < 60_000) return "just now";
  const minutes = Math.round(elapsed / 60_000);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}
