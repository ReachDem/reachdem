import {
  getWorkersStatus,
  getMessagesOpsSummary,
  getOpsIncidents,
} from "@/lib/founder-admin/monitoring";
import { FounderPageShell } from "@/components/founder-admin/page-shell";
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
  const unhealthyWorkers = workers.filter(
    (worker) => worker.status !== "healthy"
  );

  return (
    <FounderPageShell
      title="Ops"
      description="Watch operational risk in one place: queue pressure, worker health, delivery blockage, and incident context."
      facts={[
        {
          label: "Workers",
          value: workers.length.toLocaleString(),
          detail: `${unhealthyWorkers.length.toLocaleString()} degraded, paused, or offline`,
          tone: unhealthyWorkers.length > 0 ? "warning" : "success",
        },
        {
          label: "Alert State",
          value: ops.alertState === "ok" ? "Stable" : ops.alertState,
          detail: `${ops.blockedCreditedCustomersCount.toLocaleString()} credited customers affected`,
          tone: ops.alertState === "critical" ? "critical" : "warning",
        },
        {
          label: "Recent Incidents",
          value: incidents.length.toLocaleString(),
          detail: "Last 7 days",
        },
      ]}
    >
      {isAlert ? (
        <Alert
          variant={ops.alertState === "critical" ? "destructive" : "default"}
          className={cn(
            "rounded-[24px] border",
            ops.alertState === "warning" &&
              "border-amber-400/50 bg-amber-400/10 text-amber-200 [&>svg]:text-amber-300"
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
            delayed outbound messages. Immediate investigation is recommended.
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {CHANNELS.map((channel) => {
          const pending = ops.totalPendingByChannel[channel] ?? 0;
          const failed = ops.totalFailedByChannel[channel] ?? 0;
          const delayed = ops.delayedSendsByChannel[channel] ?? 0;

          return (
            <Card
              key={channel}
              className="rounded-[24px] border border-white/6"
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-[0.72rem] font-medium tracking-[0.22em] text-[color:var(--founder-quiet-foreground)] uppercase">
                  {channel}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-[color:var(--founder-muted-foreground)]">
                    Pending
                  </span>
                  <span className="font-mono">{pending}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[color:var(--founder-muted-foreground)]">
                    Failed
                  </span>
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
                  <span className="text-[color:var(--founder-muted-foreground)]">
                    Delayed
                  </span>
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

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
        <Card className="rounded-[26px] border border-white/6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <Wifi className="h-4 w-4" aria-hidden="true" />
              Workers
            </CardTitle>
            <CardDescription className="text-sm">
              Background job processing health and queue behavior
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
                {workers.map((worker) => {
                  const config = WORKER_STATUS_CONFIG[worker.status];
                  const StatusIcon = config.icon;

                  return (
                    <TableRow
                      key={worker.workerName}
                      className="hover:bg-muted/30"
                    >
                      <TableCell className="font-mono text-sm font-medium">
                        {worker.workerName}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn(
                            "flex w-fit items-center gap-1 text-sm",
                            config.color
                          )}
                        >
                          <StatusIcon className="h-3 w-3" aria-hidden="true" />
                          {config.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {worker.lastHeartbeatAt
                          ? new Date(
                              worker.lastHeartbeatAt
                            ).toLocaleTimeString()
                          : "—"}
                      </TableCell>
                      <TableCell className="text-sm">
                        {worker.queueDepth.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <span
                          className={cn(
                            "text-sm",
                            worker.recentFailuresCount > 0
                              ? "font-medium text-red-400"
                              : "text-muted-foreground"
                          )}
                        >
                          {worker.recentFailuresCount}
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {worker.averageProcessingTimeMs != null
                          ? `${worker.averageProcessingTimeMs.toFixed(0)}ms`
                          : "—"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="rounded-[26px] border border-white/6">
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
                  incidents.map((incident) => (
                    <TableRow key={incident.id} className="hover:bg-muted/30">
                      <TableCell className="text-muted-foreground text-sm">
                        {new Date(incident.detectedAt).toLocaleDateString(
                          "en-US",
                          {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          }
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-sm",
                            incident.level === "critical"
                              ? "border-red-400/30 bg-red-400/10 text-red-400"
                              : "border-amber-400/30 bg-amber-400/10 text-amber-400"
                          )}
                        >
                          {incident.level}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-xs text-sm">
                        <p className="line-clamp-2 leading-6 whitespace-normal">
                          {incident.summary}
                        </p>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-sm",
                            incident.status === "resolved"
                              ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-400"
                              : "border-muted text-muted-foreground"
                          )}
                        >
                          {incident.status}
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
    </FounderPageShell>
  );
}
