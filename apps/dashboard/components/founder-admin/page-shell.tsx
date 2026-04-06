import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type FounderFactTone = "default" | "success" | "warning" | "critical";

const FACT_TONE_STYLES: Record<FounderFactTone, string> = {
  default: "text-foreground",
  success: "text-emerald-300",
  warning: "text-amber-200",
  critical: "text-rose-200",
};

export interface FounderPageFact {
  label: string;
  value: ReactNode;
  detail?: ReactNode;
  tone?: FounderFactTone;
}

interface FounderPageShellProps {
  title: string;
  description: string;
  eyebrow?: string;
  actions?: ReactNode;
  facts?: FounderPageFact[];
  children: ReactNode;
  className?: string;
}

export function FounderPageShell({
  title,
  description,
  eyebrow = "Founder Admin",
  actions,
  facts = [],
  children,
  className,
}: FounderPageShellProps) {
  return (
    <section className={cn("space-y-6", className)}>
      <header
        data-founder-surface="hero"
        className="relative overflow-hidden rounded-[28px] border px-5 py-5 sm:px-7 sm:py-6"
      >
        <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-1/3 bg-[radial-gradient(circle_at_center,rgba(245,140,66,0.18),transparent_68%)] xl:block" />

        <div className="relative flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl space-y-3">
            <Badge
              variant="outline"
              className="rounded-full border-white/12 bg-white/[0.04] px-3 py-1 text-[0.68rem] tracking-[0.24em] text-[color:var(--founder-muted-foreground)] uppercase"
            >
              {eyebrow}
            </Badge>

            <div className="space-y-2">
              <h1 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
                {title}
              </h1>
              <p className="max-w-3xl text-sm leading-6 text-[color:var(--founder-muted-foreground)] sm:text-[15px]">
                {description}
              </p>
            </div>
          </div>

          {actions ? (
            <div className="relative z-10 flex flex-wrap items-center gap-3 xl:justify-end">
              {actions}
            </div>
          ) : null}
        </div>

        {facts.length > 0 ? (
          <div className="relative mt-6 grid gap-3 md:grid-cols-2 2xl:grid-cols-4">
            {facts.map((fact) => (
              <div
                key={fact.label}
                data-founder-surface="tile"
                className="rounded-2xl px-4 py-3"
              >
                <p className="text-[0.7rem] tracking-[0.2em] text-[color:var(--founder-quiet-foreground)] uppercase">
                  {fact.label}
                </p>
                <p
                  className={cn(
                    "mt-2 text-xl font-semibold tracking-tight text-balance",
                    FACT_TONE_STYLES[fact.tone ?? "default"]
                  )}
                >
                  {fact.value}
                </p>
                {fact.detail ? (
                  <p className="mt-1 text-sm text-[color:var(--founder-quiet-foreground)]">
                    {fact.detail}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        ) : null}
      </header>

      {children}
    </section>
  );
}
