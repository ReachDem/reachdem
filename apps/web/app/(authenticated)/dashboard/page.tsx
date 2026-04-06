import { auth } from "@reachdem/auth";
import { prisma } from "@reachdem/database";
import { headers } from "next/headers";
import { ChartAreaInteractive } from "@/components/chart-area-interactive";
import { DataTable } from "@/components/data-table";
import { SectionCards } from "@/components/section-cards";

import { DashboardChecklist } from "@/components/onboarding/dashboard-checklist";

import data from "./data.json";

import { Cta18 } from "@/components/cta18";
import { Feature274 } from "@/components/feature274";

export default async function Page() {
  const session = await auth.api.getSession({ headers: await headers() });

  let hasContacts = false;
  if (session?.user?.id) {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    const organizationId =
      session.session.activeOrganizationId ??
      user?.defaultOrganizationId ??
      null;

    if (organizationId) {
      const contactsCount = await prisma.contact.count({
        where: { organizationId },
      });
      hasContacts = contactsCount > 0;
    }
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="@container/main flex flex-1 flex-col gap-2">
        <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
          <DashboardChecklist />
          {hasContacts ? (
            <>
              <SectionCards />
              <div className="px-4 lg:px-6">
                <ChartAreaInteractive />
              </div>
              <DataTable data={data} />
            </>
          ) : (
            <div className="flex flex-col gap-8 px-4 lg:px-6">
              {/* <Feature274 /> */}
              <Cta18 />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
