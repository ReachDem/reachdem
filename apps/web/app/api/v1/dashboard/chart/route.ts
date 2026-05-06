import { NextResponse } from "next/server";
import { withWorkspace } from "@reachdem/auth/guards";
import { prisma } from "@reachdem/database";

const DAY_WINDOW = 90;
const MESSAGE_CHANNELS = new Set(["sms", "email"]);

function formatDayKey(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function buildDateSeries(): string[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return Array.from({ length: DAY_WINDOW }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (DAY_WINDOW - 1 - index));
    return formatDayKey(date);
  });
}

export const GET = withWorkspace(async ({ organizationId }) => {
  try {
    const dateSeries = buildDateSeries();
    const startDate = new Date(`${dateSeries[0]}T00:00:00.000Z`);

    const rawAggregates = await prisma.$queryRaw<
      { day: Date; channel: string; total: bigint }[]
    >`
      SELECT 
        DATE("createdAt") as day,
        channel,
        COUNT(*)::bigint as total
      FROM "message"
      WHERE "organizationId" = ${organizationId}
        AND "createdAt" >= ${startDate}
      GROUP BY DATE("createdAt"), channel
    `;

    const counts = new Map<string, { sms: number; email: number }>();
    for (const day of dateSeries) {
      counts.set(day, { sms: 0, email: 0 });
    }

    for (const row of rawAggregates) {
      if (!MESSAGE_CHANNELS.has(row.channel)) continue;

      const dayKey = formatDayKey(row.day);
      const current = counts.get(dayKey);

      if (current) {
        if (row.channel === "sms") {
          current.sms += Number(row.total);
        } else if (row.channel === "email") {
          current.email += Number(row.total);
        }
      }
    }

    return NextResponse.json({
      data: dateSeries.map((date) => ({
        date,
        ...counts.get(date)!,
      })),
    });
  } catch (error: any) {
    console.error("[Dashboard Chart API - GET] Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
});
