/**
 * TCH identity chip — replaces the old manual Jake/Megha toggle.
 *
 * Who you are now comes from the login session (Google OAuth, enforced by
 * middleware), not a click. This script:
 *   1. Overrides window.toggleRole → clicking the chip signs you OUT.
 *   2. Fetches /api/auth/me and paints the chip (blue = Jake, red = Megha).
 *   3. Exposes window.TCH_USER + fires a 'tch:user' event for pages whose
 *      logic depends on role (e.g. review-dashboard approvals).
 *
 * Load with: <script src="_shared/identity.js" defer></script>
 * (defer ⇒ runs after inline page scripts, so these overrides win.)
 */

(function () {
  "use strict";

  // Synchronous override — the chip never toggles roles again.
  window.toggleRole = function () {
    if (window.confirm("Sign out of The Creative Hotline?")) {
      window.location.href = "/api/auth/logout";
    }
  };

  function paint(user) {
    window.TCH_USER = user;
    var chip = document.getElementById("userRole");
    if (chip) {
      chip.textContent = "Logged in as: " + user.name;
      chip.classList.toggle("jake", user.id === "jake");
      chip.title = user.email + " — click to sign out";
    }
    document.dispatchEvent(new CustomEvent("tch:user", { detail: user }));
  }

  function boot() {
    fetch("/api/auth/me", { cache: "no-store" })
      .then(function (r) {
        if (r.status === 401) {
          // Cookie expired mid-session — bounce through login and come back.
          window.location.href =
            "/login?next=" +
            encodeURIComponent(window.location.pathname + window.location.search);
          return null;
        }
        return r.ok ? r.json() : null;
      })
      .then(function (data) {
        if (data && data.user) paint(data.user);
      })
      .catch(function () {
        /* offline / transient — page still works, chip just keeps default */
      });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
