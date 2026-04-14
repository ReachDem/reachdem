import { prisma } from "@reachdem/database";
import type { SmsSender, SmsPayload } from "../ports/sms-sender.port";
import { ActivityLogger } from "./activity-logger.service";
import { TwilioAdapter } from "../adapters/sms/twilio.adapter";
import { InfobipAdapter } from "../adapters/sms/infobip.adapter";
import { LmtAdapter } from "../adapters/sms/lmt.adapter";
import { AvlytextAdapter } from "../adapters/sms/avlytext.adapter";
import { MboaSmsAdapter } from "../adapters/sms/mboa-sms.adapter";
import { StubAdapter } from "../adapters/sms/stub.adapter";
import type { SmsProvider } from "@reachdem/database";
import { getCameroonProviderRoute } from "../utils/cameroon-mobile-routing";
import { redactMeta } from "../utils/pii-scrubber";

interface SendWithFallbackResult {
  success: boolean;
  providerName: string;
  senderUsed: string;
  attempts: Array<{
    providerName: string;
    senderUsed: string;
    durationMs: number;
    success: boolean;
    providerMessageId?: string;
    errorCode?: string;
    errorMessage?: string;
    retryable?: boolean;
    httpStatus?: number;
    responseMeta?: Record<string, unknown>;
  }>;
  providerMessageId?: string;
  errorCode?: string;
  errorMessage?: string;
  httpStatus?: number;
  responseMeta?: Record<string, unknown>;
}

interface AdapterExecutionPlan {
  adapter: SmsSender;
  payload: SmsPayload;
}

/**
 * Builds a concrete SmsSender adapter from a provider name.
 * Credentials are pulled from environment variables.
 * For workspace-level credentials, this factory can be extended.
 */
function buildAdapter(provider: SmsProvider): SmsSender {
  switch (provider) {
    case "twilio":
      return new TwilioAdapter(
        process.env.TWILIO_ACCOUNT_SID!,
        process.env.TWILIO_AUTH_TOKEN!
      );
    case "infobip":
      return new InfobipAdapter(
        process.env.INFOBIP_API_KEY!,
        process.env.INFOBIP_BASE_URL!
      );
    case "lmt":
      return new LmtAdapter(process.env.LMT_API_KEY!, process.env.LMT_SECRET!);
    case "mboaSms":
      return new MboaSmsAdapter(
        process.env.MBOA_SMS_USERID ?? process.env.NEXT_PUBLIC_MBOA_SMS_USERID!,
        process.env.MBOA_SMS_API_PASSWORD ??
          process.env.NEXT_PUBLIC_MBOA_SMS_API_PASSWORD!
      );
    case "avlytext":
      return new AvlytextAdapter(process.env.AVLYTEXT_API_KEY!);
    case "stub":
      return new StubAdapter();
    default: {
      // Exhaustiveness check
      const _: never = provider;
      throw new Error(`Unknown SMS provider: ${provider}`);
    }
  }
}

/**
 * Loads the workspace SMS config from DB and builds an ordered adapter chain.
 */
async function buildAdapterChain(organizationId: string): Promise<SmsSender[]> {
  const config = await prisma.workspaceSmsConfig.findUnique({
    where: { organizationId },
  });

  if (!config) {
    throw new Error(
      `No SMS provider configured for workspace ${organizationId}`
    );
  }

  const providers = [config.primaryProvider, ...config.secondaryProviders];
  return providers.map(buildAdapter);
}

async function buildExecutionPlan(
  organizationId: string,
  payload: SmsPayload
): Promise<AdapterExecutionPlan[]> {
  const cameroonRoute = getCameroonProviderRoute(payload);

  if (cameroonRoute) {
    return cameroonRoute.map((route) => ({
      adapter: buildAdapter(route.provider),
      payload: route.payload,
    }));
  }

  const adapters = await buildAdapterChain(organizationId);
  return adapters.map((adapter) => ({
    adapter,
    payload,
  }));
}

/**
 * Tries each adapter in order until one succeeds.
 * - Logs an ActivityEvent per attempt (send_attempt, send_success, send_failed, fallback).
 * - Stops immediately on a "final" error (invalid number, opt-out, etc.).
 */
export class CompositeSmseSender {
  /**
   * @param organizationId - Workspace ID (used to load config + log events)
   * @param correlationId  - Stable ID linking all events for this send operation
   * @param payload        - The SMS content to send
   */
  static async send(
    organizationId: string,
    correlationId: string,
    payload: SmsPayload
  ): Promise<SendWithFallbackResult> {
    const plan = await buildExecutionPlan(organizationId, payload);
    let lastErrorCode = "unknown";
    let lastErrorMessage = "Unknown error";
    const attempts: SendWithFallbackResult["attempts"] = [];
    let attemptNo = 0;

    for (let i = 0; i < plan.length; i++) {
      const current = plan[i];
      const adapter = current.adapter;
      attemptNo++;

      // Log a fallback event when switching providers
      if (i > 0) {
        await ActivityLogger.log({
          organizationId,
          correlationId,
          category: "sms",
          action: "fallback",
          provider: adapter.providerName,
          severity: "warn",
          status: "pending",
          meta: {
            fromProvider: plan[i - 1].adapter.providerName,
            toProvider: adapter.providerName,
            attemptNo,
          },
        });
      }

      // Log the send attempt
      await ActivityLogger.log({
        organizationId,
        correlationId,
        category: "sms",
        action: "send_attempt",
        provider: adapter.providerName,
        severity: "info",
        status: "pending",
        meta: { attemptNo },
      });

      const result = await adapter.send(current.payload);
      const safeResponseMeta = result.responseMeta
        ? redactMeta(result.responseMeta)
        : null;

      console.log("[SMS Provider] Response", {
        provider: adapter.providerName,
        attemptNo,
        success: result.success,
        retryable: result.success ? null : result.retryable,
        httpStatus: result.httpStatus ?? null,
        providerMessageId: result.success
          ? result.providerMessageId
          : undefined,
        errorCode: result.success ? null : result.errorCode,
        errorMessage: result.success ? null : result.errorMessage,
        responseMeta: safeResponseMeta,
      });

      if (result.success) {
        attempts.push({
          providerName: adapter.providerName,
          senderUsed: current.payload.from,
          durationMs: result.durationMs,
          success: true,
          providerMessageId: result.providerMessageId,
          httpStatus: result.httpStatus,
          responseMeta: safeResponseMeta ?? undefined,
        });
        await ActivityLogger.log({
          organizationId,
          correlationId,
          category: "sms",
          action: "send_success",
          provider: adapter.providerName,
          severity: "info",
          status: "success",
          durationMs: result.durationMs,
          meta: {
            providerMessageId: result.providerMessageId,
            attemptNo,
            httpStatus: result.httpStatus ?? null,
            responseMeta: safeResponseMeta,
          },
        });

        return {
          success: true,
          providerName: adapter.providerName,
          senderUsed: current.payload.from,
          attempts,
          providerMessageId: result.providerMessageId,
          httpStatus: result.httpStatus,
          responseMeta: safeResponseMeta ?? undefined,
        };
      }

      // Failed — log it
      lastErrorCode = result.errorCode;
      lastErrorMessage = result.errorMessage;
      attempts.push({
        providerName: adapter.providerName,
        senderUsed: current.payload.from,
        durationMs: result.durationMs,
        success: false,
        errorCode: result.errorCode,
        errorMessage: result.errorMessage,
        retryable: result.retryable,
        httpStatus: result.httpStatus,
        responseMeta: safeResponseMeta ?? undefined,
      });

      await ActivityLogger.log({
        organizationId,
        correlationId,
        category: "sms",
        action: "send_failed",
        provider: adapter.providerName,
        severity: result.retryable ? "warn" : "error",
        status: "failed",
        durationMs: result.durationMs,
        meta: {
          errorCode: result.errorCode,
          errorMessage: result.errorMessage,
          retryable: result.retryable,
          attemptNo,
          httpStatus: result.httpStatus ?? null,
          responseMeta: safeResponseMeta,
        },
      });

      // If this is a final error (invalid number, opt-out), stop immediately
      if (!result.retryable) {
        break;
      }
    }

    return {
      success: false,
      providerName: plan[plan.length - 1]?.adapter.providerName ?? "none",
      senderUsed: plan[plan.length - 1]?.payload.from ?? payload.from,
      attempts,
      errorCode: lastErrorCode,
      errorMessage: lastErrorMessage,
      httpStatus: attempts.at(-1)?.httpStatus,
      responseMeta: attempts.at(-1)?.responseMeta,
    };
  }
}
