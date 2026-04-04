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

    const messages = await prisma.message.findMany({
      where: {
        organizationId,
        createdAt: {
          gte: startDate,
        },
      },
      select: {
        channel: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    const counts = new Map<string, { sms: number; email: number }>();

    for (const day of dateSeries) {
      counts.set(day, { sms: 0, email: 0 });
    }

    for (const message of messages) {
      if (!MESSAGE_CHANNELS.has(message.channel)) {
        continue;
      }

      const dayKey = formatDayKey(message.createdAt);
      const current = counts.get(dayKey);
      if (!current) {
        continue;
      }

      if (message.channel === "sms") {
        current.sms += 1;
      } else if (message.channel === "email") {
        current.email += 1;
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
