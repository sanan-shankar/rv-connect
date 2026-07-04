import type { Metadata } from "next";
import { Libre_Baskerville, Source_Sans_3 } from "next/font/google";
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
      </body>
    </html>
  );
}
