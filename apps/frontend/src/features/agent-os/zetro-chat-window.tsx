import { useEffect, useMemo, useState } from "react"
import { useMutation, useQuery } from "@tanstack/react-query"
import { Bot, KeyRound, Loader2, Maximize2, Send, X } from "lucide-react"
import { toast } from "sonner"

import { Button } from "src/components/ui/button"
import { ScrollArea } from "src/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "src/components/ui/select"
import { Textarea } from "src/components/ui/textarea"
import type { AuthSession } from "src/features/auth/auth-client"
import { cn } from "src/lib/utils"
import { getAgentOsStatus, sendZetroChat } from "./agent-os-client"

type ChatRole = "assistant" | "user"

interface ChatMessage {
  id: string
  role: ChatRole
  body: string
  model?: string
}

export function ZetroChatWindow({
  open,
  session,
  onOpenBase,
  onOpenChange,
}: {
  open: boolean
  session: AuthSession
  onOpenBase?: () => void
  onOpenChange(open: boolean): void
}) {
  const statusQuery = useQuery({
    enabled: open,
    queryKey: ["zetro-chat-status", session.selectedTenant.slug],
    queryFn: () => getAgentOsStatus(session),
  })
  const models = useMemo(() => statusQuery.data?.models ?? [], [statusQuery.data?.models])
  const [selectedModel, setSelectedModel] = useState("")
  const [conversationUuid, setConversationUuid] = useState<string | null>(null)
  const [draft, setDraft] = useState("")
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: "welcome",
      role: "assistant",
      body: "ZETRO is ready for universal chat. Free models are listed first, and premium models can be connected through API configuration.",
    },
  ])

  useEffect(() => {
    if (!selectedModel && statusQuery.data?.default_model?.id) {
      setSelectedModel(statusQuery.data.default_model.id)
    }
  }, [selectedModel, statusQuery.data?.default_model?.id])

  const chatMutation = useMutation({
    mutationFn: (message: string) => sendZetroChat(session, {
      conversationUuid,
      message,
      model: selectedModel || statusQuery.data?.default_model?.id || "",
    }),
    onSuccess: (response) => {
      if (response.conversation_uuid) {
        setConversationUuid(response.conversation_uuid)
      }
      setMessages((current) => [
        ...current,
        {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          body: response.message ?? "ZETRO received the message.",
          model: response.model?.label,
        },
      ])
    },
    onError: (error) => {
      toast.error("ZETRO chat failed", {
        description: error instanceof Error ? error.message : "Please try again.",
      })
    },
  })

  function sendMessage() {
    const message = draft.trim()
    if (!message || chatMutation.isPending) return

    setMessages((current) => [
      ...current,
      {
        id: `user-${Date.now()}`,
        role: "user",
        body: message,
        model: modelDisplayName(selectedModel, models),
      },
    ])
    setDraft("")
    chatMutation.mutate(message)
  }

  if (!open) return null

  return (
    <section className="fixed bottom-4 right-4 z-50 flex h-[min(640px,calc(100vh-2rem))] w-[min(420px,calc(100vw-2rem))] flex-col overflow-hidden rounded-md border border-border/80 bg-popover text-popover-foreground shadow-2xl">
      <header className="flex items-center gap-3 border-b px-3 py-2.5">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <Bot className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold">ZETRO</div>
          <div className="truncate text-xs text-muted-foreground">Universal chat - free models first</div>
        </div>
        <Button aria-label="Open ZETRO base" size="icon-sm" type="button" variant="ghost" onClick={onOpenBase}>
          <Maximize2 className="size-4" />
        </Button>
        <Button aria-label="Close ZETRO" size="icon-sm" type="button" variant="ghost" onClick={() => onOpenChange(false)}>
          <X className="size-4" />
        </Button>
      </header>

      <div className="border-b px-3 py-2">
        <Select value={selectedModel} onValueChange={setSelectedModel}>
          <SelectTrigger className="h-8 w-full rounded-md">
            <SelectValue placeholder={statusQuery.isFetching ? "Loading models..." : "Select model"} />
          </SelectTrigger>
          <SelectContent align="start" className="w-[var(--radix-select-trigger-width)]">
            {(models.length ? models : fallbackModels).map((model) => (
              <SelectItem key={model.id} value={model.id}>
                {modelSelectLabel(model)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {statusQuery.data && !statusQuery.data.api_connected ? (
          <div className="mt-2 grid gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-2.5 py-2 text-xs leading-5 text-amber-700 dark:text-amber-300">
            <div>Save and test an API provider key to call free or premium models.</div>
            <Button className="h-7 w-fit rounded-md px-2 text-xs" size="sm" type="button" variant="outline" onClick={onOpenBase}>
              <KeyRound className="size-3.5" />
              Open API panel
            </Button>
          </div>
        ) : null}
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <div className="grid gap-3 p-3">
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "max-w-[88%] rounded-md border px-3 py-2 text-sm leading-6",
                message.role === "user"
                  ? "ml-auto border-primary/30 bg-primary text-primary-foreground"
                  : "mr-auto border-border/70 bg-background",
              )}
            >
              <div>{message.body}</div>
              {message.model ? (
                <div className={cn("mt-1 text-[11px]", message.role === "user" ? "text-primary-foreground/70" : "text-muted-foreground")}>
                  {message.model}
                </div>
              ) : null}
            </div>
          ))}
          {chatMutation.isPending ? (
            <div className="mr-auto flex items-center gap-2 rounded-md border border-border/70 bg-background px-3 py-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              ZETRO is calling the selected model
            </div>
          ) : null}
        </div>
      </ScrollArea>

      <footer className="border-t p-3">
        <div className="flex items-end gap-2">
          <Textarea
            className="max-h-28 min-h-10 resize-none rounded-md text-sm"
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault()
                sendMessage()
              }
            }}
            placeholder="Ask ZETRO..."
            value={draft}
          />
          <Button className="h-10 rounded-md px-3" disabled={!draft.trim() || chatMutation.isPending} type="button" onClick={sendMessage}>
            <Send className="size-4" />
          </Button>
        </div>
      </footer>
    </section>
  )
}

const fallbackModels = [
  { id: "deepseek/deepseek-chat-v3-0324:free", label: "Deepseek Chat V3 0324 Free", provider: "openrouter", tier: "free", requiresKey: true },
  { id: "qwen/qwen3-235b-a22b:free", label: "Qwen3 235b A22b Free", provider: "openrouter", tier: "free", requiresKey: true },
  { id: "openai/gpt-5.2", label: "Gpt 5.2", provider: "openrouter", tier: "premium", requiresKey: true },
]

function modelSelectLabel(model: (typeof fallbackModels)[number]) {
  return `${model.label} - ${model.tier === "free" ? "Free" : "Premium"}`
}

function modelDisplayName(modelId: string, models: typeof fallbackModels) {
  const model = models.find((entry) => entry.id === modelId)
  return model ? modelSelectLabel(model) : modelId
}
