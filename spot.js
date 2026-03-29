/* ==========================================================
   SPOT page: Time Savings Calculator
   Formula: H = N × (C×Tc + P×Tp + I×Ti + A×Ta + O×To) + E×Te
   Constants tuned to conservative estimates → ~N×1.5 + 6 per-device
   ========================================================== */
(function () {
  var deviceSlider = document.getElementById('deviceSlider');
  if (!deviceSlider) return;

  // ── Easily adjustable ──────────────────────────────────────
  var COST_PER_HOUR = 35; // €/h loaded labor cost
  // ──────────────────────────────────────────────────────────

  var FTE_HOURS = 1750;

  // Conservative per-device defaults (sum = 1.5h/device, matching simplified H ≈ N×1.5+6)
  var C  = 2;      // cert cycles/year (802.1x + HTTPS)
  var Tc = 0.375;  // h/device/cert cycle  (≈22 min — low end of 20–30 min range)
  var P  = 1.5;    // password rotations/year
  var Tp = 0.10;   // h/device/rotation    (≈6 min — low end)
  var I  = 1;      // infra changes/year
  var Ti = 0.15;   // h/device/infra change (≈9 min — low end)
  var A  = 1.5;    // audit prep cycles/year
  var Ta = 0.25;   // h/device/audit prep  (≈15 min — low end)
  var O  = 0.10;   // onboarding rate (% of fleet)
  var To = 0.75;   // h/new device          (≈45 min — low end)
  // Cert expiry incidents scale with fleet size (more devices → higher probability of an unnoticed expiry)
  // E(n) = max(1, n × 0.004)  →  100 devices: 1 incident, 500: 2, 1200: ~5
  var E_rate = 0.004;
  var Te = 3;      // h/incident

  // Donut geometry
  var R = 70;
  var CIRCUMFERENCE = 2 * Math.PI * R; // ≈ 439.82
  var GAP = 3;

  // State
  var segmentBoundaries = []; // [{start, end}] in degrees, clockwise from top
  var currentVals = [];
  var currentTotal = 0;

  var LABELS = [
    '802.1x & HTTPS certs',
    'Password rotation',
    'Network config',
    'Audit prep',
    'Device onboarding',
    'Cert expiry incidents'
  ];

  // ── DOM refs ────────────────────────────────────────────────
  var breakdownEl      = document.querySelector('.savings-breakdown');
  var donutSvg         = document.getElementById('donutChart');
  var donutCenterLabel = document.getElementById('donutCenterLabel');
  var donutTotalEl     = document.getElementById('donutTotal');
  var legendItems      = document.querySelectorAll('.legend-item');

  // ── Computation ─────────────────────────────────────────────
  function compute(n) {
    var cert     = n * C * Tc;
    var pwd      = n * P * Tp;
    var infra    = n * I * Ti;
    var audit    = n * A * Ta;
    var onboard  = n * O * To;
    var E        = Math.max(1, n * E_rate);
    var incident = E * Te;
    var total    = cert + pwd + infra + audit + onboard + incident;
    return [cert, pwd, infra, audit, onboard, incident, total];
  }

  function fmt(n) {
    return Math.round(n).toLocaleString('fr-FR').replace(/\u202F/g, '\u202F');
  }

  // ── Donut rendering ─────────────────────────────────────────
  function updateDonut(vals, total) {
    currentVals = vals.slice();
    currentTotal = total;
    segmentBoundaries = [];

    var cumulative = 0;
    for (var i = 0; i < 6; i++) {
      var frac = total > 0 ? vals[i] / total : 0;
      segmentBoundaries.push({
        start: cumulative / total * 360,
        end:   (cumulative + vals[i]) / total * 360
      });
      var dash   = Math.max(0, frac * CIRCUMFERENCE - GAP);
      var offset = -(cumulative / total * CIRCUMFERENCE);
      var seg = document.getElementById('seg' + i);
      seg.setAttribute('stroke-dasharray', dash + ' ' + CIRCUMFERENCE);
      seg.setAttribute('stroke-dashoffset', offset);
      cumulative += vals[i];
    }
    if (donutTotalEl) donutTotalEl.textContent = Math.round(total) + 'h';
  }

  function updateLegend(vals, total) {
    for (var i = 0; i < 6; i++) {
      var pct = total > 0 ? Math.round(vals[i] / total * 100) : 0;
      document.getElementById('lv' + i).textContent = Math.round(vals[i]) + 'h';
      document.getElementById('lp' + i).textContent = pct + '%';
    }
  }

  // ── Hover interaction ────────────────────────────────────────
  var activeIndex = -1;

  function activateIndex(i) {
    if (i === activeIndex) return;
    activeIndex = i;

    if (!breakdownEl) return;
    breakdownEl.classList.add('is-hovering');

    for (var j = 0; j < 6; j++) {
      var seg = document.getElementById('seg' + j);
      if (seg) seg.classList.toggle('is-active', j === i);
      if (legendItems[j]) legendItems[j].classList.toggle('is-active', j === i);
    }

    // Update donut center to show hovered category
    if (donutCenterLabel) donutCenterLabel.textContent = LABELS[i];
    if (donutTotalEl && currentVals[i] !== undefined) {
      donutTotalEl.textContent = Math.round(currentVals[i]) + 'h';
    }
  }

  function deactivate() {
    if (activeIndex === -1) return;
    activeIndex = -1;

    if (!breakdownEl) return;
    breakdownEl.classList.remove('is-hovering');

    for (var j = 0; j < 6; j++) {
      var seg = document.getElementById('seg' + j);
      if (seg) seg.classList.remove('is-active');
      if (legendItems[j]) legendItems[j].classList.remove('is-active');
    }

    // Restore donut center
    if (donutCenterLabel) donutCenterLabel.textContent = 'Manual hours';
    if (donutTotalEl) donutTotalEl.textContent = Math.round(currentTotal) + 'h';
  }

  // Angle-based hit detection on the SVG ring
  // (avoids stacking pointer-events issues with layered circles)
  function segIndexAtAngle(angleDeg) {
    var a = angleDeg < 0 ? angleDeg + 360 : angleDeg;
    for (var i = 0; i < segmentBoundaries.length; i++) {
      if (a >= segmentBoundaries[i].start && a <= segmentBoundaries[i].end) {
        return i;
      }
    }
    // Floating-point fallback: return last segment if nothing matched near 360°
    return segmentBoundaries.length - 1;
  }

  if (donutSvg) {
    donutSvg.addEventListener('mousemove', function (e) {
      var rect   = donutSvg.getBoundingClientRect();
      var dx     = e.clientX - rect.left  - rect.width  / 2;
      var dy     = e.clientY - rect.top   - rect.height / 2;
      var dist   = Math.sqrt(dx * dx + dy * dy);
      var scale  = rect.width / 200; // SVG viewBox is 200×200
      var inner  = (R - 13) * scale;
      var outer  = (R + 13) * scale;

      if (dist < inner || dist > outer) {
        deactivate();
        return;
      }

      // Angle from top (12 o'clock), clockwise
      var angle = Math.atan2(dy, dx) * 180 / Math.PI + 90;
      if (angle < 0) angle += 360;

      activateIndex(segIndexAtAngle(angle));
    });

    donutSvg.addEventListener('mouseleave', deactivate);
  }

  // Legend row hover
  legendItems.forEach(function (item, i) {
    item.addEventListener('mouseenter', function () { activateIndex(i); });
    item.addEventListener('mouseleave', deactivate);
  });

  // ── Main update ──────────────────────────────────────────────
  function update() {
    var n      = parseInt(deviceSlider.value, 10);
    var result = compute(n);
    var vals   = result.slice(0, 6);
    var total  = result[6];

    document.getElementById('deviceCount').textContent = fmt(n);
    document.getElementById('manualHours').textContent = Math.round(total) + 'h';
    document.getElementById('laborCost').textContent   = '\u20AC' + fmt(total * COST_PER_HOUR);
    document.getElementById('fteValue').textContent    = (total / FTE_HOURS).toFixed(2);

    updateDonut(vals, total);
    updateLegend(vals, total);

    // Slider track fill
    var pct = ((n - 10) / (1200 - 10)) * 100;
    deviceSlider.style.background =
      'linear-gradient(to right, var(--accent) 0%, var(--accent) ' +
      pct + '%, var(--border) ' + pct + '%, var(--border) 100%)';
  }

  // Sync the label with the JS constant (so changing COST_PER_HOUR above is the only thing needed)
  var costLabel = document.getElementById('costRateLabel');
  if (costLabel) costLabel.textContent = 'at \u20AC' + COST_PER_HOUR + '/h loaded cost';

  deviceSlider.addEventListener('input', update);
  update();
})();
