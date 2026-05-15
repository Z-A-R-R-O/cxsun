import { BrandLogo } from "src/components/blocks/branding/brand-logo"
import { Spinner } from "src/components/ui/spinner"
import { APP_NAME } from "src/lib/branding"
import { cn } from "src/lib/utils"

export function GlobalLoader({
  className,
  label = "Loading workspace",
}: {
  className?: string
  label?: string
}) {
  return (
    <div
      className={cn(
        "grid min-h-svh place-items-center bg-background p-6 text-foreground",
        className,
      )}
    >
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="relative">
          <div className="absolute inset-0 rounded-2xl bg-primary/15 blur-xl" />
          <div className="relative flex size-16 items-center justify-center rounded-2xl border bg-card shadow-sm">
            <BrandLogo className="size-10" />
          </div>
        </div>
        <div className="space-y-1">
          <p className="text-sm font-semibold">{APP_NAME}</p>
          <p className="text-sm text-muted-foreground">{label}</p>
        </div>
        <Spinner className="size-5 text-primary" />
      </div>
    </div>
  )
}
