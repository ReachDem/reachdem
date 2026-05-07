"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import type {
  PaymentMethodType,
  WorkspaceBillingSummary,
} from "@reachdem/shared";
import {
  convertMajorToMinor,
  convertMinorToMajor,
  getCurrencyMinorExponent,
  normalizePaymentCustomerName,
} from "@reachdem/shared";
import { useSession } from "@reachdem/auth/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { usePayment } from "@/hooks/use-payment";
import { ButtonGroup } from "@/components/ui/button-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BriefcaseIcon,
  ChevronDownIcon,
  CreditCardIcon,
  DevicePhoneMobileIcon,
  ShieldCheckIcon,
} from "@heroicons/react/24/outline";

const COUNTRY_CONFIG = {
  CM: {
    name: "Cameroon",
    currency: "XAF",
    phoneCode: "237",
    phonePlaceholder: "670000000",
  },
  CI: {
    name: "Ivory Coast",
    currency: "XOF",
    phoneCode: "225",
    phonePlaceholder: "0700000000",
  },
  FR: {
    name: "France",
    currency: "EUR",
    phoneCode: "33",
    phonePlaceholder: "612345678",
  },
  NG: {
    name: "Nigeria",
    currency: "NGN",
    phoneCode: "234",
    phonePlaceholder: "8012345678",
  },
  SN: {
    name: "Senegal",
    currency: "XOF",
    phoneCode: "221",
    phonePlaceholder: "771234567",
  },
  UG: {
    name: "Uganda",
    currency: "UGX",
    phoneCode: "256",
    phonePlaceholder: "701234567",
  },
  US: {
    name: "United States",
    currency: "USD",
    phoneCode: "1",
    phonePlaceholder: "5551234567",
  },
} as const;

type CountryCode = keyof typeof COUNTRY_CONFIG;

const CM_MTN_PREFIXES = [
  "650",
  "651",
  "652",
  "653",
  "654",
  "670",
  "671",
  "672",
  "673",
  "674",
  "675",
  "676",
  "677",
  "678",
  "679",
  "680",
  "681",
  "682",
  "683",
];
const CM_ORANGE_PREFIXES = [
  "655",
  "656",
  "657",
  "658",
  "659",
  "690",
  "691",
  "692",
  "693",
  "694",
  "695",
  "696",
  "697",
  "698",
  "699",
  "686",
  "687",
  "688",
  "689",
  "640",
];

function detectCameroonOperator(phoneDigits: string): "MTN" | "ORANGE" | null {
  const normalized = phoneDigits.replace(/^237/, "");
  if (normalized.length < 3 || normalized[0] !== "6") return null;

  const prefix = normalized.substring(0, 3);
  if (CM_MTN_PREFIXES.includes(prefix)) return "MTN";
  if (CM_ORANGE_PREFIXES.includes(prefix)) return "ORANGE";
  return null;
}

function getDefaultCountry(
  billing: WorkspaceBillingSummary
): keyof typeof COUNTRY_CONFIG {
  const matchedCountry = Object.entries(COUNTRY_CONFIG).find(([, config]) => {
    return config.currency === billing.topUpConfig.baseCurrency;
  });

  return (matchedCountry?.[0] as CountryCode | undefined) ?? "CM";
}

function getCountryChoices(billing: WorkspaceBillingSummary) {
  return Object.entries(COUNTRY_CONFIG).filter(([, config]) =>
    billing.topUpConfig.supportedCurrencies.includes(config.currency)
  );
}

function getPhoneLabel(method: PaymentMethodType): string {
  if (method === "opay") {
    return "Nigerian phone number";
  }

  return "Phone number";
}

export function CreditTopUpDialog({
  billing,
}: {
  billing: WorkspaceBillingSummary;
}) {
  const { data: session } = useSession();
  const router = useRouter();
  const { paymentState, initiatePayment } = usePayment();

  const countryChoices = useMemo(() => getCountryChoices(billing), [billing]);
  const [selectedCountry, setSelectedCountry] = useState<CountryCode>(
    getDefaultCountry(billing)
  );
  const [selectedMethod, setSelectedMethod] =
    useState<PaymentMethodType | null>("card");
  const [amount, setAmount] = useState("");
  const [network, setNetwork] = useState("MTN");
  const [phone, setPhone] = useState("");
  const [fullName, setFullName] = useState(session?.user?.name ?? "");
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");
  const [city, setCity] = useState("");
  const [regionState, setRegionState] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");

  // Focus refs for auto-skip
  const cardExpiryRef = useRef<HTMLInputElement | null>(null);
  const cardCvvRef = useRef<HTMLInputElement | null>(null);

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only allow digits and spaces
    const rawValue = e.target.value.replace(/[^\d\s]/g, "");

    // Remove all spaces for formatting
    const digits = rawValue.replace(/\s+/g, "");

    // Limit to 16 digits normally (up to 19 for some cards)
    const truncatedDigits = digits.slice(0, 19);

    // Format into groups of 4: "1234 5678 1234 5678"
    const formattedValue =
      truncatedDigits.match(/.{1,4}/g)?.join(" ") || truncatedDigits;

    setCardNumber(formattedValue);

    // Auto-skip when standard 16 digits are entered
    if (truncatedDigits.length === 16 && e.nativeEvent instanceof InputEvent) {
      cardExpiryRef.current?.focus();
    }
  };

  const handleCardExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only allow digits and slash
    const rawValue = e.target.value.replace(/[^\d\/]/g, "");

    // Remove existing slashes to reformat clean
    const digits = rawValue.replace(/\D/g, "");

    let formattedValue = digits;

    // Auto insert slash after month: "12/34"
    if (digits.length > 2) {
      formattedValue = `${digits.slice(0, 2)} / ${digits.slice(2, 4)}`;
    } else if (
      digits.length === 2 &&
      e.nativeEvent instanceof InputEvent &&
      e.nativeEvent.inputType !== "deleteContentBackward"
    ) {
      formattedValue = `${digits} / `;
    }

    setCardNumber((prev) => prev); // this line isn't doing anything it triggers an update that ensures the cursor stays properly updated in concurrent mode.
    setCardExpiry(formattedValue.slice(0, 7)); // max length "MM / YY" -> 7

    // Auto-skip when 'MM / YY' is complete
    if (
      digits.length === 4 &&
      e.nativeEvent instanceof InputEvent &&
      e.nativeEvent.inputType !== "deleteContentBackward"
    ) {
      cardCvvRef.current?.focus();
    }
  };

  const handleCardCvvChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only allow digits, max length 4
    const digits = e.target.value.replace(/\D/g, "").slice(0, 4);
    setCardCvv(digits);
  };

  const activeCountry = COUNTRY_CONFIG[selectedCountry];
  const activeCurrency = activeCountry.currency;
  const minimumAmountMinor =
    billing.topUpConfig.minimumAmountMinorByCurrency[activeCurrency] ??
    billing.topUpConfig.minimumAmountMinorByCurrency[
      billing.topUpConfig.baseCurrency
    ];
  const minimumAmount = convertMinorToMajor(minimumAmountMinor, activeCurrency);
  const amountStep =
    getCurrencyMinorExponent(activeCurrency) === 0 ? "1" : "0.01";
  const isProcessing = paymentState.status === "loading";

  useEffect(() => {
    if (session?.user?.name) {
      setFullName((current) => current || session.user.name || "");
    }
  }, [session?.user?.name]);

  useEffect(() => {
    if (selectedMethod === "opay" && selectedCountry !== "NG") {
      setSelectedCountry("NG");
    }
  }, [selectedCountry, selectedMethod]);

  useEffect(() => {
    if (selectedCountry !== "CM" || !phone) return;
    const detected = detectCameroonOperator(phone);
    if (detected) {
      setNetwork(detected);
    }
  }, [phone, selectedCountry]);

  useEffect(() => {
    if (
      countryChoices.length > 0 &&
      !countryChoices.some(([code]) => code === selectedCountry)
    ) {
      setSelectedCountry(countryChoices[0][0] as CountryCode);
    }
  }, [countryChoices, selectedCountry]);

  useEffect(() => {
    if (!amount) {
      setAmount(String(minimumAmount));
      return;
    }

    const currentAmount = Number(amount);
    if (!Number.isFinite(currentAmount) || currentAmount < minimumAmount) {
      setAmount(String(minimumAmount));
    }
  }, [amount, minimumAmount]);

  useEffect(() => {
    if (paymentState.status === "success") {
      router.push(`/billing/success?method=${selectedMethod}`);
      return;
    }

    const nextActionType =
      paymentState.nextAction &&
      typeof paymentState.nextAction === "object" &&
      "type" in paymentState.nextAction &&
      typeof paymentState.nextAction.type === "string"
        ? paymentState.nextAction.type
        : null;

    if (nextActionType === "redirect_url") {
      return;
    }

    if (paymentState.chargeId && paymentState.status === "verifying") {
      router.push(
        `/billing/verify?chargeId=${paymentState.chargeId}&method=${selectedMethod}`
      );
      return;
    }

    if (paymentState.chargeId && paymentState.status === "requires_action") {
      const actionQuery =
        nextActionType && nextActionType !== "payment_instruction"
          ? `&action=${nextActionType}`
          : "";
      router.push(
        `/billing/verify?chargeId=${paymentState.chargeId}&method=${selectedMethod}${actionQuery}`
      );
    }
  }, [
    paymentState.chargeId,
    paymentState.nextAction,
    paymentState.status,
    router,
    selectedMethod,
  ]);

  const handleSubmit = (method: PaymentMethodType) => {
    if (!session?.user || !billing.organizationId) {
      return;
    }

    const enteredAmount = Number(amount);
    if (!Number.isFinite(enteredAmount) || enteredAmount < minimumAmount) {
      toast.error(
        `Minimum top up amount is ${minimumAmount.toLocaleString()} ${activeCurrency}.`
      );
      return;
    }

    if (!fullName.trim() || fullName.trim().length < 3) {
      toast.error("Please enter your full name (first and last name).");
      return;
    }

    if (!phone.trim()) {
      toast.error("Please enter a valid phone number.");
      return;
    }

    let cardData = undefined;
    if (method === "card") {
      const cleanCard = cardNumber.replace(/\s+/g, "");
      const [expiryMonth, expiryYear] = cardExpiry
        .split("/")
        .map((s) => s.trim());

      if (!cleanCard || cleanCard.length < 13) {
        toast.error("Please enter a valid card number.");
        return;
      }
      if (!expiryMonth || !expiryYear) {
        toast.error("Please enter a valid expiry date (MM/YY).");
        return;
      }
      if (!cardCvv || cardCvv.length < 3) {
        toast.error("Please enter a valid CVV.");
        return;
      }
      if (!phone.trim()) {
        toast.error("Please enter the phone number linked to this card.");
        return;
      }
      if (!city.trim()) {
        toast.error("Please enter the billing city.");
        return;
      }
      if (!regionState.trim()) {
        toast.error("Please enter the billing state or region.");
        return;
      }
      if (!postalCode.trim()) {
        toast.error("Please enter the billing postal code.");
        return;
      }
      if (!addressLine1.trim()) {
        toast.error("Please enter the billing address.");
        return;
      }

      cardData = {
        number: cleanCard,
        expiryMonth,
        expiryYear,
        cvv: cardCvv,
        saveCard: true,
      };
    }

    initiatePayment({
      kind: "creditPurchase",
      organizationId: billing.organizationId,
      currency: activeCurrency,
      amountMinor: convertMajorToMinor(enteredAmount, activeCurrency),
      paymentMethodType: method,
      customerName: normalizePaymentCustomerName(fullName),
      email: session.user.email || "support@reachdem.com",
      phone: {
        countryCode: activeCountry.phoneCode,
        number: phone.replace(/\D/g, ""),
      },
      address:
        method === "card"
          ? {
              city: city.trim(),
              country: selectedCountry,
              line1: addressLine1.trim(),
              line2: addressLine2.trim() || undefined,
              postalCode: postalCode.trim(),
              state: regionState.trim(),
            }
          : undefined,
      mobileMoneyNetwork: method === "mobile_money" ? network : undefined,
      card: cardData,
    });
  };

  return (
    <div className="animate-in fade-in space-y-6">
      <div className="space-y-4">
        <label className="flex w-full flex-col justify-between gap-4 text-sm font-semibold text-white sm:flex-row sm:items-center">
          <span>Amount ({activeCurrency})</span>
          <ButtonGroup>
            <Select
              value={selectedCountry}
              onValueChange={(value) =>
                setSelectedCountry(value as CountryCode)
              }
            >
              <SelectTrigger className="h-8 w-fit border-[#2a2a2a] bg-[#111] text-white">
                <SelectValue placeholder="Devise" />
              </SelectTrigger>
              <SelectContent className="border-[#2a2a2a] bg-[#111] text-white">
                {Array.from(
                  new Set(countryChoices.map(([_, c]) => c.currency))
                ).map((currency) => {
                  const firstCountry = countryChoices.find(
                    ([_, c]) => c.currency === currency
                  );
                  return (
                    <SelectItem key={currency} value={firstCountry![0]}>
                      {currency}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>

            <Select
              value={selectedCountry}
              onValueChange={(value) =>
                setSelectedCountry(value as CountryCode)
              }
            >
              <SelectTrigger className="h-8 w-fit border-l-0 border-[#2a2a2a] bg-[#111] text-white">
                <SelectValue placeholder="Pays" />
              </SelectTrigger>
              <SelectContent className="border-[#2a2a2a] bg-[#111] text-white">
                {countryChoices.map(([code, config]) => (
                  <SelectItem key={code} value={code}>
                    {config.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </ButtonGroup>
        </label>
        <Input
          type="number"
          step={amountStep}
          min={minimumAmount}
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          className="h-12 border border-[#2a2a2a] bg-[#111] text-lg text-white transition-colors focus-visible:ring-1 focus-visible:ring-[#333]"
          placeholder="100"
          disabled={isProcessing}
        />
        <p className="text-xs text-neutral-500">
          Minimum top up: {minimumAmount.toLocaleString()} {activeCurrency}
        </p>
      </div>

      <div className="space-y-3">
        <div className="overflow-hidden rounded-xl border border-[#2a2a2a] bg-transparent transition-colors">
          <button
            type="button"
            onClick={() =>
              setSelectedMethod((current) =>
                current === "card" ? null : "card"
              )
            }
            className="flex w-full items-center justify-between px-5 py-4 text-left transition-colors hover:bg-white/[0.02]"
          >
            <div className="flex items-center gap-3 text-sm font-medium text-white">
              <CreditCardIcon className="h-5 w-5 text-neutral-400" />
              Card
            </div>
            <ChevronDownIcon
              className={`h-5 w-5 text-neutral-500 transition-transform duration-200 ${selectedMethod === "card" ? "rotate-180" : ""}`}
            />
          </button>

          {selectedMethod === "card" ? (
            <div className="animate-in slide-in-from-top-2 space-y-4 px-5 pt-4 pb-5 duration-200">
              <div className="space-y-4">
                <div className="space-y-4">
                  <div className="relative">
                    <Input
                      type="tel"
                      value={cardNumber}
                      onChange={(e) => handleCardNumberChange(e as any)}
                      placeholder="Card number"
                      maxLength={23} // 19 digits + 4 spaces
                      className="h-12 rounded-md border border-[#2a2a2a] bg-[#1a1a1a] px-4 font-mono text-white shadow-sm transition-colors placeholder:text-neutral-500 focus-visible:ring-1 focus-visible:ring-white"
                      disabled={isProcessing}
                    />
                    <div className="pointer-events-none absolute top-1/2 right-3 flex -translate-y-1/2 items-center justify-center text-neutral-500">
                      <CreditCardIcon className="h-5 w-5" />
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="w-1/2">
                      <Input
                        type="tel"
                        ref={cardExpiryRef}
                        value={cardExpiry}
                        onChange={(e) => handleCardExpiryChange(e as any)}
                        placeholder="MM / YY"
                        maxLength={7}
                        className="h-12 rounded-md border border-[#2a2a2a] bg-[#1a1a1a] px-4 font-mono text-white shadow-sm transition-colors placeholder:text-neutral-500 focus-visible:ring-1 focus-visible:ring-white"
                        disabled={isProcessing}
                      />
                    </div>
                    <div className="relative w-1/2">
                      <Input
                        type="tel"
                        ref={cardCvvRef}
                        value={cardCvv}
                        onChange={(e) => handleCardCvvChange(e as any)}
                        placeholder="CVC"
                        maxLength={4}
                        className="h-12 rounded-md border border-[#2a2a2a] bg-[#1a1a1a] px-4 font-mono text-white shadow-sm transition-colors placeholder:text-neutral-500 focus-visible:ring-1 focus-visible:ring-white"
                        disabled={isProcessing}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="relative">
                    <Input
                      type="text"
                      value={fullName}
                      onChange={(event) => setFullName(event.target.value)}
                      placeholder="Cardholder name"
                      className="h-12 rounded-md border border-[#2a2a2a] bg-[#1a1a1a] px-4 text-white shadow-sm transition-colors placeholder:text-neutral-500 focus-visible:ring-1 focus-visible:ring-white"
                      disabled={isProcessing}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-neutral-300">
                      Phone number
                    </label>
                    <div className="flex gap-2">
                      <div className="relative shrink-0">
                        <select
                          value={selectedCountry}
                          onChange={(event) =>
                            setSelectedCountry(
                              event.target.value as CountryCode
                            )
                          }
                          className="h-full appearance-none rounded-lg border border-[#2a2a2a] bg-[#111] py-2.5 pr-7 pl-3 text-sm text-neutral-400 focus:border-[#555] focus:outline-none"
                          disabled={isProcessing}
                        >
                          {countryChoices.map(([code, config]) => (
                            <option
                              key={code}
                              value={code}
                              className="bg-[#111] text-white"
                            >
                              +{config.phoneCode}
                            </option>
                          ))}
                        </select>
                        <ChevronDownIcon className="pointer-events-none absolute top-1/2 right-1.5 h-3 w-3 -translate-y-1/2 text-neutral-500" />
                      </div>
                      <Input
                        type="tel"
                        value={phone}
                        onChange={(event) =>
                          setPhone(event.target.value.replace(/\D/g, ""))
                        }
                        placeholder={activeCountry.phonePlaceholder}
                        className="h-12 border border-[#2a2a2a] bg-[#1a1a1a] text-white placeholder:text-neutral-500"
                        disabled={isProcessing}
                      />
                    </div>
                  </div>

                  <div className="relative">
                    <Input
                      type="text"
                      value={COUNTRY_CONFIG[selectedCountry]?.name || ""}
                      readOnly
                      placeholder="Country"
                      className="h-12 cursor-not-allowed rounded-md border border-[#2a2a2a] bg-[#111] px-4 text-white opacity-70 shadow-sm transition-colors placeholder:text-neutral-500 focus-visible:ring-1 focus-visible:ring-white"
                      disabled
                    />
                  </div>

                  <div className="relative">
                    <Input
                      type="text"
                      value={city}
                      onChange={(event) => setCity(event.target.value)}
                      placeholder="City"
                      className="h-12 rounded-md border border-[#2a2a2a] bg-[#1a1a1a] px-4 text-white shadow-sm transition-colors placeholder:text-neutral-500 focus-visible:ring-1 focus-visible:ring-white"
                      disabled={isProcessing}
                    />
                  </div>

                  <div className="relative">
                    <Input
                      type="text"
                      value={regionState}
                      onChange={(event) => setRegionState(event.target.value)}
                      placeholder="Region / State"
                      className="h-12 rounded-md border border-[#2a2a2a] bg-[#1a1a1a] px-4 text-white shadow-sm transition-colors placeholder:text-neutral-500 focus-visible:ring-1 focus-visible:ring-white"
                      disabled={isProcessing}
                    />
                  </div>

                  <div className="relative">
                    <Input
                      type="text"
                      value={postalCode}
                      onChange={(event) => setPostalCode(event.target.value)}
                      placeholder="Postal code"
                      className="h-12 rounded-md border border-[#2a2a2a] bg-[#1a1a1a] px-4 text-white shadow-sm transition-colors placeholder:text-neutral-500 focus-visible:ring-1 focus-visible:ring-white"
                      disabled={isProcessing}
                    />
                  </div>

                  <div className="relative">
                    <Input
                      type="text"
                      value={addressLine1}
                      onChange={(event) => setAddressLine1(event.target.value)}
                      placeholder="Main address (Street, P.O. Box, etc.)"
                      className="h-12 rounded-md border border-[#2a2a2a] bg-[#1a1a1a] px-4 text-white shadow-sm transition-colors placeholder:text-neutral-500 focus-visible:ring-1 focus-visible:ring-white"
                      disabled={isProcessing}
                    />
                  </div>

                  <div className="relative">
                    <Input
                      type="text"
                      value={addressLine2}
                      onChange={(event) => setAddressLine2(event.target.value)}
                      placeholder="Address line 2 (optional)"
                      className="h-12 rounded-md border border-[#2a2a2a] bg-[#1a1a1a] px-4 text-white shadow-sm transition-colors placeholder:text-neutral-500 focus-visible:ring-1 focus-visible:ring-white"
                      disabled={isProcessing}
                    />
                  </div>
                </div>
              </div>

              <p className="text-sm leading-relaxed text-neutral-400">
                Next time will be quicker, we&apos;ll remember these details for
                you.
              </p>

              <Button
                onClick={() => handleSubmit("card")}
                disabled={isProcessing}
                className="h-11 w-full bg-[#0e8a5b] font-medium text-white shadow-none transition-colors hover:bg-[#0c7a50]"
              >
                {isProcessing ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  "Pay with card"
                )}
              </Button>
            </div>
          ) : null}
        </div>

        <div className="overflow-hidden rounded-xl border border-[#2a2a2a] bg-transparent transition-colors">
          <button
            type="button"
            onClick={() =>
              setSelectedMethod((current) =>
                current === "mobile_money" ? null : "mobile_money"
              )
            }
            className="flex w-full items-center justify-between px-5 py-4 text-left transition-colors hover:bg-white/[0.02]"
          >
            <div className="flex items-center gap-3 text-sm font-medium text-white">
              <DevicePhoneMobileIcon className="h-5 w-5 text-neutral-400" />
              Mobile Money
            </div>
            <ChevronDownIcon
              className={`h-5 w-5 text-neutral-500 transition-transform duration-200 ${selectedMethod === "mobile_money" ? "rotate-180" : ""}`}
            />
          </button>

          {selectedMethod === "mobile_money" ? (
            <div className="animate-in slide-in-from-top-2 space-y-4 px-5 pt-4 pb-5 duration-200">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-neutral-300">
                  Network
                </label>
                <div className="relative">
                  <select
                    value={network}
                    onChange={(event) => setNetwork(event.target.value)}
                    className="w-full appearance-none rounded-lg border border-[#333] bg-transparent px-3 py-2.5 pr-10 text-sm text-white transition-colors focus:border-[#555] focus:outline-none"
                  >
                    <option value="MTN" className="bg-[#111] text-white">
                      MTN Mobile Money
                    </option>
                    <option value="ORANGE" className="bg-[#111] text-white">
                      Orange Money
                    </option>
                    <option value="AIRTEL" className="bg-[#111] text-white">
                      Airtel Money
                    </option>
                    <option value="MPESA" className="bg-[#111] text-white">
                      M-Pesa
                    </option>
                  </select>
                  <ChevronDownIcon className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-neutral-500" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-neutral-300">
                  {getPhoneLabel("mobile_money")}
                </label>
                <div className="flex gap-2">
                  <div className="relative shrink-0">
                    <select
                      value={selectedCountry}
                      onChange={(event) =>
                        setSelectedCountry(event.target.value as CountryCode)
                      }
                      className="h-full appearance-none rounded-lg border border-[#333] bg-transparent py-2.5 pr-7 pl-3 text-sm text-neutral-400 focus:border-[#555] focus:outline-none"
                      disabled={isProcessing}
                    >
                      {countryChoices.map(([code, config]) => (
                        <option
                          key={code}
                          value={code}
                          className="bg-[#111] text-white"
                        >
                          +{config.phoneCode}
                        </option>
                      ))}
                    </select>
                    <ChevronDownIcon className="pointer-events-none absolute top-1/2 right-1.5 h-3 w-3 -translate-y-1/2 text-neutral-500" />
                  </div>
                  <Input
                    type="tel"
                    value={phone}
                    onChange={(event) =>
                      setPhone(event.target.value.replace(/\D/g, ""))
                    }
                    placeholder={activeCountry.phonePlaceholder}
                    className="border-[#333] bg-transparent text-white placeholder:text-neutral-500"
                    disabled={isProcessing}
                  />
                </div>
                {selectedCountry === "CM" &&
                phone &&
                detectCameroonOperator(phone) ? (
                  <p className="mt-1 text-xs text-neutral-400">
                    Detected:{" "}
                    <span className="font-medium text-white">
                      {detectCameroonOperator(phone) === "MTN"
                        ? "MTN Mobile Money"
                        : "Orange Money"}
                    </span>
                  </p>
                ) : null}
              </div>

              <Button
                onClick={() => handleSubmit("mobile_money")}
                disabled={isProcessing}
                className="h-11 w-full bg-[#0e8a5b] font-medium text-white shadow-none transition-colors hover:bg-[#0c7a50]"
              >
                {isProcessing ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  "Continue to mobile money"
                )}
              </Button>
            </div>
          ) : null}
        </div>

        <div className="overflow-hidden rounded-xl border border-[#2a2a2a] bg-transparent transition-colors">
          <button
            type="button"
            onClick={() =>
              setSelectedMethod((current) =>
                current === "opay" ? null : "opay"
              )
            }
            className="flex w-full items-center justify-between px-5 py-4 text-left transition-colors hover:bg-white/[0.02]"
          >
            <div className="flex items-center gap-3 text-sm font-medium text-white">
              <BriefcaseIcon className="h-5 w-5 text-neutral-400" />
              OPay Account
            </div>
            <ChevronDownIcon
              className={`h-5 w-5 text-neutral-500 transition-transform duration-200 ${selectedMethod === "opay" ? "rotate-180" : ""}`}
            />
          </button>

          {selectedMethod === "opay" ? (
            <div className="animate-in slide-in-from-top-2 space-y-4 px-5 pt-2 pb-5 duration-200">
              <p className="text-sm text-neutral-400">
                OPay is available for Nigeria only. Enter the number without the
                prefix.
              </p>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-neutral-300">
                  {getPhoneLabel("opay")}
                </label>
                <div className="flex gap-2">
                  <div className="flex shrink-0 items-center rounded-lg border border-[#333] bg-transparent px-3 py-2.5 text-sm text-neutral-400">
                    +{activeCountry.phoneCode}
                  </div>
                  <Input
                    type="tel"
                    value={phone}
                    onChange={(event) =>
                      setPhone(event.target.value.replace(/\D/g, ""))
                    }
                    placeholder="8012345678"
                    className="border-[#333] bg-transparent text-white placeholder:text-neutral-500"
                    disabled={isProcessing}
                  />
                </div>
              </div>

              <Button
                onClick={() => handleSubmit("opay")}
                disabled={isProcessing || selectedCountry !== "NG"}
                className="h-11 w-full bg-[#0e8a5b] font-medium text-white shadow-none transition-colors hover:bg-[#0c7a50]"
              >
                {isProcessing ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  "Continue to OPay"
                )}
              </Button>
            </div>
          ) : null}
        </div>
      </div>

      {paymentState.status === "error" ? (
        <div className="animate-in fade-in flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
          <ShieldCheckIcon className="h-5 w-5 shrink-0" />
          <p>
            <strong>Failed:</strong> {paymentState.errorMessage}
          </p>
        </div>
      ) : null}
    </div>
  );
}
