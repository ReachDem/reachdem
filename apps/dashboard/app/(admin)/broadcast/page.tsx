import { getSession } from "@/lib/session";
import { getBroadcasts } from "./_actions/broadcast";
import { BroadcastTabs } from "./_components/broadcast-tabs";
import { BroadcastHistory } from "./_components/broadcast-history";

export const dynamic = "force-dynamic";

export default async function BroadcastPage() {
  const [session, broadcasts] = await Promise.all([
    getSession(),
    getBroadcasts(),
  ]);

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <div className="w-full space-y-6 px-6 py-6">
        <div>
          <h1 className="text-foreground text-2xl font-bold tracking-tight">
            Broadcast
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Send messages to all users.
          </p>
        </div>

        <BroadcastTabs adminEmail={session.email ?? ""} />

        <section className="max-w-3xl">
          <h2 className="text-foreground mb-4 text-base font-semibold">
            History
          </h2>
          <BroadcastHistory
            broadcasts={
              broadcasts as Parameters<typeof BroadcastHistory>[0]["broadcasts"]
            }
          />
        </section>
      </div>
    </div>
  );
}
