import type { Metadata, Viewport } from "next";
import { Inter, Outfit, Space_Grotesk, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700", "800", "900"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500"],
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://goodlife-enrollor.vercel.app";

export const viewport: Viewport = {
  themeColor: "#e11d48",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Goodlife Bulk Enrollor v4.0 — Hero GoodLife Login Automation",
    template: "%s | Goodlife Bulk Enrollor",
  },
  description:
    "Automate your Hero GoodLife login and Joyride bulk enrollments 10x faster. Official Chrome Web Store verified extension for Hero MotoCorp authorized dealerships. Smart validation & 100% offline privacy.",
  keywords: [
    "goodlife login",
    "hero goodlife login",
    "goodlife login portal",
    "Goodlife Bulk Enrollor",
    "Hero MotoCorp",
    "Joyride enrollment",
    "joyride online enrollment",
    "GoodLife portal",
    "Chrome extension",
    "bulk VIN automation",
    "Hero GoodLife portal",
    "dealership automation",
    "Chrome Web Store",
    "hero motocorp dealership automation",
    "hero goodlife enrolment software",
    "VIN batch processing",
  ],
  authors: [{ name: "CalcLabz Technologies", url: "https://calclabz.com" }],
  creator: "CalcLabz Technologies",
  publisher: "CalcLabz Technologies",
  referrer: "origin-when-cross-origin",
  formatDetection: {
    telephone: false,
    email: false,
    address: false,
  },
  appleWebApp: {
    title: "Goodlife Bulk Enrollor",
    statusBarStyle: "default",
  },
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Goodlife Bulk Enrollor v4.0 — Hero GoodLife Login & Joyride Automation",
    description:
      "Seamless bulk automation for Hero GoodLife login & Joyride online portal. Smart validation, auto-retry, and 100% offline privacy protection.",
    url: siteUrl,
    siteName: "Goodlife Bulk Enrollor",
    locale: "en_US",
    type: "website",
    images: [
      {
        url: "/screenshot.png",
        width: 1280,
        height: 800,
        type: "image/png",
        alt: "Goodlife Bulk Enrollor v4.0 Control Dashboard Preview",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Goodlife Bulk Enrollor v4.0 — Hero GoodLife Login Automation",
    description:
      "Automate Hero GoodLife login & Joyride bulk enrollments 10x faster with our Chrome Web Store verified extension.",
    images: ["/screenshot.png"],
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
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || "YOUR_GOOGLE_SITE_VERIFICATION_CODE",
  },
  category: "technology",
};

// JSON-LD Structured Data Schemas for Google Search Console & Search Engine Rich Results
const jsonLdWebsite = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "Goodlife Bulk Enrollor",
  alternateName: ["Hero GoodLife Login Automator", "Joyride Automate"],
  url: siteUrl,
  description:
    "Official bulk automation tool for Hero GoodLife login and Joyride portal for Hero MotoCorp authorized dealerships.",
};

const jsonLdOrganization = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "CalcLabz Technologies",
  url: siteUrl,
  logo: `${siteUrl}/screenshot.png`,
  email: "support@calclabz.com",
};

const jsonLdSoftwareApp = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Goodlife Bulk Enrollor",
  operatingSystem: "Google Chrome, Windows, macOS, Linux",
  applicationCategory: "BusinessApplication",
  offers: {
    "@type": "Offer",
    price: "0.00",
    priceCurrency: "INR",
  },
  aggregateRating: {
    "@type": "AggregateRating",
    ratingValue: "4.9",
    ratingCount: "128",
  },
  description:
    "Automate Hero GoodLife login and Joyride bulk enrollments 10x faster with Chrome extension verified for Hero MotoCorp dealerships.",
};

const jsonLdFaq = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "How do I automate my Hero GoodLife login and enrollment process?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Install the extension from the Chrome Web Store, navigate to the Hero MotoCorp dealership portal, complete your regular Hero GoodLife login, and launch the side panel to upload your batch CSV file.",
      },
    },
    {
      "@type": "Question",
      name: "Does this tool work for both Joyride and GoodLife forms?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes! Goodlife Bulk Enrollor features a one-click tab switcher that toggles between Joyride Online Enrollment and GoodLife enrolment forms.",
      },
    },
    {
      "@type": "Question",
      name: "How do I obtain an offline License Key for my PC?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Open the extension side panel, copy your unique Device ID displayed on the screen, and email it to support@calclabz.com to receive your instant license key.",
      },
    },
    {
      "@type": "Question",
      name: "What happens if my GoodLife login session expires or network drops?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "The extension's Auto-Resilience engine automatically detects internet loss or session timeouts, safely pauses the queue, and resumes right from the last processed VIN once re-authenticated.",
      },
    },
  ],
};

const jsonLdBreadcrumbs = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    {
      "@type": "ListItem",
      position: 1,
      name: "Home",
      item: siteUrl,
    },
    {
      "@type": "ListItem",
      position: 2,
      name: "Chrome Extension Installation",
      item: `${siteUrl}/#install`,
    },
    {
      "@type": "ListItem",
      position: 3,
      name: "Live Demo Simulator",
      item: `${siteUrl}/#simulator`,
    },
    {
      "@type": "ListItem",
      position: 4,
      name: "CSV Format Documentation",
      item: `${siteUrl}/#csv-guide`,
    },
    {
      "@type": "ListItem",
      position: 5,
      name: "Privacy Policy",
      item: `${siteUrl}/#privacy-policy`,
    },
  ],
};

const jsonLdHowTo = {
  "@context": "https://schema.org",
  "@type": "HowTo",
  name: "How to Automate Hero GoodLife Login & Joyride Bulk Enrollments",
  description:
    "Step-by-step guide to using Goodlife Bulk Enrollor Chrome extension for automated vehicle enrollments on the Hero MotoCorp dealership portal.",
  step: [
    {
      "@type": "HowToStep",
      name: "Install Chrome Extension",
      text: "Download and install Goodlife Bulk Enrollor from the official Chrome Web Store.",
      url: `${siteUrl}/#install`,
    },
    {
      "@type": "HowToStep",
      name: "Log In to Dealership Portal",
      text: "Navigate to hmclgoodlife.heromotocorp.biz and complete your standard Hero GoodLife login.",
      url: siteUrl,
    },
    {
      "@type": "HowToStep",
      name: "Upload Batch CSV & Start Automation",
      text: "Launch the extension side panel, upload your vehicle batch CSV file, and click Start Automation.",
      url: `${siteUrl}/#simulator`,
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${outfit.variable} ${spaceGrotesk.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdWebsite) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdOrganization) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdSoftwareApp) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdFaq) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdBreadcrumbs) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdHowTo) }}
        />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}


