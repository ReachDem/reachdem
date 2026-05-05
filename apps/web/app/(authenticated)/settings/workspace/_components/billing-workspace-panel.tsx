"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, Gift, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type {
  PaymentSessionDetailsResponse,
  WorkspaceBillingSummary,
} from "@reachdem/shared";
import {
  convertMinorToMajor,
  getCurrencyMinorExponent,
} from "@reachdem/shared";
import { Button } from "@/components/ui/button";
import {
  SettingsCard,
  SettingsCardContent,
  SettingsCardDescription,
  SettingsCardHeader,
  SettingsCardTitle,
} from "@/components/shared/settings-card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { CreditTopUpDialog } from "./credit-top-up-dialog";

interface BillingWorkspacePanelProps {
  billing: WorkspaceBillingSummary | null;
}

function formatMoney(amountMinor: number, currency: string): string {
  const exponent = getCurrencyMinorExponent(currency);
  const amountMajor = convertMinorToMajor(amountMinor, currency);

  return `${new Intl.NumberFormat("en-US", {
    minimumFractionDigits: exponent === 0 ? 0 : 2,
    maximumFractionDigits: exponent === 0 ? 0 : 2,
  }).format(amountMajor)} ${currency}`;
}

function extractPaymentSessionIdFromReference(
  reference: string | null
): string | null {
  if (!reference || !reference.startsWith("pay")) {
    return null;
  }

  const rawId = reference.slice(3);
  if (!rawId) {
    return null;
  }

  if (rawId.length === 32) {
    return `${rawId.slice(0, 8)}-${rawId.slice(8, 12)}-${rawId.slice(12, 16)}-${rawId.slice(16, 20)}-${rawId.slice(20)}`;
  }

  return rawId || null;
}

export function BillingWorkspacePanel({ billing }: BillingWorkspacePanelProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const handledSessionRef = useRef<string | null>(null);
  const [isNavigating, startTransition] = useTransition();
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [paymentFeedback, setPaymentFeedback] = useState<{
    tone: "neutral" | "success" | "danger";
    title: string;
    description: string;
  } | null>(null);

  const paymentSessionId =
    searchParams.get("payment_session_id") ??
    extractPaymentSessionIdFromReference(searchParams.get("tx_ref"));
  const provider = searchParams.get("provider") ?? undefined;
  const providerReference = searchParams.get("tx_ref") ?? undefined;
  const providerTransactionId = searchParams.get("transaction_id") ?? undefined;
  const returnedStatus = searchParams.get("status") ?? undefined;
  const cancelled = searchParams.get("cancelled") === "true";

  useEffect(() => {
    if (!paymentSessionId || handledSessionRef.current === paymentSessionId) {
      return;
    }

    handledSessionRef.current = paymentSessionId;

    const reconcile = async () => {
      try {
        const response = await fetch(
          `/api/v1/payments/session/${paymentSessionId}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              provider,
              providerReference,
              providerTransactionId,
              status: returnedStatus,
              cancelled,
            }),
          }
        );

        if (!response.ok) {
          throw new Error("Unable to confirm payment status");
        }

        const payload =
          (await response.json()) as PaymentSessionDetailsResponse;
        const status = payload.session.status;

        if (status === "succeeded") {
          setPaymentFeedback({
            tone: "success",
            title: "Payment confirmed",
            description:
              "Your workspace has been updated and the new balance or plan is now active.",
          });
          toast.success("Payment confirmed successfully.");
        } else if (status === "failed") {
          setPaymentFeedback({
            tone: "danger",
            title: "Payment failed",
            description:
              "The transaction did not complete. You can retry the payment from this screen.",
          });
          toast.error("The payment could not be confirmed.");
        } else if (status === "cancelled") {
          setPaymentFeedback({
            tone: "neutral",
            title: "Payment cancelled",
            description:
              "The checkout was cancelled before confirmation. No charge was applied on ReachDem.",
          });
          toast.info("Payment cancelled.");
        } else {
          setPaymentFeedback({
            tone: "neutral",
            title: "Payment processing",
            description:
              "We are still waiting for the final provider confirmation. Refresh in a moment if this persists.",
          });
          toast.info("Payment is still being processed.");
        }

        startTransition(() => {
          router.replace("/settings/workspace");
          router.refresh();
        });
      } catch {
        handledSessionRef.current = null;
        toast.error("We could not reconcile the payment yet.");
      }
    };

    void reconcile();
  }, [
    cancelled,
    paymentSessionId,
    provider,
    providerReference,
    providerTransactionId,
    returnedStatus,
    router,
  ]);

  const createCheckoutSession = async (plan: {
    code: string;
    currency: string;
  }) => {
    setBusyKey(plan.code);
    try {
      const res = await fetch("/api/v1/payments/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "subscription",
          planCode: plan.code,
          currency: plan.currency,
        }),
      });
      if (!res.ok) {
        throw new Error("Failed to initiate checkout");
      }
      const data = (await res.json()) as { checkoutUrl?: string | null };
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        throw new Error("No checkout URL returned");
      }
    } catch {
      toast.error("Unable to start checkout. Please try again.");
      setBusyKey(null);
    }
  };

  if (!billing) {
    return (
      <SettingsCard>
        <SettingsCardHeader>
          <SettingsCardTitle>Billing</SettingsCardTitle>
          <SettingsCardDescription>
            Unable to load workspace billing details right now.
          </SettingsCardDescription>
        </SettingsCardHeader>
      </SettingsCard>
    );
  }

  const verificationLabel =
    billing.workspaceVerificationStatus === "verified"
      ? "Verified"
      : billing.workspaceVerificationStatus.replace(/_/g, " ");
  const standardPlans = billing.availablePlans.filter(
    (plan) => !plan.contactSales && plan.priceMinor != null
  );
  const customPlan = billing.availablePlans.find(
    (plan) => plan.contactSales || plan.priceMinor == null
  );

  return (
    <div className="space-y-8">
      <SettingsCard>
        <SettingsCardHeader>
          <SettingsCardTitle>Plan</SettingsCardTitle>
          <SettingsCardDescription>
            Manage your current subscription and switch plans without leaving
            the workspace.
          </SettingsCardDescription>
        </SettingsCardHeader>
        <SettingsCardContent className="space-y-6 pt-6">
          {paymentFeedback ? (
            <div
              className={
                paymentFeedback.tone === "success"
                  ? "rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4"
                  : paymentFeedback.tone === "danger"
                    ? "rounded-lg border border-red-500/30 bg-red-500/10 p-4"
                    : "border-border bg-muted/20 rounded-lg border p-4"
              }
            >
              <p className="text-sm font-semibold">{paymentFeedback.title}</p>
              <p className="text-muted-foreground mt-1 text-sm">
                {paymentFeedback.description}
              </p>
            </div>
          ) : null}

          <div className="bg-muted/20 grid gap-3 rounded-lg border p-4 md:grid-cols-3">
            <div className="bg-background/80 rounded-md border p-3">
              <p className="text-sm font-medium">Current Plan</p>
              <p className="text-muted-foreground mt-1 text-sm capitalize">
                {billing.planCode}
              </p>
            </div>
            <div className="bg-background/80 rounded-md border p-3">
              <p className="text-sm font-medium">Workspace Verification</p>
              <p className="text-muted-foreground mt-1 text-sm capitalize">
                {verificationLabel}
              </p>
            </div>
            <div className="bg-background/80 rounded-md border p-3">
              <p className="text-sm font-medium">SMS Sender ID</p>
              <p className="text-muted-foreground mt-1 text-sm">
                {billing.senderId ?? "Not assigned"}
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {standardPlans.map((plan) => {
              const isCurrentPlan = billing.planCode === plan.code;

              return (
                <div
                  key={plan.code}
                  className={
                    plan.highlighted
                      ? "rounded-xl border border-[#f58220]/40 bg-[#f58220]/5 p-5 shadow-sm"
                      : "bg-card rounded-xl border p-5"
                  }
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="text-lg font-semibold">{plan.name}</h3>
                      {isCurrentPlan ? (
                        <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-700">
                          Current
                        </span>
                      ) : null}
                    </div>
                    <p className="text-muted-foreground text-sm">
                      {plan.description}
                    </p>
                    <p className="text-2xl font-semibold">
                      {plan.priceMinor == null
                        ? "Custom"
                        : formatMoney(plan.priceMinor, plan.currency)}
                      <span className="text-muted-foreground ml-1 text-sm font-normal">
                        {plan.interval === "monthly" ? "/month" : ""}
                      </span>
                    </p>
                  </div>

                  <div className="mt-5 space-y-2">
                    {plan.features.map((feature) => (
                      <div
                        key={feature}
                        className="flex items-start gap-2 text-sm"
                      >
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#f58220]" />
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-6">
                    <Button
                      className="w-full bg-[#f58220] text-white hover:bg-[#d6701a]"
                      disabled={
                        isCurrentPlan || isNavigating || busyKey === plan.code
                      }
                      onClick={() => {
                        if (!isCurrentPlan && plan.priceMinor != null) {
                          void createCheckoutSession({
                            code: plan.code,
                            currency: plan.currency,
                          });
                        }
                      }}
                    >
                      {busyKey === plan.code ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Redirecting…
                        </>
                      ) : isCurrentPlan ? (
                        "Current plan"
                      ) : (
                        `Upgrade to ${plan.name}`
                      )}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>

          {customPlan ? (
            <div className="bg-muted/20 flex flex-col items-start justify-between gap-4 rounded-xl border p-5 md:flex-row md:items-center">
              <div className="space-y-1">
                <p className="text-base font-semibold">
                  Want a customized solution?
                </p>
                <p className="text-muted-foreground text-sm">
                  Talk to sales for custom integrations, compliance needs, and
                  rollout support.
                </p>
              </div>
              <Button asChild variant="outline" className="shrink-0">
                <a
                  href="https://reachdem.cc/pricing"
                  target="_blank"
                  rel="noreferrer"
                >
                  Talk to sales
                </a>
              </Button>
            </div>
          ) : null}
        </SettingsCardContent>
      </SettingsCard>

      <SettingsCard>
        <SettingsCardHeader>
          <SettingsCardTitle>Shared Balance</SettingsCardTitle>
          <SettingsCardDescription>
            SMS and email both deduct from the same wallet. The wallet is kept
            in {billing.balanceCurrency}, and every top up made in another
            currency is converted into that base balance.
          </SettingsCardDescription>
        </SettingsCardHeader>
        <SettingsCardContent className="space-y-6 pt-6">
          <div className="flex flex-col items-start justify-between rounded-xl border border-white/5 bg-[#121212] p-6 shadow-sm md:flex-row md:items-center">
            <div className="mb-4 md:mb-0">
              <p className="text-sm font-semibold tracking-wider text-neutral-400 uppercase">
                Balance
              </p>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="text-4xl font-bold tracking-tight text-white">
                  {formatMoney(billing.balanceMinor, billing.balanceCurrency)}
                </span>
              </div>
              <p className="mt-2 max-w-md text-sm text-neutral-400">
                Every message reduces this same balance. SMS and email have
                different prices, but they always deduct from the same{" "}
                {billing.balanceCurrency} wallet.
              </p>
            </div>

            <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
              <Button
                variant="outline"
                className="items-center gap-2 border-white/10 bg-transparent px-5 text-white transition-colors hover:bg-white/5 hover:text-white"
              >
                <Gift className="h-4 w-4" />
                Redeem code
              </Button>
              <Dialog>
                <DialogTrigger asChild>
                  <Button className="items-center gap-2 bg-white px-6 font-medium text-black transition-colors hover:bg-neutral-200">
                    Top up
                  </Button>
                </DialogTrigger>
                <DialogContent className="flex max-h-[90vh] max-w-md flex-col overflow-hidden border-neutral-800 bg-[#121212] p-0 text-white">
                  <DialogHeader className="shrink-0 border-b border-white/5 p-6 pb-2">
                    <DialogTitle className="text-xl">
                      Top Up Balance
                    </DialogTitle>
                    <DialogDescription className="mt-2 text-sm leading-relaxed text-neutral-400">
                      Enter an amount in your preferred currency. We will
                      convert it into {billing.balanceCurrency} before adding it
                      to your shared balance for SMS and email usage.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="overflow-y-auto p-6 pt-4 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-neutral-800 hover:[&::-webkit-scrollbar-thumb]:bg-neutral-700 [&::-webkit-scrollbar-track]:bg-transparent">
                    <CreditTopUpDialog billing={billing} />
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          <div className="bg-muted/10 mt-4 grid gap-3 rounded-lg border p-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="bg-background/80 rounded-md border p-3">
              <p className="text-sm font-medium">Reference Currency</p>
              <p className="text-muted-foreground mt-1 text-sm">
                {billing.balanceCurrency}. All recharges are converted into this
                wallet before deduction.
              </p>
            </div>
            <div className="bg-background/80 rounded-md border p-3">
              <p className="text-sm font-medium">SMS Deduction</p>
              <p className="text-muted-foreground mt-1 text-sm">
                {formatMoney(
                  billing.usagePricing.smsUnitAmountMinor,
                  billing.usagePricing.currency
                )}{" "}
                per SMS
              </p>
            </div>
            <div className="bg-background/80 rounded-md border p-3">
              <p className="text-sm font-medium">Email Deduction</p>
              <p className="text-muted-foreground mt-1 text-sm">
                {formatMoney(
                  billing.usagePricing.emailUnitAmountMinor,
                  billing.usagePricing.currency
                )}{" "}
                per email
              </p>
            </div>
            <div className="bg-background/80 rounded-md border p-3">
              <p className="text-sm font-medium">Free Plan Before Top Up</p>
              <p className="text-muted-foreground mt-1 text-sm">
                {billing.hasSuccessfulTopUp
                  ? "Unlocked. The initial SMS cap has been removed."
                  : `${billing.smsQuotaRemaining ?? billing.usagePricing.freeTrialSmsLimit}/${billing.usagePricing.freeTrialSmsLimit} SMS left before your first top up.`}
              </p>
            </div>
          </div>
        </SettingsCardContent>
      </SettingsCard>
    </div>
  );
}
