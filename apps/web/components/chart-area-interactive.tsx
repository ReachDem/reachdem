"use client"

import * as React from "react"
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts"

import { useIsMobile } from "@/hooks/use-mobile"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"

export const description = "ReachDem messaging activity chart"

const chartData = [
  { date: "2024-04-01", sms: 222, email: 150 },
  { date: "2024-04-02", sms: 97, email: 180 },
  { date: "2024-04-03", sms: 167, email: 120 },
  { date: "2024-04-04", sms: 242, email: 260 },
  { date: "2024-04-05", sms: 373, email: 290 },
  { date: "2024-04-06", sms: 301, email: 340 },
  { date: "2024-04-07", sms: 245, email: 180 },
  { date: "2024-04-08", sms: 409, email: 320 },
  { date: "2024-04-09", sms: 59, email: 110 },
  { date: "2024-04-10", sms: 261, email: 190 },
  { date: "2024-04-11", sms: 327, email: 350 },
  { date: "2024-04-12", sms: 292, email: 210 },
  { date: "2024-04-13", sms: 342, email: 380 },
  { date: "2024-04-14", sms: 137, email: 220 },
  { date: "2024-04-15", sms: 120, email: 170 },
  { date: "2024-04-16", sms: 138, email: 190 },
  { date: "2024-04-17", sms: 446, email: 360 },
  { date: "2024-04-18", sms: 364, email: 410 },
  { date: "2024-04-19", sms: 243, email: 180 },
  { date: "2024-04-20", sms: 89, email: 150 },
  { date: "2024-04-21", sms: 137, email: 200 },
  { date: "2024-04-22", sms: 224, email: 170 },
  { date: "2024-04-23", sms: 138, email: 230 },
  { date: "2024-04-24", sms: 387, email: 290 },
  { date: "2024-04-25", sms: 215, email: 250 },
  { date: "2024-04-26", sms: 75, email: 130 },
  { date: "2024-04-27", sms: 383, email: 420 },
  { date: "2024-04-28", sms: 122, email: 180 },
  { date: "2024-04-29", sms: 315, email: 240 },
  { date: "2024-04-30", sms: 454, email: 380 },
  { date: "2024-05-01", sms: 165, email: 220 },
  { date: "2024-05-02", sms: 293, email: 310 },
  { date: "2024-05-03", sms: 247, email: 190 },
  { date: "2024-05-04", sms: 385, email: 420 },
  { date: "2024-05-05", sms: 481, email: 390 },
  { date: "2024-05-06", sms: 498, email: 520 },
  { date: "2024-05-07", sms: 388, email: 300 },
  { date: "2024-05-08", sms: 149, email: 210 },
  { date: "2024-05-09", sms: 227, email: 180 },
  { date: "2024-05-10", sms: 293, email: 330 },
  { date: "2024-05-11", sms: 335, email: 270 },
  { date: "2024-05-12", sms: 197, email: 240 },
  { date: "2024-05-13", sms: 197, email: 160 },
  { date: "2024-05-14", sms: 448, email: 490 },
  { date: "2024-05-15", sms: 473, email: 380 },
  { date: "2024-05-16", sms: 338, email: 400 },
  { date: "2024-05-17", sms: 499, email: 420 },
  { date: "2024-05-18", sms: 315, email: 350 },
  { date: "2024-05-19", sms: 235, email: 180 },
  { date: "2024-05-20", sms: 177, email: 230 },
  { date: "2024-05-21", sms: 82, email: 140 },
  { date: "2024-05-22", sms: 81, email: 120 },
  { date: "2024-05-23", sms: 252, email: 290 },
  { date: "2024-05-24", sms: 294, email: 220 },
  { date: "2024-05-25", sms: 201, email: 250 },
  { date: "2024-05-26", sms: 213, email: 170 },
  { date: "2024-05-27", sms: 420, email: 460 },
  { date: "2024-05-28", sms: 233, email: 190 },
  { date: "2024-05-29", sms: 78, email: 130 },
  { date: "2024-05-30", sms: 340, email: 280 },
  { date: "2024-05-31", sms: 178, email: 230 },
  { date: "2024-06-01", sms: 178, email: 200 },
  { date: "2024-06-02", sms: 470, email: 410 },
  { date: "2024-06-03", sms: 103, email: 160 },
  { date: "2024-06-04", sms: 439, email: 380 },
  { date: "2024-06-05", sms: 88, email: 140 },
  { date: "2024-06-06", sms: 294, email: 250 },
  { date: "2024-06-07", sms: 323, email: 370 },
  { date: "2024-06-08", sms: 385, email: 320 },
  { date: "2024-06-09", sms: 438, email: 480 },
  { date: "2024-06-10", sms: 155, email: 200 },
  { date: "2024-06-11", sms: 92, email: 150 },
  { date: "2024-06-12", sms: 492, email: 420 },
  { date: "2024-06-13", sms: 81, email: 130 },
  { date: "2024-06-14", sms: 426, email: 380 },
  { date: "2024-06-15", sms: 307, email: 350 },
  { date: "2024-06-16", sms: 371, email: 310 },
  { date: "2024-06-17", sms: 475, email: 520 },
  { date: "2024-06-18", sms: 107, email: 170 },
  { date: "2024-06-19", sms: 341, email: 290 },
  { date: "2024-06-20", sms: 408, email: 450 },
  { date: "2024-06-21", sms: 169, email: 210 },
  { date: "2024-06-22", sms: 317, email: 270 },
  { date: "2024-06-23", sms: 480, email: 530 },
  { date: "2024-06-24", sms: 132, email: 180 },
  { date: "2024-06-25", sms: 141, email: 190 },
  { date: "2024-06-26", sms: 434, email: 380 },
  { date: "2024-06-27", sms: 448, email: 490 },
  { date: "2024-06-28", sms: 149, email: 200 },
  { date: "2024-06-29", sms: 103, email: 160 },
  { date: "2024-06-30", sms: 446, email: 400 },
]

const chartConfig = {
  messages: {
    label: "Messages",
  },
  sms: {
    label: "SMS",
    color: "hsl(142, 76%, 36%)", // Green for SMS
  },
  email: {
    label: "Email",
    color: "hsl(221, 83%, 53%)", // Blue for Email
  },
} satisfies ChartConfig

export function ChartAreaInteractive() {
  const isMobile = useIsMobile()
  const [timeRange, setTimeRange] = React.useState("90d")

  React.useEffect(() => {
    if (isMobile) {
      setTimeRange("7d")
    }
  }, [isMobile])

  const filteredData = chartData.filter((item) => {
    const date = new Date(item.date)
    const referenceDate = new Date("2024-06-30")
    let daysToSubtract = 90
    if (timeRange === "30d") {
      daysToSubtract = 30
    } else if (timeRange === "7d") {
      daysToSubtract = 7
    }
    const startDate = new Date(referenceDate)
    startDate.setDate(startDate.getDate() - daysToSubtract)
    return date >= startDate
  })

  return (
    <Card className="@container/card">
      <CardHeader>
        <CardTitle>Message Activity</CardTitle>
        <CardDescription>
          <span className="hidden @[540px]/card:block">SMS and Email sent over the last 3 months</span>
          <span className="@[540px]/card:hidden">Last 3 months</span>
        </CardDescription>
        <CardAction>
          <ToggleGroup
            type="single"
            value={timeRange}
            onValueChange={setTimeRange}
            variant="outline"
            className="hidden *:data-[slot=toggle-group-item]:!px-4 @[767px]/card:flex"
          >
            <ToggleGroupItem value="90d">Last 3 months</ToggleGroupItem>
            <ToggleGroupItem value="30d">Last 30 days</ToggleGroupItem>
            <ToggleGroupItem value="7d">Last 7 days</ToggleGroupItem>
          </ToggleGroup>
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger
              className="flex w-40 **:data-[slot=select-value]:block **:data-[slot=select-value]:truncate @[767px]/card:hidden"
              size="sm"
              aria-label="Select a value"
            >
              <SelectValue placeholder="Last 3 months" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="90d" className="rounded-lg">
                Last 3 months
              </SelectItem>
              <SelectItem value="30d" className="rounded-lg">
                Last 30 days
              </SelectItem>
              <SelectItem value="7d" className="rounded-lg">
                Last 7 days
              </SelectItem>
            </SelectContent>
          </Select>
        </CardAction>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <ChartContainer config={chartConfig} className="aspect-auto h-[250px] w-full">
          <AreaChart data={filteredData}>
            <defs>
              <linearGradient id="fillSms" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-sms)" stopOpacity={1.0} />
                <stop offset="95%" stopColor="var(--color-sms)" stopOpacity={0.1} />
              </linearGradient>
              <linearGradient id="fillEmail" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-email)" stopOpacity={0.8} />
                <stop offset="95%" stopColor="var(--color-email)" stopOpacity={0.1} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
              tickFormatter={(value) => {
                const date = new Date(value)
                return date.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })
              }}
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  labelFormatter={(value) => {
                    return new Date(value).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })
                  }}
                  indicator="dot"
                />
              }
            />
            <Area dataKey="email" type="natural" fill="url(#fillEmail)" stroke="var(--color-email)" stackId="a" />
            <Area dataKey="sms" type="natural" fill="url(#fillSms)" stroke="var(--color-sms)" stackId="a" />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
