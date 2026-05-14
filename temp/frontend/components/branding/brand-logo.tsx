import Link from "next/link";
import { cn } from "@cxnext/ui";

export function BrandLogo({
  className,
  href,
  imageClassName,
  priorityText,
}: {
  readonly className?: string;
  readonly href?: string;
  readonly imageClassName?: string;
  readonly priorityText?: string;
}) {
  const content = (
    <picture className={cn("inline-flex items-center", className)}>
      <source media="(prefers-color-scheme: dark)" srcSet="/storage/logo/logo-dark.svg" />
      <img
        src="/storage/logo/logo.svg"
        alt={priorityText ?? "cxnext"}
        className={cn("h-9 w-auto", imageClassName)}
      />
    </picture>
  );

  if (!href) {
    return content;
  }

  return <Link href={href}>{content}</Link>;
}
