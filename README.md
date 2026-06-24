# EMC Burgers — Website

A premium, three-page website for **EMC Burgers**, Kozhikode.

- **Home** (`index.html`) — the hero burger builds itself frame-by-frame as you scroll,
  in a warm "ember spotlight" on a charcoal stage, with GSAP-choreographed text, a
  sliding marquee, animated stat counters, a menu teaser, and a live map.
- **Menu** (`menu.html`) — full menu with prices and an order/call CTA.
- **About** (`about.html`) — the story, what "serious" means, the numbers, and how to visit.

The home build sequence comes from `Create_burger_from_beginning.mp4` via the
`video-to-website` skill.

## Run it locally
```bash
node serve.mjs
```
Then open <http://localhost:3000>.

## Take screenshots (optional)
```bash
node screenshot.mjs http://localhost:3000 label            # hero
node screenshot.mjs http://localhost:3000 label cp0.5      # 50% through the scroll act
```
Saved to `temporary screenshots/`. Uses your installed Chrome via `puppeteer-core`.

## Project structure
```
index.html          Home — loader, hero, scroll-driven canvas, menu teaser, visit
menu.html           Menu — full menu grid with prices
about.html          About — story, values, stats, visit
css/style.css       Charcoal & Ember theme (shared)
js/app.js           Home engine: Lenis + GSAP + canvas frame renderer + choreography
js/site.js          Shared engine for Menu/About: Lenis, header, scroll reveals, counters
frames/             240 webp frames extracted from the burger video
serve.mjs           tiny static server (localhost:3000)
screenshot.mjs      headless-Chrome screenshotter
brand_assets/       drop the real logo / photos here (see its README)
```

## Editing the content
- **Menu items & prices** — `index.html`, the `.menu-grid` and `.chip-row` sections.
- **Address / phone / hours** — `index.html`, the `#visit` section (phone also in the
  header and final CTA: search for `+919778730078`).
- **Map** — the `#visit` `<iframe>` geocodes the address automatically; "Get directions"
  links to Google Maps.
- **Colors / fonts** — CSS `:root` variables at the top of `css/style.css`.
- **Logo** — currently an `E=mc²` SVG wordmark. To use the real one, drop `logo.png`
  into `brand_assets/` (see `brand_assets/README.md`).

## Notes
- The Instagram logo could not be auto-fetched (login wall + signed URLs) — wordmark
  used as a placeholder.
- Menu names were cleaned per request (the offensive item was dropped); prices shown
  are the ones available publicly — confirm against your current Swiggy menu.
