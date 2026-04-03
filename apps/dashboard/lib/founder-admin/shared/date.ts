import type {
  FounderAdminDateRange,
  FounderAdminOpsChannel,
} from "@/lib/founder-admin/types";

const DAY_IN_MS = 24 * 60 * 60 * 1000;

export function addDays(input: Date, amount: number): Date {
  return new Date(input.getTime() + amount * DAY_IN_MS);
}

export function addMinutes(input: Date, amount: number): Date {
  return new Date(input.getTime() + amount * 60 * 1000);
}

export function startOfDay(input: Date): Date {
  return new Date(
    Date.UTC(
      input.getUTCFullYear(),
      input.getUTCMonth(),
      input.getUTCDate(),
      0,
      0,
      0,
      0
    )
  );
}

export function endOfDay(input: Date): Date {
  return new Date(
    Date.UTC(
      input.getUTCFullYear(),
      input.getUTCMonth(),
      input.getUTCDate(),
      23,
      59,
      59,
      999
    )
  );
}

export function createTrailingRange(
  end: Date,
  days: number,
  label?: string
): FounderAdminDateRange {
  const rangeEnd = endOfDay(end);
  const rangeStart = startOfDay(addDays(rangeEnd, -(days - 1)));

  return {
    start: rangeStart,
    end: rangeEnd,
    label,
  };
}

export function createCurrentMonthRange(asOf: Date): FounderAdminDateRange {
  const start = new Date(
    Date.UTC(asOf.getUTCFullYear(), asOf.getUTCMonth(), 1, 0, 0, 0, 0)
  );

  return {
    start,
    end: endOfDay(asOf),
    label: "Current month",
  };
}

export function isWithinRange(
  input: Date,
  range: FounderAdminDateRange
): boolean {
  return input >= range.start && input <= range.end;
}

export function formatDateKey(input: Date): string {
  return startOfDay(input).toISOString().slice(0, 10);
}

export function countByChannel<T extends { channel: FounderAdminOpsChannel }>(
  rows: T[]
): Record<FounderAdminOpsChannel, number> {
  const initial: Record<FounderAdminOpsChannel, number> = {
    sms: 0,
    email: 0,
    push: 0,
    whatsapp: 0,
  };

  for (const row of rows) {
    initial[row.channel] += 1;
  }

  return initial;
}

export function unique<T>(values: T[]): T[] {
  return Array.from(new Set(values));
}
