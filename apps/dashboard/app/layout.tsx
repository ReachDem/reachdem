import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ReachDem — Founder Dashboard",
  description: "Internal founder-only administration dashboard",
  robots: { index: false, follow: false },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className="bg-background min-h-screen font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
