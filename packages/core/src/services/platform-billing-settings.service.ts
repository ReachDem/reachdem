import { Prisma, prisma } from "@reachdem/database";
import {
  type WorkspaceInitialBalanceConfig,
  type WorkspaceInitialBalanceEntry,
  workspaceInitialBalanceConfigSchema,
} from "@reachdem/shared";
import { BillingCatalogService } from "./billing-catalog.service";
import { PaymentCurrencyService } from "./payment-currency.service";

const WORKSPACE_INITIAL_BALANCE_SETTING_KEY = "workspace_initial_balance";

export interface WorkspaceInitialBalanceSettingsSnapshot {
  entries: WorkspaceInitialBalanceEntry[];
  source: "default" | "database";
  updatedAt: Date | null;
  updatedBy: string | null;
}

function normalizeCurrency(currency: string): string {
  return currency.trim().toUpperCase();
}

function normalizeAmountMinor(amountMinor: number): number {
  if (!Number.isFinite(amountMinor)) {
    return 0;
  }

  return Math.max(0, Math.round(amountMinor));
}

function isMissingPlatformSettingTable(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2021"
  );
}

function getDefaultBalanceForCurrency(currency: string): number {
  return PaymentCurrencyService.convertAmountMinor(
    BillingCatalogService.getFreeTrialBalanceMinor(),
    BillingCatalogService.getBalanceCurrency(),
    currency
  );
}

function getSupportedCurrencies(): string[] {
  return PaymentCurrencyService.getSupportedCurrencies();
}

function getDefaultEntries(): WorkspaceInitialBalanceEntry[] {
  return getSupportedCurrencies().map((currency) => ({
    currency,
    amountMinor: getDefaultBalanceForCurrency(currency),
  }));
}

function parseStoredConfig(
  value: unknown
): WorkspaceInitialBalanceConfig | null {
  const parsed = workspaceInitialBalanceConfigSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

function mergeEntries(
  entries: WorkspaceInitialBalanceEntry[]
): WorkspaceInitialBalanceEntry[] {
  const defaults = new Map(
    getDefaultEntries().map((entry) => [entry.currency, entry.amountMinor])
  );
  const configured = new Map<string, number>();

  for (const entry of entries) {
    configured.set(
      normalizeCurrency(entry.currency),
      normalizeAmountMinor(entry.amountMinor)
    );
  }

  return getSupportedCurrencies().map((currency) => ({
    currency,
    amountMinor: configured.get(currency) ?? defaults.get(currency) ?? 0,
  }));
}

export class PlatformBillingSettingsService {
  static async getWorkspaceInitialBalanceSettings(): Promise<WorkspaceInitialBalanceSettingsSnapshot> {
    try {
      const setting = await prisma.platformSetting.findUnique({
        where: {
          key: WORKSPACE_INITIAL_BALANCE_SETTING_KEY,
        },
      });

      const storedConfig = parseStoredConfig(setting?.value);

      return {
        entries: mergeEntries(storedConfig?.entries ?? []),
        source: setting && storedConfig ? "database" : "default",
        updatedAt: setting?.updatedAt ?? null,
        updatedBy: storedConfig?.updatedBy ?? null,
      };
    } catch (error) {
      if (isMissingPlatformSettingTable(error)) {
        return {
          entries: getDefaultEntries(),
          source: "default",
          updatedAt: null,
          updatedBy: null,
        };
      }

      throw error;
    }
  }

  static async getInitialWorkspaceBalanceMinor(
    currency = BillingCatalogService.getBalanceCurrency()
  ): Promise<number> {
    const normalizedCurrency = normalizeCurrency(currency);
    const settings = await this.getWorkspaceInitialBalanceSettings();

    return (
      settings.entries.find((entry) => entry.currency === normalizedCurrency)
        ?.amountMinor ?? getDefaultBalanceForCurrency(normalizedCurrency)
    );
  }

  static async saveWorkspaceInitialBalanceSettings(args: {
    entries: WorkspaceInitialBalanceEntry[];
    updatedBy?: string | null;
  }): Promise<WorkspaceInitialBalanceSettingsSnapshot> {
    const normalizedEntries = mergeEntries(args.entries);
    const payload = {
      entries: normalizedEntries,
      updatedAt: new Date().toISOString(),
      updatedBy: args.updatedBy?.trim() || null,
    } satisfies WorkspaceInitialBalanceConfig;

    try {
      const setting = await prisma.platformSetting.upsert({
        where: {
          key: WORKSPACE_INITIAL_BALANCE_SETTING_KEY,
        },
        create: {
          key: WORKSPACE_INITIAL_BALANCE_SETTING_KEY,
          value: payload as Prisma.InputJsonValue,
        },
        update: {
          value: payload as Prisma.InputJsonValue,
        },
      });

      console.info(
        "[platform-billing-settings] Updated workspace seed balance",
        {
          updatedBy: payload.updatedBy,
          currencies: normalizedEntries.map((entry) => ({
            currency: entry.currency,
            amountMinor: entry.amountMinor,
          })),
        }
      );

      return {
        entries: normalizedEntries,
        source: "database",
        updatedAt: setting.updatedAt,
        updatedBy: payload.updatedBy,
      };
    } catch (error) {
      if (isMissingPlatformSettingTable(error)) {
        throw new Error(
          "Platform settings storage is not ready yet. Create the platform_setting table first."
        );
      }

      throw error;
    }
  }
}
