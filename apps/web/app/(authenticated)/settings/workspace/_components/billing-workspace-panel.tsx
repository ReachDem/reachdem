"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type {
  CreditPricing,
  PaymentSessionDetailsResponse,
  WorkspaceBillingSummary,
} from "@reachdem/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  SettingsCard,
  SettingsCardContent,
  SettingsCardDescription,
  SettingsCardHeader,
  SettingsCardTitle,
} from "@/components/settings-card";

interface BillingWorkspacePanelProps {
  billing: WorkspaceBillingSummary | null;
}

function formatMoney(amountMinor: number, currency: string): string {
  return `${new Intl.NumberFormat("fr-CM").format(amountMinor)} ${currency}`;
}

function getApplicableTier(pricing: CreditPricing, quantity: number) {
  return [...pricing.tiers]
    .sort((left, right) => right.minimumQuantity - left.minimumQuantity)
    .find((tier) => quantity >= tier.minimumQuantity);
}

function extractPaymentSessionIdFromReference(
  reference: string | null
): string | null {
  if (!reference || !reference.startsWith("pay_")) {
    return null;
  }

  return reference.slice(4) || null;
}

export function BillingWorkspacePanel({ billing }: BillingWorkspacePanelProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const handledSessionRef = useRef<string | null>(null);
  const [isNavigating, startTransition] = useTransition();
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [creditsQuantity, setCreditsQuantity] = useState(
    billing?.creditPricing.suggestedQuantities[0] ??
      billing?.creditPricing.minimumQuantity ??
      250
  );
  const [paymentFeedback, setPaymentFeedback] = useState<{
    tone: "neutral" | "success" | "danger";
    title: string;
    description: string;
  } | null>(null);

  useEffect(() => {
    if (!billing) {
      return;
    }

    if (creditsQuantity < billing.creditPricing.minimumQuantity) {
      setCreditsQuantity(billing.creditPricing.minimumQuantity);
    }
  }, [billing, creditsQuantity]);

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
              "Your workspace has been updated and the purchased credits or plan are now active.",
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
  const pricingTier =
    getApplicableTier(billing.creditPricing, creditsQuantity) ??
    billing.creditPricing.tiers[0];
  const topUpTotal = pricingTier.unitAmountMinor * creditsQuantity;

  const createCheckoutSession = async (payload: {
    kind: "subscription" | "creditPurchase";
    currency: string;
    planCode?: string;
    creditsQuantity?: number;
    busyKey: string;
  }) => {
    try {
      setBusyKey(payload.busyKey);

      const response = await fetch("/api/v1/payments/session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          kind: payload.kind,
          currency: payload.currency,
          planCode: payload.planCode,
          creditsQuantity: payload.creditsQuantity,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error ?? "Unable to create payment session");
      }

      if (!result.checkoutUrl) {
        throw new Error("Provider checkout URL is missing");
      }

      window.location.assign(result.checkoutUrl);
    } catch (error: any) {
      toast.error(error.message ?? "Unable to start checkout.");
      setBusyKey(null);
    }
  };

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
              const isBusy = busyKey === `plan:${plan.code}`;

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
                      disabled={isCurrentPlan || Boolean(busyKey)}
                      onClick={() =>
                        void createCheckoutSession({
                          kind: "subscription",
                          currency: plan.currency,
                          planCode: plan.code,
                          busyKey: `plan:${plan.code}`,
                        })
                      }
                    >
                      {isBusy ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : null}
                      {isCurrentPlan
                        ? "Current plan"
                        : `Upgrade to ${plan.name}`}
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
          <SettingsCardTitle>Credits</SettingsCardTitle>
          <SettingsCardDescription>
            Top up message credits and pay only for the volume you plan to send.
          </SettingsCardDescription>
        </SettingsCardHeader>
        <SettingsCardContent className="space-y-6 pt-6">
          <div className="bg-muted/20 grid gap-3 rounded-lg border p-4 md:grid-cols-3">
            <div className="bg-background/80 rounded-md border p-3">
              <p className="text-sm font-medium">Credit Balance</p>
              <p className="text-muted-foreground mt-1 text-sm">
                {billing.creditBalance.toLocaleString()} credits available
              </p>
            </div>
            <div className="bg-background/80 rounded-md border p-3">
              <p className="text-sm font-medium">SMS Included</p>
              <p className="text-muted-foreground mt-1 text-sm">
                {billing.smsIncludedLimit != null
                  ? `${billing.smsQuotaRemaining}/${billing.smsIncludedLimit} remaining`
                  : "Uses shared credits"}
              </p>
            </div>
            <div className="bg-background/80 rounded-md border p-3">
              <p className="text-sm font-medium">Email Included</p>
              <p className="text-muted-foreground mt-1 text-sm">
                {billing.emailIncludedLimit != null
                  ? `${billing.emailQuotaRemaining}/${billing.emailIncludedLimit} remaining`
                  : "Uses shared credits"}
              </p>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-xl border p-5">
              <div className="space-y-3">
                <p className="text-sm font-medium">Choose credit volume</p>
                <div className="flex flex-wrap gap-2">
                  {billing.creditPricing.suggestedQuantities.map((quantity) => (
                    <Button
                      key={quantity}
                      type="button"
                      variant={
                        creditsQuantity === quantity ? "default" : "outline"
                      }
                      className={
                        creditsQuantity === quantity
                          ? "bg-[#f58220] text-white hover:bg-[#d6701a]"
                          : ""
                      }
                      disabled={Boolean(busyKey)}
                      onClick={() => setCreditsQuantity(quantity)}
                    >
                      {quantity.toLocaleString()} SMS
                    </Button>
                  ))}
                </div>

                <div className="max-w-xs space-y-2">
                  <label className="text-sm font-medium">Custom quantity</label>
                  <Input
                    type="number"
                    min={billing.creditPricing.minimumQuantity}
                    step={50}
                    value={creditsQuantity}
                    onChange={(event) =>
                      setCreditsQuantity(
                        Math.max(
                          billing.creditPricing.minimumQuantity,
                          Number(event.target.value) ||
                            billing.creditPricing.minimumQuantity
                        )
                      )
                    }
                  />
                  <p className="text-muted-foreground text-xs">
                    Minimum top-up:{" "}
                    {billing.creditPricing.minimumQuantity.toLocaleString()}{" "}
                    credits.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-card rounded-xl border p-5">
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium">Order summary</p>
                  <p className="text-muted-foreground mt-1 text-sm">
                    Pricing is based on your selected message volume.
                  </p>
                </div>

                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span>Credits selected</span>
                    <span className="font-medium">
                      {creditsQuantity.toLocaleString()} SMS
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Unit rate</span>
                    <span className="font-medium">
                      {formatMoney(
                        pricingTier.unitAmountMinor,
                        billing.creditPricing.currency
                      )}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Applied tier</span>
                    <span className="font-medium">{pricingTier.label}</span>
                  </div>
                  <div className="flex items-center justify-between border-t pt-3 text-base">
                    <span className="font-medium">Total</span>
                    <span className="font-semibold">
                      {formatMoney(topUpTotal, billing.creditPricing.currency)}
                    </span>
                  </div>
                </div>

                <Button
                  className="w-full bg-[#f58220] text-white hover:bg-[#d6701a]"
                  disabled={
                    Boolean(busyKey) ||
                    creditsQuantity < billing.creditPricing.minimumQuantity
                  }
                  onClick={() =>
                    void createCheckoutSession({
                      kind: "creditPurchase",
                      currency: billing.creditPricing.currency,
                      creditsQuantity,
                      busyKey: "credits",
                    })
                  }
                >
                  {busyKey === "credits" ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  Pay {formatMoney(topUpTotal, billing.creditPricing.currency)}
                </Button>
              </div>
            </div>
          </div>

          {isNavigating ? (
            <p className="text-muted-foreground text-sm">
              Syncing your billing status...
            </p>
          ) : null}
        </SettingsCardContent>
      </SettingsCard>
    </div>
  );
}
