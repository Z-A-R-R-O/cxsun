import type { ReactNode } from "react"
import { IconTrendingDown, IconTrendingUp } from "@tabler/icons-react"

import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "src/components/ui/card"

interface DashboardMetric {
  label: string
  value: string
  trend: ReactNode
  description: string
  direction?: "up" | "down"
}

const defaultMetrics: DashboardMetric[] = [
  {
    label: "Total Revenue",
    value: "$1,250.00",
    trend: "Trending up this month",
    description: "Visitors for the last 6 months",
    direction: "up",
  },
  {
    label: "New Customers",
    value: "1,234",
    trend: "Down 20% this period",
    description: "Acquisition needs attention",
    direction: "down",
  },
  {
    label: "Active Accounts",
    value: "45,678",
    trend: "Strong user retention",
    description: "Engagement exceed targets",
    direction: "up",
  },
  {
    label: "Growth Rate",
    value: "4.5%",
    trend: "Steady performance increase",
    description: "Meets growth projections",
    direction: "up",
  },
]

export function SectionCards({ metrics = defaultMetrics }: { metrics?: DashboardMetric[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4 dark:*:data-[slot=card]:bg-card">
      {metrics.map((metric) => {
        const TrendIcon = metric.direction === "down" ? IconTrendingDown : IconTrendingUp
        return (
          <Card className="@container/card" key={metric.label}>
            <CardHeader>
              <CardDescription>{metric.label}</CardDescription>
              <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                {metric.value}
              </CardTitle>
            </CardHeader>
            <CardFooter className="flex-col items-start gap-1.5 text-sm">
              <div className="line-clamp-1 flex gap-2 font-medium">
                {metric.trend} <TrendIcon className="size-4" />
              </div>
              <div className="text-muted-foreground">{metric.description}</div>
            </CardFooter>
          </Card>
        )
      })}
    </div>
  )
}
