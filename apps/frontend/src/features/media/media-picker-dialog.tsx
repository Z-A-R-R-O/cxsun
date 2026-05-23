import { useEffect, useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Check, File, Image, Search, Upload } from "lucide-react"
import { toast } from "sonner"

import { Badge } from "src/components/ui/badge"
import { Button } from "src/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "src/components/ui/dialog"
import { Input } from "src/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "src/components/ui/select"
import type { AuthSession } from "src/features/auth/auth-client"
import { cn } from "src/lib/utils"
import { fileToBase64, listMediaAssets, mediaContentBlobUrl, uploadMediaAsset, type MediaAsset, type MediaVisibility } from "./media-client"

export function MediaPickerDialog({
  accept = "image/*",
  folder = "library",
  onOpenChange,
  onSelect,
  open,
  session,
  title = "Select media",
  uploadVisibility = "public",
}: {
  accept?: string
  folder?: string
  onOpenChange(open: boolean): void
  onSelect(asset: MediaAsset): void
  open: boolean
  session: AuthSession
  title?: string
  uploadVisibility?: MediaVisibility
}) {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState("")
  const [activeFolder, setActiveFolder] = useState(folder)
  const [visibility, setVisibility] = useState<"all" | MediaVisibility>("all")
  const [selected, setSelected] = useState<MediaAsset | null>(null)
  const queryKey = ["media-assets", session.selectedTenant.slug, search, activeFolder, visibility]
  const assetsQuery = useQuery({
    enabled: open,
    queryKey,
    queryFn: () => listMediaAssets(session, { folder: activeFolder, search, visibility }),
  })
  const assets = assetsQuery.data ?? []
  const folders = useMemo(() => Array.from(new Set(assets.map((asset) => asset.folder))).sort(), [assets])
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const base64 = await fileToBase64(file)
      return uploadMediaAsset(session, {
        base64,
        fileName: file.name,
        folder: activeFolder || folder,
        mimeType: file.type || "application/octet-stream",
        visibility: uploadVisibility,
      })
    },
    onSuccess: (asset) => {
      toast.success("Media uploaded", { description: asset.original_name })
      setSelected(asset)
      void queryClient.invalidateQueries({ queryKey: ["media-assets", session.selectedTenant.slug] })
    },
  })

  function choose(asset: MediaAsset) {
    onSelect(asset)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] w-[min(980px,calc(100vw-2rem))] overflow-hidden p-0 sm:max-w-5xl" showCloseButton>
        <DialogHeader className="border-b px-5 py-4">
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 p-5">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_180px_150px_120px] lg:items-center">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input className="h-10 rounded-md pl-9" placeholder="Search media" value={search} onChange={(event) => setSearch(event.target.value)} />
            </div>
            <Input className="h-10 rounded-md" placeholder="Folder" value={activeFolder} onChange={(event) => setActiveFolder(event.target.value)} />
            <Select value={visibility} onValueChange={(value) => setVisibility(value as "all" | MediaVisibility)}>
              <SelectTrigger className="h-10 rounded-md"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="public">Public</SelectItem>
                <SelectItem value="private">Private</SelectItem>
              </SelectContent>
            </Select>
            <label className="inline-flex h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground">
              <Upload className="size-4" />
              {uploadMutation.isPending ? "Uploading" : "Upload"}
              <input className="sr-only" type="file" accept={accept} onChange={(event) => Array.from(event.target.files ?? []).forEach((file) => uploadMutation.mutate(file))} />
            </label>
          </div>
          {folders.length ? (
            <div className="flex flex-wrap gap-2">
              {folders.map((item) => (
                <Button key={item} className="h-7 rounded-md" variant="outline" onClick={() => setActiveFolder(item)} type="button">{item}</Button>
              ))}
            </div>
          ) : null}
          <div className="max-h-[58vh] overflow-auto pr-1">
            {assetsQuery.isLoading ? (
              <div className="grid min-h-64 place-items-center rounded-md border border-dashed text-sm text-muted-foreground">Loading media...</div>
            ) : assets.length ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {assets.map((asset) => (
                  <button
                    key={asset.uuid}
                    className={cn("overflow-hidden rounded-md border bg-card text-left shadow-sm transition hover:border-primary/50", selected?.uuid === asset.uuid ? "border-primary ring-2 ring-primary/15" : "border-border/70")}
                    onClick={() => setSelected(asset)}
                    onDoubleClick={() => choose(asset)}
                    type="button"
                  >
                    <PickerPreview asset={asset} session={session} />
                    <div className="space-y-2 p-3">
                      <div className="truncate text-sm font-semibold">{asset.original_name}</div>
                      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                        <span className="truncate">{asset.folder}</span>
                        <Badge className="h-5 rounded-sm" variant="outline">{asset.visibility}</Badge>
                      </div>
                      <Button className="h-8 w-full rounded-md" variant={selected?.uuid === asset.uuid ? "default" : "outline"} onClick={(event) => { event.stopPropagation(); choose(asset) }} type="button">
                        <Check className="size-4" />
                        Select
                      </Button>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="grid min-h-64 place-items-center rounded-md border border-dashed text-sm text-muted-foreground">No media found.</div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function PickerPreview({ asset, session }: { asset: MediaAsset; session: AuthSession }) {
  const [url, setUrl] = useState("")
  useEffect(() => {
    let active = true
    let objectUrl = ""
    if (!asset.mime_type.startsWith("image/")) return
    void mediaContentBlobUrl(session, asset).then((blobUrl) => {
      objectUrl = blobUrl
      if (active) setUrl(blobUrl)
    })
    return () => {
      active = false
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [asset, session])
  return (
    <div className="grid aspect-[4/3] place-items-center bg-muted/40">
      {url ? <img src={url} alt={asset.alt_text || asset.original_name} className="h-full w-full object-cover" /> : asset.mime_type.startsWith("image/") ? <Image className="size-9 text-muted-foreground" /> : <File className="size-9 text-muted-foreground" />}
    </div>
  )
}
