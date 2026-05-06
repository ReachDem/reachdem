import { prisma as db } from "@reachdem/database";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const revalidate = 30;

export async function GET() {
  try {
    const setting = await db.platformSetting.findUnique({
      where: { key: "maintenance_mode" },
    });
    const val = setting?.value as {
      enabled?: boolean;
      mode?: string;
      message?: string;
      bannerLink?: string;
      bannerLinkText?: string;
    } | null;
    return NextResponse.json({
      enabled: val?.enabled ?? false,
      mode: val?.mode ?? "full",
      message: val?.message ?? "",
      bannerLink: val?.bannerLink ?? "",
      bannerLinkText: val?.bannerLinkText ?? "Learn more",
    });
  } catch {
    return NextResponse.json({ enabled: false, mode: "full", message: "" });
  }
}
