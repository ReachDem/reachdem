"use client";

import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  ShieldAlert,
} from "lucide-react";
import type { EmailSpamAnalysis } from "@/lib/email/email-spam-score";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface EmailSpamScoreCardProps {
  analysis: EmailSpamAnalysis;
  isAiToneLoading?: boolean;
}

function getSeverityCopy(analysis: EmailSpamAnalysis) {
  switch (analysis.severity) {
    case "high":
      return {
        icon: ShieldAlert,
        badgeClassName:
          "border-red-200 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300",
        progressClassName: "bg-red-500",
      };
    case "medium":
      return {
        icon: AlertTriangle,
        badgeClassName:
          "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300",
        progressClassName: "bg-amber-500",
      };
    default:
      return {
        icon: CheckCircle2,
        badgeClassName:
          "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300",
        progressClassName: "bg-emerald-500",
      };
  }
}

export function EmailSpamScoreCard({
  analysis,
  isAiToneLoading = false,
}: EmailSpamScoreCardProps) {
  const severityCopy = getSeverityCopy(analysis);
  const Icon = severityCopy.icon;

  return (
    <Card className="border-dashed">
      <CardHeader className="gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Icon className="text-muted-foreground h-4 w-4" />
            <CardTitle className="text-base">Spam Score</CardTitle>
          </div>
          <Badge
            variant="outline"
            className={cn("capitalize", severityCopy.badgeClassName)}
          >
            {analysis.severity} risk
          </Badge>
        </div>
        <CardDescription>{analysis.summary}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Risk score</span>
            <span className="font-medium">{analysis.score}/100</span>
          </div>
          <Progress
            value={analysis.score}
            indicatorClassName={severityCopy.progressClassName}
          />
          <div className="text-muted-foreground flex flex-wrap gap-4 text-xs">
            <span>{analysis.wordCount} words</span>
            <span>{analysis.linkCount} links</span>
            <span>{analysis.imageCount} images</span>
          </div>
        </div>
        <div className="text-muted-foreground flex items-center gap-2 text-xs">
          {isAiToneLoading ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Live review is updating as you write.
            </>
          ) : (
            <span>
              A final review will run again before sending and warn if the
              message looks risky.
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
