"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";

export default function ApiReferencePage() {
  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-1 flex-col gap-8 p-6 pt-4 md:flex-row md:p-8">
      {/* Sidebar Navigation */}
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
                    href="#messages-send"
                    className="text-foreground/80 hover:text-primary text-sm transition-colors"
                  >
                    Send a Message
                  </a>
                </li>
                <li>
                  <a
                    href="#messages-list"
                    className="text-foreground/80 hover:text-primary text-sm transition-colors"
                  >
                    List Messages
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
                    href="#contacts-create"
                    className="text-foreground/80 hover:text-primary text-sm transition-colors"
                  >
                    Create Contact
                  </a>
                </li>
                <li>
                  <a
                    href="#contacts-list"
                    className="text-foreground/80 hover:text-primary text-sm transition-colors"
                  >
                    List Contacts
                  </a>
                </li>
              </ul>
            </div>
          </nav>
        </div>
      </aside>

      {/* Main Documentation Content */}
      <div className="min-w-0 flex-1 space-y-16 pb-32">
        <section id="introduction">
          <h1 className="mb-4 text-4xl font-bold tracking-tight">
            ReachDem API Reference
          </h1>
          <p className="text-muted-foreground mb-8 text-lg leading-relaxed">
            Welcome to the ReachDem API. The API is organized around REST. Our
            API has predictable resource-oriented URLs, returns JSON-encoded
            responses, and uses standard HTTP response codes, authentication,
            and verbs.
          </p>
        </section>

        {/* Authentication */}
        <section id="authentication" className="scroll-mt-24">
          <h2 className="border-border/50 mb-4 border-b pb-2 text-2xl font-bold">
            Authentication
          </h2>
          <p className="text-muted-foreground mb-4">
            The ReachDem API uses bearer tokens to authenticate requests. You
            can view and manage your API keys in the{" "}
            <a href="/api-config" className="text-primary hover:underline">
              API Config Dashboard
            </a>
            .
          </p>
          <div className="border-border/50 rounded-lg border bg-[#121212] p-4 font-mono text-sm text-zinc-300">
            Authorization: Bearer sk_live_your_api_key_here
          </div>
        </section>

        {/* Idempotency */}
        <section id="idempotency" className="scroll-mt-24">
          <h2 className="border-border/50 mb-4 border-b pb-2 text-2xl font-bold">
            Idempotency
          </h2>
          <p className="text-muted-foreground mb-4">
            To prevent duplicate executions (like sending the same SMS twice
            during a network timeout), you must safely retry requests using an{" "}
            <code className="bg-muted rounded px-1.5 py-0.5 font-mono text-sm">
              Idempotency-Key
            </code>{" "}
            header. We recommend using V4 UUIDs.
          </p>
        </section>

        <hr className="border-border/40" />

        {/* Endpoint: Send Message */}
        <section
          id="messages-send"
          className="grid scroll-mt-24 items-start gap-8 lg:grid-cols-2"
        >
          <div>
            <div className="mb-4 flex items-center gap-3">
              <Badge
                variant="outline"
                className="border-blue-500/20 bg-blue-500/10 px-2 py-0.5 font-mono text-xs text-blue-500 hover:bg-blue-500/20"
              >
                POST
              </Badge>
              <h3 className="text-xl font-bold">Send a Message</h3>
            </div>
            <p className="text-muted-foreground mb-6">
              Send an immediate, transactional SMS or WhatsApp message to a
              specific recipient.
            </p>

            <h4 className="mb-3 text-sm font-semibold">BODY PARAMETERS</h4>
            <ul className="space-y-4">
              <li className="border-border/40 border-b pb-4">
                <div className="mb-1 flex items-center justify-between">
                  <span className="font-mono text-sm">to</span>
                  <span className="text-muted-foreground text-xs">
                    string | required
                  </span>
                </div>
                <p className="text-muted-foreground text-sm">
                  The destination phone number in E.164 format.
                </p>
              </li>
              <li className="border-border/40 border-b pb-4">
                <div className="mb-1 flex items-center justify-between">
                  <span className="font-mono text-sm">channel</span>
                  <span className="text-muted-foreground text-xs">
                    string | required
                  </span>
                </div>
                <p className="text-muted-foreground text-sm">
                  Enum: <code className="bg-muted px-1">sms</code>,{" "}
                  <code className="bg-muted px-1">whatsapp</code>
                </p>
              </li>
              <li className="border-border/40 border-b pb-4">
                <div className="mb-1 flex items-center justify-between">
                  <span className="font-mono text-sm">content</span>
                  <span className="text-muted-foreground text-xs">
                    string | required
                  </span>
                </div>
                <p className="text-muted-foreground text-sm">
                  The plain text payload of your message.
                </p>
              </li>
            </ul>
          </div>

          <div className="border-border/20 sticky top-6 overflow-hidden rounded-xl border bg-[#121212] shadow-sm">
            <div className="border-border/20 text-muted-foreground flex justify-between border-b bg-[#1A1A1A] px-4 py-2 font-mono text-xs">
              <span>POST /v1/messages/send</span>
              <span>cURL</span>
            </div>
            <pre className="overflow-x-auto p-4 font-mono text-xs leading-relaxed text-zinc-300">
              <span className="text-pink-400">curl</span> -X POST
              https://api.reachdem.com/v1/messages/send \<br />
              &nbsp;&nbsp;-H{" "}
              <span className="text-green-300">
                "Authorization: Bearer sk_live_xyz..."
              </span>{" "}
              \<br />
              &nbsp;&nbsp;-H{" "}
              <span className="text-green-300">
                "Idempotency-Key: uuid-v4"
              </span>{" "}
              \<br />
              &nbsp;&nbsp;-H{" "}
              <span className="text-green-300">
                "Content-Type: application/json"
              </span>{" "}
              \<br />
              &nbsp;&nbsp;-d{" "}
              <span className="text-yellow-300">
                '{"{"}
                <br />
                &nbsp;&nbsp;&nbsp;&nbsp;"to": "+1234567890",
                <br />
                &nbsp;&nbsp;&nbsp;&nbsp;"channel": "sms",
                <br />
                &nbsp;&nbsp;&nbsp;&nbsp;"content": "Hello from ReachDem!"
                <br />
                &nbsp;&nbsp;{"}"}'
              </span>
            </pre>
          </div>
        </section>

        {/* Endpoint: Create Contact */}
        <section
          id="contacts-create"
          className="grid scroll-mt-24 items-start gap-8 lg:grid-cols-2"
        >
          <div>
            <div className="mb-4 flex items-center gap-3">
              <Badge
                variant="outline"
                className="border-blue-500/20 bg-blue-500/10 px-2 py-0.5 font-mono text-xs text-blue-500 hover:bg-blue-500/20"
              >
                POST
              </Badge>
              <h3 className="text-xl font-bold">Create Contact</h3>
            </div>
            <p className="text-muted-foreground mb-6">
              Create a new contact in your CRM for audience segmentation.
            </p>

            <h4 className="mb-3 text-sm font-semibold">BODY PARAMETERS</h4>
            <ul className="space-y-4">
              <li className="border-border/40 border-b pb-4">
                <div className="mb-1 flex items-center justify-between">
                  <span className="font-mono text-sm">phoneNumber</span>
                  <span className="text-muted-foreground text-xs">
                    string | optional
                  </span>
                </div>
                <p className="text-muted-foreground text-sm">
                  Unique phone number.
                </p>
              </li>
              <li className="border-border/40 border-b pb-4">
                <div className="mb-1 flex items-center justify-between">
                  <span className="font-mono text-sm">tags</span>
                  <span className="text-muted-foreground text-xs">
                    array[string] | optional
                  </span>
                </div>
                <p className="text-muted-foreground text-sm">
                  List of tags to associate with the contact.
                </p>
              </li>
              <li className="border-border/40 border-b pb-4">
                <div className="mb-1 flex items-center justify-between">
                  <span className="font-mono text-sm">customAttributes</span>
                  <span className="text-muted-foreground text-xs">
                    object | optional
                  </span>
                </div>
                <p className="text-muted-foreground text-sm">
                  Any free-form JSON key/value pairs.
                </p>
              </li>
            </ul>
          </div>

          <div className="border-border/20 sticky top-6 overflow-hidden rounded-xl border bg-[#121212] shadow-sm">
            <div className="border-border/20 text-muted-foreground flex justify-between border-b bg-[#1A1A1A] px-4 py-2 font-mono text-xs">
              <span>POST /v1/contacts</span>
              <span>cURL</span>
            </div>
            <pre className="overflow-x-auto p-4 font-mono text-xs leading-relaxed text-zinc-300">
              <span className="text-pink-400">curl</span> -X POST
              https://api.reachdem.com/v1/contacts \<br />
              &nbsp;&nbsp;-H{" "}
              <span className="text-green-300">
                "Authorization: Bearer sk_live_xyz..."
              </span>{" "}
              \<br />
              &nbsp;&nbsp;-H{" "}
              <span className="text-green-300">
                "Content-Type: application/json"
              </span>{" "}
              \<br />
              &nbsp;&nbsp;-d{" "}
              <span className="text-yellow-300">
                '{"{"}
                <br />
                &nbsp;&nbsp;&nbsp;&nbsp;"phoneNumber": "+1234567890",
                <br />
                &nbsp;&nbsp;&nbsp;&nbsp;"firstName": "John",
                <br />
                &nbsp;&nbsp;&nbsp;&nbsp;"lastName": "Doe",
                <br />
                &nbsp;&nbsp;&nbsp;&nbsp;"tags": ["voter_2024", "district_5"]
                <br />
                &nbsp;&nbsp;{"}"}'
              </span>
            </pre>
          </div>
        </section>
      </div>
    </div>
  );
}
