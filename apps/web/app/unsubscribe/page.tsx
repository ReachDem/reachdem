import {
  ContactUnsubscribeService,
  UnsubscribeLinkService,
} from "@reachdem/core";

interface UnsubscribePageProps {
  searchParams: Promise<{ token?: string }>;
}

export default async function UnsubscribePage({
  searchParams,
}: UnsubscribePageProps) {
  const { token } = await searchParams;
  const payload = token ? UnsubscribeLinkService.parseToken(token) : null;

  let state: "success" | "invalid" = "invalid";
  let channelLabel = "message";

  if (payload) {
    channelLabel = payload.channel === "email" ? "email" : "SMS";

    const updated = await ContactUnsubscribeService.updateChannelPreference({
      organizationId: payload.organizationId,
      contactId: payload.contactId,
      channel: payload.channel,
      unsubscribed: true,
      source: "public_unsubscribe_link",
      reason: "recipient_clicked_unsubscribe_link",
      messageId: payload.messageId ?? null,
    });

    state = updated ? "success" : "invalid";
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center px-6 py-16">
      <div className="border-border bg-card w-full rounded-2xl border p-8 shadow-sm">
        <h1 className="text-2xl font-semibold tracking-tight">
          {state === "success"
            ? "Preference updated"
            : "Invalid unsubscribe link"}
        </h1>
        <p className="text-muted-foreground mt-3 text-sm">
          {state === "success"
            ? `You will no longer receive ${channelLabel} messages from this workspace.`
            : "This unsubscribe link is no longer valid or could not be verified."}
        </p>
      </div>
    </main>
  );
}
