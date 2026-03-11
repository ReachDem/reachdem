import { prisma } from "@reachdem/database";
import type { SmsSender, SmsPayload } from "../ports/sms-sender.port";
import { ActivityLogger } from "./activity-logger.service";
import { TwilioAdapter } from "../adapters/sms/twilio.adapter";
import { InfobipAdapter } from "../adapters/sms/infobip.adapter";
import { LmtAdapter } from "../adapters/sms/lmt.adapter";
import { StubAdapter } from "../adapters/sms/stub.adapter";
import type { SmsProvider } from "@reachdem/database";

interface SendWithFallbackResult {
  success: boolean;
  providerName: string;
  providerMessageId?: string;
  errorCode?: string;
  errorMessage?: string;
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
    const adapters = await buildAdapterChain(organizationId);
    let lastErrorCode = "unknown";
    let lastErrorMessage = "Unknown error";
    let attemptNo = 0;

    for (let i = 0; i < adapters.length; i++) {
      const adapter = adapters[i];
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
            fromProvider: adapters[i - 1].providerName,
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

      const result = await adapter.send(payload);

      if (result.success) {
        await ActivityLogger.log({
          organizationId,
          correlationId,
          category: "sms",
          action: "send_success",
          provider: adapter.providerName,
          severity: "info",
          status: "success",
          durationMs: result.durationMs,
          meta: { providerMessageId: result.providerMessageId, attemptNo },
        });

        return {
          success: true,
          providerName: adapter.providerName,
          providerMessageId: result.providerMessageId,
        };
      }

      // Failed — log it
      lastErrorCode = result.errorCode;
      lastErrorMessage = result.errorMessage;

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
        },
      });

      // If this is a final error (invalid number, opt-out), stop immediately
      if (!result.retryable) {
        break;
      }
    }

    return {
      success: false,
      providerName: adapters[adapters.length - 1]?.providerName ?? "none",
      errorCode: lastErrorCode,
      errorMessage: lastErrorMessage,
    };
  }
}
