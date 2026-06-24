// Screenshot helper — uses system Chrome via puppeteer-core.
// Usage: node screenshot.mjs http://localhost:3000 [label] [scrollPct]
//   scrollPct: 0-100, how far down the page to scroll before shooting (default 0)
import puppeteer from "puppeteer-core";
import { readdir, mkdir } from "node:fs/promises";
import { join } from "node:path";

let URL = process.argv[2] || "http://localhost:3000";
const LABEL = process.argv[3] || "";
const SCROLL_PCT = Number(process.argv[4] || 0);
// disable Lenis so programmatic scroll lands deterministically
URL += (URL.includes("?") ? "&" : "?") + "nosmooth=1";

const CHROME_CANDIDATES = [
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
];

const OUT_DIR = "temporary screenshots";

async function nextIndex() {
  await mkdir(OUT_DIR, { recursive: true });
  const files = await readdir(OUT_DIR).catch(() => []);
  let max = 0;
  for (const f of files) {
    const m = f.match(/^screenshot-(\d+)/);
    if (m) max = Math.max(max, Number(m[1]));
  }
  return max + 1;
}

const fs = await import("node:fs");
const exe = CHROME_CANDIDATES.find((p) => fs.existsSync(p));
if (!exe) {
  console.error("No Chrome/Edge found.");
  process.exit(1);
}

const browser = await puppeteer.launch({
  executablePath: exe,
  headless: "new",
  args: ["--no-sandbox", "--hide-scrollbars", "--force-device-scale-factor=1"],
});
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
await page.goto(URL, { waitUntil: "networkidle2", timeout: 60000 });

// give loader + fonts + first frames time to settle
await new Promise((r) => setTimeout(r, 2500));

// Position: pass "cp0.19" (scroll-container progress 0-1) for exact section targeting,
// or a plain number for page-percent.
const rawPos = String(process.argv[4] || "0");
if (rawPos.startsWith("cp")) {
  const cp = Number(rawPos.slice(2));
  await page.evaluate((cp) => {
    const c = document.getElementById("scroll-container");
    const y = c.offsetTop + cp * (c.offsetHeight - window.innerHeight);
    window.scrollTo(0, y);
    window.dispatchEvent(new Event("scroll"));
    if (window.ScrollTrigger) window.ScrollTrigger.update();
  }, cp);
  await new Promise((r) => setTimeout(r, 1500));
} else if (SCROLL_PCT > 0) {
  await page.evaluate((pct) => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    window.scrollTo(0, max * (pct / 100));
    window.dispatchEvent(new Event("scroll"));
    if (window.ScrollTrigger) window.ScrollTrigger.update();
  }, SCROLL_PCT);
  await new Promise((r) => setTimeout(r, 1500));
}

const i = await nextIndex();
const suffix = LABEL ? `-${LABEL}` : "";
const file = join(OUT_DIR, `screenshot-${i}${suffix}.png`);
await page.screenshot({ path: file });
console.log("Saved", file);

await browser.close();
