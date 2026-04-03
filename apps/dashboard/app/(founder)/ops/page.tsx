import {
  getWorkersStatus,
  getMessagesOpsSummary,
  getOpsIncidents,
} from "@/lib/founder-admin/monitoring";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { AlertTriangle, CheckCircle, XCircle, Pause, Wifi } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FounderAdminWorkerStatus } from "@/lib/founder-admin/types";

const WORKER_STATUS_CONFIG: Record<
  FounderAdminWorkerStatus,
  { label: string; color: string; icon: React.ElementType }
> = {
  healthy: {
    label: "Healthy",
    color: "text-emerald-400 border-emerald-400/30 bg-emerald-400/10",
    icon: CheckCircle,
  },
  degraded: {
    label: "Degraded",
    color: "text-amber-400 border-amber-400/30 bg-amber-400/10",
    icon: AlertTriangle,
  },
  offline: {
    label: "Offline",
    color: "text-red-400 border-red-400/30 bg-red-400/10",
    icon: XCircle,
  },
  paused: {
    label: "Paused",
    color: "text-muted-foreground border-muted",
    icon: Pause,
  },
};

const CHANNELS = ["sms", "email", "push", "whatsapp"] as const;

export default async function OpsPage() {
  const [workers, ops, incidents] = await Promise.all([
    getWorkersStatus(),
    getMessagesOpsSummary(),
    getOpsIncidents(),
  ]);

  const isAlert = ops.alertState !== "ok";

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Ops</h2>
        <p className="text-muted-foreground mt-0.5 text-sm">
          Infrastructure health, message delivery, and active incidents.
        </p>
      </div>

      {/* Alert banner */}
      {isAlert && (
        <Alert
          variant={ops.alertState === "critical" ? "destructive" : "default"}
          className={cn(
            ops.alertState === "warning" &&
              "border-amber-400/50 bg-amber-400/10 text-amber-400 [&>svg]:text-amber-400"
          )}
        >
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle className="font-semibold">
            {ops.alertState === "critical"
              ? "Critical Delivery Alert"
              : "Delivery Warning"}
          </AlertTitle>
          <AlertDescription className="text-sm">
            {ops.blockedCreditedCustomersCount} credited customer
            {ops.blockedCreditedCustomersCount !== 1 ? "s" : ""} have blocked or
            delayed outbound messages. Immediate investigation recommended.
          </AlertDescription>
        </Alert>
      )}

      {/* Workers Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Wifi className="h-4 w-4" />
            Workers
          </CardTitle>
          <CardDescription className="text-sm">
            Background job processing health
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-sm">Worker</TableHead>
                <TableHead className="w-24 text-sm">Status</TableHead>
                <TableHead className="w-32 text-sm">Last Heartbeat</TableHead>
                <TableHead className="w-24 text-sm">Queue Depth</TableHead>
                <TableHead className="w-24 text-sm">Failures</TableHead>
                <TableHead className="w-32 text-sm">Avg Processing</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {workers.map((w) => {
                const conf = WORKER_STATUS_CONFIG[w.status];
                const Icon = conf.icon;
                return (
                  <TableRow key={w.workerName} className="hover:bg-muted/30">
                    <TableCell className="font-mono text-sm font-medium">
                      {w.workerName}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={cn(
                          "flex w-fit items-center gap-1 text-sm",
                          conf.color
                        )}
                      >
                        <Icon className="h-3 w-3" />
                        {conf.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {w.lastHeartbeatAt
                        ? new Date(w.lastHeartbeatAt).toLocaleTimeString()
                        : "—"}
                    </TableCell>
                    <TableCell className="text-sm">
                      {w.queueDepth.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          "text-sm",
                          w.recentFailuresCount > 0
                            ? "font-medium text-red-400"
                            : "text-muted-foreground"
                        )}
                      >
                        {w.recentFailuresCount}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {w.averageProcessingTimeMs != null
                        ? `${w.averageProcessingTimeMs.toFixed(0)}ms`
                        : "—"}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Messages Status */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {CHANNELS.map((ch) => {
          const pending = ops.totalPendingByChannel[ch] ?? 0;
          const failed = ops.totalFailedByChannel[ch] ?? 0;
          const delayed = ops.delayedSendsByChannel[ch] ?? 0;
          return (
            <Card key={ch}>
              <CardHeader className="pb-2">
                <CardTitle className="text-muted-foreground text-sm font-medium uppercase">
                  {ch}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Pending</span>
                  <span className="font-mono">{pending}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Failed</span>
                  <span
                    className={cn(
                      "font-mono",
                      failed > 0 && "font-medium text-red-400"
                    )}
                  >
                    {failed}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Delayed</span>
                  <span
                    className={cn(
                      "font-mono",
                      delayed > 0 && "font-medium text-amber-400"
                    )}
                  >
                    {delayed}
                  </span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Incidents table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">
            Recent Incidents
          </CardTitle>
          <CardDescription className="text-sm">Last 7 days</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-32 text-sm">Detected</TableHead>
                <TableHead className="w-20 text-sm">Level</TableHead>
                <TableHead className="text-sm">Summary</TableHead>
                <TableHead className="w-24 text-sm">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {incidents.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="text-muted-foreground h-24 text-center text-sm"
                  >
                    No incidents in the last 7 days
                  </TableCell>
                </TableRow>
              ) : (
                incidents.map((inc) => (
                  <TableRow key={inc.id} className="hover:bg-muted/30">
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(inc.detectedAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-sm",
                          inc.level === "critical"
                            ? "border-red-400/30 bg-red-400/10 text-red-400"
                            : "border-amber-400/30 bg-amber-400/10 text-amber-400"
                        )}
                      >
                        {inc.level}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-xs truncate text-sm">
                      {inc.summary}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-sm",
                          inc.status === "resolved"
                            ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-400"
                            : "border-muted text-muted-foreground"
                        )}
                      >
                        {inc.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
