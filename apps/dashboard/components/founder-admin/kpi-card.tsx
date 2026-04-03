import { type ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUpIcon, TrendingDownIcon, MinusIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface KpiCardProps {
  title: string;
  value: string | ReactNode;
  subtext?: string;
  trend?: { value: number; label: string };
  icon?: ReactNode;
  loading?: boolean;
  badge?: string;
  badgeVariant?: "default" | "secondary" | "destructive" | "outline";
}

export function KpiCard({
  title,
  value,
  subtext,
  trend,
  icon,
  loading = false,
  badge,
  badgeVariant = "secondary",
}: KpiCardProps) {
  if (loading) {
    return (
      <Card className="@container/card">
        <CardHeader>
          <Skeleton className="h-4 w-28" />
          <Skeleton className="mt-2 h-9 w-32" />
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <Skeleton className="h-3 w-40" />
        </CardFooter>
      </Card>
    );
  }

  const TrendIcon =
    trend && trend.value > 0
      ? TrendingUpIcon
      : trend && trend.value < 0
        ? TrendingDownIcon
        : MinusIcon;

  const trendColor =
    trend && trend.value > 0
      ? "text-emerald-400"
      : trend && trend.value < 0
        ? "text-destructive"
        : "text-muted-foreground";

  return (
    <Card className="@container/card">
      <CardHeader>
        <CardDescription>{title}</CardDescription>
        <CardTitle className="flex items-center gap-2 text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
          {value}
        </CardTitle>
        <CardAction>
          {badge || trend ? (
            <Badge variant={badgeVariant || "outline"}>
              {trend ? (
                <>
                  <TrendIcon className="mr-1 size-3" />
                  {trend.value > 0 ? "+" : ""}
                  {trend.value}%
                </>
              ) : (
                badge
              )}
            </Badge>
          ) : (
            icon && <div className="text-muted-foreground">{icon}</div>
          )}
        </CardAction>
      </CardHeader>

      {(subtext || trend) && (
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          {trend && (
            <div
              className={cn("line-clamp-1 flex gap-2 font-medium", trendColor)}
            >
              {trend.label}
              <TrendIcon className="size-4" />
            </div>
          )}
          {subtext && <div className="text-muted-foreground">{subtext}</div>}
        </CardFooter>
      )}
    </Card>
  );
}
