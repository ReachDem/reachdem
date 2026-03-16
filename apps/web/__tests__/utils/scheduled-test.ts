type ScheduledExecutionConfig = {
  scheduledAtIso: string;
  cronScheduledTimeMs: number;
  shouldWait: boolean;
  waitMs: number;
  mode: "immediate" | "simulated-future" | "real-future";
};

const TEST_SCHEDULE_AT = process.env.TEST_SCHEDULE_AT;
const TEST_SCHEDULE_DELAY_MINUTES = process.env.TEST_SCHEDULE_DELAY_MINUTES;
const TEST_WAIT_FOR_SCHEDULE = process.env.TEST_WAIT_FOR_SCHEDULE === "true";

export function getScheduledExecutionConfig(): ScheduledExecutionConfig {
  const now = Date.now();

  if (!TEST_SCHEDULE_AT && !TEST_SCHEDULE_DELAY_MINUTES) {
    return {
      scheduledAtIso: new Date(now - 60_000).toISOString(),
      cronScheduledTimeMs: now,
      shouldWait: false,
      waitMs: 0,
      mode: "immediate",
    };
  }

  const explicitDate = TEST_SCHEDULE_AT
    ? new Date(TEST_SCHEDULE_AT)
    : new Date(
        now + Number.parseInt(TEST_SCHEDULE_DELAY_MINUTES ?? "0", 10) * 60_000
      );

  if (Number.isNaN(explicitDate.getTime())) {
    throw new Error(
      "Invalid TEST_SCHEDULE_AT. Expected an ISO datetime, e.g. 2026-03-16T10:30:00+01:00"
    );
  }

  const waitMs = Math.max(0, explicitDate.getTime() - now + 1_500);

  if (TEST_WAIT_FOR_SCHEDULE) {
    return {
      scheduledAtIso: explicitDate.toISOString(),
      cronScheduledTimeMs: explicitDate.getTime() + 1_000,
      shouldWait: waitMs > 0,
      waitMs,
      mode: "real-future",
    };
  }

  return {
    scheduledAtIso: explicitDate.toISOString(),
    cronScheduledTimeMs: explicitDate.getTime() + 1_000,
    shouldWait: false,
    waitMs: 0,
    mode: "simulated-future",
  };
}

export async function waitForScheduledExecution(
  config: ScheduledExecutionConfig
): Promise<void> {
  if (!config.shouldWait || config.waitMs <= 0) {
    return;
  }

  await new Promise((resolve) => setTimeout(resolve, config.waitMs));
}
