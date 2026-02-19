type CallbackPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const readParam = (
  params: Record<string, string | string[] | undefined>,
  key: string
) => {
  const value = params[key];
  return Array.isArray(value) ? value[0] : value || "N/A";
};

export default async function PaymentsCallbackPage({ searchParams }: CallbackPageProps) {
  const params = await searchParams;

  return (
    <main className="min-h-screen bg-zinc-50 px-6 py-12">
      <div className="mx-auto w-full max-w-2xl rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-zinc-900">Retour de paiement</h1>
        <p className="mt-2 text-sm text-zinc-600">
          Verifiez les parametres retour puis confirmez le statut dans votre dashboard Flutterwave.
        </p>
        <dl className="mt-6 space-y-3 text-sm">
          <div className="flex justify-between gap-4 border-b border-zinc-100 pb-2">
            <dt className="text-zinc-500">Produit</dt>
            <dd className="font-medium text-zinc-900">{readParam(params, "productType")}</dd>
          </div>
          <div className="flex justify-between gap-4 border-b border-zinc-100 pb-2">
            <dt className="text-zinc-500">Status</dt>
            <dd className="font-medium text-zinc-900">{readParam(params, "status")}</dd>
          </div>
          <div className="flex justify-between gap-4 border-b border-zinc-100 pb-2">
            <dt className="text-zinc-500">Transaction ID</dt>
            <dd className="font-medium text-zinc-900">{readParam(params, "transaction_id")}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-zinc-500">Tx Ref</dt>
            <dd className="font-medium text-zinc-900">{readParam(params, "tx_ref")}</dd>
          </div>
        </dl>
      </div>
    </main>
  );
}
