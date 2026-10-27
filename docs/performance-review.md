# Performance review — October 26, 2026

The supplied [PageSpeed Insights report](PageSpeed-Insights-report.pdf) identifies large media downloads, render-blocking CSS, delayed heading rendering, forced layout, and Google Analytics work. The changes address those costs while retaining the site's layout, card animation, image zoom, and motion controls.

## Changes

- Generate responsive WebP images for project covers, including case-study featured images, and Quest images. Original public URLs remain available. A shared import map lets Astro optimize public project/Quest PNG, JPEG, and WebP assets without changing their content paths.
- Reserve image and video space with intrinsic dimensions. Video posters use frames from the supplied videos at the original aspect ratios.
- Leave videos without an active source until a visible preview can play or its dialog opens. Closed dialogs and offscreen previews no longer download the same MP4s during initial loading. Reduced-motion previews display their posters; dialog controls still allow explicit playback.
- Inline the shared stylesheet to remove its blocking network round trip. Preload the heading and body fonts from the page head.
- Keep the hero heading visible during its entrance, with a small transform instead of opacity and blur. Retain the card rise/fan sequence. Other pages retain their page entrance.
- Measure navigation dimensions in `ResizeObserver`, cache them, and then update the dock. Batch section reads before header writes. This removes the forced-reflow warning in the final audits.
- Queue Analytics configuration immediately and load Google's library at an idle opportunity after the page load event, with a two-second idle timeout. The existing live-domain restriction and automatic page-view configuration remain in place.
- Restrict the dock's color transition to `background-color` and remove the availability indicator's animated shadow. The six moving orbit dots remain as part of the design.

## Measurements

Local audits used Lighthouse 13.5.0, its default mobile configuration and simulated Slow 4G/CPU throttling, Chrome, and the production preview on `127.0.0.1:4327`. The baseline is one pre-change run; final values are medians of three consecutive post-change runs. Runs were sequential, without the browser test suite running concurrently.

| Metric                               | Supplied live PageSpeed report | Local before |         Local after |
| ------------------------------------ | -----------------------------: | -----------: | ------------------: |
| Performance                          |                             77 |           93 |    93 (range 92–94) |
| First contentful paint               |                          2.0 s |       2.15 s |              1.68 s |
| Largest contentful paint             |                          4.3 s |       2.83 s |              3.03 s |
| Total blocking time                  |                         180 ms |        13 ms | 0 ms (range 0–1 ms) |
| Cumulative layout shift              |                              0 |            0 |                   0 |
| Speed index                          |                          5.1 s |       2.41 s |              2.31 s |
| Downloaded bytes                     |                     14,646 KiB |    7,779 KiB |             404 KiB |
| Accessibility / Best practices / SEO |                100 / 100 / 100 |  Not audited |     100 / 100 / 100 |

The local download reduction is approximately **95%**, and FCP improved by approximately **22%**. The local performance score is essentially unchanged; local LCP is slightly slower and remains above the 2.5-second target. These results establish media and blocking-work reductions, rather than a verified improvement to the deployed site's 77 score.

Localhost excludes Google Analytics through the existing hostname guard and has different network/server behavior from PageSpeed. It is not a substitute for a new live PageSpeed report after deployment. Google's library remains a third-party cost, and the moving orbit dots still appear in the non-composited-animation diagnostic. Responsive images retain suitable resolution for high-density displays, so Lighthouse can still suggest smaller variants.

The final local HTML and JSON reports are in `node_modules/.cache/performance-review/after-{1,2,3}.report.{html,json}`. These are local verification artifacts and can be removed by reinstalling dependencies.

To reproduce an audit after `npm run build` and `npm run preview -- --port 4327`:

```powershell
$env:CHROME_PATH = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
npm exec --yes --package=lighthouse -- lighthouse http://127.0.0.1:4327/ --only-categories=performance,accessibility,best-practices,seo --output=html --output-path=performance-report.html --chrome-flags="--headless=new"
```

## Response time and hosting

The report's final document request to `https://www.irfankurnia.com/` took 93 ms. A separate warmed request from this environment measured approximately 137 ms to first byte. The response has `X-Vercel-Cache: HIT`; hashed assets already receive `Cache-Control: public, max-age=31536000, immutable`. Additional cache rules or a runtime server are unnecessary for these findings.

However, `https://irfankurnia.com/` currently returns a **308 redirect to `https://www.irfankurnia.com/`**. A checker starting at the bare domain pays for an additional request and connection. DNS, TLS, geography, and cold connections also affect the reported 583 ms. A universal sub-200-ms response is not established by a single test; [web.dev's TTFB guidance](https://web.dev/articles/optimize-ttfb) uses a broader 800-ms reference threshold for most sites.

To serve the previously selected canonical domain directly, update **Vercel → Project Settings → Domains**:

1. Connect `irfankurnia.com` to the production deployment instead of redirecting it to `www`.
2. Redirect `www.irfankurnia.com` to `https://irfankurnia.com` with a permanent redirect, preserving paths.
3. Check that the bare domain returns 200 directly and that `www` redirects once, then rerun the Open Graph checker against the canonical URL.

These are dashboard settings. Adding an opposing redirect to the application would risk a loop while the current domain redirect is active. Vercel supports either direction, although its general recommendation is to use `www`; the directions above follow the canonical-domain preference already set for this portfolio. See [Vercel's domain redirect instructions](https://vercel.com/docs/domains/working-with-domains/deploying-and-redirecting).

## Verification and next deployment

Astro type checking and the production build passed. Thirty-four focused desktop/mobile browser checks passed across the initial run and the rerun of four stale Finodus content assertions. Coverage includes deferred video requests, poster/video aspect-ratio stability, reduced motion, modal controls, Quest tilt, responsive layout, card autoplay, clocks, dock alignment, image zoom, and Full/TL;DR switching with keyboard, browser history, and JavaScript disabled.

Production-origin browser checks with Google's library stubbed confirmed one queued Analytics configuration, loading after the page load event through both the idle callback and timer fallback, and no Analytics on localhost. Desktop/mobile screenshots were inspected for the hero, compressed covers, and deferred-video posters.

Publish the updated build, check Analytics in Realtime, and rerun PageSpeed Insights on the canonical URL. Assess the new live LCP and third-party work before making further changes to fonts or animation. The local audit scores are not a deployment result.

References: [LCP optimization](https://web.dev/articles/optimize-lcp), [lazy-loaded video](https://web.dev/articles/lazy-loading-video), [Astro images](https://docs.astro.build/en/guides/images/), [Astro inline stylesheets](https://docs.astro.build/en/reference/configuration-reference/#buildinlinestylesheets).
