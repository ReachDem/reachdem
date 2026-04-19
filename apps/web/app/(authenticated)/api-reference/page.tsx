"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";

type Method = "GET" | "POST" | "PATCH" | "DELETE";

function MethodBadge({ method }: { method: Method }) {
  const classes: Record<Method, string> = {
    GET: "border-green-500/20 bg-green-500/10 text-green-500 hover:bg-green-500/20",
    POST: "border-blue-500/20 bg-blue-500/10 text-blue-500 hover:bg-blue-500/20",
    PATCH:
      "border-orange-500/20 bg-orange-500/10 text-orange-500 hover:bg-orange-500/20",
    DELETE: "border-red-500/20 bg-red-500/10 text-red-500 hover:bg-red-500/20",
  };

  return (
    <Badge
      variant="outline"
      className={`px-2 py-0.5 font-mono text-xs ${classes[method]}`}
    >
      {method}
    </Badge>
  );
}

function ParameterList({
  items,
}: {
  items: Array<{
    name: string;
    meta: string;
    description: string;
  }>;
}) {
  return (
    <ul className="space-y-4">
      {items.map((item) => (
        <li key={item.name} className="border-border/40 border-b pb-4">
          <div className="mb-1 flex items-center justify-between gap-4">
            <span className="font-mono text-sm">{item.name}</span>
            <span className="text-muted-foreground text-xs">{item.meta}</span>
          </div>
          <p className="text-muted-foreground text-sm">{item.description}</p>
        </li>
      ))}
    </ul>
  );
}

function CodePanel({
  title,
  language = "cURL",
  code,
}: {
  title: string;
  language?: string;
  code: string;
}) {
  return (
    <div className="border-border/20 sticky top-6 overflow-hidden rounded-xl border bg-[#121212] shadow-sm">
      <div className="border-border/20 text-muted-foreground flex justify-between border-b bg-[#1A1A1A] px-4 py-2 font-mono text-xs">
        <span>{title}</span>
        <span>{language}</span>
      </div>
      <pre className="overflow-x-auto p-4 font-mono text-xs leading-relaxed text-zinc-300">
        <code>{code}</code>
      </pre>
    </div>
  );
}

function EndpointList({
  items,
}: {
  items: Array<{
    method: Method;
    path: string;
    description: string;
  }>;
}) {
  return (
    <div className="border-border/50 overflow-hidden rounded-xl border shadow-sm">
      {items.map((item, index) => (
        <div
          key={`${item.method}-${item.path}`}
          className={`bg-card flex items-center gap-4 p-4 ${index < items.length - 1 ? "border-border/50 border-b" : ""}`}
        >
          <MethodBadge method={item.method} />
          <div className="min-w-0 flex-1">
            <code className="text-foreground block truncate text-[13px] font-semibold tracking-tight">
              {item.path}
            </code>
            <p className="text-muted-foreground mt-1 text-sm">
              {item.description}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

function ResourceSection({
  id,
  title,
  description,
  endpoints,
  children,
}: {
  id: string;
  title: string;
  description: string;
  endpoints: Array<{
    method: Method;
    path: string;
    description: string;
  }>;
  children?: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24 space-y-6">
      <div>
        <h2 className="mb-2 text-2xl font-bold tracking-tight">{title}</h2>
        <p className="text-muted-foreground">{description}</p>
      </div>
      {children}
      <EndpointList items={endpoints} />
    </section>
  );
}

export default function ApiReferencePage() {
  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-1 flex-col gap-8 p-6 pt-4 md:flex-row md:p-8">
      <aside className="sticky top-6 w-full flex-shrink-0 md:w-64">
        <div className="mb-8">
          <h2 className="mb-4 text-lg font-bold tracking-tight">
            API Reference
          </h2>
          <nav className="space-y-6">
            <div>
              <h3 className="text-muted-foreground mb-2 text-xs font-semibold tracking-wider uppercase">
                Introduction
              </h3>
              <ul className="space-y-1">
                <li>
                  <a
                    href="#authentication"
                    className="text-foreground/80 hover:text-primary text-sm transition-colors"
                  >
                    Authentication
                  </a>
                </li>
                <li>
                  <a
                    href="#errors"
                    className="text-foreground/80 hover:text-primary text-sm transition-colors"
                  >
                    Errors & Status Codes
                  </a>
                </li>
                <li>
                  <a
                    href="#idempotency"
                    className="text-foreground/80 hover:text-primary text-sm transition-colors"
                  >
                    Idempotency
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="text-muted-foreground mb-2 text-xs font-semibold tracking-wider uppercase">
                Messages
              </h3>
              <ul className="space-y-1">
                <li>
                  <a
                    href="#messages"
                    className="text-foreground/80 hover:text-primary text-sm transition-colors"
                  >
                    Messages Endpoints
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="text-muted-foreground mb-2 text-xs font-semibold tracking-wider uppercase">
                Contacts
              </h3>
              <ul className="space-y-1">
                <li>
                  <a
                    href="#contacts"
                    className="text-foreground/80 hover:text-primary text-sm transition-colors"
                  >
                    Contacts Endpoints
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="text-muted-foreground mb-2 text-xs font-semibold tracking-wider uppercase">
                Audience
              </h3>
              <ul className="space-y-1">
                <li>
                  <a
                    href="#groups"
                    className="text-foreground/80 hover:text-primary text-sm transition-colors"
                  >
                    Groups
                  </a>
                </li>
                <li>
                  <a
                    href="#segments"
                    className="text-foreground/80 hover:text-primary text-sm transition-colors"
                  >
                    Segments
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="text-muted-foreground mb-2 text-xs font-semibold tracking-wider uppercase">
                Campaigns
              </h3>
              <ul className="space-y-1">
                <li>
                  <a
                    href="#campaigns"
                    className="text-foreground/80 hover:text-primary text-sm transition-colors"
                  >
                    Campaign Endpoints
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="text-muted-foreground mb-2 text-xs font-semibold tracking-wider uppercase">
                Workspace
              </h3>
              <ul className="space-y-1">
                <li>
                  <a
                    href="#billing"
                    className="text-foreground/80 hover:text-primary text-sm transition-colors"
                  >
                    Billing
                  </a>
                </li>
              </ul>
            </div>
          </nav>
        </div>
      </aside>

      <div className="min-w-0 flex-1 space-y-16 pb-32">
        <section id="introduction">
          <h1 className="mb-4 text-4xl font-bold tracking-tight">
            ReachDem API Reference
          </h1>
          <p className="text-muted-foreground mb-8 text-lg leading-relaxed">
            The ReachDem public API is organized around REST. It uses
            JSON-encoded request and response bodies, bearer-token
            authentication, and conventional HTTP status codes.
          </p>
        </section>

        <section id="authentication" className="scroll-mt-24">
          <h2 className="border-border/50 mb-4 border-b pb-2 text-2xl font-bold">
            Authentication
          </h2>
          <p className="text-muted-foreground mb-4">
            Every request must include a bearer token generated from the API
            Config page.
          </p>
          <div className="border-border/50 rounded-lg border bg-[#121212] p-4 font-mono text-sm text-zinc-300">
            Authorization: Bearer rdm_your_api_key_here
          </div>
        </section>

        <section id="errors" className="scroll-mt-24">
          <h2 className="border-border/50 mb-4 border-b pb-2 text-2xl font-bold">
            Errors & Status Codes
          </h2>
          <div className="space-y-8">
            <div>
              <p className="text-muted-foreground mb-3 text-xs font-semibold tracking-wider uppercase">
                2XX Success
              </p>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="border-border/50 rounded-xl border p-4">
                  <p className="mb-2 font-mono text-sm font-semibold">200</p>
                  <p className="text-muted-foreground text-sm">
                    Successful read, accepted action, or idempotent replay for
                    endpoints that support it.
                  </p>
                </div>
                <div className="border-border/50 rounded-xl border p-4">
                  <p className="mb-2 font-mono text-sm font-semibold">201</p>
                  <p className="text-muted-foreground text-sm">
                    New resource created successfully, or write request accepted
                    as a fresh create operation.
                  </p>
                </div>
              </div>
            </div>

            <div>
              <p className="text-muted-foreground mb-3 text-xs font-semibold tracking-wider uppercase">
                4XX Client Errors
              </p>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="border-border/50 rounded-xl border p-4">
                  <p className="mb-2 font-mono text-sm font-semibold">400</p>
                  <p className="text-muted-foreground text-sm">
                    Validation failure or malformed request payload.
                  </p>
                </div>
                <div className="border-border/50 rounded-xl border p-4">
                  <p className="mb-2 font-mono text-sm font-semibold">401</p>
                  <p className="text-muted-foreground text-sm">
                    Missing or invalid bearer token.
                  </p>
                </div>
                <div className="border-border/50 rounded-xl border p-4">
                  <p className="mb-2 font-mono text-sm font-semibold">404</p>
                  <p className="text-muted-foreground text-sm">
                    Resource not found in the current workspace scope.
                  </p>
                </div>
                <div className="border-border/50 rounded-xl border p-4">
                  <p className="mb-2 font-mono text-sm font-semibold">422</p>
                  <p className="text-muted-foreground text-sm">
                    Request is valid but cannot be processed, for example not
                    enough credits or no provider configured.
                  </p>
                </div>
              </div>
            </div>

            <div>
              <p className="text-muted-foreground mb-3 text-xs font-semibold tracking-wider uppercase">
                5XX Server Errors
              </p>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="border-border/50 rounded-xl border p-4">
                  <p className="mb-2 font-mono text-sm font-semibold">500</p>
                  <p className="text-muted-foreground text-sm">
                    Unexpected internal server error while processing the
                    request.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="idempotency" className="scroll-mt-24">
          <h2 className="border-border/50 mb-4 border-b pb-2 text-2xl font-bold">
            Idempotency
          </h2>
          <p className="text-muted-foreground mb-4">
            Transactional message sends require an{" "}
            <code className="bg-muted rounded px-1.5 py-0.5 font-mono text-sm">
              Idempotency-Key
            </code>{" "}
            header. Use a stable UUID when retrying the same operation after a
            timeout to avoid duplicate sends.
          </p>
        </section>

        <hr className="border-border/40" />

        <ResourceSection
          id="messages"
          title="Messages"
          description="Transactional sending plus message retrieval for audit and delivery tracking."
          endpoints={[
            {
              method: "POST",
              path: "/v1/messages/send",
              description: "Send a transactional SMS or email message.",
            },
            {
              method: "GET",
              path: "/v1/messages",
              description:
                "List messages with optional status, date range, limit, and cursor filters.",
            },
            {
              method: "GET",
              path: "/v1/messages/{id}",
              description: "Retrieve a single message by ID.",
            },
          ]}
        >
          <div className="grid items-start gap-8 lg:grid-cols-2">
            <div>
              <div className="mb-4 flex items-center gap-3">
                <MethodBadge method="POST" />
                <h3 className="text-xl font-bold">Send a Message</h3>
              </div>
              <p className="text-muted-foreground mb-6">
                Use the unified send endpoint for SMS and email transactional
                traffic.
              </p>
              <h4 className="mb-3 text-sm font-semibold">BODY PARAMETERS</h4>
              <ParameterList
                items={[
                  {
                    name: "type",
                    meta: "string | required",
                    description: "Fixed value: transactional.",
                  },
                  {
                    name: "channel",
                    meta: "sms | email | required",
                    description: "Selects which request shape is expected.",
                  },
                  {
                    name: "to",
                    meta: "string | required",
                    description:
                      "Recipient phone number in E.164 format for SMS, or recipient email for email.",
                  },
                  {
                    name: "text",
                    meta: "string | SMS only",
                    description:
                      "Plain-text SMS content, up to 160 characters.",
                  },
                  {
                    name: "subject / html",
                    meta: "string | email only",
                    description:
                      "Required email subject and HTML body when channel=email.",
                  },
                ]}
              />
            </div>
            <CodePanel
              title="POST /v1/messages/send"
              code={`curl -X POST https://api.reachdem.com/v1/messages/send \\
  -H "Authorization: Bearer rdm_xxx..." \\
  -H "Idempotency-Key: 3d4fe9d2-4b70-4f2f-b840-5eb2ec6e91e0" \\
  -H "Content-Type: application/json" \\
  -d '{
    "type": "transactional",
    "channel": "sms",
    "to": "+237670112233",
    "text": "Hello from ReachDem!",
    "from": "ReachDem"
  }'`}
            />
          </div>
        </ResourceSection>

        <ResourceSection
          id="contacts"
          title="Contacts"
          description="Workspace contact management for CRM, segmentation, and campaign targeting."
          endpoints={[
            {
              method: "GET",
              path: "/v1/contacts",
              description: "List contacts with q, page, and limit filters.",
            },
            {
              method: "POST",
              path: "/v1/contacts",
              description: "Create a new contact.",
            },
            {
              method: "GET",
              path: "/v1/contacts/{id}",
              description: "Get contact details by ID.",
            },
            {
              method: "PATCH",
              path: "/v1/contacts/{id}",
              description: "Partially update a contact.",
            },
            {
              method: "DELETE",
              path: "/v1/contacts/{id}",
              description: "Delete a contact.",
            },
          ]}
        >
          <div className="grid items-start gap-8 lg:grid-cols-2">
            <div>
              <div className="mb-4 flex items-center gap-3">
                <MethodBadge method="POST" />
                <h3 className="text-xl font-bold">Create Contact</h3>
              </div>
              <p className="text-muted-foreground mb-6">
                Contacts require a display name plus at least one reachable
                channel: phone or email.
              </p>
              <h4 className="mb-3 text-sm font-semibold">BODY PARAMETERS</h4>
              <ParameterList
                items={[
                  {
                    name: "name",
                    meta: "string | required",
                    description: "Contact display name.",
                  },
                  {
                    name: "phoneE164",
                    meta: "string | optional",
                    description:
                      "E.164 phone number. Required if email is omitted.",
                  },
                  {
                    name: "email",
                    meta: "string | optional",
                    description:
                      "Valid email address. Required if phoneE164 is omitted.",
                  },
                  {
                    name: "customFields",
                    meta: "object | optional",
                    description:
                      "Free-form custom metadata used by segmentation logic.",
                  },
                ]}
              />
            </div>
            <CodePanel
              title="POST /v1/contacts"
              code={`curl -X POST https://api.reachdem.com/v1/contacts \\
  -H "Authorization: Bearer rdm_xxx..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "Amina Ngono",
    "phoneE164": "+237670112233",
    "email": "amina.ngono@novatech.cm",
    "enterprise": "NovaTech Cameroun",
    "customFields": {
      "city": "Douala",
      "loyalty_tier": "gold"
    }
  }'`}
            />
          </div>
        </ResourceSection>

        <ResourceSection
          id="groups"
          title="Groups"
          description="Manual audience collections that you can create, update, and attach contacts to."
          endpoints={[
            {
              method: "GET",
              path: "/v1/groups",
              description: "List groups in the workspace.",
            },
            {
              method: "POST",
              path: "/v1/groups",
              description: "Create a new group.",
            },
            {
              method: "GET",
              path: "/v1/groups/{id}",
              description: "Get a single group.",
            },
            {
              method: "PATCH",
              path: "/v1/groups/{id}",
              description: "Update group name or description.",
            },
            {
              method: "DELETE",
              path: "/v1/groups/{id}",
              description: "Delete a group.",
            },
            {
              method: "GET",
              path: "/v1/groups/{id}/contacts",
              description: "List contacts attached to a group.",
            },
            {
              method: "POST",
              path: "/v1/groups/{id}/contacts",
              description: "Add contacts to a group.",
            },
            {
              method: "DELETE",
              path: "/v1/groups/{id}/contacts",
              description: "Remove contacts from a group.",
            },
          ]}
        >
          <div className="grid items-start gap-8 lg:grid-cols-2">
            <div>
              <div className="mb-4 flex items-center gap-3">
                <MethodBadge method="POST" />
                <h3 className="text-xl font-bold">Add Contacts to a Group</h3>
              </div>
              <p className="text-muted-foreground mb-6">
                Group membership operations accept a list of contact IDs.
              </p>
              <h4 className="mb-3 text-sm font-semibold">BODY PARAMETERS</h4>
              <ParameterList
                items={[
                  {
                    name: "contactIds",
                    meta: "array[string] | required",
                    description:
                      "One or more contact IDs to attach to the target group.",
                  },
                ]}
              />
            </div>
            <CodePanel
              title="POST /v1/groups/{id}/contacts"
              code={`curl -X POST https://api.reachdem.com/v1/groups/grp_01hr8mb2rjz7dwm9f4t4d9fpyw/contacts \\
  -H "Authorization: Bearer rdm_xxx..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "contactIds": [
      "ct_01hr8m3t4s0m8f2vvf5b3c4n7d",
      "ct_01hr8m4jk6cgp7s6y0d3f4r2qa"
    ]
  }'`}
            />
          </div>
        </ResourceSection>

        <ResourceSection
          id="segments"
          title="Segments"
          description="Dynamic audiences generated from logical conditions over contact data."
          endpoints={[
            {
              method: "GET",
              path: "/v1/segments",
              description: "List segments.",
            },
            {
              method: "POST",
              path: "/v1/segments",
              description: "Create a segment from a definition tree.",
            },
            {
              method: "POST",
              path: "/v1/segments/preview",
              description:
                "Preview matching contacts without persisting a segment.",
            },
            {
              method: "GET",
              path: "/v1/segments/{id}",
              description: "Get a segment by ID.",
            },
            {
              method: "PATCH",
              path: "/v1/segments/{id}",
              description: "Update a segment.",
            },
            {
              method: "DELETE",
              path: "/v1/segments/{id}",
              description: "Delete a segment.",
            },
            {
              method: "GET",
              path: "/v1/segments/{id}/contacts",
              description: "List contacts that currently match the segment.",
            },
          ]}
        >
          <div className="grid items-start gap-8 lg:grid-cols-2">
            <div>
              <div className="mb-4 flex items-center gap-3">
                <MethodBadge method="POST" />
                <h3 className="text-xl font-bold">Preview Segment</h3>
              </div>
              <p className="text-muted-foreground mb-6">
                Segment definitions are recursive trees built from conditions
                and logical operators.
              </p>
              <h4 className="mb-3 text-sm font-semibold">BODY PARAMETERS</h4>
              <ParameterList
                items={[
                  {
                    name: "definition",
                    meta: "SegmentNode | required",
                    description:
                      "Recursive segment tree containing AND/OR groups and condition nodes.",
                  },
                ]}
              />
            </div>
            <CodePanel
              title="POST /v1/segments/preview"
              code={`curl -X POST https://api.reachdem.com/v1/segments/preview \\
  -H "Authorization: Bearer rdm_xxx..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "definition": {
      "op": "OR",
      "children": [
        {
          "field": "loyalty_tier",
          "operator": "in",
          "type": "string",
          "value": ["gold", "platinum"]
        },
        {
          "field": "city",
          "operator": "eq",
          "type": "string",
          "value": "Yaounde"
        }
      ]
    }
  }'`}
            />
          </div>
        </ResourceSection>

        <ResourceSection
          id="campaigns"
          title="Campaigns"
          description="Draft, target, launch, and monitor SMS or email campaigns."
          endpoints={[
            {
              method: "GET",
              path: "/v1/campaigns",
              description: "List campaigns.",
            },
            {
              method: "POST",
              path: "/v1/campaigns",
              description: "Create a draft campaign.",
            },
            {
              method: "GET",
              path: "/v1/campaigns/{id}",
              description: "Get campaign details.",
            },
            {
              method: "PATCH",
              path: "/v1/campaigns/{id}",
              description: "Update a draft campaign.",
            },
            {
              method: "DELETE",
              path: "/v1/campaigns/{id}",
              description: "Delete a draft campaign.",
            },
            {
              method: "GET",
              path: "/v1/campaigns/{id}/audience",
              description: "List the campaign audience sources.",
            },
            {
              method: "POST",
              path: "/v1/campaigns/{id}/audience",
              description: "Replace campaign audience sources.",
            },
            {
              method: "POST",
              path: "/v1/campaigns/{id}/launch",
              description: "Launch a draft campaign.",
            },
            {
              method: "GET",
              path: "/v1/campaigns/{id}/stats",
              description: "Read delivery and engagement statistics.",
            },
          ]}
        >
          <div className="grid items-start gap-8 lg:grid-cols-2">
            <div>
              <div className="mb-4 flex items-center gap-3">
                <MethodBadge method="POST" />
                <h3 className="text-xl font-bold">Create Campaign</h3>
              </div>
              <p className="text-muted-foreground mb-6">
                Campaign content depends on the chosen channel. SMS campaigns
                use <code className="bg-muted px-1">text</code> and optional{" "}
                <code className="bg-muted px-1">from</code>. Email campaigns use{" "}
                <code className="bg-muted px-1">subject</code> and{" "}
                <code className="bg-muted px-1">html</code>.
              </p>
              <h4 className="mb-3 text-sm font-semibold">BODY PARAMETERS</h4>
              <ParameterList
                items={[
                  {
                    name: "name",
                    meta: "string | required",
                    description: "Campaign name.",
                  },
                  {
                    name: "channel",
                    meta: "sms | email | required",
                    description:
                      "Determines the allowed content shape for the campaign.",
                  },
                  {
                    name: "content",
                    meta: "object | required",
                    description:
                      "SmsCampaignContent or EmailCampaignContent depending on the selected channel.",
                  },
                  {
                    name: "scheduledAt",
                    meta: "datetime | optional",
                    description: "Optional date-time for future execution.",
                  },
                ]}
              />
            </div>
            <CodePanel
              title="POST /v1/campaigns"
              code={`curl -X POST https://api.reachdem.com/v1/campaigns \\
  -H "Authorization: Bearer rdm_xxx..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "Relance clients inactifs Douala",
    "description": "Campagne SMS pour reengager les clients inactifs depuis 30 jours.",
    "channel": "sms",
    "content": {
      "text": "Bonjour {{first_name}}, profitez de 15% de reduction jusqu'a dimanche.",
      "from": "ReachDem"
    },
    "scheduledAt": "2026-04-15T09:00:00.000Z"
  }'`}
            />
          </div>
        </ResourceSection>

        <ResourceSection
          id="billing"
          title="Workspace Billing"
          description="Read current credit balance and quota information for the authenticated workspace."
          endpoints={[
            {
              method: "GET",
              path: "/v1/workspace/billing",
              description:
                "Return balance, credit balance, quota usage, and sender/workspace verification details.",
            },
          ]}
        >
          <div className="grid items-start gap-8 lg:grid-cols-2">
            <div>
              <div className="mb-4 flex items-center gap-3">
                <MethodBadge method="GET" />
                <h3 className="text-xl font-bold">Billing Summary</h3>
              </div>
              <p className="text-muted-foreground mb-6">
                This endpoint is useful for preflight checks before sending or
                launching campaigns.
              </p>
              <h4 className="mb-3 text-sm font-semibold">RESPONSE FIELDS</h4>
              <ParameterList
                items={[
                  {
                    name: "workspace.balance",
                    meta: "object | required",
                    description:
                      "Monetary balance with amountMinor and currency.",
                  },
                  {
                    name: "workspace.creditBalance",
                    meta: "integer | required",
                    description: "Available messaging credits.",
                  },
                  {
                    name: "workspace.smsQuotaUsed",
                    meta: "integer | required",
                    description: "Consumed SMS quota for the workspace.",
                  },
                  {
                    name: "workspace.senderId",
                    meta: "string | nullable",
                    description:
                      "Current sender ID when one is configured for the workspace.",
                  },
                ]}
              />
            </div>
            <CodePanel
              title="GET /v1/workspace/billing"
              code={`curl https://api.reachdem.com/v1/workspace/billing \\
  -H "Authorization: Bearer rdm_xxx..."`}
            />
          </div>
        </ResourceSection>
      </div>
    </div>
  );
}
