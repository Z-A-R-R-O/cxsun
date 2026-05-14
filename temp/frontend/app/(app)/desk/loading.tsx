import { LoaderCircle } from "lucide-react";

export default function DeskLoading() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="flex items-center gap-3 rounded-2xl border border-border/70 bg-background/95 px-4 py-3 text-sm text-muted-foreground shadow-lg shadow-black/5">
        <LoaderCircle className="size-4 animate-spin text-foreground" />
        <span>Loading dashboard...</span>
      </div>
    </div>
  );
}
