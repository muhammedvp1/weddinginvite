(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------------------------------------------------------------------
     WEDDING TARGET DATE — edit this to your real ceremony date/time.
     Used by the live countdown. ISO string includes the Istanbul (+03:00)
     offset so the countdown is correct regardless of the guest's timezone.
     --------------------------------------------------------------------- */
  var WEDDING_DATE = new Date("2026-07-23T18:00:00+03:00");

  /* =====================================================================
     1. ENVELOPE -> RIBBON -> SITE REVEAL SEQUENCE
     ===================================================================== */
  var gate = document.getElementById("gate");
  var envelopeBtn = document.getElementById("envelopeBtn");
  var curtainStage = document.getElementById("curtainStage");
  var site = document.getElementById("site");
  var langToggle = document.getElementById("langToggle");
  var body = document.body;

  var FLAP_MS = reduceMotion ? 20 : 900;
  var GATE_FADE_MS = reduceMotion ? 20 : 700;
  var CURTAIN_MS = reduceMotion ? 20 : 1100;
  var SITE_FADE_MS = reduceMotion ? 20 : 900;

  var hasOpened = false;

  function openInvitation() {
    if (hasOpened) return;
    hasOpened = true;

    body.classList.add("gate-open");
    envelopeBtn.setAttribute("aria-disabled", "true");

    // Step 1: wax seal cracks + flap swings open
    envelopeBtn.classList.add("is-open");

    // Step 2: envelope fades away, floral curtain + ribbon stage appears
    setTimeout(function () {
      gate.classList.add("is-hidden");
      curtainStage.classList.add("is-active");
      // next frame, trigger the slide/untie transition
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          curtainStage.classList.add("is-opening");
        });
      });
    }, FLAP_MS + 150);

    // Step 3: curtains part, ribbon unties, main site fades in underneath
    setTimeout(function () {
      site.classList.add("is-visible");
      site.removeAttribute("aria-hidden");
      site.removeAttribute("inert");
      langToggle.classList.add("is-visible");
      body.classList.remove("gate-open");
      attemptAudioPlay();

      // Move focus to the hero heading for keyboard/screen-reader users
      var names = document.querySelector(".names");
      if (names) {
        names.setAttribute("tabindex", "-1");
        names.focus({ preventScroll: true });
      }
    }, FLAP_MS + 150 + GATE_FADE_MS + CURTAIN_MS);

    // Step 4: fully hide the curtain stage from the accessibility tree / layout
    setTimeout(function () {
      curtainStage.style.display = "none";
      gate.style.display = "none";
    }, FLAP_MS + 150 + GATE_FADE_MS + CURTAIN_MS + SITE_FADE_MS + 50);
  }

  envelopeBtn.addEventListener("click", openInvitation);
  envelopeBtn.addEventListener("keydown", function (e) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      openInvitation();
    }
  });

  /* =====================================================================
     2. SCROLL REVEALS (IntersectionObserver — no external deps required)
     ===================================================================== */
  var revealItems = document.querySelectorAll(".reveal-item");
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry, i) {
          if (entry.isIntersecting) {
            var delay = reduceMotion ? 0 : (i % 6) * 70;
            setTimeout(function () {
              entry.target.classList.add("is-revealed");
            }, delay);
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.2, rootMargin: "0px 0px -8% 0px" }
    );
    revealItems.forEach(function (el) { io.observe(el); });
  } else {
    revealItems.forEach(function (el) { el.classList.add("is-revealed"); });
  }

  /* =====================================================================
     3. LIVE COUNTDOWN
     ===================================================================== */
  var countdownEl = document.getElementById("countdownTimer");
  function pad(n) { return String(Math.max(0, n)).padStart(2, "0"); }

  function updateCountdown() {
    var diff = WEDDING_DATE.getTime() - Date.now();
    if (diff < 0) diff = 0;

    var seconds = Math.floor(diff / 1000) % 60;
    var minutes = Math.floor(diff / (1000 * 60)) % 60;
    var hours = Math.floor(diff / (1000 * 60 * 60)) % 24;
    var days = Math.floor(diff / (1000 * 60 * 60 * 24));

    setUnit("days", days);
    setUnit("hours", hours);
    setUnit("minutes", minutes);
    setUnit("seconds", seconds);
  }
  function setUnit(unit, value) {
    var el = countdownEl.querySelector('[data-unit="' + unit + '"]');
    if (el) el.textContent = pad(value);
  }
  updateCountdown();
  setInterval(updateCountdown, 1000);

  /* =====================================================================
     4. LANGUAGE TOGGLE (EN / DE)
     ===================================================================== */
  var langButtons = document.querySelectorAll(".lang-btn");
  function applyLang(lang) {
    var dict = (window.WEDDING_I18N || {})[lang];
    if (!dict) return;
    document.querySelectorAll("[data-i18n]").forEach(function (el) {
      var key = el.getAttribute("data-i18n");
      if (dict[key] != null) el.innerHTML = dict[key];
    });
    document.documentElement.setAttribute("lang", lang);
    langButtons.forEach(function (btn) {
      btn.classList.toggle("is-active", btn.getAttribute("data-lang") === lang);
    });
  }
  langButtons.forEach(function (btn) {
    btn.addEventListener("click", function () {
      applyLang(btn.getAttribute("data-lang"));
    });
  });

  /* =====================================================================
     5. BACKGROUND MUSIC TOGGLE
     Add your own royalty-free track at assets/audio/ambience.mp3
     ===================================================================== */
  var soundToggle = document.getElementById("soundToggle");
  var bgAudio = document.getElementById("bgAudio");
  var audioPlaying = false;

  function attemptAudioPlay() {
    if (!bgAudio || !bgAudio.querySelector("source[src]")) return;
    var playPromise = bgAudio.play();
    if (playPromise && playPromise.then) {
      playPromise
        .then(function () {
          audioPlaying = true;
          soundToggle.setAttribute("aria-pressed", "true");
        })
        .catch(function () {
          // Autoplay blocked — user can still tap the sound toggle manually.
          audioPlaying = false;
          soundToggle.setAttribute("aria-pressed", "false");
        });
    }
  }

  soundToggle.addEventListener("click", function () {
    if (!bgAudio) return;
    if (audioPlaying) {
      bgAudio.pause();
      audioPlaying = false;
      soundToggle.setAttribute("aria-pressed", "false");
      soundToggle.setAttribute("aria-label", "Play background music");
    } else {
      bgAudio.play().catch(function () { /* no audio file added yet */ });
      audioPlaying = true;
      soundToggle.setAttribute("aria-pressed", "true");
      soundToggle.setAttribute("aria-label", "Pause background music");
    }
  });

  /* =====================================================================
     6. RSVP FORM (client-side confirmation only — wire up a backend or
        a Google Form action later; see README.md)
     ===================================================================== */
  var rsvpForm = document.getElementById("rsvpForm");
  var rsvpThanks = document.getElementById("rsvpThanks");
  if (rsvpForm) {
    rsvpForm.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!rsvpForm.checkValidity()) {
        rsvpForm.reportValidity();
        return;
      }
      rsvpForm.hidden = true;
      rsvpThanks.hidden = false;
    });
  }
})();
