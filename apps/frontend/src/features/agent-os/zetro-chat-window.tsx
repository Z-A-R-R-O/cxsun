import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Bot,
  Clock3,
  KeyRound,
  Loader2,
  Maximize2,
  Plus,
  Send,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "src/components/ui/button";
import { ScrollArea } from "src/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "src/components/ui/select";
import { Textarea } from "src/components/ui/textarea";
import type { AuthSession } from "src/features/auth/auth-client";
import { cn } from "src/lib/utils";
import {
  clearZetroConversation,
  clearZetroConversations,
  getAgentOsStatus,
  getZetroConversation,
  isZetroAdminRole,
  listZetroConversations,
  sendZetroChat,
} from "./agent-os-client";

type ChatRole = "assistant" | "user";

interface ChatMessage {
  id: string;
  role: ChatRole;
  body: string;
  model?: string;
}
export function ZetroChatWindow({
  open,
  session,
  onOpenBase,
  onOpenChange,
}: {
  open: boolean;
  session: AuthSession;
  onOpenBase?: () => void;
  onOpenChange(open: boolean): void;
}) {
  const statusQuery = useQuery({
    enabled: open,
    queryKey: ["agent-os-status", session.selectedTenant.slug],
    queryFn: () => getAgentOsStatus(session),
  });
  const adminMode = isZetroAdminRole(session.selectedTenant.role);
  const status = statusQuery.data;
  const models = useMemo(() => status?.models ?? [], [status?.models]);
  const [selectedModel, setSelectedModel] = useState("");
  const [conversationUuid, setConversationUuid] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [emptyPromptIndex] = useState(() => Math.floor(Math.random() * 5));
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  const defaultModelId = status?.default_model?.id;
  useEffect(() => {
    if (defaultModelId) {
      setSelectedModel((current) =>
        current && models.some((m) => m.id === current)
          ? current
          : defaultModelId,
      );
    }
  }, [defaultModelId, models]);

  const [messages, setMessages] = useState<ChatMessage[]>(() => []);
  const historyQuery = useQuery({
    enabled: open && historyOpen,
    queryKey: ["zetro-conversations", session.selectedTenant.slug],
    queryFn: () => listZetroConversations(session),
  });

  function resetChat() {
    setConversationUuid(null);
    setMessages([]);
  }

  function startNewChat() {
    setHistoryOpen(false);
    resetChat();
  }

  const loadConversationMutation = useMutation({
    mutationFn: (uuid: string) => getZetroConversation(session, uuid),
    onSuccess: (response) => {
      if (!response.conversation) return;
      setConversationUuid(response.conversation.uuid);
      const loaded =
        response.messages?.map((message) => ({
          id: message.id,
          role: message.role,
          body: message.body,
          model: message.model,
        })) ?? [];
      setMessages(loaded);
      if (
        response.conversation.model &&
        models.some((model) => model.id === response.conversation?.model)
      ) {
        setSelectedModel(response.conversation.model);
      }
      setHistoryOpen(false);
    },
    onError: (error) => {
      toast.error("ZETRO history failed", {
        description:
          error instanceof Error ? error.message : "Could not load chat.",
      });
    },
  });

  const clearCurrentMutation = useMutation({
    mutationFn: async () => {
      if (!conversationUuid) return { ok: true, cleared: 0 };
      return clearZetroConversation(session, conversationUuid);
    },
    onSuccess: () => {
      resetChat();
      void historyQuery.refetch();
      toast.success("ZETRO chat cleared");
    },
    onError: (error) => {
      toast.error("Clear chat failed", {
        description:
          error instanceof Error ? error.message : "Please try again.",
      });
    },
  });

  const clearAllMutation = useMutation({
    mutationFn: () => clearZetroConversations(session),
    onSuccess: () => {
      resetChat();
      void historyQuery.refetch();
      toast.success("ZETRO history cleared");
    },
    onError: (error) => {
      toast.error("Clear history failed", {
        description:
          error instanceof Error ? error.message : "Please try again.",
      });
    },
  });

  const chatMutation = useMutation({
    mutationFn: (message: string) =>
      sendZetroChat(session, {
        conversationUuid,
        message,
        model: adminMode ? selectedModel || defaultModelId || "" : defaultModelId || "zetro-assistant",
        providerKey: adminMode ? status?.api_connection?.provider : undefined,
      }),
    onSuccess: (response) => {
      if (response.conversation_uuid) {
        setConversationUuid(response.conversation_uuid);
      }
      setMessages((current) => [
        ...current,
        {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          body: response.message ?? "ZETRO received the message.",
          model: response.model?.label,
        },
      ]);
      void historyQuery.refetch();
    },
    onError: (error) => {
      toast.error("ZETRO chat failed", {
        description:
          error instanceof Error ? error.message : "Please try again.",
      });
    },
  });

  useEffect(() => {
    if (!open || historyOpen) return;
    const frame = window.requestAnimationFrame(() => {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [chatMutation.isPending, historyOpen, messages.length, open]);

  function sendMessage() {
    const message = draft.trim();
    if (!message || chatMutation.isPending) return;

    setMessages((current) => [
      ...current,
      {
        id: `user-${Date.now()}`,
        role: "user",
        body: message,
        model: adminMode ? modelDisplayName(selectedModel, models) : undefined,
      },
    ]);
    setDraft("");
    chatMutation.mutate(message);
  }

  if (!open) return null;

  const connected = Boolean(status?.api_connected);
  const userFirstName = firstName(session.user.name);

  return (
    <section className="fixed bottom-4 right-4 z-50 flex h-[min(860px,calc(100vh-2rem))] w-[min(680px,calc(100vw-2rem))] flex-col overflow-hidden rounded-[28px] border border-white/50 bg-white/45 text-zinc-950 shadow-[0_34px_110px_rgba(15,23,42,0.24)] backdrop-blur-[38px] dark:border-white/20 dark:bg-zinc-950/35 dark:text-white dark:shadow-[0_34px_110px_rgba(0,0,0,0.46)]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_8%,rgba(14,165,233,0.18),transparent_32%),radial-gradient(circle_at_86%_0%,rgba(16,185,129,0.16),transparent_34%),linear-gradient(145deg,rgba(255,255,255,0.68),rgba(255,255,255,0.26)_42%,rgba(255,255,255,0.10))] dark:bg-[radial-gradient(circle_at_18%_8%,rgba(34,211,238,0.18),transparent_32%),radial-gradient(circle_at_86%_0%,rgba(16,185,129,0.18),transparent_34%),linear-gradient(145deg,rgba(255,255,255,0.13),rgba(255,255,255,0.05)_38%,rgba(0,0,0,0.14))]" />
      <div className="pointer-events-none absolute inset-0 rounded-[28px] shadow-[inset_0_1px_0_rgba(255,255,255,0.74),inset_0_-1px_0_rgba(255,255,255,0.22)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.24),inset_0_-1px_0_rgba(255,255,255,0.08)]" />
      <div className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-white/90 to-transparent" />

      <header className="relative z-10 shrink-0 border-b border-white/45 px-5 pb-5 pt-5 dark:border-white/10">
        <div className="absolute right-4 top-4 z-20 flex items-center gap-2">
          <Button
            aria-label="New ZETRO chat"
            className="size-9 rounded-full border border-black/10 bg-white/40 text-zinc-800 shadow-sm backdrop-blur-2xl hover:bg-white/70 hover:text-zinc-950 dark:border-white/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/20 dark:hover:text-white"
            size="icon-sm"
            type="button"
            variant="ghost"
            onClick={startNewChat}
          >
            <Plus className="size-4" />
          </Button>
          <Button
            aria-label="ZETRO chat history"
            className={cn(
              "size-9 rounded-full border border-black/10 text-zinc-800 shadow-sm backdrop-blur-2xl hover:bg-white/70 hover:text-zinc-950 dark:border-white/10 dark:text-white dark:hover:bg-white/20 dark:hover:text-white",
              historyOpen
                ? "bg-white/70 dark:bg-white/20"
                : "bg-white/40 dark:bg-white/10",
            )}
            size="icon-sm"
            type="button"
            variant="ghost"
            onClick={() => setHistoryOpen((value) => !value)}
          >
            <Clock3 className="size-4" />
          </Button>
          <Button
            aria-label="Clear current ZETRO chat"
            className="size-9 rounded-full border border-black/10 bg-white/40 text-zinc-800 shadow-sm backdrop-blur-2xl hover:bg-white/70 hover:text-zinc-950 dark:border-white/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/20 dark:hover:text-white"
            disabled={clearCurrentMutation.isPending}
            size="icon-sm"
            type="button"
            variant="ghost"
            onClick={() => clearCurrentMutation.mutate()}
          >
            <Trash2 className="size-4" />
          </Button>
          <Button
            aria-label="Open ZETRO base"
            className="size-9 rounded-full border border-black/10 bg-white/40 text-zinc-800 shadow-sm backdrop-blur-2xl hover:bg-white/70 hover:text-zinc-950 dark:border-white/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/20 dark:hover:text-white"
            size="icon-sm"
            type="button"
            variant="ghost"
            onClick={onOpenBase}
          >
            <Maximize2 className="size-4" />
          </Button>
          <Button
            aria-label="Close ZETRO"
            className="size-9 rounded-full border border-black/10 bg-white/40 text-zinc-800 shadow-sm backdrop-blur-2xl hover:bg-white/70 hover:text-zinc-950 dark:border-white/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/20 dark:hover:text-white"
            size="icon-sm"
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
          >
            <X className="size-4" />
          </Button>
        </div>

        <div className="absolute left-5 top-5 z-20">
          <div
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide shadow-sm backdrop-blur-2xl",
              connected
                ? "border-emerald-400/25 bg-emerald-500/10 text-emerald-700 dark:border-emerald-300/25 dark:bg-emerald-300/15 dark:text-emerald-100"
                : "border-amber-400/25 bg-amber-500/10 text-amber-700 dark:border-amber-300/25 dark:bg-amber-300/15 dark:text-amber-100",
            )}
          >
            <span
              className={cn(
                "size-1.5 rounded-full shadow-[0_0_12px_currentColor]",
                connected
                  ? "bg-emerald-300 text-emerald-300"
                  : "bg-amber-300 text-amber-300",
              )}
            />
            {connected ? "Live" : "Setup"}
          </div>
        </div>

        <div className="relative z-10 flex min-h-36 items-center justify-center px-20 py-4">
          <img
            alt="ZETRO"
            className="max-h-32 w-[min(460px,90%)] object-contain opacity-90 drop-shadow-[0_20px_38px_rgba(15,23,42,0.16)] dark:hidden"
            src="/zetro-signature-dark.png"
          />
          <img
            alt="ZETRO"
            className="hidden max-h-32 w-[min(460px,90%)] object-contain opacity-100 drop-shadow-[0_18px_34px_rgba(255,255,255,0.24)] dark:block"
            src="/zetro-signature-white.png"
          />
        </div>
      </header>

      {statusQuery.data && !statusQuery.data.api_connected ? (
        <div className="relative z-10 border-b border-amber-400/20 bg-amber-200/25 px-5 py-3 text-xs leading-5 text-amber-800 backdrop-blur-2xl dark:border-amber-200/20 dark:bg-amber-300/10 dark:text-amber-100">
          <div className="flex items-start justify-between gap-3">
            <div>
              {adminMode
                ? "Save and test an API provider key to activate ZETRO."
                : "ZETRO setup is pending. Please ask the super-admin to activate the assistant."}
            </div>
            {adminMode ? (
              <Button
                className="h-7 shrink-0 rounded-full border-amber-400/25 bg-white/30 px-2.5 text-xs text-amber-800 hover:bg-white/70 hover:text-amber-900 dark:border-amber-200/30 dark:bg-white/10 dark:text-amber-100 dark:hover:bg-white/20 dark:hover:text-amber-50"
                size="sm"
                type="button"
                variant="outline"
                onClick={onOpenBase}
              >
                <KeyRound className="size-3.5" />
                API panel
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}

      <ScrollArea className="relative z-10 min-h-0 flex-1 bg-[linear-gradient(180deg,rgba(255,255,255,0.22)_0%,rgba(255,255,255,0.08)_38%,rgba(255,255,255,0.04)_100%)] dark:bg-[linear-gradient(180deg,rgba(255,255,255,0.08)_0%,rgba(255,255,255,0.04)_38%,rgba(0,0,0,0.10)_100%)]">
        {historyOpen ? (
          <div className="grid min-h-full content-start gap-3 p-5">
            <div className="mb-1 flex items-center justify-between gap-3">
              <div>
                <div className="text-lg font-semibold text-zinc-900 dark:text-white">
                  Chat history
                </div>
                <div className="text-sm text-zinc-500 dark:text-white/50">
                  Pick up where you left off.
                </div>
              </div>
              <Button
                className="h-8 rounded-full border-black/10 bg-white/40 px-3 text-xs text-zinc-700 backdrop-blur-xl hover:bg-white/70 hover:text-zinc-950 dark:border-white/20 dark:bg-white/10 dark:text-white dark:hover:bg-white/20 dark:hover:text-white"
                disabled={
                  clearAllMutation.isPending ||
                  !historyQuery.data?.conversations.length
                }
                size="sm"
                type="button"
                variant="outline"
                onClick={() => clearAllMutation.mutate()}
              >
                <Trash2 className="size-3.5" />
                Clear all
              </Button>
            </div>
            {historyQuery.isFetching ? (
              <div className="flex items-center gap-2 rounded-[18px] border border-black/10 bg-white/40 p-4 text-sm text-zinc-500 backdrop-blur-xl dark:border-white/10 dark:bg-white/10 dark:text-white/60">
                <Loader2 className="size-4 animate-spin" />
                Loading saved chats
              </div>
            ) : null}
            {(historyQuery.data?.conversations ?? []).map((conversation) => (
              <button
                key={conversation.uuid}
                className={cn(
                  "rounded-[18px] border border-black/10 bg-white/40 p-4 text-left text-zinc-900 shadow-sm backdrop-blur-xl transition duration-200 hover:border-black/15 hover:bg-white/70 dark:border-white/10 dark:bg-white/10 dark:text-white dark:hover:border-white/25 dark:hover:bg-white/20",
                  conversation.uuid === conversationUuid &&
                    "border-black/20 bg-white/80 dark:border-white/30 dark:bg-white/20",
                )}
                type="button"
                onClick={() =>
                  loadConversationMutation.mutate(conversation.uuid)
                }
              >
                <span className="flex items-center justify-between gap-3">
                  <span className="min-w-0 truncate text-sm font-semibold">
                    {conversation.title || "Untitled chat"}
                  </span>
                  <span className="shrink-0 text-xs text-zinc-500 dark:text-white/55">
                    {formatChatTime(conversation.updated_at)}
                  </span>
                </span>
                <span className="mt-2 flex items-center justify-between gap-3 text-xs text-zinc-500 dark:text-white/55">
                  <span>
                    {conversation.message_count} saved turn
                    {conversation.message_count === 1 ? "" : "s"}
                  </span>
                  <span>{formatChatDate(conversation.updated_at)}</span>
                </span>
              </button>
            ))}
            {!historyQuery.isFetching &&
            !historyQuery.data?.conversations.length ? (
              <div className="grid min-h-56 place-items-center rounded-[22px] border border-black/10 bg-white/35 p-6 text-center text-sm text-zinc-500 backdrop-blur-xl dark:border-white/10 dark:bg-white/10 dark:text-white/55">
                No saved ZETRO chats yet.
              </div>
            ) : null}
          </div>
        ) : (
          <div
            className={cn(
              "grid gap-4 p-5",
              messages.length === 0 && !chatMutation.isPending
                ? "min-h-full place-items-center"
                : "",
            )}
          >
            {messages.length === 0 && !chatMutation.isPending ? (
              <EmptyChatPrompt index={emptyPromptIndex} name={userFirstName} />
            ) : null}
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "group/message flex gap-2.5",
                  message.role === "user" ? "justify-end" : "justify-start",
                )}
              >
                {message.role === "assistant" ? (
                  <span className="mt-1 flex size-8 shrink-0 items-center justify-center rounded-full border border-black/10 bg-white/50 shadow-sm backdrop-blur-2xl dark:border-white/20 dark:bg-white/10">
                    <Bot className="size-4 text-zinc-700 dark:text-white/80" />
                  </span>
                ) : null}
                <div
                  className={cn(
                    "max-w-[88%] break-words rounded-[18px] border px-4 py-3 text-sm leading-6 shadow-[0_16px_42px_rgba(15,23,42,0.10)] backdrop-blur-2xl transition duration-200 dark:shadow-[0_12px_34px_rgba(0,0,0,0.18)]",
                    message.role === "user"
                      ? "border-zinc-950/10 bg-zinc-950/90 text-white dark:border-white/30 dark:bg-white/90 dark:text-zinc-950"
                      : "border-black/10 bg-white/50 text-zinc-900 dark:border-white/20 dark:bg-white/10 dark:text-white",
                  )}
                >
                  <MessageBody body={message.body} role={message.role} />
                </div>
                {message.role === "user" ? (
                  <div className="mt-1 flex size-8 shrink-0 items-center justify-center rounded-full border border-black/10 bg-zinc-950/90 text-[11px] font-semibold text-white shadow-sm backdrop-blur-2xl dark:border-white/20 dark:bg-white/10">
                    {session.user.name?.charAt(0)?.toUpperCase() ?? "U"}
                  </div>
                ) : null}
              </div>
            ))}
            {chatMutation.isPending ? (
              <div className="mr-auto flex max-w-[88%] items-center gap-2 rounded-[18px] border border-black/10 bg-white/50 px-3.5 py-2.5 text-sm text-zinc-500 shadow-sm backdrop-blur-2xl dark:border-white/20 dark:bg-white/10 dark:text-white/60">
                <span className="flex size-6 items-center justify-center rounded-full bg-zinc-950/10 text-zinc-700 dark:bg-white/10 dark:text-white">
                  <Loader2 className="size-3.5 animate-spin" />
                </span>
                {adminMode ? "Calling selected model" : "ZETRO is thinking"}
              </div>
            ) : null}
            <div ref={chatEndRef} className="h-px" />
          </div>
        )}
      </ScrollArea>

      <footer className="relative z-10 border-t border-white/45 bg-white/25 p-4 backdrop-blur-[34px] dark:border-white/10 dark:bg-black/10">
        <div className="rounded-[24px] border border-black/10 bg-white/45 p-2.5 shadow-[0_18px_46px_rgba(15,23,42,0.12)] backdrop-blur-[34px] transition duration-200 focus-within:border-black/15 focus-within:bg-white/65 dark:border-white/20 dark:bg-white/10 dark:shadow-[0_18px_46px_rgba(0,0,0,0.24)] dark:focus-within:border-white/30 dark:focus-within:bg-white/20">
          <Textarea
            className="max-h-32 min-h-16 resize-none border-0 bg-transparent px-2 py-2 text-sm text-zinc-950 shadow-none placeholder:text-zinc-500 focus-visible:ring-0 dark:text-white dark:placeholder:text-white/45"
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                sendMessage();
              }
            }}
            placeholder="Ask ZETRO..."
            value={draft}
          />
          <div className="mt-2 flex flex-wrap items-center gap-2 px-1">
            {adminMode ? (
              <Select
                value={selectedModel}
                onValueChange={(value) => {
                  setSelectedModel(value);
                  resetChat();
                }}
              >
                <SelectTrigger className="h-8 w-[min(260px,100%)] rounded-full border-black/10 bg-white/60 text-xs text-zinc-800 shadow-none backdrop-blur-xl hover:bg-white/80 dark:border-white/20 dark:bg-black/20 dark:text-white dark:hover:bg-white/10 [&>span]:truncate">
                  <SelectValue
                    placeholder={
                      statusQuery.isFetching
                        ? "Loading models..."
                        : "Select model"
                    }
                  />
                </SelectTrigger>
                <SelectContent
                  align="start"
                  className="z-[80] max-h-[320px] w-[var(--radix-select-trigger-width)] overflow-y-auto rounded-[18px] border-black/10 bg-white/95 text-zinc-950 shadow-2xl backdrop-blur-2xl dark:border-white/20 dark:bg-zinc-950/95 dark:text-white"
                  position="popper"
                >
                  {(models.length ? models : fallbackModels).map((model) => (
                    <SelectItem key={model.id} value={model.id}>
                      {modelSelectLabel(model)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : null}
            <div className="flex min-w-0 flex-1 items-center gap-2 text-[11px] text-zinc-500 dark:text-white/55">
              <span
                className={cn(
                  "size-1.5 rounded-full",
                  connected
                    ? "bg-emerald-300 shadow-[0_0_12px_rgba(110,231,183,0.75)]"
                    : "bg-amber-300 shadow-[0_0_12px_rgba(252,211,77,0.75)]",
                )}
              />
              <span className="truncate">
                {conversationUuid ? "Memory on" : "New session"} /{" "}
                {connected ? "Ready" : adminMode ? "Needs key" : "Setup pending"}
              </span>
            </div>
            <Button
              className="ml-auto h-9 rounded-full bg-zinc-950 px-3 text-white shadow-[0_12px_30px_rgba(15,23,42,0.22)] hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:shadow-[0_10px_30px_rgba(255,255,255,0.16)] dark:hover:bg-white/90"
              disabled={!draft.trim() || chatMutation.isPending}
              type="button"
              onClick={sendMessage}
            >
              <Send className="size-4" />
            </Button>
          </div>
        </div>
      </footer>
    </section>
  );
}

const fallbackModels = [
  {
    id: "nex-agi/nex-n2-pro:free",
    label: "Nex N2 Pro (free)",
    provider: "openrouter",
    tier: "free",
    requiresKey: true,
  },
  {
    id: "nvidia/nemotron-3-ultra-550b-a55b:free",
    label: "Nemotron 3 Ultra (free)",
    provider: "openrouter",
    tier: "free",
    requiresKey: true,
  },
  {
    id: "poolside/laguna-xs.2:free",
    label: "Laguna XS.2 (free)",
    provider: "openrouter",
    tier: "free",
    requiresKey: true,
  },
  {
    id: "google/gemma-4-26b-a4b-it:free",
    label: "Gemma 4 26B A4B (free)",
    provider: "openrouter",
    tier: "free",
    requiresKey: true,
  },
  {
    id: "openai/gpt-oss-120b:free",
    label: "GPT OSS 120B (free)",
    provider: "openrouter",
    tier: "free",
    requiresKey: true,
  },
  {
    id: "openai/gpt-4.1",
    label: "GPT 4.1",
    provider: "openrouter",
    tier: "premium",
    requiresKey: true,
  },
];

function modelSelectLabel(model: (typeof fallbackModels)[number]) {
  return `${model.label} - ${model.tier === "free" ? "Free" : "Premium"}`;
}

function modelDisplayName(modelId: string, models: typeof fallbackModels) {
  const model = models.find((entry) => entry.id === modelId);
  return model ? modelSelectLabel(model) : modelId;
}

function firstName(name: string) {
  return name.trim().split(/\s+/)[0] || "there";
}

function EmptyChatPrompt({ index, name }: { index: number; name: string }) {
  const prompts = [
    "Where should we start?",
    `Ask away, ${name}`,
    `What's the vibe, ${name}?`,
    `What are we building today, ${name}?`,
    `Point me at the next move, ${name}`,
  ];
  const prompt = prompts[index % prompts.length];

  return (
    <div className="grid max-w-md place-items-center gap-3 px-6 text-center">
      <div className="text-[28px] font-semibold leading-tight text-transparent bg-[linear-gradient(110deg,#60a5fa_0%,#2dd4bf_34%,#a78bfa_68%,#f9a8d4_100%)] bg-clip-text dark:bg-[linear-gradient(110deg,#bfdbfe_0%,#99f6e4_34%,#ddd6fe_68%,#fbcfe8_100%)]">
        {prompt}
      </div>
      <div className="max-w-xs text-sm leading-6 text-zinc-500 dark:text-white/50">
        ZETRO is ready when you are.
      </div>
    </div>
  );
}

function formatChatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return date.toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatChatTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function MessageBody({ body, role }: { body: string; role: ChatRole }) {
  const blocks = formatMessageBlocks(body);
  const sourceClass =
    role === "user"
      ? "border-primary-foreground/20 bg-primary-foreground/10 text-primary-foreground/80"
      : "border-border/70 bg-muted/25 text-muted-foreground";

  return (
    <div className="space-y-2">
      {blocks.map((block, index) => {
        if (block.kind === "bullets") {
          return (
            <ul
              key={`${block.kind}-${index}`}
              className="ml-4 list-disc space-y-1"
            >
              {block.items.map((item) => (
                <li key={item}>
                  <InlineText text={item} />
                </li>
              ))}
            </ul>
          );
        }
        if (block.kind === "heading") {
          return (
            <div key={`${block.kind}-${index}`} className="font-semibold">
              <InlineText text={block.text} />
            </div>
          );
        }
        if (block.kind === "source") {
          return (
            <div
              key={`${block.kind}-${index}`}
              className={cn(
                "rounded-md border px-2.5 py-2 text-xs leading-5",
                sourceClass,
              )}
            >
              <InlineText text={block.text} />
            </div>
          );
        }
        return (
          <p key={`${block.kind}-${index}`}>
            <InlineText text={block.text} />
          </p>
        );
      })}
    </div>
  );
}

type MessageBlock =
  | { kind: "paragraph"; text: string }
  | { kind: "heading"; text: string }
  | { kind: "source"; text: string }
  | { kind: "bullets"; items: string[] };

function formatMessageBlocks(body: string): MessageBlock[] {
  const blocks: MessageBlock[] = [];
  let bullets: string[] = [];

  function flushBullets() {
    if (!bullets.length) return;
    blocks.push({ kind: "bullets", items: bullets });
    bullets = [];
  }

  for (const rawLine of body.split(/\n+/)) {
    const line = rawLine.trim();
    if (!line) continue;

    const bullet = line.match(/^[-*]\s+(.+)$/);
    if (bullet) {
      bullets.push(bullet[1]);
      continue;
    }

    flushBullets();

    if (/^source:/i.test(line) || /^\[source:/i.test(line)) {
      blocks.push({ kind: "source", text: line.replace(/^\[|\]$/g, "") });
      continue;
    }

    const heading = line.match(/^#{1,3}\s+(.+)$/);
    if (heading) {
      blocks.push({ kind: "heading", text: heading[1] });
      continue;
    }

    blocks.push({ kind: "paragraph", text: line });
  }

  flushBullets();
  return blocks.length ? blocks : [{ kind: "paragraph", text: body }];
}

function InlineText({ text }: { text: string }) {
  const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g).filter(Boolean);
  return (
    <>
      {parts.map((part, index) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return <strong key={`${part}-${index}`}>{part.slice(2, -2)}</strong>;
        }
        if (part.startsWith("`") && part.endsWith("`")) {
          return (
            <code
              key={`${part}-${index}`}
              className="rounded bg-muted px-1 py-0.5 text-[0.92em]"
            >
              {part.slice(1, -1)}
            </code>
          );
        }
        return <span key={`${part}-${index}`}>{part}</span>;
      })}
    </>
  );
}
