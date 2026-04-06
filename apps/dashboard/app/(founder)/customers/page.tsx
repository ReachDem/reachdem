import { prisma } from "@reachdem/database";
import { FeedbackList } from "@/components/founder-admin/feedback-list";
import {
  CustomersTable,
  type CustomerTableRow,
} from "@/components/founder-admin/customers-table";
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

// KYB status color helper
const KYB_STATUS: Record<string, string> = {
  not_submitted: "border-muted text-muted-foreground",
  pending: "border-amber-400/30 bg-amber-400/10 text-amber-400",
  verified: "border-emerald-400/30 bg-emerald-400/10 text-emerald-400",
  rejected: "border-red-400/30 bg-red-400/10 text-red-400",
};

async function getCustomers(): Promise<CustomerTableRow[]> {
  const orgs = await prisma.organization.findMany({
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

  return orgs.map((org: (typeof orgs)[number]) => ({
    id: org.id,
    name: org.name,
    ownerEmail: org.members[0]?.user?.email ?? "—",
    planCode: org.planCode,
    creditBalance: org.creditBalance,
    workspaceVerificationStatus: org.workspaceVerificationStatus,
    websiteUrl: org.websiteUrl,
    idDocumentKey: org.idDocumentKey,
    businessDocumentKey: org.businessDocumentKey,
    activated: org.campaigns.length > 0 || org.planCode !== "free",
    lastPaymentAt: org.paymentTransactions[0]?.confirmedAt ?? null,
    createdAt: org.createdAt,
  }));
}

export default async function CustomersPage() {
  const [customers, feedbacks] = await Promise.all([
    getCustomers(),
    listFeedbacks(),
  ]);

  // KYB orgs: those pending / verified / rejected
  const kybOrgs = customers.filter(
    (c) => c.workspaceVerificationStatus !== "not_submitted"
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-4xl font-semibold tracking-tight">Customers</h2>
        <p className="text-md text-muted-foreground mt-0.5">
          {customers.length} workspaces — KYB reviews, feedback, and account
          details.
        </p>
      </div>

      {/* Feedback section */}
      <FeedbackList feedbacks={feedbacks} />

      {/* Customers table */}
      <CustomersTable customers={customers} />

      {/* KYB Review table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium">KYB Reviews</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-32 text-base">Submitted</TableHead>
                <TableHead className="text-base">Workspace</TableHead>
                <TableHead className="text-base">Owner</TableHead>
                <TableHead className="w-28 text-base">Status</TableHead>
                <TableHead className="w-24 text-base">Plan</TableHead>
                <TableHead className="w-48 text-right text-base">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {kybOrgs.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-muted-foreground h-24 text-center"
                  >
                    No KYB submissions yet
                  </TableCell>
                </TableRow>
              ) : (
                kybOrgs.map((org) => (
                  <TableRow key={org.id} className="hover:bg-muted/30">
                    <TableCell className="text-muted-foreground">
                      {new Date(org.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </TableCell>
                    <TableCell className="text-base font-medium">
                      {org.name}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-base">
                      {org.ownerEmail}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-base capitalize",
                          KYB_STATUS[org.workspaceVerificationStatus] ?? ""
                        )}
                      >
                        {org.workspaceVerificationStatus.replace("_", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-base capitalize">
                        {org.planCode}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <KybActions
                        organizationId={org.id}
                        websiteUrl={org.websiteUrl}
                        idDocumentKey={org.idDocumentKey}
                        businessDocumentKey={org.businessDocumentKey}
                        verificationStatus={org.workspaceVerificationStatus}
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
  );
}
