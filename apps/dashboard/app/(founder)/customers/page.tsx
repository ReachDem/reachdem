import { prisma } from "@reachdem/database";
import { FeedbackList } from "@/components/founder-admin/feedback-list";
import {
  CustomersTable,
  type CustomerTableRow,
} from "@/components/founder-admin/customers-table";
import { FounderPageShell } from "@/components/founder-admin/page-shell";
import { KybActions } from "./kyb-actions";
import { listFeedbacks } from "@/lib/founder-admin/feedbacks";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

const KYB_STATUS: Record<string, string> = {
  not_submitted: "border-muted text-muted-foreground",
  pending: "border-amber-400/30 bg-amber-400/10 text-amber-400",
  verified: "border-emerald-400/30 bg-emerald-400/10 text-emerald-400",
  rejected: "border-red-400/30 bg-red-400/10 text-red-400",
};

async function getCustomers(): Promise<CustomerTableRow[]> {
  const organizations = await prisma.organization.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    select: {
      id: true,
      name: true,
      planCode: true,
      creditBalance: true,
      workspaceVerificationStatus: true,
      websiteUrl: true,
      idDocumentKey: true,
      businessDocumentKey: true,
      createdAt: true,
      members: {
        where: { role: "owner" },
        take: 1,
        select: { user: { select: { email: true } } },
      },
      paymentTransactions: {
        where: { status: "succeeded" },
        orderBy: { confirmedAt: "desc" },
        take: 1,
        select: { confirmedAt: true },
      },
      campaigns: { select: { id: true }, take: 1 },
    },
  });

  return organizations.map((organization) => ({
    id: organization.id,
    name: organization.name,
    ownerEmail: organization.members[0]?.user?.email ?? "—",
    planCode: organization.planCode,
    creditBalance: organization.creditBalance,
    workspaceVerificationStatus: organization.workspaceVerificationStatus,
    websiteUrl: organization.websiteUrl,
    idDocumentKey: organization.idDocumentKey,
    businessDocumentKey: organization.businessDocumentKey,
    activated:
      organization.campaigns.length > 0 || organization.planCode !== "free",
    lastPaymentAt: organization.paymentTransactions[0]?.confirmedAt ?? null,
    createdAt: organization.createdAt,
  }));
}

export default async function CustomersPage() {
  const [customers, feedbacks] = await Promise.all([
    getCustomers(),
    listFeedbacks(),
  ]);

  const kybOrganizations = customers.filter(
    (customer) => customer.workspaceVerificationStatus !== "not_submitted"
  );
  const activatedCustomers = customers.filter((customer) => customer.activated);
  const pendingKyb = kybOrganizations.filter(
    (customer) => customer.workspaceVerificationStatus === "pending"
  );

  return (
    <FounderPageShell
      title="Customers"
      description="Review customer quality, unblock identity verification, and keep a pulse on how workspaces are responding to the product."
      facts={[
        {
          label: "Workspaces",
          value: customers.length.toLocaleString(),
          detail: `${activatedCustomers.length.toLocaleString()} activated`,
        },
        {
          label: "KYB Queue",
          value: kybOrganizations.length.toLocaleString(),
          detail: `${pendingKyb.length.toLocaleString()} pending review`,
          tone: pendingKyb.length > 0 ? "warning" : "default",
        },
        {
          label: "Feedback",
          value: feedbacks.length.toLocaleString(),
          detail: "Founder-visible customer sentiment",
        },
      ]}
    >
      <div className="grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <FeedbackList feedbacks={feedbacks} />

        <Card className="rounded-[26px] border border-white/6">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium">KYB Reviews</CardTitle>
            <p className="text-sm text-[color:var(--founder-muted-foreground)]">
              High-trust checks for submitted workspace verification documents.
            </p>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-32 text-sm">Submitted</TableHead>
                  <TableHead className="text-sm">Workspace</TableHead>
                  <TableHead className="text-sm">Owner</TableHead>
                  <TableHead className="w-28 text-sm">Status</TableHead>
                  <TableHead className="w-24 text-sm">Plan</TableHead>
                  <TableHead className="w-48 text-right text-sm">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {kybOrganizations.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-muted-foreground h-24 text-center text-sm"
                    >
                      No KYB submissions yet
                    </TableCell>
                  </TableRow>
                ) : (
                  kybOrganizations.map((organization) => (
                    <TableRow
                      key={organization.id}
                      className="hover:bg-muted/30"
                    >
                      <TableCell className="text-muted-foreground text-sm">
                        {new Date(organization.createdAt).toLocaleDateString(
                          "en-US",
                          {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          }
                        )}
                      </TableCell>
                      <TableCell className="text-sm font-medium">
                        {organization.name}
                      </TableCell>
                      <TableCell className="text-muted-foreground max-w-[14rem] truncate text-sm">
                        {organization.ownerEmail}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-sm capitalize",
                            KYB_STATUS[
                              organization.workspaceVerificationStatus
                            ] ?? ""
                          )}
                        >
                          {organization.workspaceVerificationStatus.replace(
                            "_",
                            " "
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-sm capitalize">
                          {organization.planCode}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <KybActions
                          organizationId={organization.id}
                          organizationName={organization.name}
                          ownerEmail={organization.ownerEmail}
                          websiteUrl={organization.websiteUrl}
                          idDocumentKey={organization.idDocumentKey}
                          businessDocumentKey={organization.businessDocumentKey}
                          verificationStatus={
                            organization.workspaceVerificationStatus
                          }
                        />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <CustomersTable customers={customers} />
    </FounderPageShell>
  );
}
