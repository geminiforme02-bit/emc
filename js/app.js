/* ============================================================
   E=mc² Burgers — scroll-driven build experience
   ============================================================ */
gsap.registerPlugin(ScrollTrigger);

const FRAME_COUNT = 240;
const FRAME_SPEED = 2.0;        // burger fully built by ~50% scroll
const IMAGE_SCALE = 0.82;       // padded cover sweet spot
const framePath = (i) => `frames/frame_${String(i + 1).padStart(4, "0")}.webp`;

const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d", { alpha: false });
const canvasWrap = document.getElementById("canvas-wrap");
const heroSection = document.querySelector(".hero-standalone");
const scrollContainer = document.getElementById("scroll-container");
const darkOverlay = document.getElementById("dark-overlay");
const marqueeWrap = document.getElementById("marquee");

const frames = new Array(FRAME_COUNT);
let currentFrame = -1;
let bgColor = "#ece9e4";

/* ---------- Canvas sizing (DPR aware) ---------- */
function sizeCanvas() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = window.innerWidth;
  const h = window.innerHeight;
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  canvas.style.width = w + "px";
  canvas.style.height = h + "px";
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  if (currentFrame >= 0) drawFrame(currentFrame, true);
}

/* ---------- Sample background color from frame corners ---------- */
const sampler = document.createElement("canvas");
sampler.width = sampler.height = 32;
const sctx = sampler.getContext("2d", { willReadFrequently: true });
function sampleBgColor(img) {
  try {
    sctx.drawImage(img, 0, 0, 32, 32);
    const pts = [[2, 2], [29, 2], [2, 29], [29, 29]];
    let r = 0, g = 0, b = 0;
    for (const [x, y] of pts) {
      const d = sctx.getImageData(x, y, 1, 1).data;
      r += d[0]; g += d[1]; b += d[2];
    }
    const n = pts.length;
    bgColor = `rgb(${Math.round(r / n)},${Math.round(g / n)},${Math.round(b / n)})`;
  } catch (e) { /* keep last */ }
}

/* ---------- Draw one frame in padded cover mode ---------- */
function drawFrame(index, force) {
  const img = frames[index];
  if (!img) return;
  if (index % 20 === 0 || force) sampleBgColor(img);

  const cw = window.innerWidth;
  const ch = window.innerHeight;
  const iw = img.naturalWidth;
  const ih = img.naturalHeight;
  const scale = Math.max(cw / iw, ch / ih) * IMAGE_SCALE;
  const dw = iw * scale;
  const dh = ih * scale;
  const dx = (cw - dw) / 2;
  const dy = (ch - dh) / 2;

  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, cw, ch);
  ctx.drawImage(img, dx, dy, dw, dh);
}

/* ============================================================
   Frame preloader — two-phase
   ============================================================ */
const loaderEl = document.getElementById("loader");
const barFill = document.getElementById("loader-bar-fill");
const percentEl = document.getElementById("loader-percent");

function loadFrame(i) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => { frames[i] = img; resolve(); };
    img.onerror = () => resolve();
    img.src = framePath(i);
  });
}

async function preload() {
  // Phase 1 — load a head of frames (in parallel) for a fast first paint.
  // The loader bar tracks ONLY this head, so it fills to 100% in ~1-2s and the
  // experience is revealed immediately; the rest of the frames stream in after.
  const head = Math.min(20, FRAME_COUNT);
  let done1 = 0;
  await Promise.all(
    Array.from({ length: head }, (_, i) =>
      loadFrame(i).then(() => {
        done1++;
        const pct = Math.round((done1 / head) * 100);
        barFill.style.width = pct + "%";
        percentEl.textContent = pct + "%";
      })
    )
  );

  drawFrame(0, true);
  start();
  setTimeout(() => loaderEl.classList.add("done"), 200);

  // Phase 2 — remaining frames stream in the background (non-blocking).
  const rest = [];
  for (let i = head; i < FRAME_COUNT; i++) rest.push(i);
  const BATCH = 32;
  (async () => {
    for (let i = 0; i < rest.length; i += BATCH) {
      await Promise.all(rest.slice(i, i + BATCH).map((idx) => loadFrame(idx)));
    }
  })();
}

/* ============================================================
   Boot the experience
   ============================================================ */
let booted = false;
function start() {
  if (booted) return;
  booted = true;

  sizeCanvas();
  initLenis();
  buildSectionTimelines();
  initMainScroll();
  initMarquee();
  initCanvasHandoff();

  // reveal hero heading words
  gsap.from(".hero-heading .word > *", {
    yPercent: 115, duration: 1.1, ease: "power4.out", stagger: 0.12, delay: 0.15,
  });
  gsap.from(".hero-label, .hero-tagline", {
    y: 24, opacity: 0, duration: 1, ease: "power3.out", stagger: 0.15, delay: 0.5,
  });
}

/* ---------- Lenis smooth scroll ---------- */
function initLenis() {
  if (prefersReduced) return;
  if (location.search.includes("nosmooth")) return; // deterministic screenshots
  const lenis = new Lenis({
    duration: 1.2,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
  });
  lenis.on("scroll", ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);

  // anchor links via Lenis
  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener("click", (e) => {
      const id = a.getAttribute("href");
      if (id.length < 2) return;
      const target = document.querySelector(id);
      if (target) { e.preventDefault(); lenis.scrollTo(target, { offset: -40 }); }
    });
  });
}

/* ============================================================
   Section choreography (scrubbed, deterministic)
   ============================================================ */
const sections = [];
function buildSectionTimelines() {
  document.querySelectorAll(".scroll-section").forEach((section) => {
    const type = section.dataset.animation;
    const persist = section.dataset.persist === "true";
    const enter = parseFloat(section.dataset.enter) / 100;
    const leave = parseFloat(section.dataset.leave) / 100;
    const children = section.querySelectorAll(
      ".section-label, .section-heading, .section-body, .feature-icons, .cta-button, .stat"
    );

    const tl = gsap.timeline({ paused: true });
    switch (type) {
      case "fade-up":
        tl.from(children, { y: 50, opacity: 0, stagger: 0.12, duration: 0.9, ease: "power3.out" });
        break;
      case "slide-left":
        tl.from(children, { x: -90, opacity: 0, stagger: 0.14, duration: 0.9, ease: "power3.out" });
        break;
      case "slide-right":
        tl.from(children, { x: 90, opacity: 0, stagger: 0.14, duration: 0.9, ease: "power3.out" });
        break;
      case "scale-up":
        tl.from(children, { scale: 0.85, opacity: 0, transformOrigin: "left center", stagger: 0.12, duration: 1.0, ease: "power2.out" });
        break;
      case "stagger-up":
        tl.from(children, { y: 70, opacity: 0, stagger: 0.13, duration: 0.85, ease: "power3.out" });
        break;
      default:
        tl.from(children, { y: 40, opacity: 0, stagger: 0.12, duration: 0.9, ease: "power3.out" });
    }
    tl.progress(0);
    sections.push({ el: section, tl, enter, leave, persist });
  });
  positionSections();
}

// Place each section so it is vertically centred in the viewport at the
// midpoint of its own enter/leave range (the container scrolls past it).
function positionSections() {
  const H = scrollContainer.offsetHeight;
  const r = window.innerHeight / H;
  for (const s of sections) {
    const m = (s.enter + s.leave) / 2;
    const topFrac = m * (1 - r) + r / 2;
    s.el.style.top = (topFrac * 100).toFixed(3) + "%";
  }
}

// 0 outside range, ramps in over fade, holds at 1, ramps out (unless persist)
const FADE = 0.045;
function visibility(p, enter, leave, persist) {
  if (p < enter - FADE) return 0;
  if (p < enter) return (p - (enter - FADE)) / FADE;
  if (persist) return 1;
  if (p < leave - FADE) return 1;
  if (p < leave) return 1 - (p - (leave - FADE)) / FADE;
  return persist ? 1 : 0;
}

/* ============================================================
   Main scroll driver — frames + hero reveal + sections + overlay
   ============================================================ */
let countersFired = false;
function initMainScroll() {
  ScrollTrigger.create({
    trigger: scrollContainer,
    start: "top top",
    end: "bottom bottom",
    scrub: true,
    onUpdate: (self) => {
      const p = self.progress;

      // --- frame playback ---
      const accel = Math.min(p * FRAME_SPEED, 1);
      const index = Math.min(Math.floor(accel * FRAME_COUNT), FRAME_COUNT - 1);
      if (index !== currentFrame) {
        currentFrame = index;
        requestAnimationFrame(() => drawFrame(currentFrame));
      }

      // --- hero fade + circle-wipe reveal ---
      heroSection.style.opacity = Math.max(0, 1 - p * 16);
      const wipe = Math.min(1, Math.max(0, (p - 0.005) / 0.06));
      const radius = wipe * 78;
      canvasWrap.style.clipPath = `circle(${radius}% at 50% 50%)`;

      // --- section reveals ---
      for (const s of sections) {
        s.tl.progress(visibility(p, s.enter, s.leave, s.persist));
      }

      // --- dark overlay for stats (enter .68 leave .84) ---
      let ov = 0;
      const e = 0.66, l = 0.85, fr = 0.04;
      if (p >= e - fr && p < e) ov = ((p - (e - fr)) / fr) * 0.92;
      else if (p >= e && p < l) ov = 0.92;
      else if (p >= l && p < l + fr) ov = 0.92 * (1 - (p - l) / fr);
      darkOverlay.style.opacity = ov;

      // --- counters fire once when stats appear ---
      if (!countersFired && p > 0.70) { countersFired = true; animateCounters(); }
      if (countersFired && p < 0.60) countersFired = false; // allow replay on scroll back
    },
  });
}

/* ---------- Counters ---------- */
function animateCounters() {
  document.querySelectorAll(".stat-number").forEach((el) => {
    const target = parseFloat(el.dataset.value);
    const decimals = parseInt(el.dataset.decimals || "0", 10);
    const obj = { v: 0 };
    gsap.to(obj, {
      v: target, duration: 1.8, ease: "power2.out",
      onUpdate: () => { el.textContent = obj.v.toFixed(decimals); },
    });
  });
}

/* ---------- Marquee ---------- */
function initMarquee() {
  const text = marqueeWrap.querySelector(".marquee-text");
  const speed = parseFloat(marqueeWrap.dataset.scrollSpeed) || -22;
  gsap.set(text, { xPercent: 6 });
  gsap.to(text, {
    xPercent: speed, ease: "none",
    scrollTrigger: { trigger: scrollContainer, start: "top top", end: "bottom bottom", scrub: true },
  });
  // fade in/out across the middle of the act
  ScrollTrigger.create({
    trigger: scrollContainer, start: "top top", end: "bottom bottom", scrub: true,
    onUpdate: (self) => {
      const p = self.progress;
      let o = 0;
      if (p > 0.26 && p < 0.66) o = 1;
      else if (p >= 0.20 && p <= 0.26) o = (p - 0.20) / 0.06;
      else if (p >= 0.66 && p <= 0.72) o = 1 - (p - 0.66) / 0.06;
      marqueeWrap.style.opacity = o;
    },
  });
}

/* ---------- Hand the canvas off to the info act ---------- */
function initCanvasHandoff() {
  ScrollTrigger.create({
    trigger: "#story",
    start: "top 75%",
    onEnter: () => gsap.to(canvasWrap, { opacity: 0, duration: 0.6, ease: "power2.out" }),
    onLeaveBack: () => gsap.to(canvasWrap, { opacity: 1, duration: 0.6, ease: "power2.out" }),
  });
}

/* ============================================================
   Header behavior + misc
   ============================================================ */
const header = document.getElementById("site-header");
let lastY = 0;
ScrollTrigger.create({
  start: 0, end: "max",
  onUpdate: () => {
    const y = window.scrollY;
    header.classList.toggle("scrolled", y > 40);
    if (y > lastY && y > 400) header.classList.add("hide");
    else header.classList.remove("hide");
    lastY = y;
  },
});

document.getElementById("year").textContent = new Date().getFullYear();

window.addEventListener("resize", () => {
  sizeCanvas();
  if (sections.length) positionSections();
  ScrollTrigger.refresh();
});

/* ---------- reduced motion: show final burger, skip the ride ---------- */
if (prefersReduced) {
  loadFrame(FRAME_COUNT - 1).then(() => {
    sizeCanvas();
    currentFrame = FRAME_COUNT - 1;
    drawFrame(currentFrame, true);
    canvasWrap.style.clipPath = "none";
    loaderEl.classList.add("done");
    sections.forEach((s) => s.tl && s.tl.progress(1));
  });
  buildSectionTimelines();
} else {
  preload();
}
