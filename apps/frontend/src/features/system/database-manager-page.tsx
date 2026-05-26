import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { ArchiveRestore, Database, DownloadCloud, RefreshCw, ShieldCheck } from "lucide-react"
import { toast } from "sonner"

import { Alert, AlertDescription, AlertTitle } from "src/components/ui/alert"
import { Badge } from "src/components/ui/badge"
import { Button } from "src/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "src/components/ui/card"
import { Spinner } from "src/components/ui/spinner"
import type { AuthSession } from "src/features/auth/auth-client"
import { getDatabaseOverview, startDatabaseBackup, startDatabaseRestore, type DatabaseBackup } from "./system-manager-client"

export default function DatabaseManagerPage({ session }: { session: AuthSession }) {
  const queryClient = useQueryClient()
  const [selectedBackup, setSelectedBackup] = useState<string>("latest")
  const overviewQuery = useQuery({ queryKey: ["database-manager-overview"], queryFn: () => getDatabaseOverview(session) })
  const backupMutation = useMutation({
    mutationFn: () => startDatabaseBackup(session),
    onSuccess: async () => {
      toast.success("Database backup started", { description: "Master and tenant databases will be dumped into storage/backups/database." })
      await queryClient.invalidateQueries({ queryKey: ["database-manager-overview"] })
    },
  })
  const restoreMutation = useMutation({
    mutationFn: (backupId: string) => startDatabaseRestore(session, backupId),
    onSuccess: () => toast.success("Database restore started", { description: "The selected backup is being restored in the background." }),
  })
  const overview = overviewQuery.data

  function restoreBackup(backup: DatabaseBackup) {
    const confirmed = window.confirm(`Restore database backup ${backup.id}? This can replace current database rows. Continue only after verifying this backup.`)
    if (!confirmed) return
    setSelectedBackup(backup.id)
    void restoreMutation.mutateAsync(backup.id)
  }

  return (
    <div className="flex flex-col gap-4 px-4 py-4 md:gap-6 md:px-6 md:py-6">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Database Manager</h1>
          <p className="text-sm text-muted-foreground">Review master and tenant database targets, create backups, and restore from known backup points.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={() => void queryClient.invalidateQueries({ queryKey: ["database-manager-overview"] })}>
            <RefreshCw className="size-4" />
            Refresh
          </Button>
          <Button type="button" onClick={() => void backupMutation.mutateAsync()} disabled={backupMutation.isPending}>
            {backupMutation.isPending ? <Spinner className="size-4" /> : <DownloadCloud className="size-4" />}
            Backup now
          </Button>
        </div>
      </div>

      <Alert>
        <ShieldCheck className="size-4" />
        <AlertTitle>Update protection</AlertTitle>
        <AlertDescription>System update and update.sh run a backup before migrations or rebuild steps. Restore is available here for controlled recovery.</AlertDescription>
      </Alert>

      {overviewQuery.isLoading ? (
        <div className="flex min-h-64 items-center justify-center gap-2 text-sm text-muted-foreground">
          <Spinner className="size-4" />
          Loading database manager
        </div>
      ) : overview ? (
        <>
          <div className="grid gap-3 md:grid-cols-3">
            <InfoCard label="Master database" value={overview.master.database} detail={`${overview.master.user}@${overview.master.host}:${overview.master.port}`} />
            <InfoCard label="Tenant databases" value={String(overview.tenants.length)} detail="Active and inactive tenant targets from master" />
            <InfoCard label="Backups" value={String(overview.backups.length)} detail={overview.lastOperation ? `Last: ${overview.lastOperation.type}` : "No active operation recorded"} />
          </div>

          <Card className="rounded-md">
            <CardHeader>
              <CardTitle>Tenant database targets</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead className="border-b bg-muted/40 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 text-left">Tenant</th>
                    <th className="px-3 py-2 text-left">Status</th>
                    <th className="px-3 py-2 text-left">Database</th>
                    <th className="px-3 py-2 text-left">Host</th>
                    <th className="px-3 py-2 text-left">User</th>
                  </tr>
                </thead>
                <tbody>
                  {overview.tenants.map((tenant) => (
                    <tr key={tenant.slug} className="border-b">
                      <td className="px-3 py-2 font-medium">{tenant.name}<span className="ml-2 font-mono text-xs text-muted-foreground">{tenant.slug}</span></td>
                      <td className="px-3 py-2"><Badge variant="outline">{tenant.status}</Badge></td>
                      <td className="px-3 py-2 font-mono">{tenant.db_name}</td>
                      <td className="px-3 py-2">{tenant.db_host}:{tenant.db_port}</td>
                      <td className="px-3 py-2">{tenant.db_user}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>

          <Card className="rounded-md">
            <CardHeader>
              <CardTitle>Backups</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              {overview.backups.map((backup) => (
                <div key={backup.id} className="flex flex-col gap-3 rounded-md border p-4 md:flex-row md:items-center md:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Database className="size-4 text-muted-foreground" />
                      <p className="font-mono text-sm font-semibold">{backup.id}</p>
                      <Badge variant="outline">{backup.databaseCount} DBs</Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{formatDate(backup.createdAt)}</p>
                    <p className="mt-1 truncate font-mono text-xs text-muted-foreground">{backup.path}</p>
                  </div>
                  <Button type="button" variant="outline" onClick={() => restoreBackup(backup)} disabled={restoreMutation.isPending && selectedBackup === backup.id}>
                    {restoreMutation.isPending && selectedBackup === backup.id ? <Spinner className="size-4" /> : <ArchiveRestore className="size-4" />}
                    Restore
                  </Button>
                </div>
              ))}
              {!overview.backups.length ? (
                <div className="grid min-h-32 place-items-center rounded-md border border-dashed text-sm text-muted-foreground">
                  No backups found
                </div>
              ) : null}
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  )
}

function InfoCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <Card className="rounded-md">
      <CardContent className="p-4">
        <p className="text-xs font-medium uppercase text-muted-foreground">{label}</p>
        <p className="mt-2 break-all text-2xl font-semibold">{value}</p>
        <p className="mt-1 text-sm text-muted-foreground">{detail}</p>
      </CardContent>
    </Card>
  )
}

function formatDate(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString()
}
