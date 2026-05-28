import logoDarkUrl from 'src/assets/logo/logo-dark.svg'
import logoUrl from 'src/assets/logo/logo.svg'

import { APP_NAME } from 'src/lib/branding'
import { cn } from 'src/lib/utils'

interface BrandLogoProps {
  className?: string
  logoDarkUrl?: string
  logoUrl?: string
  name?: string
}

export function BrandLogo({ className, logoDarkUrl: tenantLogoDarkUrl, logoUrl: tenantLogoUrl, name = APP_NAME }: BrandLogoProps) {
  return (
    <span className={cn('relative inline-flex shrink-0', className)}>
      <img
        alt={name}
        className="size-full object-contain dark:hidden"
        draggable={false}
        onError={(event) => {
          if (event.currentTarget.src !== logoUrl) event.currentTarget.src = logoUrl
        }}
        src={tenantLogoUrl || logoUrl}
      />
      <img
        alt={name}
        className="hidden size-full object-contain dark:block"
        draggable={false}
        onError={(event) => {
          if (event.currentTarget.src !== logoDarkUrl) event.currentTarget.src = logoDarkUrl
        }}
        src={tenantLogoDarkUrl || tenantLogoUrl || logoDarkUrl}
      />
    </span>
  )
}
