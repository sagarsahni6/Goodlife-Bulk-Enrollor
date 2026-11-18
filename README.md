# GoodLife & Joyride Bulk Enrollor 🚀

[![Next.js](https://img.shields.io/badge/Next.js-16.2.12-black?logo=next.js)](https://nextjs.org/)
[![Chrome Extension](https://img.shields.io/badge/Chrome%20Extension-Manifest%20v3-4285F4?logo=googlechrome)](https://developer.chrome.com/docs/extensions/)
[![Hero MotoCorp Portal](https://img.shields.io/badge/Hero%20GoodLife-Automation-E31837)](https://hmclgoodlife.heromotocorp.biz/GoodlifeDLWeb/)

A high-speed, intelligent bulk enrollment automation tool and web portal designed specifically for Hero MotoCorp authorized dealerships and service centers. It automates customer registration and bulk Joyride/GoodLife program enrollments on the official Hero GoodLife portal (`https://hmclgoodlife.heromotocorp.biz/GoodlifeDLWeb/`).

---

## 🌟 Key Features

### 1. 10-Column Joyride Bulk Automation
Full support for the modern Joyride template schema covering vehicle, customer location, and card discount details:
- **`vin`**: 17-character vehicle chassis number (*Required*)
- **`mobile`**: 10-digit customer mobile number (*Optional/Updates if blank*)
- **`email`**: Customer email address (*Optional/Fixes invalid DMS `"na"` entries*)
- **`district`**: Customer district (*Required - cascades dynamically from State*)
- **`city`**: Customer city (*Required - cascades dynamically from District*)
- **`transaction_type`**: `N` (New) or `R` (Renewal) (*Default: `N`*)
- **`joyride_year`**: Duration in years (*Default: `1`*)
- **`joyride_package`**: Package tier index (*Default: `2`*)
- **`joyride_card_number`**: 16-digit Joyride physical/digital card number (*Required*)
- **`discount`**: Discount value in ₹ (*Required*)

### 2. Robust XML Spreadsheet (`ss:Index`) & Multi-Format Parser
- Seamlessly parses `.xls` (XML Spreadsheet 2003 format exported by DMS/Excel) and `.csv`.
- Full handling of sparse rows using `ss:Index` attribute mapping, preventing column shifting when intermediate cells (e.g., optional `email`) are left empty.
- Multi-delimiter auto-detection (`,`, `;`, `\t`) and RFC 4180 quotation handling.

### 3. Non-Destructive DOM Injection & Safe Form Filling
- **Skip Pre-Filled Data**: Automatically checks if customer information is already fetched from DMS and skips overwriting.
- **Respects Locked Elements**: Never forces unlock or edits `disabled`, `readonly`, `aria-disabled`, or parent fieldset locked controls.
- **Smart Validation & Cleanup**: Detects and sanitizes default DMS placeholders like `"na"` in email fields before submission.

### 4. Real-Time Tracking & Reporting
- Instant validation preview before execution.
- Real-time row status with success/failure counters and detailed failure logs.
- Export results report directly to CSV.

---

## 📁 Repository Structure

```text
Goodlife-Bulk-Enrollor/
├── extension/                       # Chrome Extension (Manifest v3)
│   ├── manifest.json                # Extension metadata and permissions
│   ├── inject.js                    # Portal DOM form automation engine
│   ├── background.js                # Service worker & tab orchestration
│   ├── content.js                   # Extension bridge script
│   ├── license.js                   # Client license validation
│   ├── joyride_enrollment_template.xls # 10-Column Joyride template
│   ├── popup/                       # Extension UI (HTML/CSS/JS)
│   └── icons/                       # Extension logos & branding
├── src/app/                         # Next.js 16 Web Application & Landing Page
│   ├── page.tsx                     # Main dashboard, schema guides & CSV generators
│   ├── layout.tsx                   # Metadata, SEO tags & analytics
│   └── globals.css                  # Modern Tailwind CSS styling
├── legacy-static/                   # Static landing page & asset backup
├── public/                          # Web static assets & icons
└── README.md                        # Documentation
```

---

## 🛠️ Chrome Extension Installation

1. Clone or download this repository:
   ```bash
   git clone https://github.com/sagarsahni6/Goodlife-Bulk-Enrollor.git
   ```
2. Open Google Chrome and go to `chrome://extensions/`.
3. Toggle on **Developer mode** in the top-right corner.
4. Click **Load unpacked** in the top-left corner.
5. Select the `extension/` folder from this repository.
6. Open the [Hero GoodLife Portal](https://hmclgoodlife.heromotocorp.biz/GoodlifeDLWeb/#/login), log in, and launch the extension from your Chrome toolbar.

---

## 💻 Web Application Setup

The web application provides online documentation, CSV template generators, and dealership licensing information.

```bash
# Install dependencies
npm install

# Start local development server
npm run dev
# App will run at http://localhost:3000

# Build for production
npm run build
```

---

## 📋 CSV & Excel Specifications

### Joyride Enrollment Header
```csv
vin,mobile,email,district,city,transaction_type,joyride_year,joyride_package,joyride_card_number,discount
MBLHAW33XSHG04476,9996910724,customer@gmail.com,PATNA,PATNA,N,1,2,1136526720002513,25
```

### GoodLife Enrollment Header
```csv
VIN,CUSTOMER_NAME,MOBILE,DOB,STATE
MBLHA10EDBHK12041,Rajesh Kumar,9876543210,1992-05-15,Maharashtra
```

---

## 🛡️ License & Disclaimers

This automation utility is built for authorized Hero MotoCorp dealerships to assist in standard operational data entry. Ensure compliance with internal dealership procedures and guidelines.
