"use server";

import { revalidatePath } from "next/cache";
import { prisma as db } from "@reachdem/database";

const KEY = "maintenance_mode";

export interface MaintenanceState {
  enabled: boolean;
  mode: "full" | "banner";
  message: string;
  bannerLink?: string;
  bannerLinkText?: string;
}

export async function getMaintenanceMode(): Promise<MaintenanceState> {
  const setting = await db.platformSetting.findUnique({ where: { key: KEY } });
  if (!setting) return { enabled: false, mode: "full", message: "" };
  const val = setting.value as Partial<MaintenanceState>;
  return {
    enabled: val.enabled ?? false,
    mode: val.mode ?? "full",
    message: val.message ?? "",
    bannerLink: val.bannerLink ?? "",
    bannerLinkText: val.bannerLinkText ?? "Learn more",
  };
}

export async function setMaintenanceMode(
  state: MaintenanceState
): Promise<void> {
  await db.platformSetting.upsert({
    where: { key: KEY },
    create: { key: KEY, value: state as object },
    update: { value: state as object },
  });
  revalidatePath("/broadcast");
}
