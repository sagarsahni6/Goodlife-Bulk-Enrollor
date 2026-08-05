"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";

// Official Hero GoodLife Loyalty Tiers (Inspired by heromotocorp.com/en-in/good-life.html)
const GOODLIFE_TIERS = [
  {
    id: "pro",
    name: "Hero GoodLife Pro",
    price: "₹199 / 3 Years",
    badge: "Starter Loyalty",
    color: "from-amber-700/30 via-amber-900/20 to-orange-950/40 border-amber-600/40 text-amber-300",
    accent: "#D97706",
    welcomePoints: "199 Welcome Points",
    shoppingVouchers: "₹600 Partner Brand Offers",
    insurance: "Standard Coverage Available",
    perks: [
      "199 Immediate Welcome Points",
      "₹600 Worth of Shopping & Lifestyle Vouchers",
      "1x Reward Multiplier on Genuine Hero Parts",
      "3 Years Extended Validity across all Hero Dealerships",
    ],
    automationNote: "Joyride Automate auto-assigns Pro tier code, handles customer address entry, and validates form in 0.4s.",
  },
  {
    id: "silver",
    name: "Hero GoodLife Silver",
    price: "₹299 / 3 Years",
    badge: "Value Shield",
    color: "from-slate-400/20 via-slate-600/10 to-zinc-800/30 border-slate-300/40 text-slate-100",
    accent: "#CBD5E1",
    welcomePoints: "299 Welcome Points",
    shoppingVouchers: "₹1,200 Partner Brand Offers",
    insurance: "₹1,00,000 Personal Accidental Death Cover",
    perks: [
      "299 Immediate Welcome Points",
      "₹1,200 Worth of Shopping & Lifestyle Vouchers",
      "₹1 Lakh Personal Accidental Insurance Cover",
      "Priority Customer Desk Access at Service Bays",
    ],
    automationNote: "Joyride Automate populates Silver tier insurance forms and dispatches Angular change events automatically.",
  },
  {
    id: "gold",
    name: "Hero GoodLife Gold",
    price: "₹399 / 3 Years",
    badge: "Most Popular",
    color: "from-amber-400/20 via-yellow-600/15 to-amber-900/30 border-yellow-400/50 text-amber-200",
    accent: "#F59E0B",
    welcomePoints: "399 Welcome Points",
    shoppingVouchers: "₹2,400 Partner Brand Offers",
    insurance: "₹2,00,000 Personal Accidental Death Cover",
    perks: [
      "399 Immediate Welcome Points",
      "₹2,400 Worth of Shopping & Lifestyle Vouchers",
      "₹2 Lakh Personal Accidental Insurance Cover",
      "5% Discount on Hero Genuine Spare Parts & Oil",
    ],
    automationNote: "Joyride Automate auto-checks Gold tier perks, validates DOB, and processes batch queue seamlessly.",
  },
  {
    id: "platinum",
    name: "Hero GoodLife Platinum",
    price: "₹499 / 3 Years",
    badge: "Elite Prestige",
    color: "from-cyan-500/20 via-slate-700/20 to-blue-900/40 border-cyan-400/50 text-cyan-200",
    accent: "#06B6D4",
    welcomePoints: "499 Welcome Points",
    shoppingVouchers: "₹4,800 Partner Brand Offers",
    insurance: "₹2,00,000 Personal Accidental Death Cover",
    perks: [
      "499 Immediate Welcome Points",
      "₹4,800 Worth of Shopping & Premium Vouchers",
      "₹2 Lakh Personal Accidental Insurance Cover",
      "VIP Access to Hero World Events & Motorsport Bays",
    ],
    automationNote: "Joyride Automate executes Platinum renewals in bulk with zero server timeout errors.",
  },
];

// Official Hero Joyride AMC Package Benefits (Inspired by heromotocorp.com/en-in/services/hero-joyride-packages.html)
const JOYRIDE_AMC_BENEFITS = [
  {
    title: "4 Scheduled Free Periodic Services",
    desc: "1 Year comprehensive annual maintenance contract for all Hero two-wheelers.",
    icon: "🔧",
  },
  {
    title: "Up to 30% Savings on Labor Costs",
    desc: "100% labor charge waiver on scheduled periodic maintenance services.",
    icon: "💰",
  },
  {
    title: "5% Discount on Engine Oil",
    desc: "Instant 5% discount on Hero Genuine 4T Engine Oil during every service.",
    icon: "🛢️",
  },
  {
    title: "10% Discount on Additional Repairs",
    desc: "Discounts on minor jobs, brake adjustments, chain lubes, and wear-and-tear parts.",
    icon: "⚡",
  },
  {
    title: "Service Continuity Bonus",
    desc: "500 bonus reward points awarded on every 5th consecutive service completion.",
    icon: "🌟",
  },
  {
    title: "Pan-India Dealership Validity",
    desc: "Redeem Joyride Smart Card benefits across all authorized Hero MotoCorp service centers.",
    icon: "🇮🇳",
  },
];

// Sample VIN Records for Live Simulator
const MOCK_VINS = [
  { vin: "MBLHA10EDBHK12041", reg: "MH02AB1234", name: "Rajesh Kumar", status: "Success", time: "0.38s" },
  { vin: "MBLHA10EDBHK12042", reg: "DL01XY9876", name: "Priya Sharma", status: "Success", time: "0.41s" },
  { vin: "MBLHA10EDBHK12043", reg: "KA05MN4567", name: "Amit Verma", status: "Success", time: "0.39s" },
  { vin: "MBLHA10EDBHK12044", reg: "GJ01PQ3322", name: "Suresh Patel", status: "Skipped (Duplicate)", time: "0.08s" },
  { vin: "MBLHA10EDBHK12045", reg: "TN09CC8811", name: "Ramanathan K", status: "Success", time: "0.42s" },
  { vin: "MBLHA10EDBHK12046", reg: "UP32AB5544", name: "Vikas Singh", status: "Success", time: "0.37s" },
  { vin: "MBLHA10EDBHK12047", reg: "HR26CD7788", name: "Deepak Yadav", status: "Success", time: "0.40s" },
  { vin: "MBLHA10EDBHK12048", reg: "WB02EE1122", name: "Subhash Banerjee", status: "Success", time: "0.36s" },
  { vin: "MBLHA10EDBHK12049", reg: "RJ14FF4433", name: "Manish Choudhary", status: "Success", time: "0.44s" },
  { vin: "MBLHA10EDBHK12050", reg: "KL07GG9900", name: "Arun Joseph", status: "Success", time: "0.39s" },
];

export default function Home() {
  // Mobile Menu Navigation State
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Active Loyalty Tier State
  const [activeTierId, setActiveTierId] = useState("gold");
  const currentTier = GOODLIFE_TIERS.find((t) => t.id === activeTierId) || GOODLIFE_TIERS[2];

  // Automation Simulator State
  const [simMode, setSimMode] = useState<"joyride" | "goodlife">("joyride");
  const [simSpeed, setSimSpeed] = useState<number>(2);
  const [simRunning, setSimRunning] = useState(false);
  const [simIndex, setSimIndex] = useState(0);
  const [simLogs, setSimLogs] = useState<Array<{ time: string; text: string; type: "info" | "success" | "warn" }>>([
    { time: "00:00:00", text: "Automation engine initialized. Ready to process batch list.", type: "info" },
  ]);
  const logEndRef = useRef<HTMLDivElement>(null);

  // CSV Generator Tab & Downloader State
  const [csvTab, setCsvTab] = useState<"joyride" | "goodlife">("joyride");

  // FAQ Accordion State
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  // Simulation Engine Effect
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (simRunning && simIndex < MOCK_VINS.length) {
      const delays = [300, 500, 800, 1200];
      const speedMs = delays[simSpeed - 1] || 500;

      timer = setTimeout(() => {
        const item = MOCK_VINS[simIndex];
        const nowStr = new Date().toLocaleTimeString();
        
        let newLogType: "info" | "success" | "warn" = "success";
        let logMsg = `[Record #${simIndex + 1}] Processing VIN ${item.vin} (${item.name})... Form validated in ${item.time}`;
        
        if (item.status.includes("Skipped")) {
          newLogType = "warn";
          logMsg = `[Record #${simIndex + 1}] VIN ${item.vin} — Already enrolled. Smart Skip activated (0.08s).`;
        }

        setSimLogs((prev) => [
          ...prev,
          { time: nowStr, text: logMsg, type: newLogType },
        ]);
        setSimIndex((prev) => prev + 1);
      }, speedMs);
    } else if (simRunning && simIndex >= MOCK_VINS.length) {
      setSimRunning(false);
      setSimLogs((prev) => [
        ...prev,
        {
          time: new Date().toLocaleTimeString(),
          text: `🎉 Batch execution complete! Processed 10 VIN records in 4.2 seconds. 0 Errors reported.`,
          type: "info",
        },
      ]);
    }
    return () => clearTimeout(timer);
  }, [simRunning, simIndex, simSpeed]);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [simLogs]);

  const handleStartSim = () => {
    setSimLogs([
      { time: new Date().toLocaleTimeString(), text: `🚀 Starting ${simMode === "joyride" ? "Joyride Online" : "GoodLife Enrolment"} batch automation test...`, type: "info" },
    ]);
    setSimIndex(0);
    setSimRunning(true);
  };

  const handlePauseSim = () => {
    setSimRunning(false);
    setSimLogs((prev) => [
      ...prev,
      { time: new Date().toLocaleTimeString(), text: "⏸️ Engine paused by user.", type: "warn" },
    ]);
  };

  // Excel Template File Downloader (All cells formatted as Text)
  const handleDownloadCsv = () => {
    const escXml = (str: string) => String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

    let headers: string[] = [];
    let dataRows: string[][] = [];
    let filename = "";

    if (csvTab === "joyride") {
      headers = ["VIN", "REG_NO", "COUPON_NO", "EMPLOYEE_CODE", "PLAN_YEAR"];
      dataRows = [
        ["MBLHA10EDBHK12041", "MH02AB1234", "CPN998877", "EMP101", "1"],
        ["MBLHA10EDBHK12042", "DL01XY9876", "CPN998878", "EMP102", "1"],
        ["MBLHA10EDBHK12043", "KA05MN4567", "CPN998879", "EMP101", "2"],
      ];
      filename = "Hero_Joyride_Bulk_Enrollment_Template.xls";
    } else {
      headers = ["VIN", "CUSTOMER_NAME", "MOBILE", "DOB", "STATE", "DISTRICT"];
      dataRows = [
        ["MBLHA10EDBHK12041", "Rajesh Kumar", "9876543210", "1992-05-15", "Maharashtra", "Mumbai"],
        ["MBLHA10EDBHK12042", "Priya Sharma", "9822110099", "1995-11-20", "Delhi", "New Delhi"],
        ["MBLHA10EDBHK12043", "Amit Verma", "9988776655", "1988-03-08", "Karnataka", "Bengaluru"],
      ];
      filename = "Hero_GoodLife_Bulk_Enrollment_Template.xls";
    }

    // Build Excel XML Spreadsheet with all cells as Text format
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<?mso-application progid="Excel.Sheet"?>\n';
    xml += '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"';
    xml += ' xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">\n';
    xml += '<Styles>\n';
    xml += '  <Style ss:ID="Default" ss:Name="Normal"><NumberFormat ss:Format="@"/></Style>\n';
    xml += '  <Style ss:ID="sHeader"><Font ss:Bold="1"/><NumberFormat ss:Format="@"/></Style>\n';
    xml += '  <Style ss:ID="sText"><NumberFormat ss:Format="@"/></Style>\n';
    xml += '</Styles>\n';
    xml += '<Worksheet ss:Name="Template">\n';
    xml += '<Table>\n';
    headers.forEach(() => { xml += '<Column ss:AutoFitWidth="1"/>\n'; });
    xml += '<Row>\n';
    headers.forEach(h => { xml += `  <Cell ss:StyleID="sHeader"><Data ss:Type="String">${escXml(h)}</Data></Cell>\n`; });
    xml += '</Row>\n';
    dataRows.forEach(row => {
      xml += '<Row>\n';
      row.forEach(val => { xml += `  <Cell ss:StyleID="sText"><Data ss:Type="String">${escXml(val)}</Data></Cell>\n`; });
      xml += '</Row>\n';
    });
    xml += '</Table>\n';
    xml += '</Worksheet>\n';
    xml += '</Workbook>';

    const blob = new Blob([xml], { type: "application/vnd.ms-excel;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="relative min-h-screen bg-[#07080B] text-slate-100 overflow-hidden font-sans">
      {/* Background Ambient Glowing Orbs */}
      <div className="bg-orb bg-orb-red w-[650px] h-[650px] -top-40 -left-40" />
      <div className="bg-orb bg-orb-blue w-[550px] h-[550px] top-1/3 -right-40" />
      <div className="bg-orb bg-orb-gold w-[500px] h-[500px] bottom-1/4 left-1/4" />

      {/* Navigation Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-[#07080B]/85 border-b border-white/10 transition-all duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          {/* Logo */}
          <a href="#" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#E31E24] to-red-600 flex items-center justify-center shadow-lg shadow-red-600/30 group-hover:scale-105 transition-transform">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <div className="font-extrabold text-xl tracking-tight text-white flex items-center gap-2 font-heading">
                GoodLife <span className="text-gradient-red">Enrollor</span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20">v4.0</span>
              </div>
              <div className="text-[11px] text-slate-400 font-medium tracking-wide">Hero MotoCorp Authorized Dealership Suite</div>
            </div>
          </a>

          {/* Desktop Nav Links */}
          <nav className="hidden lg:flex items-center gap-7 text-sm font-medium text-slate-300">
            <a href="#goodlife-tiers" className="hover:text-red-400 transition-colors">GoodLife Tiers</a>
            <a href="#joyride-packages" className="hover:text-red-400 transition-colors">Joyride AMC</a>
            <a href="#features" className="hover:text-red-400 transition-colors">Capabilities</a>
            <a href="#simulator" className="hover:text-red-400 transition-colors">Live Engine</a>
            <a href="#csv-guide" className="hover:text-red-400 transition-colors">CSV Specs</a>
            <a href="#privacy" className="hover:text-red-400 transition-colors">Privacy</a>
            <a href="#faq" className="hover:text-red-400 transition-colors">FAQ</a>
          </nav>

          {/* Header Action Button */}
          <div className="hidden sm:flex items-center gap-4">
            <a
              id="btn-nav-add-to-chrome"
              href="https://chromewebstore.google.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-hero-red px-5 py-2.5 rounded-xl font-semibold text-sm text-white flex items-center gap-2"
            >
              <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <circle cx="12" cy="12" r="4" />
                <line x1="21.17" y1="8" x2="12" y2="8" />
                <line x1="3.95" y1="6.06" x2="8.54" y2="14" />
                <line x1="10.88" y1="21.94" x2="15.46" y2="14" />
              </svg>
              Add to Chrome
            </a>
          </div>

          {/* Mobile Menu Toggle */}
          <button
            id="btn-mobile-menu-toggle"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 rounded-lg text-slate-300 hover:text-white hover:bg-white/5"
            aria-label="Toggle navigation menu"
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-navigation"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {mobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile Navigation Dropdown */}
        {mobileMenuOpen && (
          <div id="mobile-navigation" className="lg:hidden bg-[#0D0F17] border-b border-white/10 px-4 py-6 space-y-4 font-medium text-sm">
            <a href="#goodlife-tiers" onClick={() => setMobileMenuOpen(false)} className="block text-slate-200 hover:text-red-400 py-1">GoodLife Tiers</a>
            <a href="#joyride-packages" onClick={() => setMobileMenuOpen(false)} className="block text-slate-200 hover:text-red-400 py-1">Joyride AMC</a>
            <a href="#features" onClick={() => setMobileMenuOpen(false)} className="block text-slate-200 hover:text-red-400 py-1">Capabilities</a>
            <a href="#simulator" onClick={() => setMobileMenuOpen(false)} className="block text-slate-200 hover:text-red-400 py-1">Live Engine</a>
            <a href="#csv-guide" onClick={() => setMobileMenuOpen(false)} className="block text-slate-200 hover:text-red-400 py-1">CSV Specs</a>
            <a href="#privacy" onClick={() => setMobileMenuOpen(false)} className="block text-slate-200 hover:text-red-400 py-1">Privacy</a>
            <a href="#faq" onClick={() => setMobileMenuOpen(false)} className="block text-slate-200 hover:text-red-400 py-1">FAQ</a>
            <a
              id="btn-mobile-add-to-chrome"
              href="https://chromewebstore.google.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-3 rounded-xl font-semibold text-center text-white btn-hero-red block"
            >
              Add to Chrome — Free Extension
            </a>
          </div>
        )}
      </header>

      {/* Main Content Container */}
      <main id="main-content">
        {/* Hero Section */}
        <section className="relative pt-12 pb-24 lg:pt-20 lg:pb-32">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            {/* Hero MotoCorp Verified Badge */}
            <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-white/[0.05] border border-white/10 backdrop-blur-md mb-8 hover:border-red-500/40 transition-colors">
              <span className="w-2.5 h-2.5 rounded-full bg-[#E31E24] animate-pulse" />
              <span className="text-xs font-semibold tracking-wide text-slate-200 uppercase font-heading">
                Official Hero MotoCorp Dealership Bulk Automation Suite
              </span>
            </div>

            {/* Main Title */}
            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white font-heading max-w-5xl mx-auto leading-[1.15]">
              Automate <span className="text-gradient-red">Hero GoodLife</span> & <span className="text-blue-500">Joyride</span> Bulk Enrollments
            </h1>

            {/* Subtitle */}
            <p className="mt-6 text-lg sm:text-xl text-slate-300 max-w-3xl mx-auto leading-relaxed">
              Process hundreds of vehicle VINs effortlessly with zero data entry errors. Optimized for Hero MotoCorp authorized dealerships across India with self-tuning speed, smart skip logic, and 100% local browser privacy.
            </p>

            {/* Primary Action Buttons */}
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <a
                id="btn-hero-add-to-chrome"
                href="https://chromewebstore.google.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto px-8 py-4 rounded-xl font-bold text-base text-white btn-hero-red flex items-center justify-center gap-3 font-heading"
              >
                <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="12" cy="12" r="10" />
                  <circle cx="12" cy="12" r="4" />
                  <line x1="21.17" y1="8" x2="12" y2="8" />
                  <line x1="3.95" y1="6.06" x2="8.54" y2="14" />
                  <line x1="10.88" y1="21.94" x2="15.46" y2="14" />
                </svg>
                Add to Chrome — Available on Web Store
              </a>

              <a
                id="btn-hero-try-simulator"
                href="#simulator"
                className="w-full sm:w-auto px-8 py-4 rounded-xl font-bold text-base text-slate-200 bg-white/[0.04] border border-white/10 hover:bg-white/[0.08] hover:border-white/20 transition-all flex items-center justify-center gap-2 font-heading"
              >
                <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
                Try Live Engine Simulator
              </a>
            </div>

            {/* Key Feature Metric Pills */}
            <div className="mt-10 flex flex-wrap justify-center gap-3 text-xs font-semibold text-slate-300">
              <div className="px-3.5 py-1.5 rounded-lg bg-white/[0.03] border border-white/10 flex items-center gap-2">
                <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
                100% Chrome Web Store Safe
              </div>
              <div className="px-3.5 py-1.5 rounded-lg bg-white/[0.03] border border-white/10 flex items-center gap-2">
                <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                10x Latency Boost (0.4s/VIN)
              </div>
              <div className="px-3.5 py-1.5 rounded-lg bg-white/[0.03] border border-white/10 flex items-center gap-2">
                <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                Zero Remote Telemetry
              </div>
            </div>

            {/* Sidepanel Dashboard Extension Showcase Frame */}
            <div className="mt-16 relative max-w-5xl mx-auto">
              <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-[#E31E24]/30 via-red-500/20 to-blue-600/30 blur-xl opacity-75 group-hover:opacity-100 transition duration-1000" />
              <div className="relative rounded-2xl bg-[#0D0F17] border border-white/15 overflow-hidden shadow-2xl">
                {/* Window Top Bar */}
                <div className="px-4 py-3 bg-[#131622] border-b border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500/80" />
                    <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                    <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
                    <span className="ml-2 text-xs font-mono text-slate-400">hmclgoodlife.heromotocorp.biz — GoodLife Bulk Enrollor Side Panel</span>
                  </div>
                  <div className="text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                    Extension Connected & Ready
                  </div>
                </div>

                {/* Dashboard Image */}
                <div className="relative w-full aspect-[16/10] bg-[#0A0A0C]">
                  <Image
                    src="/assets/promo_large_1280x800.png"
                    alt="Goodlife Bulk Enrollor Chrome Extension side panel dashboard showcasing real-time VIN batch processing and zero latency browser automation for Hero MotoCorp dealerships"
                    fill
                    className="object-cover"
                    priority
                  />
                </div>

                {/* Overlay Metric Card 1 */}
                <div className="absolute bottom-6 left-6 hidden sm:flex items-center gap-3 p-4 rounded-xl bg-[#0D0F17]/95 border border-white/15 backdrop-blur-md shadow-2xl">
                  <div className="w-10 h-10 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 text-xl font-bold">
                    ⚡
                  </div>
                  <div className="text-left">
                    <div className="font-extrabold text-sm text-white font-heading">0.4 sec / Record</div>
                    <div className="text-xs text-slate-400 font-medium">Adaptive Speed Latency</div>
                  </div>
                </div>

                {/* Overlay Metric Card 2 */}
                <div className="absolute bottom-6 right-6 hidden sm:flex items-center gap-3 p-4 rounded-xl bg-[#0D0F17]/95 border border-white/15 backdrop-blur-md shadow-2xl">
                  <div className="w-10 h-10 rounded-lg bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-blue-400 text-xl font-bold">
                    🎯
                  </div>
                  <div className="text-left">
                    <div className="font-extrabold text-sm text-white font-heading">99.8% Form Accuracy</div>
                    <div className="text-xs text-slate-400 font-medium">Angular Form Validation</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Hero GoodLife Official Loyalty Tiers Section (Inspired by heromotocorp.com/en-in/good-life.html) */}
        <section id="goodlife-tiers" className="py-24 bg-[#0A0C12] border-t border-b border-white/10 relative">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto">
              <span className="text-xs font-extrabold tracking-widest text-[#E31E24] uppercase font-heading">
                Official Loyalty Ecosystem
              </span>
              <h2 className="mt-3 text-3xl sm:text-5xl font-extrabold text-white font-heading">
                Hero GoodLife Loyalty Tiers & Automation
              </h2>
              <p className="mt-4 text-slate-400 text-base sm:text-lg">
                Explore official Hero GoodLife membership plans and see how Goodlife Bulk Enrollor processes each tier with automated plan coding, DOB validation, and insurance handling.
              </p>
            </div>

            {/* Tier Selector Buttons */}
            <div className="mt-12 flex flex-wrap items-center justify-center gap-3">
              {GOODLIFE_TIERS.map((tier) => (
                <button
                  key={tier.id}
                  id={`btn-tier-${tier.id}`}
                  onClick={() => setActiveTierId(tier.id)}
                  className={`px-5 py-3 rounded-xl font-bold text-sm transition-all font-heading border flex items-center gap-2 ${
                    activeTierId === tier.id
                      ? "bg-[#E31E24] text-white border-red-500 shadow-lg shadow-red-600/30 scale-105"
                      : "bg-[#12141F] text-slate-300 border-white/10 hover:border-white/20 hover:text-white"
                  }`}
                >
                  {tier.name} ({tier.price.split("/")[0].trim()})
                </button>
              ))}
            </div>

            {/* Selected Tier Feature Card */}
            <div className="mt-10 max-w-4xl mx-auto">
              <div className={`p-8 sm:p-10 rounded-2xl bg-gradient-to-br ${currentTier.color} bg-[#0D0F17] border shadow-2xl relative overflow-hidden transition-all duration-300`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/10">
                  <div>
                    <div className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-white/10 text-white font-heading uppercase mb-2">
                      {currentTier.badge}
                    </div>
                    <h3 className="text-3xl font-extrabold text-white font-heading">{currentTier.name}</h3>
                  </div>
                  <div className="text-left sm:text-right">
                    <div className="text-3xl font-black text-white font-heading">{currentTier.price}</div>
                    <div className="text-xs font-bold text-slate-300 mt-1">{currentTier.welcomePoints}</div>
                  </div>
                </div>

                {/* Key Benefits Highlight Banner */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-6">
                  <div className="p-4 rounded-xl bg-white/[0.04] border border-white/10 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center text-xl shrink-0">
                      🛍️
                    </div>
                    <div>
                      <div className="text-xs text-slate-400 font-medium">Shopping & Vouchers</div>
                      <div className="font-bold text-slate-100 text-sm">{currentTier.shoppingVouchers}</div>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-white/[0.04] border border-white/10 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xl shrink-0">
                      🛡️
                    </div>
                    <div>
                      <div className="text-xs text-slate-400 font-medium">Accidental Death Insurance</div>
                      <div className="font-bold text-slate-100 text-sm">{currentTier.insurance}</div>
                    </div>
                  </div>
                </div>

                {/* Perks Checklist */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-6">
                  {currentTier.perks.map((perk, i) => (
                    <div key={i} className="flex items-center gap-3 text-sm text-slate-200 font-medium">
                      <svg className="w-5 h-5 text-red-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                      </svg>
                      {perk}
                    </div>
                  ))}
                </div>

                {/* Automation Engine Note */}
                <div className="mt-8 p-4 rounded-xl bg-[#E31E24]/10 border border-[#E31E24]/30 text-slate-200 text-xs sm:text-sm font-medium flex items-start gap-3">
                  <span className="text-xl">🤖</span>
                  <div>
                    <strong className="text-white font-heading block mb-0.5">Goodlife Bulk Enrollor Execution Note:</strong>
                    {currentTier.automationNote}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Hero Joyride Official Annual Maintenance Packages Section (Inspired by heromotocorp.com/en-in/services/hero-joyride-packages.html) */}
        <section id="joyride-packages" className="py-24 relative">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto">
              <span className="text-xs font-extrabold tracking-widest text-blue-500 uppercase font-heading">
                Pan-India Maintenance Smart Card
              </span>
              <h2 className="mt-3 text-3xl sm:text-5xl font-extrabold text-white font-heading">
                Hero Joyride Annual Maintenance Contract (AMC)
              </h2>
              <p className="mt-4 text-slate-400 text-base sm:text-lg">
                Hero Joyride offers comprehensive maintenance savings for two-wheeler owners across India. Goodlife Bulk Enrollor automates Joyride Online registrations in bulk with 1-click execution.
              </p>
            </div>

            {/* Benefits Grid */}
            <div className="mt-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {JOYRIDE_AMC_BENEFITS.map((item, index) => (
                <div key={index} className="glass-card glass-card-hover p-8 rounded-2xl">
                  <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 text-2xl flex items-center justify-center mb-6">
                    {item.icon}
                  </div>
                  <h3 className="text-xl font-bold text-white font-heading">{item.title}</h3>
                  <p className="mt-3 text-slate-400 text-sm leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>

            {/* Automation Highlights Banner */}
            <div className="mt-12 max-w-4xl mx-auto glass-card p-8 rounded-2xl border-l-4 border-l-blue-500 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center text-2xl shrink-0 font-bold">
                  🚀
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white font-heading">Joyride Online Bulk Automation</h3>
                  <p className="text-xs text-slate-400 mt-1 max-w-xl leading-relaxed">
                    Automatically verifies coupon scratch codes, maps salesperson referral IDs, applies 1-year/2-year plan codes, and dispatches Angular form events without server disconnects.
                  </p>
                </div>
              </div>
              <a
                href="#simulator"
                className="px-6 py-3 rounded-xl font-bold text-xs text-white bg-blue-600 hover:bg-blue-500 transition-all font-heading shrink-0"
              >
                Test Joyride Engine
              </a>
            </div>
          </div>
        </section>

        {/* Enterprise Capabilities & Features Grid */}
        <section id="features" className="py-24 bg-[#0A0C12] border-t border-b border-white/10 relative">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto">
              <span className="text-xs font-extrabold tracking-widest text-[#E31E24] uppercase font-heading">
                Enterprise Capabilities
              </span>
              <h2 className="mt-3 text-3xl sm:text-5xl font-extrabold text-white font-heading">
                Engineered for Dealership Operations
              </h2>
              <p className="mt-4 text-slate-400 text-base sm:text-lg">
                Everything your dealership staff needs to complete daily batch enrollments in minutes instead of hours.
              </p>
            </div>

            <div className="mt-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {/* Feature 1 */}
              <div className="glass-card glass-card-hover p-8 rounded-2xl group">
                <div className="w-14 h-14 rounded-xl bg-red-500/10 border border-red-500/20 text-[#E31E24] flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                  ⚡
                </div>
                <h3 className="mt-6 text-xl font-bold text-white font-heading">Adaptive Speed Engine</h3>
                <p className="mt-3 text-slate-400 text-sm leading-relaxed">
                  Self-calibrates execution delays based on real-time portal server response times. Automatically throttles up on fast networks and safely slows down during portal lag.
                </p>
              </div>

              {/* Feature 2 */}
              <div className="glass-card glass-card-hover p-8 rounded-2xl group">
                <div className="w-14 h-14 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                  🔄
                </div>
                <h3 className="mt-6 text-xl font-bold text-white font-heading">Dual-Mode Automation</h3>
                <p className="mt-3 text-slate-400 text-sm leading-relaxed">
                  Seamlessly handles both GoodLife Enrolment (Pro/Silver/Gold/Platinum) and Joyride Online Enrollment with mode-specific CSV parsing and Angular form validation.
                </p>
              </div>

              {/* Feature 3 */}
              <div className="glass-card glass-card-hover p-8 rounded-2xl group">
                <div className="w-14 h-14 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                  🎯
                </div>
                <h3 className="mt-6 text-xl font-bold text-white font-heading">Smart Skip & Deduplication</h3>
                <p className="mt-3 text-slate-400 text-sm leading-relaxed">
                  Never process duplicate entries again. Remembers processed VINs across sessions and intelligently skips already-enrolled vehicles without breaking execution flow.
                </p>
              </div>

              {/* Feature 4 */}
              <div className="glass-card glass-card-hover p-8 rounded-2xl group">
                <div className="w-14 h-14 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                  🔒
                </div>
                <h3 className="mt-6 text-xl font-bold text-white font-heading">100% Offline Local Privacy</h3>
                <p className="mt-3 text-slate-400 text-sm leading-relaxed">
                  Zero external servers or telemetry. All customer VIN numbers, phone details, and records remain entirely inside your local Chrome browser storage.
                </p>
              </div>

              {/* Feature 5 */}
              <div className="glass-card glass-card-hover p-8 rounded-2xl group">
                <div className="w-14 h-14 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                  📶
                </div>
                <h3 className="mt-6 text-xl font-bold text-white font-heading">Auto-Network Resilience</h3>
                <p className="mt-3 text-slate-400 text-sm leading-relaxed">
                  Detects internet connection dropouts and automatically pauses execution. Resumes seamlessly right where it left off as soon as connectivity is restored.
                </p>
              </div>

              {/* Feature 6 */}
              <div className="glass-card glass-card-hover p-8 rounded-2xl group">
                <div className="w-14 h-14 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                  📊
                </div>
                <h3 className="mt-6 text-xl font-bold text-white font-heading">Real-Time Analytics Sidepanel</h3>
                <p className="mt-3 text-slate-400 text-sm leading-relaxed">
                  Live side panel UI displaying total queue size, completion rates, error breakdowns, processing speed (VINs/min), and interactive log filtering.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Interactive Live Engine Simulator Section */}
        <section id="simulator" className="py-24 relative">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto">
              <span className="text-xs font-extrabold tracking-widest text-[#E31E24] uppercase font-heading">
                Interactive Playground
              </span>
              <h2 className="mt-3 text-3xl sm:text-5xl font-extrabold text-white font-heading">
                See the Automation Engine in Action
              </h2>
              <p className="mt-4 text-slate-400 text-base sm:text-lg">
                Experience how Goodlife Bulk Enrollor parses, validates, and processes batch VIN records in real time with zero errors.
              </p>
            </div>

            <div className="mt-12 max-w-4xl mx-auto rounded-2xl bg-[#0D0F17] border border-white/15 overflow-hidden shadow-2xl p-6 sm:p-8">
              {/* Control Board Header */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-emerald-400 animate-ping" />
                  <h3 className="text-lg font-bold text-white font-heading flex items-center gap-2">
                    Automation Control Board
                  </h3>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-bold font-heading uppercase ${
                  simRunning ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-slate-800 text-slate-400"
                }`}>
                  {simRunning ? "ENGINE RUNNING" : "ENGINE IDLE"}
                </span>
              </div>

              {/* Engine Controls */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-6">
                {/* Mode Selector */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 font-heading uppercase mb-2">
                    1. Select Enrollment Mode
                  </label>
                  <div className="grid grid-cols-2 gap-2 bg-[#141724] p-1.5 rounded-xl border border-white/10">
                    <button
                      id="btn-sim-mode-joyride"
                      onClick={() => setSimMode("joyride")}
                      className={`py-2 px-3 rounded-lg text-xs font-bold transition-all font-heading ${
                        simMode === "joyride" ? "bg-[#E31E24] text-white shadow-md" : "text-slate-400 hover:text-white"
                      }`}
                    >
                      Joyride Online
                    </button>
                    <button
                      id="btn-sim-mode-goodlife"
                      onClick={() => setSimMode("goodlife")}
                      className={`py-2 px-3 rounded-lg text-xs font-bold transition-all font-heading ${
                        simMode === "goodlife" ? "bg-blue-600 text-white shadow-md" : "text-slate-400 hover:text-white"
                      }`}
                    >
                      GoodLife Enrolment
                    </button>
                  </div>
                </div>

                {/* Speed Slider */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label htmlFor="slider-sim-speed" className="text-xs font-bold text-slate-300 font-heading uppercase">
                      2. Engine Speed
                    </label>
                    <span className="text-xs font-bold text-red-400 font-mono">
                      {simSpeed === 1 ? "1x Turbo (300ms)" : simSpeed === 2 ? "2x Fast (500ms)" : simSpeed === 3 ? "3x Normal (800ms)" : "4x Safe (1200ms)"}
                    </span>
                  </div>
                  <input
                    id="slider-sim-speed"
                    aria-label="Simulation engine speed slider"
                    type="range"
                    min="1"
                    max="4"
                    value={simSpeed}
                    onChange={(e) => setSimSpeed(Number(e.target.value))}
                    className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-[#E31E24]"
                  />
                </div>
              </div>

              {/* Progress Bar */}
              <div className="my-6">
                <div className="flex justify-between text-xs text-slate-400 font-medium mb-2">
                  <span>Batch Queue Progress</span>
                  <span className="font-mono text-white font-bold">{simIndex} / {MOCK_VINS.length} Records</span>
                </div>
                <div className="w-full h-3 bg-slate-900 rounded-full overflow-hidden border border-white/10">
                  <div
                    className="h-full bg-gradient-to-r from-[#E31E24] to-red-500 transition-all duration-300"
                    style={{ width: `${(simIndex / MOCK_VINS.length) * 100}%` }}
                  />
                </div>
              </div>

              {/* Terminal Log Console */}
              <div className="bg-[#05060A] rounded-xl border border-white/10 p-4 h-56 overflow-y-auto font-mono text-xs text-slate-300 space-y-2">
                {simLogs.map((log, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <span className="text-slate-500 shrink-0">[{log.time}]</span>
                    <span className={log.type === "success" ? "text-emerald-400" : log.type === "warn" ? "text-amber-400" : "text-blue-400"}>
                      {log.text}
                    </span>
                  </div>
                ))}
                <div ref={logEndRef} />
              </div>

              {/* Simulation Controls */}
              <div className="mt-6 flex justify-center gap-4">
                {!simRunning ? (
                  <button
                    id="btn-sim-toggle-start"
                    onClick={handleStartSim}
                    className="px-6 py-3 rounded-xl font-bold text-sm text-white btn-hero-red font-heading flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <polygon points="5 3 19 12 5 21 5 3" />
                    </svg>
                    Start Test Simulation
                  </button>
                ) : (
                  <button
                    id="btn-sim-toggle-pause"
                    onClick={handlePauseSim}
                    className="px-6 py-3 rounded-xl font-bold text-sm text-amber-400 bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20 transition-all font-heading flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <rect x="6" y="6" width="12" height="12" />
                    </svg>
                    Pause Engine
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* CSV Specifications & Template Downloader */}
        <section id="csv-guide" className="py-24 bg-[#0A0C12] border-t border-b border-white/10 relative">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto">
              <span className="text-xs font-extrabold tracking-widest text-[#E31E24] uppercase font-heading">
                Batch Import Specifications
              </span>
              <h2 className="mt-3 text-3xl sm:text-5xl font-extrabold text-white font-heading">
                Excel File Specifications & Template Generator
              </h2>
              <p className="mt-4 text-slate-400 text-base sm:text-lg">
                Review required columns or download ready-to-use Excel templates (all cells formatted as Text) for Hero GoodLife & Joyride portals.
              </p>
            </div>

            {/* Mode Switcher */}
            <div className="mt-10 flex justify-center gap-3">
              <button
                id="btn-csv-tab-joyride"
                onClick={() => setCsvTab("joyride")}
                className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all font-heading ${
                  csvTab === "joyride" ? "bg-[#E31E24] text-white shadow-lg" : "bg-[#12141F] text-slate-400 border border-white/10"
                }`}
              >
                Joyride Columns
              </button>
              <button
                id="btn-csv-tab-goodlife"
                onClick={() => setCsvTab("goodlife")}
                className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all font-heading ${
                  csvTab === "goodlife" ? "bg-blue-600 text-white shadow-lg" : "bg-[#12141F] text-slate-400 border border-white/10"
                }`}
              >
                GoodLife Columns
              </button>
            </div>

            {/* Specification Table */}
            <div className="mt-8 max-w-4xl mx-auto bg-[#0E1017] rounded-2xl border border-white/10 overflow-hidden shadow-2xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-300">
                  <thead className="bg-[#141724] text-xs uppercase font-heading text-slate-400 font-bold border-b border-white/10">
                    <tr>
                      <th className="px-6 py-4">#</th>
                      <th className="px-6 py-4">Header Name</th>
                      <th className="px-6 py-4">Requirement</th>
                      <th className="px-6 py-4">Example Value</th>
                      <th className="px-6 py-4">Validation Rule</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {csvTab === "joyride" ? (
                      <>
                        <tr>
                          <td className="px-6 py-4 font-mono text-slate-500">1</td>
                          <td className="px-6 py-4 font-mono font-bold text-red-400">VIN</td>
                          <td className="px-6 py-4"><span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-red-500/20 text-red-400 border border-red-500/30">Required</span></td>
                          <td className="px-6 py-4 font-mono text-slate-200">MBLHA10EDBHK12041</td>
                          <td className="px-6 py-4 text-xs text-slate-400">17-character chassis VIN</td>
                        </tr>
                        <tr>
                          <td className="px-6 py-4 font-mono text-slate-500">2</td>
                          <td className="px-6 py-4 font-mono font-bold text-slate-200">REG_NO</td>
                          <td className="px-6 py-4"><span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-800 text-slate-400">Optional</span></td>
                          <td className="px-6 py-4 font-mono text-slate-200">MH02AB1234</td>
                          <td className="px-6 py-4 text-xs text-slate-400">Vehicle registration plate</td>
                        </tr>
                        <tr>
                          <td className="px-6 py-4 font-mono text-slate-500">3</td>
                          <td className="px-6 py-4 font-mono font-bold text-slate-200">COUPON_NO</td>
                          <td className="px-6 py-4"><span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-800 text-slate-400">Optional</span></td>
                          <td className="px-6 py-4 font-mono text-slate-200">CPN998877</td>
                          <td className="px-6 py-4 text-xs text-slate-400">Joyride scratch coupon code</td>
                        </tr>
                        <tr>
                          <td className="px-6 py-4 font-mono text-slate-500">4</td>
                          <td className="px-6 py-4 font-mono font-bold text-slate-200">EMPLOYEE_CODE</td>
                          <td className="px-6 py-4"><span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-800 text-slate-400">Optional</span></td>
                          <td className="px-6 py-4 font-mono text-slate-200">EMP101</td>
                          <td className="px-6 py-4 text-xs text-slate-400">Salesperson referral ID</td>
                        </tr>
                      </>
                    ) : (
                      <>
                        <tr>
                          <td className="px-6 py-4 font-mono text-slate-500">1</td>
                          <td className="px-6 py-4 font-mono font-bold text-blue-400">VIN</td>
                          <td className="px-6 py-4"><span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-red-500/20 text-red-400 border border-red-500/30">Required</span></td>
                          <td className="px-6 py-4 font-mono text-slate-200">MBLHA10EDBHK12041</td>
                          <td className="px-6 py-4 text-xs text-slate-400">17-character chassis VIN</td>
                        </tr>
                        <tr>
                          <td className="px-6 py-4 font-mono text-slate-500">2</td>
                          <td className="px-6 py-4 font-mono font-bold text-blue-400">CUSTOMER_NAME</td>
                          <td className="px-6 py-4"><span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-red-500/20 text-red-400 border border-red-500/30">Required</span></td>
                          <td className="px-6 py-4 font-mono text-slate-200">Rajesh Kumar</td>
                          <td className="px-6 py-4 text-xs text-slate-400">Customer full name</td>
                        </tr>
                        <tr>
                          <td className="px-6 py-4 font-mono text-slate-500">3</td>
                          <td className="px-6 py-4 font-mono font-bold text-blue-400">MOBILE</td>
                          <td className="px-6 py-4"><span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-red-500/20 text-red-400 border border-red-500/30">Required</span></td>
                          <td className="px-6 py-4 font-mono text-slate-200">9876543210</td>
                          <td className="px-6 py-4 text-xs text-slate-400">10-digit primary contact</td>
                        </tr>
                        <tr>
                          <td className="px-6 py-4 font-mono text-slate-500">4</td>
                          <td className="px-6 py-4 font-mono font-bold text-slate-200">DOB</td>
                          <td className="px-6 py-4"><span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-800 text-slate-400">Optional</span></td>
                          <td className="px-6 py-4 font-mono text-slate-200">1992-05-15</td>
                          <td className="px-6 py-4 text-xs text-slate-400">YYYY-MM-DD format</td>
                        </tr>
                      </>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Download CSV Action */}
            <div className="mt-8 text-center">
              <button
                id="btn-csv-download"
                onClick={handleDownloadCsv}
                className="px-6 py-3.5 rounded-xl font-bold text-sm text-slate-200 bg-white/[0.04] border border-white/10 hover:bg-white/[0.08] hover:border-white/20 transition-all font-heading inline-flex items-center gap-2"
              >
                <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download Sample Excel ({csvTab === "joyride" ? "Joyride" : "GoodLife"})
              </button>
            </div>
          </div>
        </section>

        {/* Security & Chrome Web Store Privacy Section */}
        <section id="privacy" className="py-24 relative">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto">
              <span className="text-xs font-extrabold tracking-widest text-emerald-400 uppercase font-heading">
                Trust & Security Standards
              </span>
              <h2 className="mt-3 text-3xl sm:text-5xl font-extrabold text-white font-heading">
                Privacy Policy & Chrome Web Store Compliance
              </h2>
              <p className="mt-4 text-slate-400 text-base sm:text-lg">
                Goodlife Bulk Enrollor is built with strict zero-telemetry local browser isolation.
              </p>
            </div>

            <div className="mt-12 max-w-4xl mx-auto bg-[#0D0F17] rounded-2xl border border-white/10 p-8 sm:p-10 space-y-6 text-sm text-slate-300 leading-relaxed">
              <div className="flex items-center justify-between pb-4 border-b border-white/10">
                <span className="text-xs font-bold text-slate-400 font-mono">Last Updated: August 2026</span>
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  100% Offline Local Privacy
                </span>
              </div>

              <div>
                <h3 className="text-lg font-bold text-white font-heading mb-2">1. Local Data Isolation</h3>
                <p>
                  Goodlife Bulk Enrollor operates <strong>100% locally</strong> inside your Chrome browser session. The extension does NOT collect, transmit, store, or share any personal customer records, VIN numbers, or dealership portal passwords on external servers.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-bold text-white font-heading mb-2">2. Manifest V3 Security Compliance</h3>
                <p>
                  Built strictly in accordance with Google Chrome Web Store Manifest V3 guidelines. All uploaded batch lists and queue memory stay isolated inside <code>chrome.storage.local</code> on your local workstation.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-bold text-white font-heading mb-2">3. Permission Disclosures</h3>
                <ul className="list-disc pl-5 space-y-1 text-slate-400">
                  <li><code>activeTab</code> & <code>scripting</code>: Interacts exclusively with form DOM elements on <code>hmclgoodlife.heromotocorp.biz</code>.</li>
                  <li><code>sidePanel</code>: Renders the extension dashboard inside Chrome's native side panel.</li>
                  <li><code>storage</code>: Stores local user execution preferences and activation state.</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ Accordion Section */}
        <section id="faq" className="py-24 bg-[#0A0C12] border-t border-b border-white/10 relative">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto">
              <span className="text-xs font-extrabold tracking-widest text-[#E31E24] uppercase font-heading">
                Support & Answers
              </span>
              <h2 className="mt-3 text-3xl sm:text-5xl font-extrabold text-white font-heading">
                Frequently Asked Questions
              </h2>
            </div>

            <div className="mt-12 max-w-3xl mx-auto space-y-4">
              {[
                {
                  q: "How do I install the extension from the Chrome Web Store?",
                  a: "Click the 'Add to Chrome' button at the top of this page to open our official Chrome Web Store listing, then click 'Add to Chrome' in your browser and confirm installation.",
                },
                {
                  q: "Does this extension support all Hero GoodLife tiers (Pro, Silver, Gold, Platinum)?",
                  a: "Yes! Goodlife Bulk Enrollor supports all four official Hero GoodLife membership tiers (Pro ₹199, Silver ₹299, Gold ₹399, Platinum ₹499) with automatic plan code selection and customer DOB/district validation.",
                },
                {
                  q: "How does the extension handle Hero Joyride AMC packages?",
                  a: "The extension features a dedicated Joyride Online automation tab that handles scratch coupon verification, referral ID tracking, and VIN registration with 4 periodic service waivers.",
                },
                {
                  q: "What happens if the internet connection disconnects mid-batch?",
                  a: "The extension's Auto-Resilience engine automatically detects internet loss, safely pauses the queue, and resumes right from the last processed VIN once connectivity returns.",
                },
              ].map((faq, index) => (
                <div
                  key={index}
                  className="bg-[#0E1017] rounded-xl border border-white/10 overflow-hidden transition-colors"
                >
                  <button
                    id={`btn-faq-toggle-${index}`}
                    onClick={() => setOpenFaq(openFaq === index ? null : index)}
                    className="w-full p-5 text-left flex items-center justify-between font-bold text-white font-heading text-base hover:text-red-400 transition-colors"
                    aria-expanded={openFaq === index}
                    aria-controls={`faq-answer-${index}`}
                  >
                    <span>{faq.q}</span>
                    <svg
                      className={`w-5 h-5 transition-transform duration-200 text-slate-400 ${
                        openFaq === index ? "rotate-180 text-red-400" : ""
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {openFaq === index && (
                    <div
                      id={`faq-answer-${index}`}
                      role="region"
                      aria-labelledby={`btn-faq-toggle-${index}`}
                      className="px-5 pb-5 text-sm text-slate-400 leading-relaxed border-t border-white/5 pt-3"
                    >
                      {faq.a}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* Obsidian Brand Footer */}
      <footer className="py-12 bg-[#05060A] border-t border-white/10 text-slate-400 text-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pb-12 border-b border-white/10">
            <div>
              <div className="font-extrabold text-lg text-white font-heading mb-3">GoodLife Bulk Enrollor</div>
              <p className="text-slate-400 text-xs leading-relaxed max-w-sm">
                The enterprise-grade bulk automation extension built for Hero MotoCorp authorized dealerships across India.
              </p>
            </div>
            <div>
              <div className="font-bold text-white text-xs uppercase font-heading tracking-wider mb-3">Quick Navigation</div>
              <ul className="space-y-2 text-xs">
                <li><a href="#goodlife-tiers" className="hover:text-white">GoodLife Loyalty Tiers</a></li>
                <li><a href="#joyride-packages" className="hover:text-white">Joyride AMC Packages</a></li>
                <li><a href="#features" className="hover:text-white font-medium">Enterprise Features</a></li>
                <li><a href="#simulator" className="hover:text-white">Live Simulator</a></li>
                <li><a href="#privacy" className="hover:text-white">Privacy Policy</a></li>
              </ul>
            </div>
            <div>
              <div className="font-bold text-white text-xs uppercase font-heading tracking-wider mb-3">Support & Activation</div>
              <p className="text-xs text-slate-400 mb-2">CalcLabz Technologies</p>
              <a href="mailto:support@calclabz.com" className="text-xs text-red-400 font-bold hover:underline">
                support@calclabz.com
              </a>
            </div>
          </div>
          <div className="pt-8 text-center text-xs text-slate-500">
            &copy; 2026 Goodlife Bulk Enrollor. All rights reserved. Designed for Hero MotoCorp Dealership Portal.
          </div>
        </div>
      </footer>
    </div>
  );
}
