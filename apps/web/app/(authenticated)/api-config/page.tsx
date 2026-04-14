"use client";

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  BookOpen,
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  Filter,
  Key,
  Link2,
  MessageSquare,
  RefreshCw,
  Send,
  Server,
  Users,
  type LucideIcon,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Link from "next/link";

type ApiLanguage = "cURL" | "JavaScript" | "Python" | "PHP";

type ApiKeyResponse = {
  apiKey: string;
  redacted: string;
  title: string;
  type: string;
  createdAt: string;
  lastUsedAt: string | null;
  activeKeyCount?: number;
  error?: string;
};

function SidebarLink({
  href,
  icon: Icon,
  label,
}: {
  href: string;
  icon: LucideIcon;
  label: string;
}) {
  return (
    <a
      href={href}
      className="text-muted-foreground hover:bg-muted hover:text-foreground group flex items-center justify-between rounded-md px-3 py-2 text-sm font-medium transition-colors"
    >
      <div className="flex items-center gap-3">
        <Icon className="h-4 w-4" />
        {label}
      </div>
      <span className="text-muted-foreground/30 group-hover:text-muted-foreground/70 transition-colors">
        &rsaquo;
      </span>
    </a>
  );
}

function EndpointRow({
  method,
  path,
  description,
  payload,
}: {
  method: "GET" | "POST" | "PATCH" | "DELETE";
  path: string;
  description: string;
  payload?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const methodColors: Record<string, string> = {
    GET: "bg-green-500/10 text-green-500 border-green-500/20",
    POST: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    PATCH: "bg-orange-500/10 text-orange-500 border-orange-500/20",
    DELETE: "bg-red-500/10 text-red-500 border-red-500/20",
  };

  return (
    <div className="border-border/50 hover:bg-muted/10 flex flex-col border-b transition-colors last:border-0">
      <div
        className="flex cursor-pointer items-center gap-4 p-4 select-none"
        onClick={() => setIsOpen((current) => !current)}
      >
        <span
          className={`w-14 shrink-0 rounded-[4px] border px-2 py-0.5 text-center font-mono text-[11px] font-semibold tracking-wide ${methodColors[method]}`}
        >
          {method}
        </span>
        <div className="flex flex-1 flex-col justify-between gap-1 overflow-hidden sm:flex-row sm:items-center">
          <code className="text-foreground truncate text-[13px] font-semibold tracking-tight">
            {path}
          </code>
          <p className="text-muted-foreground truncate text-[13px]">
            {description}
          </p>
        </div>
        <span className="text-muted-foreground/50 ml-2 shrink-0 transition-transform duration-200">
          {isOpen ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </span>
      </div>
      {isOpen && payload && (
        <div className="animate-in slide-in-from-top-1 fade-in px-4 pb-4 duration-200 select-text">
          <div className="bg-background/50 border-border/50 rounded-lg border p-4">
            <p className="text-muted-foreground mb-2 text-[11px] font-medium tracking-wider uppercase">
              Example Payload
            </p>
            <pre className="border-border/20 selection:bg-primary/30 overflow-x-auto rounded border bg-[#121212] p-3 font-mono text-xs text-zinc-300">
              <code>{payload}</code>
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ApiConfigPage() {
  const [apiKey, setApiKey] = useState("");
  const [copied, setCopied] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRotating, setIsRotating] = useState(false);
  const [apiBaseUrl, setApiBaseUrl] = useState("https://api.reachdem.com/api");
  const [activeLang, setActiveLang] = useState<ApiLanguage>("cURL");
  const defaultIdempotencyKey = "idemp_a1b2c3d4";

  const loadApiKey = async () => {
    setIsLoading(true);

    try {
      const response = await fetch("/api/api-keys/default", {
        cache: "no-store",
      });
      const payload = (await response.json()) as ApiKeyResponse;

      if (!response.ok) {
        throw new Error(payload.error || "Unable to load API key.");
      }

      setApiKey(payload.apiKey);
    } catch (error: any) {
      console.error("[api-config] Failed to load API key", error);
      setApiKey("");
      window.alert(error?.message || "Unable to load API key.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      setApiBaseUrl(`${window.location.origin}/api`);
    }

    void loadApiKey();
  }, []);

  const generateNewKey = async () => {
    if (
      confirm(
        "Are you sure? This will immediately revoke your existing key and generate a new one. Applications using the old key will stop working."
      )
    ) {
      setIsRotating(true);

      try {
        const response = await fetch("/api/api-keys/default/rotate", {
          method: "POST",
        });
        const payload = (await response.json()) as ApiKeyResponse;

        if (!response.ok) {
          throw new Error(payload.error || "Unable to rotate API key.");
        }

        setApiKey(payload.apiKey);
      } catch (error: any) {
        console.error("[api-config] Failed to rotate API key", error);
        window.alert(error?.message || "Unable to rotate API key.");
      } finally {
        setIsRotating(false);
      }
    }
  };

  const copyToClipboard = (
    text: string,
    setter: React.Dispatch<React.SetStateAction<boolean>>
  ) => {
    navigator.clipboard.writeText(text);
    setter(true);
    setTimeout(() => setter(false), 2000);
  };

  const codeExamples: Record<ApiLanguage, string> = {
    cURL: `curl -X POST ${apiBaseUrl}/v1/messages/send \\
  -H "Authorization: Bearer ${apiKey}" \\
  -H "Content-Type: application/json" \\
  -H "Idempotency-Key: ${defaultIdempotencyKey}" \\
  -d '{
    "type": "transactional",
    "channel": "sms",
    "to": "+237670112233",
    "text": "Hello from ReachDem!",
    "from": "ReachDem"
  }'`,
    JavaScript: `const response = await fetch('${apiBaseUrl}/v1/messages/send', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ${apiKey}',
    'Content-Type': 'application/json',
    'Idempotency-Key': '${defaultIdempotencyKey}'
  },
  body: JSON.stringify({
    type: 'transactional',
    channel: 'sms',
    to: '+237670112233',
    text: 'Hello from ReachDem!',
    from: 'ReachDem'
  })
});

const data = await response.json();`,
    Python: `import requests

response = requests.post(
    '${apiBaseUrl}/v1/messages/send',
    headers={
        'Authorization': f'Bearer ${apiKey}',
        'Content-Type': 'application/json',
        'Idempotency-Key': '${defaultIdempotencyKey}'
    },
    json={
        'type': 'transactional',
        'channel': 'sms',
        'to': '+237670112233',
        'text': 'Hello from ReachDem!',
        'from': 'ReachDem',
    }
)`,
    PHP: `<?php
$ch = curl_init('${apiBaseUrl}/v1/messages/send');

$data = json_encode([
    'type' => 'transactional',
    'channel' => 'sms',
    'to' => '+237670112233',
    'text' => 'Hello from ReachDem!',
    'from' => 'ReachDem',
]);

curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Authorization: Bearer ' . '${apiKey}',
    'Content-Type: application/json',
    'Idempotency-Key: ${defaultIdempotencyKey}'
]);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, $data);

$response = curl_exec($ch);
curl_close($ch);
?>`,
  };

  return (
    <div className="mx-auto flex w-full max-w-[1200px] flex-1 flex-col gap-6 p-6 pt-4 md:p-8">
      <div className="flex flex-col items-start gap-8 md:flex-row">
        {/* Sidebar Panel */}
        <aside className="sticky top-6 w-full flex-shrink-0 md:w-64">
          <div className="mb-8">
            <h2 className="mb-4 px-3 text-lg font-bold tracking-tight">
              API Resources
            </h2>
            <nav className="space-y-1">
              <Link
                href="/api-reference"
                className="bg-primary/10 text-primary hover:bg-primary/20 border-primary/20 mb-4 flex items-center gap-3 rounded-md border px-3 py-2 text-sm font-medium transition-colors"
              >
                <BookOpen className="h-4 w-4" />
                View API Reference
              </Link>
              <SidebarLink
                href="#endpoints"
                icon={Server}
                label="Quick Endpoints"
              />
              <SidebarLink
                href="#messages"
                icon={MessageSquare}
                label="Messages"
              />
              <SidebarLink href="#contacts" icon={Users} label="Contacts" />
              <SidebarLink href="#campaigns" icon={Send} label="Campaigns" />
              <SidebarLink href="#segments" icon={Filter} label="Segments" />
              <SidebarLink
                href="#links"
                icon={Link2}
                label="Links & Tracking"
              />
            </nav>
          </div>
        </aside>

        {/* Main Content Area */}
        <div className="min-w-0 flex-1 space-y-12 pb-24">
          {/* Header & API Key Management */}
          <section>
            <div className="mb-2 flex items-start justify-between">
              <h1 className="text-3xl font-bold tracking-tight">
                API & Developers
              </h1>
              <Button
                asChild
                variant="outline"
                size="sm"
                className="hidden md:flex"
              >
                <Link href="/api-reference">Detailed API Reference</Link>
              </Button>
            </div>
            <p className="text-muted-foreground mb-8 text-base">
              Manage your API keys and see a quick overview of ReachDem
              endpoints.
            </p>

            <Card className="border-border/50 bg-card/40 border shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-xl">
                  <Key className="text-primary h-5 w-5" />
                  Live API Key
                </CardTitle>
                <CardDescription>
                  This key allows full access to your ReachDem account via the
                  API. Keep it secret.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col items-center gap-3 sm:flex-row">
                  <div className="relative w-full flex-1">
                    <code className="bg-background border-border/50 flex w-full items-center rounded-lg border p-3 pr-12 font-mono text-sm break-all shadow-inner">
                      {apiKey || (isLoading ? "Loading..." : "Unavailable")}
                    </code>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:text-foreground absolute top-1/2 right-1 h-8 w-8 -translate-y-1/2"
                      onClick={() => copyToClipboard(apiKey, setCopied)}
                      disabled={!apiKey}
                    >
                      {copied ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <Button
                    variant="destructive"
                    onClick={() => void generateNewKey()}
                    disabled={isLoading || isRotating}
                    className="h-11 w-full shrink-0 shadow-sm sm:w-auto"
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    {isRotating ? "Revoking..." : "Revoke Key"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Quick Start Code Example */}
          <section id="quickstart" className="scroll-mt-24">
            <h2 className="text-foreground mb-4 text-xl font-bold">
              Send a Transactional Message
            </h2>
            <p className="text-muted-foreground mb-4 text-sm">
              Example code to send your first message. Don&apos;t forget the{" "}
              <code className="bg-muted rounded px-1.5 py-0.5 font-mono text-xs">
                Idempotency-Key
              </code>{" "}
              header to prevent double sends.
            </p>
            <div className="border-border/50 overflow-hidden rounded-xl border bg-[#121212] shadow-sm">
              <div className="border-border/20 flex items-center justify-between border-b bg-[#1A1A1A] px-2 pt-2">
                <div className="flex gap-1 overflow-x-auto pb-2">
                  {(["cURL", "JavaScript", "Python", "PHP"] as const).map(
                    (lang) => (
                      <button
                        key={lang}
                        onClick={() => setActiveLang(lang)}
                        className={`rounded-lg px-4 py-1.5 text-sm font-medium whitespace-nowrap transition-colors ${activeLang === lang ? "bg-white/10 text-white" : "text-muted-foreground hover:bg-white/5 hover:text-white"}`}
                      >
                        {lang}
                      </button>
                    )
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground mr-2 mb-2 h-8 shrink-0 hover:text-white"
                  onClick={() =>
                    copyToClipboard(codeExamples[activeLang], setCodeCopied)
                  }
                >
                  {codeCopied ? (
                    <Check className="mr-2 h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="mr-2 h-4 w-4" />
                  )}
                  Copy
                </Button>
              </div>
              <div className="scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent overflow-x-auto p-5">
                <pre className="font-mono text-[13px] leading-relaxed text-zinc-300">
                  <code>{codeExamples[activeLang]}</code>
                </pre>
              </div>
            </div>
          </section>

          {/* Endpoints Reference */}
          <section id="endpoints" className="space-y-12 pt-4">
            {/* Messages */}
            <div id="messages" className="scroll-mt-24">
              <h3 className="mb-1 text-lg font-bold">Messages Endpoints</h3>
              <p className="text-muted-foreground mb-4 text-sm">
                3 endpoints available
              </p>
              <div className="border-border/50 bg-card flex flex-col overflow-hidden rounded-xl border shadow-sm">
                <EndpointRow
                  method="GET"
                  path="/v1/messages"
                  description="List messages (?status, ?from, ?to, ?limit, ?cursor)"
                  payload={
                    "// No request body needed\n// Returns a paginated list of sent messages"
                  }
                />
                <EndpointRow
                  method="GET"
                  path="/v1/messages/:id"
                  description="Retrieve a specific message by ID"
                  payload={"// No request body needed"}
                />
                <EndpointRow
                  method="POST"
                  path="/v1/messages/send"
                  description="Send a transactional SMS or email"
                  payload={
                    '{\n  "type": "transactional",\n  "channel": "sms",\n  "to": "+237670112233",\n  "text": "Your verification code is 4321",\n  "from": "ReachDem"\n}'
                  }
                />
              </div>
            </div>

            {/* Contacts */}
            <div id="contacts" className="scroll-mt-24">
              <h3 className="mb-1 text-lg font-bold">Contacts Endpoints</h3>
              <p className="text-muted-foreground mb-4 text-sm">
                5 endpoints available
              </p>
              <div className="border-border/50 bg-card flex flex-col overflow-hidden rounded-xl border shadow-sm">
                <EndpointRow
                  method="GET"
                  path="/v1/contacts"
                  description="List contacts (?page, ?limit, ?q)"
                  payload={
                    "// No request body needed\n// Search by name, phone or email using the q query parameter"
                  }
                />
                <EndpointRow
                  method="POST"
                  path="/v1/contacts"
                  description="Create a new contact"
                  payload={
                    '{\n  "name": "Amina Ngono",\n  "phoneE164": "+237670112233",\n  "email": "amina.ngono@novatech.cm",\n  "enterprise": "NovaTech Cameroun",\n  "customFields": {\n    "city": "Douala",\n    "loyalty_tier": "gold"\n  }\n}'
                  }
                />
                <EndpointRow
                  method="GET"
                  path="/v1/contacts/:id"
                  description="Retrieve a contact"
                  payload={"// No request body needed"}
                />
                <EndpointRow
                  method="PATCH"
                  path="/v1/contacts/:id"
                  description="Update a contact partially"
                  payload={
                    '{\n  "work": "Regional Growth Lead",\n  "customFields": {\n    "preferred_channel": "sms"\n  }\n}'
                  }
                />
                <EndpointRow
                  method="DELETE"
                  path="/v1/contacts/:id"
                  description="Delete a contact"
                  payload={"// No request body needed"}
                />
              </div>
            </div>

            {/* Campaigns */}
            <div id="campaigns" className="scroll-mt-24">
              <h3 className="mb-1 text-lg font-bold">Campaigns Endpoints</h3>
              <p className="text-muted-foreground mb-4 text-sm">
                7 endpoints available
              </p>
              <div className="border-border/50 bg-card flex flex-col overflow-hidden rounded-xl border shadow-sm">
                <EndpointRow
                  method="GET"
                  path="/v1/campaigns"
                  description="List all campaigns"
                  payload={"// No request body needed"}
                />
                <EndpointRow
                  method="POST"
                  path="/v1/campaigns"
                  description="Create a new draft campaign"
                  payload={
                    '{\n  "name": "Relance clients inactifs Douala",\n  "description": "Campagne SMS pour reengager les clients inactifs.",\n  "channel": "sms",\n  "content": {\n    "text": "Bonjour {{first_name}}, profitez de 15% de reduction jusqu\\\'a dimanche.",\n    "from": "ReachDem"\n  },\n  "scheduledAt": "2026-04-15T09:00:00.000Z"\n}'
                  }
                />
                <EndpointRow
                  method="GET"
                  path="/v1/campaigns/:id"
                  description="Retrieve a campaign"
                  payload={"// No request body needed"}
                />
                <EndpointRow
                  method="PATCH"
                  path="/v1/campaigns/:id"
                  description="Update a draft campaign"
                  payload={
                    '{\n  "description": "Campagne SMS relance Douala - segment premium",\n  "scheduledAt": "2026-04-15T10:30:00.000Z"\n}'
                  }
                />
                <EndpointRow
                  method="DELETE"
                  path="/v1/campaigns/:id"
                  description="Delete a draft campaign"
                  payload={"// No request body needed"}
                />
                <EndpointRow
                  method="POST"
                  path="/v1/campaigns/:id/audience"
                  description="Replace campaign audience sources"
                  payload={
                    '{\n  "audiences": [\n    {\n      "sourceType": "segment",\n      "sourceId": "seg_01hr8mf3w7v2t54m31kav4mecx"\n    }\n  ]\n}'
                  }
                />
                <EndpointRow
                  method="POST"
                  path="/v1/campaigns/:id/launch"
                  description="Launch a draft campaign"
                  payload={"// No request body needed"}
                />
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
