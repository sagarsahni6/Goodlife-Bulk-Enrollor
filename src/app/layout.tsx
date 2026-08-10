import type { Metadata, Viewport } from "next";
import Script from "next/script";
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

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://goodlife.calclabz.com";

export const viewport: Viewport = {
  themeColor: "#e11d48",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Hero GoodLife Login & Portal Bulk Automation | Goodlife Bulk Enrollor v4.0",
    template: "%s | Hero GoodLife Login & Bulk Enrollor",
  },
  description:
    "Official guide & bulk automation tool for Hero GoodLife login portal (hmclgoodlife.heromotocorp.biz/GoodlifeDLWeb/#/login). Automate dealer logins & VIN enrollments 10x faster for Hero MotoCorp authorized dealerships across India.",
  keywords: [
    "goodlife login",
    "hero goodlife login",
    "hmcl goodlife login",
    "hero goodlife portal login",
    "hero motocorp goodlife login",
    "goodlife login portal",
    "goodlife portal login",
    "goodlife login website",
    "hero goodlife login dealer",
    "hero goodlife bulk enrollor",
    "joyride hero goodlife login",
    "hmclgoodlife.heromotocorp.biz/GoodlifeDLWeb/#/login",
    "hero goodlife enrolment login",
    "goodlife login portal reset password",
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
    title: "Hero GoodLife Login Automator",
    statusBarStyle: "default",
  },
  alternates: {
    canonical: siteUrl,
  },
  openGraph: {
    title: "Hero GoodLife Login & Portal Bulk Automation — Goodlife Bulk Enrollor",
    description:
      "Official Hero GoodLife login guide & automated bulk enrollment extension for Hero MotoCorp authorized dealerships. Smart validation, auto-retry & 100% local privacy.",
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
        alt: "Goodlife Bulk Enrollor v4.0 Control Dashboard for Hero GoodLife Login Portal",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Hero GoodLife Login & Portal Bulk Automation",
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
  name: "Hero GoodLife Login & Bulk Enrollor",
  alternateName: ["Hero GoodLife Login Automator", "Joyride Automate", "Goodlife Login Portal Guide"],
  url: siteUrl,
  description:
    "Official guide and bulk automation tool for Hero GoodLife login and Joyride portal for Hero MotoCorp authorized dealerships.",
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
  alternateName: "Hero GoodLife Login Automator",
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
    "Automate Hero GoodLife login and Joyride bulk enrollments 10x faster with Chrome extension verified for Hero MotoCorp authorized dealerships.",
};

const jsonLdFaq = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "What is the official URL for Hero GoodLife Login?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "The official portal for Hero GoodLife login is hmclgoodlife.heromotocorp.biz/GoodlifeDLWeb/#/login. Hero MotoCorp authorized dealership staff can access their account using their official dealer credentials.",
      },
    },
    {
      "@type": "Question",
      name: "How do I automate my Hero GoodLife login and enrollment process?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Install Goodlife Bulk Enrollor from the official Chrome Web Store, navigate to the Hero MotoCorp dealership portal (hmclgoodlife.heromotocorp.biz/GoodlifeDLWeb/#/login), complete your regular Hero GoodLife login, and launch the side panel to upload your batch CSV file.",
      },
    },
    {
      "@type": "Question",
      name: "Does this tool work for both Joyride and GoodLife forms?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes! Goodlife Bulk Enrollor features a one-click tab switcher that toggles between Joyride Online Enrollment and GoodLife enrolment forms across all GoodLife membership tiers (Pro, Silver, Gold, Platinum).",
      },
    },
    {
      "@type": "Question",
      name: "How to resolve Hero GoodLife login session timeout or network disconnection errors?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Goodlife Bulk Enrollor features an Auto-Resilience engine that automatically detects portal logouts or internet drops. It safely pauses the queue and resumes automatically right where it left off once re-authenticated.",
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
      name: "Hero GoodLife Login Guide",
      item: `${siteUrl}#goodlife-login-guide`,
    },
    {
      "@type": "ListItem",
      position: 3,
      name: "Chrome Extension Installation",
      item: `${siteUrl}#install`,
    },
    {
      "@type": "ListItem",
      position: 4,
      name: "Live Automation Demo",
      item: `${siteUrl}#simulator`,
    },
    {
      "@type": "ListItem",
      position: 5,
      name: "CSV Specification & Validator",
      item: `${siteUrl}#csv-guide`,
    },
    {
      "@type": "ListItem",
      position: 6,
      name: "Privacy Policy",
      item: `${siteUrl}#privacy-policy`,
    },
  ],
};

const jsonLdHowTo = {
  "@context": "https://schema.org",
  "@type": "HowTo",
  name: "How to Access Hero GoodLife Login & Automate Bulk Enrollments",
  description:
    "Step-by-step guide to logging into the Hero MotoCorp GoodLife portal and using Goodlife Bulk Enrollor Chrome extension for automated vehicle registrations.",
  step: [
    {
      "@type": "HowToStep",
      name: "Navigate to Hero GoodLife Login Portal",
      text: "Open Google Chrome and go to the official Hero MotoCorp dealership portal at hmclgoodlife.heromotocorp.biz/GoodlifeDLWeb/#/login.",
      url: siteUrl,
    },
    {
      "@type": "HowToStep",
      name: "Complete Dealer Authentication",
      text: "Enter your authorized dealership User ID and Password to complete your Hero GoodLife login.",
      url: `${siteUrl}#goodlife-login-guide`,
    },
    {
      "@type": "HowToStep",
      name: "Launch Goodlife Bulk Enrollor Extension",
      text: "Open the extension side panel, select Joyride or GoodLife form mode, upload your batch CSV file, and click Start Automation.",
      url: `${siteUrl}#simulator`,
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
        <Script
          async
          src="https://www.googletagmanager.com/gtag/js?id=G-22MYTXT19B"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());

            gtag('config', 'G-22MYTXT19B');
          `}
        </Script>
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


