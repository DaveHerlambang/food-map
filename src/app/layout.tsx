import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono } from "next/font/google";
import { splashStartupImages } from "@/lib/splash-screens";
import "./globals.css";

// Struk v2: one typeface, like a receipt printer.
const plex = IBM_Plex_Mono({
  variable: "--font-plex",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

export const metadata: Metadata = {
  title: "Food Map",
  description: "Our curated late-night food map",
  // iPhone "Add to Home Screen": full screen, the map runs under the status bar
  appleWebApp: {
    capable: true,
    title: "Food Map",
    statusBarStyle: "black-translucent",
    // the iPhone shows these while the app starts (it ignores the manifest)
    startupImage: splashStartupImages,
  },
  // Next writes only the standard "mobile-web-app-capable"; older iPhones
  // need Apple's own name to open full screen and show the start-up pictures
  other: { "apple-mobile-web-app-capable": "yes" },
  icons: {
    icon: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#17171a",
};

// Apply the saved light/dark map theme before first paint (no dark→light flash).
// Must match MAP_THEME_KEY in src/hooks/use-map-theme.ts.
const themeScript = `try{if(localStorage.getItem("foodmap.lightMap")==="1")document.documentElement.dataset.mapTheme="light"}catch(e){}`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // the inline script may set data-map-theme before React hydrates
    <html lang="en" className={`${plex.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
