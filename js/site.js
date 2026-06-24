/* ============================================================
   EMC Burgers — shared site behavior (Menu + About pages)
   Lenis smooth scroll, header state, scroll reveals, year.
   ============================================================ */
gsap.registerPlugin(ScrollTrigger);

const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const noSmooth = location.search.includes("nosmooth");

/* ---------- Lenis smooth scroll ---------- */
if (!prefersReduced && !noSmooth && window.Lenis) {
  const lenis = new Lenis({
    duration: 1.2,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
  });
  lenis.on("scroll", ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener("click", (e) => {
      const id = a.getAttribute("href");
      if (id.length < 2) return;
      const t = document.querySelector(id);
      if (t) { e.preventDefault(); lenis.scrollTo(t, { offset: -70 }); }
    });
  });
}

/* ---------- Header scrolled / hide-on-down ---------- */
const header = document.getElementById("site-header");
let lastY = 0;
function onScroll() {
  const y = window.scrollY;
  if (header) {
    header.classList.toggle("scrolled", y > 40);
    if (y > lastY && y > 400) header.classList.add("hide");
    else header.classList.remove("hide");
  }
  lastY = y;
}
window.addEventListener("scroll", onScroll, { passive: true });
onScroll();

/* ---------- Scroll reveals for [data-reveal] ---------- */
function reveal() {
  const items = gsap.utils.toArray("[data-reveal]");
  items.forEach((el) => {
    const type = el.dataset.reveal || "up";
    const from =
      type === "left" ? { x: -70, opacity: 0 } :
      type === "right" ? { x: 70, opacity: 0 } :
      type === "scale" ? { scale: 0.9, opacity: 0 } :
      { y: 50, opacity: 0 };
    gsap.from(el, {
      ...from,
      duration: 0.9,
      ease: "power3.out",
      scrollTrigger: { trigger: el, start: "top 85%" },
    });
  });
}

/* ---------- Counters ---------- */
function counters() {
  document.querySelectorAll(".stat-number").forEach((el) => {
    const target = parseFloat(el.dataset.value);
    const decimals = parseInt(el.dataset.decimals || "0", 10);
    const obj = { v: 0 };
    gsap.to(obj, {
      v: target, duration: 1.8, ease: "power2.out",
      onUpdate: () => { el.textContent = obj.v.toFixed(decimals); },
      scrollTrigger: { trigger: el, start: "top 82%" },
    });
  });
}

if (prefersReduced) {
  gsap.utils.toArray("[data-reveal]").forEach((el) => gsap.set(el, { clearProps: "all" }));
} else {
  reveal();
}
counters();

/* ---------- Year ---------- */
const yearEl = document.getElementById("year");
if (yearEl) yearEl.textContent = new Date().getFullYear();
