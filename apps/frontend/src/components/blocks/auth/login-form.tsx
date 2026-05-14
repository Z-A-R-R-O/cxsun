import { useState, type FormEvent } from "react"
import { toast } from "sonner"
import { cn } from "src/lib/utils"
import { Button } from "src/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "src/components/ui/card"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "src/components/ui/field"
import { Input } from "src/components/ui/input"
import { login, type AuthSession } from "src/features/auth/auth-client"

export function LoginForm({
  className,
  onAuthenticated,
  ...props
}: React.ComponentProps<"div"> & {
  onAuthenticated?: (session: AuthSession) => void
}) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSubmitting(true)
    setMessage(null)

    const formData = new FormData(event.currentTarget)

    try {
      const session = await login({
        email: String(formData.get("email") ?? ""),
        password: String(formData.get("password") ?? ""),
        tenantCode: String(formData.get("tenantCode") ?? "") || undefined,
      })
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
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle>Login to your account</CardTitle>
          <CardDescription>
            Use your seeded platform or tenant account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input
                  autoComplete="email"
                  id="email"
                  name="email"
                  type="text"
                  placeholder="sundar@sundar.com"
                  required
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="password">Password</FieldLabel>
                <Input id="password" name="password" type="password" required />
              </Field>
              <Field>
                <FieldLabel htmlFor="tenantCode">Tenant</FieldLabel>
                <Input id="tenantCode" name="tenantCode" placeholder="tenant_1" />
                <FieldDescription>
                  Leave empty to use your first available tenant.
                </FieldDescription>
              </Field>
              <Field>
                <Button disabled={isSubmitting} type="submit">
                  {isSubmitting ? "Logging in" : "Login"}
                </Button>
                {message ? (
                  <FieldDescription className="text-destructive">
                    {message}
                  </FieldDescription>
                ) : null}
                <FieldDescription className="text-center">
                  Seeded users are available after the server starts.
                </FieldDescription>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
