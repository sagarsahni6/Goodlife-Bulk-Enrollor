import type { Metadata, Viewport } from "next";
import { Outfit, Inter } from "next/font/google";
import "./globals.css";
import JsonLd from "@/components/JsonLd";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const viewport: Viewport = {
  themeColor: "#08090C",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL("https://goodlife-enrollor.vercel.app"),
  title: {
    default: "Goodlife Bulk Enrollor v4.0 — Hero GoodLife & Joyride Automation Extension",
    template: "%s | Goodlife Bulk Enrollor",
  },
  description: "Official Chrome Web Store extension for Hero MotoCorp authorized dealerships. Automate Hero GoodLife & Joyride bulk vehicle enrollments 10x faster with 100% local browser privacy.",
  keywords: [
    "Goodlife Bulk Enrollor",
    "Joyride Automate",
    "Hero GoodLife portal",
    "Hero MotoCorp dealership automation",
    "Bulk VIN enrollment",
    "Joyride Online enrollment",
    "Chrome Web Store extension",
    "Hero GoodLife membership",
    "Automated VIN registration",
  ],
  authors: [{ name: "CalcLabz Technologies", url: "https://goodlife-enrollor.vercel.app" }],
  creator: "CalcLabz Technologies",
  publisher: "Goodlife Bulk Enrollor",
  category: "Business & Productivity Tools",
  alternates: {
    canonical: "/",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    title: "Goodlife Bulk Enrollor — Hero MotoCorp Dealership Automation",
    description: "Bulk automation engine for GoodLife & Joyride enrollment on Hero GoodLife portal. Smart validation, self-tuning speed control, and 100% local browser privacy.",
    url: "https://goodlife-enrollor.vercel.app",
    siteName: "Goodlife Bulk Enrollor",
    locale: "en_IN",
    type: "website",
    images: [
      {
        url: "/assets/promo_large_1280x800.png",
        width: 1280,
        height: 800,
        alt: "Goodlife Bulk Enrollor Chrome Extension Landing Showcase",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Goodlife Bulk Enrollor v4.0 — Hero GoodLife & Joyride Automation",
    description: "Automate Hero GoodLife & Joyride vehicle enrollments 10x faster for Hero MotoCorp dealerships across India.",
    images: ["/assets/promo_large_1280x800.png"],
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/assets/promo_small_440x280.jpg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${outfit.variable} ${inter.variable} h-full antialiased dark`}
    >
      <head>
        <JsonLd />
      </head>
      <body className="min-h-full flex flex-col bg-[#08090C] text-[#F1F5F9] font-sans selection:bg-[#E31E24] selection:text-white">
        {children}
      </body>
    </html>
  );
}
