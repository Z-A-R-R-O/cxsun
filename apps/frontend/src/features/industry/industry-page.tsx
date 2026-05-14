import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Plus, RefreshCw } from "lucide-react"
import { Button } from "src/components/ui/button"
import { Input } from "src/components/ui/input"
import { cn } from "src/lib/utils"
import { listIndustries, upsertIndustry, type IndustryRecord } from "./industry-client"

export function IndustryPage() {
  const [industries, setIndustries] = useState<IndustryRecord[]>([])
  const [code, setCode] = useState("")
  const [name, setName] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    void load()
  }, [])

  async function load() {
    setIsLoading(true)
    try {
      setIndustries(await listIndustries())
    } catch (error) {
      toast.error("Industry load failed", {
        description: error instanceof Error ? error.message : "Unable to load industries.",
      })
    } finally {
      setIsLoading(false)
    }
  }

  async function createIndustry() {
    if (!code.trim() || !name.trim()) {
      return
    }

    try {
      const industry = await upsertIndustry({ code, name })
      setCode("")
      setName("")
      toast.success("Industry saved", {
        description: `${industry.name} is available for tenant defaults.`,
      })
      await load()
    } catch (error) {
      toast.error("Industry save failed", {
        description: error instanceof Error ? error.message : "Unable to save industry.",
      })
    }
  }

  return (
    <section className="flex flex-1 flex-col gap-4 p-4 md:p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Industries</h1>
          <p className="text-sm text-muted-foreground">
            Master payload and frontend defaults shared by tenant records.
          </p>
        </div>
        <Button disabled={isLoading} onClick={() => void load()} type="button" variant="outline">
          <RefreshCw className={cn("size-4", isLoading && "animate-spin")} />
          Refresh
        </Button>
      </div>

      <div className="grid gap-2 rounded-lg border bg-card p-3 md:grid-cols-[180px_1fr_auto]">
        <Input value={code} onChange={(event) => setCode(event.target.value)} placeholder="industry_code" />
        <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Industry name" />
        <Button onClick={() => void createIndustry()} type="button">
          <Plus className="size-4" />
          Save industry
        </Button>
      </div>

      <div className="overflow-x-auto rounded-lg border bg-card">
        <table className="w-full min-w-[680px] text-sm">
          <thead className="bg-muted/60 text-left">
            <tr>
              <th className="px-4 py-3 font-medium">Code</th>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Features</th>
              <th className="px-4 py-3 font-medium">UI settings</th>
            </tr>
          </thead>
          <tbody>
            {industries.map((industry) => (
              <tr className="border-t" key={industry.id}>
                <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{industry.code}</td>
                <td className="px-4 py-3 font-medium">{industry.name}</td>
                <td className="px-4 py-3 text-muted-foreground">{industry.default_features}</td>
                <td className="px-4 py-3 text-muted-foreground">{industry.default_ui_settings}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {industries.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            {isLoading ? "Loading industries." : "No industries found."}
          </div>
        ) : null}
      </div>
    </section>
  )
}
