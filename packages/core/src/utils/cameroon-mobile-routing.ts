import type { SmsPayload } from "../ports/sms-sender.port";
import type { SmsProvider } from "@reachdem/database";

export interface RoutedSmsProvider {
  provider: SmsProvider;
  payload: SmsPayload;
}

export function normalizeNumber(phone: string) {
  return phone.replace(/\D/g, "").replace(/^237/, "");
}

export function isValidMobileCM(phone: string) {
  const normalized = normalizeNumber(phone);
  return /^6\d{8}$/.test(normalized);
}

export function isOrange(phone: string) {
  const normalized = normalizeNumber(phone);
  if (!isValidMobileCM(normalized)) return false;

  const prefix = normalized.substring(0, 3);
  return (
    [
      "655",
      "656",
      "657",
      "658",
      "659",
      "686",
      "687",
      "688",
      "689",
      "640",
    ].includes(prefix) || /^69\d{7}$/.test(normalized)
  );
}

export function isMTN(phone: string) {
  const normalized = normalizeNumber(phone);
  if (!isValidMobileCM(normalized)) return false;

  const prefix = normalized.substring(0, 3);
  return (
    ["650", "651", "652", "653", "654", "680", "681", "682", "683"].includes(
      prefix
    ) || /^67\d{7}$/.test(normalized)
  );
}

export function getCameroonProviderRoute(
  payload: SmsPayload
): RoutedSmsProvider[] | null {
  if (!isValidMobileCM(payload.to)) {
    return null;
  }

  if (isMTN(payload.to)) {
    return [
      {
        provider: "lmt",
        payload: {
          ...payload,
          from: "ReachDem",
        },
      },
      {
        provider: "mboaSms",
        payload: {
          ...payload,
          from: "infos",
        },
      },
    ];
  }

  if (isOrange(payload.to)) {
    return [
      {
        provider: "avlytext",
        payload,
      },
      {
        provider: "mboaSms",
        payload,
      },
    ];
  }

  return null;
}
