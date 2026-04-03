import { prisma } from "@reachdem/database";
import {
  PricingPlansEditor,
  type PricingPlanRow,
} from "@/components/founder-admin/pricing-plans-editor";
import {
  AnnouncementsEditor,
  type AnnouncementRow,
} from "@/components/founder-admin/announcements-editor";

// ─── Pricing Plans (from PlanEntitlements config — hardcoded defaults) ───────

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
    priceMonthlyMinor: 500000, // 5000 XAF
    currency: "XAF",
    status: "active",
    smsQuota: 1000,
    emailQuota: 5000,
  },
  {
    code: "growth",
    name: "Growth",
    priceMonthlyMinor: 1500000, // 15000 XAF
    currency: "XAF",
    status: "active",
    smsQuota: 5000,
    emailQuota: 20000,
  },
  {
    code: "pro",
    name: "Pro",
    priceMonthlyMinor: 5000000, // 50000 XAF
    currency: "XAF",
    status: "active",
    smsQuota: null,
    emailQuota: null,
  },
];

// Server actions
async function updatePlan(plan: PricingPlanRow): Promise<void> {
  "use server";
  // Persist to DB when pricing_plan table is available
  // For now: log for audit trail
  console.info(`[apps-config] Plan updated: ${plan.code}`, {
    name: plan.name,
    price: plan.priceMonthlyMinor,
    status: plan.status,
  });
}

async function getAnnouncements(): Promise<AnnouncementRow[]> {
  // Will query announcement table once migration applied
  return [];
}

async function createAnnouncement(
  input: Omit<AnnouncementRow, "id" | "createdAt">
): Promise<AnnouncementRow> {
  "use server";
  console.info("[apps-config] Announcement created", input);
  // Return mock with generated ID until DB table is ready
  return {
    ...input,
    id: `ann_${Date.now()}`,
    createdAt: new Date(),
  };
}

async function updateAnnouncement(ann: AnnouncementRow): Promise<void> {
  "use server";
  console.info(`[apps-config] Announcement updated: ${ann.id}`);
}

export default async function AppsPage() {
  const announcements = await getAnnouncements();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">
          Apps Configuration
        </h2>
        <p className="text-muted-foreground mt-0.5 text-sm">
          Manage pricing plans, quotas, and marketing announcements.
        </p>
      </div>

      <PricingPlansEditor plans={DEFAULT_PLANS} onUpdate={updatePlan} />

      <AnnouncementsEditor
        announcements={announcements}
        onCreate={createAnnouncement}
        onUpdate={updateAnnouncement}
      />
    </div>
  );
}
