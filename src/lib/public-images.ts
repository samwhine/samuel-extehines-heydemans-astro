import type { ImageMetadata } from 'astro';

// Import selected public assets so Astro can generate responsive, optimized copies.
// Their original URLs remain available for existing links and full-size downloads.
const images = import.meta.glob<{ default: ImageMetadata }>(
  ['/public/projects/**/*.{png,jpg,jpeg,webp}', '/public/quests/*.{png,jpg,jpeg,webp}'],
  { eager: true },
);

export function publicImage(src?: string) {
  return src ? images[`/public${src}`]?.default : undefined;
}
