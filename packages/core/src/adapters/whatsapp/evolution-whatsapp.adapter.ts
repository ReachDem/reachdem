import { z } from "zod";

import type {
  WhatsAppConnectionStateResult,
  WhatsAppPayload,
  WhatsAppSendResult,
  WhatsAppSender,
  WhatsAppSessionConnectResult,
} from "../../ports/whatsapp-sender.port";

const evolutionSendTextResponseSchema = z.object({
  key: z.object({
    id: z.string().min(1),
    remoteJid: z.string().optional(),
    fromMe: z.boolean().optional(),
  }),
  messageTimestamp: z.union([z.string(), z.number()]).optional(),
  status: z.string().optional(),
});

const evolutionConnectResponseSchema = z.object({
  pairingCode: z.string().nullable().optional(),
  code: z.string().nullable().optional(),
  count: z.number().nullable().optional(),
});

const evolutionConnectionStateSchema = z.object({
  instance: z.object({
    instanceName: z.string().min(1),
    state: z.string().min(1),
  }),
});

class EvolutionUnavailableError extends Error {
  constructor(
    message = "Evolution API is unavailable",
    readonly statusCode?: number
  ) {
    super(message);
    this.name = "EvolutionUnavailableError";
  }
}

class EvolutionInvalidResponseError extends Error {
  constructor(message = "Evolution API returned an invalid response") {
    super(message);
    this.name = "EvolutionInvalidResponseError";
  }
}

export class EvolutionWhatsAppAdapter implements WhatsAppSender {
  readonly providerName = "evolution";

  constructor(
    private readonly baseUrl = process.env.EVOLUTION_API_BASE_URL?.trim() ?? "",
    private readonly apiKey = process.env.EVOLUTION_API_KEY?.trim() ?? ""
  ) {
    if (!this.baseUrl) {
      throw new EvolutionUnavailableError("Missing EVOLUTION_API_BASE_URL");
    }

    if (!this.apiKey) {
      throw new EvolutionUnavailableError("Missing EVOLUTION_API_KEY");
    }
  }

  async sendText(
    instanceName: string,
    payload: WhatsAppPayload
  ): Promise<WhatsAppSendResult> {
    const startedAt = Date.now();

    try {
      const response = await this.request(
        `/message/sendText/${encodeURIComponent(instanceName)}`,
        {
          method: "POST",
          body: JSON.stringify({
            number: payload.to,
            text: payload.text,
          }),
        },
        evolutionSendTextResponseSchema
      );

      return {
        success: true,
        providerMessageId: response.key.id,
        durationMs: Date.now() - startedAt,
        httpStatus: 201,
        responseMeta: {
          remoteJid: response.key.remoteJid ?? null,
          status: response.status ?? null,
        },
      };
    } catch (error: any) {
      return {
        success: false,
        errorCode:
          error instanceof EvolutionInvalidResponseError
            ? "invalid_response"
            : "provider_error",
        errorMessage: error?.message ?? "Evolution sendText failed",
        retryable: error instanceof EvolutionUnavailableError,
        durationMs: Date.now() - startedAt,
        responseMeta: {
          errorName: error?.name ?? null,
        },
      };
    }
  }

  async createInstance(input: {
    instanceName: string;
    webhookUrl?: string;
    webhookEvents?: string[];
  }): Promise<void> {
    await this.request("/instance/create", {
      method: "POST",
      body: JSON.stringify({
        instanceName: input.instanceName,
        integration: "WHATSAPP-BAILEYS",
        qrcode: true,
        rejectCall: true,
        groupsIgnore: true,
        alwaysOnline: false,
        readMessages: false,
        readStatus: false,
        syncFullHistory: false,
        ...(input.webhookUrl
          ? {
              webhook: {
                url: input.webhookUrl,
                byEvents: false,
                base64: false,
                events: input.webhookEvents ?? [],
              },
            }
          : {}),
      }),
    });
  }

  async instanceExists(instanceName: string): Promise<boolean> {
    try {
      const payload = await this.request(
        `/instance/fetchInstances?instanceName=${encodeURIComponent(instanceName)}`,
        {
          method: "GET",
        }
      );
      const instances = this.extractFetchInstances(payload);
      return instances.some((name) => name === instanceName);
    } catch (error) {
      if (
        error instanceof EvolutionUnavailableError &&
        error.statusCode === 404
      ) {
        return false;
      }

      throw error;
    }
  }

  private extractFetchInstances(payload: unknown): string[] {
    const unwrap = (value: unknown): unknown[] => {
      if (Array.isArray(value)) {
        return value;
      }

      if (value && typeof value === "object") {
        const record = value as Record<string, unknown>;
        if (Array.isArray(record.response)) {
          return record.response;
        }
        if (Array.isArray(record.instances)) {
          return record.instances;
        }
      }

      return [];
    };

    const items = unwrap(payload);

    return items
      .map((item) => {
        if (!item || typeof item !== "object") {
          return null;
        }

        const record = item as Record<string, unknown>;

        if (
          record.instance &&
          typeof record.instance === "object" &&
          typeof (record.instance as Record<string, unknown>).instanceName ===
            "string"
        ) {
          return (record.instance as Record<string, unknown>)
            .instanceName as string;
        }

        if (typeof record.instanceName === "string") {
          return record.instanceName;
        }

        if (record.name && typeof record.name === "string") {
          return record.name;
        }

        return null;
      })
      .filter((value): value is string => Boolean(value));
  }

  async connectInstance(
    instanceName: string
  ): Promise<WhatsAppSessionConnectResult> {
    const response = await this.request(
      `/instance/connect/${encodeURIComponent(instanceName)}`,
      {
        method: "GET",
      },
      evolutionConnectResponseSchema
    );

    return {
      pairingCode: response.pairingCode ?? null,
      qrCode: response.code ?? null,
      attempts: response.count ?? null,
    };
  }

  async getConnectionState(
    instanceName: string
  ): Promise<WhatsAppConnectionStateResult> {
    const response = await this.request(
      `/instance/connectionState/${encodeURIComponent(instanceName)}`,
      {
        method: "GET",
      },
      evolutionConnectionStateSchema
    );

    return {
      state: response.instance.state ?? null,
      phoneNumber: null,
    };
  }

  async configureWebhook(input: {
    instanceName: string;
    webhookUrl: string;
    events: string[];
  }): Promise<void> {
    try {
      await this.request(
        `/webhook/set/${encodeURIComponent(input.instanceName)}`,
        {
          method: "POST",
          body: JSON.stringify({
            webhook: {
              enabled: true,
              url: input.webhookUrl,
              byEvents: false,
              base64: false,
              events: input.events,
            },
          }),
        }
      );
    } catch (error) {
      if (
        error instanceof EvolutionUnavailableError &&
        error.statusCode === 404
      ) {
        return;
      }

      throw error;
    }
  }

  private async request<T>(
    path: string,
    init: RequestInit,
    schema?: z.ZodSchema<T>
  ): Promise<T> {
    let response: Response;

    try {
      response = await fetch(`${this.baseUrl}${path}`, {
        ...init,
        headers: {
          apikey: this.apiKey,
          ...(init.body ? { "Content-Type": "application/json" } : {}),
          ...init.headers,
        },
        signal: AbortSignal.timeout(10_000),
      });
    } catch (error: any) {
      throw new EvolutionUnavailableError(error?.message);
    }

    if (!response.ok) {
      let errorDetails = "";

      try {
        const payload = await response.clone().json();
        errorDetails = `: ${JSON.stringify(payload)}`;
      } catch {
        try {
          const text = await response.text();
          if (text) {
            errorDetails = `: ${text}`;
          }
        } catch {
          errorDetails = "";
        }
      }

      throw new EvolutionUnavailableError(
        `Evolution API request failed with HTTP ${response.status}${errorDetails}`,
        response.status
      );
    }

    const payload = (await response.json()) as unknown;
    if (!schema) {
      return payload as T;
    }

    const parsed = schema.safeParse(payload);
    if (!parsed.success) {
      throw new EvolutionInvalidResponseError(parsed.error.message);
    }

    return parsed.data;
  }
}
