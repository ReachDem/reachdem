import { MobileMoneyForm } from "@/components/mobile-money-form";

export default function PaymentsPage() {
  return (
    <main className="min-h-screen bg-zinc-50">
      <div className="mx-auto w-full max-w-4xl px-6 pt-10">
        <h1 className="text-3xl font-bold text-zinc-900">Tests Flutterwave Mobile Money v4</h1>
        <p className="mt-2 text-sm text-zinc-600">
          Commencez par creer le customer puis initiez le charge mobile (MTN/Orange).
        </p>
      </div>
      <MobileMoneyForm />
    </main>
  );
}
