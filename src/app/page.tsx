"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";

/* ============================================================
   CONSTANTS & DATA
   ============================================================ */

const SPEED_LABELS = ["Turbo (200ms)", "Fast (400ms)", "Normal (800ms)", "Careful (1500ms)"];
const SPEED_DELAYS = [200, 400, 800, 1500];

const DEMO_VINS = [
  "MBLHA10EDBHK12041", "MBLHA10EDCHK15923", "MBLHA10EDDHK18764",
  "MBLHA10EDEHK21045", "MBLHA10EDFHK23187", "MBLHA10EDGHK25429",
  "MBLHA10EDHHK27891", "MBLHA10EDIHK30123", "MBLHA10EDJHK32564",
  "MBLHA10EDKHK34876",
];

/* ============================================================
   SVG ICON COMPONENTS
   ============================================================ */

const ChromeIcon = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" />
    <circle cx="12" cy="12" r="4" />
    <line x1="21.17" y1="8" x2="12" y2="8" />
    <line x1="3.95" y1="6.06" x2="8.54" y2="14" />
    <line x1="10.88" y1="21.94" x2="15.46" y2="14" />
  </svg>
);

const PlayIcon = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <polygon points="5 3 19 12 5 21 5 3" />
  </svg>
);

const StopIcon = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <rect x="6" y="6" width="12" height="12" />
  </svg>
);

const ShieldIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);

const BoltIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
  </svg>
);

const LockIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

const CheckIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const ChevronIcon = ({ size = 20 }: { size?: number }) => (
  <svg className="faq-chevron" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

const DownloadIcon = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);

const StackIcon = ({ size = 24 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2">
    <polygon points="12 2 2 7 12 12 22 7 12 2" />
    <polyline points="2 17 12 22 22 17" />
    <polyline points="2 12 12 17 22 12" />
  </svg>
);

const StarburstIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
  </svg>
);

/* ============================================================
   FAQ ACCORDION COMPONENT
   ============================================================ */

function FaqItem({ question, answer }: { question: string; answer: string }) {
  const [isOpen, setIsOpen] = useState(false);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setIsOpen((prev) => !prev);
    }
  };

  return (
    <div className={`faq-item ${isOpen ? "open" : ""}`}>
      <div
        className="faq-question"
        onClick={() => setIsOpen(!isOpen)}
        role="button"
        tabIndex={0}
        aria-expanded={isOpen}
        onKeyDown={handleKeyDown}
      >
        {question}
        <ChevronIcon />
      </div>
      <div className="faq-answer">
        <p>{answer}</p>
      </div>
    </div>
  );
}

/* ============================================================
   SIMULATOR COMPONENT
   ============================================================ */

function Simulator() {
  const [mode, setMode] = useState<"joyride" | "goodlife">("joyride");
  const [speed, setSpeed] = useState(2);
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState<Array<{ time: string; text: string; type: string }>>([
    { time: "00:00:00", text: "Automation engine ready for Hero GoodLife login & batch enrollment processing. Press \"Start Test Simulation\"...", type: "info" },
  ]);
  const logRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const total = 10;

  const getTimestamp = useCallback((offset: number) => {
    const s = Math.floor(offset);
    const m = Math.floor(s / 60);
    const h = Math.floor(m / 60);
    return `${String(h).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
  }, []);

  const stopSim = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsRunning(false);
  }, []);

  const startSim = useCallback(() => {
    setIsRunning(true);
    setProgress(0);
    setLogs([{ time: "00:00:00", text: `Authenticating Hero GoodLife login session... Starting ${mode === "joyride" ? "Joyride Online" : "GoodLife Enrolment"} batch processing...`, type: "info" }]);

    let current = 0;
    const delay = SPEED_DELAYS[speed - 1];

    timerRef.current = setInterval(() => {
      if (current >= total) {
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = null;
        setIsRunning(false);
        setLogs((prev) => [...prev, { time: getTimestamp((current * delay) / 1000), text: `✅ Batch complete! ${total}/${total} VINs processed successfully.`, type: "success" }]);
        return;
      }

      const vin = DEMO_VINS[current];
      const isSkip = current === 4;
      const ts = getTimestamp(((current + 1) * delay) / 1000);

      if (isSkip) {
        setLogs((prev) => [...prev, { time: ts, text: `⏭️ SKIP ${vin} — Already enrolled (session memory hit)`, type: "skip" }]);
      } else {
        setLogs((prev) => [...prev, { time: ts, text: `✔ Processed ${vin} — ${mode === "joyride" ? "Joyride" : "GoodLife"} enrollment submitted`, type: "success" }]);
      }

      current++;
      setProgress(Math.round((current / total) * 100));
    }, delay);
  }, [mode, speed, total, getTimestamp]);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [logs]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  return (
    <div className="simulator-box" id="simulator-box">
      <div className="sim-header">
        <div className="sim-title">
          <StackIcon />
          Automation Control Board &amp; Login Engine
        </div>
        <span className={`sim-status-badge ${isRunning ? "running" : ""}`}>{isRunning ? "RUNNING" : progress === 100 ? "COMPLETE" : "IDLE"}</span>
      </div>

      <div className="sim-controls-grid">
        <div>
          <label className="sim-label">1. Select Enrollment Mode</label>
          <div className="sim-tab-group">
            <button
              className={`sim-tab-btn ${mode === "joyride" ? "active" : ""}`}
              onClick={() => !isRunning && setMode("joyride")}
              disabled={isRunning}
              id="sim-tab-joyride"
            >
              Joyride Online
            </button>
            <button
              className={`sim-tab-btn ${mode === "goodlife" ? "active" : ""}`}
              onClick={() => !isRunning && setMode("goodlife")}
              disabled={isRunning}
              id="sim-tab-goodlife"
            >
              GoodLife Enrolment
            </button>
          </div>
        </div>

        <div>
          <label className="sim-label">
            2. Processing Speed: <span style={{ color: "#2563eb" }}>{SPEED_LABELS[speed - 1]}</span>
          </label>
          <input
            type="range"
            min={1}
            max={4}
            value={speed}
            disabled={isRunning}
            className="sim-slider"
            onChange={(e) => !isRunning && setSpeed(Number(e.target.value))}
            id="sim-speed-slider"
          />
        </div>
      </div>

      <div className="sim-progress-bar">
        <div className="sim-progress-fill" style={{ width: `${progress}%` }} />
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px", fontSize: "0.85rem", color: "var(--color-text-dim)" }}>
        <span>Queue Progress</span>
        <span>{Math.round((progress / 100) * total)} / {total} VINs</span>
      </div>

      <div className="sim-output-console" ref={logRef} id="sim-log">
        {logs.map((log, i) => (
          <div className="log-line" key={i}>
            <span className="log-time">[{log.time}]</span>
            <span className={`log-${log.type}`}>{log.text}</span>
          </div>
        ))}
      </div>

      <div className="text-center">
        {!isRunning ? (
          <button className="btn-primary" onClick={startSim} id="btn-start-sim">
            <PlayIcon size={18} />
            Start Test Simulation
          </button>
        ) : (
          <button className="btn-secondary" onClick={stopSim} id="btn-stop-sim" style={{ color: "#e11d48", borderColor: "rgba(225, 29, 72, 0.3)" }}>
            <StopIcon />
            Pause Automation
          </button>
        )}
      </div>
    </div>
  );
}

/* ============================================================
   CSV TABLE COMPONENT
   ============================================================ */

function CsvTables() {
  const [activeTab, setActiveTab] = useState<"joyride" | "goodlife">("joyride");

  const joyrideColumns = [
    { num: 1, header: "VIN", required: true, example: "MBLHA10EDBHK12041", desc: "17-character vehicle chassis number" },
    { num: 2, header: "REG_NO", required: false, example: "MH02AB1234", desc: "Vehicle registration number" },
    { num: 3, header: "COUPON_NO", required: false, example: "CPN998877", desc: "Joyride scratch coupon number" },
    { num: 4, header: "EMPLOYEE_CODE", required: false, example: "EMP101", desc: "Dealership salesperson referral code" },
    { num: 5, header: "PLAN_YEAR", required: false, example: "1", desc: "Duration of plan (Default: 1 Year)" },
  ];

  const goodlifeColumns = [
    { num: 1, header: "VIN", required: true, example: "MBLHA10EDBHK12041", desc: "17-character vehicle chassis number" },
    { num: 2, header: "CUSTOMER_NAME", required: true, example: "Rajesh Kumar", desc: "Full primary account holder name" },
    { num: 3, header: "MOBILE", required: true, example: "9876543210", desc: "10-digit primary mobile number" },
    { num: 4, header: "DOB", required: false, example: "1992-05-15", desc: "Date of birth (YYYY-MM-DD)" },
    { num: 5, header: "STATE", required: false, example: "Maharashtra", desc: "Cascading district dropdown state" },
  ];

  const downloadSampleCsv = () => {
    let content = "";
    let filename = "";

    if (activeTab === "joyride") {
      content = "VIN,REG_NO,COUPON_NO,EMPLOYEE_CODE,PLAN_YEAR\n" +
                "MBLHA10EDBHK12041,MH02AB1234,CPN998877,EMP101,1\n" +
                "MBLHA10EDCHK15923,MH02AB5678,CPN998878,EMP102,1\n";
      filename = "sample_joyride_enrollment_template.csv";
    } else {
      content = "VIN,CUSTOMER_NAME,MOBILE,DOB,STATE\n" +
                "MBLHA10EDBHK12041,Rajesh Kumar,9876543210,1992-05-15,Maharashtra\n" +
                "MBLHA10EDCHK15923,Amit Sharma,9812345678,1988-09-20,Delhi\n";
      filename = "sample_goodlife_enrollment_template.csv";
    }

    const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const columns = activeTab === "joyride" ? joyrideColumns : goodlifeColumns;

  return (
    <>
      <div className="csv-tabs">
        <button className={`csv-tab-btn ${activeTab === "joyride" ? "active" : ""}`} onClick={() => setActiveTab("joyride")} id="csv-tab-joyride">
          Joyride Columns
        </button>
        <button className={`csv-tab-btn ${activeTab === "goodlife" ? "active" : ""}`} onClick={() => setActiveTab("goodlife")} id="csv-tab-goodlife">
          GoodLife Columns
        </button>
      </div>

      <div className="table-wrapper">
        <table className="data-table" id={`table-${activeTab}`}>
          <thead>
            <tr>
              <th>#</th>
              <th>Header Name</th>
              <th>Status</th>
              <th>Example Value</th>
              <th>Description / Rules</th>
            </tr>
          </thead>
          <tbody>
            {columns.map((col) => (
              <tr key={col.num}>
                <td>{col.num}</td>
                <td><code>{col.header}</code></td>
                <td><span className={`req-badge ${col.required ? "req-yes" : "req-no"}`}>{col.required ? "Required" : "Optional"}</span></td>
                <td><code>{col.example}</code></td>
                <td>{col.desc}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="text-center mt-xl">
        <button className="btn-secondary" id="btn-download-csv" onClick={downloadSampleCsv}>
          <DownloadIcon />
          Download Sample {activeTab === "joyride" ? "Joyride" : "GoodLife"} CSV Template
        </button>
      </div>
    </>
  );
}

/* ============================================================
   VIN VALIDATOR COMPONENT
   ============================================================ */

function VinValidator() {
  const [vin, setVin] = useState("MBLHA10EDBHK12041");

  const cleanVin = vin.trim().toUpperCase();
  const lengthValid = cleanVin.length === 17;
  const invalidChars = (cleanVin.match(/[IOQ]/gi) || []).join(", ");
  const isHero = cleanVin.startsWith("MBL");

  const yearCodeMap: Record<string, string> = {
    H: "2017", J: "2018", K: "2019", L: "2020", M: "2021",
    N: "2022", P: "2023", R: "2024", S: "2025", T: "2026",
  };

  const yearChar = cleanVin.length >= 10 ? cleanVin[9] : "";
  const decodedYear = yearCodeMap[yearChar] || null;

  const isValid = lengthValid && !invalidChars && /^[A-HJ-NPR-Z0-9]{17}$/.test(cleanVin);

  return (
    <div className="card" style={{ maxWidth: "680px", margin: "0 auto", padding: "28px" }} id="vin-validator">
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
        <div className="card-icon blue" style={{ width: "36px", height: "36px", fontSize: "16px" }}>🔍</div>
        <h3 className="card-title" style={{ margin: 0, fontSize: "1.2rem" }}>Instant Dealership VIN Format Validator</h3>
      </div>
      <p className="card-text" style={{ marginBottom: "20px" }}>
        Test any 17-character chassis VIN to verify length, invalid ISO characters (I, O, Q), manufacturing year codes, and Hero MotoCorp WMI prefix.
      </p>

      <div style={{ display: "flex", gap: "12px", marginBottom: "16px", flexWrap: "wrap" }}>
        <input
          type="text"
          value={vin}
          maxLength={17}
          onChange={(e) => setVin(e.target.value)}
          placeholder="Enter 17-char VIN (e.g. MBLHA10EDBHK12041)"
          style={{
            flex: "1 min 260px",
            padding: "12px 16px",
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--color-border)",
            fontFamily: "var(--font-mono)",
            fontSize: "14px",
            background: "var(--color-bg-primary)",
            color: "var(--color-text-primary)",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
          }}
          id="vin-input"
        />
        <button
          className="btn-secondary"
          onClick={() => setVin("MBLHA10EDBHK12041")}
          style={{ padding: "10px 16px", fontSize: "13px" }}
          id="btn-sample-vin"
        >
          Load Sample VIN
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "12px", fontSize: "13px" }}>
        <div style={{ padding: "10px", borderRadius: "8px", background: "var(--color-bg-primary)", border: "1px solid var(--color-border)" }}>
          <div style={{ color: "var(--color-text-dim)", fontSize: "11px" }}>LENGTH (17 CHARS)</div>
          <div style={{ fontWeight: 600, color: lengthValid ? "#059669" : "#e11d48" }}>
            {cleanVin.length} / 17 {lengthValid ? "✓" : "✗"}
          </div>
        </div>

        <div style={{ padding: "10px", borderRadius: "8px", background: "var(--color-bg-primary)", border: "1px solid var(--color-border)" }}>
          <div style={{ color: "var(--color-text-dim)", fontSize: "11px" }}>MANUFACTURER</div>
          <div style={{ fontWeight: 600, color: isHero ? "#2563eb" : "var(--color-text-primary)" }}>
            {isHero ? "Hero MotoCorp (MBL)" : "Other WMI"}
          </div>
        </div>

        <div style={{ padding: "10px", borderRadius: "8px", background: "var(--color-bg-primary)", border: "1px solid var(--color-border)" }}>
          <div style={{ color: "var(--color-text-dim)", fontSize: "11px" }}>MODEL YEAR</div>
          <div style={{ fontWeight: 600, color: decodedYear ? "#059669" : "var(--color-text-dim)" }}>
            {decodedYear ? `${decodedYear} (Code ${yearChar})` : yearChar ? `Code ${yearChar}` : "N/A"}
          </div>
        </div>

        <div style={{ padding: "10px", borderRadius: "8px", background: "var(--color-bg-primary)", border: "1px solid var(--color-border)" }}>
          <div style={{ color: "var(--color-text-dim)", fontSize: "11px" }}>STATUS</div>
          <div style={{ fontWeight: 700, color: isValid ? "#059669" : "#e11d48" }}>
            {isValid ? "VALID VIN" : invalidChars ? "INVALID CHARS (I/O/Q)" : "INCOMPLETE"}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   HOW TO USE GUIDE COMPONENT
   ============================================================ */

function HowToUseSection() {
  const steps = [
    {
      num: "01",
      title: "Install & Pin Extension",
      tag: "Setup",
      desc: "Install Goodlife Bulk Enrollor from the official Chrome Web Store. Click Chrome's puzzle icon in your toolbar and pin the extension for instant 1-click access during daily operations.",
      tip: "Pinning the icon lets you launch the side panel anytime with a single click.",
    },
    {
      num: "02",
      title: "Log In to Hero Dealership Portal",
      tag: "Authentication",
      desc: "Open Google Chrome and navigate to the official Hero MotoCorp portal (hmclgoodlife.heromotocorp.biz/GoodlifeDLWeb/#/login). Enter your authorized credentials and complete your standard Hero GoodLife login.",
      tip: "The extension automatically attaches to your authenticated session.",
    },
    {
      num: "03",
      title: "Prepare Your Batch CSV File",
      tag: "Data Prep",
      desc: "Use Excel or Google Sheets to format your daily batch file. Include headers like VIN, CUSTOMER_NAME, MOBILE, DOB, and STATE. Download sample templates from our CSV guide section below.",
      tip: "Ensure chassis numbers are 17 characters without spaces or invalid letters (I, O, Q).",
    },
    {
      num: "04",
      title: "Launch Side Panel & Select Mode",
      tag: "Configuration",
      desc: "Click the Goodlife Bulk Enrollor toolbar icon to open Chrome's native Side Panel. Select your target form mode: Joyride Online Enrollment or GoodLife Enrolment.",
      tip: "Use the mode tab switcher to toggle between Joyride and GoodLife forms in 1 click.",
    },
    {
      num: "05",
      title: "Drag & Drop CSV and Start Automation",
      tag: "Execution",
      desc: "Drag and drop your batch .csv file into the upload zone. Review the queue count, set your processing speed slider (Turbo, Fast, Normal, Careful), and click 'Start Automation'.",
      tip: "Watch live progress, completed counts, and instant log alerts in real time.",
    },
    {
      num: "06",
      title: "Auto-Resilience & License Key Setup",
      tag: "Complete",
      desc: "For first-time use, copy your unique Device ID from the panel and enter your license key. If portal logout or network loss occurs, the engine pauses and safely resumes after re-login.",
      tip: "Processed VINs are stored locally so duplicate vehicles are automatically skipped.",
    },
  ];

  return (
    <section className="section" id="how-to-use" style={{ background: "var(--color-bg-surface)" }}>
      <div className="container">
        <div className="section-header">
          <div className="section-tag">Step-by-Step Guide</div>
          <h2 className="section-title">How to Use Goodlife Bulk Enrollor</h2>
          <p className="section-subtitle">
            Follow this simple 6-step walkthrough to automate Hero GoodLife login sessions and process batch vehicle enrollments in minutes.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "24px" }}>
          {steps.map((step) => (
            <div
              className="card"
              key={step.num}
              style={{
                position: "relative",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                padding: "24px",
                borderTop: "4px solid var(--color-primary)",
              }}
            >
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "22px",
                      fontWeight: "800",
                      color: "var(--color-primary)",
                      background: "var(--color-primary-subtle)",
                      padding: "4px 12px",
                      borderRadius: "8px",
                    }}
                  >
                    {step.num}
                  </span>
                  <span className="req-badge req-no" style={{ fontSize: "11px", textTransform: "uppercase" }}>
                    {step.tag}
                  </span>
                </div>

                <h3 className="card-title" style={{ fontSize: "1.2rem", marginBottom: "12px" }}>
                  {step.title}
                </h3>
                <p className="card-text" style={{ fontSize: "0.92rem", lineHeight: "1.6", marginBottom: "20px" }}>
                  {step.desc}
                </p>
              </div>

              <div
                style={{
                  padding: "10px 12px",
                  borderRadius: "var(--radius-sm)",
                  background: "var(--color-bg-primary)",
                  border: "1px solid var(--color-border)",
                  fontSize: "0.82rem",
                  color: "var(--color-text-secondary)",
                }}
              >
                💡 <strong>Pro Tip:</strong> {step.tip}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   HERO GOODLIFE LOGIN HUB & QUICK ACCESS GUIDE COMPONENT
   ============================================================ */

function GoodlifeLoginHub() {
  return (
    <section className="section" id="goodlife-login-guide" style={{ background: "var(--color-bg-secondary)" }}>
      <div className="container">
        <div className="section-header">
          <div className="section-tag">Hero GoodLife Login Hub</div>
          <h2 className="section-title">Hero GoodLife Login &amp; Portal Access Guide</h2>
          <p className="section-subtitle">
            Direct portal links, dealer authentication instructions, login troubleshooting, and automated bulk registration for Hero MotoCorp authorized staff.
          </p>
        </div>

        {/* 2-Column Grid: Left (Official Access Card), Right (Login Steps & Troubleshooting) */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "28px", marginBottom: "40px" }}>
          
          {/* Card 1: Official Portal Access & Direct URL */}
          <div className="card" style={{ borderTop: "4px solid var(--color-primary)", padding: "28px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
                <div className="card-icon blue" style={{ margin: 0 }}>🔑</div>
                <div>
                  <h3 className="card-title" style={{ margin: 0, fontSize: "1.25rem" }}>Official Hero GoodLife Portal</h3>
                  <span style={{ fontSize: "0.8rem", color: "var(--color-success)", fontWeight: 600 }}>HMCL Official Portal Verified</span>
                </div>
              </div>

              <p className="card-text" style={{ fontSize: "0.95rem", lineHeight: "1.6", marginBottom: "20px" }}>
                The official portal for <strong>Hero GoodLife login</strong> and dealership vehicle registrations is hosted on Hero MotoCorp&rsquo;s enterprise portal infrastructure. Authorized dealership staff can access their account directly below.
              </p>

              <div style={{ background: "var(--color-bg-surface)", padding: "16px", borderRadius: "var(--radius-md)", border: "1px solid var(--color-border)", marginBottom: "20px" }}>
                <div style={{ fontSize: "0.75rem", textTransform: "uppercase", color: "var(--color-text-dim)", fontWeight: 700, letterSpacing: "0.05em", marginBottom: "4px" }}>
                  OFFICIAL HERO GOODLIFE LOGIN URL
                </div>
                <code style={{ fontSize: "0.88rem", fontWeight: 700, color: "var(--color-primary)", wordBreak: "break-all" }}>
                  hmclgoodlife.heromotocorp.biz/GoodlifeDLWeb/#/login
                </code>
              </div>

              <ul style={{ fontSize: "0.88rem", color: "var(--color-text-secondary)", lineHeight: "1.8", paddingLeft: "18px", marginBottom: "24px" }}>
                <li>Supports <strong>Hero GoodLife Dealer Login</strong> credentials</li>
                <li>Access to Joyride AMC online registration forms</li>
                <li>GoodLife Member Tiers: <strong>Pro (₹199), Silver (₹299), Gold (₹399), Platinum (₹499)</strong></li>
                <li>Real-time customer OTP validation &amp; district dropdown mapping</li>
              </ul>
            </div>

            <a
              href="https://hmclgoodlife.heromotocorp.biz/GoodlifeDLWeb/#/login"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary"
              style={{ width: "100%", justifyContent: "center" }}
              id="btn-direct-goodlife-login"
            >
              Open Hero GoodLife Login Portal ↗
            </a>
          </div>

          {/* Card 2: 4-Step Dealer Login Walkthrough */}
          <div className="card" style={{ borderTop: "4px solid var(--color-secondary)", padding: "28px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
              <div className="card-icon red" style={{ margin: 0 }}>⚡</div>
              <div>
                <h3 className="card-title" style={{ margin: 0, fontSize: "1.25rem" }}>Dealership Staff Login Steps</h3>
                <span style={{ fontSize: "0.8rem", color: "var(--color-text-dim)" }}>Quick 4-Step Authentication</span>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div style={{ display: "flex", gap: "14px" }}>
                <div style={{ width: "28px", height: "28px", borderRadius: "50%", background: "var(--color-secondary-subtle)", color: "var(--color-secondary)", fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: "0.85rem" }}>1</div>
                <div>
                  <h4 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 700 }}>Open Chrome Browser</h4>
                  <p style={{ margin: "2px 0 0", fontSize: "0.85rem", color: "var(--color-text-dim)" }}>Launch Google Chrome on your dealership workstation PC.</p>
                </div>
              </div>

              <div style={{ display: "flex", gap: "14px" }}>
                <div style={{ width: "28px", height: "28px", borderRadius: "50%", background: "var(--color-secondary-subtle)", color: "var(--color-secondary)", fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: "0.85rem" }}>2</div>
                <div>
                  <h4 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 700 }}>Enter Authorized Credentials</h4>
                  <p style={{ margin: "2px 0 0", fontSize: "0.85rem", color: "var(--color-text-dim)" }}>Input your Hero Dealership User ID, Password, and solve CAPTCHA.</p>
                </div>
              </div>

              <div style={{ display: "flex", gap: "14px" }}>
                <div style={{ width: "28px", height: "28px", borderRadius: "50%", background: "var(--color-secondary-subtle)", color: "var(--color-secondary)", fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: "0.85rem" }}>3</div>
                <div>
                  <h4 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 700 }}>Launch Goodlife Bulk Enrollor Extension</h4>
                  <p style={{ margin: "2px 0 0", fontSize: "0.85rem", color: "var(--color-text-dim)" }}>Click our extension icon in your Chrome toolbar to open Chrome&rsquo;s native Side Panel.</p>
                </div>
              </div>

              <div style={{ display: "flex", gap: "14px" }}>
                <div style={{ width: "28px", height: "28px", borderRadius: "50%", background: "var(--color-secondary-subtle)", color: "var(--color-secondary)", fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: "0.85rem" }}>4</div>
                <div>
                  <h4 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 700 }}>Upload CSV &amp; Automate Enrollments</h4>
                  <p style={{ margin: "2px 0 0", fontSize: "0.85rem", color: "var(--color-text-dim)" }}>Drag and drop your batch Excel file to process 50+ VINs in under 2 minutes!</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* GoodLife Login Troubleshooting & Common Solutions Box */}
        <div style={{ background: "var(--color-bg-surface)", padding: "28px", borderRadius: "var(--radius-lg)", border: "1px solid var(--color-border)" }}>
          <h3 style={{ fontSize: "1.15rem", fontWeight: 700, marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ color: "#d97706" }}>🛠️</span> Hero GoodLife Login Troubleshooting &amp; FAQs
          </h3>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "20px", fontSize: "0.9rem" }}>
            <div>
              <h4 style={{ fontWeight: 700, color: "var(--color-text-primary)", marginBottom: "6px" }}>Session Timeout Error during Bulk Entry?</h4>
              <p style={{ color: "var(--color-text-dim)", lineHeight: "1.5" }}>
                The official portal logouts after periods of inactivity. <strong>Goodlife Bulk Enrollor</strong> features auto-resilience that pauses your queue safely, allowing you to re-authenticate your <strong>hero goodlife login</strong> without losing batch progress.
              </p>
            </div>

            <div>
              <h4 style={{ fontWeight: 700, color: "var(--color-text-primary)", marginBottom: "6px" }}>Forgot Password or Locked Account?</h4>
              <p style={{ color: "var(--color-text-dim)", lineHeight: "1.5" }}>
                If your dealer login credentials fail on <code>hmclgoodlife.heromotocorp.biz/GoodlifeDLWeb/#/login</code>, use the portal&rsquo;s password recovery link or contact your Hero MotoCorp zonal IT administrator.
              </p>
            </div>

            <div>
              <h4 style={{ fontWeight: 700, color: "var(--color-text-primary)", marginBottom: "6px" }}>District Dropdown Loading Slow?</h4>
              <p style={{ color: "var(--color-text-dim)", lineHeight: "1.5" }}>
                Our extension handles asynchronous state-to-district dropdown binding automatically, ensuring zero submission failures for customer GoodLife enrollments.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   MAIN PAGE COMPONENT (LIGHT THEME)
   ============================================================ */

export default function Home() {
  const [navScrolled, setNavScrolled] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setNavScrolled(window.scrollY > 30);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const currentYear = new Date().getFullYear();

  return (
    <div style={{ position: "relative", zIndex: 1 }}>
      {/* Ambient Light Mesh Glow Effects */}
      <div className="bg-glow-container" aria-hidden="true">
        <div className="glow-orb glow-orb-1" />
        <div className="glow-orb glow-orb-2" />
        <div className="glow-orb glow-orb-3" />
      </div>

      {/* ─── NAVIGATION ─── */}
      <nav className={`navbar ${navScrolled ? "scrolled" : ""}`} id="navbar">
        <div className="container nav-container">
          <a href="#" className="brand-logo" id="nav-brand">
            <div className="brand-icon">
              <StarburstIcon />
            </div>
            Goodlife <span className="text-gradient-red">Enrollor</span>
          </a>

          <ul className={`nav-links ${mobileNavOpen ? "active" : ""}`} id="nav-links-menu">
            <li><a href="#goodlife-login-guide" className="nav-link" id="link-login-guide" onClick={() => setMobileNavOpen(false)}>Login Guide</a></li>
            <li><a href="#how-to-use" className="nav-link" id="link-how-to-use" onClick={() => setMobileNavOpen(false)}>How to Use</a></li>
            <li><a href="#features" className="nav-link" id="link-features" onClick={() => setMobileNavOpen(false)}>Features</a></li>
            <li><a href="#simulator" className="nav-link" id="link-simulator" onClick={() => setMobileNavOpen(false)}>Live Demo</a></li>
            <li><a href="#csv-guide" className="nav-link" id="link-csv" onClick={() => setMobileNavOpen(false)}>CSV Format</a></li>
            <li><a href="#faq" className="nav-link" id="link-faq" onClick={() => setMobileNavOpen(false)}>FAQ</a></li>
          </ul>

          <a href="https://chromewebstore.google.com/detail/goodlife-bulk-enrollor/fnebghkjopijoekagjhfkhmfikjpohpj" target="_blank" rel="noopener noreferrer" className="nav-cta-btn" id="nav-cws-btn">
            <ChromeIcon size={18} />
            Add to Chrome
          </a>

          <button
            className="nav-toggle"
            onClick={() => setMobileNavOpen(!mobileNavOpen)}
            aria-label="Toggle navigation menu"
            aria-expanded={mobileNavOpen}
            aria-controls="nav-links-menu"
            id="nav-toggle"
          >
            <span /><span /><span />
          </button>
        </div>
      </nav>

      {/* ─── HERO SECTION ─── */}
      <section className="hero" id="hero">
        <div className="container">
          <div className="hero-badge" id="hero-badge">
            <span className="hero-badge-dot" />
            Verified Extension for Hero GoodLife Login &amp; Portal Automation
          </div>

          <h1 className="hero-title">
            Automate <span className="text-gradient-blue">GoodLife</span> &amp;{" "}
            <span className="text-gradient-red">Joyride</span> Bulk Enrollments
          </h1>

          <p className="hero-description">
            Accelerate your <strong>Hero GoodLife login</strong>, batch register customer VINs, and process daily enrollments 10x faster with zero data entry errors.
          </p>

          <div className="hero-actions">
            <a href="https://chromewebstore.google.com/detail/goodlife-bulk-enrollor/fnebghkjopijoekagjhfkhmfikjpohpj" target="_blank" rel="noopener noreferrer" className="btn-primary" id="btn-hero-cws">
              <ChromeIcon size={22} />
              Add to Chrome — Available on Web Store
            </a>
            <a href="#simulator" className="btn-secondary" id="btn-hero-demo">
              <PlayIcon />
              Try Live Simulator
            </a>
          </div>

          <div className="feature-pills">
            <div className="pill"><ShieldIcon /> Hero GoodLife Login Ready</div>
            <div className="pill"><BoltIcon /> 10x Processing Speed</div>
            <div className="pill"><LockIcon /> 100% Local Browser Privacy</div>
            <div className="pill"><CheckIcon /> Smart Skip &amp; Auto-Retry</div>
          </div>

          {/* Product Screenshot Showcase */}
          <div className="showcase-frame">
            <div className="showcase-img-wrapper">
              <Image
                src="/screenshot.png"
                alt="Goodlife Bulk Enrollor Dashboard showing Hero GoodLife login automation and batch registration side panel"
                width={1280}
                height={800}
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 90vw, 1280px"
                className="showcase-img"
                priority
                id="hero-showcase-img"
              />
            </div>

            {/* Floating Stats */}
            <div className="floating-stat floating-stat-1">
              <div className="stat-icon-wrap" style={{ color: "#059669" }}>⚡</div>
              <div>
                <div className="stat-val">0.4s / VIN</div>
                <div className="stat-lbl">Hero GoodLife Login Speed</div>
              </div>
            </div>

            <div className="floating-stat floating-stat-2">
              <div className="stat-icon-wrap" style={{ color: "#2563eb" }}>🎯</div>
              <div>
                <div className="stat-val">99.8%</div>
                <div className="stat-lbl">Automated Accuracy</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── HERO GOODLIFE LOGIN HUB & GUIDE ─── */}
      <GoodlifeLoginHub />

      {/* ─── CHROME WEB STORE INSTALL ─── */}
      <section className="section install-section" id="install">
        <div className="container">
          <div className="section-header">
            <div className="section-tag">Chrome Web Store</div>
            <h2 className="section-title">Get Goodlife Bulk Enrollor on Chrome</h2>
            <p className="section-subtitle">Install directly from the Chrome Web Store for 1-click GoodLife login &amp; enrollment automation.</p>
          </div>

          <div className="features-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}>
            {[
              { num: "1", color: "blue", title: "Open Web Store", text: "Click Add to Chrome to visit our verified Chrome Web Store listing page." },
              { num: "2", color: "red", title: "Click Add to Chrome", text: 'Click the blue "Add to Chrome" button on the Web Store and confirm installation.' },
              { num: "3", color: "green", title: "Automate GoodLife Login", text: "Open your Hero MotoCorp portal, complete your Hero GoodLife login, and launch your bulk automation panel!" },
            ].map((step) => (
              <div className="card" key={step.num} style={{ textAlign: "center" }}>
                <div className={`card-icon ${step.color}`} style={{ margin: "0 auto 20px" }}>
                  <span className="step-number">{step.num}</span>
                </div>
                <h3 className="card-title">{step.title}</h3>
                <p className="card-text">{step.text}</p>
              </div>
            ))}
          </div>

          <div className="text-center mt-xl">
            <a href="https://chromewebstore.google.com/detail/goodlife-bulk-enrollor/fnebghkjopijoekagjhfkhmfikjpohpj" target="_blank" rel="noopener noreferrer" className="btn-primary" id="btn-install-cws">
              <ChromeIcon />
              Open Chrome Web Store Page
            </a>
          </div>
        </div>
      </section>

      {/* ─── DETAILED HOW TO USE GUIDE ─── */}
      <HowToUseSection />

      {/* ─── LIVE AUTOMATION SIMULATOR ─── */}
      <section className="section" id="simulator">
        <div className="container">
          <div className="section-header">
            <div className="section-tag">Interactive Experience</div>
            <h2 className="section-title">See the Automation Engine in Action</h2>
            <p className="section-subtitle">Experience how Goodlife Bulk Enrollor validates batch CSV records and processes vehicle enrollments in real time.</p>
          </div>

          <Simulator />
        </div>
      </section>

      {/* ─── KEY FEATURES GRID ─── */}
      <section className="section" id="features">
        <div className="container">
          <div className="section-header">
            <div className="section-tag">Enterprise Capabilities</div>
            <h2 className="section-title">Engineered for Maximum Efficiency</h2>
            <p className="section-subtitle">Everything dealership staff needs to manage Hero GoodLife login sessions and process batch enrollments daily.</p>
          </div>

          <div className="features-grid">
            {[
              {
                icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>,
                color: "red", title: "Adaptive Speed Engine",
                text: "Self-calibrates execution delays during Hero GoodLife login & portal server response times, guaranteeing error-free enrollments.",
              },
              {
                icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg>,
                color: "blue", title: "Dual-Mode Automation",
                text: "Seamlessly handles both GoodLife Enrolment and Joyride Online Enrollment with mode-specific CSV parsing and Angular form validation.",
              },
              {
                icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12" /></svg>,
                color: "green", title: "Smart Skip & Session Memory",
                text: "Never process duplicate entries again. Remembers processed VINs across sessions and intelligently skips already-enrolled vehicles.",
              },
              {
                icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>,
                color: "cyan", title: "100% Offline Privacy",
                text: "Zero external servers or telemetry. All customer VIN numbers, phone details, and records remain strictly inside your local browser storage.",
              },
              {
                icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21.21 15.89A10 10 0 1 1 8 2.83" /><path d="M22 12A10 10 0 0 0 12 2v10z" /></svg>,
                color: "purple", title: "Real-Time Analytics Dashboard",
                text: "Live side panel UI displaying total queue size, completion rates, error breakdowns, processing speed, and interactive log filtering.",
              },
              {
                icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="4.93" y1="4.93" x2="19.07" y2="19.07" /></svg>,
                color: "red", title: "Auto-Network Resilience",
                text: "Detects portal logouts or network dropouts, safely pauses your Hero GoodLife login queue, and resumes right where it left off.",
              },
            ].map((feature, i) => (
              <div className="card" key={i}>
                <div className={`card-icon ${feature.color}`}>{feature.icon}</div>
                <h3 className="card-title">{feature.title}</h3>
                <p className="card-text">{feature.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CSV FORMAT GUIDE ─── */}
      <section className="section" id="csv-guide">
        <div className="container">
          <div className="section-header">
            <div className="section-tag">Documentation</div>
            <h2 className="section-title">CSV Structure &amp; Format Specifications</h2>
            <p className="section-subtitle">Download standardized templates or review the required headers for your Excel batch files.</p>
          </div>

          <div style={{ marginBottom: "40px" }}>
            <VinValidator />
          </div>

          <CsvTables />
        </div>
      </section>

      {/* ─── PRIVACY POLICY ─── */}
      <section className="section" id="privacy-policy">
        <div className="container">
          <div className="section-header">
            <div className="section-tag">Trust &amp; Compliance</div>
            <h2 className="section-title">Privacy Policy &amp; Security Standards</h2>
            <p className="section-subtitle">Goodlife Bulk Enrollor is engineered with strict zero-telemetry local browser isolation for your dealership account.</p>
          </div>

          <div className="privacy-box">
            <p><strong>Last Updated: August 1, {currentYear}</strong></p>

            <h3>1. Data Collection &amp; Privacy Isolation</h3>
            <p>
              Goodlife Bulk Enrollor (&ldquo;the Extension&rdquo;) operates <strong>100% locally</strong> inside the user&rsquo;s Google Chrome browser environment. The Extension does NOT collect, transmit, store, or share any personal customer records or <strong>Hero GoodLife login</strong> credentials on external servers.
            </p>

            <h3>2. Local Data Processing</h3>
            <p>
              All vehicle chassis numbers (VINs), customer names, and contact numbers remain strictly within Chrome&rsquo;s isolated <code>chrome.storage.local</code> browser environment.
            </p>

            <h3>3. Permission Disclosures</h3>
            <ul>
              <li><code>activeTab</code> &amp; <code>scripting</code>: Used exclusively to interact with DOM form elements on <code>hmclgoodlife.heromotocorp.biz/GoodlifeDLWeb/#/login</code> during enrollment.</li>
              <li><code>sidePanel</code>: Displays the automation control dashboard within Chrome&rsquo;s native side panel.</li>
              <li><code>storage</code>: Stores local batch queue progress and offline license validation state.</li>
              <li><code>notifications</code> &amp; <code>alarms</code>: Triggers desktop alerts upon batch completion.</li>
            </ul>

            <h3>4. Security &amp; Cryptography</h3>
            <p>
              Device license verification uses local AES-256-CBC hardware fingerprinting. No remote servers receive your <strong>goodlife login</strong> password or dealership details.
            </p>

            <h3>5. Contact Information</h3>
            <p>
              For privacy inquiries or technical support, contact CalcLabz at <strong>support@calclabz.com</strong>.
            </p>
          </div>
        </div>
      </section>

      {/* ─── FAQ ─── */}
      <section className="section" id="faq">
        <div className="container">
          <div className="section-header">
            <div className="section-tag">Questions &amp; Answers</div>
            <h2 className="section-title">Frequently Asked Questions</h2>
          </div>

          <div className="faq-grid">
            <FaqItem
              question="What is the official URL for Hero GoodLife Login?"
              answer="The official portal for Hero GoodLife login is hmclgoodlife.heromotocorp.biz/GoodlifeDLWeb/#/login. Hero MotoCorp authorized dealership staff can access their account using their official dealer credentials."
            />
            <FaqItem
              question="How do I automate my Hero GoodLife login and enrollment process?"
              answer="Install Goodlife Bulk Enrollor from the Chrome Web Store, navigate to hmclgoodlife.heromotocorp.biz/GoodlifeDLWeb/#/login, complete your regular Hero GoodLife login, and launch the side panel to upload your batch CSV file."
            />
            <FaqItem
              question="Does this tool work for both Joyride and GoodLife forms?"
              answer="Yes! Goodlife Bulk Enrollor features a one-click tab switcher that toggles between Joyride Online Enrollment and GoodLife enrolment forms across all GoodLife membership tiers (Pro, Silver, Gold, Platinum)."
            />
            <FaqItem
              question="How to resolve Hero GoodLife login session expired errors?"
              answer="The extension's Auto-Resilience engine automatically detects portal logouts or internet drops. It safely pauses your queue and resumes automatically right where it left off once re-authenticated."
            />
            <FaqItem
              question="How do I obtain an offline License Key for my PC?"
              answer="Open the extension side panel, copy your unique Device ID displayed on the screen, and email it to support@calclabz.com to receive your instant license key."
            />
          </div>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer>
        <div className="container">
          <div className="footer-grid">
            <div>
              <div className="footer-brand-name">Goodlife Bulk Enrollor</div>
              <p className="footer-tagline">
                The enterprise-grade bulk automation extension built for Hero MotoCorp authorized dealerships. Simplify your Hero GoodLife login &amp; batch enrollments.
              </p>
              <div className="seo-tags-wrap">
                <span className="seo-tag-pill">goodlife login</span>
                <span className="seo-tag-pill">hero goodlife login</span>
                <span className="seo-tag-pill">hmcl goodlife login</span>
                <span className="seo-tag-pill">goodlife login portal</span>
                <span className="seo-tag-pill">hero goodlife portal</span>
                <span className="seo-tag-pill">Goodlife Bulk Enrollor</span>
              </div>
            </div>

            <div>
              <div className="footer-heading">Quick Links</div>
              <a href="https://chromewebstore.google.com/detail/goodlife-bulk-enrollor/fnebghkjopijoekagjhfkhmfikjpohpj" target="_blank" rel="noopener noreferrer" className="footer-link">Chrome Web Store Listing</a>
              <a href="#features" className="footer-link">Features</a>
              <a href="#privacy-policy" className="footer-link">Privacy Policy</a>
            </div>

            <div>
              <div className="footer-heading">Support</div>
              <p style={{ fontSize: "14px", color: "var(--color-text-dim)", marginBottom: "8px" }}>CalcLabz Technologies</p>
              <a href="mailto:support@calclabz.com" className="footer-link">support@calclabz.com</a>
            </div>
          </div>

          <div className="footer-bottom">
            &copy; {currentYear} Goodlife Bulk Enrollor. All rights reserved. Designed for Hero MotoCorp Dealership Portal.
          </div>
        </div>
      </footer>
    </div>
  );
}

