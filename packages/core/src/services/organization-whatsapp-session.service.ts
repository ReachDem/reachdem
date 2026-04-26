import { prisma } from "@reachdem/database";
import type { WhatsAppSession } from "@reachdem/shared";

function toSessionDto(session: {
  id: string;
  organizationId: string;
  provider: string;
  instanceName: string;
  status: string;
  phoneNumber: string | null;
  connectedAt: Date | null;
  lastQrCode: string | null;
  lastError: string | null;
  createdAt: Date;
  updatedAt: Date;
}): WhatsAppSession {
  return {
    id: session.id,
    organizationId: session.organizationId,
    provider: "evolution",
    instanceName: session.instanceName,
    status: session.status as WhatsAppSession["status"],
    phoneNumber: session.phoneNumber,
    connectedAt: session.connectedAt,
    lastQrCode: session.lastQrCode,
    lastError: session.lastError,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
  };
}

export class OrganizationWhatsAppSessionService {
  private static readonly DEFAULT_PROVIDER = "evolution";

  static buildInstanceName(organizationId: string) {
    const prefix =
      process.env.EVOLUTION_INSTANCE_PREFIX?.trim() || "staging-reachdem-org";
    return `${prefix}-${organizationId.slice(0, 8)}`;
  }

  static async getByOrganization(
    organizationId: string
  ): Promise<WhatsAppSession | null> {
    const session = await prisma.organizationWhatsAppSession.findUnique({
      where: {
        organizationId_provider: {
          organizationId,
          provider: this.DEFAULT_PROVIDER,
        },
      },
    });

    return session ? toSessionDto(session) : null;
  }

  static async ensureSession(organizationId: string): Promise<WhatsAppSession> {
    const instanceName = this.buildInstanceName(organizationId);
    const session = await prisma.organizationWhatsAppSession.upsert({
      where: {
        organizationId_provider: {
          organizationId,
          provider: this.DEFAULT_PROVIDER,
        },
      },
      update: {},
      create: {
        organizationId,
        provider: this.DEFAULT_PROVIDER,
        instanceName,
        status: "created",
      },
    });

    return toSessionDto(session);
  }

  static async markConnecting(organizationId: string) {
    return this.updateSession(organizationId, {
      status: "connecting",
      lastError: null,
    });
  }

  static async markConnected(organizationId: string, phoneNumber?: string) {
    return this.updateSession(organizationId, {
      status: "connected",
      phoneNumber: phoneNumber ?? null,
      connectedAt: new Date(),
      lastError: null,
      lastQrCode: null,
    });
  }

  static async markDisconnected(organizationId: string, reason?: string) {
    return this.updateSession(organizationId, {
      status: "disconnected",
      lastError: reason ?? null,
    });
  }

  static async markError(organizationId: string, error: string) {
    return this.updateSession(organizationId, {
      status: "error",
      lastError: error,
    });
  }

  static async saveQrCode(organizationId: string, qrCode: string) {
    return this.updateSession(organizationId, {
      status: "connecting",
      lastQrCode: qrCode,
      lastError: null,
    });
  }

  private static async updateSession(
    organizationId: string,
    data: {
      status?:
        | "created"
        | "connecting"
        | "connected"
        | "disconnected"
        | "error";
      phoneNumber?: string | null;
      connectedAt?: Date | null;
      lastQrCode?: string | null;
      lastError?: string | null;
    }
  ): Promise<WhatsAppSession> {
    await this.ensureSession(organizationId);

    const session = await prisma.organizationWhatsAppSession.update({
      where: {
        organizationId_provider: {
          organizationId,
          provider: this.DEFAULT_PROVIDER,
        },
      },
      data,
    });

    return toSessionDto(session);
  }
}
