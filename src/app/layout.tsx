import type { Metadata, Viewport } from "next";
import { Libre_Baskerville, Source_Sans_3 } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import { MascotFlightLayer } from "@/components/mascot/mascot-flight-layer";
import { PostHogProvider } from "@/components/analytics/posthog-provider";
import { MotionFeatures } from "@/components/common/motion-features";
import { FocusModality } from "@/components/common/focus-modality";
import { getThemeCookie } from "@/lib/theme";
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
  /* Home-screen installs. `title` is the name under the icon -- without it iOS
   * uses the <title> of whichever page was open when you tapped Share, so the
   * same site could land on two phones as "Rishi Valley" and "Rishi Valley ·
   * Feed". `capable` opens it chromeless, and the light status bar matches the
   * warm paper the app paints on. The icon itself comes from app/apple-icon.png
   * (Next emits the rel="apple-touch-icon" link for it) -- iOS reads neither
   * favicon.ico nor an SVG icon, which is why it drew a letter tile instead. */
  appleWebApp: {
    title: "Rishi Valley",
    capable: true,
    statusBarStyle: "default",
  },
};

/** The two `--background` values, one per theme. Keep in lockstep with
 *  globals.css, where the light one is :root and the dark one is .dark. */
export const THEME_COLORS = { light: "#E4E1D5", dark: "#1C2420" } as const;

/* Without an explicit themeColor, iOS Safari paints its top/bottom chrome in
 * its own default surface, which sat as two alien warm-white slabs around the
 * app (owner, 2026-07-30: they "ruin the immersive nature vibe"). Matching the
 * page base makes the browser chrome part of the scene. viewport-fit=cover
 * lets content extend under the home indicator; the handful of fixed bottom
 * bars already pad with env(safe-area-inset-bottom).
 *
 * GENERATED per request, not a static export (audit C-119). A constant can
 * only name one colour, and it named the light one, so once dark shipped a
 * dark-theme member got warm-paper Safari chrome around a charcoal app -- the
 * exact mismatch this exists to prevent, inverted. Not a prefers-color-scheme
 * media array either: the theme here is the rv-theme COOKIE, chosen in
 * settings, and enableSystem is off, so the OS setting is the wrong question
 * to ask. Same cookie the layout below reads. */
export async function generateViewport(): Promise<Viewport> {
  return {
    themeColor: THEME_COLORS[(await getThemeCookie()) === "dark" ? "dark" : "light"],
    viewportFit: "cover",
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  /* Dark-mode groundwork: the per-request theme comes from the rv-theme
   * cookie (set by the settings theme action alongside User.theme), so SSR
   * paints the member's choice with no flash. HARD GUARD: until a .dark block
   * exists in globals.css this is visually inert; the class may flip on
   * <html>, but with no dark tokens defined every token still resolves to its
   * :root value, so the rendered output is identical to the old
   * forcedTheme="light". enableSystem is off because dark is only ever
   * entered through the settings confirmation flow, never the OS setting. */
  const theme = (await getThemeCookie()) ?? "light";
  return (
    <html
      lang="en"
      className={`${libreBaskerville.variable} ${sourceSans.variable} h-full`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col antialiased">
        {/* Wraps everything, signed-out pages included: the landing page is
            the front door and its funnel is the one that matters most. */}
        <PostHogProvider>
        <MotionFeatures>
        <ThemeProvider
          attribute="class"
          defaultTheme={theme}
          enableSystem={false}
        >
          <FocusModality />
          {children}
          {/* The ONE hoopoe, mid-flight: renders nothing until a landing CTA
              launches a button-to-perch flight, then carries the puppet across
              the route change and hands off to the destination's own hoopoe.
              Lives here (root layout) so it survives that navigation. */}
          <MascotFlightLayer />
          <Toaster position="bottom-right" />
        </ThemeProvider>
        </MotionFeatures>
        </PostHogProvider>
      </body>
    </html>
  );
}
