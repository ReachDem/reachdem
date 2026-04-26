export interface WhatsAppPayload {
  to: string;
  text: string;
  from?: string;
}

export type WhatsAppSendResult =
  | {
      success: true;
      providerMessageId: string;
      durationMs: number;
      httpStatus?: number;
      responseMeta?: Record<string, unknown>;
    }
  | {
      success: false;
      errorCode: string;
      errorMessage: string;
      retryable: boolean;
      durationMs: number;
      httpStatus?: number;
      responseMeta?: Record<string, unknown>;
    };

export interface WhatsAppSessionConnectResult {
  pairingCode: string | null;
  qrCode: string | null;
  attempts: number | null;
}

export interface WhatsAppConnectionStateResult {
  state: string | null;
  phoneNumber: string | null;
}

export interface WhatsAppSender {
  readonly providerName: string;
  sendText(
    instanceName: string,
    payload: WhatsAppPayload
  ): Promise<WhatsAppSendResult>;
  createInstance(input: {
    instanceName: string;
    webhookUrl?: string;
    webhookEvents?: string[];
  }): Promise<void>;
  getConnectionState(
    instanceName: string
  ): Promise<WhatsAppConnectionStateResult>;
  connectInstance(instanceName: string): Promise<WhatsAppSessionConnectResult>;
  configureWebhook(input: {
    instanceName: string;
    webhookUrl: string;
    events: string[];
  }): Promise<void>;
}
