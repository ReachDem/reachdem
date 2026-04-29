export default function PlaceholderPage({
  params,
}: {
  params: { slug: string };
}) {
  return (
    <div className="text-muted-foreground flex h-full flex-col items-center justify-center">
      <p className="text-lg font-medium">Page en cours de construction</p>
      <p className="mt-1 text-sm">Revenez bientôt !</p>
    </div>
  );
}
