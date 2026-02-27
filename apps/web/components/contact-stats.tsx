import {
  IconUsers,
  IconMail,
  IconPhone,
  IconTrendingUp,
} from "@tabler/icons-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const stats = [
  {
    title: "Total Contacts",
    value: "2,847",
    change: "+12.5%",
    trend: "up",
    icon: IconUsers,
  },
  {
    title: "With Email",
    value: "2,134",
    change: "74.9%",
    trend: "neutral",
    icon: IconMail,
  },
  {
    title: "With Phone",
    value: "2,651",
    change: "93.1%",
    trend: "neutral",
    icon: IconPhone,
  },
  {
    title: "Added this month",
    value: "184",
    change: "+23.1%",
    trend: "up",
    icon: IconTrendingUp,
  },
]

export function ContactStats() {
  return (
    <div className="grid grid-cols-2 gap-4 px-4 lg:grid-cols-4 lg:px-6">
      {stats.map((stat) => (
        <Card key={stat.title}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {stat.title}
            </CardTitle>
            <stat.icon className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{stat.value}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stat.trend === "up" && (
                <span className="text-green-600 dark:text-green-400">{stat.change}</span>
              )}
              {stat.trend === "neutral" && (
                <span>{stat.change}</span>
              )}
              {stat.trend === "up" ? " from last month" : " of total contacts"}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
