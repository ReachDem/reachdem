import {
  convertMinorToMajor,
  getCurrencyMinorExponent,
} from "@reachdem/shared";
import {
  PricingPlansEditor,
  type PricingPlanRow,
} from "@/components/founder-admin/pricing-plans-editor";
import {
  AnnouncementsEditor,
  type AnnouncementRow,
} from "@/components/founder-admin/announcements-editor";
import { WorkspaceSeedBalanceEditor } from "@/components/founder-admin/workspace-seed-balance-editor";
import { FounderPageShell } from "@/components/founder-admin/page-shell";
import { getServerSession } from "@/lib/founder-admin/auth";
import type { WorkspaceInitialBalanceEntry } from "@reachdem/shared";
import { BillingCatalogService } from "../../../../../packages/core/src/services/billing-catalog.service";
import { PlatformBillingSettingsService } from "../../../../../packages/core/src/services/platform-billing-settings.service";

function formatMoney(amountMinor: number, currency: string): string {
  const amountMajor = convertMinorToMajor(amountMinor, currency);
  const maximumFractionDigits = getCurrencyMinorExponent(currency);

  if (maximumFractionDigits === 0) {
    return `${amountMajor.toLocaleString("fr-FR")} ${currency}`;
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: maximumFractionDigits,
    maximumFractionDigits,
  }).format(amountMajor);
}

const DEFAULT_PLANS: PricingPlanRow[] = [
  {
    code: "free",
    name: "Free",
    priceMonthlyMinor: 0,
    currency: "XAF",
    status: "active",
    smsQuota: 100,
    emailQuota: 500,
  },
  {
    code: "basic",
    name: "Basic",
    priceMonthlyMinor: 500000,
    currency: "XAF",
    status: "active",
    smsQuota: 1000,
    emailQuota: 5000,
  },
  {
    code: "growth",
    name: "Growth",
    priceMonthlyMinor: 1500000,
    currency: "XAF",
    status: "active",
    smsQuota: 5000,
    emailQuota: 20000,
  },
  {
    code: "pro",
    name: "Pro",
    priceMonthlyMinor: 5000000,
    currency: "XAF",
    status: "active",
    smsQuota: null,
    emailQuota: null,
  },
];

async function updatePlan(plan: PricingPlanRow): Promise<void> {
  "use server";
  console.info(`[apps-config] Plan updated: ${plan.code}`, {
    name: plan.name,
    price: plan.priceMonthlyMinor,
    status: plan.status,
  });
}

async function getAnnouncements(): Promise<AnnouncementRow[]> {
  return [];
}

async function createAnnouncement(
  input: Omit<AnnouncementRow, "id" | "createdAt">
): Promise<AnnouncementRow> {
  "use server";
  console.info("[apps-config] Announcement created", input);
  return {
    ...input,
    id: `ann_${Date.now()}`,
    createdAt: new Date(),
  };
}

async function updateAnnouncement(
  announcement: AnnouncementRow
): Promise<void> {
  "use server";
  console.info(`[apps-config] Announcement updated: ${announcement.id}`);
}

async function updateWorkspaceInitialBalances(
  entries: WorkspaceInitialBalanceEntry[]
): Promise<void> {
  "use server";

  const session = await getServerSession();

  if (!session) {
    throw new Error("Unauthorized founder session.");
  }

  await PlatformBillingSettingsService.saveWorkspaceInitialBalanceSettings({
    entries,
    updatedBy: session.email,
  });
}

export default async function AppsPage() {
  const [announcements, workspaceInitialBalances] = await Promise.all([
    getAnnouncements(),
    PlatformBillingSettingsService.getWorkspaceInitialBalanceSettings(),
  ]);
  const activePlans = DEFAULT_PLANS.filter((plan) => plan.status === "active");
  const currentBaseCurrency = BillingCatalogService.getBalanceCurrency();
  const currentBaseEntry =
    workspaceInitialBalances.entries.find(
      (entry) => entry.currency === currentBaseCurrency
    ) ?? workspaceInitialBalances.entries[0];
  const lastUpdatedLabel = workspaceInitialBalances.updatedAt
    ? new Intl.DateTimeFormat("en-US", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(workspaceInitialBalances.updatedAt)
    : null;

  return (
    <FounderPageShell
      title="Apps"
      description="Tune the commercial surface area of the product: plan packaging, usage quotas, and the announcements customers see."
      facts={[
        {
          label: "Plans",
          value: DEFAULT_PLANS.length.toLocaleString(),
          detail: `${activePlans.length.toLocaleString()} active for sale`,
        },
        {
          label: "Announcements",
          value: announcements.length.toLocaleString(),
          detail: "In-app promos, notices, and feature updates",
        },
        {
          label: "New Workspace Balance",
          value: currentBaseEntry
            ? formatMoney(currentBaseEntry.amountMinor, currentBaseCurrency)
            : `0 ${currentBaseCurrency}`,
          detail: "Applied to future workspace creation only",
        },
      ]}
    >
      <div className="grid gap-6">
        <WorkspaceSeedBalanceEditor
          entries={workspaceInitialBalances.entries}
          baseCurrency={currentBaseCurrency}
          source={workspaceInitialBalances.source}
          lastUpdatedLabel={lastUpdatedLabel}
          lastUpdatedBy={workspaceInitialBalances.updatedBy}
          onSave={updateWorkspaceInitialBalances}
        />
        <PricingPlansEditor plans={DEFAULT_PLANS} onUpdate={updatePlan} />
        <AnnouncementsEditor
          announcements={announcements}
          onCreate={createAnnouncement}
          onUpdate={updateAnnouncement}
        />
      </div>
    </FounderPageShell>
  );
}
