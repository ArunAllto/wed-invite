import "./scss/main.scss";
import * as bootstrap from "bootstrap";

window.bootstrap = bootstrap;

// Live countdown for the "Big Day" band — targets the wedding date shown
// in the hero section. Pure vanilla JS; Bootstrap has no countdown component.
const WEDDING_DATE = new Date("2026-09-12T00:00:00");

function updateCountdown() {
  const daysEl = document.getElementById("cd-days");
  if (!daysEl) return;

  const msPerSecond = 1000;
  const msPerMinute = msPerSecond * 60;
  const msPerHour = msPerMinute * 60;
  const msPerDay = msPerHour * 24;

  let remaining = Math.max(0, WEDDING_DATE.getTime() - Date.now());

  const days = Math.floor(remaining / msPerDay);
  remaining -= days * msPerDay;
  const hours = Math.floor(remaining / msPerHour);
  remaining -= hours * msPerHour;
  const minutes = Math.floor(remaining / msPerMinute);
  remaining -= minutes * msPerMinute;
  const seconds = Math.floor(remaining / msPerSecond);

  daysEl.textContent = String(days);
  document.getElementById("cd-hours").textContent = String(hours).padStart(2, "0");
  document.getElementById("cd-minutes").textContent = String(minutes).padStart(2, "0");
  document.getElementById("cd-seconds").textContent = String(seconds).padStart(2, "0");
}

updateCountdown();
setInterval(updateCountdown, 1000);

// Gallery lightbox: clicking a thumbnail opens #galleryModal and jumps the
// carousel inside it to the matching slide. Bootstrap's data-api handles
// opening the modal (via data-bs-toggle/data-bs-target on each thumbnail);
// this just drives the carousel's position, since there's no markup-only
// way to combine "open this modal" with "and show slide N".
const galleryCarouselEl = document.getElementById("galleryCarousel");
if (galleryCarouselEl) {
  const galleryCarousel = bootstrap.Carousel.getOrCreateInstance(galleryCarouselEl, {
    interval: false,
    wrap: true,
  });

  document.querySelectorAll("[data-gallery-index]").forEach((thumbnail) => {
    thumbnail.addEventListener("click", () => {
      galleryCarousel.to(Number(thumbnail.dataset.galleryIndex));
    });
  });
}

// Confetti burst — spawned fresh on every click, so the shape/color/speed
// of each piece is randomized here at click time rather than precomputed
// in Sass (see the .confetti-piece comment in _custom.scss for why).
const CONFETTI_COLORS = ["#6b0f1b", "#c2933d", "#047272", "#d98a96", "#0b2f1d", "#f0d78c"];

function launchConfetti() {
  const burst = document.createElement("div");
  burst.className = "confetti-burst z-confetti";
  document.body.appendChild(burst);

  for (let i = 0; i < 60; i++) {
    const piece = document.createElement("span");
    piece.className = "confetti-piece";
    piece.style.left = `${Math.random() * 100}%`;
    piece.style.backgroundColor = CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)];
    piece.style.animationDuration = `${2 + Math.random() * 1.5}s`;
    piece.style.animationDelay = `${Math.random() * 0.3}s`;
    piece.style.setProperty("--confetti-drift", `${(Math.random() - 0.5) * 240}px`);
    piece.style.setProperty("--confetti-rot", `${Math.random() * 720 - 360}deg`);
    burst.appendChild(piece);
  }

  setTimeout(() => burst.remove(), 4000);
}

// Attendance tally. The design has no visible "Guests Confirmed" figure, so
// nothing is rendered from this any more — the count is still recorded
// remotely, so the running total can be read straight from the counter
// service whenever it's wanted.
//
// A static site has no backend of its own, hence the third-party counter:
// CountAPI (countapi.xyz) is gone (its domain no longer resolves), and
// hits.dwyl.com never sends an Access-Control-Allow-Origin header, so
// browsers block it via CORS even though it works fine from a terminal
// (curl doesn't enforce CORS — only real browsers do, which is why that
// failure wasn't visible until it ran in an actual page). This uses
// abacus.jasoncameron.dev, confirmed to return `access-control-allow-origin: *`.
// Each device only calls /hit once (tracked via a localStorage flag), so
// re-clicking the same device's button doesn't inflate the total; the
// confetti + scroll-to-RSVP reaction fires on every click regardless.
const ATTENDANCE_API = "https://abacus.jasoncameron.dev";
const ATTENDANCE_NAMESPACE = "arun-aswathy-wedding-2026";
const ATTENDANCE_KEY = "attendance";
const ATTENDANCE_COUNTED_FLAG = "weddingAttendanceCounted";

async function recordAttendanceOnce() {
  if (localStorage.getItem(ATTENDANCE_COUNTED_FLAG)) return;
  try {
    await fetch(`${ATTENDANCE_API}/hit/${ATTENDANCE_NAMESPACE}/${ATTENDANCE_KEY}`);
    localStorage.setItem(ATTENDANCE_COUNTED_FLAG, "true");
  } catch (err) {
    console.warn("Could not record attendance:", err);
  }
}

document.querySelectorAll(".js-attendance-btn").forEach((button) => {
  button.addEventListener("click", () => {
    launchConfetti();
    document.getElementById("rsvp")?.scrollIntoView({ behavior: "smooth", block: "start" });
    recordAttendanceOnce();
  });
});

// Hero scene. All this does is publish the hero's scroll progress as `--p`
// (0 at rest, 1 once it has scrolled by its own height); the stylesheet derives
// every movement from that one number — the sky zooming out, the temple and
// couple rising, the wording slipping behind them and fading. Keeping the maths
// in CSS means the browser can composite the whole scene off the main thread.
const heroScene = document.getElementById("hero");

if (heroScene && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
  let queued = false;
  let last = -1;

  function updateHeroProgress() {
    queued = false;
    // Measured against three-quarters of a viewport rather than the hero's own
    // height. The hero is content-sized below 1200px, so tying the scene's
    // travel to it would make the whole move fire off in a couple of hundred
    // pixels of scroll on a phone and drag on for a screenful on a desktop —
    // a fixed span keeps it feeling the same everywhere.
    const span = window.innerHeight * 0.75 || 1;
    // Clamped, so over-scroll on iOS can't push it past either end.
    const p = Math.min(1, Math.max(0, window.scrollY / span));
    // Skip the write when the value hasn't moved enough to be visible.
    if (Math.abs(p - last) < 0.001) return;
    last = p;
    heroScene.style.setProperty("--p", p.toFixed(4));
  }

  window.addEventListener(
    "scroll",
    () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(updateHeroProgress);
    },
    { passive: true }
  );

  window.addEventListener("resize", updateHeroProgress, { passive: true });
  updateHeroProgress();
}

// Mobile nav. The design's navbar isn't a Bootstrap navbar (translucent cream
// bar, gold hairline, underlined active item), so the small-screen open/close
// is a single class toggle here rather than Bootstrap's collapse plugin.
const siteNav = document.getElementById("siteNav");
const navToggle = document.getElementById("navToggle");

navToggle?.addEventListener("click", () => {
  const open = siteNav.classList.toggle("is-open");
  navToggle.setAttribute("aria-expanded", String(open));
});

// Tapping a link should close the menu again, since it only scrolls the page.
document.querySelectorAll(".site-nav__link").forEach((link) => {
  link.addEventListener("click", () => {
    siteNav?.classList.remove("is-open");
    navToggle?.setAttribute("aria-expanded", "false");
  });
});

// "Share Our Joy" — the share targets are built at runtime from the page's
// own URL, so the links keep working on any host (local dev, Netlify preview,
// the real domain) without a hardcoded address. Instagram has no web share
// endpoint at all, so that one just opens Instagram and relies on the copied
// link; its href is left as-is in the markup.
const SHARE_TEXT = "Arun & Aswathy are getting married on 12th September 2026 — join us!";

document.querySelectorAll(".js-share-link").forEach((link) => {
  const pageUrl = window.location.href;
  const encodedUrl = encodeURIComponent(pageUrl);

  if (link.dataset.share === "x") {
    link.href = `https://x.com/intent/post?text=${encodeURIComponent(SHARE_TEXT)}&url=${encodedUrl}`;
  } else if (link.dataset.share === "whatsapp") {
    link.href = `https://wa.me/?text=${encodeURIComponent(`${SHARE_TEXT} ${pageUrl}`)}`;
  } else if (link.dataset.share === "facebook") {
    link.href = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
  }
});

// Only the label is swapped, not the button's contents — the button also
// holds the link icon, and writing textContent would delete it.
const copyLinkBtn = document.getElementById("copyLinkBtn");
const copyLinkLabel = document.getElementById("copyLinkLabel");
copyLinkBtn?.addEventListener("click", async () => {
  const original = copyLinkLabel.textContent;
  try {
    await navigator.clipboard.writeText(window.location.href);
    copyLinkLabel.textContent = "Link Copied";
  } catch (err) {
    // Clipboard access is refused on insecure origins and in some browsers
    // without an explicit permission grant — tell the guest rather than
    // failing silently.
    copyLinkLabel.textContent = "Copy failed";
    console.warn("Could not copy link:", err);
  }
  setTimeout(() => {
    copyLinkLabel.textContent = original;
  }, 2500);
});

// Shared music controls — the inline player and floating button both control
// the same audio element so playback continues while guests browse the page.
const weddingSong = document.getElementById("weddingSong");
const songPlayButtons = [
  document.getElementById("songPlay"),
  document.getElementById("floatingSongPlay"),
].filter(Boolean);
const songProgress = document.getElementById("songProgress");
const songCurrentTime = document.getElementById("songCurrentTime");
const songDuration = document.getElementById("songDuration");
const songStatus = document.getElementById("songStatus");

if (weddingSong) weddingSong.src = `${import.meta.env.BASE_URL}audio/song.mp3`;

function formatSongTime(seconds) {
  if (!Number.isFinite(seconds)) return "0:00";
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;
}

function updateSongControls() {
  const isPlaying = weddingSong && !weddingSong.paused;
  songPlayButtons.forEach((button) => {
    button.setAttribute("aria-pressed", String(isPlaying));
    button.setAttribute("aria-label", isPlaying ? "Pause song" : "Play song");
    const icon = button.querySelector("[aria-hidden='true']");
    if (icon) icon.textContent = isPlaying ? "Ⅱ" : "▶";
  });
}

if (weddingSong) {
  songPlayButtons.forEach((button) => {
    button.addEventListener("click", async () => {
      if (weddingSong.paused) {
        try {
          await weddingSong.play();
          if (songStatus) songStatus.textContent = "Now playing";
        } catch (err) {
          if (songStatus) songStatus.textContent = "The song could not be loaded. Please try again.";
        }
      } else {
        weddingSong.pause();
      }
      updateSongControls();
    });
  });

  document.getElementById("songBack")?.addEventListener("click", () => {
    weddingSong.currentTime = 0;
  });
  document.getElementById("songForward")?.addEventListener("click", () => {
    weddingSong.currentTime = Math.min(weddingSong.duration || 0, weddingSong.currentTime + 10);
  });
  songProgress?.addEventListener("input", () => {
    weddingSong.currentTime = Number(songProgress.value);
  });
  weddingSong.addEventListener("loadedmetadata", () => {
    songProgress.max = String(weddingSong.duration);
    songDuration.textContent = formatSongTime(weddingSong.duration);
  });
  weddingSong.addEventListener("timeupdate", () => {
    songProgress.value = String(weddingSong.currentTime);
    songCurrentTime.textContent = formatSongTime(weddingSong.currentTime);
  });
  weddingSong.addEventListener("play", updateSongControls);
  weddingSong.addEventListener("pause", updateSongControls);
  weddingSong.addEventListener("ended", () => {
    weddingSong.currentTime = 0;
    updateSongControls();
  });

  // Autoplay is deliberately OFF. There used to be an autoplay gate here:
  // the wishes modal was opened on every load purely to harvest the user
  // gesture that browsers require before audio may start, and dismissing it
  // (or sending a wish) kicked off playback, with a fallback `canplay`
  // attempt for visitors whose browser already trusted the site. All of
  // that is removed — the song now starts only from the inline player's
  // play button or the floating one, both wired up above. Re-enabling
  // autoplay means restoring that gate; nothing else here needs to change.
}

// "Send Us Wishes" popup posts to our own serverless function, which is what
// actually talks to Telegram (see netlify/functions/wish.mjs). The bot token
// stays on the server and is never shipped to the browser — a static page
// cannot hold a secret, since anything it needs at runtime is readable by
// anyone who opens developer tools.
const WISHES_ENDPOINT = "/.netlify/functions/wish";

const wishesForm = document.getElementById("wishesForm");
if (wishesForm) {
  const wishNameEl = document.getElementById("wishName");
  const wishMessageEl = document.getElementById("wishMessage");
  const wishStatusEl = document.getElementById("wishStatus");
  const wishSubmitBtn = document.getElementById("wishSubmitBtn");

  wishesForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const name = wishNameEl.value.trim();
    const message = wishMessageEl.value.trim();
    if (!name || !message) {
      wishesForm.reportValidity();
      return;
    }

    wishSubmitBtn.disabled = true;
    wishSubmitBtn.textContent = "Sending...";
    wishStatusEl.classList.add("d-none");

    try {
      const res = await fetch(WISHES_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, message }),
      });
      if (!res.ok) throw new Error(`Wishes endpoint responded ${res.status}`);

      wishStatusEl.className = "alert alert-success";
      wishStatusEl.textContent = "Thank you! Your wish has been sent. 🎉";
      wishesForm.reset();
      launchConfetti();
    } catch (err) {
      wishStatusEl.className = "alert alert-danger";
      wishStatusEl.textContent = "Something went wrong sending your wish — please try again.";
      console.warn("Could not send wish:", err);
    } finally {
      wishStatusEl.classList.remove("d-none");
      wishSubmitBtn.disabled = false;
      wishSubmitBtn.textContent = "Send Wishes 💌";
    }
  });
}
