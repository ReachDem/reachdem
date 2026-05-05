import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import "./fonts.css";
import { Providers } from "@/components/shared/providers";
import { ThemeScript } from "@/components/shared/theme-script";
import { getThemeScript } from "@/lib/theme";
import { Analytics } from "@vercel/analytics/next";

const neueMontreal = localFont({
  src: [
    {
      path: "../public/fonts/NeueMontreal-Regular.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../public/fonts/NeueMontreal-Medium.woff2",
      weight: "500",
      style: "normal",
    },
    {
      path: "../public/fonts/NeueMontreal-Bold.woff2",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-sans", // On utilise la même police pour tout
  display: "swap",
});

export const metadata: Metadata = {
  title: "ReachDem",
  description: "Political engagement platform",
  icons: {
    icon: [
      { url: "/reachdem.ico", media: "(prefers-color-scheme: light)" },
      { url: "/dark-logo.ico", media: "(prefers-color-scheme: dark)" },
    ],
  },
};

const themeScript = getThemeScript({
  attribute: "class",
  defaultTheme: "system",
  enableSystem: true,
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head />
      <body className={`${neueMontreal.variable} font-sans antialiased`}>
        <ThemeScript script={themeScript} />
        <Providers>{children}</Providers>
        <Analytics />
      </body>
    </html>
  );
}
