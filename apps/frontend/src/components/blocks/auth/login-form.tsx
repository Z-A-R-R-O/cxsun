import { useState, type FormEvent } from "react"
import { toast } from "sonner"
import { Building2, Crown, Headphones, Loader2 } from "lucide-react"
import { cn } from "src/lib/utils"
import { Button } from "src/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "src/components/ui/field"
import { Input } from "src/components/ui/input"
import { BrandLogo } from "src/components/blocks/branding/brand-logo"
import { APP_NAME } from "src/lib/branding"
import { login, type AuthSession, type AuthSurface } from "src/features/auth/auth-client"

export function LoginForm({
  className,
  onAuthenticated,
  onForgotPassword,
  surface = "tenant",
  subtitle,
  ...props
}: React.ComponentProps<"div"> & {
  onAuthenticated?: (session: AuthSession) => void
  onForgotPassword?: () => void
  surface?: AuthSurface
  subtitle?: string
}) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const isTenantSurface = surface === "tenant"

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSubmitting(true)
    setMessage(null)

    const formData = new FormData(event.currentTarget)

    try {
      const session = await login({
        corporateId: isTenantSurface ? String(formData.get("corporateId") ?? "") : undefined,
        email: String(formData.get("email") ?? ""),
        password: String(formData.get("password") ?? ""),
      }, surface)
      toast.success("Login successful", {
        description: `${session.user.name} is connected to ${session.selectedTenant.name}.`,
      })
      onAuthenticated?.(session)
    } catch (error) {
      const nextMessage = error instanceof Error ? error.message : "Login failed."
      setMessage(nextMessage)
      toast.error("Login failed", { description: nextMessage })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div
      className={cn(
        "mx-auto flex w-full max-w-[520px] flex-col items-center gap-5",
        className,
      )}
      {...props}
    >
      <div className="flex flex-col items-center gap-2 text-center">
        <SurfaceMark surface={surface} />
        <div>
          <p className="text-lg font-semibold leading-6">{APP_NAME}</p>
          {isTenantSurface || !subtitle ? null : (
            <p className="text-sm text-muted-foreground">
              {subtitle ?? "Admin access"}
            </p>
          )}
        </div>
      </div>

      <div className={cn("w-full rounded-xl border-2 bg-background p-1 shadow-[0_22px_42px_-28px_rgba(15,23,42,0.75)]", surfaceChrome[surface])}>
        <div className="rounded-xl border border-border/80 bg-card px-6 py-6 sm:px-8 sm:py-7">
          <div className="border-b border-border/80 pb-5">
            <h1 className="text-xl font-semibold tracking-tight">Welcome</h1>
            <p className="mt-1.5 text-sm leading-6 text-muted-foreground">
              {isTenantSurface
                ? "Access your workspace with your registered credentials."
                : "Use your admin email and password for this desk."}
            </p>
          </div>

          <form className="pt-6" onSubmit={submit}>
            <FieldGroup className="gap-5">
              {isTenantSurface ? (
                <Field>
                  <FieldLabel className="font-semibold" htmlFor="corporateId">Corporate ID or mobile number</FieldLabel>
                  <Input
                    autoComplete="organization"
                    className="h-11 rounded-md border-border/85 bg-background text-base shadow-inner shadow-black/[0.03] focus-visible:ring-2"
                    id="corporateId"
                    name="corporateId"
                    placeholder=""
                    type="text"
                    required
                  />
                </Field>
              ) : null}
              <Field>
                <div className="flex items-center justify-between gap-3">
                  <FieldLabel className="font-semibold" htmlFor="email">Email</FieldLabel>
                </div>
                <Input
                  autoComplete="email"
                  className="h-11 rounded-md border-border/85 bg-background text-base shadow-inner shadow-black/[0.03] focus-visible:ring-2"
                  id="email"
                  name="email"
                  type="text"
                  required
                />
              </Field>
              <Field>
                <div className="flex items-center justify-between gap-3">
                  <FieldLabel className="font-semibold" htmlFor="password">Password</FieldLabel>
                  {onForgotPassword ? (
                    <button
                      className="cursor-pointer text-xs font-semibold text-primary underline-offset-4 hover:underline"
                      onClick={onForgotPassword}
                      type="button"
                    >
                      Forgot password?
                    </button>
                  ) : null}
                </div>
                <Input
                  autoComplete="current-password"
                  className="h-11 rounded-md border-border/85 bg-background text-base shadow-inner shadow-black/[0.03] focus-visible:ring-2"
                  id="password"
                  name="password"
                  type="password"
                  required
                />
              </Field>
              <Field className="gap-3 pt-1">
                <Button
                  className="h-11 w-full rounded-md text-sm font-semibold shadow-[0_10px_18px_-12px_rgba(37,99,235,0.85)] transition-[background,box-shadow,transform] hover:-translate-y-0.5 hover:bg-primary/90 hover:shadow-[0_14px_24px_-14px_rgba(37,99,235,0.95)]"
                  disabled={isSubmitting}
                  type="submit"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Logging in
                    </>
                  ) : (
                    "Login"
                  )}
                </Button>
                {message ? (
                  <FieldDescription className="text-center text-destructive">
                    {message}
                  </FieldDescription>
                ) : null}
              </Field>
            </FieldGroup>
          </form>
        </div>
      </div>
    </div>
  )
}

const surfaceChrome: Record<AuthSurface, string> = {
  tenant: "border-emerald-200/80",
  admin: "border-sky-200/90",
  "super-admin": "border-amber-200/90",
}

function SurfaceMark({ surface }: { surface: AuthSurface }) {
  const Icon = surface === "super-admin" ? Crown : surface === "admin" ? Headphones : Building2
  const tone =
    surface === "super-admin"
      ? "border-amber-200 bg-amber-50 text-amber-700"
      : surface === "admin"
        ? "border-sky-200 bg-sky-50 text-sky-700"
        : "border-emerald-200 bg-emerald-50 text-emerald-700"

  return (
    <div className="relative">
      <BrandLogo className="size-14" />
      <span className={cn("absolute -bottom-1 -right-2 grid size-7 place-items-center rounded-full border", tone)}>
        <Icon className="size-3.5" />
      </span>
    </div>
  )
}
