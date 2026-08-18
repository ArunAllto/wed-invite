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
