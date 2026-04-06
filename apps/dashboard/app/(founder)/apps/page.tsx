import {
  PricingPlansEditor,
  type PricingPlanRow,
} from "@/components/founder-admin/pricing-plans-editor";
import {
  AnnouncementsEditor,
  type AnnouncementRow,
} from "@/components/founder-admin/announcements-editor";
import { FounderPageShell } from "@/components/founder-admin/page-shell";

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

export default async function AppsPage() {
  const announcements = await getAnnouncements();
  const activePlans = DEFAULT_PLANS.filter((plan) => plan.status === "active");

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
      ]}
    >
      <div className="grid gap-6">
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
