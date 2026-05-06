import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Maintenance — ReachDem",
  robots: { index: false, follow: false },
};

export default function MaintenancePage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string }>;
}) {
  return (
    <div className="bg-background flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <div className="mb-8">
        <div className="mx-auto mb-6 flex size-16 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-950">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="size-8 text-amber-500"
          >
            <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1={12} y1={9} x2={12} y2={13} />
            <line x1={12} y1={17} x2={12.01} y2={17} />
          </svg>
        </div>
        <h1 className="text-foreground text-2xl font-bold">
          We&apos;ll be right back
        </h1>
        <p className="text-muted-foreground mt-3 max-w-sm text-sm leading-relaxed">
          ReachDem is currently undergoing scheduled maintenance. We&apos;re
          working hard to improve your experience.
        </p>
      </div>
      <p className="text-muted-foreground/60 text-xs">
        If you have an urgent issue, contact us at{" "}
        <a href="mailto:hello@reachdem.com" className="underline">
          hello@reachdem.com
        </a>
      </p>
    </div>
  );
}
