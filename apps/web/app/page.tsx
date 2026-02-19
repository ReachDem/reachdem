import Link from "next/link"

export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-6">
      <div className="w-full max-w-xl rounded-xl border border-zinc-200 bg-white p-8 shadow-sm">
        <h1 className="text-3xl font-bold text-zinc-900">ReachDem</h1>
        <p className="mt-3 text-sm text-zinc-600">
          Integration Flutterwave v4 prete pour tests en production.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/payments"
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
          >
            Ouvrir les tests paiement
          </Link>
          <Link
            href="/dashboard"
            className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100"
          >
            Dashboard
          </Link>
        </div>
      </div>
    </main>
  )
}
