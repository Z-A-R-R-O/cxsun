"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import {
  Copy,
  Download,
  FolderKanban,
  Globe,
  ImagePlus,
  LockKeyhole,
  RefreshCcw,
  Trash2,
} from "lucide-react";
import {
  AnimatedTabs,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CommonListPageFrame,
} from "@cxnext/ui";
import { readStoredApplicationContext } from "../../../auth/infrastructure/session-storage";
import { authFetch } from "../../../auth/infrastructure/auth-api";
import {
  deleteMedia,
  listMedia,
  privateMediaUrl,
  uploadMedia,
  type MediaItemRecord,
  type MediaVisibility,
} from "../../infrastructure/media-manager-api";

const logoAssetRows = [
  { label: "App Logo", value: "/storage/logo/logo.svg" },
  { label: "Dark Logo", value: "/storage/logo/logo-dark.svg" },
  { label: "Favicon", value: "/storage/logo/favicon.svg" },
] as const;

export function MediaManagerPage() {
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState("Active company");
  const [selectedVisibility, setSelectedVisibility] = useState<MediaVisibility>("public");
  const [folder, setFolder] = useState("logo");
  const [items, setItems] = useState<readonly MediaItemRecord[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  useEffect(() => {
    const context = readStoredApplicationContext();
    setCompanyId(context?.company.id ?? null);
    setCompanyName(context?.company.name ?? "Active company");
  }, []);

  useEffect(() => {
    if (!companyId) {
      setItems([]);
      return;
    }

    const controller = new AbortController();
    void loadMediaItems({
      companyId,
      folder,
      signal: controller.signal,
      visibility: selectedVisibility,
    }).then(setItems);
    return () => controller.abort();
  }, [companyId, folder, selectedVisibility]);

  const filteredItems = useMemo(
    () => items.filter((item) => item.visibility === selectedVisibility),
    [items, selectedVisibility],
  );

  async function refresh() {
    if (!companyId) return;
    setIsBusy(true);
    try {
      setItems(await loadMediaItems({ companyId, folder, visibility: selectedVisibility }));
    } finally {
      setIsBusy(false);
    }
  }

  async function handleUpload() {
    if (!companyId || !selectedFile) return;
    setIsBusy(true);
    try {
      const uploaded = await uploadMedia({
        companyId,
        file: selectedFile,
        folder,
        visibility: selectedVisibility,
      });
      setItems((current) => [uploaded, ...current.filter((item) => item.path !== uploaded.path)]);
      setSelectedFile(null);
      toast.success("Media uploaded", {
        description: `${uploaded.fileName} is ready in ${selectedVisibility} storage.`,
      });
    } catch (error) {
      toast.error("Could not upload media", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setIsBusy(false);
    }
  }

  async function handleDelete(item: MediaItemRecord) {
    if (!companyId) return;
    setIsBusy(true);
    try {
      await deleteMedia({ companyId, path: item.path, visibility: item.visibility });
      setItems((current) => current.filter((currentItem) => currentItem.path !== item.path));
      toast.success("Media deleted", { description: `${item.fileName} was removed.` });
    } catch (error) {
      toast.error("Could not delete media", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setIsBusy(false);
    }
  }

  async function copyValue(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      toast.success("Copied", { description: value });
    } catch {
      toast.error("Could not copy the value.");
    }
  }

  async function openPrivateItem(item: MediaItemRecord) {
    if (!item.downloadPath) return;
    try {
      const response = await authFetch(privateMediaUrl(item.downloadPath));
      if (!response.ok) {
        throw new Error(`Download failed with status ${response.status}.`);
      }
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      window.open(objectUrl, "_blank", "noopener,noreferrer");
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 10_000);
    } catch (error) {
      toast.error("Could not open private media", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    }
  }

  return (
    <CommonListPageFrame
      action={
        <Button className="rounded-xl" disabled={!companyId || isBusy} onClick={() => void refresh()}>
          <RefreshCcw className="size-4" />
          Refresh
        </Button>
      }
      description={`Manage public and private storage assets for ${companyName}. Public uploads become available under /storage.`}
      technicalName="page.settings.media"
      title="Media Manager"
    >
      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="rounded-md border-border/70">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Storage</CardTitle>
            <CardDescription>
              Upload files into public or private folders. Public files are web-addressable. Private files stay behind authenticated download requests.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <AnimatedTabs
              tabs={[
                {
                  value: "public",
                  label: "Public",
                  content: (
                    <StorageTabIntro
                      description="Served through the frontend storage link."
                      icon={<Globe className="size-4" />}
                      title="/storage"
                    />
                  ),
                },
                {
                  value: "private",
                  label: "Private",
                  content: (
                    <StorageTabIntro
                      description="Accessible only through authenticated download."
                      icon={<LockKeyhole className="size-4" />}
                      title="/media/file"
                    />
                  ),
                },
              ]}
              value={selectedVisibility}
              onValueChange={(value) => setSelectedVisibility(value as MediaVisibility)}
            />

            <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
              <label className="grid gap-2">
                <span className="text-sm font-medium text-foreground">Folder</span>
                <input
                  className="h-11 rounded-md border border-input bg-background px-3 text-sm outline-none transition-colors focus:border-foreground/40"
                  value={folder}
                  onChange={(event) => setFolder(event.target.value)}
                />
              </label>
              <label className="grid gap-2">
                <span className="text-sm font-medium text-foreground">File</span>
                <input
                  className="h-11 rounded-md border border-input bg-background px-3 py-2 text-sm"
                  type="file"
                  onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
                />
              </label>
              <div className="flex items-end">
                <Button
                  className="h-11 rounded-xl"
                  disabled={!companyId || !selectedFile || isBusy}
                  onClick={() => void handleUpload()}
                >
                  <ImagePlus className="size-4" />
                  Upload
                </Button>
              </div>
            </div>

            <div className="grid gap-3">
              {filteredItems.length === 0 ? (
                <div className="rounded-md border border-dashed border-border/70 bg-muted/15 px-4 py-6 text-sm text-muted-foreground">
                  No files found in this folder yet.
                </div>
              ) : (
                filteredItems.map((item) => (
                  <div
                    key={`${item.visibility}:${item.path}`}
                    className="grid gap-3 rounded-md border border-border/70 bg-card px-4 py-3 shadow-sm md:grid-cols-[1fr_auto]"
                  >
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium text-foreground">{item.fileName}</p>
                        <span className="rounded-md bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                          {formatSize(item.size)}
                        </span>
                        <span className="rounded-md bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                          {item.folder || "root"}
                        </span>
                      </div>
                      <p className="truncate text-sm text-muted-foreground">{item.path}</p>
                      <p className="text-xs text-muted-foreground">
                        Updated {formatDateTime(item.updatedAt)}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      {item.publicUrl ? (
                        <>
                          <Button
                            variant="outline"
                            className="rounded-xl"
                            onClick={() => window.open(item.publicUrl, "_blank", "noopener,noreferrer")}
                          >
                            <Download className="size-4" />
                            Open
                          </Button>
                          <Button
                            variant="outline"
                            className="rounded-xl"
                            onClick={() => void copyValue(item.publicUrl ?? "")}
                          >
                            <Copy className="size-4" />
                            Copy URL
                          </Button>
                        </>
                      ) : (
                        <Button
                          variant="outline"
                          className="rounded-xl"
                          onClick={() => void openPrivateItem(item)}
                        >
                          <Download className="size-4" />
                          Open
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        className="rounded-xl text-destructive hover:text-destructive"
                        onClick={() => void handleDelete(item)}
                      >
                        <Trash2 className="size-4" />
                        Delete
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4">
          <Card className="rounded-md border-border/70">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Brand Assets</CardTitle>
              <CardDescription>
                These default assets are wired into the app shell, public pages, and invoice fallback.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              {logoAssetRows.map((row) => (
                <div
                  key={row.label}
                  className="flex items-center justify-between gap-3 rounded-md border border-border/70 bg-card px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-foreground">{row.label}</p>
                    <p className="truncate text-sm text-muted-foreground">{row.value}</p>
                  </div>
                  <Button variant="outline" className="rounded-xl" onClick={() => void copyValue(row.value)}>
                    <Copy className="size-4" />
                    Copy
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="rounded-md border-border/70">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Company Logo URLs</CardTitle>
              <CardDescription>
                Use these public paths inside Company logos for logo, logo-dark, favicon, or letter-head variants.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm text-muted-foreground">
              <div className="rounded-md border border-border/70 bg-muted/15 px-4 py-3">
                <div className="flex items-center gap-2 font-medium text-foreground">
                  <FolderKanban className="size-4" />
                  Suggested folder
                </div>
                <p className="mt-1">Use `logo` for shared brand assets and company-specific folders for custom uploads.</p>
              </div>
              <div className="rounded-md border border-border/70 bg-muted/15 px-4 py-3">
                App branding uses `/storage/logo/logo.svg`, `/storage/logo/logo-dark.svg`, and `/storage/logo/favicon.svg`.
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </CommonListPageFrame>
  );
}

function StorageTabIntro({
  description,
  icon,
  title,
}: {
  readonly description: string;
  readonly icon: ReactNode;
  readonly title: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-md border border-border/70 bg-muted/15 px-4 py-3 text-sm">
      <span className="flex size-9 items-center justify-center rounded-md bg-background text-foreground">
        {icon}
      </span>
      <div>
        <p className="font-medium text-foreground">{title}</p>
        <p className="text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

async function loadMediaItems(params: {
  readonly companyId: string;
  readonly folder: string;
  readonly signal?: AbortSignal;
  readonly visibility: MediaVisibility;
}) {
  try {
    return await listMedia(params);
  } catch (error) {
    toast.error("Could not load media", {
      description: error instanceof Error ? error.message : "Please try again.",
    });
    return [];
  }
}

function formatSize(bytes: number) {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} B`;
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}
