/**
 * TCH V2 — Shared Side-Nav + Sticky-Header Helper
 * ------------------------------------------------------------------
 * Drops into any V2 template via:
 *   <script src="/templates-v2/_shared/sidenav.js" defer></script>
 *
 * Responsibilities:
 *   1. Inject a floating "📅 Sessions" toggle button (top-right corner)
 *      that doesn't fight the existing header layout.
 *   2. Open a slide-in drawer with:
 *        - mini month-calendar (booked dates marked, click a date to jump
 *          to the first session that day)
 *        - sessions list grouped Past / Today / Upcoming
 *        - quick "New session" link to Calendly admin
 *   3. Persist the current sessionId in every nav link so the user lands
 *      on the right Hub.
 *   4. Make the host page's primary header sticky (`position: sticky;
 *      top: 0;`) IF the page has tagged its header with `data-tch-sticky`
 *      or `class="tch-sticky-header"`. Pages without those markers are
 *      untouched — defensive on the legacy layouts.
 *
 * Data source: GET /api/sessions/range?start=YYYY-MM-DD&end=YYYY-MM-DD
 * Range: T-60 days → T+60 days from "today".
 *
 * Safe to load on every V2 page — idempotent (won't double-inject if the
 * script runs twice).
 */
(function () {
  "use strict";

  // ---------------------------------------------------------------------
  // Idempotency guard — every V2 template might `defer` this independently.
  // If already mounted, bail.
  // ---------------------------------------------------------------------
  if (window.__tchSidenavMounted) return;
  window.__tchSidenavMounted = true;

  // ---------------------------------------------------------------------
  // Styles — inlined as a single <style> tag.
  // ---------------------------------------------------------------------
  var CSS = [
    /* sticky header — opt-in classes plus the conventional header.top / .topbar */
    ".tch-sticky-header, [data-tch-sticky], body > header.top, body > header.topbar {",
    "  position: sticky !important;",
    "  top: 0 !important;",
    "  z-index: 50 !important;",
    "  backdrop-filter: blur(8px);",
    "}",
    /* float toggle — bottom-right so it doesn't collide with header right-side items */
    "#tch-sidenav-toggle {",
    "  position: fixed; bottom: 20px; right: 20px; z-index: 1000;",
    "  background: var(--tch-red, #c8463c); color: var(--tch-cream, #f5f2eb);",
    "  border: none; border-radius: 999px; padding: 10px 18px;",
    "  font-family: var(--tch-nord, system-ui); font-weight: 600;",
    "  letter-spacing: 0.1em; font-size: 11px; text-transform: uppercase;",
    "  cursor: pointer; box-shadow: 0 6px 18px rgba(0,0,0,0.3);",
    "  transition: transform 0.15s, background 0.15s;",
    "}",
    "#tch-sidenav-toggle:hover { transform: translateY(-1px); }",
    /* drawer */
    "#tch-sidenav-backdrop {",
    "  position: fixed; inset: 0; background: rgba(0,0,0,0.5);",
    "  z-index: 1001; opacity: 0; pointer-events: none;",
    "  transition: opacity 0.2s;",
    "}",
    "#tch-sidenav-backdrop.open { opacity: 1; pointer-events: auto; }",
    "#tch-sidenav-drawer {",
    "  position: fixed; top: 0; right: 0; bottom: 0;",
    "  width: 360px; max-width: 92vw; z-index: 1002;",
    "  background: var(--tch-bg, #1a1714); color: var(--tch-cream, #f5f2eb);",
    "  border-left: 1.5px solid rgba(245,242,235,0.15);",
    "  display: flex; flex-direction: column;",
    "  transform: translateX(100%); transition: transform 0.25s ease-out;",
    "  font-family: var(--tch-nord, system-ui);",
    "  box-shadow: -8px 0 30px rgba(0,0,0,0.45);",
    "}",
    "#tch-sidenav-drawer.open { transform: translateX(0); }",
    "#tch-sidenav-drawer header {",
    "  padding: 18px 20px 14px; border-bottom: 1px solid rgba(245,242,235,0.12);",
    "  display: flex; justify-content: space-between; align-items: center;",
    "  flex: 0 0 auto;",
    "}",
    "#tch-sidenav-drawer header h2 {",
    "  margin: 0; font-size: 13px; letter-spacing: 0.18em;",
    "  text-transform: uppercase; font-weight: 600;",
    "}",
    "#tch-sidenav-close {",
    "  background: none; border: 1px solid rgba(245,242,235,0.3);",
    "  color: var(--tch-cream, #f5f2eb); width: 28px; height: 28px;",
    "  border-radius: 999px; cursor: pointer; font-size: 16px; line-height: 1;",
    "}",
    "#tch-sidenav-drawer .body {",
    "  flex: 1 1 auto; overflow-y: auto; padding: 18px 20px 24px;",
    "}",
    /* calendar */
    ".tch-sn-cal {",
    "  border: 1px solid rgba(245,242,235,0.12);",
    "  border-radius: 6px; padding: 12px;",
    "  background: rgba(245,242,235,0.03); margin-bottom: 20px;",
    "}",
    ".tch-sn-cal-head {",
    "  display: flex; justify-content: space-between; align-items: center;",
    "  margin-bottom: 10px;",
    "}",
    ".tch-sn-cal-head .month {",
    "  font-weight: 600; font-size: 13px; letter-spacing: 0.12em;",
    "  text-transform: uppercase;",
    "}",
    ".tch-sn-cal-head button {",
    "  background: none; border: 1px solid rgba(245,242,235,0.25);",
    "  color: var(--tch-cream, #f5f2eb); width: 24px; height: 24px;",
    "  border-radius: 4px; cursor: pointer; font-size: 12px; line-height: 1;",
    "}",
    ".tch-sn-cal-grid {",
    "  display: grid; grid-template-columns: repeat(7, 1fr);",
    "  gap: 2px; font-family: var(--tch-mono, ui-monospace);",
    "  font-size: 10px;",
    "}",
    ".tch-sn-cal-grid .dow {",
    "  text-align: center; opacity: 0.45; padding: 4px 0;",
    "  text-transform: uppercase; letter-spacing: 0.1em;",
    "}",
    ".tch-sn-cal-grid .day {",
    "  text-align: center; padding: 6px 0; border-radius: 4px;",
    "  cursor: default; color: rgba(245,242,235,0.7);",
    "  border: 1px solid transparent;",
    "}",
    ".tch-sn-cal-grid .day.other-month { opacity: 0.2; }",
    ".tch-sn-cal-grid .day.today {",
    "  border-color: var(--tch-red, #c8463c); font-weight: 700;",
    "}",
    ".tch-sn-cal-grid .day.has-session {",
    "  background: rgba(200,70,60,0.18); cursor: pointer; color: var(--tch-cream, #f5f2eb);",
    "}",
    ".tch-sn-cal-grid .day.has-session:hover {",
    "  background: rgba(200,70,60,0.35);",
    "}",
    /* sessions list */
    ".tch-sn-group { margin-bottom: 18px; }",
    ".tch-sn-group h3 {",
    "  margin: 0 0 8px; font-size: 10px; letter-spacing: 0.18em;",
    "  text-transform: uppercase; opacity: 0.55; font-weight: 600;",
    "}",
    ".tch-sn-item {",
    "  display: block; padding: 10px 12px;",
    "  border: 1px solid rgba(245,242,235,0.1);",
    "  border-radius: 5px; margin-bottom: 6px; cursor: pointer;",
    "  text-decoration: none; color: var(--tch-cream, #f5f2eb);",
    "  transition: border-color 0.15s, background 0.15s;",
    "}",
    ".tch-sn-item:hover {",
    "  border-color: rgba(200,70,60,0.6);",
    "  background: rgba(200,70,60,0.08);",
    "}",
    ".tch-sn-item.current { border-color: var(--tch-red, #c8463c); }",
    ".tch-sn-item .row1 {",
    "  display: flex; justify-content: space-between; align-items: baseline;",
    "  font-size: 12px; font-weight: 600; margin-bottom: 3px;",
    "}",
    ".tch-sn-item .row1 .id {",
    "  font-family: var(--tch-mono, ui-monospace); font-size: 10px;",
    "  opacity: 0.55; font-weight: 400;",
    "}",
    ".tch-sn-item .row2 {",
    "  font-family: var(--tch-mono, ui-monospace); font-size: 10px;",
    "  opacity: 0.65; display: flex; justify-content: space-between;",
    "}",
    ".tch-sn-item .state-pill {",
    "  font-size: 9px; padding: 1px 6px; border-radius: 3px;",
    "  text-transform: uppercase; letter-spacing: 0.08em;",
    "  background: rgba(245,242,235,0.12);",
    "}",
    ".tch-sn-item .state-pill.prep    { background: rgba(255,200,80,0.2);  color: #ffc850; }",
    ".tch-sn-item .state-pill.session { background: rgba(80,180,255,0.2);  color: #50b4ff; }",
    ".tch-sn-item .state-pill.debrief { background: rgba(180,120,255,0.2); color: #b478ff; }",
    ".tch-sn-item .state-pill.review  { background: rgba(255,140,80,0.2);  color: #ff8c50; }",
    ".tch-sn-item .state-pill.sent    { background: rgba(120,220,140,0.2); color: #78dc8c; }",
    ".tch-sn-empty {",
    "  font-size: 11px; opacity: 0.55; font-style: italic;",
    "  padding: 8px 0;",
    "}",
    /* mobile */
    "@media (max-width: 640px) {",
    "  #tch-sidenav-drawer { width: 100vw; max-width: 100vw; }",
    "  #tch-sidenav-toggle { bottom: 12px; right: 12px; padding: 8px 14px; font-size: 10px; }",
    "}",
  ].join("\n");

  var styleEl = document.createElement("style");
  styleEl.setAttribute("data-tch-sidenav", "1");
  styleEl.textContent = CSS;
  document.head.appendChild(styleEl);

  // ---------------------------------------------------------------------
  // DOM scaffolding
  // ---------------------------------------------------------------------
  function el(tag, attrs, html) {
    var n = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        if (k === "class") n.className = attrs[k];
        else n.setAttribute(k, attrs[k]);
      });
    }
    if (html !== undefined) n.innerHTML = html;
    return n;
  }

  // Get current sessionId from URL once at boot — every nav link inherits it.
  function getCurrentSessionId() {
    try {
      return new URL(window.location.href).searchParams.get("sessionId") || "";
    } catch (e) {
      return "";
    }
  }
  var CURRENT_SID = getCurrentSessionId();

  function mountUI() {
    // Floating toggle button
    var toggle = el(
      "button",
      { id: "tch-sidenav-toggle", type: "button", "aria-label": "Open sessions nav" },
      "\u{1F4C5} Sessions",
    );
    document.body.appendChild(toggle);

    // Backdrop
    var backdrop = el("div", { id: "tch-sidenav-backdrop" });
    document.body.appendChild(backdrop);

    // Drawer
    var drawer = el("aside", { id: "tch-sidenav-drawer", role: "complementary" });
    drawer.innerHTML =
      '<header>' +
      '  <h2>Sessions</h2>' +
      '  <button id="tch-sidenav-close" type="button" aria-label="Close">✕</button>' +
      '</header>' +
      '<div class="body">' +
      '  <div class="tch-sn-cal" id="tch-sn-cal">' +
      '    <div class="tch-sn-cal-head">' +
      '      <button id="tch-sn-cal-prev" type="button">‹</button>' +
      '      <div class="month" id="tch-sn-cal-month">—</div>' +
      '      <button id="tch-sn-cal-next" type="button">›</button>' +
      '    </div>' +
      '    <div class="tch-sn-cal-grid" id="tch-sn-cal-grid"></div>' +
      '  </div>' +
      '  <div id="tch-sn-list"><div class="tch-sn-empty">Loading sessions…</div></div>' +
      '</div>';
    document.body.appendChild(drawer);

    // Wire open/close
    function open() {
      backdrop.classList.add("open");
      drawer.classList.add("open");
    }
    function close() {
      backdrop.classList.remove("open");
      drawer.classList.remove("open");
    }
    toggle.addEventListener("click", open);
    backdrop.addEventListener("click", close);
    document.getElementById("tch-sidenav-close").addEventListener("click", close);
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") close();
    });
  }

  // ---------------------------------------------------------------------
  // Data layer
  // ---------------------------------------------------------------------
  function fmtDateISO(d) {
    return (
      d.getFullYear() +
      "-" +
      String(d.getMonth() + 1).padStart(2, "0") +
      "-" +
      String(d.getDate()).padStart(2, "0")
    );
  }

  var STATE = {
    sessions: [], // raw from API
    byDay: {}, // YYYY-MM-DD → [session, ...]
    calMonth: null, // Date pinned to first of currently-shown month
  };

  function indexByDay() {
    STATE.byDay = {};
    STATE.sessions.forEach(function (s) {
      if (!s.scheduledAt) return;
      var d = new Date(s.scheduledAt);
      if (Number.isNaN(d.getTime())) return;
      var key = fmtDateISO(d);
      if (!STATE.byDay[key]) STATE.byDay[key] = [];
      STATE.byDay[key].push(s);
    });
  }

  function loadSessions() {
    var now = new Date();
    var start = new Date(now);
    start.setDate(start.getDate() - 60);
    var end = new Date(now);
    end.setDate(end.getDate() + 60);
    var url =
      "/api/sessions/range?start=" +
      fmtDateISO(start) +
      "&end=" +
      fmtDateISO(end);
    return fetch(url)
      .then(function (r) {
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.json();
      })
      .then(function (data) {
        STATE.sessions = data.sessions || [];
        indexByDay();
        renderCalendar();
        renderList();
      })
      .catch(function (err) {
        var list = document.getElementById("tch-sn-list");
        if (list) {
          list.innerHTML =
            '<div class="tch-sn-empty">Failed to load: ' + (err.message || "unknown") + "</div>";
        }
      });
  }

  // ---------------------------------------------------------------------
  // Rendering
  // ---------------------------------------------------------------------
  var MONTH_NAMES = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  function renderCalendar() {
    var grid = document.getElementById("tch-sn-cal-grid");
    var monthEl = document.getElementById("tch-sn-cal-month");
    if (!grid || !monthEl) return;
    var pin = STATE.calMonth;
    if (!pin) {
      pin = new Date();
      pin.setDate(1);
      pin.setHours(0, 0, 0, 0);
      STATE.calMonth = pin;
    }
    monthEl.textContent = MONTH_NAMES[pin.getMonth()] + " " + pin.getFullYear();
    grid.innerHTML = "";

    // Day-of-week headers (Sun-first to match en-US calendar convention).
    ["S", "M", "T", "W", "T", "F", "S"].forEach(function (l) {
      grid.appendChild(el("div", { class: "dow" }, l));
    });

    // First-of-month + leading blanks for previous month.
    var firstDow = pin.getDay(); // 0 = Sun
    var prevMonthLastDay = new Date(pin.getFullYear(), pin.getMonth(), 0).getDate();
    for (var i = firstDow - 1; i >= 0; i--) {
      var d = prevMonthLastDay - i;
      grid.appendChild(el("div", { class: "day other-month" }, String(d)));
    }

    // Current month days.
    var daysInMonth = new Date(pin.getFullYear(), pin.getMonth() + 1, 0).getDate();
    var todayISO = fmtDateISO(new Date());
    for (var dn = 1; dn <= daysInMonth; dn++) {
      var iso =
        pin.getFullYear() +
        "-" +
        String(pin.getMonth() + 1).padStart(2, "0") +
        "-" +
        String(dn).padStart(2, "0");
      var classes = ["day"];
      if (iso === todayISO) classes.push("today");
      var sessionsOnDay = STATE.byDay[iso];
      if (sessionsOnDay && sessionsOnDay.length) classes.push("has-session");
      var dayEl = el("div", { class: classes.join(" ") }, String(dn));
      if (sessionsOnDay && sessionsOnDay.length) {
        dayEl.setAttribute("data-iso", iso);
        dayEl.title =
          sessionsOnDay.length +
          " session" +
          (sessionsOnDay.length === 1 ? "" : "s") +
          " — " +
          sessionsOnDay.map(function (s) { return s.clientName || "?"; }).join(", ");
        dayEl.addEventListener("click", function (ev) {
          var k = ev.currentTarget.getAttribute("data-iso");
          var first = (STATE.byDay[k] || [])[0];
          if (first) navigateToSession(first.id);
        });
      }
      grid.appendChild(dayEl);
    }

    // Trailing blanks to fill out the last week.
    var totalCells = firstDow + daysInMonth;
    var trail = (7 - (totalCells % 7)) % 7;
    for (var t = 1; t <= trail; t++) {
      grid.appendChild(el("div", { class: "day other-month" }, String(t)));
    }
  }

  function bindCalendarNav() {
    document.getElementById("tch-sn-cal-prev").addEventListener("click", function () {
      var d = new Date(STATE.calMonth);
      d.setMonth(d.getMonth() - 1);
      STATE.calMonth = d;
      renderCalendar();
    });
    document.getElementById("tch-sn-cal-next").addEventListener("click", function () {
      var d = new Date(STATE.calMonth);
      d.setMonth(d.getMonth() + 1);
      STATE.calMonth = d;
      renderCalendar();
    });
  }

  function fmtListTime(iso) {
    if (!iso) return "—";
    try {
      var d = new Date(iso);
      return d.toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
    } catch (e) {
      return iso;
    }
  }

  function navigateToSession(id) {
    if (!id) return;
    var url = new URL("/templates-v2/hub.html", window.location.origin);
    url.searchParams.set("sessionId", id);
    window.location.href = url.toString();
  }

  function renderList() {
    var list = document.getElementById("tch-sn-list");
    if (!list) return;
    if (!STATE.sessions.length) {
      list.innerHTML = '<div class="tch-sn-empty">No sessions in the past 60 / next 60 days.</div>';
      return;
    }
    var now = new Date();
    var todayISO = fmtDateISO(now);
    var past = [];
    var today = [];
    var upcoming = [];
    STATE.sessions.forEach(function (s) {
      if (!s.scheduledAt) {
        // No date = treat as past so it doesn't disappear.
        past.push(s);
        return;
      }
      var iso = fmtDateISO(new Date(s.scheduledAt));
      if (iso === todayISO) today.push(s);
      else if (iso < todayISO) past.push(s);
      else upcoming.push(s);
    });

    function groupHtml(label, arr, opts) {
      opts = opts || {};
      if (!arr.length) {
        if (opts.alwaysShow) {
          return (
            '<div class="tch-sn-group"><h3>' +
            label +
            '</h3><div class="tch-sn-empty">' +
            (opts.emptyText || "Nothing here.") +
            "</div></div>"
          );
        }
        return "";
      }
      // Past is sorted desc (most recent first). Today/upcoming asc.
      if (opts.reverse) arr = arr.slice().reverse();
      var items = arr
        .map(function (s) {
          var pill = (s.state || "").toLowerCase();
          var isCurrent = s.id === CURRENT_SID;
          var name = (s.clientName || "Unnamed").replace(/</g, "&lt;");
          var sid = s.sessionId ? "TCH-" + s.sessionId : "—";
          return (
            '<a class="tch-sn-item' +
            (isCurrent ? " current" : "") +
            '" data-sid="' +
            s.id +
            '">' +
            '<div class="row1"><span>' +
            name +
            '</span><span class="id">' +
            sid +
            "</span></div>" +
            '<div class="row2"><span>' +
            fmtListTime(s.scheduledAt) +
            '</span><span class="state-pill ' +
            pill +
            '">' +
            (s.state || "?") +
            "</span></div>" +
            "</a>"
          );
        })
        .join("");
      return (
        '<div class="tch-sn-group"><h3>' + label + " · " + arr.length + "</h3>" + items + "</div>"
      );
    }

    list.innerHTML =
      groupHtml("Today", today, { alwaysShow: true, emptyText: "No sessions today." }) +
      groupHtml("Upcoming", upcoming) +
      groupHtml("Past", past, { reverse: true });

    // Wire clicks
    list.querySelectorAll(".tch-sn-item[data-sid]").forEach(function (a) {
      a.addEventListener("click", function (ev) {
        ev.preventDefault();
        navigateToSession(a.getAttribute("data-sid"));
      });
    });
  }

  // ---------------------------------------------------------------------
  // Boot
  // ---------------------------------------------------------------------
  function boot() {
    mountUI();
    bindCalendarNav();
    renderCalendar(); // first paint empty (no sessions yet)
    loadSessions(); // async — will re-render once data lands
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
