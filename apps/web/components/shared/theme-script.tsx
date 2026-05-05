"use client";

import { useServerInsertedHTML } from "next/navigation";

/**
 * Injects the theme initialisation script via SSR only.
 * Using useServerInsertedHTML means React never encounters the <script>
 * during client-side hydration, suppressing the React 19 warning.
 */
export function ThemeScript({ script }: { script: string }) {
  useServerInsertedHTML(() => (
    <script id="theme-script" dangerouslySetInnerHTML={{ __html: script }} />
  ));
  return null;
}
