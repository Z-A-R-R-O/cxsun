import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"
import { CircleCheckIcon, InfoIcon, TriangleAlertIcon, OctagonXIcon, Loader2Icon } from "lucide-react"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      closeButton
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      icons={{
        success: (
          <CircleCheckIcon className="size-5 text-emerald-700" strokeWidth={2.5} />
        ),
        info: (
          <InfoIcon className="size-5 text-sky-700" strokeWidth={2.5} />
        ),
        warning: (
          <TriangleAlertIcon className="size-5 text-amber-700" strokeWidth={2.5} />
        ),
        error: (
          <OctagonXIcon className="size-5 text-rose-700" strokeWidth={2.5} />
        ),
        loading: (
          <Loader2Icon className="size-4 animate-spin" />
        ),
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: "cn-toast",
          success: "border-2! border-emerald-300! bg-emerald-100! text-emerald-950! shadow-lg! shadow-emerald-900/10!",
          error: "border-2! border-rose-300! bg-rose-100! text-rose-950! shadow-lg! shadow-rose-900/10!",
          warning: "border-2! border-amber-300! bg-amber-100! text-amber-950! shadow-lg! shadow-amber-900/10!",
          info: "border-2! border-sky-300! bg-sky-100! text-sky-950! shadow-lg! shadow-sky-900/10!",
          closeButton: "border-current! bg-background/80! text-current! hover:bg-background!",
          description: "text-current/75!",
          icon: "text-current!",
          title: "font-semibold text-current!",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
