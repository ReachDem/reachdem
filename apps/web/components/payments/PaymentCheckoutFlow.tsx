"use client";

import { useEffect, useState } from "react";
import { usePayment } from "../../hooks/usePayment";
import { Loader2 } from "lucide-react";
import {
  CreditCardIcon,
  DevicePhoneMobileIcon,
  BriefcaseIcon,
  ShieldCheckIcon,
  ChevronDownIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/outline";

type Method = "card" | "mobile_money" | "opay" | null;

const COUNTRY_CONFIG = {
  CM: { name: "Cameroun", currency: "XAF", phoneCode: "237" },
  NG: { name: "Nigeria", currency: "NGN", phoneCode: "234" },
  UG: { name: "Uganda", currency: "UGX", phoneCode: "256" },
  SN: { name: "Senegal", currency: "XOF", phoneCode: "221" },
};

export function PaymentCheckoutFlow({
  amountMinor,
  currency,
  organizationId,
  customerEmail,
  customerName,
  onCancel,
  onSuccessRedirect,
}: {
  amountMinor: number;
  currency: string;
  organizationId: string;
  customerEmail: string;
  customerName: { first: string; last: string };
  onCancel?: () => void;
  onSuccessRedirect?: () => void;
}) {
  const [selectedMethod, setSelectedMethod] = useState<Method>(null);

  const [network, setNetwork] = useState("MTN");
  const [phone, setPhone] = useState("");
  const [selectedCountry, setSelectedCountry] =
    useState<keyof typeof COUNTRY_CONFIG>("CM");

  const { paymentState, initiatePayment, verifyPayment } = usePayment();

  const currentConfig = COUNTRY_CONFIG[selectedCountry];
  const activeCurrency = currentConfig.currency;

  useEffect(() => {
    if (selectedMethod === "opay" && selectedCountry !== "NG") {
      setSelectedCountry("NG");
    }
  }, [selectedCountry, selectedMethod]);

  const toggleMethod = (method: Method) => {
    if (selectedMethod === method) {
      setSelectedMethod(null);
    } else {
      setSelectedMethod(method);
    }
  };

  const handleSubmitPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMethod) return;

    initiatePayment({
      kind: "creditPurchase",
      organizationId,
      currency: activeCurrency,
      creditsQuantity: 1000,
      paymentMethodType: selectedMethod,
      customerName,
      email: customerEmail,
      phone: {
        countryCode: currentConfig.phoneCode,
        number: phone.replace(/\D/g, ""),
      },
      mobileMoneyNetwork:
        selectedMethod === "mobile_money" ? network : undefined,
    });
  };

  return (
    <div className="mx-auto w-full max-w-xl rounded-xl border border-[#333] bg-[#1a1a1a] p-6 font-sans text-white shadow-xl">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="mb-1 text-2xl font-bold tracking-tight">
            Top Up Credits
          </h1>
          <p className="text-sm text-gray-400">
            Select country and payment method
          </p>
        </div>
        {onCancel && (
          <button
            onClick={onCancel}
            className="text-sm text-gray-400 transition-colors hover:text-white"
          >
            Cancel
          </button>
        )}
      </div>

      {paymentState.status === "idle" || paymentState.status === "error" ? (
        <form onSubmit={handleSubmitPayment}>
          <div className="space-y-6">
            <div>
              <label className="mb-2 block text-xs font-semibold tracking-wide text-gray-400 uppercase">
                Pays ou région
              </label>
              <div className="relative">
                <select
                  value={selectedCountry}
                  onChange={(e) =>
                    setSelectedCountry(
                      e.target.value as keyof typeof COUNTRY_CONFIG
                    )
                  }
                  className="w-full appearance-none rounded-lg border border-[#444] bg-[#2a2a2a] px-4 py-3 text-white transition-colors outline-none focus:border-emerald-500"
                >
                  {Object.entries(COUNTRY_CONFIG).map(([code, config]) => (
                    <option key={code} value={code}>
                      {config.name}
                    </option>
                  ))}
                </select>
                <ChevronDownIcon className="pointer-events-none absolute top-1/2 right-4 h-5 w-5 -translate-y-1/2 text-gray-400" />
              </div>
            </div>

            <div className="space-y-3">
              <label className="mb-2 block text-xs font-semibold tracking-wide text-gray-400 uppercase">
                Payment Method
              </label>

              <div
                className={`overflow-hidden rounded-lg border transition-colors ${selectedMethod === "card" ? "border-[#0f8c5b] bg-[#222]" : "border-[#444] bg-[#2a2a2a]"}`}
              >
                <button
                  type="button"
                  onClick={() => toggleMethod("card")}
                  className="flex w-full items-center justify-between px-4 py-4 text-left transition-colors hover:bg-[#333]"
                >
                  <div className="flex items-center gap-4">
                    <CreditCardIcon
                      className={`h-6 w-6 ${selectedMethod === "card" ? "text-[#0f8c5b]" : "text-gray-400"}`}
                    />
                    <span className="font-medium">Credit/Debit Card</span>
                  </div>
                  <ChevronDownIcon
                    className={`h-5 w-5 text-gray-400 transition-transform ${selectedMethod === "card" ? "rotate-180" : ""}`}
                  />
                </button>
                {selectedMethod === "card" && (
                  <div className="animate-in fade-in slide-in-from-top-2 px-4 pb-4 duration-200">
                    <p className="mb-4 text-sm text-gray-400">
                      Pay securely using your Visa, Mastercard, or related
                      cards.
                    </p>
                    <div className="pointer-events-none opacity-50">
                      <input
                        type="text"
                        placeholder="Card Number"
                        className="mb-3 w-full rounded-lg border border-[#444] bg-[#1a1a1a] px-3 py-2 text-white"
                        readOnly
                      />
                      <div className="grid grid-cols-2 gap-3">
                        <input
                          type="text"
                          placeholder="MM/YY"
                          className="rounded-lg border border-[#444] bg-[#1a1a1a] px-3 py-2 text-white"
                          readOnly
                        />
                        <input
                          type="text"
                          placeholder="CVC"
                          className="rounded-lg border border-[#444] bg-[#1a1a1a] px-3 py-2 text-white"
                          readOnly
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div
                className={`overflow-hidden rounded-lg border transition-colors ${selectedMethod === "mobile_money" ? "border-[#0f8c5b] bg-[#222]" : "border-[#444] bg-[#2a2a2a]"}`}
              >
                <button
                  type="button"
                  onClick={() => toggleMethod("mobile_money")}
                  className="flex w-full items-center justify-between px-4 py-4 text-left transition-colors hover:bg-[#333]"
                >
                  <div className="flex items-center gap-4">
                    <DevicePhoneMobileIcon
                      className={`h-6 w-6 ${selectedMethod === "mobile_money" ? "text-[#0f8c5b]" : "text-gray-400"}`}
                    />
                    <span className="font-medium">Mobile Money</span>
                  </div>
                  <ChevronDownIcon
                    className={`h-5 w-5 text-gray-400 transition-transform ${selectedMethod === "mobile_money" ? "rotate-180" : ""}`}
                  />
                </button>
                {selectedMethod === "mobile_money" && (
                  <div className="animate-in fade-in slide-in-from-top-2 mt-2 border-t border-[#333] px-4 pt-4 pb-4 duration-200">
                    <div className="mb-4 grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setNetwork("ORANGE")}
                        className={`rounded-lg py-2 text-xs font-semibold tracking-wider transition-colors ${network === "ORANGE" ? "bg-orange-500 text-white" : "border border-[#444] bg-[#1a1a1a] text-gray-300"}`}
                      >
                        ORANGE MONEY
                      </button>
                      <button
                        type="button"
                        onClick={() => setNetwork("MTN")}
                        className={`rounded-lg py-2 text-xs font-semibold tracking-wider transition-colors ${network === "MTN" ? "bg-yellow-500 text-black" : "border border-[#444] bg-[#1a1a1a] text-gray-300"}`}
                      >
                        MTN MOMO
                      </button>
                    </div>
                    <div className="flex overflow-hidden rounded-lg border border-[#444] bg-[#1a1a1a] focus-within:border-[#0f8c5b]">
                      <div className="border-r border-[#444] bg-[#222] px-3 py-3 font-mono text-gray-400">
                        +{currentConfig.phoneCode}
                      </div>
                      <input
                        type="tel"
                        required
                        value={phone}
                        onChange={(e) =>
                          setPhone(e.target.value.replace(/\D/g, ""))
                        }
                        placeholder="670 000 000"
                        className="w-full bg-transparent px-4 py-3 text-white outline-none"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div
                className={`overflow-hidden rounded-lg border transition-colors ${selectedMethod === "opay" ? "border-[#0f8c5b] bg-[#222]" : "border-[#444] bg-[#2a2a2a]"}`}
              >
                <button
                  type="button"
                  onClick={() => toggleMethod("opay")}
                  className="flex w-full items-center justify-between px-4 py-4 text-left transition-colors hover:bg-[#333]"
                >
                  <div className="flex items-center gap-4">
                    <BriefcaseIcon
                      className={`h-6 w-6 ${selectedMethod === "opay" ? "text-[#0f8c5b]" : "text-gray-400"}`}
                    />
                    <span className="font-medium">OPay</span>
                  </div>
                  <ChevronDownIcon
                    className={`h-5 w-5 text-gray-400 transition-transform ${selectedMethod === "opay" ? "rotate-180" : ""}`}
                  />
                </button>
                {selectedMethod === "opay" && (
                  <div className="animate-in fade-in slide-in-from-top-2 px-4 pb-4 duration-200">
                    <p className="mb-4 text-sm text-gray-400">
                      OPay is available for Nigeria only. Enter your Nigerian
                      phone number without the +234 prefix.
                    </p>
                    <div className="flex overflow-hidden rounded-lg border border-[#444] bg-[#1a1a1a] focus-within:border-[#0f8c5b]">
                      <div className="border-r border-[#444] bg-[#222] px-3 py-3 font-mono text-gray-400">
                        +{currentConfig.phoneCode}
                      </div>
                      <input
                        type="tel"
                        required
                        value={phone}
                        onChange={(e) =>
                          setPhone(e.target.value.replace(/\D/g, ""))
                        }
                        placeholder="8012345678"
                        className="w-full bg-transparent px-4 py-3 text-white outline-none"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {paymentState.status === "error" && (
              <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
                <strong>Failed:</strong> {paymentState.errorMessage}
              </div>
            )}

            <div className="mt-6 flex items-center justify-between border-t border-[#333] pt-4">
              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                <ShieldCheckIcon className="h-4 w-4" />
                <span>Secure Payment</span>
              </div>
              <button
                type="submit"
                disabled={
                  !selectedMethod ||
                  (selectedMethod === "opay" &&
                    (!phone || selectedCountry !== "NG"))
                }
                className="rounded-lg bg-[#0f8c5b] px-8 py-3 font-semibold tracking-wide text-white shadow-sm transition-colors hover:bg-[#0c734a] disabled:opacity-50"
              >
                Top Up {(amountMinor / 100).toLocaleString()} {activeCurrency}
              </button>
            </div>
          </div>
        </form>
      ) : paymentState.status === "loading" ? (
        <div className="animate-in fade-in flex flex-col items-center justify-center py-20 text-center">
          <Loader2 className="mb-4 h-10 w-10 animate-spin text-[#0f8c5b]" />
          <p className="mb-2 text-lg font-medium text-white">
            Processing Payment...
          </p>
          <p className="text-sm text-gray-400">
            Please do not close this window.
          </p>
        </div>
      ) : (paymentState.status === "requires_action" ||
          paymentState.status === "verifying") &&
        paymentState.nextAction?.type === "payment_instruction" &&
        paymentState.nextAction.payment_instruction?.note ? (
        <div className="animate-in fade-in px-6 py-12 text-center">
          <div className="mb-8 rounded-xl border border-[#444] bg-[#2a2a2a] p-6">
            <p className="mb-4 font-mono text-2xl tracking-widest text-[#0f8c5b]">
              {paymentState.nextAction.payment_instruction.note}
            </p>
            <p className="mb-6 text-sm text-gray-400">
              Dial the code on your phone to validate the transaction, then
              click the button below.
            </p>
            <button
              onClick={() => verifyPayment(paymentState.chargeId!)}
              disabled={paymentState.status === "verifying"}
              className="flex w-full items-center justify-center rounded-lg bg-[#0f8c5b] py-4 font-semibold text-white transition-colors hover:bg-[#0c734a]"
            >
              {paymentState.status === "verifying" ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Verifying...
                </>
              ) : (
                "I have validated"
              )}
            </button>
          </div>
        </div>
      ) : paymentState.status === "success" ? (
        <div className="animate-in fade-in zoom-in-95 py-16 text-center duration-500">
          <CheckCircleIcon className="mx-auto mb-6 h-20 w-20 text-[#0f8c5b]" />
          <h1 className="mb-3 text-3xl font-bold tracking-tight text-white">
            Top Up Successful
          </h1>
          <p className="mb-10 text-gray-400">
            Your credits have been added to your account.
          </p>
          <button
            onClick={onSuccessRedirect}
            className="rounded-lg border border-[#444] bg-[#2a2a2a] px-10 py-3 font-medium text-white transition-colors hover:bg-[#333]"
          >
            Go to Dashboard
          </button>
        </div>
      ) : null}
    </div>
  );
}
