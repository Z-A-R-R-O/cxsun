import { MailCheck } from "lucide-react"
import { BrandLogo } from "src/components/blocks/branding/brand-logo"
import { Button } from "src/components/ui/button"
import { Field, FieldDescription, FieldGroup, FieldLabel } from "src/components/ui/field"
import { Input } from "src/components/ui/input"
import { APP_NAME } from "src/lib/branding"
import { cn } from "src/lib/utils"

export function ForgotPasswordForm({
  className,
  onBackToLogin,
  ...props
}: React.ComponentProps<"div"> & {
  onBackToLogin?: () => void
}) {
  return (
    <div
      className={cn(
        "mx-auto flex w-full max-w-[520px] flex-col items-center gap-5",
        className,
      )}
      {...props}
    >
      <div className="flex flex-col items-center gap-2 text-center">
        <BrandLogo className="size-14" />
        <div>
          <p className="text-lg font-semibold leading-6">{APP_NAME}</p>
          <p className="text-sm text-muted-foreground">Password recovery</p>
        </div>
      </div>

      <div className="w-full rounded-xl border-2 border-border/45 bg-background p-1 shadow-[0_22px_42px_-28px_rgba(15,23,42,0.75)]">
        <div className="rounded-xl border border-border/80 bg-card px-6 py-6 sm:px-8 sm:py-7">
          <div className="border-b border-border/80 pb-5">
            <h1 className="text-xl font-semibold tracking-tight">Forgot password</h1>
            <p className="mt-1.5 text-sm leading-6 text-muted-foreground">
              Enter your email and the tenant workspace will be resolved from your account.
            </p>
          </div>

          <form className="pt-6" onSubmit={(event) => event.preventDefault()}>
            <FieldGroup className="gap-5">
              <Field>
                <FieldLabel className="font-semibold" htmlFor="recovery-email">Email</FieldLabel>
                <Input
                  autoComplete="email"
                  className="h-11 rounded-md border-border/85 bg-background text-base shadow-inner shadow-black/[0.03] focus-visible:ring-2"
                  id="recovery-email"
                  name="email"
                  type="text"
                  required
                />
                <FieldDescription>
                  Recovery delivery will be connected when mail service is enabled.
                </FieldDescription>
              </Field>
              <Field className="gap-3 pt-1">
                <Button className="h-11 w-full rounded-md text-sm font-semibold" type="submit">
                  <MailCheck className="size-4" />
                  Send reset link
                </Button>
                <Button
                  className="h-10 w-full rounded-md"
                  onClick={onBackToLogin}
                  type="button"
                  variant="outline"
                >
                  Back to login
                </Button>
              </Field>
            </FieldGroup>
          </form>
        </div>
      </div>
    </div>
  )
}
