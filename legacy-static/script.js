/*
  Goodlife Bulk Enrollor — Interactive Website Controller
*/

document.addEventListener('DOMContentLoaded', () => {

  /* 1. Navbar Scroll Blur Effect */
  const navbar = document.getElementById('navbar');
  window.addEventListener('scroll', () => {
    if (window.scrollY > 40) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
  });

  /* GoodLife Tiers Data */
  const GOODLIFE_TIERS = {
    gold: {
      name: "GoodLife Gold Tier",
      badge: "MOST POPULAR",
      price: "₹399 / 2 Years",
      points: "3x Reward Points",
      insurance: "₹1,00,000 Personal Accident Cover",
      perks: [
        "✓ 1,000 Welcome Bonus Reward Points",
        "✓ Free Annual Wash & Polish Vouchers",
        "✓ 5% Discount on Hero Genuine Spare Parts",
        "✓ Priority Service Lane Access at Dealerships"
      ],
      note: "Parses VIN, customer contact, applies Gold plan code, dispatches Angular validation in 0.4s."
    },
    platinum: {
      name: "GoodLife Platinum Tier",
      badge: "PREMIUM ELITE",
      price: "₹699 / 3 Years",
      points: "5x Reward Points",
      insurance: "₹2,00,000 Personal Accident Cover",
      perks: [
        "✓ 2,500 Welcome Bonus Reward Points",
        "✓ Complimentary Express Service & Engine Scan",
        "✓ 10% Discount on Accessories & Spare Parts",
        "✓ VIP Pass for Hero World & Motorsport Events"
      ],
      note: "Auto-selects Platinum tier, triggers state/district cascading dropdown, auto-validates DOB."
    },
    diamond: {
      name: "GoodLife Diamond Tier",
      badge: "ULTIMATE PRESTIGE",
      price: "₹999 / 5 Years",
      points: "10x Reward Points",
      insurance: "₹5,00,000 Personal Accident Cover",
      perks: [
        "✓ 5,000 Welcome Bonus Reward Points",
        "✓ Unlimited Free Pick & Drop for Service",
        "✓ Dedicated Relationship Manager & Express Bay",
        "✓ Exclusive Annual Hero Riding Gear Voucher"
      ],
      note: "Processes Diamond tier renewals in bulk from Excel lists without manual server timeouts."
    },
    silver: {
      name: "GoodLife Silver Tier",
      badge: "ESSENTIAL PLAN",
      price: "₹199 / 1 Year",
      points: "1x Reward Points",
      insurance: "₹50,000 Personal Accident Cover",
      perks: [
        "✓ 500 Welcome Bonus Reward Points",
        "✓ Standard Service Discounts",
        "✓ Digital Hero Care Access",
        "✓ Valid across all Hero Dealerships"
      ],
      note: "Rapid bulk onboarding for single-year vehicle sales batches."
    },
    joyride: {
      name: "Joyride AMC Plan",
      badge: "AMC PROTECTION",
      price: "Dealership Rate",
      points: "AMC Coupon Rewards",
      insurance: "Free Roadside Assistance (RSA)",
      perks: [
        "✓ 4 Free Scheduled Maintenance Services",
        "✓ Labour Charges 100% Waived",
        "✓ Joyride Scratch Coupon Redemption",
        "✓ Dealership Sales Referral Code Tracking"
      ],
      note: "Dedicated Joyride Online engine handles coupon verification & VIN registration in seconds."
    }
  };

  const tierBtns = document.querySelectorAll('.tier-tab-btn');
  const tierBadgeText = document.getElementById('tier-badge-text');
  const tierTitleText = document.getElementById('tier-title-text');
  const tierPriceText = document.getElementById('tier-price-text');
  const tierPointsText = document.getElementById('tier-points-text');
  const tierInsuranceText = document.getElementById('tier-insurance-text');
  const tierPerksList = document.getElementById('tier-perks-list');
  const tierNoteText = document.getElementById('tier-note-text');

  tierBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tierBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const tierId = btn.getAttribute('data-tier');
      const data = GOODLIFE_TIERS[tierId];
      if (!data) return;

      if (tierBadgeText) tierBadgeText.textContent = data.badge;
      if (tierTitleText) tierTitleText.textContent = data.name;
      if (tierPriceText) tierPriceText.textContent = data.price;
      if (tierPointsText) tierPointsText.textContent = data.points;
      if (tierInsuranceText) tierInsuranceText.textContent = data.insurance;
      if (tierNoteText) tierNoteText.textContent = data.note;

      if (tierPerksList) {
        tierPerksList.innerHTML = data.perks.map(p => `<li>${p}</li>`).join('');
      }
    });
  });

  /* 2. Interactive Automation Simulator */
  let simInterval = null;
  let isSimulating = false;
  let currentSimTab = 'joyride';
  
  const simTabJoyride = document.getElementById('sim-tab-joyride');
  const simTabGoodlife = document.getElementById('sim-tab-goodlife');
  const btnStartSim = document.getElementById('btn-start-sim');
  const btnStopSim = document.getElementById('btn-stop-sim');
  const simLog = document.getElementById('sim-log');
  const simProgressFill = document.getElementById('sim-progress-fill');
  const simBadge = document.getElementById('sim-badge');
  const simCountText = document.getElementById('sim-count-text');
  const speedSlider = document.getElementById('sim-speed-slider');
  const speedValLabel = document.getElementById('sim-speed-val');

  if (simTabJoyride && simTabGoodlife) {
    simTabJoyride.addEventListener('click', () => {
      simTabJoyride.classList.add('active');
      simTabGoodlife.classList.remove('active');
      currentSimTab = 'joyride';
      addSimLog('Mode switched to Joyride Automation', 'info');
    });

    simTabGoodlife.addEventListener('click', () => {
      simTabGoodlife.classList.add('active');
      simTabJoyride.classList.remove('active');
      currentSimTab = 'goodlife';
      addSimLog('Mode switched to GoodLife Enrolment', 'info');
    });
  }

  if (speedSlider) {
    const speedLabels = ['Safe (1500ms)', 'Normal (800ms)', 'Fast (400ms)', 'Turbo (200ms)'];
    speedSlider.addEventListener('input', (e) => {
      speedValLabel.textContent = speedLabels[e.target.value - 1];
    });
  }

  function addSimLog(msg, type = 'info') {
    if (!simLog) return;
    const now = new Date().toLocaleTimeString('en-US', { hour12: false });
    const logLine = document.createElement('div');
    logLine.className = 'log-line';
    logLine.innerHTML = `<span class="log-time">[${now}]</span> <span class="log-${type}">${msg}</span>`;
    simLog.appendChild(logLine);
    simLog.scrollTop = simLog.scrollHeight;
  }

  if (btnStartSim) {
    btnStartSim.addEventListener('click', () => {
      if (isSimulating) return;
      isSimulating = true;
      simBadge.classList.add('active');
      simBadge.textContent = 'RUNNING';
      btnStartSim.style.display = 'none';
      btnStopSim.style.display = 'inline-flex';
      
      let processed = 0;
      const total = 10;
      simProgressFill.style.width = '0%';
      simLog.innerHTML = '';
      
      addSimLog(`Initializing ${currentSimTab === 'joyride' ? 'Joyride' : 'GoodLife'} Bulk Batch...`, 'info');
      addSimLog('Connected to Hero GoodLife portal target frame.', 'info');

      const mockVins = [
        'MBLHA10EDBHK12041', 'MBLHA10EDBHK12042', 'MBLHA10EDBHK12043', 
        'MBLHA10EDBHK12044', 'MBLHA10EDBHK12045', 'MBLHA10EDBHK12046',
        'MBLHA10EDBHK12047', 'MBLHA10EDBHK12048', 'MBLHA10EDBHK12049', 'MBLHA10EDBHK12050'
      ];

      const intervalMs = [1200, 700, 350, 180][(speedSlider ? speedSlider.value : 2) - 1];

      simInterval = setInterval(() => {
        if (processed >= total) {
          clearInterval(simInterval);
          isSimulating = false;
          simBadge.classList.remove('active');
          simBadge.textContent = 'FINISHED';
          btnStartSim.style.display = 'inline-flex';
          btnStopSim.style.display = 'none';
          addSimLog(`✅ Batch processing complete! ${total}/${total} VINs processed successfully.`, 'success');
          return;
        }

        const vin = mockVins[processed];
        processed++;
        const pct = (processed / total) * 100;
        simProgressFill.style.width = `${pct}%`;
        simCountText.textContent = `${processed} / ${total}`;

        if (processed === 4 && currentSimTab === 'goodlife') {
          addSimLog(`[SKIP] VIN ${vin} — Already enrolled (Smart Skip active)`, 'warn');
        } else {
          addSimLog(`[SUCCESS] VIN ${vin} — Enrolled in ${((intervalMs / 1000) * 0.8).toFixed(2)}s`, 'success');
        }

      }, intervalMs);
    });
  }

  if (btnStopSim) {
    btnStopSim.addEventListener('click', () => {
      if (simInterval) clearInterval(simInterval);
      isSimulating = false;
      simBadge.classList.remove('active');
      simBadge.textContent = 'PAUSED';
      btnStartSim.style.display = 'inline-flex';
      btnStopSim.style.display = 'none';
      addSimLog('Automation paused by user.', 'warn');
    });
  }

  /* 3. CSV Format Tab Switcher */
  const csvTabJoyride = document.getElementById('csv-tab-joyride');
  const csvTabGoodlife = document.getElementById('csv-tab-goodlife');
  const tableJoyride = document.getElementById('table-joyride');
  const tableGoodlife = document.getElementById('table-goodlife');

  if (csvTabJoyride && csvTabGoodlife) {
    csvTabJoyride.addEventListener('click', () => {
      csvTabJoyride.classList.add('active');
      csvTabGoodlife.classList.remove('active');
      tableJoyride.style.display = 'table';
      tableGoodlife.style.display = 'none';
    });

    csvTabGoodlife.addEventListener('click', () => {
      csvTabGoodlife.classList.add('active');
      csvTabJoyride.classList.remove('active');
      tableJoyride.style.display = 'none';
      tableGoodlife.style.display = 'table';
    });
  }

  /* 4. CSV Download Generator */
  const btnDownloadCsv = document.getElementById('btn-download-csv');
  if (btnDownloadCsv) {
    btnDownloadCsv.addEventListener('click', () => {
      const isJoyride = csvTabJoyride.classList.contains('active');
      let csvContent = "";
      
      if (isJoyride) {
        csvContent = "VIN,REG_NO,COUPON_NO,EMPLOYEE_CODE,PLAN_YEAR\n" +
                     "MBLHA10EDBHK12041,MH02AB1234,CPN998877,EMP101,1\n" +
                     "MBLHA10EDBHK12042,MH02AB5678,CPN998878,EMP101,1\n";
      } else {
        csvContent = "VIN,REG_NO,COUPON_NO,CUSTOMER_NAME,MOBILE,DOB,GENDER,STATE,CITY,PINCODE\n" +
                     "MBLHA10EDBHK12041,MH02AB1234,CPN112233,Rajesh Kumar,9876543210,1992-05-15,Male,Maharashtra,Mumbai,400001\n" +
                     "MBLHA10EDBHK12042,MH02AB5678,CPN112234,Priya Sharma,9876543211,1995-08-22,Female,Maharashtra,Pune,411001\n";
      }

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', isJoyride ? 'joyride_sample_template.csv' : 'goodlife_sample_template.csv');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    });
  }

  /* 5. ROI / Speed Calculator */
  const calcSlider = document.getElementById('calc-slider');
  const calcHoursVal = document.getElementById('calc-hours-val');
  const calcErrorVal = document.getElementById('calc-error-val');
  const calcMonthlyLabel = document.getElementById('calc-monthly-lbl');

  if (calcSlider) {
    calcSlider.addEventListener('input', (e) => {
      const count = parseInt(e.target.value, 10);
      calcMonthlyLabel.textContent = `${count.toLocaleString()} VINs / month`;
      
      // Manual speed: ~3 minutes per VIN (0.05 hours)
      // Goodlife Bulk Enrollor speed: ~5 seconds per VIN (0.00138 hours)
      const manualHours = Math.round(count * 0.05);
      const autoHours = Math.round(count * 0.00138);
      const hoursSaved = Math.max(1, manualHours - autoHours);
      
      calcHoursVal.textContent = `${hoursSaved} hrs/mo`;
      calcErrorVal.textContent = `${Math.round(count * 0.12)} Errors Prevented`;
    });
  }

  /* 6. FAQ Accordion Toggle */
  const faqItems = document.querySelectorAll('.faq-item');
  faqItems.forEach(item => {
    const q = item.querySelector('.faq-question');
    q.addEventListener('click', () => {
      const isActive = item.classList.contains('active');
      faqItems.forEach(i => i.classList.remove('active'));
      if (!isActive) item.classList.add('active');
    });
  });

  /* 7. License Key Request Modal */
  const modalOverlay = document.getElementById('modal-overlay');
  const btnOpenModal = document.getElementById('btn-open-modal');
  const btnCloseModal = document.getElementById('btn-close-modal');
  const licenseForm = document.getElementById('license-form');

  if (btnOpenModal && modalOverlay) {
    btnOpenModal.addEventListener('click', (e) => {
      e.preventDefault();
      modalOverlay.style.display = 'flex';
    });
  }

  if (btnCloseModal && modalOverlay) {
    btnCloseModal.addEventListener('click', () => {
      modalOverlay.style.display = 'none';
    });
  }

  if (modalOverlay) {
    modalOverlay.addEventListener('click', (e) => {
      if (e.target === modalOverlay) modalOverlay.style.display = 'none';
    });
  }

  if (licenseForm) {
    licenseForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const deviceId = document.getElementById('input-device-id').value;
      const dealership = document.getElementById('input-dealership').value;
      
      const mailSubject = encodeURIComponent(`License Key Request — ${dealership}`);
      const mailBody = encodeURIComponent(`Hello CalcLabz Team,\n\nI would like to request a license key for Goodlife Bulk Enrollor.\n\nDealership: ${dealership}\nDevice ID: ${deviceId}\n\nThank you!`);
      
      window.location.href = `mailto:support@calclabz.com?subject=${mailSubject}&body=${mailBody}`;
      modalOverlay.style.display = 'none';
    });
  }

});
