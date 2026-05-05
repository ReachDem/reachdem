"use client";

import { useEffect, useState } from "react";
import { IconTool, IconX } from "@tabler/icons-react";

interface MaintenanceData {
  enabled: boolean;
  mode: string;
  message: string;
  bannerLink?: string;
  bannerLinkText?: string;
}

export function MaintenanceBanner() {
  const [data, setData] = useState<MaintenanceData | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const stored = sessionStorage.getItem("rd_banner_dismissed");
    if (stored === "true") {
      setDismissed(true);
      return;
    }

    fetch("/api/internal/maintenance")
      .then((r) => r.json())
      .then((d: MaintenanceData) => {
        if (d.enabled && d.mode === "banner") {
          setData(d);
        }
      })
      .catch(() => {});
  }, []);

  if (!data || dismissed) return null;

  function handleDismiss() {
    setDismissed(true);
    sessionStorage.setItem("rd_banner_dismissed", "true");
  }

  return (
    <div className="relative flex items-center justify-center gap-2 bg-amber-900 px-4 py-2 text-sm text-amber-100">
      <IconTool size={16} className="shrink-0 text-amber-400" />
      <p className="text-center">
        {data.message}
        {data.bannerLink && (
          <>
            {" "}
            <a
              href={data.bannerLink}
              className="font-medium underline hover:text-white"
              target="_blank"
              rel="noopener noreferrer"
            >
              {data.bannerLinkText || "Learn more"}
            </a>
          </>
        )}
      </p>
      <button
        type="button"
        onClick={handleDismiss}
        className="absolute top-1/2 right-3 -translate-y-1/2 rounded p-0.5 text-amber-300 transition-colors hover:text-white"
        aria-label="Dismiss"
      >
        <IconX size={16} />
      </button>
    </div>
  );
}
