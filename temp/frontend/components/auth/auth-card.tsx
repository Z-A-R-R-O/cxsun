import type { ReactNode } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@cxnext/ui";

interface AuthCardProps {
  readonly title?: string;
  readonly description?: string;
  readonly children: ReactNode;
}

export function AuthCard({ title, description, children }: AuthCardProps) {
  return (
    <Card className="relative w-full max-w-xl rounded-[18px] border-2 border-border/70 bg-background shadow-[0_10px_22px_rgba(15,23,42,0.08),0_28px_44px_rgba(15,23,42,0.06)] before:pointer-events-none before:absolute before:inset-[3px] before:rounded-[13px] before:border before:border-foreground/20 before:content-['']">
      {title || description ? (
        <CardHeader className="space-y-2 pb-4 text-center">
          {title ? (
            <CardTitle className="text-4xl font-semibold tracking-tight text-foreground">
              {title}
            </CardTitle>
          ) : null}
          {description ? (
            <CardDescription className="mx-auto max-w-lg text-sm leading-6 text-muted-foreground">
              {description}
            </CardDescription>
          ) : null}
        </CardHeader>
      ) : null}
      <CardContent className="px-6 pb-6 pt-6 sm:px-8 sm:pb-8">{children}</CardContent>
    </Card>
  );
}
