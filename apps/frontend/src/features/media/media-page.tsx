import { useEffect, useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { Copy, Download, Eye, File, Image, Link2, Search, Share2, Trash2, Upload } from "lucide-react"

import { Button } from "src/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "src/components/ui/card"
import { Input } from "src/components/ui/input"
import { Label } from "src/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "src/components/ui/select"
import { Badge } from "src/components/ui/badge"
import { MasterListPageFrame } from "src/components/blocks/lists/master-list"
import type { AuthSession } from "src/features/auth/auth-client"
import { cn } from "src/lib/utils"
import {
  deleteMediaAsset,
  fileToBase64,
  linkMediaAsset,
  listMediaAssets,
  mediaContentBlobUrl,
  shareMediaAsset,
  uploadMediaAsset,
  type MediaAsset,
  type MediaVisibility,
} from "./media-client"

type ViewMode = "grid" | "list"

export function MediaManagerPage({ session }: { session: AuthSession }) {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState("")
  const [folder, setFolder] = useState("")
  const [visibility, setVisibility] = useState("all")
  const [viewMode, setViewMode] = useState<ViewMode>("grid")
  const [selected, setSelected] = useState<MediaAsset | null>(null)
  const queryKey = ["media-assets", session.selectedTenant.slug, search, folder, visibility]
  const assetsQuery = useQuery({ queryKey, queryFn: () => listMediaAssets(session, { folder, search, visibility }) })
  const assets = assetsQuery.data ?? []
  const folders = useMemo(() => Array.from(new Set(assets.map((asset) => asset.folder))).sort(), [assets])
  const uploadMutation = useMutation({
    mutationFn: async ({ file, input }: { file: File; input: { folder: string; visibility: MediaVisibility } }) => {
      const base64 = await fileToBase64(file)
      return uploadMediaAsset(session, { base64, fileName: file.name, folder: input.folder, mimeType: file.type || "application/octet-stream", visibility: input.visibility })
    },
    onSuccess: (asset) => {
      toast.success("Media uploaded", { description: asset.original_name })
      void queryClient.invalidateQueries({ queryKey: ["media-assets", session.selectedTenant.slug] })
      setSelected(asset)
    },
  })
  const deleteMutation = useMutation({
    mutationFn: (asset: MediaAsset) => deleteMediaAsset(session, asset),
    onSuccess: () => {
      toast.success("Media deleted")
      setSelected(null)
      void queryClient.invalidateQueries({ queryKey: ["media-assets", session.selectedTenant.slug] })
    },
  })
  const shareMutation = useMutation({
    mutationFn: (asset: MediaAsset) => shareMediaAsset(session, asset),
    onSuccess: (asset) => {
      toast.success("Share link created")
      setSelected(asset)
      void queryClient.invalidateQueries({ queryKey: ["media-assets", session.selectedTenant.slug] })
    },
  })
  const linkMutation = useMutation({
    mutationFn: ({ asset, linkedModule, linkedRecordId, purpose }: { asset: MediaAsset; linkedModule: string; linkedRecordId: string; purpose: string }) =>
      linkMediaAsset(session, asset, { linkedModule, linkedRecordId, purpose }),
    onSuccess: (asset) => {
      toast.success("Media linked")
      setSelected(asset)
      void queryClient.invalidateQueries({ queryKey: ["media-assets", session.selectedTenant.slug] })
    },
  })

  return (
    <MasterListPageFrame
      action={<UploadPanel isUploading={uploadMutation.isPending} onUpload={(file, input) => uploadMutation.mutate({ file, input })} />}
      description="Upload, browse, link, share, and manage tenant media across public and private storage."
      technicalName="page.media.manager"
      title="Media Manager"
    >
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-4">
          <Card className="rounded-md border-border/70 bg-card/95 py-0 shadow-sm">
            <CardContent className="grid gap-3 p-3 lg:grid-cols-[minmax(0,1fr)_180px_150px_auto] lg:items-center">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input className="h-9 rounded-md bg-background pl-9" placeholder="Search media" value={search} onChange={(event) => setSearch(event.target.value)} />
              </div>
              <Input className="h-9 rounded-md bg-background" placeholder="Folder" value={folder} onChange={(event) => setFolder(event.target.value)} />
              <Select value={visibility} onValueChange={setVisibility}>
                <SelectTrigger className="h-9 rounded-md bg-background"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="public">Public</SelectItem>
                  <SelectItem value="private">Private</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex gap-2">
                <Button className="h-9 rounded-md" variant={viewMode === "grid" ? "default" : "outline"} onClick={() => setViewMode("grid")} type="button">Grid</Button>
                <Button className="h-9 rounded-md" variant={viewMode === "list" ? "default" : "outline"} onClick={() => setViewMode("list")} type="button">List</Button>
              </div>
            </CardContent>
          </Card>
          {folders.length ? <div className="flex flex-wrap gap-2">{folders.map((item) => <Button key={item} className="h-7 rounded-md" variant="outline" onClick={() => setFolder(item)} type="button">{item}</Button>)}</div> : null}
          {viewMode === "grid" ? <MediaGrid assets={assets} selected={selected} session={session} onSelect={setSelected} /> : <MediaList assets={assets} selected={selected} onSelect={setSelected} />}
        </div>
        <MediaInspector
          asset={selected}
          isDeleting={deleteMutation.isPending}
          isLinking={linkMutation.isPending}
          isSharing={shareMutation.isPending}
          onDelete={(asset) => deleteMutation.mutate(asset)}
          onLink={(asset, linkedModule, linkedRecordId, purpose) => linkMutation.mutate({ asset, linkedModule, linkedRecordId, purpose })}
          onShare={(asset) => shareMutation.mutate(asset)}
        />
      </div>
    </MasterListPageFrame>
  )
}

function UploadPanel({ isUploading, onUpload }: { isUploading: boolean; onUpload(file: File, input: { folder: string; visibility: MediaVisibility }): void }) {
  const [folder, setFolder] = useState("library")
  const [visibility, setVisibility] = useState<MediaVisibility>("private")
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Input className="h-9 w-36 rounded-md bg-background" value={folder} onChange={(event) => setFolder(event.target.value)} />
      <Select value={visibility} onValueChange={(value) => setVisibility(value as MediaVisibility)}>
        <SelectTrigger className="h-9 w-32 rounded-md bg-background"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="private">Private</SelectItem>
          <SelectItem value="public">Public</SelectItem>
        </SelectContent>
      </Select>
      <label className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground">
        <Upload className="size-4" />
        {isUploading ? "Uploading" : "Upload"}
        <input className="sr-only" multiple type="file" onChange={(event) => Array.from(event.target.files ?? []).forEach((file) => onUpload(file, { folder, visibility }))} />
      </label>
    </div>
  )
}

function MediaGrid({ assets, onSelect, selected, session }: { assets: MediaAsset[]; onSelect(asset: MediaAsset): void; selected: MediaAsset | null; session: AuthSession }) {
  if (!assets.length) return <EmptyMedia />
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
      {assets.map((asset) => (
        <button key={asset.uuid} className={cn("overflow-hidden rounded-md border bg-card text-left shadow-sm transition hover:border-primary/50", selected?.uuid === asset.uuid ? "border-primary" : "border-border/70")} onClick={() => onSelect(asset)} type="button">
          <MediaPreview asset={asset} session={session} />
          <div className="space-y-1 p-3">
            <div className="truncate text-sm font-semibold">{asset.original_name}</div>
            <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
              <span>{asset.folder}</span>
              <Badge className="h-5 rounded-sm" variant="outline">{asset.visibility}</Badge>
            </div>
          </div>
        </button>
      ))}
    </div>
  )
}

function MediaList({ assets, onSelect, selected }: { assets: MediaAsset[]; onSelect(asset: MediaAsset): void; selected: MediaAsset | null }) {
  if (!assets.length) return <EmptyMedia />
  return (
    <Card className="overflow-hidden rounded-md border-border/70 py-0 shadow-sm">
      <table className="w-full text-sm">
        <tbody>
          {assets.map((asset) => (
            <tr key={asset.uuid} className={cn("cursor-pointer border-b last:border-b-0 hover:bg-muted/40", selected?.uuid === asset.uuid ? "bg-muted/60" : "")} onClick={() => onSelect(asset)}>
              <td className="px-4 py-3 font-semibold">{asset.original_name}</td>
              <td className="px-4 py-3 text-muted-foreground">{asset.folder}</td>
              <td className="px-4 py-3">{formatBytes(asset.size_bytes)}</td>
              <td className="px-4 py-3"><Badge variant="outline">{asset.visibility}</Badge></td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  )
}

function MediaPreview({ asset, session }: { asset: MediaAsset; session: AuthSession }) {
  const [url, setUrl] = useState("")
  useEffect(() => {
    let active = true
    if (!asset.mime_type.startsWith("image/")) return
    void mediaContentBlobUrl(session, asset).then((blobUrl) => {
      if (active) setUrl(blobUrl)
    })
    return () => {
      active = false
      if (url) URL.revokeObjectURL(url)
    }
  }, [asset, session])
  return (
    <div className="grid aspect-[4/3] place-items-center bg-muted/40">
      {url ? <img src={url} alt={asset.alt_text || asset.original_name} className="h-full w-full object-cover" /> : asset.mime_type.startsWith("image/") ? <Image className="size-9 text-muted-foreground" /> : <File className="size-9 text-muted-foreground" />}
    </div>
  )
}

function MediaInspector({ asset, isDeleting, isLinking, isSharing, onDelete, onLink, onShare }: {
  asset: MediaAsset | null
  isDeleting: boolean
  isLinking: boolean
  isSharing: boolean
  onDelete(asset: MediaAsset): void
  onLink(asset: MediaAsset, linkedModule: string, linkedRecordId: string, purpose: string): void
  onShare(asset: MediaAsset): void
}) {
  const [linkedModule, setLinkedModule] = useState("sales")
  const [linkedRecordId, setLinkedRecordId] = useState("")
  const [purpose, setPurpose] = useState("attachment")
  if (!asset) {
    return <Card className="rounded-md border-border/70 py-0 shadow-sm"><CardContent className="p-5 text-sm text-muted-foreground">Select a file to view details, copy links, share, or attach it to another record.</CardContent></Card>
  }
  return (
    <Card className="rounded-md border-border/70 py-0 shadow-sm">
      <CardHeader className="border-b px-4 py-3"><CardTitle className="text-base">{asset.original_name}</CardTitle></CardHeader>
      <CardContent className="space-y-4 p-4 text-sm">
        <div className="grid grid-cols-2 gap-2">
          <Detail label="Type" value={asset.mime_type} />
          <Detail label="Size" value={formatBytes(asset.size_bytes)} />
          <Detail label="Folder" value={asset.folder} />
          <Detail label="Visibility" value={asset.visibility} />
        </div>
        <div className="grid gap-2">
          <Button className="justify-start rounded-md" variant="outline" onClick={() => copyText(asset.public_url || `/api/v1/media/${asset.uuid}/content`)} type="button"><Copy className="size-4" />Copy link</Button>
          <Button className="justify-start rounded-md" variant="outline" onClick={() => onShare(asset)} disabled={isSharing} type="button"><Share2 className="size-4" />Create share link</Button>
          <Button className="justify-start rounded-md" variant="outline" onClick={() => window.open(`/api/v1/media/${asset.uuid}/content`, "_blank")} type="button"><Eye className="size-4" />Open</Button>
          <Button className="justify-start rounded-md" variant="outline" onClick={() => copyText(asset.uuid)} type="button"><Download className="size-4" />Copy media id</Button>
        </div>
        <div className="space-y-2 rounded-md border p-3">
          <div className="flex items-center gap-2 font-semibold"><Link2 className="size-4" />Link to record</div>
          <Input className="h-9 rounded-md" value={linkedModule} onChange={(event) => setLinkedModule(event.target.value)} placeholder="Module" />
          <Input className="h-9 rounded-md" value={linkedRecordId} onChange={(event) => setLinkedRecordId(event.target.value)} placeholder="Record id" />
          <Input className="h-9 rounded-md" value={purpose} onChange={(event) => setPurpose(event.target.value)} placeholder="Purpose" />
          <Button className="h-9 rounded-md" disabled={isLinking || !linkedRecordId.trim()} onClick={() => onLink(asset, linkedModule, linkedRecordId, purpose)} type="button">Link</Button>
        </div>
        {asset.links?.length ? (
          <div className="space-y-1">
            <Label>Links</Label>
            {asset.links.map((link) => <div key={link.uuid} className="rounded-md bg-muted/50 px-2 py-1 text-xs">{link.linked_module} / {link.linked_record_id} / {link.purpose}</div>)}
          </div>
        ) : null}
        <Button className="w-full justify-start rounded-md" variant="destructive" disabled={isDeleting} onClick={() => onDelete(asset)} type="button"><Trash2 className="size-4" />Delete</Button>
      </CardContent>
    </Card>
  )
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div className="rounded-md bg-muted/40 p-2"><div className="text-xs text-muted-foreground">{label}</div><div className="truncate font-medium">{value}</div></div>
}

function EmptyMedia() {
  return <Card className="rounded-md border-dashed py-0"><CardContent className="grid min-h-52 place-items-center p-6 text-sm text-muted-foreground">No media found.</CardContent></Card>
}

function formatBytes(value: number) {
  if (value < 1024) return `${value} B`
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`
  return `${(value / (1024 * 1024)).toFixed(1)} MB`
}

function copyText(value: string) {
  void navigator.clipboard.writeText(value)
  toast.success("Copied")
}
