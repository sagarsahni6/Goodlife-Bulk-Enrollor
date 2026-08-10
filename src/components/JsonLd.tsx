import React from "react";

export default function JsonLd() {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://goodlife.calclabz.com";

  const softwareAppSchema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "Goodlife Bulk Enrollor v4.0",
    "alternateName": "Hero GoodLife Login Automator",
    "operatingSystem": "Google Chrome, Windows, macOS, Linux",
    "applicationCategory": "BusinessApplication",
    "browserRequirements": "Requires Google Chrome browser or Chromium-based browser",
    "description": "Official Hero GoodLife login guide and bulk vehicle enrollment automation extension for Hero MotoCorp authorized dealerships across India. Fully compatible with Pro, Silver, Gold & Platinum loyalty plans and Joyride AMC packages.",
    "url": baseUrl,
    "image": `${baseUrl}/assets/promo_large_1280x800.png`,
    "screenshot": `${baseUrl}/assets/promo_large_1280x800.png`,
    "offers": {
      "@type": "AggregateOffer",
      "priceCurrency": "INR",
      "lowPrice": "0",
      "highPrice": "499",
      "offerCount": "4",
      "offers": [
        { "@type": "Offer", "name": "Hero GoodLife Pro Tier", "price": "199" },
        { "@type": "Offer", "name": "Hero GoodLife Silver Tier", "price": "299" },
        { "@type": "Offer", "name": "Hero GoodLife Gold Tier", "price": "399" },
        { "@type": "Offer", "name": "Hero GoodLife Platinum Tier", "price": "499" }
      ]
    },
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": "4.9",
      "reviewCount": "128",
      "bestRating": "5",
      "worstRating": "1"
    },
    "featureList": [
      "Adaptive Speed Control Engine (0.4s/VIN)",
      "Dual-Mode Enrollment (Joyride Online & Hero GoodLife Pro/Silver/Gold/Platinum)",
      "Smart VIN Skip & Deduplication Logic",
      "100% Offline Local Privacy & Zero Telemetry",
      "Auto-Network Connection Loss Detection & Pause/Resume",
      "Real-Time Side Panel Analytics & Interactive Log Console"
    ]
  };

  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "Goodlife Bulk Enrollor",
    "url": baseUrl,
    "logo": `${baseUrl}/assets/promo_small_440x280.jpg`,
    "contactPoint": {
      "@type": "ContactPoint",
      "email": "support@calclabz.com",
      "contactType": "customer support"
    }
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "How do I install the extension from the Chrome Web Store?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Click the 'Add to Chrome' button at the top of this page to open our official Chrome Web Store listing, then click 'Add to Chrome' in your browser and confirm installation."
        }
      },
      {
        "@type": "Question",
        "name": "Does this extension support all Hero GoodLife tiers (Pro, Silver, Gold, Platinum)?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Yes! Goodlife Bulk Enrollor supports all four official Hero GoodLife membership tiers (Pro ₹199, Silver ₹299, Gold ₹399, Platinum ₹499) with automatic plan code selection and customer DOB/district validation."
        }
      },
      {
        "@type": "Question",
        "name": "How does the extension handle Hero Joyride AMC packages?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "The extension features a dedicated Joyride Online automation tab that handles scratch coupon verification, referral ID tracking, and VIN registration with 4 periodic service waivers."
        }
      },
      {
        "@type": "Question",
        "name": "What happens if the internet connection disconnects mid-batch?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "The extension's Auto-Resilience engine automatically detects internet loss, safely pauses the queue, and resumes right from the last processed VIN once connectivity returns."
        }
      }
    ]
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Home",
        "item": baseUrl
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": "GoodLife Loyalty Tiers",
        "item": `${baseUrl}#goodlife-tiers`
      },
      {
        "@type": "ListItem",
        "position": 3,
        "name": "Joyride AMC Packages",
        "item": `${baseUrl}#joyride-packages`
      },
      {
        "@type": "ListItem",
        "position": 4,
        "name": "Live Engine Simulator",
        "item": `${baseUrl}#simulator`
      },
      {
        "@type": "ListItem",
        "position": 5,
        "name": "Privacy Policy",
        "item": `${baseUrl}#privacy`
      }
    ]
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareAppSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
    </>
  );
}
