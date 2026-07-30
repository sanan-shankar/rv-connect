import type { Metadata, Viewport } from "next";
import { Libre_Baskerville, Source_Sans_3 } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import { MascotFlightLayer } from "@/components/mascot/mascot-flight-layer";
import "./globals.css";

const libreBaskerville = Libre_Baskerville({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "700"],
});

const sourceSans = Source_Sans_3({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: {
    default: "Rishi Valley",
    template: "Rishi Valley · %s",
  },
  description:
    "A space for the Rishi Valley community to stay connected.",
};

/* Without an explicit themeColor, iOS Safari paints its top/bottom chrome in
 * its own default surface, which sat as two alien warm-white slabs around the
 * app (owner, 2026-07-30: they "ruin the immersive nature vibe"). Matching the
 * page base makes the browser chrome part of the scene. viewport-fit=cover
 * lets content extend under the home indicator; the handful of fixed bottom
 * bars already pad with env(safe-area-inset-bottom). */
export const viewport: Viewport = {
  themeColor: "#E4E1D5", // == --background; keep in lockstep with globals.css
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${libreBaskerville.variable} ${sourceSans.variable} h-full`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col antialiased">
        <ThemeProvider
          attribute="class"
          forcedTheme="light"
        >
          {children}
          {/* The ONE hoopoe, mid-flight: renders nothing until a landing CTA
              launches a button-to-perch flight, then carries the puppet across
              the route change and hands off to the destination's own hoopoe.
              Lives here (root layout) so it survives that navigation. */}
          <MascotFlightLayer />
          <Toaster position="bottom-right" />
        </ThemeProvider>
        {/* Vercel Analytics: page views only, no cookies. Data only flows once this is deployed
            to Vercel (a Vercel project must have Analytics enabled); it is inert in local dev. */}
        <Analytics />
      </body>
    </html>
  );
}
