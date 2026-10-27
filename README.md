# Samuel Extehines Heydemans — Astro Portfolio

An experimental second portfolio for Samuel Extehines Heydemans, built with Astro 7, TypeScript, plain CSS, local fonts, and static content.

This repository is intentionally separate from the existing Next.js portfolio. It explores an editorial, light-mode portfolio direction with a floating dock, animated card stack, image-optimized project covers, TL;DR/full case-study routes, and technical systems content.

## Positioning

Samuel is a **Co-founder of The House Works** and a **Creative Technologist** working across video editing, animation, web products, and self-hosted infrastructure.

The current project content includes:

- PT. Sanfile Manggala Farma — Promotional Video Editing
- Ade Govinda — Professional Editing
- Nelly Syara — Meme & Comedy Editing
- Sidegigx — 2D Animation
- Proctologyku — 2D Animation
- Tebar Pesona — Promotional Content

Technical systems are represented through WELL Ecosystem, Server Administration, and LocatorControl.

## Run locally

Use Node.js 24 LTS or newer and npm:

```shell
npm ci
npm run dev
```

Open the local URL printed by Astro, normally `http://127.0.0.1:4321/`.

## Check and build

```shell
npm run check
npm run build
npm run preview
```

The static output is generated in `dist/` and can be deployed to Vercel as an Astro project.

## Content workflow

Project content lives in `src/content/projects/`. Every project has:

- A full case study at `/work/<slug>/full/`
- A TL;DR case study at `/work/<slug>/`
- A cover image in `public/projects/`
- Behance links in the Markdown frontmatter

Update the project Markdown file and its matching `tldr/<slug>.md` file when adding or changing work. The image filenames use Samuel's full name and a descriptive project phrase for better asset organization and image SEO.

## Before publishing

Update the `site` value in `astro.config.mjs` to the actual Vercel domain for this new repository. The shared Astro layout generates canonical URLs, Open Graph metadata, Twitter card metadata, robots directives, manifest links, and JSON-LD for Samuel's Person profile and The House Works relationship.

The existing Next.js portfolio remains independent and is not changed by this repository.
