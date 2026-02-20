import { PaymentsCheckout } from "@/components/payments-checkout";
import Script from "next/script";

export default function PaymentsPage() {
  return (
    <main className="min-h-screen bg-zinc-50">
      <Script src="https://checkout.flutterwave.com/v3.js" strategy="afterInteractive" />
      <div className="mx-auto w-full max-w-4xl px-6 pt-10">
        <h1 className="text-3xl font-bold text-zinc-900">Tests Flutterwave Carte</h1>
        <p className="mt-2 text-sm text-zinc-600">
          Deux paiements carte de test: fixe (100 XAF) et recurrent (650 XAF).
        </p>
      </div>
      <PaymentsCheckout />
    </main>
  );
}
