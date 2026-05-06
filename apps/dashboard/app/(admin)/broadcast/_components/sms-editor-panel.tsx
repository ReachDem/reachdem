"use client";

import { useState, useTransition, type FormEvent } from "react";
import { sendSmsBroadcast } from "../_actions/broadcast";
import { cn } from "@/lib/utils";

const SMS_LIMIT = 160;
const WHATSAPP_LIMIT = 4096;

interface Props {
  adminEmail: string;
}

export function SmsEditorPanel({ adminEmail }: Props) {
  const [channel, setChannel] = useState<"SMS" | "WHATSAPP">("SMS");
  const [body, setBody] = useState("");
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{
    success?: boolean;
    error?: string;
  } | null>(null);

  const limit = channel === "SMS" ? SMS_LIMIT : WHATSAPP_LIMIT;
  const remaining = limit - body.length;
  const segmentCount =
    channel === "SMS" ? Math.ceil(body.length / SMS_LIMIT) : 1;

  function handleSend(e: FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    startTransition(async () => {
      const res = await sendSmsBroadcast({ body, channel, sentBy: adminEmail });
      if ("error" in res && res.error) {
        setResult({ error: res.error as string });
      } else {
        setResult({ success: true });
        setBody("");
      }
    });
  }

  return (
    <form onSubmit={handleSend} className="flex flex-col gap-4">
      {/* Channel selector*/}
      <div className="flex gap-2">
        {(["SMS", "WHATSAPP"] as const).map((ch) => (
          <button
            key={ch}
            type="button"
            onClick={() => setChannel(ch)}
            className={cn(
              "rounded-full px-4 py-1.5 text-xs font-medium transition-colors",
              channel === ch
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            )}
          >
            {ch === "SMS" ? "SMS" : "WhatsApp"}
          </button>
        ))}
      </div>

      {/* Message body*/}
      <div className="relative">
        <textarea
          required
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={limit}
          rows={8}
          placeholder={
            channel === "SMS"
              ? "Write your SMS message…"
              : "Write your WhatsApp message…"
          }
          className="border-input bg-background text-foreground placeholder:text-muted-foreground focus:ring-ring w-full resize-none rounded-lg border px-4 py-3 text-sm focus:ring-2 focus:ring-offset-1 focus:outline-none"
        />
        <div className="absolute right-3 bottom-3 flex items-center gap-2 text-xs">
          {channel === "SMS" && body.length > 0 && (
            <span className="text-muted-foreground">
              {segmentCount} {segmentCount === 1 ? "segment" : "segments"}
            </span>
          )}
          <span
            className={cn(
              remaining < 20 ? "text-destructive" : "text-muted-foreground"
            )}
          >
            {remaining}
          </span>
        </div>
      </div>

      {/* Character info*/}
      {channel === "SMS" && body.length > 0 && (
        <div className="bg-muted/50 rounded-md px-3 py-2 text-xs">
          <p className="text-muted-foreground">
            {body.length} chars · {segmentCount}{" "}
            {segmentCount === 1 ? "SMS segment" : "SMS segments"} ·{" "}
            {segmentCount > 1 &&
              "Each segment counts as a separate SMS for billing"}
          </p>
        </div>
      )}

      {/* Variables hint*/}
      <div className="bg-muted/30 rounded-md px-3 py-2 text-xs">
        <p className="text-muted-foreground mb-1 font-medium">
          Available variables
        </p>
        <div className="flex flex-wrap gap-1">
          {["{{name}}", "{{org_name}}", "{{email}}"].map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setBody((b) => b + v)}
              className="bg-background border-border hover:bg-muted rounded border px-2 py-0.5 font-mono text-[10px] transition-colors"
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {/* Result*/}
      {result && (
        <div
          className={cn(
            "rounded-md px-4 py-3 text-sm",
            result.success
              ? "bg-emerald-50 text-emerald-700"
              : "bg-red-50 text-red-700"
          )}
        >
          {result.success
            ? `${channel} broadcast queued successfully.`
            : result.error}
        </div>
      )}

      <div className="flex items-center justify-between">
        <p className="text-muted-foreground text-xs">
          Will be sent to all users with a verified phone number
        </p>
        <button
          type="submit"
          disabled={isPending || !body.trim()}
          className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-md px-5 py-2 text-sm font-medium transition-colors disabled:opacity-50"
        >
          {isPending ? "Sending…" : `Send ${channel}`}
        </button>
      </div>
    </form>
  );
}
