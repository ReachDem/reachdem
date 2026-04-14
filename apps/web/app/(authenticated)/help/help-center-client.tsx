"use client";

import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import { IconChevronDown, IconLifebuoy, IconSearch } from "@tabler/icons-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type HelpFaq = {
  category: string;
  question: string;
  answer: string;
};

const faqs: HelpFaq[] = [
  {
    category: "Platform",
    question: "What is ReachDem?",
    answer:
      "ReachDem is a communication and engagement platform that helps businesses centralize audience operations, manage contacts, segment users, launch campaigns, and track performance from a single workspace.",
  },
  {
    category: "Platform",
    question: "Who is ReachDem built for?",
    answer:
      "ReachDem is built for teams that want one workspace for contact management, segmentation, campaigns, and analytics instead of stitching multiple tools together.",
  },
  {
    category: "Support",
    question: "Do I need technical skills to use ReachDem?",
    answer:
      "No. ReachDem is designed so teams can set up a workspace, import contacts, create campaigns, and monitor performance without needing a technical background.",
  },
  {
    category: "Pricing",
    question: "How does ReachDem pricing work?",
    answer:
      "ReachDem provides pricing information as part of its public resources so teams can evaluate the product, support, and scale requirements before committing.",
  },
  {
    category: "Pricing",
    question: "Do you offer plans for small businesses?",
    answer:
      "Yes. ReachDem is positioned for teams getting started as well as businesses growing their communication workflows over time.",
  },
  {
    category: "Pricing",
    question: "Are there any hidden fees?",
    answer:
      "ReachDem surfaces pricing and support resources publicly so teams can understand the product before scaling their usage.",
  },
  {
    category: "Support",
    question: "What kind of support does ReachDem provide?",
    answer:
      "ReachDem provides self-serve help through FAQ and getting started resources, plus direct support for bugs, setup questions, feedback, and onboarding help.",
  },
  {
    category: "Support",
    question: "Do you help with onboarding?",
    answer:
      "Yes. The getting started guide covers the essentials, and the support team can help if you run into setup issues or want help planning your first campaign.",
  },
  {
    category: "Support",
    question: "How can I contact support?",
    answer:
      "You can submit a support request from ReachDem support resources when you hit an issue, have feedback, or need help getting live.",
  },
  {
    category: "Security",
    question: "Is my contact and customer data secure?",
    answer:
      "Security is one of the core FAQ categories in ReachDem's public documentation, alongside platform, support, pricing, and features.",
  },
  {
    category: "Security",
    question: "Who can access data in my workspace?",
    answer:
      "Workspace setup includes team and permission review, so teams can control who has access before they start sending campaigns.",
  },
  {
    category: "Security",
    question: "How does ReachDem protect user accounts?",
    answer:
      "ReachDem treats account and workspace security as part of the core product setup and support guidance for teams going live.",
  },
  {
    category: "Features",
    question: "What can I do with ReachDem?",
    answer:
      "You can manage contacts, build segments, launch campaigns, and track engagement and delivery performance from one workspace.",
  },
  {
    category: "Features",
    question: "Can I segment my audience?",
    answer:
      "Yes. Audience segmentation is a core ReachDem workflow and part of the recommended getting started path after contact import.",
  },
  {
    category: "Features",
    question: "Can I track campaign performance?",
    answer:
      "Yes. ReachDem highlights analytics as one of the key post-launch workflows so teams can monitor performance and improve future sends.",
  },
  {
    category: "Scale",
    question: "Can ReachDem grow with my business?",
    answer:
      "Yes. ReachDem is designed to support teams from initial setup through more mature campaign operations as communication needs expand.",
  },
  {
    category: "Scale",
    question: "Can multiple teams use ReachDem?",
    answer:
      "Yes. Workspace setup includes team context and permissions so multiple people can work from the same ReachDem environment.",
  },
  {
    category: "Platform",
    question: "Why choose ReachDem instead of using multiple separate tools?",
    answer:
      "ReachDem centralizes contacts, segmentation, campaign launch, and performance tracking in one place, which reduces handoffs and tool sprawl.",
  },
];

const initialVisibleCount = 8;

export function HelpCenterClient() {
  const [query, setQuery] = useState("");
  const [visibleCount, setVisibleCount] = useState(initialVisibleCount);
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredFaqs = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    if (!normalized) {
      return faqs;
    }

    return faqs.filter(
      (item) =>
        item.category.toLowerCase().includes(normalized) ||
        item.question.toLowerCase().includes(normalized) ||
        item.answer.toLowerCase().includes(normalized)
    );
  }, [query]);

  const visibleFaqs = filteredFaqs.slice(0, visibleCount);
  const hasMore = visibleCount < filteredFaqs.length;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedEmail = email.trim();
    const normalizedSubject = subject.trim();
    const normalizedMessage = message.trim();

    if (!normalizedEmail || !normalizedSubject || !normalizedMessage) {
      toast.error("Please fill in your email, subject, and message.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/support/request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: normalizedEmail,
          subject: normalizedSubject,
          message: normalizedMessage,
        }),
      });

      const result = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;

      if (!response.ok) {
        throw new Error(result?.error || "Failed to submit request");
      }

      toast.success("Your request has been sent successfully.");
      setSubject("");
      setMessage("");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to send your request."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="@container/main flex flex-1 flex-col gap-2">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-10 px-4 py-10 md:px-6 md:py-14">
          <section className="flex flex-col items-center gap-4 text-center">
            <h1 className="text-4xl font-semibold tracking-tight md:text-6xl">
              Help Center
            </h1>
            <p className="text-muted-foreground max-w-2xl text-base md:text-xl">
              Search our knowledge base or submit a request below.
            </p>
          </section>

          <section className="space-y-6">
            <div className="relative">
              <IconSearch className="text-muted-foreground absolute top-1/2 left-4 size-5 -translate-y-1/2" />
              <Input
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setVisibleCount(initialVisibleCount);
                }}
                placeholder="Search for answers..."
                className="h-12 rounded-xl pl-12 text-base shadow-none"
              />
            </div>

            <div className="space-y-0">
              {visibleFaqs.length > 0 ? (
                visibleFaqs.map((item) => (
                  <details
                    key={`${item.category}-${item.question}`}
                    className="group border-b"
                  >
                    <summary className="flex cursor-pointer list-none items-center gap-4 py-5">
                      <Badge
                        variant="secondary"
                        className="text-muted-foreground rounded-full px-3 py-1 text-sm font-medium"
                      >
                        {item.category}
                      </Badge>
                      <span className="flex-1 text-left text-lg font-medium">
                        {item.question}
                      </span>
                      <IconChevronDown className="text-muted-foreground size-5 shrink-0 transition-transform group-open:rotate-180" />
                    </summary>
                    <div className="pb-5 pl-[7.75rem]">
                      <p className="text-muted-foreground max-w-3xl text-sm leading-7">
                        {item.answer}
                      </p>
                    </div>
                  </details>
                ))
              ) : (
                <div className="text-muted-foreground rounded-xl border border-dashed px-6 py-10 text-center">
                  No results found for this search.
                </div>
              )}
            </div>

            {hasMore ? (
              <div className="flex justify-center pt-2">
                <Button
                  variant="outline"
                  onClick={() =>
                    setVisibleCount((current) => current + initialVisibleCount)
                  }
                >
                  Load more
                </Button>
              </div>
            ) : null}
          </section>

          <section className="bg-muted/25 rounded-3xl border px-5 py-8 md:px-10 md:py-10">
            <div className="mx-auto max-w-4xl space-y-8">
              <div className="space-y-3 text-center">
                <h2 className="text-3xl font-semibold tracking-tight">
                  Can&apos;t find what you&apos;re looking for?
                </h2>
                <p className="text-muted-foreground text-lg">
                  Submit a request and our team will get back to you within 24
                  hours.
                </p>
              </div>

              <form className="space-y-5" onSubmit={handleSubmit}>
                <div className="grid gap-5 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium" htmlFor="help-email">
                      Email <span className="text-red-500">*</span>
                    </label>
                    <Input
                      id="help-email"
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="you@example.com"
                      className="bg-background h-12"
                      required
                      disabled={isSubmitting}
                    />
                  </div>
                  <div className="space-y-2">
                    <label
                      className="text-sm font-medium"
                      htmlFor="help-subject"
                    >
                      Subject <span className="text-red-500">*</span>
                    </label>
                    <Input
                      id="help-subject"
                      value={subject}
                      onChange={(event) => setSubject(event.target.value)}
                      placeholder="Brief summary"
                      className="bg-background h-12"
                      required
                      disabled={isSubmitting}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="help-message">
                    Message <span className="text-red-500">*</span>
                  </label>
                  <Textarea
                    id="help-message"
                    value={message}
                    onChange={(event) => setMessage(event.target.value)}
                    placeholder="Describe your issue or question in detail..."
                    className="bg-background min-h-32 resize-none"
                    required
                    disabled={isSubmitting}
                  />
                </div>

                <Button
                  className="h-12 w-full text-base"
                  type="submit"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Sending..." : "Submit Request"}
                </Button>
              </form>

              <div className="text-muted-foreground flex flex-wrap items-center justify-center gap-2 text-sm">
                <IconLifebuoy className="size-4" />
                Need direct resources too?
                <Link
                  href="https://reachdem.cc/support"
                  target="_blank"
                  rel="noreferrer"
                  className={cn(
                    "text-foreground underline-offset-4 hover:underline"
                  )}
                >
                  Visit support
                </Link>
                <span>&bull;</span>
                <Link
                  href="https://reachdem.cc/docs/getting-started"
                  target="_blank"
                  rel="noreferrer"
                  className={cn(
                    "text-foreground underline-offset-4 hover:underline"
                  )}
                >
                  Read getting started
                </Link>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
