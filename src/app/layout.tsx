import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { site } from "@/lib/site";

const display = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-cormorant",
  display: "swap",
});

const sans = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const description =
  "A privately hosted one-bedroom apartment in Kilimani, Nairobi — heated pool and gym, automatic backup power, fiber Wi-Fi, self check-in, eight minutes from Yaya Centre. KSh 7,000 a night, direct.";

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: `${site.name} · One-Bedroom Apartment in Kilimani, Nairobi`,
    template: `%s · ${site.name}`,
  },
  description,
  applicationName: site.name,
  keywords: [
    "furnished apartment Kilimani",
    "Airbnb Kilimani Nairobi",
    "serviced apartment Nairobi",
    "short stay Kilimani",
    "Yaya Centre apartment",
    "monthly stay Nairobi",
    "book direct Nairobi apartment",
    site.name,
  ],
  authors: [{ name: site.name }],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "en_KE",
    siteName: site.name,
    url: site.url,
    title: `${site.name} · Kilimani, Nairobi`,
    description,
    images: [
      {
        url: "/gallery/hero-bedroom-1600.jpg",
        width: 1600,
        height: 783,
        alt: "The sunlit living room at Kito Oak Haven",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${site.name} · Kilimani, Nairobi`,
    description,
    images: ["/gallery/hero-bedroom-1600.jpg"],
  },
  robots: { index: true, follow: true },
  formatDetection: { telephone: true, address: true },
};

export const viewport: Viewport = {
  themeColor: "#0a1c16",
  colorScheme: "light",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-KE" className={`${display.variable} ${sans.variable}`} suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
