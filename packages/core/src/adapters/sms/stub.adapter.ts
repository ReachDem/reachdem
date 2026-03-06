import type {
  SmsSender,
  SmsPayload,
  SmsResult,
} from "../../ports/sms-sender.port";

/**
 * Stub adapter for unit/integration tests.
 * Behaviour is fully configurable at construction time.
 */
export class StubAdapter implements SmsSender {
  readonly providerName = "stub";
  readonly calls: SmsPayload[] = [];

  constructor(
    private readonly behaviour: SmsResult = {
      success: true,
      providerMessageId: "stub_msg_001",
      durationMs: 42,
    }
  ) {}

  async send(payload: SmsPayload): Promise<SmsResult> {
    this.calls.push(payload);
    return this.behaviour;
  }
}
