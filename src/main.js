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

// Attendance counter — a total that's the same for every guest needs
// somewhere to live, and this is a static site with no backend of its own.
// CountAPI (countapi.xyz) has gone offline entirely (its domain no longer
// resolves). hits.dwyl.com was tried next but never sends an
// Access-Control-Allow-Origin header, so browsers silently block it via
// CORS even though it works fine from a terminal (curl doesn't enforce
// CORS — only real browsers do, which is why that failure wasn't visible
// in testing until it ran in an actual page). This now uses
// abacus.jasoncameron.dev, confirmed (by sending a real Origin header)
// to return `access-control-allow-origin: *`, and it supports the same
// get/hit split as the original CountAPI design: /get reads without
// incrementing, /hit increments. Each device still only calls /hit once
// (tracked via a localStorage flag), so re-clicking the same device's
// button doesn't inflate the total; the confetti + scroll-to-RSVP
// reaction fires on every click regardless.
const ATTENDANCE_API = "https://abacus.jasoncameron.dev";
const ATTENDANCE_NAMESPACE = "arun-aswathy-wedding-2026";
const ATTENDANCE_KEY = "attendance";
const ATTENDANCE_COUNTED_FLAG = "weddingAttendanceCounted";
// The remote counter starts from 0 and only tracks real clicks. Adding a
// fixed baseline here makes the displayed number start at 200 without
// needing to seed the remote counter itself (which has no "set value"
// endpoint — only increment) — every real click still adds exactly +1
// on top of this baseline.
const ATTENDANCE_BASE = 200;

function setAttendanceDisplay(value) {
  const el = document.getElementById("attendance-count");
  if (el && value != null) el.textContent = String(value);
}

async function loadAttendanceCount() {
  try {
    const res = await fetch(`${ATTENDANCE_API}/get/${ATTENDANCE_NAMESPACE}/${ATTENDANCE_KEY}`);
    const data = await res.json();
    setAttendanceDisplay((data.value ?? 0) + ATTENDANCE_BASE);
  } catch (err) {
    console.warn("Attendance counter unavailable:", err);
  }
}

async function recordAttendanceOnce() {
  if (localStorage.getItem(ATTENDANCE_COUNTED_FLAG)) return;
  try {
    const res = await fetch(`${ATTENDANCE_API}/hit/${ATTENDANCE_NAMESPACE}/${ATTENDANCE_KEY}`);
    const data = await res.json();
    localStorage.setItem(ATTENDANCE_COUNTED_FLAG, "true");
    setAttendanceDisplay(data.value + ATTENDANCE_BASE);
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

loadAttendanceCount();

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

  function playSong() {
    if (!weddingSong.paused) return;

    weddingSong.play().then(() => {
      if (songStatus) songStatus.textContent = "Now playing";
      updateSongControls();
    }).catch(() => {
      if (songStatus) songStatus.textContent = "Tap play to start the song";
    });
  }

  // Autoplay gate. Browsers refuse to start audio with sound until the
  // visitor has interacted with the page, and nothing the page does by
  // itself counts — so the wishes modal is opened on every load to collect
  // that interaction. Dismissing it (the × button, clicking the backdrop,
  // Esc, or the "Enter Site" button) all funnel through hidden.bs.modal,
  // and each of those is a real user gesture, which is what unlocks
  // playback. Sending a wish leaves the modal open, so that button starts
  // the song directly instead.
  //
  // The gesture permission a browser grants this way is "sticky": it lasts
  // for the life of the page, so starting playback after the modal's close
  // animation finishes is still allowed.
  const wishesModalEl = document.getElementById("wishesModal");
  if (wishesModalEl) {
    bootstrap.Modal.getOrCreateInstance(wishesModalEl).show();
    wishesModalEl.addEventListener("hidden.bs.modal", playSong);
    document.getElementById("wishSubmitBtn")?.addEventListener("click", playSong);
  }

  // Still worth one unprompted attempt: browsers make an exception for
  // sites the visitor uses often, so for those guests the song starts
  // immediately rather than waiting for the modal. Silently ignored when
  // refused, since the modal gate above is the real path.
  weddingSong.addEventListener("canplay", playSong, { once: true });
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
