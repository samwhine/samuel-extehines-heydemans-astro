# Updating the portfolio

Use `npm run dev` while editing. Astro refreshes the browser when a file changes. These changes stay on your computer until you deliberately publish a later build.

## Shared details and links

Edit `src/data/site.ts` for your email, availability badge, testimonial, profile destinations, and footer date.

Public indexing and link following are intentionally enabled in `src/layouts/Base.astro`. The production domain comes from `astro.config.mjs`; the layout generates canonical URLs, Open Graph and Twitter metadata, and JSON-LD for the person, website, and current page. Use `public/og-image.jpg` for social previews, `public/favicon/` for icons, and `public/manifest.json` for Android home-screen settings.

Resume points to the supplied Google Drive document. Instagram, TikTok, X, Threads, Medium, Substack, LinkedIn, and the personal blog are also populated in `site.links`. Update their quoted URLs there when a destination changes.

For a local resume, put your PDF in `public/resume.pdf` and set `resume: '/resume.pdf'`. The current contact address is `hello@irfankurnia.com`.

Keep `updated` in `YYYY-MM-DD` format. Change it when the site’s content changes; it is not an automatic deployment timestamp. The copyright year is generated at build time.

## Google Analytics

The shared layout installs the Google tag using `site.googleAnalyticsId` in `src/data/site.ts`, currently `G-6YM4RQM063`. Tracking runs only in production builds on `irfankurnia.com` and `www.irfankurnia.com`. Measurement commands queue immediately; the Google library loads at an idle opportunity after the page's load event, with a two-second idle timeout, so it does not compete with critical resources. The allowed hostname follows the production domain in `astro.config.mjs`. Development, localhost previews, and other hosts do not load Google Analytics.

In Google Analytics, open **Admin → Data streams → your web stream → Enhanced measurement → Page views → Show advanced settings**. Keep **Page loads** and **Page changes based on browser history events** enabled so Full/TL;DR switches and browser Back/Forward count as page views. The site uses Google's automatic measurement without sending additional manual page views. See [Google's history tracking guidance](https://developers.google.com/analytics/devguides/collection/ga4/single-page-applications).

After deploying, visit the live site and check **Reports → Realtime**, or connect [Google Tag Assistant](https://tagassistant.google.com/) to the live domain and confirm `G-6YM4RQM063` is detected. Local verification does not establish that events have arrived in the Google Analytics property.

## Add or edit a project

Each case study has two Markdown files with the same filename:

- `src/content/projects/finodus.md`: the **full case study** and shared project metadata, at `/work/finodus/full/`.
- `src/content/projects/tldr/finodus.md`: the **TL;DR version**, at `/work/finodus/`.

The pair creates one Work card. TL;DR opens by default, including direct visits to the project's base URL. The toggle below the featured image switches between articles and their tables of contents. Each version has a direct URL that survives reloading and supports browser Back/Forward; links also work without JavaScript. Previous `/work/<slug>/tldr/` URLs still open the overview.

To add a project, copy both files and give them the same descriptive filename. Edit shared project metadata in the **full version**:

```yaml
---
title: Your project title
summary: A short, factual description of the problem and your work.
tags: [Product Design, Research]
role: Your actual contribution
timeline: Your project timeline
date: October 2026
tools: [Figma]
cover: /projects/example/cover.png
order: 5
placeholder: false
---
```

`cover` is optional. Put that file in `public/projects/example/cover.png`; its URL omits the `public` prefix. Use transparent PNGs when the artwork needs transparency. Supply a compressed image at roughly twice its intended display width. A missing `cover` shows an explicitly labelled image placeholder.

To show project buttons below the tags, add an optional `links` list to the full file's frontmatter. Choose one or two entries, in the order you want them displayed:

```yaml
links:
  - type: figma
    url: https://www.figma.com/design/your-file
  - type: repository
    url: https://github.com/your-name/your-project
```

| Type         | Button label       |
| ------------ | ------------------ |
| `figma`      | See Figma File     |
| `repository` | View Repository    |
| `prototype`  | See Live Prototype |

Each type uses its supplied icon automatically. Use an `https://` or `http://` URL; all buttons open in a new tab. Omit `links` until you have destinations ready. Both Full and TL;DR versions share these buttons.

Each Markdown body is its own article. The TL;DR file inherits title, summary, tags, role, timeline, date, tools, cover, links, and draft status from the full version. It can have its own optional `readingTime` and `toc` frontmatter. Write a shorter account of the business requirement, your contribution, and the outcome, keeping unverified results clearly marked.

Every `## Heading` automatically appears in that version’s table of contents. Use sections that fit the actual story; the full template’s eight headings and the short template’s three headings are writing frameworks rather than a required process.

To use shorter TOC labels without changing article headings, add settings to **each version's own Markdown file**:

```yaml
---
readingTime: 5 min
toc:
  a-decision-that-mattered: Design decisions
---
```

Keys are the heading's generated anchor (the part after `#` when you follow its TOC link); values are the labels visitors see in navigation. Unlisted headings keep their original text. Incorrect keys fail the build so a renamed heading cannot silently lose its label. For a short overview, use `readingTime: 60 sec`. This is an editorial reading target, not an automatically measured duration.

```md
## A decision that mattered

Explain the decision and the evidence behind it.

![A meaningful description of the screen](/projects/example/screen.webp)

<figure>
  <img src="/projects/example/flow.webp" alt="Description of the user flow" width="1200" height="800" loading="lazy" />
  <figcaption>Explain what readers should notice.</figcaption>
</figure>
```

Cover images and article images automatically show a dark zoom overlay with the supplied zoom icon. Click or keyboard-activate an image to open a larger preview over a blurred background. Click outside the image, press Escape, or use the close button to dismiss it. Captions remain with their figures. This applies to both Full and TL;DR versions, including after switching between them; no extra Markdown attributes are needed. Images remain visible without JavaScript.

For three portrait screenshots, wrap their existing `<figure>` elements in `<div class="case-gallery case-gallery-staircase" role="group" aria-label="Describe this image group">...</div>`. Screenshots sit side by side above 1000px, with stepped spacing and a subtle perspective. They stack on narrower screens. Each image keeps its full proportions, caption, and automatic zoom behavior; the same markup works in Full and TL;DR articles. Use `case-gallery` alone for a straight three-column row without the staircase treatment.

Use shared metric cards for business numbers. State whether each number is measured, a target, or an illustrative projection, and give its source or assumptions immediately below:

```html
<dl class="metric-grid" aria-label="Illustrative business projections">
  <div class="metric-card">
    <dt><span class="metric-kind">Planning target</span>Less review effort</dt>
    <dd>25<span>%</span></dd>
    <dd class="metric-context">40 → 30 minutes per amendment.</dd>
  </div>
</dl>
<p class="case-footnote">Illustrative assumptions, not observed results.</p>

<aside class="case-note">
  <p><strong>Important context.</strong> Explain a limitation or key decision here.</p>
</aside>
```

Cards wrap automatically on small screens and use the site's green palette, Sora numbers, and rounded surfaces. Existing `<p class="metric">…</p>` blocks remain supported. Use `case-brief` on a definition list for requirements and role; `case-glossary` on an aside containing a definition list for short term explanations. The Stratis articles show examples, plus a lightweight `case-flow` ordered-list diagram that needs no JavaScript.

Local public images, including raw HTML `<img>` tags, receive intrinsic dimensions at build time to prevent layout shifts during TOC navigation. Supply dimensions yourself for remote images. TOC clicks scroll smoothly, respecting reduced motion and the site's pause preference. They collapse the mobile TOC before scrolling and remain aligned through late image/diagram rendering until the reader provides navigation or scrolling input.

For supporting PDFs, prefer a normal link. This keeps document downloads and PDF viewers off the initial reading path. Stratis's full case links its PDF example; the longer original research narrative is preserved locally in `docs/stratis-research-archive.md` for reference.

Setting `placeholder: false` removes the draft banner in both versions. When removing a sample project, remove both of its Markdown files. Run `npm run check` to catch missing or invalid metadata, and `npm run build` to check that every full article has a matching TL;DR file and that there are no orphaned TL;DR files.

Standard Markdown and HTML tables automatically use the shared case-study styling: content-sized columns, a soft green header, subtle alternating rows, and comfortable padding. Wide tables scroll horizontally inside their own keyboard-focusable frame on small screens. This also works after switching Full/TL;DR versions; no custom classes are needed. Markdown column alignment is preserved.

Use fenced `mermaid` blocks for flowcharts in any Full or TL;DR article. See [Mermaid's flowchart syntax](https://mermaid.js.org/syntax/flowchart.html) for labels, connections, and other shapes:

```mermaid
flowchart LR
  accTitle: Review workflow
  accDescr: Documents are reviewed, open questions are assigned, and the record is handed off.
  A[Documents] --> B[Review terms] --> C[Open items] --> D[Handoff]
```

Flowcharts automatically use left-to-right layout above 700px and top-down layout on smaller screens, including when resizing or switching versions. The boxes share the featured image placeholder's gradient, 17px radius, border, and layered shadows, with local Hanken Grotesk labels and Sora for bold headings. Wide desktop flows scroll inside the article; mobile diagrams fit their available width. Add `accTitle` and `accDescr` for a meaningful accessible title and explanation. The original code remains readable if JavaScript is disabled or a diagram cannot render. Mermaid loads only when the selected article contains a diagram.

Fenced `mermaid` blocks also support [`stateDiagram-v2`](https://mermaid.js.org/syntax/stateDiagram.html) for states and transitions. These receive the same styling and responsive layout; the renderer supplies Mermaid's `direction LR` on desktop and `direction TB` on mobile. Authored nested-state directions and the original source remain intact.

External web links in both Full and TL;DR case studies automatically open in a new tab. Continue writing normal Markdown links; internal links and section anchors stay in the same tab.

Each case study also has a fixed **Back to Top** button in place of the motion control. It scrolls smoothly to the beginning of the page and respects reduced-motion preferences.

## Update Now

Edit `src/content/now/update.md` for the text and its separate update date. Replace the marked Current Role + Transition draft with your own update.

Photo order, captions, and alternative text live in `src/data/gallery.ts`. The four raw originals were copied from `docs/initial-design/photos/` into `src/assets/photos/`. Import another photograph there to add it to the gallery. Astro generates responsive images automatically. Adjust the image’s `position` in `CardStack.astro` if a future photo needs a different crop.

The personal-blog button currently goes to **https://my.irfankurnia.com/**.

## Add Quest media

Edit `src/data/quests.ts`. Each item opens a modal with its media and description. To replace a placeholder with an image:

```ts
{
  id: '01',
  title: 'Your experiment’s title',
  description: 'What you explored and learned.',
  type: 'image',
  media: '/quests/your-image.webp',
}
```

Put the file in `public/quests/your-image.webp`. Local PNG, JPEG, and WebP Quest images and project covers are imported through `src/lib/public-images.ts` to generate responsive WebP copies; the original URLs remain available. Other formats and remote URLs retain their normal image behavior. For animation, use `type: 'video'` with a muted MP4 or WebM and a `poster` image URL. Use a poster with the video's original aspect ratio. Videos loop when visible and permitted by motion preferences; the modal also exposes playback controls. Prefer video with a poster to animated GIFs so visitors can pause motion.

Cards fill their available width and follow the original media proportions without cropping. Image dimensions and video poster dimensions reserve space before loading. Videos have no active source until a visible preview can play or its dialog is opened, preventing offscreen cards and closed dialogs from downloading duplicate videos during the initial page load. Reduced motion keeps previews on their posters; the dialog still allows manual playback. Pop-ups preserve those proportions and scale media to the available width and viewport height. Empty placeholders use a minimum height until you add media.

Entries split evenly between the two desktop columns; an odd extra entry goes in the left column. Four quests produce two cards in each column. Mobile reads the first column followed by the second, matching the source and keyboard order.

With a mouse or pen, each card tilts toward the pointer in 3D and springs smoothly back to level on exit. Opening a pop-up resets its tilt. Touch, reduced motion, and the global pause preference keep the cards level. Media continues to use its original proportions.

## Appearance and motion

The top of `src/styles/global.css` preserves the 13 source palette tokens. Change semantic aliases when adjusting text/background pairings; a color that passes contrast on one surface can fail on another.

`SpaceBackground.astro` uses the paths from the supplied `space.svg` artwork. Six dots move along those same paths at constant speeds, completing their orbits in 72, 86, or 96 seconds. The whole layer also drifts over 40 seconds, with 80% opacity during Hero and 25% elsewhere. It is decorative and does not intercept clicks. The grid is a separate CSS layer.

`public/favicon.svg` contains the new square, green favicon. The header logo is kept separately in `public/images/brand.svg`.

`--text-heading` and `--text-heading-accent` control the Hero and Contact heading colors. They map to Dark 2 and Accent +1 respectively.

The Hero and Now galleries share `CardStack.astro` and the card-stack section in `src/scripts/site.ts`. They advance every five seconds while visible and idle. Hover, focus, hidden tabs, local pause, reduced motion, and the global motion preference stop autoplay. Manual Shuffle remains available under reduced motion.

The intro plays once per tab session. The hero heading is visible immediately and its words slide gently into place; it avoids opacity and blur effects that delayed the largest contentful paint. Cards then rise together and fan out using the existing timing and easing. Autoplay waits until this entrance finishes. Open a new tab, or clear the `portfolio-intro` session-storage entry in browser developer tools, to review it again.

Every page enters with a short fade upward, including Back/Forward cache restores. The dock uses one moving highlight that changes shape during section transitions; mobile labels expand smoothly. On Home, the brand scrolls to the document top without reloading. On other pages, it links back to Home.

Quest dialogs smoothly blur the backdrop and fade upward on every open. Closing by button, Escape, or backdrop fades the pop-up downward and removes the blur over 220 ms. Focus stays inside and scrolling stays locked until the exit finishes, then focus returns to the Quest card. Paused or reduced motion closes immediately. The mobile menu contains Home, Resume, LinkedIn, and Now; its three SVG lines morph into a close icon and back. Both effects follow the global pause and reduced-motion preferences.

The global pause preference is stored under `portfolio-motion` in local storage. Reduced motion disables entrances, orbit movement, and animated scrolling. Pausing during an entrance immediately reveals its completed state. Storage access is optional: the site still works when it is unavailable.

Clock one uses `Asia/Jakarta`; clock two uses the visitor’s browser timezone. Each has its own date and daylight-saving handling. No location service or API is involved.

## Remaining content checklist

- [x] Supply the resume PDF or destination.
- [x] Add your Instagram, TikTok, X, and Threads URLs.
- [ ] Add the Finodus cover, case-study narrative, and supporting visuals.
- [ ] Verify the Finodus draft “3 days” claim with its measurement context.
- [ ] Replace the three sample projects with real case studies.
- [ ] Replace all six Quest media placeholders and descriptions.
- [ ] Complete the Current Role + Transition update.
- [ ] Review image alternative text, photo captions, and contact response-time copy.
- [ ] Set the actual content update dates.
- [ ] Before publishing, confirm the domain/social metadata and repeat the build and browser checks. Public indexing and link following are already enabled intentionally.
