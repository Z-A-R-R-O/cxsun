import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { ArrowRight, Bot, BookOpenText, Database, Loader2, Lock, Search } from "lucide-react"

import { BrandLogo } from "src/components/blocks/branding/brand-logo"
import { Badge } from "src/components/ui/badge"
import { Button } from "src/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "src/components/ui/card"
import { Input } from "src/components/ui/input"
import { APP_NAME } from "src/lib/branding"
import { cn } from "src/lib/utils"
import { getZetroRead, searchZetroGuide } from "./agent-os-client"

export function ZetroReadPage() {
  const [query, setQuery] = useState("")
  const readQuery = useQuery({
    queryKey: ["zetro-read"],
    queryFn: getZetroRead,
  })
  const searchQuery = useQuery({
    queryKey: ["zetro-guide-search", query],
    queryFn: () => searchZetroGuide(query),
    enabled: readQuery.isSuccess,
  })
  const data = readQuery.data ?? null
  const results = searchQuery.data?.results ?? []

  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="border-b bg-muted/20">
        <div className="mx-auto flex min-h-[78px] w-full max-w-6xl items-center gap-3 px-4 py-4">
          <BrandLogo className="size-10" />
          <div className="min-w-0">
            <div className="text-sm font-semibold text-muted-foreground">{APP_NAME}</div>
            <h1 className="text-2xl font-semibold tracking-normal">ZETRO</h1>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Button asChild className="rounded-md" variant="outline">
              <a href="/">Home</a>
            </Button>
            <Button asChild className="rounded-md">
              <a href="/login">
                Login
                <ArrowRight className="size-4" />
              </a>
            </Button>
          </div>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-8 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="grid gap-5">
          <div className="rounded-md border border-border/70 bg-card p-5 shadow-sm">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="rounded-md" variant="secondary">Read only</Badge>
              <Badge className="rounded-md" variant="outline">User docs</Badge>
            </div>
            <div className="mt-5 flex items-start gap-4">
              <span className="flex size-12 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
                <Bot className="size-6" />
              </span>
              <div className="min-w-0">
                <h2 className="text-3xl font-semibold tracking-normal">{data?.title ?? "ZETRO Read Screen"}</h2>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
                  {data?.summary ?? "Loading ZETRO guidance from existing project markdown."}
                </p>
              </div>
            </div>
          </div>

          <Card className="rounded-md border-border/70 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Search className="size-4 text-muted-foreground" />
                Search ZETRO Docs
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <Input
                className="h-11 rounded-md"
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search approved ZETRO user docs..."
                value={query}
              />
              {readQuery.isLoading || searchQuery.isFetching ? (
                <div className="flex items-center gap-2 rounded-md border border-border/70 bg-muted/20 p-3 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" />
                  Reading existing markdown sources
                </div>
              ) : null}
              <div className="grid gap-3">
                {results.map((result) => (
                  <article key={result.chunk_key} className="rounded-md border border-border/70 bg-background p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className="rounded-md" variant="outline">{result.label}</Badge>
                      <span className="text-xs text-muted-foreground">{result.category}</span>
                  </div>
                    <h3 className="mt-3 text-sm font-semibold">{result.heading}</h3>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">{result.excerpt}</p>
                  </article>
                ))}
                {!results.length && !readQuery.isLoading && !searchQuery.isFetching ? (
                  <div className="rounded-md border border-border/70 bg-muted/20 p-4 text-sm text-muted-foreground">
                    No matching source found yet. Try a platform term like tasks, billing, tenant, or Agent OS.
                  </div>
                ) : null}
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-md border-border/70 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <BookOpenText className="size-4 text-muted-foreground" />
                Connected Markdown Sources
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2">
              {(data?.sources ?? []).map((source) => (
                <article key={source.id} className="rounded-md border border-border/70 bg-background p-4">
                  <div className="text-sm font-semibold">{source.label}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{source.category}</div>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">{source.purpose}</p>
                  <div className="mt-3 text-xs text-muted-foreground">{source.chunks} readable sections</div>
                </article>
              ))}
            </CardContent>
          </Card>
        </div>

        <aside className="grid h-fit gap-4">
          <SideStat icon={Database} label="Sources" value={`${data?.sources.length ?? 0}`} />
          <Card className="rounded-md border-border/70 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Lock className="size-4 text-muted-foreground" />
                Access Boundary
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2">
              {(data?.limits ?? fallbackLimits).map((item) => (
                <div key={item} className="rounded-md border border-border/70 bg-muted/20 p-3 text-sm leading-6 text-muted-foreground">
                  {item}
                </div>
              ))}
            </CardContent>
          </Card>
          <Card className="rounded-md border-border/70 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Try Questions</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2">
              {(data?.search_examples ?? fallbackExamples).map((item) => (
                <button
                  key={item}
                  className={cn(
                    "rounded-md border border-border/70 bg-background p-3 text-left text-sm leading-6 transition hover:border-primary/30 hover:bg-primary/5",
                    query === item && "border-primary/40 bg-primary/10",
                  )}
                  type="button"
                  onClick={() => setQuery(item)}
                >
                  {item}
                </button>
              ))}
            </CardContent>
          </Card>
        </aside>
      </section>
    </main>
  )
}

const fallbackLimits = [
  "This public screen does not show private tenant records.",
  "Tool calls and automation are disabled here.",
  "Live assistant chat belongs inside the dashboard after login.",
]

const fallbackExamples = [
  "What is ZETRO?",
  "Where are tasks and billing?",
  "How will automation work later?",
]

function SideStat({ icon: Icon, label, value }: { icon: typeof Database; label: string; value: string }) {
  return (
    <Card className="rounded-md border-border/70 shadow-sm">
      <CardContent className="flex items-center gap-3 p-4">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
          <Icon className="size-5" />
        </span>
        <div>
          <div className="text-xs font-semibold uppercase text-muted-foreground">{label}</div>
          <div className="mt-1 text-xl font-semibold">{value}</div>
        </div>
      </CardContent>
    </Card>
  )
}
